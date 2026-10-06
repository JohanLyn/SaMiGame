import { shuffle, type Rng } from './rng';
import type { MinigameKind } from './types';

export interface Selectable {
  id: string;
  kind: MinigameKind;
}

/**
 * Vælger næste minigame: ingen gentagelser før alle er spillet, og aldrig samme type tre gange i træk.
 * Fordeling cirka: halvdelen alle-mod-alle, resten hold.
 */
export function chooseNext<T extends Selectable>(all: readonly T[], history: readonly string[], rng: Rng): T {
  if (all.length === 0) throw new Error('Ingen minigames registreret');
  // De seneste (history.length % antal) spil hører til den igangværende runde-cyklus.
  const cycleLength = history.length % all.length;
  const playedThisCycle = new Set(cycleLength ? history.slice(-cycleLength) : []);
  let pool = all.filter((g) => !playedThisCycle.has(g.id) && g.id !== history[history.length - 1]);
  if (pool.length === 0) pool = all.filter((g) => g.id !== history[history.length - 1]);
  if (pool.length === 0) pool = [...all];

  const kinds = history.map((id) => all.find((g) => g.id === id)?.kind);
  const lastTwo = kinds.slice(-2);
  if (lastTwo.length === 2 && lastTwo[0] === lastTwo[1]) {
    const different = pool.filter((g) => g.kind !== lastTwo[0]);
    if (different.length) pool = different;
  }

  // Vægt: ffa lidt oftere end holdspil.
  const weighted = shuffle(rng, pool).sort((a, b) => weight(b.kind, rng) - weight(a.kind, rng));
  return weighted[0];
}

function weight(kind: MinigameKind, rng: Rng): number {
  return rng() * (kind === 'ffa' ? 1.4 : 1);
}
