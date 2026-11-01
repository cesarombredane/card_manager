export type Pokedex_Region = 'all' | 'intl' | 'asia';

export type Pokedex_Binder_Config = {
  include_regional_forms: boolean;
  include_mega_forms: boolean;
  region: Pokedex_Region;
  international_language_id: string;
  asia_language_id: string;
  series_ids: string[];
  variant_types: string[];
  rarities: string[];
};

export type Pokedex_Candidate = {
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
};
