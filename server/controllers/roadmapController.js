import Roadmap from "../models/Roadmap.js";
import Analysis from "../models/Analysis.js";
import mongoose from "mongoose";

// Calculate overall progress from goals
const calculateOverallProgress = (goals = []) => {
  let totalSubtopics = 0;
  let completedSubtopics = 0;

  for (const goal of goals) {
    const subtopics = goal.subtopics || [];
    totalSubtopics += subtopics.length;
    completedSubtopics += subtopics.filter((s) => s.completed).length;
  }

  if (totalSubtopics === 0) return 0;
  return Math.round((completedSubtopics / totalSubtopics) * 100);
};

// GET /api/roadmap
// Get all roadmaps for the authenticated user
const getAllRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user.userId }).sort({
      updatedAt: -1,
    });

    return res.status(200).json(roadmaps);
  } catch (error) {
    console.error("Get All Roadmaps Error:", error);

    return res.status(500).json({
      message: "Failed to fetch roadmaps.",
    });
  }
};

// GET /api/roadmap/check/:targetRole
// Check if a roadmap already exists for a given target role (lightweight)
const checkRoadmapExists = async (req, res) => {
  try {
    const { targetRole } = req.params;

    const roadmap = await Roadmap.findOne({
      user: req.user.userId,
      targetRole,
    });

    if (!roadmap) {
      return res.status(200).json({ exists: false, roadmap: null });
    }

    return res.status(200).json({ exists: true, roadmap });
  } catch (error) {
    console.error("Check Roadmap Error:", error);

    return res.status(500).json({
      message: "Failed to check roadmap.",
    });
  }
};

// GET /api/roadmap/:id
// Get a single roadmap by ID
const getRoadmapById = async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({ message: "Roadmap not found." });
    }

    if (roadmap.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to access this roadmap.",
      });
    }

    return res.status(200).json(roadmap);
  } catch (error) {
    console.error("Get Roadmap By ID Error:", error);

    return res.status(500).json({
      message: "Failed to fetch roadmap.",
    });
  }
};

// POST /api/roadmap/save
// Save a new roadmap or replace an existing one.
// If a roadmap already exists for the user+targetRole and force !== true, return 409.
// If force === true, replace the existing roadmap completely.
const saveRoadmap = async (req, res) => {
  try {
    const {
      analysisId,
      learningRoadmap,
      readinessPercentage,
      expectedReadiness,
      estimatedTimeline,
      force,
    } = req.body;

    let targetRole = req.body.targetRole?.trim() || "";

    if (analysisId) {
      if (!mongoose.isValidObjectId(analysisId)) {
        return res.status(400).json({ message: "The selected resume analysis is invalid." });
      }

      const analysis = await Analysis.findById(analysisId);

      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found." });
      }

      if (analysis.user.toString() !== req.user.userId) {
        return res.status(403).json({
          message: "Not authorized to create a roadmap from this analysis.",
        });
      }

      targetRole = analysis.targetRole?.trim() || "";
    }

    if (!targetRole || !learningRoadmap) {
      return res.status(400).json({
        message: "Target role and learning roadmap are required.",
      });
    }

    const goals = learningRoadmap?.goals || [];
    const overallProgress = calculateOverallProgress(goals);

    const existing = await Roadmap.findOne({
      user: req.user.userId,
      targetRole,
    });

    // If exists and force is not explicitly true, return conflict
    if (existing && !force) {
      return res.status(409).json({
        message: "A roadmap already exists for this role.",
        exists: true,
        roadmap: existing,
      });
    }

    if (existing && force) {
      // Replace the existing roadmap completely
      existing.analysisRef = analysisId || null;
      existing.readinessPercentage = readinessPercentage ?? 0;
      existing.expectedReadiness = expectedReadiness ?? null;
      existing.estimatedTimeline = estimatedTimeline || "";
      existing.learningRoadmap = { goals };
      existing.overallProgress = overallProgress;

      await existing.save();

      return res.status(200).json({
        message: "Roadmap replaced successfully.",
        roadmap: existing,
        replaced: true,
      });
    }

    // Create new roadmap
    const roadmap = await Roadmap.create({
      user: req.user.userId,
      analysisRef: analysisId || null,
      targetRole,
      readinessPercentage: readinessPercentage ?? 0,
      expectedReadiness: expectedReadiness ?? null,
      estimatedTimeline: estimatedTimeline || "",
      learningRoadmap: { goals },
      overallProgress,
    });

    return res.status(201).json({
      message: "Roadmap saved successfully.",
      roadmap,
      replaced: false,
    });
  } catch (error) {
    console.error("Save Roadmap Error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        message: "A roadmap already exists for this role.",
        exists: true,
      });
    }

    return res.status(500).json({
      message: "Failed to save roadmap.",
    });
  }
};

// PATCH /api/roadmap/:id/progress
// Toggle a single subtopic completion and recalculate overallProgress
const updateProgress = async (req, res) => {
  try {
    const { goalIndex, subtopicIndex, completed } = req.body;

    if (
      goalIndex === undefined ||
      subtopicIndex === undefined ||
      completed === undefined
    ) {
      return res.status(400).json({
        message: "goalIndex, subtopicIndex, and completed are required.",
      });
    }

    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({ message: "Roadmap not found." });
    }

    if (roadmap.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to update this roadmap.",
      });
    }

    const goals = roadmap.learningRoadmap?.goals || [];

    if (!goals[goalIndex] || !goals[goalIndex].subtopics[subtopicIndex]) {
      return res.status(400).json({
        message: "Invalid goal or subtopic index.",
      });
    }

    // Update the specific subtopic
    goals[goalIndex].subtopics[subtopicIndex].completed = Boolean(completed);
    roadmap.learningRoadmap.goals = goals;
    roadmap.overallProgress = calculateOverallProgress(goals);

    // markModified is required for nested mixed-type objects
    roadmap.markModified("learningRoadmap");

    await roadmap.save();

    return res.status(200).json({
      message: "Progress updated.",
      roadmap,
    });
  } catch (error) {
    console.error("Update Progress Error:", error);

    return res.status(500).json({
      message: "Failed to update progress.",
    });
  }
};

// DELETE /api/roadmap/:id
const deleteRoadmap = async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({ message: "Roadmap not found." });
    }

    if (roadmap.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to delete this roadmap.",
      });
    }

    await roadmap.deleteOne();

    return res.status(200).json({ message: "Roadmap deleted successfully." });
  } catch (error) {
    console.error("Delete Roadmap Error:", error);

    return res.status(500).json({
      message: "Failed to delete roadmap.",
    });
  }
};

export {
  getAllRoadmaps,
  checkRoadmapExists,
  getRoadmapById,
  saveRoadmap,
  updateProgress,
  deleteRoadmap,
};
