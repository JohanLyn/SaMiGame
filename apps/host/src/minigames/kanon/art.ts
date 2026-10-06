import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til "Kanon-Kyllingen" – tegnet som SVG. */

/** Arenaen (gårdspladsen) i skærmkoordinater. */
export const ARENA = { x0: 160, x1: 1760, y0: 480, y1: 1000 };

/** Himmel med bakker, lade og silo (øverste del af skærmen). */
export function farmSkySvg(): string {
  const w = 1920;
  const h = 460;
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#sky)"/>` +
      `<path d="M0 300 Q300 200 640 260 Q960 320 1260 230 Q1600 150 1920 250 V460 H0 Z" fill="#8fd16a"/>` +
      `<path d="M0 340 Q420 270 860 320 Q1300 370 1920 300 V460 H0 Z" fill="#6fbf4a"/>` +
      // marker-striber
      `<path d="M1300 260 Q1500 230 1700 250" stroke="#5aa83a" stroke-width="8" fill="none" opacity="0.6"/>` +
      `<path d="M1260 285 Q1500 255 1760 275" stroke="#5aa83a" stroke-width="8" fill="none" opacity="0.6"/>` +
      `<path d="M120 300 Q300 270 520 285" stroke="#5aa83a" stroke-width="8" fill="none" opacity="0.6"/>`,
    linear('sky', '#5ec8ff', '#d9f3ff'),
  );
}

export function barnSvg(): string {
  return svgDoc(
    360,
    320,
    `<ellipse cx="180" cy="306" rx="170" ry="12" fill="#000" opacity="0.2"/>` +
      `<path d="M30 130 L180 30 L330 130 L330 300 L30 300 Z" fill="url(#r)" ${ink(8)}/>` +
      `<path d="M14 140 L180 22 L346 140" fill="none" stroke="#fff6e0" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<path d="M14 140 L180 22 L346 140" fill="none" ${ink(5)}/>` +
      `<rect x="120" y="170" width="120" height="130" fill="#8a1a2a" ${ink(6)}/>` +
      `<path d="M120 170 L240 300 M240 170 L120 300" stroke="#fff6e0" stroke-width="10"/>` +
      `<rect x="120" y="170" width="120" height="130" fill="none" stroke="#fff6e0" stroke-width="10"/>` +
      `<rect x="150" y="80" width="60" height="50" rx="6" fill="#fff3a0" ${ink(5)}/>` +
      `<path d="M180 80 V130 M150 105 H210" stroke="#1a1446" stroke-width="4"/>` +
      shine(46, 150, 30, 120, 0.15),
    linear('r', '#ff5a4a', '#b8202e'),
  );
}

export function siloSvg(): string {
  return svgDoc(
    170,
    380,
    `<ellipse cx="85" cy="366" rx="80" ry="10" fill="#000" opacity="0.2"/>` +
      `<rect x="20" y="80" width="130" height="285" rx="12" fill="url(#s)" ${ink(7)}/>` +
      `<path d="M20 90 Q85 -10 150 90 Z" fill="url(#d)" ${ink(7)}/>` +
      [140, 200, 260, 320].map((y) => `<path d="M24 ${y} H146" stroke="#8a93a8" stroke-width="5"/>`).join('') +
      `<rect x="34" y="96" width="16" height="260" rx="8" fill="#fff" opacity="0.35"/>`,
    linear('s', '#f1f4fb', '#a9b2c8', true) + linear('d', '#ff6a5a', '#b8202e'),
  );
}

export function windmillBladesSvg(): string {
  const blade = (a: number) =>
    `<g transform="rotate(${a} 100 100)"><rect x="92" y="10" width="16" height="90" rx="6" fill="#fff6e0" ${ink(5)}/><rect x="98" y="16" width="30" height="64" rx="4" fill="#ffcf3a" ${ink(4)}/></g>`;
  return svgDoc(200, 200, blade(0) + blade(90) + blade(180) + blade(270) + `<circle cx="100" cy="100" r="14" fill="#8a5a2b" ${ink(5)}/>`);
}

export function windmillTowerSvg(): string {
  return svgDoc(
    140,
    260,
    `<path d="M40 250 L60 20 L80 20 L100 250 Z" fill="url(#t)" ${ink(6)}/>` +
      `<path d="M50 140 L90 140 M46 200 L94 200 M55 80 L85 80" stroke="#8a5a2b" stroke-width="5"/>`,
    linear('t', '#e0a463', '#9a6434', true),
  );
}

