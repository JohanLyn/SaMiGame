import type { RitualDef } from '../flow/types';

/** Alle ritualer registreres automatisk fra `rituals/<id>/index.ts`. */
const modules = import.meta.glob<{ default: RitualDef }>('./*/index.ts', { eager: true });

export const RITUALS: RitualDef[] = Object.values(modules)
  .map((m) => m.default)
  .filter((d): d is RitualDef => Boolean(d?.id))
  .sort((a, b) => a.id.localeCompare(b.id));
