import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til Spejl-Dansen, tegnet som SVG. */

/** Retninger i samme rækkefølge som knapperne på telefonen og kolonnerne på TV'et. */
export const DIRS = [
  { id: 0, name: 'VENSTRE', emoji: '⬅️', color: '#ff5fa2', rot: -Math.PI / 2 },
  { id: 1, name: 'NED', emoji: '⬇️', color: '#47b8ff', rot: Math.PI },
  { id: 2, name: 'OP', emoji: '⬆️', color: '#3ee6a8', rot: 0 },
  { id: 3, name: 'HØJRE', emoji: '➡️', color: '#ffcf3a', rot: Math.PI / 2 },
] as const;

export function backdropSvg(): string {
  const w = 1920;
  const h = 1080;
  // LED-væg: prikker
  const leds: string[] = [];
  for (let y = 40; y < 640; y += 40) {
    for (let x = 20; x < w; x += 40) {
      const k = (x * 7 + y * 13) % 11;
      const col = ['#ff5fa2', '#47b8ff', '#9b5cff', '#3ee6a8'][k % 4];
      leds.push(`<circle cx="${x}" cy="${y}" r="7" fill="${col}" opacity="${0.06 + (k % 5) * 0.035}"/>`);
    }
  }
  // Højttalere med øjne
  const speaker = (x: number, y: number) =>
    `<rect x="${x - 110}" y="${y}" width="220" height="380" rx="26" fill="url(#spk)" ${ink(8)}/>` +
    `<circle cx="${x}" cy="${y + 110}" r="62" fill="#1a1446" ${ink(6)}/><circle cx="${x}" cy="${y + 110}" r="40" fill="url(#cone)"/>` +
    `<circle cx="${x}" cy="${y + 270}" r="82" fill="#1a1446" ${ink(6)}/><circle cx="${x}" cy="${y + 270}" r="56" fill="url(#cone)"/>` +
    `<circle cx="${x}" cy="${y + 270}" r="16" fill="#2a1f7a"/>` +
    shine(x - 90, y + 12, 60, 10, 0.3);
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#bg)"/>` +
      leds.join('') +
      // Scene-bue
      `<path d="M0 640 L0 120 Q960 -60 1920 120 L1920 640 Z" fill="none" stroke="#ff5fa2" stroke-width="10" opacity="0.35"/>` +
      `<path d="M0 640 L0 150 Q960 -20 1920 150 L1920 640 Z" fill="none" stroke="#47b8ff" stroke-width="6" opacity="0.3"/>` +
      speaker(120, 260) +
      speaker(1800, 260) +
      // Bagkant af dansegulvet
      `<rect x="0" y="652" width="${w}" height="20" fill="#1a1446"/>`,
    linear('bg', '#2a0f5a', '#0d0826') + linear('spk', '#4a3a7a', '#1f1640') + radial('cone', '#6a5aa8', '#2a1f5a'),
  );
}

/** Publikum: silhuetter med lysende øjne og lyspinde. */
export function crowdSvg(): string {
  const w = 1920;
  const h = 200;
  let s = '';
  for (let i = 0; i < 26; i++) {
    const x = 20 + i * 74 + ((i * 37) % 30);
    const y = 70 + ((i * 53) % 40);
    const r = 34 + ((i * 17) % 12);
    s += `<rect x="${x - r * 1.1}" y="${y + r * 0.7}" width="${r * 2.2}" height="${h}" rx="${r}" fill="#170d3a"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#1c1048"/>`;
    s += `<circle cx="${x - r * 0.3}" cy="${y - 2}" r="4" fill="#fff6e0" opacity="0.8"/><circle cx="${x + r * 0.3}" cy="${y - 2}" r="4" fill="#fff6e0" opacity="0.8"/>`;
    if (i % 4 === 1) {
      const col = ['#ff5fa2', '#3ee6a8', '#ffcf3a'][i % 3];
      s += `<path d="M${x + r} ${y + 30} L${x + r + 30} ${y - 60}" stroke="${col}" stroke-width="10" stroke-linecap="round"/>`;
      s += `<path d="M${x + r} ${y + 30} L${x + r + 30} ${y - 60}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`;
    }
  }
  return svgDoc(w, h, s);
}

/** Pil med øjne, peger OP (roteres). */
export function arrowSvg(color: string): string {
  return svgDoc(
    120,
    120,
    `<path d="M60 8 L110 62 L80 62 L80 110 L40 110 L40 62 L10 62 Z" fill="url(#a)" ${ink(8)}/>` +
      `<path d="M60 20 L94 56 L72 56" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>` +
      eyes(60, 80, 22, 8, [0, -2]),
    linear('a', shade(color, 0.35), shade(color, -0.2)),
  );
}

