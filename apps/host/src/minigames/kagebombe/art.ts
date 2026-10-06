import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til Kagebomben, tegnet som SVG. */

export const WIRE_COLORS = [
  { name: 'RØD', hex: '#ff4b4b' },
  { name: 'BLÅ', hex: '#3d8bff' },
  { name: 'GUL', hex: '#ffcf3a' },
  { name: 'GRØN', hex: '#3ccf5a' },
  { name: 'LILLA', hex: '#b06bff' },
  { name: 'HVID', hex: '#f4f4ff' },
] as const;

export const FROSTINGS = [
  { name: 'lyserød', top: '#ffc2e2', mid: '#ff8cc6' },
  { name: 'chokolade', top: '#a8714a', mid: '#6b3f22' },
  { name: 'vanilje', top: '#fff8dc', mid: '#f5dc9a' },
  { name: 'mint', top: '#c4ffe6', mid: '#5fe0b0' },
] as const;

export const TOPPINGS = ['jordbær', 'kirsebær', 'ingen'] as const;

// ---------------------------------------------------------------------------

export function backdropSvg(): string {
  const w = 1920;
  const h = 1080;
  // Vægfliser
  const tiles: string[] = [];
  for (let y = 0; y < 760; y += 64) {
    for (let x = (y / 64) % 2 ? -32 : 0; x < w; x += 64) {
      tiles.push(`<rect x="${x + 3}" y="${y + 3}" width="58" height="58" rx="10" fill="#fff" opacity="${0.035 + ((x * 3 + y) % 7) * 0.006}"/>`);
    }
  }
  // Hylder med cupcakes (med øjne)
  const cupcake = (x: number, y: number, col: string, i: number) =>
    `<path d="M${x - 26} ${y - 30} L${x + 26} ${y - 30} L${x + 20} ${y} L${x - 20} ${y} Z" fill="url(#cup)" ${ink(4)}/>` +
    `<path d="M${x - 14} ${y - 28} L${x - 12} ${y - 2} M${x} ${y - 28} L${x} ${y - 2} M${x + 14} ${y - 28} L${x + 12} ${y - 2}" stroke="#b8561c" stroke-width="3" opacity="0.6"/>` +
    `<path d="M${x - 32} ${y - 30} Q${x - 36} ${y - 58} ${x - 12} ${y - 60} Q${x} ${y - 82} ${x + 14} ${y - 60} Q${x + 38} ${y - 58} ${x + 32} ${y - 30} Z" fill="${col}" ${ink(4)}/>` +
    `<circle cx="${x + 2}" cy="${y - 76}" r="8" fill="#ff4b4b" ${ink(3)}/>` +
    `<g transform="translate(0 0)">${eyes(x, y - 44, 18, 6, [i % 2 ? 1 : -1, 1])}</g>`;
  const shelf = (x0: number, y: number) =>
    `<rect x="${x0}" y="${y}" width="360" height="20" rx="8" fill="url(#wood)" ${ink(5)}/>` +
    `<path d="M${x0 + 30} ${y + 20} L${x0 + 50} ${y + 60} L${x0 + 70} ${y + 20} M${x0 + 290} ${y + 20} L${x0 + 310} ${y + 60} L${x0 + 330} ${y + 20}" fill="#7a4a1b" ${ink(4)}/>`;
  const shelves =
    shelf(-120, 420) + [30, 110].map((x, i) => cupcake(x + 20, 420, ['#ff9ccf', '#8ff0c8'][i], i)).join('') +
    shelf(1680, 420) + [1730, 1810].map((x, i) => cupcake(x + 20, 420, ['#a8714a', '#fff1c8'][i], i + 1)).join('');
  // Vimpelsnor
  const bunting = (x0: number, x1: number, y: number) => {
    const n = 9;
    let s = `<path d="M${x0} ${y} Q${(x0 + x1) / 2} ${y + 60} ${x1} ${y}" fill="none" stroke="#1a1446" stroke-width="4"/>`;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t;
      const yy = y + 4 * 60 * t * (1 - t) * 0.5 * 2;
      const col = ['#ff5fa2', '#ffcf3a', '#3ee6a8', '#47b8ff'][i % 4];
      s += `<path d="M${x - 22} ${yy} L${x + 22} ${yy} L${x} ${yy + 44} Z" fill="${col}" ${ink(4)}/>`;
    }
    return s;
  };
  // Gulv: perspektiv-tern
  const floor: string[] = [];
  for (let r = 0; r < 5; r++) {
    const y0 = 840 + r * 50;
    for (let i = -2; i < 26; i++) {
      if ((i + r) % 2) continue;
      floor.push(`<rect x="${i * 90 - r * 18}" y="${y0}" width="90" height="50" fill="#fff" opacity="0.12"/>`);
    }
  }
  // Advarselsstriber
  const stripes = (y: number, hgt: number) => {
    let s = `<rect x="0" y="${y}" width="${w}" height="${hgt}" fill="#ffcf3a"/>`;
    for (let x = -hgt; x < w + hgt; x += hgt * 1.4) s += `<path d="M${x} ${y + hgt} L${x + hgt * 0.7} ${y} L${x + hgt * 1.4} ${y} L${x + hgt * 0.7} ${y + hgt} Z" fill="#1a1446"/>`;
    return s + `<rect x="0" y="${y}" width="${w}" height="${hgt}" fill="none" ${ink(5)}/>`;
  };
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#wall)"/>` +
      tiles.join('') +
      `<ellipse cx="480" cy="560" rx="520" ry="420" fill="url(#glowL)"/><ellipse cx="1440" cy="560" rx="520" ry="420" fill="url(#glowR)"/>` +
      bunting(40, 880, 300) +
      bunting(1040, 1880, 300) +
      shelves +
      // Midterpille
      `<rect x="918" y="250" width="84" height="620" rx="16" fill="url(#pillar)" ${ink(7)}/>` +
      Array.from({ length: 9 }, (_, i) => `<path d="M922 ${290 + i * 66} L998 ${260 + i * 66}" stroke="#1a1446" stroke-width="18" opacity="0.7"/>`).join('') +
      `<rect x="918" y="250" width="84" height="620" rx="16" fill="none" ${ink(7)}/>` +
      // Gulv
      `<rect x="0" y="830" width="${w}" height="250" fill="url(#floor)"/>` +
      floor.join('') +
      stripes(820, 22) +
      `<rect x="0" y="${h - 20}" width="${w}" height="20" fill="#1a1446" opacity="0.6"/>`,
    linear('wall', '#3a1f6e', '#7a2f7a') +
      `<radialGradient id="glowL" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff8a2b" stop-opacity="0.22"/><stop offset="1" stop-color="#ff8a2b" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="glowR" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#9b5cff" stop-opacity="0.28"/><stop offset="1" stop-color="#9b5cff" stop-opacity="0"/></radialGradient>` +
      linear('wood', '#e0a868', '#8a5a2b') +
      linear('cup', '#ffd08a', '#e8964a') +
      linear('pillar', '#ffe27a', '#e8a91a', true) +
      linear('floor', '#5a3a8a', '#2a1a4a'),
  );
}

