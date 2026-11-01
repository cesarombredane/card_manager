// import hooks
import { computed, watch } from 'vue';

// import utils
import { afterAll, expect, test, vi } from 'vitest';

// import types
import type { Pokedex_Binder_Config } from '../../src/models/pokedex_binder';
import type { Collection_Data } from '../../src/models/collection';
import type { Binders_Data } from '../../src/models/binders';

const catalog = vi.hoisted(() => ({
  pokemon: Array.from({ length: 278 }, (_, index) => ({
    id: `pokemon-${index}`,
    pokedex_id: index + 1,
    name: `Pokemon ${index}`,
    names: { en: `Pokemon ${index}` },
    form: null,
  })),
}));
vi.mock('../../src/services/catalog_storage', () => ({
  get_pokemon: () => catalog.pokemon,
  get_cards: () => [],
  get_series: () => [],
  get_set_by_id: () => null,
}));

const date = '2020-01-01T00:00:00.000Z';
const config: Pokedex_Binder_Config = {
  include_regional_forms: true,
  include_mega_forms: true,
  region: 'all',
  international_language_id: 'en',
  asia_language_id: 'ja',
  series_ids: [],
  variant_types: [],
  rarities: [],
};
const collection: Collection_Data = {
  version: 2,
  folders: [
    { id: 'pokedex', name: 'Pokedex', type: 'binder', created_at: date, pokedex_config: config },
    { id: 'box', name: 'Box', type: 'box', created_at: date },
  ],
  entries: Array.from({ length: 2580 }, (_, index) => {
    const wanted = index < catalog.pokemon.length;
    return {
      id: `entry-${index}`,
      folder_id: wanted ? 'pokedex' : 'box',
      set_id: wanted ? 'pokedex-requirement' : 'set',
      card_id: wanted ? `pokemon-${index}` : String(index),
      variant_id: wanted ? 'unavailable' : 'normal',
      language_id: wanted ? '-' : 'en',
      condition: 'NM',
      quantity: 1,
      wanted,
      strong_language: wanted ? true : undefined,
      pokedex_requirement_id: wanted ? `pokedex:pokemon-${index}` : undefined,
      pokedex_candidate_count: wanted ? 0 : undefined,
      added_at: date,
      updated_at: date,
    };
  }),
  manual_cards: [],
};
const binders: Binders_Data = {
  version: 1,
  binders: [
    {
      folder_id: 'pokedex',
      page_count: 1,
      layout: '2x2',
      slots: ['entry-0', 'entry-1', null, null, null, null, null, null],
      locked_pages: [],
      proxies: [],
      images: [],
      image_placements: [],
      created_at: date,
      updated_at: date,
    },
  ],
};
const operations: Array<{ before: Collection_Data; after: Collection_Data }> = [];
vi.stubGlobal('BroadcastChannel', undefined);
vi.stubGlobal(
  'fetch',
  vi.fn(async (url: string, options?: RequestInit): Promise<Response> => {
    if (url === '/api/collection') return Response.json(collection);
    if (url === '/api/collection/operations') {
      operations.push(JSON.parse(String(options?.body)));
      return Response.json({ ok: true });
    }
    if (url === '/api/binders') return Response.json(binders);
    if (url === '/api/manual-images') {
      if (options?.method === 'PUT')
        return Response.json({
          set_id: 'set',
          card_id: 'card',
          variant_id: 'normal',
          language_id: 'en',
          url: '/images/manual/set/card/normal/en.png',
          updated_at: date,
        });
      return Response.json({ version: 1, entries: [] });
    }
    throw new Error(`Unexpected request: ${url}`);
  }),
);
afterAll(() => vi.unstubAllGlobals());

