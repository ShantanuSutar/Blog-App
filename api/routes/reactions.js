import express from "express";
import {
  addReaction,
  getReactions,
  getUserReaction,
  removeReaction
} from "../controllers/reactions.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { interactionLimiter } from "../middleware/security.js";
import {
  reactionBody,
  reactionCommentParams,
  reactionIdParams,
  reactionPostParams,
} from "../validation/requests.js";

const router = express.Router();

// Toggle reaction (add or remove)
router.post("/", requireAuth, interactionLimiter, validateRequest({ body: reactionBody }), asyncHandler(addReaction));

// Get all reactions for a post
router.get("/post/:postId", validateRequest({ params: reactionPostParams }), asyncHandler(getReactions));

// Get all reactions for a comment
router.get("/comment/:commentId", validateRequest({ params: reactionCommentParams }), asyncHandler(getReactions));

// Get user's reaction to a post
router.get("/check/post/:postId", requireAuth, validateRequest({ params: reactionPostParams }), asyncHandler(getUserReaction));

// Get user's reaction to a comment
router.get("/check/comment/:commentId", requireAuth, validateRequest({ params: reactionCommentParams }), asyncHandler(getUserReaction));

// Remove specific reaction by ID
router.delete("/:reactionId", requireAuth, interactionLimiter, validateRequest({ params: reactionIdParams }), asyncHandler(removeReaction));

export default router;
