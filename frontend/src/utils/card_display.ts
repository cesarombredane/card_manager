// import utils
import { resolve_card_image } from './card_images';
import { localized_value } from './localization';

// import types
import type { Card, Cardmarket_Price, Card_Variant } from '../models/catalog';

// The source card images are 600 x 825 pixels, which simplifies to 8:11.
export const card_image_ratio = 8 / 11;

// Sorts card numbers naturally, including values such as 1, 2, 10 and TG01.
const card_number_collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const compare_card_numbers = (left: string, right: string): number => {
  return card_number_collator.compare(left, right);
};

// Orders cards by release date and then by their naturally sorted printed
// number. Missing dates remain at the end in both directions.
export const compare_card_release_and_number = (
  left_date: string | null | undefined,
  right_date: string | null | undefined,
  left_number: string,
  right_number: string,
  direction: 'asc' | 'desc',
): number => {
  if (!left_date && right_date) return 1;
  if (left_date && !right_date) return -1;

  if (left_date && right_date) {
    const date_comparison = left_date.localeCompare(right_date);
    if (date_comparison !== 0) return direction === 'asc' ? date_comparison : -date_comparison;
  }

  const number_comparison = compare_card_numbers(left_number, right_number);
  return direction === 'asc' ? number_comparison : -number_comparison;
};

// A flattened physical card variant shared by every card grid.
export type Display_Card = {
  id: string;
  card_id: string;
  set_id: string;
  set_name: string | null;
  language_id: string;
  variant_id: string;
  variant_type?: string;
  number: string;
  display_name: string;
  category: string;
  rarity: string;
  hp: number | null;
  illustrator: string | null;
  types: string[];
  pokemon_names: string[];
  energy_costs: string[];
  image_url: string | null;
  preview_image_urls?: string[];
  image_language_id: string | null;
  image_is_fallback: boolean;
  image_source: 'automatic' | 'manual' | null;
  cardmarket: Cardmarket_Price | null;
  is_manual?: boolean;
  estimated_value?: number | null;
};

export const format_card_value = (value: string): string => value.replaceAll('_', ' ');

export const cardmarket_display_price = (
  price: Cardmarket_Price | null | undefined,
): number | null => {
  if (!price) return null;
  return (
    [price.trend, price.average, price.low].find(
      (value): value is number => typeof value === 'number' && value > 0,
    ) ?? null
  );
};

export const format_euro_price = (value: number): string => {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(value);
};

// Builds the presentation model used by CardList and CardListItem.
export const build_display_card = (
  card: Card,
  variant: Card_Variant,
  language_id: string,
  set_name: string | null = null,
): Display_Card => {
  const card_name: string = localized_value(card.name, language_id) ?? card.id;
  const variant_suffix: string =
    variant.id !== 'normal' ? ` (${format_card_value(variant.id)})` : '';
  const fallback_language_id: string = card.set_id.startsWith('asia-') ? 'ja' : 'en';
  const image = resolve_card_image(variant.images, language_id, fallback_language_id, {
    set_id: card.set_id,
    card_id: card.id,
    variant_id: variant.id,
  });

  return {
    id: `${card.set_id}-${card.id}-${variant.id}`,
    card_id: card.id,
    set_id: card.set_id,
    set_name: set_name,
    language_id: language_id,
    variant_id: variant.id,
    variant_type: variant.type ?? variant.id.split('-')[0],
    number: card.number,
    display_name: `${card_name}${variant_suffix}`,
    category: card.category,
    rarity: card.rarity,
    hp: card.hp ?? null,
    illustrator: card.illustrator ?? null,
    types: card.types ?? [],
    pokemon_names: card.pokemon ?? [],
    energy_costs: [...new Set((card.attacks ?? []).flatMap((attack) => attack.cost))].sort(),
    image_url: image.url,
    image_language_id: image.language_id,
    image_is_fallback: image.is_fallback,
    image_source: image.source,
    cardmarket: variant.cardmarket ?? null,
  };
};
