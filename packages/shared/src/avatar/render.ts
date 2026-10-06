import { shade } from '../color';
import type { Avatar, ExtraId, FaceId, HatId } from './types';

/**
 * SVG-tegning af blokfigurer. Alt tegnes i ét fælles "figur-koordinatsystem":
 * figuren er 160 bred, fødderne står på y = 214, og hatte kan gå op til y = -64.
 *
 * - Telefonen bruger `renderAvatarSvg()` (hele figuren i ét billede).
 * - TV'et bruger `renderAvatarPart()` (hoved, krop, arm, ben, ryg hver for sig), så delene kan animeres.
 *   Hver del beskæres med sin `PART_BOXES`-boks; `PART_PIVOTS` er punktet delen drejer om.
 */

export const INK = '#1a1446';
const STROKE = 7;

export type AvatarPart = 'head' | 'torso' | 'arm' | 'leg' | 'back';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FIGURE_BOX: Box = { x: -24, y: -70, w: 208, h: 292 };
export const FEET = { x: 80, y: 214 };

export const PART_BOXES: Record<AvatarPart, Box> = {
  head: { x: -14, y: -70, w: 188, h: 176 },
  torso: { x: 24, y: 84, w: 112, h: 90 },
  arm: { x: 10, y: 90, w: 38, h: 80 },
  leg: { x: 42, y: 148, w: 42, h: 72 },
  back: { x: -24, y: 78, w: 208, h: 126 },
};

/** Drejepunkter (i figur-koordinater). Højre arm/ben = venstre spejlet om x = 80 / forskudt. */
export const PART_PIVOTS: Record<AvatarPart, { x: number; y: number }> = {
  head: { x: 80, y: 98 },
  torso: { x: 80, y: 166 },
  arm: { x: 29, y: 104 },
  leg: { x: 63, y: 158 },
  back: { x: 80, y: 100 },
};

/** Afstand mellem venstre og højre ben (højre ben = venstre ben + denne x). */
export const LEG_SPACING = 34;

export interface RenderOptions {
  /** Øjnene lukket (til blink-animation). */
  blink?: boolean;
  /** Unikt prefix til gradient-id'er, hvis flere SVG'er indlejres i samme dokument. */
  idPrefix?: string;
}

// ---------------------------------------------------------------------------
// Små byggeklodser

/** Kontur-attributter. `width` overstyrer standard-tykkelsen. */
const s = (width: number = STROKE) => `stroke="${INK}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"`;

function linGrad(id: string, top: string, bottom: string, x2 = 0, y2 = 1): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
}

function shine(x: number, y: number, w: number, h: number, opacity = 0.35): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff" opacity="${opacity}"/>`;
}

class Defs {
  private readonly items: string[] = [];
  constructor(private readonly prefix: string) {}
  grad(name: string, top: string, bottom: string, horizontal = false): string {
    const id = `${this.prefix}${name}`;
    this.items.push(linGrad(id, top, bottom, horizontal ? 1 : 0, horizontal ? 0 : 1));
    return `url(#${id})`;
  }
  toString(): string {
    return this.items.length ? `<defs>${this.items.join('')}</defs>` : '';
  }
}

// ---------------------------------------------------------------------------
// Ansigter (centreret omkring øjne ved (58,50) og (102,50))

