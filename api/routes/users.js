import express from "express";
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, searchUsers, upload } from "../controllers/user.js";

const router = express.Router();

// Search users for @mentions (must be before /:username route)
router.get("/search", searchUsers);

// Public route - get user profile
router.get("/:username", getProfile);

// Protected routes - require authentication
router.put("/:id", updateProfile);
router.post("/:id/avatar", upload.single("avatar"), uploadAvatar);
router.delete("/:id/avatar", deleteAvatar);

export default router;
