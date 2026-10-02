import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { recordActivity } from "../services/activity.js";
import { notifySubscribersOfPost } from "../services/notifications.js";
import { sanitizePlainText, sanitizeRichText } from "../utils/content.js";
import { withTransaction } from "../utils/database.js";
import { isPublishedPost, normalizeSchedule } from "../utils/postState.js";
import { getPagination, parsePositiveInteger } from "../utils/request.js";

const sanitizePost = (post) => ({
  ...post,
  desc: sanitizeRichText(post.desc),
});

export const getPosts = async (req, res) => {
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
    const { page, limit, offset } = getPagination(req.query, { defaultLimit: 10, maxLimit: 100 });

    query = `SELECT p.*, u.username, u.avatar AS "userAvatar" FROM posts p JOIN users u ON u.id = p.uid ${whereClause} ORDER BY p.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination info
    const countQuery = `SELECT COUNT(*) FROM posts p ${whereClause}`;
    // Remove limit and offset params for count query
    const countParams = params.slice(0, params.length - 2);
    const countResult = await db.query(countQuery, countParams);

  return res.status(200).json({
      posts: result.rows.map(sanitizePost),
      totalPages: Math.ceil(Number(countResult.rows[0].count) / limit),
      currentPage: page
  });
};

export const getSinglePost = async (req, res) => {
  const postId = parsePositiveInteger(req.params.id);
  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }

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

    const result = await db.query(query, [postId]);

  if (result.rows.length === 0) {
    throw new ApiError(404, "Post not found", "POST_NOT_FOUND");
  }

  return res.status(200).json({
    ...sanitizePost(result.rows[0]),
  });
};

export const getPostForEditing = async (req, res) => {
  const postId = parsePositiveInteger(req.params.id);
  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }

  const query =
    "SELECT p.id, username, title, \"desc\", p.img, u.avatar AS \"userAvatar\", cat, date, draft, scheduled_publish_date, tags, featured FROM users u JOIN posts p ON u.id = p.uid WHERE p.id = $1 AND p.uid = $2";

  const result = await db.query(query, [postId, req.user.id]);

  if (result.rows.length === 0) {
    throw new ApiError(404, "Post not found or you don't have permission to edit it", "POST_NOT_FOUND");
  }

  return res.status(200).json({
    ...sanitizePost(result.rows[0]),
  });
};

export const addPost = async (req, res) => {
  let schedule;
  try {
    schedule = normalizeSchedule(req.body.scheduled_publish_date);
  } catch (err) {
    throw new ApiError(400, err.message, "SCHEDULE_INVALID");
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

  const postId = await withTransaction(db, async (client) => {
      const result = await client.query(query, values);
      const createdPostId = result.rows[0].id;
      
      if (!isDraft) {
        await recordActivity(client, {
          userId: req.user.id,
          activityType: "post",
          postId: createdPostId,
        });
      }

      return createdPostId;
    });

      if (!isDraft) {
        notifySubscribersOfPost(postId, title).catch((err) => {
          console.error("Error sending new post notifications:", err);
        });
      }

  return res.status(201).json({
    message: schedule.isScheduled ? "Post has been scheduled." : isDraft ? "Draft has been saved." : "Post has been created.",
    id: postId,
    status: schedule.isScheduled ? "scheduled" : isDraft ? "draft" : "published",
  });
};

export const deletePost = async (req, res) => {
  const postId = parsePositiveInteger(req.params.id);
  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }
  const query = "DELETE FROM posts WHERE id = $1 AND uid = $2";

  const result = await db.query(query, [postId, req.user.id]);

  if (result.rowCount === 0) {
    throw new ApiError(403, "You can delete only your post!", "POST_DELETE_FORBIDDEN");
  }

  return res.status(200).json("Post has been deleted!");
};

export const updatePost = async (req, res) => {
  const postId = parsePositiveInteger(req.params.id);
  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }
  let schedule;
  try {
    schedule = req.body.scheduled_publish_date !== undefined
      ? normalizeSchedule(req.body.scheduled_publish_date)
      : null;
  } catch (err) {
    throw new ApiError(400, err.message, "SCHEDULE_INVALID");
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
    } else if (requestedDraft === false) {
      fields.push(`scheduled_publish_date=$${paramIndex}`);
      values.push(null);
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
      throw new ApiError(400, "No fields to update", "POST_UPDATE_EMPTY");
    }

    const query = `UPDATE posts SET ${fields.join(', ')} WHERE id = $${paramIndex} AND uid = $${paramIndex + 1} RETURNING id, title, draft, scheduled_publish_date`;
    values.push(postId, req.user.id);

  const updateResult = await withTransaction(db, async (client) => {
      const currentResult = await client.query(
        "SELECT id, title, draft, scheduled_publish_date FROM posts WHERE id = $1 AND uid = $2 FOR UPDATE",
        [postId, req.user.id]
      );

      if (currentResult.rows.length === 0) {
        return null;
      }

      const result = await client.query(query, values);

      if (result.rowCount === 0) {
        return null;
      }

      const previouslyPublished = isPublishedPost(currentResult.rows[0]);
      const updatedPost = result.rows[0];
      const isPublished = isPublishedPost(updatedPost);

      if (!previouslyPublished && isPublished) {
        await recordActivity(client, {
          userId: req.user.id,
          activityType: "post",
          postId,
        });
      }

      return { wasPublished: previouslyPublished, updatedPost };
    });

      const { wasPublished, updatedPost } = updateResult || {};

  if (!updatedPost) {
    throw new ApiError(403, "You can update only your post!", "POST_UPDATE_FORBIDDEN");
  }

      if (!wasPublished && isPublishedPost(updatedPost)) {
        notifySubscribersOfPost(postId, updatedPost.title).catch((err) => {
          console.error("Error sending new post notifications:", err);
        });
      }

  return res.status(200).json({
    message: "Post has been updated.",
    status: updatedPost.draft
      ? updatedPost.scheduled_publish_date ? "scheduled" : "draft"
      : "published",
  });
};

export const getUserDrafts = async (req, res) => {
  const query = "SELECT * FROM posts WHERE uid = $1 AND draft = true AND scheduled_publish_date IS NULL ORDER BY date DESC";

  const result = await db.query(query, [req.user.id]);

  return res.status(200).json(result.rows.map(sanitizePost));
};

export const getUserScheduledPosts = async (req, res) => {
  const query = "SELECT * FROM posts WHERE uid = $1 AND draft = true AND scheduled_publish_date IS NOT NULL AND scheduled_publish_date > timezone('UTC', now()) ORDER BY scheduled_publish_date ASC";

  const result = await db.query(query, [req.user.id]);

  return res.status(200).json(result.rows.map(sanitizePost));
};

export const getPostsByTag = async (req, res) => {
  const tag = req.params.tag;

    const tagJson = JSON.stringify([tag]);

    const query = `
      SELECT p.*, u.username, u.avatar AS "userAvatar"
      FROM posts p
      JOIN users u ON u.id = p.uid
      WHERE p.draft = false
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
        AND p.tags::jsonb @> $1::jsonb
      ORDER BY p.date DESC
    `;

    const result = await db.query(query, [tagJson]);

  return res.status(200).json(result.rows.map(sanitizePost));
};

export const getFeaturedPosts = async (req, res) => {
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

  return res.status(200).json(result.rows.map(sanitizePost));
};

export const getPopularPosts = async (req, res) => {
  const limit = Math.min(parsePositiveInteger(req.query.limit) || 10, 50);
    
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

  return res.status(200).json(result.rows.map(sanitizePost));
};
