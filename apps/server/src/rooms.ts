import { randomUUID } from 'node:crypto';
import {
  HOST_GRACE_MS,
  MAX_PLAYERS,
  PLAYER_COLORS,
  generateRoomCode,
  sanitizeName,
  type ClientToServer,
  type PlayerInfo,
  type ServerToController,
  type ServerToHost,
} from '@samigame/shared';

/** En forbindelse (i praksis en WebSocket). Holdt abstrakt så logikken kan testes uden netværk. */
export interface Peer<Out> {
  send(msg: Out): void;
}

export type HostPeer = Peer<ServerToHost>;
export type ControllerPeer = Peer<ServerToController>;

interface Slot {
  playerId: string;
  name: string;
  peer: ControllerPeer | null;
}

interface Room {
  code: string;
  host: HostPeer | null;
  hostGraceTimer: ReturnType<typeof setTimeout> | null;
  slots: (Slot | null)[];
}

/** Hvad en forbindelse er blevet til, efter dens første besked. */
export type PeerRole =
  | { kind: 'host'; code: string }
  | { kind: 'controller'; code: string; slot: number }
  | { kind: 'none' };

export interface RoomManagerOptions {
  lanAddresses?: () => string[];
  random?: () => number;
  hostGraceMs?: number;
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly lanAddresses: () => string[];
  private readonly random: () => number;
  private readonly hostGraceMs: number;

  constructor(options: RoomManagerOptions = {}) {
    this.lanAddresses = options.lanAddresses ?? (() => []);
    this.random = options.random ?? Math.random;
    this.hostGraceMs = options.hostGraceMs ?? HOST_GRACE_MS;
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  /**
   * Håndterer en valideret besked fra en forbindelse og returnerer forbindelsens (evt. nye) rolle.
   * `peer` skal kunne modtage både host- og controller-beskeder, da rollen først kendes nu.
   */
  handleMessage(peer: HostPeer & ControllerPeer, role: PeerRole, msg: ClientToServer): PeerRole {
    switch (msg.t) {
      case 'host_create':
        if (role.kind !== 'none') return role;
        return this.createRoom(peer);
      case 'host_resume':
        if (role.kind !== 'none') return role;
        return this.resumeRoom(peer, msg.code);
      case 'join':
        if (role.kind !== 'none') return role;
        return this.join(peer, msg.code, msg.name, msg.playerId);
      case 'input': {
        if (role.kind !== 'controller') return role;
        this.rooms.get(role.code)?.host?.send({ t: 'input', slot: role.slot, input: msg.input });
        return role;
      }
      case 'to_player': {
        if (role.kind !== 'host') return role;
        this.rooms.get(role.code)?.slots[msg.slot]?.peer?.send(msg.msg);
        return role;
      }
    }
  }

  handleDisconnect(peer: HostPeer | ControllerPeer, role: PeerRole): void {
    const room = role.kind === 'none' ? undefined : this.rooms.get(role.code);
    if (!room) return;

    if (role.kind === 'host') {
      if (room.host !== peer) return;
      room.host = null;
      this.broadcastToControllers(room, { t: 'host_status', connected: false });
      room.hostGraceTimer = setTimeout(() => this.closeRoom(room), this.hostGraceMs);
    } else if (role.kind === 'controller') {
      const slot = room.slots[role.slot];
      // Telefonen kan allerede være genforbundet på en ny forbindelse.
      if (!slot || slot.peer !== peer) return;
      slot.peer = null;
      room.host?.send({ t: 'player_connection', slot: role.slot, connected: false });
    }
  }

  private createRoom(peer: HostPeer): PeerRole {
    let code = generateRoomCode(this.random);
    while (this.rooms.has(code)) code = generateRoomCode(this.random);

    const room: Room = { code, host: peer, hostGraceTimer: null, slots: Array(MAX_PLAYERS).fill(null) };
    this.rooms.set(code, room);
    peer.send({ t: 'room_created', code, lanAddresses: this.lanAddresses() });
    return { kind: 'host', code };
  }

  private resumeRoom(peer: HostPeer, code: string): PeerRole {
    const room = this.rooms.get(code);
    if (!room || room.host) {
      // Rummet er væk (eller har allerede et TV) – start et nyt i stedet.
      return this.createRoom(peer);
    }
    if (room.hostGraceTimer) clearTimeout(room.hostGraceTimer);
    room.hostGraceTimer = null;
    room.host = peer;
    peer.send({ t: 'room_resumed', code, lanAddresses: this.lanAddresses(), players: this.players(room) });
    this.broadcastToControllers(room, { t: 'host_status', connected: true });
    return { kind: 'host', code };
  }

  private join(peer: ControllerPeer, code: string, rawName: string, playerId?: string): PeerRole {
    const room = this.rooms.get(code);
    if (!room) {
      peer.send({ t: 'error', reason: 'room_not_found' });
      return { kind: 'none' };
    }

    // Genforbindelse: samme spiller-ID får sin gamle plads tilbage.
    let index = playerId ? room.slots.findIndex((s) => s?.playerId === playerId) : -1;
    const reconnected = index !== -1;
    if (!reconnected) {
      index = room.slots.findIndex((s) => s === null);
      // Fuldt rum: overtag pladsen fra en spiller, der har mistet forbindelsen.
      if (index === -1) index = room.slots.findIndex((s) => s !== null && s.peer === null);
    }
    if (index === -1) {
      peer.send({ t: 'error', reason: 'room_full' });
      return { kind: 'none' };
    }

    const previous = room.slots[index];
    const slot: Slot = reconnected && previous
      ? { ...previous, peer }
      : { playerId: randomUUID(), name: sanitizeName(rawName, `Spiller ${index + 1}`), peer };
    if (reconnected && rawName.trim()) slot.name = sanitizeName(rawName, slot.name);
    room.slots[index] = slot;

    const info = this.playerInfo(index, slot);
    peer.send({ t: 'joined', code, slot: index, playerId: slot.playerId, name: slot.name, color: info.color });
    peer.send({ t: 'host_status', connected: room.host !== null });
    room.host?.send({ t: 'player_joined', player: info, reconnected });
    return { kind: 'controller', code, slot: index };
  }

  private closeRoom(room: Room): void {
    this.broadcastToControllers(room, { t: 'room_closed' });
    this.rooms.delete(room.code);
  }

  private broadcastToControllers(room: Room, msg: ServerToController): void {
    for (const slot of room.slots) slot?.peer?.send(msg);
  }

  private players(room: Room): PlayerInfo[] {
    const players: PlayerInfo[] = [];
    room.slots.forEach((slot, i) => {
      if (slot) players.push(this.playerInfo(i, slot));
    });
    return players;
  }

  private playerInfo(index: number, slot: Slot): PlayerInfo {
    return { slot: index, name: slot.name, color: PLAYER_COLORS[index].hex, connected: slot.peer !== null };
  }

  /** Rydder timere – bruges når serveren lukkes. */
  dispose(): void {
    for (const room of this.rooms.values()) {
      if (room.hostGraceTimer) clearTimeout(room.hostGraceTimer);
    }
    this.rooms.clear();
  }
}
