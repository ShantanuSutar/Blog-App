import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import {
  comparePassword,
  createAccessToken,
  hashPassword,
} from "../security/auth.js";

// This valid bcrypt hash keeps the unknown-user path close to the invalid-password
// path without revealing whether a username exists through a fast early return.
const DUMMY_PASSWORD_HASH = "$2a$12$9HpMg8b.nGiUiPHjkkY14OiHy3FXiiZFENCNRp0yWYWdhR0Cato3y";

const invalidCredentials = () => new ApiError(
  401,
  "Wrong username or password",
  "AUTH_INVALID_CREDENTIALS",
);

const preventAuthResponseCaching = (res) => {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
};

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

  const hash = await hashPassword(password);

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

  const query = `
    SELECT id, username, password, avatar, bio, created_at
    FROM users
    WHERE LOWER(username) = LOWER($1)
    LIMIT 1
  `;
    
  const result = await db.query(query, [username]);
  const account = result.rows[0];
  const isPasswordCorrect = await comparePassword(
    password,
    account?.password || DUMMY_PASSWORD_HASH,
  );

  if (!account || !isPasswordCorrect) {
    throw invalidCredentials();
  }

  const token = createAccessToken(account.id);
  const other = {
    id: account.id,
    username: account.username,
    avatar: account.avatar,
    bio: account.bio,
    created_at: account.created_at,
  };

  preventAuthResponseCaching(res);
  return res.status(200).json({ success: true, token, other });
};

export const logout = (req, res) => {
  preventAuthResponseCaching(res);
  return res.status(200).json("User has been logged out");
};
