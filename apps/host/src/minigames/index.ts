import type { MinigameDef } from '../flow/types';

/** Alle minigames registreres automatisk: hver mappe `minigames/<id>/index.ts` eksporterer en MinigameDef som default. */
const modules = import.meta.glob<{ default: MinigameDef }>('./*/index.ts', { eager: true });

export const MINIGAMES: MinigameDef[] = Object.values(modules)
  .map((m) => m.default)
  .filter((d): d is MinigameDef => Boolean(d?.id))
  .sort((a, b) => a.id.localeCompare(b.id));
