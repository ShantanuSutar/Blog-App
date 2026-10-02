import express from "express";
import { getActivityFeed, getUserActivities } from "../controllers/activity.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

router.get("/feed", requireAuth, asyncHandler(getActivityFeed));
router.get("/user/:username", asyncHandler(getUserActivities));

export default router;
