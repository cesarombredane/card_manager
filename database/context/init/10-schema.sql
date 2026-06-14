CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,
  name TEXT NOT NULL,
  native_name TEXT,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('active', 'former', 'unknown')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id UUID NOT NULL REFERENCES languages(id),
  region_id UUID NOT NULL REFERENCES regions(id),
  name TEXT NOT NULL,
  local_name TEXT,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id),
  language_id UUID NOT NULL REFERENCES languages(id),
  region_id UUID NOT NULL REFERENCES regions(id),
  name TEXT NOT NULL,
  local_name TEXT,
  set_code TEXT,
  official_card_count INTEGER,
  secret_card_count INTEGER,
  release_date DATE,
  set_type TEXT NOT NULL DEFAULT 'unknown' CHECK (
    set_type IN ('main', 'subset', 'promo', 'deck', 'special', 'jumbo', 'product', 'unknown')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE set_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_set_id UUID NOT NULL REFERENCES sets(id),
  target_set_id UUID NOT NULL REFERENCES sets(id),
  relationship_type TEXT NOT NULL DEFAULT 'unknown' CHECK (
    relationship_type IN (
      'localized_as',
      'contains_cards_from',
      'partially_equivalent_to',
      'merged_into',
      'split_from',
      'reprint_source',
      'unknown'
    )
  ),
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (confidence >= 0 AND confidence <= 1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_set_id <> target_set_id)
);

CREATE TABLE card_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_language_id UUID REFERENCES languages(id),
  original_set_id UUID REFERENCES sets(id),
  original_card_number TEXT,
  canonical_name TEXT,
  card_category TEXT NOT NULL DEFAULT 'unknown' CHECK (
    card_category IN ('pokemon', 'trainer', 'energy', 'unknown')
  ),
  artist TEXT,
  regulation_mark TEXT,
  evolves_from TEXT,
  concept_fingerprint TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE card_concepts IS
  'Abstract card designs independent of language, set print, and physical variant. Example: one specific Pikachu artwork and rules design.';

CREATE TABLE card_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_concept_id UUID NOT NULL REFERENCES card_concepts(id),
  language_id UUID NOT NULL REFERENCES languages(id),
  name TEXT,
  rules_text TEXT,
  flavor_text TEXT,
  ability_name TEXT,
  ability_text TEXT,
  attacks JSONB,
  weakness JSONB,
  resistance JSONB,
  retreat_cost INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_concept_id, language_id)
);

CREATE TABLE pokemon_card_details (
  card_concept_id UUID PRIMARY KEY REFERENCES card_concepts(id),
  hp INTEGER,
  pokemon_type TEXT,
  stage TEXT,
  subtype TEXT,
  rule_box TEXT,
  evolves_from TEXT
);

CREATE TABLE attacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_concept_id UUID NOT NULL REFERENCES card_concepts(id),
  attack_order INTEGER NOT NULL,
  name TEXT,
  cost JSONB,
  damage TEXT,
  text TEXT,
  UNIQUE (card_concept_id, attack_order)
);

CREATE TABLE abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_concept_id UUID NOT NULL REFERENCES card_concepts(id),
  name TEXT,
  text TEXT,
  ability_type TEXT
);

CREATE TABLE card_prints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_concept_id UUID NOT NULL REFERENCES card_concepts(id),
  set_id UUID NOT NULL REFERENCES sets(id),
  language_id UUID NOT NULL REFERENCES languages(id),
  printed_name TEXT NOT NULL,
  card_number TEXT,
  printed_total TEXT,
  rarity TEXT,
  release_date DATE,
  is_promo BOOLEAN NOT NULL DEFAULT false,
  is_jumbo BOOLEAN NOT NULL DEFAULT false,
  is_deck_exclusive BOOLEAN NOT NULL DEFAULT false,
  external_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (set_id, language_id, card_number, printed_name)
);

COMMENT ON TABLE card_prints IS
  'Language-specific physical card print entries inside a set. A card concept can appear as many prints across languages, regions, sets, promos, and reprints.';

