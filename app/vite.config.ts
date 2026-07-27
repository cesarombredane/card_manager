import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import AdmZip from 'adm-zip';

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
const readBinaryRequest = (
  req: import('node:http').IncomingMessage,
  maximumBytes: number
): Promise<Buffer> => new Promise((resolveBody, reject) => {
  const chunks: Buffer[] = [];
  let size = 0;
  req.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > maximumBytes) {
      reject(new Error('Backup archive is too large'));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => resolveBody(Buffer.concat(chunks)));
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

const personalDataApi = () => {
  const middleware = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void): void => {
    if (req.url === '/api/personal-data/export' && req.method === 'GET') {
      Promise.all([
        readFile(collectionPath).catch(() => Buffer.from(`${JSON.stringify(emptyCollection, null, 2)}\n`)),
        readFile(bindersPath).catch(() => Buffer.from(`${JSON.stringify(emptyBinders, null, 2)}\n`)),
        readFile(manualImagesPath).catch(() => Buffer.from(`${JSON.stringify(emptyManualImages, null, 2)}\n`))
      ]).then(async ([collection, binders, manualImages]) => {
        const archive = new AdmZip();
        archive.addFile('manifest.json', Buffer.from(`${JSON.stringify({
          format: 'card-manager-personal-data',
          version: 1,
          exported_at: new Date().toISOString()
        }, null, 2)}\n`));
        archive.addFile('data/collection.json', collection);
        archive.addFile('data/binders.json', binders);
        archive.addFile('data/manual-images.json', manualImages);
        await mkdir(manualImagesRoot, { recursive: true });
        archive.addLocalFolder(manualImagesRoot, 'images/manual', (filename) => !filename.startsWith('.'));
        const contents = archive.toBuffer();
        const date = new Date().toISOString().slice(0, 10);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="card-manager-backup-${date}.zip"`);
        res.setHeader('Content-Length', String(contents.length));
        res.end(contents);
      }).catch((error: unknown) => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      });
      return;
    }

    if (req.url === '/api/personal-data/import' && req.method === 'POST') {
      readBinaryRequest(req, 300_000_000).then(async (contents) => {
        const archive = new AdmZip(contents);
        const entries = archive.getEntries();
        for (const entry of entries) {
          const parts = entry.entryName.replaceAll('\\', '/').split('/');
          if (entry.entryName.startsWith('/') || parts.includes('..')) throw new Error('Backup contains an unsafe path');
        }
        const requiredFile = (name: string): Buffer => {
          const entry = archive.getEntry(name);
          if (!entry || entry.isDirectory) throw new Error(`Backup is missing ${name}`);
          return entry.getData();
        };
        const manifest = JSON.parse(requiredFile('manifest.json').toString('utf-8')) as Record<string, unknown>;
        if (manifest.format !== 'card-manager-personal-data' || manifest.version !== 1) {
          throw new Error('This is not a supported Card Manager backup');
        }
        const collection = JSON.parse(requiredFile('data/collection.json').toString('utf-8')) as Record<string, unknown>;
        const binders = JSON.parse(requiredFile('data/binders.json').toString('utf-8')) as Record<string, unknown>;
        const manualImages = JSON.parse(requiredFile('data/manual-images.json').toString('utf-8')) as Record<string, unknown>;
        if (!Array.isArray(collection.folders) || !Array.isArray(collection.entries) || !Array.isArray(collection.manual_cards)) {
          throw new Error('Backup contains invalid collection data');
        }
        if (!Array.isArray(binders.binders)) throw new Error('Backup contains invalid binder data');
        if (!Array.isArray(manualImages.entries)) throw new Error('Backup contains invalid manual image data');

        const importId = Date.now().toString(36);
        const stagedImages = resolve(__dirname, `public/images/manual.import-${importId}`);
        const backupImages = resolve(__dirname, `public/images/manual.backup-${importId}`);
        await mkdir(stagedImages, { recursive: true });
        for (const entry of entries) {
          if (entry.isDirectory || !entry.entryName.startsWith('images/manual/')) continue;
          const relative = entry.entryName.slice('images/manual/'.length);
          if (!relative) continue;
          const destination = resolve(stagedImages, relative);
          if (!destination.startsWith(`${stagedImages}/`)) throw new Error('Backup contains an unsafe image path');
          await mkdir(dirname(destination), { recursive: true });
          await writeFile(destination, entry.getData());
        }

        let previousImagesMoved = false;
        try {
          await rename(manualImagesRoot, backupImages);
          previousImagesMoved = true;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        try {
          await rename(stagedImages, manualImagesRoot);
          const writes: Array<[string, Record<string, unknown>]> = [
            [collectionPath, collection],
            [bindersPath, binders],
            [manualImagesPath, manualImages]
          ];
          for (const [path, data] of writes) {
            const temporary = `${path}.import.tmp`;
            await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
            await rename(temporary, path);
          }
          if (previousImagesMoved) await rm(backupImages, { recursive: true, force: true });
        } catch (error) {
          await rm(manualImagesRoot, { recursive: true, force: true });
          if (previousImagesMoved) await rename(backupImages, manualImagesRoot);
          throw error;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: true }));
      }).catch((error: unknown) => {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      });
      return;
    }
    next();
  };
  return {
    name: 'personal-data-backup-api',
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
    personalDataApi(),
    manualImagesApi()
  ],
  server: {
    port: 5173
  }
});
