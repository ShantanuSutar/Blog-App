import express from "express";
import { addBookmark, removeBookmark, getBookmarks, checkBookmarkStatus, getBookmarkCount, getBookmarkCountsForPosts } from "../controllers/bookmarks.js";

const router = express.Router();

router.get("/", getBookmarks);
router.post("/", addBookmark);
router.delete("/:postId", removeBookmark);
router.get("/check/:postId", checkBookmarkStatus);
router.get("/count/:postId", getBookmarkCount);
router.post("/counts", getBookmarkCountsForPosts);

export default router;
