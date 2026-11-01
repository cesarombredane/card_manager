// import utils
import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { read_json, write_json, directories, set_paths } from './runtime';
import { join, dirname } from 'node:path';

// import types
import type { Card, Set as Card_Set } from '../frontend/src/models/catalog';

export type Id_Record = { id: string };
export const personal_data_files = [
  'collection.json',
  'binders.json',
  'manual-images.json',
] as const;
export function append_unique<T extends Id_Record>(existing: T[], discovered: T[]): [T[], number] {
  const known = new Set(existing.map((row) => String(row.id))),
    additions = discovered.filter((row) => !known.has(String(row.id)));
  return [[...existing, ...additions], additions.length];
}
export function validate_generated_sets(root: string): void {
  for (const path of set_paths(root))
    for (const row of read_json<Card_Set[]>(path)) {
      if (
        !row.name ||
        typeof row.name !== 'object' ||
        !Object.values(row.name).some((name) => typeof name === 'string' && name)
      )
        throw new Error(`Set ${row.id} must have at least one localized name`);
      if (typeof row.tcgdex_id !== 'string' || !row.tcgdex_id)
        throw new Error(`Set ${row.id} must have a TCGdex id`);
      if ('local_name' in row)
        throw new Error(`Set ${row.id} still contains obsolete local_name data`);
      if (
        !Array.isArray(row.language_ids) ||
        JSON.stringify(Object.keys(row.name).sort()) !==
          JSON.stringify([...new Set(row.language_ids)].sort())
      )
        throw new Error(`Set ${row.id} name languages must match language_ids`);
    }
}
export type Inventory = {
  series: Record<string, Id_Record>;
  pokemon: Record<string, Id_Record>;
  sets: Record<string, Card_Set>;
  cards: Record<string, Card>;
};
export function catalog_inventory(root: string): Inventory {
  const inventory: Inventory = { series: {}, pokemon: {}, sets: {}, cards: {} };
  for (const kind of ['series', 'pokemon'] as const)
    inventory[kind] = Object.fromEntries(
      read_json<Id_Record[]>(join(root, `${kind}.json`), []).map((row) => [String(row.id), row]),
    );
  for (const path of set_paths(root))
    for (const row of read_json<Card_Set[]>(path)) {
      inventory.sets[String(row.id)] = row;
      for (const card of read_json<Card[]>(join(dirname(path), `cards_${row.id}.json`), []))
        inventory.cards[String(card.id)] = card;
    }
  return inventory;
}
function comparable(kind: string, row: Id_Record): string {
  const value = structuredClone(row) as Id_Record & Partial<Card_Set & Card>;
  if (kind === 'sets') {
    delete value.title_image_url;
    delete value.symbol_image_url;
  }
  if (kind === 'cards')
    for (const variant of value.variants || []) delete (variant as Partial<typeof variant>).images;
  function stable(input: unknown): unknown {
    return Array.isArray(input)
      ? input.map(stable)
      : input && typeof input === 'object'
        ? Object.fromEntries(
            Object.entries(input)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([key, item]) => [key, stable(item)]),
          )
        : input;
  }
  return JSON.stringify(stable(value));
}
export function inventory_changes(
  existing: Inventory,
  discovered: Inventory,
): Record<string, { pulled: number; added: number; updated: number; removed: number }> {
  return Object.fromEntries(
    (['series', 'sets', 'cards', 'pokemon'] as const).map((kind) => {
      const old = existing[kind],
        current = discovered[kind];
      return [
        kind,
        {
          pulled: Object.keys(current).length,
          added: Object.keys(current).filter((key) => !(key in old)).length,
          updated: Object.keys(current).filter(
            (key) => key in old && comparable(kind, old[key]) !== comparable(kind, current[key]),
          ).length,
          removed: Object.keys(old).filter((key) => !(key in current)).length,
        },
      ];
    }),
  );
}
export function merge_append_only(
  existing: string,
  discovered: string,
  destination: string,
): Record<string, number> {
  rmSync(destination, { recursive: true, force: true });
  if (existsSync(existing)) cpSync(existing, destination, { recursive: true });
  else mkdirSync(destination, { recursive: true });
  const counts: Record<string, number> = { series: 0, sets: 0, cards: 0, pokemon: 0 };
  for (const name of ['regions', 'languages', 'series', 'pokemon']) {
    const path = join(destination, `${name}.json`),
      [merged, added] = append_unique(
        read_json<Id_Record[]>(path, []),
        read_json<Id_Record[]>(join(discovered, `${name}.json`)),
      );
    if (name in counts) counts[name] += added;
    if (added || !existsSync(path)) write_json(path, merged);
  }
  for (const folder of directories(discovered)) {
    const series = folder.slice(discovered.length + 1),
      target = join(destination, series);
    const sets = read_json<Card_Set[]>(join(folder, 'sets.json'));
    if (!existsSync(target)) {
      cpSync(folder, target, { recursive: true });
      counts.sets += sets.length;
      counts.cards += sets.reduce(
        (sum, row) => sum + read_json<Card[]>(join(folder, `cards_${row.id}.json`)).length,
        0,
      );
      continue;
    }
    const path = join(target, 'sets.json'),
      [merged, added] = append_unique(read_json<Card_Set[]>(path), sets);
    counts.sets += added;
    if (added) write_json(path, merged);
    for (const row of sets) {
      const filename = `cards_${row.id}.json`,
        output = join(target, filename),
        cards = read_json<Card[]>(join(folder, filename));
      if (!existsSync(output)) {
        copyFileSync(join(folder, filename), output);
        counts.cards += cards.length;
        continue;
      }
      const [merged_cards, added_cards] = append_unique(read_json<Card[]>(output), cards);
      counts.cards += added_cards;
      if (added_cards) write_json(output, merged_cards);
    }
  }
  return counts;
}
export function preserve_image_references(
  existing: string,
  generated: string,
): { sets: number; variants: number } {
  const inventory = catalog_inventory(existing),
    counts = { sets: 0, variants: 0 };
  for (const path of set_paths(generated)) {
    const sets = read_json<Card_Set[]>(path);
    let sets_changed = false;
    for (const row of sets) {
      const old = inventory.sets[row.id];
      if (old) {
        for (const field of ['title_image_url', 'symbol_image_url'] as const)
          if (field in old) {
            row[field] = old[field];
            sets_changed = true;
          }
        counts.sets++;
      }
      const cards_path = join(dirname(path), `cards_${row.id}.json`);
      if (!existsSync(cards_path)) continue;
      const cards = read_json<Card[]>(cards_path);
      let changed = false;
      for (const card of cards)
        for (const variant of card.variants || []) {
          const old_variant = inventory.cards[card.id]?.variants?.find(
            (item) => String(item.id) === String(variant.id),
          );
          if (!old_variant || !('images' in old_variant)) continue;
          variant.images = structuredClone(old_variant.images);
          counts.variants++;
          changed = true;
        }
      if (changed) write_json(cards_path, cards);
    }
    if (sets_changed) write_json(path, sets);
  }
  return counts;
}
export function preserve_price_data(existing: string, generated: string): number {
  const inventory = catalog_inventory(existing);
  let preserved = 0;
  for (const path of set_paths(generated))
    for (const row of read_json<Card_Set[]>(path)) {
      const cards_path = join(dirname(path), `cards_${row.id}.json`),
        cards = read_json<Card[]>(cards_path);
      let changed = false;
      for (const card of cards)
        for (const variant of card.variants || []) {
          const old = inventory.cards[card.id]?.variants?.find(
            (item) => String(item.id) === String(variant.id),
          );
          if (!old) continue;
          if ('cardmarket' in old) variant.cardmarket = structuredClone(old.cardmarket);
          else delete variant.cardmarket;
          changed = true;
          preserved++;
        }
      if (changed) write_json(cards_path, cards);
    }
  return preserved;
}
