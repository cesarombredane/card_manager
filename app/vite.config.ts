import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const collectionPath = resolve(__dirname, 'data/collection.json');
const emptyCollection = {
  version: 1,
  folders: [{ id: 'main', name: 'Main collection', created_at: new Date().toISOString() }],
  entries: []
};

const collectionApi = () => {
  const middleware = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void): void => {
    if (req.url !== '/api/collection') {
      next();
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.method === 'GET') {
      readFile(collectionPath, 'utf-8')
        .then((contents) => res.end(contents))
        .catch(async (error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
            return;
          }
          await mkdir(dirname(collectionPath), { recursive: true });
          const contents = `${JSON.stringify(emptyCollection, null, 2)}\n`;
          await writeFile(collectionPath, contents, 'utf-8');
          res.end(contents);
        });
      return;
    }

    if (req.method === 'PUT') {
      let body = '';
      req.setEncoding('utf-8');
      req.on('data', (chunk: string) => {
        body += chunk;
        if (body.length > 10_000_000) req.destroy();
      });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.entries)) {
            throw new Error('Invalid collection JSON');
          }
          const temporary = `${collectionPath}.tmp`;
          await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');
          await rename(temporary, collectionPath);
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
      });
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  };

  return {
    name: 'collection-json-api',
    configureServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) {
      server.middlewares.use(middleware);
    }
  };
};

export default defineConfig({
  plugins: [
    vue({
      template: {
        transformAssetUrls
      }
    }),
    quasar(),
    collectionApi()
  ],
  server: {
    port: 5173
  }
});
