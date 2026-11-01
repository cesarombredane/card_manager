// import utils
import { afterAll, expect, test, vi } from 'vitest';

vi.mock('../../src/services/catalog_storage', () => ({
  get_pokemon: () => [],
  get_cards: () => [],
  get_series: () => [],
  get_set_by_id: () => null,
}));

const collection = { version: 2, folders: [], entries: [], manual_cards: [] };
const binders = { version: 1, binders: [] };
let invalid_collection = false;
let failed_save = false;
let invalid_binders = false;
const operations: unknown[] = [];
vi.stubGlobal('BroadcastChannel', undefined);
vi.stubGlobal(
  'fetch',
  vi.fn(async (url: string, options?: RequestInit): Promise<Response> => {
    if (url === '/api/collection/operations') {
      operations.push(JSON.parse(String(options?.body)));
      return Response.json({}, { status: failed_save ? 503 : 200 });
    }
    if (url === '/api/collection')
      return Response.json(invalid_collection ? { folders: [] } : collection);
    if (url === '/api/binders')
      return Response.json(invalid_binders ? { binders: [null] } : binders);
    if (url === '/api/manual-images') return Response.json({ version: 1, entries: [] });
    throw new Error(`Unexpected request: ${url}`);
  }),
);

afterAll(() => vi.unstubAllGlobals());

test('preserves synchronous domain edits, queued deltas and load failure safety in strict Vuex', async () => {
  const { collection_store } = await import('../../src/store/modules/collection');
  const { binder_store } = await import('../../src/store/modules/binders');
  const { store } = await import('../../src/store/core');
  expect('strict' in store && store.strict).toBe(true);
  await store.dispatch('collection/load');
  await store.dispatch('binders/load');

  const first = collection_store.create_folder('First', 'binder');
  const second = collection_store.create_folder('Second', 'box');
  expect(first.id).not.toBe(second.id);
  await store.dispatch('collection/save');
  expect(operations.slice(0, 2)).toMatchObject([
    { before: { folders: [] }, after: { folders: [{ id: first.id }] } },
    { before: { folders: [] }, after: { folders: [{ id: second.id }] } },
  ]);
  const binder = binder_store.create(first.id, 2, '2x2');
  const proxy = binder_store.create_proxy(first.id, 'Test proxy', 2);
  expect(binder.folder_id).toBe(first.id);
  expect(binder_store.get(first.id)?.proxies[0].id).toBe(proxy.id);
  expect(binder_store.get(first.id)?.slots).toHaveLength(16);
  await store.dispatch('binders/save');

  failed_save = true;
  collection_store.create_folder('Failed save', 'box');
  await store.dispatch('collection/save');
  expect(collection_store.save_error.value).toContain('503');
  failed_save = false;
  collection_store.create_folder('Recovery', 'box');
  await store.dispatch('collection/save');
  expect(collection_store.save_error.value).toBeNull();

  const manual = collection_store.create_manual_card({
    folder_id: second.id,
    name: 'Manual card',
    set_name: '',
    number: '1',
    language_id: 'en',
    variant_id: 'normal',
    condition: 'NM',
    quantity: 1,
    category: 'pokemon',
    rarity: '',
    pokemon_name: '',
    hp: null,
    types: [],
    illustrator: '',
    notes: '',
    estimated_value: null,
    release_date: null,
  });
  const update = {
    folder_id: second.id,
    language_id: 'en',
    condition: 'NM' as const,
    quantity: 2,
    variant_id: 'holo',
  };
  expect(() => collection_store.update_entry(manual.entry.id, update)).not.toThrow();
  expect(
    collection_store.entries.value.find((entry) => entry.id === manual.entry.id),
  ).toMatchObject({ variant_id: 'holo', quantity: 2 });
  await store.dispatch('collection/save');
  expect(operations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        after: expect.objectContaining({
          entries: expect.arrayContaining([
            expect.objectContaining({ id: manual.entry.id, variant_id: 'holo', quantity: 2 }),
          ]),
        }),
      }),
    ]),
  );

  const saved_binder = JSON.stringify(binder_store.get(first.id));
  invalid_binders = true;
  await store.dispatch('binders/load');
  expect(binder_store.is_ready.value).toBe(false);
  expect(JSON.stringify(binder_store.get(first.id))).toBe(saved_binder);
  expect(binder_store.save_error.value).toContain('Invalid binder data');

  const before = JSON.stringify(collection_store.folders.value);
  invalid_collection = true;
  await expect(store.dispatch('collection/load')).rejects.toThrow('Invalid collection data');
  expect(collection_store.is_file_connected.value).toBe(false);
  expect(JSON.stringify(collection_store.folders.value)).toBe(before);
  const writes = operations.length;
  await store.dispatch('collection/save');
  expect(operations).toHaveLength(writes);
});
