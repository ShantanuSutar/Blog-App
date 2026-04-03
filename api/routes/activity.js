import express from "express";
import { getActivityFeed, getUserActivities, createActivity } from "../controllers/activity.js";

const router = express.Router();

// Get current user's activity feed (protected route)
router.get("/feed", getActivityFeed);

// Get public activities for a specific user
router.get("/user/:username", getUserActivities);

// Manually create an activity (protected route - optional utility endpoint)
router.post("/track", createActivity);

export default router;
