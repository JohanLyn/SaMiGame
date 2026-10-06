import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/**
 * Al grafik til "Kokken Siger": en dansk pølsevogn på et aftenlyst torv,
 * Kokken Klaus (tysk-agtig kok med overskæg) og hans flasker med øjne.
 */

/** Lille deterministisk tilfældighed, så grafikken er ens hver gang. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Baggrund

/** Himmel med stjerner og måne (1920×760). */
export function skySvg(): string {
  const r = seeded(7);
  const stars = Array.from({ length: 60 }, () => {
    const x = r() * 1920;
    const y = r() * 420;
    const s = 1.5 + r() * 2.5;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="#fff6e0" opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`;
  }).join('');
  return svgDoc(
    1920,
    760,
    `<rect width="1920" height="760" fill="url(#sky)"/>` +
      `<ellipse cx="960" cy="760" rx="1300" ry="260" fill="#ffb36b" opacity="0.35"/>` +
      stars +
      `<circle cx="1660" cy="150" r="90" fill="#fff3c4" opacity="0.18"/>` +
      `<circle cx="1660" cy="150" r="62" fill="url(#moon)" ${ink(6)}/>` +
      `<circle cx="1636" cy="136" r="12" fill="#e8d59a" opacity="0.8"/><circle cx="1680" cy="170" r="8" fill="#e8d59a" opacity="0.8"/><circle cx="1676" cy="122" r="6" fill="#e8d59a" opacity="0.8"/>`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1858"/><stop offset="0.55" stop-color="#4a2d86"/><stop offset="0.85" stop-color="#c2508a"/><stop offset="1" stop-color="#ff9a6b"/></linearGradient>` +
      radial('moon', '#fffbe6', '#ffe08a'),
  );
}

/** Række af danske byhuse med trappegavle og lyse vinduer (1920×560). */
export function townSvg(): string {
  const r = seeded(42);
  const colors = ['#e8a33d', '#c8483f', '#3f78c8', '#e07a3a', '#4aa36b', '#d9c25a', '#b0507a', '#3f9fb0'];
  let x = -30;
  let i = 0;
  let houses = '';
  while (x < 1940) {
    const w = 170 + Math.floor(r() * 80);
    const h = 260 + Math.floor(r() * 170);
    const col = shade(colors[i % colors.length], -0.35);
    const top = 560 - h;
    const stepped = r() < 0.5;
    let roof: string;
    if (stepped) {
      // Trappegavl
      const s = w / 7;
      const st = 26;
      roof = `M${x} ${top} L${x} ${top - st} L${x + s} ${top - st} L${x + s} ${top - st * 2} L${x + s * 2} ${top - st * 2} L${x + s * 2} ${top - st * 3} L${x + s * 3} ${top - st * 3} L${x + s * 3} ${top - st * 4} L${x + s * 4} ${top - st * 4} L${x + s * 4} ${top - st * 3} L${x + s * 5} ${top - st * 3} L${x + s * 5} ${top - st * 2} L${x + s * 6} ${top - st * 2} L${x + s * 6} ${top - st} L${x + w} ${top - st} L${x + w} ${top} Z`;
    } else {
      roof = `M${x - 8} ${top} L${x + w / 2} ${top - w * 0.42} L${x + w + 8} ${top} Z`;
    }
    houses += `<rect x="${x}" y="${top}" width="${w}" height="${h + 10}" fill="${col}" ${ink(5)}/>`;
    houses += `<path d="${roof}" fill="${stepped ? col : shade('#7a2a2a', -0.3)}" ${ink(5)}/>`;
    houses += `<rect x="${x + 6}" y="${top + 4}" width="${w - 12}" height="10" fill="#fff" opacity="0.08"/>`;
    // Vinduer
    const cols = w > 210 ? 3 : 2;
    const rows = Math.floor((h - 80) / 78);
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const wx = x + 24 + cx * ((w - 48) / cols) + ((w - 48) / cols - 34) / 2;
        const wy = top + 34 + cy * 78;
        const lit = r() < 0.55;
        houses += `<rect x="${wx.toFixed(0)}" y="${wy}" width="34" height="46" rx="5" fill="${lit ? '#ffd76b' : '#2a2050'}" ${ink(4)}/>`;
        if (lit) houses += `<rect x="${(wx + 4).toFixed(0)}" y="${wy + 4}" width="10" height="16" rx="3" fill="#fff6c8" opacity="0.8"/>`;
        houses += `<path d="M${(wx + 17).toFixed(0)} ${wy} V${wy + 46} M${wx.toFixed(0)} ${wy + 22} H${(wx + 34).toFixed(0)}" stroke="#1a1446" stroke-width="3"/>`;
      }
    }
    if (r() < 0.6) {
      const chx = x + w * 0.25 + r() * w * 0.4;
      houses += `<rect x="${chx.toFixed(0)}" y="${top - (stepped ? 70 : w * 0.3)}" width="26" height="60" fill="${shade('#8a3a2a', -0.3)}" ${ink(4)}/>`;
    }
    x += w - 4;
    i++;
  }
  return svgDoc(1920, 560, houses + `<rect width="1920" height="560" fill="url(#haze)"/>`, linear('haze', 'rgba(40,20,90,0)', 'rgba(40,20,90,0.45)'));
}

