import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til Spaghetti-Tovtrækning, tegnet som SVG. */

/** Geometri (1920×1080). */
export const GEO = {
  /** Bordpladernes overkant (spillernes fødder). */
  floor: 770,
  /** Bordkanterne mod gryden. */
  edgeL: 690,
  edgeR: 1230,
  /** Gryden. */
  potX: 960,
  potRim: 820,
  potW: 600,
  /** Forreste spillers start-x (venstre/højre hold). */
  frontL: 500,
  frontR: 1420,
  /** Bagerste spillers afstand bag den forreste. */
  gap: 175,
};

// ---------------------------------------------------------------------------
// Baggrund: trattoria om natten

export function backdropSvg(): string {
  const w = 1920;
  const h = 1080;
  const bricks: string[] = [];
  for (let row = 0; row < 14; row++) {
    const y = row * 44;
    const off = row % 2 ? 0 : 60;
    for (let x = -120 + off; x < w; x += 120) {
      bricks.push(`<rect x="${x + 4}" y="${y + 4}" width="112" height="36" rx="8" fill="#000" opacity="${0.06 + ((row * 7 + x) % 5) * 0.012}"/>`);
    }
  }
  const stars = Array.from({ length: 26 }, (_, i) => {
    const x = 790 + ((i * 97) % 340);
    const y = 150 + ((i * 53) % 230);
    return `<circle cx="${x}" cy="${y}" r="${1.5 + (i % 3)}" fill="#fff6e0" opacity="${0.5 + (i % 4) * 0.12}"/>`;
  }).join('');
  // Vinduets bue
  const arch = 'M770 560 L770 260 Q770 120 960 120 Q1150 120 1150 260 L1150 560 Z';
  const roofs =
    `<path d="M770 470 L800 470 L800 430 L840 410 L880 430 L880 455 L930 455 L930 400 L960 380 L990 400 L990 450 L1040 450 L1040 420 L1080 400 L1120 420 L1120 460 L1150 460 L1150 560 L770 560 Z" fill="#160f3a"/>` +
    `<rect x="812" y="440" width="10" height="14" fill="#ffcf3a" opacity="0.8"/><rect x="950" y="410" width="12" height="16" fill="#ffcf3a" opacity="0.8"/><rect x="1060" y="430" width="10" height="14" fill="#ffcf3a" opacity="0.7"/>` +
    `<path d="M1100 470 Q1088 400 1104 340 Q1118 400 1110 470 Z" fill="#0f2a22"/><path d="M820 480 Q806 410 826 350 Q842 410 832 480 Z" fill="#0f2a22"/>`;
  const shutters = (x: number, flip: boolean) => {
    const dx = flip ? -1 : 1;
    const slats = Array.from({ length: 9 }, (_, i) => `<path d="M${x + dx * 14} ${190 + i * 38} L${x + dx * 96} ${180 + i * 38}" stroke="#1d5a3a" stroke-width="7" stroke-linecap="round"/>`).join('');
    return `<path d="M${x} 160 L${x + dx * 110} 150 L${x + dx * 110} 560 L${x} 560 Z" fill="url(#shutter)" ${ink(8)}/>` + slats;
  };
  const flowers = Array.from({ length: 9 }, (_, i) => {
    const x = 790 + i * 42;
    const y = 552 - (i % 2) * 14;
    return `<circle cx="${x}" cy="${y}" r="16" fill="${i % 3 === 1 ? '#fff6e0' : '#ff4b4b'}" ${ink(4)}/><circle cx="${x}" cy="${y}" r="5" fill="#ffcf3a"/>`;
  }).join('');
  const leaves = Array.from({ length: 10 }, (_, i) => `<ellipse cx="${780 + i * 40}" cy="568" rx="20" ry="10" fill="#3ccf5a" ${ink(3)}/>`).join('');
  // Hylder med krukker
  const shelf = (x: number) =>
    `<rect x="${x}" y="402" width="420" height="22" rx="8" fill="url(#wood)" ${ink(6)}/>` +
    `<path d="M${x + 40} 424 L${x + 60} 470 L${x + 80} 424" fill="#6b3f17" ${ink(5)}/><path d="M${x + 340} 424 L${x + 360} 470 L${x + 380} 424" fill="#6b3f17" ${ink(5)}/>`;
  const jar = (x: number, hgt: number, fill: string, label: string) =>
    `<rect x="${x}" y="${402 - hgt}" width="70" height="${hgt}" rx="14" fill="#cfefff" opacity="0.55" ${ink(5)}/>` +
    `<rect x="${x + 6}" y="${402 - hgt * 0.75}" width="58" height="${hgt * 0.72}" rx="10" fill="${fill}"/>` +
    `<rect x="${x - 4}" y="${396 - hgt}" width="78" height="16" rx="6" fill="#c0392b" ${ink(4)}/>` +
    `<rect x="${x + 12}" y="${402 - hgt * 0.55}" width="46" height="26" rx="4" fill="#fff6e0" ${ink(3)}/>` +
    `<text x="${x + 35}" y="${402 - hgt * 0.55 + 19}" font-family="Arial Black, Arial" font-weight="900" font-size="14" text-anchor="middle" fill="#1a1446">${label}</text>` +
    shine(x + 8, 408 - hgt, 10, hgt * 0.6, 0.5);
  const can = (x: number) =>
    `<rect x="${x}" y="322" width="64" height="80" rx="10" fill="url(#can)" ${ink(5)}/>` +
    `<rect x="${x}" y="344" width="64" height="34" fill="#ff4b4b"/>` +
    `<circle cx="${x + 32}" cy="361" r="12" fill="#ff8a5c" ${ink(3)}/>` +
    `<rect x="${x}" y="322" width="64" height="80" rx="10" fill="none" ${ink(5)}/>`;
  const shelves =
    shelf(90) + jar(110, 120, '#ffe08a', 'PASTA') + jar(200, 90, '#ffb36b', 'RIS') + can(290) + jar(370, 110, '#8bd17c', 'BASILIKUM'.slice(0, 5)) +
    shelf(1410) + can(1430) + jar(1510, 100, '#ffe08a', 'PENNE') + jar(1600, 130, '#ffcf3a', 'FUSILLI'.slice(0, 5)) + can(1690);
  // Gulv: ternet
  const tiles: string[] = [];
  for (let i = 0; i < 26; i++) {
    for (let r = 0; r < 4; r++) {
      if ((i + r) % 2) continue;
      const y0 = 900 + r * 46;
      tiles.push(`<rect x="${i * 80 - 40 + r * 20}" y="${y0}" width="80" height="46" fill="#000" opacity="0.28"/>`);
    }
  }
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#wall)"/>` +
      bricks.join('') +
      // Lampelys på væggen
      `<ellipse cx="960" cy="360" rx="760" ry="420" fill="url(#glow)"/>` +
      // Vindue
      `<path d="${arch}" fill="url(#night)"/>` +
      stars +
      `<circle cx="1070" cy="220" r="46" fill="#fff6c8"/><circle cx="1088" cy="206" r="40" fill="#25195e" opacity="0.9"/>` +
      roofs +
      `<path d="${arch}" fill="none" stroke="#6b3f17" stroke-width="26"/>` +
      `<path d="${arch}" fill="none" ${ink(8)}/>` +
      `<path d="M960 124 L960 560 M770 340 L1150 340" stroke="#6b3f17" stroke-width="14"/>` +
      `<path d="M960 124 L960 560 M770 340 L1150 340" stroke="#1a1446" stroke-width="3" opacity="0.6"/>` +
      shutters(758, true) +
      shutters(1162, false) +
      `<rect x="752" y="560" width="416" height="40" rx="10" fill="url(#box)" ${ink(7)}/>` +
      leaves +
      flowers +
      shelves +
      // Panel / wainscot
      `<rect x="0" y="600" width="${w}" height="300" fill="url(#panel)"/>` +
      `<rect x="0" y="594" width="${w}" height="16" fill="#6b3f17"/><rect x="0" y="594" width="${w}" height="5" fill="#fff" opacity="0.2"/>` +
      Array.from({ length: 12 }, (_, i) => `<rect x="${i * 170 + 20}" y="636" width="130" height="220" rx="12" fill="none" stroke="#3a1a10" stroke-width="5" opacity="0.5"/>`).join('') +
      // Gulv
      `<rect x="0" y="900" width="${w}" height="180" fill="#3a2a40"/>` +
      tiles.join('') +
      `<rect x="0" y="896" width="${w}" height="10" fill="#1a1446" opacity="0.6"/>`,
    linear('wall', '#4a1420', '#86262c') +
      `<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffcf3a" stop-opacity="0.22"/><stop offset="1" stop-color="#ffcf3a" stop-opacity="0"/></radialGradient>` +
      linear('night', '#120c3a', '#3b2a8a') +
      linear('shutter', '#3ccf7a', '#1d7a4a') +
      linear('box', '#c98d4b', '#7a4a1b') +
      linear('wood', '#c98d4b', '#7a4a1b') +
      linear('can', '#e8edf5', '#8a93a8') +
      linear('panel', '#7a3a22', '#4a2014'),
  );
}

