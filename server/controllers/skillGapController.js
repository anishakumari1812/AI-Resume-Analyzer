import OpenAI from "openai";
import mongoose from "mongoose";
import Analysis from "../models/Analysis.js";

const isGroqApiKeyConfigured = () => {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  return Boolean(apiKey && apiKey !== "your_groq_api_key_here");
};

const normalizeSkillGapResult = (result, targetRole) => {
  const roadmap = result.learningRoadmap || {};
  const readiness = Number(result.readinessPercentage ?? result.readiness ?? 0);
  const legacyPriorityItems = [
    ...(Array.isArray(roadmap.highPriority) ? roadmap.highPriority : []),
    ...(Array.isArray(roadmap.mediumPriority) ? roadmap.mediumPriority : []),
    ...(Array.isArray(roadmap.lowPriority) ? roadmap.lowPriority : []),
  ];
  const roadmapGoals = Array.isArray(roadmap.goals)
    ? roadmap.goals
    : legacyPriorityItems.map((item) => ({
        skillName: item.title || item.skillName || "Skill Goal",
        priority: "Medium",
        explanation: item.explanation || "",
        subtopics: [],
      }));

  return {
    targetRole,
    currentSkills: Array.isArray(result.currentSkills) ? result.currentSkills : [],
    missingSkills: Array.isArray(result.missingSkills) ? result.missingSkills : [],
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
    learningRoadmap: {
      goals: roadmapGoals.map((goal) => {
        const subtopics = Array.isArray(goal.subtopics) ? goal.subtopics : [];

        return {
          skillName: goal.skillName || goal.title || "Skill Goal",
          priority: goal.priority || "Medium",
          explanation: goal.explanation || "",
          subtopics: subtopics.map((subtopic) => ({
            title: subtopic.title || subtopic.name || subtopic,
            // Completion is user-owned progress, never an AI inference.
            completed: false,
          })),
        };
      }),
    },
    readinessPercentage: Math.max(0, Math.min(100, Math.round(readiness))),
    expectedReadiness: Number.isFinite(Number(result.expectedReadiness))
      ? Math.max(0, Math.min(100, Math.round(Number(result.expectedReadiness))))
      : null,
    estimatedTimeline: result.estimatedTimeline || "",
    generatedAt: new Date().toISOString(),
  };
};

const isGroqConnectionError = (error) =>
  error?.name === "APIConnectionError" ||
  error?.cause?.code === "EACCES" ||
  error?.cause?.code === "ENETUNREACH" ||
  error?.cause?.code === "ETIMEDOUT" ||
  error?.cause?.code === "ECONNREFUSED";

