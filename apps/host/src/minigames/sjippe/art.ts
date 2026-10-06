import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/**
 * Al grafik til "Sjippe-Ålen": en sump i solnedgang, to krokodiller på en træbro
 * og en meget svimmel ål, der bliver brugt som sjippetov.
 */

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Baggrund

export function skySvg(): string {
  return svgDoc(
    1920,
    1080,
    `<rect width="1920" height="1080" fill="url(#sky)"/>` +
      `<ellipse cx="960" cy="600" rx="1100" ry="380" fill="url(#haze)"/>`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1a66"/><stop offset="0.35" stop-color="#8a3a8a"/><stop offset="0.55" stop-color="#ff6a6a"/><stop offset="0.68" stop-color="#ffb36b"/><stop offset="1" stop-color="#ffe0a0"/></linearGradient>` +
      `<radialGradient id="haze"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.7"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>`,
  );
}

/** Søvnig solnedgangs-sol (420×420). */
export function sunSvg(): string {
  return svgDoc(
    420,
    420,
    `<circle cx="210" cy="210" r="200" fill="#fff3a0" opacity="0.18"/>` +
      `<circle cx="210" cy="210" r="150" fill="url(#s)" ${ink(8)}/>` +
      `<ellipse cx="160" cy="140" rx="46" ry="20" fill="#fff" opacity="0.5"/>` +
      `<path d="M140 210 Q160 226 180 210 M240 210 Q260 226 280 210" fill="none" ${ink(8)}/>` +
      `<path d="M180 262 Q210 286 240 262" fill="none" ${ink(8)}/>` +
      `<ellipse cx="128" cy="250" rx="20" ry="11" fill="#ff7a5a" opacity="0.55"/><ellipse cx="292" cy="250" rx="20" ry="11" fill="#ff7a5a" opacity="0.55"/>`,
    radial('s', '#fff7b0', '#ff9a3a'),
  );
}

export function raysSvg(): string {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a0 = (i / 16) * Math.PI * 2;
    const a1 = a0 + Math.PI / 16;
    return `<path d="M400 400 L${400 + Math.cos(a0) * 400} ${400 + Math.sin(a0) * 400} L${400 + Math.cos(a1) * 400} ${400 + Math.sin(a1) * 400} Z" fill="#fff3c4"/>`;
  }).join('');
  return svgDoc(800, 800, rays);
}

export function hillsSvg(): string {
  return svgDoc(
    1920,
    360,
    `<path d="M0 160 Q200 60 420 130 Q640 200 860 110 Q1080 30 1300 120 Q1520 200 1720 100 Q1840 50 1920 90 L1920 360 L0 360 Z" fill="#7a3a7a"/>` +
      `<path d="M0 220 Q260 150 520 210 Q800 270 1060 190 Q1360 110 1640 200 Q1800 250 1920 200 L1920 360 L0 360 Z" fill="#5a2a66"/>`,
  );
}

