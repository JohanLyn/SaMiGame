import { MAX_NAME_LENGTH, MAX_PLAYERS } from './constants';
import { isValidRoomCode, normalizeRoomCode } from './roomCode';

/** Telefonens controller-tilstand. x/y er joystick i [-1, 1], y positiv nedad. */
export interface ControllerInput {
  x: number;
  y: number;
  a: boolean;
  b: boolean;
}

export const NEUTRAL_INPUT: ControllerInput = { x: 0, y: 0, a: false, b: false };

export interface PlayerInfo {
  slot: number;
  name: string;
  color: string;
  connected: boolean;
}

export type ErrorReason = 'room_not_found' | 'room_full' | 'bad_message';

/** Beskeder som TV'et kan sende videre til en enkelt telefon. */
export type HostToPlayerMessage = { t: 'vibrate'; ms: number };

// ---- Klient -> server ----

export type HostToServer =
  | { t: 'host_create' }
  | { t: 'host_resume'; code: string }
  | { t: 'to_player'; slot: number; msg: HostToPlayerMessage };

export type ControllerToServer =
  | { t: 'join'; code: string; name: string; playerId?: string }
  | { t: 'input'; input: ControllerInput };

export type ClientToServer = HostToServer | ControllerToServer;

// ---- Server -> klient ----

export type ServerToHost =
  | { t: 'room_created'; code: string; lanAddresses: string[] }
  | { t: 'room_resumed'; code: string; lanAddresses: string[]; players: PlayerInfo[] }
  | { t: 'player_joined'; player: PlayerInfo; reconnected: boolean }
  | { t: 'player_connection'; slot: number; connected: boolean }
  | { t: 'input'; slot: number; input: ControllerInput }
  | { t: 'error'; reason: ErrorReason };

export type ServerToController =
  | { t: 'joined'; code: string; slot: number; playerId: string; name: string; color: string }
  | { t: 'host_status'; connected: boolean }
  | { t: 'room_closed' }
  | { t: 'error'; reason: ErrorReason }
  | HostToPlayerMessage;

// ---- Validering af indkommende beskeder (serveren stoler ikke på klienter) ----

function clamp(value: unknown, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeName(raw: unknown, fallback: string): string {
  const name = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  return name.slice(0, MAX_NAME_LENGTH) || fallback;
}

function parseHostToPlayer(raw: unknown): HostToPlayerMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const m = raw as Record<string, unknown>;
  if (m.t === 'vibrate') return { t: 'vibrate', ms: Math.round(clamp(m.ms, 0, 1000)) };
  return null;
}

/** Returnerer en valideret besked, eller null hvis den er ugyldig. */
export function parseClientMessage(data: string): ClientToServer | null {
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const m = raw as Record<string, unknown>;

  switch (m.t) {
    case 'host_create':
      return { t: 'host_create' };
    case 'host_resume': {
      if (typeof m.code !== 'string') return null;
      const code = normalizeRoomCode(m.code);
      return isValidRoomCode(code) ? { t: 'host_resume', code } : null;
    }
    case 'to_player': {
      const slot = m.slot;
      if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 0 || slot >= MAX_PLAYERS) return null;
      const msg = parseHostToPlayer(m.msg);
      return msg ? { t: 'to_player', slot, msg } : null;
    }
    case 'join': {
      if (typeof m.code !== 'string') return null;
      const code = normalizeRoomCode(m.code);
      if (!isValidRoomCode(code)) return null;
      const playerId = typeof m.playerId === 'string' && m.playerId.length <= 64 ? m.playerId : undefined;
      return { t: 'join', code, name: typeof m.name === 'string' ? m.name : '', playerId };
    }
    case 'input': {
      if (typeof m.input !== 'object' || m.input === null) return null;
      const i = m.input as Record<string, unknown>;
      return {
        t: 'input',
        input: { x: clamp(i.x, -1, 1), y: clamp(i.y, -1, 1), a: i.a === true, b: i.b === true },
      };
    }
    default:
      return null;
  }
}
