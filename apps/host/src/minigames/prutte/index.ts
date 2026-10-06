import type { MinigameDef } from '../../flow/types';
import { PrutteScene } from './PrutteScene';

const def: MinigameDef = {
  id: 'prutte',
  title: 'Prutte-Roulette',
  kind: 'ffa',
  tagline: 'Pump pruttepuden – men pas på den hemmelige prutte-bombe!',
  rules: [
    'Skiftes til at vælge en pumpe og pumpe luft i kæmpe-pruttepuden.',
    'Én hemmelig pumpe udløser KÆMPE-PRUTTEN – og du ryger til himmels!',
    'Færre pumper hver runde. Den sidste overlevende vinder.',
  ],
  controls: ['👆 Vælg en pumpe når det er din tur', '🙏 Bed til de højere magter'],
  icon: '💨',
  color: '#9dff6a',
  layout: () => ({ kind: 'wait', title: 'Gør dig klar ...', message: 'Vent på din tur', emoji: '💨' }),
  scene: PrutteScene,
};

export default def;
