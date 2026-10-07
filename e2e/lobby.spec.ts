import { expect, test, type Page } from '@playwright/test';

const HOST_URL = 'http://localhost:5173/';
const CONTROLLER_URL = 'http://localhost:5174/';

/** Læser TV'ets tilstand via debug-objektet window.__SAMI__. */
function hostState(host: Page) {
  return host.evaluate(() => {
    const { net, game, director } = (window as any).__SAMI__;
    return {
      code: net.code as string | null,
      joinUrl: net.joinUrl as string | null,
      players: net.players.map((p: any) => p && { name: p.name, connected: p.connected, hat: p.avatar?.hat ?? null }),
      scenes: game.scene.getScenes(true).map((s: any) => s.scene.key) as string[],
      round: director.state?.round ?? 0,
      scores: director.state?.scores ?? [],
    };
  });
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('to telefoner bygger figurer og spiller et helt spil (3 runder + finale + priser)', async ({ browser }) => {
  test.setTimeout(900_000);
  const host = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const hostErrors = collectErrors(host);
  await host.goto(`${HOST_URL}?rounds=3&speed=4&rawdelta&mute`);
  await expect.poll(async () => (await hostState(host)).code, { timeout: 30_000 }).toMatch(/^[A-Z]{4}$/);
  const { code, joinUrl } = await hostState(host);
  expect(joinUrl).toContain(`?room=${code}`);

  const phones: Page[] = [];
  const phoneErrors: string[][] = [];
  for (const [i, name] of ['Ridder Agurk', 'Mormor'].entries()) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true });
    const phone = await ctx.newPage();
    phoneErrors.push(collectErrors(phone));
    await phone.goto(`${CONTROLLER_URL}?room=${code}`);
    await expect(phone.locator('#code-input')).toHaveValue(code!);
    await phone.locator('#name-input').fill(name);
    await phone.locator('#join-button').click();
    await expect(phone.locator('.lobby')).toBeVisible({ timeout: 15_000 });
    await expect(phone.locator('#bar-name')).toHaveText(name);
    phones.push(phone);
    expect(i).toBeLessThan(2);
  }
  const [captain, second] = phones;

  // Byg-din-Bloks: kaptajnen vælger vikinghjelm
  await captain.getByRole('button', { name: '🎩 Hat' }).click();
  await captain.locator('.thumb', { hasText: 'Viking' }).click();
  await expect.poll(async () => (await hostState(host)).players[0]).toEqual({ name: 'Ridder Agurk', connected: true, hat: 'viking' });
  await expect(second.getByRole('button', { name: '▶ START SPILLET' })).toHaveCount(0);
  await captain.screenshot({ path: 'test-results/phone-lobby.png' });
  await host.screenshot({ path: 'test-results/tv-lobby.png' });

  await captain.getByRole('button', { name: '▶ START SPILLET' }).click();
  await expect.poll(async () => (await hostState(host)).round, { timeout: 30_000 }).toBe(1);

  // Spil videre: tryk KLAR når telefonerne beder om det, indtil prisoverrækkelsen.
  const seen = new Set<string>();
  const deadline = Date.now() + 840_000;
  while (Date.now() < deadline) {
    const state = await hostState(host);
    for (const s of state.scenes) {
      if (!seen.has(s) && s !== 'transition') {
        seen.add(s);
        await host.screenshot({ path: `test-results/tv-${s}.png` }).catch(() => undefined);
      }
    }
    if (state.scenes.includes('awards')) break;
    for (const phone of phones) {
      const ready = phone.locator('.ready-btn:not(.done)');
      if (await ready.isVisible().catch(() => false)) await ready.click().catch(() => undefined);
    }
    await host.waitForTimeout(1000);
  }
  expect([...seen]).toEqual(expect.arrayContaining(['round', 'intro', 'results', 'awards']));
  await captain.screenshot({ path: 'test-results/phone-final.png' });
  const scores = (await hostState(host)).scores as number[];
  expect(scores.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);

  expect(hostErrors).toEqual([]);
  phoneErrors.forEach((errs) => expect(errs).toEqual([]));
});

test('forkert rumkode giver en venlig fejl', async ({ page }) => {
  await page.goto(CONTROLLER_URL);
  await page.locator('#code-input').fill('QQQQ');
  await page.locator('#join-button').click();
  await expect(page.locator('#join-error')).toHaveText(/findes ikke/);
});
