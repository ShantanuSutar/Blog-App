import express from "express";
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, searchUsers } from "../controllers/user.js";
import { avatarUpload } from "../middleware/avatarUpload.js";
import { optionalAuth, requireAuth, requireSelf } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import {
  ownedUserIdParams,
  profileBody,
  usernameParams,
  userSearchQuery,
} from "../validation/requests.js";

const router = express.Router();

// Search users for @mentions (must be before /:username route)
router.get("/search", validateRequest({ query: userSearchQuery }), asyncHandler(searchUsers));

// Public route - get user profile
router.get("/:username", optionalAuth, validateRequest({ params: usernameParams }), asyncHandler(getProfile));

// Protected routes - require authentication
router.put(
  "/:id",
  requireAuth,
  validateRequest({ params: ownedUserIdParams, body: profileBody }),
  requireSelf,
  asyncHandler(updateProfile),
);
router.post(
  "/:id/avatar",
  requireAuth,
  validateRequest({ params: ownedUserIdParams }),
  requireSelf,
  avatarUpload.single("avatar"),
  asyncHandler(uploadAvatar),
);
router.delete(
  "/:id/avatar",
  requireAuth,
  validateRequest({ params: ownedUserIdParams }),
  requireSelf,
  asyncHandler(deleteAvatar),
);

export default router;
