import express from "express";
import { addComment, getComment } from "../controllers/comment.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { commentBody, postIdParams } from "../validation/requests.js";

const router = express.Router();

router.post("/:id", requireAuth, validateRequest({ params: postIdParams, body: commentBody }), asyncHandler(addComment));
router.get("/:id", validateRequest({ params: postIdParams }), asyncHandler(getComment));

export default router;
