import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  asset_url,
  download_asset,
  download_webp,
  Http_Error,
  Network_Error,
  sync_assets,
} from '../scripts/image_assets';
import { read_json, write_json } from '../scripts/runtime';
import type { Image_Event } from '../scripts/image_assets';
import type { Card } from '../frontend/src/models/catalog';
const temporary: string[] = [];
function directory(): string {
  const path = mkdtempSync(join(tmpdir(), 'card-images-test-'));
  temporary.push(path);
  return path;
}
afterEach(() => {
  vi.unstubAllGlobals();
  temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true }));
});
async function attempt(failures: (Error | undefined)[], fallback: string[] = []) {
  const events: Image_Event[] = [],
    download = vi.fn(async () => {
      const error = failures.shift();
      if (error) throw error;
    }),
    sleep = vi.fn(async (_milliseconds: number) => {});
  let error: unknown;
  try {
    await download_asset(
      'https://assets.test/en',
      'image.webp',
      30,
      (event) => events.push(event),
      fallback,
      { download, sleep },
    );
  } catch (err) {
    error = err;
  }
  return { events, download, sleep, error };
}
describe('image retry and logging compatibility', () => {
  it('preserves upstream case and escapes URL parts', () => {
    expect(asset_url('zh-CN', 'SV X', 'SV1S', 'a/b', 'high.webp')).toBe(
      'https://assets.tcgdex.net/zh-cn/SV%20X/SV1S/a%2Fb/high.webp',
    );
  });

  it('retries temporary HTTP errors with exponential backoff and records each attempt', async () => {
    const result = await attempt([new Http_Error(503, 'service unavailable'), undefined]);
    expect(result.events.map((row) => row.status)).toEqual(['retry', 'downloaded']);
    expect(result.events[0]).toMatchObject({
      http_status: 503,
      response_body: 'service unavailable',
      attempt: 1,
    });
    expect(result.sleep).toHaveBeenCalledWith(1000);
    expect(result.error).toBeUndefined();
  });
  it('stops network failures after three requests', async () => {
    const result = await attempt(
      Array.from({ length: 3 }, () => new Network_Error('connection lost')),
    );
    expect(result.download).toHaveBeenCalledTimes(3);
    expect(result.sleep.mock.calls.map((call) => call[0])).toEqual([1000, 2000]);
    expect(result.events.map((row) => row.status)).toEqual(['retry', 'retry', 'failed']);
    expect(result.error).toBeInstanceOf(Network_Error);
  });
  it('does not retry permanent errors and bounds response details', async () => {
    const result = await attempt([new Http_Error(400, 'x'.repeat(5000))]);
    expect(result.download).toHaveBeenCalledTimes(1);
    expect(result.sleep).not.toHaveBeenCalled();
    expect(result.events[0].response_body).toHaveLength(2048);
    expect(result.events[0].status).toBe('failed');
  });
  it('tries localized symbol fallbacks on 404 without backoff', async () => {
    const result = await attempt([new Http_Error(404, ''), undefined], ['https://assets.test/ja']);
    expect(result.events.map((row) => row.status)).toEqual(['fallback', 'downloaded']);
    expect(result.events[1].url).toBe('https://assets.test/ja');
    expect(result.sleep).not.toHaveBeenCalled();
  });
  it('reports a card 404 as unavailable without retrying', async () => {
    const result = await attempt([new Http_Error(404, '')]);
    expect(result.download).toHaveBeenCalledTimes(1);
    expect(result.events[0].status).toBe('unavailable');
    expect(result.error).toBeInstanceOf(Http_Error);
  });
  it('checks WebP bytes and never publishes invalid responses', async () => {
    const path = join(directory(), 'card.webp');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('invalid image')),
    );
    await expect(download_webp('https://test/image', path, 1)).rejects.toThrow('not WebP');
    const bytes = Buffer.from('RIFFxxxxWEBP');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(bytes)),
    );
    await download_webp('https://test/image', path, 1);
    expect(readFileSync(path)).toEqual(bytes);
  });
  it('updates references, clears per-image logs and reuses cached assets on the next run', async () => {
    const root = directory(),
      data = join(root, 'frontend/data'),
      public_root = join(root, 'frontend/public/images'),
      log = join(root, 'reports/images.jsonl');
    write_json(join(data, 'asia-sv/sets.json'), [
      { id: 'asia-sv1s', tcgdex_id: 'SV1S', tcgdex_series_id: 'SV', language_ids: ['ja'] },
    ]);
    const path = join(data, 'asia-sv/cards_asia-sv1s.json');
    write_json(path, [
      { id: 'x', number: '001', variants: [{ id: 'normal', images: { ja: '' } }] },
    ]);
    mkdirSync(dirname(log), { recursive: true });
    writeFileSync(log, 'old run');
    const download = vi.fn(async (url: string, destination: string) => {
      if (url.includes('/en/')) throw new Http_Error(404, '');
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, 'RIFFxxxxWEBP');
    });
    const dependencies = { download, sleep: vi.fn(async () => {}) };
    const result = await sync_assets(data, public_root, 2, 10, false, log, dependencies);
    expect(result).toMatchObject({ downloaded: 3, failures: 0, filled_references: 1 });
    expect(readFileSync(log, 'utf8').trim().split('\n')).toHaveLength(4);
    expect(read_json<Card[]>(path)[0].variants[0].images.ja).toBe(
      '/images/cards/asia-sv1s/ja/001.webp',
    );
    expect((await sync_assets(data, public_root, 2, 10, false, log, dependencies)).candidates).toBe(
      0,
    );
    expect(readFileSync(log, 'utf8')).toBe('');
    expect(download).toHaveBeenCalledTimes(4);
  });
  it('retries assets previously reported missing and keeps set-only mode away from cards', async () => {
    const root = directory(),
      data = join(root, 'frontend/data'),
      images = join(root, 'frontend/public/images');
    write_json(join(data, 's/sets.json'), [
      { id: 'x', tcgdex_id: 'X', tcgdex_series_id: 'S', language_ids: ['en'] },
    ]);
    write_json(join(images, '.tcgdex-missing-assets.json'), {
      'https://assets.tcgdex.net/en/S/X/symbol.webp': true,
    });
    const download = vi.fn(async (_url: string, destination: string) => {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, 'RIFFxxxxWEBP');
    });
    expect(
      await sync_assets(data, images, 1, 10, true, join(root, 'images.jsonl'), {
        download,
        sleep: async () => {},
      }),
    ).toMatchObject({ candidates: 2, downloaded: 2, referenced: 0 });
    expect(read_json(join(images, '.tcgdex-missing-assets.json'))).toEqual({});
  });
});