function eyeOpen(cx: number, cy: number, r = 12, px = 2, py = 3): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r + 2}" fill="#fff" ${s(5)}/>
<circle cx="${cx + px}" cy="${cy + py}" r="${r * 0.55}" fill="${INK}"/>
<circle cx="${cx + px + 3}" cy="${cy + py - 4}" r="${r * 0.2}" fill="#fff"/>`;
}

function eyeClosed(cx: number, cy: number): string {
  return `<path d="M${cx - 11} ${cy} Q${cx} ${cy + 9} ${cx + 11} ${cy}" fill="none" ${s(6)}/>`;
}

function cheeks(): string {
  return `<ellipse cx="38" cy="70" rx="10" ry="6" fill="#ff5f8a" opacity="0.4"/><ellipse cx="122" cy="70" rx="10" ry="6" fill="#ff5f8a" opacity="0.4"/>`;
}

const SMILE = `<path d="M60 68 Q80 94 100 68 Z" fill="#7a1f3d" ${s(5)}/><path d="M70 80 Q80 88 90 80 Q80 76 70 80Z" fill="#ff7b9c"/>`;

function face(id: FaceId, skin: string, blink: boolean): string {
  const eyes = (l: string, r: string) => (blink ? eyeClosed(58, 50) + eyeClosed(102, 50) : l + r);
  switch (id) {
    case 'happy':
      return eyes(eyeOpen(58, 48), eyeOpen(102, 48)) + SMILE + cheeks();
    case 'grumpy': {
      const lids = blink
        ? ''
        : `<path d="M44 40 L72 46 L72 36 L44 30Z" fill="${skin}"/><path d="M116 40 L88 46 L88 36 L116 30Z" fill="${skin}"/>`;
      return (
        eyes(eyeOpen(58, 50, 11, 1, 4), eyeOpen(102, 50, 11, -1, 4)) +
        lids +
        `<path d="M42 32 L74 44" ${s(8)}/><path d="M118 32 L86 44" ${s(8)}/>` +
        `<path d="M64 82 Q80 70 96 82" fill="none" ${s(6)}/>`
      );
    }
    case 'derp':
      return (
        eyes(eyeOpen(56, 46, 15, -5, -4), eyeOpen(104, 52, 9, 3, 3)) +
        `<path d="M62 70 Q80 90 98 70 Z" fill="#7a1f3d" ${s(5)}/>` +
        `<path d="M78 78 Q78 96 88 96 Q96 96 94 80Z" fill="#ff7b9c" ${s(4)}/>` +
        cheeks()
      );
    case 'cool':
      return (
        `<path d="M36 40 H124 V52 Q124 64 110 64 H96 Q88 64 86 52 H74 Q72 64 64 64 H50 Q36 64 36 52Z" fill="${INK}" ${s(4)}/>` +
        `<path d="M44 44 L52 44 M98 44 L108 44" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>` +
        `<path d="M64 78 Q84 88 100 72" fill="none" ${s(6)}/>`
      );
    case 'surprised':
      return (
        eyes(eyeOpen(58, 48, 13, 0, 0), eyeOpen(102, 48, 13, 0, 0)) +
        `<path d="M44 26 Q58 18 70 26 M90 26 Q102 18 116 26" fill="none" ${s(6)}/>` +
        `<ellipse cx="80" cy="80" rx="9" ry="11" fill="#7a1f3d" ${s(5)}/>`
      );
    case 'sleepy':
      return (
        eyeClosed(58, 50) +
        eyeClosed(102, 50) +
        `<path d="M48 40 Q58 36 68 40 M92 40 Q102 36 112 40" fill="none" ${s(4)} opacity="0.5"/>` +
        `<ellipse cx="80" cy="78" rx="6" ry="5" fill="#7a1f3d" ${s(4)}/>` +
        cheeks()
      );
    case 'wink':
      return (
        (blink ? eyeClosed(58, 50) : eyeOpen(58, 48)) +
        `<path d="M92 52 L102 44 L112 52" fill="none" ${s(6)}/>` +
        SMILE +
        cheeks()
      );
    case 'glasses':
      return (
        (blink
          ? eyeClosed(58, 52) + eyeClosed(102, 52)
          : `<circle cx="58" cy="52" r="5" fill="${INK}"/><circle cx="102" cy="52" r="5" fill="${INK}"/>`) +
        `<circle cx="58" cy="50" r="17" fill="#bfe8ff" fill-opacity="0.35" ${s(5)}/>` +
        `<circle cx="102" cy="50" r="17" fill="#bfe8ff" fill-opacity="0.35" ${s(5)}/>` +
        `<path d="M75 48 Q80 44 85 48" fill="none" ${s(4)}/>` +
        `<path d="M66 76 Q80 86 94 76" fill="none" ${s(5)}/>` +
        cheeks()
      );
  }
}

// ---------------------------------------------------------------------------
// Hatte (over hovedet, y < ~30)

function hat(id: HatId, d: Defs, a: Avatar): { behind: string; front: string } {
  const steel = () => d.grad('steel', '#f1f4fb', '#8a93a8');
  switch (id) {
    case 'none':
      return { behind: '', front: '' };
    case 'party': {
      const fill = d.grad('party', '#ff8cc0', '#e0307a');
      return {
        behind: '',
        front:
          `<path d="M50 16 L110 16 L86 -52 Z" fill="${fill}" ${s()}/>` +
          `<path d="M62 -2 L100 -6 M70 -22 L94 -26" stroke="#ffcf3a" stroke-width="8" stroke-linecap="round"/>` +
          `<circle cx="86" cy="-54" r="11" fill="#ffcf3a" ${s(5)}/>`,
      };
    }
    case 'crown': {
      const gold = d.grad('gold', '#fff3a0', '#e6a100');
      return {
        behind: '',
        front:
          `<path d="M32 20 L32 -16 L56 2 L80 -30 L104 2 L128 -16 L128 20 Z" fill="${gold}" ${s()}/>` +
          `<circle cx="80" cy="6" r="7" fill="#ff4b4b" ${s(4)}/>` +
          `<circle cx="52" cy="10" r="5" fill="#3d8bff" ${s(3)}/><circle cx="108" cy="10" r="5" fill="#3ccf5a" ${s(3)}/>` +
          shine(40, 12, 30, 5, 0.6),
      };
    }
    case 'cap': {
      const fill = d.grad('cap', shade(a.shirt, 0.2), shade(a.shirt, -0.15));
      return {
        behind: '',
        front:
          `<path d="M96 22 Q146 14 162 30 Q134 40 96 34 Z" fill="${shade(a.shirt, -0.3)}" ${s()}/>` +
          `<path d="M22 32 Q22 -12 80 -14 Q138 -12 138 32 Z" fill="${fill}" ${s()}/>` +
          `<circle cx="80" cy="-14" r="6" fill="${shade(a.shirt, -0.3)}" ${s(4)}/>` +
          shine(38, 0, 40, 7),
      };
    }
    case 'wizard': {
      const fill = d.grad('wiz', '#b98cff', '#5b2fc9');
      return {
        behind: '',
        front:
          `<path d="M28 22 L132 22 L96 -40 Q90 -62 70 -58 Q86 -50 84 -40 Z" fill="${fill}" ${s()}/>` +
          `<ellipse cx="80" cy="22" rx="66" ry="11" fill="#4a24a8" ${s()}/>` +
          `<path d="M70 -4 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#ffcf3a"/>` +
          `<circle cx="96" cy="-18" r="4" fill="#ffcf3a"/><circle cx="58" cy="10" r="3" fill="#ffcf3a"/>`,
      };
    }
    case 'viking': {
      const horn = d.grad('horn', '#fff6e0', '#d9c08a');
      return {
        behind:
          `<path d="M30 20 Q-2 10 -6 -36 Q14 -6 40 -2 Z" fill="${horn}" ${s()}/>` +
          `<path d="M130 20 Q162 10 166 -36 Q146 -6 120 -2 Z" fill="${horn}" ${s()}/>`,
        front:
          `<path d="M20 36 Q20 -16 80 -18 Q140 -16 140 36 Z" fill="${steel()}" ${s()}/>` +
          `<path d="M20 30 H140" ${s(12)}/><path d="M20 30 H140" stroke="#c9a14a" stroke-width="5"/>` +
          `<path d="M80 -18 V30" stroke="#c9a14a" stroke-width="6"/>` +
          shine(36, -4, 34, 7, 0.6),
      };
    }
    case 'chef':
      return {
        behind: '',
        front:
          `<circle cx="48" cy="-12" r="24" fill="#fff" ${s()}/><circle cx="112" cy="-12" r="24" fill="#fff" ${s()}/>` +
          `<circle cx="80" cy="-28" r="30" fill="#fff" ${s()}/>` +
          `<rect x="32" y="-6" width="96" height="30" rx="6" fill="#f3f0ff" ${s()}/>` +
          `<path d="M56 -2 V20 M80 -2 V20 M104 -2 V20" stroke="#d9d4f0" stroke-width="4"/>`,
      };
    case 'propeller': {
      const fill = d.grad('beanie', '#ffe066', '#ff8a2b');
      return {
        behind: '',
        front:
          `<path d="M22 34 Q22 -12 80 -14 Q138 -12 138 34 Z" fill="${fill}" ${s()}/>` +
          `<path d="M52 -6 Q50 14 52 32 M108 -6 Q110 14 108 32" stroke="#3d8bff" stroke-width="10"/>` +
          `<path d="M22 34 Q22 -12 80 -14 Q138 -12 138 34 Z" fill="none" ${s()}/>` +
          `<rect x="76" y="-34" width="8" height="22" fill="${INK}"/>` +
          `<ellipse cx="56" cy="-36" rx="26" ry="8" fill="#ff4b4b" ${s(5)}/>` +
          `<ellipse cx="104" cy="-36" rx="26" ry="8" fill="#3d8bff" ${s(5)}/>` +
          `<circle cx="80" cy="-36" r="6" fill="#ffcf3a" ${s(4)}/>`,
      };
    }
    case 'tophat': {
      const fill = d.grad('top', '#4a4470', '#16122e');
      return {
        behind: '',
        front:
          `<rect x="44" y="-54" width="72" height="72" rx="6" fill="${fill}" ${s()}/>` +
          `<rect x="44" y="-4" width="72" height="14" fill="#ff4b4b" ${s(5)}/>` +
          `<ellipse cx="80" cy="20" rx="66" ry="10" fill="#2b2650" ${s()}/>` +
          shine(52, -46, 8, 34, 0.25),
      };
    }
    case 'knight': {
      const plume = d.grad('plume', '#ff7b7b', '#c81e3a');
      return {
        behind: `<path d="M86 -14 Q110 -66 150 -50 Q126 -46 116 -30 Q138 -36 146 -20 Q118 -22 100 -4 Z" fill="${plume}" ${s()}/>`,
        front:
          `<path d="M14 74 L14 30 Q14 -18 80 -20 Q146 -18 146 30 L146 74 L128 74 L128 34 L32 34 L32 74 Z" fill="${steel()}" ${s()}/>` +
          `<path d="M80 -20 V34" stroke="#8a93a8" stroke-width="6"/>` +
          `<circle cx="24" cy="44" r="4" fill="${INK}"/><circle cx="136" cy="44" r="4" fill="${INK}"/>` +
          shine(30, -6, 30, 7, 0.7),
      };
    }
    case 'bun':
      return {
        behind: `<circle cx="80" cy="-16" r="22" fill="#e4e4f0" ${s()}/><path d="M64 -30 L100 -4" stroke="#ff5fa2" stroke-width="5" stroke-linecap="round"/>`,
        front:
          `<path d="M18 46 Q16 -6 80 -8 Q144 -6 142 46 Q126 20 80 22 Q34 20 18 46 Z" fill="#e4e4f0" ${s()}/>` +
          `<path d="M44 6 Q60 0 76 6 M88 6 Q104 0 120 6" stroke="#b9b9cc" stroke-width="4" fill="none"/>`,
      };
    case 'gills': {
      const g = shade(a.skin, -0.25);
      const frond = (x: number, y: number, rot: number) =>
        `<ellipse cx="${x}" cy="${y}" rx="22" ry="8" transform="rotate(${rot} ${x} ${y})" fill="${g}" ${s(5)}/>`;
      return {
        behind:
          frond(14, 22, -30) + frond(6, 46, 0) + frond(14, 70, 30) + frond(146, 22, 30) + frond(154, 46, 0) + frond(146, 70, -30),
        front: '',
      };
    }
    case 'toast': {
      const crust = d.grad('crust', '#e0a050', '#a86420');
      return {
        behind:
          `<path d="M42 20 V-30 Q42 -52 62 -52 Q72 -62 80 -54 Q88 -62 98 -52 Q118 -52 118 -30 V20 Z" fill="${crust}" ${s()}/>` +
          `<path d="M52 20 V-26 Q52 -42 66 -42 Q74 -50 80 -44 Q86 -50 94 -42 Q108 -42 108 -26 V20 Z" fill="#f7dca4"/>`,
        front: `<rect x="34" y="6" width="92" height="8" rx="4" fill="${INK}" opacity="0.7"/>`,
      };
    }
    case 'grass': {
      const grass = d.grad('grass', '#7be04f', '#3d9e2a');
      return {
        behind: '',
        front:
          `<path d="M22 6 H138 V40 H126 V48 H112 V36 H96 V46 H80 V36 H64 V50 H48 V38 H34 V46 H22 Z" fill="${grass}" ${s()}/>` +
          `<rect x="40" y="14" width="10" height="10" fill="#2f7d20"/><rect x="100" y="18" width="10" height="10" fill="#2f7d20"/><rect x="70" y="10" width="8" height="8" fill="#a6f07e"/>`,
      };
    }
    case 'stem':
      return {
        behind: '',
        front:
          `<path d="M72 10 Q70 -16 84 -30 L96 -24 Q86 -10 88 10 Z" fill="#7a5a2a" ${s()}/>` +
          `<path d="M84 -30 L96 -24 L92 -34 Z" fill="${INK}"/>`,
      };
  }
}

// ---------------------------------------------------------------------------
// Ekstra udstyr

function extraBack(id: ExtraId, d: Defs, a: Avatar): string {
  switch (id) {
    case 'cape': {
      const fill = d.grad('cape', '#ff5f6d', '#a3122e');
      return `<path d="M38 96 L122 96 L150 196 Q130 186 116 198 Q98 186 80 198 Q62 186 44 198 Q30 186 10 196 Z" fill="${fill}" ${s()}/>`;
    }
    case 'wings': {
      const fill = d.grad('wing', '#ffffff', '#cfe3ff');
      const wing = (dir: 1 | -1) => {
        const x = (v: number) => 80 + dir * v;
        return `<path d="M${x(30)} 110 Q${x(90)} 70 ${x(104)} 100 Q${x(96)} 112 ${x(88)} 116 Q${x(98)} 126 ${x(86)} 138 Q${x(70)} 140 ${x(40)} 140 Z" fill="${fill}" ${s()}/>`;
      };
      return wing(-1) + wing(1);
    }
    case 'backpack': {
      const fill = d.grad('pack', shade(a.pants, 0.25), shade(a.pants, -0.1));
      return `<rect x="22" y="100" width="116" height="78" rx="18" fill="${fill}" ${s()}/>`;
    }
    default:
      return '';
  }
}

function extraFront(id: ExtraId, d: Defs, a: Avatar): string {
  switch (id) {
    case 'bowtie':
      return (
        `<path d="M80 104 L58 92 L58 118 Z M80 104 L102 92 L102 118 Z" fill="#ff4b4b" ${s(5)}/>` +
        `<circle cx="80" cy="104" r="7" fill="#c81e3a" ${s(4)}/>`
      );
    case 'scarf': {
      const fill = d.grad('scarf', '#ffe066', '#ff8a2b');
      return (
        `<rect x="36" y="88" width="88" height="20" rx="10" fill="${fill}" ${s()}/>` +
        `<path d="M96 100 L112 100 L116 142 L98 142 Z" fill="${fill}" ${s()}/>` +
        `<path d="M100 132 H114" stroke="#ff4b4b" stroke-width="4"/>`
      );
    }
    case 'medal': {
      const gold = d.grad('medal', '#fff3a0', '#e6a100');
      return (
        `<path d="M64 94 L80 124 L96 94" fill="none" stroke="#3d8bff" stroke-width="10"/>` +
        `<circle cx="80" cy="130" r="14" fill="${gold}" ${s(5)}/>` +
        `<path d="M80 122 l2.5 5 5.5 .8 -4 3.9 1 5.5 -5 -2.6 -5 2.6 1 -5.5 -4 -3.9 5.5 -.8z" fill="#fff6e0"/>`
      );
    }
    case 'backpack':
      return (
        `<path d="M44 96 Q46 130 48 160 M116 96 Q114 130 112 160" fill="none" ${s(12)}/>` +
        `<path d="M44 96 Q46 130 48 160 M116 96 Q114 130 112 160" fill="none" stroke="${shade(a.pants, 0.1)}" stroke-width="5"/>`
      );
    default:
      return '';
  }
}

const MUSTACHE = `<path d="M80 66 Q66 58 54 64 Q44 70 40 62 Q42 78 58 76 Q72 74 80 70 Q88 74 102 76 Q118 78 120 62 Q116 70 106 64 Q94 58 80 66 Z" fill="#5a3418" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;

