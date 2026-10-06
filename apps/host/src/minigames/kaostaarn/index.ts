import type { MinigameDef } from '../../flow/types';
import { KaostaarnScene } from './KaostaarnScene';

const def: MinigameDef = {
  id: 'kaostaarn',
  title: 'Kaos-Tårnet',
  kind: 'ffa',
  tagline: 'Klatr op ad et vakkelvornt tårn af madrasser og køkkengrej – pokalen venter på toppen!',
  rules: [
    'Klatr op! Først på toppen vinder guldpokalen.',
    'Frikadeller, æg, ål og sennep sender dig ned igen – undvig!',
    'Pruttepuder skyder dig OP. Når tiden er gået, tæller højden.',
  ],
  controls: ['🕹️ Klatr op, ned og til siden', '🅰️ Hop-boost'],
  icon: '🏆',
  color: '#ff4b4b',
  finale: true,
  layout: () => ({ kind: 'stick', a: 'HOP!', hint: 'Klatr op – hop med A!' }),
  scene: KaostaarnScene,
};

export default def;
