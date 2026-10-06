import { shade } from '@samigame/shared';
import { ink, linear, radial, shine, svgDoc } from '../../kit/svg';
import { C } from '../../kit/theme';

/** Al grafik til Vulkanen der nyser. */

export const VOLC = { x: 960, base: 880, w: 900, h: 640 };

export function volcanoSvg(): string {
  const { w, h } = VOLC;
  const strata = [180, 260, 360, 460, 540]
    .map((y, i) => {
      const half = 120 + (y / h) * 330;
      return `<path d="M${w / 2 - half + 20} ${y} Q${w / 2 - half / 2} ${y + 14 + (i % 2) * 8} ${w / 2} ${y + 4} Q${w / 2 + half / 2} ${y - 10} ${w / 2 + half - 20} ${y + 6}" fill="none" stroke="#3a1a14" stroke-width="5" stroke-linecap="round" opacity="0.35"/>`;
    })
    .join('');
  const rocks = [
    [180, 560, 26], [700, 580, 30], [260, 470, 16], [650, 440, 18], [120, 610, 20], [790, 615, 22],
  ]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" fill="#5a2e24" ${ink(4)}/><ellipse cx="${x - r * 0.3}" cy="${y - r * 0.3}" rx="${r * 0.3}" ry="${r * 0.15}" fill="#fff" opacity="0.25"/>`)
    .join('');
  return svgDoc(
    w,
    h,
    `<path d="M10 ${h - 10} Q120 ${h - 120} 230 380 Q300 210 330 96 L570 96 Q600 210 670 380 Q780 ${h - 120} ${w - 10} ${h - 10} Z" fill="url(#vb)" ${ink(10)}/>` +
      // Lavastriber
      `<path d="M360 100 Q340 170 360 230 Q376 270 350 330 Q380 290 392 230 Q400 160 400 100 Z" fill="url(#lv)" ${ink(5)}/>` +
      `<path d="M540 100 Q560 180 548 250 Q540 300 570 360 Q590 300 584 240 Q576 160 572 100 Z" fill="url(#lv)" ${ink(5)}/>` +
      strata +
      rocks +
      `<path d="M260 330 Q300 220 330 140" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.18"/>` +
      // Krater
      `<ellipse cx="${w / 2}" cy="96" rx="132" ry="30" fill="#3a1a14" ${ink(8)}/>` +
      `<ellipse cx="${w / 2}" cy="98" rx="112" ry="20" fill="url(#cr)"/>` +
      `<ellipse cx="${w / 2 - 30}" cy="94" rx="40" ry="6" fill="#fff3a0" opacity="0.8"/>`,
    linear('vb', '#b0604a', '#4a2018') + linear('lv', '#ffcf3a', '#ff4b1a') + radial('cr', '#fff3a0', '#ff5a1a'),
  );
}

/** Øje: 'open' | 'squint' | 'shut'. */
export function eyeSvg(mode: 'open' | 'squint' | 'shut'): string {
  if (mode === 'shut') {
    return svgDoc(130, 110, `<path d="M18 62 Q65 18 112 62" fill="none" ${ink(12)}/><path d="M24 40 L10 28 M106 40 L120 28" ${ink(8)}/>`);
  }
  const lid = mode === 'squint' ? `<path d="M10 56 Q65 -6 120 56 L120 10 L10 10 Z" fill="#8a4434" ${ink(7)}/><path d="M12 56 Q65 30 118 56" fill="none" ${ink(7)}/>` : '';
  return svgDoc(
    130,
    110,
    `<ellipse cx="65" cy="58" rx="54" ry="46" fill="#fff" ${ink(8)}/>` +
      `<circle cx="70" cy="62" r="24" fill="${C.ink}"/><circle cx="78" cy="52" r="8" fill="#fff"/><circle cx="62" cy="72" r="4" fill="#fff"/>` +
      lid,
  );
}

export function browSvg(): string {
  return svgDoc(140, 40, `<path d="M10 28 Q70 0 130 24" fill="none" stroke="#3a1a14" stroke-width="16" stroke-linecap="round"/>`);
}

