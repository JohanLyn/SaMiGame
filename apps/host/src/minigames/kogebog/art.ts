import { ink, linear, radial, shine, svgDoc, eyes } from '../../kit/svg';

/** Al grafik til Pop-up Kogebogen, tegnet som SVG. */

/** Bogens geometri på skærmen. Ryggen (hængslet) ligger vandret ved HY. */
export const BOOK = { x0: 260, x1: 1660, HY: 430, D: 610, UP: 360 };
export const PW = BOOK.x1 - BOOK.x0;

export type FoodKind = 'fisk' | 'banan' | 'pølse' | 'kage' | 'kylling';
export const FOODS: FoodKind[] = ['fisk', 'banan', 'pølse', 'kage', 'kylling'];

export const FOOD_COLOR: Record<FoodKind, string> = {
  fisk: '#47b8ff',
  banan: '#ffcf3a',
  pølse: '#ff6a4a',
  kage: '#ff5fa2',
  kylling: '#ff9a3a',
};

/** Form i enheds-koordinater (ca. -1..1), og hit-cirkler [x, y, r]. Y skaleres med 0.72 på gulvet. */
export const SHAPES: Record<FoodKind, { path: string; circles: [number, number, number][] }> = {
  fisk: {
    path: 'M-1 0 Q-0.5 -0.66 0.4 -0.22 L0.98 -0.62 Q0.86 0 0.98 0.62 L0.4 0.22 Q-0.5 0.66 -1 0 Z',
    circles: [[-0.5, 0, 0.36], [0, 0, 0.4], [0.5, 0, 0.26]],
  },
  banan: {
    path: 'M-1 -0.45 Q-0.8 -0.5 -0.7 -0.25 Q0 0.4 0.7 -0.25 Q0.8 -0.5 1 -0.45 Q0.95 0.1 0.6 0.4 Q0 0.85 -0.6 0.4 Q-0.95 0.1 -1 -0.45 Z',
    circles: [[-0.66, 0, 0.28], [-0.25, 0.32, 0.3], [0.25, 0.32, 0.3], [0.66, 0, 0.28]],
  },
  pølse: {
    path: 'M-0.62 -0.36 H0.62 A0.36 0.36 0 0 1 0.62 0.36 H-0.62 A0.36 0.36 0 0 1 -0.62 -0.36 Z M0.98 -0.1 L1.08 0 L0.98 0.1 Z',
    circles: [[-0.62, 0, 0.36], [-0.2, 0, 0.36], [0.2, 0, 0.36], [0.62, 0, 0.36]],
  },
  kage: {
    path: 'M-0.9 -0.5 Q0 -0.75 0.9 -0.5 L0.75 0.6 Q0 0.75 -0.75 0.6 Z',
    circles: [[-0.42, -0.05, 0.42], [0.42, -0.05, 0.42], [0, 0.25, 0.42]],
  },
  kylling: {
    path: 'M-0.95 0 Q-0.95 -0.62 -0.2 -0.55 Q0.3 -0.4 0.5 -0.12 L0.82 -0.2 Q1.02 -0.3 1 -0.08 Q1.08 0.08 1 0.12 Q1.02 0.32 0.82 0.22 L0.5 0.12 Q0.3 0.4 -0.2 0.55 Q-0.95 0.62 -0.95 0 Z',
    circles: [[-0.5, 0, 0.5], [0.05, 0, 0.42], [0.55, 0, 0.18]],
  },
};

export const Y_SQUASH = 0.72;

export interface Hole {
  kind: FoodKind;
  x: number;
  y: number;
  /** Halv bredde i px. */
  s: number;
  rot: number;
}

function holePath(h: Hole, flip: boolean, k = 1): string {
  // flip: vend lodret (forsiden ses stående – hullerne lander spejlet)
  const ty = flip ? BOOK.D - (h.y - BOOK.HY) : h.y - BOOK.HY;
  const sy = (flip ? -1 : 1) * h.s * Y_SQUASH * k;
  return `transform="translate(${h.x - BOOK.x0} ${ty}) scale(${h.s * k} ${sy}) rotate(${h.rot})"`;
}

