import type { MinigameDef } from '../../flow/types';
import { KanonScene } from './KanonScene';

const def: MinigameDef = {
  id: 'kanon',
  title: 'Kanon-Kyllingen',
  kind: '1v3',
  tagline: 'En kæmpe kylling med en kanon. Hvad kunne gå galt?',
  rules: [
    'Eneren sigter med kylling-kanonen og skyder æg ned på gården.',
    'Trioen løber og hopper for at undvige – hver har 3 hjerter.',
    'Er hele trioen ude inden 40 sek., vinder eneren. Ellers vinder trioen!',
  ],
  controls: (role) =>
    role === 'solo' ? ['🕹️ Flyt sigtet', '🅰️ Skyd æg', '🅱️ Gyldent mega-æg'] : ['🕹️ Løb', '🅰️ Hop over splattet'],
  icon: '🐔',
  color: '#ffcf3a',
  layout: (ctx) =>
    ctx.role === 'solo'
      ? { kind: 'stick', a: 'SKYD', b: 'MEGA', hint: 'Ram dem alle tre gange!' }
      : { kind: 'stick', a: 'HOP', hint: 'Undvig æggene!' },
  scene: KanonScene,
};

export default def;
