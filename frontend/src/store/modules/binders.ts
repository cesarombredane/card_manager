// import hooks
import { computed } from 'vue';

// import utils
import { read_binders, save_binders } from '../../services/personal_data';
import { parse_binders_data } from '../../services/personal_validation';
import { commit_result, mutation_result } from '../commit_result';
import { immutable_data } from '../immutable_data';
import { store } from '../core';

// import types
import type { Mutation_Call } from '../../models/personal_state';
import type {
  Binder_Layout,
  Binder_Proxy,
  Binder_Image,
  Binder_Image_Placement,
  Collection_Binder,
  Binders_Data,
} from '../../models/binders';

export type {
  Binder_Layout,
  Binder_Proxy,
  Binder_Image,
  Binder_Image_Placement,
  Collection_Binder,
  Binders_Data,
} from '../../models/binders';

store.registerModule('binders', {
  namespaced: true,
  state: () => ({
    data: immutable_data<Binders_Data>({ version: 1, binders: [] }),
    ready: false,
    error: null as string | null,
  }),
  mutations: {
    set_ready(module_state, value: boolean) {
      module_state.ready = value;
    },
    set_error(module_state, value: string | null) {
      module_state.error = value;
    },
    replace_data(module_state, binders: Collection_Binder[]) {
      module_state.data = immutable_data({ version: 1, binders });
    },
    create(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.create>,
        ReturnType<typeof binders_operations.create>
      >,
    ) {
      mutation_result(call, () => edit_binders(() => binders_operations.create(...call.args)));
    },
    remove(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.remove>,
        ReturnType<typeof binders_operations.remove>
      >,
    ) {
      mutation_result(call, () => edit_binders(() => binders_operations.remove(...call.args)));
    },
    set_page_locked(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.set_page_locked>,
        ReturnType<typeof binders_operations.set_page_locked>
      >,
    ) {
      mutation_result(call, () =>
        edit_binders(() => binders_operations.set_page_locked(...call.args)),
      );
    },
    reset_settings(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.reset_settings>,
        ReturnType<typeof binders_operations.reset_settings>
      >,
    ) {
      mutation_result(call, () =>
        edit_binders(() => binders_operations.reset_settings(...call.args)),
      );
    },
    set_slot(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.set_slot>,
        ReturnType<typeof binders_operations.set_slot>
      >,
    ) {
      mutation_result(call, () => edit_binders(() => binders_operations.set_slot(...call.args)));
    },
    create_proxy(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.create_proxy>,
        ReturnType<typeof binders_operations.create_proxy>
      >,
    ) {
      mutation_result(call, () =>
        edit_binders(() => binders_operations.create_proxy(...call.args)),
      );
    },
    create_image(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.create_image>,
        ReturnType<typeof binders_operations.create_image>
      >,
    ) {
      mutation_result(call, () =>
        edit_binders(() => binders_operations.create_image(...call.args)),
      );
    },
    update_proxy(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.update_proxy>,
        ReturnType<typeof binders_operations.update_proxy>
      >,
    ) {
      mutation_result(call, () =>
        edit_binders(() => binders_operations.update_proxy(...call.args)),
      );
    },
    update_image(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.update_image>,
        ReturnType<typeof binders_operations.update_image>
      >,
    ) {
      mutation_result(call, () =>
        edit_binders(() => binders_operations.update_image(...call.args)),
      );
    },
    remove_asset(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.remove_asset>,
        ReturnType<typeof binders_operations.remove_asset>
      >,
    ) {
      mutation_result(call, () =>
        edit_binders(() => binders_operations.remove_asset(...call.args)),
      );
    },
    place_image(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.place_image>,
        ReturnType<typeof binders_operations.place_image>
      >,
    ) {
      mutation_result(call, () => edit_binders(() => binders_operations.place_image(...call.args)));
    },
    remove_image_placement(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.remove_image_placement>,
        ReturnType<typeof binders_operations.remove_image_placement>
      >,
    ) {
      mutation_result(call, () =>
        edit_binders(() => binders_operations.remove_image_placement(...call.args)),
      );
    },
    apply_layout(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.apply_layout>,
        ReturnType<typeof binders_operations.apply_layout>
      >,
    ) {
      mutation_result(call, () =>
        edit_binders(() => binders_operations.apply_layout(...call.args)),
      );
    },
    move_slot(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.move_slot>,
        ReturnType<typeof binders_operations.move_slot>
      >,
    ) {
      mutation_result(call, () => edit_binders(() => binders_operations.move_slot(...call.args)));
    },
    clean(
      _state,
      call: Mutation_Call<
        Parameters<typeof binders_operations.clean>,
        ReturnType<typeof binders_operations.clean>
      >,
    ) {
      mutation_result(call, () => edit_binders(() => binders_operations.clean(...call.args)));
    },
  },
  actions: {
    load() {
      return load_binders();
    },
    save() {
      queue_persist();
      return pending_save;
    },
  },
});
let working_data: Binders_Data | null = null;
let needs_persist = false;
const binder_data = (): Binders_Data => working_data ?? store.state.binders.data;