/** Sumpvand med solrefleks (1920×240). */
export function waterSvg(): string {
  const r = seeded(9);
  let glints = '';
  for (let i = 0; i < 26; i++) {
    const y = 20 + r() * 200;
    const w = 40 + r() * 160 * (1 - Math.abs(r() - 0.5));
    const x = 960 + (r() - 0.5) * (300 + y * 3) - w / 2;
    glints += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="7" rx="3.5" fill="#fff3c4" opacity="${(0.25 + r() * 0.4).toFixed(2)}"/>`;
  }
  return svgDoc(1920, 240, `<rect width="1920" height="240" fill="url(#w)"/>` + glints + `<rect width="1920" height="6" fill="#ffd28a" opacity="0.7"/>`, linear('w', '#c86a8a', '#3a2a6a'));
}

/** Sumpcypres med hængende mos (620×900). Origin bund. */
export function treeSvg(): string {
  const moss = [
    [170, 260, 130],
    [260, 300, 160],
    [380, 250, 120],
    [460, 300, 140],
    [120, 380, 100],
    [520, 360, 110],
  ]
    .map(
      ([x, y, l]) =>
        `<path d="M${x - 14} ${y} Q${x - 18} ${y + l * 0.6} ${x - 6} ${y + l} Q${x} ${y + l * 0.6} ${x + 4} ${y + l * 0.9} Q${x + 10} ${y + l * 0.5} ${x + 14} ${y}" fill="#6a8a5a" opacity="0.85"/>`,
    )
    .join('');
  return svgDoc(
    620,
    900,
    `<path d="M250 900 Q240 700 270 480 L350 480 Q380 700 400 900 Q440 890 470 900 L180 900 Q210 890 250 900 Z" fill="url(#trunk)" ${ink(8)}/>` +
      `<path d="M300 520 L210 420 M340 510 L450 410" stroke="#3a2a3a" stroke-width="18" stroke-linecap="round"/>` +
      `<ellipse cx="310" cy="260" rx="290" ry="130" fill="url(#leaf)" ${ink(8)}/>` +
      `<ellipse cx="200" cy="330" rx="170" ry="80" fill="url(#leaf)" ${ink(7)}/>` +
      `<ellipse cx="450" cy="330" rx="160" ry="74" fill="url(#leaf)" ${ink(7)}/>` +
      `<ellipse cx="310" cy="170" rx="180" ry="80" fill="url(#leaf)" ${ink(7)}/>` +
      `<ellipse cx="260" cy="140" rx="90" ry="26" fill="#8ab86a" opacity="0.35"/>` +
      moss,
    linear('trunk', '#6a4a5a', '#3a2a3a', true) + radial('leaf', '#4a7a4a', '#22402e'),
  );
}

export function lilySvg(flower: boolean): string {
  return svgDoc(
    170,
    80,
    `<path d="M85 40 L160 30 A78 32 0 1 1 150 22 Z" fill="url(#l)" ${ink(5)}/>` +
      `<path d="M85 40 L40 30 M85 40 L60 62 M85 40 L120 64" stroke="#2f7a3a" stroke-width="3"/>` +
      (flower
        ? `<path d="M70 30 L60 6 L80 20 L86 0 L94 20 L112 6 L102 30 Z" fill="#ffd0e8" ${ink(4)}/><circle cx="86" cy="26" r="7" fill="#ffd23a"/>`
        : ''),
    radial('l', '#7bd06a', '#3a9a4a'),
  );
}

/** Tagrør/dunhammere i forgrunden (300×380). Origin bund. */
export function reedsSvg(): string {
  const stalks = [
    [60, 380, 80, -8],
    [110, 380, 30, 4],
    [160, 380, 60, -2],
    [210, 380, 10, 8],
    [250, 380, 70, 12],
  ]
    .map(
      ([x, y, top, lean]) =>
        `<path d="M${x} ${y} Q${x + lean} ${(y + top) / 2} ${x + lean * 2} ${top}" fill="none" stroke="#3a6a3a" stroke-width="10" stroke-linecap="round"/>` +
        `<rect x="${x + lean * 2 - 14}" y="${top + 10}" width="28" height="80" rx="14" fill="url(#cat)" ${ink(5)}/>`,
    )
    .join('');
  const leaves = `<path d="M30 380 Q20 220 90 120 Q60 250 70 380 Z" fill="#4f9a4a" ${ink(5)}/><path d="M280 380 Q290 200 220 110 Q250 250 240 380 Z" fill="#4f9a4a" ${ink(5)}/><path d="M140 380 Q120 260 170 180 Q160 280 170 380 Z" fill="#5fb05a" ${ink(5)}/>`;
  return svgDoc(300, 380, leaves + stalks, linear('cat', '#9a5a2a', '#5a2a10', true));
}

/** Træbroen spillerne står på (1920×330). */
export function dockSvg(): string {
  let planks = '';
  const rows = [
    [0, 44],
    [44, 52],
    [96, 60],
    [156, 68],
  ];
  rows.forEach(([y, h], i) => {
    let x = i % 2 ? -90 : 0;
    while (x < 1920) {
      const w = 260 + ((x * 7 + i * 13) % 90);
      planks += `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="8" fill="${(x / 10 + i) % 3 < 1 ? '#c98d4b' : (x / 10 + i) % 3 < 2 ? '#b97d3e' : '#d39a58'}" stroke="#5a3418" stroke-width="5"/>`;
      planks += `<rect x="${x + 16}" y="${y + 9}" width="${w * 0.35}" height="6" rx="3" fill="#fff" opacity="0.22"/>`;
      planks += `<circle cx="${x + 18}" cy="${y + h / 2}" r="4" fill="#5a3418"/><circle cx="${x + w - 18}" cy="${y + h / 2}" r="4" fill="#5a3418"/>`;
      x += w;
    }
  });
  const posts = Array.from({ length: 9 }, (_, i) => {
    const x = 60 + i * 225;
    return `<rect x="${x}" y="200" width="56" height="140" rx="10" fill="url(#post)" ${ink(6)}/><ellipse cx="${x + 28}" cy="204" rx="28" ry="10" fill="#d39a58" ${ink(5)}/>`;
  }).join('');
  return svgDoc(
    1920,
    330,
    `<rect x="0" y="0" width="1920" height="230" fill="#7a4a24"/>` + planks + `<rect x="0" y="222" width="1920" height="20" fill="#5a3418"/>` + posts + `<rect width="1920" height="230" fill="url(#shade)"/>`,
    linear('post', '#a8723a', '#6a3e18', true) + linear('shade', 'rgba(255,200,120,0.12)', 'rgba(40,10,40,0.25)'),
  );
}

// ---------------------------------------------------------------------------
// Krokodiller

/**
 * Krokodille der står oprejst og kigger til højre (480×640). Origin ved fødderne (0.45, 0.97).
 * `style` = 'hat' (stråhat) eller 'bow' (lyserød sløjfe).
 */
export function crocSvg(style: 'hat' | 'bow'): string {
  const green = style === 'hat' ? ['#7be04f', '#2f9e3a'] : ['#5fd3a0', '#1f8a6a'];
  const scales = [330, 370, 410, 450, 490]
    .map((y) => `<path d="M${168} ${y} Q${222} ${y + 14} ${276} ${y}" fill="none" stroke="#c9b24a" stroke-width="5" stroke-linecap="round"/>`)
    .join('');
  const bumps = [
    [120, 300],
    [96, 380],
    [100, 460],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="url(#g)" ${ink(5)}/>`)
    .join('');
  const teeth = [270, 300, 330, 360, 390, 418]
    .map((x) => `<path d="M${x} 236 L${x + 9} 254 L${x + 18} 237 Z" fill="#fff" ${ink(3)}/>`)
    .join('');
  const accessory =
    style === 'hat'
      ? `<path d="M138 70 Q140 8 190 6 Q240 8 242 70 Z" fill="url(#straw)" ${ink(6)}/>` +
        `<path d="M140 56 Q190 68 240 56 L242 70 Q190 82 138 70 Z" fill="#ff4b4b" ${ink(4)}/>` +
        `<ellipse cx="190" cy="76" rx="116" ry="20" fill="url(#straw)" ${ink(6)}/>` +
        `<path d="M98 72 Q190 86 282 72" fill="none" stroke="#c98d3a" stroke-width="4"/>` +
        `<path d="M156 22 Q190 14 224 22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.4"/>`
      : `<path d="M190 80 L140 50 Q124 80 140 110 Z M190 80 L240 50 Q256 80 240 110 Z" fill="#ff5fa2" ${ink(6)}/>` +
        `<circle cx="190" cy="80" r="16" fill="#ff8ac0" ${ink(5)}/>` +
        `<path d="M146 64 Q150 80 146 98 M234 64 Q230 80 234 98" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.5"/>`;
  const lashes = style === 'bow' ? `<path d="M140 104 l-10 -12 M150 98 l-4 -14 M214 98 l4 -14 M226 104 l10 -12" stroke="#1a1446" stroke-width="5" stroke-linecap="round"/>` : '';
  return svgDoc(
    480,
    640,
    // Hale der krøller på jorden
    `<path d="M150 560 Q40 600 30 540 Q24 500 70 510 Q60 540 90 548 Q120 552 150 520 Z" fill="url(#g)" ${ink(7)}/>` +
      // Ben
      `<path d="M150 520 L140 610 Q130 630 170 630 L200 630 L196 520 Z" fill="url(#g)" ${ink(7)}/>` +
      `<path d="M240 520 L240 630 L292 630 Q306 612 280 604 L276 520 Z" fill="url(#g)" ${ink(7)}/>` +
      `<path d="M170 630 l-8 10 M186 630 l0 10 M266 630 l0 10 M282 630 l8 10" stroke="#fff" stroke-width="6" stroke-linecap="round"/>` +
      // Krop
      `<path d="M120 260 Q90 380 120 520 Q200 580 290 520 Q320 400 290 260 Q210 220 120 260 Z" fill="url(#g)" ${ink(8)}/>` +
      bumps +
      `<path d="M160 290 Q150 400 168 510 Q222 540 276 510 Q292 400 280 290 Q220 268 160 290 Z" fill="url(#belly)" ${ink(5)}/>` +
      scales +
      // Bagerste arm (den forreste tegnes separat)
      `<path d="M140 300 Q100 360 120 410 Q136 420 146 404 Q140 360 168 320 Z" fill="${green[1]}" ${ink(6)}/>` +
      // Hoved: kranie + overkæbe
      `<path d="M110 200 Q100 120 190 110 Q240 108 262 150 L440 176 Q470 186 466 212 Q462 236 430 236 L250 236 Q150 250 110 200 Z" fill="url(#g)" ${ink(8)}/>` +
      teeth +
      `<circle cx="430" cy="184" r="9" fill="#1f6a2a"/><circle cx="452" cy="190" r="7" fill="#1f6a2a"/>` +
      `<path d="M280 172 Q360 180 430 186" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.3"/>` +
      // Øjne på toppen af hovedet
      `<ellipse cx="162" cy="122" rx="34" ry="30" fill="url(#g)" ${ink(6)}/><ellipse cx="226" cy="118" rx="34" ry="30" fill="url(#g)" ${ink(6)}/>` +
      eyes(194, 124, 64, 22, [7, 3]) +
      `<path d="M134 112 Q162 96 190 112 M198 108 Q226 92 254 108" fill="none" stroke="${green[1]}" stroke-width="10" stroke-linecap="round"/>` +
      lashes +
      `<ellipse cx="300" cy="216" rx="18" ry="9" fill="#ff7a8a" opacity="0.6"/>` +
      accessory +
      shine(150, 300, 16, 90, 0.35),
    linear('g', green[0], green[1], true) + linear('belly', '#fff3a0', '#e0c860') + linear('straw', '#ffe08a', '#d9a640'),
  );
}