/** Bord med holdfarvet dug. */
export function tableSvg(color: string): string {
  const w = 880;
  const h = 300;
  let scallop = `M30 40 L850 40 L860 170`;
  for (let x = 860; x > 20; x -= 60) scallop += ` Q${x - 30} 214 ${x - 60} 172`;
  scallop += ` L30 40 Z`;
  return svgDoc(
    w,
    h,
    `<rect x="110" y="140" width="40" height="160" rx="10" fill="url(#leg)" ${ink(7)}/><rect x="730" y="140" width="40" height="160" rx="10" fill="url(#leg)" ${ink(7)}/>` +
      `<path d="${scallop}" fill="url(#cloth)" ${ink(8)}/>` +
      Array.from({ length: 14 }, (_, i) => `<circle cx="${70 + i * 58}" cy="${110 + (i % 2) * 30}" r="9" fill="#fff" opacity="0.35"/>`).join('') +
      `<rect x="20" y="24" width="840" height="28" rx="12" fill="url(#top)" ${ink(7)}/>` +
      shine(50, 30, 300, 8, 0.6),
    linear('leg', '#c98d4b', '#6b3f17', true) + linear('cloth', shade(color, 0.2), shade(color, -0.3)) + linear('top', '#fffaf0', '#e8d6b8'),
  );
}

