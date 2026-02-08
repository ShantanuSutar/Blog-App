import { Pool } from 'pg';
import dotenv from "dotenv";
dotenv.config();

const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB}?sslmode=verify-full`;

export const db = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Add error handling for database connection
db.on('error', (err) => {
  console.error('Database connection error:', err);
});
