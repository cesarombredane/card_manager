import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import express from "express";
import multer from "multer";
import {
  createCollectedCard,
  deleteCollectedCard,
  getCollectedCardImage,
  importCards,
  listCollectedCards,
  updateCollectedCard
} from "../cardsRepository.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

export function createCollectionRouter(database) {
  const router = express.Router();

  router.get("/", async (request, response, next) => {
    try {
      response.json(await listCollectedCards(database));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", upload.any(), async (request, response, next) => {
    try {
      const card = await createCollectedCard(database, request.body, request.files);
      response.status(201).json(card);
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", upload.any(), async (request, response, next) => {
    try {
      const card = await updateCollectedCard(
        database,
        request.params.id,
        request.body,
        request.files
      );

      if (!card) {
        response.status(404).json({ message: "Collected card not found." });
        return;
      }

      response.json(card);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const deleted = await deleteCollectedCard(database, request.params.id);

      if (!deleted) {
        response.status(404).json({ message: "Collected card not found." });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/export.csv", async (request, response, next) => {
    try {
      const cards = await listCollectedCards(database);
      const csv = stringify(cards, {
        header: true,
        columns: [
          "id",
          "cardId",
          "name",
          "seriesName",
          "setName",
          "setLanguage",
          "cardNumber",
          "modifierCode",
          "modifierName",
          "pokemonName",
          "pokedexId",
          "condition",
          "note",
          "hasImage",
          "hasCollectedImage",
          "createdAt",
          "updatedAt"
        ]
      });

      response.header("Content-Type", "text/csv");
      response.attachment("collected-pokemon-cards.csv");
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
      const cards = await importCards(database, records);

      response.status(201).json({ imported: cards.length, cards });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/image", async (request, response, next) => {
    try {
      const image = await getCollectedCardImage(database, request.params.id);

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