/** Underkæbe med tænder og tunge (260×100). Origin ved hængslet (0.06, 0.2). */
export function jawSvg(style: 'hat' | 'bow'): string {
  const green = style === 'hat' ? ['#7be04f', '#2f9e3a'] : ['#5fd3a0', '#1f8a6a'];
  const teeth = [60, 90, 120, 150, 180, 206]
    .map((x) => `<path d="M${x} 24 L${x + 9} 6 L${x + 18} 23 Z" fill="#fff" ${ink(3)}/>`)
    .join('');
  return svgDoc(
    260,
    100,
    `<path d="M16 20 L230 20 Q254 22 250 44 Q244 70 200 70 L60 72 Q20 70 16 20 Z" fill="url(#g)" ${ink(7)}/>` +
      `<path d="M50 24 Q130 50 220 24" fill="#ff7a8a" opacity="0.8"/>` +
      teeth +
      `<path d="M40 56 Q140 66 220 54" fill="none" stroke="#fff3a0" stroke-width="7" stroke-linecap="round" opacity="0.7"/>`,
    linear('g', green[0], green[1], true),
  );
}

/** Forreste arm med kløer (110×220). Origin ved skulderen (0.5, 0.1). */
export function crocArmSvg(style: 'hat' | 'bow'): string {
  const green = style === 'hat' ? ['#7be04f', '#2f9e3a'] : ['#5fd3a0', '#1f8a6a'];
  return svgDoc(
    110,
    220,
    `<path d="M30 20 Q55 4 80 20 L76 170 Q55 180 34 170 Z" fill="url(#g)" ${ink(7)}/>` +
      `<circle cx="55" cy="186" r="28" fill="url(#g)" ${ink(7)}/>` +
      `<path d="M36 206 l-6 12 M52 212 l0 12 M68 206 l6 12" stroke="#fff" stroke-width="6" stroke-linecap="round"/>` +
      `<rect x="40" y="30" width="10" height="120" rx="5" fill="#fff" opacity="0.35"/>`,
    linear('g', green[0], green[1], true),
  );
}

