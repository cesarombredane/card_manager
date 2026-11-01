// import styles
// Preserve stylesheet precedence.
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import './styles/app.scss';

// import hooks
import { Dark, Quasar } from 'quasar';
import { createApp } from 'vue';

// import components
import App from './App.vue';

// import utils
import { store, store_key } from './store/index';
import { router } from './router/index';
import './store/modules/collection';
import './store/modules/binders';

// Preserve icon, Quasar and application stylesheet precedence.

Dark.set(true);

createApp(App)
  .use(Quasar, {
    config: {
      dark: true,
    },
  })
  .use(router)
  .use(store, store_key)
  .mount('#app');
