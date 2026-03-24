import { db } from "../db.js";
import jwt from "jsonwebtoken";

// In-memory cache for bookmark counts (TTL: 5 minutes)
const bookmarkCountCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const addBookmark = async (req, res) => {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json("Not authenticated!");

    jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret", async (err, userInfo) => {
        if (err) {
            return res.status(403).json("Token is not valid!");
        }

        // Check if already bookmarked
        const checkQuery = "SELECT * FROM bookmarks WHERE uid = $1 AND pid = $2";
        try {
            const existing = await db.query(checkQuery, [userInfo.id, req.body.postId]);
            if (existing.rows.length > 0) {
                return res.status(409).json("Already bookmarked");
            }
            
            const q = "INSERT INTO bookmarks(uid, pid) VALUES ($1, $2)";
            await db.query(q, [userInfo.id, req.body.postId]);
            
            // Force immediate recalculation of count to ensure consistency
            const countQuery = "SELECT COUNT(*) FROM bookmarks WHERE pid = $1";
            const countResult = await db.query(countQuery, [req.body.postId]);
            const newCount = parseInt(countResult.rows[0].count);
            bookmarkCountCache.set(req.body.postId, { 
                count: newCount, 
                timestamp: Date.now() 
            });
            
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
        if (err) {
            return res.status(403).json("Token is not valid!");
        }

        const postId = req.params.postId;
        
        // Check count BEFORE deletion
        const beforeCountQuery = "SELECT COUNT(*) FROM bookmarks WHERE pid = $1";
        const beforeCount = await db.query(beforeCountQuery, [postId]);
        
        // Check if THIS user has bookmarked
        const userBookmarkCheck = "SELECT * FROM bookmarks WHERE uid = $1 AND pid = $2";
        const userBookmark = await db.query(userBookmarkCheck, [userInfo.id, postId]);
        
        const q = "DELETE FROM bookmarks WHERE uid = $1 AND pid = $2";
        try {
            const result = await db.query(q, [userInfo.id, postId]);
            
            // Verify it was actually deleted
            const verifyDelete = "SELECT * FROM bookmarks WHERE uid = $1 AND pid = $2";
            const verifyResult = await db.query(verifyDelete, [userInfo.id, postId]);
            
            // Check count AFTER deletion
            const afterCountQuery = "SELECT COUNT(*) FROM bookmarks WHERE pid = $1";
            const afterCount = await db.query(afterCountQuery, [postId]);
            const newCount = parseInt(afterCount.rows[0].count);
            
            // Force immediate recalculation of count to ensure consistency
            bookmarkCountCache.set(postId, { 
                count: newCount, 
                timestamp: Date.now() 
            });
            
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

export const getBookmarkCount = async (req, res) => {
    try {
        const postId = req.params.postId;
        const q = "SELECT COUNT(*) FROM bookmarks WHERE pid = $1";
        const result = await db.query(q, [postId]);
        return res.status(200).json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('Error getting bookmark count:', err);
        return res.status(500).json({ error: 'Failed to get bookmark count' });
    }
};

export const getBookmarkCountsForPosts = async (req, res) => {
    try {
        const postIds = req.body.postIds;
        if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
            return res.status(400).json({ error: 'Invalid post IDs' });
        }
        
        // Limit batch size to prevent overload (max 100 posts per request)
        const limitedPostIds = postIds.slice(0, 100);
        
        // Check cache first
        const now = Date.now();
        const uncachedIds = [];
        const cachedCounts = {};
        
        limitedPostIds.forEach(id => {
            const cached = bookmarkCountCache.get(id);
            if (cached && (now - cached.timestamp) < CACHE_TTL) {
                cachedCounts[id] = cached.count;
            } else {
                uncachedIds.push(id);
            }
        });
        
        // If all counts are cached, return immediately
        if (uncachedIds.length === 0) {
            return res.status(200).json(cachedCounts);
        }
        
        // Fetch only uncached counts
        const q = `SELECT pid, COUNT(*) as count 
                   FROM bookmarks 
                   WHERE pid = ANY($1) 
                   GROUP BY pid`;
        const result = await db.query(q, [uncachedIds]);
        
        // Update cache and build response
        const freshCounts = {};
        result.rows.forEach(row => {
            const count = parseInt(row.count);
            freshCounts[row.pid] = count;
            bookmarkCountCache.set(row.pid, { count, timestamp: now });
        });
        
        // Return combined cached + fresh counts
        return res.status(200).json({ ...cachedCounts, ...freshCounts });
    } catch (err) {
        console.error('Error getting bookmark counts:', err);
        return res.status(500).json({ error: 'Failed to get bookmark counts' });
    }
};
