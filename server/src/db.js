import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsPath = path.resolve(dirname, "../migrations");

export async function createDatabase(connectionString) {
  const pool = new Pool({ connectionString });

  await runMigrations(pool);

  return {
    query: (text, params) => pool.query(text, params),
    transaction: async (callback) => {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end()
  };
}

async function runMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await fs.readdir(migrationsPath))
    .filter((file) => file.endsWith(".sql"))
    .toSorted();

  for (const file of files) {
    const version = file.split("_")[0];
    const applied = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE version = $1",
      [version]
    );

    if (applied.rowCount > 0) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsPath, file), "utf8");

    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}
