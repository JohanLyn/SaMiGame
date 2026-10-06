import type Phaser from 'phaser';

/**
 * Det bløde, elastiske ansigt i Selfie-Kirurgen.
 *
 * Ansigtet er beskrevet i "ansigts-enheder" (U): 1 U = halv hovedbredde. Centrum = (0, 0).
 * Seks trækbare punkter (håndtag) styrer alt; resten følger elastisk med (øjne følger brynene,
 * kinderne følger mundvigene, hagen trækker hele kæben, næsen bliver tyndere når den strækkes ...).
 */

export type HandleId = 'browL' | 'browR' | 'nose' | 'mouthL' | 'mouthR' | 'chin';
export const HANDLES: HandleId[] = ['browL', 'browR', 'nose', 'mouthL', 'mouthR', 'chin'];

export interface V {
  x: number;
  y: number;
}
export type Offsets = Record<HandleId, V>;

/** Hvilepositioner for håndtagene (U). */
export const REST: Record<HandleId, V> = {
  browL: { x: -0.24, y: -0.5 },
  browR: { x: 0.24, y: -0.5 },
  nose: { x: 0, y: 0.18 },
  mouthL: { x: -0.36, y: 0.6 },
  mouthR: { x: 0.36, y: 0.6 },
  chin: { x: 0, y: 1.22 },
};

/** Hvor langt hvert håndtag må trækkes (U). */
export const LIMIT: Record<HandleId, number> = {
  browL: 0.55,
  browR: 0.55,
  nose: 0.6,
  mouthL: 0.55,
  mouthR: 0.55,
  chin: 0.6,
};

export function zeroOffsets(): Offsets {
  return { browL: { x: 0, y: 0 }, browR: { x: 0, y: 0 }, nose: { x: 0, y: 0 }, mouthL: { x: 0, y: 0 }, mouthR: { x: 0, y: 0 }, chin: { x: 0, y: 0 } };
}

export function cloneOffsets(o: Offsets): Offsets {
  const c = zeroOffsets();
  for (const h of HANDLES) c[h] = { x: o[h].x, y: o[h].y };
  return c;
}

export function clampOffset(h: HandleId, v: V): V {
  const lim = LIMIT[h];
  const len = Math.hypot(v.x, v.y);
  if (len <= lim) return v;
  return { x: (v.x / len) * lim, y: (v.y / len) * lim };
}

/** Lighed 0–100 mellem to ansigter. */
export function similarity(a: Offsets, b: Offsets): number {
  let sum = 0;
  for (const h of HANDLES) {
    const err = Math.hypot(a[h].x - b[h].x, a[h].y - b[h].y);
    sum += Math.max(0, 1 - err / 0.5);
  }
  const s = sum / HANDLES.length;
  return Math.round(Math.pow(s, 0.85) * 100);
}

export interface FacePalette {
  ink: number;
  skin: number;
  skinShade: number;
  skinLight: number;
  blush: number;
  brow: number;
  mouth: number;
  tongue: number;
  lip: number;
  eyeWhite: number;
  pupil: number;
  /** Konturbredde i pixels. */
  line: number;
  mustache?: number;
}

export interface FaceLook {
  /** Pupil-retning (-1..1). */
  look: V;
  blink: boolean;
  /** Ekstra "bange"-faktor 0..1 (store pupiller ...). */
  scared?: number;
}

type P = { x: number; y: number };
const vp = (pts: P[]) => pts as unknown as Phaser.Math.Vector2[];

/** Catmull-Rom gennem lukkede punkter → glat kurve. */
function smoothClosed(pts: P[], seg = 5): P[] {
  const out: P[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let s = 0; s < seg; s++) {
      const t = s / seg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  return out;
}

function quad(a: P, c: P, b: P, n = 14): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
  }
  return out;
}

