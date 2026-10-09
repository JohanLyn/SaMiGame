import { VOICE, type VoiceKey, type VoiceStyle } from './voiceLines';

export type { VoiceKey } from './voiceLines';

/**
 * Speakeren: forudindspillede engelske replikker (se voiceLines.ts) afspillet via WebAudio.
 * Musikken dukkes, mens speakeren taler, og `hype`-replikker får et whoosh og glitter-klokker under sig.
 */

const CLIP_URLS = import.meta.glob('./voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** nøgle → url'er til varianterne (`voice/win-1.mp3`, `voice/win-2.mp3` …). */
const CLIPS = new Map<string, string[]>();
for (const [path, url] of Object.entries(CLIP_URLS)) {
  const m = /\/([^/]+)-\d+\.mp3$/.exec(path);
  if (!m) continue;
  const list = CLIPS.get(m[1]) ?? [];
  list.push(url);
  CLIPS.set(m[1], list);
}

/** Replikker der skal kunne spilles med det samme (hentes, så snart lyden er låst op). */
const PRELOAD: VoiceKey[] = ['go', 'finish', 'win', 'ouch', 'welcome', 'start', 'chaos', 'twoVsTwo', 'oneVsThree'];

const COOLDOWN_MS = 2500;
/** Når en replik ikke er hentet endnu, spilles den kun, hvis den er klar inden for denne tid. */
const MAX_LATENCY_MS = 700;

const STYLE_GAIN: Record<VoiceStyle, number> = { hype: 1, call: 0.9, aside: 0.75 };

export class Narrator {
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private current: AudioBufferSourceNode | null = null;
  private lastSpoke = 0;
  private preloaded = false;
  enabled = true;

  constructor(
    private readonly ctx: AudioContext,
    private readonly bus: AudioNode,
    private readonly duck: (seconds: number) => void,
    private readonly impact: () => void,
  ) {}

  /** Alle replikker med lydklip (bruges af test/debug). */
  keys(): string[] {
    return [...CLIPS.keys()];
  }

  /** Hent de vigtigste replikker i baggrunden (kaldes når lyden er låst op). */
  preload(): void {
    if (this.preloaded) return;
    this.preloaded = true;
    for (const key of PRELOAD) for (const url of CLIPS.get(key) ?? []) void this.load(url);
  }

  /** Sig en tilfældig variant af en replik. `force` ignorerer pausen mellem replikker og afbryder den nuværende. */
  say(key: VoiceKey, force = false): void {
    if (!this.enabled || this.ctx.state !== 'running') return;
    const urls = CLIPS.get(key);
    if (!urls?.length) return;
    const now = performance.now();
    if (!force && (now - this.lastSpoke < COOLDOWN_MS || this.current)) return;
    this.lastSpoke = now;
    const url = urls[Math.floor(Math.random() * urls.length)];
    const asked = now;
    void this.load(url).then((buffer) => {
      if (!buffer || !this.enabled) return;
      if (performance.now() - asked > MAX_LATENCY_MS) return;
      this.play(buffer, VOICE[key].style);
    });
  }

  stop(): void {
    try {
      this.current?.stop();
    } catch {
      // allerede stoppet
    }
    this.current = null;
  }

  private play(buffer: AudioBuffer, style: VoiceStyle): void {
    this.stop();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = STYLE_GAIN[style];
    src.connect(gain).connect(this.bus);
    const t = this.ctx.currentTime + (style === 'hype' ? 0.06 : 0);
    if (style === 'hype') this.impact();
    src.start(t);
    this.duck(buffer.duration + 0.2);
    this.current = src;
    src.onended = () => {
      if (this.current === src) this.current = null;
    };
  }

  private load(url: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(url);
    if (!p) {
      p = bytes(url)
        .then((data) => this.ctx.decodeAudioData(data))
        .catch(() => null);
      this.buffers.set(url, p);
    }
    return p;
  }
}

/** Hent en fil som bytes. Data-URL'er (demo-buildet) dekodes direkte, så det også virker hvor fetch af data: er blokeret. */
async function bytes(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    const bin = atob(url.slice(url.indexOf(',') + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  return (await fetch(url)).arrayBuffer();
}
