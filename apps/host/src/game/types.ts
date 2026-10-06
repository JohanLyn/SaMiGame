import type { Avatar } from '@samigame/shared';

export type MinigameKind = 'ffa' | '2v2' | '1v3';

export interface PlayerState {
  slot: number;
  name: string;
  /** Spillerens farve (hex). */
  color: string;
  avatar: Avatar;
  isBot: boolean;
  score: number;
  /** Statistik til bonuspriser (fx 'falls', 'hits', 'taps'). */
  stats: Record<string, number>;
}

/**
 * Holdinddeling for ét minigame.
 * ffa: [[0],[1],[2],[3]] · 2v2: [[a,b],[c,d]] · 1v3: [[ener],[tre andre]]
 */
export interface Teams {
  kind: MinigameKind;
  teams: number[][];
  /** teamOf[slot] = index i `teams`. */
  teamOf: number[];
}

/**
 * Resultat af et minigame: grupper af pladser efter placering. ranking[0] = vinder(e).
 * Uafgjort = flere i samme gruppe. Alle 4 pladser skal optræde præcis én gang.
 */
export interface MinigameResult {
  ranking: number[][];
}
