// import hooks
import { createStore } from 'vuex';

// import types
import type { Personal_Module_State } from '../models/personal_state';
import type { Manual_Image_Data } from '../models/manual_images';
import type { Collection_Data } from '../models/collection';
import type { Card_Sort } from '../utils/card_sorting';
import type { Binders_Data } from '../models/binders';
import type { Store } from 'vuex';

export type Card_Search_Region = 'all' | 'intl' | 'asia';

export type Card_Search_Filters = {
  search: string;
  artist: string | null;
  pokemon: string | null;
  energy: string | null;
  set_number: string;
  series_ids: string[] | null;
  variant_types: string[] | null;
  rarities: string[] | null;
  sort: Card_Sort;
  include_special_forms: boolean;
  only_my_cards: boolean;
  region: Card_Search_Region;
  international_language_id: string | null;
  asia_language_id: string;
  advanced_filters_open: boolean;
};

export type Collection_Folder_Filters = {
  search: string;
  tab: 'owned' | 'wanted';
  language_id: string | null;
  only_non_fitting?: boolean;
  only_duplicates?: boolean;
  only_available_wanted?: boolean;
  sort: Card_Sort;
};

// define the shape of the application state
export type Navigation_State = {
  selected_region_id: string;
  selected_language_id: string;
  last_collection_folder_id: string;
  sets_search_input: string;
  card_search_filters: Card_Search_Filters;
  collection_folder_filters: Record<string, Collection_Folder_Filters>;
};

// create store instance
export type App_State = Navigation_State & {
  collection: Personal_Module_State<Collection_Data>;
  binders: Personal_Module_State<Binders_Data>;
  manual_images: Personal_Module_State<Manual_Image_Data>;
};

export const store = createStore<Navigation_State>({
  strict: import.meta.env.DEV,
  state() {
    return {
      selected_region_id: 'INTL',
      selected_language_id: 'fr',
      last_collection_folder_id: '',
      sets_search_input: '',
      collection_folder_filters: {},
      card_search_filters: {
        search: '',
        artist: null,
        pokemon: null,
        energy: null,
        set_number: '',
        series_ids: null,
        variant_types: null,
        rarities: null,
        sort: 'release-desc',
        include_special_forms: true,
        only_my_cards: false,
        region: 'all',
        international_language_id: null,
        asia_language_id: 'ja',
        advanced_filters_open: false,
      },
    };
  },
  mutations: {
    // Store the current region used on the series listing page.
    set_selected_region_id(state: Navigation_State, region_id: string) {
      state.selected_region_id = region_id;
    },

    // Preserve the set-list search while visiting a set and navigating back.
    set_sets_search_input(state: Navigation_State, search: string) {
      state.sets_search_input = search;
    },

    // Store the preferred language used on set pages.
    set_selected_language_id(state: Navigation_State, language_id: string) {
      state.selected_language_id = language_id;
    },

    // Store the folder used for the most recent card addition.
    set_last_collection_folder_id(state: Navigation_State, folder_id: string) {
      state.last_collection_folder_id = folder_id;
    },

    // Preserve card-search preferences while navigating around the application.
    set_card_search_filters(state: Navigation_State, filters: Card_Search_Filters) {
      state.card_search_filters = filters;
    },

    // Preserve each collection folder's list controls while viewing card details.
    set_collection_folder_filters(
      state: Navigation_State,
      payload: { folder_id: string; filters: Collection_Folder_Filters },
    ) {
      state.collection_folder_filters[payload.folder_id] = payload.filters;
    },
  },
  actions: {},
}) as Store<App_State>;