/** Gårdspladsen. */
export function yardSvg(): string {
  const w = 1920;
  const h = 780;
  const flowers = Array.from({ length: 34 }, (_, i) => {
    const x = (i * 557) % w;
    const y = 30 + ((i * 211) % (h - 60));
    const col = ['#ff5fa2', '#ffcf3a', '#ffffff', '#9b5cff'][i % 4];
    return `<circle cx="${x}" cy="${y}" r="7" fill="${col}" stroke="#1a1446" stroke-width="3"/><circle cx="${x}" cy="${y}" r="2.5" fill="#ffcf3a"/>`;
  }).join('');
  const tufts = Array.from({ length: 80 }, (_, i) => {
    const x = (i * 263) % w;
    const y = 20 + ((i * 97) % (h - 30));
    return `<path d="M${x} ${y} q4 -14 8 0 q4 -18 8 0 q4 -12 8 0" fill="none" stroke="#3e9a36" stroke-width="4" stroke-linecap="round" opacity="0.65"/>`;
  }).join('');
  const pebbles = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2;
    const x = 960 + Math.cos(a) * (560 + (i % 3) * 30);
    const y = 400 + Math.sin(a) * (230 + (i % 2) * 20);
    return `<ellipse cx="${x}" cy="${y}" rx="${8 + (i % 3) * 3}" ry="${5 + (i % 2) * 2}" fill="#c99a62" opacity="0.8"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
      tufts +
      flowers +
      `<ellipse cx="960" cy="400" rx="640" ry="290" fill="url(#dirt)" opacity="0.9"/>` +
      `<ellipse cx="960" cy="400" rx="600" ry="262" fill="none" stroke="#a37042" stroke-width="6" opacity="0.4"/>` +
      `<ellipse cx="820" cy="300" rx="260" ry="60" fill="#fff" opacity="0.08"/>` +
      pebbles,
    linear('g', '#62c94e', '#2f8a3a') + radial('dirt', '#e8bd85', '#c08a52'),
  );
}

/** Hegn (vandret stykke, gentages). */
export function fenceSvg(): string {
  const posts = Array.from({ length: 6 }, (_, i) => {
    const x = 10 + i * 64;
    return `<rect x="${x}" y="10" width="26" height="100" rx="8" fill="url(#w)" ${ink(5)}/>`;
  }).join('');
  return svgDoc(
    384,
    120,
    `<rect x="0" y="34" width="384" height="18" rx="7" fill="url(#w)" ${ink(5)}/>` +
      `<rect x="0" y="74" width="384" height="18" rx="7" fill="url(#w)" ${ink(5)}/>` +
      posts,
    linear('w', '#f2c48a', '#b57a3e'),
  );
}

/** Skinne kanonen kører på. */
export function railSvg(): string {
  const w = 1920;
  const ties = Array.from({ length: 40 }, (_, i) => `<rect x="${i * 50}" y="16" width="26" height="40" rx="5" fill="#8a5a2b" ${ink(4)}/>`).join('');
  return svgDoc(w, 70, ties + `<rect x="0" y="22" width="${w}" height="12" rx="6" fill="url(#m)" ${ink(4)}/><rect x="0" y="40" width="${w}" height="12" rx="6" fill="url(#m)" ${ink(4)}/>`, linear('m', '#e6ebf5', '#7a8299'));
}

/** Kyllingen (kroppen). Origin ca. ved vognens bund. */
export function chickenSvg(): string {
  return svgDoc(
    340,
    330,
    // vogn
    `<rect x="40" y="226" width="260" height="56" rx="16" fill="url(#cart)" ${ink(7)}/>` +
      `<path d="M58 244 H282" stroke="#fff" stroke-width="6" opacity="0.3" stroke-linecap="round"/>` +
      // hale
      `<path d="M262 120 Q326 70 316 150 Q336 120 330 190 Q300 200 270 180 Z" fill="url(#f)" ${ink(6)}/>` +
      `<path d="M78 120 Q14 70 24 150 Q4 120 10 190 Q40 200 70 180 Z" fill="url(#f)" ${ink(6)}/>` +
      // krop
      `<ellipse cx="170" cy="170" rx="128" ry="96" fill="url(#body)" ${ink(8)}/>` +
      `<path d="M80 150 Q120 210 170 208 Q220 210 260 150" fill="none" stroke="#e3d6c0" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M95 182 Q130 226 170 226 Q210 226 245 182" fill="none" stroke="#e3d6c0" stroke-width="6" stroke-linecap="round"/>` +
      // vinger
      `<path d="M58 160 Q20 200 54 236 Q86 230 96 196 Z" fill="url(#f)" ${ink(6)}/>` +
      `<path d="M282 160 Q320 200 286 236 Q254 230 244 196 Z" fill="url(#f)" ${ink(6)}/>` +
      // hoved
      `<circle cx="170" cy="98" r="66" fill="url(#body)" ${ink(8)}/>` +
      // kam
      `<path d="M130 46 Q122 6 152 18 Q160 -6 182 14 Q206 0 210 34 Q226 38 214 56 Z" fill="url(#comb)" ${ink(6)}/>` +
      // vrede bryn + øjne
      eyes(170, 92, 54, 17, [0, 6]) +
      `<path d="M126 66 L158 80 M214 66 L182 80" stroke="#1a1446" stroke-width="9" stroke-linecap="round"/>` +
      // næb
      `<path d="M146 116 Q170 104 194 116 L170 150 Z" fill="url(#beak)" ${ink(6)}/>` +
      `<path d="M150 122 Q170 128 190 122" stroke="#c4561a" stroke-width="4" fill="none"/>` +
      // hagelap
      `<path d="M160 146 Q150 176 168 178 Q182 176 176 148 Z" fill="url(#comb)" ${ink(5)}/>` +
      `<ellipse cx="132" cy="120" rx="12" ry="7" fill="#ff8a8a" opacity="0.7"/><ellipse cx="208" cy="120" rx="12" ry="7" fill="#ff8a8a" opacity="0.7"/>` +
      `<ellipse cx="140" cy="54" rx="22" ry="10" fill="#fff" opacity="0.6"/>`,
    radial('body', '#ffffff', '#e8dcc6') +
      linear('f', '#fff6e0', '#d9c6a6') +
      linear('comb', '#ff6a6a', '#c0213a') +
      linear('beak', '#ffd36b', '#ff8a2b') +
      linear('cart', '#c98d4b', '#7a4a1b'),
  );
}

