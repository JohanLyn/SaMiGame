import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til "Kødbolle-Bowling" – tegnet som SVG, med en simpel perspektiv-projektion. */

/** Perspektiv: v = 0 (forrest) … 1 (keglerne). u = -1 … 1 (banens bredde). */
export const LANE = {
  cx: 960,
  half: 520,
  zFar: 1.6,
  yNear: 1010,
  yFar: 372,
};
const K = (LANE.yNear - LANE.yFar) / (1 - 1 / LANE.zFar);
const Y0 = LANE.yNear - K;

export function depthZ(v: number): number {
  return 1 + v * (LANE.zFar - 1);
}
export function projX(u: number, v: number): number {
  return LANE.cx + (u * LANE.half) / depthZ(v);
}
export function projY(v: number): number {
  return Y0 + K / depthZ(v);
}
export function projScale(v: number): number {
  return 1 / depthZ(v);
}

const P = (u: number, v: number) => `${projX(u, v).toFixed(1)} ${projY(v).toFixed(1)}`;
const quad = (u0: number, u1: number, v0: number, v1: number) => `M${P(u0, v0)} L${P(u1, v0)} L${P(u1, v1)} L${P(u0, v1)} Z`;

/** Gulv + baner + rendestene (hele skærmen). */
export function floorSvg(): string {
  const w = 1920;
  const h = 1080;
  const vMin = -0.25;
  const vMax = 1.04;
  // Nabobaner
  let lanes = '';
  for (const side of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const a = side * (1.45 + k * 2.65);
      const b = side * (1.45 + k * 2.65 + 2.2);
      const u0 = Math.min(a, b);
      const u1 = Math.max(a, b);
      lanes += `<path d="${quad(u0, u1, vMin, vMax)}" fill="url(#woodDim)"/>`;
      for (let i = 1; i < 12; i++) {
        const u = u0 + ((u1 - u0) * i) / 12;
        lanes += `<path d="M${P(u, vMin)} L${P(u, vMax)}" stroke="#7a4a22" stroke-width="2" opacity="0.4"/>`;
      }
      lanes += `<path d="${quad(u1, u1 + 0.25, vMin, vMax)}" fill="#2a2450"/>`;
      lanes += `<path d="${quad(u0 - 0.25, u0, vMin, vMax)}" fill="#2a2450"/>`;
    }
  }
  // Hovedbanens brædder
  let boards = '';
  for (let i = 1; i < 20; i++) {
    const u = -1 + i * 0.1;
    boards += `<path d="M${P(u, vMin)} L${P(u, vMax)}" stroke="#b07a3e" stroke-width="2.5" opacity="0.55"/>`;
  }
  // Pile og prikker
  let marks = '';
  for (let i = -3; i <= 3; i++) {
    const u = i * 0.25;
    const v = 0.34 + Math.abs(i) * 0.03;
    marks += `<path d="M${P(u, v + 0.05)} L${P(u + 0.05, v - 0.01)} L${P(u - 0.05, v - 0.01)} Z" fill="#6b2a9a" stroke="#1a1446" stroke-width="2"/>`;
    marks += `<ellipse cx="${projX(u, 0.12)}" cy="${projY(0.12)}" rx="${7 / depthZ(0.12)}" ry="${4 / depthZ(0.12)}" fill="#6b2a9a"/>`;
  }
  // Kegle-pletter
  const spots = [-0.6, 0, 0.6]
    .map((u) => `<ellipse cx="${projX(u, 0.93)}" cy="${projY(0.93)}" rx="${34 / depthZ(0.93)}" ry="${12 / depthZ(0.93)}" fill="#e83a5a" opacity="0.6"/>`)
    .join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="#1c1640"/>` +
      lanes +
      // rendestene
      `<path d="${quad(-1.25, -1, vMin, vMax)}" fill="url(#gutter)" ${ink(3)}/>` +
      `<path d="${quad(1, 1.25, vMin, vMax)}" fill="url(#gutter)" ${ink(3)}/>` +
      // hovedbane
      `<path d="${quad(-1, 1, vMin, vMax)}" fill="url(#wood)" ${ink(5)}/>` +
      boards +
      // glans
      `<path d="${quad(-0.55, 0.15, 0.05, 1)}" fill="#fff" opacity="0.09"/>` +
      `<path d="${quad(-0.4, -0.15, 0.05, 1)}" fill="#fff" opacity="0.08"/>` +
      // kegle-dæk (lysere)
      `<path d="${quad(-1, 1, 0.84, vMax)}" fill="#fff3d0" opacity="0.28"/>` +
      spots +
      marks +
      // stregen
      `<path d="M${P(-1, 0)} L${P(1, 0)}" stroke="#e83a5a" stroke-width="7"/>`,
    linear('wood', '#f2c27c', '#d9954e') + linear('woodDim', '#9a6a3e', '#6b4526') + linear('gutter', '#3a3470', '#221d4a', true),
  );
}

/** Bagvæg med kegle-maskine og neon-skilt. */
export function backWallSvg(): string {
  const w = 1920;
  const h = 420;
  const lights = Array.from({ length: 22 }, (_, i) => `<circle cx="${50 + i * 86}" cy="26" r="9" fill="${['#ff5fa2', '#ffcf3a', '#3ee6a8', '#47b8ff'][i % 4]}"/>`).join('');
  const stars = Array.from({ length: 18 }, (_, i) => {
    const x = (i * 331) % w;
    const y = 60 + ((i * 97) % 200);
    return `<path d="M${x} ${y - 8} L${x + 3} ${y - 3} L${x + 8} ${y} L${x + 3} ${y + 3} L${x} ${y + 8} L${x - 3} ${y + 3} L${x - 8} ${y} L${x - 3} ${y - 3} Z" fill="#9b5cff" opacity="0.5"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#wall)"/>` +
      stars +
      `<rect x="0" y="0" width="${w}" height="52" fill="#120e30"/>` +
      lights +
      // kegle-maskinen over hovedbanen
      `<path d="M560 250 L1360 250 L1300 385 L620 385 Z" fill="#120e30" ${ink(5)}/>` +
      `<rect x="580" y="200" width="760" height="70" rx="16" fill="url(#mach)" ${ink(6)}/>` +
      `<rect x="600" y="214" width="720" height="14" rx="7" fill="#fff" opacity="0.25"/>` +
      // tæppe/forhæng
      Array.from({ length: 14 }, (_, i) => `<path d="M${636 + i * 48} 272 Q${660 + i * 48} 330 ${636 + i * 48} 385" stroke="#3a2a7a" stroke-width="14" fill="none"/>`).join('') +
      // nabobanernes maskiner
      `<path d="M40 300 L520 300 L500 385 L60 385 Z" fill="#120e30" opacity="0.8"/>` +
      `<path d="M1400 300 L1880 300 L1860 385 L1420 385 Z" fill="#120e30" opacity="0.8"/>`,
    linear('wall', '#2a1f7a', '#160f44') + linear('mach', '#ff5fa2', '#9b2a7a'),
  );
}