/** Side med udstansede huller. `front` = forsiden (ses når siden står op). */
export function pageSvg(holes: Hole[], front: boolean, pageNo: number): string {
  const w = PW;
  const h = BOOK.D;
  const mask =
    `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#fff"/>` +
    holes.map((hl) => `<path d="${SHAPES[hl.kind].path}" ${holePath(hl, front)} fill="#000"/>`).join('') +
    `</mask>`;
  const lines = Array.from({ length: 16 }, (_, i) => {
    const y = 90 + i * 32;
    const col = i % 8 < 4 ? 0 : 1;
    const x = col ? w * 0.55 : 80;
    const len = 300 + ((i * 97) % 220);
    return `<rect x="${x}" y="${y}" width="${len}" height="9" rx="4" fill="#b8a888" opacity="0.5"/>`;
  }).join('');
  const doodles = front
    ? `<g opacity="0.55"><circle cx="${w * 0.47}" cy="${h * 0.55}" r="70" fill="none" stroke="#e8a060" stroke-width="10" stroke-dasharray="4 18"/>` +
      `<path d="M${w * 0.1} ${h - 70} q40 -40 80 0 t80 0 t80 0" fill="none" stroke="#9ad070" stroke-width="10" stroke-linecap="round"/>` +
      `<circle cx="${w - 120}" cy="${h - 90}" r="38" fill="#ffd0d0" stroke="#e08080" stroke-width="6"/></g>`
    : `<g opacity="0.4"><path d="M${w * 0.8} 80 q30 30 0 60 q-30 30 0 60" fill="none" stroke="#e8a060" stroke-width="8" stroke-linecap="round"/>` +
      `<circle cx="140" cy="${h - 110}" r="46" fill="none" stroke="#9ad070" stroke-width="8" stroke-dasharray="6 14"/></g>`;
  const rims = holes
    .map((hl) => {
      const t = holePath(hl, front);
      const c = FOOD_COLOR[hl.kind];
      return (
        `<path d="${SHAPES[hl.kind].path}" ${t} fill="none" stroke="${c}" stroke-width="26" vector-effect="non-scaling-stroke"/>` +
        `<path d="${SHAPES[hl.kind].path}" ${t} fill="none" stroke="#1a1446" stroke-width="7" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`
      );
    })
    .join('');
  const cutLines = holes
    .map((hl) => `<path d="${SHAPES[hl.kind].path}" ${holePath(hl, front, 1.2)} fill="none" stroke="#c0a070" stroke-width="3" stroke-dasharray="10 8" vector-effect="non-scaling-stroke"/>`)
    .join('');
  const header = front
    ? `<rect x="40" y="22" width="${w - 80}" height="46" rx="12" fill="#ffcf3a" opacity="0.85" stroke="#1a1446" stroke-width="5"/>` +
      `<rect x="${w / 2 - 70}" y="${h - 54}" width="140" height="36" rx="18" fill="#fff" stroke="#c0a070" stroke-width="4"/>` +
      Array.from({ length: Math.min(9, pageNo) }, (_, i) => `<circle cx="${w / 2 - 48 + i * 12}" cy="${h - 36}" r="4" fill="#c0a070"/>`).join('')
    : '';
  return svgDoc(
    w,
    h,
    mask +
      `<g mask="url(#m)">` +
      `<rect width="${w}" height="${h}" fill="url(#paper)"/>` +
      `<rect x="16" y="16" width="${w - 32}" height="${h - 32}" rx="10" fill="none" stroke="#e0c890" stroke-width="5"/>` +
      lines +
      doodles +
      header +
      cutLines +
      rims +
      `<rect x="0" y="${front ? h - 16 : 0}" width="${w}" height="16" fill="#000" opacity="0.12"/>` +
      `<rect width="${w}" height="${h}" fill="none" stroke="#1a1446" stroke-width="10"/>` +
      `</g>`,
    linear('paper', front ? '#fffaf0' : '#f6ecd4', front ? '#f4e6c8' : '#ead8b4'),
  );
}

/** Den opslåede venstre side (gulvet). */
export function floorPageSvg(): string {
  const w = PW;
  const h = BOOK.D;
  const lines = Array.from({ length: 14 }, (_, i) => `<rect x="${i % 2 ? 760 : 90}" y="${120 + Math.floor(i / 2) * 60}" width="${420 + ((i * 53) % 140)}" height="10" rx="5" fill="#c8b48a" opacity="0.45"/>`).join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#p)"/>` +
      `<rect width="${w}" height="70" fill="url(#gutter)"/>` +
      `<rect x="20" y="20" width="${w - 40}" height="${h - 40}" rx="12" fill="none" stroke="#e0c890" stroke-width="5"/>` +
      lines +
      // Kaffeplet og en lille tegning i hjørnet
      `<circle cx="${w - 150}" cy="${h - 120}" r="54" fill="none" stroke="#c89060" stroke-width="10" opacity="0.25"/>` +
      `<path d="M110 ${h - 80} q30 -30 60 0 t60 0 t60 0" fill="none" stroke="#9ad070" stroke-width="8" stroke-linecap="round" opacity="0.4"/>` +
      `<rect width="${w}" height="${h}" fill="none" stroke="#1a1446" stroke-width="10"/>`,
    linear('p', '#f2e2c0', '#fff6e2') +
      `<linearGradient id="gutter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4a20" stop-opacity="0.45"/><stop offset="1" stop-color="#6a4a20" stop-opacity="0"/></linearGradient>`,
  );
}

/** Siderne der står op (stakken bag den aktive side). */
export function stackSvg(): string {
  const w = PW + 30;
  const h = BOOK.UP + 30;
  const edges = Array.from({ length: 7 }, (_, i) => `<path d="M10 ${12 + i * 3} H${w - 10}" stroke="#c8b48a" stroke-width="2"/>`).join('');
  return svgDoc(
    w,
    h,
    `<rect x="6" y="6" width="${w - 12}" height="${h - 6}" rx="6" fill="url(#s)" ${ink(8)}/>` +
      edges +
      `<rect x="14" y="40" width="${w - 28}" height="${h - 50}" fill="url(#d)"/>`,
    linear('s', '#fff6e0', '#e8d6b0') +
      `<linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a1a" stop-opacity="0.35"/><stop offset="1" stop-color="#2a1a0a" stop-opacity="0.65"/></linearGradient>`,
  );
}

