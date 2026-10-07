import Phaser from 'phaser';
import { shade } from '@samigame/shared';
import { audio } from '../kit/audio';
import { Fx } from '../kit/fx';
import { gradientBackdrop } from '../kit/scenery';
import { eyes, ink, linear, loadSvg, radial, shine, svgDoc } from '../kit/svg';
import { TEX } from '../kit/textures';
import { C, H, N, W } from '../kit/theme';
import { body, title } from '../kit/ui';
import { Blok } from '../objects/Blok';
import { ScoreCard, layoutRow } from '../objects/ScoreCard';
import type { ChaosData, Director } from '../flow/Director';

const CARD_W = 470;
const CARD_H = 640;
const PAD = 30;

function star(x: number, y: number, r: number, fill: string): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="${fill}" ${ink(4)}/>`;
}

/** Fælles kort-ramme: skygge, gradient, kontur, guldhjørner og glans. */
function frame(inner: string): string {
  const x = PAD;
  const y = PAD - 10;
  return (
    `<rect x="${x}" y="${y + 24}" width="${CARD_W}" height="${CARD_H}" rx="44" fill="#000" opacity="0.4"/>` +
    `<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="44" fill="url(#cg)" ${ink(12)}/>` +
    inner +
    `<rect x="${x + 22}" y="${y + 22}" width="${CARD_W - 44}" height="${CARD_H - 44}" rx="28" fill="none" stroke="#ffcf3a" stroke-width="7"/>` +
    `<rect x="${x + 22}" y="${y + 22}" width="${CARD_W - 44}" height="${CARD_H - 44}" rx="28" fill="none" ${ink(3)}/>` +
    star(x + 34, y + 34, 22, C.sun) +
    star(x + CARD_W - 34, y + 34, 22, C.sun) +
    star(x + 34, y + CARD_H - 34, 22, C.sun) +
    star(x + CARD_W - 34, y + CARD_H - 34, 22, C.sun) +
    `<path d="M${x + 60} ${y + 14} L${x + CARD_W - 60} ${y + 14}" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.35"/>` +
    shine(x + 40, y + 44, 120, 14, 0.35)
  );
}

/** Bagsiden: lilla hvirvel med et frækt grin og spørgsmålstegn. */
function backSvg(): string {
  const w = CARD_W + PAD * 2;
  const h = CARD_H + PAD * 2;
  const cx = PAD + CARD_W / 2;
  const cy = PAD - 10 + CARD_H / 2;
  const swirl = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const x2 = cx + Math.cos(a) * 420;
    const y2 = cy + Math.sin(a) * 420;
    const c1x = cx + Math.cos(a + 0.9) * 200;
    const c1y = cy + Math.sin(a + 0.9) * 200;
    return `<path d="M${cx} ${cy} Q${c1x} ${c1y} ${x2} ${y2}" fill="none" stroke="#fff" stroke-width="26" opacity="0.08" stroke-linecap="round"/>`;
  }).join('');
  const qs = Array.from({ length: 14 }, (_, i) => {
    const qx = PAD + 70 + ((i * 131) % (CARD_W - 140));
    const qy = PAD + 60 + ((i * 197) % (CARD_H - 120));
    return `<text x="${qx}" y="${qy}" font-size="${40 + (i % 3) * 14}" font-family="Arial Black, sans-serif" font-weight="900" fill="#fff" opacity="0.12" text-anchor="middle" transform="rotate(${(i % 5) * 12 - 24} ${qx} ${qy})">?</text>`;
  }).join('');
  const face =
    `<circle cx="${cx}" cy="${cy - 30}" r="128" fill="url(#fc)" ${ink(10)}/>` +
    eyes(cx, cy - 64, 92, 30, [6, 4]) +
    `<path d="M${cx - 110} ${cy - 128} L${cx - 30} ${cy - 104}" ${ink(12)}/><path d="M${cx + 110} ${cy - 128} L${cx + 30} ${cy - 104}" ${ink(12)}/>` +
    `<path d="M${cx - 80} ${cy + 4} Q${cx} ${cy + 90} ${cx + 80} ${cy + 4} Q${cx} ${cy + 36} ${cx - 80} ${cy + 4} Z" fill="#3a0a3a" ${ink(8)}/>` +
    `<path d="M${cx - 50} ${cy + 22} L${cx - 40} ${cy + 40} L${cx - 28} ${cy + 26} Z M${cx + 50} ${cy + 22} L${cx + 40} ${cy + 40} L${cx + 28} ${cy + 26} Z" fill="#fff"/>` +
    `<ellipse cx="${cx - 60}" cy="${cy - 120}" rx="30" ry="14" fill="#fff" opacity="0.4"/>`;
  const banner =
    `<path d="M${cx - 170} ${cy + 170} L${cx + 170} ${cy + 170} L${cx + 150} ${cy + 236} L${cx - 150} ${cy + 236} Z" fill="url(#bn)" ${ink(8)}/>`;
  return svgDoc(
    w,
    h,
    frame(swirl + qs + face + banner),
    linear('cg', '#b07aff', '#4a1a9a') + radial('fc', '#ff9ad0', '#c42a8a') + linear('bn', '#ffe26a', '#e6a100'),
  );
}