/** Kanonrør (peger nedad, origin i toppen). */
export function barrelSvg(): string {
  return svgDoc(
    110,
    170,
    `<rect x="18" y="8" width="74" height="140" rx="20" fill="url(#m)" ${ink(7)}/>` +
      `<rect x="10" y="120" width="90" height="42" rx="14" fill="url(#m2)" ${ink(7)}/>` +
      `<ellipse cx="55" cy="160" rx="34" ry="8" fill="#1a1446"/>` +
      `<rect x="14" y="50" width="82" height="16" rx="7" fill="#ffcf3a" ${ink(5)}/>` +
      `<rect x="28" y="16" width="12" height="110" rx="6" fill="#fff" opacity="0.35"/>`,
    linear('m', '#7a85a8', '#2e3352', true) + linear('m2', '#9aa5c8', '#3e4362', true),
  );
}

export function wheelSvg(): string {
  return svgDoc(
    90,
    90,
    `<circle cx="45" cy="45" r="40" fill="url(#w)" ${ink(6)}/>` +
      `<path d="M45 8 V82 M8 45 H82 M19 19 L71 71 M71 19 L19 71" stroke="#7a4a1b" stroke-width="6"/>` +
      `<circle cx="45" cy="45" r="11" fill="#ffcf3a" ${ink(4)}/>`,
    linear('w', '#d9a160', '#8a5a2b'),
  );
}

/** Æg med forskrækket ansigt. */
export function eggSvg(): string {
  return svgDoc(
    80,
    100,
    `<path d="M40 4 Q74 8 74 60 Q74 96 40 96 Q6 96 6 60 Q6 8 40 4 Z" fill="url(#e)" ${ink(5)}/>` +
      `<ellipse cx="28" cy="34" rx="9" ry="16" fill="#fff" opacity="0.8" transform="rotate(20 28 34)"/>` +
      `<circle cx="30" cy="58" r="5" fill="#1a1446"/><circle cx="50" cy="58" r="5" fill="#1a1446"/>` +
      `<ellipse cx="40" cy="74" rx="6" ry="8" fill="#1a1446"/>`,
    radial('e', '#fffdf4', '#ecd9b4'),
  );
}

