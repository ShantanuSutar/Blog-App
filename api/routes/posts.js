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

const router = express.Router();

router.get("/drafts/user", requireAuth, getUserDrafts);
router.get("/scheduled/user", requireAuth, getUserScheduledPosts);
router.get("/featured", getFeaturedPosts);
router.get("/popular", getPopularPosts);
router.get("/tag/:tag", getPostsByTag);
router.get("/", getPosts);
router.get("/:id", getSinglePost);
router.get("/:id/edit", requireAuth, getPostForEditing);
router.post("/", requireAuth, addPost);
router.delete("/:id", requireAuth, deletePost);
router.put("/:id", requireAuth, updatePost);

export default router;
