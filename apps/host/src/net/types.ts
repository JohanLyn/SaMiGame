import type { ActionValue, ControllerInput, ControllerLayout, PlayerInfo } from '@samigame/shared';

/** Fælles interface for den rigtige server-forbindelse og offline/dev-tilstanden. */
export interface Net {
  readonly code: string | null;
  readonly joinUrl: string | null;
  readonly connected: boolean;
  readonly offline: boolean;
  readonly players: (PlayerInfo | null)[];
  readonly inputs: ControllerInput[];
  start(): void;
  /** Rum/spillere ændret. */
  subscribe(listener: () => void): () => void;
  /** Handling fra en telefon (fx 'start', 'ready'). */
  onAction(listener: (slot: number, name: string, value: ActionValue) => void): () => void;
  setLayout(slot: number, layout: ControllerLayout): void;
  vibrate(slot: number, ms: number): void;
}
