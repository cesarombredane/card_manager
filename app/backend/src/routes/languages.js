import { Router } from 'express';

import { query, queryOne } from '../db.js';
import { asyncHandler, sendNotFound } from '../http.js';

export const languagesRouter = Router();

languagesRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await query(
    `
      SELECT l.*,
        COUNT(DISTINCT s.id)::int AS set_count,
        COUNT(DISTINCT cp.id)::int AS print_count,
        COUNT(DISTINCT cp.card_concept_id)::int AS concept_count,
        MIN(s.release_date) AS first_release_date,
        MAX(s.release_date) AS last_release_date
      FROM languages l
      LEFT JOIN sets s ON s.language_id = l.id
      LEFT JOIN card_prints cp ON cp.language_id = l.id
      GROUP BY l.id
      ORDER BY l.code
    `
  );
  res.json({ languages: rows });
}));

languagesRouter.get('/:code', asyncHandler(async (req, res) => {
  const language = await queryOne('SELECT * FROM languages WHERE code = $1', [req.params.code]);
  if (!language) return sendNotFound(res, 'Language');
  const [series, sets, stats] = await Promise.all([
    query('SELECT * FROM series WHERE language_id = $1 ORDER BY start_date NULLS LAST', [language.id]),
    query('SELECT * FROM sets WHERE language_id = $1 ORDER BY release_date NULLS LAST', [language.id]),
    queryOne('SELECT COUNT(DISTINCT cp.id)::int AS print_count, COUNT(DISTINCT cp.card_concept_id)::int AS concept_count FROM card_prints cp WHERE cp.language_id = $1', [language.id])
  ]);
  res.json({ language, series, sets, prints: [], missingMappings: [], stats });
}));
