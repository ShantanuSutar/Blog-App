import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { recordActivity } from "../services/activity.js";
import { withTransaction } from "../utils/database.js";
import { parsePositiveInteger } from "../utils/request.js";

const findUser = async (userId) => {
  const result = await db.query(
    "SELECT id, username FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0] || null;
};

const getCounts = async (userId) => {
  const result = await db.query(
    `
      SELECT
        (SELECT COUNT(*)::integer FROM follows WHERE following_id = $1) AS follower_count,
        (SELECT COUNT(*)::integer FROM follows WHERE follower_id = $1) AS following_count
    `,
    [userId],
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

  const user = await findUser(userId);
  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  const isFollowers = type === "followers";
  const result = await db.query(
      `
        SELECT u.id, u.username, u.avatar, u.bio, f.created_at
        FROM follows f
        JOIN users u ON ${isFollowers ? "f.follower_id" : "f.following_id"} = u.id
        WHERE ${isFollowers ? "f.following_id" : "f.follower_id"} = $1
        ORDER BY f.created_at DESC
      `,
      [userId],
    );

  return res.status(200).json({
    userId,
    username: user.username,
    [type]: result.rows,
    count: result.rows.length,
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

  if (!(await findUser(userId))) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  const counts = await getCounts(userId);
  return res.status(200).json({
    userId,
    followerCount: counts.follower_count,
    followingCount: counts.following_count,
  });
};

export const getFollowInfo = async (req, res) => {
  const userId = getUserId(req);

  if (!(await findUser(userId))) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  const [counts, statusResult] = await Promise.all([
      getCounts(userId),
      req.user
        ? db.query(
            "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
            [req.user.id, userId],
          )
        : Promise.resolve({ rows: [] }),
    ]);

  return res.status(200).json({
    userId,
    followerCount: counts.follower_count,
    followingCount: counts.following_count,
    following: statusResult.rows.length > 0,
  });
};