/** Neon-skilt. */
export function neonSvg(): string {
  return svgDoc(
    760,
    150,
    `<rect x="10" y="10" width="740" height="130" rx="40" fill="#120e30" stroke="#ff5fa2" stroke-width="10"/>` +
      `<rect x="10" y="10" width="740" height="130" rx="40" fill="none" stroke="#fff" stroke-width="3" opacity="0.6"/>` +
      `<text x="380" y="98" font-family="Arial Black, Arial" font-weight="900" font-size="58" text-anchor="middle" fill="#ffcf3a" stroke="#ff8a2b" stroke-width="3">K&#216;DBOLLE-BOWL</text>` +
      `<circle cx="64" cy="75" r="28" fill="#c8743c" stroke="#ffcf3a" stroke-width="5"/><circle cx="56" cy="68" r="5" fill="#ffcf3a"/><circle cx="72" cy="68" r="5" fill="#ffcf3a"/>` +
      `<path d="M690 50 Q706 50 706 70 L716 120 L664 120 L674 70 Q674 50 690 50 Z" fill="#fff" stroke="#ffcf3a" stroke-width="4"/><path d="M670 88 H710" stroke="#ff4b4b" stroke-width="7"/>`,
  );
}

/** Kæmpe kødbolle med vrede øjne. */
export function meatballSvg(): string {
  const bumps = [
    [70, 66, 16], [124, 56, 14], [150, 104, 15], [104, 140, 17], [56, 120, 14], [140, 150, 10], [44, 84, 9],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#6b3216" opacity="0.5"/>`)
    .join('');
  const flecks = [
    [80, 80], [130, 84], [112, 120], [66, 140], [146, 128], [96, 52], [160, 76],
  ]
    .map(([x, y], i) => `<rect x="${x}" y="${y}" width="11" height="6" rx="3" transform="rotate(${i * 40} ${x} ${y})" fill="#3ccf5a"/>`)
    .join('');
  return svgDoc(
    200,
    200,
    `<circle cx="100" cy="100" r="90" fill="url(#m)" ${ink(9)}/>` +
      bumps +
      flecks +
      `<ellipse cx="70" cy="56" rx="30" ry="16" fill="#fff" opacity="0.32"/>` +
      eyes(100, 92, 56, 17, [0, 4]) +
      `<path d="M62 64 L92 78 M138 64 L108 78" stroke="#1a1446" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M74 126 Q100 112 126 126" stroke="#1a1446" stroke-width="8" fill="none" stroke-linecap="round"/>` +
      `<path d="M82 124 L86 132 L92 122 Z" fill="#fff" stroke="#1a1446" stroke-width="3"/>`,
    radial('m', '#d07c40', '#7a3a18'),
  );
}

/** Lille bowlingkegle (som hat og som pynt). */
export function pinSvg(): string {
  return svgDoc(
    80,
    170,
    `<ellipse cx="40" cy="162" rx="26" ry="6" fill="#000" opacity="0.25"/>` +
      `<path d="M40 6 Q58 6 58 32 Q58 50 50 62 Q72 96 68 130 Q66 160 40 160 Q14 160 12 130 Q8 96 30 62 Q22 50 22 32 Q22 6 40 6 Z" fill="url(#p)" ${ink(5)}/>` +
      `<path d="M28 54 Q40 60 52 54 M26 66 Q40 72 54 66" stroke="#e83a5a" stroke-width="6" fill="none"/>` +
      `<circle cx="34" cy="28" r="4" fill="#1a1446"/><circle cx="48" cy="28" r="4" fill="#1a1446"/>` +
      `<path d="M34 40 Q41 44 48 40" stroke="#1a1446" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      shine(26, 90, 8, 40, 0.5),
    linear('p', '#ffffff', '#dfe3f0', true),
  );
}

/** Plaster (på ramte spillere). */
export function plasterSvg(): string {
  return svgDoc(
    80,
    40,
    `<g transform="rotate(-20 40 20)"><rect x="6" y="10" width="68" height="22" rx="11" fill="#ffc9a0" ${ink(4)}/><rect x="28" y="10" width="24" height="22" fill="#f2a878"/>` +
      `<circle cx="34" cy="17" r="1.6" fill="#b5562b"/><circle cx="44" cy="25" r="1.6" fill="#b5562b"/><circle cx="46" cy="16" r="1.6" fill="#b5562b"/></g>`,
  );
}

/** Kraftmåler-ramme. */
export function meterSvg(): string {
  return svgDoc(
    70,
    340,
    `<rect x="8" y="8" width="54" height="324" rx="27" fill="#120e30" ${ink(7)}/>` +
      `<rect x="16" y="16" width="38" height="308" rx="19" fill="url(#g)" opacity="0.35"/>`,
    `<linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3ee6a8"/><stop offset="0.6" stop-color="#ffcf3a"/><stop offset="1" stop-color="#ff4b4b"/></linearGradient>`,
  );
}

export function meterFillSvg(): string {
  return svgDoc(
    38,
    308,
    `<rect x="0" y="0" width="38" height="308" rx="19" fill="url(#g)"/>` + `<rect x="6" y="10" width="8" height="280" rx="4" fill="#fff" opacity="0.4"/>`,
    `<linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3ee6a8"/><stop offset="0.6" stop-color="#ffcf3a"/><stop offset="1" stop-color="#ff4b4b"/></linearGradient>`,
  );
}

/** Lyskegle fra loftet. */
export function lightConeSvg(): string {
  return svgDoc(
    400,
    600,
    `<path d="M170 0 L230 0 L400 600 L0 600 Z" fill="url(#c)"/>`,
    `<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d0" stop-opacity="0.5"/><stop offset="1" stop-color="#fff6d0" stop-opacity="0"/></linearGradient>`,
  );
}

/** Sauce-plet (når kødbollen rammer). */
export function sauceSvg(): string {
  return svgDoc(
    120,
    80,
    `<path d="M20 44 Q6 22 32 20 Q40 2 66 12 Q92 0 102 26 Q120 36 104 54 Q100 76 70 68 Q46 80 30 66 Q4 64 20 44 Z" fill="#d6282e" ${ink(3)}/>` +
      `<ellipse cx="50" cy="30" rx="14" ry="6" fill="#fff" opacity="0.4"/>`,
  );
}

/** Pil der viser sigteretningen (peger opad). */
export function aimArrowSvg(): string {
  return svgDoc(
    60,
    90,
    `<path d="M30 4 L56 44 L40 44 L40 86 L20 86 L20 44 L4 44 Z" fill="#ffcf3a" ${ink(5)}/>` + `<path d="M24 50 V80" stroke="#fff" stroke-width="4" opacity="0.6"/>`,
  );
}

/** Kugle-retur med små kødboller (pynt i siderne). */
export function rackSvg(): string {
  return svgDoc(
    300,
    260,
    `<ellipse cx="150" cy="246" rx="140" ry="12" fill="#000" opacity="0.3"/>` +
      `<path d="M30 120 Q30 90 60 90 H240 Q270 90 270 120 V230 Q270 244 256 244 H44 Q30 244 30 230 Z" fill="url(#r)" ${ink(7)}/>` +
      `<path d="M50 104 H250" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.3"/>` +
      `<path d="M110 90 Q110 20 150 20 Q190 20 190 90" fill="none" stroke="#3a2f7a" stroke-width="26"/>` +
      `<path d="M110 90 Q110 20 150 20 Q190 20 190 90" fill="none" ${ink(5)}/>` +
      `<rect x="60" y="150" width="180" height="22" rx="11" fill="#120e30"/>` +
      `<text x="150" y="214" font-family="Arial Black, Arial" font-weight="900" font-size="26" text-anchor="middle" fill="#ffcf3a">RETUR</text>`,
    linear('r', '#ff5fa2', '#7a2a9a'),
  );
}

/** Lille kødbolle (til retur-maskinen). */
export function miniBallSvg(): string {
  return svgDoc(
    70,
    70,
    `<circle cx="35" cy="35" r="30" fill="url(#m)" ${ink(5)}/>` +
      `<circle cx="26" cy="30" r="5" fill="#fff" ${ink(2)}/><circle cx="44" cy="30" r="5" fill="#fff" ${ink(2)}/>` +
      `<circle cx="27" cy="31" r="2.4" fill="#1a1446"/><circle cx="45" cy="31" r="2.4" fill="#1a1446"/>` +
      `<ellipse cx="24" cy="18" rx="9" ry="5" fill="#fff" opacity="0.35"/>`,
    radial('m', '#d07c40', '#7a3a18'),
  );
}
