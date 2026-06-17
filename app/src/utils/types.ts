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

// A set inside one series, with language-specific availability.
export type Set = {
  id: string;
  series_id: string;
  name: string;
  local_name: string | null;
  title_image_url: string | null;
  symbol_image_url: string | null;
  release_date: string;
  card_count: number;
  language_ids: string[];
};

// Localized text keyed by language code.
export type LocalizedText = Record<string, string | null>;

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
  variants: CardVariant[];
};
