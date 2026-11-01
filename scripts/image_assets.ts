import { appendFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { read_json, write_json, set_paths } from './runtime';
import { log, Progress } from './update_logging';
import type { Card, Set as Card_Set } from '../frontend/src/models/catalog';
export const image_workers = 8,
  request_timeout = 30;
export class Http_Error extends Error {
  constructor(
    public status: number,
    public response_body: string,
    message = `HTTP Error ${status}`,
  ) {
    super(message);
    this.name = 'HTTPError';
  }
}
export class Network_Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'URLError';
  }
}
export function safe_filename(value: unknown): string {
  return (
    String(value || 'unknown')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '') || 'unknown'
  );
}
export function existing_image(base: string): string | null {
  const path = `${extname(base) ? base.slice(0, -extname(base).length) : base}.webp`;
  return existsSync(path) ? path : null;
}
export function asset_url(
  language: string,
  series: string,
  set: string,
  ...names: string[]
): string {
  if (language === 'zh-CN') language = 'zh-cn';
  return `https://assets.tcgdex.net/${[language, series, set, ...names].map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)).join('/')}`;
}
export async function download_webp(
  url: string,
  destination: string,
  timeout: number,
): Promise<void> {
  if (existsSync(destination)) return;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'image/webp', 'User-Agent': 'card-manager-tcgdex-sync/2.0' },
      signal: AbortSignal.timeout(timeout * 1000),
    });
  } catch (err) {
    throw new Network_Error(err instanceof Error ? err.message : String(err));
  }
  if (!response.ok) {
    const reader = response.body?.getReader();
    let body = Buffer.alloc(0);
    try {
      while (reader && body.length < 2048) {
        const { done, value } = await reader.read();
        if (done) break;
        body = Buffer.concat([body, Buffer.from(value).subarray(0, 2048 - body.length)]);
      }
    } finally {
      await reader?.cancel();
    }
    throw new Http_Error(
      response.status,
      body.toString('utf8'),
      `HTTP Error ${response.status}: ${response.statusText}`,
    );
  }
  let payload: Buffer;
  try {
    payload = Buffer.from(await response.arrayBuffer());
  } catch (err) {
    throw new Network_Error(String(err));
  }
  if (
    payload.length < 12 ||
    payload.subarray(0, 4).toString() !== 'RIFF' ||
    payload.subarray(8, 12).toString() !== 'WEBP'
  )
    throw new Error('response is not WebP');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(`${destination}.tmp`, payload);
  renameSync(`${destination}.tmp`, destination);
}
export type Image_Event = {
  timestamp: string;
  url: string;
  destination: string;
  attempt: number;
  elapsed_seconds: number;
  status: string;
  http_status: number | null;
  error_type?: string;
  error?: string;
  response_body?: string;
};
export type Download_Dependencies = {
  download: typeof download_webp;
  sleep: (milliseconds: number) => Promise<void>;
};
export async function download_asset(
  url: string,
  destination: string,
  timeout: number,
  record: (event: Image_Event) => void,
  fallback_urls: string[],
  dependencies: Download_Dependencies = {
    download: download_webp,
    sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  },
): Promise<void> {
  const urls = [url, ...fallback_urls];
  for (const [index, candidate] of urls.entries())
    for (let attempt = 1; attempt <= 3; attempt++) {
      const started = performance.now();
      let failure: unknown;
      try {
        await dependencies.download(candidate, destination, timeout);
      } catch (err) {
        failure = err;
      }
      const status = failure instanceof Http_Error ? failure.status : null;
      const retryable =
        failure instanceof Http_Error
          ? [408, 429, 500, 502, 503, 504].includes(failure.status)
          : failure instanceof Network_Error;
      const retry = failure !== undefined && retryable && attempt < 3,
        fallback = status === 404 && index + 1 < urls.length;
      const event: Image_Event = {
        timestamp: new Date().toISOString(),
        url: candidate,
        destination,
        attempt,
        elapsed_seconds: Math.round(performance.now() - started) / 1000,
        status:
          failure === undefined
            ? 'downloaded'
            : retry
              ? 'retry'
              : fallback
                ? 'fallback'
                : status === 404
                  ? 'unavailable'
                  : 'failed',
        http_status: status,
      };
      if (failure !== undefined) {
        event.error_type = failure instanceof Error ? failure.name : 'Error';
        event.error = failure instanceof Error ? failure.message : String(failure);
        if (failure instanceof Http_Error)
          event.response_body = Buffer.from(failure.response_body)
            .subarray(0, 2048)
            .toString('utf8');
      }
      record(event);
      if (failure === undefined) return;
      if (retry) await dependencies.sleep(2 ** (attempt - 1) * 1000);
      else if (fallback) break;
      else throw failure;
    }
}
export type Asset_Result = {
  candidates: number;
  downloaded: number;
  unavailable: number;
  failures: number;
  referenced: number;
  filled_references: number;
};
export async function sync_assets(
  root: string,
  public_root: string,
  workers = image_workers,
  timeout = request_timeout,
  set_only = false,
  log_path = join(root, '../../reports/images.jsonl'),
  dependencies?: Download_Dependencies,
): Promise<Asset_Result> {
  const cards_root = join(public_root, 'cards'),
    sets_root = join(public_root, 'sets'),
    status_path = join(public_root, '.tcgdex-missing-assets.json');
  mkdirSync(public_root, { recursive: true });
  mkdirSync(dirname(log_path), { recursive: true });
  writeFileSync(log_path, '');
  const missing = read_json<Record<string, boolean>>(status_path, {}),
    tasks = new Map<string, string>(),
    fallbacks = new Map<string, string[]>();
  log(`Per-image log: ${log_path}`);
  log('Scanning cached images and missing assets...');
  for (const path of set_paths(root))
    for (const row of read_json<Card_Set[]>(path)) {
      const symbol_urls = [...new Set(['en', ...row.language_ids])].map((language) =>
        asset_url(language, row.tcgdex_series_id, row.tcgdex_id, 'symbol.webp'),
      );
      if (!existing_image(join(sets_root, row.id, 'symbol'))) {
        tasks.set(symbol_urls[0], join(sets_root, row.id, 'symbol.webp'));
        fallbacks.set(symbol_urls[0], symbol_urls.slice(1));
      }
      for (const language of row.language_ids)
        if (
          !existing_image(join(sets_root, row.id, `logo-${language}`)) &&
          !existing_image(join(sets_root, row.id, 'logo'))
        )
          tasks.set(
            asset_url(language, row.tcgdex_series_id, row.tcgdex_id, 'logo.webp'),
            join(sets_root, row.id, `logo-${language}.webp`),
          );
      if (set_only) continue;
      for (const card of read_json<Card[]>(join(dirname(path), `cards_${row.id}.json`)))
        for (const language of row.language_ids) {
          const filename = safe_filename(card.number),
            cached = existing_image(join(cards_root, row.id, language, filename));
          const has_existing = (card.variants || []).some((variant) =>
            (variant.images?.[language] || '').toLowerCase().endsWith('.webp'),
          );
          if (!cached && !has_existing)
            tasks.set(
              asset_url(
                language,
                row.tcgdex_series_id,
                row.tcgdex_id,
                String(card.number),
                'high.webp',
              ),
              join(cards_root, row.id, language, `${filename}.webp`),
            );
        }
    }
  const result: Asset_Result = {
    candidates: tasks.size,
    downloaded: 0,
    unavailable: 0,
    failures: 0,
    referenced: 0,
    filled_references: 0,
  };
  const samples: string[] = [];
  if (tasks.size) {
    const progress = new Progress('Images', tasks.size),
      iterator = tasks.entries();
    let completed = 0;
    // Bounded asynchronous workers, with one synchronous append per event.
    try {
      await Promise.all(
        Array.from({ length: Math.min(tasks.size, Math.max(1, workers)) }, async () => {
          for (let task = iterator.next(); !task.done; task = iterator.next()) {
            const [url, destination] = task.value;
            try {
              await download_asset(
                url,
                destination,
                timeout,
                (event) => appendFileSync(log_path, `${JSON.stringify(event)}\n`),
                fallbacks.get(url) || [],
                dependencies,
              );
              delete missing[url];
              result.downloaded++;
            } catch (err) {
              if (err instanceof Http_Error && err.status === 404) {
                missing[url] = true;
                result.unavailable++;
              } else {
                result.failures++;
                if (samples.length < 5)
                  samples.push(
                    `Asset request failed${err instanceof Http_Error ? ` (${err.status})` : ''}: ${url}: ${err}`,
                  );
              }
            }
            progress.update(
              ++completed,
              `saved ${result.downloaded.toLocaleString('en-US')} / missing ${result.unavailable.toLocaleString('en-US')} / errors ${result.failures.toLocaleString('en-US')}`,
            );
          }
        }),
      );
    } finally {
      progress.close();
    }
    samples.forEach((message) => log(message, true));
    if (result.failures > samples.length)
      log(`${result.failures - samples.length} additional image requests failed.`, true);
  } else log('All image assets are already cached.');
  log('Updating image references...');
  for (const path of set_paths(root)) {
    const sets = read_json<Card_Set[]>(path);
    let sets_changed = false;
    for (const row of sets) {
      const symbol = existing_image(join(sets_root, row.id, 'symbol'));
      if (!row.symbol_image_url && symbol) {
        row.symbol_image_url = `/images/sets/${row.id}/${basename(symbol)}`;
        sets_changed = true;
      }
      const preferred = ['en', 'fr']
        .filter((language) => row.language_ids.includes(language))
        .concat(row.language_ids.filter((language) => !['en', 'fr'].includes(language)));
      const logo =
        preferred
          .map((language) => existing_image(join(sets_root, row.id, `logo-${language}`)))
          .find(Boolean) || existing_image(join(sets_root, row.id, 'logo'));
      if (logo) {
        const url = `/images/sets/${row.id}/${basename(logo)}`;
        if (url !== row.title_image_url) {
          row.title_image_url = url;
          sets_changed = true;
        }
      }
      if (set_only) continue;
      const cards_path = join(dirname(path), `cards_${row.id}.json`),
        cards = read_json<Card[]>(cards_path);
      let changed = false;
      for (const card of cards)
        for (const variant of card.variants)
          for (const language of row.language_ids) {
            const image = existing_image(
              join(cards_root, row.id, language, safe_filename(card.number)),
            );
            if (!variant.images[language] && image) {
              variant.images[language] = `/images/cards/${row.id}/${language}/${basename(image)}`;
              changed = true;
              result.filled_references++;
            }
            result.referenced += Number(!!variant.images[language]);
          }
      if (changed) write_json(cards_path, cards);
    }
    if (sets_changed) write_json(path, sets);
  }
  write_json(status_path, missing);
  return result;
}
