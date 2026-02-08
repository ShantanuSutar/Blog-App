import { db } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    //CHECK EXISTING USER
    const checkQuery = "SELECT * FROM users WHERE email = $1 OR username = $2";
    
    const existingUserResult = await db.query(checkQuery, [req.body.email, req.body.username]);
    if (existingUserResult.rows.length) return res.status(409).json("User already exists");

    //Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);

    const insertQuery = "INSERT INTO users(username, email, password) VALUES ($1, $2, $3)";

    const values = [req.body.username, req.body.email, hash];

    await db.query(insertQuery, values);
    return res.status(200).json("User has been created.");
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    //CHECK USER
    const query = "SELECT * FROM users WHERE username = $1";
    
    const result = await db.query(query, [req.body.username]);
    if (result.rows.length === 0) return res.status(404).json("User not found!");

    //Check password
    const isPasswordCorrect = bcrypt.compareSync(
      req.body.password,
      result.rows[0].password
    );

    if (!isPasswordCorrect)
      return res.status(400).json("Wrong username or password!");

    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET || "fallback_jwt_secret");

    const { password, ...other } = result.rows[0];

    res.status(200).json({ success: true, token, other });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const logout = (req, res) => {
  // res
  //   .clearCookie("access_token", {
  //     sameSite: "none",
  //     secure: true,
  //   })
  //   .status(200)
  //   .json("User has been logged out");
  res.status(200).json("User has been logged out");
};
