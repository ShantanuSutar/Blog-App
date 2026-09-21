import express from "express";
import { addBookmark, removeBookmark, getBookmarks, checkBookmarkStatus, getBookmarkCount, getBookmarkCountsForPosts } from "../controllers/bookmarks.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, getBookmarks);
router.post("/", requireAuth, addBookmark);
router.delete("/:postId", requireAuth, removeBookmark);
router.get("/check/:postId", requireAuth, checkBookmarkStatus);
router.get("/count/:postId", getBookmarkCount);
router.post("/counts", getBookmarkCountsForPosts);

export default router;
