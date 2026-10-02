import express from "express";
import {
  addPost,
  deletePost,
  getPosts,
  getSinglePost,
  updatePost,
  getUserDrafts,
  getUserScheduledPosts,
  getPostsByTag,
  getFeaturedPosts,
  getPostForEditing,
  getPopularPosts,
} from "../controllers/post.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import {
  popularPostsQuery,
  postCreateBody,
  postIdParams,
  postsQuery,
  postTagParams,
  postUpdateBody,
} from "../validation/requests.js";

const router = express.Router();

router.get("/drafts/user", requireAuth, asyncHandler(getUserDrafts));
router.get("/scheduled/user", requireAuth, asyncHandler(getUserScheduledPosts));
router.get("/featured", asyncHandler(getFeaturedPosts));
router.get("/popular", validateRequest({ query: popularPostsQuery }), asyncHandler(getPopularPosts));
router.get("/tag/:tag", validateRequest({ params: postTagParams }), asyncHandler(getPostsByTag));
router.get("/", validateRequest({ query: postsQuery }), asyncHandler(getPosts));
router.get("/:id", validateRequest({ params: postIdParams }), asyncHandler(getSinglePost));
router.get("/:id/edit", requireAuth, validateRequest({ params: postIdParams }), asyncHandler(getPostForEditing));
router.post("/", requireAuth, validateRequest({ body: postCreateBody }), asyncHandler(addPost));
router.delete("/:id", requireAuth, validateRequest({ params: postIdParams }), asyncHandler(deletePost));
router.put(
  "/:id",
  requireAuth,
  validateRequest({ params: postIdParams, body: postUpdateBody }),
  asyncHandler(updatePost),
);

export default router;
