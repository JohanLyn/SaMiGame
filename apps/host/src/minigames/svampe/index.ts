import type { MinigameDef } from '../../flow/types';
import { SvampeScene } from './SvampeScene';

const def: MinigameDef = {
  id: 'svampe',
  title: 'Svampe-Roulette',
  kind: 'ffa',
  tagline: 'Svampene vil ikke være suppe – og det vil du heller ikke!',
  rules: [
    'Skiltet viser en farve: løb hen på en svamp i den farve.',
    'Når tiden er gået, dykker de andre svampe – og suppen KOGER.',
    'Hop over suppen med A. Sidste svampe-surfer vinder!',
  ],
  controls: ['🕹️ Løb', '🅰️ Hop'],
  icon: '🍄',
  color: '#ff4b4b',
  layout: () => ({ kind: 'stick', a: 'HOP', hint: 'Stå på den rigtige farve!' }),
  scene: SvampeScene,
};

export default def;