/** Kagefad på fod. Origin: midt på pladens overside. */
export function standSvg(): string {
  return svgDoc(
    500,
    120,
    `<ellipse cx="250" cy="112" rx="110" ry="8" fill="#000" opacity="0.3"/>` +
      `<path d="M200 112 L220 40 L280 40 L300 112 Z" fill="url(#s)" ${ink(6)}/>` +
      `<ellipse cx="250" cy="110" rx="70" ry="10" fill="url(#s)" ${ink(6)}/>` +
      `<ellipse cx="250" cy="30" rx="236" ry="22" fill="url(#plate)" ${ink(7)}/>` +
      `<ellipse cx="250" cy="24" rx="210" ry="12" fill="#fff" opacity="0.35"/>`,
    linear('s', '#f1f4fb', '#8a93a8', true) + linear('plate', '#ffffff', '#b9c2d8'),
  );
}

/** Lagkage (to etager) i en glasur. Origin: bund-midt (450×340, bund ved y=330). */
export function cakeSvg(f: { top: string; mid: string }): string {
  const w = 460;
  const h = 340;
  const cx = 230;
  const sponge = '#ffe0a8';
  const drips = (x0: number, x1: number, y: number, n: number) => {
    let d = `M${x0} ${y - 20} L${x1} ${y - 20} L${x1} ${y}`;
    const step = (x1 - x0) / n;
    for (let i = n; i > 0; i--) {
      const x = x0 + i * step;
      const len = 16 + ((i * 37) % 4) * 9;
      d += ` Q${x - step * 0.1} ${y + len} ${x - step * 0.3} ${y + len} Q${x - step * 0.5} ${y + len} ${x - step * 0.6} ${y + 4} L${x - step} ${y}`;
    }
    return d + ' Z';
  };
  return svgDoc(
    w,
    h,
    // Bund-etage
    `<rect x="${cx - 200}" y="160" width="400" height="170" rx="26" fill="${sponge}" ${ink(8)}/>` +
      `<rect x="${cx - 196}" y="236" width="392" height="18" fill="${f.mid}" opacity="0.9"/>` +
      `<rect x="${cx - 196}" y="290" width="392" height="14" fill="${f.mid}" opacity="0.7"/>` +
      `<path d="${drips(cx - 200, cx + 200, 196, 9)}" fill="url(#frost)" ${ink(6)}/>` +
      `<ellipse cx="${cx}" cy="172" rx="200" ry="22" fill="url(#frostTop)" ${ink(6)}/>` +
      shine(cx - 170, 214, 90, 10, 0.5) +
      // Top-etage
      `<rect x="${cx - 130}" y="40" width="260" height="140" rx="22" fill="${sponge}" ${ink(8)}/>` +
      `<path d="${drips(cx - 130, cx + 130, 76, 6)}" fill="url(#frost)" ${ink(6)}/>` +
      `<ellipse cx="${cx}" cy="52" rx="130" ry="18" fill="url(#frostTop)" ${ink(6)}/>` +
      shine(cx - 110, 88, 60, 8, 0.5) +
      // Ansigt
      eyes(cx, 120, 70, 17, [3, 3]) +
      `<ellipse cx="${cx - 70}" cy="150" rx="14" ry="8" fill="#ff5fa2" opacity="0.45"/><ellipse cx="${cx + 70}" cy="150" rx="14" ry="8" fill="#ff5fa2" opacity="0.45"/>` +
      // Krymmel
      Array.from({ length: 16 }, (_, i) => {
        const x = cx - 170 + ((i * 53) % 340);
        const y = 170 + ((i * 29) % 14) - 6;
        return `<rect x="${x}" y="${y}" width="10" height="4" rx="2" transform="rotate(${i * 47} ${x} ${y})" fill="${['#ff4b4b', '#3d8bff', '#ffcf3a', '#3ccf5a'][i % 4]}"/>`;
      }).join(''),
    linear('frost', f.top, f.mid) + linear('frostTop', shade(f.top, 0.35), f.top),
  );
}