export function noseSvg(): string {
  return svgDoc(
    280,
    220,
    `<path d="M140 10 Q186 10 196 70 Q204 110 236 128 Q270 150 250 186 Q230 214 186 202 Q160 214 140 214 Q120 214 94 202 Q50 214 30 186 Q10 150 44 128 Q76 110 84 70 Q94 10 140 10 Z" fill="url(#ns)" ${ink(9)}/>` +
      `<ellipse cx="96" cy="176" rx="24" ry="18" fill="#3a1010" ${ink(5)}/><ellipse cx="184" cy="176" rx="24" ry="18" fill="#3a1010" ${ink(5)}/>` +
      `<ellipse cx="122" cy="62" rx="16" ry="34" fill="#fff" opacity="0.4" transform="rotate(10 122 62)"/>` +
      `<ellipse cx="60" cy="146" rx="14" ry="8" fill="#fff" opacity="0.3"/>`,
    radial('ns', '#e8907a', '#a8503a'),
  );
}

export function mouthSvg(mode: 'grin' | 'oh' | 'blast'): string {
  if (mode === 'grin') {
    return svgDoc(
      260,
      120,
      `<path d="M20 30 Q130 120 240 30 Q130 80 20 30 Z" fill="#5a1010" ${ink(8)}/><path d="M90 66 Q130 84 170 66 L160 56 Q130 66 100 56 Z" fill="#ff7a8a"/>`,
    );
  }
  if (mode === 'oh') {
    return svgDoc(260, 120, `<ellipse cx="130" cy="60" rx="46" ry="40" fill="#5a1010" ${ink(8)}/><ellipse cx="130" cy="78" rx="26" ry="14" fill="#ff7a8a"/>`);
  }
  return svgDoc(
    260,
    120,
    `<path d="M14 16 Q130 6 246 16 Q236 112 130 114 Q24 112 14 16 Z" fill="#5a1010" ${ink(8)}/><path d="M60 80 Q130 120 200 80 Q130 96 60 80 Z" fill="#ff7a8a"/><rect x="70" y="16" width="120" height="18" rx="6" fill="#fff" ${ink(4)}/>`,
  );
}

export function cheekSvg(): string {
  return svgDoc(120, 70, `<ellipse cx="60" cy="35" rx="54" ry="28" fill="url(#ck)"/>`, `<radialGradient id="ck"><stop offset="0" stop-color="#ff3a5a" stop-opacity="0.9"/><stop offset="1" stop-color="#ff3a5a" stop-opacity="0"/></radialGradient>`);
}

export function featherSvg(): string {
  const barbs = Array.from({ length: 9 }, (_, i) => {
    const x = 26 + i * 12;
    return `<path d="M${x} 40 Q${x + 6} ${18 - (i % 2) * 6} ${x + 16} 14 M${x} 40 Q${x + 6} ${62 + (i % 2) * 6} ${x + 16} 66" fill="none" stroke="#ff8fc8" stroke-width="5" stroke-linecap="round"/>`;
  }).join('');
  return svgDoc(
    160,
    80,
    `<path d="M10 40 Q60 0 140 26 Q160 40 140 54 Q60 80 10 40 Z" fill="url(#fh)" ${ink(6)}/>` + barbs + `<path d="M10 40 L146 40" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    linear('fh', '#ffd0ea', '#ff5fa2'),
  );
}

export function eggSvg(color: string): string {
  const spots = [
    [80, 90, 20], [150, 70, 14], [130, 150, 24], [70, 180, 16], [170, 200, 18], [110, 230, 12],
  ]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.85}" fill="${color}" ${ink(4)}/>`)
    .join('');
  return svgDoc(
    230,
    290,
    `<path d="M115 12 Q200 16 214 170 Q220 278 115 280 Q10 278 16 170 Q30 16 115 12 Z" fill="url(#eg)" ${ink(9)}/>` +
      spots +
      `<ellipse cx="78" cy="70" rx="22" ry="40" fill="#fff" opacity="0.6" transform="rotate(20 78 70)"/>`,
    linear('eg', '#fffdf2', '#f0e0c0'),
  );
}

/** Revner i ægget (niveau 1–3). */
export function crackSvg(level: number): string {
  const paths = [
    'M115 40 L104 70 L124 92 L108 120',
    'M60 150 L84 140 L92 164 L118 152 L130 176',
    'M170 110 L150 128 L170 150 L152 172 L168 196 L150 214',
  ].slice(0, level);
  return svgDoc(230, 290, paths.map((d) => `<path d="${d}" fill="none" ${ink(6)}/>`).join(''));
}