const parseAiJson = (content, label) => {
  if (!content) {
    throw new Error(`${label} returned an empty response.`);
  }

  try {
    return JSON.parse(content.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch {
    throw new Error(`${label} returned an invalid JSON response.`);
  }
};

const normalizeRoadmapFromGaps = ({
  skillGapResult,
  roadmapResult,
  targetRole,
}) => {
  const currentSkills = skillGapResult.currentSkills || [];
  const missingSkills = skillGapResult.missingSkills || [];
  const currentSkillNames = new Set(currentSkills.map((skill) => skill.toLowerCase().trim()));
  const missingSkillMap = new Map(
    missingSkills.map((skill) => [skill.toLowerCase().trim(), skill])
  );
  const seenMissingSkills = new Set();

  const goals = (roadmapResult.goals || []).flatMap((goal) => {
    const missingSkillKey = String(goal.missingSkill || goal.skillName || "")
      .toLowerCase()
      .trim();
    const missingSkill = missingSkillMap.get(missingSkillKey);

    if (!missingSkill || currentSkillNames.has(missingSkillKey) || seenMissingSkills.has(missingSkillKey)) {
      return [];
    }

    seenMissingSkills.add(missingSkillKey);
    const subtopics = (goal.subtopics || [])
      .map((subtopic) => String(subtopic.title || subtopic.name || subtopic).trim())
      .filter(Boolean)
      .filter((title) => !currentSkillNames.has(title.toLowerCase()))
      .map((title) => ({ title, completed: false }));

    return [{
      // The roadmap skill is the canonical missing-skill label, not an invented topic.
      skillName: missingSkill,
      priority: ["High", "Medium", "Low"].includes(goal.priority)
        ? goal.priority
        : "Medium",
      explanation: goal.explanation || `Close the ${missingSkill} gap for a ${targetRole} role.`,
      subtopics,
    }];
  });

  // Guarantee that every identified gap has a concrete, unstarted learning plan.
  for (const missingSkill of missingSkills) {
    const key = missingSkill.toLowerCase().trim();
    if (!seenMissingSkills.has(key) && !currentSkillNames.has(key)) {
      goals.push({
        skillName: missingSkill,
        priority: "Medium",
        explanation: `Build the missing ${missingSkill} capability for this role.`,
        subtopics: [
          { title: `${missingSkill} fundamentals`, completed: false },
          { title: `${missingSkill} hands-on practice`, completed: false },
        ],
      });
    }
  }

  const currentReadiness = skillGapResult.readinessPercentage;
  const estimatedReadiness = Number(roadmapResult.expectedReadiness);

  return {
    goals,
    expectedReadiness: Number.isFinite(estimatedReadiness)
      ? Math.max(currentReadiness + 1, Math.min(100, Math.round(estimatedReadiness)))
      : Math.min(100, currentReadiness + Math.max(10, 100 - currentReadiness)),
    estimatedTimeline: String(roadmapResult.estimatedTimeline || "").trim(),
  };
};

const generateRoadmapFromGaps = async ({
  openai,
  targetRole,
  skillGapResult,
}) => {
  const response = await openai.chat.completions.create({
    model: "openai/gpt-oss-120b",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You create a learning implementation plan strictly from supplied missing skills.",
      },
      {
        role: "user",
        content: `
Target role: ${targetRole}
Current readiness: ${skillGapResult.readinessPercentage}%
Current skills (never include these in the plan): ${JSON.stringify(skillGapResult.currentSkills)}
Canonical missing skills (use every item exactly once as missingSkill): ${JSON.stringify(skillGapResult.missingSkills)}

Return ONLY valid JSON:
{
  "goals": [
    {
      "missingSkill": "an exact item from Canonical missing skills",
      "priority": "High | Medium | Low",
      "explanation": "why this missing skill matters",
      "subtopics": [{ "title": "specific learning task" }]
    }
  ],
  "expectedReadiness": number,
  "estimatedTimeline": "concise realistic duration"
}

Rules:
1. Use every canonical missing skill exactly once; do not add, combine, rename, or omit skills.
2. Never include a current skill as a goal or subtopic.
3. Subtopics must be learning actions for that goal, not unrelated technologies.
4. A 90% readiness gap needs a short plan; a 45% readiness gap needs broader depth across every supplied missing skill.
5. expectedReadiness estimates readiness after completing every goal and must be greater than current readiness.
6. Do not include completion fields. All progress starts at zero.
`,
      },
    ],
    temperature: 0.25,
  });

  return parseAiJson(response.choices[0].message.content, "Learning roadmap generation");
};

