import { db } from "../db.js";
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

const getUserId = (req, res) => {
  const userId = parsePositiveInteger(req.params.userId);
  if (!userId) {
    res.status(400).json("Invalid user ID");
    return null;
  }
  return userId;
};

export const toggleFollow = async (req, res) => {
  const targetUserId = getUserId(req, res);
  if (!targetUserId) return;

  if (req.user.id === targetUserId) {
    return res.status(403).json("You cannot follow yourself");
  }

  try {
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
      return res.status(404).json("User not found");
    }

    return res.status(200).json({
      message: result.following
        ? "Successfully followed user"
        : "Successfully unfollowed user",
      action: result.following ? "follow" : "unfollow",
      following: result.following,
    });
  } catch (error) {
    console.error("Error toggling follow:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getFollowList = async (req, res, type) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const user = await findUser(userId);
    if (!user) {
      return res.status(404).json("User not found");
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
  } catch (error) {
    console.error(`Error getting ${type}:`, error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getFollowers = (req, res) => getFollowList(req, res, "followers");
export const getFollowing = (req, res) => getFollowList(req, res, "following");

export const getFollowStatus = async (req, res) => {
  const targetUserId = getUserId(req, res);
  if (!targetUserId) return;

  try {
    const result = await db.query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [req.user.id, targetUserId],
    );
    return res.status(200).json({ following: result.rows.length > 0 });
  } catch (error) {
    console.error("Error getting follow status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getFollowCounts = async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    if (!(await findUser(userId))) {
      return res.status(404).json("User not found");
    }

    const counts = await getCounts(userId);
    return res.status(200).json({
      userId,
      followerCount: counts.follower_count,
      followingCount: counts.following_count,
    });
  } catch (error) {
    console.error("Error getting follow counts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getFollowInfo = async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    if (!(await findUser(userId))) {
      return res.status(404).json("User not found");
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
  } catch (error) {
    console.error("Error getting follow info:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
