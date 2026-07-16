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
export type LocalizedText = Record<string, string | null>;

// A standardized Pokemon species or requested special form.
export type Pokemon = {
  id: string;
  pokedex_id: number;
  name: string;
  names: LocalizedText;
  form: 'mega' | 'alolan' | 'galarian' | 'hisuian' | 'paldean' | null;
};

export type CoverageCounts = {
  slots: number;
  filled: number;
  missing: number;
  percent: number;
};

export type SetCoverage = {
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
  language_coverage: Record<string, CoverageCounts>;
  missing_card_ids: string[];
  missing_images: Record<string, string[]>;
  sources: Record<string, unknown>;
};

export type CoverageReport = {
  schema_version: number;
  generated_at: string;
  totals: Record<string, number>;
  sources: { definitions: Record<string, unknown>; matched_sets: number; matched_cards: number; metadata_fields_filled: number };
  languages: Record<string, CoverageCounts>;
  missing_metadata: Record<string, string[]>;
  missing_set_assets: { logo: string[]; symbol: string[] };
  series: Record<string, { name: string; region_id: string; sets: number; cards: number; cards_with_image: number; cards_without_image: number; percent: number }>;
  sets: SetCoverage[];
};

// A set inside one series, with language-specific availability.
export type Set = {
  id: string;
  tcgdex_id: string;
  series_id: string;
  name: LocalizedText;
  title_image_url: string | null;
  symbol_image_url: string | null;
  release_date: string;
  card_count: number;
  language_ids: string[];
};

// A damage modifier attached to a card.
export type CardModifier = {
  type: string;
  value: string;
};

// A Pokemon card attack with localized name and text.
export type CardAttack = {
  name: LocalizedText;
  cost: string[];
  damage: string;
  text: LocalizedText;
};

// A specific collectible version of a card.
export type CardVariant = {
  id: string;
  stamp?: string;
  images: Record<string, string>;
};

// A card definition inside a set.
export type Card = {
  id: string;
  set_id: string;
  number: string;
  category: 'pokemon' | 'trainer' | 'energy';
  name: LocalizedText;
  pokemon?: string[];
  illustrator?: string | null;
  rarity: string;
  regulation_mark: string | null;
  hp?: number;
  types?: string[];
  stage?: string;
  evolves_from?: LocalizedText | null;
  rule_box?: string;
  attacks?: CardAttack[];
  weaknesses?: CardModifier[];
  resistances?: CardModifier[];
  retreat_cost?: number;
  trainer_type?: string;
  rules_text?: LocalizedText;
  flavor_text?: LocalizedText;
  legalities?: Record<string, string>;
  variants: CardVariant[];
};
