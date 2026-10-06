import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til Selfie-Kirurgen, tegnet som SVG. */

export const PANEL = { w: 540, h: 450, screenW: 470, screenH: 370 };
export const FRAME = { w: 460, h: 580, canvasW: 330, canvasH: 430 };

/** Mønstret museumstapet (fliser). */
export function wallpaperSvg(): string {
  const s = 160;
  const fleur = (x: number, y: number, k = 1) =>
    `<g transform="translate(${x} ${y}) scale(${k})" fill="#7a2140" opacity="0.9">` +
    `<path d="M0 -34 Q14 -16 6 0 Q20 -6 30 6 Q14 10 6 6 Q10 22 0 34 Q-10 22 -6 6 Q-14 10 -30 6 Q-20 -6 -6 0 Q-14 -16 0 -34 Z"/>` +
    `<circle cx="0" cy="0" r="6" fill="#a8345a"/></g>`;
  return svgDoc(
    s,
    s,
    `<rect width="${s}" height="${s}" fill="#5e1530"/>` +
      fleur(s / 2, s / 2) +
      fleur(0, 0, 0.6) +
      fleur(s, 0, 0.6) +
      fleur(0, s, 0.6) +
      fleur(s, s, 0.6) +
      `<path d="M0 ${s / 2} H${s}" stroke="#4a0f25" stroke-width="2" opacity="0.4"/>`,
  );
}

/** Træpanel (nederst på væggen). */
export function wainscotSvg(): string {
  return svgDoc(
    240,
    260,
    `<rect width="240" height="260" fill="url(#w)"/>` +
      `<rect x="0" y="0" width="240" height="26" fill="url(#cap)"/><rect x="0" y="24" width="240" height="6" fill="#2c140a"/>` +
      `<rect x="22" y="50" width="196" height="176" rx="10" fill="url(#p)" stroke="#2c140a" stroke-width="5"/>` +
      `<rect x="34" y="62" width="172" height="20" rx="8" fill="#fff" opacity="0.08"/>` +
      `<path d="M30 220 H210" stroke="#000" stroke-width="5" opacity="0.15"/>`,
    linear('w', '#6b3a1e', '#3e1f0e') + linear('cap', '#a8693a', '#5a2e14') + linear('p', '#7a4524', '#4a2511'),
  );
}

/** Forgyldt ramme (med hul til lærredet). */
export function goldFrameSvg(): string {
  const { w, h, canvasW: cw, canvasH: ch } = FRAME;
  const ox = (w - cw) / 2;
  const oy = (h - ch) / 2;
  const orn = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})">` +
    `<path d="M0 0 Q30 -6 40 14 Q46 34 26 38 Q10 38 14 22 Q18 12 28 18" fill="none" stroke="#7a4a08" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M0 0 Q30 -6 40 14 Q46 34 26 38 Q10 38 14 22 Q18 12 28 18" fill="none" stroke="#ffe680" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="0" cy="0" r="16" fill="url(#gem)" ${ink(5)}/><circle cx="-5" cy="-5" r="5" fill="#fff" opacity="0.7"/></g>`;
  const beads = Array.from({ length: 22 }, (_, i) => {
    const t = (i + 0.5) / 22;
    return `<circle cx="${ox - 16 + t * 0}" cy="${oy + t * ch}" r="5" fill="#ffe680" opacity="0.8"/>` + `<circle cx="${w - ox + 16}" cy="${oy + t * ch}" r="5" fill="#ffe680" opacity="0.8"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<path fill-rule="evenodd" d="M10 22 H${w - 10} V${h - 2} H10 Z M${ox} ${oy} V${oy + ch} H${ox + cw} V${oy} Z" fill="#000" opacity="0.4"/>` +
      `<path fill-rule="evenodd" d="M8 8 H${w - 8} V${h - 8} H8 Z M${ox} ${oy} V${oy + ch} H${ox + cw} V${oy} Z" fill="url(#g)" ${ink(8)}/>` +
      `<rect x="26" y="26" width="${w - 52}" height="${h - 52}" fill="none" stroke="#7a4a08" stroke-width="5"/>` +
      `<rect x="34" y="34" width="${w - 68}" height="${h - 68}" fill="none" stroke="#fff3a0" stroke-width="3" opacity="0.7"/>` +
      `<rect x="${ox - 12}" y="${oy - 12}" width="${cw + 24}" height="${ch + 24}" fill="none" stroke="url(#g2)" stroke-width="16"/>` +
      `<rect x="${ox - 2}" y="${oy - 2}" width="${cw + 4}" height="${ch + 4}" fill="none" ${ink(6)}/>` +
      beads +
      orn(30, 30, 0) +
      orn(w - 30, 30, 90) +
      orn(w - 30, h - 30, 180) +
      orn(30, h - 30, 270) +
      `<path d="M${w / 2 - 70} 14 Q${w / 2} -10 ${w / 2 + 70} 14 Q${w / 2} 30 ${w / 2 - 70} 14 Z" fill="url(#g)" ${ink(5)}/>` +
      `<circle cx="${w / 2}" cy="12" r="14" fill="url(#gem)" ${ink(5)}/>` +
      shine(40, 14, 150, 8, 0.6) +
      `<path d="M14 60 V${h - 80}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.35"/>`,
    linear('g', '#fff0a0', '#c88a12') +
      linear('g2', '#b07410', '#ffe680') +
      `<radialGradient id="gem" cx="0.35" cy="0.35" r="0.8"><stop offset="0" stop-color="#ff8aa8"/><stop offset="1" stop-color="#a0103a"/></radialGradient>`,
  );
}

