import express from "express";
import {
  getCurrentUser,
  loginUser,
  registerUser,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/register", asyncHandler(registerUser));
router.post("/login", asyncHandler(loginUser));
router.get("/me", authMiddleware, asyncHandler(getCurrentUser));

export default router;
