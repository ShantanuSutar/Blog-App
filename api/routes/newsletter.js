import express from "express";
import { subscribe, unsubscribe } from "../controllers/newsletter.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { newsletterBody, unsubscribeQuery } from "../validation/requests.js";

const router = express.Router();

router.post("/", validateRequest({ body: newsletterBody }), asyncHandler(subscribe));
router.get("/unsubscribe", validateRequest({ query: unsubscribeQuery }), asyncHandler(unsubscribe));
router.post("/unsubscribe", validateRequest({ query: unsubscribeQuery }), asyncHandler(unsubscribe));

export default router;
