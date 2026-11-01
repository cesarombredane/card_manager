// import types
import type { Pokedex_Binder_Config } from './pokedex_binder';

export const card_conditions = [
  { label: 'MT — Mint', value: 'MT' },
  { label: 'NM — Near Mint', value: 'NM' },
  { label: 'EX — Excellent', value: 'EX' },
  { label: 'GD — Good', value: 'GD' },
  { label: 'LP — Light Played', value: 'LP' },
  { label: 'PL — Played', value: 'PL' },
  { label: 'HP — Heavily Played', value: 'HP' },
] as const;

export type Card_Condition = (typeof card_conditions)[number]['value'];

export type Collection_Folder_Type = 'box' | 'binder';

export type Collection_Folder = {
  id: string;
  name: string;
  type: Collection_Folder_Type;
  pokedex_config?: Pokedex_Binder_Config;
  created_at: string;
};

export type Collection_Entry = {
  id: string;
  folder_id: string;
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
  condition: Card_Condition;
  quantity: number;
  wanted: boolean;
  strong_language?: boolean;
  pokedex_requirement_id?: string;
  pokedex_candidate_count?: number;
  added_at: string;
  updated_at: string;
};

export type Manual_Collection_Card = {
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

export type Collection_Data = {
  version: 2;
  folders: Collection_Folder[];
  entries: Collection_Entry[];
  manual_cards: Manual_Collection_Card[];
};
