import express from "express";
import {
  addPost,
  deletePost,
  getPosts,
  getSinglePost,
  updatePost,
  getUserDrafts,
  getUserScheduledPosts,
  getPostsByTag,
  getFeaturedPosts,
  getPostForEditing,
  getPopularPosts,
} from "../controllers/post.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/drafts/user", requireAuth, asyncHandler(getUserDrafts));
router.get("/scheduled/user", requireAuth, asyncHandler(getUserScheduledPosts));
router.get("/featured", asyncHandler(getFeaturedPosts));
router.get("/popular", asyncHandler(getPopularPosts));
router.get("/tag/:tag", asyncHandler(getPostsByTag));
router.get("/", asyncHandler(getPosts));
router.get("/:id", asyncHandler(getSinglePost));
router.get("/:id/edit", requireAuth, asyncHandler(getPostForEditing));
router.post("/", requireAuth, asyncHandler(addPost));
router.delete("/:id", requireAuth, asyncHandler(deletePost));
router.put("/:id", requireAuth, asyncHandler(updatePost));

export default router;
