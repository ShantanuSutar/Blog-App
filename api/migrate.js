import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { db } from "./db.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(currentDirectory, "migrations");

export const runMigrations = async () => {
  const client = await db.connect();

  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      "blog-app-schema-migrations",
    ]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));

    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const appliedMigrations = new Set(rows.map(({ name }) => name));
    const newlyApplied = [];

    for (const migrationFile of migrationFiles) {
      if (appliedMigrations.has(migrationFile)) continue;

      const sql = await readFile(
        path.join(migrationsDirectory, migrationFile),
        "utf8",
      );

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1)",
          [migrationFile],
        );
        await client.query("COMMIT");
        newlyApplied.push(migrationFile);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${migrationFile} failed`, { cause: error });
      }
    }

    return newlyApplied;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
      "blog-app-schema-migrations",
    ]);
    client.release();
  }
};