export function eggHalfSvg(top: boolean, color: string): string {
  const zig = 'L196 150 L176 128 L156 152 L136 126 L116 150 L96 126 L76 152 L56 128 L36 150 L16 150';
  return top
    ? svgDoc(
        230,
        170,
        `<path d="M115 12 Q200 16 214 150 ${zig} Q30 16 115 12 Z" fill="url(#eg)" ${ink(9)}/><ellipse cx="80" cy="90" rx="20" ry="17" fill="${color}" ${ink(4)}/><ellipse cx="150" cy="70" rx="14" ry="12" fill="${color}" ${ink(4)}/>`,
        linear('eg', '#fffdf2', '#f0e0c0'),
      )
    : svgDoc(
        230,
        150,
        `<path d="M16 20 L36 20 L56 0 L76 24 L96 0 L116 24 L136 0 L156 24 L176 0 L196 22 L214 20 Q220 128 115 130 Q10 128 16 20 Z" fill="url(#eg)" ${ink(9)}/><ellipse cx="130" cy="70" rx="22" ry="18" fill="${color}" ${ink(4)}/>`,
        linear('eg', '#f6ead0', '#e6d0a8'),
      );
}

export function snotSvg(): string {
  return svgDoc(
    80,
    80,
    `<path d="M40 6 Q66 10 70 38 Q74 66 44 74 Q14 76 10 48 Q8 18 40 6 Z" fill="url(#sn)" ${ink(5)}/><ellipse cx="30" cy="26" rx="10" ry="6" fill="#fff" opacity="0.6"/>`,
    radial('sn', '#d6ff7a', '#ff8a1a'),
  );
}

export function screenSplatSvg(): string {
  return svgDoc(
    260,
    300,
    `<path d="M130 20 Q200 30 220 90 Q250 150 210 190 Q200 250 180 290 Q166 250 160 210 Q120 220 90 200 Q80 260 66 280 Q56 230 60 190 Q10 160 30 100 Q50 30 130 20 Z" fill="url(#ss)" ${ink(6)} opacity="0.92"/>` +
      `<ellipse cx="100" cy="70" rx="30" ry="14" fill="#fff" opacity="0.5"/>`,
    radial('ss', '#e6ff8a', '#7acc2a'),
  );
}

export function meterSvg(): string {
  return svgDoc(
    160,
    640,
    `<rect x="40" y="22" width="80" height="520" rx="40" fill="#000" opacity="0.3"/>` +
      `<rect x="40" y="10" width="80" height="520" rx="40" fill="#1a1446" ${ink(8)}/>` +
      `<circle cx="80" cy="560" r="66" fill="#000" opacity="0.3"/>` +
      `<circle cx="80" cy="550" r="66" fill="url(#mb)" ${ink(8)}/>` +
      [0.25, 0.5, 0.75].map((k) => `<path d="M120 ${510 - k * 470} L140 ${510 - k * 470}" ${ink(6)}/>`).join('') +
      `<ellipse cx="58" cy="526" rx="18" ry="10" fill="#fff" opacity="0.5"/>`,
    radial('mb', '#ff8a8a', '#d41e1e'),
  );
}

export function meterGlassSvg(): string {
  return svgDoc(160, 640, `<rect x="52" y="24" width="14" height="480" rx="7" fill="#fff" opacity="0.35"/>`);
}

export function poleSvg(): string {
  return svgDoc(40, 40, `<circle cx="20" cy="20" r="14" fill="#c98d4b" ${ink(5)}/>`);
}

export function seaSvg(): string {
  return svgDoc(64, 256, `<rect width="64" height="256" fill="url(#w)"/>`, linear('w', '#ff9a8a', '#5a3aa0'));
}

export function sunsetSunSvg(): string {
  return svgDoc(
    400,
    400,
    `<circle cx="200" cy="200" r="196" fill="#ffd27a" opacity="0.25"/><circle cx="200" cy="200" r="150" fill="url(#ss)"/>` +
      shine(120, 110, 80, 18, 0.4),
    radial('ss', '#fff3a0', shade('#ff8a2b', 0)),
  );
}
