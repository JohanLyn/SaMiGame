import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const vite = spawn('npx', ['vite', '--port', '5311', '--strictPort', '--host', '127.0.0.1'], { cwd: '/home/user/SaMiGame/apps/host', stdio: 'ignore' });
await sleep(3000);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://127.0.0.1:5311/?' + (process.argv[2] ?? 'minigame=sumo') + '&mute');
for (let i = 0; i < 60; i++) {
  await sleep(2000);
  const s = await page.evaluate(() => {
    const g = window.__SAMI__.game;
    const su = g.scene.getScene('sumo'); return { active: g.scene.getScenes(true).map((x) => x.scene.key), res: !!window.__SAMI__.lastResult, fps: Math.round(g.loop.actualFps), objs: su?.children.list.length, tweens: su?.tweens.getTweens().length, tTw: g.scene.getScene('transition').tweens.getTweens().length, timers: su?.time.getAllEvents?.().length, ev: su?.events.listenerCount('update') };
  });
  console.log(i * 2, JSON.stringify(s));
  if (s.res) { await sleep(3000); for (let k = 0; k < 2; k++) { await sleep(1000); console.log(JSON.stringify(await page.evaluate(() => { const t = window.__SAMI__.game.scene.getScene('transition'); return { frame: window.__SAMI__.game.loop.frame, tnow: t.time.now, tstatus: t.sys.settings.status, tactive: t.sys.settings.active, ev: t.time._active.map((e) => [e.elapsed, e.delay, e.hasDispatched]), pend: t.time._pendingInsertion.length, st: window.__SAMI__.game.scene.getScene('sumo').sys.settings.status, rs: window.__SAMI__.game.scene.getScene('results').sys.settings.status, covered: t.covered, ts: t.time.timeScale, paused: t.time.paused, tw: t.tweens.timeScale, scale0: t.tiles[0].scale, sumoTs: window.__SAMI__.game.scene.getScene('sumo').time.timeScale }; }))); } break; }
}
await browser.close();
vite.kill();
