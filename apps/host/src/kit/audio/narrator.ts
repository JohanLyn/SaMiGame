/**
 * Fortælleren: en gakket dansk speaker via browserens indbyggede talesyntese.
 * Tier stille, hvis der ikke findes en dansk stemme (eller hvis lyden er slået fra).
 */

export const LINES = {
  welcome: ['Velkommen til SaMi Party!', 'Så er der fest på øen!', 'Hop ind, alle sammen!'],
  start: ['Lad kaosset begynde!', 'Spænd hjelmen, nu går det løs!', 'Er I klar? Det er jeg ikke!'],
  ritual: ['Hvad mon vi skal nu?', 'Spændingen er ulidelig!', 'Trommehvirvel, tak!'],
  chaos: ['Uh oh, et kaos-kort!', 'Nu bliver det tosset!', 'Det her havde ingen set komme!'],
  teams: ['Holdene er fundet!', 'Find jeres makker!', 'Én mod alle! Uhyggeligt!'],
  go: ['Kør!', 'Afsted!', 'Nu!'],
  finish: ['Færdig!', 'Stop, stop, stop!', 'Det var vildt!'],
  win: ['Sikke en præstation!', 'Klap for vinderen!', 'Ren magi!'],
  ouch: ['Av, det gjorde ondt!', 'Uha!', 'Den sad!'],
  lead: ['Vi har en ny førende!', 'Se lige hvem der fører nu!'],
  finale: ['Det store finale! Kaos-tårnet!', 'Nu gælder det alt!'],
  awards: ['Tid til prisoverrækkelse!', 'Og vinderen er...'],
} as const;

export type LineCategory = keyof typeof LINES;

const COOLDOWN_MS = 3500;

export class Narrator {
  private voice: SpeechSynthesisVoice | null = null;
  private lastSpoke = 0;
  enabled = true;

  constructor() {
    if (typeof speechSynthesis === 'undefined') return;
    const pick = () => {
      const voices = speechSynthesis.getVoices();
      this.voice = voices.find((v) => v.lang.toLowerCase().startsWith('da')) ?? null;
    };
    pick();
    speechSynthesis.addEventListener?.('voiceschanged', pick);
  }

  get available(): boolean {
    return this.voice !== null;
  }

  /** Sig en tilfældig linje fra en kategori, eller en konkret tekst. `force` ignorerer cooldown. */
  say(lineOrCategory: LineCategory | string, force = false): void {
    if (!this.enabled || !this.voice) return;
    const now = performance.now();
    if (!force && now - this.lastSpoke < COOLDOWN_MS) return;
    this.lastSpoke = now;
    const options = (LINES as Record<string, readonly string[]>)[lineOrCategory];
    const text = options ? options[Math.floor(Math.random() * options.length)] : lineOrCategory;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.lang = this.voice.lang;
    utterance.rate = 1.08;
    utterance.pitch = 1.25;
    speechSynthesis.speak(utterance);
  }
}
