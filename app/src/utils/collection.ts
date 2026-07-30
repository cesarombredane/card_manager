import { computed, reactive, ref } from 'vue';
import { manualImageStore } from './manualImages';

export const cardConditions = [
  { label: 'MT — Mint', value: 'MT' },
  { label: 'NM — Near Mint', value: 'NM' },
  { label: 'EX — Excellent', value: 'EX' },
  { label: 'GD — Good', value: 'GD' },
  { label: 'LP — Light Played', value: 'LP' },
  { label: 'PL — Played', value: 'PL' },
  { label: 'HP — Heavily Played', value: 'HP' }
] as const;

export type CardCondition = typeof cardConditions[number]['value'];

export type CollectionFolderType = 'box' | 'binder';

export type CollectionFolder = {
  id: string;
  name: string;
  type: CollectionFolderType;
  created_at: string;
};

export type CollectionEntry = {
  id: string;
  folder_id: string;
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
  condition: CardCondition;
  quantity: number;
  wanted: boolean;
  added_at: string;
  updated_at: string;
};

export type ManualCollectionCard = {
  id: string;
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
  created_at: string;
  updated_at: string;
};

type CollectionData = {
  version: 2;
  folders: CollectionFolder[];
  entries: CollectionEntry[];
  manual_cards: ManualCollectionCard[];
};

const legacyMainFolderId = 'main';
const migratedDefaultFolderId = 'default-collection';

const defaultData = (): CollectionData => ({
  version: 2,
  folders: [],
  entries: [],
  manual_cards: []
});

const state = reactive<CollectionData>(defaultData());
const isReady = ref(false);
const saveError = ref<string | null>(null);
let pendingSave: Promise<void> = Promise.resolve();
let queuedSnapshot: CollectionData | null = null;
let pendingOperationCount = 0;
let refreshAfterPendingOperations = false;
const collectionChannel = typeof BroadcastChannel === 'undefined'
  ? null
  : new BroadcastChannel('card-manager-collection');
const ownedQuantities = computed(() => {
  const quantities = new Map<string, number>();
  for (const entry of state.entries) {
    if (entry.wanted) continue;
    const key = `${entry.set_id}:${entry.card_id}:${entry.variant_id}`;
    quantities.set(key, (quantities.get(key) ?? 0) + entry.quantity);
  }
  return quantities;
});
const wantedKeys = computed(() => new Set(
  state.entries
    .filter((entry) => entry.wanted)
    .map((entry) => `${entry.set_id}:${entry.card_id}:${entry.variant_id}:${entry.language_id}`)
));

const normalizeData = (parsed: Partial<CollectionData>): CollectionData => {
  if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.entries)) {
    throw new Error('The selected file is not a valid Card Manager collection');
  }
  const folders = parsed.folders
    .filter((folder) => folder.id !== legacyMainFolderId)
    .map((folder) => ({
    ...folder,
    type: folder.type === 'box' ? 'box' as const : 'binder' as const
  }));
  let defaultFolder = folders.find((folder) => folder.type === 'box') ?? folders[0];
  if (parsed.entries.some((entry) => entry.folder_id === legacyMainFolderId) && !defaultFolder) {
    defaultFolder = {
      id: migratedDefaultFolderId,
      name: 'Default collection',
      type: 'box',
      created_at: new Date().toISOString()
    };
    folders.push(defaultFolder);
  }
  const entries = parsed.entries.map((entry) => ({
    ...entry,
    folder_id: entry.folder_id === legacyMainFolderId ? defaultFolder?.id ?? entry.folder_id : entry.folder_id,
    language_id: entry.language_id || (entry.set_id.startsWith('asia-') ? 'ja' : 'en'),
    wanted: entry.wanted === true
  }));
  return {
    version: 2,
    folders,
    entries,
    manual_cards: Array.isArray(parsed.manual_cards) ? parsed.manual_cards : []
  };
};

