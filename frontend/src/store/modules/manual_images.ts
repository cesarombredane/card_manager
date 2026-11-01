import type { ManualImageEntry } from '../../models/manual_images';
export type { ManualImageEntry } from '../../models/manual_images';
import {
  read_manual_images,
  save_manual_image,
  remove_manual_image,
} from '../../services/personal_data';
import { computed, reactive, ref } from 'vue';

const entries = reactive<ManualImageEntry[]>([]);
const isReady = ref<boolean>(false);
const error = ref<string | null>(null);

const replaceEntries = (nextEntries: ManualImageEntry[]): void => {
  entries.splice(0, entries.length, ...nextEntries);
};

const load = async (): Promise<void> => {
  try {
    const response = await read_manual_images();
    if (!response.ok) throw new Error(`Unable to load manual images (${response.status})`);
    const data = (await response.json()) as { entries?: ManualImageEntry[] };
    replaceEntries(Array.isArray(data.entries) ? data.entries : []);
    isReady.value = true;
    error.value = null;
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : String(loadError);
  }
};

void load();

export const manualImageStore = {
  entries: computed<ManualImageEntry[]>(() => entries),
  isReady: computed<boolean>(() => isReady.value),
  error: computed<string | null>(() => error.value),

  find(
    setId: string,
    cardId: string,
    variantId: string,
    languageId: string,
  ): ManualImageEntry | null {
    return (
      entries.find(
        (entry) =>
          entry.set_id === setId &&
          entry.card_id === cardId &&
          entry.variant_id === variantId &&
          entry.language_id === languageId,
      ) ?? null
    );
  },

  async upload(input: {
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
    data_url: string;
  }): Promise<void> {
    const response = await save_manual_image(input);
    const result = (await response.json()) as ManualImageEntry & { error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Unable to save manual image');
    const existing = this.find(input.set_id, input.card_id, input.variant_id, input.language_id);
    if (existing) Object.assign(existing, result);
    else entries.push(result);
    error.value = null;
  },

  async remove(
    setId: string,
    cardId: string,
    variantId: string,
    languageId: string,
  ): Promise<void> {
    const response = await remove_manual_image({
      set_id: setId,
      card_id: cardId,
      variant_id: variantId,
      language_id: languageId,
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Unable to delete manual image');
    const index = entries.findIndex(
      (entry) =>
        entry.set_id === setId &&
        entry.card_id === cardId &&
        entry.variant_id === variantId &&
        entry.language_id === languageId,
    );
    if (index !== -1) entries.splice(index, 1);
    error.value = null;
  },
};
