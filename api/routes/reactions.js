import express from "express";
import {
  addReaction,
  getReactions,
  getUserReaction,
  removeReaction
} from "../controllers/reactions.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

// Toggle reaction (add or remove)
router.post("/", requireAuth, asyncHandler(addReaction));

// Get all reactions for a post
router.get("/post/:postId", asyncHandler(getReactions));

// Get all reactions for a comment
router.get("/comment/:commentId", asyncHandler(getReactions));

// Get user's reaction to a post
router.get("/check/post/:postId", requireAuth, asyncHandler(getUserReaction));

// Get user's reaction to a comment
router.get("/check/comment/:commentId", requireAuth, asyncHandler(getUserReaction));

// Remove specific reaction by ID
router.delete("/:reactionId", requireAuth, asyncHandler(removeReaction));

export default router;