/** Gyldent "mega-æg". */
export function goldEggSvg(): string {
  return svgDoc(
    80,
    100,
    `<path d="M40 4 Q74 8 74 60 Q74 96 40 96 Q6 96 6 60 Q6 8 40 4 Z" fill="url(#e)" ${ink(5)}/>` +
      `<ellipse cx="28" cy="34" rx="9" ry="16" fill="#fff" opacity="0.8" transform="rotate(20 28 34)"/>` +
      `<path d="M24 54 L34 60 M56 54 L46 60" stroke="#1a1446" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M30 76 Q40 68 50 76" stroke="#1a1446" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    radial('e', '#fff7b0', '#f2b400'),
  );
}

/** Æggeplet på jorden (hvide + blomme). */
export function splatSvg(): string {
  return svgDoc(
    220,
    130,
    `<path d="M30 70 Q10 40 50 34 Q60 6 100 20 Q130 0 160 26 Q206 24 196 62 Q218 92 174 102 Q160 128 116 112 Q80 130 54 108 Q8 108 30 70 Z" fill="url(#w)" ${ink(4)} opacity="0.95"/>` +
      `<circle cx="16" cy="40" r="7" fill="#fffdf4" ${ink(3)}/><circle cx="204" cy="40" r="6" fill="#fffdf4" ${ink(3)}/><circle cx="190" cy="116" r="5" fill="#fffdf4" ${ink(3)}/>` +
      `<ellipse cx="112" cy="66" rx="36" ry="26" fill="url(#y)" ${ink(4)}/>` +
      `<ellipse cx="102" cy="58" rx="12" ry="7" fill="#fff" opacity="0.7"/>`,
    linear('w', '#fffdf4', '#efe4c8') + radial('y', '#ffe066', '#ff9a1a'),
  );
}

/** Skal-stump (partikel). */
export function shellSvg(): string {
  return svgDoc(32, 28, `<path d="M2 20 L8 4 L14 12 L20 2 L30 18 Q16 30 2 20 Z" fill="#fff6e0" ${ink(3)}/>`);
}

/** Sigtekorn (farves med enerens farve). */
export function reticleSvg(): string {
  return svgDoc(
    200,
    120,
    `<ellipse cx="100" cy="60" rx="90" ry="50" fill="none" stroke="#1a1446" stroke-width="16"/>` +
      `<ellipse cx="100" cy="60" rx="90" ry="50" fill="none" stroke="#fff" stroke-width="9" stroke-dasharray="30 16"/>` +
      `<path d="M100 18 V44 M100 76 V102 M20 60 H66 M134 60 H180" stroke="#1a1446" stroke-width="14" stroke-linecap="round"/>` +
      `<path d="M100 18 V44 M100 76 V102 M20 60 H66 M134 60 H180" stroke="#fff" stroke-width="7" stroke-linecap="round"/>` +
      `<circle cx="100" cy="60" r="7" fill="#fff" stroke="#1a1446" stroke-width="4"/>`,
  );
}

/** Advarsels-ring hvor ægget lander. */
export function warnSvg(): string {
  return svgDoc(
    200,
    110,
    `<ellipse cx="100" cy="55" rx="94" ry="50" fill="#ff4b4b" opacity="0.18"/>` +
      `<ellipse cx="100" cy="55" rx="94" ry="50" fill="none" stroke="#ff4b4b" stroke-width="7" stroke-dasharray="18 12"/>`,
  );
}

export function haySvg(): string {
  return svgDoc(
    200,
    150,
    `<ellipse cx="100" cy="138" rx="94" ry="10" fill="#000" opacity="0.22"/>` +
      `<rect x="10" y="30" width="180" height="104" rx="22" fill="url(#h)" ${ink(6)}/>` +
      `<path d="M10 64 H190 M10 100 H190" stroke="#c08a2a" stroke-width="5"/>` +
      `<path d="M50 30 V134 M150 30 V134" stroke="#b5562b" stroke-width="7"/>` +
      `<path d="M30 40 l6 -16 M60 36 l-4 -18 M120 36 l4 -16 M170 40 l-8 -14" stroke="#e8b84a" stroke-width="5" stroke-linecap="round"/>` +
      shine(26, 40, 60, 10, 0.4),
    linear('h', '#ffe08a', '#e0a83a'),
  );
}

export function chickSvg(): string {
  return svgDoc(
    80,
    80,
    `<ellipse cx="40" cy="72" rx="26" ry="5" fill="#000" opacity="0.2"/>` +
      `<ellipse cx="40" cy="46" rx="28" ry="26" fill="url(#c)" ${ink(4)}/>` +
      `<path d="M10 40 Q2 30 12 26 Q18 34 18 42 Z" fill="#ffd94a" ${ink(3)}/>` +
      `<circle cx="34" cy="38" r="4" fill="#1a1446"/><circle cx="50" cy="38" r="4" fill="#1a1446"/>` +
      `<path d="M38 46 L48 46 L43 54 Z" fill="#ff8a2b" ${ink(3)}/>` +
      `<path d="M34 72 V64 M46 72 V64" stroke="#ff8a2b" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M38 20 q2 -8 6 -2" stroke="#1a1446" stroke-width="3" fill="none"/>`,
    radial('c', '#fff7b0', '#ffd23a'),
  );
}

/** Lille fjer (partikel). */
export function featherSvg(): string {
  return svgDoc(40, 60, `<path d="M20 4 Q36 24 22 56 Q4 30 20 4 Z" fill="#fffdf4" ${ink(3)}/><path d="M20 10 V54" stroke="#d9c6a6" stroke-width="2"/>`);
}
