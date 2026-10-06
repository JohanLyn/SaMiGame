import Phaser from 'phaser';
import { shade } from '@samigame/shared';
import { audio } from '../kit/audio';
import { Fx } from '../kit/fx';
import { gradientBackdrop, sunburst } from '../kit/scenery';
import { eyes, ink, linear, loadSvg, radial, shine, svgDoc } from '../kit/svg';
import { TEX } from '../kit/textures';
import { C, H, N, W } from '../kit/theme';
import { body, label, panelSvg, title } from '../kit/ui';
import { net } from '../net';
import { Blok } from '../objects/Blok';
import { BONUS_POINTS, type AwardWinner } from '../game/awards';
import type { Director } from '../flow/Director';
import type { PlayerView } from '../flow/types';

// -----------------------------------------------------------------------------
// Scene-layout (1920×1080)

/** Scenegulvets linje (fødder). */
const FLOOR = 880;
/** Hvor podiets klodser står (bag scenekanten). */
const PODIUM_BASE = 912;
/** Pladser i kulissen (spillerne venter her under priserne). */
const WINGS = [330, 560, 1360, 1590];
const PODIUM = [
  { x: W / 2, h: 290, key: 'aw-pod-0' },
  { x: W / 2 - 330, h: 205, key: 'aw-pod-1' },
  { x: W / 2 + 330, h: 140, key: 'aw-pod-2' },
  { x: W / 2 + 600, h: 80, key: 'aw-pod-3' },
];
const POD_COLORS = [
  ['#fff3a0', '#e6a100'],
  ['#f4f6fb', '#9aa3bb'],
  ['#ffc58a', '#b8641e'],
  ['#c9cfe0', '#6d7590'],
];
const INK = C.ink;

// -----------------------------------------------------------------------------
// SVG-grafik til prisoverrækkelsen

function curtainSvg(w: number, h: number, inner: 'left' | 'right'): string {
  const folds = Array.from({ length: 8 }, (_, i) => `<rect x="${i * (w / 8)}" y="0" width="${w / 8}" height="${h}" fill="url(#fold)"/>`).join('');
  const hem = Array.from({ length: 8 }, (_, i) => `Q${i * (w / 8) + w / 16} ${h - 4} ${(i + 1) * (w / 8)} ${h - 26}`).join(' ');
  const trimX = inner === 'left' ? w - 22 : 6;
  return svgDoc(
    w,
    h,
    `<g clip-path="url(#cl)"><rect width="${w}" height="${h}" fill="url(#cv)"/>${folds}</g>` +
      `<path d="M0 0 H${w} V${h - 26} ${hem.replace(/^Q/, 'Q')} L0 ${h - 26} Z" fill="none" ${ink(8)}/>` +
      `<rect x="${trimX}" y="0" width="16" height="${h - 30}" fill="url(#gold)" ${ink(4)}/>` +
      `<path d="M0 ${h - 70} ${Array.from({ length: 8 }, (_, i) => `Q${i * (w / 8) + w / 16} ${h - 44} ${(i + 1) * (w / 8)} ${h - 70}`).join(' ')}" fill="none" stroke="url(#gold)" stroke-width="12"/>`,
    linear('cv', '#d81e3c', '#7a0a20') +
      `<linearGradient id="fold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a0010" stop-opacity="0.55"/><stop offset="0.35" stop-color="#ff6a7a" stop-opacity="0.28"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0.12"/><stop offset="1" stop-color="#3a0010" stop-opacity="0.55"/></linearGradient>` +
      linear('gold', '#fff3a0', '#d48a00') +
      `<clipPath id="cl"><path d="M0 0 H${w} V${h - 26} ${hem} L0 ${h - 26} Z"/></clipPath>`,
  );
}

function valanceSvg(): string {
  const w = 1920;
  const n = 8;
  const sw = w / n;
  const swags = Array.from({ length: n }, (_, i) => {
    const x = i * sw;
    return `<path d="M${x} 0 L${x + sw} 0 L${x + sw} 70 Q${x + sw / 2} 170 ${x} 70 Z" fill="url(#vv)" ${ink(7)}/>` +
      `<path d="M${x + 14} 80 Q${x + sw / 2} 156 ${x + sw - 14} 80" fill="none" stroke="url(#gold)" stroke-width="12"/>` +
      `<path d="M${x + 30} 60 Q${x + sw / 2} 120 ${x + sw - 30} 60" fill="none" stroke="#ff8a9a" stroke-width="6" opacity="0.4"/>`;
  }).join('');
  const tassels = Array.from({ length: n + 1 }, (_, i) => {
    const x = i * sw;
    return `<circle cx="${x}" cy="78" r="14" fill="url(#gold)" ${ink(5)}/><path d="M${x - 12} 88 L${x + 12} 88 L${x + 8} 140 L${x - 8} 140 Z" fill="url(#gold)" ${ink(5)}/>`;
  }).join('');
  return svgDoc(w, 180, `<rect x="0" y="0" width="${w}" height="56" fill="url(#vv)" ${ink(6)}/>` + swags + tassels + `<rect x="0" y="0" width="${w}" height="18" fill="url(#gold)" ${ink(4)}/>`, linear('vv', '#e8304e', '#8a0c24') + linear('gold', '#fff3a0', '#d48a00'));
}

