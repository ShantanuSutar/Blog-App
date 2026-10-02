import express from "express";
import { addBookmark, removeBookmark, getBookmarks, checkBookmarkStatus, getBookmarkCount, getBookmarkCountsForPosts } from "../controllers/bookmarks.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import {
  bookmarkBody,
  bookmarkCountsBody,
  bookmarkPostIdParams,
} from "../validation/requests.js";

const router = express.Router();

router.get("/", requireAuth, asyncHandler(getBookmarks));
router.post("/", requireAuth, validateRequest({ body: bookmarkBody }), asyncHandler(addBookmark));
router.delete("/:postId", requireAuth, validateRequest({ params: bookmarkPostIdParams }), asyncHandler(removeBookmark));
router.get("/check/:postId", requireAuth, validateRequest({ params: bookmarkPostIdParams }), asyncHandler(checkBookmarkStatus));
router.get("/count/:postId", validateRequest({ params: bookmarkPostIdParams }), asyncHandler(getBookmarkCount));
router.post("/counts", validateRequest({ body: bookmarkCountsBody }), asyncHandler(getBookmarkCountsForPosts));

export default router;
