import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';

/** Al grafik til Prutte-Roulette, tegnet som SVG. */

export const CUSHION = { x: 960, y: 440, w: 560, h: 430 };
/** Ventilens åbning i teksturen (til gas-udbruddet). */
export const NOZZLE = { x: 432, y: 34 };
export const PUMP_COLORS = ['#9b5cff', '#ff8a2b', '#47b8ff', '#ff5fa2', '#3ee6a8', '#ffcf3a'];

export type Mood = 'calm' | 'nervous' | 'panic' | 'flat';

/** Den kæmpe pruttepude med ansigt. */
export function cushionSvg(mood: Mood): string {
  const w = CUSHION.w;
  const h = CUSHION.h;
  const cx = w / 2;
  const cy = 250;
  const flat = mood === 'flat';
  const rx = 250;
  const ry = flat ? 90 : 145;
  const by = flat ? cy + 60 : cy;
  // Ventilen (prutte-hullet) stikker op bag puden
  const lip = flat ? { x: cx + 175, y: by - 40 } : { x: 432, y: 34 };
  const nozzle =
    `<path d="M${cx + 40} ${by - ry + 40} Q${(cx + 40 + lip.x) / 2 - 30} ${(by - ry + lip.y) / 2} ${lip.x - 26} ${lip.y + 14} L${lip.x + 22} ${lip.y - 12} Q${(cx + 110 + lip.x) / 2 + 20} ${(by - ry + lip.y) / 2 + 30} ${cx + 120} ${by - ry + 50} Z" fill="url(#body)" ${ink(8)}/>` +
    `<ellipse cx="${lip.x}" cy="${lip.y}" rx="40" ry="16" transform="rotate(-30 ${lip.x} ${lip.y})" fill="url(#lip)" ${ink(7)}/>` +
    `<ellipse cx="${lip.x}" cy="${lip.y}" rx="24" ry="7" transform="rotate(-30 ${lip.x} ${lip.y})" fill="#5a0a2a"/>` +
    `<path d="M${cx + 70} ${by - ry + 30} Q${cx + 100} ${by - ry - 30} ${lip.x - 30} ${lip.y + 30}" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.35"/>`;
  let face = '';
  if (mood === 'calm') {
    face = eyes(cx, by - 30, 110, 30, [4, 6]) + `<path d="M${cx - 40} ${by + 30} Q${cx} ${by + 66} ${cx + 40} ${by + 30}" fill="none" ${ink(9)}/>`;
  } else if (mood === 'nervous') {
    face =
      eyes(cx, by - 30, 110, 32, [-6, 2]) +
      `<path d="M${cx - 92} ${by - 86} L${cx - 30} ${by - 70} M${cx + 92} ${by - 86} L${cx + 30} ${by - 70}" ${ink(10)}/>` +
      `<path d="M${cx - 50} ${by + 44} q12 -14 25 0 q12 14 25 0 q12 -14 25 0 q12 14 25 0" fill="none" ${ink(8)}/>` +
      `<path d="M${cx + 150} ${by - 70} q-14 26 0 38 q14 -12 0 -38 Z" fill="#8fe0ff" ${ink(4)}/>`;
  } else if (mood === 'panic') {
    face =
      `<ellipse cx="${cx - 60}" cy="${by - 34}" rx="40" ry="48" fill="#fff" ${ink(7)}/><circle cx="${cx - 58}" cy="${by - 30}" r="11" fill="#1a1446"/>` +
      `<ellipse cx="${cx + 60}" cy="${by - 34}" rx="40" ry="48" fill="#fff" ${ink(7)}/><circle cx="${cx + 58}" cy="${by - 30}" r="11" fill="#1a1446"/>` +
      `<path d="M${cx - 110} ${by - 110} L${cx - 30} ${by - 96} M${cx + 110} ${by - 110} L${cx + 30} ${by - 96}" ${ink(10)}/>` +
      `<ellipse cx="${cx}" cy="${by + 58}" rx="34" ry="40" fill="#5a0a2a" ${ink(8)}/><ellipse cx="${cx}" cy="${by + 76}" rx="20" ry="12" fill="#ff7a9a"/>` +
      `<path d="M${cx + 150} ${by - 80} q-16 30 0 44 q16 -14 0 -44 Z" fill="#8fe0ff" ${ink(4)}/>` +
      `<path d="M${cx - 160} ${by - 60} q-16 30 0 44 q16 -14 0 -44 Z" fill="#8fe0ff" ${ink(4)}/>`;
  } else {
    face =
      `<path d="M${cx - 80} ${by - 20} l30 24 m0 -24 l-30 24 M${cx + 50} ${by - 20} l30 24 m0 -24 l-30 24" ${ink(9)}/>` +
      `<path d="M${cx - 30} ${by + 30} q15 -12 30 0 q15 12 30 0" fill="none" ${ink(8)}/>` +
      `<path d="M${cx + 20} ${by + 32} q4 26 14 26 q10 0 6 -24" fill="#ff7a9a" ${ink(5)}/>`;
  }
  return svgDoc(
    w,
    h,
    `<ellipse cx="${cx}" cy="${by + ry - 4}" rx="${rx - 10}" ry="30" fill="#000" opacity="0.3"/>` +
      nozzle +
      `<ellipse cx="${cx}" cy="${by}" rx="${rx}" ry="${ry}" fill="url(#body)" ${ink(10)}/>` +
      `<ellipse cx="${cx}" cy="${by + 8}" rx="${rx - 26}" ry="${ry - 26}" fill="none" stroke="#b0144a" stroke-width="7" stroke-dasharray="18 14" opacity="0.7"/>` +
      `<ellipse cx="${cx - 90}" cy="${by - ry * 0.55}" rx="${flat ? 60 : 90}" ry="${flat ? 14 : 30}" fill="#fff" opacity="0.45"/>` +
      `<ellipse cx="${cx - 150}" cy="${by - ry * 0.2}" rx="14" ry="10" fill="#fff" opacity="0.6"/>` +
      `<ellipse cx="${cx - 140}" cy="${by + 40}" rx="34" ry="20" fill="#ff8ab0" opacity="0.6"/>` +
      `<ellipse cx="${cx + 140}" cy="${by + 40}" rx="34" ry="20" fill="#ff8ab0" opacity="0.6"/>` +
      face,
    radial('body', '#ff7aa8', '#d0185a') + linear('lip', '#ff9ac0', '#c0104a'),
  );
}