/** Bord med rød-hvid-ternet dug. Teksturen er til VENSTRE side (spejl til højre). Origin: øverste højre hjørne af bordpladen ≈ (0.93, 0.12). */
export function tableSvg(): string {
  const w = 760;
  const h = 360;
  const top = 40;
  const right = 700;
  // Bølget kant på dugen
  let scallop = `M0 ${top} L${right} ${top} L${right + 20} ${top + 160}`;
  for (let x = right + 20; x > 0; x -= 50) scallop += ` Q${x - 25} ${top + 200} ${x - 50} ${top + 162}`;
  scallop += ` L0 ${top} Z`;
  return svgDoc(
    w,
    h,
    // Bordben
    `<rect x="${right - 90}" y="${top + 150}" width="44" height="${h - top - 150}" rx="10" fill="url(#leg)" ${ink(7)}/>` +
      `<rect x="120" y="${top + 150}" width="44" height="${h - top - 150}" rx="10" fill="url(#leg)" ${ink(7)}/>` +
      `<ellipse cx="${right - 68}" cy="${h - 4}" rx="60" ry="10" fill="#000" opacity="0.3"/>` +
      `<path d="${scallop}" fill="url(#chk)"/>` +
      `<path d="${scallop}" fill="url(#shade)"/>` +
      `<path d="M0 ${top + 4} L${right + 4} ${top + 4} L${right + 22} ${top + 158}" fill="none" stroke="#fff" stroke-width="5" opacity="0.35"/>` +
      `<path d="${scallop}" fill="none" ${ink(8)}/>` +
      // Bordplade-kant (lys stribe øverst)
      `<rect x="0" y="${top - 14}" width="${right + 6}" height="22" rx="10" fill="url(#topEdge)" ${ink(7)}/>` +
      shine(30, top - 9, 300, 7, 0.55),
    linear('leg', '#c98d4b', '#6b3f17', true) +
      `<pattern id="chk" width="96" height="96" patternUnits="userSpaceOnUse" patternTransform="translate(0 ${top})"><rect width="96" height="96" fill="#fff6e0"/><rect width="48" height="48" fill="#ff4b4b"/><rect x="48" y="48" width="48" height="48" fill="#ff4b4b"/><rect x="0" y="20" width="96" height="8" fill="#fff" opacity="0.25"/><rect x="20" y="0" width="8" height="96" fill="#fff" opacity="0.2"/><rect x="68" y="0" width="8" height="96" fill="#fff" opacity="0.2"/><rect x="0" y="68" width="96" height="8" fill="#fff" opacity="0.25"/></pattern>` + `<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>` +
      linear('topEdge', '#fffaf0', '#e8d6b8'),
  );
}

