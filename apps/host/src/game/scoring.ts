import type { MinigameResult, Teams } from './types';

/** Point pr. placering i alle-mod-alle. */
export const FFA_POINTS = [3, 2, 1, 0];
export const TEAM_WIN_POINTS = 2;
export const SOLO_WIN_POINTS = 3;
export const TRIO_WIN_POINTS = 1;

/** Point til hver plads (index = slot) for et resultat. */
export function pointsFor(teams: Teams, result: MinigameResult, playerCount = 4, double = false): number[] {
  const points = Array(playerCount).fill(0);
  const winners = result.ranking[0] ?? [];
  const everyoneWon = winners.length === playerCount;

  if (teams.kind === 'ffa') {
    let place = 0;
    for (const group of result.ranking) {
      for (const slot of group) points[slot] = FFA_POINTS[place] ?? 0;
      place += group.length;
    }
  } else if (!everyoneWon) {
    if (teams.kind === '2v2') {
      for (const slot of winners) points[slot] = TEAM_WIN_POINTS;
    } else {
      const solo = teams.teams[0][0];
      if (winners.includes(solo)) points[solo] = SOLO_WIN_POINTS;
      else for (const slot of teams.teams[1]) points[slot] = TRIO_WIN_POINTS;
    }
  }
  return double ? points.map((p) => p * 2) : points;
}

/** Rangér efter score (højst først, eller lavest først). Lige scorer deler placering. */
export function rankByScore(scores: number[], higherIsBetter = true): number[][] {
  const slots = scores.map((_, i) => i).sort((a, b) => (higherIsBetter ? scores[b] - scores[a] : scores[a] - scores[b]));
  const groups: number[][] = [];
  for (const slot of slots) {
    const last = groups[groups.length - 1];
    if (last && scores[last[0]] === scores[slot]) last.push(slot);
    else groups.push([slot]);
  }
  return groups;
}

/** Rangér efter rækkefølge hvor spillere er "ude" (først ude = sidst). Spillere der aldrig røg ud deler 1. pladsen. */
export function rankByElimination(eliminatedInOrder: number[], playerCount = 4): number[][] {
  const survivors = Array.from({ length: playerCount }, (_, i) => i).filter((s) => !eliminatedInOrder.includes(s));
  const groups: number[][] = survivors.length ? [survivors] : [];
  for (let i = eliminatedInOrder.length - 1; i >= 0; i--) groups.push([eliminatedInOrder[i]]);
  return groups;
}

/** Holdsejr: vinderholdet først, resten bagefter. `null` = uafgjort. */
export function rankByTeam(teams: Teams, winningTeam: number | null): number[][] {
  if (winningTeam === null) return [teams.teams.flat()];
  return [teams.teams[winningTeam], ...teams.teams.filter((_, i) => i !== winningTeam)];
}

export function isValidResult(result: MinigameResult, playerCount = 4): boolean {
  const all = result.ranking.flat();
  return all.length === playerCount && new Set(all).size === playerCount && all.every((s) => s >= 0 && s < playerCount);
}
