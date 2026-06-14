import { Router } from 'express';

import { query, queryOne } from '../db.js';
import { asyncHandler, likePattern, parseLimitOffset, sendNotFound } from '../http.js';

export const seriesRouter = Router();

seriesRouter.get('/', asyncHandler(async (req, res) => {
  const { limit, offset } = parseLimitOffset(req.query);
  const { q = '', language, region, startDateFrom, startDateTo } = req.query;
  const rows = await query(
    `
      SELECT series.*, l.code AS language_code, r.code AS region_code, COUNT(sets.id)::int AS set_count
      FROM series
      JOIN languages l ON l.id = series.language_id
      JOIN regions r ON r.id = series.region_id
      LEFT JOIN sets ON sets.series_id = series.id
      WHERE ($1 = '%%' OR series.name ILIKE $1 OR series.local_name ILIKE $1)
        AND ($2::text IS NULL OR l.code = $2)
        AND ($3::text IS NULL OR r.code = $3)
        AND ($4::date IS NULL OR series.start_date >= $4)
        AND ($5::date IS NULL OR series.start_date <= $5)
      GROUP BY series.id, l.code, r.code
      ORDER BY series.start_date DESC NULLS LAST
      LIMIT $6 OFFSET $7
    `,
    [likePattern(q), language || null, region || null, startDateFrom || null, startDateTo || null, limit, offset]
  );
  res.json({ results: rows, limit, offset });
}));

seriesRouter.get('/:id', asyncHandler(async (req, res) => {
  const series = await queryOne('SELECT series.*, row_to_json(l) AS language, row_to_json(r) AS region FROM series JOIN languages l ON l.id = series.language_id JOIN regions r ON r.id = series.region_id WHERE series.id = $1', [req.params.id]);
  if (!series) return sendNotFound(res, 'Series');
  const [sets, stats] = await Promise.all([
    query('SELECT * FROM sets WHERE series_id = $1 ORDER BY release_date NULLS LAST', [req.params.id]),
    queryOne('SELECT COUNT(DISTINCT sets.id)::int AS set_count, COUNT(DISTINCT cp.id)::int AS print_count FROM sets LEFT JOIN card_prints cp ON cp.set_id = sets.id WHERE sets.series_id = $1', [req.params.id])
  ]);
  res.json({ series, sets, stats, relatedSeries: [] });
}));
