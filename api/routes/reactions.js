import express from "express";
import {
  addReaction,
  getReactions,
  getUserReaction,
  removeReaction
} from "../controllers/reactions.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Toggle reaction (add or remove)
router.post("/", requireAuth, addReaction);

// Get all reactions for a post
router.get("/post/:postId", getReactions);

// Get all reactions for a comment
router.get("/comment/:commentId", getReactions);

// Get user's reaction to a post
router.get("/check/post/:postId", requireAuth, getUserReaction);

// Get user's reaction to a comment
router.get("/check/comment/:commentId", requireAuth, getUserReaction);

// Remove specific reaction by ID
router.delete("/:reactionId", requireAuth, removeReaction);

export default router;
