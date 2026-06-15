import pg from 'pg';

import { config } from './config.js';

export type QueryValue = unknown;
export type QueryParams = QueryValue[];
export type DbRow = Record<string, unknown>;

export const pool = new pg.Pool({
  connectionString: config.databaseUrl
});

export async function query<T extends DbRow = DbRow>(text: string, params: QueryParams = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as unknown as T[];
}

export async function queryOne<T extends DbRow = DbRow>(text: string, params: QueryParams = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
