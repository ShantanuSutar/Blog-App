import { db } from "../db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Add or toggle reaction to a post
export const addReaction = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const { postId, commentId, reactionType } = req.body;

    if (!postId && !commentId) {
      return res.status(400).json("Post ID or Comment ID is required");
    }

    try {
      // First, check if user has ANY existing reaction on this post/comment
      const checkExistingQuery = `
        SELECT * FROM reactions 
        WHERE user_id = $1 
          AND post_id IS NOT DISTINCT FROM $2 
          AND comment_id IS NOT DISTINCT FROM $3
      `;
      const existingReaction = await db.query(checkExistingQuery, [userInfo.id, postId || null, commentId || null]);

      if (existingReaction.rows.length > 0) {
        // User already has a reaction - check if it's the same type
        const existingId = existingReaction.rows[0].id;
        const existingType = existingReaction.rows[0].reaction_type;

        if (existingType === (reactionType || 'like')) {
          // Same type - toggle off (remove)
          const deleteQuery = "DELETE FROM reactions WHERE id = $1";
          await db.query(deleteQuery, [existingId]);
          
          return res.status(200).json({ 
            message: "Reaction removed", 
            action: "removed",
            reactionId: existingId 
          });
        } else {
          // Different type - update to new type
          const updateQuery = `
            UPDATE reactions 
            SET reaction_type = $1 
            WHERE id = $2 
            RETURNING id
          `;
          const result = await db.query(updateQuery, [reactionType || 'like', existingId]);
          
          return res.status(200).json({ 
            message: "Reaction updated", 
            action: "updated",
            reactionId: result.rows[0].id 
          });
        }
      } else {
        // No existing reaction - create new one
        const insertQuery = `
          INSERT INTO reactions (user_id, post_id, comment_id, reaction_type) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id
        `;
        const result = await db.query(insertQuery, [
          userInfo.id, 
          postId || null, 
          commentId || null, 
          reactionType || 'like'
        ]);

        return res.status(200).json({ 
          message: "Reaction added", 
          action: "added",
          reactionId: result.rows[0].id 
        });
      }
    } catch (err) {
      console.error('Error in addReaction:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// Get all reactions for a post or comment
export const getReactions = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    if (!postId && !commentId) {
      return res.status(400).json("Post ID or Comment ID is required");
    }

    let query;
    let params;

    if (postId) {
      query = `
        SELECT r.*, u.username, u.img as user_img 
        FROM reactions r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.post_id = $1 
        ORDER BY r.created_at DESC
      `;
      params = [postId];
    } else {
      query = `
        SELECT r.*, u.username, u.img as user_img 
        FROM reactions r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.comment_id = $1 
        ORDER BY r.created_at DESC
      `;
      params = [commentId];
    }

    const result = await db.query(query, params);

    // Group by reaction type
    const grouped = result.rows.reduce((acc, reaction) => {
      if (!acc[reaction.reaction_type]) {
        acc[reaction.reaction_type] = {
          count: 0,
          users: []
        };
      }
      acc[reaction.reaction_type].count++;
      acc[reaction.reaction_type].users.push({
        id: reaction.user_id,
        username: reaction.username,
        img: reaction.user_img
      });
      return acc;
    }, {});

    return res.status(200).json({
      total: result.rows.length,
      grouped
    });
  } catch (err) {
    console.error('Error in getReactions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's reaction to a specific post/comment
export const getUserReaction = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const { postId, commentId } = req.params;

    try {
      const query = `
        SELECT reaction_type FROM reactions 
        WHERE user_id = $1 
          AND post_id IS NOT DISTINCT FROM $2 
          AND comment_id IS NOT DISTINCT FROM $3
      `;
      const result = await db.query(query, [userInfo.id, postId || null, commentId || null]);

      return res.status(200).json({
        reaction: result.rows.length > 0 ? result.rows[0].reaction_type : null
      });
    } catch (err) {
      console.error('Error in getUserReaction:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// Remove reaction
export const removeReaction = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) return res.status(401).json("Not authenticated!");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
    if (err) return res.status(403).json("Token is not valid!");

    const { reactionId } = req.params;

    try {
      const query = "DELETE FROM reactions WHERE id = $1 AND user_id = $2";
      const result = await db.query(query, [reactionId, userInfo.id]);

      if (result.rowCount === 0) {
        return res.status(404).json("Reaction not found or you don't have permission");
      }

      return res.status(200).json("Reaction removed");
    } catch (err) {
      console.error('Error in removeReaction:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};