function angDist(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

/** Beregn ansigtets geometri (i U) ud fra offsets. */
export function faceGeometry(off: Offsets) {
  const H = (h: HandleId) => ({ x: REST[h].x + off[h].x, y: REST[h].y + off[h].y });
  const browL = H('browL');
  const browR = H('browR');
  const nose = H('nose');
  const mouthL = H('mouthL');
  const mouthR = H('mouthR');
  const chin = H('chin');

  // Hovedets omrids: 20 punkter, a = 0 øverst, med uret.
  const outline: P[] = [];
  const N = 20;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const down = Math.max(0, -Math.cos(a));
    let x = Math.sin(a) * 1.0 * (1 - 0.16 * down);
    let y = -Math.cos(a) * 1.22;
    const wc = Math.pow(down, 3);
    x += off.chin.x * wc;
    y += off.chin.y * wc;
    const wl = Math.exp(-Math.pow(angDist(a, 4.05), 2) / 0.22) * 0.45;
    const wr = Math.exp(-Math.pow(angDist(a, 2.23), 2) / 0.22) * 0.45;
    x += off.mouthL.x * wl + off.mouthR.x * wr;
    y += off.mouthL.y * wl + off.mouthR.y * wr;
    const bl = Math.exp(-Math.pow(angDist(a, 5.7), 2) / 0.3) * 0.3;
    const br = Math.exp(-Math.pow(angDist(a, 0.58), 2) / 0.3) * 0.3;
    x += off.browL.x * bl + off.browR.x * br;
    y += off.browL.y * bl + off.browR.y * br;
    outline.push({ x, y });
  }

  const eyeOpen = (o: V) => Math.max(0.35, Math.min(1.9, 1 - o.y * 1.6));
  const eyeL = { x: -0.42 + off.browL.x * 0.3, y: -0.2 + off.browL.y * 0.32, open: eyeOpen(off.browL) };
  const eyeR = { x: 0.42 + off.browR.x * 0.3, y: -0.2 + off.browR.y * 0.32, open: eyeOpen(off.browR) };

  const browOuterL = { x: -0.72 + off.browL.x * 0.4, y: -0.55 + off.browL.y * 0.3 };
  const browOuterR = { x: 0.72 + off.browR.x * 0.4, y: -0.55 + off.browR.y * 0.3 };

  const bridge = { x: (off.browL.x + off.browR.x) * 0.08, y: -0.16 + (off.browL.y + off.browR.y) * 0.08 };

  const restMid = { x: 0, y: 0.6 };
  const upper = {
    x: restMid.x + (off.mouthL.x + off.mouthR.x) * 0.18 + off.chin.x * 0.35 + off.nose.x * 0.1,
    y: restMid.y + (off.mouthL.y + off.mouthR.y) * 0.12 + off.chin.y * 0.3 - 0.04,
  };
  const width = Math.hypot(mouthR.x - mouthL.x, mouthR.y - mouthL.y);
  const open = 0.035 + 0.5 * Math.max(0, off.chin.y) + 0.16 * Math.max(0, width - 0.72);

  return { browL, browR, nose, mouthL, mouthR, chin, outline, eyeL, eyeR, browOuterL, browOuterR, bridge, upper, open, width };
}

/**
 * Tegn ansigtet i en Graphics. (cx, cy) = centrum i Graphics-koordinater, U = pixels pr. enhed.
 */
