import { shade } from '@samigame/shared';
import { eyes, ink, linear, radial, shine, svgDoc } from '../../kit/svg';
import { C } from '../../kit/theme';

/** Al grafik til Grabbe-automaten: en tivoli-griberautomat om natten. */

/** Maskinens øverste venstre hjørne i verden. */
export const M = { x: 580, y: 250, w: 760, h: 820 };
/** Glasboksens indre (verden). */
export const GLASS = { l: 630, r: 1290, t: 350, b: 780 };
export const CHUTE_X = 700;
export const RAIL_Y = 372;

export function machineSvg(): string {
  const { w, h } = M;
  const stripes = (x0: number) =>
    Array.from({ length: 16 }, (_, i) => `<path d="M${x0} ${100 + i * 46} L${x0 + 50} ${80 + i * 46} L${x0 + 50} ${100 + i * 46} L${x0} ${120 + i * 46} Z" fill="#fff" opacity="0.22"/>`).join('');
  const stars = Array.from({ length: 18 }, (_, i) => {
    const sx = 80 + ((i * 137) % 600);
    const sy = 120 + ((i * 71) % 380);
    return `<circle cx="${sx}" cy="${sy}" r="${2 + (i % 3)}" fill="#fff" opacity="0.35"/>`;
  }).join('');
  return svgDoc(
    w,
    h + 20,
    // Skygge
    `<rect x="10" y="40" width="${w - 20}" height="${h - 20}" rx="40" fill="#000" opacity="0.4"/>` +
      // Bagvæg i glasset
      `<rect x="50" y="96" width="660" height="440" fill="url(#bk)" ${ink(6)}/>` +
      stars +
      `<path d="M50 470 Q380 430 710 470 L710 536 L50 536 Z" fill="#000" opacity="0.2"/>` +
      // Udgangs-skakt i glasset
      `<rect x="54" y="430" width="128" height="106" rx="10" fill="url(#ch)" ${ink(6)}/>` +
      `<rect x="70" y="424" width="96" height="22" rx="8" fill="#1a1446"/>` +
      `<path d="M90 470 L118 498 L146 470" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>` +
      // Søjler
      `<rect x="0" y="80" width="54" height="${h - 80}" rx="18" fill="url(#pl)" ${ink(7)}/>` +
      `<rect x="${w - 54}" y="80" width="54" height="${h - 80}" rx="18" fill="url(#pl)" ${ink(7)}/>` +
      stripes(2) +
      stripes(w - 52) +
      // Underskab
      `<path d="M14 530 L${w - 14} 530 L${w - 4} 610 L4 610 Z" fill="url(#dk)" ${ink(7)}/>` +
      `<rect x="20" y="606" width="${w - 40}" height="${h - 606}" rx="22" fill="url(#cb)" ${ink(8)}/>` +
      `<rect x="40" y="620" width="${w - 80}" height="16" rx="8" fill="#fff" opacity="0.25"/>` +
      // Præmie-luge
      `<rect x="78" y="672" width="168" height="118" rx="18" fill="#1a1446" ${ink(6)}/>` +
      `<rect x="88" y="682" width="148" height="56" rx="12" fill="url(#fl)" ${ink(4)}/>` +
      `<path d="M140 704 L162 724 L184 704" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
      // Mønt-indkast
      `<rect x="${w - 180}" y="680" width="110" height="110" rx="18" fill="url(#cn)" ${ink(6)}/>` +
      `<rect x="${w - 160}" y="716" width="70" height="16" rx="8" fill="#1a1446"/>` +
      `<circle cx="${w - 125}" cy="712" r="18" fill="url(#cn)" ${ink(4)}/><circle cx="${w - 125}" cy="712" r="10" fill="none" stroke="#b07a00" stroke-width="3"/>` +
      `<rect x="${w - 160}" y="746" width="70" height="28" rx="8" fill="${C.tomato}" ${ink(4)}/><path d="M${w - 140} 760 L${w - 110} 760" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` +
      // Præmie-vindue
      `<rect x="282" y="664" width="290" height="132" rx="22" fill="#1a1446" ${ink(6)}/>` +
      `<rect x="292" y="674" width="270" height="112" rx="16" fill="url(#pw)"/>` +
      `<rect x="300" y="680" width="120" height="10" rx="5" fill="#fff" opacity="0.25"/>` +
      // Toptag over glasset
      `<rect x="30" y="70" width="${w - 60}" height="36" rx="12" fill="url(#pl)" ${ink(6)}/>` +
      shine(60, 76, 200, 8, 0.35),
    linear('bk', '#3a1f7a', '#1c1046') +
      linear('ch', '#5e4f9a', '#2a1f5a') +
      linear('pl', '#ff6fb0', '#c2207a', true) +
      linear('dk', '#7be0ff', '#2f9be8') +
      linear('cb', '#ff8a5c', '#c2401a') +
      linear('fl', '#3a2f7a', '#120c3a') +
      linear('cn', '#ffe26a', '#e6a100') +
      linear('pw', '#4a3f9a', '#2a1f6a'),
  );
}

export function marqueeSvg(): string {
  return svgDoc(
    780,
    150,
    `<rect x="10" y="18" width="760" height="120" rx="40" fill="#000" opacity="0.35"/>` +
      `<rect x="10" y="8" width="760" height="120" rx="40" fill="url(#mq)" ${ink(9)}/>` +
      `<rect x="34" y="26" width="712" height="84" rx="28" fill="url(#mi)" ${ink(5)}/>` +
      shine(60, 14, 240, 10, 0.4),
    linear('mq', '#ffe26a', '#e68a00') + linear('mi', '#ff4b8a', '#9b1a5a'),
  );
}

export function glassSvg(): string {
  const w = GLASS.r - GLASS.l;
  const h = GLASS.b - GLASS.t;
  return svgDoc(
    w,
    h,
    `<path d="M60 0 L150 0 L40 ${h} L-50 ${h} Z" fill="#fff" opacity="0.10"/>` +
      `<path d="M190 0 L225 0 L115 ${h} L80 ${h} Z" fill="#fff" opacity="0.12"/>` +
      `<path d="M${w - 120} 0 L${w - 60} 0 L${w - 170} ${h} L${w - 230} ${h} Z" fill="#fff" opacity="0.08"/>` +
      `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="none" stroke="#bfefff" stroke-width="4" opacity="0.5"/>`,
  );
}

const CAPSULE_COLORS = ['#ff4d4d', '#3d8bff', '#3ccf5a', '#ffc928', '#9b5cff', '#ff8a2b', '#ff5fa2'];
export const CAPSULE_COUNT = CAPSULE_COLORS.length;

export function capsuleSvg(i: number): string {
  const col = CAPSULE_COLORS[i % CAPSULE_COLORS.length];
  const look: [number, number] = [[-2, 2], [2, 2], [0, -2], [3, 0], [-3, 0], [1, 3], [-1, -2]][i % 7] as [number, number];
  return svgDoc(
    120,
    120,
    `<path d="M14 60 A46 46 0 0 1 106 60 Z" fill="url(#ct)" ${ink(6)}/>` +
      `<path d="M14 60 A46 46 0 0 0 106 60 Z" fill="url(#cb)" ${ink(6)}/>` +
      `<rect x="10" y="54" width="100" height="12" rx="6" fill="${shade(col, -0.35)}" ${ink(4)}/>` +
      `<ellipse cx="44" cy="34" rx="16" ry="9" fill="#fff" opacity="0.65" transform="rotate(-25 44 34)"/>` +
      `<path d="M60 24 L64 34 L74 35 L66 41 L69 51 L60 45 L51 51 L54 41 L46 35 L56 34 Z" fill="#fff" opacity="0.55"/>` +
      eyes(60, 82, 26, 7, look) +
      `<path d="M54 96 Q60 100 66 96" fill="none" ${ink(3)}/>`,
    linear('ct', shade(col, 0.3), shade(col, -0.15)) + linear('cb', '#ffffff', '#d9d2ef'),
  );
}

/** Øverste halvdel alene (til når kapslen springer op). */
export function capsuleTopSvg(i: number): string {
  const col = CAPSULE_COLORS[i % CAPSULE_COLORS.length];
  return svgDoc(
    120,
    70,
    `<path d="M14 62 A46 46 0 0 1 106 62 Z" fill="url(#ct)" ${ink(6)}/>` +
      `<rect x="10" y="56" width="100" height="12" rx="6" fill="${shade(col, -0.35)}" ${ink(4)}/>` +
      `<ellipse cx="44" cy="36" rx="16" ry="9" fill="#fff" opacity="0.65" transform="rotate(-25 44 36)"/>`,
    linear('ct', shade(col, 0.3), shade(col, -0.15)),
  );
}

export function capsuleBottomSvg(): string {
  return svgDoc(
    120,
    60,
    `<path d="M14 4 A46 46 0 0 0 106 4 Z" fill="url(#cb)" ${ink(6)}/>` + eyes(60, 24, 26, 7, [0, -3]) + `<ellipse cx="60" cy="40" rx="6" ry="5" fill="${C.ink}"/>`,
    linear('cb', '#ffffff', '#d9d2ef'),
  );
}

export function clawHubSvg(): string {
  return svgDoc(
    130,
    100,
    `<rect x="52" y="0" width="26" height="24" rx="6" fill="#8a93a8" ${ink(5)}/>` +
      `<path d="M14 70 Q14 18 65 18 Q116 18 116 70 Z" fill="url(#hb)" ${ink(7)}/>` +
      `<rect x="8" y="64" width="114" height="22" rx="10" fill="#6a7390" ${ink(6)}/>` +
      `<ellipse cx="46" cy="32" rx="18" ry="7" fill="#fff" opacity="0.6"/>` +
      eyes(65, 50, 34, 10, [0, 3]) +
      `<path d="M44 34 L56 40 M86 34 L74 40" ${ink(4)}/>`,
    linear('hb', '#f1f4fb', '#9aa3c0'),
  );
}

/** En klo-finger (venstre). Origin i toppen. */
export function prongSvg(): string {
  return svgDoc(
    70,
    150,
    `<path d="M40 6 Q14 50 18 100 Q20 130 44 140 Q54 142 56 134 Q36 120 36 96 Q36 56 54 14 Z" fill="url(#pg)" ${ink(6)}/>` +
      `<circle cx="44" cy="12" r="10" fill="#6a7390" ${ink(4)}/>` +
      `<path d="M26 60 Q24 84 28 104" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.5"/>`,
    linear('pg', '#e6eaf5', '#7a83a0', true),
  );
}

