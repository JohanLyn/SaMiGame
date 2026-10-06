import { shade } from '@samigame/shared';
import { ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/**
 * Al grafik til "Svampe-Roulette": en kæmpe gryde svampesuppe i en skov om natten,
 * med levende svampe (med ansigter), der helst ikke vil ende som suppe.
 */

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Grydens suppe-flade (center, radier) i skærmkoordinater. */
export const SOUP = { cx: 960, cy: 650, rx: 840, ry: 330 };

export interface ShroomColor {
  id: string;
  name: string;
  hex: string;
}

export const SHROOM_COLORS: ShroomColor[] = [
  { id: 'rod', name: 'RØD', hex: '#ff4b4b' },
  { id: 'bla', name: 'BLÅ', hex: '#3d9bff' },
  { id: 'gron', name: 'GRØN', hex: '#5fd34a' },
  { id: 'lilla', name: 'LILLA', hex: '#a35cff' },
  { id: 'orange', name: 'ORANGE', hex: '#ff9a2b' },
];

// ---------------------------------------------------------------------------
// Baggrund

export function skySvg(): string {
  const r = seeded(11);
  const stars = Array.from({ length: 70 }, () => {
    const x = r() * 1920;
    const y = r() * 520;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.4 + r() * 2.4).toFixed(1)}" fill="#fff6e0" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
  }).join('');
  return svgDoc(
    1920,
    1080,
    `<rect width="1920" height="1080" fill="url(#sky)"/>` +
      stars +
      `<circle cx="1540" cy="130" r="120" fill="#e8f0ff" opacity="0.12"/>` +
      `<circle cx="1540" cy="130" r="74" fill="url(#moon)" ${ink(6)}/>` +
      `<circle cx="1514" cy="112" r="14" fill="#cdd8f0" opacity="0.8"/><circle cx="1566" cy="150" r="10" fill="#cdd8f0" opacity="0.8"/><circle cx="1560" cy="100" r="7" fill="#cdd8f0" opacity="0.8"/>`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0c35"/><stop offset="0.5" stop-color="#2a1f6a"/><stop offset="1" stop-color="#5a2a6a"/></linearGradient>` +
      radial('moon', '#ffffff', '#c9d6f5'),
  );
}

/** Bakker og fjerne trætoppe (1920×520). */
export function hillsSvg(): string {
  const r = seeded(5);
  let trees = '';
  for (let i = 0; i < 40; i++) {
    const x = i * 50 + r() * 30;
    const h = 90 + r() * 120;
    const y = 300 + Math.sin(i * 0.5) * 30;
    trees += `<path d="M${x} ${y} L${x + 28} ${y - h} L${x + 56} ${y} Z" fill="#241a52"/>`;
  }
  return svgDoc(
    1920,
    520,
    trees +
      `<path d="M0 300 Q240 220 520 280 Q800 340 1060 260 Q1360 180 1640 270 Q1800 320 1920 260 L1920 520 L0 520 Z" fill="#2c2160"/>` +
      `<path d="M0 380 Q300 320 640 370 Q960 420 1280 350 Q1600 290 1920 360 L1920 520 L0 520 Z" fill="#1e1748"/>`,
  );
}

