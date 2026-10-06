import { ZZFX } from 'zzfx';
import { MusicPlayer, type MusicTheme } from './music';
import { Narrator } from './narrator';
import { SFX, type SfxName } from './sfx';

export type { MusicTheme } from './music';
export type { SfxName } from './sfx';
export type { LineCategory } from './narrator';

/**
 * Al lyd i spillet går herigennem: `audio.sfx('pop')`, `audio.music('game')`, `audio.say('win')`.
 * Browsere kræver et klik/tastetryk før lyd må spille – `unlock()` kaldes automatisk ved første input.
 * Tast M slår lyden til/fra.
 */
class AudioManager {
  readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly sfxBus: GainNode;
  private readonly musicBus: GainNode;
  private readonly cache = new Map<string, AudioBuffer>();
  private readonly player: MusicPlayer;
  readonly narrator = new Narrator();
  private wantedTheme: MusicTheme | null = null;
  muted = false;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.55;
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.5;
    this.musicBus.connect(this.master);
    this.player = new MusicPlayer(this.ctx, this.musicBus);

    const params = new URLSearchParams(location.search);
    if (params.has('mute')) this.setMuted(true);

    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', (e) => {
      unlock();
      if (e.key === 'm' || e.key === 'M') this.setMuted(!this.muted);
    });
  }

  get unlocked(): boolean {
    return this.ctx.state === 'running';
  }

  unlock(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.master.gain.value = muted ? 0 : 1;
    this.narrator.enabled = !muted;
    if (muted && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  /** Spil en lydeffekt. `pitch` 1 = normal, `pan` -1..1 (venstre..højre). */
  sfx(name: SfxName, opts: { pitch?: number; volume?: number; pan?: number; delay?: number } = {}): void {
    if (!this.unlocked) return;
    if (name === 'win') return this.melody([72, 76, 79, 84], 0.09, 'square');
    if (name === 'fanfare') return this.melody([67, 72, 76, 79, 76, 79, 84], 0.11, 'sawtooth');
    if (name === 'drumroll') return this.drumroll(opts.volume ?? 1);
    if (name === 'cheer') {
      for (let i = 0; i < 6; i++) this.sfx('squeak', { pitch: 0.6 + Math.random(), delay: i * 0.05, volume: 0.4 });
      return this.sfx('splash', { volume: 0.5, pitch: 1.6 });
    }
    const buffer = this.buffer(name);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = (opts.pitch ?? 1) * (0.95 + Math.random() * 0.1);
    const gain = this.ctx.createGain();
    gain.gain.value = opts.volume ?? 1;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = opts.pan ?? 0;
    src.connect(gain).connect(pan).connect(this.sfxBus);
    src.start(this.ctx.currentTime + (opts.delay ?? 0));
  }

  music(theme: MusicTheme | null): void {
    this.wantedTheme = theme;
    if (theme === null) this.player.stop();
    else this.player.play(theme);
  }

  get theme(): MusicTheme | null {
    return this.wantedTheme;
  }

  say(line: Parameters<Narrator['say']>[0], force = false): void {
    this.narrator.say(line, force);
  }

  private buffer(name: keyof typeof SFX): AudioBuffer {
    let buffer = this.cache.get(name);
    if (!buffer) {
      const samples = ZZFX.buildSamples(...(SFX[name] as unknown as number[]));
      buffer = this.ctx.createBuffer(1, samples.length, ZZFX.sampleRate);
      buffer.getChannelData(0).set(samples);
      this.cache.set(name, buffer);
    }
    return buffer;
  }

  private melody(notes: number[], step: number, wave: OscillatorType): void {
    const t0 = this.ctx.currentTime;
    notes.forEach((n, i) => {
      const t = t0 + i * step;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = wave;
      osc.frequency.value = 440 * Math.pow(2, (n - 69) / 12);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (i === notes.length - 1 ? 0.6 : step * 1.5));
      osc.connect(gain).connect(this.sfxBus);
      osc.start(t);
      osc.stop(t + 0.7);
    });
  }

  private drumroll(volume: number): void {
    for (let i = 0; i < 24; i++) this.sfx('tick', { pitch: 0.35, delay: i * 0.045, volume: volume * (0.4 + i / 40) });
  }
}

export const audio = new AudioManager();
