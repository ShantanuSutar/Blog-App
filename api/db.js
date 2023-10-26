import mysql2 from "mysql2";
import dotenv from "dotenv";
dotenv.config();
export const db = mysql2.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DB,
  port: process.env.PORT,
});
