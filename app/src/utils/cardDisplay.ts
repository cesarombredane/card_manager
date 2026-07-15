import { localizedCardImage } from './cardImages';
import { localizedValue } from './localization';
import type { Card, CardVariant } from './types';

// The source card images are 600 x 825 pixels, which simplifies to 8:11.
export const cardImageRatio = 8 / 11;

// Sorts card numbers naturally, including values such as 1, 2, 10 and TG01.
const cardNumberCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const compareCardNumbers = (left: string, right: string): number => {
  return cardNumberCollator.compare(left, right);
};

// A flattened physical card variant shared by every card grid.
export type DisplayCard = {
  id: string;
  card_id: string;
  set_id: string;
  set_name: string | null;
  variant_id: string;
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
};

export const formatCardValue = (value: string): string => value.replaceAll('_', ' ');

// Builds the presentation model used by CardList and CardListItem.
export const buildDisplayCard = (
  card: Card,
  variant: CardVariant,
  languageId: string,
  setName: string | null = null
): DisplayCard => {
  const cardName: string = localizedValue(card.name, languageId) ?? card.id;
  const variantSuffix: string = variant.id !== 'normal' ? ` (${formatCardValue(variant.id)})` : '';

  return {
    id: `${card.set_id}-${card.id}-${variant.id}`,
    card_id: card.id,
    set_id: card.set_id,
    set_name: setName,
    variant_id: variant.id,
    number: card.number,
    display_name: `${cardName}${variantSuffix}`,
    category: card.category,
    rarity: card.rarity,
    hp: card.hp ?? null,
    illustrator: card.illustrator ?? null,
    types: card.types ?? [],
    pokemon_names: card.pokemon ?? [],
    energy_costs: [...new Set((card.attacks ?? []).flatMap((attack) => attack.cost))].sort(),
    image_url: localizedCardImage(variant.images, languageId)
  };
};
