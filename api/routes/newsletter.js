import express from "express";
import { subscribe, unsubscribe } from "../controllers/newsletter.js";

const router = express.Router();

router.post("/", subscribe);
router.get("/unsubscribe", unsubscribe);
router.post("/unsubscribe", unsubscribe);

export default router;
