import { db } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../middleware/auth.js";

export const register = async (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username || !email || !password) {
    return res.status(400).json("Username, email and password are required");
  }

  try {
    const checkQuery = "SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)";
    
    const existingUserResult = await db.query(checkQuery, [email, username]);
    if (existingUserResult.rows.length) return res.status(409).json("User already exists");

    const hash = await bcrypt.hash(password, 10);

    const insertQuery = "INSERT INTO users(username, email, password) VALUES ($1, $2, $3)";

    const values = [username, email, hash];

    await db.query(insertQuery, values);
    return res.status(200).json("User has been created.");
  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === "23505") {
      return res.status(409).json("User already exists");
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username || !password) {
    return res.status(400).json("Username and password are required");
  }

  try {
    const query = "SELECT id, username, email, password, avatar, bio, created_at FROM users WHERE username = $1";
    
    const result = await db.query(query, [username]);
    if (result.rows.length === 0) return res.status(404).json("User not found!");

    const isPasswordCorrect = await bcrypt.compare(password, result.rows[0].password);

    if (!isPasswordCorrect)
      return res.status(400).json("Wrong username or password!");

    const token = jwt.sign(
      { id: result.rows[0].id },
      jwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    const { password: passwordHash, ...other } = result.rows[0];

    res.status(200).json({ success: true, token, other });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  res.status(200).json("User has been logged out");
};
