function normalizeCardInput(body, file) {
  return {
    name: String(body.name || "").trim(),
    setName: String(body.setName || body.set_name || "").trim(),
    cardNumber: String(body.cardNumber || body.card_number || "").trim(),
    rarity: String(body.rarity || "").trim(),
    condition: String(body.condition || "").trim(),
    quantity: Number.parseInt(body.quantity || "1", 10),
    notes: String(body.notes || "").trim(),
    imageMime: file?.mimetype || null,
    imageData: file?.buffer ? file.buffer.toString("base64") : null
  };
}

function toPublicCard(row) {
  return {
    id: row.id,
    name: row.name,
    setName: row.setName,
    cardNumber: row.cardNumber,
    rarity: row.rarity,
    condition: row.condition,
    quantity: row.quantity,
    notes: row.notes,
    hasImage: Boolean(row.imageData),
    imageUrl: row.imageData ? `/api/cards/${row.id}/image` : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function listCards(database) {
  const state = await database.read();
  return state.cards
    .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(toPublicCard);
}

export async function getCard(database, id) {
  const state = await database.read();
  const row = state.cards.find((card) => card.id === Number(id));
  return row ? toPublicCard(row) : null;
}

export async function getCardImage(database, id) {
  const state = await database.read();
  const row = state.cards.find((card) => card.id === Number(id));

  if (!row?.imageData) {
    return null;
  }

  return {
    mime: row.imageMime,
    data: Buffer.from(row.imageData, "base64")
  };
}

export async function createCard(database, body, file) {
  const card = normalizeCardInput(body, file);

  if (!card.name) {
    const error = new Error("Card name is required.");
    error.status = 400;
    throw error;
  }

  const now = new Date().toISOString();

  return database.update((state) => {
    const record = {
      id: state.nextCardId,
      name: card.name,
      setName: card.setName,
      cardNumber: card.cardNumber,
      rarity: card.rarity,
      condition: card.condition,
      quantity: Number.isFinite(card.quantity) ? card.quantity : 1,
      notes: card.notes,
      imageMime: card.imageMime,
      imageData: card.imageData,
      createdAt: now,
      updatedAt: now
    };

    state.nextCardId += 1;
    state.cards.push(record);

    return toPublicCard(record);
  });
}

export async function updateCard(database, id, body, file) {
  const card = normalizeCardInput(body, file);

  if (!card.name) {
    const error = new Error("Card name is required.");
    error.status = 400;
    throw error;
  }

  return database.update((state) => {
    const record = state.cards.find((item) => item.id === Number(id));

    if (!record) {
      return null;
    }

    record.name = card.name;
    record.setName = card.setName;
    record.cardNumber = card.cardNumber;
    record.rarity = card.rarity;
    record.condition = card.condition;
    record.quantity = Number.isFinite(card.quantity) ? card.quantity : 1;
    record.notes = card.notes;
    record.updatedAt = new Date().toISOString();

    if (file) {
      record.imageMime = card.imageMime;
      record.imageData = card.imageData;
    }

    return toPublicCard(record);
  });
}

export async function deleteCard(database, id) {
  return database.update((state) => {
    const originalLength = state.cards.length;
    state.cards = state.cards.filter((card) => card.id !== Number(id));
    return state.cards.length !== originalLength;
  });
}

export async function importCards(database, records) {
  const created = [];

  for (const record of records) {
    const card = await createCard(database, record, null);
    created.push(card);
  }

  return created;
}