function floorSvg(): string {
  const w = 1920;
  const h = 140;
  const planks = Array.from({ length: 25 }, (_, i) => {
    const xb = -200 + i * 96;
    const xt = W / 2 + (xb - W / 2) * 0.8;
    return `<path d="M${xt} 0 L${xb} ${h}" stroke="#6b3f17" stroke-width="3" opacity="0.6"/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="url(#fl)"/>` + planks + `<rect width="${w}" height="16" fill="#fff" opacity="0.08"/>` + `<ellipse cx="${w / 2}" cy="${h / 2}" rx="700" ry="60" fill="#fff3a0" opacity="0.12"/>`,
    linear('fl', '#c98d4b', '#8a5a2b'),
  );
}

function apronSvg(): string {
  const w = 1920;
  const h = 200;
  const lights = Array.from({ length: 16 }, (_, i) => {
    const x = 60 + i * 120;
    return `<path d="M${x - 26} 30 Q${x} -4 ${x + 26} 30 Z" fill="#fff3a0" ${ink(4)}/><circle cx="${x}" cy="24" r="6" fill="#fff"/>`;
  }).join('');
  const stars = Array.from({ length: 9 }, (_, i) => {
    const x = 110 + i * 212;
    return `<path d="M${x} 82 l8 17 19 2 -14 12 4 19 -17 -9 -17 9 4 -19 -14 -12 19 -2 Z" fill="url(#gold)" ${ink(3)}/>`;
  }).join('');
  return svgDoc(
    w,
    h,
    `<rect x="0" y="22" width="${w}" height="${h - 22}" fill="url(#ap)"/>` +
      `<rect x="0" y="22" width="${w}" height="20" fill="url(#gold)" ${ink(5)}/>` +
      `<rect x="0" y="150" width="${w}" height="12" fill="url(#gold)" opacity="0.8"/>` +
      stars +
      lights,
    linear('ap', '#7a0a20', '#2a0410') + linear('gold', '#fff3a0', '#d48a00'),
  );
}

function marqueeSvg(): string {
  return svgDoc(
    1000,
    200,
    `<rect x="14" y="20" width="972" height="164" rx="40" fill="#000" opacity="0.35"/>` +
      `<rect x="10" y="10" width="980" height="166" rx="40" fill="url(#mq)" ${ink(9)}/>` +
      `<rect x="34" y="32" width="932" height="122" rx="26" fill="url(#mi)" ${ink(5)}/>` +
      shine(60, 40, 300, 12, 0.35),
    linear('mq', '#ffcf3a', '#e07a00') + linear('mi', '#3a1a8a', '#1a0c4a'),
  );
}

function bulbSvg(): string {
  return svgDoc(48, 48, `<circle cx="24" cy="24" r="22" fill="url(#bg)"/><circle cx="24" cy="24" r="9" fill="#fffbe0" ${ink(3)}/>`, `<radialGradient id="bg"><stop offset="0" stop-color="#fff3a0" stop-opacity="0.9"/><stop offset="1" stop-color="#ffcf3a" stop-opacity="0"/></radialGradient>`);
}

function beamSvg(): string {
  return svgDoc(220, 700, `<path d="M96 0 L124 0 L220 700 L0 700 Z" fill="url(#bm)"/>`, `<linearGradient id="bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.85"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0.05"/></linearGradient>`);
}

function raysSvg(): string {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a0 = (i / 16) * Math.PI * 2;
    const a1 = a0 + Math.PI / 22;
    return `<path d="M256 256 L${256 + Math.cos(a0) * 256} ${256 + Math.sin(a0) * 256} L${256 + Math.cos(a1) * 256} ${256 + Math.sin(a1) * 256} Z" fill="url(#rf)"/>`;
  }).join('');
  return svgDoc(512, 512, rays + `<circle cx="256" cy="256" r="120" fill="url(#rg)"/>`, `<radialGradient id="rf" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff3a0" stop-opacity="0.9"/><stop offset="1" stop-color="#ffcf3a" stop-opacity="0"/></radialGradient><radialGradient id="rg"><stop offset="0" stop-color="#fffbe0" stop-opacity="0.8"/><stop offset="1" stop-color="#fff3a0" stop-opacity="0"/></radialGradient>`);
}

function poolSvg(): string {
  return svgDoc(400, 120, `<ellipse cx="200" cy="60" rx="196" ry="56" fill="url(#pl)"/>`, `<radialGradient id="pl"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.75"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>`);
}

function podiumSvg(w: number, h: number, light: string, dark: string): string {
  const top = 34;
  return svgDoc(
    w + 20,
    h + top + 10,
    `<path d="M10 ${top} L30 6 L${w - 10} 6 L${w + 10} ${top} Z" fill="${shade(light, 0.3)}" ${ink(7)}/>` +
      `<rect x="10" y="${top}" width="${w}" height="${h}" rx="10" fill="url(#pd)" ${ink(8)}/>` +
      `<rect x="26" y="${top + 12}" width="${w - 32}" height="${Math.max(10, h - 24)}" rx="8" fill="none" stroke="#fff" stroke-width="4" opacity="0.35"/>` +
      shine(30, top + 16, 18, Math.max(10, h - 40), 0.35),
    linear('pd', light, dark),
  );
}

function envBackSvg(): string {
  return svgDoc(460, 300, `<rect x="10" y="10" width="440" height="280" rx="18" fill="url(#eb)" ${ink(8)}/>`, linear('eb', '#f2d4a8', '#d8a870'));
}

function envFrontSvg(): string {
  return svgDoc(
    460,
    300,
    `<path d="M10 40 L230 180 L450 40 L450 272 Q450 290 432 290 L28 290 Q10 290 10 272 Z" fill="url(#ef)" ${ink(8)}/>` +
      `<path d="M14 286 L200 160 M446 286 L260 160" ${ink(5)} opacity="0.5"/>` +
      shine(40, 250, 120, 10, 0.4),
    linear('ef', '#fff2d8', '#f0cf98'),
  );
}

function envFlapSvg(): string {
  return svgDoc(
    460,
    210,
    `<path d="M10 10 L450 10 L240 190 Q230 198 220 190 Z" fill="url(#fp)" ${ink(8)}/>` +
      `<circle cx="230" cy="168" r="34" fill="url(#seal)" ${ink(6)}/><path d="M230 146 l6 13 14 1 -11 9 4 14 -13 -8 -13 8 4 -14 -11 -9 14 -1 Z" fill="#fff3a0"/>`,
    linear('fp', '#ffe8c0', '#e8be82') + radial('seal', '#ff6a7a', '#b8102c'),
  );
}

function cardSvg(): string {
  return svgDoc(
    900,
    270,
    `<rect x="16" y="20" width="868" height="240" rx="34" fill="#000" opacity="0.35"/>` +
      `<rect x="10" y="10" width="880" height="240" rx="34" fill="url(#cg)" ${ink(9)}/>` +
      `<rect x="30" y="28" width="840" height="204" rx="22" fill="url(#cp)" ${ink(5)}/>` +
      `<rect x="44" y="40" width="812" height="180" rx="16" fill="none" stroke="#e6a100" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/>` +
      shine(60, 36, 300, 12, 0.6),
    linear('cg', '#fff3a0', '#d48a00') + linear('cp', '#fffaf0', '#f4e4c4'),
  );
}

function crownSvg(): string {
  return svgDoc(
    220,
    170,
    `<path d="M16 150 L10 40 L62 92 L110 14 L158 92 L210 40 L204 150 Z" fill="url(#cr)" ${ink(9)}/>` +
      `<rect x="14" y="128" width="192" height="30" rx="10" fill="url(#cb)" ${ink(7)}/>` +
      `<circle cx="110" cy="100" r="16" fill="#ff3b5c" ${ink(5)}/><circle cx="56" cy="118" r="10" fill="#3d8bff" ${ink(4)}/><circle cx="164" cy="118" r="10" fill="#3ee6a8" ${ink(4)}/>` +
      [10, 110, 210].map((x, i) => `<circle cx="${x}" cy="${i === 1 ? 14 : 40}" r="11" fill="#fff3a0" ${ink(4)}/>`).join('') +
      `<path d="M40 60 L48 120" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.6"/>`,
    linear('cr', '#fff6a8', '#e09b00') + linear('cb', '#ffe680', '#c98a00'),
  );
}

function audienceSvg(color: string, seed: number): string {
  const heads = Array.from({ length: 15 }, (_, i) => {
    const x = 40 + i * 132 + ((i * 53 + seed * 31) % 50);
    const r = 46 + ((i * 17 + seed) % 16);
    const y = 120 + ((i * 29 + seed * 7) % 26);
    const hat = (i + seed) % 5 === 0 ? `<path d="M${x - 30} ${y - r + 10} L${x} ${y - r - 50} L${x + 30} ${y - r + 10} Z" fill="${shade(color, 0.15)}"/>` : '';
    return `<ellipse cx="${x}" cy="${y + r + 40}" rx="${r + 34}" ry="${r}" fill="${color}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>${hat}`;
  }).join('');
  return svgDoc(1920, 260, heads);
}