export function carriageSvg(): string {
  return svgDoc(
    140,
    60,
    `<rect x="6" y="8" width="128" height="40" rx="12" fill="url(#cg)" ${ink(6)}/>` +
      `<circle cx="34" cy="48" r="9" fill="#3a3b55" ${ink(4)}/><circle cx="106" cy="48" r="9" fill="#3a3b55" ${ink(4)}/>` +
      `<rect x="20" y="14" width="60" height="7" rx="3" fill="#fff" opacity="0.4"/>`,
    linear('cg', '#ffe26a', '#e6a100'),
  );
}

export function joystickSvg(): string {
  return svgDoc(
    80,
    130,
    `<rect x="36" y="40" width="9" height="76" rx="4" fill="#9aa3c0" ${ink(4)}/>` +
      `<circle cx="40" cy="36" r="28" fill="url(#js)" ${ink(6)}/><ellipse cx="30" cy="24" rx="10" ry="6" fill="#fff" opacity="0.6"/>`,
    radial('js', '#ff8a8a', '#d41e1e'),
  );
}

export function joyBaseSvg(): string {
  return svgDoc(130, 50, `<ellipse cx="65" cy="26" rx="58" ry="18" fill="#1a1446"/><ellipse cx="65" cy="22" rx="52" ry="14" fill="#4a3f8a" ${ink(4)}/>`);
}