/** Brosten i perspektiv (1920×380). */
export function groundSvg(): string {
  const r = seeded(3);
  let stones = '';
  let y = 14;
  let row = 0;
  while (y < 390) {
    const h = 16 + row * 5;
    const w = 40 + row * 12;
    let x = row % 2 ? -w / 2 : 0;
    while (x < 1940) {
      const ww = w * (0.8 + r() * 0.4);
      const tone = r();
      const fill = tone < 0.33 ? '#6d5a86' : tone < 0.66 ? '#5f4e78' : '#77648f';
      stones += `<rect x="${(x + 3).toFixed(0)}" y="${(y + 2).toFixed(0)}" width="${(ww - 6).toFixed(0)}" height="${(h - 4).toFixed(0)}" rx="${(h / 2.4).toFixed(0)}" fill="${fill}" stroke="#2c2244" stroke-width="3"/>`;
      stones += `<rect x="${(x + ww * 0.2).toFixed(0)}" y="${(y + 5).toFixed(0)}" width="${(ww * 0.4).toFixed(0)}" height="${Math.max(3, h * 0.18).toFixed(0)}" rx="3" fill="#fff" opacity="0.14"/>`;
      x += ww;
    }
    y += h;
    row++;
  }
  return svgDoc(
    1920,
    380,
    `<rect width="1920" height="380" fill="#3e3258"/>` +
      stones +
      `<rect width="1920" height="380" fill="url(#fade)"/>` +
      `<ellipse cx="960" cy="40" rx="900" ry="200" fill="url(#light)"/>` +
      `<rect y="0" width="1920" height="14" fill="#2a2040"/>`,
    linear('fade', 'rgba(20,10,50,0.15)', 'rgba(20,10,50,0.55)') +
      `<radialGradient id="light" cx="0.5" cy="0.2" r="0.6"><stop offset="0" stop-color="#ffcf6b" stop-opacity="0.35"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/></radialGradient>`,
  );
}

/** Flag-guirlande: danske og bayerske flag (1920×170). */
export function buntingSvg(): string {
  const n = 26;
  let flags = '';
  const sag = (t: number) => 26 + Math.sin(t * Math.PI) * 70;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = t * 1920;
    const y = sag(t);
    const kind = i % 3;
    const id = `f${kind}`;
    flags += `<path d="M${x - 30} ${y} L${x + 30} ${y} L${x} ${y + 64} Z" fill="url(#${id})" ${ink(4)}/>`;
    if (kind === 0) flags += `<path d="M${x - 16} ${y} L${x - 8} ${y} L${x - 4} ${y + 40} Z M${x - 30} ${y + 14} L${x + 30} ${y + 14} L${x + 26} ${y + 22} L${x - 26} ${y + 22} Z" fill="#fff"/>`;
    if (kind === 2) {
      for (let k = 0; k < 3; k++) flags += `<path d="M${x - 20 + k * 14} ${y + 6} l7 9 l-7 9 l-7 -9 Z" fill="#3d8bff"/>`;
      flags += `<path d="M${x - 6} ${y + 26} l7 9 l-7 9 l-7 -9 Z M${x + 8} ${y + 26} l7 9 l-7 9 l-7 -9 Z" fill="#3d8bff"/>`;
    }
  }
  return svgDoc(
    1920,
    170,
    `<path d="M0 26 Q960 166 1920 26" fill="none" stroke="#1a1446" stroke-width="5"/>` + flags,
    linear('f0', '#ff5a5a', '#c8202a') + linear('f1', '#fff6e0', '#e8dcc4') + linear('f2', '#ffffff', '#dfe8ff'),
  );
}

export function bulbSvg(): string {
  return svgDoc(
    40,
    56,
    `<rect x="14" y="2" width="12" height="12" rx="3" fill="#3a3550" ${ink(3)}/><ellipse cx="20" cy="32" rx="13" ry="18" fill="url(#b)" ${ink(3)}/><ellipse cx="15" cy="26" rx="4" ry="7" fill="#fff" opacity="0.7"/>`,
    radial('b', '#fffbe0', '#ffc23a'),
  );
}

