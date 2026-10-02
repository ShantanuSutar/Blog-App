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
  const result = await db.query(
    `
      SELECT
        u.id,
        u.username,
        u.avatar,
        u.bio,
        u.created_at,
        (
          SELECT COUNT(*)::integer
          FROM posts p
          WHERE p.uid = u.id
            AND p.draft = false
            AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
        ) AS posts_count,
        (
          SELECT COUNT(*)::integer FROM follows f WHERE f.following_id = u.id
        ) AS follower_count,
        (
          SELECT COUNT(*)::integer FROM follows f WHERE f.follower_id = u.id
        ) AS following_count,
        EXISTS (
          SELECT 1
          FROM follows f
          WHERE f.follower_id = $2 AND f.following_id = u.id
        ) AS is_following,
        recent.id AS recent_post_id,
        recent.title AS recent_post_title,
        recent.img AS recent_post_img,
        recent.views AS recent_post_views,
        recent.date AS recent_post_date
      FROM users u
      LEFT JOIN LATERAL (
        SELECT p.id, p.title, p.img, p.views, p.date
        FROM posts p
        WHERE p.uid = u.id
          AND p.draft = false
          AND (p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)
        ORDER BY p.date DESC, p.id DESC
        LIMIT 6
      ) recent ON true
      WHERE u.username = $1
      ORDER BY recent.date DESC NULLS LAST, recent.id DESC
    `,
    [username, req.user?.id || null],
  );
    
  if (result.rows.length === 0) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }
    
  const user = result.rows[0];
  const recentPosts = result.rows
    .filter(({ recent_post_id: id }) => id !== null)
    .map((row) => ({
      id: row.recent_post_id,
      title: row.recent_post_title,
      img: row.recent_post_img,
      views: row.recent_post_views,
      date: row.recent_post_date,
    }));
    
  return res.status(200).json({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      created_at: user.created_at,
      postsCount: user.posts_count,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      isFollowing: user.is_following,
      recentPosts,
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
      "SELECT id, username, avatar FROM users WHERE LOWER(username) LIKE LOWER($1) ESCAPE '!' ORDER BY LOWER(username), id LIMIT 3",
      [`${escapedQuery}%`]
    );
    
  return res.status(200).json(result.rows);
};
