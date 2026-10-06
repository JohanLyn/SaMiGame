import { describe, expect, it } from 'vitest';
import { AVATAR_PRESETS } from '@samigame/shared';
import { computeAwards } from '../src/game/awards';
import { CHAOS_CARDS, modifiersFor } from '../src/game/chaos';
import { GameState } from '../src/game/GameState';
import { createRng } from '../src/game/rng';
import { isValidResult, pointsFor, rankByElimination, rankByScore, rankByTeam } from '../src/game/scoring';
import { chooseNext } from '../src/game/selection';
import { makeTeams } from '../src/game/teams';
import type { Teams } from '../src/game/types';

const FFA: Teams = { kind: 'ffa', teams: [[0], [1], [2], [3]], teamOf: [0, 1, 2, 3] };
const DUO: Teams = { kind: '2v2', teams: [[0, 2], [1, 3]], teamOf: [0, 1, 0, 1] };
const SOLO: Teams = { kind: '1v3', teams: [[1], [0, 2, 3]], teamOf: [1, 0, 1, 1] };

function game() {
  return new GameState(
    AVATAR_PRESETS.slice(0, 4).map((p, i) => ({ name: p.name, color: '#fff', avatar: p.avatar, isBot: i > 0 })),
    10,
    42,
  );
}

describe('point', () => {
  it('giver 3/2/1/0 i alle-mod-alle og deler ved uafgjort', () => {
    expect(pointsFor(FFA, { ranking: [[2], [0], [3], [1]] })).toEqual([2, 0, 3, 1]);
    expect(pointsFor(FFA, { ranking: [[0, 1], [2], [3]] })).toEqual([3, 3, 1, 0]);
  });

  it('giver 2 til hver på vinderholdet i 2 mod 2', () => {
    expect(pointsFor(DUO, rankByTeam(DUO, 1) && { ranking: rankByTeam(DUO, 1) })).toEqual([0, 2, 0, 2]);
    expect(pointsFor(DUO, { ranking: rankByTeam(DUO, null) })).toEqual([0, 0, 0, 0]);
  });

  it('giver eneren 3 eller trioen 1 hver i 1 mod 3', () => {
    expect(pointsFor(SOLO, { ranking: rankByTeam(SOLO, 0) })).toEqual([0, 3, 0, 0]);
    expect(pointsFor(SOLO, { ranking: rankByTeam(SOLO, 1) })).toEqual([1, 0, 1, 1]);
  });

  it('fordobler point med Dobbelt-Op', () => {
    expect(pointsFor(FFA, { ranking: [[0], [1], [2], [3]] }, 4, true)).toEqual([6, 4, 2, 0]);
  });
});

describe('rangering', () => {
  it('rangerer efter score og eliminering', () => {
    expect(rankByScore([5, 9, 5, 1])).toEqual([[1], [0, 2], [3]]);
    expect(rankByScore([5, 9, 5, 1], false)).toEqual([[3], [0, 2], [1]]);
    expect(rankByElimination([2, 0])).toEqual([[1, 3], [0], [2]]);
    expect(rankByElimination([2, 0, 3, 1])).toEqual([[1], [3], [0], [2]]);
  });

  it('validerer resultater', () => {
    expect(isValidResult({ ranking: [[0, 1], [2], [3]] })).toBe(true);
    expect(isValidResult({ ranking: [[0, 1], [1], [3]] })).toBe(false);
    expect(isValidResult({ ranking: [[0], [1], [2]] })).toBe(false);
  });
});

describe('hold', () => {
  it('laver to hold af to i 2 mod 2', () => {
    const t = makeTeams('2v2', [0, 0, 0, 0], createRng(1));
    expect(t.teams.flat().sort()).toEqual([0, 1, 2, 3]);
    expect(t.teams.map((x) => x.length)).toEqual([2, 2]);
    t.teams.forEach((team, i) => team.forEach((s) => expect(t.teamOf[s]).toBe(i)));
  });

  it('gør den førende til ener i 1 mod 3', () => {
    const t = makeTeams('1v3', [2, 7, 3, 1], createRng(1));
    expect(t.teams).toEqual([[1], [0, 2, 3]]);
  });
});

describe('udvælgelse', () => {
  const games = [
    { id: 'a', kind: 'ffa' as const },
    { id: 'b', kind: 'ffa' as const },
    { id: 'c', kind: '2v2' as const },
    { id: 'd', kind: '1v3' as const },
  ];

  it('gentager ikke et spil før alle er spillet', () => {
    const rng = createRng(7);
    const history: string[] = [];
    for (let i = 0; i < 4; i++) history.push(chooseNext(games, history, rng).id);
    expect(new Set(history).size).toBe(4);
    for (let i = 0; i < 20; i++) {
      const next = chooseNext(games, history, rng).id;
      expect(next).not.toBe(history[history.length - 1]);
      history.push(next);
    }
  });

  it('undgår samme type tre gange i træk', () => {
    const rng = createRng(3);
    for (let i = 0; i < 30; i++) expect(chooseNext(games, ['a', 'b'], rng).kind).not.toBe('ffa');
  });
});

describe('kaos-kort', () => {
  it('kombinerer modifiers', () => {
    const m = modifiersFor(CHAOS_CARDS.filter((c) => c.id === 'mirror' || c.id === 'double'));
    expect(m).toMatchObject({ mirror: true, double: true, size: 1 });
  });

  it('Bytte-Bonanza roterer point', () => {
    const g = game();
    g.players.forEach((p, i) => (p.score = i * 10));
    g.playChaos(CHAOS_CARDS.find((c) => c.id === 'swap')!);
    expect(g.scores).toEqual([10, 20, 30, 0]);
  });

  it('Tyveknægten tager fra den førende og giver til sidste', () => {
    const g = game();
    g.players.forEach((p, i) => (p.score = [5, 1, 9, 3][i]));
    g.playChaos(CHAOS_CARDS.find((c) => c.id === 'thief')!);
    expect(g.scores).toEqual([5, 3, 7, 3]);
  });
});

describe('GameState', () => {
  it('lægger point sammen, tæller placeringer og rydder kaos', () => {
    const g = game();
    g.startRound();
    g.playChaos(CHAOS_CARDS.find((c) => c.id === 'double')!);
    expect(g.modifiers.double).toBe(true);
    const pts = g.applyResult('sumo', FFA, { ranking: [[3], [1], [0], [2]] });
    expect(pts).toEqual([2, 4, 0, 6]);
    expect(g.scores).toEqual([2, 4, 0, 6]);
    expect(g.players[3].stats.firsts).toBe(1);
    expect(g.players[2].stats.lasts).toBe(1);
    expect(g.modifiers.double).toBe(false);
    expect(g.placements()).toEqual([2, 1, 3, 0]);
  });

  it('giver bonuspriser til dem med højest statistik', () => {
    const g = game();
    g.stat(2, 'falls', 4);
    g.stat(1, 'falls', 1);
    g.stat(0, 'firsts', 2);
    const awards = computeAwards(g.players, createRng(1), 5);
    expect(awards[0].award.id).toBe('champ');
    expect(awards.find((a) => a.award.stat === 'falls')?.slots).toEqual([2]);
    const before = g.scores;
    g.grantAwards(5);
    expect(g.scores[2]).toBe(before[2] + 3);
  });
});