/** Pris-statuetter: guld-figur på en sokkel med messingskilt. */
function statuetteSvg(id: string): string {
  const base =
    `<ellipse cx="120" cy="306" rx="96" ry="12" fill="#000" opacity="0.3"/>` +
    `<path d="M40 300 L52 236 L188 236 L200 300 Z" fill="url(#wood)" ${ink(7)}/>` +
    `<rect x="70" y="252" width="100" height="30" rx="6" fill="url(#brass)" ${ink(4)}/><path d="M84 262 h72 M92 272 h56" stroke="#a87a10" stroke-width="3"/>` +
    `<rect x="60" y="220" width="120" height="20" rx="8" fill="url(#g)" ${ink(6)}/>`;
  const figures: Record<string, string> = {
    champ:
      `<path d="M78 216 L96 176 L144 176 L162 216 Z" fill="url(#g)" ${ink(6)}/>` +
      `<path d="M58 40 L182 40 Q186 150 120 176 Q54 150 58 40 Z" fill="url(#g)" ${ink(7)}/>` +
      `<path d="M58 56 Q18 60 30 104 Q40 132 72 134" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M58 56 Q18 60 30 104 Q40 132 72 134" fill="none" stroke="#ffd34a" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M182 56 Q222 60 210 104 Q200 132 168 134" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M182 56 Q222 60 210 104 Q200 132 168 134" fill="none" stroke="#ffd34a" stroke-width="8" stroke-linecap="round"/>` +
      `<ellipse cx="120" cy="42" rx="62" ry="14" fill="#fff3a0" ${ink(6)}/>` +
      eyes(120, 92, 44, 13, [0, 2]) +
      `<path d="M100 122 Q120 140 140 122" fill="none" ${ink(6)}/>` +
      // Lille pokal oven på pokalen
      `<path d="M100 8 L140 8 Q140 40 120 46 Q100 40 100 8 Z" fill="url(#g)" ${ink(5)}/><rect x="112" y="44" width="16" height="10" fill="url(#g)" ${ink(4)}/>`,
    silver:
      `<path d="M120 216 L120 150" ${ink(8)}/>` +
      `<path d="M80 30 L104 110 M160 30 L136 110" stroke="#3d8bff" stroke-width="18" stroke-linecap="round"/>` +
      `<circle cx="120" cy="130" r="56" fill="url(#s)" ${ink(8)}/><circle cx="120" cy="130" r="40" fill="none" stroke="#fff" stroke-width="5" opacity="0.6"/>` +
      `<text x="120" y="148" font-family="Arial Black, Arial, sans-serif" font-size="52" font-weight="900" text-anchor="middle" fill="${INK}">2</text>` +
      `<path d="M150 98 Q156 112 150 118" stroke="#9bdcff" stroke-width="5" fill="none"/>`,
    comfort:
      `<rect x="112" y="170" width="16" height="50" fill="url(#g)" ${ink(5)}/>` +
      `<circle cx="120" cy="104" r="78" fill="url(#ck)" ${ink(8)}/>` +
      [[86, 70], [150, 74], [100, 140], [160, 130], [70, 110]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="8" fill="#5a2a10"/>`).join('') +
      `<path d="M92 96 q12 -8 24 0 M126 96 q12 -8 24 0" fill="none" ${ink(5)}/>` +
      `<path d="M98 136 Q120 120 142 136" fill="none" ${ink(6)}/>` +
      `<path d="M96 104 Q90 124 96 130 Q104 124 96 104 Z" fill="#7fd0ff" ${ink(3)}/><path d="M150 104 Q144 124 150 130 Q158 124 150 104 Z" fill="#7fd0ff" ${ink(3)}/>`,
    thumb:
      `<path d="M78 216 L78 120 Q78 104 94 104 L104 104 L112 40 Q116 22 132 26 Q146 30 142 52 L136 100 L170 100 Q190 104 186 124 L178 196 Q174 216 154 216 Z" fill="url(#g)" ${ink(8)}/>` +
      `<path d="M140 132 H182 M140 160 H180 M140 188 H176" ${ink(5)}/>` +
      `<path d="M104 60 L98 110" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.6"/>`,
    runner:
      `<path d="M50 200 Q46 150 80 140 L120 120 Q130 100 150 110 L170 150 Q200 160 196 196 Q196 214 176 214 L66 214 Q50 214 50 200 Z" fill="url(#g)" ${ink(8)}/>` +
      `<path d="M50 196 H196" ${ink(6)}/><path d="M96 140 L110 156 M110 132 L124 148" ${ink(5)}/>` +
      `<path d="M66 140 Q20 110 26 70 Q50 100 70 96 Q50 70 62 40 Q80 80 96 120 Z" fill="#fff" ${ink(6)}/>`,
    splash:
      `<path d="M120 20 Q190 120 186 160 Q182 214 120 214 Q58 214 54 160 Q50 120 120 20 Z" fill="url(#w)" ${ink(8)}/>` +
      eyes(120, 140, 46, 14, [0, 3]) +
      `<path d="M100 178 Q120 194 140 178" fill="none" ${ink(6)}/>` +
      `<path d="M84 80 Q76 110 82 130" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity="0.6" fill="none"/>` +
      `<circle cx="34" cy="150" r="10" fill="#7fd0ff" ${ink(4)}/><circle cx="206" cy="130" r="12" fill="#7fd0ff" ${ink(4)}/>`,
    target:
      `<rect x="112" y="170" width="16" height="50" fill="url(#g)" ${ink(5)}/>` +
      `<circle cx="120" cy="104" r="80" fill="#fff" ${ink(8)}/><circle cx="120" cy="104" r="62" fill="#ff4b4b"/><circle cx="120" cy="104" r="44" fill="#fff"/><circle cx="120" cy="104" r="26" fill="#ff4b4b"/><circle cx="120" cy="104" r="10" fill="#fff"/>` +
      `<path d="M120 104 L210 30" stroke="#6b3f17" stroke-width="9" stroke-linecap="round"/><path d="M200 24 L226 14 L218 42 Z" fill="#3ee6a8" ${ink(4)}/>`,
    bulldozer:
      `<rect x="70" y="100" width="110" height="74" rx="12" fill="url(#y)" ${ink(7)}/>` +
      `<rect x="96" y="60" width="64" height="50" rx="8" fill="url(#y)" ${ink(6)}/><rect x="106" y="70" width="44" height="28" rx="5" fill="#9bdcff" ${ink(4)}/>` +
      `<path d="M28 120 L58 120 L70 196 L22 196 Z" fill="url(#g)" ${ink(7)}/>` +
      `<rect x="64" y="176" width="130" height="40" rx="20" fill="#3a3b55" ${ink(6)}/>` +
      [90, 128, 166].map((x) => `<circle cx="${x}" cy="196" r="12" fill="#9aa3bb" ${ink(4)}/>`).join(''),
    scream:
      `<path d="M60 90 L150 50 L150 190 L60 150 Z" fill="url(#g)" ${ink(8)}/>` +
      `<rect x="34" y="88" width="34" height="64" rx="10" fill="url(#g)" ${ink(6)}/>` +
      `<path d="M96 160 L104 216" ${ink(10)}/>` +
      `<path d="M170 90 Q186 120 170 150 M186 74 Q212 120 186 166 M204 58 Q238 120 204 182" fill="none" stroke="#ff5fa2" stroke-width="7" stroke-linecap="round"/>`,
    jumper:
      `<path d="M80 216 Q160 206 80 190 Q160 180 80 166 Q160 156 80 142 Q160 132 80 118" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>` +
      `<path d="M80 216 Q160 206 80 190 Q160 180 80 166 Q160 156 80 142 Q160 132 80 118" fill="none" stroke="#ffd34a" stroke-width="8" stroke-linecap="round"/>` +
      `<ellipse cx="120" cy="86" rx="52" ry="40" fill="url(#g)" ${ink(7)}/>` +
      eyes(120, 82, 40, 13, [0, -3]) +
      `<path d="M88 50 Q70 10 60 30 M152 50 Q170 10 180 30" fill="none" ${ink(6)}/>`,
  };
  const fig = figures[id] ?? `<path d="M120 24 l26 58 62 6 -46 42 14 62 -56 -32 -56 32 14 -62 -46 -42 62 -6 Z" fill="url(#g)" ${ink(8)}/>` + eyes(120, 110, 34, 11);
  return svgDoc(
    240,
    320,
    base + fig,
    linear('g', '#fff6a8', '#e09b00') +
      linear('s', '#ffffff', '#9aa3bb') +
      linear('wood', '#7a4a1b', '#3d220a') +
      linear('brass', '#fff3a0', '#d4a020') +
      radial('ck', '#f0b860', '#b8641e') +
      radial('w', '#bfeaff', '#2f9be8') +
      linear('y', '#ffe14a', '#e6a800'),
  );
}

// -----------------------------------------------------------------------------

interface Walker {
  blok: Blok;
  dir: number;
}

interface Contestant {
  p: PlayerView;
  blok: Blok;
  wing: number;
  score: number;
  plate: Phaser.GameObjects.Container;
  scoreText: Phaser.GameObjects.Text;
  trophies: Phaser.GameObjects.Image[];
  bonus: number;
}

/**
 * PRISOVERRÆKKELSEN: et teater med røde fløjlstæpper, spotlights og et publikum.
 * 1) Bonuspriserne (+3 hver) uddeles én ad gangen: trommehvirvel, en kuvert der åbnes, en statuette,
 *    og vinderen går selv op midt på scenen og får den i hænderne.
 * 2) Podiet hæver sig op af scenegulvet; 4.-, 3.- og 2.-pladsen afsløres, og efter en lang trommehvirvel
 *    hopper vinderen op på toppen, får kronen på – fyrværkeri, konfetti og dans.
 * Efter ~30 sek. (eller ENTER) går vi tilbage til lobbyen.
 */
export class AwardsScene extends Phaser.Scene {
  private fx!: Fx;
  private contestants: Contestant[] = [];
  private walkers: Walker[] = [];
  private beams: Phaser.GameObjects.Image[] = [];
  private pools: Phaser.GameObjects.Image[] = [];
  private bulbs: Phaser.GameObjects.Image[] = [];
  private crowd: Phaser.GameObjects.Image[] = [];
  private dim!: Phaser.GameObjects.Rectangle;
  private bulbPhase = 0;
  private bulbTimer = 0;
  private ended = false;

  constructor() {
    super('awards');
  }

  private get director(): Director {
    return this.registry.get('director') as Director;
  }

  preload(): void {
    loadSvg(this, 'aw-curtain-l', curtainSvg(1000, 1080, 'left'), 1000, 1080);
    loadSvg(this, 'aw-curtain-r', curtainSvg(1000, 1080, 'right'), 1000, 1080);
    loadSvg(this, 'aw-valance', valanceSvg(), 1920, 180);
    loadSvg(this, 'aw-floor', floorSvg(), 1920, 140);
    loadSvg(this, 'aw-apron', apronSvg(), 1920, 200);
    loadSvg(this, 'aw-marquee', marqueeSvg(), 1000, 200);
    loadSvg(this, 'aw-bulb', bulbSvg(), 48, 48);
    loadSvg(this, 'aw-beam', beamSvg(), 220, 700);
    loadSvg(this, 'aw-pool', poolSvg(), 400, 120);
    loadSvg(this, 'aw-env-back', envBackSvg(), 460, 300);
    loadSvg(this, 'aw-env-front', envFrontSvg(), 460, 300);
    loadSvg(this, 'aw-env-flap', envFlapSvg(), 460, 210);
    loadSvg(this, 'aw-card', cardSvg(), 900, 270);
    loadSvg(this, 'aw-crown', crownSvg(), 220, 170);
    loadSvg(this, 'aw-crowd-back', audienceSvg('#2a1650', 1), 1920, 260);
    loadSvg(this, 'aw-crowd-front', audienceSvg('#120a2a', 4), 1920, 260);
    PODIUM.forEach((p, i) => loadSvg(this, p.key, podiumSvg(280, p.h, POD_COLORS[i][0], POD_COLORS[i][1]), 300, p.h + 44));
    const data = (this.sys.settings.data ?? {}) as { players?: PlayerView[] };
    for (const p of data.players ?? this.director.players()) loadSvg(this, `aw-plate-${p.color}`, panelSvg(170, 64, p.color, { radius: 24 }), 194, 94);
    loadSvg(this, 'aw-rays', raysSvg(), 512, 512);
    for (const id of ['champ', 'silver', 'comfort', 'thumb', 'runner', 'splash', 'target', 'bulldozer', 'scream', 'jumper', 'star']) {
      loadSvg(this, `aw-stat-${id}`, statuetteSvg(id), 240, 320);
    }
  }

  async create(): Promise<void> {
    this.fx = new Fx(this);
    // Ingen "lag-udjævning": animationerne skal følge uret, også hvis billedraten dykker.
    this.tweens.setLagSmooth(10000, 10000);
    this.contestants = [];
    this.walkers = [];
    this.beams = [];
    this.pools = [];
    this.bulbs = [];
    this.crowd = [];
    this.ended = false;

    this.buildStage();
    audio.music('finale');
    this.director.waitLayouts('Prisoverrækkelse!', 'Kig på TV’et 🏆', '🏆');

    const state = this.director.state;
    const players = this.director.players();
    const before = players.map((p) => p.score);
    const awards: AwardWinner[] = state ? state.grantAwards(3) : [];
    const after = this.director.players();

    this.buildContestants(players, before);

    // Ind-animation: tæppet går op
    const curtains = this.children.getByName('curtains') as Phaser.GameObjects.Container | null;
    const [left, right] = (curtains?.list ?? []) as Phaser.GameObjects.Image[];
    this.sfx('drumroll');
    audio.say('awards', true);
    await this.wait(500);
    this.sfx('whoosh', { pitch: 0.6 });
    this.tweens.add({ targets: left, x: 190, duration: 1300, ease: 'Cubic.easeInOut' });
    this.tweens.add({ targets: right, x: W - 190, duration: 1300, ease: 'Cubic.easeInOut' });
    this.time.delayedCall(700, () => {
      this.sfx('fanfare');
      this.sfx('cheer');
      this.crowdJump();
    });
    const header = title(this, W / 2, 226, 'PRISOVERRÆKKELSE', 76, { color: C.sun }).setDepth(607).setName('header');
    header.setScale(0);
    this.tweens.add({
      targets: header,
      scale: 1,
      delay: 600,
      duration: 380,
      ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: header, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
    });
    this.sweepBeams();
    await this.wait(1500);
    if (!this.alive()) return;

    // Bonuspriserne
    for (let i = 0; i < awards.length; i++) {
      await this.presentAward(awards[i], i, awards.length);
      if (!this.alive()) return;
    }
    if (!awards.length) {
      this.ribbon('Ingen bonuspriser i aften!', C.cream);
      await this.wait(1600);
    }
    if (!this.alive()) return;
    await this.podium(after);
  }

  // ---------------------------------------------------------------------------
  // Scenen

  private buildStage(): void {
    gradientBackdrop(this, '#3a1a8a', '#0a0620');
    sunburst(this, W / 2, 420, '#ff9ad0', 0.08, -9000);
    // Baggrundsvæg med stjerner der glimter
    for (let i = 0; i < 40; i++) {
      const s = this.add.image(Phaser.Math.Between(80, W - 80), Phaser.Math.Between(170, 740), TEX.spark).setDepth(-8000).setScale(Phaser.Math.FloatBetween(0.2, 0.5)).setAlpha(0.5);
      this.tweens.add({ targets: s, alpha: 0.1, scale: s.scale * 0.5, duration: Phaser.Math.Between(600, 1600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 1500) });
    }
    // Marquee-skilt med blinkende pærer
    const mq = this.add.image(W / 2, 228, 'aw-marquee').setDepth(605).setScale(0.82);
    void mq;
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      let x: number;
      let y: number;
      if (t < 0.5) {
        x = W / 2 - 385 + (t / 0.5) * 770;
        y = 228 - 74;
      } else {
        x = W / 2 + 385 - ((t - 0.5) / 0.5) * 770;
        y = 228 + 66;
      }
      this.bulbs.push(this.add.image(x, y, 'aw-bulb').setDepth(606).setScale(0.7));
    }
    // Gulv, scenekant og fodlys
    this.add.image(W / 2, 800, 'aw-floor').setOrigin(0.5, 0).setDepth(100);
    this.add.image(W / 2, 880, 'aw-apron').setOrigin(0.5, 0).setDepth(400);
    // Lyskegler og lys-pletter
    const origins = [180, W / 2, W - 180];
    origins.forEach((x, i) => {
      const beam = this.add.image(x, -40, 'aw-beam').setOrigin(0.5, 0).setDepth(650).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.32).setScale(1.3, 1.55);
      this.beams.push(beam);
      const pool = this.add.image(x, FLOOR, 'aw-pool').setDepth(110).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
      this.pools.push(pool);
      void i;
    });
    // Publikum i forgrunden
    const back = this.add.image(W / 2, H - 70, 'aw-crowd-back').setOrigin(0.5, 0.5).setDepth(1000);
    const front = this.add.image(W / 2 + 40, H - 10, 'aw-crowd-front').setOrigin(0.5, 0.5).setDepth(1001);
    this.crowd = [back, front];
    this.tweens.add({ targets: back, y: back.y - 8, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: front, y: front.y - 10, duration: 360, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 180 });
    // Tæpper (lukkede) + kappe
    const left = this.add.image(W / 2 + 20, 0, 'aw-curtain-l').setOrigin(1, 0);
    const right = this.add.image(W / 2 - 20, 0, 'aw-curtain-r').setOrigin(0, 0);
    this.add.container(0, 0, [left, right]).setDepth(900).setName('curtains');
    this.add.image(W / 2, 0, 'aw-valance').setOrigin(0.5, 0).setDepth(950);
    this.dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05031a, 0).setDepth(600);
    this.fx.vignette(0.75);
  }

  private buildContestants(players: PlayerView[], before: number[]): void {
    players.forEach((p, i) => {
      const x = WINGS[i % WINGS.length];
      const blok = new Blok(this, x, FLOOR, p.avatar, { size: 0.9, tag: { name: p.name, color: p.color }, ring: p.color });
      blok.setDepth(500 + i);
      const key = `aw-plate-${p.color}`;
      const plate = this.add.container(x, 958).setDepth(1010);
      const bg = this.add.image(0, 0, this.textures.exists(key) ? key : '__WHITE');
      if (!this.textures.exists(key)) bg.setDisplaySize(170, 64).setTint(p.colorNum);
      const scoreText = title(this, 26, 2, String(before[i]), 46, { color: C.sun });
      const pts = body(this, -54, 4, 'POINT', 18, { stroke: 4 });
      plate.add([bg, pts, scoreText]);
      this.contestants.push({ p, blok, wing: x, score: before[i], plate, scoreText, trophies: [], bonus: 0 });
    });
  }

  update(_time: number, delta: number): void {
    for (const w of this.walkers) w.blok.walk(w.dir, 0, delta);
    // Pærerne løber rundt
    this.bulbTimer += delta;
    if (this.bulbTimer > 160) {
      this.bulbTimer = 0;
      this.bulbPhase = (this.bulbPhase + 1) % 3;
      this.bulbs.forEach((b, i) => b.setAlpha(i % 3 === this.bulbPhase ? 1 : 0.35));
    }
    // Lys-pletterne følger lyskeglerne
    this.beams.forEach((beam, i) => {
      const len = 700 * beam.scaleY;
      const dy = FLOOR - beam.y;
      const dx = Math.tan(-beam.rotation) * dy;
      this.pools[i].setPosition(beam.x + dx, FLOOR + 4).setVisible(dy < len);
    });
  }

  // ---------------------------------------------------------------------------
  // En bonuspris

  private async presentAward(award: AwardWinner, index: number, total: number): Promise<void> {
    const cx = W / 2;
    const tag = this.ribbon(`BONUSPRIS ${index + 1} AF ${total}`, C.cream, 345);
    this.sweepBeams();

    // Kuverten flyver ind
    const env = this.add.container(cx, -260).setDepth(700).setAngle(-30);
    const back = this.add.image(0, 0, 'aw-env-back');
    const card = this.add.image(0, 30, 'aw-card').setScale(0.42);
    const front = this.add.image(0, 0, 'aw-env-front');
    const flap = this.add.image(0, -140, 'aw-env-flap').setOrigin(0.5, 0.05);
    env.add([back, card, front, flap]);
    this.sfx('whoosh');
    this.tweens.add({ targets: env, y: 565, angle: 0, duration: 650, ease: 'Back.easeOut' });
    await this.wait(700);
    if (!this.alive()) return;
    this.sfx('stomp', { volume: 0.5 });
    this.fx.shake(0.004, 120);

    // Trommehvirvel – kuverten ryster mere og mere
    this.sfx('drumroll');
    this.time.delayedCall(1050, () => this.sfx('drumroll', { volume: 1.2 }));
    const shake = this.tweens.add({ targets: env, angle: { from: -3, to: 3 }, duration: 70, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: env, scale: 1.18, duration: 2000, ease: 'Quad.easeIn' });
    const roll = body(this, cx, 790, 'Og prisen går til…', 42, { stroke: 8 }).setDepth(710).setAlpha(0);
    this.tweens.add({ targets: roll, alpha: 1, duration: 300 });
    this.dimTo(0.35, 400);
    await this.wait(2100);
    if (!this.alive()) return;
    shake.stop();
    env.setAngle(0);
    roll.destroy();

    // Kuverten åbnes
    this.sfx('pop', { pitch: 0.8 });
    this.sfx('swish');
    this.tweens.add({ targets: flap, scaleY: -1, duration: 220, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: card, y: -200, duration: 380, delay: 150, ease: 'Back.easeOut' });
    await this.wait(560);
    if (!this.alive()) return;
    // Kortet flyver frem, kuverten falder væk
    const cardWorld = this.add.image(cx, env.y - 200 * env.scale, 'aw-card').setDepth(720).setScale(0.42 * env.scale);
    card.setVisible(false);
    if (tag.active) this.tweens.add({ targets: tag, alpha: 0, duration: 150 });
    this.tweens.add({ targets: env, y: H + 300, angle: 25, duration: 600, ease: 'Back.easeIn', onComplete: () => env.destroy() });
    this.tweens.add({ targets: cardWorld, x: cx, y: 470, scale: 1, duration: 420, ease: 'Back.easeOut' });
    this.fx.flash(0xfff3a0, 200, 0.5);
    await this.wait(300);
    if (!this.alive()) return;
    const t1 = title(this, cx, 418, award.award.title, 70, { color: C.tomato, stroke: 10 }).setDepth(730);
    const t2 = body(this, cx, 482, award.award.description, 34, { color: C.ink }).setDepth(730);
    this.fx.popIn(t1);
    this.fx.popIn(t2, 100);
    this.sfx('fanfare');

    // Statuetten stiger op med stråler
    const key = this.textures.exists(`aw-stat-${award.award.id}`) ? `aw-stat-${award.award.id}` : 'aw-stat-star';
    const glow = this.add.image(cx, 720, 'aw-rays').setDepth(706).setAlpha(0).setScale(1.5);
    this.tweens.add({ targets: glow, alpha: 0.8, duration: 300 });
    this.tweens.add({ targets: glow, angle: 360, duration: 6000, repeat: -1 });
    const stat = this.add.image(cx, 880, key).setDepth(740).setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: stat, y: 730, scale: 0.75, alpha: 1, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({ targets: stat, angle: { from: -6, to: 6 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.fx.stars(cx, 720, N.sun, 18);
    await this.wait(900);
    if (!this.alive()) return;

    // Vinderen!
    const winners = this.contestants.filter((c) => award.slots.includes(c.p.slot));
    const names = winners.map((w) => w.p.name).join(' & ');
    const nameText = label(this, cx, 548, `${names}!`, 54, { color: winners.length === 1 ? winners[0].p.color : C.sun }).setDepth(735);
    this.fx.popIn(nameText);
    this.dimTo(0, 300);
    this.sfx('win');
    this.sfx('cheer', { delay: 0.1 });
    this.crowdJump();
    audio.say(`${names}!`, true);
    this.aimBeams(winners.map((w) => w.blok.x));
    winners.forEach((w) => w.blok.cheer());
    await this.wait(600);
    if (!this.alive()) return;

    // Vinderne går op midt på scenen
    const spots = winners.map((_, i) => cx + (i - (winners.length - 1) / 2) * 200);
    await Promise.all(winners.map((w, i) => this.walkTo(w.blok, spots[i])));
    if (!this.alive()) return;
    this.aimBeams(spots);
    // Statuetten flyver ned i hænderne (ved uafgjort får alle en kopi)
    winners.forEach((w, i) => {
      const copy = i === 0 ? stat : this.add.image(stat.x, stat.y, key).setDepth(740).setScale(0.75);
      this.tweens.killTweensOf(copy);
      copy.setAngle(0);
      this.tweens.add({ targets: copy, x: spots[i], y: FLOOR - 250, scale: 0.42, duration: 450, ease: 'Quad.easeInOut' });
      w.blok.setFacing(1);
      w.blok.hop(80, 260);
      w.trophies.push(copy);
      w.bonus += BONUS_POINTS;
      this.time.delayedCall(460, () => {
        w.blok.dance();
        this.fx.burst(spots[i], FLOOR - 250, { texture: TEX.star, color: [N.sun, 0xffffff, w.p.colorNum], count: 26, speed: 700, gravity: 700 });
        this.fx.floatText(spots[i] + 150, FLOOR - 260, `+${BONUS_POINTS}`, C.mint, 72);
        this.sfx('coin', { pitch: 1 + i * 0.1 });
        this.addScore(w, BONUS_POINTS);
        this.tweens.add({ targets: copy, y: FLOOR - 262, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    });
    this.tweens.add({ targets: glow, alpha: 0, duration: 400, onComplete: () => glow.destroy() });
    this.fx.confetti(1200);
    await this.wait(1900);
    if (!this.alive()) return;

    // Ryd op og gå tilbage
    [cardWorld, t1, t2, nameText].forEach((o) => this.tweens.add({ targets: o, alpha: 0, scale: 0.8, duration: 260, onComplete: () => o.destroy() }));
    await Promise.all(
      winners.map(async (w) => {
        const tro = w.trophies[w.trophies.length - 1];
        this.tweens.killTweensOf(tro);
        const slot = w.trophies.length - 1;
        this.tweens.add({ targets: tro, x: w.wing + (slot % 2 ? 1 : -1) * (70 + Math.floor(slot / 2) * 40), y: FLOOR - 36, scale: 0.26, duration: 700, ease: 'Quad.easeInOut' });
        tro.setDepth(480);
        await this.walkTo(w.blok, w.wing);
        w.blok.idle();
      }),
    );
    this.sweepBeams();
  }

  // ---------------------------------------------------------------------------
  // Podiet

  private async podium(players: PlayerView[]): Promise<void> {
    const order = [...players].sort((a, b) => b.score - a.score);
    const place = (p: PlayerView) => order.filter((o) => o.score > p.score).length;
    const cx = W / 2;

    const header = this.children.getByName('header') as Phaser.GameObjects.Text | null;
    this.marquee(header, 'SAMLET STILLING');
    audio.say('Og nu… den samlede stilling!', true);
    this.dimTo(0.3, 500);
    this.sfx('rumble');
    this.fx.shake(0.004, 1200);

    // Podiet hæver sig op af scenen
    const blocks = order.map((p, i) => {
      const spec = PODIUM[Math.min(i, 3)];
      const pl = place(p);
      const img = this.add.image(spec.x, PODIUM_BASE + spec.h + 60, spec.key).setOrigin(0.5, 1).setDepth(300);
      const num = title(this, spec.x, PODIUM_BASE + spec.h + 60 - spec.h / 2 + 6, String(pl + 1), Math.min(110, spec.h * 0.75), { color: C.ink, stroke: 0 }).setDepth(301).setAlpha(0.55);
      num.setShadow(0, 0, '#000', 0);
      this.tweens.add({ targets: [img, num], y: `-=${spec.h + 60}`, duration: 1100, delay: (3 - Math.min(i, 3)) * 120, ease: 'Back.easeOut' });
      return { img, spec, pl };
    });
    this.fx.dust(cx, PODIUM_BASE - 10, 20);
    await this.wait(1400);
    if (!this.alive()) return;

    // Alle går hen foran deres klods
    const byPlayer = new Map(order.map((p, i) => [p.slot, blocks[i]]));
    const contestants = order.map((p) => this.contestants.find((c) => c.p.slot === p.slot)!).filter(Boolean);
    for (const c of contestants) c.blok.hideTag();
    // Pokalerne følger med til podiet
    await Promise.all(
      contestants.map(async (c) => {
        const b = byPlayer.get(c.p.slot)!;
        const tx = b.spec.x;
        c.trophies.forEach((t, k) => this.tweens.add({ targets: t, x: tx + (k % 2 ? 1 : -1) * (60 + Math.floor(k / 2) * 34), y: PODIUM_BASE - b.spec.h - 52, duration: 900, ease: 'Quad.easeInOut', onStart: () => t.setDepth(520) }));
        this.tweens.add({ targets: c.plate, x: tx, duration: 900, ease: 'Quad.easeInOut' });
        await this.walkTo(c.blok, tx, 600);
      }),
    );
    if (!this.alive()) return;

    // Afslør 4., 3., 2. ...
    const reveal = async (c: Contestant) => {
      const b = byPlayer.get(c.p.slot)!;
      const top = PODIUM_BASE - b.spec.h - 14;
      await this.hopOnto(c.blok, b.spec.x, top);
      const nm = label(this, b.spec.x, top - 262, c.p.name, 40, { color: c.p.color }).setDepth(760);
      this.fx.popIn(nm);
      this.sfx('coin', { pitch: 0.8 + (3 - b.pl) * 0.1 });
      this.fx.burst(b.spec.x, top, { texture: TEX.star, color: [c.p.colorNum, 0xffffff], count: 14, speed: 500 });
      b.pl === order.length - 1 && order.length > 1 ? c.blok.sad() : c.blok.cheer();
      this.vibrate(c.p);
    };
    const notWinners = contestants.filter((c) => byPlayer.get(c.p.slot)!.pl > 0).reverse();
    for (const c of notWinners) {
      await reveal(c);
      await this.wait(650);
      if (!this.alive()) return;
    }

    // ...og vinderen!
    const champs = contestants.filter((c) => byPlayer.get(c.p.slot)!.pl === 0);
    const names = champs.map((c) => c.p.name).join(' & ');
    this.marquee(header, 'OG VINDEREN ER…');
    this.dimTo(0.55, 400);
    this.sfx('drumroll', { volume: 1.2 });
    this.time.delayedCall(1050, () => this.sfx('drumroll', { volume: 1.4 }));
    this.sweepBeams(true);
    await this.wait(2200);
    if (!this.alive()) return;
    for (let i = 0; i < champs.length; i++) {
      const c = champs[i];
      const b = byPlayer.get(c.p.slot)!;
      await this.hopOnto(c.blok, b.spec.x + (i - (champs.length - 1) / 2) * 110, PODIUM_BASE - b.spec.h - 14, 1.25);
    }
    if (!this.alive()) return;
    this.celebrate(champs, names);

    // Telefonerne får deres resultat
    for (const p of players) {
      if (p.isBot) continue;
      const pl = place(p);
      const c = this.contestants.find((k) => k.p.slot === p.slot);
      const msg = pl === 0 ? 'DU VANDT HELE SPILLET! 👑' : pl === 1 ? 'Så tæt på! Flot klaret! 🥈' : pl === order.length - 1 ? 'Tak for kampen – revanche? 🍪' : 'Tak for spillet! 🎉';
      net.setLayout(p.slot, { kind: 'result', place: pl + 1, points: c?.bonus ?? 0, total: p.score, message: msg, accent: p.color });
    }

    body(this, cx, H - 26, 'Tryk ENTER for at spille igen', 28, { stroke: 6 }).setDepth(1200).setAlpha(0.85);
    const again = () => {
      if (this.ended) return;
      this.ended = true;
      this.director.awardsDone();
    };
    this.input.keyboard?.once('keydown-ENTER', again);
    this.time.delayedCall(30000, again);
  }

  private celebrate(champs: Contestant[], names: string): void {
    const cx = W / 2;
    this.dimTo(0, 300);
    this.fx.flash(0xffffff, 400, 0.8);
    this.fx.shake(0.012, 400);
    this.sfx('win');
    this.sfx('fanfare', { delay: 0.3 });
    this.sfx('cheer');
    this.sfx('explosion', { volume: 0.6, pitch: 1.3 });
    audio.say(`${names} vinder SaMi Party! Klap for vinderen!`, true);
    this.crowdJump(true);

    const header = this.children.getByName('header') as Phaser.GameObjects.Text | null;
    if (header) {
      this.tweens.killTweensOf(header);
      this.tweens.add({ targets: header, alpha: 0, duration: 200 });
    }
    const ribbonBg = this.add.rectangle(cx, 215, W + 100, 150, N.ink, 0.85).setDepth(1090).setAngle(-3).setScale(0, 1);
    this.tweens.add({ targets: ribbonBg, scaleX: 1, duration: 300, ease: 'Cubic.easeOut' });
    const big = title(this, cx, 206, `${names.toUpperCase()} VINDER!`, names.length > 16 ? 84 : 104, { color: C.sun }).setDepth(1100).setAngle(-3);
    big.setScale(0);
    this.tweens.add({
      targets: big,
      scale: 1,
      delay: 100,
      duration: 420,
      ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: big, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
    });
    const burst = this.add.image(cx, PODIUM_BASE - PODIUM[0].h - 140, 'aw-rays').setDepth(250).setAlpha(0).setScale(2.2);
    this.tweens.add({ targets: burst, alpha: 0.9, duration: 600 });
    this.tweens.add({ targets: burst, angle: 360, duration: 9000, repeat: -1 });

    champs.forEach((c, i) => {
      const x = c.blok.x;
      const head = c.blok.y - 228 * c.blok.size * c.blok.scaleY;
      const crown = this.add.image(x, -150, 'aw-crown').setDepth(800).setScale(0.55).setAngle(-30);
      this.tweens.add({
        targets: crown,
        y: head - 8,
        angle: 0,
        duration: 700,
        delay: 300 + i * 200,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          this.sfx('ding');
          this.fx.stars(x, head, N.sun, 14);
          this.tweens.add({ targets: crown, y: head - 22, angle: { from: -6, to: 6 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },
      });
      c.blok.dance();
      const glow = this.add.image(x, PODIUM_BASE - PODIUM[0].h, 'aw-pool').setDepth(299).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4, 1.2);
      this.tweens.add({ targets: glow, alpha: 0.5, duration: 500, yoyo: true, repeat: -1 });
    });
    this.aimBeams(champs.map((c) => c.blok.x));
    this.beams.forEach((b) => this.tweens.add({ targets: b, alpha: 0.5, duration: 400 }));
    this.fx.confetti(9000);
    // Fyrværkeri
    for (let i = 0; i < 14; i++) this.time.delayedCall(200 + i * (i < 6 ? 380 : 900), () => this.firework());
    // De andre klapper
    this.time.delayedCall(2500, () => this.contestants.filter((c) => !champs.includes(c)).forEach((c, i) => this.time.delayedCall(i * 200, () => c.blok.hop(50, 200))));
  }

  // ---------------------------------------------------------------------------
  // Hjælpere

  private addScore(c: Contestant, pts: number): void {
    const from = c.score;
    c.score += pts;
    this.tweens.addCounter({ from, to: c.score, duration: 600, onUpdate: (tw) => c.scoreText.setText(String(Math.round(tw.getValue() ?? c.score))) });
    this.tweens.add({ targets: c.plate, scale: 1.2, duration: 140, yoyo: true, repeat: 1 });
    this.fx.burst(c.plate.x, c.plate.y, { texture: TEX.coin, count: 8, speed: 400, scale: 0.5 });
  }

  private walkTo(blok: Blok, x: number, speed = 520): Promise<void> {
    return new Promise((resolve) => {
      const dist = Math.abs(blok.x - x);
      if (dist < 4) return resolve();
      const w: Walker = { blok, dir: Math.sign(x - blok.x) };
      this.walkers.push(w);
      this.tweens.add({
        targets: blok,
        x,
        duration: (dist / speed) * 1000,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.walkers = this.walkers.filter((k) => k !== w);
          blok.walk(0, 0, 16);
          resolve();
        },
      });
    });
  }

  private hopOnto(blok: Blok, x: number, y: number, scale = 1.05): Promise<void> {
    return new Promise((resolve) => {
      this.sfx('jump');
      const startY = blok.y;
      const peak = Math.min(startY, y) - 140;
      blok.setDepth(560);
      this.tweens.add({ targets: blok, x, duration: 520, ease: 'Linear' });
      this.tweens.add({ targets: blok, scale, duration: 520 });
      this.tweens.add({
        targets: blok,
        y: peak,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () =>
          this.tweens.add({
            targets: blok,
            y,
            duration: 260,
            ease: 'Quad.easeIn',
            onComplete: () => {
              blok.squash(1.3, 0.75);
              this.sfx('stomp', { volume: 0.7 });
              this.fx.dust(x, y, 10);
              resolve();
            },
          }),
      });
    });
  }

  /** Skift teksten på marquee-skiltet med en lille vende-animation. */
  private marquee(text: Phaser.GameObjects.Text | null, value: string): void {
    if (!text) return;
    this.tweens.killTweensOf(text);
    this.tweens.add({
      targets: text,
      scaleY: 0,
      duration: 140,
      ease: 'Quad.easeIn',
      onComplete: () => {
        text.setText(value).setScale(1, 0).setAlpha(1);
        this.sfx('select');
        this.tweens.add({
          targets: text,
          scaleY: 1,
          duration: 260,
          ease: 'Back.easeOut',
          onComplete: () => this.tweens.add({ targets: text, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
        });
      },
    });
  }

  private dimTo(alpha: number, ms: number): void {
    this.tweens.add({ targets: this.dim, fillAlpha: alpha, duration: ms });
  }

  /** Lyskeglerne fejer vildt rundt (trommehvirvel). */
  private sweepBeams(fast = false): void {
    this.beams.forEach((b, i) => {
      this.tweens.killTweensOf(b);
      this.tweens.add({
        targets: b,
        rotation: { from: (i - 1) * 0.5 - 0.45, to: (i - 1) * 0.5 + 0.45 },
        duration: (fast ? 380 : 1600) + i * 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  /** Ret lyskeglerne mod nogle x-positioner på scenen. */
  private aimBeams(xs: number[]): void {
    this.beams.forEach((b, i) => {
      this.tweens.killTweensOf(b);
      const tx = xs[i % xs.length] ?? W / 2;
      const target = -Math.atan2(tx - b.x, FLOOR - 120 - b.y);
      this.tweens.add({ targets: b, rotation: target, duration: 380, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: b, scaleX: 1.15, duration: 300, yoyo: true, repeat: -1, delay: 400, ease: 'Sine.easeInOut' });
    });
  }

  private crowdJump(big = false): void {
    this.crowd.forEach((c, i) =>
      this.tweens.add({ targets: c, scaleY: big ? 1.12 : 1.06, y: c.y - (big ? 30 : 18), duration: 160, yoyo: true, repeat: big ? 5 : 2, delay: i * 80, ease: 'Quad.easeOut' }),
    );
  }

  private ribbon(text: string, color: string, y = 380): Phaser.GameObjects.Container {
    const c = this.add.container(W / 2, y).setDepth(1080);
    const t = label(this, 0, 0, text, 40, { color });
    const g = this.add.graphics();
    const w = t.width + 90;
    g.fillStyle(N.ink, 0.85).fillRoundedRect(-w / 2, -34, w, 68, 34);
    g.lineStyle(4, N.sun, 0.8).strokeRoundedRect(-w / 2 + 6, -28, w - 12, 56, 28);
    c.add([g, t]);
    c.setScale(0, 1);
    this.tweens.add({ targets: c, scaleX: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 2200, duration: 300, onComplete: () => c.destroy() });
    return c;
  }

  private firework(): void {
    if (!this.alive()) return;
    const x = Phaser.Math.Between(260, W - 260);
    const y = Phaser.Math.Between(140, 460);
    const colors = [N.sun, N.bubblegum, N.mint, N.sky, N.grape, N.tangerine];
    const col = colors[Phaser.Math.Between(0, colors.length - 1)];
    const rocket = this.add.image(x, H - 120, TEX.spark).setTint(col).setDepth(620).setScale(0.5);
    this.sfx('whoosh', { pitch: 1.7, volume: 0.35 });
    this.tweens.add({
      targets: rocket,
      y,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => {
        rocket.destroy();
        this.fx.burst(x, y, { texture: TEX.spark, color: [col, 0xffffff], count: 34, speed: 520, gravity: 180, lifespan: 1300, scale: 0.7, depth: 620 });
        this.fx.burst(x, y, { texture: TEX.dot, color: col, count: 16, speed: 260, gravity: 100, lifespan: 900, scale: 0.3, depth: 620 });
        this.sfx('explosion', { volume: 0.3, pitch: 1.8 + Math.random() * 0.6 });
      },
    });
  }

  private vibrate(p: PlayerView): void {
    if (!p.isBot) net.vibrate(p.slot, 200);
  }

  private sfx(name: Parameters<typeof audio.sfx>[0], opts?: Parameters<typeof audio.sfx>[1]): void {
    audio.sfx(name, opts);
  }

  private alive(): boolean {
    return this.sys.isActive() && !this.ended;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}