/** Pumpe (krop, uden håndtag). */
export function pumpSvg(color: string): string {
  return svgDoc(
    170,
    230,
    `<ellipse cx="85" cy="214" rx="80" ry="14" fill="#000" opacity="0.3"/>` +
      `<rect x="10" y="186" width="150" height="30" rx="12" fill="url(#base)" ${ink(6)}/>` +
      `<rect x="40" y="40" width="90" height="156" rx="20" fill="url(#body)" ${ink(7)}/>` +
      `<rect x="40" y="70" width="90" height="16" fill="${shade(color, -0.3)}" opacity="0.6"/>` +
      `<rect x="40" y="150" width="90" height="16" fill="${shade(color, -0.3)}" opacity="0.6"/>` +
      `<rect x="30" y="30" width="110" height="22" rx="10" fill="url(#base)" ${ink(6)}/>` +
      shine(50, 48, 14, 120, 0.4) +
      // Trykmåler med øjne
      `<circle cx="85" cy="118" r="26" fill="#fff6e0" ${ink(6)}/>` +
      eyes(85, 112, 22, 6, [0, 2]) +
      `<path d="M76 128 q9 6 18 0" fill="none" ${ink(4)}/>` +
      `<path d="M140 196 q30 -6 30 -40" fill="none" ${ink(14)}/>` +
      `<path d="M140 196 q30 -6 30 -40" fill="none" stroke="${shade(color, -0.2)}" stroke-width="7" stroke-linecap="round"/>`,
    linear('body', shade(color, 0.3), shade(color, -0.25), true) + linear('base', '#8a93a8', '#3a3b55'),
  );
}

/** Pumpehåndtag (T-greb + stang). Origin forneden. */
export function handleSvg(): string {
  return svgDoc(
    170,
    150,
    `<rect x="76" y="30" width="18" height="120" rx="6" fill="url(#rod)" ${ink(5)}/>` +
      `<rect x="10" y="10" width="150" height="34" rx="17" fill="url(#grip)" ${ink(7)}/>` +
      shine(26, 16, 100, 8, 0.6),
    linear('rod', '#f1f4fb', '#8a93a8', true) + linear('grip', '#4a4c68', '#1e1f33'),
  );
}

/** Talskilt på pumpen. */
export function signSvg(): string {
  return svgDoc(80, 80, `<circle cx="40" cy="42" r="34" fill="#000" opacity="0.3"/><circle cx="40" cy="38" r="34" fill="url(#s)" ${ink(6)}/>` + shine(22, 16, 30, 7, 0.6), linear('s', '#fff6e0', '#ffd98a'));
}

/** Rødt fløjlstæppe (venstre side; højre = spejlet). */
export function curtainSvg(): string {
  const folds = Array.from({ length: 6 }, (_, i) => {
    const x = 20 + i * 52;
    return `<path d="M${x} 0 Q${x + 26} 540 ${x + 6 + i * 6} 1080" stroke="#5a0614" stroke-width="12" fill="none" opacity="0.5"/>` + `<path d="M${x + 22} 0 Q${x + 40} 540 ${x + 26 + i * 6} 1080" stroke="#ff6a7a" stroke-width="6" fill="none" opacity="0.25"/>`;
  }).join('');
  return svgDoc(
    360,
    1080,
    `<path d="M0 0 H340 Q300 420 200 700 Q150 860 210 1080 H0 Z" fill="url(#c)" ${ink(8)}/>` + folds + `<path d="M0 650 Q110 610 190 680 Q110 720 0 700 Z" fill="url(#tie)" ${ink(6)}/>` + `<circle cx="190" cy="680" r="16" fill="url(#tie)" ${ink(5)}/>`,
    linear('c', '#d0203a', '#7a0a1e', true) + linear('tie', '#ffe066', '#c88a12'),
  );
}

