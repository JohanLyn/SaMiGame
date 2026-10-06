import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til "Gemmeleg i Toiletterne" – tegnet som SVG. */

export const CABIN_COLORS = ['#ff5f6d', '#3d8bff', '#3ccf5a', '#ffc928', '#ff5fa2', '#9b5cff'];
export const CABIN = { w: 250, h: 420, doorX: 45, doorY: 112, doorW: 160, doorH: 286 };

/** Selve toiletvognen (uden dør). Origin nederst i midten. */
export function cabinSvg(color: string): string {
  const { w, h } = CABIN;
  const light = shade(color, 0.25);
  const dark = shade(color, -0.3);
  const ribs = [22, 34, 216, 228]
    .map((x) => `<rect x="${x}" y="104" width="6" height="296" rx="3" fill="${dark}" opacity="0.35"/>`)
    .join('');
  return svgDoc(
    w,
    h,
    // skygge
    `<ellipse cx="${w / 2}" cy="${h - 10}" rx="${w / 2 - 6}" ry="12" fill="#000" opacity="0.3"/>` +
      // krop
      `<rect x="10" y="78" width="${w - 20}" height="${h - 92}" rx="18" fill="url(#body)" ${ink(8)}/>` +
      `<rect x="10" y="78" width="${(w - 20) * 0.16}" height="${h - 92}" rx="14" fill="#fff" opacity="0.18"/>` +
      `<rect x="${w - 10 - (w - 20) * 0.14}" y="78" width="${(w - 20) * 0.14}" height="${h - 92}" rx="14" fill="#000" opacity="0.14"/>` +
      ribs +
      // tag
      `<path d="M2 92 Q${w / 2} 4 ${w - 2} 92 Z" fill="url(#roof)" ${ink(8)}/>` +
      `<path d="M30 76 Q${w / 2} 24 ${w - 60} 60" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.4"/>` +
      // udluftning
      `<rect x="${w / 2 - 22}" y="14" width="44" height="28" rx="8" fill="${shade(color, -0.45)}" ${ink(5)}/>` +
      `<path d="M${w / 2 - 14} 24 H${w / 2 + 14} M${w / 2 - 14} 32 H${w / 2 + 14}" stroke="${light}" stroke-width="3"/>` +
      // dørkarm
      `<rect x="${CABIN.doorX - 10}" y="${CABIN.doorY - 10}" width="${CABIN.doorW + 20}" height="${CABIN.doorH + 14}" rx="14" fill="${dark}" ${ink(6)}/>` +
      // sokkel
      `<rect x="16" y="${h - 26}" width="${w - 32}" height="16" rx="6" fill="#5a5f78" ${ink(5)}/>`,
    linear('body', light, dark) + linear('roof', shade(color, 0.45), shade(color, -0.15)),
  );
}

/** Døren. Origin = hængslet (venstre kant). */
export function doorSvg(color: string): string {
  const { doorW: w, doorH: h } = CABIN;
  return svgDoc(
    w + 8,
    h + 8,
    `<rect x="4" y="4" width="${w}" height="${h}" rx="12" fill="url(#d)" ${ink(6)}/>` +
      `<rect x="16" y="16" width="${w - 24}" height="${h * 0.38}" rx="8" fill="none" stroke="${shade(color, -0.25)}" stroke-width="5"/>` +
      `<rect x="16" y="${h * 0.52}" width="${w - 24}" height="${h * 0.42}" rx="8" fill="none" stroke="${shade(color, -0.25)}" stroke-width="5"/>` +
      // halvmåne
      `<circle cx="${w / 2 + 4}" cy="62" r="30" fill="#1a1446"/>` +
      `<circle cx="${w / 2 + 18}" cy="54" r="27" fill="url(#d2)"/>` +
      `<circle cx="${w / 2 + 4}" cy="62" r="30" fill="none" ${ink(5)}/>` +
      // ledig/optaget-skilt
      `<rect x="${w / 2 - 34}" y="${h * 0.44 - 4}" width="76" height="26" rx="13" fill="#fff6e0" ${ink(4)}/>` +
      `<rect x="${w / 2 - 28}" y="${h * 0.44 + 1}" width="30" height="16" rx="8" fill="#3ccf5a"/>` +
      `<text x="${w / 2 + 22}" y="${h * 0.44 + 15}" font-family="Arial" font-weight="900" font-size="13" text-anchor="middle" fill="#1a1446">WC</text>` +
      shine(14, 12, 40, 10, 0.4),
    linear('d', shade(color, 0.12), shade(color, -0.18), true) + linear('d2', shade(color, 0.12), shade(color, -0.05), true),
  );
}

