import { isDeepStrictEqual } from 'node:util';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  data_root,
  project_root,
  directories,
  files,
  read_json,
  write_json,
  is_main,
  entry,
  cli,
} from './runtime';
import {
  download_price_guide,
  index_price_guide,
  normalized_price,
  product_url,
} from './cardmarket_prices';
import { log } from './update_logging';
import type { Card } from '../frontend/src/models/catalog';
export async function update_prices(
  root = data_root,
  cache = join(project_root, 'tcgdex_data/cardmarket-price-guide.json'),
): Promise<number> {
  if (!existsSync(root)) {
    log(`Missing app data folder: ${root}`, true);
    return 1;
  }
  log('Downloading Cardmarket price guide');
  let guide;
  try {
    guide = await download_price_guide(cache);
  } catch (err) {
    log(`Unable to load Cardmarket price guide: ${err}`, true);
    return 1;
  }
  const [updated_at, prices] = index_price_guide(guide);
  let files_changed = 0,
    variants_seen = 0,
    variants_priced = 0,
    missing_products = 0;
  for (const path of directories(root).flatMap((folder) =>
    files(folder, '.json').filter((path) => /[/\\]cards_[^/\\]+\.json$/.test(path)),
  )) {
    const cards = read_json<Card[]>(path);
    let changed = false;
    for (const card of cards)
      for (const variant of card.variants || []) {
        variants_seen++;
        const existing = variant.cardmarket;
        if (!existing || !Number.isInteger(existing.product_id)) continue;
        const row = prices.get(existing.product_id);
        if (!row) {
          missing_products++;
          continue;
        }
        const refreshed = normalized_price(
          existing.product_id,
          row,
          updated_at,
          existing.price_kind === 'holo',
          product_url(existing.product_id),
        );
        variants_priced++;
        if (!isDeepStrictEqual(existing, refreshed)) {
          variant.cardmarket = refreshed;
          changed = true;
        }
      }
    if (changed) {
      write_json(path, cards);
      files_changed++;
    }
  }
  log(
    `Cardmarket price update complete\n  Guide updated: ${updated_at || 'unknown'}\n  Variants scanned: ${variants_seen}\n  Variants priced: ${variants_priced}\n  Products missing: ${missing_products}\n  Files changed: ${files_changed}`,
  );
  return 0;
}
if (is_main(import.meta.url))
  void entry(() => {
    const args = cli({});
    if (args.help) {
      console.log('Update only Cardmarket price fields in existing card JSON files.');
      return 0;
    }
    return update_prices();
  });
