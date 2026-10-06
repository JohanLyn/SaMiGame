import { shade } from '@samigame/shared';
import { ink, linear, radial, shine, svgDoc } from '../../kit/svg';
import { C } from '../../kit/theme';

/** Al grafik til Due-posten: byens tage, en forvirret brevdue og et brev. */

export function skylineSvg(): string {
  const w = 1920;
  const h = 420;
  const blocks = Array.from({ length: 22 }, (_, i) => {
    const bx = i * 90 - 30 + ((i * 41) % 30);
    const bw = 80 + ((i * 29) % 50);
    const bh = 140 + ((i * 67) % 200);
    const top = h - bh;
    const wins = Array.from({ length: 8 }, (_, k) => {
      const wx = bx + 14 + (k % 2) * (bw - 44);
      const wy = top + 24 + Math.floor(k / 2) * 40;
      return wy < h - 30 ? `<rect x="${wx}" y="${wy}" width="16" height="20" rx="3" fill="#fff" opacity="0.35"/>` : '';
    }).join('');
    return `<rect x="${bx}" y="${top}" width="${bw}" height="${bh}" fill="${i % 2 ? '#a99ae0' : '#9a8ad6'}"/>` + wins;
  }).join('');
  return svgDoc(
    w,
    h,
    blocks +
      // Kirketårn
      `<rect x="1300" y="90" width="80" height="330" fill="#8a7acc"/><path d="M1290 92 L1340 -10 L1390 92 Z" fill="#7a6abc"/><circle cx="1340" cy="150" r="22" fill="#fff" opacity="0.6"/>` +
      // TV-tårn
      `<rect x="420" y="60" width="16" height="360" fill="#8a7acc"/><ellipse cx="428" cy="120" rx="40" ry="18" fill="#8a7acc"/><circle cx="428" cy="56" r="6" fill="${C.tomato}"/>`,
  );
}

export function houseRowSvg(): string {
  const w = 1920;
  const h = 360;
  const cols = ['#ff9a7a', '#ffd27a', '#8ad6c0', '#f7a8d0', '#9ac0ff', '#ffb36b'];
  const houses = Array.from({ length: 11 }, (_, i) => {
    const hx = i * 180 - 40;
    const hw = 170;
    const hh = 200 + ((i * 53) % 90);
    const top = h - hh;
    const col = cols[i % cols.length];
    const wins = [0, 1, 2, 3]
      .map((k) => {
        const wx = hx + 26 + (k % 2) * 80;
        const wy = top + 50 + Math.floor(k / 2) * 70;
        return `<rect x="${wx}" y="${wy}" width="40" height="46" rx="6" fill="#fff6c0" ${ink(4)}/><path d="M${wx + 20} ${wy} L${wx + 20} ${wy + 46} M${wx} ${wy + 23} L${wx + 40} ${wy + 23}" stroke="${C.ink}" stroke-width="3"/>`;
      })
      .join('');
    return (
      `<rect x="${hx}" y="${top}" width="${hw}" height="${hh}" fill="${col}" ${ink(5)}/>` +
      `<path d="M${hx - 10} ${top + 4} L${hx + hw / 2} ${top - 60} L${hx + hw + 10} ${top + 4} Z" fill="${shade(col, -0.35)}" ${ink(5)}/>` +
      wins
    );
  }).join('');
  return svgDoc(w, h, houses);
}

export function roofSvg(color: string, chimney: boolean): string {
  const w = 480;
  const h = 300;
  const tiles = Array.from({ length: 6 }, (_, r) => {
    const y = 40 + r * 26;
    const half = 90 + r * 26;
    const n = Math.round((half * 2) / 34);
    return Array.from({ length: n }, (_, k) => {
      const x = w / 2 - half + k * 34 + (r % 2) * 17;
      return `<path d="M${x} ${y} Q${x + 17} ${y + 30} ${x + 34} ${y}" fill="none" stroke="${shade(color, -0.35)}" stroke-width="4"/>`;
    }).join('');
  }).join('');
  return svgDoc(
    w,
    h,
    (chimney
      ? `<rect x="330" y="-0" width="58" height="90" fill="#c0504a" ${ink(6)}/><rect x="320" y="0" width="78" height="20" rx="4" fill="#8a3a34" ${ink(5)}/>` +
        `<path d="M340 40 L378 40 M340 62 L378 62" stroke="#8a3a34" stroke-width="4"/>`
      : '') +
      `<rect x="${w / 2 - 210}" y="200" width="420" height="${h - 200}" fill="#fff0d8" ${ink(6)}/>` +
      `<rect x="${w / 2 - 150}" y="226" width="60" height="60" rx="8" fill="#ffd76a" ${ink(4)}/><rect x="${w / 2 + 90}" y="226" width="60" height="60" rx="8" fill="#ffd76a" ${ink(4)}/>` +
      `<path d="M${w / 2 - 80} 20 L${w / 2 + 80} 20 L${w - 10} 210 L10 210 Z" fill="url(#rf)" ${ink(8)}/>` +
      tiles +
      `<rect x="${w / 2 - 92}" y="10" width="184" height="22" rx="10" fill="${shade(color, -0.4)}" ${ink(6)}/>` +
      `<path d="M${w / 2 - 70} 40 L60 196" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.25"/>`,
    linear('rf', shade(color, 0.15), shade(color, -0.2)),
  );
}

