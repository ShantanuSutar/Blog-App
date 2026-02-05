import { db } from "../db.js";
import jwt from "jsonwebtoken";

export const getPosts = async (req, res) => {
  try {
    let query;
    let params;
    
    if (req.query.cat) {
      query = "SELECT * FROM posts WHERE cat=$1";
      params = [req.query.cat];
    } else {
      query = "SELECT * FROM posts";
      params = [];
    }
    
    const result = await db.query(query, params);
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const getSinglePost = async (req, res) => {
  try {
    const query =
      "SELECT p.id, username, title, \"desc\", p.img, u.img AS userImg, cat, date FROM users u JOIN posts p ON u.id = p.uid WHERE p.id = $1";
    
    const result = await db.query(query, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json(err);
  }
};

export const addPost = async (req, res) => {
  const token = req.body.tokenValue;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, "jwtkey", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const query =
      "INSERT INTO posts(title, desc, img, cat, date, uid) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id";

    const values = [
      req.body.title,
      req.body.desc,
      req.body.img,
      req.body.cat,
      req.body.date,
      userInfo.id,
    ];

    try {
      await db.query(query, values);
      return res.json("Post has been created.");
    } catch (err) {
      return res.status(500).json(err);
    }
  });
};

export const deletePost = async (req, res) => {
  const data = req.query.data;
  const token = JSON.parse(data);

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, "jwtkey", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const postId = req.params.id;
    const query = "DELETE FROM posts WHERE id = $1 AND uid = $2";

    try {
      const result = await db.query(query, [postId, userInfo.id]);
      
      if (result.rowCount === 0) {
        return res.status(403).json("You can delete only your post!");
      }
      
      return res.json("Post has been deleted!");
    } catch (err) {
      return res.status(500).json(err);
    }
  });
};

export const updatePost = async (req, res) => {
  const token = req.body.tokenValue;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, "jwtkey", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const postId = req.params.id;
    const query =
      "UPDATE posts SET title=$1, desc=$2, img=$3, cat=$4 WHERE id = $5 AND uid = $6";

    const values = [req.body.title, req.body.desc, req.body.img, req.body.cat, postId, userInfo.id];

    try {
      const result = await db.query(query, values);
      
      if (result.rowCount === 0) {
        return res.status(403).json("You can update only your post!");
      }
      
      return res.json("Post has been updated.");
    } catch (err) {
      return res.status(500).json(err);
    }
  });
};
