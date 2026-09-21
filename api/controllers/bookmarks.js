import { db } from "../db.js";

const normalizePostId = (value) => {
  const postId = Number(value);
  return Number.isInteger(postId) && postId > 0 ? postId : null;
};

export const addBookmark = async (req, res) => {
  const postId = normalizePostId(req.body.postId);

  if (!postId) {
    return res.status(400).json({ error: "Invalid post ID" });
  }

  try {
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
      const post = await db.query("SELECT 1 FROM posts WHERE id = $1", [postId]);
      if (post.rows.length === 0) {
        return res.status(404).json({ error: "Published post not found" });
      }
    }

    return res.status(200).json({
      message: result.rows.length ? "Post has been bookmarked." : "Already bookmarked",
      bookmarked: true,
    });
  } catch (err) {
    console.error("Error adding bookmark:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeBookmark = async (req, res) => {
  const postId = normalizePostId(req.params.postId);

  if (!postId) {
    return res.status(400).json({ error: "Invalid post ID" });
  }

  try {
    await db.query(
      "DELETE FROM bookmarks WHERE uid = $1 AND pid = $2",
      [req.user.id, postId]
    );
    return res.status(200).json({ message: "Bookmark removed.", bookmarked: false });
  } catch (err) {
    console.error("Error removing bookmark:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getBookmarks = async (req, res) => {
  try {
    const result = await db.query(
      `
        SELECT p.*
        FROM posts p
        JOIN bookmarks b ON p.id = b.pid
        WHERE b.uid = $1
          AND p.draft = false
          AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
        ORDER BY b.created_at DESC
      `,
      [req.user.id]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error getting bookmarks:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const checkBookmarkStatus = async (req, res) => {
  const postId = normalizePostId(req.params.postId);

  if (!postId) {
    return res.status(400).json({ error: "Invalid post ID" });
  }

  try {
    const result = await db.query(
      "SELECT 1 FROM bookmarks WHERE uid = $1 AND pid = $2",
      [req.user.id, postId]
    );
    return res.status(200).json(result.rows.length > 0);
  } catch (err) {
    console.error("Error checking bookmark:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getBookmarkCount = async (req, res) => {
  const postId = normalizePostId(req.params.postId);

  if (!postId) {
    return res.status(400).json({ error: "Invalid post ID" });
  }

  try {
    const result = await db.query("SELECT COUNT(*) FROM bookmarks WHERE pid = $1", [postId]);
    return res.status(200).json({ count: Number(result.rows[0].count) });
  } catch (err) {
    console.error("Error getting bookmark count:", err);
    return res.status(500).json({ error: "Failed to get bookmark count" });
  }
};

export const getBookmarkCountsForPosts = async (req, res) => {
  const postIds = Array.isArray(req.body.postIds)
    ? [...new Set(req.body.postIds.map(normalizePostId).filter(Boolean))].slice(0, 100)
    : [];

  if (postIds.length === 0) {
    return res.status(400).json({ error: "Invalid post IDs" });
  }

  try {
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
  } catch (err) {
    console.error("Error getting bookmark counts:", err);
    return res.status(500).json({ error: "Failed to get bookmark counts" });
  }
};
