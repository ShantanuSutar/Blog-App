import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { recordActivity } from "../services/activity.js";
import { sanitizePlainText } from "../utils/content.js";
import { withTransaction } from "../utils/database.js";
import { parsePositiveInteger } from "../utils/request.js";

export const addComment = async (req, res) => {
  const comment = sanitizePlainText(req.body.comment);
  const postId = parsePositiveInteger(req.params.id);

  if (!comment) {
    throw new ApiError(400, "Comment is required", "COMMENT_REQUIRED");
  }

  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }

  const commentId = await withTransaction(db, async (client) => {
      const result = await client.query(
        `
          WITH target AS MATERIALIZED (
            SELECT id, uid
            FROM posts
            WHERE id = $3
              AND draft = false
              AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= CURRENT_TIMESTAMP)
          ), inserted AS (
            INSERT INTO comments(comment, cpostid, cuserid)
            SELECT $1, id, $2 FROM target
            RETURNING id
          )
          SELECT inserted.id, target.uid AS post_owner_id
          FROM inserted CROSS JOIN target
        `,
        [comment.slice(0, 5000), req.user.id, postId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      await recordActivity(client, {
        userId: req.user.id,
        activityType: "comment",
        postId,
        commentId: result.rows[0].id,
        targetUserId: result.rows[0].post_owner_id,
      });

      return result.rows[0].id;
    });

  if (!commentId) {
    throw new ApiError(404, "Published post not found", "POST_NOT_FOUND");
  }

  return res.status(201).json({ message: "Comment has been created.", id: commentId });
};

export const getComment = async (req, res) => {
  const postId = parsePositiveInteger(req.params.id);
  if (!postId) {
    throw new ApiError(400, "Invalid post ID", "POST_ID_INVALID");
  }

  const query =
    `
      SELECT c.id, c.comment, c.cpostid, c.cuserid, c.created_at, u.username, u.avatar AS img
      FROM comments c
      JOIN users u ON u.id = c.cuserid
      JOIN posts p ON p.id = c.cpostid
      WHERE c.cpostid = $1
        AND p.draft = false
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
      ORDER BY c.id ASC
    `;

  const result = await db.query(query, [postId]);
  return res.status(200).json(result.rows);
};
