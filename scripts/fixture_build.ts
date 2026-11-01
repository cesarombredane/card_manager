// import utils
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { write_json, project_root } from './runtime';
import { join, resolve } from 'node:path';
import { build, preview } from 'vite';
import { tmpdir } from 'node:os';

const fixture_root = mkdtempSync(join(tmpdir(), 'card-manager-verification-'));
const fixture_catalog = JSON.parse(
  readFileSync(join(project_root, 'tests/fixtures/expected_catalog.json'), 'utf8'),
) as Record<string, unknown>;
for (const [name, value] of Object.entries(fixture_catalog))
  write_json(join(fixture_root, 'data', name), value);
write_json(join(fixture_root, 'data/collection.json'), {
  version: 2,
  folders: [],
  entries: [],
  manual_cards: [],
});
write_json(join(fixture_root, 'data/binders.json'), { version: 1, binders: [] });
write_json(join(fixture_root, 'data/manual-images.json'), { version: 1, entries: [] });
process.env.CARD_MANAGER_FIXTURE_ROOT = fixture_root;

try {
  await build({
    root: resolve(project_root, 'frontend'),
    configFile: resolve(project_root, 'frontend/vite.config.ts'),
  });
  if (process.argv.includes('--serve')) {
    const server = await preview({
      root: resolve(project_root, 'frontend'),
      configFile: resolve(project_root, 'frontend/vite.config.ts'),
      preview: { host: '127.0.0.1', port: 4173, strictPort: true },
    });
    await new Promise<void>((resolve_shutdown) => {
      const shutdown = () => {
        server.httpServer.close(() => resolve_shutdown());
      };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    });
  }
} finally {
  rmSync(fixture_root, { recursive: true, force: true });
}