export function glowSvg(color = '#ffd76b'): string {
  return svgDoc(
    200,
    200,
    `<circle cx="100" cy="100" r="98" fill="url(#g)"/>`,
    `<radialGradient id="g"><stop offset="0" stop-color="${color}" stop-opacity="0.9"/><stop offset="0.4" stop-color="${color}" stop-opacity="0.35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
  );
}

/** Gammeldags gadelygte (140×620). Origin bund. */
export function lampSvg(): string {
  return svgDoc(
    140,
    620,
    `<rect x="58" y="120" width="24" height="470" rx="8" fill="url(#p)" ${ink(6)}/>` +
      `<path d="M40 620 L48 580 L92 580 L100 620 Z" fill="#2f5a4a" ${ink(6)}/>` +
      `<rect x="50" y="300" width="40" height="16" rx="6" fill="#2f5a4a" ${ink(5)}/>` +
      `<path d="M36 112 L104 112 L96 128 L44 128 Z" fill="#2f5a4a" ${ink(5)}/>` +
      `<path d="M42 110 L30 40 L110 40 L98 110 Z" fill="url(#l)" ${ink(6)}/>` +
      `<path d="M70 40 V110 M36 76 H104" stroke="#2f5a4a" stroke-width="5"/>` +
      `<path d="M22 44 L70 8 L118 44 Z" fill="#2f5a4a" ${ink(6)}/>` +
      `<circle cx="70" cy="8" r="8" fill="#2f5a4a" ${ink(4)}/>` +
      `<rect x="62" y="150" width="6" height="420" rx="3" fill="#fff" opacity="0.18"/>`,
    linear('p', '#4f8a72', '#244a3c', true) + radial('l', '#fff8d0', '#ffbf3a'),
  );
}

// ---------------------------------------------------------------------------
// Pølsevognen

/** Vognens indre: bagvæg, hylde, glas og gryde (1120×420). */
export function cartBackSvg(): string {
  const planks = Array.from({ length: 14 }, (_, i) => {
    const x = 40 + i * 74;
    return `<rect x="${x}" y="0" width="74" height="420" fill="${i % 2 ? '#7a3826' : '#6c3020'}"/><path d="M${x} 0 V420" stroke="#3e1a12" stroke-width="4"/>`;
  }).join('');
  const jar = (x: number, fill: string, lid: string) =>
    `<rect x="${x}" y="72" width="56" height="64" rx="12" fill="${fill}" ${ink(5)}/><rect x="${x + 4}" y="62" width="48" height="14" rx="4" fill="${lid}" ${ink(4)}/>` +
    `<rect x="${x + 10}" y="88" width="10" height="34" rx="5" fill="#fff" opacity="0.4"/>`;
  return svgDoc(
    1120,
    420,
    planks +
      `<rect x="40" y="0" width="1040" height="420" fill="url(#shadow)"/>` +
      // Hylde med glas
      `<rect x="90" y="134" width="420" height="20" rx="6" fill="#c98d4b" ${ink(5)}/>` +
      jar(110, '#7fd06a', '#e04a3a') +
      jar(186, '#e8c23a', '#3d8bff') +
      jar(262, '#c86a3a', '#e8e0d0') +
      jar(338, '#ff7a5a', '#3ccf5a') +
      jar(414, '#d9c27a', '#9b5cff') +
      `<rect x="610" y="134" width="420" height="20" rx="6" fill="#c98d4b" ${ink(5)}/>` +
      jar(640, '#ffd23a', '#e04a3a') +
      jar(716, '#ff5a3c', '#fff') +
      // Gryde med damp-låg
      `<path d="M820 120 Q820 70 880 70 L960 70 Q1020 70 1020 120 L1010 140 L830 140 Z" fill="url(#pot)" ${ink(6)}/>` +
      `<rect x="808" y="58" width="224" height="20" rx="10" fill="#9aa3bd" ${ink(5)}/>` +
      `<rect x="900" y="40" width="40" height="22" rx="8" fill="#5d6178" ${ink(4)}/>` +
      `<rect x="840" y="84" width="70" height="10" rx="5" fill="#fff" opacity="0.35"/>` +
      // Tavle med menu
      `<rect x="150" y="196" width="300" height="190" rx="14" fill="#2e3a34" stroke="#8a5a2b" stroke-width="14"/>` +
      `<path d="M180 250 H330 M180 290 H380 M180 330 H300" stroke="#fff6e0" stroke-width="8" stroke-linecap="round" opacity="0.75"/>` +
      `<circle cx="400" cy="250" r="12" fill="none" stroke="#ff8a8a" stroke-width="6" opacity="0.85"/>` +
      `<path d="M345 330 h50" stroke="#ffd76b" stroke-width="8" stroke-linecap="round" opacity="0.8"/>` +
      // Søjler i siderne (rød/hvid stribet)
      `<rect x="0" y="0" width="56" height="420" fill="url(#pillar)" ${ink(6)}/>` +
      `<rect x="1064" y="0" width="56" height="420" fill="url(#pillar)" ${ink(6)}/>` +
      `<rect x="8" y="0" width="12" height="420" fill="#fff" opacity="0.3"/><rect x="1072" y="0" width="12" height="420" fill="#fff" opacity="0.3"/>`,
    linear('shadow', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.05)') +
      linear('pot', '#d0d6e6', '#6d7590') +
      `<linearGradient id="pillar" x1="0" y1="0" x2="0" y2="1" spreadMethod="repeat"><stop offset="0" stop-color="#ff4b4b"/><stop offset="0.5" stop-color="#ff4b4b"/><stop offset="0.5" stop-color="#fff6e0"/><stop offset="1" stop-color="#fff6e0"/></linearGradient>`.replace(
        'y2="1"',
        'y2="0.12"',
      ),
  );
}

/** Stribet markise med kantbånd og flæser (1300×230). */
export function awningSvg(): string {
  const stripes = Array.from({ length: 13 }, (_, i) => {
    const x0 = 60 + i * 90;
    const x1 = x0 + 90;
    const bx0 = i * 100;
    const bx1 = bx0 + 100;
    return `<path d="M${x0} 20 L${x1} 20 L${bx1} 130 L${bx0} 130 Z" fill="${i % 2 ? '#fff6e0' : '#ff4b4b'}"/>`;
  }).join('');
  const scallops = Array.from({ length: 13 }, (_, i) => {
    const x = i * 100;
    return `<path d="M${x} 186 Q${x + 50} 236 ${x + 100} 186 Z" fill="${i % 2 ? '#fff6e0' : '#ff4b4b'}" ${ink(6)}/>`;
  }).join('');
  return svgDoc(
    1300,
    240,
    `<path d="M60 20 L1240 20 L1300 130 L0 130 Z" fill="#ff4b4b"/>` +
      stripes +
      `<path d="M60 20 L1240 20 L1300 130 L0 130 Z" fill="url(#shade)" ${ink(7)}/>` +
      scallops +
      `<rect x="0" y="126" width="1300" height="62" fill="url(#band)" ${ink(7)}/>` +
      `<rect x="10" y="134" width="1280" height="10" rx="5" fill="#fff" opacity="0.5"/>` +
      `<rect x="40" y="6" width="1220" height="22" rx="11" fill="#c98d4b" ${ink(6)}/>` +
      `<rect x="70" y="10" width="300" height="6" rx="3" fill="#fff" opacity="0.4"/>`,
    linear('shade', 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0.12)') + linear('band', '#fff6e0', '#f2d9a8'),
  );
}

/** Disk og vognfront med pølse-logo og hjul (1300×300). */
export function counterSvg(): string {
  return svgDoc(
    1300,
    300,
    // Hjul (ses bag spillerne)
    `<circle cx="210" cy="250" r="44" fill="#2a2440" ${ink(7)}/><circle cx="210" cy="250" r="16" fill="#c0c8d8" ${ink(5)}/>` +
      `<circle cx="1090" cy="250" r="44" fill="#2a2440" ${ink(7)}/><circle cx="1090" cy="250" r="16" fill="#c0c8d8" ${ink(5)}/>` +
      // Front
      `<rect x="40" y="40" width="1220" height="210" rx="18" fill="url(#front)" ${ink(8)}/>` +
      `<rect x="40" y="200" width="1220" height="22" fill="#fff6e0" opacity="0.9"/>` +
      `<rect x="40" y="200" width="1220" height="22" fill="none" ${ink(5)}/>` +
      `<rect x="70" y="56" width="420" height="16" rx="8" fill="#fff" opacity="0.28"/>` +
      // Logo: smilende pølse i brød
      `<g transform="translate(650 130)">` +
      `<ellipse cx="0" cy="12" rx="128" ry="54" fill="#fff6e0" ${ink(6)}/>` +
      `<path d="M-120 6 Q0 54 120 6 Q118 40 0 50 Q-118 40 -120 6 Z" fill="#e8a65a" ${ink(5)}/>` +
      `<rect x="-130" y="-24" width="260" height="46" rx="23" fill="url(#sausage)" ${ink(6)}/>` +
      `<path d="M-100 -6 Q-80 -18 -60 -6 Q-40 6 -20 -6 Q0 -18 20 -6 Q40 6 60 -6 Q80 -18 100 -6" fill="none" stroke="#ffd23a" stroke-width="7" stroke-linecap="round"/>` +
      eyes(-30, -2, 40, 10, [1, 1]) +
      `<path d="M38 2 Q48 14 58 2" fill="none" ${ink(4)}/>` +
      `</g>` +
      // Diskplade
      `<rect x="0" y="0" width="1300" height="50" rx="16" fill="url(#top)" ${ink(8)}/>` +
      `<rect x="24" y="8" width="1252" height="10" rx="5" fill="#fff" opacity="0.55"/>` +
      // Servietholder og lille sennepsglas på disken
      `<rect x="150" y="-0" width="0" height="0"/>`,
    linear('front', '#ff5a5a', '#b81f2a') + linear('top', '#e6ebf5', '#9aa3bd') + linear('sausage', '#ff7a5a', '#c42d1c'),
  );
}

/** Kæde af pølser der hænger i vognen (220×190). Origin top. */
export function sausageChainSvg(): string {
  const links = [
    [40, 50, -40],
    [80, 104, -10],
    [140, 116, 20],
    [186, 70, 60],
  ]
    .map(
      ([x, y, a]) =>
        `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - 34}" y="${y - 15}" width="68" height="30" rx="15" fill="url(#s)" ${ink(4)}/><rect x="${x - 22}" y="${y - 10}" width="30" height="6" rx="3" fill="#fff" opacity="0.4"/></g>`,
    )
    .join('');
  return svgDoc(
    220,
    190,
    `<path d="M20 4 Q20 30 40 50" fill="none" stroke="#e8dcc4" stroke-width="4"/><path d="M200 4 Q200 40 186 70" fill="none" stroke="#e8dcc4" stroke-width="4"/>` + links,
    linear('s', '#ff7a5a', '#b82a1a'),
  );
}

