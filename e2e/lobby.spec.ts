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

test('en telefon joiner, bygger sin figur, starter spillet og spiller det igennem', async ({ browser }) => {
  test.setTimeout(240_000);
  const host = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const hostErrors = collectErrors(host);
  await host.goto(`${HOST_URL}?rounds=1&speed=4&rawdelta&mute`);
  await expect.poll(async () => (await hostState(host)).code, { timeout: 30_000 }).toMatch(/^[A-Z]{4}$/);
  const { code, joinUrl } = await hostState(host);
  expect(joinUrl).toContain(`?room=${code}`);

  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true });
  const phone = await phoneContext.newPage();
  const phoneErrors = collectErrors(phone);
  await phone.goto(`${CONTROLLER_URL}?room=${code}`);
  await expect(phone.locator('#code-input')).toHaveValue(code!);
  await phone.locator('#name-input').fill('Ridder Agurk');
  await phone.locator('#join-button').click();

  // Lobby: Byg-din-Bloks
  await expect(phone.locator('.lobby')).toBeVisible({ timeout: 15_000 });
  await expect(phone.locator('#bar-name')).toHaveText('Ridder Agurk');
  await phone.getByRole('button', { name: '🎩 Hat' }).click();
  await phone.locator('.thumb', { hasText: 'Viking' }).click();
  await expect.poll(async () => (await hostState(host)).players[0]).toEqual({ name: 'Ridder Agurk', connected: true, hat: 'viking' });
  await phone.screenshot({ path: 'test-results/phone-lobby.png' });
  await host.screenshot({ path: 'test-results/tv-lobby.png' });

  // Kaptajnen starter
  await phone.getByRole('button', { name: '▶ START SPILLET' }).click();
  await expect.poll(async () => (await hostState(host)).round, { timeout: 30_000 }).toBe(1);

  // Intro: tryk KLAR
  await expect(phone.locator('.ready-btn')).toBeVisible({ timeout: 90_000 });
  await host.screenshot({ path: 'test-results/tv-intro.png' });
  await phone.screenshot({ path: 'test-results/phone-ready.png' });
  await phone.locator('.ready-btn').click();

  // Minigame: telefonen får et controller-layout
  await expect(phone.locator('.layout-stick, .layout-buttons, .layout-mash, .layout-touchpad, .layout-tilt, .layout-mic, .layout-info, .layout-choice')).toBeVisible({ timeout: 60_000 });
  await phone.screenshot({ path: 'test-results/phone-controller.png' });

  // Resultat og til sidst prisoverrækkelsen
  await expect(phone.locator('.layout-result')).toBeVisible({ timeout: 150_000 });
  await host.screenshot({ path: 'test-results/tv-results.png' });
  await expect.poll(async () => (await hostState(host)).scenes, { timeout: 120_000 }).toContain('awards');
  const scores = (await hostState(host)).scores as number[];
  expect(scores.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);

  expect(hostErrors).toEqual([]);
  expect(phoneErrors).toEqual([]);
});

test('forkert rumkode giver en venlig fejl', async ({ page }) => {
  await page.goto(CONTROLLER_URL);
  await page.locator('#code-input').fill('QQQQ');
  await page.locator('#join-button').click();
  await expect(page.locator('#join-error')).toHaveText(/findes ikke/);
});
