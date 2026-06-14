CREATE TYPE regional_variant AS ENUM (
  'none',
  'alola',
  'galar',
  'hisui',
  'paldea'
);

CREATE TYPE card_variant AS ENUM (
  'normal',
  'first_edition',
  'reverse_holo',
  'holo',
  'promo',
  'full_art',
  'secret',
  'alternate_art'
);

CREATE TYPE card_condition AS ENUM (
  'mint',
  'near_mint',
  'excellent',
  'good',
  'played',
  'poor'
);

CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  release_date DATE
);

CREATE TABLE languages (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE pokemon (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pokedex_number INTEGER NOT NULL,
  generation_id TEXT NOT NULL REFERENCES generations(id),
  regional_variant regional_variant NOT NULL DEFAULT 'none',
  image_url TEXT,
  UNIQUE (pokedex_number, regional_variant)
);

CREATE TABLE series (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  image_url TEXT,
  release_date DATE
);

CREATE TABLE sets (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL REFERENCES series(id),
  name TEXT NOT NULL,
  image_url TEXT,
  symbol_image_url TEXT,
  release_date DATE,
  UNIQUE (series_id, name)
);

CREATE TABLE set_languages (
  set_id TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  language_id TEXT NOT NULL REFERENCES languages(id),
  PRIMARY KEY (set_id, language_id)
);

CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  number TEXT NOT NULL,
  rarity TEXT,
  card_type TEXT,
  variant card_variant NOT NULL DEFAULT 'normal',
  artist TEXT,
  external_id TEXT UNIQUE,
  UNIQUE (set_id, number, variant)
);

CREATE TABLE card_pokemon (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  pokemon_id TEXT NOT NULL REFERENCES pokemon(id),
  PRIMARY KEY (card_id, pokemon_id)
);

CREATE TABLE collected_cards (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id),
  language_id TEXT NOT NULL REFERENCES languages(id),
  image_url TEXT,
  condition card_condition NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note TEXT,
  acquired_at DATE,
  purchase_price NUMERIC(12, 2),
  estimated_value NUMERIC(12, 2),
  storage_location TEXT,
  for_trade BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_pokemon_generation_id ON pokemon(generation_id);
CREATE INDEX idx_sets_series_id ON sets(series_id);
CREATE INDEX idx_cards_set_id ON cards(set_id);
CREATE INDEX idx_card_pokemon_pokemon_id ON card_pokemon(pokemon_id);
CREATE INDEX idx_collected_cards_card_id ON collected_cards(card_id);
CREATE INDEX idx_collected_cards_language_id ON collected_cards(language_id);

CREATE OR REPLACE FUNCTION validate_collected_card_language()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cards
    JOIN set_languages ON set_languages.set_id = cards.set_id
    WHERE cards.id = NEW.card_id
      AND set_languages.language_id = NEW.language_id
  ) THEN
    RAISE EXCEPTION 'language % is not available for card % set', NEW.language_id, NEW.card_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collected_cards_language_check
BEFORE INSERT OR UPDATE OF card_id, language_id ON collected_cards
FOR EACH ROW
EXECUTE FUNCTION validate_collected_card_language();
