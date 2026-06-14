import { Router } from 'express';

import { query, queryOne } from '../db.js';
import { asyncHandler, sendNotFound } from '../http.js';

export const printVariantsRouter = Router();

printVariantsRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const variant = await queryOne(
      `
        SELECT pv.*, row_to_json(cp) AS print, row_to_json(cc) AS concept
        FROM print_variants pv
        JOIN card_prints cp ON cp.id = pv.card_print_id
        JOIN card_concepts cc ON cc.id = cp.card_concept_id
        WHERE pv.id = $1
      `,
      [request.params.id]
    );

    if (!variant) return sendNotFound(response, 'Print variant');

    const [images, sources] = await Promise.all([
      query('SELECT * FROM card_images WHERE print_variant_id = $1 ORDER BY is_front DESC', [request.params.id]),
      query("SELECT sm.*, src.name AS source_name FROM source_mappings sm JOIN sources src ON src.id = sm.source_id WHERE sm.entity_type = 'print_variant' AND sm.entity_id = $1", [request.params.id])
    ]);

    response.json({ variant, images, sources });
  })
);