/** Stort mørkt træ til siderne (560×1080). */
export function treeSvg(): string {
  const blobs = [
    [280, 220, 190],
    [150, 330, 150],
    [410, 340, 160],
    [270, 420, 170],
    [120, 520, 120],
    [440, 520, 120],
  ]
    .map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="url(#leaf)" ${ink(7)}/>`)
    .join('');
  const highlights = [
    [240, 150, 60],
    [110, 280, 40],
    [380, 270, 44],
  ]
    .map(([x, y, rr]) => `<ellipse cx="${x}" cy="${y}" rx="${rr}" ry="${rr * 0.45}" fill="#6a5acf" opacity="0.35"/>`)
    .join('');
  return svgDoc(
    560,
    1080,
    `<path d="M230 1080 L250 560 Q200 500 150 520 Q210 470 260 500 L270 420 L300 420 L310 520 Q360 470 420 490 Q360 520 320 570 L340 1080 Z" fill="url(#trunk)" ${ink(8)}/>` +
      blobs +
      highlights,
    radial('leaf', '#3b2f86', '#1c1550') + linear('trunk', '#4a2f5a', '#22142e', true),
  );
}

/** Mørk natsky (360×150). */
export function nightCloudSvg(): string {
  return svgDoc(
    360,
    150,
    `<path d="M40 120 Q6 120 14 92 Q22 64 58 70 Q64 30 112 32 Q146 4 192 26 Q240 10 262 56 Q330 50 336 92 Q340 124 300 124 Z" fill="url(#c)" ${ink(6)}/>` +
      `<path d="M74 64 Q94 46 120 52" fill="none" stroke="#9fa8ff" stroke-width="8" stroke-linecap="round" opacity="0.5"/>`,
    linear('c', '#5a4fa8', '#33296f'),
  );
}

export function glowSvg(color: string): string {
  return svgDoc(
    200,
    200,
    `<circle cx="100" cy="100" r="98" fill="url(#g)"/>`,
    `<radialGradient id="g"><stop offset="0" stop-color="${color}" stop-opacity="0.95"/><stop offset="0.35" stop-color="${color}" stop-opacity="0.4"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
  );
}

export function flameSvg(): string {
  return svgDoc(
    140,
    210,
    `<path d="M70 206 Q8 200 16 132 Q24 82 60 34 Q58 86 80 98 Q86 58 106 26 Q136 96 124 142 Q118 200 70 206 Z" fill="url(#f)" ${ink(6)}/>` +
      `<path d="M70 196 Q40 186 44 150 Q50 122 66 106 Q68 138 84 140 Q98 164 90 184 Q84 196 70 196 Z" fill="#fff3a0"/>`,
    linear('f', '#ffcf3a', '#ff4b2b'),
  );
}

// ---------------------------------------------------------------------------
// Gryden

/** Suppefladen (1720×700) – cremet svampesuppe med urter, croutoner og hvirvler. */
export function soupSvg(): string {
  const r = seeded(21);
  const w = 1720;
  const h = 700;
  const cx = w / 2;
  const cy = h / 2;
  let bits = '';
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.92;
    const x = cx + Math.cos(a) * (SOUP.rx - 20) * d;
    const y = cy + Math.sin(a) * (SOUP.ry - 10) * d;
    const k = r();
    if (k < 0.5) bits += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="14" height="6" rx="3" transform="rotate(${(r() * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})" fill="#4f9e3a"/>`;
    else if (k < 0.75) bits += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="22" height="18" rx="5" fill="#e8b45a" stroke="#9a6a2a" stroke-width="3" transform="rotate(${(r() * 40).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
    else bits += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="12" ry="6" fill="#fff3d6" opacity="0.7"/>`;
  }
  let swirls = '';
  for (let i = 0; i < 6; i++) {
    const x = cx + (r() - 0.5) * 1200;
    const y = cy + (r() - 0.5) * 380;
    const rr = 60 + r() * 80;
    swirls += `<path d="M${x - rr} ${y} Q${x - rr} ${y - rr * 0.45} ${x} ${y - rr * 0.45} Q${x + rr * 0.8} ${y - rr * 0.4} ${x + rr * 0.6} ${y} Q${x + rr * 0.3} ${y + rr * 0.25} ${x} ${y + rr * 0.12}" fill="none" stroke="#fff3d6" stroke-width="8" stroke-linecap="round" opacity="0.35"/>`;
  }
  return svgDoc(
    w,
    h,
    `<ellipse cx="${cx}" cy="${cy}" rx="${SOUP.rx + 10}" ry="${SOUP.ry + 10}" fill="url(#soup)"/>` +
      swirls +
      bits +
      `<ellipse cx="${cx}" cy="${cy}" rx="${SOUP.rx + 10}" ry="${SOUP.ry + 10}" fill="url(#edge)"/>`,
    `<radialGradient id="soup" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#f2d9a2"/><stop offset="0.7" stop-color="#d9a964"/><stop offset="1" stop-color="#a8723a"/></radialGradient>` +
      `<radialGradient id="edge" cx="0.5" cy="0.5" r="0.5"><stop offset="0.82" stop-color="#5a2a10" stop-opacity="0"/><stop offset="1" stop-color="#5a2a10" stop-opacity="0.55"/></radialGradient>`,
  );
}

