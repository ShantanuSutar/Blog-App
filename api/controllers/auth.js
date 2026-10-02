import { db } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../middleware/auth.js";
import { ApiError } from "../errors/ApiError.js";

export const register = async (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username || !email || !password) {
    throw new ApiError(400, "Username, email and password are required", "AUTH_FIELDS_REQUIRED");
  }

  const checkQuery = "SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)";
    
  const existingUserResult = await db.query(checkQuery, [email, username]);
  if (existingUserResult.rows.length) {
    throw new ApiError(409, "User already exists", "USER_EXISTS");
  }

  const hash = await bcrypt.hash(password, 10);

  const insertQuery = "INSERT INTO users(username, email, password) VALUES ($1, $2, $3)";

  const values = [username, email, hash];

  try {
    await db.query(insertQuery, values);
  } catch (error) {
    if (error.code === "23505") {
      throw new ApiError(409, "User already exists", "USER_EXISTS", undefined, {
        cause: error,
      });
    }
    throw error;
  }

  return res.status(201).json("User has been created.");
};

export const login = async (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username || !password) {
    throw new ApiError(400, "Username and password are required", "AUTH_FIELDS_REQUIRED");
  }

  const query = "SELECT id, username, email, password, avatar, bio, created_at FROM users WHERE username = $1";
    
  const result = await db.query(query, [username]);
  if (result.rows.length === 0) {
    throw new ApiError(401, "Wrong username or password", "AUTH_INVALID_CREDENTIALS");
  }

  const isPasswordCorrect = await bcrypt.compare(password, result.rows[0].password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Wrong username or password", "AUTH_INVALID_CREDENTIALS");
  }

  const token = jwt.sign(
    { id: result.rows[0].id },
    jwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );

  const { password: passwordHash, ...other } = result.rows[0];

  return res.status(200).json({ success: true, token, other });
};

export const logout = (req, res) => {
  res.status(200).json("User has been logged out");
};
