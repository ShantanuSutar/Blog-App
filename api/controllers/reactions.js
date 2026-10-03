import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { recordActivity } from "../services/activity.js";
import { withTransaction } from "../utils/database.js";
import {
  createPaginationMetadata,
  getPagination,
  parsePositiveInteger,
} from "../utils/request.js";

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
          AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= CURRENT_TIMESTAMP)
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
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
    `,
    [commentId],
  );
  return result.rows[0] || null;
};

const getReactionTarget = (userId, target) => target.postId
  ? { whereClause: "user_id = $1 AND post_id = $2", values: [userId, target.postId] }
  : { whereClause: "user_id = $1 AND comment_id = $2", values: [userId, target.commentId] };

export const addReaction = async (req, res) => {
  const target = getTarget(req.body);
  const reactionType = req.body.reactionType || "like";

  if (!target) {
    throw new ApiError(400, "Exactly one post ID or comment ID is required", "REACTION_TARGET_INVALID");
  }
  if (!reactionTypes.has(reactionType)) {
    throw new ApiError(400, "Unsupported reaction type", "REACTION_TYPE_INVALID");
  }

  const response = await withTransaction(db, async (client) => {
      const owner = await findTargetOwner(client, target);
      if (!owner) {
        return null;
      }

      const reactionTarget = getReactionTarget(req.user.id, target);

      const existingResult = await client.query(
        `SELECT id, reaction_type FROM reactions WHERE ${reactionTarget.whereClause} ORDER BY id DESC FOR UPDATE`,
        reactionTarget.values,
      );
      const matchingReaction = existingResult.rows.find(
        (reaction) => reaction.reaction_type === reactionType,
      );

      if (matchingReaction) {
        await client.query(
          `DELETE FROM reactions WHERE ${reactionTarget.whereClause}`,
          reactionTarget.values,
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
    throw new ApiError(404, "Published target not found", "REACTION_TARGET_NOT_FOUND");
  }
  return res.status(200).json(response);
};

export const getReactions = async (req, res) => {
  const target = getTarget(req.params);
  if (!target) {
    throw new ApiError(400, "Exactly one post ID or comment ID is required", "REACTION_TARGET_INVALID");
  }

  const targetId = target.postId || target.commentId;
  const targetJoin = target.postId
    ? "JOIN posts p ON p.id = r.post_id"
    : "JOIN comments c ON c.id = r.comment_id JOIN posts p ON p.id = c.cpostid";
  const targetCondition = target.postId ? "r.post_id = $1" : "r.comment_id = $1";
  const { page, limit, offset } = getPagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100,
  });
  const visibilityClause = `
        ${targetJoin}
        WHERE ${targetCondition}
          AND p.draft = false
          AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
  `;
  const [result, countResult] = await Promise.all([
    db.query(
      `
        SELECT r.reaction_type, r.user_id, u.username, u.avatar AS user_img
        FROM reactions r
        JOIN users u ON r.user_id = u.id
        ${visibilityClause}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT $2 OFFSET $3
      `,
      [targetId, limit, offset],
    ),
    db.query(
      `
        SELECT r.reaction_type, COUNT(*)::integer AS count
        FROM reactions r
        ${visibilityClause}
        GROUP BY r.reaction_type
      `,
      [targetId],
    ),
  ]);

  const grouped = Object.fromEntries(countResult.rows.map((row) => [
    row.reaction_type,
    { count: row.count, users: [] },
  ]));
  result.rows.forEach((reaction) => {
    const group = grouped[reaction.reaction_type] || { count: 0, users: [] };
    group.users.push({
      id: reaction.user_id,
      username: reaction.username,
      img: reaction.user_img,
    });
    grouped[reaction.reaction_type] = group;
  });

  const total = countResult.rows.reduce((sum, row) => sum + Number(row.count), 0);
  const pagination = createPaginationMetadata({ page, limit, total });

  return res.status(200).json({ total, grouped, pagination });
};

export const getUserReaction = async (req, res) => {
  const target = getTarget(req.params);
  if (!target) {
    throw new ApiError(400, "Exactly one post ID or comment ID is required", "REACTION_TARGET_INVALID");
  }

  const result = target.postId
    ? await db.query(
        `
          SELECT r.reaction_type
          FROM reactions r
          JOIN posts p ON p.id = r.post_id
          WHERE r.user_id = $1
            AND r.post_id = $2
            AND p.draft = false
          AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
          ORDER BY r.created_at DESC
          LIMIT 1
        `,
        [req.user.id, target.postId],
      )
    : await db.query(
        `
          SELECT r.reaction_type
          FROM reactions r
          JOIN comments c ON c.id = r.comment_id
          JOIN posts p ON p.id = c.cpostid
          WHERE r.user_id = $1
            AND r.comment_id = $2
            AND p.draft = false
            AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
          ORDER BY r.created_at DESC
          LIMIT 1
        `,
        [req.user.id, target.commentId],
      );
  return res.status(200).json({
    reaction: result.rows[0]?.reaction_type || null,
  });
};

export const removeReaction = async (req, res) => {
  const reactionId = parsePositiveInteger(req.params.reactionId);
  if (!reactionId) {
    throw new ApiError(400, "Invalid reaction ID", "REACTION_ID_INVALID");
  }

  const result = await db.query(
      "DELETE FROM reactions WHERE id = $1 AND user_id = $2",
      [reactionId, req.user.id],
    );

  if (result.rowCount === 0) {
    throw new ApiError(404, "Reaction not found or you don't have permission", "REACTION_NOT_FOUND");
  }
  return res.status(200).json("Reaction removed");
};
