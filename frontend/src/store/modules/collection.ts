// import hooks
import { computed } from 'vue';

// import utils
import { read_collection, apply_collection_operation } from '../../services/personal_data';
import { parse_collection_data } from '../../services/personal_validation';
import { manual_image_store } from './manual_images';
import { commit_result } from '../commit_result';
import {
  matching_pokedex_requirement_ids,
  copy_pokedex_binder_config,
  pokedex_candidates_by_target,
  pokedex_requirement_id,
  pokedex_targets,
  pokemon_id_from_requirement,
} from '../../utils/pokedex_binder';
import { store } from '../core';

// import types
import type { Pokedex_Binder_Config } from '../../utils/pokedex_binder';
import type { Mutation_Call } from '../../models/personal_state';
import type {
  Card_Condition,
  Collection_Folder_Type,
  Collection_Folder,
  Collection_Entry,
  Manual_Collection_Card,
  Collection_Data,
} from '../../models/collection';

export { card_conditions } from '../../models/collection';

export type {
  Card_Condition,
  Collection_Folder_Type,
  Collection_Folder,
  Collection_Entry,
  Manual_Collection_Card,
  Collection_Data,
} from '../../models/collection';

const legacy_main_folder_id = 'main';
const migrated_default_folder_id = 'default-collection';
const legacy_region_exclusive_requirements: Record<string, string> = {
  'pokedex:0862-galarian-obstagoon': 'pokedex:0862',
  'pokedex:0863-galarian-perrserker': 'pokedex:0863',
  'pokedex:0864-galarian-cursola': 'pokedex:0864',
  'pokedex:0865-galarian-sirfetch-d': 'pokedex:0865',
  'pokedex:0866-galarian-mr-rime': 'pokedex:0866',
  'pokedex:0867-galarian-runerigus': 'pokedex:0867',
  'pokedex:0902-hisuian-basculegion': 'pokedex:0902',
  'pokedex:0903-hisuian-sneasler': 'pokedex:0903',
  'pokedex:0904-hisuian-overqwil': 'pokedex:0904',
  'pokedex:0980-paldean-clodsire': 'pokedex:0980',
};

const default_data = (): Collection_Data => ({
  version: 2,
  folders: [],
  entries: [],
  manual_cards: [],
});

