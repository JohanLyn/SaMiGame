import Phaser from 'phaser';
import { shade } from '@samigame/shared';
import { C, H, W } from './theme';
import { addSvg, ink, linear, loadSvg, radial, shine, svgDoc } from './svg';

/**
 * Genbrugelig scenografi tegnet som SVG: baggrunde, skyer, palmer, ø, solstråler.
 * Alle funktioner er synkrone hvis teksturen allerede findes; ellers tegnes den asynkront og dukker op.
 */

function ensure(scene: Phaser.Scene, key: string, svg: () => string, w: number, h: number): Promise<string> {
  return addSvg(scene, key, svg(), w, h);
}

/** Lodret gradient-baggrund over hele skærmen. */
export function gradientBackdrop(scene: Phaser.Scene, top: string, bottom: string, depth = -10000): Phaser.GameObjects.Image {
  const key = `bg-${top}-${bottom}`;
  const img = scene.add.image(W / 2, H / 2, '__WHITE').setDisplaySize(W, H).setDepth(depth).setTint(Phaser.Display.Color.HexStringToColor(bottom).color);
  void ensure(scene, key, () => svgDoc(64, 256, `<rect width="64" height="256" fill="url(#g)"/>`, linear('g', top, bottom)), 64, 256).then(() => {
    if (img.active) img.setTexture(key).clearTint().setDisplaySize(W, H);
  });
  return img;
}

/** Roterende solstråler – giver "fest"-stemning bag titler og menuer. */
export function sunburst(scene: Phaser.Scene, x: number, y: number, color: string = C.sun, alpha = 0.12, depth = -9000): Phaser.GameObjects.Image {
  const key = `burst-${color}`;
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a0 = (i / 18) * Math.PI * 2;
    const a1 = a0 + Math.PI / 18;
    const r = 1000;
    return `<path d="M500 500 L${500 + Math.cos(a0) * r} ${500 + Math.sin(a0) * r} L${500 + Math.cos(a1) * r} ${500 + Math.sin(a1) * r} Z" fill="${color}"/>`;
  }).join('');
  const img = scene.add.image(x, y, '__WHITE').setAlpha(0).setDepth(depth);
  void ensure(scene, key, () => svgDoc(1000, 1000, rays), 1000, 1000).then(() => {
    if (!img.active) return;
    img.setTexture(key).setDisplaySize(2600, 2600).setAlpha(alpha);
    scene.tweens.add({ targets: img, angle: 360, duration: 60000, repeat: -1 });
  });
  return img;
}

