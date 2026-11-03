import express from "express";
import {
  getAllRoadmaps,
  checkRoadmapExists,
  getRoadmapById,
  saveRoadmap,
  updateProgress,
  deleteRoadmap,
} from "../controllers/roadmapController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// IMPORTANT: /check/:targetRole must be registered BEFORE /:id
// to prevent Express from matching "check" as a document ID.
router.get("/check/:targetRole", protect, checkRoadmapExists);

router.get("/", protect, getAllRoadmaps);
router.post("/save", protect, saveRoadmap);
router.get("/:id", protect, getRoadmapById);
router.patch("/:id/progress", protect, updateProgress);
router.delete("/:id", protect, deleteRoadmap);

export default router;