/** Dørhåndtag. */
export function handleSvg(): string {
  return svgDoc(
    56,
    40,
    `<circle cx="14" cy="20" r="12" fill="url(#s)" ${ink(4)}/>` +
      `<rect x="12" y="13" width="40" height="14" rx="7" fill="url(#s)" ${ink(4)}/>` +
      `<rect x="18" y="15" width="22" height="4" rx="2" fill="#fff" opacity="0.7"/>`,
    linear('s', '#f4f6ff', '#8a93a8'),
  );
}

/** Det mørke indre af en toiletvogn med toilet og papir. */
export function interiorSvg(): string {
  const { doorW: w, doorH: h } = CABIN;
  return svgDoc(
    w,
    h,
    `<rect x="0" y="0" width="${w}" height="${h}" rx="10" fill="url(#in)"/>` +
      // pære
      `<path d="M${w / 2} 0 V18" stroke="#1a1446" stroke-width="3"/>` +
      `<circle cx="${w / 2}" cy="28" r="12" fill="#fff3a0" ${ink(3)}/>` +
      `<circle cx="${w / 2}" cy="28" r="34" fill="#fff3a0" opacity="0.15"/>` +
      // graffiti
      `<path d="M22 70 l10 -10 l10 10 l-10 14 Z" fill="none" stroke="#ff5fa2" stroke-width="3" opacity="0.7"/>` +
      `<text x="${w - 50}" y="96" font-family="Arial" font-weight="900" font-size="15" fill="#3ee6a8" opacity="0.7" transform="rotate(-12 ${w - 50} 96)">S+M</text>` +
      // toiletpapir
      `<rect x="${w - 44}" y="132" width="10" height="16" fill="#5a5f78"/>` +
      `<rect x="${w - 52}" y="146" width="34" height="26" rx="9" fill="#fff" ${ink(3)}/>` +
      `<rect x="${w - 46}" y="168" width="16" height="30" fill="#fff" ${ink(3)}/>` +
      // toilet
      `<rect x="${w / 2 - 36}" y="150" width="72" height="56" rx="10" fill="url(#por)" ${ink(4)}/>` +
      `<ellipse cx="${w / 2}" cy="${h - 62}" rx="48" ry="22" fill="url(#por)" ${ink(4)}/>` +
      `<ellipse cx="${w / 2}" cy="${h - 64}" rx="34" ry="13" fill="#7fd7ff" ${ink(3)}/>` +
      `<path d="M${w / 2 - 30} ${h - 50} Q${w / 2} ${h - 4} ${w / 2 + 30} ${h - 50} Z" fill="url(#por)" ${ink(4)}/>` +
      `<rect x="${w / 2 - 26}" y="${h - 22}" width="52" height="16" rx="6" fill="#dfe6f5" ${ink(4)}/>`,
    linear('in', '#3a2f6b', '#120e30') + linear('por', '#ffffff', '#c9d3ea'),
  );
}

/** Gummiand. */
export function duckSvg(): string {
  return svgDoc(
    170,
    150,
    `<ellipse cx="88" cy="138" rx="62" ry="9" fill="#000" opacity="0.25"/>` +
      `<path d="M20 92 Q16 136 80 136 Q150 138 152 96 Q156 70 128 74 Q108 78 96 88 Q60 70 20 92 Z" fill="url(#y)" ${ink(6)}/>` +
      `<path d="M56 96 Q80 120 112 100" fill="none" stroke="#e6a100" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="64" cy="58" r="40" fill="url(#y)" ${ink(6)}/>` +
      `<path d="M28 62 Q4 58 6 72 Q14 84 34 76 Z" fill="#ff8a2b" ${ink(5)}/>` +
      `<path d="M8 70 Q20 72 32 70" stroke="#c4561a" stroke-width="3" fill="none"/>` +
      eyes(64, 48, 26, 10, [-3, 1]) +
      `<ellipse cx="78" cy="30" rx="14" ry="7" fill="#fff" opacity="0.6"/>` +
      `<ellipse cx="40" cy="74" rx="7" ry="4" fill="#ff8a5c" opacity="0.6"/>`,
    radial('y', '#fff7a0', '#ffc928'),
  );
}

