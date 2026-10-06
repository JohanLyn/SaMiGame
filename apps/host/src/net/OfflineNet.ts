import { MAX_PLAYERS, NEUTRAL_INPUT, type ActionValue, type ControllerInput, type PlayerInfo } from '@samigame/shared';
import type { Net } from './types';

/** Ingen server: bruges til `?minigame=...`-udvikling og screenshots. Alle pladser bliver bots. */
export class OfflineNet implements Net {
  readonly code = 'TEST';
  readonly joinUrl = null;
  readonly connected = true;
  readonly offline = true;
  readonly players: (PlayerInfo | null)[] = Array(MAX_PLAYERS).fill(null);
  readonly inputs: ControllerInput[] = Array.from({ length: MAX_PLAYERS }, () => ({ ...NEUTRAL_INPUT }));
  private readonly actionListeners = new Set<(slot: number, name: string, value: ActionValue) => void>();

  start(): void {}
  subscribe(): () => void {
    return () => {};
  }
  onAction(listener: (slot: number, name: string, value: ActionValue) => void): () => void {
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }
  setLayout(): void {}
  vibrate(): void {}
}
