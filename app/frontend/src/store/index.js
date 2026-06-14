import { createStore } from 'vuex';

export const store = createStore({
  state() {
    return {
      appName: 'Card Manager',
      apiStatus: 'checking'
    };
  },
  mutations: {
    setApiStatus(state, status) {
      state.apiStatus = status;
    }
  },
  actions: {
    async checkApiStatus({ commit }) {
      try {
        const response = await fetch('/api/health');
        const health = await response.json();
        commit('setApiStatus', health.status ?? 'unknown');
      } catch {
        commit('setApiStatus', 'offline');
      }
    }
  }
});
