import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import express from "express";
import multer from "multer";
import {
  createCard,
  getCardImage,
  listCards
} from "../cardsRepository.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

export function createCardsRouter(database) {
  const router = express.Router();

  router.get("/", async (request, response, next) => {
    try {
      response.json(await listCards(database, request.query));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", upload.any(), async (request, response, next) => {
    try {
      const card = await createCard(database, request.body, request.files);
      response.status(201).json(card);
    } catch (error) {
      next(error);
    }
  });

  router.get("/export.csv", async (request, response, next) => {
    try {
      const cards = await listCards(database, request.query);
      const csv = stringify(cards, {
        header: true,
        columns: [
          "id",
          "name",
          "seriesName",
          "setName",
          "setLanguage",
          "cardNumber",
          "modifierCode",
          "modifierName",
          "pokemonName",
          "pokedexId",
          "collectedCount",
          "hasImage",
          "createdAt",
          "updatedAt"
        ]
      });

      response.header("Content-Type", "text/csv");
      response.attachment("pokemon-cards.csv");
      response.send(csv);
    } catch (error) {
      next(error);
    }
  });

  router.post("/import.csv", upload.single("file"), async (request, response, next) => {
    try {
      if (!request.file) {
        response.status(400).json({ message: "CSV file is required." });
        return;
      }

      const records = parse(request.file.buffer, {
        bom: true,
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      const cards = [];

      for (const record of records) {
        cards.push(await createCard(database, record));
      }

      response.status(201).json({ imported: cards.length, cards });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/image", async (request, response, next) => {
    try {
      const image = await getCardImage(database, request.params.id);

      if (!image?.data) {
        response.status(404).json({ message: "Image not found." });
        return;
      }

      response.type(image.mime);
      response.send(image.data);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