// ---------------------------------------------------------------------------
// Kokken Klaus

export type KokFace = 'idle' | 'blink' | 'shout' | 'angry' | 'laugh';

const SKIN = radial('skin', '#ffe0c8', '#f0a27c');

function mustache(): string {
  const half =
    `<path d="M150 196 C172 186 210 186 236 204 C252 216 266 206 258 190 C254 182 246 184 248 192 C262 214 244 236 220 228 C196 222 172 224 150 216 Z" fill="url(#stache)" ${ink(6)}/>` +
    `<path d="M168 200 C190 194 214 198 230 210" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.25"/>`;
  return half + `<g transform="translate(300 0) scale(-1 1)">${half}</g>`;
}

export function chefHeadSvg(face: KokFace): string {
  const brows =
    face === 'angry'
      ? `<path d="M76 98 L138 118" stroke="#4a2a14" stroke-width="16" stroke-linecap="round"/><path d="M224 98 L162 118" stroke="#4a2a14" stroke-width="16" stroke-linecap="round"/>`
      : face === 'shout'
        ? `<path d="M78 92 Q108 70 138 88" fill="none" stroke="#4a2a14" stroke-width="15" stroke-linecap="round"/><path d="M162 88 Q192 70 222 92" fill="none" stroke="#4a2a14" stroke-width="15" stroke-linecap="round"/>`
        : `<path d="M80 100 Q108 84 138 98" fill="none" stroke="#4a2a14" stroke-width="15" stroke-linecap="round"/><path d="M162 98 Q192 84 220 100" fill="none" stroke="#4a2a14" stroke-width="15" stroke-linecap="round"/>`;
  let eyesSvg: string;
  if (face === 'blink') {
    eyesSvg = `<path d="M88 140 Q110 152 132 140" fill="none" ${ink(6)}/><path d="M168 140 Q190 152 212 140" fill="none" ${ink(6)}/>`;
  } else if (face === 'laugh') {
    eyesSvg = `<path d="M88 146 Q110 120 132 146" fill="none" ${ink(7)}/><path d="M168 146 Q190 120 212 146" fill="none" ${ink(7)}/>`;
  } else {
    const r = face === 'shout' ? 27 : 24;
    eyesSvg = eyes(150, 140, 80, r, face === 'angry' ? [0, 5] : [0, 6]);
    if (face === 'angry') eyesSvg += `<path d="M84 116 L136 132 L136 112 Z M216 116 L164 132 L164 112 Z" fill="url(#skin)"/>`;
  }
  let mouth: string;
  if (face === 'shout') {
    mouth = `<ellipse cx="150" cy="250" rx="40" ry="34" fill="#7a1f2b" ${ink(6)}/><ellipse cx="150" cy="268" rx="24" ry="12" fill="#ff6b7a"/><rect x="128" y="218" width="44" height="12" rx="4" fill="#fff"/>`;
  } else if (face === 'laugh') {
    mouth = `<path d="M106 230 Q150 296 194 230 Z" fill="#7a1f2b" ${ink(6)}/><path d="M124 262 Q150 280 176 262 Q150 250 124 262 Z" fill="#ff6b7a"/>`;
  } else if (face === 'angry') {
    mouth = `<rect x="116" y="228" width="68" height="28" rx="8" fill="#fff" ${ink(5)}/><path d="M132 228 V256 M150 228 V256 M168 228 V256 M116 242 H184" stroke="#1a1446" stroke-width="3"/>`;
  } else {
    mouth = `<path d="M124 234 Q150 254 176 234" fill="#7a1f2b" ${ink(5)}/>`;
  }
  return svgDoc(
    300,
    300,
    // Ører og bakkenbarter
    `<ellipse cx="44" cy="170" rx="24" ry="32" fill="url(#skin)" ${ink(6)}/><ellipse cx="46" cy="172" rx="10" ry="16" fill="#e0876a"/>` +
      `<ellipse cx="256" cy="170" rx="24" ry="32" fill="url(#skin)" ${ink(6)}/><ellipse cx="254" cy="172" rx="10" ry="16" fill="#e0876a"/>` +
      // Ansigt med dobbelthage
      `<path d="M150 40 C230 40 262 100 260 170 C258 232 222 286 150 286 C78 286 42 232 40 170 C38 100 70 40 150 40 Z" fill="url(#skin)" ${ink(7)}/>` +
      `<path d="M104 274 Q150 296 196 274" fill="none" stroke="#c9785a" stroke-width="5" stroke-linecap="round" opacity="0.7"/>` +
      `<path d="M48 120 Q50 70 92 52 L80 120 Z" fill="#5a3418" ${ink(5)}/><path d="M252 120 Q250 70 208 52 L220 120 Z" fill="#5a3418" ${ink(5)}/>` +
      // Kinder
      `<ellipse cx="78" cy="200" rx="26" ry="16" fill="#ff6b6b" opacity="0.45"/><ellipse cx="222" cy="200" rx="26" ry="16" fill="#ff6b6b" opacity="0.45"/>` +
      shine(100, 56, 70, 14, 0.45) +
      brows +
      eyesSvg +
      mouth +
      mustache() +
      // Kartoffelnæse
      `<ellipse cx="150" cy="182" rx="32" ry="27" fill="url(#nose)" ${ink(6)}/><ellipse cx="140" cy="172" rx="10" ry="7" fill="#fff" opacity="0.55"/>` +
      (face === 'angry' ? `<path d="M232 60 l10 -18 l8 16 l18 -6 l-8 16 Z" fill="#ff4b4b" ${ink(3)}/>` : '') +
      (face === 'shout' ? `<path d="M268 120 l20 -10 M272 140 l24 0 M268 160 l20 10" stroke="#1a1446" stroke-width="5" stroke-linecap="round"/>` : ''),
    SKIN + radial('nose', '#ffb49a', '#e8604a') + linear('stache', '#7a4a24', '#3e2210'),
  );
}

