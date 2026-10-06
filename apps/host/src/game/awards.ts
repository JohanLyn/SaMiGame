import { shuffle, type Rng } from './rng';
import type { PlayerState } from './types';

/**
 * Bonuspriser ved spillets slut (som bonusstjerner). Hver pris giver BONUS_POINTS.
 * Statistik-nøgler: 'firsts', 'lasts', 'seconds' og 'taps'/'distance' tælles automatisk;
 * minigames tæller resten med `this.stat(slot, key)`.
 */
export const BONUS_POINTS = 3;

export interface AwardDef {
  id: string;
  title: string;
  description: string;
  stat: string;
  emoji: string;
}

export const AWARDS: readonly AwardDef[] = [
  { id: 'champ', title: 'Pokal-Pokalen', description: 'Flest førstepladser', stat: 'firsts', emoji: '🏆' },
  { id: 'silver', title: 'Nær-ved-Prisen', description: 'Flest andenpladser', stat: 'seconds', emoji: '🥈' },
  { id: 'comfort', title: 'Trøste-Tudekiksen', description: 'Flest sidstepladser', stat: 'lasts', emoji: '🍪' },
  { id: 'thumb', title: 'Tommelfinger-Titanen', description: 'Flest knaptryk', stat: 'taps', emoji: '👍' },
  { id: 'runner', title: 'Maraton-Mesteren', description: 'Løb længst', stat: 'distance', emoji: '👟' },
  { id: 'splash', title: 'Plaske-Prisen', description: 'Faldt oftest ud', stat: 'falls', emoji: '💦' },
  { id: 'target', title: 'Levende Skydeskive', description: 'Blev ramt flest gange', stat: 'hits', emoji: '🎯' },
  { id: 'bulldozer', title: 'Bulldozeren', description: 'Skubbede mest til de andre', stat: 'bonks', emoji: '🚜' },
  { id: 'scream', title: 'Brøle-Bjørnen', description: 'Råbte højest', stat: 'screams', emoji: '📢' },
  { id: 'jumper', title: 'Hoppe-Loppen', description: 'Hoppede mest', stat: 'jumps', emoji: '🦘' },
];

export interface AwardWinner {
  award: AwardDef;
  slots: number[];
  value: number;
}

/** Vælger op til `count` priser der faktisk har en vinder (Pokal-Pokalen altid med, hvis mulig). */
export function computeAwards(players: readonly PlayerState[], rng: Rng, count = 3): AwardWinner[] {
  const candidates: AwardWinner[] = [];
  for (const award of AWARDS) {
    const values = players.map((p) => p.stats[award.stat] ?? 0);
    const best = Math.max(...values);
    if (best <= 0) continue;
    const slots = players.filter((_, i) => values[i] === best).map((p) => p.slot);
    if (slots.length === players.length) continue; // alle lige → ingen pris
    candidates.push({ award, slots, value: best });
  }
  const champ = candidates.filter((c) => c.award.id === 'champ');
  const rest = shuffle(rng, candidates.filter((c) => c.award.id !== 'champ'));
  return [...champ, ...rest].slice(0, count);
}
