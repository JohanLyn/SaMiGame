import Phaser from 'phaser';
import { shade, type ControllerLayout } from '@samigame/shared';
import { shuffle } from '../../game/rng';
import type { MinigameKind } from '../../game/types';
import type { PlayerView } from '../../flow/types';
import type { VoiceKey } from '../../kit/audio';
import { sunburst } from '../../kit/scenery';
import { addSvg, ink, linear, radial, shine, svgDoc } from '../../kit/svg';
import { TEX } from '../../kit/textures';
import { C, H, N, W } from '../../kit/theme';
import { body, label, title } from '../../kit/ui';
import type { RitualScene } from '../_framework/RitualScene';

/**
 * Fælles hjælpere til hub-ritualerne (Fiskesøen, Den Store Væg, Grabbe-automaten, Vulkanen, Due-posten).
 * Ligger her fordi agenten kun måtte røre sine egne ritual-mapper – kunne med fordel flyttes til `_framework/`.
 */

export const KIND_LABEL: Record<MinigameKind, string> = {
  ffa: 'ALLE MOD ALLE',
  '2v2': '2 MOD 2',
  '1v3': '1 MOD 3',
};

/** Ikon + farve til "lokkemad" (fisk, låger, kapsler ...). */
export interface Lure {
  icon: string;
  color: string;
  title: string;
}

/** Sjove reserve-ikoner, hvis der (endnu) er meget få minigames registreret. */
const JOKE_LURES: Lure[] = [
  { icon: '🧦', color: C.grape, title: 'En sok' },
  { icon: '🥒', color: C.mint, title: 'Agurk' },
  { icon: '🦆', color: C.sun, title: 'And' },
  { icon: '🧀', color: C.tangerine, title: 'Ost' },
  { icon: '🎺', color: C.bubblegum, title: 'Trompet' },
  { icon: '🍕', color: C.tomato, title: 'Pizza' },
];

/** `n` stykker lokkemad fra alle minigames (pick kun med hvis `includePick`). */
export function lures(scene: RitualScene, n: number, includePick = false): Lure[] {
  const others = scene.all.filter((m) => m.id !== scene.pick.id).map((m) => ({ icon: m.icon, color: m.color, title: m.title }));
  let pool: Lure[] = shuffle(scene.rng, others);
  if (pool.length < 4) pool = [...pool, ...shuffle(scene.rng, JOKE_LURES)];
  const out = Array.from({ length: n }, (_, i) => pool[i % pool.length]);
  if (includePick && n > 0) out[Math.floor(scene.rng() * n)] = { icon: scene.pick.icon, color: scene.pick.color, title: scene.pick.title };
  return out;
}

/** Emoji-ikon som tekst (uden kontur – farve-emojis ser bedst ud rene). */
export function emoji(scene: Phaser.Scene, x: number, y: number, icon: string, size: number): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, icon, { fontFamily: 'Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif', fontSize: `${size}px` })
    .setOrigin(0.5)
    .setPadding(size * 0.12, size * 0.12, size * 0.12, size * 0.12);
}

/** Venteskærm på alle telefoner (sættes før `done()`). */
export function waitLayout(scene: RitualScene, message?: string): ControllerLayout {
  return { kind: 'wait', title: 'Kig på TV’et!', message: message ?? `Næste spil: ${scene.pick.title}`, emoji: scene.pick.icon };
}

// ---------------------------------------------------------------------------
// Overskrift (ritualets navn + kort instruktion) øverst på skærmen

function ribbonSvg(color: string, w: number, h: number): string {
  const t = 70;
  const body =
    // Haler
    `<path d="M10 ${h * 0.34} L${t + 26} ${h * 0.34} L${t + 26} ${h - 14} L10 ${h - 14} L${t * 0.45} ${h * 0.66} Z" fill="${shade(color, -0.35)}" ${ink(7)}/>` +
    `<path d="M${w - 10} ${h * 0.34} L${w - t - 26} ${h * 0.34} L${w - t - 26} ${h - 14} L${w - 10} ${h - 14} L${w - t * 0.45} ${h * 0.66} Z" fill="${shade(color, -0.35)}" ${ink(7)}/>` +
    // Skygge + bånd
    `<path d="M${t} 22 Q${w / 2} 2 ${w - t} 22 L${w - t} ${h - 40} Q${w / 2} ${h - 60} ${t} ${h - 40} Z" fill="#000" opacity="0.3" transform="translate(0 10)"/>` +
    `<path d="M${t} 14 Q${w / 2} -6 ${w - t} 14 L${w - t} ${h - 46} Q${w / 2} ${h - 66} ${t} ${h - 46} Z" fill="url(#rb)" ${ink(8)}/>` +
    `<path d="M${t + 24} 30 Q${w / 2} 12 ${w - t - 24} 30" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.35"/>` +
    `<path d="M${t + 14} ${h - 62} Q${w / 2} ${h - 80} ${w - t - 14} ${h - 62}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="12 12" opacity="0.4"/>`;
  return svgDoc(w, h, body, linear('rb', shade(color, 0.25), shade(color, -0.15)));
}

