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

export type CollectionFolder = {
  id: string;
  name: string;
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

export const mainFolderId = 'main';

const defaultData = (): CollectionData => ({
  version: 2,
  folders: [{ id: mainFolderId, name: 'Main collection', created_at: new Date().toISOString() }],
  entries: [],
  manual_cards: []
});

const state = reactive<CollectionData>(defaultData());
const isReady = ref(false);
const saveError = ref<string | null>(null);
let pendingSave: Promise<void> = Promise.resolve();

const normalizeData = (parsed: Partial<CollectionData>): CollectionData => {
  if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.entries)) {
    throw new Error('The selected file is not a valid Card Manager collection');
  }
  const folders = parsed.folders.some((folder) => folder.id === mainFolderId)
    ? parsed.folders
    : [defaultData().folders[0], ...parsed.folders];
  const entries = parsed.entries.map((entry) => ({
    ...entry,
    language_id: entry.language_id || (entry.set_id.startsWith('asia-') ? 'ja' : 'en')
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

const loadFile = async (): Promise<void> => {
  const response = await fetch('/api/collection');
  if (!response.ok) throw new Error(`Unable to load collection.json (${response.status})`);
  replaceData(normalizeData(await response.json() as Partial<CollectionData>));
  isReady.value = true;
  saveError.value = null;
};

const loadPromise = loadFile().catch((error: unknown) => {
  saveError.value = error instanceof Error ? error.message : String(error);
});

const writeFile = async (): Promise<void> => {
  await loadPromise;
  const response = await fetch('/api/collection', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state)
  });
  if (!response.ok) throw new Error(`Unable to save collection.json (${response.status})`);
};

const persist = (): void => {
  if (!isReady.value) return;
  pendingSave = pendingSave
    .then(writeFile)
    .then(() => { saveError.value = null; })
    .catch((error: unknown) => {
      saveError.value = error instanceof Error ? error.message : String(error);
    });
};

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

  createFolder(name: string): CollectionFolder {
    const folder: CollectionFolder = {
      id: newId('folder'),
      name: name.trim(),
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

  deleteFolder(folderId: string): void {
    if (folderId === mainFolderId) return;
    const folderIndex = state.folders.findIndex((folder) => folder.id === folderId);
    if (folderIndex === -1) return;
    this.transferEntries(
      state.entries.filter((candidate) => candidate.folder_id === folderId).map((entry) => entry.id),
      mainFolderId
    );
    state.folders.splice(folderIndex, 1);
    persist();
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
    );
    if (existing) {
      existing.quantity += quantity;
      existing.updated_at = new Date().toISOString();
    } else {
      const now = new Date().toISOString();
      state.entries.push({ id: newId('entry'), ...input, quantity, added_at: now, updated_at: now });
    }
    persist();
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

  transferEntries(entryIds: string[], folderId: string): number {
    if (!state.folders.some((folder) => folder.id === folderId)) return 0;
    const requestedIds = new Set(entryIds);
    const entries = state.entries.filter((entry) =>
      requestedIds.has(entry.id) && entry.folder_id !== folderId
    );
    if (entries.length === 0) return 0;

    const now = new Date().toISOString();
    for (const entry of entries) {
      const matching = state.entries.find((candidate) =>
        candidate.id !== entry.id
        && candidate.folder_id === folderId
        && candidate.set_id === entry.set_id
        && candidate.card_id === entry.card_id
        && candidate.variant_id === entry.variant_id
        && candidate.language_id === entry.language_id
        && candidate.condition === entry.condition
      );
      if (matching) {
        matching.quantity += entry.quantity;
        matching.updated_at = now;
        state.entries.splice(state.entries.indexOf(entry), 1);
      } else {
        entry.folder_id = folderId;
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
