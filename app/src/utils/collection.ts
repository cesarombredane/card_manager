import { computed, reactive, ref } from 'vue';

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

type CollectionData = {
  version: 1;
  folders: CollectionFolder[];
  entries: CollectionEntry[];
};

export const mainFolderId = 'main';

const defaultData = (): CollectionData => ({
  version: 1,
  folders: [{ id: mainFolderId, name: 'Main collection', created_at: new Date().toISOString() }],
  entries: []
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
  return { version: 1, folders, entries };
};

const replaceData = (data: CollectionData): void => {
  state.version = 1;
  state.folders.splice(0, state.folders.length, ...data.folders);
  state.entries.splice(0, state.entries.length, ...data.entries);
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
    for (const entry of [...state.entries].filter((candidate) => candidate.folder_id === folderId)) {
      this.transferEntry(entry.id, mainFolderId);
    }
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

  transferEntry(entryId: string, folderId: string): void {
    const entry = state.entries.find((candidate) => candidate.id === entryId);
    if (!entry || entry.folder_id === folderId || !state.folders.some((folder) => folder.id === folderId)) return;
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
      matching.updated_at = new Date().toISOString();
      state.entries.splice(state.entries.indexOf(entry), 1);
    } else {
      entry.folder_id = folderId;
      entry.updated_at = new Date().toISOString();
    }
    persist();
  },

  removeEntry(entryId: string): void {
    const index = state.entries.findIndex((entry) => entry.id === entryId);
    if (index === -1) return;
    state.entries.splice(index, 1);
    persist();
  }
};