/** Kappe øverst (valance). */
export function valanceSvg(): string {
  const scallops = Array.from({ length: 12 }, (_, i) => `<path d="M${i * 160} 70 Q${i * 160 + 80} 150 ${i * 160 + 160} 70" fill="url(#v)" ${ink(6)}/>`).join('');
  return svgDoc(1920, 160, `<rect x="-10" y="-10" width="1940" height="84" fill="url(#v)" ${ink(6)}/>` + scallops + `<rect x="0" y="54" width="1920" height="10" fill="#ffd36b" opacity="0.9"/>`, linear('v', '#c01a34', '#6a0818'));
}

/** Scene-gulv (træ). */
export function stageSvg(): string {
  const planks = Array.from({ length: 14 }, (_, i) => `<path d="M${i * 150 - 40} 0 L${i * 170 - 260} 440" stroke="#5a3214" stroke-width="5" opacity="0.5"/>`).join('');
  return svgDoc(
    1920,
    440,
    `<rect width="1920" height="440" fill="url(#f)"/>` + planks + `<rect width="1920" height="22" fill="#ffd36b" opacity="0.8"/><rect y="22" width="1920" height="8" fill="#1a1446" opacity="0.6"/>`,
    linear('f', '#b8763a', '#6a3a14'),
  );
}

/** Podie til ventende spillere. */
export function podiumSvg(color: string): string {
  return svgDoc(
    200,
    120,
    `<ellipse cx="100" cy="96" rx="96" ry="22" fill="#000" opacity="0.3"/>` +
      `<path d="M8 40 L8 84 Q100 120 192 84 L192 40 Z" fill="url(#side)" ${ink(6)}/>` +
      `<ellipse cx="100" cy="40" rx="92" ry="26" fill="url(#top)" ${ink(6)}/>` +
      `<path d="M100 66 l8 16 l18 2 l-13 12 l4 18 l-17 -9 l-17 9 l4 -18 l-13 -12 l18 -2 Z" fill="#fff" opacity="0.85" ${ink(3)}/>` +
      `<ellipse cx="70" cy="32" rx="40" ry="8" fill="#fff" opacity="0.35"/>`,
    linear('side', shade(color, 0), shade(color, -0.4)) + linear('top', shade(color, 0.45), shade(color, 0.1)),
  );
}

/** Grøn prutte-gas-sky. */
export function gasSvg(): string {
  return svgDoc(
    120,
    120,
    `<circle cx="60" cy="60" r="54" fill="url(#g)"/>` + `<circle cx="44" cy="44" r="14" fill="#fff" opacity="0.3"/>`,
    `<radialGradient id="g" cx="0.45" cy="0.4" r="0.6"><stop offset="0" stop-color="#d6ff7a"/><stop offset="0.7" stop-color="#8ad82a" stop-opacity="0.9"/><stop offset="1" stop-color="#5aa810" stop-opacity="0"/></radialGradient>`,
  );
}

/** Lille pære til lyskæden. */
export function bulbSvg(): string {
  return svgDoc(40, 40, `<circle cx="20" cy="20" r="16" fill="url(#b)" ${ink(4)}/><circle cx="15" cy="14" r="5" fill="#fff" opacity="0.8"/>`, radial('b', '#fffbe0', '#ffcf3a'));
}

/** Glimt-stjerne (når en spiller forsvinder i horisonten). */
export function twinkleSvg(): string {
  return svgDoc(80, 80, `<path d="M40 0 L48 32 L80 40 L48 48 L40 80 L32 48 L0 40 L32 32 Z" fill="#fff" ${ink(4)}/>`);
}

/** Tankeboble med spørgsmålstegn. */
export function thinkSvg(): string {
  return svgDoc(
    120,
    110,
    `<circle cx="20" cy="96" r="8" fill="#fff" ${ink(4)}/><circle cx="36" cy="78" r="12" fill="#fff" ${ink(4)}/>` +
      `<ellipse cx="72" cy="40" rx="44" ry="36" fill="#fff" ${ink(5)}/>` +
      `<path d="M58 30 q0 -16 14 -16 q16 0 16 14 q0 10 -12 14 l0 8" fill="none" ${ink(8)}/><circle cx="76" cy="62" r="5" fill="#1a1446"/>`,
  );
}

/** Pil der peger på den valgte pumpe. */
export function pointerSvg(): string {
  return svgDoc(90, 90, `<path d="M45 86 L10 36 H30 V4 H60 V36 H80 Z" fill="url(#p)" ${ink(6)}/>` + shine(36, 10, 8, 26, 0.6), linear('p', '#fff3a0', '#ffb400'));
}
