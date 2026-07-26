export type CardSort =
  | 'release-desc'
  | 'release-asc'
  | 'pokedex-asc'
  | 'pokedex-desc'
  | 'price-asc'
  | 'price-desc';

export const cardSortOptions: Array<{ label: string; value: CardSort }> = [
  { label: 'Release date: newest first', value: 'release-desc' },
  { label: 'Release date: oldest first', value: 'release-asc' },
  { label: 'Pokédex number: lowest first', value: 'pokedex-asc' },
  { label: 'Pokédex number: highest first', value: 'pokedex-desc' },
  { label: 'Price: cheapest first', value: 'price-asc' },
  { label: 'Price: most expensive first', value: 'price-desc' }
];
