import { Pool } from 'pg';
import { config } from "./config.js";

export const db = new Pool({
  connectionString: config.database.connectionString,
  ssl: config.database.ssl,
  // Connection pool settings for better performance
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait when connecting a new client
});

// Add error handling for database connection
db.on('error', (err) => {
  console.error('Unexpected idle database client error:', err.message);
});
