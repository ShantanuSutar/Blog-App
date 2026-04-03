import { db } from "../db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Toggle follow/unfollow status
export const toggleFollow = async (req, res) => {
  const token = req.cookies.access_token;
  
  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const targetUserId = parseInt(req.params.userId);

    // Prevent self-following
    if (userInfo.id === targetUserId) {
      return res.status(403).json("You cannot follow yourself");
    }

    try {
      // Check if target user exists
      const userCheckQuery = "SELECT id FROM users WHERE id = $1";
      const userCheck = await db.query(userCheckQuery, [targetUserId]);
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json("User not found");
      }

      // Check if already following
      const checkQuery = "SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2";
      const existingFollow = await db.query(checkQuery, [userInfo.id, targetUserId]);

      if (existingFollow.rows.length > 0) {
        // Unfollow - remove the follow record
        const deleteQuery = "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2";
        await db.query(deleteQuery, [userInfo.id, targetUserId]);

        return res.status(200).json({ 
          message: "Successfully unfollowed user",
          action: "unfollow",
          following: false 
        });
      } else {
        // Follow - create new follow record
        const insertQuery = "INSERT INTO follows(follower_id, following_id) VALUES ($1, $2)";
        await db.query(insertQuery, [userInfo.id, targetUserId]);

        // Track follow activity
        const trackQuery = `
          INSERT INTO activities (user_id, activity_type, target_user_id)
          VALUES ($1, 'follow', $2)
        `;
        await db.query(trackQuery, [userInfo.id, targetUserId]);

        return res.status(200).json({ 
          message: "Successfully followed user",
          action: "follow",
          following: true 
        });
      }
    } catch (err) {
      console.error('Error in toggleFollow:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// Get list of followers for a user
export const getFollowers = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Check if user exists
    const userCheckQuery = "SELECT id, username FROM users WHERE id = $1";
    const userCheck = await db.query(userCheckQuery, [userId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json("User not found");
    }

    const query = `
      SELECT u.id, u.username, u.avatar, u.bio, f.created_at
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
    `;

    const result = await db.query(query, [userId]);

    return res.status(200).json({
      userId,
      username: userCheck.rows[0].username,
      followers: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('Error in getFollowers:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get list of users that a user is following
export const getFollowing = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Check if user exists
    const userCheckQuery = "SELECT id, username FROM users WHERE id = $1";
    const userCheck = await db.query(userCheckQuery, [userId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json("User not found");
    }

    const query = `
      SELECT u.id, u.username, u.avatar, u.bio, f.created_at
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
    `;

    const result = await db.query(query, [userId]);

    return res.status(200).json({
      userId,
      username: userCheck.rows[0].username,
      following: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('Error in getFollowing:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if current user follows a specific user
export const getFollowStatus = async (req, res) => {
  const token = req.cookies.access_token;
  
  if (!token) return res.json({ following: false });

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    if (err) return res.json({ following: false });

    try {
      const targetUserId = parseInt(req.params.userId);

      const query = "SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2";
      const result = await db.query(query, [userInfo.id, targetUserId]);

      return res.status(200).json({ following: result.rows.length > 0 });
    } catch (err) {
      console.error('Error in getFollowStatus:', err);
      return res.status(200).json({ following: false });
    }
  });
};

// Get follow counts for a user
export const getFollowCounts = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Check if user exists
    const userCheckQuery = "SELECT id FROM users WHERE id = $1";
    const userCheck = await db.query(userCheckQuery, [userId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json("User not found");
    }

    const followersQuery = "SELECT COUNT(*) FROM follows WHERE following_id = $1";
    const followingQuery = "SELECT COUNT(*) FROM follows WHERE follower_id = $1";

    const [followersResult, followingResult] = await Promise.all([
      db.query(followersQuery, [userId]),
      db.query(followingQuery, [userId])
    ]);

    return res.status(200).json({
      userId,
      followerCount: parseInt(followersResult.rows[0].count),
      followingCount: parseInt(followingResult.rows[0].count)
    });
  } catch (err) {
    console.error('Error in getFollowCounts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get combined follow info (counts + status)
export const getFollowInfo = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Check if user exists
    const userCheckQuery = "SELECT id FROM users WHERE id = $1";
    const userCheck = await db.query(userCheckQuery, [userId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json("User not found");
    }

    // Get counts
    const followersQuery = "SELECT COUNT(*) FROM follows WHERE following_id = $1";
    const followingQuery = "SELECT COUNT(*) FROM follows WHERE follower_id = $1";

    const [followersResult, followingResult] = await Promise.all([
      db.query(followersQuery, [userId]),
      db.query(followingQuery, [userId])
    ]);

    const response = {
      userId,
      followerCount: parseInt(followersResult.rows[0].count),
      followingCount: parseInt(followingResult.rows[0].count),
      following: false
    };

    // Check if current user follows this user (if authenticated)
    const token = req.cookies.access_token;
    if (token) {
      try {
        // Use promise-based JWT verification instead of callback
        const userInfo = jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret");
        const statusQuery = "SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2";
        const statusResult = await db.query(statusQuery, [userInfo.id, userId]);
        response.following = statusResult.rows.length > 0;
      } catch (authErr) {
        // Not authenticated or invalid token - that's OK
        console.log('Auth error in getFollowInfo:', authErr.message);
      }
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('Error in getFollowInfo:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
