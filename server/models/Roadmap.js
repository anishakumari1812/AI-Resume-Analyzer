import mongoose from "mongoose";

const subtopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const goalSchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    explanation: {
      type: String,
      default: "",
    },
    subtopics: {
      type: [subtopicSchema],
      default: [],
    },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    analysisRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Analysis",
      default: null,
    },
    targetRole: {
      type: String,
      required: true,
      trim: true,
    },
    readinessPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    expectedReadiness: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    estimatedTimeline: {
      type: String,
      default: "",
      trim: true,
    },
    learningRoadmap: {
      goals: {
        type: [goalSchema],
        default: [],
      },
    },
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce one roadmap per user per target role
roadmapSchema.index({ user: 1, targetRole: 1 }, { unique: true });

const Roadmap = mongoose.model("Roadmap", roadmapSchema);

export default Roadmap;
