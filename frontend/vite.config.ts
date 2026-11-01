import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { personal_data_plugins } from './server/personal_data';

export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar({
      sassVariables: fileURLToPath(new URL('./src/styles/quasar_variables.sass', import.meta.url)),
    }),
    ...personal_data_plugins(process.env.CARD_MANAGER_TEST_ROOT),
  ],
  server: { port: 5173 },
});
