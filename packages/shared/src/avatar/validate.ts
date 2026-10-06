import { CLOTH_COLORS, EXTRAS, FACES, HATS, SKIN_COLORS, type Avatar } from './types';

const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);

/** Returnerer en gyldig avatar eller null. Farver skal komme fra paletterne. */
export function parseAvatar(raw: unknown): Avatar | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (!oneOf(SKIN_COLORS, a.skin) || !oneOf(CLOTH_COLORS, a.shirt) || !oneOf(CLOTH_COLORS, a.pants)) return null;
  if (!oneOf(HATS, a.hat) || !oneOf(FACES, a.face) || !oneOf(EXTRAS, a.extra)) return null;
  return { skin: a.skin, shirt: a.shirt, pants: a.pants, hat: a.hat, face: a.face, extra: a.extra };
}

export function sameAvatar(a: Avatar, b: Avatar): boolean {
  return a.skin === b.skin && a.shirt === b.shirt && a.pants === b.pants && a.hat === b.hat && a.face === b.face && a.extra === b.extra;
}
