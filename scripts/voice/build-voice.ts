// Laver speakerens lydklip (apps/host/src/kit/audio/voice/*.mp3) ud fra replikkerne i kit/audio/voiceLines.ts.
//
//   npx tsx scripts/voice/build-voice.ts --piper <mappe med piper> --model <stemme.onnx> [--speaker 648] [--only welcome,go] [--out <mappe>]
//
// Kræver Piper (https://github.com/rhasspy/piper, release 2023.11.14-2) og ffmpeg med libmp3lame.
// Stemmen er "en-us-libritts-high" fra Piper v0.0.2 (LibriTTS, CC BY 4.0) – speaker-nummeret vælger taleren.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { VOICE, type VoiceStyle } from '../../apps/host/src/kit/audio/voiceLines';

const args = process.argv.slice(2);
const opt = (name: string, fallback?: string): string => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) {
    if (fallback === undefined) throw new Error(`mangler --${name}`);
    return fallback;
  }
  return args[i + 1];
};

const piperDir = resolve(opt('piper'));
const model = resolve(opt('model'));
const speaker = Number(opt('speaker', '648'));
const out = resolve(opt('out', new URL('../../apps/host/src/kit/audio/voice/', import.meta.url).pathname));
const only = opt('only', '').split(',').filter(Boolean);

/**
 * Piper-indstillinger og ffmpeg-kæde pr. stil. Målet er en glad, energisk børne-tv-vært:
 * hurtig og livlig levering, tonehøjden løftet en anelse (`rate` > 1), lys og ren klang og kun lidt rumklang.
 */
const STYLE: Record<VoiceStyle, { length: number; noise: number; rate: number; echo: string; gain: number }> = {
  hype: { length: 0.9, noise: 0.95, rate: 1.07, echo: 'aecho=0.85:0.4:28|55:0.14|0.07', gain: 2 },
  call: { length: 0.93, noise: 0.9, rate: 1.05, echo: 'aecho=0.9:0.4:25|50:0.10|0.05', gain: 1 },
  aside: { length: 0.95, noise: 0.9, rate: 1.05, echo: 'aecho=0.9:0.4:22:0.06', gain: 0 },
};

function chain(style: VoiceStyle): string {
  const s = STYLE[style];
  return [
    'highpass=f=110',
    // Fjern TTS-sus før alt andet forstærker det
    'afftdn=nr=12:nf=-42',
    // Lysere stemme: løft tonehøjden lidt og hold tempoet
    `asetrate=22050*${s.rate}`,
    'aresample=44100',
    `atempo=${(1 / s.rate).toFixed(4)}`,
    // Lys og venlig EQ: mindre mudder, nærvær og lidt luft – men tæmmede s-lyde
    'equalizer=f=300:t=q:w=1:g=-2',
    'equalizer=f=3000:t=q:w=1.2:g=3',
    'highshelf=f=8000:g=1',
    'deesser=i=0.5:m=0.5:f=0.5',
    // Blød kompression, så alt kan høres over musikken (ingen forvrængning)
    'acompressor=threshold=0.1:ratio=3:attack=5:release=150:makeup=2',
    `volume=${s.gain}dB`,
    'lowpass=f=10000',
    'apad=pad_dur=0.4',
    s.echo,
    'loudnorm=I=-15:TP=-1.5:LRA=10',
    // Fjern stilhed i starten (vigtigt for timing) og i slutningen
    'silenceremove=start_periods=1:start_threshold=-45dB',
    'areverse',
    'silenceremove=start_periods=1:start_threshold=-55dB',
    'areverse',
    'afade=t=in:d=0.005',
  ].join(',');
}

mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'sami-voice-'));
const env = { ...process.env, LD_LIBRARY_PATH: piperDir };
const piper = join(piperDir, 'piper');

const entries = Object.entries(VOICE).filter(([key]) => only.length === 0 || only.includes(key));
if (only.length === 0) for (const f of readdirSync(out)) if (f.endsWith('.mp3')) rmSync(join(out, f));

for (const style of Object.keys(STYLE) as VoiceStyle[]) {
  const jobs = entries
    .filter(([, v]) => v.style === style)
    .flatMap(([key, v]) => v.lines.map((text, i) => ({ text, wav: join(tmp, `${key}-${i + 1}.wav`), mp3: join(out, `${key}-${i + 1}.mp3`) })));
  if (jobs.length === 0) continue;
  const input = jobs.map((j) => JSON.stringify({ text: j.text, speaker_id: speaker, output_file: j.wav })).join('\n');
  const res = spawnSync(
    piper,
    ['-m', model, '--json-input', '--length_scale', String(STYLE[style].length), '--noise_scale', String(STYLE[style].noise), '--noise_w', '1.1', '--sentence_silence', '0.1'],
    { input, env, stdio: ['pipe', 'ignore', 'pipe'] },
  );
  if (res.status !== 0) throw new Error(`piper fejlede: ${res.stderr}`);
  const af = chain(style);
  for (const j of jobs) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', j.wav, '-af', af, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', j.mp3]);
  }
  console.log(`${style}: ${jobs.length} klip`);
}

writeFileSync(join(out, 'README.md'), `Genereret af scripts/voice/build-voice.ts (Piper en-us-libritts-high, speaker ${speaker}).\nStemmen bygger på LibriTTS (CC BY 4.0, http://www.openslr.org/60/). Ret ikke filerne i hånden.\n`);
rmSync(tmp, { recursive: true, force: true });