/** Mørk, malerisk baggrund på lærredet. */
export function canvasSvg(): string {
  const { canvasW: w, canvasH: h } = FRAME;
  const strokes = Array.from({ length: 26 }, (_, i) => {
    const x = (i * 53) % w;
    const y = (i * 97) % h;
    return `<path d="M${x} ${y} q${20 + (i % 5) * 6} ${-8 + (i % 3) * 6} ${40 + (i % 4) * 10} ${2}" stroke="${i % 2 ? '#5a6a3a' : '#2a1a10'}" stroke-width="${6 + (i % 3) * 3}" stroke-linecap="round" opacity="0.35" fill="none"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#c)"/>` + strokes + `<rect width="${w}" height="${h}" fill="url(#v)"/>`,
    `<radialGradient id="c" cx="0.45" cy="0.35" r="0.8"><stop offset="0" stop-color="#7a6a3a"/><stop offset="0.6" stop-color="#3a2c18"/><stop offset="1" stop-color="#1a120a"/></radialGradient>` +
      `<radialGradient id="v" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>`,
  );
}

/** Krakeleringer + fernis-glans over maleriet. */
export function varnishSvg(): string {
  const { canvasW: w, canvasH: h } = FRAME;
  const cracks = Array.from({ length: 18 }, (_, i) => {
    const x = (i * 71) % w;
    const y = (i * 43 + 30) % h;
    return `<path d="M${x} ${y} l${12 + (i % 4) * 5} ${8 - (i % 3) * 6} l${10} ${12} l${-6} ${14}" stroke="#000" stroke-width="1.5" fill="none" opacity="0.25"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    cracks + `<path d="M0 0 L${w * 0.55} 0 L0 ${h * 0.45} Z" fill="#fff" opacity="0.07"/>` + `<path d="M${w * 0.1} ${h} L${w} ${h * 0.25} L${w} ${h * 0.4} L${w * 0.3} ${h} Z" fill="#fff" opacity="0.05"/>`,
  );
}

/** Hvid pudderparyk (portrættet). */
export function wigSvg(): string {
  const curls = [
    [70, 150], [56, 200], [52, 252], [60, 302], [290, 150], [304, 200], [308, 252], [300, 302],
  ]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="34" ry="26" fill="url(#w)" ${ink(5)}/><path d="M${x - 16} ${y} q16 -14 32 0" fill="none" stroke="#b8b0c8" stroke-width="4"/>`)
    .join('');
  return svgDoc(
    360,
    340,
    `<path d="M60 170 Q40 40 180 30 Q320 40 300 170 Q290 110 240 92 Q180 120 120 92 Q70 110 60 170 Z" fill="url(#w)" ${ink(6)}/>` +
      `<path d="M100 70 Q140 40 180 44" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.8"/>` +
      `<path d="M130 60 q10 20 30 10 M190 56 q10 22 32 12 M240 70 q6 20 26 16" stroke="#b8b0c8" stroke-width="4" fill="none"/>` +
      curls,
    linear('w', '#ffffff', '#d8d0e6'),
  );
}

/** Mørk frakke + blondekrave (portrættet, nederst). */
export function collarSvg(): string {
  return svgDoc(
    330,
    150,
    `<path d="M0 150 L0 80 Q60 40 120 34 L210 34 Q270 40 330 80 L330 150 Z" fill="url(#coat)" ${ink(6)}/>` +
      `<path d="M120 30 Q165 120 210 30 Z" fill="#e8d8b8" ${ink(4)}/>` +
      `<path d="M110 30 Q130 70 150 46 Q165 90 180 46 Q200 70 220 30 Q240 64 206 80 Q190 110 165 96 Q140 110 124 80 Q90 64 110 30 Z" fill="url(#lace)" ${ink(5)}/>` +
      `<circle cx="165" cy="70" r="11" fill="#c0103a" ${ink(4)}/><circle cx="161" cy="66" r="3" fill="#fff" opacity="0.8"/>` +
      `<circle cx="40" cy="120" r="7" fill="#ffd36b" ${ink(3)}/><circle cx="290" cy="120" r="7" fill="#ffd36b" ${ink(3)}/>` +
      `<path d="M30 92 Q70 70 110 64" stroke="#fff" stroke-width="5" fill="none" opacity="0.2"/>`,
    linear('coat', '#3a5a4a', '#1a2a22') + linear('lace', '#ffffff', '#e0d6c6'),
  );
}

/** Messingskilt under maleriet. */
export function plaqueSvg(): string {
  return svgDoc(
    460,
    104,
    `<rect x="6" y="14" width="448" height="86" rx="16" fill="#000" opacity="0.35"/>` +
      `<rect x="6" y="6" width="448" height="86" rx="16" fill="url(#b)" ${ink(6)}/>` +
      `<rect x="20" y="14" width="420" height="14" rx="7" fill="#fff" opacity="0.3"/>` +
      `<circle cx="26" cy="49" r="6" fill="#8a5a10" ${ink(2)}/><circle cx="434" cy="49" r="6" fill="#8a5a10" ${ink(2)}/>`,
    linear('b', '#ffe9a0', '#c08a20'),
  );
}

/** Messingstolpe med fløjlsreb. */
export function ropeSvg(): string {
  const post = (x: number) =>
    `<rect x="${x - 12}" y="40" width="24" height="150" rx="10" fill="url(#brass)" ${ink(5)}/>` +
    `<ellipse cx="${x}" cy="190" rx="44" ry="14" fill="url(#brass)" ${ink(5)}/>` +
    `<circle cx="${x}" cy="34" r="22" fill="url(#brass)" ${ink(5)}/><circle cx="${x - 7}" cy="27" r="6" fill="#fff" opacity="0.7"/>`;
  return svgDoc(
    1000,
    220,
    `<path d="M60 56 Q500 190 940 56" fill="none" stroke="#1a1446" stroke-width="34" stroke-linecap="round"/>` +
      `<path d="M60 56 Q500 190 940 56" fill="none" stroke="url(#vel)" stroke-width="24" stroke-linecap="round"/>` +
      `<path d="M120 76 Q500 176 880 76" fill="none" stroke="#ff8aa8" stroke-width="5" stroke-linecap="round" opacity="0.5"/>` +
      post(60) +
      post(940),
    linear('brass', '#ffe9a0', '#b07a18', true) + linear('vel', '#e0204a', '#7a0820'),
  );
}

/** Spotlys-kegle (gennemsigtig). */
export function spotSvg(): string {
  return svgDoc(
    600,
    1000,
    `<path d="M250 0 L350 0 L600 1000 L0 1000 Z" fill="url(#s)"/>`,
    `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.55"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>`,
  );
}

/** Museets overvågningskamera (med øje!). */
export function cameraSvg(): string {
  return svgDoc(
    200,
    120,
    `<rect x="10" y="10" width="20" height="60" rx="6" fill="#8a93a8" ${ink(5)}/>` +
      `<path d="M30 40 L70 40" stroke="#1a1446" stroke-width="10"/>` +
      `<rect x="60" y="18" width="120" height="56" rx="14" fill="url(#c)" ${ink(6)}/>` +
      `<rect x="170" y="26" width="22" height="40" rx="6" fill="#3a3b55" ${ink(5)}/>` +
      eyes(118, 46, 40, 12, [3, 3]) +
      `<circle cx="80" cy="30" r="5" fill="#ff4b4b"/>` +
      shine(72, 22, 60, 6, 0.5),
    linear('c', '#f1f4fb', '#9aa3b8'),
  );
}

/** Selfie-telefonens ramme i spillerens farve (med hul til skærmen). */
export function phoneFrameSvg(color: string): string {
  const { w, h, screenW: sw, screenH: sh } = PANEL;
  const ox = (w - sw) / 2;
  const oy = (h - sh) / 2 + 4;
  const d = `M${8 + 50} 8 H${w - 58} Q${w - 8} 8 ${w - 8} 58 V${h - 58} Q${w - 8} ${h - 8} ${w - 58} ${h - 8} H58 Q8 ${h - 8} 8 ${h - 58} V58 Q8 8 58 8 Z M${ox + 26} ${oy} Q${ox} ${oy} ${ox} ${oy + 26} V${oy + sh - 26} Q${ox} ${oy + sh} ${ox + 26} ${oy + sh} H${ox + sw - 26} Q${ox + sw} ${oy + sh} ${ox + sw} ${oy + sh - 26} V${oy + 26} Q${ox + sw} ${oy} ${ox + sw - 26} ${oy} Z`;
  return svgDoc(
    w,
    h,
    `<path fill-rule="evenodd" transform="translate(0 10)" d="${d}" fill="#000" opacity="0.35"/>` +
      `<path fill-rule="evenodd" d="${d}" fill="url(#f)" ${ink(8)}/>` +
      `<rect x="${ox - 3}" y="${oy - 3}" width="${sw + 6}" height="${sh + 6}" rx="28" fill="none" stroke="${shade(color, -0.45)}" stroke-width="5"/>` +
      shine(70, 14, 200, 9, 0.5) +
      `<rect x="${w / 2 - 50}" y="12" width="100" height="16" rx="8" fill="${shade(color, -0.5)}"/>` +
      `<circle cx="${w / 2 + 70}" cy="20" r="8" fill="#1a1446"/><circle cx="${w / 2 + 68}" cy="18" r="3" fill="#8ab8ff"/>` +
      `<rect x="${w - 6}" y="110" width="10" height="60" rx="5" fill="${shade(color, -0.3)}" ${ink(4)}/>`,
    linear('f', shade(color, 0.25), shade(color, -0.25)),
  );
}

/** Pastel-baggrund på selfie-skærmen. */
export function screenBgSvg(color: string): string {
  const { screenW: w, screenH: h } = PANEL;
  const dots = Array.from({ length: 16 }, (_, i) => `<circle cx="${(i * 89) % w}" cy="${(i * 53) % h}" r="${8 + (i % 4) * 6}" fill="#fff" opacity="0.12"/>`).join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" rx="26" fill="url(#b)"/>` + dots + `<rect x="0" y="${h - 90}" width="${w}" height="90" fill="#000" opacity="0.06"/>`,
    linear('b', shade(color, 0.72), shade(color, 0.35)),
  );
}

/** Skuldre/trøje (selfie) i spillerens farve. */
export function shirtSvg(color: string): string {
  return svgDoc(
    360,
    120,
    `<path d="M4 120 Q10 40 90 22 L130 14 Q180 60 230 14 L270 22 Q350 40 356 120 Z" fill="url(#s)" ${ink(6)}/>` +
      `<path d="M130 14 Q180 60 230 14" fill="none" stroke="${shade(color, -0.4)}" stroke-width="10"/>` +
      `<path d="M40 70 Q60 44 100 36" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.35"/>`,
    linear('s', shade(color, 0.15), shade(color, -0.25)),
  );
}

/** Pjusket hår i spillerens farve. */
export function hairSvg(color: string): string {
  return svgDoc(
    300,
    150,
    `<path d="M30 140 Q10 70 60 48 Q70 10 120 26 Q150 -6 190 22 Q240 8 250 50 Q300 70 272 140 Q250 96 210 92 Q190 118 150 96 Q110 120 92 92 Q50 100 30 140 Z" fill="url(#h)" ${ink(6)}/>` +
      `<path d="M80 50 Q110 32 140 40" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.45"/>` +
      `<path d="M150 22 Q160 -4 186 6" stroke="${shade(color, -0.4)}" stroke-width="8" fill="none" stroke-linecap="round"/>`,
    linear('h', shade(color, 0.3), shade(color, -0.2)),
  );
}

/** Latexhandske-cursor (peger), manchet i spillerens farve. */
export function gloveSvg(color: string): string {
  return svgDoc(
    110,
    130,
    `<path d="M30 6 Q42 0 46 14 L50 56 Q58 48 68 54 Q80 50 86 60 Q98 58 100 72 L100 96 Q98 120 70 124 L44 124 Q22 120 18 98 L10 70 Q8 60 18 60 Q26 62 28 72 L28 16 Q28 8 30 6 Z" fill="url(#g)" ${ink(6)}/>` +
      `<path d="M50 60 L52 78 M68 58 L68 78 M86 64 L86 80" stroke="#1a1446" stroke-width="4" stroke-linecap="round" opacity="0.6"/>` +
      `<rect x="38" y="104" width="64" height="22" rx="8" fill="${color}" ${ink(5)}/>` +
      `<path d="M34 12 L36 40" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`,
    linear('g', '#e6f6ff', '#8fd0f0'),
  );
}

/** Stjerne-badge bag procent-tallet. */
export function burstSvg(color: string): string {
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = i % 2 ? 78 : 100;
    return `${110 + Math.cos(a) * r},${110 + Math.sin(a) * r}`;
  }).join(' ');
  return svgDoc(
    220,
    220,
    `<polygon points="${pts}" fill="url(#b)" ${ink(7)}/>` + `<circle cx="110" cy="110" r="64" fill="none" stroke="#fff" stroke-width="5" opacity="0.4"/>` + shine(70, 50, 60, 10, 0.5),
    radial('b', shade(color, 0.35), shade(color, -0.2)),
  );
}

/** Støvkorn i spotlyset. */
export function moteSvg(): string {
  return svgDoc(24, 24, `<circle cx="12" cy="12" r="10" fill="url(#m)"/>`, `<radialGradient id="m"><stop offset="0" stop-color="#fff6c8" stop-opacity="1"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>`);
}

/** Parketgulv. */
export function floorSvg(): string {
  return svgDoc(
    200,
    100,
    `<rect width="200" height="100" fill="#8a5428"/>` +
      `<rect x="0" y="0" width="100" height="50" fill="#9a6234" stroke="#5a3214" stroke-width="3"/>` +
      `<rect x="100" y="50" width="100" height="50" fill="#9a6234" stroke="#5a3214" stroke-width="3"/>` +
      `<rect x="100" y="0" width="100" height="50" fill="#7a4622" stroke="#5a3214" stroke-width="3"/>` +
      `<rect x="0" y="50" width="100" height="50" fill="#7a4622" stroke="#5a3214" stroke-width="3"/>` +
      `<rect x="10" y="6" width="60" height="6" rx="3" fill="#fff" opacity="0.12"/>`,
  );
}
