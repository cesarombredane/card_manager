import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createDatabase } from "../db.js";
import { migrateJsonCards } from "../cardsRepository.js";

const databaseUrl =
  process.env.DATABASE_URL || "postgres://card_manager:card_manager@localhost:5432/card_manager";
const jsonPath = path.resolve(process.argv[2] || "./data/cards.json");

const database = await createDatabase(databaseUrl);

try {
  const raw = await fs.readFile(jsonPath, "utf8");
  const state = JSON.parse(raw);
  const cards = Array.isArray(state.cards) ? state.cards : [];

  await migrateJsonCards(database, cards);
  console.log(`Imported ${cards.length} card record(s) from ${jsonPath}`);
} finally {
  await database.close();
}
