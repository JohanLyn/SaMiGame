import { C, H, W } from '../../kit/theme';
import { body, title } from '../../kit/ui';
import { partyBackdrop } from '../../kit/scenery';
import { RitualScene } from './RitualScene';

/** Simpel reserve, hvis ingen ritualer er registreret: minigamet afsløres med et trommehvirvel. */
export class FallbackRitual extends RitualScene {
  constructor() {
    super('ritual-fallback');
  }

  protected setup(): void {
    partyBackdrop(this, this.pick.color);
    title(this, W / 2, 200, 'Næste spil er…', 90);
    this.sfx('drumroll');
    this.time.delayedCall(1300, () => {
      const icon = title(this, W / 2, H / 2, this.pick.icon, 220);
      const t = title(this, W / 2, H / 2 + 200, this.pick.title, 110, { color: C.sun });
      this.fx.popIn(icon);
      this.fx.popIn(t, 100);
      body(this, W / 2, H / 2 + 300, this.pick.tagline, 40);
      this.sfx('fanfare');
      this.fx.confetti(800);
    });
    this.time.delayedCall(3800, () => this.done());
  }
}
