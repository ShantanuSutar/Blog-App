import { db } from "../db.js";
import { recordActivity } from "../services/activity.js";
import { withTransaction } from "../utils/database.js";
import { parsePositiveInteger } from "../utils/request.js";

const reactionTypes = new Set(["like", "love", "celebrate"]);

const getTarget = (source) => {
  const postId = parsePositiveInteger(source.postId);
  const commentId = parsePositiveInteger(source.commentId);

  if (Boolean(postId) === Boolean(commentId)) {
    return null;
  }

  return { postId, commentId };
};

const findTargetOwner = async (queryable, { postId, commentId }) => {
  if (postId) {
    const result = await queryable.query(
      `
        SELECT uid AS target_user_id
        FROM posts
        WHERE id = $1
          AND draft = false
          AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= timezone('UTC', now()))
      `,
      [postId],
    );
    return result.rows[0] || null;
  }

  const result = await queryable.query(
    `
      SELECT c.cuserid AS target_user_id
      FROM comments c
      JOIN posts p ON p.id = c.cpostid
      WHERE c.id = $1
        AND p.draft = false
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
    `,
    [commentId],
  );
  return result.rows[0] || null;
};

const targetWhereClause = `
  user_id = $1
  AND post_id IS NOT DISTINCT FROM $2
  AND comment_id IS NOT DISTINCT FROM $3
`;

export const addReaction = async (req, res) => {
  const target = getTarget(req.body);
  const reactionType = req.body.reactionType || "like";

  if (!target) {
    return res.status(400).json("Exactly one post ID or comment ID is required");
  }
  if (!reactionTypes.has(reactionType)) {
    return res.status(400).json("Unsupported reaction type");
  }

  try {
    const response = await withTransaction(db, async (client) => {
      const owner = await findTargetOwner(client, target);
      if (!owner) {
        return null;
      }

      const existingResult = await client.query(
        `SELECT id, reaction_type FROM reactions WHERE ${targetWhereClause} ORDER BY id FOR UPDATE`,
        [req.user.id, target.postId, target.commentId],
      );
      const matchingReaction = existingResult.rows.find(
        (reaction) => reaction.reaction_type === reactionType,
      );

      if (matchingReaction) {
        await client.query(
          `DELETE FROM reactions WHERE ${targetWhereClause}`,
          [req.user.id, target.postId, target.commentId],
        );
        return {
          message: "Reaction removed",
          action: "removed",
          reactionId: matchingReaction.id,
        };
      }

      let reactionId;
      let action;
      if (existingResult.rows.length > 0) {
        const primaryReaction = existingResult.rows[0];
        const updateResult = await client.query(
          "UPDATE reactions SET reaction_type = $1 WHERE id = $2 RETURNING id",
          [reactionType, primaryReaction.id],
        );
        reactionId = updateResult.rows[0].id;
        action = "updated";

        if (existingResult.rows.length > 1) {
          await client.query(
            "DELETE FROM reactions WHERE id = ANY($1::int[])",
            [existingResult.rows.slice(1).map(({ id }) => id)],
          );
        }
      } else {
        const insertResult = await client.query(
          `
            INSERT INTO reactions (user_id, post_id, comment_id, reaction_type)
            VALUES ($1, $2, $3, $4)
            RETURNING id
          `,
          [req.user.id, target.postId, target.commentId, reactionType],
        );
        reactionId = insertResult.rows[0].id;
        action = "added";
      }

      if (owner.target_user_id !== req.user.id) {
        await recordActivity(client, {
          userId: req.user.id,
          activityType: "reaction",
          postId: target.postId,
          commentId: target.commentId,
          targetUserId: owner.target_user_id,
        });
      }

      return {
        message: action === "added" ? "Reaction added" : "Reaction updated",
        action,
        reactionId,
      };
    });

    if (!response) {
      return res.status(404).json("Published target not found");
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error saving reaction:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getReactions = async (req, res) => {
  const target = getTarget(req.params);
  if (!target) {
    return res.status(400).json("Exactly one post ID or comment ID is required");
  }

  try {
    const targetColumn = target.postId ? "post_id" : "comment_id";
    const targetId = target.postId || target.commentId;
    const result = await db.query(
      `
        SELECT r.reaction_type, r.user_id, u.username, u.avatar AS user_img
        FROM reactions r
        JOIN users u ON r.user_id = u.id
        WHERE r.${targetColumn} = $1
        ORDER BY r.created_at DESC
      `,
      [targetId],
    );

    const grouped = result.rows.reduce((groups, reaction) => {
      const group = groups[reaction.reaction_type] || { count: 0, users: [] };
      group.count += 1;
      group.users.push({
        id: reaction.user_id,
        username: reaction.username,
        img: reaction.user_img,
      });
      groups[reaction.reaction_type] = group;
      return groups;
    }, {});

    return res.status(200).json({ total: result.rows.length, grouped });
  } catch (error) {
    console.error("Error getting reactions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserReaction = async (req, res) => {
  const target = getTarget(req.params);
  if (!target) {
    return res.status(400).json("Exactly one post ID or comment ID is required");
  }

  try {
    const result = await db.query(
      `
        SELECT reaction_type
        FROM reactions
        WHERE ${targetWhereClause}
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [req.user.id, target.postId, target.commentId],
    );
    return res.status(200).json({
      reaction: result.rows[0]?.reaction_type || null,
    });
  } catch (error) {
    console.error("Error getting user reaction:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeReaction = async (req, res) => {
  const reactionId = parsePositiveInteger(req.params.reactionId);
  if (!reactionId) {
    return res.status(400).json("Invalid reaction ID");
  }

  try {
    const result = await db.query(
      "DELETE FROM reactions WHERE id = $1 AND user_id = $2",
      [reactionId, req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json("Reaction not found or you don't have permission");
    }
    return res.status(200).json("Reaction removed");
  } catch (error) {
    console.error("Error removing reaction:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
