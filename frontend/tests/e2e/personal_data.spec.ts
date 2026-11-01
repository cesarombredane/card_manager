import { expect, test } from '@playwright/test';
import AdmZip from 'adm-zip';

test('creates and reloads a collection through the UI and retains navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Manage your Pokemon card collection')).toBeVisible();
  await page.getByRole('link', { name: 'My collection', exact: true }).click();
  await page.getByRole('button', { name: 'New collection', exact: true }).click();
  await page.getByLabel('Collection name', { exact: true }).fill('Migration test collection');
  const save = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/collection/operations') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await save).ok()).toBe(true);
  await page.reload();
  await expect(page.getByText('Migration test collection', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole('button', { name: 'New collection', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('round-trips collection, binder and manual artwork in compatible backup archives', async ({
  request,
}) => {
  const collection = await (await request.get('/api/collection')).json();
  const binders = {
    version: 1,
    binders: [
      {
        folder_id: 'test-binder',
        page_count: 1,
        layout: '2x2',
        slots: [null, null, null, null, null, null, null, null],
        locked_pages: [0],
        proxies: [],
        images: [],
        image_placements: [],
        created_at: '2020-01-01',
        updated_at: '2020-01-01',
      },
    ],
  };
  expect((await request.put('/api/binders', { data: binders })).ok()).toBe(true);
  const image = Buffer.from('RIFFxxxxWEBP');
  const input = {
    set_id: 'test-set',
    card_id: 'test-card',
    variant_id: 'normal',
    language_id: 'en',
    data_url: `data:image/webp;base64,${image.toString('base64')}`,
  };
  expect((await request.put('/api/manual-images', { data: input })).ok()).toBe(true);
  const before = await (await request.get('/api/manual-images')).json();
  const exported = await request.get('/api/personal-data/export');
  expect(exported.ok()).toBe(true);
  const archive = await exported.body(),
    zip = new AdmZip(archive);
  expect(JSON.parse(zip.readAsText('manifest.json'))).toMatchObject({
    format: 'card-manager-personal-data',
    version: 1,
  });
  expect(JSON.parse(zip.readAsText('data/collection.json'))).toEqual(collection);
  const image_entry = zip
    .getEntries()
    .find((entry) => entry.entryName.startsWith('images/manual/') && !entry.isDirectory);
  expect(image_entry?.getData()).toEqual(image);
  expect((await request.put('/api/binders', { data: { version: 1, binders: [] } })).ok()).toBe(
    true,
  );
  expect(
    (
      await request.post('/api/personal-data/import', {
        data: archive,
        headers: { 'Content-Type': 'application/zip' },
      })
    ).ok(),
  ).toBe(true);
  expect(await (await request.get('/api/collection')).json()).toEqual(collection);
  expect(await (await request.get('/api/binders')).json()).toEqual(binders);
  expect(await (await request.get('/api/manual-images')).json()).toEqual(before);
  const second = new AdmZip(await (await request.get('/api/personal-data/export')).body());
  expect(second.getEntry(image_entry!.entryName)?.getData()).toEqual(image);
});

test('rejects invalid imports without changing stored personal data', async ({ request }) => {
  const before = await (await request.get('/api/collection')).json();
  expect(
    (
      await request.post('/api/personal-data/import', { data: Buffer.from('invalid archive') })
    ).status(),
  ).toBe(400);
  expect(await (await request.get('/api/collection')).json()).toEqual(before);
});
