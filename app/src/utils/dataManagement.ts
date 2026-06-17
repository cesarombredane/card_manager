import type { Card, Language, Region, Series, Set } from './types';

// Eagerly loads every configured language from the local JSON catalog.
const languageModules = import.meta.glob<Language[]>('../../data/languages.json', { eager: true, import: 'default' });

// Eagerly loads every configured region from the local JSON catalog.
const regionModules = import.meta.glob<Region[]>('../../data/regions.json', { eager: true, import: 'default' });

// Eagerly loads every configured series from the local JSON catalog.
const seriesModules = import.meta.glob<Series[]>('../../data/series.json', { eager: true, import: 'default' });

// Eagerly loads each per-series set file from the local JSON catalog.
const setModules = import.meta.glob<Set[]>('../../data/*/sets.json', { eager: true, import: 'default' });

// Eagerly loads each per-set card file from the local JSON catalog.
const cardModules = import.meta.glob<Card[]>('../../data/*/cards_*.json', { eager: true, import: 'default' });

// Returns all known languages.
export const getLanguages = (): Language[] => {
  return Object.values(languageModules)[0] ?? [];
};

// Returns all known regions.
export const getRegions = (): Region[] => {
  return Object.values(regionModules)[0] ?? [];
};

// Returns all known series.
export const getSeries = (): Series[] => {
  return Object.values(seriesModules)[0] ?? [];
};

// Returns all known sets across every series folder.
export const getSets = (): Set[] => {
  return Object.values(setModules).flat();
};

// Returns every card from every set, used by global search views.
export const getCards = (): Card[] => {
  return Object.values(cardModules).flat();
};

// Returns cards from the single JSON file that belongs to a specific set.
export const getCardsBySetId = (setId: string): Card[] => {
  const set: Set | null = getSetById(setId);
  if (!set) return [];

  const modulePath: string = `../../data/${set.series_id}/cards_${set.id}.json`;
  return cardModules[modulePath] ?? [];
};

// Returns one card from the single JSON file that belongs to its set.
export const getCardById = (setId: string, cardId: string): Card | null => {
  return getCardsBySetId(setId).find((card) => card.id === cardId) ?? null;
};

// Returns one set by id if it exists.
export const getSetById = (setId: string): Set | null => {
  return getSets().find((set) => set.id === setId) ?? null;
};

// Returns one series by id if it exists.
export const getSeriesById = (seriesId: string): Series | null => {
  return getSeries().find((series) => series.id === seriesId) ?? null;
};
