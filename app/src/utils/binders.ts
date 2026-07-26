import { computed, reactive, ref } from 'vue';

export type BinderLayout = '2x2' | '3x3';

export type BinderProxy = {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
};

export type BinderImage = {
  id: string;
  name: string;
  width: number;
  height: number;
  created_at: string;
};

export type BinderImagePlacement = {
  image_id: string;
  side_index: number;
  row: number;
  column: number;
};

export type CollectionBinder = {
  folder_id: string;
  page_count: number;
  layout: BinderLayout;
  slots: Array<string | null>;
  proxies: BinderProxy[];
  images: BinderImage[];
  image_placements: BinderImagePlacement[];
  created_at: string;
  updated_at: string;
};

type BindersData = {
  version: 1;
  binders: CollectionBinder[];
};

const state = reactive<BindersData>({ version: 1, binders: [] });
const isReady = ref(false);
const saveError = ref<string | null>(null);
let pendingSave: Promise<void> = Promise.resolve();

const loadPromise = fetch('/api/binders')
  .then(async (response) => {
    if (!response.ok) throw new Error(`Unable to load binders.json (${response.status})`);
    const parsed = await response.json() as Partial<BindersData>;
    if (!Array.isArray(parsed.binders)) throw new Error('Invalid binders JSON');
    const binders = parsed.binders.map((binder) => {
      const expectedSlots = binder.page_count * 2 * slotsPerPage(binder.layout);
      return {
        ...binder,
        slots: binder.slots.length < expectedSlots
          ? [...binder.slots, ...Array(expectedSlots - binder.slots.length).fill(null)]
          : binder.slots.slice(0, expectedSlots),
        proxies: Array.isArray(binder.proxies)
          ? binder.proxies.map((proxy) => ({ ...proxy, quantity: Math.max(1, proxy.quantity ?? 1) }))
          : [],
        images: Array.isArray(binder.images) ? binder.images : [],
        image_placements: Array.isArray(binder.image_placements) ? binder.image_placements : []
      };
    });
    state.binders.splice(0, state.binders.length, ...binders);
    isReady.value = true;
  })
  .catch((error: unknown) => {
    saveError.value = error instanceof Error ? error.message : String(error);
  });

