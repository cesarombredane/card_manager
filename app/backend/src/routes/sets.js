import { Router } from 'express';

import { query, queryOne } from '../db.js';
import { asyncHandler, likePattern, parseLimitOffset, sendNotFound } from '../http.js';

export const setsRouter = Router();

setsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const { limit, offset } = parseLimitOffset(request.query);
    const { q = '', language, region, seriesId, setType, releaseDateFrom, releaseDateTo, sort = 'releaseDate' } = request.query;
    const orderBy = { name: 'sets.name', releaseDate: 'sets.release_date DESC NULLS LAST', code: 'sets.set_code' }[sort] ?? 'sets.release_date DESC NULLS LAST';
    const rows = await query(
      `
        SELECT sets.*, l.code AS language_code, r.code AS region_code, series.name AS series_name
        FROM sets
        JOIN languages l ON l.id = sets.language_id
        JOIN regions r ON r.id = sets.region_id
        JOIN series ON series.id = sets.series_id
        WHERE ($1 = '%%' OR sets.name ILIKE $1 OR sets.local_name ILIKE $1 OR sets.set_code ILIKE $1)
          AND ($2::text IS NULL OR l.code = $2)
          AND ($3::text IS NULL OR r.code = $3)
          AND ($4::uuid IS NULL OR series.id = $4)
          AND ($5::text IS NULL OR sets.set_type = $5)
          AND ($6::date IS NULL OR sets.release_date >= $6)
          AND ($7::date IS NULL OR sets.release_date <= $7)
        ORDER BY ${orderBy}
        LIMIT $8 OFFSET $9
      `,
      [likePattern(q), language || null, region || null, seriesId || null, setType || null, releaseDateFrom || null, releaseDateTo || null, limit, offset]
    );
    response.json({ results: rows, limit, offset });
  })
);

setsRouter.get('/:id', asyncHandler(async (req, res) => {
  const set = await queryOne('SELECT sets.*, row_to_json(l) AS language, row_to_json(r) AS region, row_to_json(series) AS series FROM sets JOIN languages l ON l.id = sets.language_id JOIN regions r ON r.id = sets.region_id JOIN series ON series.id = sets.series_id WHERE sets.id = $1', [req.params.id]);
  if (!set) return sendNotFound(res, 'Set');
  const [cards, relationships, stats, sources] = await Promise.all([
    query('SELECT cp.*, cc.canonical_name FROM card_prints cp JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cp.set_id = $1 ORDER BY cp.card_number', [req.params.id]),
    query('SELECT * FROM set_relationships WHERE source_set_id = $1 OR target_set_id = $1', [req.params.id]),
    queryOne('SELECT COUNT(DISTINCT cp.id)::int AS print_count, COUNT(DISTINCT cp.card_concept_id)::int AS concept_count, COUNT(DISTINCT cp.language_id)::int AS language_count FROM card_prints cp WHERE cp.set_id = $1', [req.params.id]),
    query("SELECT sm.*, src.name AS source_name FROM source_mappings sm JOIN sources src ON src.id = sm.source_id WHERE sm.entity_type = 'set' AND sm.entity_id = $1", [req.params.id])
  ]);
  res.json({ set, cards, relatedSets: relationships, sourceSets: relationships.filter((r) => r.target_set_id === req.params.id), localizedTargetSets: relationships.filter((r) => r.source_set_id === req.params.id), stats, sources });
}));
setsRouter.get('/:id/cards', asyncHandler(async (req, res) => res.json(await query('SELECT cp.*, cc.canonical_name FROM card_prints cp JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cp.set_id = $1 ORDER BY cp.card_number', [req.params.id]))));
setsRouter.get('/:id/relationships', asyncHandler(async (req, res) => res.json(await query('SELECT * FROM set_relationships WHERE source_set_id = $1 OR target_set_id = $1', [req.params.id]))));
setsRouter.get('/:id/stats', asyncHandler(async (req, res) => res.json(await queryOne('SELECT COUNT(DISTINCT cp.id)::int AS print_count, COUNT(DISTINCT cp.card_concept_id)::int AS concept_count, COUNT(DISTINCT pv.id)::int AS variant_count FROM card_prints cp LEFT JOIN print_variants pv ON pv.card_print_id = cp.id WHERE cp.set_id = $1', [req.params.id]))));
