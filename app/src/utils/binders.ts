import { computed, reactive, ref } from 'vue';

export type BinderLayout = '2x2' | '3x3';

export type BinderProxy = {
  id: string;
  name: string;
  quantity: number;
  date?: string;
  created_at: string;
};

export type BinderImage = {
  id: string;
  name: string;
  width: number;
  height: number;
  card_slots: number[];
  crop_zoom: number;
  crop_x: number;
  crop_y: number;
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
  locked_pages: number[];
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
const displayProxyDate = (value: unknown): string => {
  const date = typeof value === 'string' ? value : '';
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return isoMatch ? `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}` : date;
};

const loadPromise = fetch('/api/binders')
  .then(async (response) => {
    if (!response.ok) throw new Error(`Unable to load binders.json (${response.status})`);
    const parsed = await response.json() as Partial<BindersData>;
    if (!Array.isArray(parsed.binders)) throw new Error('Invalid binders JSON');
    const binders = parsed.binders.map((binder) => {
      const { locked: _legacyLocked, ...binderData } = binder as CollectionBinder & { locked?: boolean };
      const expectedSlots = binder.page_count * 2 * slotsPerPage(binder.layout);
      return {
        ...binderData,
        locked_pages: Array.isArray(binder.locked_pages)
          ? [...new Set(binder.locked_pages)].filter((page) => Number.isInteger(page) && page >= 0 && page < binder.page_count * 2)
          : [],
        slots: binder.slots.length < expectedSlots
          ? [...binder.slots, ...Array(expectedSlots - binder.slots.length).fill(null)]
          : binder.slots.slice(0, expectedSlots),
        proxies: Array.isArray(binder.proxies)
          ? binder.proxies.map((proxy) => ({
              ...proxy,
              quantity: Math.max(1, proxy.quantity ?? 1),
              date: displayProxyDate(proxy.date)
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
              crop_y: Math.min(100, Math.max(-100, Number(image.crop_y) || 0))
            }))
          : [],
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
const pageForSlot = (binder: CollectionBinder, slotIndex: number): number | null => {
  const pageIndex = Math.floor(slotIndex / slotsPerPage(binder.layout));
  return binder.locked_pages.includes(pageIndex) ? null : pageIndex;
};
const assetTouchesLockedPage = (
  binder: CollectionBinder,
  kind: 'proxy' | 'image',
  assetId: string
): boolean => kind === 'proxy'
  ? binder.slots.some((slot, index) =>
      slot === `proxy:${assetId}` && binder.locked_pages.includes(Math.floor(index / slotsPerPage(binder.layout)))
    )
  : binder.image_placements.some((placement) =>
      placement.image_id === assetId && binder.locked_pages.includes(placement.side_index)
    );
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
      locked_pages: [],
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

  setPageLocked(folderId: string, pageIndex: number, locked: boolean): void {
    const binder = this.get(folderId);
    if (!binder || !Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= binder.page_count * 2) return;
    const currentlyLocked = binder.locked_pages.includes(pageIndex);
    if (currentlyLocked === locked) return;
    binder.locked_pages = locked
      ? [...binder.locked_pages, pageIndex].sort((left, right) => left - right)
      : binder.locked_pages.filter((candidate) => candidate !== pageIndex);
    binder.updated_at = new Date().toISOString();
    persist();
  },

  resetSettings(folderId: string, pageCount: number, layout: BinderLayout): void {
    const binder = this.get(folderId);
    if (!binder || binder.locked_pages.length) return;
    binder.page_count = Math.max(1, Math.floor(pageCount));
    binder.layout = layout;
    binder.slots = Array(binder.page_count * 2 * slotsPerPage(layout)).fill(null);
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
        })
      };
    });
    binder.updated_at = new Date().toISOString();
    persist();
  },

  setSlot(folderId: string, slotIndex: number, entryId: string | null): void {
    const binder = this.get(folderId);
    if (!binder || slotIndex < 0 || slotIndex >= binder.slots.length || pageForSlot(binder, slotIndex) === null) return;
    binder.slots[slotIndex] = entryId;
    binder.updated_at = new Date().toISOString();
    persist();
  },

  createProxy(folderId: string, name: string, quantity: number, date = ''): BinderProxy {
    const binder = this.get(folderId);
    if (!binder || !name.trim()) throw new Error('Proxy name is required');
    const proxy = {
      id: newAssetId('proxy'),
      name: name.trim(),
      quantity: Math.max(1, Math.floor(quantity)),
      date,
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
      card_slots: [],
      crop_zoom: 1,
      crop_x: 0,
      crop_y: 0,
      created_at: new Date().toISOString()
    };
    binder.images.push(image);
    binder.updated_at = new Date().toISOString();
    persist();
    return image;
  },

  updateProxy(
    folderId: string,
    proxyId: string,
    values: { name: string; quantity: number; date: string }
  ): void {
    const binder = this.get(folderId);
    const proxy = binder?.proxies.find((candidate) => candidate.id === proxyId);
    if (!binder || !proxy || !values.name.trim() || assetTouchesLockedPage(binder, 'proxy', proxyId)) return;
    proxy.name = values.name.trim();
    proxy.quantity = Math.max(1, Math.floor(values.quantity));
    proxy.date = values.date;
    binder.updated_at = new Date().toISOString();
    persist();
  },

  updateImage(
    folderId: string,
    imageId: string,
    values: {
      name: string;
      width: number;
      height: number;
      cardSlots: number[];
      cropZoom: number;
      cropX: number;
      cropY: number;
    }
  ): void {
    const binder = this.get(folderId);
    const image = binder?.images.find((candidate) => candidate.id === imageId);
    if (!binder || !image || !values.name.trim() || assetTouchesLockedPage(binder, 'image', imageId)) return;
    const limit = binder.layout === '2x2' ? 2 : 3;
    const width = Math.min(limit, Math.max(1, Math.floor(values.width)));
    const height = Math.min(limit, Math.max(1, Math.floor(values.height)));
    image.name = values.name.trim();
    image.width = width;
    image.height = height;
    image.card_slots = [...new Set(values.cardSlots)]
      .filter((index) => Number.isInteger(index) && index >= 0 && index < width * height)
      .sort((left, right) => left - right);
    image.crop_zoom = Math.min(3, Math.max(1, values.cropZoom));
    image.crop_x = Math.min(100, Math.max(-100, values.cropX));
    image.crop_y = Math.min(100, Math.max(-100, values.cropY));
    const placement = binder.image_placements.find((candidate) => candidate.image_id === imageId);
    if (placement) {
      placement.row = Math.min(placement.row, limit - image.height);
      placement.column = Math.min(placement.column, limit - image.width);
      for (let row = 0; row < image.height; row += 1) {
        for (let column = 0; column < image.width; column += 1) {
          if (image.card_slots.includes(row * image.width + column)) continue;
          const slotIndex = placement.side_index * slotsPerPage(binder.layout)
            + (placement.row + row) * limit
            + placement.column + column;
          binder.slots[slotIndex] = null;
        }
      }
    }
    binder.updated_at = new Date().toISOString();
    persist();
  },

  removeAsset(folderId: string, kind: 'proxy' | 'image', assetId: string): void {
    const binder = this.get(folderId);
    if (!binder || assetTouchesLockedPage(binder, kind, assetId)) return;
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
    if (!binder || !image || binder.locked_pages.includes(sideIndex)) return;
    const currentPlacement = binder.image_placements.find((candidate) => candidate.image_id === imageId);
    if (currentPlacement && binder.locked_pages.includes(currentPlacement.side_index)) return;
    const dimension = binder.layout === '2x2' ? 2 : 3;
    const placement: BinderImagePlacement = {
      image_id: imageId,
      side_index: sideIndex,
      row: Math.min(Math.max(0, row), dimension - image.height),
      column: Math.min(Math.max(0, column), dimension - image.width)
    };
    const conflictsWithCard = Array.from({ length: image.width * image.height }, (_, index) => index)
      .some((index) => {
        if (image.card_slots.includes(index)) return false;
        const imageRow = Math.floor(index / image.width);
        const imageColumn = index % image.width;
        const slotIndex = sideIndex * slotsPerPage(binder.layout)
          + (placement.row + imageRow) * dimension
          + placement.column + imageColumn;
        return binder.slots[slotIndex] !== null;
      });
    if (conflictsWithCard) return;
    binder.image_placements = [
      ...binder.image_placements.filter((candidate) => candidate.image_id !== imageId),
      placement
    ];
    binder.updated_at = new Date().toISOString();
    persist();
  },

  removeImagePlacement(folderId: string, imageId: string): void {
    const binder = this.get(folderId);
    const placement = binder?.image_placements.find((candidate) => candidate.image_id === imageId);
    if (!binder || (placement && binder.locked_pages.includes(placement.side_index))) return;
    binder.image_placements = binder.image_placements.filter((placement) => placement.image_id !== imageId);
    binder.updated_at = new Date().toISOString();
    persist();
  },

  applyLayout(
    folderId: string,
    slots: Array<string | null>,
    imagePlacements: BinderImagePlacement[]
  ): void {
    const binder = this.get(folderId);
    if (!binder || slots.length !== binder.slots.length) return;
    const sideSize = slotsPerPage(binder.layout);
    const locked = new Set(binder.locked_pages);
    binder.slots = slots.map((slot, index) => locked.has(Math.floor(index / sideSize)) ? binder.slots[index] : slot);
    binder.image_placements = [
      ...binder.image_placements.filter((placement) => locked.has(placement.side_index)),
      ...imagePlacements.filter((placement) => !locked.has(placement.side_index)).map((placement) => ({ ...placement }))
    ];
    binder.updated_at = new Date().toISOString();
    persist();
  },

  moveSlot(folderId: string, sourceIndex: number, targetIndex: number): void {
    const binder = this.get(folderId);
    if (
      !binder || sourceIndex === targetIndex
      || sourceIndex < 0 || sourceIndex >= binder.slots.length
      || targetIndex < 0 || targetIndex >= binder.slots.length
      || pageForSlot(binder, sourceIndex) === null || pageForSlot(binder, targetIndex) === null
    ) return;
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
    const nextSlots = binder.slots.map((entryId, slotIndex) => {
      if (!entryId) return null;
      const locked = binder.locked_pages.includes(Math.floor(slotIndex / slotsPerPage(binder.layout)));
      if (entryId.startsWith('proxy:')) {
        const proxyId = entryId.slice(6);
        const proxy = binder.proxies.find((candidate) => candidate.id === proxyId);
        const nextCount = (usedProxies.get(proxyId) ?? 0) + 1;
        usedProxies.set(proxyId, nextCount);
        if (locked) return entryId;
        if (proxy && nextCount <= proxy.quantity) return entryId;
        changed = true;
        return null;
      }
      const nextCount = (used.get(entryId) ?? 0) + 1;
      used.set(entryId, nextCount);
      if (locked) return entryId;
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
