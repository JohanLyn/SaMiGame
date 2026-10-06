import { expect, test, type Page } from '@playwright/test';

const HOST_URL = 'http://localhost:5173/';
const CONTROLLER_URL = 'http://localhost:5174/';

/** Læser TV'ets tilstand via debug-objektet window.__SAMI__. */
function hostState(host: Page) {
  return host.evaluate(() => {
    const { session, game } = (window as any).__SAMI__;
    const lobby = game.scene.getScene('lobby');
    return {
      code: session.code as string | null,
      joinUrl: session.joinUrl as string | null,
      players: session.players.map((p: any) => p && { name: p.name, connected: p.connected }),
      positions: (lobby?.bloks ?? []).map((b: any) => ({ x: b.x, y: b.y })),
    };
  });
}

test('en telefon kan joine via rumkoden og styre sin figur', async ({ browser }) => {
  const host = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await host.goto(HOST_URL);
  await expect.poll(async () => (await hostState(host)).code).toMatch(/^[A-Z]{4}$/);
  const { code, joinUrl } = await hostState(host);
  expect(joinUrl).toContain(`?room=${code}`);

  const phoneContext = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const phone = await phoneContext.newPage();
  await phone.goto(`${CONTROLLER_URL}?room=${code}`);
  await expect(phone.locator('#code-input')).toHaveValue(code!);
  await phone.locator('#name-input').fill('Ridder Agurk');
  await phone.locator('#join-button').click();

  await expect(phone.locator('#pad-screen')).toBeVisible();
  await expect(phone.locator('#player-badge')).toHaveText('Ridder Agurk');
  await expect.poll(async () => (await hostState(host)).players[0]).toEqual({ name: 'Ridder Agurk', connected: true });

  // Træk joysticket mod højre og se figuren flytte sig på TV'et.
  const startX = (await hostState(host)).positions[0].x;
  const zone = await phone.locator('#stick-zone').boundingBox();
  const cx = zone!.x + zone!.width / 2;
  const cy = zone!.y + zone!.height / 2;
  await phone.mouse.move(cx, cy);
  await phone.mouse.down();
  await phone.mouse.move(cx + 80, cy, { steps: 5 });
  await expect.poll(async () => (await hostState(host)).positions[0].x - startX).toBeGreaterThan(50);
  await phone.mouse.up();

  await host.screenshot({ path: 'test-results/lobby.png' });
  await phone.screenshot({ path: 'test-results/controller.png' });

  // Efter et refresh kommer telefonen tilbage på samme plads.
  await phone.reload();
  await expect(phone.locator('#pad-screen')).toBeVisible();
  await expect(phone.locator('#player-badge')).toHaveText('Ridder Agurk');
  await expect.poll(async () => (await hostState(host)).players.filter(Boolean).length).toBe(1);
});

test('forkert rumkode giver en venlig fejl', async ({ page }) => {
  await page.goto(CONTROLLER_URL);
  await page.locator('#code-input').fill('QQQQ');
  await page.locator('#join-button').click();
  await expect(page.locator('#join-error')).toHaveText(/findes ikke/);
});
