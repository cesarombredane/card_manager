import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { object, read_json } from './runtime';
import type { Json_Object } from './runtime';
import type { CardmarketPrice } from '../frontend/src/models/catalog';

export const price_guide_url =
  'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json';
export type Price_Guide = { createdAt?: string; priceGuides?: Json_Object[] };
export function validate_guide(value: unknown): Price_Guide {
  if (
    !object(value) ||
    (value.createdAt !== undefined && typeof value.createdAt !== 'string') ||
    !Array.isArray(value.priceGuides) ||
    !value.priceGuides.every(object)
  )
    throw new Error('Invalid Cardmarket price guide');
  return value as Price_Guide;
}
export async function download_price_guide(cache_path?: string): Promise<Price_Guide> {
  try {
    const response = await fetch(price_guide_url, {
      headers: { Accept: 'application/json', 'User-Agent': 'card-manager-cardmarket-sync/1.0' },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(`Cardmarket HTTP ${response.status}`);
    const payload = await response.text(),
      guide = validate_guide(JSON.parse(payload));
    if (cache_path) {
      mkdirSync(dirname(cache_path), { recursive: true });
      writeFileSync(`${cache_path}.tmp`, payload);
      renameSync(`${cache_path}.tmp`, cache_path);
    }
    return guide;
  } catch (err) {
    if (cache_path && existsSync(cache_path)) return validate_guide(read_json<unknown>(cache_path));
    throw err;
  }
}
export function product_url(product_id: number): string {
  return `https://www.cardmarket.com/en/Pokemon/Products?idProduct=${product_id}`;
}
export function index_price_guide(guide: Price_Guide): [string, Map<number, Json_Object>] {
  return [
    String(guide.createdAt || ''),
    new Map(
      (guide.priceGuides || [])
        .filter((row) => Number.isInteger(row.idProduct))
        .map((row) => [row.idProduct as number, row]),
    ),
  ];
}
export function normalized_price(
  product_id: number,
  row: Json_Object,
  updated_at: string,
  use_holo_fields = false,
  url: string | null = null,
): CardmarketPrice {
  const columns = ['avg', 'low', 'trend', 'avg1', 'avg7', 'avg30'];
  let values = columns.map((column) => row[`${column}${use_holo_fields ? '-holo' : ''}`] ?? null);
  if (use_holo_fields && values.every((value) => value === null))
    values = columns.map((column) => row[column] ?? null);
  if (values.some((value) => value !== null && typeof value !== 'number'))
    throw new Error(`Invalid prices for product ${product_id}`);
  const [average, low, trend, average_1d, average_7d, average_30d] = values as (number | null)[];
  return {
    product_id,
    currency: 'EUR',
    updated_at,
    price_kind: use_holo_fields ? 'holo' : 'standard',
    average,
    low,
    trend,
    average_1d,
    average_7d,
    average_30d,
    url,
  };
}
