// import utils
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { personal_data_plugins } from './server/personal_data';

// import types
import type { Plugin } from 'vite';

const frontend_root = dirname(fileURLToPath(import.meta.url));
const fixture_root = process.env.CARD_MANAGER_FIXTURE_ROOT;
const catalog_source = resolve(frontend_root, 'src/services/catalog_storage.ts');

// Only verification builds redirect the catalog. Normal builds retain the existing paths.
const fixture_catalog: Plugin = {
  name: 'fixture_catalog',
  enforce: 'pre',
  transform(code, id) {
    if (!fixture_root || id.split('?')[0] !== catalog_source) return;
    const fixture_data = relative(
      dirname(catalog_source),
      resolve(fixture_root, 'data'),
    ).replaceAll('\\', '/');
    return { code: code.replaceAll('../../data/', `${fixture_data}/`), map: null };
  },
};

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  publicDir: fixture_root ? false : 'public',
  plugins: [
    fixture_catalog,
    vue({ template: { transformAssetUrls } }),
    quasar({ sassVariables: resolve(frontend_root, 'src/styles/quasar_variables.sass') }),
    ...personal_data_plugins(fixture_root || process.env.CARD_MANAGER_TEST_ROOT),
  ],
  resolve: { alias: { '@': resolve(frontend_root, 'src') } },
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1' },
  build: fixture_root ? { outDir: resolve(fixture_root, 'dist'), emptyOutDir: true } : undefined,
});
