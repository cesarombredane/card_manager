export type Card_Sort =
  | 'set-order'
  | 'release-desc'
  | 'release-asc'
  | 'pokedex-asc'
  | 'pokedex-desc'
  | 'price-asc'
  | 'price-desc';

export const card_sort_options: Array<{ label: string; value: Card_Sort }> = [
  { label: 'Release date: newest first', value: 'release-desc' },
  { label: 'Release date: oldest first', value: 'release-asc' },
  { label: 'Pokédex number: lowest first', value: 'pokedex-asc' },
  { label: 'Pokédex number: highest first', value: 'pokedex-desc' },
  { label: 'Price: cheapest first', value: 'price-asc' },
  { label: 'Price: most expensive first', value: 'price-desc' },
];

export const set_card_sort_options: Array<{ label: string; value: Card_Sort }> = [
  { label: 'Set order', value: 'set-order' },
  ...card_sort_options,
];