function edit_binders<Result>(edit: () => Result): Result {
  if (working_data) return edit();
  working_data = structuredClone(store.state.binders.data);
  let result: Result;
  let published: Binders_Data | null = null;
  try {
    result = edit();
    if (needs_persist) published = immutable_data(working_data);
    else if (result !== null && typeof result === 'object') immutable_data(result);
  } finally {
    working_data = null;
    needs_persist = false;
  }
  if (published) {
    store.state.binders.data = published;
    void store.dispatch('binders/save');
  }
  return result;
}

const persist = (): void => {
  needs_persist = true;
};
const is_ready = computed<boolean>({
  get: () => store.state.binders.ready,
  set: (value) => store.commit('binders/set_ready', value),
});
const save_error = computed<string | null>({
  get: () => store.state.binders.error,
  set: (value) => store.commit('binders/set_error', value),
});
let pending_save: Promise<void> = Promise.resolve();
const display_proxy_date = (value: unknown): string => {
  const date = typeof value === 'string' ? value : '';
  const iso_match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return iso_match ? `${iso_match[3]}/${iso_match[2]}/${iso_match[1]}` : date;
};

const load_binders = () =>
  read_binders()
    .then(async (res) => {
      if (!res.ok) throw new Error(`Unable to load binders.json (${res.status})`);
      const parsed = parse_binders_data(await res.json());
      if (!Array.isArray(parsed.binders)) throw new Error('Invalid binders JSON');
      const binders = parsed.binders.map((binder) => {
        const binder_data = { ...binder } as Collection_Binder & { locked?: boolean };
        delete binder_data.locked;
        const expected_slots = binder.page_count * 2 * slots_per_page(binder.layout);
        return {
          ...binder_data,
          locked_pages: Array.isArray(binder.locked_pages)
            ? [...new Set(binder.locked_pages)].filter(
                (page) => Number.isInteger(page) && page >= 0 && page < binder.page_count * 2,
              )
            : [],
          slots:
            binder.slots.length < expected_slots
              ? [...binder.slots, ...Array(expected_slots - binder.slots.length).fill(null)]
              : binder.slots.slice(0, expected_slots),
          proxies: Array.isArray(binder.proxies)
            ? binder.proxies.map((proxy) => ({
                ...proxy,
                quantity: Math.max(1, proxy.quantity ?? 1),
                date: display_proxy_date(proxy.date),
              }))
            : [],
          images: Array.isArray(binder.images)
            ? binder.images.map((image) => ({
                ...image,
                card_slots: Array.isArray(image.card_slots)
                  ? image.card_slots
                  : Array.from({ length: image.width * image.height }, (_, index) => index),
                crop_zoom: Math.min(3, Math.max(1, Number(image.crop_zoom) || 1)),
                crop_x: Math.min(100, Math.max(-100, Number(image.crop_x) || 0)),
                crop_y: Math.min(100, Math.max(-100, Number(image.crop_y) || 0)),
              }))
            : [],
          image_placements: Array.isArray(binder.image_placements) ? binder.image_placements : [],
        };
      });
      store.commit('binders/replace_data', binders);
      is_ready.value = true;
      save_error.value = null;
    })
    .catch((err) => {
      is_ready.value = false;
      save_error.value = err instanceof Error ? err.message : String(err);
    });