export function mouthSvg(kind: 'worried' | 'happy' | 'shock'): string {
  const body =
    kind === 'happy'
      ? `<path d="M10 10 Q40 46 70 10 Q40 22 10 10 Z" fill="#7a1a2a" ${ink(5)}/>`
      : kind === 'shock'
        ? `<ellipse cx="40" cy="24" rx="16" ry="18" fill="#7a1a2a" ${ink(5)}/>`
        : `<path d="M8 28 Q20 14 32 26 Q44 38 56 24 Q66 14 72 26" fill="none" ${ink(6)}/>`;
  return svgDoc(80, 50, body);
}

export function candleSvg(): string {
  return svgDoc(
    36,
    96,
    `<rect x="8" y="10" width="20" height="82" rx="6" fill="url(#c)" ${ink(4)}/>` +
      `<path d="M8 26 L28 16 M8 46 L28 36 M8 66 L28 56 M8 86 L28 76" stroke="#ff5fa2" stroke-width="6"/>` +
      `<rect x="8" y="10" width="20" height="82" rx="6" fill="none" ${ink(4)}/>` +
      `<path d="M18 10 L18 2" stroke="#1a1446" stroke-width="3"/>`,
    linear('c', '#ffffff', '#dfe8ff', true),
  );
}

export function flameSvg(): string {
  return svgDoc(
    40,
    56,
    `<ellipse cx="20" cy="34" rx="18" ry="20" fill="#ffcf3a" opacity="0.35"/>` +
      `<path d="M20 4 Q34 24 30 38 Q26 50 20 50 Q14 50 10 38 Q6 24 20 4 Z" fill="url(#f)" ${ink(3)}/>` +
      `<path d="M20 22 Q26 34 24 42 Q20 46 16 42 Q14 34 20 22 Z" fill="#fff6c8"/>`,
    linear('f', '#ffcf3a', '#ff6a2b'),
  );
}

export function strawberrySvg(): string {
  const seeds = [
    [18, 24], [30, 22], [24, 34], [14, 38], [34, 36], [24, 46],
  ]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="#ffe08a"/>`)
    .join('');
  return svgDoc(
    48,
    60,
    `<path d="M24 56 Q4 40 6 24 Q8 12 24 14 Q40 12 42 24 Q44 40 24 56 Z" fill="url(#s)" ${ink(4)}/>` +
      seeds +
      `<path d="M10 16 L18 6 L22 14 L26 4 L30 14 L38 8 L36 18 Z" fill="#3ccf5a" ${ink(3)}/>` +
      `<ellipse cx="16" cy="24" rx="4" ry="7" fill="#fff" opacity="0.45"/>`,
    radial('s', '#ff7a7a', '#d8222c'),
  );
}

export function cherrySvg(): string {
  return svgDoc(
    48,
    64,
    `<path d="M24 34 Q26 14 40 4" fill="none" stroke="#1a1446" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M24 34 Q26 14 40 4" fill="none" stroke="#3ccf5a" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="22" cy="44" r="16" fill="url(#c)" ${ink(4)}/>` +
      `<ellipse cx="16" cy="38" rx="5" ry="4" fill="#fff" opacity="0.6"/>`,
    radial('c', '#ff5a6a', '#9a0a2a'),
  );
}