/** Høj, pustet kokkehue (280×250). Origin bund-midte. */
export function chefHatSvg(): string {
  return svgDoc(
    280,
    250,
    `<path d="M70 190 C20 196 6 130 40 104 C22 60 70 22 112 40 C128 6 186 6 196 42 C240 26 278 72 250 112 C276 140 256 196 210 190 Z" fill="url(#hat)" ${ink(7)}/>` +
      `<path d="M100 120 Q110 160 104 190 M140 96 Q146 150 140 190 M180 120 Q172 160 178 190" fill="none" stroke="#c9d3e6" stroke-width="6" stroke-linecap="round"/>` +
      `<ellipse cx="100" cy="64" rx="34" ry="14" fill="#fff" opacity="0.9"/>` +
      `<rect x="62" y="180" width="156" height="58" rx="12" fill="url(#band)" ${ink(7)}/>` +
      `<path d="M88 186 V234 M114 186 V234 M140 186 V234 M166 186 V234 M192 186 V234" stroke="#c9d3e6" stroke-width="4"/>` +
      shine(76, 188, 70, 8, 0.6),
    linear('hat', '#ffffff', '#dbe3f2') + linear('band', '#ffffff', '#e2e8f4'),
  );
}

/** Overkrop i kokkejakke med tørklæde (540×300). Origin top-midte (skulderlinje y≈40). */
export function chefBodySvg(): string {
  const buttons = [70, 130, 190, 250]
    .map((y) => `<circle cx="214" cy="${y}" r="11" fill="url(#gold)" ${ink(4)}/><circle cx="326" cy="${y}" r="11" fill="url(#gold)" ${ink(4)}/>`)
    .join('');
  return svgDoc(
    540,
    300,
    `<path d="M20 300 L28 140 Q36 56 140 34 L400 34 Q504 56 512 140 L520 300 Z" fill="url(#coat)" ${ink(8)}/>` +
      `<path d="M190 34 Q270 120 350 34" fill="none" stroke="#c9d3e6" stroke-width="6"/>` +
      `<path d="M270 60 L240 300 M270 60 L300 300" stroke="#c9d3e6" stroke-width="5"/>` +
      buttons +
      // Halstørklæde, rødternet
      `<path d="M178 20 Q270 70 362 20 L344 64 Q270 104 196 64 Z" fill="url(#check)" ${ink(6)}/>` +
      `<path d="M250 70 L232 140 L270 118 L308 140 L290 70 Z" fill="url(#check)" ${ink(6)}/>` +
      `<circle cx="270" cy="74" r="20" fill="#ff4b4b" ${ink(5)}/>` +
      // Lomme med termometer
      `<rect x="380" y="150" width="80" height="64" rx="10" fill="#e8eef8" ${ink(5)}/><rect x="404" y="118" width="12" height="52" rx="6" fill="#ff4b4b" ${ink(4)}/>` +
      `<rect x="60" y="70" width="110" height="16" rx="8" fill="#fff" opacity="0.7"/>`,
    linear('coat', '#ffffff', '#cfd8ea') +
      radial('gold', '#fff3a0', '#e6a100') +
      `<pattern id="check" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#fff6e0"/><rect width="10" height="10" fill="#ff4b4b"/><rect x="10" y="10" width="10" height="10" fill="#ff4b4b"/></pattern>`,
  );
}