// ---------------------------------------------------------------------------
// Ålen

/** Ålens krop som strimmel til et Phaser Rope (512×64). */
export function eelBodySvg(): string {
  const spots = Array.from({ length: 18 }, (_, i) => `<ellipse cx="${14 + i * 28}" cy="${i % 2 ? 22 : 26}" rx="7" ry="5" fill="#1f5a4a" opacity="0.65"/>`).join('');
  return svgDoc(
    512,
    64,
    `<rect x="0" y="0" width="512" height="64" fill="#1a1446"/>` +
      `<rect x="0" y="6" width="512" height="52" fill="url(#b)"/>` +
      `<rect x="0" y="40" width="512" height="12" fill="#fff3a0" opacity="0.85"/>` +
      `<rect x="0" y="12" width="512" height="6" fill="#fff" opacity="0.35"/>` +
      spots,
    linear('b', '#4fd0a0', '#1f8a6a'),
  );
}

export type EelFace = 'ok' | 'dizzy' | 'hik';

/** Ålens hoved, peger mod højre (170×130). Origin (0.2, 0.5). */
export function eelHeadSvg(face: EelFace): string {
  let eyesSvg: string;
  if (face === 'dizzy') {
    const spiral = (x: number) =>
      `<circle cx="${x}" cy="54" r="17" fill="#fff" ${ink(5)}/><path d="M${x} 54 m-3 0 a3 3 0 1 1 6 0 a6 6 0 1 1 -12 0 a9 9 0 1 1 18 0 a12 12 0 1 1 -24 0" fill="none" stroke="#1a1446" stroke-width="3"/>`;
    eyesSvg = spiral(92) + spiral(128);
  } else if (face === 'hik') {
    eyesSvg = `<path d="M78 46 L104 56 L78 64 M142 46 L116 56 L142 64" fill="none" ${ink(6)}/>`;
  } else {
    eyesSvg = eyes(110, 52, 36, 16, [4, 2]);
  }
  const mouth =
    face === 'hik'
      ? `<circle cx="140" cy="92" r="11" fill="#7a1f2b" ${ink(4)}/><ellipse cx="86" cy="86" rx="16" ry="10" fill="#ff8aa0" opacity="0.8"/><ellipse cx="150" cy="74" rx="12" ry="8" fill="#ff8aa0" opacity="0.8"/>`
      : face === 'dizzy'
        ? `<path d="M100 92 Q115 84 130 94 Q145 104 160 90" fill="none" ${ink(5)}/><path d="M140 96 Q146 116 156 98 Z" fill="#ff6b7a" ${ink(3)}/>`
        : `<path d="M100 88 Q130 108 162 86" fill="none" ${ink(5)}/>`;
  return svgDoc(
    170,
    130,
    `<path d="M0 36 Q60 20 110 18 Q164 20 166 66 Q164 112 110 112 Q60 110 0 94 Z" fill="url(#h)" ${ink(6)}/>` +
      `<path d="M40 30 L58 6 L74 28 Z" fill="#2f9e7a" ${ink(4)}/>` +
      `<path d="M0 80 Q80 104 150 96" fill="none" stroke="#fff3a0" stroke-width="9" stroke-linecap="round" opacity="0.8"/>` +
      eyesSvg +
      mouth +
      `<ellipse cx="96" cy="30" rx="26" ry="8" fill="#fff" opacity="0.45"/>`,
    linear('h', '#5fe0b0', '#1f8a6a'),
  );
}

