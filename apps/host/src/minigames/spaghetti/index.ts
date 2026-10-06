import type { MinigameDef } from '../../flow/types';
import { TEAM_HEX } from '../../kit/theme';
import { SpaghettiScene } from './SpaghettiScene';

const def: MinigameDef = {
  id: 'spaghetti',
  title: 'Spaghetti-Tovtrækning',
  kind: '2v2',
  tagline: 'Hiv, hal og hold takten – taberne bader i tomatsovs!',
  rules: [
    'Hamr løs for at trække i spaghettien.',
    'Tryk i takt med tomaten for ekstra kraft – begge i takt giver SYNK-bonus!',
    'Træk kødbollen over jeres streg, så ryger de andre i gryden.',
  ],
  controls: ['👊 Hamr = træk', '🍅 Tryk på slaget = ekstra kraft'],
  icon: '🍝',
  color: '#ff4b4b',
  layout: (ctx) => ({ kind: 'mash', label: 'TRÆK!', icon: '🍝', hint: 'Tryk i takt med tomaten!', accent: TEAM_HEX[ctx.team] }),
  scene: SpaghettiScene,
};

export default def;
