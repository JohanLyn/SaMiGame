export const HATS = [
  'none', 'party', 'crown', 'cap', 'wizard', 'viking', 'chef', 'propeller', 'tophat',
  'knight', 'bun', 'gills', 'toast', 'grass', 'stem',
] as const;
export const FACES = ['happy', 'grumpy', 'derp', 'cool', 'surprised', 'sleepy', 'wink', 'glasses'] as const;
export const EXTRAS = ['none', 'cape', 'wings', 'backpack', 'bowtie', 'scarf', 'medal', 'mustache'] as const;

export type HatId = (typeof HATS)[number];
export type FaceId = (typeof FACES)[number];
export type ExtraId = (typeof EXTRAS)[number];

/** Farver man kan vælge imellem i Byg-din-Bloks (validering: kun disse er tilladt). */
export const SKIN_COLORS = [
  '#ffd2b0', '#e8a77c', '#b9744a', '#7a4a2c', '#7cc644', '#ff9ec7', '#e8b26a', '#8b5a2b', '#ffe14d', '#a8e6ff', '#c9a7ff', '#ffffff',
] as const;
export const CLOTH_COLORS = [
  '#ff4d4d', '#ff8a2b', '#ffc928', '#3ccf5a', '#3ee6a8', '#3d8bff', '#9b5cff', '#ff5fa2', '#c0c8d8', '#6b4423', '#2b2b44', '#fff6e0',
  '#c86bd6', '#5a4a8a', '#3a6fd8', '#4a2f17', '#8a93a8', '#6b7a99',
] as const;

export interface Avatar {
  skin: string;
  shirt: string;
  pants: string;
  hat: HatId;
  face: FaceId;
  extra: ExtraId;
}

export interface AvatarPreset {
  id: string;
  name: string;
  avatar: Avatar;
}
