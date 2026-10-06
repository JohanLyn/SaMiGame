import { HostSession } from './HostSession';
import { KeyboardPlayers } from './keyboard';
import { OfflineNet } from './OfflineNet';
import type { Net } from './types';

export type { Net } from './types';

const params = new URLSearchParams(location.search);

/** Dev-tilstand: et enkelt minigame/ritual/scene uden server. */
export const DEV = {
  minigame: params.get('minigame'),
  ritual: params.get('ritual'),
  scene: params.get('scene'),
  bots: Number(params.get('bots') ?? 4),
  speed: Math.max(0.25, Math.min(8, Number(params.get('speed') ?? 1))),
  autostart: params.has('autostart'),
  rounds: params.has('rounds') ? Number(params.get('rounds')) : null,
  seed: params.has('seed') ? Number(params.get('seed')) : undefined,
};

export const offline = Boolean(DEV.minigame || DEV.ritual || DEV.scene || params.has('offline'));

export const net: Net = offline ? new OfflineNet() : new HostSession();
export const keyboard = new KeyboardPlayers(params.has('keys'));
