import express from "express";
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, searchUsers } from "../controllers/user.js";
import { avatarUpload } from "../middleware/avatarUpload.js";
import { optionalAuth, requireAuth, requireSelf } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

// Search users for @mentions (must be before /:username route)
router.get("/search", asyncHandler(searchUsers));

// Public route - get user profile
router.get("/:username", optionalAuth, asyncHandler(getProfile));

// Protected routes - require authentication
router.put("/:id", requireAuth, requireSelf, asyncHandler(updateProfile));
router.post("/:id/avatar", requireAuth, requireSelf, avatarUpload.single("avatar"), asyncHandler(uploadAvatar));
router.delete("/:id/avatar", requireAuth, requireSelf, asyncHandler(deleteAvatar));

export default router;
