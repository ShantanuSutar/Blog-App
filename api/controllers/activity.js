import { db } from "../db.js";
import jwt from "jsonwebtoken";

// Helper function to track activity
export const trackActivity = async (userId, activityType, postId = null, commentId = null, targetUserId = null) => {
  try {
    const query = `
      INSERT INTO activities (user_id, activity_type, post_id, comment_id, target_user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [userId, activityType, postId, commentId, targetUserId]);
    return result.rows[0];
  } catch (err) {
    console.error('Error tracking activity:', err);
    // Don't throw - activity tracking should not break main functionality
  }
};

// Get activity feed for current user (activities from followed users)
export const getActivityFeed = async (req, res) => {
  try {
    // Get authenticated user
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies.access_token;
    
    if (!token) {
      return res.status(401).json("Not authenticated!");
    }

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
      if (err) {
        return res.status(403).json("Invalid token!");
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const filter = req.query.filter || 'all'; // all, posts, comments, reactions, follows

      // Map plural filter names to singular database values
      const filterMap = {
        'posts': 'post',
        'comments': 'comment',
        'reactions': 'reaction',
        'follows': 'follow'
      };
      
      const activityFilter = filterMap[filter] || filter;

      // Build WHERE clause based on filter
      // Show activities from followed users OR activities targeting the current user
      let whereClause = `WHERE (f.follower_id = $1 OR a.target_user_id = $1)`;
      let paramIndex = 2;
      let params = [userInfo.id];
      
      if (filter !== 'all') {
        whereClause += ` AND a.activity_type = $${paramIndex}`;
        params.push(activityFilter);
        paramIndex++;
      }
      
      // Add limit and offset
      const limitParamIndex = paramIndex;
      const offsetParamIndex = paramIndex + 1;
      params.push(Number(limit), Number(offset));

      // Main query - get activities from followed users OR targeting current user
      const query = `
        SELECT 
          a.*,
          u.username,
          u.avatar,
          p.title as post_title,
          p.img as post_img,
          c.comment as comment_text,
          tu.username as target_username,
          r.reaction_type
        FROM activities a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN posts p ON a.post_id = p.id
        LEFT JOIN comments c ON a.comment_id = c.id
        LEFT JOIN users tu ON a.target_user_id = tu.id
        LEFT JOIN reactions r ON (a.post_id IS NOT NULL AND r.post_id = a.post_id AND r.user_id = a.user_id) 
                               OR (a.comment_id IS NOT NULL AND r.comment_id = a.comment_id AND r.user_id = a.user_id)
        LEFT JOIN follows f ON a.user_id = f.following_id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT CAST($${limitParamIndex} AS INTEGER) OFFSET CAST($${offsetParamIndex} AS BIGINT)
      `;

      console.log('Executing activity feed query with params:', params);
      console.log('Where clause:', whereClause);

      const result = await db.query(query, params);

      // Get total count for pagination info
      const countQuery = `
        SELECT COUNT(*) 
        FROM activities a
        LEFT JOIN follows f ON a.user_id = f.following_id
        WHERE (f.follower_id = $1 OR a.target_user_id = $1)
        ${filter !== 'all' ? 'AND a.activity_type = $2' : ''}
      `;
      
      const countParams = filter !== 'all' ? [userInfo.id, activityFilter] : [userInfo.id];
      const countResult = await db.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      return res.status(200).json({
        activities: result.rows,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      });
    });
  } catch (err) {
    console.error('Error in getActivityFeed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get public activities for a specific user (by username)
export const getUserActivities = async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const filter = req.query.filter || 'all';

    // Map plural filter names to singular database values
    const filterMap = {
      'posts': 'post',
      'comments': 'comment',
      'reactions': 'reaction',
      'follows': 'follow'
    };
    
    const activityFilter = filterMap[filter] || filter;

    // First get user ID from username
    const userQuery = "SELECT id FROM users WHERE username = $1";
    const userResult = await db.query(userQuery, [username]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json("User not found");
    }

    const userId = userResult.rows[0].id;

    // Build WHERE clause
    let whereClause = "WHERE a.user_id = $1";
    let paramIndex = 2;
    let params = [userId];
    
    if (filter !== 'all') {
      whereClause += ` AND a.activity_type = $${paramIndex}`;
      params.push(activityFilter);
      paramIndex++;
    }
    
    // Add limit and offset
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    params.push(Number(limit), Number(offset));

    const query = `
      SELECT 
        a.*,
        u.username,
        u.avatar,
        p.title as post_title,
        p.img as post_img,
        c.comment as comment_text,
        tu.username as target_username,
        r.reaction_type
      FROM activities a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN posts p ON a.post_id = p.id
      LEFT JOIN comments c ON a.comment_id = c.id
      LEFT JOIN users tu ON a.target_user_id = tu.id
      LEFT JOIN reactions r ON a.comment_id = r.id AND r.user_id = a.user_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT CAST($${limitParamIndex} AS INTEGER) OFFSET CAST($${offsetParamIndex} AS BIGINT)
    `;

    const result = await db.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM activities a
      ${filter !== 'all' ? 'WHERE a.user_id = $1 AND a.activity_type = $2' : 'WHERE a.user_id = $1'}
    `;
    
    const countParams = filter !== 'all' ? [userId, filter] : [userId];
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    return res.status(200).json({
      activities: result.rows,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    });
  } catch (err) {
    console.error('Error in getUserActivities:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Internal endpoint to manually track an activity (optional)
export const createActivity = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies.access_token;
    
    if (!token) {
      return res.status(401).json("Not authenticated!");
    }

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
      if (err) {
        return res.status(403).json("Invalid token!");
      }

      const { activityType, postId, commentId, targetUserId } = req.body;

      if (!activityType) {
        return res.status(400).json("Activity type is required");
      }

      const activity = await trackActivity(userInfo.id, activityType, postId, commentId, targetUserId);
      
      return res.status(200).json(activity);
    });
  } catch (err) {
    console.error('Error in createActivity:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

