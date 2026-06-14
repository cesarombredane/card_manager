function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPublicSeries(row) {
  return {
    id: Number(row.id),
    name: row.name,
    hasImage: Boolean(row.has_image),
    imageUrl: row.has_image ? `/api/series/${row.id}/image` : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toPublicSet(row) {
  return {
    id: Number(row.id),
    name: row.name,
    language: row.language || "",
    seriesId: Number(row.seriesId),
    seriesName: row.seriesName,
    hasImage: Boolean(row.hasImage),
    imageUrl: row.hasImage ? `/api/sets/${row.id}/image` : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toPublicPokemon(row) {
  return {
    id: Number(row.id),
    name: row.name,
    pokedexId: row.pokedexId,
    hasImage: Boolean(row.hasImage),
    imageUrl: row.hasImage ? `/api/pokemon/${row.id}/image` : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function listSeries(database) {
  const result = await database.query(`
    SELECT
      id,
      name,
      image_data IS NOT NULL AS has_image,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM series
    ORDER BY name
  `);
  return result.rows.map(toPublicSeries);
}

export async function createSeries(database, body, file) {
  const name = normalizeText(body.name);

  if (!name) {
    const error = new Error("Series name is required.");
    error.status = 400;
    throw error;
  }

  const result = await database.query(
    `
      INSERT INTO series (name, image_mime, image_data)
      VALUES ($1, $2, $3)
      ON CONFLICT (name)
      DO UPDATE SET
        image_mime = COALESCE(EXCLUDED.image_mime, series.image_mime),
        image_data = COALESCE(EXCLUDED.image_data, series.image_data)
      RETURNING
        id,
        name,
        image_data IS NOT NULL AS has_image,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [name, file?.mimetype || null, file?.buffer || null]
  );

  return toPublicSeries(result.rows[0]);
}

export async function getSeriesImage(database, id) {
  const result = await database.query(
    "SELECT image_mime AS mime, image_data AS data FROM series WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function listSets(database, filters = {}) {
  const clauses = [];
  const values = [];

  if (filters.seriesId) {
    values.push(filters.seriesId);
    clauses.push(`card_sets.series_id = $${values.length}`);
  }

  if (filters.name) {
    values.push(`%${filters.name}%`);
    clauses.push(`card_sets.name ILIKE $${values.length}`);
  }

  const result = await database.query(
    `
      SELECT
        card_sets.id,
        card_sets.name,
        card_sets.language,
        card_sets.series_id AS "seriesId",
        card_sets.image_data IS NOT NULL AS "hasImage",
        series.name AS "seriesName",
        card_sets.created_at AS "createdAt",
        card_sets.updated_at AS "updatedAt"
      FROM card_sets
      JOIN series ON series.id = card_sets.series_id
      ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY series.name, card_sets.name
    `,
    values
  );

  return result.rows.map(toPublicSet);
}

export async function createSet(database, body, file) {
  const name = normalizeText(body.name);
  const seriesId = normalizeInteger(body.seriesId || body.series_id);
  const language = normalizeText(body.language);

  if (!name || !seriesId) {
    const error = new Error("Set name and seriesId are required.");
    error.status = 400;
    throw error;
  }

  const result = await database.query(
    `
      INSERT INTO card_sets (series_id, name, language, image_mime, image_data)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (series_id, name)
      DO UPDATE SET
        language = COALESCE(EXCLUDED.language, card_sets.language),
        image_mime = COALESCE(EXCLUDED.image_mime, card_sets.image_mime),
        image_data = COALESCE(EXCLUDED.image_data, card_sets.image_data)
      RETURNING id
    `,
    [seriesId, name, language || null, file?.mimetype || null, file?.buffer || null]
  );

  const sets = await listSets(database, { seriesId });
  return sets.find((set) => set.id === Number(result.rows[0].id));
}

export async function getSetImage(database, id) {
  const result = await database.query(
    "SELECT image_mime AS mime, image_data AS data FROM card_sets WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function listModifiers(database) {
  const result = await database.query(
    "SELECT id, code, name, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM modifiers ORDER BY name"
  );
  return result.rows.map((row) => ({ ...row, id: Number(row.id) }));
}

export async function listPokemon(database, filters = {}) {
  const values = [];
  const clauses = [];

  if (filters.name) {
    values.push(`%${filters.name}%`);
    clauses.push(`name ILIKE $${values.length}`);
  }

  const result = await database.query(
    `
      SELECT
        id,
        name,
        pokedex_id AS "pokedexId",
        image_data IS NOT NULL AS "hasImage",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM pokemon
      ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
      ORDER BY pokedex_id, name
    `,
    values
  );

  return result.rows.map(toPublicPokemon);
}

export async function createPokemon(database, body, file) {
  const name = normalizeText(body.name);
  const pokedexId = normalizeInteger(body.pokedexId || body.pokedex_id);

  if (!name || !pokedexId) {
    const error = new Error("Pokemon name and pokedexId are required.");
    error.status = 400;
    throw error;
  }

  const result = await database.query(
    `
      INSERT INTO pokemon (name, pokedex_id, image_mime, image_data)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (pokedex_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        image_mime = COALESCE(EXCLUDED.image_mime, pokemon.image_mime),
        image_data = COALESCE(EXCLUDED.image_data, pokemon.image_data)
      RETURNING
        id,
        name,
        pokedex_id AS "pokedexId",
        image_data IS NOT NULL AS "hasImage",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [name, pokedexId, file?.mimetype || null, file?.buffer || null]
  );

  return toPublicPokemon(result.rows[0]);
}

export async function getPokemonImage(database, id) {
  const result = await database.query(
    "SELECT image_mime AS mime, image_data AS data FROM pokemon WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}
