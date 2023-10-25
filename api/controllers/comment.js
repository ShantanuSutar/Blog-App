import { db } from "../db.js";

export const addComment = (req, res) => {
  const q = "INSERT INTO comments(`comment`, `Cpostid`, `Cuserid`) VALUES (?)";

  const values = [req.body.comment, req.body.postId, req.body.userId];

  db.query(q, [values], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json("Post has been created.");
  });
};

export const getComment = (req, res) => {
  const q =
    "SELECT c.*, u.username, u.img from comments c JOIN users u ON u.id = c.Cuserid where Cpostid = ?";

  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json(data);
  });
};
