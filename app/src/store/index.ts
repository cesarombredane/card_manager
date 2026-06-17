// import vuex
import { createStore } from 'vuex';


// define the shape of the application state
export type AppState = {};


// create store instance
export const store = createStore<AppState>({
  state() {
    return {};
  },
  mutations: {},
  actions: {}
});