/** Gryden: bagkant + sovs (tegnes bag de faldne spillere). */
export function potBackSvg(): string {
  const w = 640;
  const h = 120;
  return svgDoc(
    w,
    h,
    `<ellipse cx="320" cy="60" rx="300" ry="52" fill="url(#rimIn)" ${ink(8)}/>` +
      `<ellipse cx="320" cy="68" rx="276" ry="40" fill="url(#sauce)"/>` +
      `<ellipse cx="250" cy="58" rx="90" ry="12" fill="#ff9a7a" opacity="0.5"/>` +
      `<ellipse cx="420" cy="78" rx="60" ry="8" fill="#ff9a7a" opacity="0.35"/>` +
      // Basilikumblade og tomatstykker
      `<ellipse cx="200" cy="74" rx="16" ry="8" fill="#3ccf5a" ${ink(3)} transform="rotate(-20 200 74)"/>` +
      `<ellipse cx="440" cy="62" rx="14" ry="7" fill="#3ccf5a" ${ink(3)} transform="rotate(25 440 62)"/>` +
      `<circle cx="330" cy="82" r="9" fill="#c0392b" ${ink(3)}/>`,
    linear('rimIn', '#5d5f78', '#2a2b45') + radial('sauce', '#ff6a4a', '#b8231c'),
  );
}