/** Grydens kant (ring) med hanke og lidt af gryden under (1880×860). */
export function rimSvg(): string {
  const w = 1880;
  const h = 860;
  const cx = w / 2;
  const cy = 390;
  const ox = 905;
  const oy = 385;
  const ix = SOUP.rx + 6;
  const iy = SOUP.ry + 6;
  const ring = `M${cx - ox} ${cy} A${ox} ${oy} 0 1 0 ${cx + ox} ${cy} A${ox} ${oy} 0 1 0 ${cx - ox} ${cy} Z M${cx - ix} ${cy} A${ix} ${iy} 0 1 1 ${cx + ix} ${cy} A${ix} ${iy} 0 1 1 ${cx - ix} ${cy} Z`;
  return svgDoc(
    w,
    h,
    // Grydens bug under kanten
    `<path d="M${cx - ox + 10} ${cy + 40} Q${cx - ox + 30} ${cy + 520} ${cx} ${cy + 470} Q${cx + ox - 30} ${cy + 520} ${cx + ox - 10} ${cy + 40} Z" fill="url(#belly)" ${ink(9)}/>` +
      // Hanke
      `<path d="M10 300 Q-30 380 30 440 L60 420 Q20 380 50 320 Z" fill="#3a3a52" ${ink(7)}/>` +
      `<path d="M${w - 10} 300 Q${w + 30} 380 ${w - 30} 440 L${w - 60} 420 Q${w - 20} 380 ${w - 50} 320 Z" fill="#3a3a52" ${ink(7)}/>` +
      `<path d="${ring}" fill="url(#rim)" fill-rule="evenodd" ${ink(9)}/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${(ox + ix) / 2}" ry="${(oy + iy) / 2}" fill="none" stroke="#8f93b8" stroke-width="7" opacity="0.6"/>` +
      `<path d="M${cx - 640} ${cy - 300} Q${cx - 300} ${cy - 400} ${cx + 100} ${cy - 392}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity="0.35"/>` +
      `<path d="M${cx - 860} ${cy + 80} Q${cx - 700} ${cy + 300} ${cx - 300} ${cy + 370}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.15"/>`,
    linear('rim', '#6b6e8f', '#2a2b45') + linear('belly', '#3c3d5a', '#16162a'),
  );
}

/** Kæmpe træske (200×560). Origin ved skeens bund. */
export function spoonSvg(): string {
  return svgDoc(
    200,
    560,
    `<rect x="84" y="10" width="34" height="400" rx="17" fill="url(#w)" ${ink(7)}/>` +
      `<ellipse cx="100" cy="470" rx="80" ry="84" fill="url(#w)" ${ink(8)}/>` +
      `<ellipse cx="100" cy="476" rx="54" ry="58" fill="#d9a964" ${ink(4)}/>` +
      `<rect x="92" y="30" width="10" height="340" rx="5" fill="#fff" opacity="0.35"/>` +
      `<circle cx="101" cy="40" r="9" fill="#7a4a1b"/>`,
    linear('w', '#e8b46a', '#a8723a', true),
  );
}

// ---------------------------------------------------------------------------
// Svampene

/**
 * En flydende svamp set lidt oppefra (340×230). Hatten er platformen; ansigtet sidder på hattens forkant.
 * Billedets origin skal være hattens midte: (0.5, 70/230). Vandlinjen ligger ved y=205.
 */
export const SHROOM_TEX = { w: 340, h: 230, capY: 70, water: 205 };

