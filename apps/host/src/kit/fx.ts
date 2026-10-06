import Phaser from 'phaser';
import { TEX } from './textures';
import { C, FONT_DISPLAY, H, N, W } from './theme';

const CONFETTI_COLORS = [N.sun, N.bubblegum, N.mint, N.sky, N.grape, N.tangerine, 0xffffff];

/**
 * "Juice": alt det der får spillet til at føles levende. Brug det generøst!
 * Hver scene får sin egen instans via `new Fx(this)` (MinigameScene gør det for dig: `this.fx`).
 */
export class Fx {
  private hitstopUntil = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Skærmrystelse. intensity ~0.004 (lille bump) til 0.02 (eksplosion). */
  shake(intensity = 0.006, ms = 180): void {
    this.scene.cameras.main.shake(ms, intensity);
  }

  flash(color = 0xffffff, ms = 120, alpha = 0.6): void {
    const rect = this.scene.add.rectangle(W / 2, H / 2, W, H, color, alpha).setDepth(9000).setScrollFactor(0);
    this.scene.tweens.add({ targets: rect, alpha: 0, duration: ms, onComplete: () => rect.destroy() });
  }

  /** Lille kamera-zoom-"punch". */
  punch(amount = 0.04, ms = 160): void {
    const cam = this.scene.cameras.main;
    this.scene.tweens.add({ targets: cam, zoom: cam.zoom + amount, duration: ms / 2, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Fryser tween/fysik et øjeblik – giver vægt til hårde slag. */
  hitstop(ms = 70): void {
    const now = performance.now();
    if (now < this.hitstopUntil) return;
    this.hitstopUntil = now + ms;
    const { tweens, time } = this.scene;
    const physics = (this.scene as Phaser.Scene & { physics?: { world?: { timeScale: number } } }).physics?.world;
    const prev = { tweens: tweens.timeScale, time: time.timeScale, physics: physics?.timeScale ?? 1 };
    tweens.timeScale = prev.tweens * 0.02;
    time.timeScale = prev.time * 0.02;
    if (physics) physics.timeScale = prev.physics * 50;
    setTimeout(() => {
      tweens.timeScale = prev.tweens;
      time.timeScale = prev.time;
      if (physics) physics.timeScale = prev.physics;
    }, ms);
  }

  /** Partikel-eksplosion. */
  burst(
    x: number,
    y: number,
    opts: { texture?: string; color?: number | number[]; count?: number; speed?: number; scale?: number; gravity?: number; lifespan?: number; depth?: number } = {},
  ): void {
    const colors = opts.color === undefined ? [0xffffff] : Array.isArray(opts.color) ? opts.color : [opts.color];
    const emitter = this.scene.add.particles(x, y, opts.texture ?? TEX.dot, {
      speed: { min: (opts.speed ?? 400) * 0.35, max: opts.speed ?? 400 },
      angle: { min: 0, max: 360 },
      scale: { start: opts.scale ?? 0.6, end: 0 },
      lifespan: opts.lifespan ?? 650,
      gravityY: opts.gravity ?? 600,
      rotate: { min: -180, max: 180 },
      tint: colors,
      emitting: false,
    });
    emitter.setDepth(opts.depth ?? 5000);
    emitter.explode(opts.count ?? 18);
    this.scene.time.delayedCall((opts.lifespan ?? 650) + 100, () => emitter.destroy());
  }

  /** Støvsky ved fødder (landing, skub). */
  dust(x: number, y: number, count = 8): void {
    const emitter = this.scene.add.particles(x, y, TEX.puff, {
      speed: { min: 60, max: 180 },
      angle: { min: 180, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 450,
      gravityY: -80,
      emitting: false,
    });
    emitter.setDepth(y - 1);
    emitter.explode(count);
    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  stars(x: number, y: number, color = N.sun, count = 10): void {
    this.burst(x, y, { texture: TEX.star, color, count, speed: 500, scale: 0.55, gravity: 900, lifespan: 800 });
  }

  /** Konfetti-regn over hele skærmen (sejr!). */
  confetti(duration = 2500): void {
    const emitter = this.scene.add.particles(0, -20, TEX.confetti, {
      x: { min: 0, max: W },
      speedY: { min: 200, max: 420 },
      speedX: { min: -120, max: 120 },
      rotate: { start: 0, end: 720 },
      scale: { min: 0.6, max: 1.1 },
      lifespan: 4200,
      quantity: 4,
      frequency: 30,
      tint: CONFETTI_COLORS,
    });
    emitter.setDepth(8000).setScrollFactor(0);
    this.scene.time.delayedCall(duration, () => emitter.stop());
    this.scene.time.delayedCall(duration + 4500, () => emitter.destroy());
  }

  /** Flydende tekst (fx "+3", "AV!"). */
  floatText(x: number, y: number, text: string, color: string = C.sun, size = 56): void {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: FONT_DISPLAY, fontSize: `${size}px`, color })
      .setOrigin(0.5)
      .setStroke(C.ink, size * 0.18)
      .setShadow(0, size * 0.08, C.ink, 0, true, true)
      .setDepth(8500)
      .setScale(0.2);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: y - 110, alpha: 0, delay: 500, duration: 650, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }

  /** Stort banner midt på skærmen ("FÆRDIG!", "KO!"). Resolver når det er væk. */
  banner(text: string, opts: { color?: string; size?: number; hold?: number; sub?: string } = {}): Promise<void> {
    const size = opts.size ?? 200;
    const container = this.scene.add.container(W / 2, H / 2).setDepth(9500).setScrollFactor(0);
    const ribbon = this.scene.add.rectangle(0, 0, W + 200, size * 1.3, N.ink, 0.75).setAngle(-4);
    const title = this.scene.add
      .text(0, opts.sub ? -size * 0.12 : 0, text, { fontFamily: FONT_DISPLAY, fontSize: `${size}px`, color: opts.color ?? C.sun })
      .setOrigin(0.5)
      .setStroke(C.ink, size * 0.14)
      .setShadow(0, size * 0.07, '#000000', 0, true, true)
      .setAngle(-4);
    container.add([ribbon, title]);
    if (opts.sub) {
      container.add(
        this.scene.add
          .text(0, size * 0.55, opts.sub, { fontFamily: FONT_DISPLAY, fontSize: `${size * 0.32}px`, color: C.cream })
          .setOrigin(0.5)
          .setStroke(C.ink, size * 0.06)
          .setAngle(-4),
      );
    }
    ribbon.scaleX = 0;
    title.setScale(0);
    this.scene.tweens.add({ targets: ribbon, scaleX: 1, duration: 220, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: title, scale: 1, duration: 420, delay: 80, ease: 'Back.easeOut' });

    return new Promise((resolve) => {
      this.scene.time.delayedCall(opts.hold ?? 1300, () => {
        this.scene.tweens.add({
          targets: container,
          alpha: 0,
          scale: 1.15,
          duration: 260,
          onComplete: () => {
            container.destroy();
            resolve();
          },
        });
      });
    });
  }

  /** Squash & stretch på et objekt (fx ved landing). */
  squash(target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, x = 1.25, y = 0.8, ms = 90): void {
    const t = target as unknown as { scaleX: number; scaleY: number };
    const sx = t.scaleX;
    const sy = t.scaleY;
    this.scene.tweens.add({ targets: target, scaleX: sx * x, scaleY: sy * y, duration: ms, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Mørk kant rundt om skærmen – giver dybde og fokus. */
  vignette(alpha = 1): Phaser.GameObjects.Image {
    return this.scene.add.image(W / 2, H / 2, TEX.vignette).setDisplaySize(W, H).setDepth(8900).setScrollFactor(0).setAlpha(alpha);
  }

  /** Langsom pulserende glød/skala på et objekt (idle-liv). */
  breathe(target: Phaser.GameObjects.GameObject, amount = 0.04, ms = 900): Phaser.Tweens.Tween {
    const t = target as unknown as { scaleX: number; scaleY: number };
    return this.scene.tweens.add({
      targets: target,
      scaleX: t.scaleX * (1 + amount),
      scaleY: t.scaleY * (1 - amount * 0.5),
      duration: ms,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Pop ind: skala 0 → 1 med overshoot. */
  popIn(target: Phaser.GameObjects.GameObject, delay = 0, ms = 380): void {
    const t = target as unknown as { scaleX: number; scaleY: number; setScale(v: number): void };
    const sx = t.scaleX;
    const sy = t.scaleY;
    t.setScale(0);
    this.scene.tweens.add({ targets: target, scaleX: sx, scaleY: sy, delay, duration: ms, ease: 'Back.easeOut' });
  }
}
