import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const collectionPath = resolve(__dirname, 'data/collection.json');
const emptyCollection = {
  version: 2,
  folders: [{ id: 'main', name: 'Main collection', created_at: new Date().toISOString() }],
  entries: [],
  manual_cards: []
};
const bindersPath = resolve(__dirname, 'data/binders.json');
const emptyBinders = { version: 1, binders: [] };

type ManualImageEntry = {
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
  url: string;
  updated_at: string;
};

type ManualImagesData = {
  version: 1;
  entries: ManualImageEntry[];
};

const manualImagesPath = resolve(__dirname, 'data/manual-images.json');
const manualImagesRoot = resolve(__dirname, 'public/images/manual');
const emptyManualImages: ManualImagesData = { version: 1, entries: [] };
const safeId = (value: unknown): string => {
  const id = String(value ?? '');
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error('Invalid image identifier');
  return id;
};
const readRequestBody = (
  req: import('node:http').IncomingMessage,
  maximumBytes: number
): Promise<string> => new Promise((resolveBody, reject) => {
  let body = '';
  req.setEncoding('utf-8');
  req.on('data', (chunk: string) => {
    body += chunk;
    if (Buffer.byteLength(body, 'utf-8') > maximumBytes) {
      reject(new Error('Uploaded image is too large'));
      req.destroy();
    }
  });
  req.on('end', () => resolveBody(body));
  req.on('error', reject);
});
const readManualImages = async (): Promise<ManualImagesData> => {
  try {
    const parsed = JSON.parse(await readFile(manualImagesPath, 'utf-8')) as Partial<ManualImagesData>;
    if (!Array.isArray(parsed.entries)) throw new Error('Invalid manual-images JSON');
    return { version: 1, entries: parsed.entries };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await mkdir(dirname(manualImagesPath), { recursive: true });
    await writeFile(manualImagesPath, `${JSON.stringify(emptyManualImages, null, 2)}\n`, 'utf-8');
    return { ...emptyManualImages, entries: [] };
  }
};
const writeManualImages = async (data: ManualImagesData): Promise<void> => {
  const temporary = `${manualImagesPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  await rename(temporary, manualImagesPath);
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

const bindersApi = () => {
  const middleware = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void): void => {
    if (req.url !== '/api/binders') {
      next();
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.method === 'GET') {
      readFile(bindersPath, 'utf-8')
        .then((contents) => res.end(contents))
        .catch(async (error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
            return;
          }
          await writeFile(bindersPath, `${JSON.stringify(emptyBinders, null, 2)}\n`, 'utf-8');
          res.end(JSON.stringify(emptyBinders));
        });
      return;
    }
    if (req.method === 'PUT') {
      readRequestBody(req, 10_000_000).then(async (body) => {
        const parsed = JSON.parse(body) as { binders?: unknown[] };
        if (!Array.isArray(parsed.binders)) throw new Error('Invalid binders JSON');
        const temporary = `${bindersPath}.tmp`;
        await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');
        await rename(temporary, bindersPath);
        res.end(JSON.stringify({ ok: true }));
      }).catch((error: unknown) => {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      });
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  };
  return {
    name: 'binders-json-api',
    configureServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) {
      server.middlewares.use(middleware);
    }
  };
};

const manualImagesApi = () => {
  const middleware = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void): void => {
    if (req.url !== '/api/manual-images') {
      next();
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'GET') {
      readManualImages()
        .then((data) => res.end(JSON.stringify(data)))
        .catch((error: unknown) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        });
      return;
    }

    if (req.method === 'PUT') {
      readRequestBody(req, 22_000_000).then(async (body) => {
        const input = JSON.parse(body) as Record<string, unknown>;
        const setId = safeId(input.set_id);
        const cardId = safeId(input.card_id);
        const variantId = safeId(input.variant_id);
        const languageId = safeId(input.language_id);
        const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(String(input.data_url ?? ''));
        if (!match) throw new Error('Only JPEG, PNG, and WebP images are supported');
        const extension = match[1] === 'image/jpeg' ? '.jpg' : `.${match[1].slice(6)}`;
        const contents = Buffer.from(match[2], 'base64');
        if (contents.length === 0 || contents.length > 15_000_000) throw new Error('Image must be smaller than 15 MB');

        const directory = resolve(manualImagesRoot, setId, cardId, variantId);
        const filePath = resolve(directory, `${languageId}${extension}`);
        const url = `/images/manual/${setId}/${cardId}/${variantId}/${languageId}${extension}`;
        const data = await readManualImages();
        const existing = data.entries.find((entry) =>
          entry.set_id === setId
          && entry.card_id === cardId
          && entry.variant_id === variantId
          && entry.language_id === languageId
        );
        await mkdir(directory, { recursive: true });
        await writeFile(filePath, contents);
        if (existing && existing.url !== url) {
          await unlink(resolve(__dirname, 'public', existing.url.replace(/^\//, ''))).catch(() => undefined);
        }
        const entry = {
          set_id: setId,
          card_id: cardId,
          variant_id: variantId,
          language_id: languageId,
          url,
          updated_at: new Date().toISOString()
        };
        if (existing) Object.assign(existing, entry);
        else data.entries.push(entry);
        await writeManualImages(data);
        res.end(JSON.stringify(entry));
      }).catch((error: unknown) => {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      });
      return;
    }

    if (req.method === 'DELETE') {
      readRequestBody(req, 20_000).then(async (body) => {
        const input = JSON.parse(body) as Record<string, unknown>;
        const ids = [safeId(input.set_id), safeId(input.card_id), safeId(input.variant_id), safeId(input.language_id)];
        const data = await readManualImages();
        const index = data.entries.findIndex((entry) =>
          entry.set_id === ids[0] && entry.card_id === ids[1]
          && entry.variant_id === ids[2] && entry.language_id === ids[3]
        );
        if (index !== -1) {
          const [entry] = data.entries.splice(index, 1);
          await unlink(resolve(__dirname, 'public', entry.url.replace(/^\//, ''))).catch(() => undefined);
          await writeManualImages(data);
        }
        res.end(JSON.stringify({ ok: true }));
      }).catch((error: unknown) => {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      });
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  };
  return {
    name: 'manual-images-api',
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
    collectionApi(),
    bindersApi(),
    manualImagesApi()
  ],
  server: {
    port: 5173
  }
});
