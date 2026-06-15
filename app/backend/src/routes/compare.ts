import { Router } from 'express';

import { query } from '../db.js';
import { asyncHandler, parseRequiredUuid } from '../http.js';

export const compareRouter = Router();

compareRouter.get('/concepts', asyncHandler(async (req, res) => {
  const ids = String(req.query.ids ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => parseRequiredUuid(id, 'concept id'));

  if (ids.length === 0) {
    return res.json({ concepts: [] });
  }

  const concepts = await query(
    `
      SELECT cc.*,
        COALESCE(jsonb_agg(DISTINCT jsonb_build_object('language', l.code, 'name', ct.name)) FILTER (WHERE ct.id IS NOT NULL), '[]'::jsonb) AS texts,
        COUNT(DISTINCT cp.id)::int AS print_count,
        COUNT(DISTINCT pv.id)::int AS variant_count
      FROM card_concepts cc
      LEFT JOIN card_texts ct ON ct.card_concept_id = cc.id
      LEFT JOIN languages l ON l.id = ct.language_id
      LEFT JOIN card_prints cp ON cp.card_concept_id = cc.id
      LEFT JOIN print_variants pv ON pv.card_print_id = cp.id
      WHERE cc.id = ANY($1::uuid[])
      GROUP BY cc.id
      ORDER BY array_position($1::uuid[], cc.id)
    `,
    [ids]
  );

  res.json({ concepts });
}));
