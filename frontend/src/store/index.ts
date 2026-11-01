// import hooks
import { useStore } from 'vuex';

// import types
import type { InjectionKey } from 'vue';
import type { App_State } from './core';
import type { Store } from 'vuex';

export { store } from './core';
export type {
  App_State,
  Card_Search_Filters,
  Card_Search_Region,
  Collection_Folder_Filters,
} from './core';
export const store_key: InjectionKey<Store<App_State>> = Symbol('card_manager_store');
export function use_store(): Store<App_State> {
  return useStore(store_key);
}
