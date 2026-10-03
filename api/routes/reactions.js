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
  listPaginationQuery,
  reactionBody,
  reactionCommentParams,
  reactionIdParams,
  reactionPostParams,
} from "../validation/requests.js";

const router = express.Router();

// Toggle reaction (add or remove)
router.post("/", requireAuth, interactionLimiter, validateRequest({ body: reactionBody }), asyncHandler(addReaction));

// Get aggregate reaction counts plus a bounded page of reacting users
router.get("/post/:postId", validateRequest({ params: reactionPostParams, query: listPaginationQuery }), asyncHandler(getReactions));

// Get aggregate reaction counts plus a bounded page of reacting users
router.get("/comment/:commentId", validateRequest({ params: reactionCommentParams, query: listPaginationQuery }), asyncHandler(getReactions));

// Get user's reaction to a post
router.get("/check/post/:postId", requireAuth, validateRequest({ params: reactionPostParams }), asyncHandler(getUserReaction));

// Get user's reaction to a comment
router.get("/check/comment/:commentId", requireAuth, validateRequest({ params: reactionCommentParams }), asyncHandler(getUserReaction));

// Remove specific reaction by ID
router.delete("/:reactionId", requireAuth, interactionLimiter, validateRequest({ params: reactionIdParams }), asyncHandler(removeReaction));

export default router;
