import type { MinigameDef } from '../../flow/types';
import { SelfieScene } from './SelfieScene';

const def: MinigameDef = {
  id: 'selfie',
  title: 'Selfie-Kirurgen',
  kind: 'ffa',
  tagline: 'Hertugen er sur. Gør dit gummifjæs lige så surt!',
  rules: [
    'Kopiér det sure museumsmaleri med dit eget gummiansigt.',
    'Grib bryn, næse, mundvige og hage og træk dem på plads.',
    'Efter 30 sekunder måles ligheden i procent – højest vinder!',
  ],
  controls: ['☝️ Tryk nær et punkt og træk', '🔍 Se på TV’et – handsken er din finger'],
  icon: '🤳',
  color: '#ff5fa2',
  layout: () => ({ kind: 'touchpad', image: 'face', hint: 'Træk i ansigtet – kopiér maleriet!' }),
  scene: SelfieScene,
};

export default def;
