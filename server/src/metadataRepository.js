export async function listSeries(database) {
  const result = await database.query(
    "SELECT id, name, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM series ORDER BY name"
  );
  return result.rows.map((row) => ({ ...row, id: Number(row.id) }));
}

export async function listSets(database) {
  const result = await database.query(`
    SELECT
      card_sets.id,
      card_sets.name,
      card_sets.series_id AS "seriesId",
      series.name AS "seriesName",
      card_sets.created_at AS "createdAt",
      card_sets.updated_at AS "updatedAt"
    FROM card_sets
    JOIN series ON series.id = card_sets.series_id
    ORDER BY series.name, card_sets.name
  `);

  return result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    seriesId: Number(row.seriesId)
  }));
}

export async function listModifiers(database) {
  const result = await database.query(
    "SELECT id, code, name, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM modifiers ORDER BY name"
  );
  return result.rows.map((row) => ({ ...row, id: Number(row.id) }));
}
