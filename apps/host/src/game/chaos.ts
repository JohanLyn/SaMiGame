import { pick, type Rng } from './rng';
import type { PlayerState } from './types';

/** Effekter der gælder for det næste minigame. Framework'et anvender dem automatisk. */
export interface ChaosModifiers {
  /** Spejlvendt styring: x/y på joystick vendes. */
  mirror: boolean;
  /** Figurstørrelse (0.65 = bittesmå, 1.4 = kæmper). */
  size: number;
  /** Dobbelt point. */
  double: boolean;
  /** Tyngdekraft-faktor (0.4 = måne). Minigames med tyngdekraft bør gange med den. */
  gravity: number;
  /** Fortælleren taler i rim. */
  rhyme: boolean;
}

export const NO_CHAOS: ChaosModifiers = { mirror: false, size: 1, double: false, gravity: 1, rhyme: false };

export interface ChaosCard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Hex-farve på kortet. */
  color: string;
  /** Ændrer modifiers for næste minigame. */
  modify?: (m: ChaosModifiers) => void;
  /** Øjeblikkelig effekt på stillingen. Returnerer en beskrivelse af hvad der skete. */
  instant?: (players: PlayerState[]) => string;
}

export const CHAOS_CARDS: readonly ChaosCard[] = [
  { id: 'mirror', title: 'Spejl-Kaos', description: 'Styringen er spejlvendt i næste spil!', emoji: '🪞', color: '#9b5cff', modify: (m) => { m.mirror = true; } },
  { id: 'tiny', title: 'Krympe-Kaos', description: 'Alle er bittesmå i næste spil!', emoji: '🐜', color: '#3ee6a8', modify: (m) => { m.size = 0.65; } },
  { id: 'giant', title: 'Kæmpe-Kaos', description: 'Alle er KÆMPESTORE i næste spil!', emoji: '🦕', color: '#ff8a2b', modify: (m) => { m.size = 1.35; } },
  { id: 'double', title: 'Dobbelt-Op', description: 'Næste spil giver dobbelt point!', emoji: '✖️2', color: '#ffcf3a', modify: (m) => { m.double = true; } },
  { id: 'moon', title: 'Måne-Mode', description: 'Måne-tyngdekraft i næste spil!', emoji: '🌙', color: '#47b8ff', modify: (m) => { m.gravity = 0.4; } },
  { id: 'rhyme', title: 'Rime-Rod', description: 'Fortælleren kan kun tale i rim!', emoji: '🎤', color: '#ff5fa2', modify: (m) => { m.rhyme = true; } },
  {
    id: 'swap', title: 'Bytte-Bonanza', description: 'Alle bytter point med naboen!', emoji: '🔄', color: '#ff4b4b',
    instant: (players) => {
      const scores = players.map((p) => p.score);
      players.forEach((p, i) => (p.score = scores[(i + 1) % players.length]));
      return 'Alle point rykkede én plads!';
    },
  },
  {
    id: 'gift', title: 'Trøste-Gave', description: 'Sidstepladsen får 3 gratis point!', emoji: '🎁', color: '#3ccf5a',
    instant: (players) => {
      const min = Math.min(...players.map((p) => p.score));
      const last = players.filter((p) => p.score === min);
      last.forEach((p) => (p.score += 3));
      return `${last.map((p) => p.name).join(' & ')} får +3!`;
    },
  },
  {
    id: 'thief', title: 'Tyveknægten', description: 'Den førende mister 2 point til sidstepladsen!', emoji: '🦝', color: '#2a1f7a',
    instant: (players) => {
      const max = Math.max(...players.map((p) => p.score));
      const min = Math.min(...players.map((p) => p.score));
      if (max === min) return 'Alle står lige – tyven gik forgæves!';
      const leader = players.find((p) => p.score === max)!;
      const last = players.find((p) => p.score === min)!;
      const amount = Math.min(2, leader.score);
      leader.score -= amount;
      last.score += amount;
      return `${leader.name} → ${last.name}: ${amount} point!`;
    },
  },
];

export function drawChaosCard(rng: Rng, exclude: readonly string[] = []): ChaosCard {
  const pool = CHAOS_CARDS.filter((c) => !exclude.includes(c.id));
  return pick(rng, pool.length ? pool : CHAOS_CARDS);
}

export function modifiersFor(cards: readonly ChaosCard[]): ChaosModifiers {
  const m = { ...NO_CHAOS };
  for (const card of cards) card.modify?.(m);
  return m;
}
