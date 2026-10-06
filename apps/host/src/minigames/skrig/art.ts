import { shade } from '@samigame/shared';
import { ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til Skrige-Ballonen, tegnet som SVG. */

/** Ballon-teksturens størrelse. Kroppens radius = BR (bredde), højde = BR * 1.15. */
export const BAL = { w: 300, h: 380, BR: 130, cx: 150, cy: 175 };

export type Fear = 0 | 1 | 2 | 3;

/** Ballonkrop i spillerens farve (uden ansigt). Origin bør sættes ved knuden. */
export function balloonSvg(color: string): string {
  const { w, h, BR, cx, cy } = BAL;
  const ry = BR * 1.15;
  const knotY = cy + ry;
  return svgDoc(
    w,
    h,
    `<path d="M${cx} ${cy - ry} C${cx + BR * 1.38} ${cy - ry} ${cx + BR * 1.15} ${cy + ry * 0.75} ${cx} ${knotY} C${cx - BR * 1.15} ${cy + ry * 0.75} ${cx - BR * 1.38} ${cy - ry} ${cx} ${cy - ry} Z" fill="url(#b)" ${ink(8)}/>` +
      `<path d="M${cx - 16} ${knotY + 22} L${cx} ${knotY - 4} L${cx + 16} ${knotY + 22} Q${cx} ${knotY + 14} ${cx - 16} ${knotY + 22} Z" fill="${shade(color, -0.2)}" ${ink(6)}/>` +
      `<ellipse cx="${cx - BR * 0.48}" cy="${cy - ry * 0.45}" rx="${BR * 0.2}" ry="${BR * 0.38}" transform="rotate(25 ${cx - BR * 0.48} ${cy - ry * 0.45})" fill="#fff" opacity="0.55"/>` +
      `<circle cx="${cx - BR * 0.62}" cy="${cy - ry * 0.02}" r="${BR * 0.07}" fill="#fff" opacity="0.6"/>` +
      `<path d="M${cx + BR * 0.6} ${cy + ry * 0.2} Q${cx + BR * 0.55} ${cy + ry * 0.55} ${cx + BR * 0.25} ${cy + ry * 0.75}" fill="none" stroke="${shade(color, -0.35)}" stroke-width="10" stroke-linecap="round" opacity="0.5"/>`,
    `<radialGradient id="b" cx="0.38" cy="0.32" r="0.8"><stop offset="0" stop-color="${shade(color, 0.45)}"/><stop offset="0.55" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.35)}"/></radialGradient>`,
  );
}

/** Rød advarselsglød (samme form som ballonen). */
export function glowSvg(): string {
  const { w, h, BR, cx, cy } = BAL;
  const ry = BR * 1.15;
  return svgDoc(
    w,
    h,
    `<path d="M${cx} ${cy - ry} C${cx + BR * 1.38} ${cy - ry} ${cx + BR * 1.15} ${cy + ry * 0.75} ${cx} ${cy + ry} C${cx - BR * 1.15} ${cy + ry * 0.75} ${cx - BR * 1.38} ${cy - ry} ${cx} ${cy - ry} Z" fill="url(#g)"/>`,
    `<radialGradient id="g" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#ff2020" stop-opacity="0.15"/><stop offset="1" stop-color="#ff0000" stop-opacity="0.75"/></radialGradient>`,
  );
}

/** Ansigt på ballonen – bliver mere og mere bange. Tegnet i samme koordinatsystem som ballonen. */
export function faceSvg(fear: Fear): string {
  const { w, h, cx, cy } = BAL;
  const ey = cy - 18;
  const eye = (x: number, rx: number, ry: number, px: number, py: number, pr: number) =>
    `<ellipse cx="${x}" cy="${ey}" rx="${rx}" ry="${ry}" fill="#fff" ${ink(5)}/>` + `<circle cx="${x + px}" cy="${ey + py}" r="${pr}" fill="#1a1446"/>` + `<circle cx="${x + px + pr * 0.35}" cy="${ey + py - pr * 0.4}" r="${pr * 0.35}" fill="#fff"/>`;
  let body = '';
  if (fear === 0) {
    body =
      eye(cx - 36, 18, 20, 3, 3, 9) +
      eye(cx + 36, 18, 20, 3, 3, 9) +
      `<path d="M${cx - 30} ${cy + 26} Q${cx} ${cy + 56} ${cx + 30} ${cy + 26}" fill="none" ${ink(7)}/>` +
      `<ellipse cx="${cx - 66}" cy="${cy + 20}" rx="14" ry="8" fill="#ff8ab0" opacity="0.6"/><ellipse cx="${cx + 66}" cy="${cy + 20}" rx="14" ry="8" fill="#ff8ab0" opacity="0.6"/>`;
  } else if (fear === 1) {
    body =
      eye(cx - 36, 19, 22, -2, 0, 9) +
      eye(cx + 36, 19, 22, -2, 0, 9) +
      `<path d="M${cx - 58} ${ey - 34} L${cx - 20} ${ey - 28} M${cx + 58} ${ey - 34} L${cx + 20} ${ey - 28}" ${ink(6)}/>` +
      `<path d="M${cx - 26} ${cy + 36} L${cx + 26} ${cy + 32}" ${ink(7)}/>` +
      `<path d="M${cx + 78} ${cy - 50} q-10 18 0 26 q10 -8 0 -26 Z" fill="#8fe0ff" ${ink(3)}/>`;
  } else if (fear === 2) {
    body =
      eye(cx - 38, 24, 28, 0, -2, 8) +
      eye(cx + 38, 24, 28, 0, -2, 8) +
      `<path d="M${cx - 66} ${ey - 46} L${cx - 22} ${ey - 32} M${cx + 66} ${ey - 46} L${cx + 22} ${ey - 32}" ${ink(6)}/>` +
      `<path d="M${cx - 32} ${cy + 38} q8 -12 16 0 q8 12 16 0 q8 -12 16 0 q8 12 16 0" fill="none" ${ink(6)}/>` +
      `<path d="M${cx + 84} ${cy - 56} q-12 22 0 30 q12 -8 0 -30 Z" fill="#8fe0ff" ${ink(3)}/>` +
      `<path d="M${cx - 90} ${cy - 30} q-12 22 0 30 q12 -8 0 -30 Z" fill="#8fe0ff" ${ink(3)}/>`;
  } else {
    body =
      eye(cx - 40, 28, 34, 0, 0, 6) +
      eye(cx + 40, 28, 34, 0, 0, 6) +
      `<path d="M${cx - 74} ${ey - 52} L${cx - 26} ${ey - 30} M${cx + 74} ${ey - 52} L${cx + 26} ${ey - 30}" ${ink(7)}/>` +
      `<ellipse cx="${cx}" cy="${cy + 50}" rx="30" ry="36" fill="#5a0a2a" ${ink(7)}/>` +
      `<ellipse cx="${cx}" cy="${cy + 68}" rx="18" ry="10" fill="#ff7a9a"/>` +
      `<path d="M${cx - 18} ${cy + 22} h36" stroke="#fff" stroke-width="8"/>` +
      // Tårer
      `<path d="M${cx - 64} ${ey + 22} q-6 30 -2 60" stroke="#8fe0ff" stroke-width="9" fill="none" stroke-linecap="round"/>` +
      `<path d="M${cx + 64} ${ey + 22} q6 30 2 60" stroke="#8fe0ff" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  }
  return svgDoc(w, h, body);
}

/** Skrige-tragt (megafon) som spilleren råber i. Mundstykket til venstre. */
export function hornSvg(color: string): string {
  return svgDoc(
    180,
    140,
    `<path d="M10 58 L80 46 L160 8 Q178 70 160 132 L80 94 L10 82 Z" fill="url(#h)" ${ink(7)}/>` +
      `<ellipse cx="160" cy="70" rx="16" ry="62" fill="${shade(color, -0.45)}" ${ink(6)}/>` +
      `<rect x="2" y="54" width="20" height="32" rx="6" fill="#3a3b55" ${ink(5)}/>` +
      `<path d="M40 60 L140 26" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.45"/>`,
    linear('h', shade(color, 0.35), shade(color, -0.2)),
  );
}

/** Lydbølge-bue (partikel). */
export function waveSvg(): string {
  return svgDoc(60, 100, `<path d="M14 8 Q50 50 14 92" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`);
}

/** Gummistump (sprængt ballon). */
export function shardSvg(): string {
  return svgDoc(40, 30, `<path d="M4 6 Q20 0 36 8 Q30 18 34 26 Q16 22 6 26 Q10 16 4 6 Z" fill="#fff" ${ink(3)}/>`);
}

/** Pariserhjul (baggrund, roterer). */
export function wheelSvg(): string {
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<line x1="250" y1="250" x2="${250 + Math.cos(a) * 220}" y2="${250 + Math.sin(a) * 220}" stroke="#ffd36b" stroke-width="6"/>`;
  }).join('');
  const cars = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const col = ['#ff5fa2', '#47b8ff', '#ffcf3a', '#3ee6a8'][i % 4];
    return `<circle cx="${250 + Math.cos(a) * 220}" cy="${250 + Math.sin(a) * 220}" r="22" fill="${col}" ${ink(5)}/>`;
  }).join('');
  return svgDoc(500, 500, `<circle cx="250" cy="250" r="220" fill="none" stroke="#ffd36b" stroke-width="12"/><circle cx="250" cy="250" r="150" fill="none" stroke="#ffd36b" stroke-width="5" opacity="0.7"/>` + spokes + cars + `<circle cx="250" cy="250" r="26" fill="#ff8a2b" ${ink(6)}/>`);
}

/** Pariserhjulets stativ. */
export function wheelStandSvg(): string {
  return svgDoc(500, 360, `<path d="M250 20 L80 350 M250 20 L420 350" stroke="#1a1446" stroke-width="22" stroke-linecap="round"/><path d="M250 20 L80 350 M250 20 L420 350" stroke="#7a5ab8" stroke-width="12" stroke-linecap="round"/><rect x="40" y="336" width="420" height="22" rx="10" fill="#4a3a7a" ${ink(5)}/>`);
}

/** Bakker i horisonten. */
export function hillsSvg(): string {
  return svgDoc(
    1920,
    380,
    `<path d="M0 200 Q240 80 520 180 Q780 280 1040 150 Q1320 30 1600 160 Q1780 230 1920 140 V380 H0 Z" fill="url(#h1)" ${ink(6)}/>` +
      `<path d="M0 290 Q300 200 640 270 Q960 330 1280 240 Q1600 170 1920 260 V380 H0 Z" fill="url(#h2)" ${ink(6)}/>`,
    linear('h1', '#6a4ab8', '#3a2a7a') + linear('h2', '#8a5ad0', '#4a2a8a'),
  );
}

/** Flagranke (vimpler). */
export function buntingSvg(): string {
  const cols = ['#ff5fa2', '#ffcf3a', '#47b8ff', '#3ee6a8', '#ff8a2b', '#9b5cff'];
  const flags = Array.from({ length: 16 }, (_, i) => {
    const x = 20 + i * 62;
    const y = 18 + Math.sin((i / 15) * Math.PI) * 60;
    return `<path d="M${x} ${y} L${x + 50} ${y + 2} L${x + 24} ${y + 56} Z" fill="${cols[i % cols.length]}" ${ink(4)}/>`;
  }).join('');
  return svgDoc(1020, 140, `<path d="M0 16 Q510 150 1020 16" fill="none" stroke="#1a1446" stroke-width="5"/>` + flags);
}

/** Lille scene/podie i spillerens farve. */
export function stageSvg(color: string): string {
  return svgDoc(
    320,
    110,
    `<ellipse cx="160" cy="80" rx="154" ry="26" fill="#000" opacity="0.3"/>` +
      `<path d="M8 40 L8 70 Q160 112 312 70 L312 40 Z" fill="url(#s)" ${ink(6)}/>` +
      `<ellipse cx="160" cy="40" rx="152" ry="32" fill="url(#t)" ${ink(6)}/>` +
      `<ellipse cx="120" cy="30" rx="70" ry="10" fill="#fff" opacity="0.35"/>` +
      shine(30, 56, 40, 6, 0.3),
    linear('s', shade(color, -0.05), shade(color, -0.45)) + radial('t', shade(color, 0.5), shade(color, 0.1)),
  );
}

/** Målebånd-skilt til afsløringen. */
export function tagSvg(color: string): string {
  return svgDoc(
    220,
    110,
    `<rect x="8" y="16" width="204" height="86" rx="20" fill="#000" opacity="0.3"/>` +
      `<rect x="8" y="8" width="204" height="86" rx="20" fill="url(#t)" ${ink(6)}/>` +
      Array.from({ length: 9 }, (_, i) => `<path d="M${30 + i * 20} 10 V${i % 2 ? 22 : 30}" stroke="#1a1446" stroke-width="3"/>`).join('') +
      shine(26, 14, 80, 6, 0.4),
    linear('t', shade(color, 0.4), shade(color, -0.1)),
  );
}