/** Modtager-pil (hul), peger OP. */
export function receptorSvg(): string {
  return svgDoc(
    130,
    130,
    `<path d="M65 10 L118 66 L86 66 L86 118 L44 118 L44 66 L12 66 Z" fill="#1a1446" fill-opacity="0.55" stroke="#1a1446" stroke-width="14" stroke-linejoin="round"/>` +
      `<path d="M65 10 L118 66 L86 66 L86 118 L44 118 L44 66 L12 66 Z" fill="none" stroke="#fff6e0" stroke-width="6" stroke-linejoin="round"/>`,
  );
}

/** Spejlkugle. */
export function discoBallSvg(): string {
  let tiles = '';
  for (let r = -4; r <= 4; r++) {
    for (let c = -5; c <= 5; c++) {
      const x = 80 + c * 15;
      const y = 92 + r * 15;
      if ((x - 80) ** 2 + (y - 92) ** 2 > 66 ** 2) continue;
      const k = (r * 7 + c * 3 + 20) % 5;
      tiles += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2" fill="${['#ffffff', '#cfd8ff', '#8a93c8', '#e6ecff', '#b0b8e8'][k]}"/>`;
    }
  }
  return svgDoc(
    160,
    170,
    `<path d="M80 0 L80 22" stroke="#1a1446" stroke-width="5"/>` +
      `<circle cx="80" cy="92" r="70" fill="#5a628a" ${ink(7)}/>` +
      tiles +
      `<circle cx="80" cy="92" r="70" fill="url(#sh)"/>` +
      `<circle cx="80" cy="92" r="70" fill="none" ${ink(7)}/>` +
      `<ellipse cx="56" cy="62" rx="18" ry="10" fill="#fff" opacity="0.8"/>`,
    `<radialGradient id="sh" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.25"/><stop offset="1" stop-color="#1a1446" stop-opacity="0.55"/></radialGradient>`,
  );
}

/** Lyskegle fra en spot (ADD-blending). Peger NED fra (cx, 0). */
export function spotBeamSvg(color: string): string {
  return svgDoc(
    500,
    1000,
    `<path d="M220 0 L280 0 L500 1000 L0 1000 Z" fill="url(#g)"/>`,
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.7"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`,
  );
}

/** Lysplet på gulvet (ADD). */
export function floorSpotSvg(): string {
  return svgDoc(
    400,
    140,
    `<ellipse cx="200" cy="70" rx="196" ry="66" fill="url(#g)"/>`,
    `<radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  );
}

/** Spot-lampe (hus). */
export function spotLampSvg(): string {
  return svgDoc(
    100,
    90,
    `<rect x="20" y="4" width="60" height="16" rx="6" fill="#3a3b55" ${ink(5)}/>` +
      `<path d="M18 24 L82 24 L92 80 L8 80 Z" fill="url(#l)" ${ink(6)}/>` +
      `<ellipse cx="50" cy="80" rx="42" ry="9" fill="#fff6c8" ${ink(4)}/>`,
    linear('l', '#6a6f8a', '#2a2b45'),
  );
}

/** Highway-baggrund (lodret bane med 4 kolonner). */
export function highwaySvg(w: number, h: number): string {
  const colW = w / 4;
  let cols = '';
  for (let i = 0; i < 4; i++) {
    cols += `<rect x="${i * colW + 6}" y="0" width="${colW - 12}" height="${h}" rx="18" fill="${['#ff5fa2', '#47b8ff', '#3ee6a8', '#ffcf3a'][i]}" opacity="0.13"/>`;
  }
  return svgDoc(
    w + 20,
    h,
    `<rect x="10" y="0" width="${w}" height="${h}" rx="30" fill="#0a0620" opacity="0.72"/>` +
      cols +
      `<rect x="10" y="0" width="${w}" height="${h}" rx="30" fill="none" stroke="#1a1446" stroke-width="10"/>` +
      `<rect x="16" y="6" width="${w - 12}" height="${h - 12}" rx="26" fill="none" stroke="#9b5cff" stroke-width="4" opacity="0.6"/>`,
  );
}

/** Stjerne-gnist. */
export function sparkleSvg(): string {
  return svgDoc(64, 64, `<path d="M32 2 L38 26 L62 32 L38 38 L32 62 L26 38 L2 32 L26 26 Z" fill="#fff"/>`);
}

/** Ring der udvider sig ved træf. */
export function hitRingSvg(): string {
  return svgDoc(140, 140, `<circle cx="70" cy="70" r="60" fill="none" stroke="#fff" stroke-width="10"/>`);
}
