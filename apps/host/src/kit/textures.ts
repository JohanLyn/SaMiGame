import Phaser from 'phaser';
import { C } from './theme';
import { ink, linear, loadSvg, radial, svgDoc } from './svg';

/** Fælles småteksturer (partikler, skygger, ikoner) – indlæses én gang i Boot-scenen. */
export const TEX = {
  dot: 'kit-dot',
  puff: 'kit-puff',
  star: 'kit-star',
  confetti: 'kit-confetti',
  spark: 'kit-spark',
  shadow: 'kit-shadow',
  ring: 'kit-ring',
  drop: 'kit-drop',
  heart: 'kit-heart',
  coin: 'kit-coin',
  crown: 'kit-crown',
  vignette: 'kit-vignette',
} as const;

export function preloadKitTextures(scene: Phaser.Scene): void {
  loadSvg(scene, TEX.dot, svgDoc(32, 32, `<circle cx="16" cy="16" r="15" fill="#fff"/>`), 32, 32);
  loadSvg(
    scene,
    TEX.puff,
    svgDoc(64, 64, `<circle cx="32" cy="32" r="30" fill="url(#g)"/>`, radial('g', '#ffffff', '#e6e1f5')),
    64,
    64,
  );
  loadSvg(
    scene,
    TEX.star,
    svgDoc(
      64,
      64,
      `<path d="M32 4 L40 24 L61 25 L44 38 L50 59 L32 47 L14 59 L20 38 L3 25 L24 24 Z" fill="#fff" ${ink(4)}/>`,
    ),
    64,
    64,
  );
  loadSvg(scene, TEX.confetti, svgDoc(24, 14, `<rect width="24" height="14" rx="3" fill="#fff"/>`), 24, 14);
  loadSvg(
    scene,
    TEX.spark,
    svgDoc(48, 48, `<path d="M24 0 L28 20 L48 24 L28 28 L24 48 L20 28 L0 24 L20 20 Z" fill="#fff"/>`),
    48,
    48,
  );
  loadSvg(scene, TEX.shadow, svgDoc(128, 40, `<ellipse cx="64" cy="20" rx="62" ry="18" fill="#000"/>`), 128, 40);
  loadSvg(
    scene,
    TEX.ring,
    svgDoc(128, 48, `<ellipse cx="64" cy="24" rx="58" ry="19" fill="none" stroke="#fff" stroke-width="7"/>`),
    128,
    48,
  );
  loadSvg(scene, TEX.drop, svgDoc(32, 44, `<path d="M16 2 Q30 24 28 30 A12 12 0 0 1 4 30 Q2 24 16 2Z" fill="#fff"/>`), 32, 44);
  loadSvg(
    scene,
    TEX.heart,
    svgDoc(48, 44, `<path d="M24 40 L6 22 A10 10 0 0 1 24 8 A10 10 0 0 1 42 22 Z" fill="${C.bubblegum}" ${ink(4)}/>`),
    48,
    44,
  );
  loadSvg(
    scene,
    TEX.coin,
    svgDoc(
      64,
      64,
      `<circle cx="32" cy="32" r="28" fill="url(#c)" ${ink(5)}/><circle cx="32" cy="32" r="18" fill="none" stroke="#e6a100" stroke-width="4"/><path d="M26 18 L26 24" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`,
      linear('c', '#fff3a0', '#f2b400'),
    ),
    64,
    64,
  );
  loadSvg(
    scene,
    TEX.crown,
    svgDoc(
      96,
      72,
      `<path d="M8 64 L8 20 L28 38 L48 8 L68 38 L88 20 L88 64 Z" fill="url(#g)" ${ink(6)}/><circle cx="48" cy="46" r="7" fill="${C.tomato}" ${ink(3)}/>`,
      linear('g', '#fff3a0', '#e6a100'),
    ),
    96,
    72,
  );
  loadSvg(
    scene,
    TEX.vignette,
    svgDoc(
      320,
      180,
      `<rect width="320" height="180" fill="url(#v)"/>`,
      `<radialGradient id="v" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0a0820" stop-opacity="0.75"/></radialGradient>`,
    ),
    320,
    180,
  );
}