/** Forsiden i kortets farve: medaljon til emoji, navnebånd og beskrivelsesfelt. */
function frontSvg(color: string): string {
  const w = CARD_W + PAD * 2;
  const h = CARD_H + PAD * 2;
  const cx = PAD + CARD_W / 2;
  const top = PAD - 10;
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a0 = (i / 16) * Math.PI * 2;
    const a1 = a0 + Math.PI / 16;
    const r = 330;
    const oy = top + 170;
    return `<path d="M${cx} ${oy} L${cx + Math.cos(a0) * r} ${oy + Math.sin(a0) * r} L${cx + Math.cos(a1) * r} ${oy + Math.sin(a1) * r} Z" fill="#fff" opacity="0.08"/>`;
  }).join('');
  const inner =
    rays +
    `<circle cx="${cx}" cy="${top + 170}" r="112" fill="#000" opacity="0.25"/>` +
    `<circle cx="${cx}" cy="${top + 162}" r="112" fill="url(#md)" ${ink(10)}/>` +
    `<circle cx="${cx}" cy="${top + 162}" r="92" fill="none" stroke="#e6a100" stroke-width="6" opacity="0.6"/>` +
    `<ellipse cx="${cx - 40}" cy="${top + 110}" rx="36" ry="16" fill="#fff" opacity="0.6" transform="rotate(-25 ${cx - 40} ${top + 110})"/>` +
    // Navnebånd
    `<path d="M${PAD - 14} ${top + 300} L${PAD + CARD_W + 14} ${top + 300} L${PAD + CARD_W - 4} ${top + 400} L${PAD + 4} ${top + 400} Z" fill="url(#rb)" ${ink(9)}/>` +
    `<path d="M${PAD + 10} ${top + 314} L${PAD + CARD_W - 10} ${top + 314}" stroke="#fff" stroke-width="6" opacity="0.3" stroke-linecap="round"/>` +
    // Beskrivelsesfelt
    `<rect x="${PAD + 46}" y="${top + 428}" width="${CARD_W - 92}" height="150" rx="24" fill="#000" opacity="0.28"/>` +
    `<rect x="${PAD + 46}" y="${top + 428}" width="${CARD_W - 92}" height="150" rx="24" fill="none" stroke="#fff" stroke-width="4" opacity="0.3"/>`;
  return svgDoc(
    w,
    h,
    frame(inner),
    linear('cg', shade(color, 0.3), shade(color, -0.35)) + radial('md', '#fffbe6', '#ffcf3a') + linear('rb', shade(color, -0.25), shade(color, -0.5)),
  );
}

function spiralSvg(): string {
  const arms = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    let d = 'M500 500';
    for (let k = 1; k <= 24; k++) {
      const r = k * 22;
      const ang = a + k * 0.28;
      d += ` L${500 + Math.cos(ang) * r} ${500 + Math.sin(ang) * r}`;
    }
    return `<path d="${d}" fill="none" stroke="#fff" stroke-width="${46}" stroke-linecap="round" stroke-linejoin="round" opacity="${i % 2 ? 0.1 : 0.06}"/>`;
  }).join('');
  return svgDoc(1000, 1000, arms);
}

