import type { Rng } from '../../game/rng';
import { FROSTINGS, TOPPINGS, WIRE_COLORS } from './art';

/** En lagkage-bombe: alt det læseren kan se på TV'et. */
export interface CakeSpec {
  candles: number;
  /** Index i TOPPINGS. */
  topping: number;
  /** Index i FROSTINGS. */
  frosting: number;
  /** Ledningernes farver (index i WIRE_COLORS) fra venstre mod højre. */
  wires: number[];
}

export interface Manual {
  /** Linjer til telefonen. */
  lines: string[];
  /** Index (fra venstre) på den ledning der skal klippes. */
  answer: number;
}

interface Cond {
  text: string;
  test: (c: CakeSpec) => boolean;
}

interface Act {
  text: string;
  pick: (c: CakeSpec) => number;
}

const pickOf = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const intIn = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

export function randomCake(rng: Rng): CakeSpec {
  const n = intIn(rng, 3, 5);
  const pool = [0, 1, 2, 3, 4, 5];
  const wires: number[] = [];
  while (wires.length < n) wires.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return { candles: intIn(rng, 1, 5), topping: intIn(rng, 0, 2), frosting: intIn(rng, 0, 3), wires };
}

function randomCond(rng: Rng): Cond {
  switch (intIn(rng, 0, 5)) {
    case 0: {
      const n = intIn(rng, 1, 5);
      return { text: `kagen har ${n} lys`, test: (c) => c.candles === n };
    }
    case 1: {
      const n = intIn(rng, 1, 4);
      return { text: `der er flere end ${n} lys`, test: (c) => c.candles > n };
    }
    case 2: {
      const t = intIn(rng, 0, 2);
      const text = t === 2 ? 'der ingen frugt er på toppen' : `der er ${TOPPINGS[t]} på toppen`;
      return { text, test: (c) => c.topping === t };
    }
    case 3: {
      const f = intIn(rng, 0, 3);
      return { text: `glasuren er ${FROSTINGS[f].name}`, test: (c) => c.frosting === f };
    }
    case 4: {
      const n = intIn(rng, 3, 5);
      return { text: `der er ${n} ledninger`, test: (c) => c.wires.length === n };
    }
    default: {
      const col = intIn(rng, 0, WIRE_COLORS.length - 1);
      return { text: `der er en ${WIRE_COLORS[col].name} ledning`, test: (c) => c.wires.includes(col) };
    }
  }
}

function randomAct(rng: Rng, cake: CakeSpec): Act {
  const n = cake.wires.length;
  switch (intIn(rng, 0, 4)) {
    case 0:
    case 1: {
      const col = pickOf(rng, cake.wires);
      return { text: `klip den ${WIRE_COLORS[col].name}`, pick: (c) => c.wires.indexOf(col) };
    }
    case 2: {
      const k = intIn(rng, 2, n);
      return { text: `klip nr. ${k} fra venstre`, pick: () => k - 1 };
    }
    case 3: {
      const k = intIn(rng, 2, n);
      return { text: `klip nr. ${k} fra højre`, pick: (c) => c.wires.length - k };
    }
    default:
      return rng() < 0.5 ? { text: 'klip den første (yderst til venstre)', pick: () => 0 } : { text: 'klip den sidste (yderst til højre)', pick: (c) => c.wires.length - 1 };
  }
}

/** Laver en manual med 4 "Hvis"-regler + "Ellers". Den første regel der passer, gælder. */
export function makeManual(rng: Rng, cake: CakeSpec): Manual {
  const RULES = 4;
  const target = Math.floor(rng() * (RULES + 0.8)); // 0..4 (4 = "Ellers")
  const lines: string[] = [];
  let answer = -1;
  const used = new Set<string>();
  for (let i = 0; i < RULES; i++) {
    let cond: Cond;
    let guard = 0;
    do {
      cond = randomCond(rng);
      guard++;
    } while (guard < 60 && (used.has(cond.text) || (i < target && cond.test(cake)) || (i === target && !cond.test(cake))));
    used.add(cond.text);
    const act = randomAct(rng, cake);
    lines.push(`${i + 1}. Hvis ${cond.text}: ${act.text}`);
    if (answer < 0 && cond.test(cake)) answer = act.pick(cake);
  }
  const fallback = randomAct(rng, cake);
  lines.push(`Ellers: ${fallback.text}`);
  if (answer < 0) answer = fallback.pick(cake);
  return { lines, answer: Math.max(0, Math.min(cake.wires.length - 1, answer)) };
}