/** Detonator-boksen med LCD. 170×110. */
export function boxSvg(): string {
  return svgDoc(
    170,
    110,
    `<rect x="6" y="10" width="158" height="94" rx="16" fill="url(#b)" ${ink(7)}/>` +
      `<rect x="20" y="26" width="104" height="54" rx="10" fill="#1a0a14" ${ink(4)}/>` +
      `<rect x="24" y="30" width="96" height="10" rx="5" fill="#fff" opacity="0.08"/>` +
      `<circle cx="144" cy="38" r="9" fill="#ff4b4b" ${ink(3)}/>` +
      `<circle cx="144" cy="66" r="9" fill="#3ccf5a" ${ink(3)}/>` +
      `<rect x="14" y="88" width="140" height="8" rx="4" fill="#000" opacity="0.25"/>` +
      shine(18, 14, 60, 6, 0.4),
    linear('b', '#6a6f8a', '#2a2b45'),
  );
}

/** Opslået opskriftsbog (manualen). */
export function bookSvg(): string {
  return svgDoc(
    140,
    100,
    `<path d="M70 20 Q40 4 8 12 L8 86 Q40 78 70 92 Q100 78 132 86 L132 12 Q100 4 70 20 Z" fill="#c0392b" ${ink(6)}/>` +
      `<path d="M70 22 Q42 10 14 16 L14 80 Q42 74 70 86 Z" fill="#fff6e0" ${ink(4)}/>` +
      `<path d="M70 22 Q98 10 126 16 L126 80 Q98 74 70 86 Z" fill="#fff6e0" ${ink(4)}/>` +
      `<path d="M24 30 L60 34 M24 42 L60 46 M24 54 L54 57 M80 34 L116 30 M80 46 L116 42 M80 57 L110 54" stroke="#8a93a8" stroke-width="4" stroke-linecap="round"/>` +
      `<circle cx="100" cy="68" r="8" fill="#ff5fa2" ${ink(3)}/>`,
  );
}

/** Kæmpesaks. Peger mod højre; drejepunkt ved (60, 40). */
export function scissorsSvg(): string {
  return svgDoc(
    180,
    90,
    `<path d="M60 40 L172 22 Q176 30 166 34 Z" fill="url(#blade)" ${ink(5)}/>` +
      `<path d="M60 44 L172 60 Q176 52 166 50 Z" fill="url(#blade)" ${ink(5)}/>` +
      `<ellipse cx="30" cy="22" rx="24" ry="16" fill="none" stroke="#1a1446" stroke-width="16"/><ellipse cx="30" cy="22" rx="24" ry="16" fill="none" stroke="#ff4b4b" stroke-width="9"/>` +
      `<ellipse cx="30" cy="66" rx="24" ry="16" fill="none" stroke="#1a1446" stroke-width="16"/><ellipse cx="30" cy="66" rx="24" ry="16" fill="none" stroke="#ff4b4b" stroke-width="9"/>` +
      `<path d="M50 32 L64 42 L50 54" fill="none" stroke="#1a1446" stroke-width="10" stroke-linecap="round"/>` +
      `<circle cx="62" cy="42" r="7" fill="#ffcf3a" ${ink(3)}/>`,
    linear('blade', '#ffffff', '#9aa3b8'),
  );
}

/** Flødeskums-klat (sprøjter på skærmen). */
export function creamSplatSvg(): string {
  const blobs = [
    [100, 100, 62], [160, 70, 26], [48, 150, 24], [150, 150, 30], [40, 60, 20], [104, 172, 18], [176, 120, 14], [70, 30, 14],
  ];
  const outline = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 5}"/>`).join('');
  const fill = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return svgDoc(
    220,
    220,
    `<g fill="#1a1446">${outline}</g><g fill="url(#c)">${fill}</g>` +
      `<ellipse cx="80" cy="76" rx="26" ry="14" fill="#fff" opacity="0.9"/>` +
      `<path d="M70 120 Q100 140 130 116" fill="none" stroke="#e6dcf5" stroke-width="8" stroke-linecap="round"/>`,
    radial('c', '#ffffff', '#ece4f8'),
  );
}