test('publishes reconciled data once, preserves unchanged timestamps and keeps reads reactive', async () => {
  const { collection_store } = await import('../../src/store/modules/collection');
  const { binder_store } = await import('../../src/store/modules/binders');
  const { manual_image_store } = await import('../../src/store/modules/manual_images');
  const { store } = await import('../../src/store/core');
  await store.dispatch('collection/load');
  await store.dispatch('binders/load');
  const before = store.state.collection.data;
  const seen: Collection_Data[] = [];
  const stop = watch(
    () => store.state.collection.data,
    (res) => seen.push(res),
    { flush: 'sync' },
  );
  const start = performance.now();
  await store.dispatch('collection/load');
  const load_ms = performance.now() - start;
  expect(seen).toHaveLength(1);
  expect(seen[0].entries).toHaveLength(2580);
  expect(
    collection_store.entries.value
      .filter((entry) => entry.wanted)
      .every((entry) => entry.updated_at === date),
  ).toBe(true);
  expect(store.state.collection.data).toEqual(before);
  expect(operations).toHaveLength(0);
  expect(() => {
    collection_store.entries.value[0].quantity = 99;
  }).toThrow(TypeError);
  expect(collection_store.entries.value[0].quantity).toBe(1);

  collection.entries[0].pokedex_candidate_count = 7;
  await store.dispatch('collection/load');
  expect(collection_store.entries.value[0].pokedex_candidate_count).toBe(0);
  expect(collection_store.entries.value[0].updated_at).not.toBe(date);
  expect(collection_store.entries.value[1].updated_at).toBe(date);
  collection.entries[0].pokedex_candidate_count = 0;
  await store.dispatch('collection/load');

  const quantities = computed<number>(() =>
    collection_store.owned_quantity('set', '278', 'normal'),
  );
  expect(quantities.value).toBe(1);
  const writes_before = operations.length;
  const publications_before = seen.length;
  const edit_start = performance.now();
  collection_store.set_quantity('entry-278', 2);
  const edit_ms = performance.now() - edit_start;
  await store.dispatch('collection/save');
  expect(quantities.value).toBe(2);
  expect(seen).toHaveLength(publications_before + 1);
  expect(before.entries.find((entry) => entry.id === 'entry-278')?.quantity).toBe(1);
  expect(operations).toHaveLength(writes_before + 1);
  expect(operations.at(-1)?.after.entries).toMatchObject([{ id: 'entry-278', quantity: 2 }]);

  const nested_before = seen.length;
  const nested_writes_before = operations.length;
  const created = collection_store.create_pokedex_folder('New Pokedex', config);
  await store.dispatch('collection/save');
  expect(seen).toHaveLength(nested_before + 1);
  expect(seen.at(-1)?.entries.filter((entry) => entry.folder_id === created.id)).toHaveLength(278);
  expect(operations).toHaveLength(nested_writes_before + 1);
  expect(() => {
    created.name = 'Outside edit';
  }).toThrow(TypeError);
  const current = store.state.collection.data;
  expect(() => collection_store.create_folder(' ', 'box')).toThrow('Folder name is required');
  expect(store.state.collection.data).toBe(current);
  const invalid_config = { ...config, series_ids: null } as unknown as Pokedex_Binder_Config;
  expect(() => collection_store.create_pokedex_folder('Rejected draft', invalid_config)).toThrow(
    TypeError,
  );
  expect(store.state.collection.data).toBe(current);
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    expect(() => {
      store.state.sets_search_input = 'outside edit';
    }).toThrow('[vuex]');
  } finally {
    warning.mockRestore();
    store.commit('set_sets_search_input', '');
  }
  const next = collection_store.create_folder('After failure', 'box');
  expect(collection_store.folders.value.some((folder) => folder.id === next.id)).toBe(true);
  stop();

  const prior_binder = binder_store.get('pokedex')!;
  binder_store.move_slot('pokedex', 0, 1);
  expect(prior_binder.slots.slice(0, 2)).toEqual(['entry-0', 'entry-1']);
  expect(binder_store.get('pokedex')?.slots.slice(0, 2)).toEqual(['entry-1', 'entry-0']);
  expect(() => {
    binder_store.get('pokedex')!.slots[0] = null;
  }).toThrow(TypeError);
  binder_store.set_page_locked('pokedex', 0, true);
  const locked = binder_store.get('pokedex');
  binder_store.move_slot('pokedex', 0, 1);
  expect(binder_store.get('pokedex')).toBe(locked);

  await manual_image_store.upload({
    set_id: 'set',
    card_id: 'card',
    variant_id: 'normal',
    language_id: 'en',
    data_url: 'synthetic',
  });
  expect(manual_image_store.find('set', 'card', 'normal', 'en')?.url).toContain('/images/manual/');
  expect(() => {
    manual_image_store.entries.value[0].url = '/outside';
  }).toThrow(TypeError);
  const filters_start = performance.now();
  for (let index = 0; index < 12; index++) store.commit('set_sets_search_input', String(index));
  const filter_ms = (performance.now() - filters_start) / 12;
  console.info(
    JSON.stringify({
      synthetic_entries: 2580,
      strict: 'strict' in store && store.strict,
      load_ms: +load_ms.toFixed(2),
      quantity_update_ms: +edit_ms.toFixed(2),
      filter_average_ms: +filter_ms.toFixed(2),
    }),
  );
});
