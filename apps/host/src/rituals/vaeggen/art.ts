import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';
import { C } from '../../kit/theme';

/** Al grafik til Den Store Væg: en kæmpe julekalender på et aftenbelyst torv. */

export const WALL = { x: 290, y: 250, w: 1340, h: 620, cols: 4, rows: 3, pad: 40 };
export const DOOR_W = 270;
export const DOOR_H = 148;

export function doorCenter(i: number): { x: number; y: number } {
  const c = i % WALL.cols;
  const r = Math.floor(i / WALL.cols);
  const cw = (WALL.w - WALL.pad * 2) / WALL.cols;
  const ch = (WALL.h - WALL.pad * 2) / WALL.rows;
  return { x: WALL.x + WALL.pad + cw * (c + 0.5), y: WALL.y + WALL.pad + ch * (r + 0.5) };
}

export function wallSvg(): string {
  const m = 60; // ekstra plads rundt om (sløjfe og skygge)
  const w = WALL.w + m * 2;
  const h = WALL.h + m * 2;
  const x = m;
  const y = m;
  const flakes = Array.from({ length: 40 }, (_, i) => {
    const fx = x + 40 + ((i * 197) % (WALL.w - 80));
    const fy = y + 40 + ((i * 131) % (WALL.h - 80));
    const r = 5 + (i % 3) * 3;
    return `<path d="M${fx - r} ${fy} L${fx + r} ${fy} M${fx} ${fy - r} L${fx} ${fy + r} M${fx - r * 0.7} ${fy - r * 0.7} L${fx + r * 0.7} ${fy + r * 0.7} M${fx - r * 0.7} ${fy + r * 0.7} L${fx + r * 0.7} ${fy - r * 0.7}" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.14"/>`;
  }).join('');
  const recesses = Array.from({ length: WALL.cols * WALL.rows }, (_, i) => {
    const c = doorCenter(i);
    const rx = c.x - WALL.x + x - DOOR_W / 2 - 6;
    const ry = c.y - WALL.y + y - DOOR_H / 2 - 6;
    return (
      `<rect x="${rx}" y="${ry}" width="${DOOR_W + 12}" height="${DOOR_H + 12}" rx="20" fill="url(#rc)" ${ink(6)}/>` +
      `<rect x="${rx + 8}" y="${ry + 8}" width="${DOOR_W - 4}" height="16" rx="8" fill="#000" opacity="0.35"/>`
    );
  }).join('');
  const bulbs = Array.from({ length: 30 }, (_, i) => {
    const t = i / 30;
    let bx: number;
    let by: number;
    if (t < 0.25) {
      bx = x + 18 + (WALL.w - 36) * (t / 0.25);
      by = y + 18;
    } else if (t < 0.5) {
      bx = x + WALL.w - 18;
      by = y + 18 + (WALL.h - 36) * ((t - 0.25) / 0.25);
    } else if (t < 0.75) {
      bx = x + WALL.w - 18 - (WALL.w - 36) * ((t - 0.5) / 0.25);
      by = y + WALL.h - 18;
    } else {
      bx = x + 18;
      by = y + WALL.h - 18 - (WALL.h - 36) * ((t - 0.75) / 0.25);
    }
    return `<circle cx="${bx}" cy="${by}" r="9" fill="#fff3a0" ${ink(3)}/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<rect x="${x + 10}" y="${y + 26}" width="${WALL.w}" height="${WALL.h}" rx="44" fill="#000" opacity="0.45"/>` +
      `<rect x="${x}" y="${y}" width="${WALL.w}" height="${WALL.h}" rx="44" fill="url(#fr)" ${ink(12)}/>` +
      `<rect x="${x + 30}" y="${y + 30}" width="${WALL.w - 60}" height="${WALL.h - 60}" rx="26" fill="url(#pn)" stroke="#ffcf3a" stroke-width="8"/>` +
      `<rect x="${x + 30}" y="${y + 30}" width="${WALL.w - 60}" height="${WALL.h - 60}" rx="26" fill="none" ${ink(4)}/>` +
      flakes +
      recesses +
      bulbs +
      `<rect x="${x + 40}" y="${y + 6}" width="${WALL.w - 80}" height="12" rx="6" fill="#fff" opacity="0.3"/>` +
      // Sløjfe
      `<path d="M${w / 2} ${y + 6} Q${w / 2 - 150} ${y - 70} ${w / 2 - 170} ${y + 10} Q${w / 2 - 150} ${y + 70} ${w / 2} ${y + 6} Z" fill="url(#bw)" ${ink(8)}/>` +
      `<path d="M${w / 2} ${y + 6} Q${w / 2 + 150} ${y - 70} ${w / 2 + 170} ${y + 10} Q${w / 2 + 150} ${y + 70} ${w / 2} ${y + 6} Z" fill="url(#bw)" ${ink(8)}/>` +
      `<path d="M${w / 2 - 20} ${y + 20} L${w / 2 - 70} ${y + 110} L${w / 2 - 40} ${y + 100} L${w / 2 - 30} ${y + 130} L${w / 2} ${y + 30} Z" fill="url(#bw)" ${ink(7)}/>` +
      `<path d="M${w / 2 + 20} ${y + 20} L${w / 2 + 70} ${y + 110} L${w / 2 + 40} ${y + 100} L${w / 2 + 30} ${y + 130} L${w / 2} ${y + 30} Z" fill="url(#bw)" ${ink(7)}/>` +
      `<circle cx="${w / 2}" cy="${y + 8}" r="26" fill="url(#bw)" ${ink(8)}/>` +
      `<path d="M${w / 2 - 120} ${y - 16} Q${w / 2 - 80} ${y - 34} ${w / 2 - 40} ${y - 10}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.4"/>`,
    linear('fr', '#ff5a5a', '#a01a2a') +
      linear('pn', '#1f7a4a', '#0d4a2c') +
      linear('rc', '#1a1446', '#3a2f7a') +
      linear('bw', '#ffe26a', '#e6a100'),
  );
}

const DOOR_COLORS = ['#ff4d4d', '#3d8bff', '#ffc928', '#9b5cff', '#3ccf5a', '#ff8a2b'];

export function doorSvg(i: number): string {
  const col = DOOR_COLORS[i % DOOR_COLORS.length];
  const w = DOOR_W + 20;
  const h = DOOR_H + 24;
  const deco =
    i % 3 === 0
      ? // Kristtorn
        `<path d="M40 30 Q30 20 22 30 Q30 34 26 42 Q36 38 40 30 Z M40 30 Q50 20 58 30 Q50 34 54 42 Q44 38 40 30 Z" fill="#2f9e3a" ${ink(3)}/><circle cx="40" cy="34" r="6" fill="${C.tomato}" ${ink(3)}/>`
      : i % 3 === 1
        ? // Stjerne
          `<path d="M40 16 L45 28 L58 29 L48 37 L51 50 L40 43 L29 50 L32 37 L22 29 L35 28 Z" fill="${C.sun}" ${ink(3)}/>`
        : // Gave
          `<rect x="26" y="24" width="30" height="24" rx="4" fill="${C.bubblegum}" ${ink(3)}/><path d="M41 24 L41 48 M26 34 L56 34" stroke="${C.sun}" stroke-width="5"/>`;
  return svgDoc(
    w,
    h,
    `<rect x="10" y="16" width="${DOOR_W}" height="${DOOR_H}" rx="18" fill="#000" opacity="0.3"/>` +
      `<rect x="10" y="8" width="${DOOR_W}" height="${DOOR_H}" rx="18" fill="url(#dg)" ${ink(7)}/>` +
      `<rect x="24" y="22" width="${DOOR_W - 28}" height="${DOOR_H - 28}" rx="12" fill="none" stroke="#fff" stroke-width="4" opacity="0.4" stroke-dasharray="14 9"/>` +
      shine(30, 14, 90, 9, 0.45) +
      deco +
      `<circle cx="${DOOR_W - 14}" cy="${8 + DOOR_H / 2}" r="10" fill="url(#kn)" ${ink(4)}/>` +
      `<rect x="2" y="${8 + DOOR_H * 0.2}" width="14" height="24" rx="5" fill="#c9a24a" ${ink(3)}/>` +
      `<rect x="2" y="${8 + DOOR_H * 0.65}" width="14" height="24" rx="5" fill="#c9a24a" ${ink(3)}/>`,
    linear('dg', shade(col, 0.25), shade(col, -0.25)) + radial('kn', '#fff7c0', '#d99a00'),
  );
}

export function splatSvg(): string {
  const blobs = [
    [64, 64, 34], [30, 40, 14], [104, 36, 12], [108, 96, 15], [26, 98, 11], [64, 18, 9], [70, 112, 10],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#sp)"/>`)
    .join('');
  const drips = `<path d="M50 80 Q48 116 54 124 Q60 116 58 82 Z M82 84 Q82 108 86 112 Q90 106 88 84 Z" fill="#d42020"/>`;
  return svgDoc(
    128,
    128,
    `<g opacity="0.95">${blobs}${drips}</g>` +
      `<circle cx="56" cy="54" r="5" fill="#ffe08a" opacity="0.9"/><circle cx="74" cy="64" r="4" fill="#ffe08a" opacity="0.9"/><circle cx="62" cy="76" r="4" fill="#ffe08a" opacity="0.9"/>` +
      `<ellipse cx="52" cy="48" rx="12" ry="6" fill="#fff" opacity="0.4"/>`,
    radial('sp', '#ff5a3a', '#c41818'),
  );
}

export function tomatoSvg(): string {
  return svgDoc(
    80,
    80,
    `<circle cx="40" cy="44" r="30" fill="url(#tm)" ${ink(5)}/>` +
      `<path d="M40 16 L32 8 M40 16 L50 6 M40 16 L26 20 M40 16 L54 20 M40 16 L40 22" stroke="#2f9e3a" stroke-width="6" stroke-linecap="round"/>` +
      `<ellipse cx="30" cy="34" rx="9" ry="5" fill="#fff" opacity="0.6" transform="rotate(-30 30 34)"/>`,
    radial('tm', '#ff7a5a', '#d41e1e'),
  );
}

/** Sigtekorn i spillerens farve. */
export function crosshairSvg(color: string): string {
  return svgDoc(
    120,
    120,
    `<circle cx="60" cy="60" r="40" fill="none" stroke="${C.ink}" stroke-width="14"/>` +
      `<circle cx="60" cy="60" r="40" fill="none" stroke="${color}" stroke-width="8"/>` +
      `<circle cx="60" cy="60" r="40" fill="${color}" opacity="0.15"/>` +
      ['M60 6 L60 30', 'M60 90 L60 114', 'M6 60 L30 60', 'M90 60 L114 60']
        .map((d) => `<path d="${d}" stroke="${C.ink}" stroke-width="14" stroke-linecap="round"/><path d="${d}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`)
        .join('') +
      `<circle cx="60" cy="60" r="8" fill="${color}" ${ink(4)}/>`,
  );
}

export function crateSvg(): string {
  const toms = [
    [30, 28], [56, 22], [82, 28], [44, 14], [70, 12],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y + 10}" r="15" fill="url(#ct)" ${ink(4)}/><path d="M${x - 5} ${y - 2} L${x + 5} ${y - 2}" stroke="#2f9e3a" stroke-width="4" stroke-linecap="round"/>`)
    .join('');
  return svgDoc(
    112,
    96,
    toms +
      `<rect x="6" y="38" width="100" height="52" rx="8" fill="url(#cw)" ${ink(5)}/>` +
      `<path d="M10 56 L102 56 M10 72 L102 72" stroke="#8a5a2b" stroke-width="4"/>` +
      `<rect x="12" y="42" width="40" height="6" rx="3" fill="#fff" opacity="0.3"/>`,
    radial('ct', '#ff7a5a', '#d41e1e') + linear('cw', '#e3a868', '#9a5e2a'),
  );
}

export function townSvg(): string {
  const w = 1920;
  const h = 420;
  const houses = Array.from({ length: 14 }, (_, i) => {
    const hx = i * 140 - 20 + ((i * 37) % 30);
    const hw = 130 + ((i * 53) % 40);
    const hh = 160 + ((i * 71) % 140);
    const top = h - hh;
    const roof = i % 2 ? `<path d="M${hx - 8} ${top} L${hx + hw / 2} ${top - 70} L${hx + hw + 8} ${top} Z" fill="#241a5a" ${ink(4)}/>` : `<rect x="${hx - 6}" y="${top - 18}" width="${hw + 12}" height="22" rx="4" fill="#241a5a" ${ink(4)}/>`;
    const wins = Array.from({ length: 6 }, (_, k) => {
      const wx = hx + 20 + (k % 2) * (hw - 70);
      const wy = top + 30 + Math.floor(k / 2) * 52;
      if (wy > h - 40) return '';
      const lit = (i * 7 + k * 3) % 5 !== 0;
      return `<rect x="${wx}" y="${wy}" width="30" height="34" rx="5" fill="${lit ? '#ffd76a' : '#3a2f7a'}" ${ink(3)}/>`;
    }).join('');
    return `<rect x="${hx}" y="${top}" width="${hw}" height="${hh}" fill="${i % 3 ? '#2f2470' : '#38297e'}" ${ink(4)}/>` + roof + wins;
  }).join('');
  return svgDoc(w, h, houses);
}

export function cobbleSvg(): string {
  const stones = Array.from({ length: 60 }, (_, i) => {
    const row = Math.floor(i / 15);
    const x = (i % 15) * 132 + (row % 2) * 66 - 20;
    const y = 30 + row * 46;
    return `<rect x="${x}" y="${y}" width="118" height="38" rx="16" fill="${(i * 7) % 3 ? '#6a5a9a' : '#5e4f8c'}" ${ink(4)}/><rect x="${x + 14}" y="${y + 6}" width="40" height="7" rx="3" fill="#fff" opacity="0.18"/>`;
  }).join('');
  return svgDoc(1920, 220, `<rect width="1920" height="220" fill="#463a78"/>` + stones + `<rect width="1920" height="16" fill="#2a1f5a"/>`);
}

export function moonSvg(): string {
  return svgDoc(
    200,
    200,
    `<circle cx="100" cy="100" r="96" fill="#fff6c0" opacity="0.18"/><circle cx="100" cy="100" r="72" fill="url(#mn)" ${ink(6)}/>` +
      `<circle cx="72" cy="128" r="10" fill="#e6d48a"/><circle cx="130" cy="70" r="7" fill="#e6d48a"/><circle cx="128" cy="132" r="5" fill="#e6d48a"/>` +
      eyes(100, 92, 40, 9, [0, 2]) +
      `<path d="M86 116 Q100 126 114 116" fill="none" ${ink(5)}/>`,
    radial('mn', '#fffbe0', '#ffe27a'),
  );
}

export function bulbSvg(): string {
  return svgDoc(36, 50, `<rect x="12" y="2" width="12" height="12" rx="3" fill="#4a4a6a" ${ink(3)}/><path d="M18 12 Q34 24 30 36 Q26 48 18 48 Q10 48 6 36 Q2 24 18 12 Z" fill="#fff" ${ink(3)}/><ellipse cx="13" cy="28" rx="3" ry="6" fill="#fff" opacity="0.8"/>`);
}

export function spotSvg(): string {
  return svgDoc(
    256,
    256,
    `<circle cx="128" cy="128" r="124" fill="url(#sl)"/>`,
    `<radialGradient id="sl"><stop offset="0" stop-color="#fff8d0" stop-opacity="0.85"/><stop offset="0.6" stop-color="#fff8d0" stop-opacity="0.35"/><stop offset="1" stop-color="#fff8d0" stop-opacity="0"/></radialGradient>`,
  );
}
