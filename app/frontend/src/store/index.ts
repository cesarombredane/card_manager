import { createStore } from 'vuex';

export type AppState = {};

export const store = createStore<AppState>({
  state() {
    return {};
  },
  mutations: {},
  actions: {}
});
