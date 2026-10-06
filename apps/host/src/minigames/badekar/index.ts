import type { MinigameDef } from '../../flow/types';
import { TEAM_HEX } from '../../kit/theme';
import { BadekarScene } from './BadekarScene';

const def: MinigameDef = {
  id: 'badekar',
  title: 'Badekar-Bobslæde',
  kind: '2v2',
  tagline: 'To mand i et badekar på ski. Hvad kan gå galt?',
  rules: [
    'STYREREN vipper telefonen og holder badekarret på isbanen.',
    'BOOSTEREN fyrer raketten af på lige stykker – og bremser før de skarpe sving!',
    'Undgå isklumper og badeænder, tag sæbe-turbo. Først i mål vinder!',
  ],
  controls: ['📱 Styrer: vip telefonen', '🚀 Booster: Boost / 🛑 Brems'],
  icon: '🛁',
  color: '#47b8ff',
  layout: (ctx) => {
    const steerer = ctx.teams.teams[ctx.team]?.[0] === ctx.slot;
    const accent = TEAM_HEX[ctx.team];
    return steerer
      ? { kind: 'tilt', hint: 'Du STYRER! Vip telefonen til siderne.', accent }
      : {
          kind: 'buttons',
          columns: 2,
          buttons: [
            { id: 0, label: 'BOOST', icon: '🚀', color: '#ff8a2b' },
            { id: 1, label: 'BREMS', icon: '🛑', color: '#ff4b4b' },
          ],
          hint: 'Boost på de lige stykker – brems før svingene!',
          accent,
        };
  },
  scene: BadekarScene,
};

export default def;
