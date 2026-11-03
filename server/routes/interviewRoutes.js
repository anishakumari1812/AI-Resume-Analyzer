import express from "express";
import {
  generateQuestions,
  saveQuestions,
} from "../controllers/interviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/generate", protect, generateQuestions);
router.post("/save", protect, saveQuestions);

export default router;