/** Halefinne, peger mod venstre (130×120). Origin (0.85, 0.5). */
export function eelTailSvg(): string {
  return svgDoc(
    130,
    120,
    `<path d="M120 40 Q70 30 40 8 Q6 2 10 30 Q26 60 10 90 Q6 118 40 112 Q70 90 120 80 Z" fill="url(#t)" ${ink(6)}/>` +
      `<path d="M100 60 L30 30 M100 60 L24 60 M100 60 L30 90" stroke="#1f8a6a" stroke-width="4"/>`,
    linear('t', '#7ff0c0', '#2fb08a'),
  );
}

// ---------------------------------------------------------------------------
// Diverse

export function shadowSvg(): string {
  return svgDoc(1000, 50, `<ellipse cx="500" cy="25" rx="496" ry="21" fill="url(#s)"/>`, `<radialGradient id="s"><stop offset="0.6" stop-color="#2a0a2a" stop-opacity="0.8"/><stop offset="1" stop-color="#2a0a2a" stop-opacity="0"/></radialGradient>`);
}

export function buoySvg(): string {
  return svgDoc(
    180,
    90,
    `<ellipse cx="90" cy="48" rx="84" ry="36" fill="url(#r)" ${ink(6)}/>` +
      `<ellipse cx="90" cy="44" rx="44" ry="16" fill="#3a2a6a" ${ink(5)}/>` +
      `<path d="M20 36 L40 60 M160 36 L140 60 M70 14 L76 30 M110 14 L104 30" stroke="#fff" stroke-width="16"/>` +
      `<ellipse cx="90" cy="48" rx="84" ry="36" fill="none" ${ink(6)}/>` +
      shine(40, 22, 40, 8, 0.5),
    linear('r', '#ff6a6a', '#c8202a'),
  );
}