/** Arm i kokkeærme med knyttet hånd (130×250). Origin ved skulderen (0.5, 0.1). */
export function chefArmSvg(): string {
  return svgDoc(
    130,
    250,
    `<path d="M30 24 Q65 0 100 24 L104 180 Q65 196 26 180 Z" fill="url(#sleeve)" ${ink(7)}/>` +
      `<path d="M34 90 Q65 102 98 90 M32 140 Q65 152 100 140" fill="none" stroke="#c9d3e6" stroke-width="5" stroke-linecap="round"/>` +
      `<rect x="22" y="168" width="86" height="28" rx="12" fill="#ffffff" ${ink(6)}/>` +
      `<circle cx="65" cy="218" r="30" fill="url(#hand)" ${ink(6)}/>` +
      `<path d="M44 206 Q50 196 58 206 M58 204 Q65 194 72 204 M72 206 Q80 196 86 208" fill="none" stroke="#c9785a" stroke-width="4" stroke-linecap="round"/>` +
      `<rect x="40" y="30" width="12" height="130" rx="6" fill="#fff" opacity="0.7"/>`,
    linear('sleeve', '#ffffff', '#d3dcec', true) + radial('hand', '#ffe0c8', '#f0a27c'),
  );
}

// ---------------------------------------------------------------------------
// Flasker og pølse (140×290, holdes ved origin (0.5, 0.78))