function glowSvg(): string {
  return svgDoc(
    256,
    256,
    `<circle cx="128" cy="128" r="126" fill="url(#g)"/>`,
    `<radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  );
}

function miniCardSvg(): string {
  return svgDoc(
    90,
    120,
    `<rect x="6" y="6" width="78" height="108" rx="14" fill="url(#m)" ${ink(5)}/><text x="45" y="80" font-size="56" font-family="Arial Black, sans-serif" font-weight="900" fill="#fff" opacity="0.9" text-anchor="middle">?</text>`,
    linear('m', '#c49bff', '#5a2ab8'),
  );
}

/** Et kaos-kort vendes: viser effekten, og øjeblikkelige kort ændrer stillingen live. */
export class ChaosScene extends Phaser.Scene {
  private d!: ChaosData;

  constructor() {
    super('chaos');
  }

  init(data: ChaosData): void {
    this.d = data;
  }

  preload(): void {
    loadSvg(this, 'chaos-back2', backSvg(), CARD_W + PAD * 2, CARD_H + PAD * 2);
    loadSvg(this, `chaos-front2-${this.d.card.color}`, frontSvg(this.d.card.color), CARD_W + PAD * 2, CARD_H + PAD * 2);
    loadSvg(this, 'chaos-spiral', spiralSvg(), 1000, 1000);
    loadSvg(this, 'chaos-glow', glowSvg(), 256, 256);
    loadSvg(this, 'chaos-mini', miniCardSvg(), 90, 120);
  }

  create(): void {
    // Dev: `?chaosslow=0.25` sænker tempoet (til screenshots).
    const slow = Number(new URLSearchParams(location.search).get('chaosslow') ?? 1) || 1;
    this.time.timeScale = slow;
    this.tweens.timeScale = slow;

    const fx = new Fx(this);
    const { card, players, before, message } = this.d;
    const col = Phaser.Display.Color.HexStringToColor(card.color).color;

    // --- Baggrund: hvirvel, glød, svævende mini-kort
    gradientBackdrop(this, shade(card.color, -0.45), C.night);
    const spiral = this.add.image(W / 2, H / 2 - 20, 'chaos-spiral').setDisplaySize(2400, 2400).setDepth(-9000).setTint(Phaser.Display.Color.HexStringToColor(shade(card.color, 0.4)).color);
    this.tweens.add({ targets: spiral, angle: -360, duration: 22000, repeat: -1 });
    const spiral2 = this.add.image(W / 2, H / 2 - 20, 'chaos-spiral').setDisplaySize(1500, 1500).setDepth(-8990).setAlpha(0.7);
    this.tweens.add({ targets: spiral2, angle: 360, duration: 15000, repeat: -1 });
    for (let i = 0; i < 12; i++) {
      const m = this.add
        .image(Phaser.Math.Between(0, W), Phaser.Math.Between(100, H), 'chaos-mini')
        .setDepth(-8500)
        .setAlpha(0.35)
        .setScale(Phaser.Math.FloatBetween(0.4, 0.9))
        .setAngle(Phaser.Math.Between(-30, 30));
      this.tweens.add({ targets: m, y: m.y - Phaser.Math.Between(140, 320), angle: m.angle + Phaser.Math.Between(-90, 90), duration: Phaser.Math.Between(5000, 9000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add
      .particles(0, 0, TEX.spark, {
        x: { min: 0, max: W },
        y: { min: 0, max: H },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 1200,
        frequency: 90,
        tint: [N.sun, N.bubblegum, 0xffffff, N.mint],
      })
      .setDepth(-8000);
    fx.vignette(0.9);
    audio.music('silly');
    audio.say('chaos', true);

    // --- Overskrift: KAOS-KORT! med dansende bogstaver
    const word = 'KAOS-KORT!';
    const letters = [...word].map((ch, i) => title(this, 0, 104, ch, 118, { color: i % 2 ? C.sun : C.bubblegum }).setDepth(100));
    const widths = letters.map((t) => t.width - 22);
    let lx = W / 2 - widths.reduce((a, b) => a + b, 0) / 2;
    letters.forEach((t, i) => {
      t.x = lx + widths[i] / 2;
      lx += widths[i];
      t.setScale(0);
      this.tweens.add({ targets: t, scale: 1, duration: 380, delay: 60 * i, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: 86, angle: { from: -6, to: 6 }, duration: 420, delay: 60 * i, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.sfx('whoosh');

    // --- Kortet
    const cx = W / 2;
    const cy = H / 2 + 50;
    const glow = this.add.image(cx, cy, 'chaos-glow').setDepth(5).setScale(0).setTint(col);
    const cardC = this.add.container(cx, -600).setDepth(10).setAngle(-540).setScale(0.6);
    const img = this.add.image(0, 0, 'chaos-back2');
    const kaos = title(this, 0, 198, 'KAOS', 56, { color: C.ink, stroke: 0 }).setShadow(0, 0, C.ink, 0, false, false);
    const icon = title(this, 0, -168, card.emoji, 120, { stroke: 0 }).setShadow(0, 0, C.ink, 0, false, false).setVisible(false);
    const name = title(this, 0, 32, card.title, 60, { color: '#ffffff', wrap: CARD_W - 40 }).setVisible(false);
    if (name.width > CARD_W - 30) name.setScale((CARD_W - 30) / name.width);
    const desc = body(this, 0, 182, card.description, 31, { wrap: CARD_W - 130, stroke: 6 }).setVisible(false);
    cardC.add([img, kaos, icon, name, desc]);

    // --- Spillerne kigger med fra bunden (når stillingen ikke ændres)
    const bloks: Blok[] = [];
    if (!message) {
      const xs = [330, 640, 1280, 1590];
      players.forEach((p, i) => {
        const b = new Blok(this, xs[i], H + 260, p.avatar, { size: 0.85, tag: { name: p.name, color: p.color }, ring: p.color });
        b.setDepth(50);
        this.tweens.add({ targets: b, y: H - 40, delay: 300 + i * 90, duration: 500, ease: 'Back.easeOut' });
        bloks.push(b);
      });
    }
    const cards = message
      ? players.map((p, i) => new ScoreCard(this, layoutRow(players.length, W / 2, 40)[i], H + 220, p, before[i]).setScale(0.8).setDepth(60))
      : [];
    // Dev: `?chaoshold=<ms>` holder scenen længere (til screenshots).
    const hold = Number(new URLSearchParams(location.search).get('chaoshold') ?? 0);

    // Forløbet kædes efter hinanden (ikke faste tider), så det holder selv hvis rammerne hakker.
    const finish = (after: number) => {
      this.time.delayedCall(after - 350 + hold, () => {
        letters.forEach((t, i) => this.tweens.add({ targets: t, y: -150, delay: i * 25, duration: 300, ease: 'Back.easeIn' }));
        this.tweens.add({ targets: cardC, scale: 0, duration: 300, ease: 'Back.easeIn' });
      });
      this.time.delayedCall(after + hold, () => (this.registry.get('director') as Director).chaosDone());
    };

    const afterFlip = () => {
      if (!message) return finish(4000);
      this.time.delayedCall(1000, () => {
        this.tweens.killTweensOf(cardC);
        this.tweens.add({ targets: cardC, x: cx - 470, y: cy - 90, scale: 0.72, angle: -4, duration: 550, ease: 'Cubic.easeInOut' });
        this.tweens.add({ targets: glow, x: cx - 470, y: cy - 90, duration: 550, ease: 'Cubic.easeInOut' });
        const msg = title(this, cx + 330, H / 2 - 70, message, 62, { color: C.sun, wrap: 860 }).setDepth(70);
        fx.popIn(msg, 400);
        this.tweens.add({ targets: msg, angle: { from: -2, to: 2 }, duration: 800, delay: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        cards.forEach((c, i) => this.tweens.add({ targets: c, y: H - 120, delay: i * 100, duration: 500, ease: 'Back.easeOut' }));
      });
      this.time.delayedCall(2100, () => {
        cards.forEach((c, i) => {
          if (c.score !== players[i].score) {
            c.countTo(players[i].score);
            players[i].score > c.score ? c.blok.cheer() : c.blok.sad();
            const diff = players[i].score - before[i];
            fx.floatText(c.x, c.y - 260, `${diff > 0 ? '+' : ''}${diff}`, diff > 0 ? C.mint : C.tomato, 64);
            fx.burst(c.x, c.y - 60, { texture: diff > 0 ? TEX.coin : TEX.dot, color: diff > 0 ? 0xffffff : N.tomato, count: 10, speed: 500, scale: 0.6 });
          }
        });
        audio.sfx('coin');
      });
      finish(5600);
    };

    // --- Vend kortet!
    const flip = () => {
      this.tweens.killTweensOf(cardC);
      this.tweens.add({
        targets: cardC,
        scaleX: 0,
        angle: 0,
        duration: 150,
        ease: 'Quad.easeIn',
        onComplete: () => {
          img.setTexture(`chaos-front2-${card.color}`);
          kaos.setVisible(false);
          for (const t of [icon, name, desc]) t.setVisible(true);
          cardC.setScale(0, 1.08);
          this.tweens.add({ targets: cardC, scaleX: 1.08, duration: 240, ease: 'Back.easeOut' });
          this.tweens.add({ targets: cardC, scaleX: 1, scaleY: 1, duration: 300, delay: 260 });
          icon.setScale(0.2);
          this.tweens.add({ targets: icon, scale: 1, duration: 650, ease: 'Elastic.easeOut' });
          this.tweens.add({ targets: icon, angle: { from: -8, to: 8 }, duration: 600, delay: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          fx.popIn(name, 120);
          fx.popIn(desc, 220);
          fx.flash(0xffffff, 220, 0.8);
          fx.shake(0.016, 300);
          fx.punch(0.05, 220);
          this.shockwave(cx, cy, col);
          fx.burst(cx, cy, { texture: TEX.star, color: [N.sun, N.bubblegum, N.mint, 0xffffff], count: 34, speed: 1000, scale: 0.75 });
          fx.confetti(1400, 8);
          audio.sfx('explosion', { volume: 0.5 });
          audio.sfx('powerup', { delay: 0.1 });
          this.tweens.add({ targets: glow, scale: 5.2, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.tweens.add({ targets: cardC, y: cy - 12, duration: 1300, delay: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          // Spillerne reagerer forskelligt
          bloks.forEach((b, i) => {
            this.time.delayedCall(100 + i * 80, () => {
              const r = (i + card.id.length) % 3;
              if (r === 0) {
                b.spinOut(1, 600);
                b.sad();
              } else if (r === 1) {
                b.hop(80, 220);
                b.cheer();
              } else {
                b.bonk();
                b.dance();
              }
            });
          });
          afterFlip();
        },
      });
    };

    // --- Spænding: kortet ryster mere og mere – og vendes
    const suspense = () => {
      audio.sfx('drumroll');
      audio.sfx('rumble', { volume: 0.5 });
      this.tweens.add({ targets: cardC, angle: { from: -2, to: 2 }, duration: 90, yoyo: true, repeat: 4 });
      this.tweens.add({ targets: cardC, scale: 1.06, duration: 1000, ease: 'Sine.easeIn' });
      this.time.delayedCall(600, () => this.tweens.add({ targets: cardC, angle: { from: -5, to: 5 }, duration: 50, yoyo: true, repeat: 5 }));
      this.time.delayedCall(1300, flip);
    };

    // --- Kortet hvirvler ind
    this.tweens.add({
      targets: cardC,
      y: cy,
      angle: 0,
      scale: 1,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.sfx('stomp');
        fx.shake(0.012, 200);
        fx.burst(cx, cy + CARD_H / 2, { texture: TEX.puff, color: 0xffffff, count: 14, speed: 500, gravity: -100, scale: 0.9, lifespan: 600 });
        this.tweens.add({ targets: cardC, scaleX: 1.12, scaleY: 0.9, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
        this.tweens.add({ targets: glow, scale: 4.2, alpha: 0.55, duration: 500 });
        this.time.delayedCall(250, suspense);
      },
    });
  }

  private sfx(name: Parameters<typeof audio.sfx>[0]): void {
    audio.sfx(name);
  }

  /** Udvidende ring (chokbølge) når kortet vendes. */
  private shockwave(x: number, y: number, color: number): void {
    for (let i = 0; i < 2; i++) {
      const ring = this.add.circle(x, y, 40, color, 0).setStrokeStyle(18 - i * 8, i ? 0xffffff : color, 1).setDepth(8);
      this.tweens.add({ targets: ring, scale: 14 - i * 4, alpha: 0, duration: 700 + i * 200, delay: i * 80, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
  }
}
