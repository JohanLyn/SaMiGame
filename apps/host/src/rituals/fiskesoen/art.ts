import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';
import { C } from '../../kit/theme';

/** Al grafik til Fiskesøen (tværsnit: himmel, bådebro, sø med fisk, bund). */

export const LAKE = {
  /** Bådebroens overflade (figurernes fødder). */
  dock: 500,
  /** Vandoverfladen. */
  water: 640,
  /** Søbunden. */
  bed: 990,
};

export function hillsSvg(): string {
  const w = 1920;
  const h = 360;
  const trees = Array.from({ length: 18 }, (_, i) => {
    const x = 40 + i * 110 + ((i * 53) % 40);
    const y = 250 + ((i * 37) % 30);
    const s = 0.8 + ((i * 29) % 10) / 20;
    return (
      `<rect x="${x - 5}" y="${y}" width="10" height="${34 * s}" rx="4" fill="#6b4422" ${ink(4)}/>` +
      `<ellipse cx="${x}" cy="${y - 8 * s}" rx="${26 * s}" ry="${34 * s}" fill="${i % 3 ? '#3fae4f' : '#2f9a44'}" ${ink(5)}/>` +
      `<ellipse cx="${x - 8 * s}" cy="${y - 22 * s}" rx="${8 * s}" ry="${12 * s}" fill="#fff" opacity="0.25"/>`
    );
  }).join('');
  return svgDoc(
    w,
    h,
    // Fjerne bjerge
    `<path d="M0 220 L140 110 L230 170 L380 40 L520 160 L640 90 L800 190 L960 70 L1120 180 L1260 60 L1420 170 L1560 100 L1720 190 L1840 120 L1920 160 L1920 360 L0 360 Z" fill="url(#mt)" ${ink(6)}/>` +
      `<path d="M380 40 L340 76 L364 72 L384 92 L404 70 L428 82 Z M960 70 L918 106 L944 102 L962 120 L984 100 L1004 110 Z M1260 60 L1222 94 L1246 92 L1264 108 L1282 92 L1300 100 Z" fill="#fff" opacity="0.9"/>` +
      // Bakker
      `<path d="M0 270 Q180 180 380 250 Q560 300 760 230 Q980 160 1180 250 Q1380 320 1580 230 Q1760 170 1920 240 L1920 360 L0 360 Z" fill="url(#hl)" ${ink(6)}/>` +
      `<path d="M120 236 Q240 196 340 228" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.3"/>` +
      `<path d="M820 214 Q960 176 1080 222" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.3"/>` +
      trees +
      // Strandbred
      `<path d="M0 330 Q480 300 960 322 Q1440 340 1920 318 L1920 360 L0 360 Z" fill="#e9cf8a" ${ink(5)}/>`,
    linear('mt', '#9aa8f0', '#5d6bc4') + linear('hl', '#7fdc6a', '#3a9e45'),
  );
}

export function dockSvg(): string {
  const w = 1960;
  const h = 130;
  const seams = Array.from({ length: 28 }, (_, i) => `<path d="M${i * 72 + 30} 6 L${i * 72 + 26} 34" stroke="#7a4a20" stroke-width="4" opacity="0.6"/>`).join('');
  const nails = Array.from({ length: 28 }, (_, i) => `<circle cx="${i * 72 + 18}" cy="62" r="4" fill="#4a2c12"/><circle cx="${i * 72 + 18}" cy="96" r="4" fill="#4a2c12"/>`).join('');
  return svgDoc(
    w,
    h,
    `<rect x="0" y="40" width="${w}" height="80" fill="url(#df)" ${ink(7)}/>` +
      `<path d="M0 80 L${w} 80" stroke="#5a3414" stroke-width="5"/>` +
      nails +
      `<rect x="0" y="4" width="${w}" height="40" rx="8" fill="url(#dt)" ${ink(7)}/>` +
      seams +
      `<rect x="10" y="10" width="${w - 20}" height="8" rx="4" fill="#fff" opacity="0.3"/>` +
      `<rect x="0" y="120" width="${w}" height="10" fill="#000" opacity="0.25"/>`,
    linear('dt', '#e3a868', '#b77634') + linear('df', '#9a5e2a', '#6a3a16'),
  );
}

export function postSvg(): string {
  return svgDoc(
    70,
    560,
    `<rect x="10" y="0" width="50" height="550" rx="14" fill="url(#ps)" ${ink(6)}/>` +
      `<path d="M22 20 L22 520 M44 40 L44 500" stroke="#5a3414" stroke-width="3" opacity="0.4"/>` +
      `<rect x="8" y="96" width="54" height="24" rx="8" fill="#3d8a4a" opacity="0.85"/>` +
      `<path d="M14 120 Q20 150 14 170 M30 120 Q38 160 30 190 M50 120 Q44 146 52 168" fill="none" stroke="#2f7a3a" stroke-width="6" stroke-linecap="round"/>` +
      `<circle cx="20" cy="300" r="7" fill="#d9d2c0" ${ink(3)}/><circle cx="46" cy="340" r="6" fill="#d9d2c0" ${ink(3)}/><circle cx="30" cy="420" r="8" fill="#d9d2c0" ${ink(3)}/>` +
      `<rect x="16" y="6" width="10" height="80" rx="5" fill="#fff" opacity="0.25"/>`,
    linear('ps', '#a5683a', '#5e3414', true),
  );
}

