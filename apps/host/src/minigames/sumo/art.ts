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
      // Bund
      `<ellipse cx="${cx}" cy="${cy + 6}" rx="590" ry="322" fill="url(#base)" ${ink(6)}/>` +
      `<ellipse cx="${cx - 150}" cy="${cy - 120}" rx="260" ry="70" fill="#fff" opacity="0.08"/>` +
      `<ellipse cx="${cx + 220}" cy="${cy + 120}" rx="180" ry="50" fill="#ffd36b" opacity="0.10"/>` +
      `<ellipse cx="${cx - 60}" cy="${cy + 60}" rx="120" ry="34" fill="#ffd36b" opacity="0.12"/>` +
      `<path d="M${cx - 480} ${cy - 200} Q${cx - 300} ${cy - 330} ${cx - 40} ${cy - 338}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.25"/>`,
    linear('wood', '#c98d4b', '#6b3f17') +
      linear('steel', '#f1f4fb', '#8a93a8') +
      linear('rim', '#5d5f78', '#22223a') +
      linear('rimTop', '#8a8ca8', '#3a3b55') +
      radial('base', '#4d4f68', '#1e1f33'),
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