/** Gryden: forside med håndtag og øjne (tegnes foran de faldne spillere). */
export function potFrontSvg(): string {
  const w = 760;
  const h = 330;
  const cx = 380;
  return svgDoc(
    w,
    h,
    // Håndtag
    `<path d="M70 70 Q10 70 14 120 Q18 160 74 150" fill="none" stroke="#1a1446" stroke-width="30" stroke-linecap="round"/>` +
      `<path d="M70 70 Q10 70 14 120 Q18 160 74 150" fill="none" stroke="#8a8ca8" stroke-width="16" stroke-linecap="round"/>` +
      `<path d="M690 70 Q750 70 746 120 Q742 160 686 150" fill="none" stroke="#1a1446" stroke-width="30" stroke-linecap="round"/>` +
      `<path d="M690 70 Q750 70 746 120 Q742 160 686 150" fill="none" stroke="#8a8ca8" stroke-width="16" stroke-linecap="round"/>` +
      // Krop: forkant af ellipsen + sider + bund
      `<path d="M${cx - 300} 30 Q${cx} 140 ${cx + 300} 30 L${cx + 290} 280 Q${cx} 340 ${cx - 290} 280 Z" fill="url(#body)" ${ink(9)}/>` +
      `<path d="M${cx - 300} 30 Q${cx} 140 ${cx + 300} 30" fill="none" stroke="#c8cbe0" stroke-width="18"/>` +
      `<path d="M${cx - 300} 30 Q${cx} 140 ${cx + 300} 30" fill="none" ${ink(8)}/>` +
      // Glans
      `<path d="M${cx - 250} 110 Q${cx - 258} 190 ${cx - 236} 250" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" opacity="0.35"/>` +
      `<path d="M${cx - 200} 120 Q${cx - 205} 160 ${cx - 196} 190" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity="0.3"/>` +
      // Sovs-drypper ned ad siden
      `<path d="M${cx + 120} 80 Q${cx + 130} 130 ${cx + 122} 150 Q${cx + 110} 160 ${cx + 106} 140 Q${cx + 104} 110 ${cx + 96} 84 Z" fill="#d8322a" ${ink(4)}/>` +
      `<path d="M${cx - 60} 92 Q${cx - 54} 120 ${cx - 60} 130 Q${cx - 70} 134 ${cx - 72} 120 Q${cx - 72} 104 ${cx - 78} 92 Z" fill="#d8322a" ${ink(4)}/>` +
      // Øjne + mund (gryden glæder sig)
      `<g transform="translate(0 30)">${eyes(cx, 150, 110, 30, [0, 4])}</g>` +
      `<path d="M${cx - 70} 236 Q${cx} 290 ${cx + 70} 236 Q${cx} 256 ${cx - 70} 236 Z" fill="#7a1a2a" ${ink(6)}/>` +
      `<path d="M${cx - 20} 258 Q${cx} 276 ${cx + 22} 258 Q${cx} 266 ${cx - 20} 258 Z" fill="#ff5fa2"/>` +
      `<ellipse cx="${cx - 150}" cy="220" rx="26" ry="14" fill="#ff5fa2" opacity="0.45"/><ellipse cx="${cx + 150}" cy="220" rx="26" ry="14" fill="#ff5fa2" opacity="0.45"/>`,
    linear('body', '#a7aac4', '#4a4c68', true),
  );
}

