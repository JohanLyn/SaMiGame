import { parseAvatar } from './avatar/validate';
import type { Avatar } from './avatar/types';
import { MAX_NAME_LENGTH, MAX_PLAYERS } from './constants';
import { LAYOUT_KINDS, MAX_LAYOUT_BYTES, type ControllerLayout } from './layouts';
import { isValidRoomCode, normalizeRoomCode } from './roomCode';

/**
 * Telefonens controller-tilstand. x/y er joystick/tilt i [-1, 1] (y positiv nedad).
 * `taps` tæller alle knaptryk op (så hurtige tryk aldrig går tabt), `choice` er sidst trykkede knap-id,
 * `px`/`py` er finger-position på en touchpad i [0, 1], `level` er mikrofon-styrke i [0, 1].
 */
export interface ControllerInput {
  x: number;
  y: number;
  a: boolean;
  b: boolean;
  taps: number;
  choice: number;
  px: number;
  py: number;
  level: number;
}

export const NEUTRAL_INPUT: ControllerInput = { x: 0, y: 0, a: false, b: false, taps: 0, choice: -1, px: 0.5, py: 0.5, level: 0 };

export interface PlayerInfo {
  slot: number;
  name: string;
  color: string;
  connected: boolean;
  avatar: Avatar | null;
}

/** Generisk handling fra telefonen (fx "start", "ready", "rounds"). */
export type ActionValue = string | number | boolean;

export type ErrorReason = 'room_not_found' | 'room_full' | 'bad_message';

/** Beskeder som TV'et kan sende videre til en enkelt telefon. */
export type HostToPlayerMessage = { t: 'vibrate'; ms: number } | { t: 'layout'; layout: ControllerLayout };

// ---- Klient -> server ----

export type HostToServer =
  | { t: 'host_create' }
  | { t: 'host_resume'; code: string }
  | { t: 'to_player'; slot: number; msg: HostToPlayerMessage };

export type ControllerToServer =
  | { t: 'join'; code: string; name: string; playerId?: string; avatar?: Avatar }
  | { t: 'input'; input: ControllerInput }
  | { t: 'profile'; avatar: Avatar; name?: string }
  | { t: 'action'; name: string; value: ActionValue };

export type ClientToServer = HostToServer | ControllerToServer;

// ---- Server -> klient ----

export type ServerToHost =
  | { t: 'room_created'; code: string; lanAddresses: string[] }
  | { t: 'room_resumed'; code: string; lanAddresses: string[]; players: PlayerInfo[] }
  | { t: 'player_joined'; player: PlayerInfo; reconnected: boolean }
  | { t: 'player_connection'; slot: number; connected: boolean }
  | { t: 'input'; slot: number; input: ControllerInput }
  | { t: 'player_profile'; slot: number; avatar: Avatar; name: string }
  | { t: 'action'; slot: number; name: string; value: ActionValue }
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
  if (m.t === 'layout') {
    const layout = m.layout as Record<string, unknown> | null;
    if (typeof layout !== 'object' || layout === null) return null;
    if (!LAYOUT_KINDS.includes(layout.kind as ControllerLayout['kind'])) return null;
    if (JSON.stringify(layout).length > MAX_LAYOUT_BYTES) return null;
    return { t: 'layout', layout: layout as unknown as ControllerLayout };
  }
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
      const avatar = parseAvatar(m.avatar) ?? undefined;
      return { t: 'join', code, name: typeof m.name === 'string' ? m.name : '', playerId, avatar };
    }
    case 'input': {
      if (typeof m.input !== 'object' || m.input === null) return null;
      const i = m.input as Record<string, unknown>;
      return {
        t: 'input',
        input: {
          x: clamp(i.x, -1, 1),
          y: clamp(i.y, -1, 1),
          a: i.a === true,
          b: i.b === true,
          taps: Math.round(clamp(i.taps, 0, 1e9)),
          choice: Math.round(clamp(i.choice ?? -1, -1, 99)),
          px: clamp(i.px ?? 0.5, 0, 1),
          py: clamp(i.py ?? 0.5, 0, 1),
          level: clamp(i.level, 0, 1),
        },
      };
    }
    case 'profile': {
      const avatar = parseAvatar(m.avatar);
      if (!avatar) return null;
      return typeof m.name === 'string' ? { t: 'profile', avatar, name: m.name } : { t: 'profile', avatar };
    }
    case 'action': {
      if (typeof m.name !== 'string' || !/^[a-z_]{1,24}$/.test(m.name)) return null;
      const v = m.value;
      const value =
        typeof v === 'boolean' ? v
        : typeof v === 'number' && Number.isFinite(v) ? v
        : typeof v === 'string' ? v.slice(0, 32)
        : null;
      return value === null ? null : { t: 'action', name: m.name, value };
    }
    default:
      return null;
  }
}
