import type { PokedexBinderConfig } from '../utils/pokedex_binder';
export const cardConditions = [
  { label: 'MT — Mint', value: 'MT' },
  { label: 'NM — Near Mint', value: 'NM' },
  { label: 'EX — Excellent', value: 'EX' },
  { label: 'GD — Good', value: 'GD' },
  { label: 'LP — Light Played', value: 'LP' },
  { label: 'PL — Played', value: 'PL' },
  { label: 'HP — Heavily Played', value: 'HP' },
] as const;

export type CardCondition = (typeof cardConditions)[number]['value'];

export type CollectionFolderType = 'box' | 'binder';

export type CollectionFolder = {
  id: string;
  name: string;
  type: CollectionFolderType;
  pokedex_config?: PokedexBinderConfig;
  created_at: string;
};

export type CollectionEntry = {
  id: string;
  folder_id: string;
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
  condition: CardCondition;
  quantity: number;
  wanted: boolean;
  strong_language?: boolean;
  pokedex_requirement_id?: string;
  pokedex_candidate_count?: number;
  added_at: string;
  updated_at: string;
};

export type ManualCollectionCard = {
  id: string;
  name: string;
  set_name: string;
  number: string;
  category: string;
  rarity: string;
  pokemon_name: string;
  hp: number | null;
  types: string[];
  illustrator: string;
  notes: string;
  estimated_value: number | null;
  release_date: string | null;
  created_at: string;
  updated_at: string;
};

export type CollectionData = {
  version: 2;
  folders: CollectionFolder[];
  entries: CollectionEntry[];
  manual_cards: ManualCollectionCard[];
};
