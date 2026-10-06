import type { MinigameDef } from '../../flow/types';
import { KogebogScene } from './KogebogScene';

const def: MinigameDef = {
  id: 'kogebog',
  title: 'Pop-up Kogebogen',
  kind: 'ffa',
  tagline: 'Mormors kæmpe kogebog smækker sammen – bliv ikke til en pandekage!',
  rules: [
    'Siderne vælter ned over jer én ad gangen.',
    'Stil dig i et udstanset mad-hul – skyggen viser hvor hullerne lander.',
    'Ét hul, én person (de største har plads til to). Sidste overlevende vinder!',
  ],
  controls: ['🕹️ Løb', '🅰️ Hop-spurt'],
  icon: '📖',
  color: '#ffcf3a',
  layout: () => ({ kind: 'stick', a: 'HOP', hint: 'Find et hul i skyggen!' }),
  scene: KogebogScene,
};

export default def;
