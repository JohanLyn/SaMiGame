import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til Badekar-Bobslæde, tegnet som SVG. */

/** Sne-flise (gentages som TileSprite). */
export function snowSvg(): string {
  const w = 256;
  const h = 256;
  const dots = Array.from({ length: 22 }, (_, i) => {
    const x = (i * 97) % w;
    const y = (i * 61 + 17) % h;
    return `<circle cx="${x}" cy="${y}" r="${1.5 + (i % 3)}" fill="#ffffff" opacity="${0.6 + (i % 3) * 0.12}"/>`;
  }).join('');
  const drifts = [
    [40, 60, 70], [180, 150, 90], [90, 210, 60], [220, 30, 50],
  ]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.35}" fill="#cfe3fb" opacity="0.6"/><ellipse cx="${x - 6}" cy="${y - 5}" rx="${r * 0.8}" ry="${r * 0.22}" fill="#ffffff" opacity="0.7"/>`)
    .join('');
  return svgDoc(w, h, `<rect width="${w}" height="${h}" fill="#e3effd"/>` + drifts + dots);
}

/** Badekarret set skråt bagfra – bagerste del (ski, inderside, vand). Origin i midten. 260×220 */
export function tubBackSvg(color: string): string {
  return svgDoc(
    260,
    220,
    // Ski
    `<rect x="30" y="4" width="26" height="212" rx="13" fill="url(#ski)" ${ink(6)}/>` +
      `<rect x="204" y="4" width="26" height="212" rx="13" fill="url(#ski)" ${ink(6)}/>` +
      `<path d="M30 20 Q43 -4 56 20" fill="#ff5fa2" ${ink(5)}/><path d="M204 20 Q217 -4 230 20" fill="#ff5fa2" ${ink(5)}/>` +
      // Skygge
      `<ellipse cx="130" cy="176" rx="104" ry="26" fill="#000" opacity="0.18"/>` +
      // Kanten (hele ellipsen) + inderside
      `<ellipse cx="130" cy="92" rx="112" ry="70" fill="url(#rim)" ${ink(8)}/>` +
      `<ellipse cx="130" cy="98" rx="94" ry="54" fill="url(#inner)" ${ink(5)}/>` +
      `<ellipse cx="130" cy="108" rx="84" ry="40" fill="url(#water)"/>` +
      // Skum
      `<circle cx="72" cy="104" r="14" fill="#fff" ${ink(3)}/><circle cx="90" cy="96" r="10" fill="#fff" ${ink(3)}/><circle cx="186" cy="102" r="13" fill="#fff" ${ink(3)}/><circle cx="170" cy="94" r="8" fill="#fff" ${ink(3)}/>` +
      // Hane + håndklæde i holdfarve
      `<rect x="118" y="20" width="24" height="26" rx="6" fill="url(#chrome)" ${ink(5)}/><path d="M124 46 L124 58 L136 58 L136 46" fill="url(#chrome)" ${ink(4)}/>` +
      `<path d="M168 30 Q196 26 214 44 L206 84 Q190 70 172 74 Z" fill="${color}" ${ink(5)}/><path d="M176 40 Q194 38 206 50" fill="none" stroke="#fff" stroke-width="5" opacity="0.6"/>`,
    linear('ski', '#ffcf3a', '#e8961a', true) +
      linear('rim', '#ffffff', '#d6e2f5') +
      linear('inner', '#d9e6f7', '#ffffff') +
      linear('water', '#7fd0ff', '#3d9be8') +
      linear('chrome', '#ffffff', '#9aa3b8'),
  );
}

