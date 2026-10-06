import type { MinigameDef } from '../../flow/types';
import { SumoScene } from './SumoScene';

const def: MinigameDef = {
  id: 'sumo',
  title: 'Sumo-Frikadeller',
  kind: 'ffa',
  tagline: 'Rul, skub og hold dig på frikadellen – panden bliver HED!',
  rules: [
    'Skub de andre ud af stegepanden.',
    'Kanten bliver glohed, og panden vipper – pas på!',
    'Den sidste frikadelle i panden vinder.',
  ],
  controls: ['🕹️ Rul rundt', '🅰️ Spurt-skub'],
  icon: '🍳',
  color: '#ff8a2b',
  layout: () => ({ kind: 'stick', a: 'SPURT', hint: 'Skub de andre ud!' }),
  scene: SumoScene,
};

export default def;
