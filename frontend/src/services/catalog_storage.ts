// import types
import type {
  Card,
  Coverage_Report,
  Language,
  Pokemon,
  Region,
  Series,
  Set,
} from '../models/catalog';

/* language management */
const language_modules = import.meta.glob<Language[]>('../../data/languages.json', {
  eager: true,
  import: 'default',
});

export const get_languages = (): Language[] => {
  return Object.values(language_modules)[0] ?? [];
};

const pokemon_modules = import.meta.glob<Pokemon[]>('../../data/pokemon.json', {
  eager: true,
  import: 'default',
});

// Returns the standardized Pokemon catalog used by global search.
export const get_pokemon = (): Pokemon[] => Object.values(pokemon_modules)[0] ?? [];

const coverage_modules = import.meta.glob<Coverage_Report>('../../data/coverage.json', {
  eager: true,
  import: 'default',
});

// Returns the data and asset coverage generated during the last catalog update.
export const get_coverage = (): Coverage_Report | null =>
  Object.values(coverage_modules)[0] ?? null;

// Eagerly loads every configured region from the local JSON catalog.
const region_modules = import.meta.glob<Region[]>('../../data/regions.json', {
  eager: true,
  import: 'default',
});

// Returns all known regions.
export const get_regions = (): Region[] => {
  return Object.values(region_modules)[0] ?? [];
};

// Eagerly loads every configured series from the local JSON catalog.
const series_modules = import.meta.glob<Series[]>('../../data/series.json', {
  eager: true,
  import: 'default',
});
const all_series: Series[] = Object.values(series_modules)[0] ?? [];
const series_by_id = new Map(all_series.map((series) => [series.id, series]));

// Returns all known series.
export const get_series = (): Series[] => {
  return all_series;
};

// Returns one series by id if it exists.
export const get_series_by_id = (series_id: string): Series | null => {
  return series_by_id.get(series_id) ?? null;
};

// Eagerly loads each per-series set file from the local JSON catalog.
const set_modules = import.meta.glob<Set[]>('../../data/*/sets.json', {
  eager: true,
  import: 'default',
});
const all_sets: Set[] = Object.values(set_modules).flat();
const sets_by_id = new Map(all_sets.map((set) => [set.id, set]));

// Returns all known sets across every series folder.
export const get_sets = (): Set[] => {
  return all_sets;
};

// Returns one set by id if it exists.
export const get_set_by_id = (set_id: string): Set | null => {
  return sets_by_id.get(set_id) ?? null;
};

// Eagerly loads each per-set card file from the local JSON catalog.
const card_modules = import.meta.glob<Card[]>('../../data/*/cards_*.json', {
  eager: true,
  import: 'default',
});
const all_cards: Card[] = Object.values(card_modules).flat();
const cards_by_set_and_id = new Map(all_cards.map((card) => [`${card.set_id}:${card.id}`, card]));

// Returns every card from every set, used by global search views.
export const get_cards = (): Card[] => {
  return all_cards;
};

// Returns cards from the single JSON file that belongs to a specific set.
export const get_cards_by_set_id = (set_id: string): Card[] => {
  const set: Set | null = get_set_by_id(set_id);
  if (!set) return [];

  const module_path: string = `../../data/${set.series_id}/cards_${set.id}.json`;
  return card_modules[module_path] ?? [];
};

// Returns one card from the single JSON file that belongs to its set.
export const get_card_by_id = (set_id: string, card_id: string): Card | null => {
  return cards_by_set_and_id.get(`${set_id}:${card_id}`) ?? null;
};
