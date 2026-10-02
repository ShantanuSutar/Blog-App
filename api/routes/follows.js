import express from "express";
import {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getFollowCounts,
  getFollowInfo
} from "../controllers/follows.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { interactionLimiter } from "../middleware/security.js";
import { userIdParams } from "../validation/requests.js";

const router = express.Router();

// Toggle follow/unfollow (protected route)
router.post("/:userId", requireAuth, interactionLimiter, validateRequest({ params: userIdParams }), asyncHandler(toggleFollow));

// Get followers list
router.get("/:userId/followers", validateRequest({ params: userIdParams }), asyncHandler(getFollowers));

// Get following list
router.get("/:userId/following", validateRequest({ params: userIdParams }), asyncHandler(getFollowing));

// Check if current user follows target user (protected)
router.get("/check/:userId", requireAuth, validateRequest({ params: userIdParams }), asyncHandler(getFollowStatus));

// Get follow counts (public)
router.get("/count/:userId", validateRequest({ params: userIdParams }), asyncHandler(getFollowCounts));

// Get combined follow info (counts + status) (public)
router.get("/info/:userId", optionalAuth, validateRequest({ params: userIdParams }), asyncHandler(getFollowInfo));

export default router;