store.registerModule('collection', {
  namespaced: true,
  state: () => ({ data: default_data(), ready: false, error: null as string | null }),
  mutations: {
    set_ready(module_state, value: boolean) {
      module_state.ready = value;
    },
    set_error(module_state, value: string | null) {
      module_state.error = value;
    },
    apply_loaded(_state, parsed: Partial<Collection_Data>) {
      apply_loaded(parsed);
    },
    create_folder(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.create_folder>,
        ReturnType<typeof collection_operations.create_folder>
      >,
    ) {
      call.result = collection_operations.create_folder(...call.args);
    },
    create_pokedex_folder(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.create_pokedex_folder>,
        ReturnType<typeof collection_operations.create_pokedex_folder>
      >,
    ) {
      call.result = collection_operations.create_pokedex_folder(...call.args);
    },
    update_pokedex_config(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.update_pokedex_config>,
        ReturnType<typeof collection_operations.update_pokedex_config>
      >,
    ) {
      call.result = collection_operations.update_pokedex_config(...call.args);
    },
    rename_folder(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.rename_folder>,
        ReturnType<typeof collection_operations.rename_folder>
      >,
    ) {
      call.result = collection_operations.rename_folder(...call.args);
    },
    update_folder(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.update_folder>,
        ReturnType<typeof collection_operations.update_folder>
      >,
    ) {
      call.result = collection_operations.update_folder(...call.args);
    },
    delete_folder(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.delete_folder>,
        ReturnType<typeof collection_operations.delete_folder>
      >,
    ) {
      call.result = collection_operations.delete_folder(...call.args);
    },
    ensure_default_folder(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.ensure_default_folder>,
        ReturnType<typeof collection_operations.ensure_default_folder>
      >,
    ) {
      call.result = collection_operations.ensure_default_folder(...call.args);
    },
    add_cards(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.add_cards>,
        ReturnType<typeof collection_operations.add_cards>
      >,
    ) {
      call.result = collection_operations.add_cards(...call.args);
    },
    add_wanted(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.add_wanted>,
        ReturnType<typeof collection_operations.add_wanted>
      >,
    ) {
      call.result = collection_operations.add_wanted(...call.args);
    },
    add_wanted_entries(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.add_wanted_entries>,
        ReturnType<typeof collection_operations.add_wanted_entries>
      >,
    ) {
      call.result = collection_operations.add_wanted_entries(...call.args);
    },
    fulfill_wanted(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.fulfill_wanted>,
        ReturnType<typeof collection_operations.fulfill_wanted>
      >,
    ) {
      call.result = collection_operations.fulfill_wanted(...call.args);
    },
    create_manual_card(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.create_manual_card>,
        ReturnType<typeof collection_operations.create_manual_card>
      >,
    ) {
      call.result = collection_operations.create_manual_card(...call.args);
    },
    update_manual_card(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.update_manual_card>,
        ReturnType<typeof collection_operations.update_manual_card>
      >,
    ) {
      call.result = collection_operations.update_manual_card(...call.args);
    },
    set_quantity(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.set_quantity>,
        ReturnType<typeof collection_operations.set_quantity>
      >,
    ) {
      call.result = collection_operations.set_quantity(...call.args);
    },
    update_entry(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.update_entry>,
        ReturnType<typeof collection_operations.update_entry>
      >,
    ) {
      call.result = collection_operations.update_entry(...call.args);
    },
    transfer_entry(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.transfer_entry>,
        ReturnType<typeof collection_operations.transfer_entry>
      >,
    ) {
      call.result = collection_operations.transfer_entry(...call.args);
    },
    transfer_entry_quantities(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.transfer_entry_quantities>,
        ReturnType<typeof collection_operations.transfer_entry_quantities>
      >,
    ) {
      call.result = collection_operations.transfer_entry_quantities(...call.args);
    },
    transfer_entries(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.transfer_entries>,
        ReturnType<typeof collection_operations.transfer_entries>
      >,
    ) {
      call.result = collection_operations.transfer_entries(...call.args);
    },
    update_entries_language(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.update_entries_language>,
        ReturnType<typeof collection_operations.update_entries_language>
      >,
    ) {
      call.result = collection_operations.update_entries_language(...call.args);
    },
    remove_entry(
      _state,
      call: Mutation_Call<
        Parameters<typeof collection_operations.remove_entry>,
        ReturnType<typeof collection_operations.remove_entry>
      >,
    ) {
      call.result = collection_operations.remove_entry(...call.args);
    },
  },
  actions: {
    load({ commit }) {
      return load_file().catch((err) => {
        commit('set_ready', false);
        commit('set_error', err instanceof Error ? err.message : String(err));
        throw err;
      });
    },
    save() {
      queue_persist();
      return pending_save;
    },
  },
});
const persist = (): void => {
  void store.dispatch('collection/save');
};
const state = store.state.collection.data;
const is_ready = computed<boolean>({
  get: () => store.state.collection.ready,
  set: (value) => store.commit('collection/set_ready', value),
});
const save_error = computed<string | null>({
  get: () => store.state.collection.error,
  set: (value) => store.commit('collection/set_error', value),
});
let pending_save: Promise<void> = Promise.resolve();
let queued_snapshot: Collection_Data | null = null;
let pending_operation_count = 0;
let refresh_after_pending_operations = false;
const collection_channel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('card-manager-collection');
const owned_quantities = computed<Map<string, number>>(() => {
  const quantities = new Map<string, number>();
  for (const entry of state.entries) {
    if (entry.wanted) continue;
    const key = `${entry.set_id}:${entry.card_id}:${entry.variant_id}`;
    quantities.set(key, (quantities.get(key) ?? 0) + entry.quantity);
  }
  return quantities;
});
const wanted_keys = computed<Set<string>>(
  () =>
    new Set(
      state.entries
        .filter((entry) => entry.wanted)
        .map(
          (entry) =>
            `${entry.set_id}:${entry.card_id}:${entry.variant_id}:${entry.strong_language === true ? entry.language_id : '*'}`,
        ),
    ),
);
const pokedex_entry_statuses = computed<Map<string, string>>(() => {
  const statuses = new Map<string, string>();
  for (const folder of state.folders) {
    const config = folder.pokedex_config;
    if (!config) continue;
    const valid_entries: Collection_Entry[] = [];
    const assigned_quantities = new Map<string, number>();
    for (const entry of state.entries) {
      if (entry.folder_id !== folder.id || entry.wanted) continue;
      const requirement_id = entry.pokedex_requirement_id;
      const valid =
        Boolean(requirement_id) &&
        entry.set_id !== 'manual-collection' &&
        matching_pokedex_requirement_ids(
          config,
          entry.set_id,
          entry.card_id,
          entry.variant_id,
          entry.language_id,
        ).includes(requirement_id as string);
      if (!valid) {
        statuses.set(entry.id, 'This card no longer fits this binder');
        continue;
      }
      valid_entries.push(entry);
      assigned_quantities.set(
        requirement_id as string,
        (assigned_quantities.get(requirement_id as string) ?? 0) + entry.quantity,
      );
    }
    for (const entry of valid_entries) {
      if ((assigned_quantities.get(entry.pokedex_requirement_id as string) ?? 0) > 1) {
        statuses.set(entry.id, 'Duplicate in this binder');
      }
    }
  }
  return statuses;
});

const consume_matching_wanted = (
  folder_id: string,
  set_id: string,
  card_id: string,
  variant_id: string,
  language_id: string,
  quantity: number,
  now: string,
): void => {
  let remaining = quantity;
  const matching_wanted = state.entries
    .filter(
      (entry) =>
        entry.wanted &&
        !entry.pokedex_requirement_id &&
        entry.folder_id === folder_id &&
        entry.set_id === set_id &&
        entry.card_id === card_id &&
        entry.variant_id === variant_id &&
        (entry.strong_language !== true || entry.language_id === language_id),
    )
    .sort(
      (left, right) =>
        Number(right.strong_language === true) - Number(left.strong_language === true),
    );
  for (const wanted_entry of matching_wanted) {
    if (remaining <= 0) break;
    const fulfilled = Math.min(remaining, wanted_entry.quantity);
    remaining -= fulfilled;
    if (fulfilled === wanted_entry.quantity) {
      state.entries.splice(state.entries.indexOf(wanted_entry), 1);
    } else {
      wanted_entry.quantity -= fulfilled;
      wanted_entry.updated_at = now;
    }
  }
};

const normalize_data = (parsed: Partial<Collection_Data>): Collection_Data => {
  if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.entries)) {
    throw new Error('The selected file is not a valid Card Manager collection');
  }
  const folders = parsed.folders
    .filter((folder) => folder.id !== legacy_main_folder_id)
    .map((folder) => ({
      ...folder,
      type: folder.type === 'box' ? ('box' as const) : ('binder' as const),
    }));
  let default_folder = folders.find((folder) => folder.type === 'box') ?? folders[0];
  if (
    parsed.entries.some((entry) => entry.folder_id === legacy_main_folder_id) &&
    !default_folder
  ) {
    default_folder = {
      id: migrated_default_folder_id,
      name: 'Default collection',
      type: 'box',
      created_at: new Date().toISOString(),
    };
    folders.push(default_folder);
  }
  const entries = parsed.entries.map((entry) => ({
    ...entry,
    folder_id:
      entry.folder_id === legacy_main_folder_id
        ? (default_folder?.id ?? entry.folder_id)
        : entry.folder_id,
    language_id: entry.language_id || (entry.set_id.startsWith('asia-') ? 'ja' : 'en'),
    wanted: entry.wanted === true,
    strong_language: entry.wanted === true ? entry.strong_language === true : undefined,
  }));
  return {
    version: 2,
    folders,
    entries,
    manual_cards: Array.isArray(parsed.manual_cards) ? parsed.manual_cards : [],
  };
};

