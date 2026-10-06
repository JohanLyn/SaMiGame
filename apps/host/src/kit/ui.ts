import Phaser from 'phaser';
import { shade } from '@samigame/shared';
import { C, FONT_BODY, FONT_DISPLAY, N } from './theme';
import { addSvg, ink, linear, shine, svgDoc } from './svg';

type TextOpts = { color?: string; stroke?: number; align?: string; wrap?: number };

/** Stor titeltekst i Lilita One med kontur og skygge. */
export function title(scene: Phaser.Scene, x: number, y: number, text: string, size = 96, opts: TextOpts = {}): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_DISPLAY,
      fontSize: `${size}px`,
      color: opts.color ?? C.cream,
      align: opts.align ?? 'center',
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    })
    .setOrigin(0.5)
    .setStroke(C.ink, opts.stroke ?? Math.max(6, size * 0.14))
    .setShadow(0, Math.max(4, size * 0.07), C.ink, 0, true, true)
    .setPadding(8, 8, 8, 8);
}

/** Mellemstor label (Lilita One, mindre kontur). */
export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 40, opts: TextOpts = {}): Phaser.GameObjects.Text {
  return title(scene, x, y, text, size, { stroke: Math.max(5, size * 0.16), ...opts });
}

/** Brødtekst i Nunito 800. */
export function body(scene: Phaser.Scene, x: number, y: number, text: string, size = 32, opts: TextOpts = {}): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_BODY,
      fontStyle: '800',
      fontSize: `${size}px`,
      color: opts.color ?? C.cream,
      align: opts.align ?? 'center',
      wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
      lineSpacing: size * 0.15,
    })
    .setOrigin(0.5)
    .setStroke(C.ink, opts.stroke ?? 0)
    .setPadding(4, 4, 4, 4);
}

/**
 * Blankt panel med gradient, kontur, bevel og skygge. Tegnes som SVG og caches pr. størrelse/farve.
 * Returnerer et Image (origin 0.5) – brug det som baggrund for kort, skilte, scoreboards osv.
 */
export async function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string = C.deep,
  opts: { radius?: number; stroke?: number; shadow?: number } = {},
): Promise<Phaser.GameObjects.Image> {
  const key = panelKey(w, h, color, opts);
  await addSvg(scene, key, panelSvg(w, h, color, opts), w + 24, h + 30);
  return scene.add.image(x, y + 6, key);
}

/** Synkron variant til brug i preload(): `preloadPanel(this, w, h, color)` → `this.add.image(x, y, key)`. */
export function panelKey(w: number, h: number, color: string, opts: { radius?: number; stroke?: number; shadow?: number } = {}): string {
  return `panel-${w}x${h}-${color}-${opts.radius ?? ''}-${opts.stroke ?? ''}-${opts.shadow ?? ''}`;
}

export function panelSvg(w: number, h: number, color: string, opts: { radius?: number; stroke?: number; shadow?: number } = {}): string {
  const r = opts.radius ?? Math.min(36, h * 0.3);
  const sw = opts.stroke ?? 7;
  const sh = opts.shadow ?? 12;
  const W = w + 24;
  const Hh = h + 30;
  const x = 12;
  const y = 6;
  return svgDoc(
    W,
    Hh,
    `<rect x="${x}" y="${y + sh}" width="${w}" height="${h}" rx="${r}" fill="#000" opacity="0.35"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#p)" ${ink(sw)}/>` +
      `<rect x="${x + sw}" y="${y + sw}" width="${w - sw * 2}" height="${Math.min(h * 0.42, 70)}" rx="${Math.max(4, r - sw)}" fill="#fff" opacity="0.1"/>` +
      shine(x + r * 0.7, y + sw + 6, Math.min(w * 0.3, 160), Math.max(6, Math.min(14, h * 0.06)), 0.35),
    linear('p', shade(color, 0.18), shade(color, -0.22)),
  );
}

/** Rundt badge med et tal/ikon (fx placering "1"). */
export function badgeSvg(color: string, size = 96): string {
  return svgDoc(
    size,
    size,
    `<circle cx="${size / 2}" cy="${size / 2 + 4}" r="${size / 2 - 6}" fill="#000" opacity="0.3"/>` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 6}" fill="url(#b)" ${ink(6)}/>` +
      shine(size * 0.28, size * 0.2, size * 0.3, size * 0.08, 0.5),
    linear('b', shade(color, 0.2), shade(color, -0.2)),
  );
}

/**
 * Timer-HUD øverst på skærmen. Kald `set(secondsLeft)` hvert frame; bliver rød og pulserer de sidste 5 sek.
 */
export class TimerHud {
  readonly container: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private readonly ring: Phaser.GameObjects.Graphics;
  private last = -1;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, private readonly total: number) {
    this.ring = scene.add.graphics();
    const bg = scene.add.circle(0, 0, 62, N.ink, 0.85).setStrokeStyle(6, N.ink);
    this.text = title(scene, 0, 2, '', 60);
    this.container = scene.add.container(x, y, [bg, this.ring, this.text]).setDepth(7000).setScrollFactor(0);
  }

  set(secondsLeft: number): void {
    const s = Math.max(0, Math.ceil(secondsLeft));
    const frac = Math.max(0, secondsLeft / this.total);
    this.ring.clear();
    this.ring.lineStyle(12, s <= 5 ? N.tomato : N.sun, 1);
    this.ring.beginPath();
    this.ring.arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
    this.ring.strokePath();
    if (s !== this.last) {
      this.last = s;
      this.text.setText(String(s)).setColor(s <= 5 ? '#ff8080' : C.cream);
      if (s <= 5 && s > 0) {
        this.container.setScale(1.25);
        this.scene.tweens.add({ targets: this.container, scale: 1, duration: 250, ease: 'Back.easeOut' });
      }
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}

/** Navneskilt i spillerens farve (bruges over figurer og i scoreboards). */
export function nameTag(scene: Phaser.Scene, x: number, y: number, name: string, color: string, size = 30): Phaser.GameObjects.Container {
  const text = scene.add
    .text(0, 0, name, { fontFamily: FONT_DISPLAY, fontSize: `${size}px`, color: '#ffffff' })
    .setOrigin(0.5)
    .setStroke(C.ink, size * 0.22);
  const w = text.width + size * 0.9;
  const h = size * 1.45;
  const g = scene.add.graphics();
  g.fillStyle(N.ink, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 4 + 4, w + 8, h + 8, h / 2 + 4);
  g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.fillStyle(0xffffff, 0.25).fillRoundedRect(-w / 2 + h * 0.3, -h / 2 + 4, w - h * 0.6, h * 0.28, h * 0.14);
  return scene.add.container(x, y, [g, text]);
}