/** Fest-baggrund: dyb lilla gradient + solstråler + svævende bobler. Til menu-agtige scener. */
export function partyBackdrop(scene: Phaser.Scene, accent: string = C.grape): void {
  gradientBackdrop(scene, shade(accent, -0.35), C.night);
  sunburst(scene, W / 2, H * 0.45, shade(accent, 0.3), 0.1);
  for (let i = 0; i < 14; i++) {
    const r = Phaser.Math.Between(20, 70);
    const blob = scene.add
      .circle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), r, Phaser.Display.Color.HexStringToColor(shade(accent, 0.4)).color, 0.08)
      .setDepth(-8500);
    scene.tweens.add({
      targets: blob,
      y: blob.y - Phaser.Math.Between(80, 200),
      x: blob.x + Phaser.Math.Between(-60, 60),
      duration: Phaser.Math.Between(4000, 8000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

export const cloudSvg = () =>
  svgDoc(
    320,
    150,
    `<path d="M40 120 Q8 120 14 92 Q20 64 56 70 Q60 30 108 32 Q140 4 184 26 Q232 10 252 56 Q300 54 304 92 Q308 124 272 124 Z" fill="url(#c)" ${ink(7)}/>` +
      `<path d="M70 66 Q90 46 116 52" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity="0.8"/>`,
    linear('c', '#ffffff', '#d6e6ff'),
  );

/** Drivende skyer i baggrunden. */
export function clouds(scene: Phaser.Scene, count = 5, yMin = 40, yMax = 320, depth = -8000): void {
  const key = 'scenery-cloud';
  void ensure(scene, key, cloudSvg, 320, 150).then(() => {
    if (!scene.sys.isActive()) return;
    for (let i = 0; i < count; i++) {
      const s = Phaser.Math.FloatBetween(0.6, 1.3);
      const cloud = scene.add.image(Phaser.Math.Between(-100, W + 100), Phaser.Math.Between(yMin, yMax), key).setScale(s).setDepth(depth).setAlpha(0.95);
      const speed = Phaser.Math.Between(9, 22) * s;
      scene.tweens.add({
        targets: cloud,
        x: W + 260,
        duration: ((W + 260 - cloud.x) / speed) * 1000,
        onComplete: () => {
          cloud.x = -260;
          scene.tweens.add({ targets: cloud, x: W + 260, duration: ((W + 520) / speed) * 1000, repeat: -1 });
        },
      });
    }
  });
}

export const palmSvg = () =>
  svgDoc(
    260,
    360,
    `<path d="M124 352 Q112 250 136 140 Q140 128 152 132 Q140 250 150 352 Z" fill="url(#t)" ${ink(7)}/>` +
      `<path d="M124 300 L150 296 M122 250 L146 246 M126 200 L150 196 M132 160 L152 158" stroke="${shade('#8a5a2b', -0.3)}" stroke-width="5"/>` +
      [
        'M144 130 Q90 60 14 96 Q80 92 112 132 Z',
        'M144 130 Q200 50 250 100 Q190 88 160 134 Z',
        'M144 128 Q120 30 60 18 Q120 60 132 128 Z',
        'M146 128 Q190 24 236 34 Q186 64 156 130 Z',
        'M144 132 Q80 120 40 170 Q100 136 140 140 Z',
        'M148 132 Q210 120 238 172 Q190 140 152 140 Z',
      ]
        .map((d) => `<path d="${d}" fill="url(#l)" ${ink(6)}/>`)
        .join('') +
      `<circle cx="134" cy="138" r="13" fill="#8a5a2b" ${ink(5)}/><circle cx="154" cy="142" r="12" fill="#7a4a1b" ${ink(5)}/>`,
    linear('t', '#c98d4b', '#8a5a2b', true) + linear('l', '#7be04f', '#2f9e3a'),
  );

/** Palme der svajer let. Origin ved roden. */
export function palm(scene: Phaser.Scene, x: number, y: number, scale = 1, depth?: number): Phaser.GameObjects.Image {
  const key = 'scenery-palm';
  const img = scene.add.image(x, y, '__WHITE').setOrigin(0.55, 0.98).setAlpha(0);
  if (depth !== undefined) img.setDepth(depth);
  void ensure(scene, key, palmSvg, 260, 360).then(() => {
    if (!img.active) return;
    img.setTexture(key).setScale(scale).setAlpha(1);
    if (depth === undefined) img.setDepth(y);
    scene.tweens.add({ targets: img, angle: { from: -2, to: 2 }, duration: Phaser.Math.Between(1800, 2600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  });
  return img;
}

/** En ø (sand + græs) som ét billede. rx/ry = græs-ellipsens radier. */
export function islandSvg(rx: number, ry: number): string {
  const w = rx * 2 + 140;
  const h = ry * 2 + 150;
  const cx = w / 2;
  const cy = ry + 50;
  const tufts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 + 0.3;
    const r = 0.35 + ((i * 37) % 10) / 20;
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    return `<path d="M${x - 14} ${y + 6} Q${x - 8} ${y - 14} ${x - 2} ${y + 4} Q${x + 4} ${y - 18} ${x + 8} ${y + 4} Q${x + 14} ${y - 10} ${x + 16} ${y + 6} Z" fill="#3d9e2a"/>`;
  }).join('');
  const flowers = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 1.1;
    const x = cx + Math.cos(a) * rx * 0.72;
    const y = cy + Math.sin(a) * ry * 0.72;
    const col = ['#ff5fa2', '#ffcf3a', '#ffffff', '#9b5cff'][i % 4];
    return `<circle cx="${x}" cy="${y}" r="7" fill="${col}" ${ink(3)}/><circle cx="${x}" cy="${y}" r="2.5" fill="#ffcf3a"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<ellipse cx="${cx}" cy="${cy + 44}" rx="${rx + 66}" ry="${ry + 52}" fill="#2a8fd6" opacity="0.6"/>` +
      `<ellipse cx="${cx}" cy="${cy + 26}" rx="${rx + 52}" ry="${ry + 42}" fill="url(#s)" ${ink(8)}/>` +
      `<ellipse cx="${cx}" cy="${cy + 6}" rx="${rx}" ry="${ry}" fill="url(#g)" ${ink(8)}/>` +
      `<ellipse cx="${cx - rx * 0.25}" cy="${cy - ry * 0.45}" rx="${rx * 0.5}" ry="${ry * 0.2}" fill="#fff" opacity="0.18"/>` +
      tufts +
      flowers,
    linear('s', '#ffe7a8', '#e8b960') + radial('g', '#8ef25e', '#46b83a'),
  );
}

/** Hav med glimtende bølger. */
export function sea(scene: Phaser.Scene, top: number, depth = -9500): void {
  gradientBackdrop(scene, '#bfe9ff', '#47b8ff', depth - 10);
  const water = scene.add.rectangle(W / 2, (top + H) / 2, W, H - top, 0x2f9be8).setDepth(depth);
  void water;
  const key = 'scenery-sea';
  void ensure(
    scene,
    key,
    () => svgDoc(64, 256, `<rect width="64" height="256" fill="url(#w)"/>`, linear('w', '#4fc3ff', '#1f6fc9')),
    64,
    256,
  ).then(() => {
    if (!water.active) return;
    scene.add.image(W / 2, (top + H) / 2, key).setDisplaySize(W, H - top).setDepth(depth);
  });
  for (let i = 0; i < 26; i++) {
    const y = Phaser.Math.Between(top + 20, H - 10);
    const wave = scene.add
      .rectangle(Phaser.Math.Between(0, W), y, Phaser.Math.Between(40, 110), 6, 0xffffff, 0.35)
      .setDepth(depth + 1);
    scene.tweens.add({
      targets: wave,
      x: wave.x + Phaser.Math.Between(20, 50),
      alpha: 0.05,
      duration: Phaser.Math.Between(1400, 2800),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

export const sunSvg = () =>
  svgDoc(
    240,
    240,
    `<circle cx="120" cy="120" r="110" fill="#fff3a0" opacity="0.35"/><circle cx="120" cy="120" r="80" fill="url(#s)" ${ink(7)}/>` +
      `<ellipse cx="96" cy="92" rx="26" ry="12" fill="#fff" opacity="0.55"/>` +
      `<path d="M92 128 Q120 152 148 128" fill="none" ${ink(7)}/><circle cx="98" cy="110" r="8" fill="#1a1446"/><circle cx="142" cy="110" r="8" fill="#1a1446"/>` +
      `<ellipse cx="84" cy="132" rx="10" ry="6" fill="#ff8a5c" opacity="0.6"/><ellipse cx="156" cy="132" rx="10" ry="6" fill="#ff8a5c" opacity="0.6"/>`,
    radial('s', '#fff7b0', '#ffc928'),
  );

/** En glad sol der vipper. */
export function sun(scene: Phaser.Scene, x: number, y: number, scale = 1): void {
  void ensure(scene, 'scenery-sun', sunSvg, 240, 240).then(() => {
    if (!scene.sys.isActive()) return;
    const s = scene.add.image(x, y, 'scenery-sun').setScale(scale).setDepth(-8600);
    scene.tweens.add({ targets: s, angle: { from: -6, to: 6 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  });
}

/** Preload af scenografi i Boot (så den er klar med det samme). */
export function preloadScenery(scene: Phaser.Scene): void {
  loadSvg(scene, 'scenery-cloud', cloudSvg(), 320, 150);
  loadSvg(scene, 'scenery-palm', palmSvg(), 260, 360);
  loadSvg(scene, 'scenery-sun', sunSvg(), 240, 240);
}

export { shine };
