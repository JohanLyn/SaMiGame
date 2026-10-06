import type { MinigameDef } from '../../flow/types';
import { SjippeScene } from './SjippeScene';

const def: MinigameDef = {
  id: 'sjippe',
  title: 'Sjippe-Ålen',
  kind: 'ffa',
  tagline: 'To krokodiller, én svimmel ål – og den har hikke!',
  rules: [
    'Hop når ålen smækker ned mod brædderne.',
    'Den bliver hurtigere – og hikker: den stopper, bakker eller spurter!',
    'Rammes du, ryger du i sumpen. Sidste hopper vinder.',
  ],
  controls: ['👆 Tryk = HOP'],
  icon: '🐊',
  color: '#3ccf5a',
  layout: () => ({ kind: 'mash', label: 'HOP!', icon: '🦘', hint: 'Hop når ålen rammer jorden!' }),
  scene: SjippeScene,
};

export default def;
