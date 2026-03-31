import express from "express";
import {
  toggleFollow,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getFollowCounts,
  getFollowInfo
} from "../controllers/follows.js";

const router = express.Router();

// Toggle follow/unfollow (protected route)
router.post("/:userId", toggleFollow);

// Get followers list
router.get("/:userId/followers", getFollowers);

// Get following list
router.get("/:userId/following", getFollowing);

// Check if current user follows target user (protected)
router.get("/check/:userId", getFollowStatus);

// Get follow counts (public)
router.get("/count/:userId", getFollowCounts);

// Get combined follow info (counts + status) (public)
router.get("/info/:userId", getFollowInfo);

export default router;