/** Pupiller til grydens øjne (flyttes efter rebet). */
export function pupilSvg(): string {
  return svgDoc(40, 40, `<circle cx="20" cy="20" r="15" fill="#1a1446"/><circle cx="25" cy="13" r="5" fill="#fff"/>`);
}

/** Komfur under gryden. */
export function stoveSvg(): string {
  const w = 900;
  const h = 140;
  return svgDoc(
    w,
    h,
    `<rect x="20" y="20" width="860" height="140" rx="22" fill="url(#iron)" ${ink(9)}/>` +
      `<rect x="40" y="34" width="820" height="16" rx="8" fill="#fff" opacity="0.12"/>` +
      `<rect x="120" y="66" width="140" height="60" rx="14" fill="#1a1446"/><rect x="640" y="66" width="140" height="60" rx="14" fill="#1a1446"/>` +
      `<rect x="130" y="76" width="120" height="50" rx="10" fill="url(#ember)"/><rect x="650" y="76" width="120" height="50" rx="10" fill="url(#ember)"/>` +
      `<circle cx="450" cy="96" r="20" fill="#d9dbe8" ${ink(5)}/><circle cx="380" cy="96" r="14" fill="#d9dbe8" ${ink(5)}/><circle cx="520" cy="96" r="14" fill="#d9dbe8" ${ink(5)}/>`,
    linear('iron', '#4a4258', '#1f1a2e') + linear('ember', '#ffcf3a', '#ff4b2b'),
  );
}

export function flameSvg(): string {
  return svgDoc(
    120,
    180,
    `<path d="M60 176 Q8 170 14 112 Q20 70 52 30 Q50 74 70 84 Q74 50 92 22 Q118 82 108 120 Q104 170 60 176 Z" fill="url(#f)" ${ink(6)}/>` +
      `<path d="M60 168 Q34 160 38 128 Q44 104 58 90 Q60 118 74 120 Q86 140 78 158 Q72 168 60 168 Z" fill="#fff3a0"/>`,
    linear('f', '#ffcf3a', '#ff4b2b'),
  );
}

/** Spaghetti-strimmel til Rope (vandret, tekstur gentages langs rebet). */
export function noodleSvg(): string {
  const w = 128;
  const h = 48;
  return svgDoc(
    w,
    h,
    `<rect x="0" y="4" width="${w}" height="40" fill="#1a1446"/>` +
      `<rect x="0" y="10" width="${w}" height="28" fill="url(#n)"/>` +
      `<rect x="0" y="14" width="${w}" height="6" fill="#fffbe0" opacity="0.8"/>` +
      `<ellipse cx="40" cy="28" rx="10" ry="2.5" fill="#d99a2b" opacity="0.5"/><ellipse cx="100" cy="31" rx="8" ry="2" fill="#d99a2b" opacity="0.4"/>` +
      `<circle cx="74" cy="30" r="3" fill="#d8322a" opacity="0.75"/>`,
    linear('n', '#ffe58a', '#e8a93a'),
  );
}

