import type { MinigameDef } from '../../flow/types';
import { KokkenScene } from './KokkenScene';

const def: MinigameDef = {
  id: 'kokken',
  title: 'Kokken Siger',
  kind: 'ffa',
  tagline: 'Ketchup? Sennep? PØLSE?! Kokken Klaus vil have svar – NU!',
  rules: [
    'Tryk Ketchup eller Sennep, når kokken løfter flasken.',
    'Løfter han en PØLSE, må du IKKE trykke!',
    'Forkert, for sent eller for tidligt = SPLAT. Sidste mand vinder.',
  ],
  controls: ['🍅 Ketchup', '🌭 Sennep'],
  icon: '👨‍🍳',
  color: '#ff4b4b',
  layout: () => ({
    kind: 'buttons',
    columns: 2,
    buttons: [
      { id: 0, label: 'Ketchup', color: '#ff4b4b', icon: '🍅' },
      { id: 1, label: 'Sennep', color: '#ffc928', icon: '🌭' },
    ],
    hint: 'Pølse = rør ingenting!',
  }),
  scene: KokkenScene,
};

export default def;
