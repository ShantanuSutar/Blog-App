import { Pool } from 'pg';
import { config } from "./config.js";
import { logger } from "./utils/logger.js";

export const db = new Pool({
  connectionString: config.database.connectionString,
  ssl: config.database.ssl,
  max: config.database.pool.max,
  idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
  application_name: "unsaid-api",
});

db.on('error', (err) => {
  logger.error("Unexpected idle database client error", { error: err });
});

export const checkDatabaseConnection = async () => {
  await db.query("SELECT 1");
};

export const closeDatabase = async () => {
  await db.end();
};