/** En lille flue. */
export function flySvg(): string {
  return svgDoc(
    48,
    40,
    `<ellipse cx="16" cy="12" rx="12" ry="8" fill="#dff4ff" opacity="0.85" ${ink(2)} transform="rotate(-25 16 12)"/>` +
      `<ellipse cx="32" cy="12" rx="12" ry="8" fill="#dff4ff" opacity="0.85" ${ink(2)} transform="rotate(25 32 12)"/>` +
      `<ellipse cx="24" cy="26" rx="11" ry="9" fill="#2b2f4a" ${ink(3)}/>` +
      `<circle cx="19" cy="23" r="4" fill="#ff4b4b"/><circle cx="29" cy="23" r="4" fill="#ff4b4b"/>` +
      `<circle cx="20" cy="22" r="1.5" fill="#fff"/><circle cx="30" cy="22" r="1.5" fill="#fff"/>`,
  );
}

/** Grøn stinkesky. */
export function stinkSvg(): string {
  return svgDoc(
    120,
    100,
    `<path d="M20 80 Q2 78 8 58 Q10 40 32 44 Q36 18 62 22 Q84 8 98 32 Q118 34 114 56 Q122 78 100 82 Z" fill="url(#g)" ${ink(4)} opacity="0.92"/>` +
      `<path d="M34 52 Q44 42 56 46" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.5"/>` +
      `<path d="M50 66 q6 -6 12 0 q6 6 12 0" stroke="#3a6b1a" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      `<circle cx="48" cy="58" r="4" fill="#3a6b1a"/><circle cx="76" cy="58" r="4" fill="#3a6b1a"/>`,
    radial('g', '#c8f56b', '#6fbf3a'),
  );
}

/** Toiletpapirrulle. */
export function rollSvg(): string {
  return svgDoc(
    64,
    56,
    `<rect x="8" y="10" width="44" height="38" rx="10" fill="url(#p)" ${ink(4)}/>` +
      `<ellipse cx="52" cy="29" rx="8" ry="19" fill="#fff" ${ink(4)}/>` +
      `<ellipse cx="52" cy="29" rx="3" ry="7" fill="#c9b79a"/>` +
      `<path d="M14 18 H40" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`,
    linear('p', '#ffffff', '#d9def0'),
  );
}

/** Svupper (forsøg-ikon). */
export function plungerSvg(): string {
  return svgDoc(
    80,
    110,
    `<rect x="34" y="6" width="12" height="62" rx="6" fill="url(#w)" ${ink(4)}/>` +
      `<path d="M10 100 Q8 70 40 66 Q72 70 70 100 Z" fill="url(#r)" ${ink(5)}/>` +
      `<rect x="6" y="94" width="68" height="10" rx="5" fill="#a81a2a" ${ink(4)}/>` +
      `<path d="M22 82 Q30 74 40 74" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.6"/>`,
    linear('w', '#e0a463', '#8a5a2b', true) + radial('r', '#ff7a7a', '#d0213a'),
  );
}

/** Himmel + scene + bakker (hele baggrunden bag toiletterne). */
export function skySvg(): string {
  const w = 1920;
  const h = 700;
  const stars = Array.from({ length: 50 }, (_, i) => {
    const x = (i * 397) % w;
    const y = (i * 151) % 300;
    const r = 1.5 + (i % 3);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.3 + (i % 5) * 0.12}"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#sky)"/>` +
      stars +
      // fjerne bakker
      `<path d="M0 520 Q240 420 520 480 Q820 540 1080 440 Q1380 360 1640 470 Q1800 520 1920 470 V700 H0 Z" fill="#4a2f7a"/>` +
      `<path d="M0 580 Q300 500 620 560 Q960 620 1300 530 Q1600 470 1920 560 V700 H0 Z" fill="#3a2566"/>`,
    linear('sky', '#1b1450', '#ff7a7a'),
  );
}

/** Festivalscene i det fjerne. */
export function stageSvg(): string {
  return svgDoc(
    620,
    330,
    `<path d="M20 120 L310 20 L600 120 Z" fill="#2a1f5a" ${ink(6)}/>` +
      `<rect x="40" y="118" width="540" height="190" rx="10" fill="#2a1f5a" ${ink(6)}/>` +
      `<rect x="70" y="140" width="480" height="140" rx="8" fill="url(#st)" ${ink(4)}/>` +
      `<rect x="20" y="290" width="580" height="30" rx="8" fill="#3a2f7a" ${ink(5)}/>` +
      // højttalere
      `<rect x="56" y="180" width="54" height="100" rx="6" fill="#1a1446"/><circle cx="83" cy="210" r="14" fill="#5a4fa0"/><circle cx="83" cy="252" r="18" fill="#5a4fa0"/>` +
      `<rect x="510" y="180" width="54" height="100" rx="6" fill="#1a1446"/><circle cx="537" cy="210" r="14" fill="#5a4fa0"/><circle cx="537" cy="252" r="18" fill="#5a4fa0"/>` +
      // banner
      `<rect x="180" y="60" width="260" height="46" rx="10" fill="#ffcf3a" ${ink(5)}/>` +
      `<text x="310" y="93" font-family="Arial Black, Arial" font-weight="900" font-size="28" text-anchor="middle" fill="#1a1446">SAMI FEST</text>`,
    linear('st', '#ff5fa2', '#7a2a9a'),
  );
}

/** Pariserhjul (roterende del). */
export function wheelSvg(): string {
  const cx = 200;
  const cy = 200;
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<path d="M${cx} ${cy} L${cx + Math.cos(a) * 180} ${cy + Math.sin(a) * 180}" stroke="#2a1f5a" stroke-width="5"/>`;
  }).join('');
  const lights = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const col = ['#ffcf3a', '#ff5fa2', '#3ee6a8', '#47b8ff'][i % 4];
    return `<circle cx="${cx + Math.cos(a) * 180}" cy="${cy + Math.sin(a) * 180}" r="7" fill="${col}"/>`;
  }).join('');
  const cars = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const x = cx + Math.cos(a) * 180;
    const y = cy + Math.sin(a) * 180;
    const col = ['#ff5f6d', '#3d8bff', '#3ccf5a', '#ffc928'][i % 4];
    return `<rect x="${x - 16}" y="${y - 10}" width="32" height="24" rx="7" fill="${col}" stroke="#1a1446" stroke-width="3"/>`;
  }).join('');
  return svgDoc(
    400,
    400,
    `<circle cx="${cx}" cy="${cy}" r="180" fill="none" stroke="#2a1f5a" stroke-width="10"/>` +
      `<circle cx="${cx}" cy="${cy}" r="120" fill="none" stroke="#2a1f5a" stroke-width="5"/>` +
      spokes +
      lights +
      cars +
      `<circle cx="${cx}" cy="${cy}" r="20" fill="#3a2f7a" stroke="#1a1446" stroke-width="4"/>`,
  );
}