const generateSkillGapAnalysis = async (req, res) => {
  let generationStage = "validating the saved analysis";

  try {
    const { analysisId } = req.body;

    if (!analysisId) {
      return res.status(400).json({
        message: "Please select a saved resume analysis.",
      });
    }

    if (!mongoose.isValidObjectId(analysisId)) {
      return res.status(400).json({
        message: "The selected resume analysis is invalid.",
      });
    }

    const analysis = await Analysis.findById(analysisId);

    if (!analysis) {
      return res.status(404).json({
        message: "Analysis not found.",
      });
    }

    if (analysis.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to access this analysis.",
      });
    }

    const targetRole = analysis.targetRole?.trim() || "";

    if (!analysis.resumeText?.trim() || !targetRole) {
      return res.status(400).json({
        message:
          "This saved analysis is missing a resume or target role. Please analyze the resume again before generating a skill gap analysis.",
      });
    }

    if (!isGroqApiKeyConfigured()) {
      return res.status(500).json({
        message:
          "AI analysis is not configured yet. Please add a valid Groq API key on the server.",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: 30000,
      maxRetries: 1,
    });

    const prompt = `
You are a senior technical hiring manager and career mentor.

Analyze the candidate's saved resume and previous ATS analysis for the target role.

Target Role: ${targetRole}

Analysis context: ${analysis.jobDescription?.trim() ? "Use the provided job description as the primary source of requirements." : "No job description was provided. Use only general, expected requirements for the target role; do not invent a specific job description."}

Return ONLY valid JSON in this exact format:

{
  "currentSkills": ["skill 1", "skill 2"],
  "missingSkills": ["skill 1", "skill 2"],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "readinessPercentage": number,
  "expectedReadiness": number,
  "estimatedTimeline": "realistic duration, e.g. 8-12 weeks"
}

Rules:
1. currentSkills must include technical skills detected from the resume.
2. When a job description is provided, missingSkills must be based primarily on its requirements. Otherwise, use general, expected requirements for the target role only.
3. strengths must focus on role-relevant strengths.
4. weaknesses must be practical improvement areas.
5. missingSkills must contain only capabilities the candidate still needs to improve for the selected role.
6. Never include a skill in both currentSkills and missingSkills.
7. readinessPercentage must be an approximate 0-100 score for the selected role.
8. Do not include a learning roadmap: it is derived separately from the canonical missingSkills list.
9. Do not include text outside JSON.

Resume:
${analysis.resumeText}

Previous ATS Analysis:
${JSON.stringify(analysis.analysisResult, null, 2)}

Job Description Used In Resume Analysis:
${analysis.jobDescription || "Not provided"}
`;

    generationStage = "generating the skill gap analysis";
    const response = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You generate structured skill gap analysis JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.6,
    });

    const aiText = response.choices[0].message.content;
    const parsed = parseAiJson(aiText, "Skill gap analysis");

    const skillGapAnalysis = normalizeSkillGapResult(parsed, targetRole);
    generationStage = "generating the learning roadmap";
    const generatedRoadmap = await generateRoadmapFromGaps({
      openai,
      targetRole,
      skillGapResult: skillGapAnalysis,
    });
    const roadmap = normalizeRoadmapFromGaps({
      skillGapResult: skillGapAnalysis,
      roadmapResult: generatedRoadmap,
      targetRole,
    });

    skillGapAnalysis.learningRoadmap = { goals: roadmap.goals };
    skillGapAnalysis.expectedReadiness = roadmap.expectedReadiness;
    skillGapAnalysis.estimatedTimeline = roadmap.estimatedTimeline;

    return res.status(200).json({
      message: "Skill gap analysis generated successfully.",
      skillGapAnalysis,
    });
  } catch (error) {
    console.error(`Skill Gap Generation Error while ${generationStage}:`, error);

    if (isGroqConnectionError(error)) {
      return res.status(503).json({
        message:
          "The server cannot reach the AI service. Check that outbound HTTPS access to api.groq.com is allowed, then try again.",
      });
    }

    if (error?.message?.includes("invalid JSON") || error?.message?.includes("empty response")) {
      return res.status(502).json({
        message: "The AI service returned an incomplete response. Please try generating the skill gap analysis again.",
      });
    }

    if (error?.status === 401 || error?.status === 403) {
      return res.status(500).json({
        message:
          "The AI service key is invalid or unauthorized. Please update the server API key.",
      });
    }

    if (error?.status === 429) {
      return res.status(500).json({
        message:
          "The AI service is busy or the usage limit was reached. Please try again later.",
      });
    }

    if (error?.status) {
      return res.status(502).json({
        message: `The AI service rejected the request while ${generationStage} (status ${error.status}). ${error.message || "Please try again."}`,
      });
    }

    if (error?.message) {
      return res.status(500).json({
        message: `Skill Gap Analysis failed while ${generationStage}: ${error.message}`,
      });
    }

    return res.status(500).json({
      message:
        "We couldn't generate the skill gap analysis right now. Please try again in a moment.",
    });
  }
};

const saveSkillGapAnalysis = async (req, res) => {
  try {
    const { analysisId, skillGapAnalysis } = req.body;

    if (!analysisId || !skillGapAnalysis) {
      return res.status(400).json({
        message: "Saved analysis and skill gap analysis are required.",
      });
    }

    if (!mongoose.isValidObjectId(analysisId)) {
      return res.status(400).json({
        message: "The selected resume analysis is invalid.",
      });
    }

    const analysis = await Analysis.findById(analysisId);

    if (!analysis) {
      return res.status(404).json({
        message: "Analysis not found.",
      });
    }

    if (analysis.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to update this analysis.",
      });
    }

    const targetRole = analysis.targetRole?.trim() || "";

    if (!targetRole) {
      return res.status(400).json({
        message:
          "This saved analysis is missing its target role. Please analyze the resume again before saving a skill gap analysis.",
      });
    }

    analysis.skillGapAnalyses = {
      ...(analysis.skillGapAnalyses || {}),
      [targetRole]: normalizeSkillGapResult(skillGapAnalysis, targetRole),
    };

    await analysis.save();

    return res.status(200).json({
      message: "Skill gap analysis saved successfully.",
      skillGapAnalysis: analysis.skillGapAnalyses[targetRole],
    });
  } catch (error) {
    console.error("Save Skill Gap Error:", error);

    return res.status(500).json({
      message: "Failed to save skill gap analysis.",
    });
  }
};

export { generateSkillGapAnalysis, saveSkillGapAnalysis };
