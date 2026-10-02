import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { parsePositiveInteger } from "../utils/request.js";

export const addBookmark = async (req, res) => {
  const postId = parsePositiveInteger(req.body.postId);

  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }

  const result = await db.query(
      `
        INSERT INTO bookmarks(uid, pid)
        SELECT $1, p.id
        FROM posts p
        WHERE p.id = $2
          AND p.draft = false
          AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
        ON CONFLICT (uid, pid) DO NOTHING
        RETURNING id
      `,
      [req.user.id, postId]
    );

  if (result.rows.length === 0) {
    const post = await db.query(
        `
          SELECT 1 FROM posts
          WHERE id = $1
            AND draft = false
            AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= timezone('UTC', now()))
        `,
        [postId],
      );
    if (post.rows.length === 0) {
      throw new ApiError(404, "Published post not found", "POST_NOT_FOUND");
    }
  }

  return res.status(200).json({
    message: result.rows.length ? "Post has been bookmarked." : "Already bookmarked",
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
        SELECT p.*, u.username, u.avatar AS "userAvatar"
        FROM posts p
        JOIN bookmarks b ON p.id = b.pid
        JOIN users u ON u.id = p.uid
        WHERE b.uid = $1
          AND p.draft = false
          AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
        ORDER BY b.created_at DESC
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

  const result = await db.query("SELECT COUNT(*) FROM bookmarks WHERE pid = $1", [postId]);
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
        SELECT pid, COUNT(*)::integer AS count
        FROM bookmarks
        WHERE pid = ANY($1::int[])
        GROUP BY pid
      `,
      [postIds]
    );
    const counts = Object.fromEntries(postIds.map((id) => [id, 0]));
    result.rows.forEach((row) => {
      counts[row.pid] = row.count;
    });
  return res.status(200).json(counts);
};
