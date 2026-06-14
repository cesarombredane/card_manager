ALTER TABLE series
ADD COLUMN IF NOT EXISTS image_mime TEXT,
ADD COLUMN IF NOT EXISTS image_data BYTEA;

ALTER TABLE card_sets
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS image_mime TEXT,
ADD COLUMN IF NOT EXISTS image_data BYTEA;

CREATE TABLE IF NOT EXISTS pokemon (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pokedex_id INTEGER NOT NULL UNIQUE,
  image_mime TEXT,
  image_data BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cards
ADD COLUMN IF NOT EXISTS pokemon_id BIGINT REFERENCES pokemon(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS pokemon_set_updated_at ON pokemon;
CREATE TRIGGER pokemon_set_updated_at
BEFORE UPDATE ON pokemon
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS card_sets_name_idx ON card_sets (name);
CREATE INDEX IF NOT EXISTS card_sets_series_id_idx ON card_sets (series_id);
CREATE INDEX IF NOT EXISTS cards_number_idx ON cards (number);
CREATE INDEX IF NOT EXISTS cards_pokemon_id_idx ON cards (pokemon_id);
CREATE INDEX IF NOT EXISTS pokemon_name_idx ON pokemon (name);
CREATE INDEX IF NOT EXISTS pokemon_pokedex_id_idx ON pokemon (pokedex_id);
