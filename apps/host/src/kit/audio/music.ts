/**
 * En lille procedurel "tracker": bas, akkorder, melodi og trommer med Web Audio-oscillatorer.
 * Hvert tema er en kort loop med egen stemning. Ingen lydfiler nødvendige.
 */

export type MusicTheme = 'lobby' | 'hub' | 'game' | 'tense' | 'finale' | 'results' | 'silly';

interface Song {
  bpm: number;
  /** MIDI-grundtone. */
  root: number;
  /** Akkorder som skala-trin (0 = grundtone) – én pr. takt. */
  chords: number[];
  /** Mol? */
  minor?: boolean;
  /** Melodi: 16 sekstendedele pr. takt, tal = skalatrin, null = pause. Gentages over akkorderne. */
  lead: (number | null)[];
  leadWave: OscillatorType;
  bassPattern: (0 | 1 | 2)[]; // 0 pause, 1 grundtone, 2 oktav
  drums: string; // 16 tegn pr. takt: k=kick, s=snare, h=hihat, x=kick+hat, .=pause
  swing?: number;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

const SONGS: Record<MusicTheme, Song> = {
  lobby: {
    bpm: 104, root: 55, chords: [0, 5, 3, 4],
    lead: [4, null, 2, null, 4, null, 5, 4, null, 2, null, 0, 2, null, null, null, 7, null, 5, null, 4, null, 2, null, 4, null, 2, null, 0, null, null, null],
    leadWave: 'triangle', bassPattern: [1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 0, 2, 0, 0, 1, 0], drums: 'k...h.s.k.h.h.s.', swing: 0.12,
  },
  hub: {
    bpm: 118, root: 60, chords: [0, 3, 4, 0, 5, 3, 1, 4],
    lead: [0, 2, 4, null, 4, 5, 4, 2, 0, null, 2, null, 4, null, null, null, 5, 4, 2, null, 2, 4, 2, 0, -1, null, 0, null, 2, null, null, null],
    leadWave: 'square', bassPattern: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 1], drums: 'x.h.s.h.x.hhs.h.', swing: 0.1,
  },
  game: {
    bpm: 140, root: 57, chords: [0, 0, 5, 4, 3, 3, 4, 4],
    lead: [0, null, 0, 2, 4, null, 2, 0, 4, null, 5, null, 7, null, 5, 4, 2, null, 2, 4, 5, null, 4, 2, 0, null, -1, null, 0, null, null, null],
    leadWave: 'square', bassPattern: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2], drums: 'x.h.s.hkx.h.s.hh',
  },
  tense: {
    bpm: 152, root: 52, minor: true, chords: [0, 0, 5, 4],
    lead: [0, null, 3, null, 0, null, 4, 3, 0, null, 6, null, 5, 4, 3, null, 0, 0, 3, null, 4, null, 3, 2, 0, null, null, -1, 0, null, null, null],
    leadWave: 'sawtooth', bassPattern: [1, 1, 0, 1, 1, 0, 1, 2, 1, 1, 0, 1, 1, 0, 2, 1], drums: 'k.hkskh.k.hks.hh',
  },
  finale: {
    bpm: 128, root: 55, chords: [0, 4, 5, 3, 0, 4, 3, 4],
    lead: [4, null, 4, 5, 7, null, 4, null, 2, null, 0, 2, 4, null, null, null, 5, null, 5, 7, 9, null, 7, null, 5, 4, 2, 4, 7, null, null, null],
    leadWave: 'sawtooth', bassPattern: [1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2], drums: 'x.h.s.h.x.hks.hs',
  },
  results: {
    bpm: 100, root: 60, chords: [0, 3, 4, 0],
    lead: [0, null, 4, null, 7, null, 4, null, 5, null, 7, null, 9, null, null, null, 7, null, 5, null, 4, null, 2, null, 0, null, null, null, null, null, null, null],
    leadWave: 'triangle', bassPattern: [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0], drums: 'k...s...k.k.s...', swing: 0.15,
  },
  silly: {
    bpm: 132, root: 62, chords: [0, 4, 0, 4, 3, 4, 0, 0],
    lead: [0, null, 7, null, 0, null, 7, null, 5, 4, 3, 2, 1, null, null, null, 0, 2, 4, 2, 0, null, -3, null, 0, null, 4, null, 0, null, null, null],
    leadWave: 'square', bassPattern: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 2, 1, 2], drums: 'k.s.k.s.k.s.kkss', swing: 0.2,
  },
};

const midiToHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function degree(song: Song, deg: number): number {
  const scale = song.minor ? MINOR : MAJOR;
  const octave = Math.floor(deg / 7);
  const idx = ((deg % 7) + 7) % 7;
  return song.root + octave * 12 + scale[idx];
}

export class MusicPlayer {
  private song: Song | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  current: MusicTheme | null = null;

  constructor(private readonly ctx: AudioContext, private readonly out: AudioNode) {}

  play(theme: MusicTheme): void {
    if (this.current === theme) return;
    this.fadeOutBus();
    this.current = theme;
    this.song = SONGS[theme];
    this.step = 0;
    this.bus = this.ctx.createGain();
    this.bus.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bus.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.6);
    this.bus.connect(this.out);
    this.nextTime = this.ctx.currentTime + 0.08;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }

  stop(): void {
    this.fadeOutBus();
    this.current = null;
    this.song = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private fadeOutBus(): void {
    const old = this.bus;
    if (!old) return;
    old.gain.cancelScheduledValues(this.ctx.currentTime);
    old.gain.setValueAtTime(old.gain.value, this.ctx.currentTime);
    old.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    setTimeout(() => old.disconnect(), 700);
    this.bus = null;
  }

  private schedule(): void {
    const song = this.song;
    if (!song || !this.bus) return;
    const sixteenth = 60 / song.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const swing = this.step % 2 === 1 ? sixteenth * (song.swing ?? 0) : 0;
      this.playStep(song, this.step, this.nextTime + swing, sixteenth);
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  private playStep(song: Song, step: number, t: number, len: number): void {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = song.chords[bar % song.chords.length];
    const bus = this.bus!;

    // Akkord (blød pad) på første slag i hver takt.
    if (s === 0) {
      for (const d of [0, 2, 4]) this.tone(midiToHz(degree(song, chord + d)), t, len * 15, 'triangle', 0.035, bus, 0.05);
    }
    // Bas
    const b = song.bassPattern[s];
    if (b) this.tone(midiToHz(degree(song, chord) - (b === 1 ? 24 : 12)), t, len * 0.9, 'square', 0.07, bus, 0.005, 900);
    // Melodi (to takter lang)
    const leadNote = song.lead[(step % 32)];
    if (leadNote !== null && leadNote !== undefined) {
      this.tone(midiToHz(degree(song, leadNote) + 12), t, len * 1.6, song.leadWave, 0.05, bus, 0.005, 2600);
    }
    // Trommer
    const d = song.drums[s];
    if (d === 'k' || d === 'x') this.kick(t, bus);
    if (d === 's') this.snare(t, bus);
    if (d === 'h' || d === 'x') this.hat(t, bus);
  }

  private tone(freq: number, t: number, dur: number, wave: OscillatorType, vol: number, out: AudioNode, attack = 0.01, cutoff?: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = osc;
    if (cutoff) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      osc.connect(filter);
      node = filter;
    }
    node.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private kick(t: number, out: AudioNode): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private noiseBuffer(): AudioBuffer {
    if (!this.noise) {
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private snare(t: number, out: AudioNode): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
    src.stop(t + 0.16);
  }

  private hat(t: number, out: AudioNode): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
    src.stop(t + 0.05);
  }
}