const replaceData = (data: CollectionData): void => {
  state.version = 2;
  state.folders.splice(0, state.folders.length, ...data.folders);
  state.entries.splice(0, state.entries.length, ...data.entries);
  state.manual_cards.splice(0, state.manual_cards.length, ...data.manual_cards);
};

const snapshot = (): CollectionData => JSON.parse(JSON.stringify(state)) as CollectionData;

const changedEntities = <T extends { id: string }>(before: T[], after: T[]): { before: T[]; after: T[] } => {
  const beforeById = new Map(before.map((entity) => [entity.id, entity]));
  const afterById = new Map(after.map((entity) => [entity.id, entity]));
  const changedIds = new Set<string>();
  for (const [id, entity] of beforeById) {
    if (JSON.stringify(entity) !== JSON.stringify(afterById.get(id))) changedIds.add(id);
  }
  for (const [id, entity] of afterById) {
    if (JSON.stringify(entity) !== JSON.stringify(beforeById.get(id))) changedIds.add(id);
  }
  return {
    before: before.filter((entity) => changedIds.has(entity.id)),
    after: after.filter((entity) => changedIds.has(entity.id))
  };
};

const collectionDelta = (before: CollectionData, after: CollectionData): {
  before: CollectionData;
  after: CollectionData;
} => {
  const folders = changedEntities(before.folders, after.folders);
  const entries = changedEntities(before.entries, after.entries);
  const manualCards = changedEntities(before.manual_cards, after.manual_cards);
  return {
    before: {
      version: before.version,
      folders: folders.before,
      entries: entries.before,
      manual_cards: manualCards.before
    },
    after: {
      version: after.version,
      folders: folders.after,
      entries: entries.after,
      manual_cards: manualCards.after
    }
  };
};

const loadFile = async (): Promise<void> => {
  const response = await fetch('/api/collection');
  if (!response.ok) throw new Error(`Unable to load collection.json (${response.status})`);
  const parsed = await response.json() as Partial<CollectionData>;
  const normalized = normalizeData(parsed);
  const needsFolderMigration = JSON.stringify(parsed.folders) !== JSON.stringify(normalized.folders)
    || JSON.stringify(parsed.entries) !== JSON.stringify(normalized.entries);
  replaceData(normalized);
  queuedSnapshot = snapshot();
  isReady.value = true;
  saveError.value = null;

  if (needsFolderMigration) {
    const beforeMigration: CollectionData = {
      ...normalized,
      folders: parsed.folders as CollectionFolder[],
      entries: parsed.entries as CollectionEntry[]
    };
    setTimeout(() => {
      void writeOperation(beforeMigration, normalized)
        .then(() => collectionChannel?.postMessage('changed'))
        .catch((error: unknown) => {
          saveError.value = error instanceof Error ? error.message : String(error);
        });
    }, 0);
  }
};

const loadPromise = loadFile().catch((error: unknown) => {
  saveError.value = error instanceof Error ? error.message : String(error);
});

const writeOperation = async (before: CollectionData, after: CollectionData): Promise<void> => {
  await loadPromise;
  const response = await fetch('/api/collection/operations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(collectionDelta(before, after))
  });
  if (!response.ok) throw new Error(`Unable to save collection change (${response.status})`);
};

const persist = (): void => {
  if (!isReady.value || !queuedSnapshot) return;
  const before = queuedSnapshot;
  const after = snapshot();
  queuedSnapshot = after;
  pendingOperationCount += 1;
  pendingSave = pendingSave
    .then(() => writeOperation(before, after))
    .then(() => {
      saveError.value = null;
      collectionChannel?.postMessage('changed');
    })
    .catch((error: unknown) => {
      saveError.value = error instanceof Error ? error.message : String(error);
    })
    .finally(() => {
      pendingOperationCount -= 1;
      if (pendingOperationCount === 0 && refreshAfterPendingOperations) {
        refreshAfterPendingOperations = false;
        void loadFile();
      }
    });
};

collectionChannel?.addEventListener('message', () => {
  if (pendingOperationCount > 0) {
    refreshAfterPendingOperations = true;
    return;
  }
  void loadFile();
});

