import { computed, reactive, ref } from 'vue';

export type ManualImageEntry = {
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
  url: string;
  updated_at: string;
};

const entries = reactive<ManualImageEntry[]>([]);
const isReady = ref(false);
const error = ref<string | null>(null);

const replaceEntries = (nextEntries: ManualImageEntry[]): void => {
  entries.splice(0, entries.length, ...nextEntries);
};

const load = async (): Promise<void> => {
  try {
    const response = await fetch('/api/manual-images');
    if (!response.ok) throw new Error(`Unable to load manual images (${response.status})`);
    const data = await response.json() as { entries?: ManualImageEntry[] };
    replaceEntries(Array.isArray(data.entries) ? data.entries : []);
    isReady.value = true;
    error.value = null;
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : String(loadError);
  }
};

void load();

export const manualImageStore = {
  entries: computed(() => entries),
  isReady: computed(() => isReady.value),
  error: computed(() => error.value),

  find(setId: string, cardId: string, variantId: string, languageId: string): ManualImageEntry | null {
    return entries.find((entry) =>
      entry.set_id === setId
      && entry.card_id === cardId
      && entry.variant_id === variantId
      && entry.language_id === languageId
    ) ?? null;
  },

  async upload(input: {
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
    data_url: string;
  }): Promise<void> {
    const response = await fetch('/api/manual-images', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const result = await response.json() as ManualImageEntry & { error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Unable to save manual image');
    const existing = this.find(input.set_id, input.card_id, input.variant_id, input.language_id);
    if (existing) Object.assign(existing, result);
    else entries.push(result);
    error.value = null;
  },

  async remove(setId: string, cardId: string, variantId: string, languageId: string): Promise<void> {
    const response = await fetch('/api/manual-images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        set_id: setId,
        card_id: cardId,
        variant_id: variantId,
        language_id: languageId
      })
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Unable to delete manual image');
    const index = entries.findIndex((entry) =>
      entry.set_id === setId && entry.card_id === cardId
      && entry.variant_id === variantId && entry.language_id === languageId
    );
    if (index !== -1) entries.splice(index, 1);
    error.value = null;
  }
};
