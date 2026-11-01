// import types
import type { Manual_Image_Data, Manual_Image_Entry } from '../models/manual_images';
import type { Collection_Data } from '../models/collection';
import type { Binders_Data } from '../models/binders';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function text(row: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => typeof row[field] === 'string');
}
function optional_text(row: Record<string, unknown>, fields: string[]): boolean {
  return fields.every(
    (field) => row[field] === undefined || row[field] === null || typeof row[field] === 'string',
  );
}
function rows(value: unknown, validate: (row: Record<string, unknown>) => boolean): boolean {
  return Array.isArray(value) && value.every((row) => record(row) && validate(row));
}
function numeric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function strings(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function parse_collection_data(value: unknown): Collection_Data {
  if (
    !record(value) ||
    (value.version !== undefined && value.version !== 1 && value.version !== 2) ||
    !rows(
      value.folders,
      (row) =>
        text(row, ['id', 'name']) &&
        (row.type === undefined || row.type === 'box' || row.type === 'binder') &&
        optional_text(row, ['created_at']) &&
        (row.pokedex_config === undefined || valid_pokedex_config(row.pokedex_config)),
    ) ||
    !rows(
      value.entries,
      (row) =>
        text(row, ['id', 'folder_id', 'set_id', 'card_id', 'variant_id', 'condition']) &&
        numeric(row.quantity) &&
        Number.isInteger(row.quantity) &&
        row.quantity >= 0 &&
        optional_text(row, ['language_id', 'added_at', 'updated_at', 'pokedex_requirement_id']) &&
        (row.wanted === undefined || typeof row.wanted === 'boolean') &&
        (row.strong_language === undefined || typeof row.strong_language === 'boolean'),
    ) ||
    (value.manual_cards !== undefined &&
      !rows(
        value.manual_cards,
        (row) =>
          text(row, ['id', 'name']) &&
          optional_text(row, [
            'set_name',
            'number',
            'category',
            'rarity',
            'pokemon_name',
            'illustrator',
            'notes',
            'release_date',
            'created_at',
            'updated_at',
          ]) &&
          (row.types === undefined || strings(row.types)) &&
          [row.hp, row.estimated_value].every(
            (item) => item === undefined || item === null || numeric(item),
          ),
      ))
  ) {
    throw new Error('Invalid collection data; existing data has not been replaced.');
  }
  const manual_cards = (value.manual_cards ?? []) as Record<string, unknown>[];
  return {
    ...value,
    version: 2,
    manual_cards: manual_cards.map((card) => ({
      ...card,
      set_name: card.set_name ?? '',
      number: card.number ?? '',
      category: card.category ?? 'pokemon',
      rarity: card.rarity ?? 'unknown',
      pokemon_name: card.pokemon_name ?? '',
      types: card.types ?? [],
      hp: card.hp ?? null,
      estimated_value: card.estimated_value ?? null,
      illustrator: card.illustrator ?? '',
      notes: card.notes ?? '',
      release_date: card.release_date ?? null,
      created_at: card.created_at ?? '',
      updated_at: card.updated_at ?? '',
    })),
  } as Collection_Data;
}
function valid_pokedex_config(value: unknown): boolean {
  return (
    record(value) &&
    ['all', 'intl', 'asia'].includes(String(value.region)) &&
    ['include_regional_forms', 'include_mega_forms'].every(
      (key) => typeof value[key] === 'boolean',
    ) &&
    text(value, ['international_language_id', 'asia_language_id']) &&
    ['series_ids', 'variant_types', 'rarities'].every((key) => strings(value[key]))
  );
}
export function parse_binders_data(value: unknown): Binders_Data {
  if (
    !record(value) ||
    (value.version !== undefined && value.version !== 1) ||
    !rows(
      value.binders,
      (row) =>
        text(row, ['folder_id']) &&
        numeric(row.page_count) &&
        Number.isInteger(row.page_count) &&
        row.page_count >= 1 &&
        ['2x2', '3x3'].includes(String(row.layout)) &&
        Array.isArray(row.slots) &&
        row.slots.every((slot) => slot === null || typeof slot === 'string') &&
        optional_text(row, ['created_at', 'updated_at']) &&
        (row.locked_pages === undefined ||
          (Array.isArray(row.locked_pages) &&
            row.locked_pages.every((page) => numeric(page) && Number.isInteger(page)))) &&
        (row.proxies === undefined ||
          rows(
            row.proxies,
            (proxy) =>
              text(proxy, ['id', 'name']) &&
              (proxy.quantity === undefined || (numeric(proxy.quantity) && proxy.quantity >= 1)) &&
              optional_text(proxy, ['date', 'created_at']),
          )) &&
        (row.images === undefined ||
          rows(
            row.images,
            (image) =>
              text(image, ['id', 'name']) &&
              ['width', 'height'].every((key) => numeric(image[key]) && image[key] >= 1) &&
              (image.card_slots === undefined ||
                (Array.isArray(image.card_slots) && image.card_slots.every(numeric))),
          )) &&
        (row.image_placements === undefined ||
          rows(
            row.image_placements,
            (placement) =>
              text(placement, ['image_id']) &&
              ['side_index', 'row', 'column'].every(
                (key) =>
                  numeric(placement[key]) &&
                  Number.isInteger(placement[key]) &&
                  placement[key] >= 0,
              ),
          )),
    )
  ) {
    throw new Error('Invalid binder data; existing data has not been replaced.');
  }
  return { ...value, version: 1 } as Binders_Data;
}
export function parse_manual_image_entry(value: unknown): Manual_Image_Entry {
  if (
    !record(value) ||
    !text(value, ['set_id', 'card_id', 'variant_id', 'language_id', 'url', 'updated_at']) ||
    !String(value.url).startsWith('/images/manual/')
  )
    throw new Error('Invalid manual image entry');
  return value as Manual_Image_Entry;
}
export function parse_manual_image_data(value: unknown): Manual_Image_Data {
  if (
    !record(value) ||
    (value.version !== undefined && value.version !== 1) ||
    !Array.isArray(value.entries)
  )
    throw new Error('Invalid manual image data');
  return { ...value, version: 1, entries: value.entries.map(parse_manual_image_entry) };
}