const newId = (prefix: string): string => {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

export const collectionStore = {
  folders: computed(() => state.folders),
  entries: computed(() => state.entries),
  manualCards: computed(() => state.manual_cards),
  isFileConnected: computed(() => isReady.value),
  fileName: computed(() => 'collection.json'),
  saveError: computed(() => saveError.value),

  ownedQuantity(setId: string, cardId: string, variantId: string): number {
    return ownedQuantities.value.get(`${setId}:${cardId}:${variantId}`) ?? 0;
  },

  isWanted(setId: string, cardId: string, variantId: string, languageId: string): boolean {
    return wantedKeys.value.has(`${setId}:${cardId}:${variantId}:${languageId}`);
  },

  createFolder(name: string, type: CollectionFolderType): CollectionFolder {
    const folder: CollectionFolder = {
      id: newId('folder'),
      name: name.trim(),
      type,
      created_at: new Date().toISOString()
    };
    if (!folder.name) throw new Error('Folder name is required');
    state.folders.push(folder);
    persist();
    return folder;
  },

  renameFolder(folderId: string, name: string): void {
    const folder = state.folders.find((candidate) => candidate.id === folderId);
    if (!folder || !name.trim()) return;
    folder.name = name.trim();
    persist();
  },

  updateFolder(folderId: string, name: string, type: CollectionFolderType): void {
    const folder = state.folders.find((candidate) => candidate.id === folderId);
    if (!folder || !name.trim()) return;
    folder.name = name.trim();
    folder.type = type;
    persist();
  },

  deleteFolder(folderId: string): void {
    const folderIndex = state.folders.findIndex((folder) => folder.id === folderId);
    if (folderIndex === -1) return;
    if (state.entries.some((candidate) => candidate.folder_id === folderId)) return;
    state.folders.splice(folderIndex, 1);
    persist();
  },

  ensureDefaultFolder(): CollectionFolder {
    const existing = state.folders[0];
    if (existing) return existing;
    const folder: CollectionFolder = {
      id: newId('folder'),
      name: 'Default collection',
      type: 'box',
      created_at: new Date().toISOString()
    };
    state.folders.push(folder);
    persist();
    return folder;
  },

  addCards(input: {
    folder_id: string;
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
    condition: CardCondition;
    quantity: number;
  }): void {
    const quantity = Math.max(1, Math.floor(input.quantity));
    const existing = state.entries.find((entry) =>
      entry.folder_id === input.folder_id
      && entry.set_id === input.set_id
      && entry.card_id === input.card_id
      && entry.variant_id === input.variant_id
      && entry.language_id === input.language_id
      && entry.condition === input.condition
      && !entry.wanted
    );
    if (existing) {
      existing.quantity += quantity;
      existing.updated_at = new Date().toISOString();
    } else {
      const now = new Date().toISOString();
      state.entries.push({ id: newId('entry'), ...input, quantity, wanted: false, added_at: now, updated_at: now });
    }
    persist();
  },

  addWanted(input: {
    folder_id: string;
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
    quantity: number;
  }): void {
    if (!state.folders.some((folder) => folder.id === input.folder_id)) return;
    const quantity = Math.max(1, Math.floor(input.quantity));
    const existing = state.entries.find((entry) =>
      entry.wanted
      && entry.folder_id === input.folder_id
      && entry.set_id === input.set_id
      && entry.card_id === input.card_id
      && entry.variant_id === input.variant_id
      && entry.language_id === input.language_id
    );
    if (existing) {
      existing.quantity += quantity;
      existing.updated_at = new Date().toISOString();
      persist();
      return;
    }
    const now = new Date().toISOString();
    state.entries.push({
      id: newId('wanted'),
      ...input,
      condition: 'NM',
      quantity,
      wanted: true,
      added_at: now,
      updated_at: now
    });
    persist();
  },

  fulfillWanted(entryId: string, condition: CardCondition): CollectionEntry | null {
    const wantedEntry = state.entries.find((entry) => entry.id === entryId && entry.wanted);
    if (!wantedEntry) return null;
    const now = new Date().toISOString();
    let ownedEntry = state.entries.find((entry) =>
      !entry.wanted
      && entry.folder_id === wantedEntry.folder_id
      && entry.set_id === wantedEntry.set_id
      && entry.card_id === wantedEntry.card_id
      && entry.variant_id === wantedEntry.variant_id
      && entry.language_id === wantedEntry.language_id
      && entry.condition === condition
    );
    if (ownedEntry) {
      ownedEntry.quantity += 1;
      ownedEntry.updated_at = now;
    } else {
      ownedEntry = {
        ...wantedEntry,
        id: newId('entry'),
        condition,
        quantity: 1,
        wanted: false,
        added_at: now,
        updated_at: now
      };
      state.entries.push(ownedEntry);
    }

    if (wantedEntry.quantity > 1) {
      wantedEntry.quantity -= 1;
      wantedEntry.updated_at = now;
    } else {
      state.entries.splice(state.entries.indexOf(wantedEntry), 1);
    }
    persist();
    return ownedEntry;
  },

  createManualCard(input: {
    folder_id: string;
    name: string;
    set_name: string;
    number: string;
    language_id: string;
    variant_id: string;
    condition: CardCondition;
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
  }): { card: ManualCollectionCard; entry: CollectionEntry } {
    if (!input.name.trim()) throw new Error('Card name is required');
    if (!state.folders.some((folder) => folder.id === input.folder_id)) throw new Error('Collection folder does not exist');
    const now = new Date().toISOString();
    const card: ManualCollectionCard = {
      id: newId('manual-card'),
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
      estimated_value: input.estimated_value !== null && input.estimated_value >= 0 ? input.estimated_value : null,
      release_date: input.release_date || null,
      created_at: now,
      updated_at: now
    };
    const entry: CollectionEntry = {
      id: newId('entry'),
      folder_id: input.folder_id,
      set_id: 'manual-collection',
      card_id: card.id,
      variant_id: input.variant_id.trim() || 'normal',
      language_id: input.language_id,
      condition: input.condition,
      quantity: Math.max(1, Math.floor(input.quantity)),
      wanted: false,
      added_at: now,
      updated_at: now
    };
    state.manual_cards.push(card);
    state.entries.push(entry);
    persist();
    return { card, entry };
  },

  updateManualCard(cardId: string, input: {
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
  }): void {
    const card = state.manual_cards.find((candidate) => candidate.id === cardId);
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
      estimated_value: input.estimated_value !== null && input.estimated_value >= 0 ? input.estimated_value : null,
      release_date: input.release_date || null,
      updated_at: new Date().toISOString()
    });
    persist();
  },

  setQuantity(entryId: string, quantity: number): void {
    const entry = state.entries.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    if (quantity <= 0) {
      this.removeEntry(entryId);
      return;
    }
    entry.quantity = Math.max(1, Math.floor(quantity));
    entry.updated_at = new Date().toISOString();
    persist();
  },

  updateEntry(entryId: string, input: {
    folder_id: string;
    language_id: string;
    condition: CardCondition;
    quantity: number;
  }): void {
    const entry = state.entries.find((candidate) => candidate.id === entryId);
    const quantity = Math.max(1, Math.floor(input.quantity));
    if (
      !entry
      || !state.folders.some((folder) => folder.id === input.folder_id)
      || !input.language_id
    ) return;

    const matching = state.entries.find((candidate) =>
      candidate.id !== entry.id
      && candidate.folder_id === input.folder_id
      && candidate.set_id === entry.set_id
      && candidate.card_id === entry.card_id
      && candidate.variant_id === entry.variant_id
      && candidate.language_id === input.language_id
      && candidate.condition === input.condition
      && candidate.wanted === entry.wanted
    );
    if (matching) {
      matching.quantity += quantity;
      matching.updated_at = new Date().toISOString();
      state.entries.splice(state.entries.indexOf(entry), 1);
    } else {
      entry.folder_id = input.folder_id;
      entry.language_id = input.language_id;
      entry.condition = input.condition;
      entry.quantity = quantity;
      entry.updated_at = new Date().toISOString();
    }
    persist();
  },

  transferEntry(entryId: string, folderId: string): void {
    this.transferEntries([entryId], folderId);
  },

  transferEntryQuantities(
    transfers: Array<{ entryId: string; quantity: number }>,
    folderId: string
  ): number {
    if (!state.folders.some((folder) => folder.id === folderId)) return 0;

    const now = new Date().toISOString();
    let transferred = 0;
    for (const transfer of transfers) {
      const entry = state.entries.find((candidate) =>
        candidate.id === transfer.entryId && candidate.folder_id !== folderId
      );
      if (!entry) continue;

      const quantity = Math.min(entry.quantity, Math.max(1, Math.floor(transfer.quantity)));
      const matching = state.entries.find((candidate) =>
        candidate.id !== entry.id
        && candidate.folder_id === folderId
        && candidate.set_id === entry.set_id
        && candidate.card_id === entry.card_id
        && candidate.variant_id === entry.variant_id
        && candidate.language_id === entry.language_id
        && candidate.condition === entry.condition
        && candidate.wanted === entry.wanted
      );

      if (quantity === entry.quantity) {
        if (matching) {
          matching.quantity += quantity;
          matching.updated_at = now;
          state.entries.splice(state.entries.indexOf(entry), 1);
        } else {
          entry.folder_id = folderId;
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
            id: newId('entry'),
            folder_id: folderId,
            quantity,
            added_at: now,
            updated_at: now
          });
        }
      }
      transferred += quantity;
    }

    if (transferred > 0) persist();
    return transferred;
  },

  transferEntries(entryIds: string[], folderId: string): number {
    const transfers = state.entries
      .filter((entry) => entryIds.includes(entry.id) && entry.folder_id !== folderId)
      .map((entry) => ({ entryId: entry.id, quantity: entry.quantity }));
    this.transferEntryQuantities(
      transfers,
      folderId
    );
    return transfers.length;
  },

  updateEntriesLanguage(entryIds: string[], languageId: string): number {
    if (!languageId) return 0;
    const requestedIds = new Set(entryIds);
    const entries = state.entries.filter((entry) => requestedIds.has(entry.id));
    if (entries.length === 0) return 0;

    const now = new Date().toISOString();
    for (const entry of entries) {
      // A previous merge in this batch may already have removed this entry.
      if (!state.entries.includes(entry)) continue;
      const matching = state.entries.find((candidate) =>
        candidate.id !== entry.id
        && candidate.folder_id === entry.folder_id
        && candidate.set_id === entry.set_id
        && candidate.card_id === entry.card_id
        && candidate.variant_id === entry.variant_id
        && candidate.language_id === languageId
        && candidate.condition === entry.condition
        && candidate.wanted === entry.wanted
      );

      if (matching) {
        matching.quantity += entry.quantity;
        matching.updated_at = now;
        state.entries.splice(state.entries.indexOf(entry), 1);
      } else {
        entry.language_id = languageId;
        entry.updated_at = now;
      }
    }
    persist();
    return entries.length;
  },

  removeEntry(entryId: string): void {
    const index = state.entries.findIndex((entry) => entry.id === entryId);
    if (index === -1) return;
    const [entry] = state.entries.splice(index, 1);
    if (
      entry.set_id === 'manual-collection'
      && !state.entries.some((candidate) => candidate.set_id === 'manual-collection' && candidate.card_id === entry.card_id)
    ) {
      const cardIndex = state.manual_cards.findIndex((card) => card.id === entry.card_id);
      if (cardIndex !== -1) state.manual_cards.splice(cardIndex, 1);
      for (const image of [...manualImageStore.entries.value].filter((candidate) =>
        candidate.set_id === 'manual-collection' && candidate.card_id === entry.card_id
      )) {
        void manualImageStore.remove(image.set_id, image.card_id, image.variant_id, image.language_id);
      }
    }
    persist();
  }
};
