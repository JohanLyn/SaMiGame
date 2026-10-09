// Laver speakerens lydklip (apps/host/src/kit/audio/voice/*.mp3) ud fra replikkerne i kit/audio/voiceLines.ts.
//
//   npx tsx scripts/voice/build-voice.ts --piper <mappe med piper> --model <stemme.onnx> [--speaker 90] [--only welcome,go] [--out <mappe>]
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
const speaker = Number(opt('speaker', '90'));
const out = resolve(opt('out', new URL('../../apps/host/src/kit/audio/voice/', import.meta.url).pathname));
const only = opt('only', '').split(',').filter(Boolean);

/** Piper-indstillinger og ffmpeg-kæde pr. stil. `rate` < 1 sænker stemmen (uden at ændre tempoet). */
const STYLE: Record<VoiceStyle, { length: number; rate: number; echo: string; gain: number }> = {
  hype: { length: 1.18, rate: 0.86, echo: 'aecho=0.8:0.55:55|110|190|300:0.30|0.20|0.13|0.07', gain: 3 },
  call: { length: 1.06, rate: 0.9, echo: 'aecho=0.85:0.5:45|95|160:0.20|0.12|0.06', gain: 2 },
  aside: { length: 1.0, rate: 0.93, echo: 'aecho=0.9:0.6:35|80:0.12|0.06', gain: 1 },
};

function chain(style: VoiceStyle): string {
  const s = STYLE[style];
  return [
    'highpass=f=80',
    // Fjern TTS-sus før alt andet forstærker det
    'afftdn=nr=12:nf=-42',
    // Dybere stemme: sænk tonehøjden og hold tempoet
    `asetrate=22050*${s.rate}`,
    'aresample=44100',
    `atempo=${(1 / s.rate).toFixed(4)}`,
    // "Arena"-EQ: fylde i bunden, nærvær i mellemtonen, tæmmede s-lyde
    'equalizer=f=140:t=q:w=1:g=4',
    'equalizer=f=2800:t=q:w=1.2:g=3',
    'highshelf=f=6500:g=-6',
    'deesser=i=0.6:m=0.5:f=0.5',
    // Kompression + let mætning giver den kraftige speaker-lyd
    'acompressor=threshold=0.08:ratio=5:attack=4:release=140:makeup=2',
    `volume=${s.gain}dB`,
    'asoftclip=type=tanh',
    'lowpass=f=8500',
    // Plads til rumklangens hale, så arena-ekko
    'apad=pad_dur=0.7',
    s.echo,
    'loudnorm=I=-14:TP=-1.5:LRA=9',
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
    ['-m', model, '--json-input', '--length_scale', String(STYLE[style].length), '--noise_scale', '0.8', '--noise_w', '1.0', '--sentence_silence', '0.15'],
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