/** Bagside-omslag (læder med guldtitel-ramme). */
export function coverSvg(w: number, h: number): string {
  return svgDoc(
    w,
    h,
    `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="26" fill="url(#c)" ${ink(10)}/>` +
      `<rect x="30" y="30" width="${w - 60}" height="${h - 60}" rx="16" fill="none" stroke="#ffd36b" stroke-width="6" stroke-dasharray="2 12" stroke-linecap="round"/>` +
      shine(60, 16, w * 0.3, 12, 0.3),
    linear('c', '#c0303a', '#6a0e1a'),
  );
}

/** Bogryg (hængslet). */
export function spineSvg(): string {
  return svgDoc(PW + 120, 60, `<rect x="4" y="8" width="${PW + 112}" height="44" rx="22" fill="url(#sp)" ${ink(7)}/>` + shine(40, 14, PW * 0.5, 8, 0.35), linear('sp', '#e04050', '#7a1020'));
}

/** Køkkenfliser. */
export function tileSvg(): string {
  return svgDoc(100, 100, `<rect width="100" height="100" fill="#bfe8e0"/><rect x="4" y="4" width="92" height="92" rx="10" fill="url(#t)" stroke="#9ad0c6" stroke-width="3"/><rect x="14" y="12" width="34" height="8" rx="4" fill="#fff" opacity="0.6"/>`, linear('t', '#e6fff8', '#bfe8e0'));
}

/** Køkkenbord (træ). */
export function tableSvg(): string {
  const grain = Array.from({ length: 10 }, (_, i) => `<path d="M0 ${20 + i * 22} Q480 ${10 + i * 22} 960 ${24 + i * 22} T1920 ${20 + i * 22}" stroke="#5a3214" stroke-width="3" fill="none" opacity="0.35"/>`).join('');
  return svgDoc(1920, 240, `<rect width="1920" height="240" fill="url(#w)"/>` + grain + `<rect width="1920" height="12" fill="#ffd9a0" opacity="0.5"/>`, linear('w', '#c08040', '#7a4a1e'));
}

/** Hængende køkkenredskab (grydeske / pande). */
export function utensilSvg(kind: 'ske' | 'pande'): string {
  if (kind === 'ske') {
    return svgDoc(
      90,
      360,
      `<circle cx="45" cy="16" r="10" fill="none" ${ink(5)}/>` +
        `<rect x="36" y="24" width="18" height="230" rx="9" fill="url(#h)" ${ink(5)}/>` +
        `<ellipse cx="45" cy="300" rx="40" ry="52" fill="url(#m)" ${ink(6)}/>` +
        `<ellipse cx="35" cy="284" rx="12" ry="20" fill="#fff" opacity="0.5"/>`,
      linear('h', '#c98d4b', '#6b3f17', true) + radial('m', '#f1f4fb', '#8a93a8'),
    );
  }
  return svgDoc(
    200,
    360,
    `<circle cx="100" cy="16" r="10" fill="none" ${ink(5)}/>` +
      `<rect x="88" y="24" width="24" height="150" rx="10" fill="url(#h)" ${ink(5)}/>` +
      `<circle cx="100" cy="260" r="92" fill="url(#p)" ${ink(8)}/>` +
      `<circle cx="100" cy="260" r="66" fill="#2a2a3e" opacity="0.6"/>` +
      eyes(100, 250, 44, 14, [2, 3]) +
      `<path d="M80 290 q20 14 40 0" fill="none" ${ink(6)}/>`,
    linear('h', '#3a3b55', '#1e1f33', true) + radial('p', '#5d5f78', '#22223a'),
  );
}

/** Pandekage (flad spiller-markør). */
export function pancakeSvg(): string {
  return svgDoc(
    200,
    80,
    `<ellipse cx="100" cy="46" rx="94" ry="30" fill="#000" opacity="0.2"/>` +
      `<ellipse cx="100" cy="40" rx="92" ry="30" fill="url(#pc)" ${ink(6)}/>` +
      `<ellipse cx="80" cy="30" rx="30" ry="8" fill="#fff" opacity="0.4"/>` +
      `<path d="M60 40 l12 8 m0 -8 l-12 8 M128 40 l12 8 m0 -8 l-12 8" ${ink(4)}/>`,
    radial('pc', '#ffe0a0', '#e0a050'),
  );
}

/** Damp/sky. */
export function steamSvg(): string {
  return svgDoc(100, 100, `<circle cx="50" cy="50" r="46" fill="url(#s)"/>`, `<radialGradient id="s"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`);
}

/** Papirstump-partikel. */
export function paperBitSvg(): string {
  return svgDoc(30, 24, `<path d="M2 4 L26 2 L28 20 L4 22 Z" fill="#fff6e0" ${ink(2)}/>`);
}
