import Phaser from 'phaser';
import { AVATAR_PRESETS } from '@samigame/shared';
import { preloadKitTextures } from '../kit/textures';
import { preloadScenery } from '../kit/scenery';
import { C, FONT_BODY, FONT_DISPLAY, H, N, W } from '../kit/theme';
import { ensureAvatarTextures, preloadAvatarTextures } from '../objects/Blok';
import type { Director } from '../flow/Director';

/** Indlæser skrifttyper og fælles grafik, og sender videre til lobbyen (eller dev-scenen). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(C.night);
    const bar = this.add.rectangle(W / 2 - 300, H / 2, 0, 24, N.sun).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 610, 34).setStrokeStyle(5, N.cream);
    this.load.on('progress', (p: number) => (bar.width = 600 * p));
    preloadKitTextures(this);
    preloadScenery(this);
    for (const p of AVATAR_PRESETS) preloadAvatarTextures(this, p.avatar);
  }

  async create(): Promise<void> {
    await Promise.all([
      document.fonts.load(`64px ${FONT_DISPLAY}`),
      document.fonts.load(`800 32px ${FONT_BODY}`),
      document.fonts.load(`900 32px ${FONT_BODY}`),
    ]).catch(() => undefined);
    await Promise.all(AVATAR_PRESETS.map((p) => ensureAvatarTextures(this, p.avatar)));
    const director = this.registry.get('director') as Director;
    if (!director.devStart()) director.goto('lobby');
  }
}
