/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}

declare module 'vuex' {
  export function createStore<State>(options: any): any;
  export function useStore<State = any>(): {
    state: State;
  } & Record<string, any>;
}
