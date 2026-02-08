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
} from "../controllers/post.js";

const router = express.Router();

router.get("/", getPosts);
router.get("/:id", getSinglePost);
router.get("/:id/edit", getPostForEditing);
router.post("/", addPost);
router.delete("/:id", deletePost);
router.put("/:id", updatePost);
router.get("/drafts/user", getUserDrafts);
router.get("/scheduled/user", getUserScheduledPosts);
router.get("/tag/:tag", getPostsByTag);
router.get("/featured", getFeaturedPosts);

export default router;
