import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import Analysis from "../models/Analysis.js";

const isGroqApiKeyConfigured = () => {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  return Boolean(apiKey && apiKey !== "your_groq_api_key_here");
};

const isGroqConnectionError = (error) =>
  error?.name === "APIConnectionError" ||
  error?.cause?.code === "EACCES" ||
  error?.cause?.code === "ENETUNREACH" ||
  error?.cause?.code === "ETIMEDOUT" ||
  error?.cause?.code === "ECONNREFUSED";

const analyzeResume = async (req, res) => {
  try {
    const { resumeText, jobDescription, targetRole, resumeLabel, jobLabel } = req.body;
    let finalResumeText = resumeText?.trim() || "";
    const trimmedTargetRole = targetRole?.trim() || "";
    const trimmedResumeLabel = resumeLabel?.trim() || "";
    const trimmedJobLabel = jobLabel?.trim() || "";
    const originalFileName = req.file?.originalname || "";

    const generatedResumeLabel =
      trimmedResumeLabel ||
      originalFileName ||
      finalResumeText?.split("\n").map((line) => line.trim()).find(Boolean) ||
      "Untitled Resume";

    const generatedJobLabel =
      trimmedJobLabel ||
      trimmedTargetRole ||
      jobDescription
        ?.split("\n")
        .map((line) => line.trim())
        .find(Boolean) ||
      "No Job Label";
    const hasJobDescription = jobDescription && jobDescription.trim() !== "";

    if (!trimmedTargetRole && !hasJobDescription) {
      return res.status(400).json({
        message:
          "Role Information Required: Please provide either a target role or a job description before analyzing your resume.",
      });
    }

    if (req.file) {
      try {
        const parser = new PDFParse({
          data: req.file.buffer,
        });

        const parsedPdf = await parser.getText();
        finalResumeText = parsedPdf.text.trim();
      } catch (error) {
        console.error("PDF parse error:", error);

        return res.status(400).json({
          message: "Failed to parse uploaded PDF.",
        });
      }
    }

    if (!finalResumeText) {
      return res.status(400).json({
        message: "Resume text or PDF file is required.",
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
You are a senior ATS (Applicant Tracking System) optimization expert and professional resume reviewer.

Your job is to analyze a resume against the provided target role or job description, producing structured, high-quality, realistic ATS feedback.

Return ONLY valid JSON in this EXACT format:

{
  "overallScore": number,
  "atsMatchScore": number | null,
  "summary": "2-3 sentence professional evaluation",
  "strengths": ["point 1", "point 2", "point 3"],
  "weaknesses": ["point 1", "point 2", "point 3"],
  "matchedKeywords": ["keyword 1", "keyword 2", "keyword 3"],
  "missingKeywords": ["keyword 1", "keyword 2", "keyword 3"],
  "atsSuggestions": ["ATS-specific improvement 1", "ATS-specific improvement 2"],
  "suggestions": ["general improvement 1", "general improvement 2"]
}

CRITICAL RULES:

1. overallScore:
- Score from 1–10
- Based on structure, clarity, impact, projects, and professionalism

2. atsMatchScore:
- Score from 1–10
- Based ONLY on how well the resume matches the job description
- If NO job description → return null

3. matchedKeywords:
- Extract important technical keywords FROM THE JOB DESCRIPTION
- Include ONLY keywords that clearly appear in the resume
- Examples: "React", "Node.js", "MongoDB", "REST APIs"

4. missingKeywords:
- Extract important keywords from job description NOT found in resume
- Do NOT hallucinate keywords
- Only include realistic, meaningful terms

5. atsSuggestions:
- Must be SPECIFIC to ATS optimization
- Focus on:
  - missing keywords
  - formatting issues
  - keyword density
  - alignment with job description

6. suggestions:
- General resume improvements
- Focus on:
  - impact (metrics, numbers)
  - clarity
  - stronger bullet points
  - better structure

7. STRICT BEHAVIOR:
- If no job description:
  - atsMatchScore = null
  - matchedKeywords = []
  - missingKeywords = []
  - atsSuggestions = []
- DO NOT mix ATS suggestions into general suggestions
- DO NOT return explanations outside JSON

8. TARGET ROLE CONTEXT:
- When a target role is provided without a job description, use that role to estimate ATS alignment, relevant matched keywords, missing keywords, and ATS suggestions.
- The target role is valid analysis context and must not be treated as missing context.

Resume:
${finalResumeText}

Job Description:
${hasJobDescription ? jobDescription.trim() : "Not provided"}

Target Role:
${trimmedTargetRole || "Not provided"}
`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a professional resume analyzer.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const aiText = response.choices[0].message.content;

    let parsed;

    try {
      const cleaned = aiText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error from OpenAI response:");
      console.error(aiText);

      return res.status(500).json({
        message: "Failed to parse AI response.",
      });
    }
    parsed.matchedKeywords = parsed.matchedKeywords || [];
    parsed.missingKeywords = parsed.missingKeywords || [];
    parsed.atsSuggestions = parsed.atsSuggestions || [];
    parsed.suggestions = parsed.suggestions || [];

    const normalizeScore = (value, allowNull = false) => {
      if (allowNull && (value === null || value === undefined || value === "")) {
        return null;
      }

      const num = Number(value);

      if (Number.isNaN(num)) {
        return allowNull ? null : 0;
      }

      if (num > 10 && num <= 100) {
        return Math.round(num / 10);
      }

      return Math.max(0, Math.min(10, Math.round(num)));
    };

    parsed.overallScore = normalizeScore(parsed.overallScore);
    parsed.atsMatchScore = normalizeScore(parsed.atsMatchScore, true);



    return res.status(200).json({
      message: "Resume analyzed successfully.",
      analysis: parsed,
      resumeText: finalResumeText,
      jobDescription: jobDescription?.trim() || "",
      targetRole: trimmedTargetRole,
      resumeLabel: generatedResumeLabel,
      jobLabel: generatedJobLabel,
      originalFileName,
    });

  } catch (error) {
    console.error("AI Error:", error);

    if (isGroqConnectionError(error)) {
      return res.status(503).json({
        message:
          "The server cannot reach the AI service. Check that outbound HTTPS access to api.groq.com is allowed, then try again.",
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

    return res.status(500).json({
      message:
        "We couldn't analyze the resume right now. Please try again in a moment.",
    });
  }
};
const getUserAnalyses = async (req, res) => {
  try {
    const analyses = await Analysis.find({ user: req.user.userId }).sort({
      createdAt: -1,
    });

    return res.status(200).json(analyses);
  } catch (error) {
    console.error("Fetch Analyses Error:", error);

    return res.status(500).json({
      message: "Failed to fetch analysis history.",
    });
  }
};

const deleteAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({
        message: "Analysis not found.",
      });
    }

    if (analysis.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to delete this analysis.",
      });
    }

    await analysis.deleteOne();

    return res.status(200).json({
      message: "Analysis deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Analysis Error:", error);

    return res.status(500).json({
      message: "Failed to delete analysis.",
    });
  }
};
const saveAnalysis = async (req, res) => {
  try {
    const {
      resumeText,
      jobDescription,
      targetRole,
      analysisResult,
      resumeLabel,
      jobLabel,
      originalFileName,
    } = req.body;

    if (!resumeText || !analysisResult) {
      return res.status(400).json({
        message: "Missing required data to save analysis.",
      });
    }

    const savedAnalysis = await Analysis.create({
      user: req.user.userId,
      resumeText,
      jobDescription: jobDescription || "",
      targetRole: targetRole || "",
      analysisResult,
      resumeLabel: resumeLabel || "Untitled Resume",
      jobLabel: jobLabel || "No Job Label",
      originalFileName: originalFileName || "",
    });

    return res.status(201).json({
      message: "Analysis saved successfully.",
      savedAnalysisId: savedAnalysis._id,
    });
  } catch (error) {
    console.error("Save Analysis Error:", error);

    return res.status(500).json({
      message: "Failed to save analysis.",
    });
  }
};
export { analyzeResume, getUserAnalyses, deleteAnalysis, saveAnalysis };
