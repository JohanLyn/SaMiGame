// Screenshot-værktøj til TV-appen (uden server, offline dev-tilstand).
//
//   node scripts/shoot.mjs --query "minigame=sumo" --at 1,6,14 --out shots/sumo [--port 5300] [--until-result] [--timeout 90]
//
// Starter selv en Vite-server for apps/host på --port (default 5300), åbner
// http://localhost:<port>/?<query>&mute, tager screenshots efter de angivne sekunder,
// og (med --until-result) venter til minigamet er færdigt og printer resultatet.
// Konsolfejl printes og giver exit-kode 1.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

const port = Number(opt('port', 5300));
const query = opt('query', 'minigame=sumo');
const at = opt('at', '2,6,12').split(',').map(Number);
const out = opt('out', 'shots/out');
const timeout = Number(opt('timeout', 120));
const untilResult = flag('until-result');
const width = Number(opt('width', 1920));
const height = Number(opt('height', 1080));

mkdirSync(out, { recursive: true });

const vite = spawn('npx', ['vite', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
  cwd: new URL('../apps/host/', import.meta.url).pathname,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NO_HMR: '1' },
  detached: true,
});
let viteLog = '';
vite.stdout.on('data', (d) => (viteLog += d));
vite.stderr.on('data', (d) => (viteLog += d));
// Dræb hele procesgruppen (npx → vite), så der ikke hænger en gammel server tilbage.
const stop = () => {
  try {
    process.kill(-vite.pid, 'SIGTERM');
  } catch {}
};
process.on('exit', stop);

const url = `http://127.0.0.1:${port}/?${query}&mute`;
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    if (res.ok) break;
  } catch {}
  await sleep(500);
}

const browser = await chromium.launch(flag('swiftshader') ? { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {});
const page = await browser.newPage({ viewport: { width, height } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  if (m.type() === 'warning' && m.text().includes('ugyldigt resultat')) errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e?.stack ?? e)));

await page.goto(url);
const t0 = Date.now();
let shot = 0;
for (const sec of at) {
  const wait = sec * 1000 - (Date.now() - t0);
  if (wait > 0) await sleep(wait);
  const file = `${out}/${String(++shot).padStart(2, '0')}-${sec}s.png`;
  await page.screenshot({ path: file });
  console.log('screenshot', file);
}

let result = null;
if (untilResult) {
  const deadline = t0 + timeout * 1000;
  while (Date.now() < deadline) {
    result = await page.evaluate(() => window.__SAMI__?.lastResult ?? window.__SAMI__?.lastRitual ?? null);
    if (result) break;
    await sleep(500);
  }
  if (result) {
    await sleep(2500);
    await page.screenshot({ path: `${out}/99-result.png` });
    console.log('RESULT', JSON.stringify(result));
  } else {
    console.log('INTET RESULTAT inden for', timeout, 'sek');
    await page.screenshot({ path: `${out}/99-timeout.png` });
  }
}

await browser.close();
stop();
if (errors.length) {
  console.log('KONSOLFEJL:\n' + [...new Set(errors)].join('\n'));
  process.exit(1);
}
if (untilResult && !result) process.exit(2);
process.exit(0);