export function creamBlobSvg(): string {
  return svgDoc(64, 64, `<circle cx="32" cy="32" r="26" fill="#fffaf5" ${ink(5)}/><ellipse cx="24" cy="24" rx="8" ry="5" fill="#fff"/>`);
}

/** Alarm-sirene. */
export function sirenSvg(): string {
  return svgDoc(
    170,
    170,
    `<rect x="35" y="130" width="100" height="30" rx="10" fill="url(#base)" ${ink(6)}/>` +
      `<path d="M45 132 L45 70 Q45 24 85 24 Q125 24 125 70 L125 132 Z" fill="url(#dome)" ${ink(7)}/>` +
      `<rect x="62" y="60" width="46" height="60" rx="14" fill="#ffe0a0" opacity="0.8"/>` +
      shine(56, 40, 16, 50, 0.5),
    linear('base', '#6a6f8a', '#2a2b45') + linear('dome', '#ff7a6a', '#c8121c'),
  );
}

/** Lyskegle (bruges med ADD-blending). */
export function beamSvg(color: string): string {
  return svgDoc(
    700,
    260,
    `<path d="M0 130 L700 0 L700 260 Z" fill="url(#g)"/>`,
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${color}" stop-opacity="0.75"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`,
  );
}

/** Hængelampe. */
export function lampSvg(): string {
  return svgDoc(
    180,
    260,
    `<path d="M90 0 L90 120" stroke="#1a1446" stroke-width="6"/>` +
      `<path d="M30 220 Q30 140 90 120 Q150 140 150 220 Z" fill="url(#l)" ${ink(7)}/>` +
      `<ellipse cx="90" cy="220" rx="60" ry="14" fill="#fff6c8" ${ink(5)}/>` +
      shine(50, 160, 14, 40, 0.4),
    linear('l', '#3ee6a8', '#1d8a6a'),
  );
}

export function coneSvg(): string {
  return svgDoc(
    600,
    700,
    `<path d="M240 0 L360 0 L600 700 L0 700 Z" fill="url(#g)"/>`,
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.45"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>`,
  );
}

/** Mini-kage (scoreikon). */
export function miniCakeSvg(filled: boolean): string {
  if (!filled) {
    return svgDoc(80, 80, `<rect x="12" y="30" width="56" height="40" rx="10" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="8 7" opacity="0.5"/>`);
  }
  return svgDoc(
    80,
    80,
    `<rect x="12" y="34" width="56" height="38" rx="10" fill="#ffe0a8" ${ink(5)}/>` +
      `<path d="M12 44 Q12 30 40 30 Q68 30 68 44 Q60 52 52 44 Q44 54 36 44 Q28 52 20 44 Q14 50 12 44 Z" fill="#ff8cc6" ${ink(4)}/>` +
      `<rect x="36" y="10" width="8" height="20" rx="3" fill="#fff" ${ink(3)}/>` +
      `<path d="M40 2 Q46 8 40 12 Q34 8 40 2 Z" fill="#ffcf3a" ${ink(2)}/>` +
      `<path d="M30 60 L38 66 L52 52" fill="none" stroke="#3ccf5a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
}

/** Talebobbel (venstre- eller højre-pegende). 300×160 */
export function bubbleSvg(): string {
  return svgDoc(
    300,
    170,
    `<path d="M40 14 L260 14 Q290 14 290 44 L290 106 Q290 136 260 136 L120 136 L80 166 L88 136 L40 136 Q10 136 10 106 L10 44 Q10 14 40 14 Z" fill="#fffaf0" ${ink(7)}/>` +
      shine(40, 24, 120, 10, 0.6),
  );
}

export function sweatSvg(): string {
  return svgDoc(36, 48, `<path d="M18 4 Q32 26 30 32 A12 12 0 0 1 6 32 Q4 26 18 4Z" fill="#9fe0ff" ${ink(4)}/><ellipse cx="13" cy="30" rx="3" ry="5" fill="#fff" opacity="0.8"/>`);
}
