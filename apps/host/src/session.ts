import {
  MAX_PLAYERS,
  NEUTRAL_INPUT,
  type ControllerInput,
  type HostToServer,
  type PlayerInfo,
  type ServerToHost,
} from '@samigame/shared';
import { ReconnectingSocket, defaultSocketUrl } from '@samigame/shared/browser';
import { controllerUrl } from './controllerUrl';

const ROOM_KEY = 'sami.hostRoom';

type Listener = () => void;

/**
 * TV'ets forbindelse til spilserveren: rumkode, hvem der er med, og hver spillers seneste input.
 * Scener læser herfra og lytter på ændringer.
 */
export class HostSession {
  code: string | null = null;
  joinUrl: string | null = null;
  connected = false;
  readonly players: (PlayerInfo | null)[] = Array(MAX_PLAYERS).fill(null);
  readonly inputs: ControllerInput[] = Array.from({ length: MAX_PLAYERS }, () => ({ ...NEUTRAL_INPUT }));

  private readonly socket = new ReconnectingSocket<ServerToHost, HostToServer>(defaultSocketUrl());
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.socket.onOpen = () => {
      const previous = sessionStorage.getItem(ROOM_KEY);
      this.socket.send(previous ? { t: 'host_resume', code: previous } : { t: 'host_create' });
    };
    this.socket.onStatus = (connected) => {
      this.connected = connected;
      this.emit();
    };
    this.socket.onMessage = (msg) => this.handle(msg);
  }

  start(): void {
    this.socket.connect();
  }

  /** Kaldes når rum eller spillere ændrer sig. Returnerer en afmeldingsfunktion. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  vibrate(slot: number, ms: number): void {
    if (this.players[slot]?.connected) this.socket.send({ t: 'to_player', slot, msg: { t: 'vibrate', ms } });
  }

  private handle(msg: ServerToHost): void {
    switch (msg.t) {
      case 'room_created':
        this.players.fill(null);
        this.inputs.forEach((input) => Object.assign(input, NEUTRAL_INPUT));
        this.setRoom(msg.code, msg.lanAddresses);
        break;
      case 'room_resumed':
        this.players.fill(null);
        for (const p of msg.players) this.players[p.slot] = p;
        this.setRoom(msg.code, msg.lanAddresses);
        break;
      case 'player_joined':
        this.players[msg.player.slot] = msg.player;
        break;
      case 'player_connection': {
        const player = this.players[msg.slot];
        if (player) player.connected = msg.connected;
        if (!msg.connected) Object.assign(this.inputs[msg.slot], NEUTRAL_INPUT);
        break;
      }
      case 'input':
        // Input ændrer ikke rum/spillere – scener læser det hver frame, så ingen emit.
        Object.assign(this.inputs[msg.slot], msg.input);
        return;
      case 'error':
        console.warn('Serverfejl:', msg.reason);
        return;
    }
    this.emit();
  }

  private setRoom(code: string, lanAddresses: string[]): void {
    this.code = code;
    this.joinUrl = controllerUrl(code, lanAddresses);
    sessionStorage.setItem(ROOM_KEY, code);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