const reconcile_pokedex_folder = (folder_id: string): boolean => {
  const folder = state.folders.find((candidate) => candidate.id === folder_id);
  const config = folder?.pokedex_config;
  if (!config) return false;
  const candidates_by_target = pokedex_candidates_by_target(config);
  const now = new Date().toISOString();
  const targets = pokedex_targets(config);
  const target_ids = new Set(targets.map((target) => target.id));
  const folder_entries = state.entries.filter((entry) => entry.folder_id === folder_id);
  const owned_entries = folder_entries.filter((entry) => !entry.wanted);
  const wanted_by_requirement = new Map(
    folder_entries
      .filter((entry) => entry.wanted && entry.pokedex_requirement_id)
      .map((entry) => [entry.pokedex_requirement_id as string, entry]),
  );

  // Transfers and legacy entries can arrive without an assignment. Resolve the
  // unambiguous cases automatically; multi-Pokémon cards still require a choice.
  const fulfilled_requirements = new Set<string>();
  let migrated_legacy_requirement = false;
  for (const entry of owned_entries) {
    if (entry.set_id === 'manual-collection') continue;
    if (entry.pokedex_requirement_id) {
      const migrated_requirement =
        legacy_region_exclusive_requirements[entry.pokedex_requirement_id];
      if (migrated_requirement) {
        entry.pokedex_requirement_id = migrated_requirement;
        migrated_legacy_requirement = true;
      }
    }
    const requirement_ids = matching_pokedex_requirement_ids(
      config,
      entry.set_id,
      entry.card_id,
      entry.variant_id,
      entry.language_id,
    );
    if (!entry.pokedex_requirement_id && requirement_ids.length === 1)
      entry.pokedex_requirement_id = requirement_ids[0];
    if (entry.pokedex_requirement_id && requirement_ids.includes(entry.pokedex_requirement_id)) {
      fulfilled_requirements.add(entry.pokedex_requirement_id);
    }
  }

  for (const target of targets) {
    const requirement_id = pokedex_requirement_id(target.id);
    const existing_wanted = wanted_by_requirement.get(requirement_id);
    if (fulfilled_requirements.has(requirement_id)) {
      if (existing_wanted) state.entries.splice(state.entries.indexOf(existing_wanted), 1);
      wanted_by_requirement.delete(requirement_id);
      continue;
    }
    const candidates = candidates_by_target.get(target.id) ?? [];
    const candidate = candidates.length === 1 ? candidates[0] : null;
    const wanted_data = {
      set_id: candidate?.set_id ?? 'pokedex-requirement',
      card_id: candidate?.card_id ?? target.id,
      variant_id: candidate?.variant_id ?? (candidates.length ? 'multiple' : 'unavailable'),
      language_id: candidate?.language_id ?? '-',
      pokedex_candidate_count: candidates.length,
    };
    if (existing_wanted) {
      Object.assign(existing_wanted, wanted_data, { updated_at: now });
    } else {
      state.entries.push({
        id: new_id('pokedex-wanted'),
        folder_id: folder_id,
        ...wanted_data,
        condition: 'NM',
        quantity: 1,
        wanted: true,
        strong_language: true,
        pokedex_requirement_id: requirement_id,
        added_at: now,
        updated_at: now,
      });
    }
    wanted_by_requirement.delete(requirement_id);
  }

  for (const entry of wanted_by_requirement.values()) {
    if (!target_ids.has(pokemon_id_from_requirement(entry.pokedex_requirement_id as string))) {
      state.entries.splice(state.entries.indexOf(entry), 1);
    }
  }
  return migrated_legacy_requirement;
};

const reconcile_pokedex_folders = (...folder_ids: string[]): boolean => {
  let migrated_legacy_requirement = false;
  for (const folder_id of new Set(folder_ids.filter(Boolean))) {
    migrated_legacy_requirement =
      reconcile_pokedex_folder(folder_id) || migrated_legacy_requirement;
  }
  return migrated_legacy_requirement;
};

const replace_data = (data: Collection_Data): void => {
  state.version = 2;
  state.folders.splice(0, state.folders.length, ...data.folders);
  state.entries.splice(0, state.entries.length, ...data.entries);
  state.manual_cards.splice(0, state.manual_cards.length, ...data.manual_cards);
};

const snapshot = (): Collection_Data => JSON.parse(JSON.stringify(state)) as Collection_Data;

const changed_entities = <T extends { id: string }>(
  before: T[],
  after: T[],
): { before: T[]; after: T[] } => {
  const before_by_id = new Map(before.map((entity) => [entity.id, entity]));
  const after_by_id = new Map(after.map((entity) => [entity.id, entity]));
  const changed_ids = new Set<string>();
  for (const [id, entity] of before_by_id) {
    if (JSON.stringify(entity) !== JSON.stringify(after_by_id.get(id))) changed_ids.add(id);
  }
  for (const [id, entity] of after_by_id) {
    if (JSON.stringify(entity) !== JSON.stringify(before_by_id.get(id))) changed_ids.add(id);
  }
  return {
    before: before.filter((entity) => changed_ids.has(entity.id)),
    after: after.filter((entity) => changed_ids.has(entity.id)),
  };
};

