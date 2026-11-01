import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  product_url,
  download_price_guide,
  index_price_guide,
  normalized_price,
} from '../scripts/cardmarket_prices';
import { update_prices } from '../scripts/update_cardmarket_prices';
import { read_json, write_json } from '../scripts/runtime';
import type { Card } from '../frontend/src/models/catalog';
const temporary: string[] = [];
function directory(): string {
  const path = mkdtempSync(join(tmpdir(), 'card-prices-test-'));
  temporary.push(path);
  return path;
}
afterEach(() => {
  vi.unstubAllGlobals();
  temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true }));
});
describe('Cardmarket compatibility', () => {
  it('leaves files byte-for-byte unchanged when only JSON property ordering differs', async () => {
    const root = directory(),
      path = join(root, 's/cards_x.json');
    const price = Object.fromEntries(
      Object.entries(normalized_price(1, { avg: 10 }, 'same', false, product_url(1))).reverse(),
    );
    write_json(path, [{ id: 'x', variants: [{ id: 'normal', images: {}, cardmarket: price }] }]);
    const before = readFileSync(path);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ createdAt: 'same', priceGuides: [{ idProduct: 1, avg: 10 }] }),
          ),
      ),
    );
    expect(await update_prices(root, join(root, 'cache.json'))).toBe(0);
    expect(readFileSync(path)).toEqual(before);
  });

  it('uses dedicated holo prices, falling back only when every holo value is absent', () => {
    expect(normalized_price(1, { avg: 10, 'avg-holo': 0 }, 'date', true)).toMatchObject({
      average: 0,
      price_kind: 'holo',
      low: null,
    });
    expect(normalized_price(1, { avg: 10 }, 'date', true).average).toBe(10);
    expect(normalized_price(1, {}, 'date')).toMatchObject({
      currency: 'EUR',
      average: null,
      low: null,
      average_30d: null,
    });
  });
  it('indexes product IDs and preserves the last duplicate guide row', () => {
    const [date, index] = index_price_guide({
      createdAt: 'date',
      priceGuides: [{ idProduct: 1, avg: 10 }, { idProduct: 'wrong' }, { idProduct: 1, avg: 20 }],
    });
    expect(date).toBe('date');
    expect(index.size).toBe(1);
    expect(index.get(1)?.avg).toBe(20);
  });
  it('falls back to the existing price cache on network errors and rejects invalid uncached responses', async () => {
    const cache = join(directory(), 'prices.json'),
      guide = { createdAt: 'old', priceGuides: [] };
    write_json(cache, guide);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await download_price_guide(cache)).toEqual(guide);
    await expect(download_price_guide()).rejects.toThrow('offline');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('[]')),
    );
    await expect(download_price_guide()).rejects.toThrow('Invalid Cardmarket');
  });
  it('changes only matched price fields while preserving catalog metadata and unknown products', async () => {
    const root = directory(),
      path = join(root, 's/cards_x.json');
    const previous = normalized_price(1, { avg: 3 }, 'old'),
      unknown = normalized_price(999, { avg: 7 }, 'old');
    write_json(path, [
      {
        id: 'x',
        name: { en: 'Keep' },
        variants: [
          { id: 'a', images: { en: '/keep.webp' }, cardmarket: previous },
          { id: 'b', images: {}, cardmarket: unknown },
        ],
      },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ createdAt: 'new', priceGuides: [{ idProduct: 1, avg: 12 }] }),
          ),
      ),
    );
    expect(await update_prices(root, join(root, 'cache.json'))).toBe(0);
    const card = read_json<Card[]>(path)[0];
    expect(card.name.en).toBe('Keep');
    expect(card.variants[0].images.en).toBe('/keep.webp');
    expect(card.variants[0].cardmarket).toMatchObject({ average: 12, updated_at: 'new' });
    expect(card.variants[1].cardmarket).toEqual(unknown);
  });
});
