import { createApp } from 'vue';
import { Dark, Quasar } from 'quasar';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';

import App from './App.vue';
import { router } from './router';
import { store } from './store';

Dark.set(true);

createApp(App)
  .use(Quasar, {
    config: {
      dark: true,
      brand: {
        primary: '#f1c748',
        secondary: '#9c9c9c',
        dark: '#050505'
      }
    }
  })
  .use(router)
  .use(store)
  .mount('#app');
