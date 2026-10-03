import express from "express";
import { addComment, getComment } from "../controllers/comment.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { commentLimiter } from "../middleware/security.js";
import { commentBody, listPaginationQuery, postIdParams } from "../validation/requests.js";

const router = express.Router();

router.post("/:id", requireAuth, commentLimiter, validateRequest({ params: postIdParams, body: commentBody }), asyncHandler(addComment));
router.get("/:id", validateRequest({ params: postIdParams, query: listPaginationQuery }), asyncHandler(getComment));

export default router;