const load_promise = store.dispatch('binders/load');

const queue_persist = (): void => {
  if (!is_ready.value) return;
  pending_save = pending_save
    .then(async () => {
      await load_promise;
      const response = await save_binders(store.state.binders.data);
      if (!response.ok) throw new Error(`Unable to save binders.json (${response.status})`);
      save_error.value = null;
    })
    .catch((err) => {
      save_error.value = err instanceof Error ? err.message : String(err);
    });
};

const slots_per_page = (layout: Binder_Layout): number => (layout === '2x2' ? 4 : 9);
const page_for_slot = (binder: Collection_Binder, slot_index: number): number | null => {
  const page_index = Math.floor(slot_index / slots_per_page(binder.layout));
  return binder.locked_pages.includes(page_index) ? null : page_index;
};
const asset_touches_locked_page = (
  binder: Collection_Binder,
  kind: 'proxy' | 'image',
  asset_id: string,
): boolean =>
  kind === 'proxy'
    ? binder.slots.some(
        (slot, index) =>
          slot === `proxy:${asset_id}` &&
          binder.locked_pages.includes(Math.floor(index / slots_per_page(binder.layout))),
      )
    : binder.image_placements.some(
        (placement) =>
          placement.image_id === asset_id && binder.locked_pages.includes(placement.side_index),
      );