export function shroomSvg(hex: string, face: 'happy' | 'scared'): string {
  const light = shade(hex, 0.35);
  const dark = shade(hex, -0.3);
  const spots = [
    [110, 52, 20, 9],
    [196, 44, 26, 11],
    [250, 76, 18, 8],
    [146, 90, 14, 6],
    [72, 82, 12, 5],
    [222, 104, 12, 5],
  ]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff6e0" opacity="0.92"/>`)
    .join('');
  const eyesY = 152;
  let faceSvg: string;
  if (face === 'happy') {
    faceSvg =
      `<ellipse cx="146" cy="${eyesY}" rx="11" ry="13" fill="#fff" ${ink(4)}/><ellipse cx="194" cy="${eyesY}" rx="11" ry="13" fill="#fff" ${ink(4)}/>` +
      `<circle cx="147" cy="${eyesY + 3}" r="6" fill="#1a1446"/><circle cx="195" cy="${eyesY + 3}" r="6" fill="#1a1446"/>` +
      `<circle cx="149" cy="${eyesY}" r="2" fill="#fff"/><circle cx="197" cy="${eyesY}" r="2" fill="#fff"/>` +
      `<path d="M160 170 Q170 180 180 170" fill="none" ${ink(4)}/>` +
      `<ellipse cx="126" cy="168" rx="9" ry="5" fill="#ff8aa0" opacity="0.7"/><ellipse cx="214" cy="168" rx="9" ry="5" fill="#ff8aa0" opacity="0.7"/>`;
  } else {
    faceSvg =
      `<ellipse cx="146" cy="${eyesY}" rx="13" ry="15" fill="#fff" ${ink(4)}/><ellipse cx="194" cy="${eyesY}" rx="13" ry="15" fill="#fff" ${ink(4)}/>` +
      `<circle cx="146" cy="${eyesY}" r="3.5" fill="#1a1446"/><circle cx="194" cy="${eyesY}" r="3.5" fill="#1a1446"/>` +
      `<path d="M130 134 L156 140 M210 134 L184 140" stroke="#1a1446" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M156 176 Q163 168 170 176 Q177 184 184 176" fill="none" ${ink(4)}/>` +
      `<path d="M238 128 Q246 140 238 146 Q230 140 238 128 Z" fill="#8fd8ff" ${ink(3)}/>`;
  }
  return svgDoc(
    340,
    230,
    // Stilk og krusning ved vandlinjen
    `<path d="M126 150 L120 208 Q170 222 220 208 L214 150 Z" fill="url(#stem)" ${ink(6)}/>` +
      `<ellipse cx="170" cy="207" rx="70" ry="13" fill="#fff3d6" opacity="0.6"/>` +
      `<ellipse cx="170" cy="207" rx="70" ry="13" fill="none" stroke="#a8723a" stroke-width="4"/>` +
      // Hattens forkant (tykkelse) og top
      `<path d="M20 70 Q20 180 170 186 Q320 180 320 70 Z" fill="url(#side)" ${ink(7)}/>` +
      `<ellipse cx="170" cy="70" rx="150" ry="62" fill="url(#top)" ${ink(7)}/>` +
      spots +
      `<path d="M60 52 Q110 18 180 16" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.5"/>` +
      faceSvg,
    `<radialGradient id="top" cx="0.42" cy="0.35" r="0.7"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${hex}"/></radialGradient>` +
      linear('side', hex, dark) +
      linear('stem', '#fff6e0', '#e0c8a0', true),
  );
}

/** Lille svampe-ikon til skiltet (160×130). */
export function shroomIconSvg(hex: string): string {
  return svgDoc(
    160,
    130,
    `<path d="M62 70 L56 118 Q80 128 104 118 L98 70 Z" fill="url(#stem)" ${ink(6)}/>` +
      `<path d="M8 74 Q8 6 80 6 Q152 6 152 74 Q80 92 8 74 Z" fill="url(#cap)" ${ink(7)}/>` +
      `<ellipse cx="50" cy="38" rx="14" ry="10" fill="#fff6e0"/><ellipse cx="100" cy="28" rx="16" ry="10" fill="#fff6e0"/><ellipse cx="120" cy="58" rx="10" ry="7" fill="#fff6e0"/>` +
      `<circle cx="70" cy="96" r="5" fill="#1a1446"/><circle cx="90" cy="96" r="5" fill="#1a1446"/>` +
      shine(30, 20, 30, 7, 0.5),
    linear('cap', shade(hex, 0.3), shade(hex, -0.2)) + linear('stem', '#fff6e0', '#e0c8a0', true),
  );
}

