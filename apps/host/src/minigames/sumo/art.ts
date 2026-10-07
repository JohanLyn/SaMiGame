import { ink, linear, radial, svgDoc } from '../../kit/svg';

/** Al grafik til Sumo-Frikadeller, tegnet som SVG. */

export const PAN = { cx: 960, cy: 640, rx: 600, ry: 330 };

export function panSvg(): string {
  const w = 1400;
  const h = 860;
  const cx = 700;
  const cy = 420;
  return svgDoc(
    w,
    h,
    // Håndtag
    `<path d="M40 560 L250 470 L280 520 L70 620 Q30 610 40 560 Z" fill="url(#wood)" ${ink(10)}/>` +
      `<path d="M70 570 L240 496" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.25"/>` +
      `<rect x="232" y="458" width="70" height="72" rx="14" transform="rotate(-24 267 494)" fill="url(#steel)" ${ink(9)}/>` +
      // Skygge
      `<ellipse cx="${cx}" cy="${cy + 50}" rx="660" ry="370" fill="#000" opacity="0.35"/>` +
      // Kant
      `<ellipse cx="${cx}" cy="${cy + 18}" rx="650" ry="372" fill="url(#rim)" ${ink(12)}/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="618" ry="344" fill="url(#rimTop)" ${ink(8)}/>` +
      // Bund: varmt støbejern med glød i midten
      `<ellipse cx="${cx}" cy="${cy + 6}" rx="590" ry="322" fill="url(#base)" ${ink(6)}/>` +
      `<ellipse cx="${cx}" cy="${cy + 20}" rx="420" ry="220" fill="url(#heat)"/>` +
      // Olie: gyldne pytter med glans
      oil(cx - 250, cy + 90, 120, 34) +
      oil(cx + 230, cy - 90, 150, 40) +
      oil(cx + 120, cy + 170, 90, 24) +
      oil(cx - 330, cy - 130, 80, 22) +
      `<path d="M${cx - 480} ${cy - 200} Q${cx - 300} ${cy - 330} ${cx - 40} ${cy - 338}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.3"/>` +
      `<path d="M${cx + 300} ${cy + 290} Q${cx + 440} ${cy + 240} ${cx + 520} ${cy + 150}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.15"/>`,
    linear('wood', '#c98d4b', '#6b3f17') +
      linear('steel', '#f1f4fb', '#8a93a8') +
      linear('rim', '#5d5f78', '#22223a') +
      linear('rimTop', '#8a8ca8', '#3a3b55') +
      radial('base', '#5b5470', '#1e1b33') +
      `<radialGradient id="heat"><stop offset="0" stop-color="#ff8a2b" stop-opacity="0.35"/><stop offset="1" stop-color="#ff8a2b" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="oil" cx="0.4" cy="0.35"><stop offset="0" stop-color="#ffe680" stop-opacity="0.75"/><stop offset="0.7" stop-color="#ffb52b" stop-opacity="0.45"/><stop offset="1" stop-color="#e07a1a" stop-opacity="0.15"/></radialGradient>`,
  );
}

/** Gylden oliepyt med glanslys. */
function oil(x: number, y: number, rx: number, ry: number): string {
  return (
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#oil)"/>` +
    `<ellipse cx="${x - rx * 0.35}" cy="${y - ry * 0.35}" rx="${rx * 0.28}" ry="${ry * 0.22}" fill="#fff" opacity="0.55"/>` +
    `<circle cx="${x + rx * 0.4}" cy="${y + ry * 0.1}" r="${ry * 0.16}" fill="#fff" opacity="0.5"/>`
  );
}

