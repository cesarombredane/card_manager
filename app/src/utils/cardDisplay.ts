import { resolveCardImage } from './cardImages';
import { localizedValue } from './localization';
import type { Card, CardmarketPrice, CardVariant } from './types';

// The source card images are 600 x 825 pixels, which simplifies to 8:11.
export const cardImageRatio = 8 / 11;

// Sorts card numbers naturally, including values such as 1, 2, 10 and TG01.
const cardNumberCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const compareCardNumbers = (left: string, right: string): number => {
  return cardNumberCollator.compare(left, right);
};

// Orders cards by release date and then by their naturally sorted printed
// number. Missing dates remain at the end in both directions.
export const compareCardReleaseAndNumber = (
  leftDate: string | null | undefined,
  rightDate: string | null | undefined,
  leftNumber: string,
  rightNumber: string,
  direction: 'asc' | 'desc'
): number => {
  if (!leftDate && rightDate) return 1;
  if (leftDate && !rightDate) return -1;

  if (leftDate && rightDate) {
    const dateComparison = leftDate.localeCompare(rightDate);
    if (dateComparison !== 0) return direction === 'asc' ? dateComparison : -dateComparison;
  }

  const numberComparison = compareCardNumbers(leftNumber, rightNumber);
  return direction === 'asc' ? numberComparison : -numberComparison;
};

// A flattened physical card variant shared by every card grid.
export type DisplayCard = {
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
  cardmarket: CardmarketPrice | null;
  is_manual?: boolean;
  estimated_value?: number | null;
};

export const formatCardValue = (value: string): string => value.replaceAll('_', ' ');

export const cardmarketDisplayPrice = (price: CardmarketPrice | null | undefined): number | null => {
  if (!price) return null;
  return [price.trend, price.average, price.low]
    .find((value): value is number => typeof value === 'number' && value > 0) ?? null;
};

export const formatEuroPrice = (value: number): string => {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(value);
};

// Builds the presentation model used by CardList and CardListItem.
export const buildDisplayCard = (
  card: Card,
  variant: CardVariant,
  languageId: string,
  setName: string | null = null
): DisplayCard => {
  const cardName: string = localizedValue(card.name, languageId) ?? card.id;
  const variantSuffix: string = variant.id !== 'normal' ? ` (${formatCardValue(variant.id)})` : '';
  const fallbackLanguageId: string = card.set_id.startsWith('asia-') ? 'ja' : 'en';
  const image = resolveCardImage(variant.images, languageId, fallbackLanguageId, {
    setId: card.set_id,
    cardId: card.id,
    variantId: variant.id
  });

  return {
    id: `${card.set_id}-${card.id}-${variant.id}`,
    card_id: card.id,
    set_id: card.set_id,
    set_name: setName,
    language_id: languageId,
    variant_id: variant.id,
    variant_type: variant.type ?? variant.id.split('-')[0],
    number: card.number,
    display_name: `${cardName}${variantSuffix}`,
    category: card.category,
    rarity: card.rarity,
    hp: card.hp ?? null,
    illustrator: card.illustrator ?? null,
    types: card.types ?? [],
    pokemon_names: card.pokemon ?? [],
    energy_costs: [...new Set((card.attacks ?? []).flatMap((attack) => attack.cost))].sort(),
    image_url: image.url,
    image_language_id: image.languageId,
    image_is_fallback: image.isFallback,
    image_source: image.source,
    cardmarket: variant.cardmarket ?? null
  };
};
