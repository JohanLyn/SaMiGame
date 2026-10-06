import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/**
 * Al grafik til KAOS-TÅRNET (finalen), tegnet som SVG.
 * Tårnet er stablet af madrasser, puder og køkkenting – mange af dem med øjne.
 */

const INK = '#1a1446';

/** Blød skygge under et tårn-element. */
const drop = (w: number, h: number) => `<ellipse cx="${w / 2}" cy="${h - 10}" rx="${w / 2 - 14}" ry="12" fill="#000" opacity="0.28"/>`;

// -----------------------------------------------------------------------------
// Tårnets dele. Alle tegnes med bunden ved y = h (origin 0.5, 1) og passer til displaystørrelsen.

export interface SegmentArt {
  key: string;
  w: number;
  h: number;
  svg: () => string;
  /** Hvor meget af højden figurer kan klatre på (top-kanten). */
  climbInset?: number;
}

export function mattressSvg(w: number, h: number, base: string, stripe: string): string {
  const bx = 14;
  const by = 12;
  const bw = w - 28;
  const bh = h - 34;
  const buttons = Array.from({ length: 7 }, (_, i) => {
    const x = bx + 70 + (i * (bw - 140)) / 6;
    const y = by + bh * 0.5;
    return `<path d="M${x - 16} ${y - 12} L${x} ${y} L${x - 16} ${y + 12} M${x + 16} ${y - 12} L${x} ${y} L${x + 16} ${y + 12}" stroke="${shade(base, -0.35)}" stroke-width="3" fill="none" opacity="0.6"/>` +
      `<circle cx="${x}" cy="${y}" r="7" fill="${shade(base, -0.25)}" ${ink(3)}/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    drop(w, h) +
      `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="38" fill="url(#mb)" ${ink(8)}/>` +
      `<g clip-path="url(#mc)"><rect x="0" y="0" width="${w}" height="${h}" fill="url(#mp)" opacity="0.55"/>` +
      `<rect x="0" y="${by + bh * 0.62}" width="${w}" height="${bh}" fill="${INK}" opacity="0.14"/></g>` +
      `<rect x="${bx + 14}" y="${by + 10}" width="${bw - 28}" height="${bh - 20}" rx="28" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="14 10" opacity="0.6"/>` +
      buttons +
      shine(bx + 40, by + 8, bw * 0.45, 10, 0.55) +
      // Mærkat
      `<rect x="${bx + bw - 90}" y="${by + bh - 34}" width="56" height="26" rx="6" fill="#fff" ${ink(3)}/><path d="M${bx + bw - 80} ${by + bh - 22} h36 M${bx + bw - 80} ${by + bh - 15} h24" stroke="${INK}" stroke-width="3"/>`,
    linear('mb', shade(base, 0.25), shade(base, -0.15)) +
      `<pattern id="mp" width="44" height="10" patternUnits="userSpaceOnUse"><rect width="22" height="10" fill="${stripe}"/></pattern>` +
      `<clipPath id="mc"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="38"/></clipPath>`,
  );
}

export function pillowSvg(w: number, h: number, color: string): string {
  const t = 16;
  const b = h - 26;
  const path = `M30 ${t + 10} Q${w * 0.25} ${t - 10} ${w / 2} ${t + 4} Q${w * 0.75} ${t - 10} ${w - 30} ${t + 10} Q${w - 6} ${h / 2} ${w - 30} ${b} Q${w * 0.75} ${b + 14} ${w / 2} ${b - 4} Q${w * 0.25} ${b + 14} 30 ${b} Q6 ${h / 2} 30 ${t + 10} Z`;
  return svgDoc(
    w,
    h,
    drop(w, h) +
      `<path d="${path}" fill="url(#pg)" ${ink(8)}/>` +
      `<path d="M70 ${t + 26} Q${w / 2} ${t + 6} ${w - 70} ${t + 26}" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.55"/>` +
      // Søvnige øjne + sutte-mund
      `<path d="M${w / 2 - 70} ${h / 2} q22 16 44 0 M${w / 2 + 26} ${h / 2} q22 16 44 0" fill="none" ${ink(6)}/>` +
      `<ellipse cx="${w / 2 - 90}" cy="${h / 2 + 22}" rx="18" ry="9" fill="#ff7aa8" opacity="0.6"/><ellipse cx="${w / 2 + 90}" cy="${h / 2 + 22}" rx="18" ry="9" fill="#ff7aa8" opacity="0.6"/>` +
      `<ellipse cx="${w / 2}" cy="${h / 2 + 26}" rx="9" ry="7" fill="${INK}"/>` +
      // Kvaster
      [30, w - 30].map((x) => `<circle cx="${x}" cy="${t + 10}" r="9" fill="${shade(color, -0.3)}" ${ink(4)}/><circle cx="${x}" cy="${b}" r="9" fill="${shade(color, -0.3)}" ${ink(4)}/>`).join('') ,
    radial('pg', shade(color, 0.45), shade(color, -0.12)),
  );
}

export function potSvg(w: number, h: number): string {
  const x0 = 60;
  const x1 = w - 60;
  return svgDoc(
    w,
    h,
    drop(w, h) +
      // Hanke
      `<rect x="8" y="70" width="70" height="34" rx="16" fill="#3a3b55" ${ink(7)}/><rect x="${w - 78}" y="70" width="70" height="34" rx="16" fill="#3a3b55" ${ink(7)}/>` +
      `<path d="M${x0} 40 L${x1} 40 L${x1 - 10} ${h - 26} Q${w / 2} ${h - 14} ${x0 + 10} ${h - 26} Z" fill="url(#ps)" ${ink(8)}/>` +
      `<rect x="${x0 - 18}" y="22" width="${x1 - x0 + 36}" height="34" rx="16" fill="url(#pr)" ${ink(8)}/>` +
      `<rect x="${x0 + 30}" y="70" width="34" height="${h - 120}" rx="17" fill="#fff" opacity="0.35"/>` +
      `<rect x="${x0 + 80}" y="70" width="14" height="${h - 140}" rx="7" fill="#fff" opacity="0.25"/>` +
      eyes(w / 2, 118, 70, 22, [-3, 5]) +
      // Bekymrede bryn og mund
      `<path d="M${w / 2 - 66} 82 L${w / 2 - 24} 92 M${w / 2 + 66} 82 L${w / 2 + 24} 92" ${ink(6)}/>` +
      `<path d="M${w / 2 - 28} 176 q14 -14 28 0 q14 14 28 0" fill="none" ${ink(6)}/>` +
      // Suppe der bobler over kanten
      `<path d="M${x0 - 6} 26 Q${x0 + 40} 0 ${x0 + 90} 22 Q${w / 2} 4 ${w / 2 + 60} 24 Q${x1 - 40} 2 ${x1 + 4} 26 Z" fill="#ff8a2b" ${ink(6)}/>` +
      `<circle cx="${w / 2 - 40}" cy="12" r="9" fill="#ffb36b" ${ink(4)}/><circle cx="${x1 - 70}" cy="14" r="7" fill="#ffb36b" ${ink(4)}/>`,
    linear('ps', '#c9cfe0', '#6d7590', true) + linear('pr', '#eef2fb', '#9aa3bb'),
  );
}

export function pancakesSvg(w: number, h: number): string {
  const layers = [0, 1, 2, 3].map((i) => {
    const y = h - 50 - i * 34;
    const inset = 24 + (i % 2) * 14 + i * 6;
    return `<rect x="${inset}" y="${y}" width="${w - inset * 2}" height="40" rx="20" fill="url(#pc)" ${ink(7)}/>` +
      `<rect x="${inset + 10}" y="${y + 26}" width="${w - inset * 2 - 20}" height="9" rx="4" fill="#b8641e" opacity="0.6"/>`;
  }).join('');
  const top = h - 50 - 3 * 34;
  return svgDoc(
    w,
    h,
    drop(w, h) +
      layers +
      // Sirup
      `<path d="M${w * 0.2} ${top + 4} Q${w / 2} ${top - 18} ${w * 0.8} ${top + 4} L${w * 0.78} ${top + 40} Q${w * 0.76} ${top + 70} ${w * 0.73} ${top + 40} L${w * 0.6} ${top + 22} L${w * 0.55} ${top + 90} Q${w * 0.52} ${top + 112} ${w * 0.49} ${top + 90} L${w * 0.46} ${top + 22} L${w * 0.32} ${top + 30} Q${w * 0.3} ${top + 58} ${w * 0.27} ${top + 30} Z" fill="url(#sy)" ${ink(6)} opacity="0.95"/>` +
      // Smørklat
      `<rect x="${w / 2 - 40}" y="${top - 36}" width="80" height="44" rx="10" fill="#fff3a0" ${ink(6)}/><rect x="${w / 2 - 30}" y="${top - 30}" width="34" height="8" rx="4" fill="#fff" opacity="0.8"/>` +
      shine(w * 0.25, top + 8, w * 0.12, 7, 0.6),
    linear('pc', '#ffd27a', '#e08a2e') + linear('sy', '#c0671d', '#7a3a10'),
  );
}

export function booksSvg(w: number, h: number): string {
  const books = [
    { x: 20, w: w - 40, c: '#ff5f6d' },
    { x: 60, w: w - 110, c: '#3d8bff' },
    { x: 34, w: w - 80, c: '#3ccf5a' },
  ];
  const bh = (h - 30) / 3;
  return svgDoc(
    w,
    h,
    drop(w, h) +
      books
        .map((b, i) => {
          const y = h - 22 - (i + 1) * bh;
          return `<rect x="${b.x}" y="${y}" width="${b.w}" height="${bh}" rx="10" fill="url(#b${i})" ${ink(7)}/>` +
            `<rect x="${b.x + b.w - 70}" y="${y + 10}" width="52" height="${bh - 20}" rx="6" fill="#fff6e0" ${ink(4)}/>` +
            `<path d="M${b.x + b.w - 62} ${y + 18} v${bh - 36} M${b.x + b.w - 50} ${y + 18} v${bh - 36} M${b.x + b.w - 38} ${y + 18} v${bh - 36}" stroke="#d8c8a8" stroke-width="3"/>` +
            `<rect x="${b.x + 40}" y="${y + bh / 2 - 9}" width="${b.w * 0.35}" height="18" rx="9" fill="#ffcf3a" ${ink(4)}/>` +
            `<rect x="${b.x + 18}" y="${y + 8}" width="${b.w * 0.4}" height="8" rx="4" fill="#fff" opacity="0.4"/>`;
        })
        .join(''),
    books.map((b, i) => linear(`b${i}`, shade(b.c, 0.2), shade(b.c, -0.25))).join(''),
  );
}

export function cushionSvg(w: number, h: number, color: string): string {
  const checks = Array.from({ length: Math.floor(w / 60) }, (_, i) => `<rect x="${i * 60}" y="0" width="22" height="${h}" fill="#fff" opacity="0.14"/>`).join('') +
    Array.from({ length: 4 }, (_, i) => `<rect x="0" y="${12 + i * 36}" width="${w}" height="14" fill="#fff" opacity="0.12"/>`).join('');
  return svgDoc(
    w,
    h,
    drop(w, h) +
      `<rect x="16" y="14" width="${w - 32}" height="${h - 36}" rx="44" fill="url(#cg)" ${ink(8)}/>` +
      `<g clip-path="url(#cc)">${checks}<rect x="0" y="${h * 0.6}" width="${w}" height="${h}" fill="${INK}" opacity="0.15"/></g>` +
      `<rect x="30" y="26" width="${w - 60}" height="${h - 60}" rx="34" fill="none" stroke="${shade(color, -0.35)}" stroke-width="5" opacity="0.7"/>` +
      `<circle cx="${w / 2}" cy="${h / 2 - 8}" r="12" fill="${shade(color, -0.3)}" ${ink(4)}/>` +
      shine(60, 22, w * 0.4, 10, 0.5),
    linear('cg', shade(color, 0.25), shade(color, -0.12)) + `<clipPath id="cc"><rect x="16" y="14" width="${w - 32}" height="${h - 36}" rx="44"/></clipPath>`,
  );
}

export function toasterSvg(w: number, h: number): string {
  const x0 = 40;
  const x1 = w - 40;
  const top = 74;
  return svgDoc(
    w,
    h,
    drop(w, h) +
      // Toast der springer op
      `<rect x="${w / 2 - 150}" y="8" width="120" height="110" rx="26" fill="url(#tb)" ${ink(6)}/><rect x="${w / 2 - 140}" y="20" width="100" height="90" rx="20" fill="#fff0c8"/>` +
      `<rect x="${w / 2 + 30}" y="20" width="120" height="100" rx="26" fill="url(#tb)" ${ink(6)} transform="rotate(8 ${w / 2 + 90} 70)"/><rect x="${w / 2 + 40}" y="32" width="100" height="80" rx="20" fill="#fff0c8" transform="rotate(8 ${w / 2 + 90} 70)"/>` +
      `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${h - top - 24}" rx="46" fill="url(#ts)" ${ink(8)}/>` +
      `<rect x="${w / 2 - 170}" y="${top - 4}" width="140" height="18" rx="9" fill="${INK}"/><rect x="${w / 2 + 30}" y="${top - 4}" width="140" height="18" rx="9" fill="${INK}"/>` +
      `<rect x="${x0 + 26}" y="${top + 16}" width="${(x1 - x0) * 0.5}" height="16" rx="8" fill="#fff" opacity="0.6"/>` +
      `<rect x="${x1 - 6}" y="${top + 50}" width="26" height="70" rx="10" fill="#ff4b4b" ${ink(5)}/>` +
      // Sure øjne (Bent!)
      eyes(w / 2, top + 76, 90, 22, [2, 4]) +
      `<path d="M${w / 2 - 82} ${top + 40} L${w / 2 - 20} ${top + 58} M${w / 2 + 82} ${top + 40} L${w / 2 + 20} ${top + 58}" ${ink(8)}/>` +
      `<path d="M${w / 2 - 40} ${top + 130} Q${w / 2} ${top + 108} ${w / 2 + 40} ${top + 130}" fill="none" ${ink(7)}/>`,
    linear('ts', '#eef2fb', '#8d95ad') + linear('tb', '#e8a050', '#a85e1a'),
  );
}

export function cakeSvg(w: number, h: number): string {
  const body = `<rect x="34" y="40" width="${w - 68}" height="${h - 64}" rx="22" fill="url(#ck)" ${ink(8)}/>`;
  const drips = Array.from({ length: 9 }, (_, i) => {
    const x = 50 + i * ((w - 100) / 8);
    const d = 30 + ((i * 37) % 40);
    return `L${x} 40 Q${x} ${40 + d} ${x + 18} ${40 + d} Q${x + 36} ${40 + d} ${x + 36} 40`;
  }).join(' ');
  const icing = `<path d="M34 50 Q34 28 60 28 L${w - 60} 28 Q${w - 34} 28 ${w - 34} 50 ${drips.replace(/^L/, 'L')} Z" fill="url(#ic)" ${ink(6)}/>`;
  const sprinkles = Array.from({ length: 22 }, (_, i) => {
    const x = 60 + ((i * 97) % (w - 120));
    const y = 96 + ((i * 41) % (h - 140));
    const c = ['#3ee6a8', '#47b8ff', '#ffcf3a', '#9b5cff', '#ffffff'][i % 5];
    return `<rect x="${x}" y="${y}" width="14" height="5" rx="2.5" fill="${c}" transform="rotate(${(i * 53) % 180} ${x + 7} ${y + 2})"/>`;
  }).join('');
  const cherries = [0.25, 0.5, 0.75].map((f) => `<path d="M${w * f} 16 q8 -16 22 -18" stroke="#3a7a2a" stroke-width="4" fill="none"/><circle cx="${w * f}" cy="22" r="15" fill="#ff3b5c" ${ink(5)}/><circle cx="${w * f - 5}" cy="16" r="4" fill="#fff" opacity="0.8"/>`).join('');
  return svgDoc(w, h, drop(w, h) + body + `<rect x="34" y="${h - 70}" width="${w - 68}" height="16" fill="#8a3a2a" opacity="0.35"/>` + sprinkles + icing + cherries + shine(70, 32, w * 0.3, 8, 0.6), linear('ck', '#d98a4e', '#9a5226') + linear('ic', '#ffd1e4', '#ff7aa8'));
}

export function washerSvg(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2 + 22;
  return svgDoc(
    w,
    h,
    drop(w, h) +
      `<rect x="36" y="12" width="${w - 72}" height="${h - 36}" rx="30" fill="url(#wb)" ${ink(8)}/>` +
      `<rect x="36" y="12" width="${w - 72}" height="54" rx="26" fill="#d6dcef" ${ink(6)}/>` +
      `<circle cx="${w - 90}" cy="39" r="13" fill="#3ee6a8" ${ink(4)}/><circle cx="${w - 130}" cy="39" r="9" fill="#ffcf3a" ${ink(4)}/><rect x="70" y="30" width="110" height="18" rx="9" fill="#2a1f7a" ${ink(3)}/>` +
      // Vinduet er ét kæmpe øje
      `<circle cx="${cx}" cy="${cy}" r="${h * 0.3}" fill="#9aa3bb" ${ink(8)}/>` +
      `<circle cx="${cx}" cy="${cy}" r="${h * 0.24}" fill="url(#wg)" ${ink(6)}/>` +
      `<circle cx="${cx + 8}" cy="${cy + 6}" r="${h * 0.11}" fill="${INK}"/><circle cx="${cx + 18}" cy="${cy - 6}" r="${h * 0.035}" fill="#fff"/>` +
      `<path d="M${cx - h * 0.2} ${cy + h * 0.06} q16 -10 32 0 q16 10 32 0" stroke="#ff5fa2" stroke-width="7" fill="none" opacity="0.8"/>` +
      `<path d="M${cx - h * 0.16} ${cy - h * 0.14} a${h * 0.2} ${h * 0.2} 0 0 1 ${h * 0.2} -${h * 0.07}" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.7"/>` +
      shine(60, 74, 24, 90, 0.25),
    linear('wb', '#ffffff', '#c3cade') + radial('wg', '#bfeaff', '#47b8ff'),
  );
}

export function sofaSvg(w: number, h: number): string {
  return svgDoc(
    w,
    h,
    `<ellipse cx="${w / 2}" cy="${h - 14}" rx="${w / 2 - 10}" ry="18" fill="#000" opacity="0.3"/>` +
      // Ben
      `<rect x="90" y="${h - 50}" width="34" height="40" rx="8" fill="#6b3f17" ${ink(6)}/><rect x="${w - 124}" y="${h - 50}" width="34" height="40" rx="8" fill="#6b3f17" ${ink(6)}/>` +
      // Ryg
      `<rect x="70" y="20" width="${w - 140}" height="${h * 0.55}" rx="50" fill="url(#sb)" ${ink(9)}/>` +
      // Sæde
      `<rect x="40" y="${h * 0.45}" width="${w - 80}" height="${h * 0.42}" rx="40" fill="url(#ss)" ${ink(9)}/>` +
      `<path d="M${w / 3} ${h * 0.47} v${h * 0.36} M${(w * 2) / 3} ${h * 0.47} v${h * 0.36}" stroke="${INK}" stroke-width="5" opacity="0.5"/>` +
      // Armlæn
      `<rect x="10" y="${h * 0.32}" width="110" height="${h * 0.56}" rx="46" fill="url(#sa)" ${ink(9)}/><rect x="${w - 120}" y="${h * 0.32}" width="110" height="${h * 0.56}" rx="46" fill="url(#sa)" ${ink(9)}/>` +
      shine(110, 34, w * 0.35, 12, 0.4) +
      shine(70, h * 0.48, w * 0.25, 10, 0.35) +
      // Fjernbetjening og en sok
      `<rect x="${w * 0.6}" y="${h * 0.4}" width="70" height="26" rx="8" fill="#3a3b55" ${ink(5)}/><circle cx="${w * 0.6 + 18}" cy="${h * 0.4 + 13}" r="5" fill="#ff4b4b"/>`,
    linear('sb', '#a07cff', '#5b34c9') + linear('ss', '#b996ff', '#7046e0') + linear('sa', '#9068ff', '#4a2aa8'),
  );
}

/** Tårnets top: en kongelig fløjlspude med guldkvaster, som pokalen står på. */
export function royalCushionSvg(w: number, h: number): string {
  const t = 22;
  const b = h - 26;
  const path = `M40 ${t + 12} Q${w / 2} ${t - 12} ${w - 40} ${t + 12} Q${w - 14} ${h / 2} ${w - 40} ${b} Q${w / 2} ${b + 16} 40 ${b} Q14 ${h / 2} 40 ${t + 12} Z`;
  const tassel = (x: number, y: number) =>
    `<path d="M${x} ${y} l-14 40 h28 Z" fill="url(#gd)" ${ink(5)}/><circle cx="${x}" cy="${y}" r="11" fill="url(#gd)" ${ink(5)}/>`;
  return svgDoc(
    w,
    h + 30,
    `<ellipse cx="${w / 2}" cy="${h + 6}" rx="${w / 2 - 20}" ry="14" fill="#000" opacity="0.3"/>` +
      `<path d="${path}" fill="url(#rv)" ${ink(8)}/>` +
      `<path d="M70 ${t + 30} Q${w / 2} ${t + 4} ${w - 70} ${t + 30}" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.35"/>` +
      `<path d="M50 ${h / 2 + 6} Q${w / 2} ${h / 2 + 30} ${w - 50} ${h / 2 + 6}" stroke="url(#gd)" stroke-width="10" fill="none"/>` +
      tassel(40, t + 12) + tassel(w - 40, t + 12) + tassel(40, b) + tassel(w - 40, b),
    radial('rv', '#ff5f7a', '#9a1030') + linear('gd', '#fff3a0', '#e6a100'),
  );
}

export const SEGMENTS: SegmentArt[] = [
  { key: 'kt-mattress-b', w: 840, h: 150, svg: () => mattressSvg(840, 150, '#5c9dff', '#e6f0ff') },
  { key: 'kt-mattress-p', w: 800, h: 150, svg: () => mattressSvg(800, 150, '#ff7aa8', '#ffe6f0') },
  { key: 'kt-pillow', w: 720, h: 170, svg: () => pillowSvg(720, 170, '#f3eaff') },
  { key: 'kt-pot', w: 600, h: 230, svg: () => potSvg(600, 230) },
  { key: 'kt-pancakes', w: 680, h: 200, svg: () => pancakesSvg(680, 200) },
  { key: 'kt-books', w: 720, h: 200, svg: () => booksSvg(720, 200) },
  { key: 'kt-cushion-o', w: 780, h: 160, svg: () => cushionSvg(780, 160, '#ff8a2b') },
  { key: 'kt-cushion-g', w: 760, h: 160, svg: () => cushionSvg(760, 160, '#3ccf5a') },
  { key: 'kt-toaster', w: 560, h: 240, svg: () => toasterSvg(560, 240) },
  { key: 'kt-cake', w: 740, h: 210, svg: () => cakeSvg(740, 210) },
  { key: 'kt-washer', w: 540, h: 280, svg: () => washerSvg(540, 280) },
];

export const SOFA = { key: 'kt-sofa', w: 1040, h: 290, svg: () => sofaSvg(1040, 290) };
export const ROYAL = { key: 'kt-royal', w: 640, h: 150, svg: () => royalCushionSvg(640, 150) };

// -----------------------------------------------------------------------------
// Pokalen

export function trophySvg(): string {
  const w = 300;
  const h = 380;
  return svgDoc(
    w,
    h,
    `<ellipse cx="150" cy="364" rx="110" ry="14" fill="#000" opacity="0.3"/>` +
      // Hanke
      `<path d="M62 70 Q-6 70 14 140 Q30 190 92 196" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/>` +
      `<path d="M62 70 Q-6 70 14 140 Q30 190 92 196" fill="none" stroke="url(#gh)" stroke-width="16" stroke-linecap="round"/>` +
      `<path d="M238 70 Q306 70 286 140 Q270 190 208 196" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/>` +
      `<path d="M238 70 Q306 70 286 140 Q270 190 208 196" fill="none" stroke="url(#gh)" stroke-width="16" stroke-linecap="round"/>` +
      // Fod
      `<rect x="70" y="300" width="160" height="58" rx="14" fill="url(#base)" ${ink(8)}/>` +
      `<rect x="100" y="314" width="100" height="26" rx="6" fill="#ffe680" ${ink(4)}/>` +
      `<path d="M120 300 L130 240 L170 240 L180 300 Z" fill="url(#g)" ${ink(8)}/>` +
      // Skål
      `<path d="M50 36 L250 36 Q258 200 150 246 Q42 200 50 36 Z" fill="url(#g)" ${ink(9)}/>` +
      `<ellipse cx="150" cy="38" rx="102" ry="20" fill="#fff3a0" ${ink(8)}/>` +
      `<ellipse cx="150" cy="42" rx="84" ry="11" fill="#e6a100" opacity="0.7"/>` +
      `<path d="M78 70 Q80 160 120 200" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.6"/>` +
      // Ansigt
      eyes(150, 116, 64, 20, [0, 3]) +
      `<path d="M116 160 Q150 196 184 160 Q150 176 116 160 Z" fill="${INK}"/><path d="M134 176 Q150 186 166 176" stroke="#ff5f7a" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="96" cy="150" rx="14" ry="8" fill="#ff8a5c" opacity="0.55"/><ellipse cx="204" cy="150" rx="14" ry="8" fill="#ff8a5c" opacity="0.55"/>` +
      // Stjerne
      `<path d="M150 6 l6 14 15 1 -12 9 4 15 -13 -8 -13 8 4 -15 -12 -9 15 -1 Z" fill="#fff" ${ink(4)}/>`,
    linear('g', '#fff6a8', '#e09b00') + linear('gh', '#fff3a0', '#d48a00') + linear('base', '#7a4a1b', '#3d220a'),
  );
}

export function glowSvg(color = '#fff3a0'): string {
  return svgDoc(256, 256, `<circle cx="128" cy="128" r="126" fill="url(#gl)"/>`, `<radialGradient id="gl"><stop offset="0" stop-color="${color}" stop-opacity="0.95"/><stop offset="0.4" stop-color="${color}" stop-opacity="0.35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
}

export function raysSvg(color = '#fff3a0'): string {
  const rays = Array.from({ length: 14 }, (_, i) => {
    const a0 = (i / 14) * Math.PI * 2;
    const a1 = a0 + Math.PI / 20;
    return `<path d="M256 256 L${256 + Math.cos(a0) * 256} ${256 + Math.sin(a0) * 256} L${256 + Math.cos(a1) * 256} ${256 + Math.sin(a1) * 256} Z" fill="url(#rf)"/>`;
  }).join('');
  return svgDoc(512, 512, rays, `<radialGradient id="rf" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${color}" stop-opacity="0.9"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
}

// -----------------------------------------------------------------------------
// Gæsteoptrædener (forhindringer)

export function meatballSvg(): string {
  const bumps = [[44, 40, 10], [74, 34, 9], [90, 64, 9], [64, 86, 10], [34, 74, 8]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#6b3216" opacity="0.5"/>`)
    .join('');
  return svgDoc(
    124,
    124,
    `<circle cx="62" cy="64" r="54" fill="url(#m)" ${ink(7)}/>` +
      bumps +
      `<rect x="70" y="92" width="9" height="5" rx="2" fill="#3ccf5a" transform="rotate(30 74 94)"/><rect x="30" y="50" width="9" height="5" rx="2" fill="#3ccf5a"/>` +
      `<ellipse cx="44" cy="34" rx="16" ry="9" fill="#fff" opacity="0.35"/>` +
      eyes(62, 58, 34, 12, [3, 2]) +
      `<path d="M38 38 L56 46 M86 38 L68 46" ${ink(5)}/>` +
      `<path d="M48 84 Q62 74 76 84" fill="none" ${ink(5)}/>`,
    radial('m', '#d8844a', '#7a3a18'),
  );
}

export function chickenSvg(): string {
  return svgDoc(
    240,
    230,
    // Rede
    `<ellipse cx="120" cy="200" rx="110" ry="26" fill="#000" opacity="0.25"/>` +
      `<path d="M14 170 Q120 236 226 170 L216 196 Q120 240 24 196 Z" fill="url(#nest)" ${ink(6)}/>` +
      `<path d="M30 180 L70 192 M90 198 L130 196 M150 194 L200 182 M40 192 L80 184" stroke="#6b3f17" stroke-width="4"/>` +
      // Krop
      `<path d="M40 160 Q20 80 90 70 Q120 20 160 40 Q196 60 180 100 Q220 120 200 170 Q120 200 40 160 Z" fill="url(#ch)" ${ink(7)}/>` +
      // Vinge
      `<path d="M70 120 Q110 100 140 130 Q110 160 76 146 Z" fill="#e6e1f5" ${ink(5)}/>` +
      // Kam og hagelap
      `<path d="M130 40 Q126 14 142 20 Q146 4 160 14 Q172 6 174 26 Q182 30 172 44 Z" fill="#ff3b3b" ${ink(5)}/>` +
      `<path d="M188 92 Q200 112 186 116 Q176 110 180 96 Z" fill="#ff3b3b" ${ink(4)}/>` +
      // Næb (åbent)
      `<path d="M182 70 L224 80 L184 86 Z" fill="#ffb02e" ${ink(5)}/><path d="M184 88 L214 92 L184 98 Z" fill="#ff8a2b" ${ink(4)}/>` +
      eyes(160, 64, 30, 12, [4, 1]) +
      // Hjelm (kanon-kylling!)
      `<path d="M118 42 Q150 10 186 40 Z" fill="#3ccf5a" opacity="0"/>` +
      shine(70, 90, 36, 10, 0.6),
    linear('ch', '#ffffff', '#d9d4ea') + linear('nest', '#c98d4b', '#7a4a1b'),
  );
}

export function eggSvg(): string {
  return svgDoc(64, 80, `<path d="M32 4 Q60 36 56 54 Q52 76 32 76 Q12 76 8 54 Q4 36 32 4 Z" fill="url(#e)" ${ink(5)}/><ellipse cx="22" cy="34" rx="7" ry="12" fill="#fff" opacity="0.8"/>`, linear('e', '#ffffff', '#f2dfc0'));
}

export function splatSvg(color: string, dark: string): string {
  return svgDoc(
    160,
    120,
    `<path d="M80 14 Q96 34 112 18 Q118 40 146 38 Q130 58 150 76 Q120 80 124 106 Q100 92 82 112 Q70 90 44 104 Q48 80 14 78 Q36 60 18 38 Q46 44 52 18 Q66 36 80 14 Z" fill="${color}" ${ink(5)}/>` +
      `<circle cx="80" cy="62" r="20" fill="${dark}" ${ink(4)}/><ellipse cx="72" cy="56" rx="7" ry="4" fill="#fff" opacity="0.7"/>`,
  );
}

export function eelSvg(): string {
  // Lodret ål: halen (bundet til kagerullen) øverst, hovedet nederst.
  const w = 130;
  const h = 560;
  return svgDoc(
    w,
    h,
    // Knude/sløjfe
    `<path d="M65 6 Q30 0 34 22 Q40 36 65 26 Q90 36 96 22 Q100 0 65 6 Z" fill="#ff5fa2" ${ink(5)}/>` +
      // Krop som slynget pølse
      `<path d="M58 20 Q40 120 62 200 Q86 290 58 380 Q40 450 52 500 L84 500 Q92 450 92 380 Q118 290 92 200 Q74 120 76 20 Z" fill="url(#el)" ${ink(7)}/>` +
      // Ryg-finne
      `<path d="M76 60 Q96 120 88 180 Q110 220 104 260" fill="none" stroke="#ffcf3a" stroke-width="8" stroke-linecap="round" opacity="0.9"/>` +
      // Pletter
      [[66, 110], [78, 240], [64, 330], [74, 420]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="12" fill="#1f6a5a" opacity="0.55"/>`).join('') +
      // Hoved
      `<ellipse cx="68" cy="510" rx="50" ry="44" fill="url(#el)" ${ink(7)}/>` +
      eyes(68, 500, 40, 14, [0, 5]) +
      `<path d="M40 530 Q68 556 96 530 Q68 542 40 530 Z" fill="${INK}"/>` +
      `<rect x="56" y="534" width="10" height="9" fill="#fff"/><rect x="72" y="534" width="10" height="9" fill="#fff"/>` +
      `<path d="M50 120 Q44 200 60 260" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.4"/>`,
    linear('el', '#5ee0b8', '#1e8a78', true),
  );
}

export function rollingPinSvg(): string {
  return svgDoc(
    380,
    70,
    `<rect x="4" y="24" width="70" height="22" rx="11" fill="url(#hd)" ${ink(6)}/><rect x="306" y="24" width="70" height="22" rx="11" fill="url(#hd)" ${ink(6)}/>` +
      `<rect x="64" y="8" width="252" height="54" rx="22" fill="url(#rp)" ${ink(7)}/>` +
      shine(84, 16, 160, 9, 0.5) +
      `<circle cx="190" cy="44" r="8" fill="#6b3f17" opacity="0.4"/>`,
    linear('rp', '#f0c48a', '#b67a3c') + linear('hd', '#c98d4b', '#6b3f17'),
  );
}

export function whoopeeSvg(): string {
  return svgDoc(
    170,
    110,
    `<ellipse cx="80" cy="96" rx="70" ry="10" fill="#000" opacity="0.25"/>` +
      `<path d="M136 58 L166 50 L168 74 L138 72 Z" fill="#ff8ab8" ${ink(5)}/>` +
      `<ellipse cx="78" cy="60" rx="70" ry="42" fill="url(#wp)" ${ink(7)}/>` +
      `<ellipse cx="58" cy="40" rx="30" ry="12" fill="#fff" opacity="0.45"/>` +
      eyes(78, 58, 36, 11, [3, -2]) +
      `<path d="M62 80 Q78 92 94 80" fill="none" ${ink(5)}/>`,
    radial('wp', '#ffa8cc', '#e0306f'),
  );
}

export function fartCloudSvg(): string {
  return svgDoc(
    120,
    100,
    `<path d="M20 70 Q4 54 22 42 Q22 18 48 24 Q60 4 82 18 Q108 12 104 40 Q118 56 100 70 Q90 90 64 82 Q40 92 20 70 Z" fill="url(#fc)" ${ink(4)} opacity="0.9"/>`,
    radial('fc', '#d8ff8a', '#7ac93a'),
  );
}

export function chefSvg(): string {
  return svgDoc(
    240,
    300,
    // Kokkehue
    `<path d="M70 92 Q30 90 40 56 Q46 30 76 40 Q86 4 120 16 Q150 0 166 34 Q204 30 200 64 Q198 92 168 92 Z" fill="url(#hat)" ${ink(7)}/>` +
      `<rect x="70" y="80" width="98" height="30" rx="8" fill="#fff" ${ink(6)}/>` +
      // Hoved
      `<rect x="72" y="104" width="96" height="86" rx="30" fill="url(#skin)" ${ink(7)}/>` +
      eyes(120, 136, 38, 11, [3, 2]) +
      `<path d="M96 116 L112 122 M144 116 L128 122" ${ink(5)}/>` +
      // Overskæg
      `<path d="M84 166 Q100 146 120 160 Q140 146 156 166 Q140 160 120 172 Q100 160 84 166 Z" fill="#6b3f17" ${ink(4)}/>` +
      `<ellipse cx="120" cy="152" rx="10" ry="8" fill="#ff8a5c" ${ink(4)}/>` +
      `<ellipse cx="90" cy="156" rx="9" ry="6" fill="#ff7a7a" opacity="0.6"/><ellipse cx="150" cy="156" rx="9" ry="6" fill="#ff7a7a" opacity="0.6"/>` +
      // Krop
      `<path d="M58 280 Q54 200 90 188 L150 188 Q186 200 182 280 Z" fill="url(#coat)" ${ink(7)}/>` +
      `<circle cx="120" cy="214" r="5" fill="${INK}"/><circle cx="120" cy="238" r="5" fill="${INK}"/><circle cx="120" cy="262" r="5" fill="${INK}"/>` +
      `<path d="M96 190 L120 210 L144 190" fill="#ff4b4b" ${ink(4)}/>` +
      // Sennepsflaske i hånden
      `<g transform="rotate(-30 196 190)"><rect x="176" y="150" width="42" height="80" rx="12" fill="url(#mus)" ${ink(6)}/><path d="M188 150 L197 118 L206 150 Z" fill="#ff4b4b" ${ink(5)}/><rect x="182" y="176" width="30" height="22" rx="4" fill="#fff" ${ink(3)}/></g>` +
      `<circle cx="178" cy="218" r="16" fill="url(#skin)" ${ink(5)}/>`,
    linear('hat', '#ffffff', '#dcd8ec') + linear('skin', '#ffd9b8', '#f0a878') + linear('coat', '#ffffff', '#cfd4e6') + linear('mus', '#ffe14a', '#e6a800'),
  );
}

export function balconySvg(): string {
  return svgDoc(
    300,
    90,
    `<ellipse cx="150" cy="80" rx="130" ry="10" fill="#000" opacity="0.25"/>` +
      `<rect x="10" y="20" width="280" height="44" rx="18" fill="url(#cb)" ${ink(7)}/>` +
      `<circle cx="262" cy="42" r="10" fill="#fff6e0" ${ink(4)}/>` +
      shine(30, 26, 120, 8, 0.5) +
      `<path d="M40 50 h40 M100 52 h50" stroke="#a5703a" stroke-width="4" stroke-linecap="round"/>`,
    linear('cb', '#e8b97a', '#a8743a'),
  );
}

export function mustardSvg(): string {
  return svgDoc(70, 70, `<path d="M35 6 Q60 20 62 38 Q62 62 36 64 Q8 64 8 38 Q10 20 35 6 Z" fill="url(#mu)" ${ink(5)}/><ellipse cx="26" cy="28" rx="8" ry="5" fill="#fff" opacity="0.7"/>`, radial('mu', '#ffef7a', '#e6a400'));
}

export function spoonSvg(): string {
  // Kæmpe træske stukket ind i tårnet – kyllingens siddepind.
  return svgDoc(
    300,
    80,
    `<rect x="4" y="30" width="190" height="22" rx="11" fill="url(#sp)" ${ink(6)}/>` +
      `<ellipse cx="236" cy="40" rx="62" ry="30" fill="url(#sp)" ${ink(7)}/><ellipse cx="236" cy="36" rx="44" ry="16" fill="#8a5a2b" opacity="0.4"/>` +
      shine(20, 34, 100, 6, 0.5),
    linear('sp', '#e8b97a', '#9a6430'),
  );
}

// -----------------------------------------------------------------------------
// Himmel og baggrund

export function skySvg(top: string, mid: string, bottom: string): string {
  return svgDoc(64, 256, `<rect width="64" height="256" fill="url(#s)"/>`, `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="0.6" stop-color="${mid}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`);
}

export function hillsSvg(w: number, h: number, color: string, houses: boolean): string {
  const ridge = Array.from({ length: 9 }, (_, i) => {
    const x = (i / 8) * w;
    const y = 70 + ((i * 53) % 90);
    return `${i === 0 ? 'M' : 'T'}${x} ${y}`;
  }).join(' ');
  const hs = houses
    ? Array.from({ length: 14 }, (_, i) => {
        const x = 40 + i * (w / 14) + ((i * 37) % 40);
        const hh = 40 + ((i * 29) % 50);
        const y = 150 - hh + ((i * 13) % 30);
        const roof = ['#ff6b6b', '#ffb36b', '#9b5cff', '#47b8ff'][i % 4];
        return `<rect x="${x}" y="${y}" width="56" height="${hh + 40}" rx="6" fill="${shade(color, 0.25)}" ${ink(4)}/>` +
          `<path d="M${x - 6} ${y + 4} L${x + 28} ${y - 26} L${x + 62} ${y + 4} Z" fill="${roof}" ${ink(4)}/>` +
          `<rect x="${x + 12}" y="${y + 16}" width="12" height="14" rx="2" fill="#fff3a0"/><rect x="${x + 32}" y="${y + 16}" width="12" height="14" rx="2" fill="#fff3a0"/>`;
      }).join('')
    : '';
  return svgDoc(w, h, `<path d="M0 ${h} L0 120 Q${w * 0.03} 60 ${w * 0.06} 100 ${ridge.replace(/^M[^T]*/, '')} L${w} ${h} Z" fill="url(#hg)" ${ink(6)}/>` + hs, linear('hg', shade(color, 0.15), shade(color, -0.25)));
}

export function groundSvg(w: number, h: number): string {
  const tufts = Array.from({ length: 30 }, (_, i) => {
    const x = 20 + i * (w / 30) + ((i * 17) % 30);
    const y = 60 + ((i * 41) % (h - 100));
    return `<path d="M${x - 12} ${y + 6} Q${x - 6} ${y - 12} ${x} ${y + 4} Q${x + 6} ${y - 16} ${x + 10} ${y + 4} Q${x + 16} ${y - 8} ${x + 18} ${y + 6} Z" fill="#3d9e2a"/>`;
  }).join('');
  const flowers = Array.from({ length: 16 }, (_, i) => {
    const x = 60 + i * (w / 16) + ((i * 23) % 50);
    const y = 90 + ((i * 59) % (h - 130));
    const c = ['#ff5fa2', '#ffcf3a', '#ffffff', '#9b5cff'][i % 4];
    return `<circle cx="${x}" cy="${y}" r="8" fill="${c}" ${ink(3)}/><circle cx="${x}" cy="${y}" r="3" fill="#ffcf3a"/>`;
  }).join('');
  const fence = Array.from({ length: 34 }, (_, i) => {
    const x = i * 60 + 10;
    return `<path d="M${x} 46 L${x} 18 L${x + 14} 4 L${x + 28} 18 L${x + 28} 46 Z" fill="#fff6e0" ${ink(4)}/>`;
  }).join('');
  return svgDoc(
    w,
    h + 40,
    `<g transform="translate(0 0)">${fence}</g><rect x="0" y="22" width="${w}" height="10" fill="#fff6e0" ${ink(3)}/><rect x="0" y="34" width="${w}" height="12" fill="#fff6e0" ${ink(3)}/>` +
      `<path d="M0 40 Q${w / 4} 24 ${w / 2} 36 Q${(w * 3) / 4} 48 ${w} 30 L${w} ${h + 40} L0 ${h + 40} Z" fill="url(#gr)" ${ink(6)}/>` +
      tufts +
      flowers,
    linear('gr', '#7be04f', '#2f8a2a'),
  );
}

export function moonSvg(): string {
  return svgDoc(
    240,
    240,
    `<circle cx="120" cy="120" r="118" fill="url(#mh)"/><circle cx="120" cy="120" r="84" fill="url(#mo)" ${ink(7)}/>` +
      `<circle cx="86" cy="82" r="14" fill="#d8cfa0" opacity="0.8"/><circle cx="160" cy="150" r="18" fill="#d8cfa0" opacity="0.8"/><circle cx="150" cy="78" r="8" fill="#d8cfa0" opacity="0.8"/>` +
      `<path d="M88 122 q12 10 24 0 M132 122 q12 10 24 0" fill="none" ${ink(5)}/>` +
      `<path d="M106 150 Q120 160 134 150" fill="none" ${ink(5)}/>` ,
    radial('mo', '#fffbe0', '#e8dca0') + `<radialGradient id="mh"><stop offset="0.6" stop-color="#fff6c8" stop-opacity="0.45"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>`,
  );
}

export function sunsetSunSvg(): string {
  return svgDoc(
    300,
    300,
    `<circle cx="150" cy="150" r="146" fill="url(#halo)"/><circle cx="150" cy="150" r="88" fill="url(#ss)" ${ink(7)}/>` +
      `<path d="M112 146 q12 -10 24 0 M164 146 q12 -10 24 0" fill="none" ${ink(6)}/>` +
      `<path d="M124 172 Q150 192 176 172" fill="none" ${ink(6)}/>` +
      `<ellipse cx="110" cy="168" rx="11" ry="6" fill="#ff5f7a" opacity="0.6"/><ellipse cx="190" cy="168" rx="11" ry="6" fill="#ff5f7a" opacity="0.6"/>` +
      `<ellipse cx="124" cy="112" rx="26" ry="12" fill="#fff" opacity="0.5"/>`,
    radial('ss', '#fff3a0', '#ffb02e') + `<radialGradient id="halo"><stop offset="0.5" stop-color="#fff3a0" stop-opacity="0.5"/><stop offset="1" stop-color="#ffcf3a" stop-opacity="0"/></radialGradient>`,
  );
}

export function balloonSvg(): string {
  const stripes = ['#ff5f6d', '#ffcf3a', '#47b8ff', '#3ee6a8', '#9b5cff'];
  const segs = stripes
    .map((c, i) => {
      const x0 = 30 + i * 36;
      return `<path d="M110 20 Q${x0 - 10} 60 ${x0} 120 Q${x0 + 10} 170 110 220 Q${x0 + 46} 170 ${x0 + 36} 120 Q${x0 + 26} 60 110 20 Z" fill="${c}"/>`;
    })
    .join('');
  return svgDoc(
    220,
    320,
    `<g clip-path="url(#bc)">${segs}</g><path d="M110 12 Q200 20 206 116 Q206 170 130 226 L90 226 Q14 170 14 116 Q20 20 110 12 Z" fill="none" ${ink(7)}/>` +
      `<ellipse cx="70" cy="70" rx="20" ry="34" fill="#fff" opacity="0.35"/>` +
      `<path d="M92 226 L84 268 M128 226 L136 268" ${ink(4)}/>` +
      `<rect x="78" y="262" width="64" height="44" rx="8" fill="#c98d4b" ${ink(6)}/><path d="M80 276 h60" stroke="#7a4a1b" stroke-width="4"/>` +
      // Lille passager der vinker
      `<circle cx="110" cy="252" r="12" fill="#ffd9b8" ${ink(4)}/><circle cx="106" cy="250" r="2.5" fill="${INK}"/><circle cx="114" cy="250" r="2.5" fill="${INK}"/>`,
    `<clipPath id="bc"><path d="M110 12 Q200 20 206 116 Q206 170 130 226 L90 226 Q14 170 14 116 Q20 20 110 12 Z"/></clipPath>`,
  );
}

export function birdSvg(): string {
  return svgDoc(80, 50, `<path d="M6 24 Q24 4 40 24 Q56 4 74 24 Q56 16 40 30 Q24 16 6 24 Z" fill="#3a2a6a" ${ink(3)}/>`);
}

export function planeSvg(): string {
  return svgDoc(
    300,
    120,
    `<path d="M30 60 Q30 40 70 40 L230 40 Q290 44 290 62 Q290 80 230 82 L70 82 Q30 82 30 60 Z" fill="url(#pl)" ${ink(7)}/>` +
      `<path d="M60 42 L30 6 L64 6 L100 42 Z" fill="#ff5f6d" ${ink(6)}/>` +
      `<path d="M150 64 L120 112 L160 112 L196 64 Z" fill="#d6dcef" ${ink(6)}/>` +
      [110, 140, 170, 200].map((x) => `<circle cx="${x}" cy="56" r="8" fill="#9bdcff" ${ink(4)}/>`).join('') +
      `<path d="M246 46 Q276 50 280 60 L246 60 Z" fill="#9bdcff" ${ink(4)}/>` +
      shine(70, 46, 140, 6, 0.6),
    linear('pl', '#ffffff', '#c3cade'),
  );
}

export function satelliteSvg(): string {
  return svgDoc(
    260,
    140,
    `<rect x="4" y="44" width="80" height="52" rx="6" fill="url(#sol)" ${ink(6)}/><rect x="176" y="44" width="80" height="52" rx="6" fill="url(#sol)" ${ink(6)}/>` +
      `<path d="M30 44 v52 M58 44 v52 M202 44 v52 M230 44 v52 M4 70 h80 M176 70 h80" stroke="${INK}" stroke-width="3" opacity="0.6"/>` +
      `<rect x="84" y="64" width="92" height="12" fill="#9aa3bb" ${ink(4)}/>` +
      `<rect x="98" y="34" width="64" height="72" rx="14" fill="url(#sb)" ${ink(7)}/>` +
      eyes(130, 66, 26, 9, [2, 2]) +
      `<path d="M130 34 L130 12" ${ink(4)}/><circle cx="130" cy="10" r="7" fill="#ff4b4b" ${ink(3)}/>`,
    linear('sol', '#5c9dff', '#2a4fae') + linear('sb', '#ffe680', '#e6a100'),
  );
}

export function ufoSvg(): string {
  return svgDoc(
    300,
    260,
    `<path d="M110 92 L40 250 L260 250 L190 92 Z" fill="url(#beam)"/>` +
      // Ko i strålen
      `<g transform="rotate(-18 150 200)"><rect x="118" y="182" width="66" height="38" rx="14" fill="#fff" ${ink(5)}/><circle cx="136" cy="196" r="7" fill="${INK}"/><circle cx="168" cy="206" r="8" fill="${INK}"/>` +
      `<rect x="178" y="176" width="30" height="26" rx="10" fill="#ffb3c8" ${ink(4)}/><path d="M126 220 v14 M176 220 v14" ${ink(5)}/></g>` +
      `<ellipse cx="150" cy="60" rx="54" ry="40" fill="url(#dome)" ${ink(6)}/>` +
      `<ellipse cx="150" cy="86" rx="140" ry="30" fill="url(#hull)" ${ink(7)}/>` +
      [70, 110, 150, 190, 230].map((x, i) => `<circle cx="${x}" cy="${90 + (i % 2) * 4}" r="8" fill="${['#ffcf3a', '#3ee6a8', '#ff5fa2'][i % 3]}" ${ink(3)}/>`).join('') +
      eyes(150, 54, 30, 10, [0, 3]),
    linear('hull', '#d6dcef', '#7a83a0') + radial('dome', '#c8ffef', '#3ee6a8') +
      `<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8ff8a" stop-opacity="0.75"/><stop offset="1" stop-color="#d8ff8a" stop-opacity="0.05"/></linearGradient>`,
  );
}

export function planetSvg(): string {
  return svgDoc(
    360,
    240,
    `<ellipse cx="180" cy="128" rx="170" ry="40" fill="none" stroke="${INK}" stroke-width="18"/>` +
      `<circle cx="180" cy="120" r="86" fill="url(#pl)" ${ink(7)}/>` +
      `<path d="M104 100 Q180 80 256 100 M98 136 Q180 120 262 136" stroke="#c27a3a" stroke-width="10" fill="none" opacity="0.45"/>` +
      `<path d="M150 116 q10 8 20 0 M196 116 q10 8 20 0" fill="none" ${ink(5)}/><path d="M168 146 Q183 156 198 146" fill="none" ${ink(5)}/>` +
      `<ellipse cx="140" cy="80" rx="24" ry="12" fill="#fff" opacity="0.4"/>` +
      `<path d="M14 128 Q180 196 346 128" fill="none" stroke="#ffe0a8" stroke-width="10"/>`,
    radial('pl', '#ffd9a0', '#d88a40'),
  );
}

// -----------------------------------------------------------------------------
// HUD

export function meterSvg(h: number): string {
  const w = 64;
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const y = 20 + (i / 10) * (h - 40);
    return `<path d="M${i % 5 === 0 ? 8 : 14} ${y} H${i % 5 === 0 ? 22 : 18}" stroke="#fff" stroke-width="3" opacity="0.7"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="${(w - 8) / 2}" fill="url(#mt)" ${ink(7)}/>` +
      `<rect x="14" y="16" width="10" height="${h - 32}" rx="5" fill="#fff" opacity="0.3"/>` +
      ticks,
    `<linearGradient id="mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0a2a"/><stop offset="0.3" stop-color="#3a2a8a"/><stop offset="0.55" stop-color="#ff7a59"/><stop offset="0.8" stop-color="#47b8ff"/><stop offset="1" stop-color="#4fbf3a"/></linearGradient>`,
  );
}

export function markerSvg(color: string): string {
  return svgDoc(80, 80, `<path d="M40 76 L26 58 A30 30 0 1 1 54 58 Z" fill="${color}" ${ink(6)}/><circle cx="40" cy="36" r="24" fill="#fff6e0" ${ink(3)}/>`);
}

export function arrowDownSvg(color: string): string {
  return svgDoc(90, 70, `<path d="M10 14 L80 14 L45 62 Z" fill="${color}" ${ink(7)}/><path d="M26 22 L56 22" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.5"/>`);
}

export function signSvg(): string {
  return svgDoc(
    420,
    260,
    `<rect x="196" y="120" width="28" height="140" rx="8" fill="url(#post)" ${ink(6)}/>` +
      `<rect x="10" y="10" width="400" height="140" rx="26" fill="url(#bd)" ${ink(8)}/>` +
      `<rect x="26" y="24" width="368" height="112" rx="18" fill="none" stroke="#fff3a0" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/>` +
      shine(40, 18, 160, 10, 0.4),
    linear('bd', '#ff5f6d', '#b8203a') + linear('post', '#c98d4b', '#6b3f17'),
  );
}

/** Lyskegle til slow-mo/finale-scener. */
export function beamSvg(color = '#fff6c8'): string {
  return svgDoc(200, 600, `<path d="M90 0 L110 0 L200 600 L0 600 Z" fill="url(#bm)"/>`, `<linearGradient id="bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.8"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`);
}

/** Advarsel øverst på skærmen: her kommer en frikadelle! */
export function warnSvg(): string {
  return svgDoc(
    96,
    110,
    `<path d="M48 6 L90 84 Q94 96 82 96 L14 96 Q2 96 6 84 Z" fill="url(#wr)" ${ink(7)}/>` +
      `<rect x="42" y="30" width="12" height="40" rx="6" fill="${INK}"/><circle cx="48" cy="82" r="7" fill="${INK}"/>`,
    linear('wr', '#ffe14a', '#ff8a2b'),
  );
}
