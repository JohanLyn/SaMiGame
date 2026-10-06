import type { Avatar, AvatarPreset } from './types';

/** Faste figurer – egne figurer i blokstil (ingen kopier af kendte spilfigurer). */
export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  {
    id: 'agurk',
    name: 'Ridder Agurk',
    avatar: { skin: '#7cc644', shirt: '#c0c8d8', pants: '#6b7a99', hat: 'knight', face: 'happy', extra: 'cape' },
  },
  {
    id: 'mormor',
    name: 'Turbo-Mormor',
    avatar: { skin: '#ffd2b0', shirt: '#c86bd6', pants: '#5a4a8a', hat: 'bun', face: 'glasses', extra: 'scarf' },
  },
  {
    id: 'axel',
    name: 'Axel Axolotl',
    avatar: { skin: '#ff9ec7', shirt: '#3d8bff', pants: '#3a6fd8', hat: 'gills', face: 'derp', extra: 'none' },
  },
  {
    id: 'bent',
    name: 'Brødrister-Bent',
    avatar: { skin: '#e8b26a', shirt: '#c0c8d8', pants: '#8a93a8', hat: 'toast', face: 'grumpy', extra: 'bowtie' },
  },
  {
    id: 'kurt',
    name: 'Kubus-Kurt',
    avatar: { skin: '#8b5a2b', shirt: '#6b4423', pants: '#4a2f17', hat: 'grass', face: 'surprised', extra: 'backpack' },
  },
  {
    id: 'bjarne',
    name: 'Banan-Bjarne',
    avatar: { skin: '#ffe14d', shirt: '#ff8a2b', pants: '#3a6fd8', hat: 'stem', face: 'happy', extra: 'mustache' },
  },
];

export const DEFAULT_AVATAR: Avatar = AVATAR_PRESETS[0].avatar;

export function presetById(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.id === id);
}
