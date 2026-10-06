import type { MinigameDef } from '../../flow/types';
import { ToiletScene } from './ToiletScene';

const def: MinigameDef = {
  id: 'toiletter',
  title: 'Gemmeleg i Toiletterne',
  kind: '1v3',
  tagline: 'Tre gemmer sig i festivalens lokummer – én river dørene op!',
  rules: [
    'Trioen vælger i hemmelighed hver sit toilet (gerne det samme).',
    'Eneren åbner 3 døre pr. runde – der spilles 2 runder.',
    'Finder eneren alle tre, vinder eneren. Ellers vinder trioen!',
  ],
  controls: (role) => (role === 'solo' ? ['🚪 Vælg en dør at åbne', '🙈 Kig væk mens de gemmer sig'] : ['🚽 Vælg et toilet i hemmelighed', '🤫 Hold vejret!']),
  icon: '🚽',
  color: '#3ee6a8',
  layout: (ctx) =>
    ctx.role === 'solo'
      ? { kind: 'wait', title: 'Du er eneren!', message: 'Gør dig klar til at lede…', emoji: '🔦' }
      : { kind: 'wait', title: 'Gør dig klar!', message: 'Snart skal du gemme dig på et toilet…', emoji: '🚽' },
  scene: ToiletScene,
};

export default def;
