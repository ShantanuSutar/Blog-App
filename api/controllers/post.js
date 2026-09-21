import { db } from "../db.js";
import dotenv from "dotenv";
import { sendNewPostNotification } from "../utils/email.js";
import { sanitizePlainText, sanitizeRichText } from "../utils/content.js";
import { isPublishedPost, normalizeSchedule } from "../utils/postState.js";
dotenv.config();

const notifySubscribers = async (postId, title) => {
  const subscribersResult = await db.query("SELECT email FROM subscribers");
  const subscriberEmails = subscribersResult.rows.map((row) => row.email);

  if (subscriberEmails.length === 0) {
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || "https://unsaid-stories-and-more.vercel.app";
  const emailResult = await sendNewPostNotification(
    subscriberEmails,
    title,
    `${frontendUrl}/post/${postId}`
  );

  if (!emailResult.success) {
    console.warn("Some post notifications could not be delivered", {
      postId,
      failed: emailResult.failed,
    });
  }
};

export const getPosts = async (req, res) => {
  try {
    let query;
    let params = [];
    let conditions = ["p.draft=false AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))"];

    if (req.query.cat) {
      conditions.push(`p.cat=$${params.length + 1}`);
      params.push(req.query.cat);
    }

    if (req.query.search) {
      conditions.push(`(p.title ILIKE $${params.length + 1} OR p."desc" ILIKE $${params.length + 1})`);
      params.push(`%${req.query.search}%`);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    query = `SELECT p.*, u.username, u.avatar AS "userAvatar" FROM posts p JOIN users u ON u.id = p.uid ${whereClause} ORDER BY p.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination info
    const countQuery = `SELECT COUNT(*) FROM posts p ${whereClause}`;
    // Remove limit and offset params for count query
    const countParams = params.slice(0, params.length - 2);
    const countResult = await db.query(countQuery, countParams);

    return res.status(200).json({
      posts: result.rows.map((post) => ({
        ...post,
        desc: sanitizeRichText(post.desc),
      })),
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
    const query = `
      WITH visible_post AS (
        UPDATE posts
        SET views = COALESCE(views, 0) + 1
        WHERE id = $1
          AND draft = false
          AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= timezone('UTC', now()))
        RETURNING *
      )
      SELECT p.*, u.username, u.avatar AS "userAvatar"
      FROM visible_post p
      JOIN users u ON u.id = p.uid
    `;

    const result = await db.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json({
      ...result.rows[0],
      desc: sanitizeRichText(result.rows[0].desc),
    });
  } catch (err) {
    console.error('Error in getSinglePost:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPostForEditing = async (req, res) => {
  try {
    const query =
      "SELECT p.id, username, title, \"desc\", p.img, u.avatar AS \"userAvatar\", cat, date, draft, scheduled_publish_date, tags, featured FROM users u JOIN posts p ON u.id = p.uid WHERE p.id = $1 AND p.uid = $2";

    const result = await db.query(query, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Post not found or you don't have permission to edit it" });
    }

    return res.status(200).json({
      ...result.rows[0],
      desc: sanitizeRichText(result.rows[0].desc),
    });
  } catch (err) {
    console.error('Error in getPostForEditing:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addPost = async (req, res) => {
  let schedule;
  try {
    schedule = normalizeSchedule(req.body.scheduled_publish_date);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const isDraft = req.body.draft === true || schedule.isScheduled;
  const title = sanitizePlainText(req.body.title);
  const query =
    "INSERT INTO posts(title, \"desc\", img, cat, date, uid, draft, scheduled_publish_date, tags, featured) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id";

  const values = [
      title,
      sanitizeRichText(req.body.desc),
      req.body.img || "",
      req.body.cat || "",
      req.body.date || new Date().toISOString(),
      req.user.id,
      isDraft,
      schedule.date,
      JSON.stringify(req.body.tags || []),
      req.body.featured !== undefined ? req.body.featured : false,
    ];

  let client;
  try {
      client = await db.connect();
      await client.query("BEGIN");
      const result = await client.query(query, values);
      const postId = result.rows[0].id;
      
      // Track activity for new post
      if (!isDraft) {
        const trackQuery = `
          INSERT INTO activities (user_id, activity_type, post_id)
          VALUES ($1, 'post', $2)
        `;
        await client.query(trackQuery, [req.user.id, postId]);
      }

      await client.query("COMMIT");

      if (!isDraft) {
        notifySubscribers(postId, title).catch((err) => {
          console.error("Error sending new post notifications:", err);
        });
      }

    return res.status(201).json({
      message: schedule.isScheduled ? "Post has been scheduled." : isDraft ? "Draft has been saved." : "Post has been created.",
      id: postId,
      status: schedule.isScheduled ? "scheduled" : isDraft ? "draft" : "published",
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error('Error in addPost:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client?.release();
  }
};

export const deletePost = async (req, res) => {
  const postId = req.params.id;
  const query = "DELETE FROM posts WHERE id = $1 AND uid = $2";

  try {
      const result = await db.query(query, [postId, req.user.id]);

      if (result.rowCount === 0) {
        return res.status(403).json("You can delete only your post!");
      }

    return res.json("Post has been deleted!");
  } catch (err) {
    console.error('Error in deletePost:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePost = async (req, res) => {
  const postId = req.params.id;
  let schedule;
  try {
    schedule = req.body.scheduled_publish_date !== undefined
      ? normalizeSchedule(req.body.scheduled_publish_date)
      : null;
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

    const requestedDraft = schedule?.isScheduled ? true : req.body.draft;

    // Build dynamic query based on provided fields
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (req.body.title !== undefined) {
      fields.push(`title=$${paramIndex}`);
      values.push(sanitizePlainText(req.body.title));
      paramIndex++;
    }

    if (req.body.desc !== undefined) {
      fields.push(`"desc"=$${paramIndex}`);
      values.push(sanitizeRichText(req.body.desc));
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

    if (requestedDraft !== undefined) {
      fields.push(`draft=$${paramIndex}`);
      values.push(requestedDraft);
      paramIndex++;
    }

    if (req.body.scheduled_publish_date !== undefined) {
      fields.push(`scheduled_publish_date=$${paramIndex}`);
      values.push(schedule.date);
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

    const query = `UPDATE posts SET ${fields.join(', ')} WHERE id = $${paramIndex} AND uid = $${paramIndex + 1} RETURNING id, title, draft, scheduled_publish_date`;
    values.push(postId, req.user.id);

  let client;
  try {
      client = await db.connect();
      await client.query("BEGIN");
      const currentResult = await client.query(
        "SELECT id, title, draft, scheduled_publish_date FROM posts WHERE id = $1 AND uid = $2 FOR UPDATE",
        [postId, req.user.id]
      );

      if (currentResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json("You can update only your post!");
      }

      const result = await client.query(query, values);

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json("You can update only your post!");
      }

      const wasPublished = isPublishedPost(currentResult.rows[0]);
      const updatedPost = result.rows[0];
      const isPublished = isPublishedPost(updatedPost);

      if (!wasPublished && isPublished) {
        await client.query(
          "INSERT INTO activities (user_id, activity_type, post_id) VALUES ($1, 'post', $2)",
          [req.user.id, postId]
        );
      }

      await client.query("COMMIT");

      if (!wasPublished && isPublished) {
        notifySubscribers(postId, updatedPost.title).catch((err) => {
          console.error("Error sending new post notifications:", err);
        });
      }

    return res.json({
      message: "Post has been updated.",
      status: updatedPost.draft
        ? updatedPost.scheduled_publish_date ? "scheduled" : "draft"
        : "published",
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error('Error in updatePost:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client?.release();
  }
};

export const getUserDrafts = async (req, res) => {
  try {
      const query = "SELECT * FROM posts WHERE uid = $1 AND draft = true AND scheduled_publish_date IS NULL ORDER BY date DESC";

      const result = await db.query(query, [req.user.id]);

    return res.status(200).json(result.rows.map((post) => ({
      ...post,
      desc: sanitizeRichText(post.desc),
    })));
  } catch (err) {
    console.error('Error in getUserDrafts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserScheduledPosts = async (req, res) => {
  try {
      const query = "SELECT * FROM posts WHERE uid = $1 AND draft = true AND scheduled_publish_date IS NOT NULL AND scheduled_publish_date > timezone('UTC', now()) ORDER BY scheduled_publish_date ASC";

      const result = await db.query(query, [req.user.id]);

    return res.status(200).json(result.rows.map((post) => ({
      ...post,
      desc: sanitizeRichText(post.desc),
    })));
  } catch (err) {
    console.error('Error in getUserScheduledPosts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPostsByTag = async (req, res) => {
  try {
    const tag = req.params.tag;

    // Convert tag to proper JSON format for PostgreSQL query
    const tagJson = JSON.stringify([tag]);

    // Use PostgreSQL JSONB operators to find posts with the specified tag
    const query = `
      SELECT p.*, u.username, u.avatar AS "userAvatar"
      FROM posts p
      JOIN users u ON u.id = p.uid
      WHERE p.draft = false
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
        AND p.tags::text ILIKE $1
    `;

    // Search for the tag within the JSON structure
    const result = await db.query(query, [`%${tag}%`]);

    return res.status(200).json(result.rows.map((post) => ({
      ...post,
      desc: sanitizeRichText(post.desc),
    })));
  } catch (err) {
    console.error('Error in getPostsByTag:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFeaturedPosts = async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.username, u.avatar AS "userAvatar"
      FROM posts p
      JOIN users u ON u.id = p.uid
      WHERE p.draft = false
        AND p.featured = true
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
      ORDER BY p.date DESC
      LIMIT 5
    `;

    const result = await db.query(query);

    return res.status(200).json(result.rows.map((post) => ({
      ...post,
      desc: sanitizeRichText(post.desc),
    })));
  } catch (err) {
    console.error('Error in getFeaturedPosts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPopularPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const query = `
      SELECT p.*, u.username, u.avatar AS "userAvatar"
      FROM posts p
      JOIN users u ON u.id = p.uid
      WHERE p.draft = false
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
      ORDER BY p.views DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);

    return res.status(200).json(result.rows.map((post) => ({
      ...post,
      desc: sanitizeRichText(post.desc),
    })));
  } catch (err) {
    console.error('Error in getPopularPosts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