export interface Header {
  root: Phaser.GameObjects.Container;
  setHint(text: string, color?: string): void;
  /** Skub overskriften op/væk. */
  hide(): void;
}

/** Bånd med ritualets navn øverst + en hjælpelinje. Falder ind fra toppen. */
export function ritualHeader(scene: RitualScene, name: string, hint: string, color: string): Header {
  const w = 860;
  const h = 170;
  const key = `ritual-ribbon-${color}`;
  const root = scene.add.container(W / 2, -200).setDepth(7000);
  const rib = scene.add.image(0, 0, '__WHITE').setAlpha(0);
  void addSvg(scene, key, ribbonSvg(color, w, h), w, h).then(() => {
    if (rib.active) rib.setTexture(key).setAlpha(1);
  });
  const t = title(scene, 0, -18, name, 74, { color: C.cream });
  const maxW = w - 200;
  if (t.width > maxW) t.setScale(maxW / t.width);
  const hintBg = scene.add.graphics();
  const hintText = body(scene, 0, 100, hint, 34, { stroke: 7 });
  const drawHint = () => {
    const hw = hintText.width + 60;
    hintBg.clear();
    hintBg.fillStyle(N.ink, 0.82).fillRoundedRect(-hw / 2, 100 - 30, hw, 60, 30);
    hintBg.lineStyle(4, 0xffffff, 0.25).strokeRoundedRect(-hw / 2 + 5, 100 - 25, hw - 10, 50, 25);
  };
  drawHint();
  root.add([rib, t, hintBg, hintText]);
  scene.tweens.add({ targets: root, y: 92, duration: 700, ease: 'Bounce.easeOut' });
  scene.tweens.add({ targets: t, angle: { from: -2, to: 2 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.sfx('whoosh');
  return {
    root,
    setHint(text, col = C.cream) {
      hintText.setText(text).setColor(col);
      drawHint();
      hintText.setScale(1.3);
      scene.tweens.add({ targets: hintText, scale: 1, duration: 260, ease: 'Back.easeOut' });
    },
    hide() {
      scene.tweens.add({ targets: root, y: -260, duration: 420, ease: 'Back.easeIn' });
    },
  };
}

// ---------------------------------------------------------------------------
// Stor tekst midt på skærmen ("NU!", "ATJUU!")

export function shout(scene: RitualScene, text: string, opts: { x?: number; y?: number; color?: string; size?: number; hold?: number; angle?: number } = {}): Phaser.GameObjects.Text {
  const t = title(scene, opts.x ?? W / 2, opts.y ?? H / 2, text, opts.size ?? 180, { color: opts.color ?? C.sun })
    .setDepth(8700)
    .setAngle(opts.angle ?? -6)
    .setScale(0.2);
  scene.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, angle: (opts.angle ?? -6) + 6, duration: 120, yoyo: true, repeat: 3 });
  scene.tweens.add({
    targets: t,
    alpha: 0,
    scale: 1.4,
    delay: opts.hold ?? 700,
    duration: 260,
    onComplete: () => t.destroy(),
  });
  return t;
}

// ---------------------------------------------------------------------------
// Afsløringen: "NÆSTE SPIL: ..."

const CARD_W = 1000;
const CARD_H = 630;

function revealCardSvg(color: string): string {
  const w = CARD_W + 40;
  const h = CARD_H + 50;
  const x = 20;
  const y = 14;
  const dots = Array.from({ length: 60 }, (_, i) => {
    const cx = x + 40 + (i % 12) * 84 + (Math.floor(i / 12) % 2) * 42;
    const cy = y + 40 + Math.floor(i / 12) * 110;
    return `<circle cx="${cx}" cy="${cy}" r="9" fill="#fff" opacity="0.09"/>`;
  }).join('');
  const star = (sx: number, sy: number, r: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      return `${sx + Math.cos(a) * rr},${sy + Math.sin(a) * rr}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="${C.sun}" ${ink(5)}/>`;
  };
  return svgDoc(
    w,
    h,
    `<rect x="${x}" y="${y + 22}" width="${CARD_W}" height="${CARD_H}" rx="56" fill="#000" opacity="0.4"/>` +
      `<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="56" fill="url(#cg)" ${ink(14)}/>` +
      dots +
      `<rect x="${x + 26}" y="${y + 26}" width="${CARD_W - 52}" height="${CARD_H - 52}" rx="38" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="26 16" opacity="0.45"/>` +
      `<rect x="${x + 18}" y="${y + 14}" width="${CARD_W - 36}" height="${CARD_H * 0.36}" rx="44" fill="#fff" opacity="0.13"/>` +
      shine(x + 70, y + 28, 260, 20, 0.5) +
      star(x + 70, y + CARD_H - 70, 34) +
      star(x + CARD_W - 70, y + CARD_H - 70, 34) +
      star(x + 70, y + 74, 26) +
      star(x + CARD_W - 70, y + 74, 26),
    linear('cg', shade(color, 0.3), shade(color, -0.32)),
  );
}

function medallionSvg(): string {
  return svgDoc(
    300,
    300,
    `<circle cx="150" cy="158" r="128" fill="#000" opacity="0.3"/>` +
      `<circle cx="150" cy="150" r="128" fill="url(#md)" ${ink(12)}/>` +
      `<circle cx="150" cy="150" r="104" fill="none" stroke="#e6a100" stroke-width="8" opacity="0.6"/>` +
      `<ellipse cx="110" cy="92" rx="52" ry="24" fill="#fff" opacity="0.55" transform="rotate(-25 110 92)"/>`,
    radial('md', '#fffbe6', '#ffcf3a'),
  );
}

function pillSvg(w: number, h: number, color: string): string {
  return svgDoc(
    w + 16,
    h + 20,
    `<rect x="8" y="14" width="${w}" height="${h}" rx="${h / 2}" fill="#000" opacity="0.35"/>` +
      `<rect x="8" y="6" width="${w}" height="${h}" rx="${h / 2}" fill="url(#pl)" ${ink(7)}/>` +
      shine(8 + h * 0.4, 12, w * 0.4, 9, 0.4),
    linear('pl', shade(color, 0.2), shade(color, -0.25)),
  );
}

function glowSvg(): string {
  return svgDoc(
    256,
    256,
    `<circle cx="128" cy="128" r="126" fill="url(#gl)"/>`,
    `<radialGradient id="gl"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  );
}

/** Forbered afslørings-teksturerne (kald i `preload()` eller `setup()`). */
export function prepareReveal(scene: RitualScene): Promise<unknown> {
  const color = scene.pick.color;
  return Promise.all([
    addSvg(scene, `reveal-card-${color}`, revealCardSvg(color), CARD_W + 40, CARD_H + 50),
    addSvg(scene, 'reveal-medal', medallionSvg(), 300, 300),
    addSvg(scene, 'reveal-ribbon', ribbonSvg(C.bubblegum, 780, 170), 780, 170),
    addSvg(scene, 'reveal-glow', glowSvg(), 256, 256),
    addSvg(scene, `reveal-pill-${color}`, pillSvg(400, 66, shade(color, -0.35)), 416, 86),
  ]);
}

/**
 * Den store finale i hvert ritual: kortet med næste minigame flyver ind fra (x, y) og foldes ud.
 * Resolver når kortet har været vist længe nok – kald så `done()`.
 */
export async function revealPick(
  scene: RitualScene,
  opts: { x?: number; y?: number; winner?: PlayerView | null; caption?: string; hold?: number } = {},
): Promise<void> {
  await prepareReveal(scene);
  if (!scene.sys.isActive()) return;
  const pick = scene.pick;
  const cx = W / 2;
  const cy = H / 2 + 20;
  const D = 7600;

  const dim = scene.add.rectangle(W / 2, H / 2, W, H, N.night, 0).setDepth(D - 20);
  scene.tweens.add({ targets: dim, fillAlpha: 0.72, duration: 350 });
  const rays = sunburst(scene, cx, cy - 40, shade(pick.color, 0.35), 0.22, D - 10);
  rays.setScale(0.2);
  scene.tweens.add({ targets: rays, scale: 1, duration: 700, ease: 'Cubic.easeOut' });

  const glow = scene.add.image(cx, cy - 40, 'reveal-glow').setDepth(D - 5).setScale(0).setTint(Phaser.Display.Color.HexStringToColor(shade(pick.color, 0.5)).color);
  scene.tweens.add({ targets: glow, scale: 5.5, alpha: 0.7, duration: 600, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: glow, scale: 6.2, duration: 1200, delay: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  const card = scene.add.container(opts.x ?? cx, opts.y ?? cy).setDepth(D).setScale(0.08).setAngle(-30);
  const bg = scene.add.image(0, 0, `reveal-card-${pick.color}`);
  const medal = scene.add.image(0, -170, 'reveal-medal').setScale(0.9);
  const icon = emoji(scene, 0, -170, pick.icon, 150);
  const name = title(scene, 0, 30, pick.title, 96, { color: C.sun, wrap: 900 });
  if (name.width > 900) name.setScale(900 / name.width);
  const tag = body(scene, 0, 128, pick.tagline, 32, { wrap: 860, stroke: 7 });
  const pill = scene.add.image(0, 250, `reveal-pill-${pick.color}`);
  const kind = label(scene, 0, 246, KIND_LABEL[pick.kind], 34, { color: C.cream });
  card.add([bg, medal, icon, name, tag, pill, kind]);

  scene.sfx('whoosh');
  scene.sfx('swish', { delay: 0.1 });
  scene.tweens.add({ targets: card, x: cx, y: cy, angle: 0, scale: 1, duration: 650, ease: 'Back.easeOut' });

  const ribbon = scene.add.container(cx, cy - 365).setDepth(D + 5).setScale(0);
  ribbon.add([scene.add.image(0, 0, 'reveal-ribbon'), title(scene, 0, -18, 'NÆSTE SPIL:', 70, { color: C.cream })]);

  await wait(scene, 560);
  if (!scene.sys.isActive()) return;
  scene.fx.flash(0xffffff, 220, 0.75);
  scene.fx.shake(0.012, 260);
  scene.fx.punch(0.05, 220);
  scene.fx.confetti(1600);
  scene.fx.burst(cx, cy - 170, { texture: TEX.star, color: [N.sun, 0xffffff, N.bubblegum], count: 26, speed: 950, scale: 0.75, depth: D + 10 });
  scene.sfx('explosion', { volume: 0.35 });
  scene.sfx('fanfare');
  scene.say(`next_${pick.id}` as VoiceKey, true);
  scene.tweens.add({ targets: ribbon, scale: 1, duration: 420, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: ribbon, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  icon.setScale(0.2);
  scene.tweens.add({ targets: icon, scale: 1, duration: 700, ease: 'Elastic.easeOut' });
  scene.tweens.add({ targets: icon, angle: { from: -8, to: 8 }, duration: 700, delay: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: card, y: cy - 10, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 700 });

  // Glimt rundt om kortet
  const sparkle = scene.add.particles(0, 0, TEX.spark, {
    x: { min: cx - CARD_W / 2, max: cx + CARD_W / 2 },
    y: { min: cy - CARD_H / 2 - 60, max: cy + CARD_H / 2 },
    scale: { start: 0.9, end: 0 },
    alpha: { start: 1, end: 0 },
    rotate: { min: 0, max: 180 },
    lifespan: 900,
    frequency: 120,
    tint: [N.sun, 0xffffff, N.mint],
  });
  sparkle.setDepth(D + 8);

  if (opts.winner || opts.caption) {
    const who = opts.winner;
    const text = opts.caption ?? `${who!.name} fandt det!`;
    const cap = scene.add.container(cx, cy + 405).setDepth(D + 6).setScale(0);
    const t = label(scene, 0, 0, text, 46, { color: '#ffffff' });
    const pw = t.width + 70;
    const g = scene.add.graphics();
    const col = who ? who.colorNum : N.grape;
    g.fillStyle(N.ink, 1).fillRoundedRect(-pw / 2 - 6, -38, pw + 12, 88, 44);
    g.fillStyle(col, 1).fillRoundedRect(-pw / 2, -36, pw, 74, 37);
    g.fillStyle(0xffffff, 0.25).fillRoundedRect(-pw / 2 + 24, -30, pw - 48, 18, 9);
    cap.add([g, t]);
    scene.tweens.add({ targets: cap, scale: 1, duration: 420, delay: 380, ease: 'Back.easeOut', onStart: () => scene.sfx('pop') });
  }

  // Dev: `?revealhold=<ms>` holder kortet længere (til screenshots).
  const devHold = Number(new URLSearchParams(location.search).get('revealhold') ?? 0);
  await wait(scene, devHold || (opts.hold ?? 3300));
}

/** Vent i scene-tid (følger `?speed=`). */
export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => scene.time.delayedCall(ms, () => resolve()));
}

/** En tilfældig værdi mellem a og b fra scenens rng. */
export function rand(scene: RitualScene, a: number, b: number): number {
  return a + scene.rng() * (b - a);
}