// ---------------------------------------------------------------------------
// Delene

function headSvg(a: Avatar, d: Defs, opts: RenderOptions): string {
  const h = hat(a.hat, d, a);
  const skin = d.grad('skin', shade(a.skin, 0.18), shade(a.skin, -0.12));
  return (
    h.behind +
    `<rect x="22" y="6" width="116" height="90" rx="22" fill="${skin}" ${s()}/>` +
    shine(34, 14, 50, 9) +
    face(a.face, a.skin, opts.blink ?? false) +
    (a.extra === 'mustache' ? MUSTACHE : '') +
    h.front
  );
}

function torsoSvg(a: Avatar, d: Defs): string {
  const shirt = d.grad('shirt', shade(a.shirt, 0.15), shade(a.shirt, -0.15));
  return (
    `<rect x="34" y="146" width="92" height="22" rx="8" fill="${shade(a.pants, -0.05)}" ${s()}/>` +
    `<rect x="34" y="92" width="92" height="66" rx="16" fill="${shirt}" ${s()}/>` +
    shine(44, 100, 30, 7, 0.3) +
    extraFront(a.extra, d, a)
  );
}

function armSvg(a: Avatar, d: Defs): string {
  const shirt = d.grad('arm', shade(a.shirt, 0.15), shade(a.shirt, -0.2), true);
  return (
    `<rect x="18" y="98" width="22" height="52" rx="10" fill="${shirt}" ${s()}/>` +
    `<circle cx="29" cy="154" r="11" fill="${a.skin}" ${s(6)}/>`
  );
}