/** Badekarrets forreste del (dækker figurernes ben): nær kant + krop i holdfarve + raket. 260×220 */
export function tubFrontSvg(color: string): string {
  return svgDoc(
    260,
    220,
    `<path d="M18 92 Q18 170 60 186 L200 186 Q242 170 242 92 Q242 160 130 162 Q18 160 18 92 Z" fill="url(#body)" ${ink(8)}/>` +
      `<path d="M30 130 Q130 168 230 130" fill="none" stroke="#fff" stroke-width="10" opacity="0.5"/>` +
      `<path d="M18 92 Q24 156 130 160 Q236 156 242 92" fill="none" stroke="#ffffff" stroke-width="14"/>` +
      `<path d="M18 92 Q24 156 130 160 Q236 156 242 92" fill="none" ${ink(6)}/>` +
      // Løvefødder
      `<path d="M50 180 Q40 204 60 208 Q74 204 70 184 Z" fill="#ffcf3a" ${ink(5)}/><path d="M210 180 Q220 204 200 208 Q186 204 190 184 Z" fill="#ffcf3a" ${ink(5)}/>` +
      // Raket-dyse bagpå
      `<path d="M108 178 L152 178 L144 204 L116 204 Z" fill="url(#chrome)" ${ink(6)}/>` +
      shine(54, 168, 40, 7, 0.45),
    linear('body', shade(color, 0.15), shade(color, -0.3)) + linear('chrome', '#ffffff', '#7a83a0'),
  );
}

export function rocketFlameSvg(): string {
  return svgDoc(
    80,
    140,
    `<path d="M40 136 Q4 70 14 10 L66 10 Q76 70 40 136 Z" fill="url(#f)" ${ink(5)}/>` +
      `<path d="M40 100 Q24 60 28 14 L52 14 Q56 60 40 100 Z" fill="#fff6c8"/>`,
    `<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf3a"/><stop offset="1" stop-color="#ff4b2b"/></linearGradient>`,
  );
}

export function treeSvg(): string {
  return svgDoc(
    170,
    230,
    `<ellipse cx="85" cy="218" rx="60" ry="12" fill="#000" opacity="0.15"/>` +
      `<rect x="72" y="176" width="26" height="44" rx="6" fill="#8a5a2b" ${ink(5)}/>` +
      `<path d="M85 6 L150 186 L20 186 Z" fill="url(#t)" ${ink(7)}/>` +
      `<path d="M85 6 L118 96 Q100 108 85 96 Q70 108 52 96 Z" fill="#fff" ${ink(5)}/>` +
      `<path d="M40 150 Q60 162 85 150 Q110 162 130 150 L142 172 L28 172 Z" fill="#fff" opacity="0.95" ${ink(4)}/>`,
    linear('t', '#3ccf7a', '#1d7a4a'),
  );
}

export function snowmanSvg(): string {
  return svgDoc(
    130,
    180,
    `<ellipse cx="65" cy="170" rx="50" ry="9" fill="#000" opacity="0.15"/>` +
      `<circle cx="65" cy="126" r="46" fill="url(#s)" ${ink(6)}/>` +
      `<circle cx="65" cy="62" r="34" fill="url(#s)" ${ink(6)}/>` +
      `<rect x="40" y="14" width="50" height="10" rx="4" fill="#1a1446"/><rect x="48" y="-6" width="34" height="24" rx="4" fill="#1a1446"/>` +
      eyes(65, 56, 24, 7, [1, 1]) +
      `<path d="M65 68 L94 74 L65 76 Z" fill="#ff8a2b" ${ink(3)}/>` +
      `<path d="M38 92 Q65 104 92 92" fill="none" stroke="#ff4b4b" stroke-width="10" stroke-linecap="round"/>` +
      `<circle cx="65" cy="118" r="5" fill="#1a1446"/><circle cx="65" cy="138" r="5" fill="#1a1446"/>`,
    radial('s', '#ffffff', '#cfe0f5'),
  );
}

export function penguinSvg(): string {
  return svgDoc(
    100,
    120,
    `<ellipse cx="50" cy="114" rx="34" ry="6" fill="#000" opacity="0.15"/>` +
      `<path d="M50 6 Q86 8 86 60 Q86 108 50 110 Q14 108 14 60 Q14 8 50 6 Z" fill="#1f2a44" ${ink(6)}/>` +
      `<path d="M50 30 Q74 34 72 70 Q70 100 50 102 Q30 100 28 70 Q26 34 50 30 Z" fill="#fff"/>` +
      `<path d="M14 54 Q0 70 6 86" fill="none" stroke="#1a1446" stroke-width="12" stroke-linecap="round"/>` +
      eyes(50, 36, 22, 7, [0, 1]) +
      `<path d="M42 48 L58 48 L50 58 Z" fill="#ffb43a" ${ink(3)}/>` +
      `<path d="M32 108 L44 108 M56 108 L68 108" stroke="#ffb43a" stroke-width="8" stroke-linecap="round"/>`,
  );
}

