import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { recordActivity } from "../services/activity.js";
import { withTransaction } from "../utils/database.js";
import { parsePositiveInteger } from "../utils/request.js";

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

  const isFollowers = type === "followers";
  const result = await db.query(
    `
      SELECT
        owner.username AS owner_username,
        related.id,
        related.username,
        related.avatar,
        related.bio,
        f.created_at
      FROM users owner
      LEFT JOIN follows f
        ON ${isFollowers ? "f.following_id" : "f.follower_id"} = owner.id
      LEFT JOIN users related
        ON ${isFollowers ? "f.follower_id" : "f.following_id"} = related.id
      WHERE owner.id = $1
      ORDER BY f.created_at DESC NULLS LAST, f.id DESC
    `,
    [userId],
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

  return res.status(200).json({
    userId,
    username: result.rows[0].owner_username,
    [type]: relationships,
    count: relationships.length,
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