const new_asset_id = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const binders_operations = {
  binders: computed<Collection_Binder[]>(() => binder_data().binders),
  is_ready: computed<boolean>(() => is_ready.value),
  save_error: computed<string | null>(() => save_error.value),

  get(folder_id: string): Collection_Binder | null {
    return binder_data().binders.find((binder) => binder.folder_id === folder_id) ?? null;
  },

  create(folder_id: string, page_count: number, layout: Binder_Layout): Collection_Binder {
    const existing = this.get(folder_id);
    if (existing) return existing;
    const now = new Date().toISOString();
    const binder: Collection_Binder = {
      folder_id: folder_id,
      page_count: Math.max(1, Math.floor(page_count)),
      layout,
      locked_pages: [],
      slots: Array(Math.max(1, Math.floor(page_count)) * 2 * slots_per_page(layout)).fill(null),
      proxies: [],
      images: [],
      image_placements: [],
      created_at: now,
      updated_at: now,
    };
    binder_data().binders.push(binder);
    persist();
    return binder;
  },

  remove(folder_id: string): void {
    const index = binder_data().binders.findIndex((binder) => binder.folder_id === folder_id);
    if (index === -1) return;
    binder_data().binders.splice(index, 1);
    persist();
  },

  set_page_locked(folder_id: string, page_index: number, locked: boolean): void {
    const binder = this.get(folder_id);
    if (
      !binder ||
      !Number.isInteger(page_index) ||
      page_index < 0 ||
      page_index >= binder.page_count * 2
    )
      return;
    const currently_locked = binder.locked_pages.includes(page_index);
    if (currently_locked === locked) return;
    binder.locked_pages = locked
      ? [...binder.locked_pages, page_index].sort((left, right) => left - right)
      : binder.locked_pages.filter((candidate) => candidate !== page_index);
    binder.updated_at = new Date().toISOString();
    persist();
  },

  reset_settings(folder_id: string, page_count: number, layout: Binder_Layout): void {
    const binder = this.get(folder_id);
    if (!binder || binder.locked_pages.length) return;
    binder.page_count = Math.max(1, Math.floor(page_count));
    binder.layout = layout;
    binder.slots = Array(binder.page_count * 2 * slots_per_page(layout)).fill(null);
    binder.image_placements = [];
    binder.locked_pages = [];
    const dimension = layout === '2x2' ? 2 : 3;
    binder.images = binder.images.map((image) => {
      const width = Math.min(dimension, image.width);
      const height = Math.min(dimension, image.height);
      return {
        ...image,
        width,
        height,
        card_slots: image.card_slots.flatMap((index) => {
          const row = Math.floor(index / image.width);
          const column = index % image.width;
          return row < height && column < width ? [row * width + column] : [];
        }),
      };
    });
    binder.updated_at = new Date().toISOString();
    persist();
  },

  set_slot(folder_id: string, slot_index: number, entry_id: string | null): void {
    const binder = this.get(folder_id);
    if (
      !binder ||
      slot_index < 0 ||
      slot_index >= binder.slots.length ||
      page_for_slot(binder, slot_index) === null
    )
      return;
    binder.slots[slot_index] = entry_id;
    binder.updated_at = new Date().toISOString();
    persist();
  },

  create_proxy(folder_id: string, name: string, quantity: number, date = ''): Binder_Proxy {
    const binder = this.get(folder_id);
    if (!binder || !name.trim()) throw new Error('Proxy name is required');
    const proxy = {
      id: new_asset_id('proxy'),
      name: name.trim(),
      quantity: Math.max(1, Math.floor(quantity)),
      date,
      created_at: new Date().toISOString(),
    };
    binder.proxies.push(proxy);
    binder.updated_at = new Date().toISOString();
    persist();
    return proxy;
  },

  create_image(folder_id: string, name: string, width: number, height: number): Binder_Image {
    const binder = this.get(folder_id);
    if (!binder || !name.trim()) throw new Error('Image name is required');
    const limit = binder.layout === '2x2' ? 2 : 3;
    const image = {
      id: new_asset_id('image'),
      name: name.trim(),
      width: Math.min(limit, Math.max(1, Math.floor(width))),
      height: Math.min(limit, Math.max(1, Math.floor(height))),
      card_slots: [],
      crop_zoom: 1,
      crop_x: 0,
      crop_y: 0,
      created_at: new Date().toISOString(),
    };
    binder.images.push(image);
    binder.updated_at = new Date().toISOString();
    persist();
    return image;
  },

  update_proxy(
    folder_id: string,
    proxy_id: string,
    values: { name: string; quantity: number; date: string },
  ): void {
    const binder = this.get(folder_id);
    const proxy = binder?.proxies.find((candidate) => candidate.id === proxy_id);
    if (
      !binder ||
      !proxy ||
      !values.name.trim() ||
      asset_touches_locked_page(binder, 'proxy', proxy_id)
    )
      return;
    proxy.name = values.name.trim();
    proxy.quantity = Math.max(1, Math.floor(values.quantity));
    proxy.date = values.date;
    binder.updated_at = new Date().toISOString();
    persist();
  },

  update_image(
    folder_id: string,
    image_id: string,
    values: {
      name: string;
      width: number;
      height: number;
      card_slots: number[];
      crop_zoom: number;
      crop_x: number;
      crop_y: number;
    },
  ): void {
    const binder = this.get(folder_id);
    const image = binder?.images.find((candidate) => candidate.id === image_id);
    if (
      !binder ||
      !image ||
      !values.name.trim() ||
      asset_touches_locked_page(binder, 'image', image_id)
    )
      return;
    const limit = binder.layout === '2x2' ? 2 : 3;
    const width = Math.min(limit, Math.max(1, Math.floor(values.width)));
    const height = Math.min(limit, Math.max(1, Math.floor(values.height)));
    image.name = values.name.trim();
    image.width = width;
    image.height = height;
    image.card_slots = [...new Set(values.card_slots)]
      .filter((index) => Number.isInteger(index) && index >= 0 && index < width * height)
      .sort((left, right) => left - right);
    image.crop_zoom = Math.min(3, Math.max(1, values.crop_zoom));
    image.crop_x = Math.min(100, Math.max(-100, values.crop_x));
    image.crop_y = Math.min(100, Math.max(-100, values.crop_y));
    const placement = binder.image_placements.find((candidate) => candidate.image_id === image_id);
    if (placement) {
      placement.row = Math.min(placement.row, limit - image.height);
      placement.column = Math.min(placement.column, limit - image.width);
      for (let row = 0; row < image.height; row += 1) {
        for (let column = 0; column < image.width; column += 1) {
          if (image.card_slots.includes(row * image.width + column)) continue;
          const slot_index =
            placement.side_index * slots_per_page(binder.layout) +
            (placement.row + row) * limit +
            placement.column +
            column;
          binder.slots[slot_index] = null;
        }
      }
    }
    binder.updated_at = new Date().toISOString();
    persist();
  },

  remove_asset(folder_id: string, kind: 'proxy' | 'image', asset_id: string): void {
    const binder = this.get(folder_id);
    if (!binder || asset_touches_locked_page(binder, kind, asset_id)) return;
    if (kind === 'proxy') {
      binder.proxies = binder.proxies.filter((proxy) => proxy.id !== asset_id);
      binder.slots = binder.slots.map((slot) => (slot === `proxy:${asset_id}` ? null : slot));
    } else {
      binder.images = binder.images.filter((image) => image.id !== asset_id);
      binder.image_placements = binder.image_placements.filter(
        (placement) => placement.image_id !== asset_id,
      );
    }
    binder.updated_at = new Date().toISOString();
    persist();
  },

  place_image(
    folder_id: string,
    image_id: string,
    side_index: number,
    row: number,
    column: number,
  ): void {
    const binder = this.get(folder_id);
    const image = binder?.images.find((candidate) => candidate.id === image_id);
    if (!binder || !image || binder.locked_pages.includes(side_index)) return;
    const current_placement = binder.image_placements.find(
      (candidate) => candidate.image_id === image_id,
    );
    if (current_placement && binder.locked_pages.includes(current_placement.side_index)) return;
    const dimension = binder.layout === '2x2' ? 2 : 3;
    const placement: Binder_Image_Placement = {
      image_id: image_id,
      side_index: side_index,
      row: Math.min(Math.max(0, row), dimension - image.height),
      column: Math.min(Math.max(0, column), dimension - image.width),
    };
    const conflicts_with_card = Array.from(
      { length: image.width * image.height },
      (_, index) => index,
    ).some((index) => {
      if (image.card_slots.includes(index)) return false;
      const image_row = Math.floor(index / image.width);
      const image_column = index % image.width;
      const slot_index =
        side_index * slots_per_page(binder.layout) +
        (placement.row + image_row) * dimension +
        placement.column +
        image_column;
      return binder.slots[slot_index] !== null;
    });
    if (conflicts_with_card) return;
    binder.image_placements = [
      ...binder.image_placements.filter((candidate) => candidate.image_id !== image_id),
      placement,
    ];
    binder.updated_at = new Date().toISOString();
    persist();
  },

  remove_image_placement(folder_id: string, image_id: string): void {
    const binder = this.get(folder_id);
    const placement = binder?.image_placements.find((candidate) => candidate.image_id === image_id);
    if (!binder || (placement && binder.locked_pages.includes(placement.side_index))) return;
    binder.image_placements = binder.image_placements.filter(
      (placement) => placement.image_id !== image_id,
    );
    binder.updated_at = new Date().toISOString();
    persist();
  },

  apply_layout(
    folder_id: string,
    slots: Array<string | null>,
    image_placements: Binder_Image_Placement[],
  ): void {
    const binder = this.get(folder_id);
    if (!binder || slots.length !== binder.slots.length) return;
    const side_size = slots_per_page(binder.layout);
    const locked = new Set(binder.locked_pages);
    binder.slots = slots.map((slot, index) =>
      locked.has(Math.floor(index / side_size)) ? binder.slots[index] : slot,
    );
    binder.image_placements = [
      ...binder.image_placements.filter((placement) => locked.has(placement.side_index)),
      ...image_placements
        .filter((placement) => !locked.has(placement.side_index))
        .map((placement) => ({ ...placement })),
    ];
    binder.updated_at = new Date().toISOString();
    persist();
  },

  move_slot(folder_id: string, source_index: number, target_index: number): void {
    const binder = this.get(folder_id);
    if (
      !binder ||
      source_index === target_index ||
      source_index < 0 ||
      source_index >= binder.slots.length ||
      target_index < 0 ||
      target_index >= binder.slots.length ||
      page_for_slot(binder, source_index) === null ||
      page_for_slot(binder, target_index) === null
    )
      return;
    const source = binder.slots[source_index] ?? null;
    const target = binder.slots[target_index] ?? null;
    binder.slots[source_index] = target;
    binder.slots[target_index] = source;
    binder.updated_at = new Date().toISOString();
    persist();
  },

  clean(folder_id: string, valid_quantities: Map<string, number>): void {
    const binder = this.get(folder_id);
    if (!binder) return;
    const used = new Map<string, number>();
    const used_proxies = new Map<string, number>();
    let changed = false;
    const next_slots = binder.slots.map((entry_id, slot_index) => {
      if (!entry_id) return null;
      const locked = binder.locked_pages.includes(
        Math.floor(slot_index / slots_per_page(binder.layout)),
      );
      if (entry_id.startsWith('proxy:')) {
        const proxy_id = entry_id.slice(6);
        const proxy = binder.proxies.find((candidate) => candidate.id === proxy_id);
        const next_count = (used_proxies.get(proxy_id) ?? 0) + 1;
        used_proxies.set(proxy_id, next_count);
        if (locked) return entry_id;
        if (proxy && next_count <= proxy.quantity) return entry_id;
        changed = true;
        return null;
      }
      const next_count = (used.get(entry_id) ?? 0) + 1;
      used.set(entry_id, next_count);
      if (locked) return entry_id;
      if (next_count <= (valid_quantities.get(entry_id) ?? 0)) return entry_id;
      changed = true;
      return null;
    });
    if (changed) {
      binder.slots = next_slots;
      binder.updated_at = new Date().toISOString();
      persist();
    }
  },
};

