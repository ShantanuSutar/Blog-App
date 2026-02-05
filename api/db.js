import { Pool } from 'pg';
import dotenv from "dotenv";
dotenv.config();

const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}/${process.env.POSTGRES_DB}?sslmode=require`;

export const db = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
