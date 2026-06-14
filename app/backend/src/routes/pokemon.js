import { Router } from 'express';

import { query } from '../db.js';
import { asyncHandler, likePattern, parseLimitOffset } from '../http.js';

export const pokemonRouter = Router();

pokemonRouter.get('/', asyncHandler(async (req, res) => {
  const { limit, offset } = parseLimitOffset(req.query);
  const rows = await query(
    `
      SELECT canonical_name AS name, COUNT(*)::int AS concept_count
      FROM card_concepts
      WHERE card_category = 'pokemon'
        AND ($1 = '%%' OR canonical_name ILIKE $1)
      GROUP BY canonical_name
      ORDER BY canonical_name
      LIMIT $2 OFFSET $3
    `,
    [likePattern(req.query.q ?? ''), limit, offset]
  );
  res.json({ results: rows, limit, offset });
}));

pokemonRouter.get('/:name', asyncHandler(async (req, res) => {
  const name = req.params.name;
  const [concepts, prints, promos, variants, sets, artists, languages, timeline] = await Promise.all([
    query('SELECT * FROM card_concepts WHERE card_category = \'pokemon\' AND canonical_name ILIKE $1 ORDER BY canonical_name', [name]),
    query('SELECT cp.* FROM card_prints cp JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.card_category = \'pokemon\' AND cc.canonical_name ILIKE $1', [name]),
    query('SELECT cp.* FROM card_prints cp JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.card_category = \'pokemon\' AND cc.canonical_name ILIKE $1 AND cp.is_promo = true', [name]),
    query('SELECT pv.* FROM print_variants pv JOIN card_prints cp ON cp.id = pv.card_print_id JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.card_category = \'pokemon\' AND cc.canonical_name ILIKE $1', [name]),
    query('SELECT DISTINCT s.* FROM sets s JOIN card_prints cp ON cp.set_id = s.id JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.card_category = \'pokemon\' AND cc.canonical_name ILIKE $1', [name]),
    query('SELECT DISTINCT artist FROM card_concepts WHERE card_category = \'pokemon\' AND canonical_name ILIKE $1 AND artist IS NOT NULL', [name]),
    query('SELECT DISTINCT l.* FROM languages l JOIN card_prints cp ON cp.language_id = l.id JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.card_category = \'pokemon\' AND cc.canonical_name ILIKE $1', [name]),
    query('SELECT cp.release_date, cp.printed_name FROM card_prints cp JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.card_category = \'pokemon\' AND cc.canonical_name ILIKE $1 ORDER BY cp.release_date NULLS LAST', [name])
  ]);
  res.json({ pokemon: { name }, concepts, prints, promos, variants, sets, artists, languages, timelineSummary: timeline });
}));

pokemonRouter.get('/:name/timeline', asyncHandler(async (req, res) => {
  res.json(await query('SELECT cp.release_date, cp.printed_name FROM card_prints cp JOIN card_concepts cc ON cc.id = cp.card_concept_id WHERE cc.card_category = \'pokemon\' AND cc.canonical_name ILIKE $1 ORDER BY cp.release_date NULLS LAST', [req.params.name]));
}));