/** Kødbollen der sidder midt på spaghettien (markøren). */
export function meatballSvg(): string {
  const bumps = [
    [56, 52, 12], [98, 46, 10], [118, 86, 12], [86, 112, 13], [44, 98, 11], [124, 116, 8],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#6b3216" opacity="0.5"/>`)
    .join('');
  return svgDoc(
    160,
    160,
    `<ellipse cx="80" cy="150" rx="56" ry="8" fill="#000" opacity="0.25"/>` +
      `<circle cx="80" cy="80" r="68" fill="url(#m)" ${ink(8)}/>` +
      bumps +
      `<path d="M30 40 Q60 22 100 30" fill="none" stroke="#d8322a" stroke-width="12" stroke-linecap="round" opacity="0.9"/>` +
      `<ellipse cx="54" cy="44" rx="20" ry="10" fill="#fff" opacity="0.3"/>` +
      eyes(80, 74, 44, 15, [0, 2]) +
      `<path d="M62 106 Q80 120 98 106" fill="none" ${ink(6)}/>`,
    radial('m', '#c8743c', '#7a3a18'),
  );
}

/** Tomat-metronomen (rytme-ikonet). */
export function tomatoSvg(): string {
  return svgDoc(
    240,
    240,
    `<ellipse cx="120" cy="226" rx="80" ry="10" fill="#000" opacity="0.25"/>` +
      `<path d="M120 46 Q200 40 218 120 Q226 210 120 214 Q14 210 22 120 Q40 40 120 46 Z" fill="url(#t)" ${ink(9)}/>` +
      `<path d="M66 70 Q90 56 112 60" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity="0.5"/>` +
      `<path d="M120 52 L98 26 L116 40 L120 12 L126 40 L146 24 L132 54 L160 50 L134 64 L108 64 L80 54 Z" fill="url(#leaf)" ${ink(6)}/>` +
      eyes(120, 116, 64, 20, [0, 3]) +
      `<path d="M92 162 Q120 190 148 162 Q120 172 92 162 Z" fill="#7a1a2a" ${ink(6)}/>` +
      `<ellipse cx="66" cy="150" rx="16" ry="9" fill="#ff9aa2" opacity="0.6"/><ellipse cx="174" cy="150" rx="16" ry="9" fill="#ff9aa2" opacity="0.6"/>`,
    radial('t', '#ff7a5c', '#d8221c') + linear('leaf', '#7be04f', '#2f9e3a'),
  );
}

/** Node-symbol (♪) der flyver ud ved tryk i takt. */
export function noteSvg(): string {
  return svgDoc(
    64,
    80,
    `<path d="M24 62 L24 12 L54 4 L54 52" fill="none" stroke="#1a1446" stroke-width="14" stroke-linejoin="round"/>` +
      `<path d="M24 62 L24 12 L54 4 L54 52" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>` +
      `<ellipse cx="16" cy="64" rx="13" ry="10" fill="#fff" ${ink(5)}/><ellipse cx="46" cy="54" rx="13" ry="10" fill="#fff" ${ink(5)}/>`,
  );
}

export function bubbleSvg(): string {
  return svgDoc(
    80,
    80,
    `<circle cx="40" cy="40" r="32" fill="url(#b)" ${ink(5)}/><ellipse cx="30" cy="28" rx="10" ry="6" fill="#fff" opacity="0.6"/>`,
    radial('b', '#ff8a6a', '#d8322a'),
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

/** Kobberpande der hænger fra loftet. */
export function panSvg(): string {
  return svgDoc(
    150,
    300,
    `<path d="M75 0 L75 70" stroke="#1a1446" stroke-width="5"/>` +
      `<circle cx="75" cy="78" r="10" fill="none" ${ink(6)}/>` +
      `<rect x="62" y="86" width="26" height="90" rx="10" fill="url(#h)" ${ink(6)}/>` +
      `<circle cx="75" cy="232" r="64" fill="url(#c)" ${ink(8)}/>` +
      `<circle cx="75" cy="232" r="48" fill="none" stroke="#7a3a18" stroke-width="5" opacity="0.5"/>` +
      `<ellipse cx="54" cy="208" rx="18" ry="10" fill="#fff" opacity="0.45"/>`,
    linear('h', '#6b3f17', '#3a2010', true) + radial('c', '#ffb36b', '#b8561c'),
  );
}

/** Hvidløgsfletning. */
export function garlicSvg(): string {
  const bulbs = Array.from({ length: 5 }, (_, i) => {
    const y = 70 + i * 44;
    const x = 50 + (i % 2 ? 14 : -14);
    return `<path d="M${x} ${y - 26} Q${x + 30} ${y - 6} ${x + 22} ${y + 16} Q${x} ${y + 30} ${x - 22} ${y + 16} Q${x - 30} ${y - 6} ${x} ${y - 26} Z" fill="url(#g)" ${ink(5)}/>` +
      `<path d="M${x} ${y - 20} L${x} ${y + 20}" stroke="#d6c7a8" stroke-width="3"/>`;
  }).join('');
  return svgDoc(100, 300, `<path d="M50 0 L50 290" stroke="#c98d4b" stroke-width="10" ${''}/>` + bulbs, linear('g', '#ffffff', '#e8dcc0'));
}

/** Lyspære (lyskæde). */
export function bulbSvg(): string {
  return svgDoc(
    60,
    80,
    `<circle cx="30" cy="46" r="28" fill="#ffcf3a" opacity="0.25"/>` +
      `<rect x="22" y="6" width="16" height="16" rx="4" fill="#3a3b55" ${ink(4)}/>` +
      `<path d="M30 20 Q50 34 44 54 Q38 66 30 66 Q22 66 16 54 Q10 34 30 20 Z" fill="url(#b)" ${ink(4)}/>` +
      `<ellipse cx="24" cy="40" rx="5" ry="8" fill="#fff" opacity="0.7"/>`,
    linear('b', '#fff6c8', '#ffb43a'),
  );
}

/** Holdets vimpel. */
export function pennantSvg(color: string): string {
  return svgDoc(
    200,
    150,
    `<path d="M10 10 L190 10 L190 26 L100 140 L10 26 Z" fill="url(#p)" ${ink(7)}/>` +
      `<path d="M22 22 L178 22" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.4"/>` +
      `<circle cx="100" cy="62" r="24" fill="#fff6e0" ${ink(5)}/>` +
      `<path d="M86 62 Q100 44 114 62 Q100 80 86 62 Z" fill="${color}" ${ink(3)}/>`,
    linear('p', shade(color, 0.15), shade(color, -0.3)),
  );
}

/** Svedperle. */
export function sweatSvg(): string {
  return svgDoc(36, 48, `<path d="M18 4 Q32 26 30 32 A12 12 0 0 1 6 32 Q4 26 18 4Z" fill="#9fe0ff" ${ink(4)}/><ellipse cx="13" cy="30" rx="3" ry="5" fill="#fff" opacity="0.8"/>`);
}

/** Sovs-plet (sprøjt på skærmen/figurer). */
export function splatSvg(): string {
  const blobs = [
    [60, 60, 40], [100, 44, 18], [26, 86, 14], [96, 96, 16], [24, 34, 10], [70, 110, 10],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
    .join('');
  return svgDoc(130, 130, `<g fill="#d8322a" stroke="#1a1446" stroke-width="5">${blobs}</g><g fill="#d8322a">${blobs}</g><ellipse cx="48" cy="48" rx="12" ry="7" fill="#fff" opacity="0.4"/>`);
}
