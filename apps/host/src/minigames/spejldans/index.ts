import type { MinigameDef } from '../../flow/types';
import { TEAM_HEX } from '../../kit/theme';
import { DIRS } from './art';
import { SpejldansScene } from './SpejldansScene';

const def: MinigameDef = {
  id: 'spejldans',
  title: 'Spejl-Dansen',
  kind: '2v2',
  tagline: 'Disco-duel! Dans som ét spejlbillede med din makker.',
  rules: [
    'Pilene ruller op mod linjen – tryk samme retning, når de rammer.',
    'Præcision giver point. Rammer I SAMTIDIG med makkeren, giver det SYNKRON-bonus!',
    'Forkerte tryk koster. Højeste holdscore efter 30 sek. vinder.',
  ],
  controls: ['⬅️⬇️⬆️➡️ Tryk på slaget', '👯 Samtidig = bonus'],
  icon: '🪩',
  color: '#9b5cff',
  layout: (ctx) => ({
    kind: 'buttons',
    columns: 4,
    buttons: DIRS.map((d) => ({ id: d.id, label: d.name, icon: d.emoji, color: d.color })),
    hint: 'Tryk når pilen rammer linjen – samtidig med makkeren!',
    accent: TEAM_HEX[ctx.team],
  }),
  scene: SpejldansScene,
};

export default def;
