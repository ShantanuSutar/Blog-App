import express from "express";
import { getActivityFeed, getUserActivities } from "../controllers/activity.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/feed", requireAuth, getActivityFeed);
router.get("/user/:username", getUserActivities);

export default router;
