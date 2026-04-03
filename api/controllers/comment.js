import { db } from "../db.js";

export const addComment = async (req, res) => {
  const query = "INSERT INTO comments(comment, Cpostid, Cuserid) VALUES ($1, $2, $3) RETURNING id";

  const values = [req.body.comment, req.body.postId, req.body.userId];

  try {
    const result = await db.query(query, values);
    const commentId = result.rows[0].id;
    
    // Track comment activity
    const trackQuery = `
      INSERT INTO activities (user_id, activity_type, comment_id)
      VALUES ($1, 'comment', $2)
    `;
    await db.query(trackQuery, [req.body.userId, commentId]);
    
    return res.json("Comment has been created.");
  } catch (err) {
    console.error('Error adding comment:', err);
    return res.status(500).json(err);
  }
};

export const getComment = async (req, res) => {
  const query =
    "SELECT c.*, u.username, u.img from comments c JOIN users u ON u.id = c.Cuserid where Cpostid = $1";

  try {
    const result = await db.query(query, [req.params.id]);
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json(err);
  }
};
