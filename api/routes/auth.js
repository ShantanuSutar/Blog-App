import express from "express";
import { register, login, logout } from "../controllers/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateRequest } from "../middleware/validate.js";
import { loginBody, registerBody } from "../validation/requests.js";

const router = express.Router();

router.post("/register", validateRequest({ body: registerBody }), asyncHandler(register));
router.post("/login", validateRequest({ body: loginBody }), asyncHandler(login));
router.post("/logout", logout);

export default router;
