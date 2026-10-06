import Phaser from 'phaser';
import {
  FEET,
  LEG_SPACING,
  PART_BOXES,
  PART_PIVOTS,
  hasBackPart,
  renderAvatarPart,
  type Avatar,
  type AvatarPart,
} from '@samigame/shared';
import { addSvg } from '../kit/svg';
import { TEX } from '../kit/textures';
import { nameTag } from '../kit/ui';

/** Pixels pr. figur-enhed i teksturerne (2 = skarpt også når figuren vises stort). */
const TEX_SCALE = 2;
/** Pixels pr. figur-enhed på skærmen ved `size = 1` → figuren er ca. 230 px høj. */
const UNIT = 0.8;

export function avatarKey(a: Avatar): string {
  return `av-${a.skin}-${a.shirt}-${a.pants}-${a.hat}-${a.face}-${a.extra}`.replace(/#/g, '');
}

const partKey = (a: Avatar, part: AvatarPart | 'blink') => `${avatarKey(a)}-${part}`;

/** Sørg for at alle teksturer til en avatar findes. Kald før en scene, så figurerne er klar med det samme. */
export async function ensureAvatarTextures(scene: Phaser.Scene, a: Avatar): Promise<void> {
  const parts: AvatarPart[] = ['head', 'torso', 'arm', 'leg', ...(hasBackPart(a) ? (['back'] as const) : [])];
  await Promise.all([
    ...parts.map((p) => addSvg(scene, partKey(a, p), renderAvatarPart(a, p), PART_BOXES[p].w * TEX_SCALE, PART_BOXES[p].h * TEX_SCALE)),
    addSvg(scene, partKey(a, 'blink'), renderAvatarPart(a, 'head', { blink: true }), PART_BOXES.head.w * TEX_SCALE, PART_BOXES.head.h * TEX_SCALE),
  ]);
}

export function avatarTexturesReady(scene: Phaser.Scene, a: Avatar): boolean {
  return scene.textures.exists(partKey(a, 'head')) && scene.textures.exists(partKey(a, 'blink'));
}

type Mood = 'idle' | 'cheer' | 'sad' | 'dance';

/**
 * En levende blokfigur. Origin = mellem fødderne. Bruges i alle scener og minigames.
 *
 *   const hero = new Blok(scene, x, y, avatar, { size: 1, tag: { name, color } });
 *   hero.walk(dx, dy, deltaMs);   // hvert frame mens figuren bevæger sig (dx/dy i [-1,1])
 *   hero.hop(); hero.cheer(); hero.sad(); hero.dance(); hero.bonk(); hero.spinOut();
 */
export class Blok extends Phaser.GameObjects.Container {
  readonly rig: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Image | null = null;
  private tag: Phaser.GameObjects.Container | null = null;
  private parts: {
    head: Phaser.GameObjects.Image;
    torso: Phaser.GameObjects.Image;
    armL: Phaser.GameObjects.Image;
    armR: Phaser.GameObjects.Image;
    legL: Phaser.GameObjects.Image;
    legR: Phaser.GameObjects.Image;
    back: Phaser.GameObjects.Image | null;
  } | null = null;
  private avatar: Avatar;
  private walkTime = 0;
  private idleTime = Math.random() * 1000;
  private nextBlink = 1500 + Math.random() * 2500;
  private blinkUntil = 0;
  private mood: Mood = 'idle';
  private hopTween: Phaser.Tweens.Tween | null = null;
  private moodTime = 0;
  facing: 1 | -1 = 1;
  /** Figurens visuelle størrelse (1 = standard). */
  readonly size: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    avatar: Avatar,
    opts: { size?: number; tag?: { name: string; color: string }; ring?: string; shadow?: boolean } = {},
  ) {
    super(scene, x, y);
    this.size = opts.size ?? 1;
    this.avatar = avatar;
    this.shadow = scene.add.image(0, 0, TEX.shadow).setAlpha(0.28).setDisplaySize(130 * this.size, 34 * this.size);
    this.shadow.setVisible(opts.shadow !== false);
    this.add(this.shadow);
    if (opts.ring) this.setRing(opts.ring);
    this.rig = scene.add.container(0, 0);
    this.add(this.rig);
    if (opts.tag) this.setTag(opts.tag.name, opts.tag.color);
    scene.add.existing(this);
    this.setAvatar(avatar);

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this));
  }

  /** Skift udseende (fx når spilleren ændrer sin figur i Byg-din-Bloks). */
  setAvatar(avatar: Avatar): this {
    this.avatar = avatar;
    if (avatarTexturesReady(this.scene, avatar)) {
      this.build();
    } else {
      void ensureAvatarTextures(this.scene, avatar).then(() => {
        if (this.scene && this.avatar === avatar) this.build();
      });
    }
    return this;
  }

  getAvatar(): Avatar {
    return this.avatar;
  }

  private build(): void {
    this.rig.removeAll(true);
    const a = this.avatar;
    const u = UNIT * this.size;
    const s = u / TEX_SCALE;
    const img = (part: AvatarPart, key = partKey(a, part), dx = 0) => {
      const box = PART_BOXES[part];
      const pivot = PART_PIVOTS[part];
      return this.scene.add
        .image((pivot.x + dx - FEET.x) * u, (pivot.y - FEET.y) * u, key)
        .setOrigin((pivot.x - box.x) / box.w, (pivot.y - box.y) / box.h)
        .setScale(s);
    };
    const back = hasBackPart(a) && this.scene.textures.exists(partKey(a, 'back')) ? img('back') : null;
    const legL = img('leg');
    const legR = img('leg', partKey(a, 'leg'), LEG_SPACING);
    const armL = img('arm');
    // Højre arm = venstre arm spejlet om figurens midte.
    const armR = img('arm');
    armR.x = (160 - PART_PIVOTS.arm.x - FEET.x) * u;
    armR.setFlipX(true).setOrigin(1 - armL.originX, armL.originY);
    const torso = img('torso');
    const head = img('head');
    this.parts = { head, torso, armL, armR, legL, legR, back };
    this.rig.add([...(back ? [back] : []), legL, legR, armL, armR, torso, head]);
    if (this.tag) this.tag.y = -270 * this.size;
  }

  // ---------------------------------------------------------------------------
  // Udstyr

  setTag(name: string, color: string): this {
    this.tag?.destroy();
    this.tag = nameTag(this.scene, 0, -270 * this.size, name, color, 26 * Math.max(0.8, this.size));
    this.add(this.tag);
    return this;
  }

  hideTag(): this {
    this.tag?.setVisible(false);
    return this;
  }

  /** Farvet ring under fødderne (spillerfarve). */
  setRing(color: string | null): this {
    this.ring?.destroy();
    this.ring = null;
    if (color) {
      this.ring = this.scene.add
        .image(0, 0, TEX.ring)
        .setTint(Phaser.Display.Color.HexStringToColor(color).color)
        .setDisplaySize(150 * this.size, 50 * this.size)
        .setAlpha(0.9);
      this.addAt(this.ring, 1);
    }
    return this;
  }

  setFacing(dir: 1 | -1): this {
    this.facing = dir;
    this.rig.scaleX = Math.abs(this.rig.scaleX) * dir;
    return this;
  }

  get hopping(): boolean {
    return this.hopTween !== null;
  }

  // ---------------------------------------------------------------------------
  // Bevægelse og humør

  /** Kald hvert frame med bevægelsesretning. Giver gå-animation og vender figuren. */
  walk(dx: number, dy: number, deltaMs: number): void {
    const speed = Math.min(1, Math.hypot(dx, dy));
    if (Math.abs(dx) > 0.15) this.setFacing(dx > 0 ? 1 : -1);
    if (speed > 0.05) {
      this.walkTime += deltaMs * (0.6 + speed * 0.6);
      if (this.mood !== 'idle') this.mood = 'idle';
    } else {
      this.walkTime = 0;
    }
  }

  hop(height = 70, ms = 240): void {
    if (this.hopTween) return;
    const h = height * this.size;
    this.hopTween = this.scene.tweens.add({
      targets: this.rig,
      y: -h,
      duration: ms,
      ease: 'Quad.easeOut',
      yoyo: true,
      onUpdate: () => {
        const k = 1 - 0.4 * Math.min(1, -this.rig.y / h);
        this.shadow.setDisplaySize(130 * this.size * k, 34 * this.size * k);
      },
      onComplete: () => {
        this.hopTween = null;
        this.shadow.setDisplaySize(130 * this.size, 34 * this.size);
        this.squash(1.2, 0.85);
      },
    });
  }

  squash(x = 1.25, y = 0.8, ms = 90): void {
    const sx = Math.abs(this.rig.scaleX) || 1;
    const dir = this.facing;
    this.scene.tweens.add({
      targets: this.rig,
      scaleX: { from: sx * x * dir, to: sx * dir },
      scaleY: { from: y, to: 1 },
      duration: ms * 2,
      ease: 'Back.easeOut',
    });
  }

  bonk(): void {
    this.squash(1.3, 0.75, 70);
  }

  /** Snurrer rundt (fx når man bliver ramt). */
  spinOut(turns = 1, ms = 600): void {
    this.scene.tweens.add({ targets: this.rig, angle: { from: 0, to: 360 * turns * this.facing }, duration: ms, ease: 'Cubic.easeOut' });
  }

  cheer(): void {
    this.mood = 'cheer';
    this.moodTime = 0;
  }

  sad(): void {
    this.mood = 'sad';
    this.moodTime = 0;
  }

  dance(): void {
    this.mood = 'dance';
    this.moodTime = 0;
  }

  idle(): void {
    this.mood = 'idle';
  }

  private tick(_time: number, delta: number): void {
    const p = this.parts;
    if (!p || !this.active) return;
    this.idleTime += delta;
    this.moodTime += delta;
    const t = this.idleTime;

    // Blink
    this.nextBlink -= delta;
    if (this.nextBlink <= 0) {
      this.blinkUntil = t + 130;
      this.nextBlink = 1800 + Math.random() * 3200;
    }
    const blinking = t < this.blinkUntil && this.mood !== 'sad';
    const headKey = partKey(this.avatar, blinking || this.mood === 'sad' ? 'blink' : 'head');
    if (p.head.texture.key !== headKey && this.scene.textures.exists(headKey)) p.head.setTexture(headKey);

    const walking = this.walkTime > 0;
    const swing = walking ? Math.sin(this.walkTime / 85) : 0;

    // Standard: let vip i kroppen
    let headAngle = Math.sin(t / 520) * 3;
    const breath = Math.sin(t / 260) * 1.5 * this.size;
    let bodyBob = 0;
    let armL = 8 + Math.sin(t / 600) * 4;
    let armR = -8 - Math.sin(t / 600) * 4;
    let legL = 0;
    let legR = 0;
    let rigAngle = 0;

    if (walking) {
      legL = swing * 28;
      legR = -swing * 28;
      armL = -swing * 32;
      armR = -swing * 32;
      bodyBob = -Math.abs(Math.cos(this.walkTime / 85)) * 6 * this.size;
      headAngle = swing * 4;
      rigAngle = swing * 3;
    } else if (this.mood === 'cheer') {
      const w = Math.sin(this.moodTime / 90);
      armL = 150 + w * 18;
      armR = -150 - w * 18;
      bodyBob = -Math.abs(Math.sin(this.moodTime / 180)) * 28 * this.size;
      headAngle = w * 6;
    } else if (this.mood === 'dance') {
      const b = this.moodTime / 160;
      armL = 90 + Math.sin(b * 2) * 70;
      armR = -90 + Math.sin(b * 2 + Math.PI) * 70;
      legL = Math.max(0, Math.sin(b)) * 30;
      legR = -Math.max(0, -Math.sin(b)) * 30;
      rigAngle = Math.sin(b) * 9;
      bodyBob = -Math.abs(Math.sin(b)) * 14 * this.size;
      headAngle = Math.sin(b * 2) * 10;
    } else if (this.mood === 'sad') {
      armL = 4;
      armR = -4;
      headAngle = 12 + Math.sin(t / 900) * 2;
      bodyBob = 4 * this.size;
    }

    p.legL.angle = legL;
    p.legR.angle = legR;
    p.armL.angle = armL;
    p.armR.angle = armR;
    p.head.angle = headAngle;
    const u = UNIT * this.size;
    p.head.y = (PART_PIVOTS.head.y - FEET.y) * u + breath;
    p.armL.y = p.armR.y = (PART_PIVOTS.arm.y - FEET.y) * u + breath * 0.5;
    if (!this.hopTween) this.rig.y = bodyBob;
    if (!this.scene.tweens.isTweening(this.rig)) this.rig.angle = rigAngle;
  }
}
