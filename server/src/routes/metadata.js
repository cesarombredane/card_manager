import express from "express";
import multer from "multer";
import {
  createPokemon,
  createSeries,
  createSet,
  getPokemonImage,
  getSeriesImage,
  getSetImage,
  listModifiers,
  listPokemon,
  listSeries,
  listSets
} from "../metadataRepository.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

function sendImage(response, image) {
  if (!image?.data) {
    response.status(404).json({ message: "Image not found." });
    return;
  }

  response.type(image.mime);
  response.send(image.data);
}

export function createMetadataRouter(database) {
  const router = express.Router();

  router.get("/series", async (request, response, next) => {
    try {
      response.json(await listSeries(database));
    } catch (error) {
      next(error);
    }
  });

  router.post("/series", upload.single("image"), async (request, response, next) => {
    try {
      response.status(201).json(await createSeries(database, request.body, request.file));
    } catch (error) {
      next(error);
    }
  });

  router.get("/series/:id/image", async (request, response, next) => {
    try {
      sendImage(response, await getSeriesImage(database, request.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.get("/sets", async (request, response, next) => {
    try {
      response.json(await listSets(database, request.query));
    } catch (error) {
      next(error);
    }
  });

  router.post("/sets", upload.single("image"), async (request, response, next) => {
    try {
      response.status(201).json(await createSet(database, request.body, request.file));
    } catch (error) {
      next(error);
    }
  });

  router.get("/sets/:id/image", async (request, response, next) => {
    try {
      sendImage(response, await getSetImage(database, request.params.id));
    } catch (error) {
      next(error);
    }
  });

  router.get("/modifiers", async (request, response, next) => {
    try {
      response.json(await listModifiers(database));
    } catch (error) {
      next(error);
    }
  });

  router.get("/pokemon", async (request, response, next) => {
    try {
      response.json(await listPokemon(database, request.query));
    } catch (error) {
      next(error);
    }
  });

  router.post("/pokemon", upload.single("image"), async (request, response, next) => {
    try {
      response.status(201).json(await createPokemon(database, request.body, request.file));
    } catch (error) {
      next(error);
    }
  });

  router.get("/pokemon/:id/image", async (request, response, next) => {
    try {
      sendImage(response, await getPokemonImage(database, request.params.id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
