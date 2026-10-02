import express from "express";
import { subscribe, unsubscribe } from "../controllers/newsletter.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { newsletterLimiter } from "../middleware/security.js";
import { newsletterBody, unsubscribeQuery } from "../validation/requests.js";

const router = express.Router();

router.post("/", newsletterLimiter, validateRequest({ body: newsletterBody }), asyncHandler(subscribe));
router.get("/unsubscribe", validateRequest({ query: unsubscribeQuery }), asyncHandler(unsubscribe));
router.post("/unsubscribe", newsletterLimiter, validateRequest({ query: unsubscribeQuery }), asyncHandler(unsubscribe));

export default router;
