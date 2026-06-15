import { Router } from 'express';

import { query } from '../db.js';
import { asyncHandler, likePattern, parseBoolean, parseLimitOffset, parseOptionalUuid } from '../http.js';

export const cardsRouter = Router();

cardsRouter.get(
  '/search',
  asyncHandler(async (request, response) => {
    const { limit, offset } = parseLimitOffset(request.query);
    const {
      q = '',
      language,
      region,
      setId,
      seriesId,
      artist,
      cardCategory,
      rarity,
      variantType,
      setType,
      releaseDateFrom,
      releaseDateTo,
      hpMin,
      hpMax,
      pokemonType,
      stage,
      hasAbility,
      attackName,
      regulationMark,
      sort = 'name'
    } = request.query;

    const hasImage = parseBoolean(request.query.hasImage);
    const missingImage = parseBoolean(request.query.missingImage);
    const isPromo = parseBoolean(request.query.isPromo);
    const isJumbo = parseBoolean(request.query.isJumbo);
    const isDeckExclusive = parseBoolean(request.query.isDeckExclusive);
    const setUuid = parseOptionalUuid(setId, 'setId');
    const seriesUuid = parseOptionalUuid(seriesId, 'seriesId');

    const orderByMap: Record<string, string> = {
      name: 'cc.canonical_name ASC NULLS LAST',
      releaseDate: 'MAX(cp.release_date) DESC NULLS LAST',
      printCount: 'COUNT(DISTINCT cp.id) DESC',
      languageCount: 'COUNT(DISTINCT cp.language_id) DESC'
    };
    const orderBy = orderByMap[String(sort)] ?? 'cc.canonical_name ASC NULLS LAST';

    const rows = await query(
      `
        SELECT
          cc.id,
          cc.canonical_name,
          cc.card_category,
          cc.artist,
          cc.regulation_mark,
          jsonb_build_object(
            'id', original_print.id,
            'printed_name', original_print.printed_name,
            'card_number', original_print.card_number
          ) AS original_print,
          COUNT(DISTINCT cp.id)::int AS print_count,
          COUNT(DISTINCT cp.language_id)::int AS language_count,
          COUNT(DISTINCT pv.id)::int AS variant_count,
          MIN(ci.image_url) AS image_preview,
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'id', cp.id,
                'printed_name', cp.printed_name,
                'card_number', cp.card_number,
                'rarity', cp.rarity,
                'language', l.code,
                'set_name', s.name,
                'set_code', s.set_code
              )
            ) FILTER (WHERE cp.id IS NOT NULL),
            '[]'::jsonb
          ) AS matching_prints
        FROM card_concepts cc
        LEFT JOIN card_prints original_print
          ON original_print.card_concept_id = cc.id
         AND original_print.set_id = cc.original_set_id
         AND original_print.card_number = cc.original_card_number
        LEFT JOIN card_prints cp ON cp.card_concept_id = cc.id
        LEFT JOIN languages l ON l.id = cp.language_id
        LEFT JOIN sets s ON s.id = cp.set_id
        LEFT JOIN regions r ON r.id = s.region_id
        LEFT JOIN print_variants pv ON pv.card_print_id = cp.id
        LEFT JOIN card_images ci ON ci.print_variant_id = pv.id
        LEFT JOIN pokemon_card_details pcd ON pcd.card_concept_id = cc.id
        LEFT JOIN abilities a ON a.card_concept_id = cc.id
        LEFT JOIN attacks atk ON atk.card_concept_id = cc.id
        WHERE ($1 = '%%'
            OR cc.canonical_name ILIKE $1
            OR cc.artist ILIKE $1
            OR cp.printed_name ILIKE $1
            OR cp.card_number ILIKE $1
            OR s.name ILIKE $1
            OR s.local_name ILIKE $1
            OR s.set_code ILIKE $1
            OR atk.name ILIKE $1
            OR atk.text ILIKE $1
            OR a.name ILIKE $1
            OR a.text ILIKE $1)
          AND ($2::text IS NULL OR l.code = $2)
          AND ($3::text IS NULL OR r.code = $3)
          AND ($4::uuid IS NULL OR s.id = $4)
          AND ($5::uuid IS NULL OR s.series_id = $5)
          AND ($6::text IS NULL OR cc.artist ILIKE $6)
          AND ($7::text IS NULL OR cc.card_category = $7)
          AND ($8::text IS NULL OR cp.rarity ILIKE $8)
          AND ($9::text IS NULL OR pv.variant_type = $9)
          AND ($10::text IS NULL OR s.set_type = $10)
          AND ($11::boolean IS NULL OR cp.is_promo = $11)
          AND ($12::boolean IS NULL OR cp.is_jumbo = $12)
          AND ($13::boolean IS NULL OR cp.is_deck_exclusive = $13)
          AND ($14::date IS NULL OR cp.release_date >= $14)
          AND ($15::date IS NULL OR cp.release_date <= $15)
          AND ($16::int IS NULL OR pcd.hp >= $16)
          AND ($17::int IS NULL OR pcd.hp <= $17)
          AND ($18::text IS NULL OR pcd.pokemon_type ILIKE $18)
          AND ($19::text IS NULL OR pcd.stage ILIKE $19)
          AND ($20::boolean IS NULL OR ($20 = true AND a.id IS NOT NULL) OR ($20 = false AND a.id IS NULL))
          AND ($21::text IS NULL OR atk.name ILIKE $21)
          AND ($22::text IS NULL OR cc.regulation_mark = $22)
        GROUP BY cc.id, original_print.id
        HAVING ($23::boolean IS NULL OR ($23 = true AND COUNT(ci.id) > 0) OR ($23 = false))
           AND ($24::boolean IS NULL OR ($24 = true AND COUNT(ci.id) = 0) OR ($24 = false))
        ORDER BY ${orderBy}
        LIMIT $25 OFFSET $26
      `,
      [
        likePattern(q),
        language || null,
        region || null,
        setUuid,
        seriesUuid,
        artist ? likePattern(artist) : null,
        cardCategory || null,
        rarity ? likePattern(rarity) : null,
        variantType || null,
        setType || null,
        isPromo,
        isJumbo,
        isDeckExclusive,
        releaseDateFrom || null,
        releaseDateTo || null,
        hpMin || null,
        hpMax || null,
        pokemonType ? likePattern(pokemonType) : null,
        stage ? likePattern(stage) : null,
        hasAbility,
        attackName ? likePattern(attackName) : null,
        regulationMark || null,
        hasImage,
        missingImage,
        limit,
        offset
      ]
    );

    response.json({
      results: rows,
      limit,
      offset
    });
  })
);