const collection_delta = (
  before: Collection_Data,
  after: Collection_Data,
): {
  before: Collection_Data;
  after: Collection_Data;
} => {
  const folders = changed_entities(before.folders, after.folders);
  const entries = changed_entities(before.entries, after.entries);
  const manual_cards = changed_entities(before.manual_cards, after.manual_cards);
  return {
    before: {
      version: before.version,
      folders: folders.before,
      entries: entries.before,
      manual_cards: manual_cards.before,
    },
    after: {
      version: after.version,
      folders: folders.after,
      entries: entries.after,
      manual_cards: manual_cards.after,
    },
  };
};

function apply_loaded(parsed: Partial<Collection_Data>): void {
  const normalized = normalize_data(parsed);
  const needs_folder_migration =
    JSON.stringify(parsed.folders) !== JSON.stringify(normalized.folders) ||
    JSON.stringify(parsed.entries) !== JSON.stringify(normalized.entries);
  replace_data(normalized);
  const migrated_legacy_requirements = reconcile_pokedex_folders(
    ...normalized.folders.filter((folder) => folder.pokedex_config).map((folder) => folder.id),
  );
  queued_snapshot = snapshot();
  is_ready.value = true;
  save_error.value = null;

  if (needs_folder_migration || migrated_legacy_requirements) {
    const before_migration: Collection_Data = {
      ...normalized,
      folders: parsed.folders as Collection_Folder[],
      entries: parsed.entries as Collection_Entry[],
    };
    setTimeout(() => {
      void write_operation(before_migration, snapshot())
        .then(() => collection_channel?.postMessage('changed'))
        .catch((err) => {
          save_error.value = err instanceof Error ? err.message : String(err);
        });
    }, 0);
  }
}

const load_file = async (): Promise<void> => {
  const response = await read_collection();
  if (!response.ok) throw new Error(`Unable to load collection.json (${response.status})`);
  const parsed = parse_collection_data(await response.json());
  store.commit('collection/apply_loaded', parsed);
};

const load_promise = store.dispatch('collection/load').catch((err) => {
  save_error.value = err instanceof Error ? err.message : String(err);
});

const write_operation = async (before: Collection_Data, after: Collection_Data): Promise<void> => {
  await load_promise;
  const response = await apply_collection_operation(collection_delta(before, after));
  if (!response.ok) throw new Error(`Unable to save collection change (${response.status})`);
};

const queue_persist = (): void => {
  if (!is_ready.value || !queued_snapshot) return;
  const before = queued_snapshot;
  const after = snapshot();
  queued_snapshot = after;
  pending_operation_count += 1;
  pending_save = pending_save
    .then(() => write_operation(before, after))
    .then(() => {
      save_error.value = null;
      collection_channel?.postMessage('changed');
    })
    .catch((err) => {
      save_error.value = err instanceof Error ? err.message : String(err);
    })
    .finally(() => {
      pending_operation_count -= 1;
      if (pending_operation_count === 0 && refresh_after_pending_operations) {
        refresh_after_pending_operations = false;
        void store.dispatch('collection/load').catch(() => undefined);
      }
    });
};

collection_channel?.addEventListener('message', () => {
  if (pending_operation_count > 0) {
    refresh_after_pending_operations = true;
    return;
  }
  void store.dispatch('collection/load').catch(() => undefined);
});