CREATE TABLE print_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_print_id UUID NOT NULL REFERENCES card_prints(id),
  variant_type TEXT NOT NULL DEFAULT 'unknown' CHECK (
    variant_type IN (
      'normal',
      'holo',
      'reverse_holo',
      'master_ball',
      'poke_ball',
      'stamped',
      'first_edition',
      'unlimited',
      'staff',
      'cosmos_holo',
      'non_holo',
      'unknown'
    )
  ),
  foil_type TEXT,
  stamp_text TEXT,
  edition TEXT,
  is_tournament_legal BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE print_variants IS
  'Specific collectible variants of one card print, such as normal, reverse holo, stamped, first edition, staff, or special foil treatments.';

CREATE TABLE card_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  print_variant_id UUID NOT NULL REFERENCES print_variants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_source TEXT,
  width INTEGER,
  height INTEGER,
  is_front BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT,
  source_type TEXT NOT NULL DEFAULT 'unknown' CHECK (
    source_type IN ('api', 'wiki', 'official', 'marketplace', 'manual', 'scan', 'unknown')
  ),
  license_notes TEXT,
  terms_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE source_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN ('language', 'series', 'set', 'card_concept', 'card_print', 'print_variant', 'card_image')
  ),
  entity_id UUID NOT NULL,
  external_id TEXT,
  external_url TEXT,
  raw_payload JSONB,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id),
  job_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB
);

CREATE TABLE raw_import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID REFERENCES import_jobs(id),
  source_id UUID REFERENCES sources(id),
  record_type TEXT,
  external_id TEXT,
  payload JSONB NOT NULL,
  normalized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_sets_language_set_code_unique
  ON sets(language_id, set_code)
  WHERE set_code IS NOT NULL;

CREATE INDEX idx_series_language_id ON series(language_id);
CREATE INDEX idx_series_region_id ON series(region_id);
CREATE INDEX idx_sets_language_id ON sets(language_id);
CREATE INDEX idx_sets_series_id ON sets(series_id);
CREATE INDEX idx_sets_region_id ON sets(region_id);
CREATE INDEX idx_sets_release_date ON sets(release_date);
CREATE INDEX idx_sets_set_code ON sets(set_code);
CREATE INDEX idx_set_relationships_source_set_id ON set_relationships(source_set_id);
CREATE INDEX idx_set_relationships_target_set_id ON set_relationships(target_set_id);
CREATE INDEX idx_card_concepts_original_language_id ON card_concepts(original_language_id);
CREATE INDEX idx_card_concepts_original_set_id ON card_concepts(original_set_id);
CREATE INDEX idx_card_texts_card_concept_id ON card_texts(card_concept_id);
CREATE INDEX idx_card_texts_language_id ON card_texts(language_id);
CREATE INDEX idx_attacks_card_concept_id ON attacks(card_concept_id);
CREATE INDEX idx_abilities_card_concept_id ON abilities(card_concept_id);
CREATE INDEX idx_card_prints_card_concept_id ON card_prints(card_concept_id);
CREATE INDEX idx_card_prints_set_id ON card_prints(set_id);
CREATE INDEX idx_card_prints_language_id ON card_prints(language_id);
CREATE INDEX idx_card_prints_card_number ON card_prints(card_number);
CREATE INDEX idx_card_prints_printed_name ON card_prints(printed_name);
CREATE INDEX idx_print_variants_card_print_id ON print_variants(card_print_id);
CREATE INDEX idx_card_images_print_variant_id ON card_images(print_variant_id);
CREATE INDEX idx_source_mappings_source_id ON source_mappings(source_id);
CREATE INDEX idx_source_mappings_entity ON source_mappings(entity_type, entity_id);
CREATE INDEX idx_import_jobs_source_id ON import_jobs(source_id);
CREATE INDEX idx_raw_import_records_import_job_id ON raw_import_records(import_job_id);
CREATE INDEX idx_raw_import_records_source_id ON raw_import_records(source_id);
CREATE INDEX idx_raw_import_records_normalized ON raw_import_records(normalized);

CREATE TRIGGER languages_set_updated_at
BEFORE UPDATE ON languages
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER series_set_updated_at
BEFORE UPDATE ON series
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sets_set_updated_at
BEFORE UPDATE ON sets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER card_concepts_set_updated_at
BEFORE UPDATE ON card_concepts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER card_texts_set_updated_at
BEFORE UPDATE ON card_texts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER card_prints_set_updated_at
BEFORE UPDATE ON card_prints
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER print_variants_set_updated_at
BEFORE UPDATE ON print_variants
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
