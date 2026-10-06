import type { MinigameDef } from '../../flow/types';
import { BowlingScene } from './BowlingScene';

const def: MinigameDef = {
  id: 'bowling',
  title: 'Kødbolle-Bowling',
  kind: '1v3',
  tagline: 'Eneren ruller en kæmpe kødbolle. Trioen er keglerne. Av.',
  rules: [
    'Eneren sigter, holder A for kraft og slipper – pinden giver kurve.',
    'Trioen er kegler: flyt jer sidelæns og hop over kødbollen!',
    'Bliver alle tre ramt i løbet af 3 kast, vinder eneren. Ellers vinder keglerne.',
  ],
  controls: (role) =>
    role === 'solo' ? ['🕹️ Sigt / skru kurve', '🅰️ Hold for kraft – slip for at rulle'] : ['🕹️ Flyt dig sidelæns', '🅰️ Hop over kødbollen'],
  icon: '🎳',
  color: '#ff5fa2',
  layout: (ctx) =>
    ctx.role === 'solo'
      ? { kind: 'stick', a: 'HOLD & SLIP', hint: 'Sigt med pinden – hold A for kraft!' }
      : { kind: 'stick', a: 'HOP', hint: 'Undgå kødbollen!' },
  scene: BowlingScene,
};

export default def;
