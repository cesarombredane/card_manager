const DEFAULT_SERIES_NAME = "Unknown Series";
const DEFAULT_SET_NAME = "Unknown Set";
const DEFAULT_MODIFIER_CODE = "normal";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeInteger(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function findUpload(files, fieldNames) {
  return files.find((file) => fieldNames.includes(file.fieldname)) || null;
}

function normalizeCardInput(body, files = []) {
  const cardImage = findUpload(files, ["cardImage", "image"]);
  const collectedImage = findUpload(files, ["collectedImage"]);

  return {
    seriesName: normalizeText(body.seriesName || body.series_name) || DEFAULT_SERIES_NAME,
    setName: normalizeText(body.setName || body.set_name) || DEFAULT_SET_NAME,
    name: normalizeText(body.name),
    number: normalizeText(body.number || body.cardNumber || body.card_number),
    modifierCode: normalizeText(body.modifierCode || body.modifier_code) || DEFAULT_MODIFIER_CODE,
    modifierName: normalizeText(body.modifierName || body.modifier_name),
    condition: normalizeText(body.condition),
    note: normalizeText(body.note || body.notes),
    quantity: normalizeInteger(body.quantity),
    cardImageMime: cardImage?.mimetype || null,
    cardImageData: cardImage?.buffer || null,
    collectedImageMime: collectedImage?.mimetype || null,
    collectedImageData: collectedImage?.buffer || null
  };
}

function toPublicCollectedCard(row) {
  return {
    id: Number(row.id),
    collectedCardId: Number(row.id),
    cardId: Number(row.card_id),
    name: row.name,
    seriesId: Number(row.series_id),
    seriesName: row.series_name,
    setId: Number(row.set_id),
    setName: row.set_name,
    cardNumber: row.number,
    number: row.number,
    modifierId: Number(row.modifier_id),
    modifierCode: row.modifier_code,
    modifierName: row.modifier_name,
    condition: row.condition || "",
    notes: row.note || "",
    note: row.note || "",
    quantity: 1,
    hasImage: Boolean(row.card_has_image),
    imageUrl: row.card_has_image ? `/api/cards/${row.card_id}/image` : null,
    hasCollectedImage: Boolean(row.collected_has_image),
    collectedImageUrl: row.collected_has_image ? `/api/collection/${row.id}/image` : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

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
    modifiers.code AS modifier_code,
    modifiers.name AS modifier_name,
    card_sets.id AS set_id,
    card_sets.name AS set_name,
    series.id AS series_id,
    series.name AS series_name
  FROM collected_cards
  JOIN cards ON cards.id = collected_cards.card_id
  JOIN modifiers ON modifiers.id = cards.modifier_id
  JOIN card_sets ON card_sets.id = cards.set_id
  JOIN series ON series.id = card_sets.series_id
`;

async function upsertSeries(client, name) {
  const result = await client.query(
    `
      INSERT INTO series (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [name]
  );

  return result.rows[0].id;
}

async function upsertSet(client, seriesId, name) {
  const result = await client.query(
    `
      INSERT INTO card_sets (series_id, name)
      VALUES ($1, $2)
      ON CONFLICT (series_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [seriesId, name]
  );

  return result.rows[0].id;
}

async function upsertModifier(client, code, name) {
  const label = name || code.replaceAll("_", " ");
  const result = await client.query(
    `
      INSERT INTO modifiers (code, name)
      VALUES ($1, $2)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [code, label]
  );

  return result.rows[0].id;
}

async function upsertTheoreticalCard(client, card) {
  const seriesId = await upsertSeries(client, card.seriesName);
  const setId = await upsertSet(client, seriesId, card.setName);
  const modifierId = await upsertModifier(client, card.modifierCode, card.modifierName);

  const result = await client.query(
    `
      INSERT INTO cards (
        set_id,
        modifier_id,
        name,
        number,
        image_mime,
        image_data
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (set_id, number, modifier_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        image_mime = COALESCE(EXCLUDED.image_mime, cards.image_mime),
        image_data = COALESCE(EXCLUDED.image_data, cards.image_data)
      RETURNING id
    `,
    [setId, modifierId, card.name, card.number, card.cardImageMime, card.cardImageData]
  );

  return result.rows[0].id;
}

export async function listCards(database) {
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

export async function createCard(database, body, files = []) {
  const normalizedFiles = Array.isArray(files) ? files : files ? [files] : [];
  const card = normalizeCardInput(body, normalizedFiles);

  if (!card.name) {
    const error = new Error("Card name is required.");
    error.status = 400;
    throw error;
  }

  if (!card.number) {
    const error = new Error("Card number is required.");
    error.status = 400;
    throw error;
  }

  return database.transaction(async (client) => {
    const cardId = await upsertTheoreticalCard(client, card);
    let lastCollectedId = null;

    for (let index = 0; index < card.quantity; index += 1) {
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
          card.condition || null,
          card.note || null,
          card.collectedImageMime,
          card.collectedImageData
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

export async function updateCard(database, id, body, files = []) {
  const normalizedFiles = Array.isArray(files) ? files : files ? [files] : [];
  const card = normalizeCardInput(body, normalizedFiles);

  if (!card.name) {
    const error = new Error("Card name is required.");
    error.status = 400;
    throw error;
  }

  if (!card.number) {
    const error = new Error("Card number is required.");
    error.status = 400;
    throw error;
  }

  return database.transaction(async (client) => {
    const current = await client.query(
      "SELECT id FROM collected_cards WHERE id = $1",
      [id]
    );

    if (current.rowCount === 0) {
      return null;
    }

    const cardId = await upsertTheoreticalCard(client, card);

    await client.query(
      `
        UPDATE collected_cards
        SET card_id = $1,
            condition = $2,
            note = $3,
            image_mime = COALESCE($4, image_mime),
            image_data = COALESCE($5, image_data)
        WHERE id = $6
      `,
      [
        cardId,
        card.condition || null,
        card.note || null,
        card.collectedImageMime,
        card.collectedImageData,
        id
      ]
    );

    const result = await client.query(
      `${COLLECTED_CARD_SELECT} WHERE collected_cards.id = $1`,
      [id]
    );

    return toPublicCollectedCard(result.rows[0]);
  });
}

export async function deleteCard(database, id) {
  const result = await database.query("DELETE FROM collected_cards WHERE id = $1", [id]);
  return result.rowCount > 0;
}

export async function importCards(database, records) {
  const created = [];

  for (const record of records) {
    const card = await createCard(database, record);
    created.push(card);
  }

  return created;
}

export async function migrateJsonCards(database, cards = []) {
  for (const card of cards) {
    await createCard(database, {
      seriesName: card.seriesName || DEFAULT_SERIES_NAME,
      setName: card.setName || DEFAULT_SET_NAME,
      name: card.name,
      number: card.number || card.cardNumber || "unknown",
      modifierCode: card.modifierCode || DEFAULT_MODIFIER_CODE,
      condition: card.condition,
      note: card.note || card.notes,
      quantity: card.quantity || 1
    });
  }
}