export function frogSvg(): string {
  return svgDoc(
    130,
    110,
    `<ellipse cx="65" cy="78" rx="52" ry="28" fill="url(#f)" ${ink(6)}/>` +
      `<circle cx="42" cy="44" r="20" fill="url(#f)" ${ink(6)}/><circle cx="88" cy="44" r="20" fill="url(#f)" ${ink(6)}/>` +
      eyes(65, 42, 46, 12, [0, 2]) +
      `<path d="M44 80 Q65 94 86 80" fill="none" ${ink(5)}/>` +
      `<ellipse cx="34" cy="86" rx="9" ry="5" fill="#ff8aa0" opacity="0.6"/><ellipse cx="96" cy="86" rx="9" ry="5" fill="#ff8aa0" opacity="0.6"/>`,
    radial('f', '#9bff7a', '#3aa64a'),
  );
}

export function dragonflySvg(): string {
  return svgDoc(
    110,
    70,
    `<ellipse cx="40" cy="22" rx="30" ry="12" fill="#bff4ff" opacity="0.75" ${ink(3)}/><ellipse cx="72" cy="22" rx="30" ry="12" fill="#bff4ff" opacity="0.75" ${ink(3)}/>` +
      `<rect x="10" y="30" width="80" height="12" rx="6" fill="#3d8bff" ${ink(4)}/>` +
      `<circle cx="96" cy="36" r="10" fill="#3d8bff" ${ink(4)}/><circle cx="99" cy="33" r="3" fill="#fff"/>`,
  );
}

export function sparkSvg(): string {
  return svgDoc(60, 60, `<path d="M30 2 L36 24 L58 30 L36 36 L30 58 L24 36 L2 30 L24 24 Z" fill="#fff3a0" ${ink(3)}/>`);
}
