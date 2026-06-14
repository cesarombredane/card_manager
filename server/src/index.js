import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCardsRouter } from "./routes/cards.js";
import { createCollectionRouter } from "./routes/collection.js";
import { createMetadataRouter } from "./routes/metadata.js";
import { createDatabase } from "./db.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number.parseInt(process.env.PORT || "3000", 10);
const databaseUrl =
  process.env.DATABASE_URL || "postgres://card_manager:card_manager@localhost:5432/card_manager";
const clientDistPath =
  process.env.CLIENT_DIST_PATH || path.resolve(dirname, "../../client/dist");
const database = await createDatabase(databaseUrl);

app.use(cors());
app.use(express.json());

app.get("/api/health", (request, response) => {
  response.json({ ok: true });
});

app.use("/api/cards", createCardsRouter(database));
app.use("/api/collection", createCollectionRouter(database));
app.use("/api", createMetadataRouter(database));

app.use(express.static(clientDistPath));
app.get("*", (request, response, next) => {
  if (request.path.startsWith("/api")) {
    next();
    return;
  }

  response.sendFile(path.join(clientDistPath, "index.html"));
});

app.use((error, request, response, next) => {
  const status = error.status || 500;
  response.status(status).json({
    message: status === 500 ? "Unexpected server error." : error.message
  });
});

const server = app.listen(port, () => {
  console.log(`Pokemon Card Manager API listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(async () => {
    await database.close();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
