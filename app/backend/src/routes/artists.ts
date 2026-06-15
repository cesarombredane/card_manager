import { Router } from 'express';

import { query } from '../db.js';
import { asyncHandler, likePattern, parseLimitOffset } from '../http.js';

export const artistsRouter = Router();

artistsRouter.get('/', asyncHandler(async (req, res) => {
  const { limit, offset } = parseLimitOffset(req.query);
  const rows = await query('SELECT artist AS name, COUNT(*)::int AS concept_count FROM card_concepts WHERE artist IS NOT NULL AND ($1 = \'%%\' OR artist ILIKE $1) GROUP BY artist ORDER BY concept_count DESC, artist LIMIT $2 OFFSET $3', [likePattern(req.query.q ?? ''), limit, offset]);
  res.json({ results: rows, limit, offset });
}));

artistsRouter.get('/:name', asyncHandler(async (req, res) => {
  const artist = req.params.name;
  const [concepts, prints, sets, timeline, languages] = await Promise.all([
    query('SELECT * FROM card_concepts WHERE artist ILIKE $1 ORDER BY canonical_name', [artist]),
    query('SELECT cp.* FROM card_prints cp JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.artist ILIKE $1', [artist]),
    query('SELECT DISTINCT s.* FROM sets s JOIN card_prints cp ON cp.set_id = s.id JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.artist ILIKE $1', [artist]),
    query('SELECT cp.release_date, cp.printed_name FROM card_prints cp JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.artist ILIKE $1 ORDER BY cp.release_date NULLS LAST', [artist]),
    query('SELECT DISTINCT l.* FROM languages l JOIN card_prints cp ON cp.language_id = l.id JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.artist ILIKE $1', [artist])
  ]);
  res.json({ artist, concepts, prints, pokemonIllustrated: [], sets, timeline, languages });
}));