export function buttonSvg(pressed: boolean): string {
  return svgDoc(
    120,
    80,
    `<ellipse cx="60" cy="54" rx="52" ry="20" fill="#1a1446"/>` +
      (pressed
        ? `<ellipse cx="60" cy="48" rx="44" ry="16" fill="url(#bt)" ${ink(5)}/>`
        : `<path d="M16 48 L16 34 A44 16 0 0 1 104 34 L104 48 A44 16 0 0 1 16 48 Z" fill="#a01a2a" ${ink(5)}/><ellipse cx="60" cy="34" rx="44" ry="16" fill="url(#bt)" ${ink(5)}/><ellipse cx="46" cy="30" rx="14" ry="5" fill="#fff" opacity="0.6"/>`),
    radial('bt', '#ff8a8a', '#e01e3a'),
  );
}

export function wheelSvg(): string {
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<path d="M250 250 L${250 + Math.cos(a) * 230} ${250 + Math.sin(a) * 230}" stroke="#ff8ad0" stroke-width="6" opacity="0.6"/>`;
  }).join('');
  const lights = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return `<circle cx="${250 + Math.cos(a) * 232}" cy="${250 + Math.sin(a) * 232}" r="6" fill="${i % 2 ? '#fff3a0' : '#ff8ad0'}"/>`;
  }).join('');
  const cabins = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const cx = 250 + Math.cos(a) * 230;
    const cy = 250 + Math.sin(a) * 230;
    return `<rect x="${cx - 18}" y="${cy - 4}" width="36" height="30" rx="8" fill="${['#ff5fa2', '#47b8ff', '#ffcf3a', '#3ee6a8'][i % 4]}" ${ink(4)} opacity="0.85"/>`;
  }).join('');
  return svgDoc(
    500,
    500,
    `<circle cx="250" cy="250" r="232" fill="none" stroke="#2a1660" stroke-width="16"/><circle cx="250" cy="250" r="232" fill="none" stroke="#c45aa0" stroke-width="6"/>` +
      `<circle cx="250" cy="250" r="150" fill="none" stroke="#c45aa0" stroke-width="5" opacity="0.6"/>` +
      spokes +
      lights +
      cabins +
      `<circle cx="250" cy="250" r="26" fill="#ffcf3a" ${ink(5)}/>`,
  );
}

export function wheelStandSvg(): string {
  return svgDoc(300, 420, `<path d="M150 20 L30 410 L60 410 L150 60 L240 410 L270 410 Z" fill="#2a1660" ${ink(5)}/><path d="M90 250 L210 250" stroke="#2a1660" stroke-width="12"/>`);
}

export function tentSvg(): string {
  const stripes = Array.from({ length: 8 }, (_, i) => {
    const x0 = 20 + i * 45;
    return `<path d="M200 30 L${x0} 250 L${x0 + 22} 250 Z" fill="#fff" opacity="0.85"/>`;
  }).join('');
  return svgDoc(
    400,
    420,
    `<path d="M200 30 L380 250 L380 410 L20 410 L20 250 Z" fill="url(#tn)" ${ink(7)}/>` +
      stripes +
      `<path d="M20 250 Q65 280 110 250 Q155 280 200 250 Q245 280 290 250 Q335 280 380 250" fill="none" ${ink(7)}/>` +
      `<path d="M160 410 L200 300 L240 410 Z" fill="#1a1446"/>` +
      `<path d="M200 30 L200 0" ${ink(5)}/><path d="M200 2 L236 12 L200 22 Z" fill="${C.sun}" ${ink(4)}/>`,
    linear('tn', '#ff4b6b', '#a01a3a'),
  );
}

export function floorSvg(): string {
  const tiles = Array.from({ length: 2 * 20 }, (_, i) => {
    const r = Math.floor(i / 20);
    const c = i % 20;
    return (r + c) % 2 ? `<rect x="${c * 100}" y="${r * 60}" width="100" height="60" fill="#3a2a7a"/>` : '';
  }).join('');
  return svgDoc(1920, 120, `<rect width="1920" height="120" fill="#4a3a9a"/>` + tiles + `<rect width="1920" height="10" fill="#1a1446"/>`);
}

export function coneSvg(): string {
  return svgDoc(
    300,
    700,
    `<path d="M120 0 L180 0 L300 700 L0 700 Z" fill="url(#cn)"/>`,
    `<linearGradient id="cn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c0" stop-opacity="0.6"/><stop offset="1" stop-color="#fff6c0" stop-opacity="0.08"/></linearGradient>`,
  );
}
