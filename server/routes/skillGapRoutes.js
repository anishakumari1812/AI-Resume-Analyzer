import express from "express";
import {
  generateSkillGapAnalysis,
  saveSkillGapAnalysis,
} from "../controllers/skillGapController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/generate", protect, generateSkillGapAnalysis);
router.post("/save", protect, saveSkillGapAnalysis);

export default router;
