import type { MinigameDef } from '../../flow/types';
import { TEAM_HEX } from '../../kit/theme';
import { KagebombeScene } from './KagebombeScene';

const def: MinigameDef = {
  id: 'kagebombe',
  title: 'Kagebomben',
  kind: '2v2',
  tagline: 'Klip den rigtige ledning – ellers får I flødeskum i hovedet!',
  rules: [
    'LÆSEREN har den hemmelige kage-manual på telefonen. KLIPPEREN har saksen.',
    'Kig på kagen, find den rigtige regel og RÅB til hinanden!',
    'Forkert klip = flødeskum + strafpause. Først til 3 reddede kager vinder.',
  ],
  controls: ['📖 Læser: læs manualen højt', '✂️ Klipper: tryk på ledningens farve'],
  icon: '🎂',
  color: '#ff5fa2',
  layout: (ctx) => {
    const reader = ctx.teams.teams[ctx.team]?.[0] === ctx.slot;
    return reader
      ? { kind: 'wait', title: 'Du er LÆSER', message: 'Du får kage-manualen her. Læs den højt for din makker!', emoji: '📖', accent: TEAM_HEX[ctx.team] }
      : { kind: 'wait', title: 'Du er KLIPPER', message: 'Du får ledningerne her. Lyt til din makker og klip!', emoji: '✂️', accent: TEAM_HEX[ctx.team] };
  },
  scene: KagebombeScene,
};

export default def;