export function drawFace(g: Phaser.GameObjects.Graphics, cx: number, cy: number, U: number, off: Offsets, pal: FacePalette, look: FaceLook): void {
  const f = faceGeometry(off);
  const S = (p: P): P => ({ x: cx + p.x * U, y: cy + p.y * U });
  const line = pal.line;

  // Ører
  const earL = S({ x: f.outline[15].x - 0.04, y: f.outline[15].y + 0.05 });
  const earR = S({ x: f.outline[5].x + 0.04, y: f.outline[5].y + 0.05 });
  for (const e of [earL, earR]) {
    g.fillStyle(pal.ink, 1).fillEllipse(e.x, e.y, U * 0.42 + line * 2, U * 0.56 + line * 2);
    g.fillStyle(pal.skinShade, 1).fillEllipse(e.x, e.y, U * 0.42, U * 0.56);
    g.fillStyle(pal.skin, 1).fillEllipse(e.x + (e === earL ? 3 : -3), e.y - 3, U * 0.3, U * 0.42);
    g.fillStyle(pal.skinShade, 1).fillEllipse(e.x + (e === earL ? 4 : -4), e.y, U * 0.12, U * 0.24);
  }

  // Hoved: kontur, skygge-kant, lys flade
  const head = smoothClosed(f.outline.map(S), 5);
  g.fillStyle(pal.ink, 1).fillPoints(vp(head), true, true);
  g.lineStyle(line * 2, pal.ink, 1).strokePoints(vp(head), true, true);
  g.fillStyle(pal.skinShade, 1).fillPoints(vp(head), true, true);
  const inner = head.map((p) => ({ x: cx + (p.x - cx) * 0.9 - U * 0.05, y: cy + (p.y - cy) * 0.92 - U * 0.06 }));
  g.fillStyle(pal.skin, 1).fillPoints(vp(inner), true, true);
  g.fillStyle(pal.skinLight, 0.55).fillEllipse(cx - U * 0.38, cy - U * 0.72, U * 0.62, U * 0.28);
  g.fillStyle(0xffffff, 0.35).fillEllipse(cx - U * 0.42, cy - U * 0.78, U * 0.3, U * 0.1);

  // Kinder
  g.fillStyle(pal.blush, 0.45).fillEllipse(cx + (f.mouthL.x - 0.2) * U, cy + (f.mouthL.y - 0.24) * U, U * 0.36, U * 0.2);
  g.fillStyle(pal.blush, 0.45).fillEllipse(cx + (f.mouthR.x + 0.2) * U, cy + (f.mouthR.y - 0.24) * U, U * 0.36, U * 0.2);

  // Øjne
  for (const [eye, side] of [[f.eyeL, -1], [f.eyeR, 1]] as const) {
    const e = S(eye);
    const rx = U * 0.2;
    const ry = U * 0.22 * eye.open;
    if (look.blink) {
      g.lineStyle(line * 1.1, pal.ink, 1);
      g.strokePoints(vp(quad({ x: e.x - rx, y: e.y }, { x: e.x, y: e.y + U * 0.12 }, { x: e.x + rx, y: e.y }, 8)), false);
      continue;
    }
    g.fillStyle(pal.ink, 1).fillEllipse(e.x, e.y, rx * 2 + line * 1.6, ry * 2 + line * 1.6);
    g.fillStyle(pal.eyeWhite, 1).fillEllipse(e.x, e.y, rx * 2, ry * 2);
    const scared = look.scared ?? 0;
    const pr = U * (0.1 - scared * 0.04);
    const px = e.x + look.look.x * (rx - pr) * 0.75;
    const py = e.y + look.look.y * Math.max(0, ry - pr) * 0.75;
    g.fillStyle(pal.pupil, 1).fillCircle(px, py, Math.min(pr, ry * 0.9));
    g.fillStyle(0xffffff, 1).fillCircle(px + pr * 0.35, py - pr * 0.35, pr * 0.32);
    void side;
  }

  // Bryn (inderste ende er håndtaget)
  for (const [inner2, outer] of [[f.browL, f.browOuterL], [f.browR, f.browOuterR]] as const) {
    const a = S(inner2);
    const b = S(outer);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - U * 0.12 };
    const pts = quad(a, mid, b, 12);
    const w = U * 0.13;
    g.lineStyle(w + line * 1.8, pal.ink, 1).strokePoints(vp(pts), false);
    g.fillStyle(pal.ink, 1).fillCircle(a.x, a.y, (w + line * 1.8) / 2).fillCircle(b.x, b.y, (w + line * 1.8) / 2);
    g.lineStyle(w, pal.brow, 1).strokePoints(vp(pts), false);
    g.fillStyle(pal.brow, 1).fillCircle(a.x, a.y, w / 2).fillCircle(b.x, b.y, w / 2);
  }

  // Mund
  const mL = S(f.mouthL);
  const mR = S(f.mouthR);
  const up = S(f.upper);
  const down = { x: up.x, y: up.y + f.open * 2 * U };
  const upperCurve = quad(mL, up, mR, 16);
  const lowerCurve = quad(mR, down, mL, 16);
  if (f.open > 0.05) {
    const shape = [...upperCurve, ...lowerCurve];
    g.fillStyle(pal.mouth, 1).fillPoints(vp(shape), true, true);
    // Tunge
    const lowMid = lowerCurve[8];
    g.fillStyle(pal.tongue, 1).fillEllipse(lowMid.x, lowMid.y - f.open * U * 0.32, Math.max(8, f.width * U * 0.42), f.open * U * 0.7);
    // Tænder
    const th = Math.min(U * 0.09, f.open * U * 0.55);
    const teeth = [...upperCurve.slice(3, 14), ...upperCurve.slice(3, 14).reverse().map((p) => ({ x: p.x, y: p.y + th }))];
    g.fillStyle(0xffffff, 1).fillPoints(vp(teeth), true, true);
    g.lineStyle(line * 1.1, pal.ink, 1).strokePoints(vp(shape), true, true);
  } else {
    g.lineStyle(line * 1.4, pal.ink, 1).strokePoints(vp(upperCurve), false);
  }
  // Mundvige
  g.fillStyle(pal.ink, 1).fillCircle(mL.x, mL.y, line * 0.9).fillCircle(mR.x, mR.y, line * 0.9);

  // Overskæg (kun portrættet)
  if (pal.mustache !== undefined) {
    const n = S(f.nose);
    const ml = { x: (n.x + mL.x) / 2 - U * 0.08, y: (n.y + up.y) / 2 + U * 0.06 };
    const mr = { x: (n.x + mR.x) / 2 + U * 0.08, y: (n.y + up.y) / 2 + U * 0.06 };
    for (const [end, dir] of [[ml, -1], [mr, 1]] as const) {
      const tip = { x: end.x + dir * U * 0.32, y: end.y - U * 0.16 };
      const start = { x: n.x, y: n.y + U * 0.1 };
      const top = quad(start, { x: end.x, y: end.y - U * 0.12 }, tip, 10);
      const bot = quad(tip, { x: end.x, y: end.y + U * 0.12 }, start, 10);
      const shape = [...top, ...bot];
      g.fillStyle(pal.mustache, 1).fillPoints(vp(shape), true, true);
      g.lineStyle(line, pal.ink, 1).strokePoints(vp(shape), true, true);
    }
  }

  // Næse (tegnes til sidst, så den kan strækkes ned over munden)
  const B = S(f.bridge);
  const T = S(f.nose);
  const len = Math.max(0.05, Math.hypot(f.nose.x - f.bridge.x, f.nose.y - f.bridge.y));
  const r = U * 0.17 * Math.max(0.55, Math.min(1.45, Math.sqrt(0.34 / len)));
  const dx = T.x - B.x;
  const dy = T.y - B.y;
  const dl = Math.hypot(dx, dy) || 1;
  const px = -dy / dl;
  const py = dx / dl;
  const bw = U * 0.06;
  const ridge = [
    { x: B.x + px * bw, y: B.y + py * bw },
    { x: T.x + px * r * 0.85, y: T.y + py * r * 0.85 },
    { x: T.x - px * r * 0.85, y: T.y - py * r * 0.85 },
    { x: B.x - px * bw, y: B.y - py * bw },
  ];
  g.fillStyle(pal.skinShade, 1).fillPoints(vp(ridge), true, true);
  g.lineStyle(line, pal.ink, 1);
  g.lineBetween(ridge[0].x, ridge[0].y, ridge[1].x, ridge[1].y);
  g.lineBetween(ridge[3].x, ridge[3].y, ridge[2].x, ridge[2].y);
  g.fillStyle(pal.ink, 1).fillCircle(T.x, T.y, r + line);
  g.fillStyle(pal.skin, 1).fillCircle(T.x, T.y, r);
  g.fillStyle(pal.skinShade, 1).fillCircle(T.x + r * 0.15, T.y + r * 0.2, r * 0.75);
  g.fillStyle(pal.skin, 1).fillCircle(T.x - r * 0.1, T.y - r * 0.1, r * 0.72);
  g.fillStyle(0xffffff, 0.6).fillCircle(T.x - r * 0.35, T.y - r * 0.4, r * 0.25);
  g.fillStyle(pal.ink, 0.8).fillEllipse(T.x - r * 0.42, T.y + r * 0.55, r * 0.34, r * 0.22).fillEllipse(T.x + r * 0.42, T.y + r * 0.55, r * 0.34, r * 0.22);
}

/** Pixel-position af et håndtag. */
export function handlePos(off: Offsets, h: HandleId): V {
  return { x: REST[h].x + off[h].x, y: REST[h].y + off[h].y };
}
