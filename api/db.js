import { Pool } from 'pg';
import dotenv from "dotenv";
dotenv.config();

const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB}?sslmode=verify-full`;

export const db = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool settings for better performance
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait when connecting a new client
});

// Add error handling for database connection
db.on('error', (err) => {
  console.error('Database connection error:', err);
});
