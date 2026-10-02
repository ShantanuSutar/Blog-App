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

const router = express.Router();

// Toggle follow/unfollow (protected route)
router.post("/:userId", requireAuth, asyncHandler(toggleFollow));

// Get followers list
router.get("/:userId/followers", asyncHandler(getFollowers));

// Get following list
router.get("/:userId/following", asyncHandler(getFollowing));

// Check if current user follows target user (protected)
router.get("/check/:userId", requireAuth, asyncHandler(getFollowStatus));

// Get follow counts (public)
router.get("/count/:userId", asyncHandler(getFollowCounts));

// Get combined follow info (counts + status) (public)
router.get("/info/:userId", optionalAuth, asyncHandler(getFollowInfo));

export default router;
