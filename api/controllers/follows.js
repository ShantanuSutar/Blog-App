import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { recordActivity } from "../services/activity.js";
import { withTransaction } from "../utils/database.js";
import {
  createPaginationMetadata,
  getPagination,
  parsePositiveInteger,
} from "../utils/request.js";

const getFollowSummary = async (userId, currentUserId = null) => {
  const result = await db.query(
    `
      SELECT
        u.id,
        u.username,
        (SELECT COUNT(*)::integer FROM follows WHERE following_id = u.id) AS follower_count,
        (SELECT COUNT(*)::integer FROM follows WHERE follower_id = u.id) AS following_count,
        EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = $2 AND following_id = u.id
        ) AS following
      FROM users u
      WHERE u.id = $1
    `,
    [userId, currentUserId],
  );
  return result.rows[0];
};

const getUserId = (req) => {
  const userId = parsePositiveInteger(req.params.userId);
  if (!userId) {
    throw new ApiError(400, "Invalid user ID", "USER_ID_INVALID");
  }
  return userId;
};

export const toggleFollow = async (req, res) => {
  const targetUserId = getUserId(req);

  if (req.user.id === targetUserId) {
    throw new ApiError(403, "You cannot follow yourself", "SELF_FOLLOW_FORBIDDEN");
  }

  const result = await withTransaction(db, async (client) => {
      const userResult = await client.query("SELECT 1 FROM users WHERE id = $1", [targetUserId]);
      if (userResult.rows.length === 0) {
        return { missing: true };
      }

      const deleteResult = await client.query(
        "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING id",
        [req.user.id, targetUserId],
      );
      if (deleteResult.rowCount > 0) {
        return { following: false };
      }

      const insertResult = await client.query(
        `
          INSERT INTO follows(follower_id, following_id)
          VALUES ($1, $2)
          ON CONFLICT (follower_id, following_id) DO NOTHING
          RETURNING id
        `,
        [req.user.id, targetUserId],
      );

      if (insertResult.rowCount > 0) {
        await recordActivity(client, {
          userId: req.user.id,
          activityType: "follow",
          targetUserId,
        });
      }

      return { following: true };
    });

  if (result.missing) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return res.status(200).json({
    message: result.following
      ? "Successfully followed user"
      : "Successfully unfollowed user",
    action: result.following ? "follow" : "unfollow",
    following: result.following,
  });
};

const getFollowList = async (req, res, type) => {
  const userId = getUserId(req);
  const { page, limit, offset } = getPagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const isFollowers = type === "followers";
  const ownerColumn = isFollowers ? "following_id" : "follower_id";
  const relatedColumn = isFollowers ? "follower_id" : "following_id";
  const result = await db.query(
    `
      WITH owner AS (
        SELECT id, username
        FROM users
        WHERE id = $1
      ), relationship_count AS (
        SELECT COUNT(f.id)::integer AS total_count
        FROM owner
        LEFT JOIN follows f ON f.${ownerColumn} = owner.id
      ), relationship_page AS (
        SELECT
          related.id,
          related.username,
          related.avatar,
          related.bio,
          f.created_at,
          f.id AS follow_id
        FROM owner
        JOIN follows f ON f.${ownerColumn} = owner.id
        JOIN users related ON f.${relatedColumn} = related.id
        ORDER BY f.created_at DESC, f.id DESC
        LIMIT $2 OFFSET $3
      )
      SELECT
        owner.username AS owner_username,
        relationship_page.id,
        relationship_page.username,
        relationship_page.avatar,
        relationship_page.bio,
        relationship_page.created_at,
        relationship_count.total_count
      FROM owner
      CROSS JOIN relationship_count
      LEFT JOIN relationship_page ON true
      ORDER BY relationship_page.created_at DESC NULLS LAST,
        relationship_page.follow_id DESC NULLS LAST
    `,
    [userId, limit, offset],
  );
  if (result.rows.length === 0) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  const relationships = result.rows
    .filter(({ id }) => id !== null)
    .map((row) => ({
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      bio: row.bio,
      created_at: row.created_at,
    }));

  const pagination = createPaginationMetadata({
    page,
    limit,
    total: result.rows[0].total_count,
  });

  return res.status(200).json({
    userId,
    username: result.rows[0].owner_username,
    [type]: relationships,
    count: pagination.total,
    pagination,
  });
};

export const getFollowers = (req, res) => getFollowList(req, res, "followers");
export const getFollowing = (req, res) => getFollowList(req, res, "following");

export const getFollowStatus = async (req, res) => {
  const targetUserId = getUserId(req);

  const result = await db.query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [req.user.id, targetUserId],
    );
  return res.status(200).json({ following: result.rows.length > 0 });
};

export const getFollowCounts = async (req, res) => {
  const userId = getUserId(req);

  const summary = await getFollowSummary(userId);
  if (!summary) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }
  return res.status(200).json({
    userId,
    followerCount: summary.follower_count,
    followingCount: summary.following_count,
  });
};

export const getFollowInfo = async (req, res) => {
  const userId = getUserId(req);

  const summary = await getFollowSummary(userId, req.user?.id || null);
  if (!summary) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return res.status(200).json({
    userId,
    followerCount: summary.follower_count,
    followingCount: summary.following_count,
    following: summary.following,
  });
};