export function wheelStandSvg(): string {
  return svgDoc(
    300,
    260,
    `<path d="M150 10 L30 250 M150 10 L270 250" stroke="#2a1f5a" stroke-width="16" stroke-linecap="round"/>` +
      `<path d="M80 150 H220" stroke="#2a1f5a" stroke-width="8"/>`,
  );
}

/** Lyskegle fra scenen. */
export function beamSvg(): string {
  return svgDoc(
    200,
    700,
    `<path d="M90 0 L110 0 L200 700 L0 700 Z" fill="url(#b)"/>`,
    `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c0" stop-opacity="0.55"/><stop offset="1" stop-color="#fff6c0" stop-opacity="0"/></linearGradient>`,
  );
}

/** Græsplæne med mudder og festivalaffald. */
export function groundSvg(): string {
  const w = 1920;
  const h = 460;
  const tufts = Array.from({ length: 70 }, (_, i) => {
    const x = (i * 271) % w;
    const y = 40 + ((i * 113) % (h - 60));
    return `<path d="M${x} ${y} q4 -14 8 0 q4 -18 8 0 q4 -12 8 0" fill="none" stroke="#2f8a3a" stroke-width="4" stroke-linecap="round" opacity="0.7"/>`;
  }).join('');
  const cups = [
    [180, 300, '#ff4b4b'], [760, 380, '#47b8ff'], [1320, 330, '#ff4b4b'], [1700, 400, '#ffcf3a'],
  ]
    .map(([x, y, c]) => `<path d="M${x} ${y} l26 -8 l6 18 l-26 8 Z" fill="${c}" stroke="#1a1446" stroke-width="3" stroke-linejoin="round"/><ellipse cx="${Number(x) + 30}" cy="${Number(y) + 1}" rx="4" ry="9" fill="#fff" stroke="#1a1446" stroke-width="2" transform="rotate(-18 ${Number(x) + 30} ${Number(y) + 1})"/>`)
    .join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
      `<path d="M0 6 Q480 -8 960 8 Q1440 22 1920 4" stroke="#7be04f" stroke-width="10" fill="none" opacity="0.6"/>` +
      `<ellipse cx="420" cy="350" rx="160" ry="34" fill="#6b4a2b" opacity="0.65"/>` +
      `<ellipse cx="400" cy="342" rx="110" ry="18" fill="#8a6440" opacity="0.6"/>` +
      `<ellipse cx="1500" cy="260" rx="120" ry="26" fill="#6b4a2b" opacity="0.55"/>` +
      `<ellipse cx="1060" cy="420" rx="200" ry="30" fill="#6b4a2b" opacity="0.5"/>` +
      tufts +
      cups,
    linear('g', '#4fbf4a', '#1f6b2a'),
  );
}