export const binder_slots_per_page = slots_per_page;

export const binder_store = {
  ...binders_operations,
  create(
    ...args: Parameters<typeof binders_operations.create>
  ): ReturnType<typeof binders_operations.create> {
    return commit_result('binders/create', args);
  },
  remove(
    ...args: Parameters<typeof binders_operations.remove>
  ): ReturnType<typeof binders_operations.remove> {
    return commit_result('binders/remove', args);
  },
  set_page_locked(
    ...args: Parameters<typeof binders_operations.set_page_locked>
  ): ReturnType<typeof binders_operations.set_page_locked> {
    return commit_result('binders/set_page_locked', args);
  },
  reset_settings(
    ...args: Parameters<typeof binders_operations.reset_settings>
  ): ReturnType<typeof binders_operations.reset_settings> {
    return commit_result('binders/reset_settings', args);
  },
  set_slot(
    ...args: Parameters<typeof binders_operations.set_slot>
  ): ReturnType<typeof binders_operations.set_slot> {
    return commit_result('binders/set_slot', args);
  },
  create_proxy(
    ...args: Parameters<typeof binders_operations.create_proxy>
  ): ReturnType<typeof binders_operations.create_proxy> {
    return commit_result('binders/create_proxy', args);
  },
  create_image(
    ...args: Parameters<typeof binders_operations.create_image>
  ): ReturnType<typeof binders_operations.create_image> {
    return commit_result('binders/create_image', args);
  },
  update_proxy(
    ...args: Parameters<typeof binders_operations.update_proxy>
  ): ReturnType<typeof binders_operations.update_proxy> {
    return commit_result('binders/update_proxy', args);
  },
  update_image(
    ...args: Parameters<typeof binders_operations.update_image>
  ): ReturnType<typeof binders_operations.update_image> {
    return commit_result('binders/update_image', args);
  },
  remove_asset(
    ...args: Parameters<typeof binders_operations.remove_asset>
  ): ReturnType<typeof binders_operations.remove_asset> {
    return commit_result('binders/remove_asset', args);
  },
  place_image(
    ...args: Parameters<typeof binders_operations.place_image>
  ): ReturnType<typeof binders_operations.place_image> {
    return commit_result('binders/place_image', args);
  },
  remove_image_placement(
    ...args: Parameters<typeof binders_operations.remove_image_placement>
  ): ReturnType<typeof binders_operations.remove_image_placement> {
    return commit_result('binders/remove_image_placement', args);
  },
  apply_layout(
    ...args: Parameters<typeof binders_operations.apply_layout>
  ): ReturnType<typeof binders_operations.apply_layout> {
    return commit_result('binders/apply_layout', args);
  },
  move_slot(
    ...args: Parameters<typeof binders_operations.move_slot>
  ): ReturnType<typeof binders_operations.move_slot> {
    return commit_result('binders/move_slot', args);
  },
  clean(
    ...args: Parameters<typeof binders_operations.clean>
  ): ReturnType<typeof binders_operations.clean> {
    return commit_result('binders/clean', args);
  },
};
