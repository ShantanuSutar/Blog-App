import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { PUBLIC_POST_COLUMNS } from "../services/postFeed.js";
import { parsePositiveInteger } from "../utils/request.js";

export const addBookmark = async (req, res) => {
  const postId = parsePositiveInteger(req.body.postId);

  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }

  const result = await db.query(
      `
        WITH target AS MATERIALIZED (
          SELECT id
          FROM posts
          WHERE id = $2
            AND draft = false
            AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= CURRENT_TIMESTAMP)
        ), inserted AS (
          INSERT INTO bookmarks(uid, pid)
          SELECT $1, id FROM target
          ON CONFLICT (uid, pid) DO NOTHING
          RETURNING id
        )
        SELECT
          EXISTS (SELECT 1 FROM target) AS post_exists,
          EXISTS (SELECT 1 FROM inserted) AS inserted
      `,
      [req.user.id, postId]
    );

  if (!result.rows[0].post_exists) {
    throw new ApiError(404, "Published post not found", "POST_NOT_FOUND");
  }

  return res.status(200).json({
    message: result.rows[0].inserted ? "Post has been bookmarked." : "Already bookmarked",
    bookmarked: true,
  });
};

export const removeBookmark = async (req, res) => {
  const postId = parsePositiveInteger(req.params.postId);

  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }

  await db.query(
      "DELETE FROM bookmarks WHERE uid = $1 AND pid = $2",
      [req.user.id, postId]
    );
  return res.status(200).json({ message: "Bookmark removed.", bookmarked: false });
};

export const getBookmarks = async (req, res) => {
  const result = await db.query(
      `
        SELECT ${PUBLIC_POST_COLUMNS}, u.username, u.avatar AS "userAvatar"
        FROM posts p
        JOIN bookmarks b ON p.id = b.pid
        JOIN users u ON u.id = p.uid
        WHERE b.uid = $1
          AND p.draft = false
          AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
        ORDER BY b.created_at DESC, b.id DESC
      `,
      [req.user.id]
    );
  return res.status(200).json(result.rows);
};

export const checkBookmarkStatus = async (req, res) => {
  const postId = parsePositiveInteger(req.params.postId);

  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }

  const result = await db.query(
      "SELECT 1 FROM bookmarks WHERE uid = $1 AND pid = $2",
      [req.user.id, postId]
    );
  return res.status(200).json(result.rows.length > 0);
};

export const getBookmarkCount = async (req, res) => {
  const postId = parsePositiveInteger(req.params.postId);

  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }

  const result = await db.query(
    `
      SELECT COUNT(b.id)
      FROM posts p
      LEFT JOIN bookmarks b ON b.pid = p.id
      WHERE p.id = $1
        AND p.draft = false
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
    `,
    [postId],
  );
  return res.status(200).json({ count: Number(result.rows[0].count) });
};

export const getBookmarkCountsForPosts = async (req, res) => {
  const postIds = Array.isArray(req.body.postIds)
    ? [...new Set(req.body.postIds.map(parsePositiveInteger).filter(Boolean))].slice(0, 100)
    : [];

  if (postIds.length === 0) {
    throw new ApiError(400, "Invalid post IDs", "POST_IDS_INVALID");
  }

  const result = await db.query(
      `
        SELECT b.pid, COUNT(*)::integer AS count
        FROM bookmarks b
        JOIN posts p ON p.id = b.pid
        WHERE b.pid = ANY($1::int[])
          AND p.draft = false
          AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
        GROUP BY b.pid
      `,
      [postIds]
    );
    const counts = Object.fromEntries(postIds.map((id) => [id, 0]));
    result.rows.forEach((row) => {
      counts[row.pid] = row.count;
    });
  return res.status(200).json(counts);
};