/** Vimpel-guirlande. */
export function buntingSvg(): string {
  const w = 1920;
  const flags = Array.from({ length: 26 }, (_, i) => {
    const x = 20 + i * 74;
    const sag = Math.sin((i / 25) * Math.PI) * 50;
    const col = ['#ff5f6d', '#ffcf3a', '#3ee6a8', '#47b8ff', '#ff5fa2', '#9b5cff'][i % 6];
    return `<path d="M${x} ${20 + sag} L${x + 56} ${22 + sag} L${x + 28} ${76 + sag} Z" fill="${col}" stroke="#1a1446" stroke-width="4" stroke-linejoin="round"/>`;
  }).join('');
  return svgDoc(w, 140, `<path d="M0 18 Q960 140 1920 18" stroke="#1a1446" stroke-width="5" fill="none"/>` + flags);
}

/** Publikum-silhuet i forgrunden. */
export function crowdSvg(): string {
  const w = 1920;
  const heads = Array.from({ length: 30 }, (_, i) => {
    const x = i * 68 + ((i * 37) % 30);
    const y = 60 + ((i * 53) % 34);
    return `<circle cx="${x}" cy="${y}" r="${30 + (i % 3) * 5}" fill="#120e30"/><rect x="${x - 36}" y="${y + 20}" width="72" height="120" rx="30" fill="#120e30"/>` +
      (i % 4 === 0 ? `<path d="M${x + 20} ${y - 10} L${x + 40} ${y - 70}" stroke="#120e30" stroke-width="10" stroke-linecap="round"/><circle cx="${x + 42}" cy="${y - 76}" r="10" fill="#120e30"/>` : '');
  }).join('');
  return svgDoc(w, 170, heads);
}

/** Spørgsmålstegn-boble (over figurer der har valgt). */
export function bubbleSvg(): string {
  return svgDoc(
    90,
    90,
    `<circle cx="45" cy="40" r="34" fill="#fff6e0" ${ink(5)}/>` +
      `<path d="M30 70 L24 86 L44 72 Z" fill="#fff6e0" ${ink(5)}/>` +
      `<path d="M30 74 L44 72" stroke="#fff6e0" stroke-width="6"/>` +
      `<path d="M30 40 L41 51 L62 28" fill="none" stroke="#3ccf5a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
}

/** Spotlys-cirkel på jorden. */
export function spotSvg(): string {
  return svgDoc(
    400,
    140,
    `<ellipse cx="200" cy="70" rx="196" ry="66" fill="url(#s)"/>`,
    `<radialGradient id="s"><stop offset="0" stop-color="#fff6c0" stop-opacity="0.55"/><stop offset="1" stop-color="#fff6c0" stop-opacity="0"/></radialGradient>`,
  );
}

/** Fangebur: "SKAMMEKROGEN" – lille hegn. */
export function penSvg(): string {
  const posts = Array.from({ length: 9 }, (_, i) => {
    const x = 20 + i * 52;
    return `<rect x="${x}" y="40" width="22" height="110" rx="8" fill="url(#w)" ${ink(4)}/><path d="M${x} 46 L${x + 11} 30 L${x + 22} 46" fill="url(#w)" ${ink(4)}/>`;
  }).join('');
  return svgDoc(
    480,
    170,
    `<ellipse cx="240" cy="154" rx="236" ry="14" fill="#000" opacity="0.25"/>` +
      `<rect x="8" y="70" width="464" height="18" rx="8" fill="url(#w)" ${ink(4)}/>` +
      `<rect x="8" y="118" width="464" height="18" rx="8" fill="url(#w)" ${ink(4)}/>` +
      posts,
    linear('w', '#e6b277', '#9a6434'),
  );
}

export function signSvg(): string {
  return svgDoc(
    300,
    90,
    `<rect x="6" y="6" width="288" height="72" rx="16" fill="url(#s)" ${ink(6)}/>` + shine(26, 14, 90, 9, 0.4),
    linear('s', '#ff7a7a', '#c0213a'),
  );
}

/** Mørk vignet med lys midte (fokus på døren under dramaet). */
export function focusSvg(): string {
  return svgDoc(
    320,
    180,
    `<rect width="320" height="180" fill="url(#f)"/>`,
    `<radialGradient id="f" cx="0.5" cy="0.5" r="0.62"><stop offset="0.3" stop-color="#05031a" stop-opacity="0"/><stop offset="1" stop-color="#05031a" stop-opacity="0.92"/></radialGradient>`,
  );
}
