import { MAX_PLAYERS, NEUTRAL_INPUT, type ControllerInput } from '@samigame/shared';
import { keyboard, net } from '../net';
import type { BotInput } from './types';

/**
 * Hvor kommer en spillers input fra? Tastatur (dev) → telefon (hvis forbundet og ikke bot) → bot.
 * En spiller hvis telefon falder ud, styres midlertidigt af en bot – spillet går aldrig i stå.
 */
export class InputRouter {
  private readonly bot: ControllerInput[] = Array.from({ length: MAX_PLAYERS }, () => ({ ...NEUTRAL_INPUT }));

  constructor(private readonly isBot: (slot: number) => boolean) {}

  /** Styres pladsen af en bot lige nu? */
  botControlled(slot: number): boolean {
    const kb = keyboard.read(slot);
    if (kb) return false;
    if (this.isBot(slot)) return true;
    return !net.players[slot]?.connected;
  }

  read(slot: number, bot: (() => BotInput | null) | null): ControllerInput {
    const kb = keyboard.read(slot);
    if (kb && (kb.active || this.isBot(slot) || !net.players[slot]?.connected)) return kb.input;
    if (!this.botControlled(slot)) return net.inputs[slot];
    const state = this.bot[slot];
    const b = bot?.() ?? null;
    if (b) {
      if (b.x !== undefined) state.x = b.x;
      if (b.y !== undefined) state.y = b.y;
      if (b.a !== undefined) state.a = b.a;
      if (b.b !== undefined) state.b = b.b;
      if (b.px !== undefined) state.px = b.px;
      if (b.py !== undefined) state.py = b.py;
      if (b.level !== undefined) state.level = b.level;
      if (b.choice !== undefined) state.choice = b.choice;
      if (b.tap) state.taps++;
    } else {
      state.x = 0;
      state.y = 0;
      state.a = false;
      state.b = false;
      state.level = 0;
    }
    return state;
  }
}