/** Brevduen (vender mod højre) – krop uden vinge. */
export function pigeonSvg(): string {
  return svgDoc(
    240,
    200,
    // Hale
    `<path d="M40 110 L4 92 L10 128 L0 150 L52 136 Z" fill="#7a85a8" ${ink(6)}/>` +
      // Krop
      `<path d="M40 120 Q40 70 100 70 Q140 66 160 40 Q170 20 196 24 Q226 30 222 64 Q218 90 196 104 Q190 150 140 162 Q70 172 40 120 Z" fill="url(#pb)" ${ink(7)}/>` +
      // Iriserende hals
      `<path d="M150 62 Q170 92 196 100 Q188 120 160 118 Q140 100 150 62 Z" fill="url(#nk)" opacity="0.9"/>` +
      // Næb
      `<path d="M218 48 L240 58 L218 66 Z" fill="${C.tangerine}" ${ink(5)}/>` +
      `<ellipse cx="214" cy="44" rx="7" ry="5" fill="#fff" ${ink(3)}/>` +
      // Øjne (skæve!)
      `<circle cx="188" cy="44" r="15" fill="#fff" ${ink(5)}/><circle cx="194" cy="48" r="7" fill="${C.ink}"/>` +
      `<circle cx="204" cy="40" r="10" fill="#fff" ${ink(4)}/><circle cx="202" cy="36" r="4.5" fill="${C.ink}"/>` +
      // Postkasket
      `<path d="M170 26 Q196 4 222 20 L222 28 L168 30 Z" fill="#2a4aa8" ${ink(5)}/><path d="M214 24 L236 30 L214 32 Z" fill="#1a2a6a" ${ink(4)}/><circle cx="196" cy="16" r="5" fill="${C.sun}" ${ink(2)}/>` +
      // Taske
      `<path d="M150 70 Q120 110 96 132" fill="none" stroke="#8a5a2b" stroke-width="7"/>` +
      `<rect x="74" y="118" width="62" height="44" rx="10" fill="#c98d4b" ${ink(5)}/><path d="M74 132 L136 132" ${ink(4)}/>` +
      `<rect x="84" y="104" width="40" height="24" rx="3" fill="#fff6e0" ${ink(4)}/>` +
      // Ben
      `<path d="M120 162 L118 186 M140 160 L144 184" stroke="${C.tangerine}" stroke-width="7" stroke-linecap="round"/>` +
      `<ellipse cx="110" cy="92" rx="30" ry="10" fill="#fff" opacity="0.35"/>`,
    linear('pb', '#c9d0e6', '#8a93b8') + linear('nk', '#7ae0b0', '#b07ae0', true),
  );
}

export function wingSvg(): string {
  return svgDoc(
    170,
    110,
    `<path d="M10 20 Q90 0 160 40 Q140 52 150 64 Q120 66 126 82 Q96 82 96 98 Q40 90 10 20 Z" fill="url(#wg)" ${ink(6)}/>` +
      `<path d="M60 40 Q100 50 130 50 M50 58 Q80 70 110 74" fill="none" stroke="#5a6488" stroke-width="4" stroke-linecap="round" opacity="0.6"/>`,
    linear('wg', '#b4bcd8', '#6a7598'),
  );
}

