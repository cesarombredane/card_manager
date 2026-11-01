// import utils
import {
  parse_collection_data,
  parse_binders_data,
  parse_manual_image_data,
} from '../src/services/personal_validation';
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

// import types
import type { IncomingMessage, ServerResponse } from 'node:http';

export function personal_data_plugins(
  root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
) {
  const collection_path = resolve(root, 'data/collection.json');
  const empty_collection = {
    version: 2,
    folders: [],
    entries: [],
    manual_cards: [],
  };
  const binders_path = resolve(root, 'data/binders.json');
  const empty_binders = { version: 1, binders: [] };

  type Manual_Image_Entry = {
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
    url: string;
    updated_at: string;
  };

  type Manual_Images_Data = {
    version: 1;
    entries: Manual_Image_Entry[];
  };

  const manual_images_path = resolve(root, 'data/manual-images.json');
  const manual_images_root = resolve(root, 'public/images/manual');
  const empty_manual_images: Manual_Images_Data = { version: 1, entries: [] };
  const safe_id = (value: unknown): string => {
    const id = String(value ?? '');
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error('Invalid image identifier');
    return id;
  };
  const read_request_body = (req: IncomingMessage, maximum_bytes: number): Promise<string> =>
    new Promise((resolve_body, reject) => {
      let body = '';
      req.setEncoding('utf-8');
      req.on('data', (chunk: string) => {
        body += chunk;
        if (Buffer.byteLength(body, 'utf-8') > maximum_bytes) {
          reject(new Error('Uploaded image is too large'));
          req.destroy();
        }
      });
      req.on('end', () => resolve_body(body));
      req.on('error', reject);
    });
  const read_binary_request = (req: IncomingMessage, maximum_bytes: number): Promise<Buffer> =>
    new Promise((resolve_body, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maximum_bytes) {
          reject(new Error('Backup archive is too large'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve_body(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  const read_manual_images = async (): Promise<Manual_Images_Data> => {
    try {
      const parsed = JSON.parse(
        await readFile(manual_images_path, 'utf-8'),
      ) as Partial<Manual_Images_Data>;
      if (!Array.isArray(parsed.entries)) throw new Error('Invalid manual-images JSON');
      return { version: 1, entries: parsed.entries };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await mkdir(dirname(manual_images_path), { recursive: true });
      await writeFile(
        manual_images_path,
        `${JSON.stringify(empty_manual_images, null, 2)}\n`,
        'utf-8',
      );
      return { ...empty_manual_images, entries: [] };
    }
  };
  const write_manual_images = async (data: Manual_Images_Data): Promise<void> => {
    const temporary = `${manual_images_path}.tmp`;
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    await rename(temporary, manual_images_path);
  };

  const collection_api = () => {
    type Collection_Entity = Record<string, unknown> & { id: string };
    type Collection_Document = {
      version: number;
      folders: Collection_Entity[];
      entries: Collection_Entity[];
      manual_cards: Collection_Entity[];
    };
    let collection_write_queue: Promise<void> = Promise.resolve();

    const read_collection = async (): Promise<Collection_Document> => {
      try {
        const parsed = JSON.parse(await readFile(collection_path, 'utf-8')) as Collection_Document;
        if (
          !Array.isArray(parsed.folders) ||
          !Array.isArray(parsed.entries) ||
          !Array.isArray(parsed.manual_cards)
        ) {
          throw new Error('Invalid collection JSON');
        }
        return parsed;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        return structuredClone(empty_collection) as Collection_Document;
      }
    };

    const write_collection = async (data: Collection_Document): Promise<void> => {
      await mkdir(dirname(collection_path), { recursive: true });
      const temporary = `${collection_path}.tmp`;
      await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
      await rename(temporary, collection_path);
    };

    const same_entity = (left: Collection_Entity, right: Collection_Entity): boolean =>
      JSON.stringify(left) === JSON.stringify(right);

    const apply_entity_changes = (
      latest: Collection_Entity[],
      before: Collection_Entity[],
      after: Collection_Entity[],
    ): void => {
      const before_by_id = new Map(before.map((entity) => [entity.id, entity]));
      const after_by_id = new Map(after.map((entity) => [entity.id, entity]));

      for (const id of before_by_id.keys()) {
        if (after_by_id.has(id)) continue;
        const index = latest.findIndex((entity) => entity.id === id);
        if (index !== -1) latest.splice(index, 1);
      }

      for (const entity of after) {
        const previous = before_by_id.get(entity.id);
        if (previous && same_entity(previous, entity)) continue;
        const index = latest.findIndex((candidate) => candidate.id === entity.id);
        if (index === -1) latest.push(structuredClone(entity));
        else {
          const merged = structuredClone(latest[index]);
          for (const [key, value] of Object.entries(entity)) {
            if (!previous || JSON.stringify(value) !== JSON.stringify(previous[key])) {
              merged[key] = structuredClone(value);
            }
          }
          latest[index] = merged;
        }
      }
    };

    const entry_identity = (entry: Collection_Entity): string =>
      [
        entry.folder_id,
        entry.set_id,
        entry.card_id,
        entry.variant_id,
        entry.language_id,
        entry.condition,
        entry.wanted === true,
        entry.wanted === true && entry.strong_language === true,
      ].join(':');

    const apply_entry_changes = (
      latest: Collection_Entity[],
      before: Collection_Entity[],
      after: Collection_Entity[],
    ): void => {
      const before_by_id = new Map(before.map((entry) => [entry.id, entry]));
      const after_by_id = new Map(after.map((entry) => [entry.id, entry]));

      for (const id of before_by_id.keys()) {
        if (after_by_id.has(id)) continue;
        const index = latest.findIndex((entry) => entry.id === id);
        if (index !== -1) latest.splice(index, 1);
      }

      for (const entry of after) {
        const previous = before_by_id.get(entry.id);
        if (previous && same_entity(previous, entry)) continue;
        const latest_index = latest.findIndex((candidate) => candidate.id === entry.id);

        if (!previous) {
          const matching = latest.find(
            (candidate) => entry_identity(candidate) === entry_identity(entry),
          );
          if (matching) {
            matching.quantity = Number(matching.quantity ?? 0) + Number(entry.quantity ?? 0);
            matching.updated_at = entry.updated_at;
          } else {
            latest.push(structuredClone(entry));
          }
          continue;
        }

        if (latest_index === -1) {
          latest.push(structuredClone(entry));
          continue;
        }

        const quantity_delta = Number(entry.quantity ?? 0) - Number(previous.quantity ?? 0);
        const merged = structuredClone(latest[latest_index]);
        for (const [key, value] of Object.entries(entry)) {
          if (key !== 'quantity' && JSON.stringify(value) !== JSON.stringify(previous[key])) {
            merged[key] = structuredClone(value);
          }
        }
        merged.quantity = Math.max(1, Number(latest[latest_index].quantity ?? 0) + quantity_delta);
        latest[latest_index] = merged;
      }

      // Language edits and transfers may make two entries equivalent.
      const entries_by_identity = new Map<string, Collection_Entity>();
      for (const entry of [...latest]) {
        const identity = entry_identity(entry);
        const existing = entries_by_identity.get(identity);
        if (!existing) {
          entries_by_identity.set(identity, entry);
          continue;
        }
        existing.quantity = Number(existing.quantity ?? 0) + Number(entry.quantity ?? 0);
        existing.updated_at = entry.updated_at;
        latest.splice(latest.indexOf(entry), 1);
      }
    };

    const apply_collection_delta = async (
      before: Collection_Document,
      after: Collection_Document,
    ): Promise<void> => {
      const latest = await read_collection();
      apply_entity_changes(latest.folders, before.folders, after.folders);
      apply_entity_changes(latest.manual_cards, before.manual_cards, after.manual_cards);
      apply_entry_changes(latest.entries, before.entries, after.entries);
      latest.version = Math.max(Number(latest.version) || 2, Number(after.version) || 2);
      await write_collection(latest);
    };

    const middleware = (req: IncomingMessage, reply: ServerResponse, next: () => void): void => {
      if (req.url === '/api/collection/operations' && req.method === 'POST') {
        reply.setHeader('Content-Type', 'application/json; charset=utf-8');
        read_request_body(req, 20_000_000)
          .then((res) => {
            const payload = JSON.parse(res) as {
              before?: Collection_Document;
              after?: Collection_Document;
            };
            if (
              !payload.before ||
              !payload.after ||
              !Array.isArray(payload.before.entries) ||
              !Array.isArray(payload.after.entries) ||
              !Array.isArray(payload.before.folders) ||
              !Array.isArray(payload.after.folders) ||
              !Array.isArray(payload.before.manual_cards) ||
              !Array.isArray(payload.after.manual_cards)
            )
              throw new Error('Invalid collection operation');
            parse_collection_data(payload.before);
            parse_collection_data(payload.after);
            collection_write_queue = collection_write_queue
              .catch(() => undefined)
              .then(() => apply_collection_delta(payload.before!, payload.after!));
            return collection_write_queue;
          })
          .then(() => {
            reply.end(JSON.stringify({ ok: true }));
          })
          .catch((err) => {
            reply.statusCode = 400;
            reply.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          });
        return;
      }

      if (req.url !== '/api/collection') {
        next();
        return;
      }

      reply.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.method === 'GET') {
        readFile(collection_path, 'utf-8')
          .then((res) => reply.end(res))
          .catch(async (err) => {
            if (err.code !== 'ENOENT') {
              reply.statusCode = 500;
              reply.end(JSON.stringify({ error: err.message }));
              return;
            }
            await mkdir(dirname(collection_path), { recursive: true });
            const contents = `${JSON.stringify(empty_collection, null, 2)}\n`;
            await writeFile(collection_path, contents, 'utf-8');
            reply.end(contents);
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
            const parsed = parse_collection_data(JSON.parse(body));
            if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.entries)) {
              throw new Error('Invalid collection JSON');
            }
            collection_write_queue = collection_write_queue
              .catch(() => undefined)
              .then(() => write_collection(parsed as Collection_Document));
            await collection_write_queue;
            reply.end(JSON.stringify({ ok: true }));
          } catch (error) {
            reply.statusCode = 400;
            reply.end(
              JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
            );
          }
        });
        return;
      }

      reply.statusCode = 405;
      reply.end(JSON.stringify({ error: 'Method not allowed' }));
    };

    return {
      name: 'collection-json-api',
      configureServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) {
        server.middlewares.use(middleware);
      },
      configurePreviewServer(server: {
        middlewares: { use: (handler: typeof middleware) => void };
      }) {
        server.middlewares.use(middleware);
      },
    };
  };

  const binders_api = () => {
    const middleware = (req: IncomingMessage, reply: ServerResponse, next: () => void): void => {
      if (req.url !== '/api/binders') {
        next();
        return;
      }
      reply.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.method === 'GET') {
        readFile(binders_path, 'utf-8')
          .then((res) => reply.end(res))
          .catch(async (err) => {
            if (err.code !== 'ENOENT') {
              reply.statusCode = 500;
              reply.end(JSON.stringify({ error: err.message }));
              return;
            }
            await writeFile(binders_path, `${JSON.stringify(empty_binders, null, 2)}\n`, 'utf-8');
            reply.end(JSON.stringify(empty_binders));
          });
        return;
      }
      if (req.method === 'PUT') {
        read_request_body(req, 10_000_000)
          .then(async (res) => {
            const parsed = JSON.parse(res) as { binders?: unknown[] };
            parse_binders_data(parsed);
            const temporary = `${binders_path}.tmp`;
            await writeFile(temporary, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');
            await rename(temporary, binders_path);
            reply.end(JSON.stringify({ ok: true }));
          })
          .catch((err) => {
            reply.statusCode = 400;
            reply.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          });
        return;
      }
      reply.statusCode = 405;
      reply.end(JSON.stringify({ error: 'Method not allowed' }));
    };
    return {
      name: 'binders-json-api',
      configureServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) {
        server.middlewares.use(middleware);
      },
      configurePreviewServer(server: {
        middlewares: { use: (handler: typeof middleware) => void };
      }) {
        server.middlewares.use(middleware);
      },
    };
  };

  const personal_data_api = () => {
    const middleware = (req: IncomingMessage, reply: ServerResponse, next: () => void): void => {
      if (req.url === '/api/personal-data/export' && req.method === 'GET') {
        Promise.all([
          readFile(collection_path).catch(() =>
            Buffer.from(`${JSON.stringify(empty_collection, null, 2)}\n`),
          ),
          readFile(binders_path).catch(() =>
            Buffer.from(`${JSON.stringify(empty_binders, null, 2)}\n`),
          ),
          readFile(manual_images_path).catch(() =>
            Buffer.from(`${JSON.stringify(empty_manual_images, null, 2)}\n`),
          ),
        ])
          .then(async ([collection, binders, manual_images]) => {
            const archive = new AdmZip();
            archive.addFile(
              'manifest.json',
              Buffer.from(
                `${JSON.stringify(
                  {
                    format: 'card-manager-personal-data',
                    version: 1,
                    exported_at: new Date().toISOString(),
                  },
                  null,
                  2,
                )}\n`,
              ),
            );
            archive.addFile('data/collection.json', collection);
            archive.addFile('data/binders.json', binders);
            archive.addFile('data/manual-images.json', manual_images);
            await mkdir(manual_images_root, { recursive: true });
            archive.addLocalFolder(
              manual_images_root,
              'images/manual',
              (filename) => !filename.startsWith('.'),
            );
            const contents = archive.toBuffer();
            const date = new Date().toISOString().slice(0, 10);
            reply.statusCode = 200;
            reply.setHeader('Content-Type', 'application/zip');
            reply.setHeader(
              'Content-Disposition',
              `attachment; filename="card-manager-backup-${date}.zip"`,
            );
            reply.setHeader('Content-Length', String(contents.length));
            reply.end(contents);
          })
          .catch((err) => {
            reply.statusCode = 500;
            reply.setHeader('Content-Type', 'application/json; charset=utf-8');
            reply.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          });
        return;
      }

      if (req.url === '/api/personal-data/import' && req.method === 'POST') {
        read_binary_request(req, 300_000_000)
          .then(async (res) => {
            const archive = new AdmZip(res);
            const entries = archive.getEntries();
            for (const entry of entries) {
              const parts = entry.entryName.replaceAll('\\', '/').split('/');
              if (entry.entryName.startsWith('/') || parts.includes('..'))
                throw new Error('Backup contains an unsafe path');
            }
            const required_file = (name: string): Buffer => {
              const entry = archive.getEntry(name);
              if (!entry || entry.isDirectory) throw new Error(`Backup is missing ${name}`);
              return entry.getData();
            };
            const manifest = JSON.parse(required_file('manifest.json').toString('utf-8')) as Record<
              string,
              unknown
            >;
            if (manifest.format !== 'card-manager-personal-data' || manifest.version !== 1) {
              throw new Error('This is not a supported Card Manager backup');
            }
            const collection = JSON.parse(
              required_file('data/collection.json').toString('utf-8'),
            ) as Record<string, unknown>;
            const binders = JSON.parse(
              required_file('data/binders.json').toString('utf-8'),
            ) as Record<string, unknown>;
            const manual_images = JSON.parse(
              required_file('data/manual-images.json').toString('utf-8'),
            ) as Record<string, unknown>;
            if (
              !Array.isArray(collection.folders) ||
              !Array.isArray(collection.entries) ||
              !Array.isArray(collection.manual_cards)
            ) {
              throw new Error('Backup contains invalid collection data');
            }
            if (!Array.isArray(binders.binders))
              throw new Error('Backup contains invalid binder data');
            if (!Array.isArray(manual_images.entries))
              throw new Error('Backup contains invalid manual image data');

            parse_collection_data(collection);
            parse_binders_data(binders);
            parse_manual_image_data(manual_images);

            const import_id = Date.now().toString(36);
            const staged_images = resolve(root, `public/images/manual.import-${import_id}`);
            const backup_images = resolve(root, `public/images/manual.backup-${import_id}`);
            await mkdir(staged_images, { recursive: true });
            for (const entry of entries) {
              if (entry.isDirectory || !entry.entryName.startsWith('images/manual/')) continue;
              const relative = entry.entryName.slice('images/manual/'.length);
              if (!relative) continue;
              const destination = resolve(staged_images, relative);
              if (!destination.startsWith(`${staged_images}/`))
                throw new Error('Backup contains an unsafe image path');
              await mkdir(dirname(destination), { recursive: true });
              await writeFile(destination, entry.getData());
            }

            let previous_images_moved = false;
            try {
              await rename(manual_images_root, backup_images);
              previous_images_moved = true;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            }
            try {
              await rename(staged_images, manual_images_root);
              const writes: Array<[string, Record<string, unknown>]> = [
                [collection_path, collection],
                [binders_path, binders],
                [manual_images_path, manual_images],
              ];
              for (const [path, data] of writes) {
                const temporary = `${path}.import.tmp`;
                await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
                await rename(temporary, path);
              }
              if (previous_images_moved) await rm(backup_images, { recursive: true, force: true });
            } catch (error) {
              await rm(manual_images_root, { recursive: true, force: true });
              if (previous_images_moved) await rename(backup_images, manual_images_root);
              throw error;
            }
            reply.setHeader('Content-Type', 'application/json; charset=utf-8');
            reply.end(JSON.stringify({ ok: true }));
          })
          .catch((err) => {
            reply.statusCode = 400;
            reply.setHeader('Content-Type', 'application/json; charset=utf-8');
            reply.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
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
      configurePreviewServer(server: {
        middlewares: { use: (handler: typeof middleware) => void };
      }) {
        server.middlewares.use(middleware);
      },
    };
  };

  const manual_images_api = () => {
    const middleware = (req: IncomingMessage, reply: ServerResponse, next: () => void): void => {
      if (req.url !== '/api/manual-images') {
        next();
        return;
      }
      reply.setHeader('Content-Type', 'application/json; charset=utf-8');

      if (req.method === 'GET') {
        read_manual_images()
          .then((res) => reply.end(JSON.stringify(res)))
          .catch((err) => {
            reply.statusCode = 500;
            reply.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          });
        return;
      }

      if (req.method === 'PUT') {
        read_request_body(req, 22_000_000)
          .then(async (res) => {
            const input = JSON.parse(res) as Record<string, unknown>;
            const set_id = safe_id(input.set_id);
            const card_id = safe_id(input.card_id);
            const variant_id = safe_id(input.variant_id);
            const language_id = safe_id(input.language_id);
            const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(
              String(input.data_url ?? ''),
            );
            if (!match) throw new Error('Only JPEG, PNG, and WebP images are supported');
            const extension = match[1] === 'image/jpeg' ? '.jpg' : `.${match[1].slice(6)}`;
            const contents = Buffer.from(match[2], 'base64');
            if (contents.length === 0 || contents.length > 15_000_000)
              throw new Error('Image must be smaller than 15 MB');

            const directory = resolve(manual_images_root, set_id, card_id, variant_id);
            const file_path = resolve(directory, `${language_id}${extension}`);
            const url = `/images/manual/${set_id}/${card_id}/${variant_id}/${language_id}${extension}`;
            const data = await read_manual_images();
            const existing = data.entries.find(
              (entry) =>
                entry.set_id === set_id &&
                entry.card_id === card_id &&
                entry.variant_id === variant_id &&
                entry.language_id === language_id,
            );
            await mkdir(directory, { recursive: true });
            await writeFile(file_path, contents);
            if (existing && existing.url !== url) {
              await unlink(resolve(root, 'public', existing.url.replace(/^\//, ''))).catch(
                () => undefined,
              );
            }
            const entry = {
              set_id: set_id,
              card_id: card_id,
              variant_id: variant_id,
              language_id: language_id,
              url,
              updated_at: new Date().toISOString(),
            };
            if (existing) Object.assign(existing, entry);
            else data.entries.push(entry);
            await write_manual_images(data);
            reply.end(JSON.stringify(entry));
          })
          .catch((err) => {
            reply.statusCode = 400;
            reply.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          });
        return;
      }

      if (req.method === 'DELETE') {
        read_request_body(req, 20_000)
          .then(async (res) => {
            const input = JSON.parse(res) as Record<string, unknown>;
            const ids = [
              safe_id(input.set_id),
              safe_id(input.card_id),
              safe_id(input.variant_id),
              safe_id(input.language_id),
            ];
            const data = await read_manual_images();
            const index = data.entries.findIndex(
              (entry) =>
                entry.set_id === ids[0] &&
                entry.card_id === ids[1] &&
                entry.variant_id === ids[2] &&
                entry.language_id === ids[3],
            );
            if (index !== -1) {
              const [entry] = data.entries.splice(index, 1);
              await unlink(resolve(root, 'public', entry.url.replace(/^\//, ''))).catch(
                () => undefined,
              );
              await write_manual_images(data);
            }
            reply.end(JSON.stringify({ ok: true }));
          })
          .catch((err) => {
            reply.statusCode = 400;
            reply.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          });
        return;
      }

      reply.statusCode = 405;
      reply.end(JSON.stringify({ error: 'Method not allowed' }));
    };
    return {
      name: 'manual-images-api',
      configureServer(server: { middlewares: { use: (handler: typeof middleware) => void } }) {
        server.middlewares.use(middleware);
      },
      configurePreviewServer(server: {
        middlewares: { use: (handler: typeof middleware) => void };
      }) {
        server.middlewares.use(middleware);
      },
    };
  };

  return [collection_api(), binders_api(), personal_data_api(), manual_images_api()];
}
