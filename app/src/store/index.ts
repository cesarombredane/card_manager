// import vuex
import { createStore } from 'vuex';
import type { CardSort } from '../utils/cardSorting';

export type CardSearchRegion = 'all' | 'intl' | 'asia';

export type CardSearchFilters = {
  search: string;
  artist: string | null;
  pokemon: string | null;
  energy: string | null;
  set_number: string;
  rarities: string[] | null;
  sort: CardSort;
  include_special_forms: boolean;
  only_my_cards: boolean;
  region: CardSearchRegion;
  international_language_id: string | null;
  asia_language_id: string;
  advanced_filters_open: boolean;
};

export type CollectionFolderFilters = {
  search: string;
  tab: 'owned' | 'wanted';
  language_id: string | null;
  sort: CardSort;
};

// define the shape of the application state
export type AppState = {
  selected_region_id: string;
  selected_language_id: string;
  last_collection_folder_id: string;
  sets_search_input: string;
  card_search_filters: CardSearchFilters;
  collection_folder_filters: Record<string, CollectionFolderFilters>;
};


// create store instance
export const store = createStore<AppState>({
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
        rarities: null,
        sort: 'release-desc',
        include_special_forms: false,
        only_my_cards: false,
        region: 'all',
        international_language_id: null,
        asia_language_id: 'ja',
        advanced_filters_open: false
      }
    };
  },
  mutations: {
    // Store the current region used on the series listing page.
    set_selected_region_id(state: AppState, region_id: string) {
      state.selected_region_id = region_id;
    },

    // Preserve the set-list search while visiting a set and navigating back.
    set_sets_search_input(state: AppState, search: string) {
      state.sets_search_input = search;
    },

    // Store the preferred language used on set pages.
    set_sekected_language_id(state: AppState, language_id: string) {
      state.selected_language_id = language_id;
    },

    // Store the folder used for the most recent card addition.
    set_last_collection_folder_id(state: AppState, folder_id: string) {
      state.last_collection_folder_id = folder_id;
    },

    // Preserve card-search preferences while navigating around the application.
    set_card_search_filters(state: AppState, filters: CardSearchFilters) {
      state.card_search_filters = filters;
    },

    // Preserve each collection folder's list controls while viewing card details.
    set_collection_folder_filters(
      state: AppState,
      payload: { folder_id: string; filters: CollectionFolderFilters }
    ) {
      state.collection_folder_filters[payload.folder_id] = payload.filters;
    }
  },
  actions: {}
});
