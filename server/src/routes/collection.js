import express from "express";
import { getCollectedCardImage } from "../cardsRepository.js";

export function createCollectionRouter(database) {
  const router = express.Router();

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
