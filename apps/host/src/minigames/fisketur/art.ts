import { shade } from '@samigame/shared';
import { ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til "Kattens Fisketur" – tegnet som SVG. */

export const SURFACE_Y = 330;
export const WATER = { x0: 80, x1: 1840, y0: 400, y1: 985 };

/** Himmel + fjerne bakker med grantræer. */
export function skySvg(): string {
  const w = 1920;
  const h = 360;
  const trees = Array.from({ length: 28 }, (_, i) => {
    const x = 560 + i * 50 + ((i * 37) % 20);
    const y = 300 - ((i * 53) % 40);
    const s = 0.8 + ((i * 17) % 10) / 20;
    return `<path d="M${x} ${y - 70 * s} L${x + 22 * s} ${y} L${x - 22 * s} ${y} Z" fill="#2f7a4a"/><path d="M${x} ${y - 70 * s} L${x + 22 * s} ${y} L${x} ${y} Z" fill="#256a3e"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#sky)"/>` +
      `<path d="M0 260 Q260 150 560 220 Q900 290 1220 170 Q1560 60 1920 200 V360 H0 Z" fill="#9fd0e8"/>` +
      `<path d="M0 300 Q400 230 820 270 Q1300 310 1920 250 V360 H0 Z" fill="#6fbf7a"/>` +
      trees,
    linear('sky', '#4fb8ff', '#d4f1ff'),
  );
}

/** Undervandsverden (gradient, sandbund, sten). */
export function underwaterSvg(): string {
  const w = 1920;
  const h = 760;
  const rocks = [
    [140, 700, 90, 50, '#6a7aa8'], [420, 720, 60, 34, '#5a6a98'], [1180, 712, 110, 56, '#6a7aa8'], [1560, 724, 70, 40, '#5a6a98'], [1800, 700, 90, 60, '#6a7aa8'],
  ]
    .map(([x, y, rx, ry, c]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" ${ink(5)}/><ellipse cx="${Number(x) - Number(rx) * 0.3}" cy="${Number(y) - Number(ry) * 0.4}" rx="${Number(rx) * 0.4}" ry="${Number(ry) * 0.25}" fill="#fff" opacity="0.2"/>`)
    .join('');
  const shells = [
    [700, 735], [980, 748], [1400, 740],
  ]
    .map(([x, y]) => `<path d="M${x - 18} ${y} Q${x} ${y - 30} ${x + 18} ${y} Z" fill="#ffb3c8" ${ink(3)}/><path d="M${x} ${y} L${x} ${y - 20} M${x - 9} ${y} L${x - 5} ${y - 16} M${x + 9} ${y} L${x + 5} ${y - 16}" stroke="#e07a9a" stroke-width="2"/>`)
    .join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#water)"/>` +
      `<path d="M0 690 Q300 650 640 690 Q1000 730 1340 680 Q1640 640 1920 680 V760 H0 Z" fill="url(#sand)" ${ink(5)}/>` +
      rocks +
      shells,
    linear('water', '#2fb6e8', '#123a8a') + linear('sand', '#f2d79a', '#c9a060'),
  );
}

/** Bølge-stribe til vandoverfladen (tiles vandret). */
export function waveSvg(): string {
  return svgDoc(
    256,
    60,
    `<path d="M0 22 Q32 6 64 22 T128 22 T192 22 T256 22 V60 H0 Z" fill="#5fd0ff" opacity="0.85"/>` +
      `<path d="M0 22 Q32 6 64 22 T128 22 T192 22 T256 22" fill="none" stroke="#fff" stroke-width="6" opacity="0.9"/>` +
      `<path d="M0 22 Q32 6 64 22 T128 22 T192 22 T256 22" fill="none" stroke="#1a1446" stroke-width="3" opacity="0.5" transform="translate(0 5)"/>`,
  );
}

export function raySvg(): string {
  return svgDoc(
    220,
    700,
    `<path d="M80 0 L140 0 L220 700 L0 700 Z" fill="url(#r)"/>`,
    `<linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
  );
}

export function seaweedSvg(color = '#3ccf5a'): string {
  return svgDoc(
    90,
    300,
    `<path d="M44 296 Q20 240 46 190 Q70 140 40 90 Q20 50 46 6 Q60 50 62 92 Q82 144 58 194 Q40 240 60 296 Z" fill="url(#s)" ${ink(5)}/>` +
      `<path d="M48 280 Q36 230 52 196" stroke="#fff" stroke-width="4" fill="none" opacity="0.3"/>`,
    linear('s', shade(color, 0.2), shade(color, -0.35)),
  );
}

/** Bådebro (dæk + pæle). */
export function pierSvg(): string {
  const planks = Array.from({ length: 12 }, (_, i) => `<rect x="${i * 50}" y="0" width="48" height="36" rx="6" fill="url(#w)" ${ink(4)}/>`).join('');
  const posts = [40, 260, 500]
    .map((x) => `<rect x="${x}" y="30" width="36" height="300" rx="10" fill="url(#p)" ${ink(5)}/><path d="M${x + 4} 160 H${x + 32}" stroke="#4a8a3a" stroke-width="10" opacity="0.6"/>`)
    .join('');
  return svgDoc(600, 340, posts + `<rect x="0" y="28" width="600" height="18" fill="#7a4a1b" ${ink(4)}/>` + planks, linear('w', '#e6b277', '#a8703a') + linear('p', '#a8703a', '#5a3a1b', true));
}

/** Katten (sidder og kigger mod højre). Øjne uden pupiller – pupillerne tegnes i scenen. */
export const CAT = { w: 380, h: 360, eyeL: [222, 120], eyeR: [282, 118], paw: [270, 230], mouth: [262, 168] };
export function catSvg(): string {
  return svgDoc(
    CAT.w,
    CAT.h,
    // skygge
    `<ellipse cx="170" cy="350" rx="150" ry="10" fill="#000" opacity="0.25"/>` +
      // krop
      `<path d="M80 350 Q40 250 100 190 Q150 150 210 180 Q270 210 270 290 Q270 350 230 350 Z" fill="url(#fur)" ${ink(8)}/>` +
      // striber på kroppen
      `<path d="M96 230 Q120 240 120 270 M92 280 Q116 290 112 320 M140 196 Q150 220 140 240" stroke="#c4561a" stroke-width="9" fill="none" stroke-linecap="round"/>` +
      // mave
      `<path d="M190 210 Q240 230 240 300 Q236 340 200 344 Q170 300 190 210 Z" fill="#fff3e0"/>` +
      // bagben
      `<ellipse cx="140" cy="334" rx="64" ry="24" fill="url(#fur)" ${ink(7)}/>` +
      `<ellipse cx="212" cy="340" rx="30" ry="14" fill="#fff3e0" ${ink(6)}/>` +
      // hoved
      `<path d="M182 60 L196 4 L234 46 Z" fill="url(#fur)" ${ink(7)}/>` +
      `<path d="M262 46 L300 6 L310 64 Z" fill="url(#fur)" ${ink(7)}/>` +
      `<path d="M196 24 L208 48 L222 44 Z M296 26 L284 50 L298 56 Z" fill="#ff9aa8"/>` +
      `<ellipse cx="252" cy="122" rx="90" ry="78" fill="url(#fur)" ${ink(8)}/>` +
      `<path d="M226 50 Q232 70 226 84 M252 46 V80 M278 50 Q272 70 278 84" stroke="#c4561a" stroke-width="8" fill="none" stroke-linecap="round"/>` +
      // snude
      `<ellipse cx="262" cy="160" rx="44" ry="30" fill="#fff3e0" ${ink(5)}/>` +
      `<path d="M252 146 L272 146 L262 158 Z" fill="#ff7a8a" ${ink(4)}/>` +
      `<path d="M262 158 Q262 172 250 174 M262 158 Q262 172 274 174" stroke="#1a1446" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      // knurhår
      `<path d="M220 160 L170 150 M220 168 L168 172 M304 160 L350 148 M304 168 L352 172" stroke="#1a1446" stroke-width="3" stroke-linecap="round"/>` +
      // øjne (hvide)
      `<ellipse cx="${CAT.eyeL[0]}" cy="${CAT.eyeL[1]}" rx="22" ry="26" fill="#fffde0" ${ink(5)}/>` +
      `<ellipse cx="${CAT.eyeR[0]}" cy="${CAT.eyeR[1]}" rx="22" ry="26" fill="#fffde0" ${ink(5)}/>` +
      // stråhat
      `<ellipse cx="250" cy="60" rx="110" ry="22" fill="url(#straw)" ${ink(6)}/>` +
      `<path d="M190 58 Q196 4 252 4 Q308 4 312 58 Z" fill="url(#straw)" ${ink(6)}/>` +
      `<path d="M192 50 Q252 64 310 50" stroke="#e83a5a" stroke-width="12" fill="none"/>` +
      `<path d="M210 40 Q240 30 270 34" stroke="#fff" stroke-width="5" fill="none" opacity="0.5" stroke-linecap="round"/>` +
      // pote der holder stangen
      `<ellipse cx="${CAT.paw[0]}" cy="${CAT.paw[1]}" rx="30" ry="24" fill="url(#fur)" ${ink(6)}/>` +
      `<path d="M${CAT.paw[0] + 10} ${CAT.paw[1] - 12} v12 M${CAT.paw[0] + 20} ${CAT.paw[1] - 8} v12" stroke="#c4561a" stroke-width="4" stroke-linecap="round"/>` +
      shine(200, 80, 40, 10, 0.35),
    radial('fur', '#ffb35a', '#e8742a') + linear('straw', '#ffe39a', '#e0b050'),
  );
}

export function tailSvg(): string {
  return svgDoc(
    160,
    120,
    `<path d="M150 100 Q120 110 80 90 Q30 60 20 20 Q14 4 30 8 Q46 50 90 70 Q130 86 150 80 Z" fill="url(#fur)" ${ink(6)}/>` +
      `<path d="M40 30 l14 -6 M60 56 l12 -8 M90 74 l8 -10" stroke="#c4561a" stroke-width="7" stroke-linecap="round"/>`,
    radial('fur', '#ffb35a', '#e8742a'),
  );
}

/** Fiskestang. Origin ved håndtaget (venstre). */
export const ROD = { len: 470 };
export function rodSvg(): string {
  return svgDoc(
    480,
    50,
    `<path d="M10 25 L470 22" stroke="#1a1446" stroke-width="16" stroke-linecap="round"/>` +
      `<path d="M10 25 L470 22" stroke="url(#r)" stroke-width="9" stroke-linecap="round"/>` +
      `<rect x="4" y="14" width="80" height="22" rx="11" fill="#e83a5a" ${ink(4)}/>` +
      `<circle cx="70" cy="38" r="12" fill="#c9d3ea" ${ink(4)}/>` +
      `<circle cx="200" cy="24" r="5" fill="none" stroke="#c9d3ea" stroke-width="3"/><circle cx="330" cy="23" r="4" fill="none" stroke="#c9d3ea" stroke-width="3"/>`,
    linear('r', '#d9a160', '#8a5a2b', true),
  );
}

/** Krog med orm som madding. */
export function hookSvg(): string {
  return svgDoc(
    90,
    120,
    `<circle cx="45" cy="10" r="7" fill="none" stroke="#1a1446" stroke-width="8"/>` +
      `<circle cx="45" cy="10" r="7" fill="none" stroke="#dfe6f5" stroke-width="4"/>` +
      `<path d="M45 16 V70 Q45 100 66 98 Q84 94 80 72 L72 80" fill="none" stroke="#1a1446" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M45 16 V70 Q45 100 66 98 Q84 94 80 72 L72 80" fill="none" stroke="url(#m)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` +
      // orm
      `<path d="M50 40 Q24 44 30 58 Q36 72 20 80 Q8 88 16 100" fill="none" stroke="#1a1446" stroke-width="14" stroke-linecap="round"/>` +
      `<path d="M50 40 Q24 44 30 58 Q36 72 20 80 Q8 88 16 100" fill="none" stroke="#ff8ab0" stroke-width="9" stroke-linecap="round"/>` +
      `<circle cx="14" cy="98" r="2.4" fill="#1a1446"/>`,
    linear('m', '#ffffff', '#8a93a8', true),
  );
}

/** Svømmende orm (mad). */
export function wormSvg(): string {
  return svgDoc(
    90,
    50,
    `<path d="M10 30 Q25 10 40 28 Q55 46 70 26 Q76 18 82 22" fill="none" stroke="#1a1446" stroke-width="16" stroke-linecap="round"/>` +
      `<path d="M10 30 Q25 10 40 28 Q55 46 70 26 Q76 18 82 22" fill="none" stroke="url(#w)" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M28 20 l2 6 M48 34 l-2 6 M62 30 l2 -6" stroke="#e05a8a" stroke-width="3"/>` +
      `<circle cx="80" cy="19" r="3" fill="#fff"/><circle cx="81" cy="19" r="1.6" fill="#1a1446"/>`,
    linear('w', '#ffb0cc', '#ff6a9a', true),
  );
}

/** Fisk i spillerens farve med dykkermaske. Kigger mod højre. */
export function fishSvg(color: string): string {
  return svgDoc(
    170,
    130,
    // hale
    `<path d="M36 64 L4 28 Q0 64 4 100 Z" fill="${shade(color, -0.15)}" ${ink(6)}/>` +
      // finner
      `<path d="M80 26 Q96 2 120 16 L112 34 Z" fill="${shade(color, -0.15)}" ${ink(5)}/>` +
      `<path d="M74 100 Q84 122 104 116 L100 98 Z" fill="${shade(color, -0.15)}" ${ink(5)}/>` +
      // krop
      `<ellipse cx="92" cy="64" rx="64" ry="44" fill="url(#b)" ${ink(7)}/>` +
      `<path d="M56 74 Q92 104 136 80" fill="${shade(color, 0.55)}" opacity="0.7"/>` +
      `<path d="M66 40 q6 10 0 20 M78 36 q6 12 0 24" stroke="${shade(color, -0.3)}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      shine(70, 28, 40, 9, 0.45) +
      // dykkermaske
      `<rect x="104" y="34" width="54" height="40" rx="16" fill="#bdf2ff" fill-opacity="0.75" ${ink(6)}/>` +
      `<path d="M104 52 L86 46" stroke="#1a1446" stroke-width="7" stroke-linecap="round"/>` +
      `<circle cx="132" cy="54" r="10" fill="#fff" ${ink(3)}/><circle cx="135" cy="55" r="5" fill="#1a1446"/><circle cx="137" cy="52" r="1.8" fill="#fff"/>` +
      `<path d="M112 40 L120 38" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>` +
      // snorkel
      `<path d="M106 40 Q96 30 98 6" fill="none" stroke="#1a1446" stroke-width="11" stroke-linecap="round"/>` +
      `<path d="M106 40 Q96 30 98 6" fill="none" stroke="#ffcf3a" stroke-width="6" stroke-linecap="round"/>` +
      // mund
      `<path d="M150 84 Q140 92 130 86" stroke="#1a1446" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    linear('b', shade(color, 0.25), shade(color, -0.2)),
  );
}

/** Spand til fangne fisk. */
export function bucketSvg(): string {
  return svgDoc(
    150,
    150,
    `<ellipse cx="75" cy="140" rx="60" ry="8" fill="#000" opacity="0.25"/>` +
      `<path d="M20 50 Q75 -10 130 50" fill="none" stroke="#1a1446" stroke-width="9"/>` +
      `<path d="M20 50 Q75 -10 130 50" fill="none" stroke="#c9d3ea" stroke-width="5"/>` +
      `<path d="M16 50 L30 138 H120 L134 50 Z" fill="url(#b)" ${ink(6)}/>` +
      `<ellipse cx="75" cy="50" rx="59" ry="14" fill="#2a5a9a" ${ink(5)}/>` +
      `<path d="M28 80 H122" stroke="#fff" stroke-width="5" opacity="0.4"/>` +
      `<rect x="34" y="64" width="12" height="60" rx="6" fill="#fff" opacity="0.35"/>`,
    linear('b', '#7ac0ff', '#3a6ac0', true),
  );
}

/** Boble (partikel). */
export function bubbleSvg(): string {
  return svgDoc(40, 40, `<circle cx="20" cy="20" r="16" fill="#bdf2ff" fill-opacity="0.25" stroke="#ffffff" stroke-width="3"/><circle cx="14" cy="13" r="4" fill="#fff"/>`);
}

/** Baggrundsfisk (silhuet). */
export function shadowFishSvg(): string {
  return svgDoc(120, 60, `<path d="M20 30 L2 10 Q0 30 2 50 Z" fill="#0d2a6a"/><ellipse cx="66" cy="30" rx="48" ry="22" fill="#0d2a6a"/><circle cx="96" cy="26" r="4" fill="#2fb6e8"/>`);
}

export function lilySvg(): string {
  return svgDoc(
    160,
    60,
    `<path d="M80 30 L146 20 A70 22 0 1 0 146 40 Z" fill="url(#l)" ${ink(4)}/>` +
      `<path d="M30 26 Q60 16 96 22" stroke="#fff" stroke-width="4" fill="none" opacity="0.4" stroke-linecap="round"/>` +
      `<circle cx="70" cy="22" r="13" fill="#ff9ac8" ${ink(3)}/><circle cx="70" cy="22" r="5" fill="#ffcf3a"/>`,
    linear('l', '#7be04f', '#2f9e3a'),
  );
}

/** Skilt på broen med enerens navn. */
export function signSvg(): string {
  return svgDoc(
    360,
    200,
    `<rect x="160" y="120" width="28" height="80" rx="6" fill="#8a5a2b" ${ink(5)}/>` +
      `<rect x="10" y="10" width="340" height="128" rx="20" fill="url(#w)" ${ink(7)}/>` +
      `<rect x="24" y="22" width="312" height="104" rx="14" fill="none" stroke="#7a4a1b" stroke-width="4" opacity="0.5"/>` +
      `<circle cx="34" cy="30" r="5" fill="#5a3a1b"/><circle cx="326" cy="30" r="5" fill="#5a3a1b"/>`,
    linear('w', '#f2c48a', '#c08a52'),
  );
}
