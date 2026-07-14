// import vuex
import { createStore } from 'vuex';


// define the shape of the application state
export type AppState = {
  selected_region_id: string;
  selected_language_id: string;
};


// create store instance
export const store = createStore<AppState>({
  state() {
    return {
      selected_region_id: 'INTL',
      selected_language_id: 'en'
    };
  },
  mutations: {
    // Store the current region used on the series listing page.
    set_selected_region_id(state: AppState, region_id: string) {
      state.selected_region_id = region_id;
    },

    // Store the preferred language used on set pages.
    set_sekected_language_id(state: AppState, language_id: string) {
      state.selected_language_id = language_id;
    }
  },
  actions: {}
});
