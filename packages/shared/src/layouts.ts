/**
 * Controller-layouts: TV'et fortæller hver telefon, hvordan controlleren skal se ud lige nu.
 * Telefonen tegner layoutet og sender `ControllerInput` tilbage.
 */

export interface ButtonSpec {
  /** Sendes som `input.choice`. */
  id: number;
  label: string;
  /** Hex-farve på knappen. */
  color?: string;
  /** Emoji eller kort symbol over teksten. */
  icon?: string;
  disabled?: boolean;
}

interface Base {
  /** Lille hjælpetekst under controlleren. */
  hint?: string;
  /** Accentfarve (fx holdfarve) – ellers spillerens farve. */
  accent?: string;
}

export type ControllerLayout =
  /** Pæn venteskærm. */
  | (Base & { kind: 'wait'; title: string; message?: string; emoji?: string })
  /** Lobby: Byg-din-Bloks + (for kaptajnen) runder og start. */
  | (Base & { kind: 'lobby'; captain: boolean; rounds: number; roundOptions: number[]; canStart: boolean })
  /** "Klar?"-skærm før et minigame. A = klar. */
  | (Base & { kind: 'ready'; title: string; role?: string; controls: string[]; ready: boolean })
  /** Joystick + op til to knapper (labels udeladt = knappen skjules). */
  | (Base & { kind: 'stick'; a?: string; b?: string })
  /** 2–6 store knapper. Tryk sætter `choice` = knappens id og tæller `taps` op; `a` er sand mens en knap holdes. */
  | (Base & { kind: 'buttons'; buttons: ButtonSpec[]; columns?: number })
  /** Én kæmpe knap til at hamre løs på (`taps` tæller tryk). */
  | (Base & { kind: 'mash'; label: string; icon?: string })
  /** Træk-flade: `px`/`py` i [0,1], `a` = finger nede. Valgfri ekstra knap = `b`. */
  | (Base & { kind: 'touchpad'; b?: string; image?: 'face' | 'blank' })
  /** Vip telefonen: x/y fra gyroskopet (joystick som reserve). */
  | (Base & { kind: 'tilt'; a?: string; b?: string })
  /** Råb i mikrofonen: `level` i [0,1] (hamre-knap som reserve). */
  | (Base & { kind: 'mic'; label: string })
  /** Hemmelig information kun denne spiller ser + valgfri knapper. */
  | (Base & { kind: 'info'; title: string; lines: string[]; buttons?: ButtonSpec[] })
  /** Valg i et gitter (døre, pumper ...). `selected` fremhæves, `locked` = valg låst. */
  | (Base & { kind: 'choice'; title: string; options: ButtonSpec[]; selected?: number; locked?: boolean; columns?: number })
  /** Resultat-skærm på telefonen. */
  | (Base & { kind: 'result'; place: number; points: number; total: number; message: string });

export type LayoutKind = ControllerLayout['kind'];

export const LAYOUT_KINDS: readonly LayoutKind[] = [
  'wait', 'lobby', 'ready', 'stick', 'buttons', 'mash', 'touchpad', 'tilt', 'mic', 'info', 'choice', 'result',
];

/** Max størrelse på et layout i JSON – beskytter telefonerne mod kæmpe beskeder. */
export const MAX_LAYOUT_BYTES = 6000;
