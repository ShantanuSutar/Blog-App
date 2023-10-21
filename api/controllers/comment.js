import { db } from "../db.js";

export const addComment = (req, res) => {
  return res.json("from controller");
};

export const getComment = (req, res) => {
  const q =
    "SELECT c.*, u.username, u.img from comments c JOIN users u ON u.id = c.Cuserid where Cpostid = ?";

  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json(data);
  });
};
