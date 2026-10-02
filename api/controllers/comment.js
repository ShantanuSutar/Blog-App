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
          INSERT INTO comments(comment, Cpostid, Cuserid)
          SELECT $1, p.id, $2
          FROM posts p
          WHERE p.id = $3
            AND p.draft = false
            AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
          RETURNING id
        `,
        [comment.slice(0, 5000), req.user.id, postId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const ownerResult = await client.query("SELECT uid FROM posts WHERE id = $1", [postId]);
      await recordActivity(client, {
        userId: req.user.id,
        activityType: "comment",
        postId,
        commentId: result.rows[0].id,
        targetUserId: ownerResult.rows[0].uid,
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
      SELECT c.*, u.username, u.avatar AS img
      FROM comments c
      JOIN users u ON u.id = c.cuserid
      JOIN posts p ON p.id = c.cpostid
      WHERE c.cpostid = $1
        AND p.draft = false
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
      ORDER BY c.id ASC
    `;

  const result = await db.query(query, [postId]);
  return res.status(200).json(result.rows);
};
