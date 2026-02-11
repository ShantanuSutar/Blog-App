import { db } from "../db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const getPosts = async (req, res) => {
  try {
    let query;
    let params = [];
    let conditions = ["draft=false AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= timezone('UTC', now()))"];

    if (req.query.cat) {
      conditions.push(`cat=$${params.length + 1}`);
      params.push(req.query.cat);
    }

    if (req.query.search) {
      conditions.push(`(title ILIKE $${params.length + 1} OR "desc" ILIKE $${params.length + 1})`);
      params.push(`%${req.query.search}%`);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    query = `SELECT * FROM posts ${whereClause} ORDER BY date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination info
    const countQuery = `SELECT COUNT(*) FROM posts ${whereClause}`;
    // Remove limit and offset params for count query
    const countParams = params.slice(0, params.length - 2);
    const countResult = await db.query(countQuery, countParams);

    return res.status(200).json({
      posts: result.rows,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      currentPage: page
    });
  } catch (err) {
    console.error('Error in getPosts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSinglePost = async (req, res) => {
  try {
    const query =
      "SELECT p.id, username, title, \"desc\", p.img, u.img AS userImg, cat, date FROM users u JOIN posts p ON u.id = p.uid WHERE p.id = $1 AND p.draft = false AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))";

    const result = await db.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error in getSinglePost:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPostForEditing = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    try {
      const query =
        "SELECT p.id, username, title, \"desc\", p.img, u.img AS userImg, cat, date, draft, scheduled_publish_date, tags, featured FROM users u JOIN posts p ON u.id = p.uid WHERE p.id = $1 AND p.uid = $2";

      const result = await db.query(query, [req.params.id, userInfo.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Post not found or you don't have permission to edit it" });
      }

      return res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Error in getPostForEditing:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

export const addPost = async (req, res) => {
  const token = req.body.tokenValue;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const query =
      "INSERT INTO posts(title, \"desc\", img, cat, date, uid, draft, scheduled_publish_date, tags, featured) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id";

    const values = [
      req.body.title,
      req.body.desc,
      req.body.img || "",
      req.body.cat || "",
      req.body.date || new Date().toISOString(),
      userInfo.id,
      req.body.draft !== undefined ? req.body.draft : false,
      req.body.scheduled_publish_date || null,
      JSON.stringify(req.body.tags || []),
      req.body.featured !== undefined ? req.body.featured : false,
    ];

    try {
      await db.query(query, values);
      return res.json("Post has been created.");
    } catch (err) {
      console.error('Error in addPost:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

export const deletePost = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
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
      console.error('Error in deletePost:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

export const updatePost = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const postId = req.params.id;

    // Build dynamic query based on provided fields
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (req.body.title !== undefined) {
      fields.push(`title=$${paramIndex}`);
      values.push(req.body.title);
      paramIndex++;
    }

    if (req.body.desc !== undefined) {
      fields.push(`"desc"=$${paramIndex}`);
      values.push(req.body.desc);
      paramIndex++;
    }

    if (req.body.img !== undefined) {
      fields.push(`img=$${paramIndex}`);
      values.push(req.body.img || "");
      paramIndex++;
    }

    if (req.body.cat !== undefined) {
      fields.push(`cat=$${paramIndex}`);
      values.push(req.body.cat || "");
      paramIndex++;
    }

    if (req.body.draft !== undefined) {
      fields.push(`draft=$${paramIndex}`);
      values.push(req.body.draft);
      paramIndex++;
    }

    if (req.body.scheduled_publish_date !== undefined) {
      fields.push(`scheduled_publish_date=$${paramIndex}`);
      values.push(req.body.scheduled_publish_date || null);
      paramIndex++;
    }

    if (req.body.tags !== undefined) {
      fields.push(`tags=$${paramIndex}`);
      values.push(JSON.stringify(req.body.tags || []));
      paramIndex++;
    }

    if (req.body.featured !== undefined) {
      fields.push(`featured=$${paramIndex}`);
      values.push(req.body.featured);
      paramIndex++;
    }

    if (fields.length === 0) {
      return res.status(400).json("No fields to update");
    }

    const query = `UPDATE posts SET ${fields.join(', ')} WHERE id = $${paramIndex} AND uid = $${paramIndex + 1}`;
    values.push(postId, userInfo.id);

    try {
      const result = await db.query(query, values);

      if (result.rowCount === 0) {
        return res.status(403).json("You can update only your post!");
      }

      return res.json("Post has been updated.");
    } catch (err) {
      console.error('Error in updatePost:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

export const getUserDrafts = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  console.log('Auth header:', authHeader);
  console.log('Token extracted:', token ? 'Present' : 'Missing');

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    console.log('JWT verify error:', err);
    console.log('User info:', userInfo);
    if (err) return res.status(403).json("Token is not valid!");

    try {
      const query = "SELECT * FROM posts WHERE uid = $1 AND draft = true ORDER BY date DESC";

      const result = await db.query(query, [userInfo.id]);

      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error in getUserDrafts:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

export const getUserScheduledPosts = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    try {
      const query = "SELECT * FROM posts WHERE uid = $1 AND draft = false AND scheduled_publish_date IS NOT NULL AND scheduled_publish_date > timezone('UTC', now()) ORDER BY scheduled_publish_date ASC";

      const result = await db.query(query, [userInfo.id]);

      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error in getUserScheduledPosts:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

export const getPostsByTag = async (req, res) => {
  try {
    const tag = req.params.tag;

    // Convert tag to proper JSON format for PostgreSQL query
    const tagJson = JSON.stringify([tag]);

    // Use PostgreSQL JSONB operators to find posts with the specified tag
    const query = "SELECT * FROM posts WHERE draft = false AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= timezone('UTC', now())) AND tags::text ILIKE $1";

    // Search for the tag within the JSON structure
    const result = await db.query(query, [`%${tag}%`]);

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getPostsByTag:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFeaturedPosts = async (req, res) => {
  try {
    const query = "SELECT * FROM posts WHERE draft = false AND featured = true AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= timezone('UTC', now())) ORDER BY date DESC LIMIT 5";

    const result = await db.query(query);

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getFeaturedPosts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
