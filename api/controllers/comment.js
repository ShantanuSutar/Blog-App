import { db } from "../db.js";

export const addComment = async (req, res) => {
  const query = "INSERT INTO comments(comment, Cpostid, Cuserid) VALUES ($1, $2, $3)";

  const values = [req.body.comment, req.body.postId, req.body.userId];

  try {
    await db.query(query, values);
    return res.json("Comment has been created.");
  } catch (err) {
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
