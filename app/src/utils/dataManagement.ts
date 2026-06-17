import type { Region, Series, Set } from './types';

// Eagerly loads every configured region from the local JSON catalog.
const regionModules = import.meta.glob<Region[]>('../../data/regions.json', { eager: true, import: 'default' });

// Eagerly loads every configured series from the local JSON catalog.
const seriesModules = import.meta.glob<Series[]>('../../data/series.json', { eager: true, import: 'default' });

// Eagerly loads each per-series set file from the local JSON catalog.
const setModules = import.meta.glob<Set[]>('../../data/*/sets.json', { eager: true, import: 'default' });

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
