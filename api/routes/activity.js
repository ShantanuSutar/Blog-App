import express from "express";
import { getActivityFeed, getUserActivities } from "../controllers/activity.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { activityQuery, usernameParams } from "../validation/requests.js";

const router = express.Router();

router.get("/feed", requireAuth, validateRequest({ query: activityQuery }), asyncHandler(getActivityFeed));
router.get(
  "/user/:username",
  validateRequest({ params: usernameParams, query: activityQuery }),
  asyncHandler(getUserActivities),
);

export default router;