export function penguinWingSvg(): string {
  return svgDoc(40, 60, `<path d="M8 8 Q36 20 30 54 Q18 50 8 8 Z" fill="#1f2a44" ${ink(5)}/>`);
}

export function flagSvg(color: string): string {
  return svgDoc(
    80,
    140,
    `<rect x="12" y="10" width="8" height="126" rx="4" fill="#fff" ${ink(4)}/>` +
      `<path d="M20 14 L74 30 L20 50 Z" fill="${color}" ${ink(5)}/>` +
      `<ellipse cx="16" cy="134" rx="16" ry="5" fill="#000" opacity="0.15"/>`,
  );
}

/** Hop-rampe (sne-kicker) på tværs af banen. 420×120 */
export function rampSvg(): string {
  return svgDoc(
    420,
    130,
    `<path d="M10 120 L30 30 Q210 -6 390 30 L410 120 Z" fill="url(#r)" ${ink(8)}/>` +
      `<path d="M36 40 Q210 6 384 40" fill="none" stroke="#fff" stroke-width="10" opacity="0.8"/>` +
      Array.from({ length: 7 }, (_, i) => `<path d="M${70 + i * 46} 104 L${82 + i * 46} 60" stroke="#ffcf3a" stroke-width="10" stroke-linecap="round"/>`).join('') +
      `<path d="M10 120 L30 30 Q210 -6 390 30 L410 120 Z" fill="none" ${ink(8)}/>`,
    linear('r', '#9fd6ff', '#4f9de0'),
  );
}

/** Sæbe-turbo: lyserødt sæbestykke med bobler. 160×190 */
export function soapSvg(): string {
  return svgDoc(
    170,
    200,
    `<rect x="18" y="30" width="134" height="150" rx="36" fill="url(#s)" ${ink(7)}/>` +
      `<rect x="34" y="44" width="102" height="30" rx="15" fill="#fff" opacity="0.45"/>` +
      `<path d="M60 150 L85 110 L110 150" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M60 124 L85 84 L110 124" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>` +
      `<circle cx="30" cy="30" r="20" fill="#e8f6ff" opacity="0.9" ${ink(4)}/><circle cx="150" cy="40" r="14" fill="#e8f6ff" opacity="0.9" ${ink(4)}/><circle cx="140" cy="178" r="16" fill="#e8f6ff" opacity="0.9" ${ink(4)}/>` +
      `<circle cx="24" cy="24" r="5" fill="#fff"/>`,
    linear('s', '#ff9ccf', '#ff4b9a'),
  );
}

/** Isklump med øjne. */
export function iceSvg(): string {
  return svgDoc(
    130,
    120,
    `<ellipse cx="65" cy="110" rx="52" ry="9" fill="#000" opacity="0.2"/>` +
      `<path d="M20 30 L70 10 L114 32 L120 92 L64 112 L12 90 Z" fill="url(#i)" ${ink(7)}/>` +
      `<path d="M20 30 L64 48 L114 32 M64 48 L64 112" fill="none" stroke="#fff" stroke-width="5" opacity="0.7"/>` +
      `<path d="M28 40 L40 36 L36 60" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.8"/>` +
      eyes(66, 72, 30, 10, [0, 2]) +
      `<path d="M56 92 Q66 86 76 92" fill="none" ${ink(4)}/>`,
    linear('i', '#e6f7ff', '#7fc8f0'),
  );
}

