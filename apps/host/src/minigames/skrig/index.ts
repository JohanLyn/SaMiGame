import type { MinigameDef } from '../../flow/types';
import { SkrigScene } from './SkrigScene';

const def: MinigameDef = {
  id: 'skrig',
  title: 'Skrige-Ballonen',
  kind: 'ffa',
  tagline: 'Råb din ballon kæmpestor – men stop før den siger BANG!',
  rules: [
    'Skrig ind i telefonen for at puste din ballon op.',
    'Hver ballon har en hemmelig grænse – jo mere bange den ser ud, jo tættere er du.',
    'Største hele ballon efter 20 sekunder vinder. Sprungne balloner taber!',
  ],
  controls: ['🎤 Skrig for at puste', '👊 Hamre-knappen virker også'],
  icon: '🎈',
  color: '#ff5fa2',
  layout: () => ({ kind: 'mic', label: 'SKRIG!', hint: 'Råb for at puste – stop før den springer!' }),
  scene: SkrigScene,
};

export default def;
