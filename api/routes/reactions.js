import express from "express";
import {
  addReaction,
  getReactions,
  getUserReaction,
  removeReaction
} from "../controllers/reactions.js";

const router = express.Router();

// Toggle reaction (add or remove)
router.post("/", addReaction);

// Get all reactions for a post
router.get("/post/:postId", getReactions);

// Get all reactions for a comment
router.get("/comment/:commentId", getReactions);

// Get user's reaction to a post
router.get("/check/post/:postId", getUserReaction);

// Get user's reaction to a comment
router.get("/check/comment/:commentId", getUserReaction);

// Remove specific reaction by ID
router.delete("/:reactionId", removeReaction);

export default router;
