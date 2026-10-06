import { audio } from '../../kit/audio';
import { PlayScene } from '../../flow/PlayScene';
import type { MinigameDef, RitualLaunch, RitualOutcome } from '../../flow/types';

/**
 * Base for udvælgelses-ritualer (Fiskesøen, Den Store Væg ...). Ritualet skal "afsløre" `this.pick`
 * (minigamet er allerede valgt af Director) på en sjov måde og så kalde `this.done({...})`.
 *
 *   export class MyRitual extends RitualScene {
 *     constructor() { super('ritual-my-id'); }
 *     protected setup() { ... }           // byg scenen
 *     protected play(dt) { ... }          // logik hvert frame
 *     protected botInput(slot, dt) { ... }
 *   }
 */
export abstract class RitualScene extends PlayScene {
  pick!: MinigameDef;
  all!: MinigameDef[];
  round = 1;
  totalRounds = 10;
  private launchData!: RitualLaunch;
  private ended = false;

  init(data: RitualLaunch): void {
    this.launchData = data;
    this.ended = false;
  }

  create(): void {
    const d = this.launchData;
    this.pick = d.pick;
    this.all = d.all;
    this.round = d.round;
    this.totalRounds = d.totalRounds;
    this.beginPlay(d.players, { seed: d.seed });
    audio.music('hub');
    this.setup();
    this.fx.vignette(0.7);
    this.say('ritual');
  }

  protected abstract setup(): void;
  protected play(_dt: number): void {}

  protected tick(dt: number): void {
    if (!this.ended) this.play(dt);
  }

  /** Ritualet er færdigt – videre til (evt. kaos-kort og) minigamet. */
  done(outcome: RitualOutcome = {}): void {
    if (this.ended) return;
    this.ended = true;
    this.playing = false;
    this.director.ritualDone(outcome);
  }
}