/** Kæmpe badeand. */
export function duckSvg(): string {
  return svgDoc(
    130,
    120,
    `<ellipse cx="65" cy="110" rx="52" ry="9" fill="#000" opacity="0.2"/>` +
      `<path d="M14 70 Q14 104 64 106 Q118 106 118 72 Q118 50 90 54 Q96 22 70 14 Q42 10 40 40 Q42 52 50 58 Q14 50 14 70 Z" fill="url(#d)" ${ink(7)}/>` +
      `<path d="M38 36 Q20 36 14 44 Q24 52 42 46 Z" fill="#ff8a2b" ${ink(5)}/>` +
      `<circle cx="58" cy="30" r="8" fill="#fff" ${ink(3)}/><circle cx="56" cy="30" r="4" fill="#1a1446"/>` +
      `<path d="M70 76 Q90 70 100 82" fill="none" stroke="#e8a91a" stroke-width="6" stroke-linecap="round"/>` +
      `<ellipse cx="78" cy="30" rx="8" ry="5" fill="#fff" opacity="0.5"/>`,
    linear('d', '#fff07a', '#ffc928'),
  );
}

/** Målportal over banen. 560×240 */
export function finishSvg(): string {
  let checks = '';
  for (let i = 0; i < 16; i++) {
    for (let r = 0; r < 2; r++) {
      if ((i + r) % 2) checks += `<rect x="${60 + i * 27.5}" y="${30 + r * 22}" width="27.5" height="22" fill="#1a1446"/>`;
    }
  }
  return svgDoc(
    560,
    240,
    `<rect x="20" y="20" width="26" height="216" rx="10" fill="url(#pole)" ${ink(6)}/><rect x="514" y="20" width="26" height="216" rx="10" fill="url(#pole)" ${ink(6)}/>` +
      `<rect x="56" y="26" width="448" height="52" rx="10" fill="#fff"/>` +
      checks +
      `<rect x="56" y="26" width="448" height="52" rx="10" fill="none" ${ink(6)}/>` +
      `<rect x="150" y="84" width="260" height="70" rx="20" fill="url(#sign)" ${ink(6)}/>` + shine(170, 92, 100, 8, 0.45),
    linear('pole', '#ff7a6a', '#c8121c', true) + linear('sign', '#ff8a2b', '#d8501c'),
  );
}

/** Start-port. */
export function startSvg(): string {
  return svgDoc(
    560,
    200,
    `<rect x="20" y="20" width="24" height="176" rx="10" fill="url(#pole)" ${ink(6)}/><rect x="516" y="20" width="24" height="176" rx="10" fill="url(#pole)" ${ink(6)}/>` +
      `<rect x="40" y="30" width="480" height="60" rx="16" fill="url(#sign)" ${ink(6)}/>` + shine(60, 38, 160, 8, 0.45),
    linear('pole', '#47b8ff', '#1f6fc9', true) + linear('sign', '#3ee6a8', '#1d9a6a'),
  );
}

/** Lille raket-ikon (boost-ladninger). */
export function rocketIconSvg(): string {
  return svgDoc(
    64,
    64,
    `<path d="M32 4 Q48 16 46 40 L18 40 Q16 16 32 4 Z" fill="url(#r)" ${ink(4)}/>` +
      `<circle cx="32" cy="24" r="6" fill="#47b8ff" ${ink(3)}/>` +
      `<path d="M18 30 L8 46 L18 42 Z M46 30 L56 46 L46 42 Z" fill="#ff4b4b" ${ink(3)}/>` +
      `<path d="M24 42 L32 60 L40 42 Z" fill="#ffcf3a" ${ink(3)}/>`,
    linear('r', '#ffffff', '#c8d2e8'),
  );
}

/** Lille badekar-ikon til fremskridts-baren. */
export function tubIconSvg(color: string): string {
  return svgDoc(
    80,
    60,
    `<path d="M8 22 Q8 52 40 52 Q72 52 72 22 Z" fill="${color}" ${ink(5)}/>` +
      `<rect x="4" y="16" width="72" height="10" rx="5" fill="#fff" ${ink(4)}/>` +
      `<circle cx="22" cy="12" r="7" fill="#fff" ${ink(3)}/><circle cx="56" cy="12" r="7" fill="#fff" ${ink(3)}/>`,
  );
}

export function snowflakeSvg(): string {
  return svgDoc(32, 32, `<circle cx="16" cy="16" r="10" fill="#fff"/><circle cx="16" cy="16" r="14" fill="#fff" opacity="0.3"/>`);
}

export function streakSvg(): string {
  return svgDoc(12, 120, `<rect x="2" y="0" width="8" height="120" rx="4" fill="url(#g)"/>`, `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.9"/></linearGradient>`);
}
