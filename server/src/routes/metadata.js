import express from "express";
import { listModifiers, listSeries, listSets } from "../metadataRepository.js";

export function createMetadataRouter(database) {
  const router = express.Router();

  router.get("/series", async (request, response, next) => {
    try {
      response.json(await listSeries(database));
    } catch (error) {
      next(error);
    }
  });

  router.get("/sets", async (request, response, next) => {
    try {
      response.json(await listSets(database));
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

  return router;
}
