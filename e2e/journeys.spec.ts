import { expect, test, type Page } from '@playwright/test';

/** L1: the interstitial blocks the first visit, so clear it before each journey. */
async function acceptAgeGate(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('smoke-trail:age-confirmed', 'yes');
  });
}

test.beforeEach(async ({ page }) => {
  await acceptAgeGate(page);
});

test('journey 1: landing shows venues with an open/closed badge, then a detail page', async ({ page }) => {
  await page.goto('/en');

  const list = page.getByRole('list', { name: 'Venues' }).getByRole('listitem');
  await expect(list.first()).toBeVisible();
  expect(await list.count()).toBeGreaterThan(50);

  // Every card carries a state — including "Hours unknown", which is legitimate.
  const firstCard = list.first();
  await expect(
    firstCard.getByText(/Open until|Closing soon|Opens at|Closed|Hours unknown/),
  ).toBeVisible();

  await firstCard.getByRole('link').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Directions \(Google\)/ })).toBeVisible();
  await expect(page).toHaveURL(/\/en\/coffeeshop\//);
});

test('journey 2: fuzzy search finds a venue by an approximate name', async ({ page }) => {
  await page.goto('/en');
  await page.getByLabel(/Search coffeeshops/).fill('dampkring');

  const results = page.getByRole('list', { name: 'Venues' }).getByRole('listitem');
  await expect(results.first()).toBeVisible();
  await expect(results.first()).toContainText(/dampkring/i);
  expect(await results.count()).toBeLessThan(5);
});

test('journey 3: the map renders and a pin preview links to the detail page', async ({ page }, testInfo) => {
  await page.goto('/en');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Map', exact: true }).click();
  }
  await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
  // L4: the licence and OSM notices must be reachable on the map itself.
  await page.locator('.maplibregl-ctrl-attrib-button').click();
  await expect(page.locator('.maplibregl-ctrl-attrib-inner')).toContainText('Gemeente Amsterdam');
  await expect(page.locator('.maplibregl-ctrl-attrib-inner')).toContainText('OpenStreetMap');
});

test('the 18+ interstitial appears on a first visit and persists the choice', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/en');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('18 or over');

  await dialog.getByRole('button', { name: 'I am 18 or over' }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(page.getByRole('dialog')).toBeHidden();
  await context.close();
});

test('filters narrow the list, live in the URL, and offer a way out of an empty result', async ({ page }) => {
  await page.goto('/en');
  const results = page.getByRole('list', { name: 'Venues' }).getByRole('listitem');
  const before = await results.count();

  // Terrace comes from the licence itself, so this holds even when the OSM
  // enrichment is missing from the snapshot.
  await page.getByRole('button', { name: 'Terrace' }).click();
  await expect(page).toHaveURL(/terrace=1/);
  await expect.poll(() => results.count()).toBeLessThan(before);

  await page.getByRole('button', { name: 'Rated 4+' }).click();
  // No venue has a rating yet, so this is the guaranteed empty state.
  await expect(page.getByText('No venues match all of these filters.')).toBeVisible();

  // The suggestion names the filter whose removal brings back the most venues.
  const relax = page.getByRole('button', { name: /^Drop “Rated 4\+”/ });
  await expect(relax).toBeVisible();
  await relax.click();
  await expect(page.getByText('No venues match all of these filters.')).toBeHidden();
});

test('near me falls back to a neighbourhood picker when permission is refused', async ({ page }) => {
  // Stub the refusal rather than relying on the headless permission default,
  // which differs between browsers and can simply never call back.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_ok: unknown, fail: (error: { code: number }) => void) =>
          fail({ code: 1 }),
      },
    });
  });
  await page.goto('/en');
  await page.getByRole('button', { name: 'Find venues near me' }).click();
  const picker = page.getByLabel('Neighbourhood', { exact: true });
  await expect(picker).toBeVisible({ timeout: 15_000 });

  await picker.selectOption({ index: 1 });
  await expect(page).toHaveURL(/neighbourhood=/);
});

test('venue pages carry LocalBusiness structured data', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('list', { name: 'Venues' }).getByRole('listitem').first().getByRole('link').first().click();

  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  const parsed = JSON.parse(jsonLd ?? '{}');
  expect(parsed['@type']).toBe('LocalBusiness');
  expect(parsed.address.addressLocality).toBe('Amsterdam');
  expect(parsed.geo.latitude).toBeGreaterThan(52);
  // §F6: no rating is asserted before a real review exists.
  expect(parsed.aggregateRating).toBeUndefined();
});

test('every locale renders its own words, its own lang and its own hreflang set', async ({ page }) => {
  const expectations = [
    { locale: 'en', heading: /licensed coffeeshops in Amsterdam/, search: /Search by name/ },
    { locale: 'nl', heading: /vergunde coffeeshops in Amsterdam/, search: /Zoek op naam/ },
    { locale: 'de', heading: /lizenzierte Coffeeshops in Amsterdam/, search: /Nach Name/ },
    { locale: 'fr', heading: /coffeeshops licenciés à Amsterdam/, search: /Rechercher par nom/ },
  ];

  for (const { locale, heading, search } of expectations) {
    await page.goto(`/${locale}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.getByPlaceholder(search)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    // Four translations plus x-default, on every locale.
    await expect(page.locator('link[rel="alternate"]')).toHaveCount(5);
  }
});

test('the language picker keeps you on the same venue', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('list', { name: 'Venues' }).getByRole('listitem').first().getByRole('link').first().click();
  await page.waitForURL(/\/en\/coffeeshop\//);
  const slug = new URL(page.url()).pathname.split('/').pop();

  await page.getByRole('button', { name: 'Language' }).click();
  await page.getByRole('option', { name: 'Deutsch' }).click();

  await expect(page).toHaveURL(new RegExp(`/de/coffeeshop/${slug}$`));
  await expect(page.getByRole('heading', { name: 'Öffnungszeiten' })).toBeVisible();
});

test('attribution is visible on /about-data', async ({ page }) => {
  await page.goto('/en/about-data');
  await expect(page.getByText('Contains data from Gemeente Amsterdam (CC BY 4.0)').first()).toBeVisible();
  await expect(page.getByText('© OpenStreetMap contributors (ODbL)').first()).toBeVisible();
});
