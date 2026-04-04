import { db } from "../db.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/avatars");
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Get user profile by username
export const getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    
    const query = "SELECT id, username, avatar, bio, created_at FROM users WHERE username = $1";
    const result = await db.query(query, [username]);
    
    if (result.rows.length === 0) {
      return res.status(404).json("User not found");
    }
    
    const user = result.rows[0];
    
    // Get user's posts count
    const postsQuery = "SELECT COUNT(*) FROM posts WHERE uid = $1";
    const postsResult = await db.query(postsQuery, [user.id]);
    const postsCount = parseInt(postsResult.rows[0].count);
    
    // Get user's recent posts
    const recentPostsQuery = `
      SELECT p.id, p.title, p.img, p.views, p.date 
      FROM posts p 
      WHERE p.uid = $1 
      ORDER BY p.date DESC 
      LIMIT 6
    `;
    const recentPostsResult = await db.query(recentPostsQuery, [user.id]);
    
    // Get follow counts
    const followersQuery = "SELECT COUNT(*) FROM follows WHERE following_id = $1";
    const followingQuery = "SELECT COUNT(*) FROM follows WHERE follower_id = $1";
    const [followersResult, followingResult] = await Promise.all([
      db.query(followersQuery, [user.id]),
      db.query(followingQuery, [user.id])
    ]);
    
    // Check if current user follows this profile (if authenticated)
    let isFollowing = false;
    const token = req.cookies.access_token;
    if (token) {
      try {
        jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
          if (!err) {
            const followCheckQuery = "SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2";
            const followCheck = await db.query(followCheckQuery, [userInfo.id, user.id]);
            isFollowing = followCheck.rows.length > 0;
          }
        });
      } catch (authErr) {
        // Not authenticated or invalid token - that's OK
      }
    }
    
    res.status(200).json({
      ...user,
      postsCount,
      followerCount: parseInt(followersResult.rows[0].count),
      followingCount: parseInt(followingResult.rows[0].count),
      isFollowing,
      recentPosts: recentPostsResult.rows
    });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Update user profile (bio)
export const updateProfile = async (req, res) => {
  try {
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json("Unauthorized");
    }

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
      if (err) {
        return res.status(403).json("Invalid token");
      }

      const userId = userInfo.id;
      const { bio } = req.body;

      // Check if user is updating their own profile
      if (userId !== parseInt(req.params.id)) {
        return res.status(403).json("You can only update your own profile");
      }

      const query = "UPDATE users SET bio = $1 WHERE id = $2 RETURNING id, username, avatar, bio";
      const result = await db.query(query, [bio, userId]);
      
      res.status(200).json(result.rows[0]);
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Upload avatar
export const uploadAvatar = async (req, res) => {
  try {
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json("Unauthorized");
    }

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
      if (err) {
        return res.status(403).json("Invalid token");
      }

      const userId = userInfo.id;

      // Check if user is updating their own avatar
      if (userId !== parseInt(req.params.id)) {
        return res.status(403).json("You can only update your own avatar");
      }

      if (!req.file) {
        return res.status(400).json("No file uploaded");
      }

      // Get existing avatar and delete it if exists
      const existingQuery = "SELECT avatar FROM users WHERE id = $1";
      const existingResult = await db.query(existingQuery, [userId]);
      
      if (existingResult.rows[0].avatar) {
        const oldAvatarPath = path.join(__dirname, "../" + existingResult.rows[0].avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Save new avatar path to database
      const avatarPath = "/api/uploads/avatars/" + req.file.filename;
      const query = "UPDATE users SET avatar = $1 WHERE id = $2 RETURNING id, username, avatar";
      const result = await db.query(query, [avatarPath, userId]);
      
      res.status(200).json({
        message: "Avatar uploaded successfully",
        avatar: avatarPath,
        user: result.rows[0]
      });
    });
  } catch (err) {
    console.error("Upload avatar error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Delete avatar
export const deleteAvatar = async (req, res) => {
  try {
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json("Unauthorized");
    }

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
      if (err) {
        return res.status(403).json("Invalid token");
      }

      const userId = userInfo.id;

      if (userId !== parseInt(req.params.id)) {
        return res.status(403).json("You can only delete your own avatar");
      }

      // Get existing avatar
      const existingQuery = "SELECT avatar FROM users WHERE id = $1";
      const existingResult = await db.query(existingQuery, [userId]);
      
      if (existingResult.rows[0].avatar) {
        const avatarPath = path.join(__dirname, "../" + existingResult.rows[0].avatar);
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
        }
      }

      // Remove avatar from database
      const query = "UPDATE users SET avatar = NULL WHERE id = $1 RETURNING id, username";
      const result = await db.query(query, [userId]);
      
      res.status(200).json({ message: "Avatar deleted successfully", user: result.rows[0] });
    });
  } catch (err) {
    console.error("Delete avatar error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Search users by username prefix (for @mentions)
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 1) {
      return res.status(400).json("Query parameter required");
    }
    
    // Search for usernames starting with query (case-insensitive)
    const result = await db.query(
      "SELECT id, username, avatar FROM users WHERE username ILIKE $1 LIMIT 3",
      [`${query}%`]
    );
    
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error searching users:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