export function waterSurfaceSvg(): string {
  return svgDoc(
    256,
    48,
    `<path d="M0 22 Q32 6 64 22 Q96 38 128 22 Q160 6 192 22 Q224 38 256 22 L256 48 L0 48 Z" fill="#7fd6ff" opacity="0.9"/>` +
      `<path d="M0 22 Q32 6 64 22 Q96 38 128 22 Q160 6 192 22 Q224 38 256 22" fill="none" stroke="#fff" stroke-width="6" opacity="0.85"/>` +
      `<path d="M20 34 Q36 30 50 34 M150 36 Q166 32 180 36" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.5"/>`,
  );
}

export function seabedSvg(): string {
  const w = 1920;
  const h = 200;
  const rocks = [
    [140, 60, 50], [520, 70, 36], [880, 52, 44], [1290, 66, 40], [1700, 58, 52],
  ]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" fill="url(#rk)" ${ink(6)}/><ellipse cx="${x - r * 0.3}" cy="${y - r * 0.3}" rx="${r * 0.35}" ry="${r * 0.15}" fill="#fff" opacity="0.35"/>`)
    .join('');
  const shells = [
    [330, 96, C.bubblegum], [1060, 110, C.sun], [1500, 100, '#fff6e0'],
  ]
    .map(
      ([x, y, c]) =>
        `<path d="M${x} ${y} Q${Number(x) - 22} ${Number(y) - 10} ${Number(x) - 18} ${Number(y) - 32} Q${x} ${Number(y) - 44} ${Number(x) + 18} ${Number(y) - 32} Q${Number(x) + 22} ${Number(y) - 10} ${x} ${y} Z" fill="${c}" ${ink(4)}/>` +
        `<path d="M${x} ${y} L${x} ${Number(y) - 38} M${x} ${y} L${Number(x) - 12} ${Number(y) - 30} M${x} ${y} L${Number(x) + 12} ${Number(y) - 30}" stroke="${C.ink}" stroke-width="3" opacity="0.4"/>`,
    )
    .join('');
  const star = (x: number, y: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 14 : 34;
      return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="#ff8a5c" ${ink(5)}/>` + eyes(x, y - 2, 14, 5, [1, 1]) + `<path d="M${x - 5} ${y + 8} Q${x} ${y + 12} ${x + 5} ${y + 8}" fill="none" ${ink(3)}/>`;
  };
  return svgDoc(
    w,
    h,
    `<path d="M0 50 Q240 20 480 46 Q760 76 1000 40 Q1260 10 1500 48 Q1720 76 1920 36 L1920 200 L0 200 Z" fill="url(#sd)" ${ink(7)}/>` +
      `<path d="M60 90 Q100 84 140 92 M700 100 Q740 92 780 100 M1180 90 Q1220 82 1260 92 M1600 110 Q1640 102 1680 112" fill="none" stroke="#c9a258" stroke-width="5" stroke-linecap="round"/>` +
      rocks +
      shells +
      star(700, 120) +
      star(1840, 120),
    linear('sd', '#f4d58c', '#c99a4a') + radial('rk', '#a9a3c0', '#5f5a7a'),
  );
}

export function seaweedSvg(color = '#3cc45a'): string {
  return svgDoc(
    90,
    280,
    `<path d="M44 278 Q20 230 40 190 Q62 150 36 110 Q14 70 40 30 Q50 14 56 4 Q66 40 52 74 Q40 110 62 150 Q80 194 58 232 Q52 256 58 278 Z" fill="url(#sw)" ${ink(5)}/>` +
      `<path d="M46 250 Q34 220 48 196 M44 150 Q30 120 46 94" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.35"/>`,
    linear('sw', shade(color, 0.25), shade(color, -0.3)),
  );
}

export function raySvg(): string {
  return svgDoc(
    240,
    600,
    `<path d="M70 0 L170 0 L240 600 L0 600 Z" fill="url(#ry)"/>`,
    `<linearGradient id="ry" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
  );
}

export function bubbleSvg(): string {
  return svgDoc(
    40,
    40,
    `<circle cx="20" cy="20" r="16" fill="#bfefff" fill-opacity="0.25" stroke="#fff" stroke-width="3.5"/><ellipse cx="14" cy="13" rx="5" ry="3" fill="#fff" opacity="0.9"/>`,
  );
}

/** Fisk der vender mod venstre (munden til venstre). */
export function fishSvg(color: string, big = false): string {
  const fin = shade(color, -0.3);
  return svgDoc(
    260,
    170,
    `<path d="M92 34 Q118 -4 170 30 Q140 30 120 46 Z" fill="${fin}" ${ink(6)}/>` +
      `<path d="M196 86 L252 34 Q236 86 252 138 Z" fill="${fin}" ${ink(7)}/>` +
      `<path d="M226 56 L236 86 L226 116" fill="none" stroke="#fff" stroke-width="4" opacity="0.35"/>` +
      `<path d="M18 92 Q34 22 126 22 Q206 26 214 86 Q206 146 126 150 Q34 152 18 92 Z" fill="url(#fb)" ${ink(8)}/>` +
      `<path d="M44 112 Q100 146 186 120 Q160 146 110 148 Q64 146 44 112 Z" fill="#fff" opacity="0.28"/>` +
      [
        [120, 58], [146, 70], [146, 100], [120, 112], [170, 86], [96, 86],
      ]
        .map(([x, y]) => `<path d="M${x} ${y - 12} Q${x + 13} ${y} ${x} ${y + 12}" fill="none" stroke="${fin}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>`)
        .join('') +
      `<path d="M82 46 Q66 88 82 128" fill="none" stroke="${fin}" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M124 108 Q154 112 150 138 Q130 128 124 108 Z" fill="${fin}" ${ink(5)}/>` +
      `<ellipse cx="100" cy="40" rx="40" ry="9" fill="#fff" opacity="0.45" transform="rotate(-8 100 40)"/>` +
      `<circle cx="58" cy="66" r="${big ? 24 : 21}" fill="#fff" ${ink(6)}/><circle cx="52" cy="68" r="${big ? 12 : 10}" fill="${C.ink}"/><circle cx="48" cy="63" r="4" fill="#fff"/>` +
      `<path d="M38 40 Q56 30 76 40" fill="none" ${ink(5)}/>` +
      `<ellipse cx="26" cy="100" rx="13" ry="15" fill="#7a1a3a" ${ink(5)}/><ellipse cx="24" cy="104" rx="6" ry="6" fill="#ff7aa8"/>`,
    linear('fb', shade(color, 0.3), shade(color, -0.2)),
  );
}

export function bootSvg(): string {
  return svgDoc(
    230,
    230,
    `<path d="M122 22 L198 22 L204 188 L30 188 Q12 150 48 132 L116 120 Z" fill="url(#bt)" ${ink(8)}/>` +
      `<path d="M18 186 L210 186 Q216 204 204 214 L28 214 Q12 206 18 186 Z" fill="#3a2414" ${ink(7)}/>` +
      `<rect x="114" y="10" width="94" height="30" rx="12" fill="#5e3412" ${ink(6)}/>` +
      `<path d="M126 52 L150 64 M150 52 L126 64 M126 74 L150 86 M150 74 L126 86" stroke="#fff6e0" stroke-width="5" stroke-linecap="round"/>` +
      `<rect x="54" y="146" width="34" height="26" rx="5" fill="#c98d4b" ${ink(4)} stroke-dasharray="6 4"/>` +
      eyes(172, 96, 34, 13, [-3, 3]) +
      `<path d="M150 132 Q172 120 194 132" fill="none" ${ink(5)}/>` +
      `<path d="M150 82 L162 88 M196 82 L184 88" ${ink(5)}/>` +
      `<path d="M118 16 Q100 40 108 74 Q114 92 104 112" fill="none" stroke="#3cc45a" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M190 16 Q214 30 210 60" fill="none" stroke="#3cc45a" stroke-width="8" stroke-linecap="round"/>` +
      `<rect x="132" y="28" width="56" height="7" rx="3" fill="#fff" opacity="0.35"/>` +
      `<path d="M62 150 L60 124" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.3"/>`,
    linear('bt', '#b06c34', '#5e3412', true),
  );
}

export function chaosCardSvg(): string {
  return svgDoc(
    150,
    200,
    `<rect x="10" y="16" width="130" height="176" rx="20" fill="#000" opacity="0.3"/>` +
      `<rect x="10" y="8" width="130" height="176" rx="20" fill="url(#cc)" ${ink(7)}/>` +
      `<rect x="22" y="20" width="106" height="152" rx="12" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 7" opacity="0.6"/>` +
      `<path d="M52 74 Q52 44 76 44 Q102 44 100 70 Q98 88 78 96 L78 116" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round"/>` +
      `<circle cx="78" cy="144" r="10" fill="#fff"/>` +
      shine(26, 16, 60, 8, 0.5),
    linear('cc', '#c49bff', '#5a2ab8'),
  );
}

/** Fiskestang, vandret, håndtaget til venstre. Origin bør være (0.12, 0.5). */
export function rodSvg(): string {
  return svgDoc(
    300,
    60,
    `<path d="M66 25 L296 29 L296 31 L66 37 Z" fill="#2c2c44" ${ink(4)}/>` +
      `<path d="M70 27 L290 30" stroke="#8f8fbf" stroke-width="2"/>` +
      `<rect x="8" y="20" width="66" height="22" rx="10" fill="url(#ck)" ${ink(5)}/>` +
      `<path d="M24 22 L24 40 M40 22 L40 40 M56 22 L56 40" stroke="#8a5a2b" stroke-width="3"/>` +
      `<circle cx="84" cy="44" r="13" fill="url(#rl)" ${ink(5)}/><circle cx="84" cy="44" r="4" fill="${C.ink}"/>` +
      `<circle cx="160" cy="34" r="5" fill="none" ${ink(3)}/><circle cx="226" cy="34" r="4" fill="none" ${ink(3)}/>`,
    linear('ck', '#f1cf9a', '#c99a5a') + radial('rl', '#ffffff', '#9aa3c0'),
  );
}

export function bobberSvg(color: string = C.tomato): string {
  return svgDoc(
    56,
    76,
    `<rect x="25" y="2" width="6" height="22" rx="3" fill="${C.ink}"/>` +
      `<path d="M8 46 A20 22 0 0 1 48 46 Z" fill="${color}" ${ink(5)}/>` +
      `<path d="M8 46 A20 22 0 0 0 48 46 Z" fill="#fff" ${ink(5)}/>` +
      `<ellipse cx="20" cy="34" rx="6" ry="4" fill="#fff" opacity="0.7"/>`,
  );
}

export function hookSvg(): string {
  return svgDoc(
    60,
    90,
    `<path d="M30 4 L30 58 Q30 78 16 74 Q6 70 8 56" fill="none" stroke="#5a6278" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M30 4 L30 58 Q30 78 16 74 Q6 70 8 56" fill="none" stroke="#e8ecf6" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M8 56 L14 62" stroke="#5a6278" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M30 50 Q48 46 46 60 Q44 74 30 70 Q18 66 22 80" fill="none" stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>` +
      `<path d="M30 50 Q48 46 46 60 Q44 74 30 70 Q18 66 22 80" fill="none" stroke="#ff8fb4" stroke-width="7" stroke-linecap="round"/>` +
      `<circle cx="34" cy="48" r="5" fill="#fff" ${ink(2)}/><circle cx="35" cy="49" r="2" fill="${C.ink}"/>`,
  );
}

export function duckSvg(): string {
  return svgDoc(
    140,
    110,
    `<path d="M14 66 Q16 100 70 100 Q124 100 126 64 Q110 74 90 66 Q96 40 76 24 Q56 10 40 26 Q28 40 36 58 Q22 56 14 66 Z" fill="url(#dk)" ${ink(6)}/>` +
      `<path d="M36 40 Q14 40 8 48 Q20 56 38 50 Z" fill="${C.tangerine}" ${ink(5)}/>` +
      `<circle cx="54" cy="36" r="9" fill="#fff" ${ink(4)}/><circle cx="52" cy="37" r="4.5" fill="${C.ink}"/>` +
      `<path d="M70 74 Q90 66 108 74" fill="none" stroke="#e6a100" stroke-width="5" stroke-linecap="round"/>` +
      `<ellipse cx="60" cy="24" rx="12" ry="5" fill="#fff" opacity="0.6"/>`,
    linear('dk', '#fff27a', '#ffc928'),
  );
}

export function lilySvg(): string {
  return svgDoc(
    160,
    60,
    `<path d="M80 30 L140 18 Q156 30 140 44 Q80 62 20 44 Q4 30 22 18 Z" fill="url(#lp)" ${ink(5)}/>` +
      `<path d="M80 30 L40 22 M80 30 L120 22 M80 30 L80 50" stroke="#2f8a3a" stroke-width="3" opacity="0.6"/>` +
      `<circle cx="112" cy="26" r="9" fill="#ff8fc8" ${ink(3)}/><circle cx="112" cy="26" r="3" fill="${C.sun}"/>`,
    linear('lp', '#7be05f', '#2f9e3a'),
  );
}

export function exclaimSvg(): string {
  return svgDoc(
    90,
    110,
    `<path d="M10 14 Q10 4 22 4 L68 4 Q80 4 80 14 L80 72 Q80 82 68 82 L52 82 L44 104 L36 82 L22 82 Q10 82 10 72 Z" fill="#fff" ${ink(6)}/>` +
      `<rect x="38" y="16" width="14" height="40" rx="7" fill="${C.tomato}"/><circle cx="45" cy="68" r="7" fill="${C.tomato}"/>`,
  );
}