// ---------------------------------------------------------------------------
// Skilt, effekter

/** Hængende træskilt (760×220). */
export function signSvg(): string {
  return svgDoc(
    760,
    220,
    `<path d="M120 0 L100 50 M640 0 L660 50" stroke="#c9a46a" stroke-width="8"/>` +
      `<rect x="20" y="46" width="720" height="160" rx="30" fill="#000" opacity="0.3" transform="translate(0 10)"/>` +
      `<rect x="20" y="46" width="720" height="160" rx="30" fill="url(#w)" ${ink(8)}/>` +
      `<rect x="40" y="62" width="680" height="128" rx="20" fill="none" stroke="#7a4a1b" stroke-width="4" opacity="0.6"/>` +
      `<path d="M50 104 H710 M50 150 H710" stroke="#7a4a1b" stroke-width="3" opacity="0.35"/>` +
      `<circle cx="100" cy="62" r="8" fill="#c0c8d8" ${ink(3)}/><circle cx="660" cy="62" r="8" fill="#c0c8d8" ${ink(3)}/>` +
      shine(60, 56, 200, 12, 0.35),
    linear('w', '#e0a560', '#8a5427'),
  );
}

export function bubbleSvg(): string {
  return svgDoc(
    64,
    64,
    `<circle cx="32" cy="32" r="26" fill="url(#b)" stroke="#8a5a2a" stroke-width="4"/><ellipse cx="24" cy="22" rx="8" ry="5" fill="#fff" opacity="0.8"/>`,
    radial('b', '#fff3d6', '#d9a964'),
  );
}

/** Suppe-ring rundt om benene når man vader (200×90). */
export function wadeSvg(): string {
  return svgDoc(
    200,
    90,
    `<ellipse cx="100" cy="50" rx="92" ry="34" fill="url(#s)" stroke="#8a5a2a" stroke-width="5"/>` +
      `<ellipse cx="100" cy="50" rx="70" ry="22" fill="none" stroke="#fff3d6" stroke-width="5" opacity="0.7"/>` +
      `<ellipse cx="60" cy="40" rx="18" ry="6" fill="#fff" opacity="0.5"/>`,
    radial('s', '#f2d9a2', '#c48a4a'),
  );
}

export function rippleSvg(): string {
  return svgDoc(220, 90, `<ellipse cx="110" cy="45" rx="100" ry="36" fill="none" stroke="#fff6e0" stroke-width="7"/>`);
}

/** Klat suppe på hovedet af dem, der er røget i (180×140). */
export function sploshSvg(): string {
  return svgDoc(
    180,
    140,
    `<path d="M24 60 Q20 20 60 26 Q80 2 110 18 Q150 6 156 44 Q176 66 150 82 L148 118 Q148 130 138 130 Q128 130 128 118 L124 90 Q100 98 84 88 L80 108 Q80 120 70 120 Q60 120 60 108 L58 84 Q22 86 24 60 Z" fill="url(#g)" ${ink(5)}/>` +
      `<ellipse cx="70" cy="40" rx="20" ry="9" fill="#fff" opacity="0.5"/><rect x="100" y="40" width="16" height="7" rx="3" fill="#4f9e3a" transform="rotate(30 108 44)"/>`,
    linear('g', '#f2d9a2', '#c48a4a'),
  );
}

export function steamSvg(): string {
  return svgDoc(
    100,
    100,
    `<circle cx="50" cy="50" r="46" fill="url(#s)"/>`,
    `<radialGradient id="s"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  );
}
