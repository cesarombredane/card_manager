// A printing/product market, such as Japan or International.
export type Region = {
  id: string;
  name: string;
};

// A display language available in at least one set.
export type Language = {
  id: string;
  name: string;
};

// A region-specific era of releases.
export type Series = {
  id: string;
  region_id: string;
  name: string;
  start_date: string;
};

// Localized text keyed by language code.
export type Localized_Text = Record<string, string | null>;

// A standardized Pokemon species or requested special form.
export type Pokemon = {
  id: string;
  pokedex_id: number;
  name: string;
  names: Localized_Text;
  form: 'mega' | 'alolan' | 'galarian' | 'hisuian' | 'paldean' | null;
};

export type Coverage_Counts = {
  slots: number;
  filled: number;
  missing: number;
  percent: number;
};

export type Set_Coverage = {
  id: string;
  name: string;
  series_id: string;
  series_name: string;
  region_id: string;
  release_date: string;
  languages: string[];
  has_logo: boolean;
  has_symbol: boolean;
  cards: number;
  variants: number;
  cards_with_image: number;
  cards_without_image: number;
  image_coverage_percent: number;
  language_coverage: Record<string, Coverage_Counts>;
  missing_card_ids: string[];
  missing_images: Record<string, string[]>;
  sources: Record<string, unknown>;
};

export type Coverage_Report = {
  schema_version: number;
  generated_at: string;
  totals: Record<string, number>;
  sources: {
    definitions: Record<string, unknown>;
    matched_sets: number;
    matched_cards: number;
    metadata_fields_filled: number;
  };
  languages: Record<string, Coverage_Counts>;
  missing_metadata: Record<string, string[]>;
  missing_set_assets: { logo: string[]; symbol: string[] };
  series: Record<
    string,
    {
      name: string;
      region_id: string;
      sets: number;
      cards: number;
      cards_with_image: number;
      cards_without_image: number;
      percent: number;
    }
  >;
  sets: Set_Coverage[];
};

// A set inside one series, with language-specific availability.
export type Set = {
  id: string;
  tcgdex_id: string;
  tcgdex_series_id: string;
  series_id: string;
  name: Localized_Text;
  title_image_url: string | null;
  symbol_image_url: string | null;
  release_date: string;
  card_count: number;
  language_ids: string[];
};

// A damage modifier attached to a card.
export type Card_Modifier = {
  type: string;
  value: string;
};

// A Pokemon card attack with localized name and text.
export type Card_Attack = {
  name: Localized_Text;
  cost: string[];
  damage: string;
  text: Localized_Text;
};

// A specific collectible version of a card.
export type Card_Variant = {
  id: string;
  type?: string;
  subtype?: string;
  foil?: string;
  stamps?: string[];
  language_ids?: string[];
  images: Record<string, string>;
  cardmarket?: Cardmarket_Price;
};

export type Cardmarket_Price = {
  product_id: number;
  currency: 'EUR';
  updated_at: string;
  price_kind: 'standard' | 'holo';
  average: number | null;
  low: number | null;
  trend: number | null;
  average_1d: number | null;
  average_7d: number | null;
  average_30d: number | null;
  url: string | null;
};

// A card definition inside a set.
export type Card = {
  id: string;
  set_id: string;
  number: string;
  category: 'pokemon' | 'trainer' | 'energy';
  name: Localized_Text;
  pokemon?: string[];
  illustrator?: string | null;
  rarity: string;
  regulation_mark: string | null;
  hp?: number;
  types?: string[];
  stage?: string;
  evolves_from?: Localized_Text | null;
  rule_box?: string;
  attacks?: Card_Attack[];
  weaknesses?: Card_Modifier[];
  resistances?: Card_Modifier[];
  retreat_cost?: number;
  trainer_type?: string;
  rules_text?: Localized_Text;
  flavor_text?: Localized_Text;
  legalities?: Record<string, string>;
  variants: Card_Variant[];
};
