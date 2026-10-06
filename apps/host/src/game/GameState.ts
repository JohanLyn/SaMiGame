import type { Avatar } from '@samigame/shared';
import { computeAwards, BONUS_POINTS, type AwardWinner } from './awards';
import { drawChaosCard, modifiersFor, NO_CHAOS, type ChaosCard, type ChaosModifiers } from './chaos';
import { createRng, type Rng } from './rng';
import { pointsFor } from './scoring';
import type { MinigameKind, MinigameResult, PlayerState, Teams } from './types';

export interface PlayerSeed {
  name: string;
  color: string;
  avatar: Avatar;
  isBot: boolean;
}

/**
 * Hele spillets tilstand – ren logik uden Phaser, så den kan testes.
 */
export class GameState {
  readonly players: PlayerState[];
  readonly rng: Rng;
  round = 0;
  totalRounds: number;
  readonly history: string[] = [];
  /** Kaos-kort der gælder for næste minigame. */
  pendingChaos: ChaosCard[] = [];
  /** Sandsynlighed for et tilfældigt kaos-kort i en runde (udover Fiskesøens støvler). */
  chaosChance = 0.3;

  constructor(seeds: PlayerSeed[], totalRounds = 10, seed?: number) {
    this.rng = createRng(seed);
    this.totalRounds = totalRounds;
    this.players = seeds.map((s, slot) => ({ ...s, slot, score: 0, stats: {} }));
  }

  get scores(): number[] {
    return this.players.map((p) => p.score);
  }

  get isFinalRound(): boolean {
    return this.round >= this.totalRounds;
  }

  get modifiers(): ChaosModifiers {
    return this.pendingChaos.length ? modifiersFor(this.pendingChaos) : { ...NO_CHAOS };
  }

  startRound(): number {
    this.round++;
    return this.round;
  }

  /** Skal der trækkes et tilfældigt kaos-kort denne runde? (Aldrig i første runde.) */
  rollChaos(): boolean {
    return this.round > 1 && this.rng() < this.chaosChance;
  }

  drawChaos(): ChaosCard {
    return drawChaosCard(this.rng, this.pendingChaos.map((c) => c.id));
  }

  /** Spil et kaos-kort: øjeblikkelige kort virker nu, andre gemmes til næste minigame. */
  playChaos(card: ChaosCard): string | null {
    if (card.instant) return card.instant(this.players);
    this.pendingChaos.push(card);
    return null;
  }

  stat(slot: number, key: string, amount = 1): void {
    const stats = this.players[slot].stats;
    stats[key] = (stats[key] ?? 0) + amount;
  }

  /** Registrer et minigame-resultat og returnér point pr. plads. Rydder brugte kaos-kort. */
  applyResult(minigameId: string, teams: Teams, result: MinigameResult): number[] {
    const points = pointsFor(teams, result, this.players.length, this.modifiers.double);
    points.forEach((p, slot) => (this.players[slot].score += p));
    this.history.push(minigameId);
    this.recordPlacements(teams.kind, result);
    this.pendingChaos = [];
    return points;
  }

  private recordPlacements(kind: MinigameKind, result: MinigameResult): void {
    const groups = result.ranking;
    if (groups.length < 2) return; // uafgjort for alle
    for (const slot of groups[0]) this.stat(slot, 'firsts');
    if (kind === 'ffa') {
      if (groups[1]) for (const slot of groups[1]) this.stat(slot, 'seconds');
      for (const slot of groups[groups.length - 1]) this.stat(slot, 'lasts');
    } else {
      for (const slot of groups[groups.length - 1]) this.stat(slot, 'lasts');
    }
  }

  /** Placering pr. plads (0 = førende), lige scorer deler placering. */
  placements(): number[] {
    return this.players.map((p) => this.players.filter((o) => o.score > p.score).length);
  }

  leaderSlots(): number[] {
    const best = Math.max(...this.scores);
    return this.players.filter((p) => p.score === best).map((p) => p.slot);
  }

  /** Beregn bonuspriser og læg point til. */
  grantAwards(count = 3): AwardWinner[] {
    const awards = computeAwards(this.players, this.rng, count);
    for (const a of awards) for (const slot of a.slots) this.players[slot].score += BONUS_POINTS;
    return awards;
  }
}
