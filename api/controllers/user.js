import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { mediaStorage } from "../services/mediaStorage.js";
import { sanitizePlainText } from "../utils/content.js";
import { withTransaction } from "../utils/database.js";

const removeAvatarFile = async (avatarPath) => {
  try {
    await mediaStorage.remove(avatarPath, { namespace: "avatars" });
  } catch (error) {
    console.warn("Unable to remove a managed avatar file", { code: error.code });
  }
};

const removeUnreferencedAvatar = async (avatarPath) => {
  if (!avatarPath) return;
  try {
    const referenced = await db.query(
      "SELECT 1 FROM users WHERE avatar = $1 LIMIT 1",
      [avatarPath],
    );
    if (referenced.rows.length === 0) await removeAvatarFile(avatarPath);
  } catch (error) {
    console.warn("Unable to check whether an avatar is still referenced", { code: error.code });
  }
};

// Get user profile by username
export const getProfile = async (req, res) => {
  const { username } = req.params;
    
    const query = "SELECT id, username, avatar, bio, created_at FROM users WHERE username = $1";
    const result = await db.query(query, [username]);
    
  if (result.rows.length === 0) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }
    
    const user = result.rows[0];
    
    const postsQuery = `
      SELECT COUNT(*) FROM posts
      WHERE uid = $1
        AND draft = false
        AND (scheduled_publish_date IS NULL OR scheduled_publish_date <= timezone('UTC', now()))
    `;
    const recentPostsQuery = `
      SELECT p.id, p.title, p.img, p.views, p.date 
      FROM posts p 
      WHERE p.uid = $1
        AND p.draft = false
        AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= timezone('UTC', now()))
      ORDER BY p.date DESC 
      LIMIT 6
    `;
    const followCountsQuery = `
      SELECT
        (SELECT COUNT(*)::integer FROM follows WHERE following_id = $1) AS follower_count,
        (SELECT COUNT(*)::integer FROM follows WHERE follower_id = $1) AS following_count
    `;
    const followStatusQuery = "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2";
    const [postsResult, recentPostsResult, followCountsResult, followStatusResult] = await Promise.all([
      db.query(postsQuery, [user.id]),
      db.query(recentPostsQuery, [user.id]),
      db.query(followCountsQuery, [user.id]),
      req.user
        ? db.query(followStatusQuery, [req.user.id, user.id])
        : Promise.resolve({ rows: [] }),
    ]);
    const followCounts = followCountsResult.rows[0];
    
  return res.status(200).json({
      ...user,
      postsCount: Number(postsResult.rows[0].count),
      followerCount: followCounts.follower_count,
      followingCount: followCounts.following_count,
      isFollowing: followStatusResult.rows.length > 0,
      recentPosts: recentPostsResult.rows
  });
};

// Update user profile (bio)
export const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const bio = sanitizePlainText(req.body.bio).slice(0, 500);

    const query = "UPDATE users SET bio = $1 WHERE id = $2 RETURNING id, username, avatar, bio";
    const result = await db.query(query, [bio, userId]);
      
  return res.status(200).json(result.rows[0]);
};

// Upload avatar
export const uploadAvatar = async (req, res) => {
  const userId = req.user.id;
  if (!req.file) {
    throw new ApiError(400, "An avatar image is required", "AVATAR_REQUIRED");
  }

  const avatarPath = req.file.publicPath;
  let replacement;
  try {
    replacement = await withTransaction(db, async (client) => {
      const existingResult = await client.query(
        "SELECT avatar FROM users WHERE id = $1 FOR UPDATE",
        [userId],
      );
      if (existingResult.rows.length === 0) return null;

      const result = await client.query(
        "UPDATE users SET avatar = $1 WHERE id = $2 RETURNING id, username, avatar",
        [avatarPath, userId],
      );
      return { previousAvatar: existingResult.rows[0].avatar, user: result.rows[0] };
    });
  } catch (error) {
    await removeAvatarFile(avatarPath);
    throw error;
  }

  if (!replacement) {
    await removeAvatarFile(avatarPath);
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  await removeUnreferencedAvatar(replacement.previousAvatar);
  return res.status(200).json({
    message: "Avatar uploaded successfully",
    avatar: avatarPath,
    user: replacement.user,
  });
};

// Delete avatar
export const deleteAvatar = async (req, res) => {
  const userId = req.user.id;
  const deletion = await withTransaction(db, async (client) => {
    const existingResult = await client.query(
      "SELECT avatar FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    if (existingResult.rows.length === 0) return null;

    const result = await client.query(
      "UPDATE users SET avatar = NULL WHERE id = $1 RETURNING id, username",
      [userId],
    );
    return { previousAvatar: existingResult.rows[0].avatar, user: result.rows[0] };
  });

  if (!deletion) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  await removeUnreferencedAvatar(deletion.previousAvatar);
  return res.status(200).json({ message: "Avatar deleted successfully", user: deletion.user });
};

// Search users by username prefix (for @mentions)
export const searchUsers = async (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    
  if (!query) {
    throw new ApiError(400, "Query parameter required", "SEARCH_QUERY_REQUIRED");
  }
    
    const escapedQuery = query.slice(0, 100).replace(/[!%_]/g, "!$&");
    const result = await db.query(
      "SELECT id, username, avatar FROM users WHERE username ILIKE $1 ESCAPE '!' ORDER BY username LIMIT 3",
      [`${escapedQuery}%`]
    );
    
  return res.status(200).json(result.rows);
};
