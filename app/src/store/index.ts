// import vuex
import { createStore } from 'vuex';


// define the shape of the application state
export type AppState = {
  selectedRegionId: string;
  selectedLanguageId: string;
};


// create store instance
export const store = createStore<AppState>({
  state() {
    return {
      selectedRegionId: 'INTL',
      selectedLanguageId: 'en'
    };
  },
  mutations: {
    // Store the current region used on the series listing page.
    setSelectedRegionId(state: AppState, regionId: string) {
      state.selectedRegionId = regionId;
    },

    // Store the preferred language used on set pages.
    setSelectedLanguageId(state: AppState, languageId: string) {
      state.selectedLanguageId = languageId;
    }
  },
  actions: {}
});
