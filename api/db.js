import { Pool } from 'pg';
import { config } from "./config.js";

export const db = new Pool({
  connectionString: config.database.connectionString,
  ssl: config.database.ssl,
  max: config.database.pool.max,
  idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
  application_name: "unsaid-api",
});

// Add error handling for database connection
db.on('error', (err) => {
  console.error('Unexpected idle database client error:', err.message);
});