const persist = (): void => {
  if (!isReady.value) return;
  pendingSave = pendingSave.then(async () => {
    await loadPromise;
    const response = await fetch('/api/binders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!response.ok) throw new Error(`Unable to save binders.json (${response.status})`);
    saveError.value = null;
  }).catch((error: unknown) => {
    saveError.value = error instanceof Error ? error.message : String(error);
  });
};

const slotsPerPage = (layout: BinderLayout): number => layout === '2x2' ? 4 : 9;
const newAssetId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const binderStore = {
  binders: computed(() => state.binders),
  isReady: computed(() => isReady.value),
  saveError: computed(() => saveError.value),

  get(folderId: string): CollectionBinder | null {
    return state.binders.find((binder) => binder.folder_id === folderId) ?? null;
  },

  create(folderId: string, pageCount: number, layout: BinderLayout): CollectionBinder {
    const existing = this.get(folderId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const binder: CollectionBinder = {
      folder_id: folderId,
      page_count: Math.max(1, Math.floor(pageCount)),
      layout,
      slots: Array(Math.max(1, Math.floor(pageCount)) * 2 * slotsPerPage(layout)).fill(null),
      proxies: [],
      images: [],
      image_placements: [],
      created_at: now,
      updated_at: now
    };
    state.binders.push(binder);
    persist();
    return binder;
  },

  remove(folderId: string): void {
    const index = state.binders.findIndex((binder) => binder.folder_id === folderId);
    if (index === -1) return;
    state.binders.splice(index, 1);
    persist();
  },

  resetSettings(folderId: string, pageCount: number, layout: BinderLayout): void {
    const binder = this.get(folderId);
    if (!binder) return;
    binder.page_count = Math.max(1, Math.floor(pageCount));
    binder.layout = layout;
    binder.slots = Array(binder.page_count * 2 * slotsPerPage(layout)).fill(null);
    binder.image_placements = [];
    const dimension = layout === '2x2' ? 2 : 3;
    binder.images = binder.images.map((image) => ({
      ...image,
      width: Math.min(dimension, image.width),
      height: Math.min(dimension, image.height)
    }));
    binder.updated_at = new Date().toISOString();
    persist();
  },

  setSlot(folderId: string, slotIndex: number, entryId: string | null): void {
    const binder = this.get(folderId);
    if (!binder || slotIndex < 0 || slotIndex >= binder.slots.length) return;
    binder.slots[slotIndex] = entryId;
    binder.updated_at = new Date().toISOString();
    persist();
  },

  createProxy(folderId: string, name: string, quantity: number): BinderProxy {
    const binder = this.get(folderId);
    if (!binder || !name.trim()) throw new Error('Proxy name is required');
    const proxy = {
      id: newAssetId('proxy'),
      name: name.trim(),
      quantity: Math.max(1, Math.floor(quantity)),
      created_at: new Date().toISOString()
    };
    binder.proxies.push(proxy);
    binder.updated_at = new Date().toISOString();
    persist();
    return proxy;
  },

  createImage(folderId: string, name: string, width: number, height: number): BinderImage {
    const binder = this.get(folderId);
    if (!binder || !name.trim()) throw new Error('Image name is required');
    const limit = binder.layout === '2x2' ? 2 : 3;
    const image = {
      id: newAssetId('image'),
      name: name.trim(),
      width: Math.min(limit, Math.max(1, Math.floor(width))),
      height: Math.min(limit, Math.max(1, Math.floor(height))),
      created_at: new Date().toISOString()
    };
    binder.images.push(image);
    binder.updated_at = new Date().toISOString();
    persist();
    return image;
  },

  removeAsset(folderId: string, kind: 'proxy' | 'image', assetId: string): void {
    const binder = this.get(folderId);
    if (!binder) return;
    if (kind === 'proxy') {
      binder.proxies = binder.proxies.filter((proxy) => proxy.id !== assetId);
      binder.slots = binder.slots.map((slot) => slot === `proxy:${assetId}` ? null : slot);
    } else {
      binder.images = binder.images.filter((image) => image.id !== assetId);
      binder.image_placements = binder.image_placements.filter((placement) => placement.image_id !== assetId);
    }
    binder.updated_at = new Date().toISOString();
    persist();
  },

  placeImage(folderId: string, imageId: string, sideIndex: number, row: number, column: number): void {
    const binder = this.get(folderId);
    const image = binder?.images.find((candidate) => candidate.id === imageId);
    if (!binder || !image) return;
    const dimension = binder.layout === '2x2' ? 2 : 3;
    const placement: BinderImagePlacement = {
      image_id: imageId,
      side_index: sideIndex,
      row: Math.min(Math.max(0, row), dimension - image.height),
      column: Math.min(Math.max(0, column), dimension - image.width)
    };
    binder.image_placements = [
      ...binder.image_placements.filter((candidate) => candidate.image_id !== imageId),
      placement
    ];
    binder.updated_at = new Date().toISOString();
    persist();
  },

  removeImagePlacement(folderId: string, imageId: string): void {
    const binder = this.get(folderId);
    if (!binder) return;
    binder.image_placements = binder.image_placements.filter((placement) => placement.image_id !== imageId);
    binder.updated_at = new Date().toISOString();
    persist();
  },

  moveSlot(folderId: string, sourceIndex: number, targetIndex: number): void {
    const binder = this.get(folderId);
    if (!binder || sourceIndex === targetIndex) return;
    const source = binder.slots[sourceIndex] ?? null;
    const target = binder.slots[targetIndex] ?? null;
    binder.slots[sourceIndex] = target;
    binder.slots[targetIndex] = source;
    binder.updated_at = new Date().toISOString();
    persist();
  },

  clean(folderId: string, validQuantities: Map<string, number>): void {
    const binder = this.get(folderId);
    if (!binder) return;
    const used = new Map<string, number>();
    const usedProxies = new Map<string, number>();
    let changed = false;
    const nextSlots = binder.slots.map((entryId) => {
      if (!entryId) return null;
      if (entryId.startsWith('proxy:')) {
        const proxyId = entryId.slice(6);
        const proxy = binder.proxies.find((candidate) => candidate.id === proxyId);
        const nextCount = (usedProxies.get(proxyId) ?? 0) + 1;
        usedProxies.set(proxyId, nextCount);
        if (proxy && nextCount <= proxy.quantity) return entryId;
        changed = true;
        return null;
      }
      const nextCount = (used.get(entryId) ?? 0) + 1;
      used.set(entryId, nextCount);
      if (nextCount <= (validQuantities.get(entryId) ?? 0)) return entryId;
      changed = true;
      return null;
    });
    if (changed) {
      binder.slots = nextSlots;
      binder.updated_at = new Date().toISOString();
      persist();
    }
  }
};

export const binderSlotsPerPage = slotsPerPage;
