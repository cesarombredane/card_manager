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
      dark: true
    }
  })
  .use(router)
  .use(store)
  .mount('#app');
