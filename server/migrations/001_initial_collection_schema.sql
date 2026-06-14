CREATE TABLE series (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE card_sets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  series_id BIGINT NOT NULL REFERENCES series(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (series_id, name)
);

CREATE TABLE modifiers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  set_id BIGINT NOT NULL REFERENCES card_sets(id) ON DELETE RESTRICT,
  modifier_id BIGINT NOT NULL REFERENCES modifiers(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  image_mime TEXT,
  image_data BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (set_id, number, modifier_id)
);

CREATE TABLE collected_cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id BIGINT NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  condition TEXT,
  note TEXT,
  image_mime TEXT,
  image_data BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER series_set_updated_at
BEFORE UPDATE ON series
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER card_sets_set_updated_at
BEFORE UPDATE ON card_sets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER modifiers_set_updated_at
BEFORE UPDATE ON modifiers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER cards_set_updated_at
BEFORE UPDATE ON cards
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER collected_cards_set_updated_at
BEFORE UPDATE ON collected_cards
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO modifiers (code, name)
VALUES
  ('normal', 'Normal'),
  ('first_edition', '1st Edition'),
  ('holo', 'Holo'),
  ('reverse', 'Reverse'),
  ('reverse_holo', 'Reverse Holo'),
  ('promo', 'Promo')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX cards_name_idx ON cards (name);
CREATE INDEX cards_set_id_idx ON cards (set_id);
CREATE INDEX collected_cards_card_id_idx ON collected_cards (card_id);
