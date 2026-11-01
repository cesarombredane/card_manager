import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { write_json } from '../scripts/runtime';
const root = mkdtempSync(join(tmpdir(), 'card-manager-browser-'));
write_json(join(root, 'data/collection.json'), {
  version: 2,
  folders: [],
  entries: [],
  manual_cards: [],
});
write_json(join(root, 'data/binders.json'), { version: 1, binders: [] });
write_json(join(root, 'data/manual-images.json'), { version: 1, entries: [] });
process.env.CARD_MANAGER_TEST_ROOT = root;
const server = await createServer({
  root: resolve('frontend'),
  configFile: resolve('frontend/vite.config.ts'),
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
});
await server.listen();
const shutdown = async () => {
  await server.close();
  rmSync(root, { recursive: true, force: true });
  process.exit(0);
};
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
