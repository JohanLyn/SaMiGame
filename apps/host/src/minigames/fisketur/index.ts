import type { MinigameDef } from '../../flow/types';
import { FiskeScene } from './FiskeScene';

const def: MinigameDef = {
  id: 'fisketur',
  title: 'Kattens Fisketur',
  kind: '1v3',
  tagline: 'En sulten kat med fiskestang mod tre fisk med dykkermasker.',
  rules: [
    'Eneren er katten: styr krogen under vandet og hal ind (A), når en fisk er tæt på.',
    'Trioen er fisk: spis orme (ellers bliver I sultne og langsomme) og undgå krogen!',
    'Er mindst én fisk tilbage efter 40 sek., vinder trioen. Ellers vinder katten.',
  ],
  controls: (role) => (role === 'solo' ? ['🕹️ Styr krogen', '🅰️ Hal ind!'] : ['🕹️ Svøm', '🅰️ Spurt væk']),
  icon: '🎣',
  color: '#47b8ff',
  layout: (ctx) =>
    ctx.role === 'solo'
      ? { kind: 'stick', a: 'HAL IND', hint: 'Fang alle tre fisk!' }
      : { kind: 'stick', a: 'SPURT', hint: 'Spis orme – undgå krogen!' },
  scene: FiskeScene,
};

export default def;
