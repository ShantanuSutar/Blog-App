import { db } from "../db.js";
import { sanitizePlainText } from "../utils/content.js";

export const addComment = async (req, res) => {
  const comment = sanitizePlainText(req.body.comment);
  const postId = Number(req.params.id);

  if (!comment) {
    return res.status(400).json("Comment is required");
  }

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json("Invalid post ID");
  }

  let client;

  try {
    client = await db.connect();
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO comments(comment, Cpostid, Cuserid)
        SELECT $1, p.id, $2
        FROM posts p
        WHERE p.id = $3
          AND p.draft = false
          AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
        RETURNING id
      `,
      [comment.slice(0, 5000), req.user.id, postId]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json("Published post not found");
    }

    const commentId = result.rows[0].id;

    // Track comment activity
    const trackQuery = `
      INSERT INTO activities (user_id, activity_type, post_id, comment_id, target_user_id)
      SELECT $1, 'comment', p.id, $2, p.uid
      FROM posts p
      WHERE p.id = $3
    `;
    await client.query(trackQuery, [req.user.id, commentId, postId]);
    await client.query("COMMIT");

    return res.status(201).json({ message: "Comment has been created.", id: commentId });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error('Error adding comment:', err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client?.release();
  }
};

export const getComment = async (req, res) => {
  const query =
    "SELECT c.*, u.username, u.avatar AS img from comments c JOIN users u ON u.id = c.Cuserid where Cpostid = $1 ORDER BY c.id ASC";

  try {
    const result = await db.query(query, [req.params.id]);
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json(err);
  }
};
