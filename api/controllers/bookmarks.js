import { db } from "../db.js";
import jwt from "jsonwebtoken";

export const addBookmark = async (req, res) => {
    console.log('Cookies received:', req.cookies);
    console.log('Headers:', req.headers);
    const token = req.cookies.access_token;
    console.log('Token:', token);
    if (!token) return res.status(401).json("Not authenticated!");

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
        if (err) {
            console.log('JWT verification error:', err);
            return res.status(403).json("Token is not valid!");
        }

        const q = "INSERT INTO bookmarks(uid, pid) VALUES ($1, $2)";
        try {
            await db.query(q, [userInfo.id, req.body.postId]);
            return res.status(200).json("Post has been bookmarked.");
        } catch (err) {
            if (err.code === '23505') return res.status(409).json("Post already bookmarked.");
            return res.status(500).json(err);
        }
    });
};

export const removeBookmark = async (req, res) => {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json("Not authenticated!");

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
        if (err) return res.status(403).json("Token is not valid!");

        const q = "DELETE FROM bookmarks WHERE uid = $1 AND pid = $2";
        try {
            await db.query(q, [userInfo.id, req.params.postId]);
            return res.status(200).json("Bookmark removed.");
        } catch (err) {
            return res.status(500).json(err);
        }
    });
};

export const getBookmarks = async (req, res) => {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json("Not authenticated!");

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
        if (err) return res.status(403).json("Token is not valid!");

        const q = `
      SELECT p.* 
      FROM posts p 
      JOIN bookmarks b ON p.id = b.pid 
      WHERE b.uid = $1
      ORDER BY b.created_at DESC
    `;
        try {
            const data = await db.query(q, [userInfo.id]);
            return res.status(200).json(data.rows);
        } catch (err) {
            return res.status(500).json(err);
        }
    });
};

export const checkBookmarkStatus = async (req, res) => {
    const token = req.cookies.access_token;
    if (!token) return res.json(false);

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
        if (err) return res.json(false);

        const q = "SELECT * FROM bookmarks WHERE uid = $1 AND pid = $2";
        try {
            const data = await db.query(q, [userInfo.id, req.params.postId]);
            return res.status(200).json(data.rows.length > 0);
        } catch (err) {
            // Fail silently for status check
            return res.status(200).json(false);
        }
    });
};