function legSvg(a: Avatar, d: Defs): string {
  const pants = d.grad('leg', shade(a.pants, 0.12), shade(a.pants, -0.2), true);
  return (
    `<rect x="50" y="154" width="26" height="50" rx="8" fill="${pants}" ${s()}/>` +
    `<path d="M46 214 V206 Q46 196 58 196 H72 Q82 196 82 206 V214 Z" fill="#2b2b44" ${s(6)}/>` +
    shine(52, 200, 12, 4, 0.4)
  );
}

function backSvg(a: Avatar, d: Defs): string {
  return extraBack(a.extra, d, a);
}

function wrap(box: Box, body: string, defs: Defs): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${defs}${body}</svg>`;
}

export function renderAvatarPart(a: Avatar, part: AvatarPart, opts: RenderOptions = {}): string {
  const d = new Defs(opts.idPrefix ?? 'a');
  const body =
    part === 'head' ? headSvg(a, d, opts)
    : part === 'torso' ? torsoSvg(a, d)
    : part === 'arm' ? armSvg(a, d)
    : part === 'leg' ? legSvg(a, d)
    : backSvg(a, d);
  return wrap(PART_BOXES[part], body, d);
}

/** Hele figuren i ét SVG (bruges på telefonen og i menuer). */
export function renderAvatarSvg(a: Avatar, opts: RenderOptions = {}): string {
  const d = new Defs(opts.idPrefix ?? 'a');
  const mirror = (svg: string) => `<g transform="translate(160 0) scale(-1 1)">${svg}</g>`;
  const legs = legSvg(a, d);
  const arm = armSvg(a, d);
  const body =
    `<ellipse cx="80" cy="214" rx="56" ry="10" fill="#000" opacity="0.18"/>` +
    backSvg(a, d) +
    legs +
    `<g transform="translate(${LEG_SPACING} 0)">${legs}</g>` +
    arm +
    mirror(arm) +
    torsoSvg(a, d) +
    headSvg(a, d, opts);
  return wrap(FIGURE_BOX, body, d);
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Har avataren noget på ryggen, der skal tegnes bag kroppen? */
export function hasBackPart(a: Avatar): boolean {
  return a.extra === 'cape' || a.extra === 'wings' || a.extra === 'backpack';
}
