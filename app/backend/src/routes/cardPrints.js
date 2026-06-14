import { Router } from 'express';

import { query, queryOne } from '../db.js';
import { asyncHandler, sendNotFound } from '../http.js';

export const cardPrintsRouter = Router();

cardPrintsRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const cardPrint = await queryOne(
      `
        SELECT cp.*, row_to_json(cc) AS concept, row_to_json(s) AS set, row_to_json(se) AS series,
               row_to_json(l) AS language, row_to_json(r) AS region
        FROM card_prints cp
        JOIN card_concepts cc ON cc.id = cp.card_concept_id
        JOIN sets s ON s.id = cp.set_id
        JOIN series se ON se.id = s.series_id
        JOIN languages l ON l.id = cp.language_id
        JOIN regions r ON r.id = s.region_id
        WHERE cp.id = $1
      `,
      [request.params.id]
    );

    if (!cardPrint) return sendNotFound(response, 'Card print');

    const [variants, images, otherPrints, sources] = await Promise.all([
      query('SELECT * FROM print_variants WHERE card_print_id = $1 ORDER BY variant_type', [request.params.id]),
      query('SELECT ci.* FROM card_images ci JOIN print_variants pv ON pv.id = ci.print_variant_id WHERE pv.card_print_id = $1', [request.params.id]),
      query('SELECT * FROM card_prints WHERE card_concept_id = $1 AND id <> $2 ORDER BY release_date NULLS LAST', [cardPrint.card_concept_id, request.params.id]),
      query("SELECT sm.*, src.name AS source_name FROM source_mappings sm JOIN sources src ON src.id = sm.source_id WHERE sm.entity_type = 'card_print' AND sm.entity_id = $1", [request.params.id])
    ]);

    response.json({ print: cardPrint, variants, images, otherPrints, sources });
  })
);
