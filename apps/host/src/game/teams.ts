import { shuffle, type Rng } from './rng';
import type { MinigameKind, Teams } from './types';

/**
 * Laver hold. 2v2: tilfældigt ("Holdhatten"). 1v3: den førende er ener (handicap) – ved lighed tilfældigt blandt de førende.
 */
export function makeTeams(kind: MinigameKind, scores: number[], rng: Rng): Teams {
  const slots = scores.map((_, i) => i);
  let teams: number[][];
  if (kind === 'ffa') {
    teams = slots.map((s) => [s]);
  } else if (kind === '2v2') {
    const order = shuffle(rng, slots);
    teams = [order.slice(0, 2).sort(), order.slice(2).sort()];
  } else {
    const best = Math.max(...scores);
    const leaders = slots.filter((s) => scores[s] === best);
    const solo = shuffle(rng, leaders)[0];
    teams = [[solo], slots.filter((s) => s !== solo)];
  }
  const teamOf = Array(slots.length).fill(0);
  teams.forEach((team, i) => team.forEach((s) => (teamOf[s] = i)));
  return { kind, teams, teamOf };
}
