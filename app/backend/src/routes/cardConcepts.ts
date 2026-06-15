import { Router } from 'express';

import { query, queryOne } from '../db.js';
import { asyncHandler, parseRequiredUuid, sendNotFound } from '../http.js';

export const cardConceptsRouter = Router();

async function getConceptPayload(id: string) {
  const concept = await queryOne(
    `
      SELECT
        cc.*,
        row_to_json(ol) AS original_language,
        row_to_json(os) AS original_set,
        row_to_json(pcd) AS pokemon_details
      FROM card_concepts cc
      LEFT JOIN languages ol ON ol.id = cc.original_language_id
      LEFT JOIN sets os ON os.id = cc.original_set_id
      LEFT JOIN pokemon_card_details pcd ON pcd.card_concept_id = cc.id
      WHERE cc.id = $1
    `,
    [id]
  );

  if (!concept) {
    return null;
  }

  const [attacks, abilities, texts, prints, variants, images, sources] = await Promise.all([
    query('SELECT * FROM attacks WHERE card_concept_id = $1 ORDER BY attack_order', [id]),
    query('SELECT * FROM abilities WHERE card_concept_id = $1 ORDER BY name', [id]),
    query(
      `
        SELECT ct.*, l.code AS language_code, l.name AS language_name
        FROM card_texts ct
        JOIN languages l ON l.id = ct.language_id
        WHERE ct.card_concept_id = $1
        ORDER BY l.code
      `,
      [id]
    ),
    query(
      `
        SELECT cp.*, l.code AS language_code, s.name AS set_name, s.set_code
        FROM card_prints cp
        JOIN languages l ON l.id = cp.language_id
        JOIN sets s ON s.id = cp.set_id
        WHERE cp.card_concept_id = $1
        ORDER BY cp.release_date NULLS LAST, l.code
      `,
      [id]
    ),
    query(
      `
        SELECT pv.*
        FROM print_variants pv
        JOIN card_prints cp ON cp.id = pv.card_print_id
        WHERE cp.card_concept_id = $1
        ORDER BY pv.variant_type
      `,
      [id]
    ),
    query(
      `
        SELECT ci.*
        FROM card_images ci
        JOIN print_variants pv ON pv.id = ci.print_variant_id
        JOIN card_prints cp ON cp.id = pv.card_print_id
        WHERE cp.card_concept_id = $1
      `,
      [id]
    ),
    query(
      `
        SELECT sm.*, src.name AS source_name, src.source_type
        FROM source_mappings sm
        JOIN sources src ON src.id = sm.source_id
        WHERE sm.entity_type = 'card_concept' AND sm.entity_id = $1
      `,
      [id]
    )
  ]);

  return { concept, attacks, abilities, texts, prints, variants, images, sources, relatedConcepts: [] };
}

cardConceptsRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const id = parseRequiredUuid(request.params.id, 'card concept id');
    const payload = await getConceptPayload(id);
    if (!payload) return sendNotFound(response, 'Card concept');
    response.json(payload);
  })
);

cardConceptsRouter.get('/:id/prints', asyncHandler(async (req, res) => {
  const id = parseRequiredUuid(req.params.id, 'card concept id');
  res.json(await query('SELECT * FROM card_prints WHERE card_concept_id = $1 ORDER BY release_date NULLS LAST', [id]));
}));
cardConceptsRouter.get('/:id/languages', asyncHandler(async (req, res) => {
  const id = parseRequiredUuid(req.params.id, 'card concept id');
  res.json(await query('SELECT DISTINCT l.* FROM languages l JOIN card_texts ct ON ct.language_id = l.id WHERE ct.card_concept_id = $1 ORDER BY l.code', [id]));
}));
cardConceptsRouter.get('/:id/variants', asyncHandler(async (req, res) => {
  const id = parseRequiredUuid(req.params.id, 'card concept id');
  res.json(await query('SELECT pv.* FROM print_variants pv JOIN card_prints cp ON cp.id = pv.card_print_id WHERE cp.card_concept_id = $1 ORDER BY pv.variant_type', [id]));
}));
cardConceptsRouter.get('/:id/timeline', asyncHandler(async (req, res) => {
  const id = parseRequiredUuid(req.params.id, 'card concept id');
  res.json(await query('SELECT cp.id, cp.printed_name, cp.release_date, l.code AS language, s.name AS set_name FROM card_prints cp JOIN languages l ON l.id = cp.language_id JOIN sets s ON s.id = cp.set_id WHERE cp.card_concept_id = $1 ORDER BY cp.release_date NULLS LAST', [id]));
}));
cardConceptsRouter.get('/:id/sources', asyncHandler(async (req, res) => {
  const id = parseRequiredUuid(req.params.id, 'card concept id');
  res.json(await query("SELECT sm.*, src.name AS source_name FROM source_mappings sm JOIN sources src ON src.id = sm.source_id WHERE sm.entity_type = 'card_concept' AND sm.entity_id = $1", [id]));
}));
