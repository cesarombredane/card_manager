const DEFAULT_MODIFIER_CODE = "normal";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeInteger(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findUpload(files, fieldNames) {
  return files.find((file) => fieldNames.includes(file.fieldname)) || null;
}

function toPublicCard(row) {
  return {
    id: Number(row.id),
    name: row.name,
    number: row.number,
    cardNumber: row.number,
    setId: Number(row.set_id),
    setName: row.set_name,
    setLanguage: row.set_language || "",
    seriesId: Number(row.series_id),
    seriesName: row.series_name,
    modifierId: Number(row.modifier_id),
    modifierCode: row.modifier_code,
    modifierName: row.modifier_name,
    pokemonId: row.pokemon_id ? Number(row.pokemon_id) : null,
    pokemonName: row.pokemon_name || "",
    pokedexId: row.pokedex_id || null,
    collectedCount: Number(row.collected_count || 0),
    hasImage: Boolean(row.has_image),
    imageUrl: row.has_image ? `/api/cards/${row.id}/image` : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toPublicCollectedCard(row) {
  return {
    id: Number(row.id),
    collectedCardId: Number(row.id),
    cardId: Number(row.card_id),
    name: row.name,
    number: row.number,
    cardNumber: row.number,
    setId: Number(row.set_id),
    setName: row.set_name,
    setLanguage: row.set_language || "",
    seriesId: Number(row.series_id),
    seriesName: row.series_name,
    modifierId: Number(row.modifier_id),
    modifierCode: row.modifier_code,
    modifierName: row.modifier_name,
    pokemonId: row.pokemon_id ? Number(row.pokemon_id) : null,
    pokemonName: row.pokemon_name || "",
    pokedexId: row.pokedex_id || null,
    condition: row.condition || "",
    note: row.note || "",
    notes: row.note || "",
    hasImage: Boolean(row.card_has_image),
    imageUrl: row.card_has_image ? `/api/cards/${row.card_id}/image` : null,
    hasCollectedImage: Boolean(row.collected_has_image),
    collectedImageUrl: row.collected_has_image ? `/api/collection/${row.id}/image` : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const CARD_SELECT = `
  SELECT
    cards.id,
    cards.name,
    cards.number,
    cards.image_data IS NOT NULL AS has_image,
    cards.created_at,
    cards.updated_at,
    cards.modifier_id,
    cards.pokemon_id,
    modifiers.code AS modifier_code,
    modifiers.name AS modifier_name,
    pokemon.name AS pokemon_name,
    pokemon.pokedex_id,
    card_sets.id AS set_id,
    card_sets.name AS set_name,
    card_sets.language AS set_language,
    series.id AS series_id,
    series.name AS series_name,
    COUNT(collected_cards.id) AS collected_count
  FROM cards
  JOIN modifiers ON modifiers.id = cards.modifier_id
  JOIN card_sets ON card_sets.id = cards.set_id
  JOIN series ON series.id = card_sets.series_id
  LEFT JOIN pokemon ON pokemon.id = cards.pokemon_id
  LEFT JOIN collected_cards ON collected_cards.card_id = cards.id
`;

const COLLECTED_CARD_SELECT = `
  SELECT
    collected_cards.id,
    collected_cards.card_id,
    collected_cards.condition,
    collected_cards.note,
    collected_cards.image_data IS NOT NULL AS collected_has_image,
    collected_cards.created_at,
    collected_cards.updated_at,
    cards.name,
    cards.number,
    cards.image_data IS NOT NULL AS card_has_image,
    cards.modifier_id,
    cards.pokemon_id,
    modifiers.code AS modifier_code,
    modifiers.name AS modifier_name,
    pokemon.name AS pokemon_name,
    pokemon.pokedex_id,
    card_sets.id AS set_id,
    card_sets.name AS set_name,
    card_sets.language AS set_language,
    series.id AS series_id,
    series.name AS series_name
  FROM collected_cards
  JOIN cards ON cards.id = collected_cards.card_id
  JOIN modifiers ON modifiers.id = cards.modifier_id
  JOIN card_sets ON card_sets.id = cards.set_id
  JOIN series ON series.id = card_sets.series_id
  LEFT JOIN pokemon ON pokemon.id = cards.pokemon_id
`;

function buildCardFilters(filters = {}) {
  const clauses = [];
  const values = [];

  function add(value, clause) {
    values.push(value);
    clauses.push(clause(values.length));
  }

  if (filters.setId) {
    add(filters.setId, (index) => `cards.set_id = $${index}`);
  }

  if (filters.name) {
    add(`%${filters.name}%`, (index) => `cards.name ILIKE $${index}`);
  }

  if (filters.cardId) {
    add(filters.cardId, (index) => `cards.id = $${index}`);
  }

  if (filters.pokemonId) {
    add(filters.pokemonId, (index) => `cards.pokemon_id = $${index}`);
  }

  if (filters.pokemonName) {
    add(`%${filters.pokemonName}%`, (index) => `pokemon.name ILIKE $${index}`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values
  };
}

export async function listCards(database, filters = {}) {
  const { where, values } = buildCardFilters(filters);
  const result = await database.query(
    `
      ${CARD_SELECT}
      ${where}
      GROUP BY
        cards.id,
        modifiers.id,
        pokemon.id,
        card_sets.id,
        series.id
      ORDER BY series.name, card_sets.name, cards.number, cards.name
    `,
    values
  );

  return result.rows.map(toPublicCard);
}

export async function listCollectedCards(database) {
  const result = await database.query(`
    ${COLLECTED_CARD_SELECT}
    ORDER BY collected_cards.updated_at DESC
  `);

  return result.rows.map(toPublicCollectedCard);
}

export async function getCardImage(database, id) {
  const result = await database.query(
    "SELECT image_mime AS mime, image_data AS data FROM cards WHERE id = $1",
    [id]
  );

  return result.rows[0] || null;
}

export async function getCollectedCardImage(database, id) {
  const result = await database.query(
    "SELECT image_mime AS mime, image_data AS data FROM collected_cards WHERE id = $1",
    [id]
  );

  return result.rows[0] || null;
}

async function resolveModifier(client, code = DEFAULT_MODIFIER_CODE) {
  const result = await client.query("SELECT id FROM modifiers WHERE code = $1", [code]);

  if (result.rowCount > 0) {
    return result.rows[0].id;
  }

  const created = await client.query(
    `
      INSERT INTO modifiers (code, name)
      VALUES ($1, $2)
      RETURNING id
    `,
    [code, code.replaceAll("_", " ")]
  );
  return created.rows[0].id;
}

async function resolvePokemon(client, body) {
  const pokemonId = normalizeInteger(body.pokemonId || body.pokemon_id);
  const pokemonName = normalizeText(body.pokemonName || body.pokemon_name);
  const pokedexId = normalizeInteger(body.pokedexId || body.pokedex_id);

  if (pokemonId) {
    return pokemonId;
  }

  if (!pokemonName || !pokedexId) {
    return null;
  }

  const result = await client.query(
    `
      INSERT INTO pokemon (name, pokedex_id)
      VALUES ($1, $2)
      ON CONFLICT (pokedex_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [pokemonName, pokedexId]
  );

  return result.rows[0].id;
}

export async function createCard(database, body, files = []) {
  const normalizedFiles = Array.isArray(files) ? files : files ? [files] : [];
  const cardImage = findUpload(normalizedFiles, ["cardImage", "image"]);
  const name = normalizeText(body.name);
  const number = normalizeText(body.number || body.cardNumber || body.card_number);
  const setId = normalizeInteger(body.setId || body.set_id);
  const modifierCode = normalizeText(body.modifierCode || body.modifier_code) || DEFAULT_MODIFIER_CODE;

  if (!name || !number || !setId) {
    const error = new Error("Card name, number, and setId are required.");
    error.status = 400;
    throw error;
  }

  return database.transaction(async (client) => {
    const modifierId = await resolveModifier(client, modifierCode);
    const pokemonId = await resolvePokemon(client, body);
    const result = await client.query(
      `
        INSERT INTO cards (
          set_id,
          modifier_id,
          pokemon_id,
          name,
          number,
          image_mime,
          image_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (set_id, number, modifier_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          pokemon_id = EXCLUDED.pokemon_id,
          image_mime = COALESCE(EXCLUDED.image_mime, cards.image_mime),
          image_data = COALESCE(EXCLUDED.image_data, cards.image_data)
        RETURNING id
      `,
      [
        setId,
        modifierId,
        pokemonId,
        name,
        number,
        cardImage?.mimetype || null,
        cardImage?.buffer || null
      ]
    );

    const cards = await client.query(
      `
        ${CARD_SELECT}
        WHERE cards.id = $1
        GROUP BY cards.id, modifiers.id, pokemon.id, card_sets.id, series.id
      `,
      [result.rows[0].id]
    );

    return toPublicCard(cards.rows[0]);
  });
}

export async function createCollectedCard(database, body, files = []) {
  const normalizedFiles = Array.isArray(files) ? files : files ? [files] : [];
  const collectedImage = findUpload(normalizedFiles, ["collectedImage", "image"]);
  const cardId = normalizeInteger(body.cardId || body.card_id);
  const quantity = Math.max(normalizeInteger(body.quantity, 1), 1);

  if (!cardId) {
    const error = new Error("cardId is required.");
    error.status = 400;
    throw error;
  }

  return database.transaction(async (client) => {
    let lastCollectedId = null;

    for (let index = 0; index < quantity; index += 1) {
      const result = await client.query(
        `
          INSERT INTO collected_cards (
            card_id,
            condition,
            note,
            image_mime,
            image_data
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [
          cardId,
          normalizeText(body.condition) || null,
          normalizeText(body.note || body.notes) || null,
          collectedImage?.mimetype || null,
          collectedImage?.buffer || null
        ]
      );

      lastCollectedId = result.rows[0].id;
    }

    const result = await client.query(
      `${COLLECTED_CARD_SELECT} WHERE collected_cards.id = $1`,
      [lastCollectedId]
    );

    return toPublicCollectedCard(result.rows[0]);
  });
}

export async function updateCollectedCard(database, id, body, files = []) {
  const normalizedFiles = Array.isArray(files) ? files : files ? [files] : [];
  const collectedImage = findUpload(normalizedFiles, ["collectedImage", "image"]);
  const cardId = normalizeInteger(body.cardId || body.card_id);

  const result = await database.query(
    `
      UPDATE collected_cards
      SET card_id = COALESCE($1, card_id),
          condition = $2,
          note = $3,
          image_mime = COALESCE($4, image_mime),
          image_data = COALESCE($5, image_data)
      WHERE id = $6
      RETURNING id
    `,
    [
      cardId,
      normalizeText(body.condition) || null,
      normalizeText(body.note || body.notes) || null,
      collectedImage?.mimetype || null,
      collectedImage?.buffer || null,
      id
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const collected = await database.query(
    `${COLLECTED_CARD_SELECT} WHERE collected_cards.id = $1`,
    [id]
  );

  return toPublicCollectedCard(collected.rows[0]);
}

export async function deleteCollectedCard(database, id) {
  const result = await database.query("DELETE FROM collected_cards WHERE id = $1", [id]);
  return result.rowCount > 0;
}

export async function importCards(database, records) {
  const created = [];

  for (const record of records) {
    const card = await createCollectedCard(database, record);
    created.push(card);
  }

  return created;
}

export async function migrateJsonCards(database, cards = []) {
  for (const card of cards) {
    await createCollectedCard(database, {
      cardId: card.cardId,
      condition: card.condition,
      note: card.note || card.notes,
      quantity: card.quantity || 1
    });
  }
}
