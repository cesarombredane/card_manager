import { Router } from 'express';

import { query } from '../db.js';
import { asyncHandler, likePattern, parseLimitOffset } from '../http.js';

export const searchRouter = Router();

searchRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const { q = '', type = 'all', language } = request.query;
    const { limit, offset } = parseLimitOffset(request.query);
    const pattern = likePattern(q);
    const languageFilter = language ? String(language) : null;
    const wants = (name: string): boolean => type === 'all' || type === name;

    const results: Record<string, unknown[]> = {
      cards: [],
      concepts: [],
      prints: [],
      pokemon: [],
      sets: [],
      series: [],
      artists: []
    };

    if (wants('concepts') || wants('cards')) {
      results.concepts = await query(
        `
          SELECT id, canonical_name, card_category, artist, regulation_mark
          FROM card_concepts
          WHERE $1 = '%%'
             OR canonical_name ILIKE $1
             OR artist ILIKE $1
             OR original_card_number ILIKE $1
          ORDER BY canonical_name NULLS LAST
          LIMIT $2 OFFSET $3
        `,
        [pattern, limit, offset]
      );
      results.cards = results.concepts;
    }

    if (wants('prints')) {
      results.prints = await query(
        `
          SELECT
            cp.id,
            cp.printed_name,
            cp.card_number,
            cp.rarity,
            l.code AS language,
            s.name AS set_name,
            s.set_code
          FROM card_prints cp
          JOIN languages l ON l.id = cp.language_id
          JOIN sets s ON s.id = cp.set_id
          WHERE ($2::text IS NULL OR l.code = $2)
            AND ($1 = '%%'
              OR cp.printed_name ILIKE $1
              OR cp.card_number ILIKE $1
              OR cp.rarity ILIKE $1
              OR s.name ILIKE $1
              OR s.local_name ILIKE $1
              OR s.set_code ILIKE $1)
          ORDER BY cp.printed_name
          LIMIT $3 OFFSET $4
        `,
        [pattern, languageFilter, limit, offset]
      );
    }

    if (wants('sets')) {
      results.sets = await query(
        `
          SELECT sets.id, sets.name, sets.local_name, sets.set_code, sets.release_date, l.code AS language
          FROM sets
          JOIN languages l ON l.id = sets.language_id
          WHERE ($2::text IS NULL OR l.code = $2)
            AND ($1 = '%%' OR sets.name ILIKE $1 OR sets.local_name ILIKE $1 OR sets.set_code ILIKE $1)
          ORDER BY sets.release_date DESC NULLS LAST
          LIMIT $3 OFFSET $4
        `,
        [pattern, languageFilter, limit, offset]
      );
    }

    if (wants('series')) {
      results.series = await query(
        `
          SELECT series.id, series.name, series.local_name, series.start_date, l.code AS language
          FROM series
          JOIN languages l ON l.id = series.language_id
          WHERE ($2::text IS NULL OR l.code = $2)
            AND ($1 = '%%' OR series.name ILIKE $1 OR series.local_name ILIKE $1)
          ORDER BY series.start_date DESC NULLS LAST
          LIMIT $3 OFFSET $4
        `,
        [pattern, languageFilter, limit, offset]
      );
    }

    if (wants('artists')) {
      results.artists = await query(
        `
          SELECT artist AS name, COUNT(*)::int AS concept_count
          FROM card_concepts
          WHERE artist IS NOT NULL
            AND ($1 = '%%' OR artist ILIKE $1)
          GROUP BY artist
          ORDER BY artist
          LIMIT $2 OFFSET $3
        `,
        [pattern, limit, offset]
      );
    }

    response.json(results);
  })
);
