// import styles
// Preserve icon, Quasar and application stylesheet precedence.
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import './styles/theme.scss';
import { createApp } from 'vue';
import { Dark, Quasar } from 'quasar';

import App from './App.vue';
import { router } from './router/index';
import { store } from './store/index';

Dark.set(true);

createApp(App)
  .use(Quasar, {
    config: {
      dark: true,
    },
  })
  .use(router)
  .use(store)
  .mount('#app');
