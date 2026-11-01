// import hooks
import { computed } from 'vue';

// import utils
import {
  read_manual_images,
  save_manual_image,
  remove_manual_image,
} from '../../services/personal_data';
import {
  parse_manual_image_data,
  parse_manual_image_entry,
} from '../../services/personal_validation';
import { store } from '../core';

// import types
import type { Manual_Image_Data, Manual_Image_Entry } from '../../models/manual_images';

export type { Manual_Image_Entry } from '../../models/manual_images';

type Upload_Input = {
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
  data_url: string;
};
type Image_Key = Omit<Upload_Input, 'data_url'>;
const matches = (entry: Manual_Image_Entry, key: Image_Key): boolean =>
  entry.set_id === key.set_id &&
  entry.card_id === key.card_id &&
  entry.variant_id === key.variant_id &&
  entry.language_id === key.language_id;

store.registerModule('manual_images', {
  namespaced: true,
  state: () => ({
    data: { version: 1, entries: [] } as Manual_Image_Data,
    ready: false,
    error: null as string | null,
  }),
  mutations: {
    loaded(state, data: Manual_Image_Data) {
      state.data.entries.splice(0, state.data.entries.length, ...data.entries);
      state.ready = true;
      state.error = null;
    },
    not_ready(state) {
      state.ready = false;
    },
    failure(state, err: unknown) {
      state.error = err instanceof Error ? err.message : String(err);
    },
    upsert(state, entry: Manual_Image_Entry) {
      const old = state.data.entries.find((item) => matches(item, entry));
      if (old) Object.assign(old, entry);
      else state.data.entries.push(entry);
      state.error = null;
    },
    remove(state, key: Image_Key) {
      const index = state.data.entries.findIndex((entry) => matches(entry, key));
      if (index >= 0) state.data.entries.splice(index, 1);
      state.error = null;
    },
  },
  actions: {
    load({ commit }) {
      return read_manual_images()
        .then((res) => {
          if (!res.ok) throw new Error(`Unable to load manual images (${res.status})`);
          return res.json();
        })
        .then((res) => {
          commit('loaded', parse_manual_image_data(res));
        })
        .catch((err) => {
          commit('not_ready');
          commit('failure', err);
        });
    },
    upload({ commit }, input: Upload_Input) {
      return save_manual_image(input)
        .then(async (res) => {
          const body: unknown = await res.json();
          if (!res.ok) throw new Error('Unable to save manual image');
          return parse_manual_image_entry(body);
        })
        .then((res) => {
          commit('upsert', res);
        })
        .catch((err) => {
          commit('failure', err);
          throw err;
        });
    },
    remove({ commit }, key: Image_Key) {
      return remove_manual_image(key)
        .then((res) => {
          if (!res.ok) throw new Error('Unable to delete manual image');
          commit('remove', key);
        })
        .catch((err) => {
          commit('failure', err);
          throw err;
        });
    },
  },
});

export const manual_image_store = {
  entries: computed<Manual_Image_Entry[]>(() => store.state.manual_images.data.entries),
  is_ready: computed<boolean>(() => store.state.manual_images.ready),
  error: computed<string | null>(() => store.state.manual_images.error),
  find(
    set_id: string,
    card_id: string,
    variant_id: string,
    language_id: string,
  ): Manual_Image_Entry | null {
    return (
      store.state.manual_images.data.entries.find((entry) =>
        matches(entry, { set_id, card_id, variant_id, language_id }),
      ) ?? null
    );
  },
  upload(input: Upload_Input): Promise<void> {
    return store.dispatch('manual_images/upload', input);
  },
  remove(set_id: string, card_id: string, variant_id: string, language_id: string): Promise<void> {
    return store.dispatch('manual_images/remove', { set_id, card_id, variant_id, language_id });
  },
};
void store.dispatch('manual_images/load');
