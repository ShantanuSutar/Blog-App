import express from "express";
import { addBookmark, removeBookmark, getBookmarks, checkBookmarkStatus, getBookmarkCount, getBookmarkCountsForPosts } from "../controllers/bookmarks.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/", requireAuth, asyncHandler(getBookmarks));
router.post("/", requireAuth, asyncHandler(addBookmark));
router.delete("/:postId", requireAuth, asyncHandler(removeBookmark));
router.get("/check/:postId", requireAuth, asyncHandler(checkBookmarkStatus));
router.get("/count/:postId", asyncHandler(getBookmarkCount));
router.post("/counts", asyncHandler(getBookmarkCountsForPosts));

export default router;