function bottle(body: [string, string], cap: string, label: string): string {
  return svgDoc(
    140,
    290,
    `<path d="M70 4 L84 40 L56 40 Z" fill="${cap}" ${ink(5)}/>` +
      `<rect x="46" y="36" width="48" height="36" rx="8" fill="${cap}" ${ink(6)}/>` +
      `<path d="M34 286 Q16 286 16 266 L16 118 Q16 84 46 72 L94 72 Q124 84 124 118 L124 266 Q124 286 106 286 Z" fill="url(#body)" ${ink(7)}/>` +
      `<rect x="26" y="160" width="88" height="96" rx="14" fill="#fff6e0" ${ink(5)}/>` +
      label +
      eyes(70, 118, 40, 13, [0, 3]) +
      `<path d="M58 140 Q70 150 82 140" fill="none" ${ink(4)}/>` +
      `<rect x="26" y="90" width="12" height="160" rx="6" fill="#fff" opacity="0.45"/>` +
      shine(52, 42, 20, 6, 0.6),
    linear('body', body[0], body[1], true),
  );
}

export function ketchupSvg(): string {
  return bottle(
    ['#ff6a5a', '#c41d24'],
    '#fff6e0',
    `<circle cx="70" cy="212" r="28" fill="#ff4b4b" ${ink(4)}/><path d="M58 186 L70 194 L82 186 L76 198 L64 198 Z" fill="#3ccf5a" ${ink(3)}/><ellipse cx="62" cy="204" rx="8" ry="5" fill="#fff" opacity="0.6"/>`,
  );
}

export function sennepSvg(): string {
  return bottle(
    ['#ffe14a', '#e0a000'],
    '#ff4b4b',
    `<rect x="36" y="200" width="68" height="24" rx="12" fill="#ff7a5a" ${ink(4)}/><path d="M42 212 Q52 204 62 212 Q72 220 82 212 Q92 204 98 212" fill="none" stroke="#ffd23a" stroke-width="5" stroke-linecap="round"/>`,
  );
}

