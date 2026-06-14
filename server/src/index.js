import "dotenv/config";
import cors from "cors";
import express from "express";
import { createCardsRouter } from "./routes/cards.js";
import { createDatabase } from "./db.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "3000", 10);
const databasePath = process.env.DATABASE_PATH || "./data/cards.json";
const database = await createDatabase(databasePath);

app.use(cors());
app.use(express.json());

app.get("/api/health", (request, response) => {
  response.json({ ok: true });
});

app.use("/api/cards", createCardsRouter(database));

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
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