/** Køkkenets bagvæg-detaljer: stang med hængende redskaber og en hylde med krukker (med øjne). */
export function kitchenSvg(): string {
  const w = 1920;
  const h = 520;
  const jar = (x: number, w2: number, h2: number, color: string, lid: string) =>
    `<ellipse cx="${x}" cy="318" rx="${w2 * 0.55}" ry="8" fill="#000" opacity="0.2"/>` +
    `<rect x="${x - w2 / 2}" y="${318 - h2}" width="${w2}" height="${h2}" rx="16" fill="${color}" ${ink(6)}/>` +
    `<rect x="${x - w2 / 2 - 4}" y="${318 - h2 - 18}" width="${w2 + 8}" height="22" rx="8" fill="${lid}" ${ink(5)}/>` +
    `<rect x="${x - w2 / 2 + 10}" y="${318 - h2 + 12}" width="10" height="${h2 - 30}" rx="5" fill="#fff" opacity="0.35"/>` +
    `<rect x="${x - w2 * 0.32}" y="${318 - h2 * 0.5}" width="${w2 * 0.64}" height="${h2 * 0.32}" rx="6" fill="#fff6e0" ${ink(3)}/>` +
    `<path d="M${x - w2 * 0.2} ${318 - h2 * 0.38} H${x + w2 * 0.2} M${x - w2 * 0.14} ${318 - h2 * 0.28} H${x + w2 * 0.14}" stroke="#1a1446" stroke-width="4" stroke-linecap="round" opacity="0.6"/>` +
    `<circle cx="${x - 10}" cy="${318 - h2 * 0.72}" r="5" fill="#1a1446"/><circle cx="${x + 10}" cy="${318 - h2 * 0.72}" r="5" fill="#1a1446"/>`;
  const tool = (x: number, len: number, head: string) =>
    `<circle cx="${x}" cy="70" r="9" fill="none" stroke="#1a1446" stroke-width="5"/>` +
    `<rect x="${x - 7}" y="78" width="14" height="${len}" rx="7" fill="url(#steelT)" ${ink(4)}/>` +
    head;
  const ladle = (x: number) => tool(x, 120, `<path d="M${x - 34} ${200} Q${x} ${250} ${x + 34} ${200} Z" fill="url(#steelT)" ${ink(5)}/>`);
  const spatula = (x: number) => tool(x, 110, `<rect x="${x - 30}" y="186" width="60" height="70" rx="12" fill="#ff8a2b" ${ink(5)}/><rect x="${x - 18}" y="198" width="8" height="44" rx="4" fill="#fff" opacity="0.4"/>`);
  const whisk = (x: number) =>
    tool(x, 90, [-20, -8, 8, 20].map((d) => `<path d="M${x} 166 Q${x + d * 1.6} 220 ${x} 260 Q${x - d * 1.6} 220 ${x} 166" fill="none" stroke="#c0c8d8" stroke-width="4"/>`).join(''));
  return svgDoc(
    w,
    h,
    // Stang
    `<rect x="40" y="56" width="${w - 80}" height="14" rx="7" fill="url(#steelT)" ${ink(5)}/>` +
      ladle(170) + spatula(300) + whisk(1620) + ladle(1760) +
      // Hylder
      `<rect x="380" y="318" width="1160" height="26" rx="8" fill="url(#plank)" ${ink(6)}/>` +
      `<path d="M460 344 L460 384 L500 344 Z" fill="#6b3f17" ${ink(4)}/><path d="M1460 344 L1460 384 L1420 344 Z" fill="#6b3f17" ${ink(4)}/>` +
      jar(470, 90, 130, '#ff8a2b', '#ff4b4b') +
      jar(590, 80, 100, '#3ee6a8', '#2a1f7a') +
      jar(1330, 84, 120, '#ffcf3a', '#3d8bff') +
      jar(1450, 76, 92, '#ff5fa2', '#3ccf5a'),
    linear('steelT', '#f1f4fb', '#8a93a8') + linear('plank', '#c98d4b', '#8a5526'),
  );
}

/** Komfurets forside med knapper (nederst i billedet). */
export function stoveSvg(): string {
  const w = 1920;
  const h = 560;
  const knob = (x: number) =>
    `<circle cx="${x}" cy="${h - 70}" r="34" fill="url(#knob)" ${ink(6)}/><rect x="${x - 5}" y="${h - 100}" width="10" height="30" rx="5" fill="#1a1446"/>`;
  return svgDoc(
    w,
    h,
    `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#stove)"/>` +
      `<rect x="0" y="0" width="${w}" height="26" fill="#c0c8d8" ${ink(5)}/>` +
      `<rect x="0" y="4" width="${w}" height="6" fill="#fff" opacity="0.5"/>` +
      `<rect x="20" y="${h - 130}" width="${w - 40}" height="120" rx="24" fill="#1a1446" opacity="0.35"/>` +
      [110, 230, 1690, 1810].map(knob).join(''),
    linear('stove', '#3a3150', '#1d1730') + radial('knob', '#f1f4fb', '#8a93a8'),
  );
}

export function meatballSvg(): string {
  const bumps = [
    [60, 58, 14], [104, 50, 12], [126, 90, 13], [92, 118, 15], [48, 104, 12], [80, 82, 10], [118, 128, 9], [40, 74, 8],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#6b3216" opacity="0.55"/>`)
    .join('');
  const flecks = [
    [70, 70], [110, 74], [96, 102], [58, 120], [122, 110], [84, 48],
  ]
    .map(([x, y], i) => `<rect x="${x}" y="${y}" width="9" height="5" rx="2" transform="rotate(${i * 40} ${x} ${y})" fill="#3ccf5a"/>`)
    .join('');
  return svgDoc(
    170,
    170,
    `<circle cx="85" cy="85" r="76" fill="url(#m)" ${ink(8)}/>` + bumps + flecks + `<ellipse cx="62" cy="50" rx="26" ry="14" fill="#fff" opacity="0.3"/>`,
    radial('m', '#c8743c', '#7a3a18'),
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

export function tileSvg(): string {
  return svgDoc(
    120,
    120,
    `<rect width="120" height="120" fill="#fff6e0"/><rect x="4" y="4" width="112" height="112" rx="12" fill="url(#t)" stroke="#e8c9a0" stroke-width="4"/>` +
      `<rect x="16" y="14" width="40" height="10" rx="5" fill="#fff" opacity="0.6"/>`,
    linear('t', '#ffe3c2', '#f7c99a'),
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

export function arrowSvg(): string {
  return svgDoc(
    200,
    120,
    `<path d="M10 40 H120 V10 L190 60 L120 110 V80 H10 Z" fill="url(#a)" ${ink(8)}/>`,
    linear('a', '#ff8a5c', '#ff3b3b'),
  );
}