/** Den drilske pølse med ansigt (140×290). */
export function polseSvg(): string {
  return svgDoc(
    140,
    290,
    `<path d="M70 4 L62 18 L78 18 Z" fill="#c42d1c" ${ink(4)}/>` +
      `<path d="M50 30 Q36 150 50 268 Q70 290 90 268 Q104 150 90 30 Q70 8 50 30 Z" fill="url(#p)" ${ink(7)}/>` +
      `<path d="M58 40 Q50 150 58 250" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity="0.35"/>` +
      eyes(70, 96, 34, 12, [-2, 2]) +
      `<path d="M52 128 Q70 150 90 126" fill="#7a1f2b" ${ink(5)}/><path d="M66 136 Q74 150 82 134 Z" fill="#ff8aa0"/>` +
      `<path d="M70 272 L62 286 L78 286 Z" fill="#c42d1c" ${ink(4)}/>` +
      `<ellipse cx="54" cy="160" rx="7" ry="4" fill="#ff9a80" opacity="0.8"/><ellipse cx="86" cy="200" rx="7" ry="4" fill="#ff9a80" opacity="0.8"/>`,
    linear('p', '#ff7a5a', '#c42d1c', true),
  );
}

// ---------------------------------------------------------------------------
// UI-ting

export function bubbleSvg(): string {
  return svgDoc(
    520,
    250,
    `<path d="M70 20 L460 20 Q500 20 500 60 L500 160 Q500 200 460 200 L150 200 L40 244 L96 200 L70 200 Q30 200 30 160 L30 60 Q30 20 70 20 Z" fill="#000" opacity="0.25" transform="translate(0 8)"/>` +
      `<path d="M70 20 L460 20 Q500 20 500 60 L500 160 Q500 200 460 200 L150 200 L40 244 L96 200 L70 200 Q30 200 30 160 L30 60 Q30 20 70 20 Z" fill="url(#b)" ${ink(8)}/>` +
      shine(70, 34, 160, 12, 0.7),
    linear('b', '#ffffff', '#ffeac2'),
  );
}

export function badgeSvg(kind: 'ok' | 'bad'): string {
  const ok = kind === 'ok';
  return svgDoc(
    120,
    120,
    `<circle cx="60" cy="66" r="50" fill="#000" opacity="0.3"/>` +
      `<circle cx="60" cy="60" r="50" fill="url(#c)" ${ink(7)}/>` +
      (ok
        ? `<path d="M34 62 L52 80 L88 40" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="M40 40 L80 80 M80 40 L40 80" stroke="#fff" stroke-width="14" stroke-linecap="round"/>`) +
      shine(36, 20, 40, 9, 0.5),
    linear('c', ok ? '#6ff0b8' : '#ff7a7a', ok ? '#1fae74' : '#d0232a'),
  );
}

/** Sprøjt af ketchup/sennep der klistrer på en spiller (240×220). */
export function gooSvg(color: string): string {
  const dark = shade(color, -0.3);
  return svgDoc(
    240,
    220,
    `<path d="M40 70 Q30 30 70 36 Q90 6 124 24 Q160 4 182 34 Q220 30 210 72 Q236 96 206 120 L204 170 Q204 186 194 186 Q184 186 184 170 L182 132 Q160 140 150 130 L148 196 Q148 212 136 212 Q124 212 124 196 L120 134 Q100 140 84 128 L80 160 Q80 174 70 174 Q60 174 60 160 L58 118 Q20 108 40 70 Z" fill="url(#g)" ${ink(6)}/>` +
      `<ellipse cx="88" cy="58" rx="26" ry="12" fill="#fff" opacity="0.55"/><circle cx="150" cy="54" r="8" fill="#fff" opacity="0.5"/>` +
      `<circle cx="20" cy="40" r="10" fill="${color}" ${ink(4)}/><circle cx="224" cy="40" r="8" fill="${color}" ${ink(4)}/><circle cx="226" cy="150" r="7" fill="${color}" ${ink(4)}/>`,
    linear('g', shade(color, 0.15), dark),
  );
}

/** Hængende træskilt til runde-tælleren (380×170). */
export function signSvg(): string {
  return svgDoc(
    380,
    170,
    `<path d="M80 0 L60 40 M300 0 L320 40" stroke="#e8dcc4" stroke-width="6"/>` +
      `<rect x="20" y="40" width="340" height="120" rx="22" fill="#000" opacity="0.3" transform="translate(0 8)"/>` +
      `<rect x="20" y="40" width="340" height="120" rx="22" fill="url(#w)" ${ink(7)}/>` +
      `<path d="M40 80 H340 M40 120 H340" stroke="#7a4a1b" stroke-width="4" opacity="0.5"/>` +
      `<circle cx="60" cy="54" r="7" fill="#c0c8d8" ${ink(3)}/><circle cx="320" cy="54" r="7" fill="#c0c8d8" ${ink(3)}/>` +
      shine(46, 50, 120, 10, 0.35),
    linear('w', '#d99a55', '#8a5427'),
  );
}

export function dropSvg(color: string): string {
  return svgDoc(40, 52, `<path d="M20 3 Q36 28 34 36 A14 14 0 0 1 6 36 Q4 28 20 3Z" fill="${color}" ${ink(4)}/><ellipse cx="15" cy="34" rx="4" ry="6" fill="#fff" opacity="0.6"/>`);
}