export function envelopeSvg(): string {
  return svgDoc(
    220,
    150,
    `<rect x="10" y="16" width="200" height="126" rx="12" fill="#000" opacity="0.25"/>` +
      `<rect x="10" y="10" width="200" height="126" rx="12" fill="url(#ev)" ${ink(6)}/>` +
      `<path d="M14 132 L110 70 L206 132" fill="none" stroke="#d9c8a0" stroke-width="5"/>` +
      `<path d="M14 14 L110 84 L206 14" fill="none" ${ink(6)}/>` +
      `<rect x="150" y="22" width="46" height="52" rx="4" fill="#fff" ${ink(4)} stroke-dasharray="6 3"/>` +
      `<circle cx="110" cy="84" r="16" fill="${C.tomato}" ${ink(4)}/><path d="M104 82 Q110 76 116 82 Q110 92 104 82 Z" fill="#fff" opacity="0.7"/>`,
    linear('ev', '#fffaf0', '#f0e0c0'),
  );
}

/** Stor kuvert (krop) til afsløringen. Klappen tegnes separat. */
export function bigEnvelopeSvg(): string {
  return svgDoc(
    420,
    290,
    `<rect x="10" y="22" width="400" height="260" rx="22" fill="#000" opacity="0.3"/>` +
      `<rect x="10" y="10" width="400" height="260" rx="22" fill="url(#be)" ${ink(9)}/>` +
      `<path d="M16 264 L210 140 L404 264" fill="none" stroke="#d9c8a0" stroke-width="8"/>` +
      `<path d="M16 16 L16 264 L210 140 Z M404 16 L404 264 L210 140 Z" fill="#f4e6c6" opacity="0.6"/>` +
      shine(40, 22, 120, 10, 0.4),
    linear('be', '#fffaf0', '#ecd9b0'),
  );
}

export function flapSvg(): string {
  return svgDoc(
    420,
    170,
    `<path d="M14 8 L406 8 L210 150 Z" fill="url(#fl)" ${ink(9)}/>` +
      `<circle cx="210" cy="140" r="30" fill="url(#wx)" ${ink(6)}/><path d="M198 136 Q210 122 222 136 Q210 156 198 136 Z" fill="#fff" opacity="0.7"/>`,
    linear('fl', '#fff4e0', '#e6d0a0') + radial('wx', '#ff7a7a', '#c41e2e'),
  );
}

export function letterSvg(): string {
  return svgDoc(
    360,
    260,
    `<rect x="10" y="10" width="340" height="240" rx="14" fill="#fff" ${ink(7)}/>` +
      [70, 100, 130].map((y) => `<path d="M40 ${y + 90} L320 ${y + 90}" stroke="#c8d0e8" stroke-width="5" stroke-linecap="round"/>`).join(''),
  );
}

export function laundrySvg(kind: number): string {
  if (kind === 0) {
    return svgDoc(70, 90, `<path d="M20 4 L50 4 L50 54 Q50 84 22 84 Q6 84 8 70 Q10 60 22 60 L20 4 Z" fill="${C.bubblegum}" ${ink(5)}/><path d="M20 20 L50 20 M20 36 L50 36" stroke="#fff" stroke-width="6"/>`);
  }
  if (kind === 1) {
    return svgDoc(110, 100, `<path d="M30 4 L80 4 L106 30 L90 44 L82 36 L82 96 L28 96 L28 36 L20 44 L4 30 Z" fill="${C.sky}" ${ink(5)}/><circle cx="55" cy="50" r="12" fill="${C.sun}" ${ink(4)}/>`);
  }
  return svgDoc(100, 70, `<path d="M6 4 L94 4 L86 40 Q70 66 50 50 Q30 66 14 40 Z" fill="${C.sun}" ${ink(5)}/><path d="M30 18 L70 18" stroke="${C.tomato}" stroke-width="6" stroke-linecap="round"/>`);
}

export function featherSvg(): string {
  return svgDoc(40, 60, `<path d="M20 4 Q36 24 22 56 Q4 30 20 4 Z" fill="#c9d0e6" ${ink(3)}/><path d="M20 10 L22 54" stroke="#8a93b8" stroke-width="2"/>`);
}

export function questionSvg(): string {
  return svgDoc(
    70,
    90,
    `<path d="M18 30 Q18 8 36 8 Q58 8 56 28 Q54 42 38 48 L38 60" fill="none" stroke="${C.ink}" stroke-width="16" stroke-linecap="round"/>` +
      `<path d="M18 30 Q18 8 36 8 Q58 8 56 28 Q54 42 38 48 L38 60" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>` +
      `<circle cx="38" cy="78" r="9" fill="#fff" ${ink(4)}/>`,
  );
}