const new_id = (prefix: string): string => {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

const collection_operations = {
  folders: computed<Collection_Folder[]>(() => state.folders),
  entries: computed<Collection_Entry[]>(() => state.entries),
  manual_cards: computed<Manual_Collection_Card[]>(() => state.manual_cards),
  is_file_connected: computed<boolean>(() => is_ready.value),
  file_name: computed<string>(() => 'collection.json'),
  save_error: computed<string | null>(() => save_error.value),

  owned_quantity(set_id: string, card_id: string, variant_id: string): number {
    return owned_quantities.value.get(`${set_id}:${card_id}:${variant_id}`) ?? 0;
  },

  is_wanted(set_id: string, card_id: string, variant_id: string, language_id: string): boolean {
    return (
      wanted_keys.value.has(`${set_id}:${card_id}:${variant_id}:${language_id}`) ||
      wanted_keys.value.has(`${set_id}:${card_id}:${variant_id}:*`)
    );
  },

  is_protected_pokedex_wanted(entry_id: string): boolean {
    const entry = state.entries.find((candidate) => candidate.id === entry_id);
    return Boolean(entry?.wanted && entry.pokedex_requirement_id);
  },

  pokedex_entry_status(entry_id: string): string | null {
    return pokedex_entry_statuses.value.get(entry_id) ?? null;
  },

  create_folder(name: string, type: Collection_Folder_Type): Collection_Folder {
    const folder: Collection_Folder = {
      id: new_id('folder'),
      name: name.trim(),
      type,
      created_at: new Date().toISOString(),
    };
    if (!folder.name) throw new Error('Folder name is required');
    state.folders.push(folder);
    persist();
    return folder;
  },

  create_pokedex_folder(name: string, config: Pokedex_Binder_Config): Collection_Folder {
    const folder = this.create_folder(name, 'binder');
    folder.pokedex_config = copy_pokedex_binder_config(config);
    reconcile_pokedex_folder(folder.id);
    persist();
    return folder;
  },

  update_pokedex_config(folder_id: string, config: Pokedex_Binder_Config): void {
    const folder = state.folders.find(
      (candidate) => candidate.id === folder_id && candidate.type === 'binder',
    );
    if (!folder?.pokedex_config) return;
    folder.pokedex_config = copy_pokedex_binder_config(config);
    reconcile_pokedex_folder(folder_id);
    persist();
  },

  matching_pokedex_requirements(input: {
    folder_id: string;
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
  }): Array<{ label: string; value: string }> {
    const folder = state.folders.find((candidate) => candidate.id === input.folder_id);
    if (!folder?.pokedex_config || input.set_id === 'manual-collection') return [];
    const targets = new Map(
      pokedex_targets(folder.pokedex_config).map((target) => [
        pokedex_requirement_id(target.id),
        target,
      ]),
    );
    return matching_pokedex_requirement_ids(
      folder.pokedex_config,
      input.set_id,
      input.card_id,
      input.variant_id,
      input.language_id,
    ).flatMap((requirement_id) => {
      const target = targets.get(requirement_id);
      return target ? [{ label: target.name, value: requirement_id }] : [];
    });
  },

  rename_folder(folder_id: string, name: string): void {
    const folder = state.folders.find((candidate) => candidate.id === folder_id);
    if (!folder || !name.trim()) return;
    folder.name = name.trim();
    persist();
  },

  update_folder(folder_id: string, name: string, type: Collection_Folder_Type): void {
    const folder = state.folders.find((candidate) => candidate.id === folder_id);
    if (!folder || !name.trim()) return;
    folder.name = name.trim();
    folder.type = type;
    if (type === 'box' && folder.pokedex_config) {
      folder.pokedex_config = undefined;
      for (const entry of [...state.entries]) {
        if (entry.folder_id !== folder_id) continue;
        if (entry.wanted && entry.pokedex_requirement_id)
          state.entries.splice(state.entries.indexOf(entry), 1);
        else entry.pokedex_requirement_id = undefined;
      }
    }
    persist();
  },

  delete_folder(folder_id: string): void {
    const folder_index = state.folders.findIndex((folder) => folder.id === folder_id);
    if (folder_index === -1) return;
    const remaining_entries = state.entries.filter(
      (candidate) => candidate.folder_id === folder_id,
    );
    if (remaining_entries.some((entry) => !entry.wanted || !entry.pokedex_requirement_id)) return;
    for (const entry of remaining_entries) state.entries.splice(state.entries.indexOf(entry), 1);
    state.folders.splice(folder_index, 1);
    persist();
  },

  ensure_default_folder(): Collection_Folder {
    const existing = state.folders[0];
    if (existing) return existing;
    const folder: Collection_Folder = {
      id: new_id('folder'),
      name: 'Default collection',
      type: 'box',
      created_at: new Date().toISOString(),
    };
    state.folders.push(folder);
    persist();
    return folder;
  },

  add_cards(input: {
    folder_id: string;
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
    condition: Card_Condition;
    quantity: number;
    pokedex_requirement_id?: string;
  }): void {
    const quantity = Math.max(1, Math.floor(input.quantity));
    const now = new Date().toISOString();
    const is_pokedex_folder = Boolean(
      state.folders.find((folder) => folder.id === input.folder_id)?.pokedex_config,
    );
    const existing = state.entries.find(
      (entry) =>
        !is_pokedex_folder &&
        entry.folder_id === input.folder_id &&
        entry.set_id === input.set_id &&
        entry.card_id === input.card_id &&
        entry.variant_id === input.variant_id &&
        entry.language_id === input.language_id &&
        entry.condition === input.condition &&
        !entry.wanted,
    );
    if (existing) {
      existing.quantity += quantity;
      existing.updated_at = now;
    } else {
      state.entries.push({
        id: new_id('entry'),
        ...input,
        quantity,
        wanted: false,
        added_at: now,
        updated_at: now,
      });
    }
    consume_matching_wanted(
      input.folder_id,
      input.set_id,
      input.card_id,
      input.variant_id,
      input.language_id,
      quantity,
      now,
    );
    if (input.pokedex_requirement_id) {
      const owned = state.entries.find(
        (entry) =>
          entry.folder_id === input.folder_id &&
          !entry.wanted &&
          entry.set_id === input.set_id &&
          entry.card_id === input.card_id &&
          entry.variant_id === input.variant_id &&
          entry.language_id === input.language_id &&
          entry.condition === input.condition,
      );
      if (owned) owned.pokedex_requirement_id = input.pokedex_requirement_id;
    }
    reconcile_pokedex_folder(input.folder_id);
    persist();
  },

  add_wanted(input: {
    folder_id: string;
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
    quantity: number;
    strong_language?: boolean;
  }): void {
    if (!state.folders.some((folder) => folder.id === input.folder_id)) return;
    const quantity = Math.max(1, Math.floor(input.quantity));
    const existing = state.entries.find(
      (entry) =>
        entry.wanted &&
        entry.folder_id === input.folder_id &&
        entry.set_id === input.set_id &&
        entry.card_id === input.card_id &&
        entry.variant_id === input.variant_id &&
        entry.language_id === input.language_id &&
        entry.strong_language === (input.strong_language === true),
    );
    if (existing) {
      existing.quantity += quantity;
      existing.updated_at = new Date().toISOString();
      persist();
      return;
    }
    const now = new Date().toISOString();
    state.entries.push({
      id: new_id('wanted'),
      ...input,
      condition: 'NM',
      quantity,
      wanted: true,
      strong_language: input.strong_language === true,
      added_at: now,
      updated_at: now,
    });
    persist();
  },

  add_wanted_entries(
    inputs: Array<{
      folder_id: string;
      set_id: string;
      card_id: string;
      variant_id: string;
      language_id: string;
      quantity: number;
      strong_language?: boolean;
    }>,
  ): number {
    const now = new Date().toISOString();
    let added = 0;
    for (const input of inputs) {
      if (!state.folders.some((folder) => folder.id === input.folder_id)) continue;
      const quantity = Math.max(1, Math.floor(input.quantity));
      const strong_language = input.strong_language === true;
      const existing = state.entries.find(
        (entry) =>
          entry.wanted &&
          entry.folder_id === input.folder_id &&
          entry.set_id === input.set_id &&
          entry.card_id === input.card_id &&
          entry.variant_id === input.variant_id &&
          entry.language_id === input.language_id &&
          entry.strong_language === strong_language,
      );
      if (existing) {
        existing.quantity += quantity;
        existing.updated_at = now;
      } else {
        state.entries.push({
          id: new_id('wanted'),
          ...input,
          condition: 'NM',
          quantity,
          wanted: true,
          strong_language: strong_language,
          added_at: now,
          updated_at: now,
        });
      }
      added += 1;
    }
    if (added > 0) persist();
    return added;
  },

  fulfill_wanted(entry_id: string, condition: Card_Condition): Collection_Entry | null {
    const wanted_entry = state.entries.find((entry) => entry.id === entry_id && entry.wanted);
    if (!wanted_entry) return null;
    const now = new Date().toISOString();
    let owned_entry = state.entries.find(
      (entry) =>
        !entry.wanted &&
        entry.folder_id === wanted_entry.folder_id &&
        entry.set_id === wanted_entry.set_id &&
        entry.card_id === wanted_entry.card_id &&
        entry.variant_id === wanted_entry.variant_id &&
        entry.language_id === wanted_entry.language_id &&
        entry.condition === condition,
    );
    if (owned_entry) {
      owned_entry.quantity += 1;
      owned_entry.updated_at = now;
    } else {
      owned_entry = {
        ...wanted_entry,
        id: new_id('entry'),
        condition,
        quantity: 1,
        wanted: false,
        strong_language: undefined,
        added_at: now,
        updated_at: now,
      };
      state.entries.push(owned_entry);
    }

    if (wanted_entry.quantity > 1) {
      wanted_entry.quantity -= 1;
      wanted_entry.updated_at = now;
    } else {
      state.entries.splice(state.entries.indexOf(wanted_entry), 1);
    }
    persist();
    return owned_entry;
  },

  create_manual_card(input: {
    folder_id: string;
    name: string;
    set_name: string;
    number: string;
    language_id: string;
    variant_id: string;
    condition: Card_Condition;
    quantity: number;
    category: string;
    rarity: string;
    pokemon_name: string;
    hp: number | null;
    types: string[];
    illustrator: string;
    notes: string;
    estimated_value: number | null;
    release_date: string | null;
  }): { card: Manual_Collection_Card; entry: Collection_Entry } {
    if (!input.name.trim()) throw new Error('Card name is required');
    if (!state.folders.some((folder) => folder.id === input.folder_id))
      throw new Error('Collection folder does not exist');
    const now = new Date().toISOString();
    const card: Manual_Collection_Card = {
      id: new_id('manual-card'),
      name: input.name.trim(),
      set_name: input.set_name.trim(),
      number: input.number.trim(),
      category: input.category || 'pokemon',
      rarity: input.rarity.trim() || 'unknown',
      pokemon_name: input.pokemon_name.trim(),
      hp: input.hp && input.hp > 0 ? Math.floor(input.hp) : null,
      types: input.types.map((type) => type.trim()).filter(Boolean),
      illustrator: input.illustrator.trim(),
      notes: input.notes.trim(),
      estimated_value:
        input.estimated_value !== null && input.estimated_value >= 0 ? input.estimated_value : null,
      release_date: input.release_date || null,
      created_at: now,
      updated_at: now,
    };
    const entry: Collection_Entry = {
      id: new_id('entry'),
      folder_id: input.folder_id,
      set_id: 'manual-collection',
      card_id: card.id,
      variant_id: input.variant_id.trim() || 'normal',
      language_id: input.language_id,
      condition: input.condition,
      quantity: Math.max(1, Math.floor(input.quantity)),
      wanted: false,
      added_at: now,
      updated_at: now,
    };
    state.manual_cards.push(card);
    state.entries.push(entry);
    persist();
    return { card, entry };
  },

  update_manual_card(
    card_id: string,
    input: {
      name: string;
      set_name: string;
      number: string;
      category: string;
      rarity: string;
      pokemon_name: string;
      hp: number | null;
      types: string[];
      illustrator: string;
      notes: string;
      estimated_value: number | null;
      release_date: string | null;
    },
  ): void {
    const card = state.manual_cards.find((candidate) => candidate.id === card_id);
    if (!card || !input.name.trim()) return;
    Object.assign(card, {
      name: input.name.trim(),
      set_name: input.set_name.trim(),
      number: input.number.trim(),
      category: input.category || 'pokemon',
      rarity: input.rarity.trim() || 'unknown',
      pokemon_name: input.pokemon_name.trim(),
      hp: input.hp && input.hp > 0 ? Math.floor(input.hp) : null,
      types: input.types.map((type) => type.trim()).filter(Boolean),
      illustrator: input.illustrator.trim(),
      notes: input.notes.trim(),
      estimated_value:
        input.estimated_value !== null && input.estimated_value >= 0 ? input.estimated_value : null,
      release_date: input.release_date || null,
      updated_at: new Date().toISOString(),
    });
    persist();
  },

  set_quantity(entry_id: string, quantity: number): void {
    const entry = state.entries.find((candidate) => candidate.id === entry_id);
    if (!entry) return;
    if (quantity <= 0) {
      this.remove_entry(entry_id);
      return;
    }
    entry.quantity = Math.max(1, Math.floor(quantity));
    entry.updated_at = new Date().toISOString();
    persist();
  },

  update_entry(
    entry_id: string,
    input: {
      folder_id: string;
      language_id: string;
      condition: Card_Condition;
      quantity: number;
      strong_language?: boolean;
      variant_id?: string;
    },
  ): void {
    const entry = state.entries.find((candidate) => candidate.id === entry_id);
    const previous_folder_id = entry?.folder_id ?? '';
    const quantity = Math.max(1, Math.floor(input.quantity));
    if (
      !entry ||
      !state.folders.some((folder) => folder.id === input.folder_id) ||
      !input.language_id
    )
      return;

    if (entry.set_id === 'manual-collection' && input.variant_id !== undefined) {
      entry.variant_id = input.variant_id.trim() || 'normal';
    }

    const matching = state.entries.find(
      (candidate) =>
        candidate.id !== entry.id &&
        candidate.folder_id === input.folder_id &&
        candidate.set_id === entry.set_id &&
        candidate.card_id === entry.card_id &&
        candidate.variant_id === entry.variant_id &&
        candidate.language_id === input.language_id &&
        candidate.condition === input.condition &&
        candidate.wanted === entry.wanted &&
        (!entry.wanted || candidate.strong_language === (input.strong_language === true)),
    );
    if (matching) {
      matching.quantity += quantity;
      matching.updated_at = new Date().toISOString();
      state.entries.splice(state.entries.indexOf(entry), 1);
    } else {
      entry.folder_id = input.folder_id;
      if (previous_folder_id !== input.folder_id) entry.pokedex_requirement_id = undefined;
      entry.language_id = input.language_id;
      entry.condition = input.condition;
      entry.quantity = quantity;
      if (entry.wanted) entry.strong_language = input.strong_language === true;
      entry.updated_at = new Date().toISOString();
    }
    if (!entry.wanted) {
      consume_matching_wanted(
        input.folder_id,
        entry.set_id,
        entry.card_id,
        entry.variant_id,
        input.language_id,
        quantity,
        new Date().toISOString(),
      );
    }
    reconcile_pokedex_folders(previous_folder_id, input.folder_id);
    persist();
  },

  transfer_entry(entry_id: string, folder_id: string): void {
    this.transfer_entries([entry_id], folder_id);
  },

  transfer_entry_quantities(
    transfers: Array<{ entry_id: string; quantity: number; pokedex_requirement_id?: string }>,
    folder_id: string,
  ): number {
    const destination_folder = state.folders.find((folder) => folder.id === folder_id);
    if (!destination_folder) return 0;
    const is_pokedex_folder = Boolean(destination_folder.pokedex_config);

    const now = new Date().toISOString();
    let transferred = 0;
    const folders_to_reconcile = new Set<string>([folder_id]);
    for (const transfer of transfers) {
      const entry = state.entries.find(
        (candidate) => candidate.id === transfer.entry_id && candidate.folder_id !== folder_id,
      );
      if (!entry) continue;
      const previous_folder_id = entry.folder_id;
      folders_to_reconcile.add(previous_folder_id);
      const automatic_requirements =
        !entry.wanted && destination_folder.pokedex_config && entry.set_id !== 'manual-collection'
          ? matching_pokedex_requirement_ids(
              destination_folder.pokedex_config,
              entry.set_id,
              entry.card_id,
              entry.variant_id,
              entry.language_id,
            )
          : [];
      const pokedex_requirement_id =
        transfer.pokedex_requirement_id ??
        (automatic_requirements.length === 1 ? automatic_requirements[0] : undefined);

      const quantity = Math.min(entry.quantity, Math.max(1, Math.floor(transfer.quantity)));
      const matching = state.entries.find(
        (candidate) =>
          !is_pokedex_folder &&
          candidate.id !== entry.id &&
          candidate.folder_id === folder_id &&
          candidate.set_id === entry.set_id &&
          candidate.card_id === entry.card_id &&
          candidate.variant_id === entry.variant_id &&
          candidate.language_id === entry.language_id &&
          candidate.condition === entry.condition &&
          candidate.wanted === entry.wanted &&
          (!entry.wanted || candidate.strong_language === entry.strong_language),
      );

      if (quantity === entry.quantity) {
        if (matching) {
          matching.quantity += quantity;
          matching.updated_at = now;
          state.entries.splice(state.entries.indexOf(entry), 1);
        } else {
          entry.folder_id = folder_id;
          entry.pokedex_requirement_id = pokedex_requirement_id;
          entry.updated_at = now;
        }
      } else {
        entry.quantity -= quantity;
        entry.updated_at = now;
        if (matching) {
          matching.quantity += quantity;
          matching.updated_at = now;
        } else {
          state.entries.push({
            ...entry,
            id: new_id('entry'),
            folder_id: folder_id,
            pokedex_requirement_id: pokedex_requirement_id,
            quantity,
            added_at: now,
            updated_at: now,
          });
        }
      }
      if (!entry.wanted && !is_pokedex_folder) {
        consume_matching_wanted(
          folder_id,
          entry.set_id,
          entry.card_id,
          entry.variant_id,
          entry.language_id,
          quantity,
          now,
        );
      }
      transferred += quantity;
    }

    if (transferred > 0) {
      reconcile_pokedex_folders(...folders_to_reconcile);
      persist();
    }
    return transferred;
  },

  transfer_entries(entry_ids: string[], folder_id: string): number {
    const transfers = state.entries
      .filter((entry) => entry_ids.includes(entry.id) && entry.folder_id !== folder_id)
      .map((entry) => ({ entry_id: entry.id, quantity: entry.quantity }));
    this.transfer_entry_quantities(transfers, folder_id);
    return transfers.length;
  },

  update_entries_language(entry_ids: string[], language_id: string): number {
    if (!language_id) return 0;
    const requested_ids = new Set(entry_ids);
    const entries = state.entries.filter((entry) => requested_ids.has(entry.id));
    if (entries.length === 0) return 0;

    const now = new Date().toISOString();
    for (const entry of entries) {
      // A previous merge in this batch may already have removed this entry.
      if (!state.entries.includes(entry)) continue;
      const matching = state.entries.find(
        (candidate) =>
          candidate.id !== entry.id &&
          candidate.folder_id === entry.folder_id &&
          candidate.set_id === entry.set_id &&
          candidate.card_id === entry.card_id &&
          candidate.variant_id === entry.variant_id &&
          candidate.language_id === language_id &&
          candidate.condition === entry.condition &&
          candidate.wanted === entry.wanted,
      );

      if (matching) {
        matching.quantity += entry.quantity;
        matching.updated_at = now;
        state.entries.splice(state.entries.indexOf(entry), 1);
      } else {
        entry.language_id = language_id;
        entry.updated_at = now;
      }
    }
    persist();
    return entries.length;
  },

  remove_entry(entry_id: string): void {
    const index = state.entries.findIndex((entry) => entry.id === entry_id);
    if (index === -1) return;
    if (state.entries[index].wanted && state.entries[index].pokedex_requirement_id) return;
    const [entry] = state.entries.splice(index, 1);
    if (
      entry.set_id === 'manual-collection' &&
      !state.entries.some(
        (candidate) =>
          candidate.set_id === 'manual-collection' && candidate.card_id === entry.card_id,
      )
    ) {
      const card_index = state.manual_cards.findIndex((card) => card.id === entry.card_id);
      if (card_index !== -1) state.manual_cards.splice(card_index, 1);
      for (const image of [...manual_image_store.entries.value].filter(
        (candidate) =>
          candidate.set_id === 'manual-collection' && candidate.card_id === entry.card_id,
      )) {
        void manual_image_store.remove(
          image.set_id,
          image.card_id,
          image.variant_id,
          image.language_id,
        );
      }
    }
    reconcile_pokedex_folder(entry.folder_id);
    persist();
  },
};

export const collection_store = {
  ...collection_operations,
  create_folder(
    ...args: Parameters<typeof collection_operations.create_folder>
  ): ReturnType<typeof collection_operations.create_folder> {
    return commit_result('collection/create_folder', args);
  },
  create_pokedex_folder(
    ...args: Parameters<typeof collection_operations.create_pokedex_folder>
  ): ReturnType<typeof collection_operations.create_pokedex_folder> {
    return commit_result('collection/create_pokedex_folder', args);
  },
  update_pokedex_config(
    ...args: Parameters<typeof collection_operations.update_pokedex_config>
  ): ReturnType<typeof collection_operations.update_pokedex_config> {
    return commit_result('collection/update_pokedex_config', args);
  },
  rename_folder(
    ...args: Parameters<typeof collection_operations.rename_folder>
  ): ReturnType<typeof collection_operations.rename_folder> {
    return commit_result('collection/rename_folder', args);
  },
  update_folder(
    ...args: Parameters<typeof collection_operations.update_folder>
  ): ReturnType<typeof collection_operations.update_folder> {
    return commit_result('collection/update_folder', args);
  },
  delete_folder(
    ...args: Parameters<typeof collection_operations.delete_folder>
  ): ReturnType<typeof collection_operations.delete_folder> {
    return commit_result('collection/delete_folder', args);
  },
  ensure_default_folder(
    ...args: Parameters<typeof collection_operations.ensure_default_folder>
  ): ReturnType<typeof collection_operations.ensure_default_folder> {
    return commit_result('collection/ensure_default_folder', args);
  },
  add_cards(
    ...args: Parameters<typeof collection_operations.add_cards>
  ): ReturnType<typeof collection_operations.add_cards> {
    return commit_result('collection/add_cards', args);
  },
  add_wanted(
    ...args: Parameters<typeof collection_operations.add_wanted>
  ): ReturnType<typeof collection_operations.add_wanted> {
    return commit_result('collection/add_wanted', args);
  },
  add_wanted_entries(
    ...args: Parameters<typeof collection_operations.add_wanted_entries>
  ): ReturnType<typeof collection_operations.add_wanted_entries> {
    return commit_result('collection/add_wanted_entries', args);
  },
  fulfill_wanted(
    ...args: Parameters<typeof collection_operations.fulfill_wanted>
  ): ReturnType<typeof collection_operations.fulfill_wanted> {
    return commit_result('collection/fulfill_wanted', args);
  },
  create_manual_card(
    ...args: Parameters<typeof collection_operations.create_manual_card>
  ): ReturnType<typeof collection_operations.create_manual_card> {
    return commit_result('collection/create_manual_card', args);
  },
  update_manual_card(
    ...args: Parameters<typeof collection_operations.update_manual_card>
  ): ReturnType<typeof collection_operations.update_manual_card> {
    return commit_result('collection/update_manual_card', args);
  },
  set_quantity(
    ...args: Parameters<typeof collection_operations.set_quantity>
  ): ReturnType<typeof collection_operations.set_quantity> {
    return commit_result('collection/set_quantity', args);
  },
  update_entry(
    ...args: Parameters<typeof collection_operations.update_entry>
  ): ReturnType<typeof collection_operations.update_entry> {
    return commit_result('collection/update_entry', args);
  },
  transfer_entry(
    ...args: Parameters<typeof collection_operations.transfer_entry>
  ): ReturnType<typeof collection_operations.transfer_entry> {
    return commit_result('collection/transfer_entry', args);
  },
  transfer_entry_quantities(
    ...args: Parameters<typeof collection_operations.transfer_entry_quantities>
  ): ReturnType<typeof collection_operations.transfer_entry_quantities> {
    return commit_result('collection/transfer_entry_quantities', args);
  },
  transfer_entries(
    ...args: Parameters<typeof collection_operations.transfer_entries>
  ): ReturnType<typeof collection_operations.transfer_entries> {
    return commit_result('collection/transfer_entries', args);
  },
  update_entries_language(
    ...args: Parameters<typeof collection_operations.update_entries_language>
  ): ReturnType<typeof collection_operations.update_entries_language> {
    return commit_result('collection/update_entries_language', args);
  },
  remove_entry(
    ...args: Parameters<typeof collection_operations.remove_entry>
  ): ReturnType<typeof collection_operations.remove_entry> {
    return commit_result('collection/remove_entry', args);
  },
};
