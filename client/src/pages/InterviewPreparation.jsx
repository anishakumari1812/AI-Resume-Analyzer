import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import QuestionCategory from "../components/QuestionCategory";
import { apiRequest, getApiErrorMessage } from "../utils/api";

function InterviewPreparation() {
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fetchingHistory, setFetchingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");

        const data = await apiRequest("/api/analyzer/history", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }, "We couldn't load your analysis history. Please try again.");

        setAnalyses(data);
      } catch (err) {
        console.error("History fetch error:", err);
        setError(
          getApiErrorMessage(
            err,
            "We couldn't load your analysis history. Please try again."
          )
        );
      } finally {
        setFetchingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  const getAnalysisLabel = (analysis) => {
    const resumeText = analysis.resumeText || "";
    const lines = resumeText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return (
      analysis.resumeLabel ||
      analysis.originalFileName ||
      lines[0] ||
      "Untitled Resume"
    );
  };

  const handleGenerate = async () => {
    if (!selectedAnalysisId) {
      setError("Please select a resume analysis first.");
      return;
    }

    setLoading(true);
    setError("");
    setQuestions(null);
    setSaved(false);

    try {
      const token = localStorage.getItem("token");

      const data = await apiRequest("/api/interview/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysisId: selectedAnalysisId,
          difficulty,
        }),
      }, "We couldn't generate interview questions. Please try again.");

      setQuestions(data.interviewQuestions);
    } catch (err) {
      console.error("Generate error:", err);
      setError(
        getApiErrorMessage(
          err,
          "We couldn't generate interview questions. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!questions || !selectedAnalysisId) return;

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      await apiRequest("/api/interview/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysisId: selectedAnalysisId,
          interviewQuestions: questions,
        }),
      }, "We couldn't save these questions. Please try again.");

      setSaved(true);
    } catch (err) {
      console.error("Save error:", err);
      alert(getApiErrorMessage(err, "We couldn't save these questions. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const selectedAnalysis = analyses.find((a) => a._id === selectedAnalysisId);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/90 backdrop-blur">
        <div className="w-full px-6 py-5 sm:px-8 xl:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                AI-Powered Interview Coach
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Interview Preparation
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">
                Generate tailored interview questions based on your resume and
                target job description. Practice before your next interview.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                to="/dashboard"
                className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Dashboard
              </Link>

              <Link
                to="/history"
                className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View History
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-6 sm:px-8 xl:px-10">
        <div className="grid items-start gap-6 2xl:grid-cols-[0.45fr_0.55fr]">
          {/* Left Panel — Configuration */}
          <section className="rounded-[28px] border border-white/10 bg-slate-900 p-5 shadow-2xl sm:p-6 xl:p-7 2xl:sticky 2xl:top-6">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                Configuration
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Select resume & difficulty
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Choose a previously analyzed resume and set the interview
                difficulty level.
              </p>
            </div>

            {/* Analysis Selector */}
            <div className="rounded-[20px] border border-white/10 bg-slate-950/60 p-4 mb-5">
              <label className="mb-3 block text-sm font-semibold text-white">
                Select Resume Analysis
              </label>

              {fetchingHistory ? (
                <p className="text-sm text-slate-400">Loading your analyses...</p>
              ) : analyses.length === 0 ? (
                <div>
                  <p className="text-sm text-slate-400">
                    No saved analyses found. Analyze a resume first.
                  </p>
                  <Link
                    to="/analyzer"
                    className="mt-3 inline-flex rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Analyze a Resume
                  </Link>
                </div>
              ) : (
                <select
                  value={selectedAnalysisId}
                  onChange={(e) => {
                    setSelectedAnalysisId(e.target.value);
                    setQuestions(null);
                    setSaved(false);
                    setError("");
                  }}
                  className="w-full rounded-[14px] border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="">— Select an analysis —</option>
                  {analyses.map((analysis) => (
                    <option key={analysis._id} value={analysis._id}>
                      {getAnalysisLabel(analysis)} —{" "}
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Analysis Preview */}
            {selectedAnalysis && (
              <div className="rounded-[20px] border border-white/10 bg-slate-950/60 p-4 mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Selected Resume
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {getAnalysisLabel(selectedAnalysis)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Analyzed on{" "}
                  {new Date(selectedAnalysis.createdAt).toLocaleString()}
                </p>
                {selectedAnalysis.jobDescription && (
                  <p className="mt-2 text-xs text-slate-400">
                    <span className="text-emerald-300">✓</span> Job description
                    available for targeted questions
                  </p>
                )}
                {selectedAnalysis.analysisResult?.overallScore && (
                  <p className="mt-1 text-xs text-slate-400">
                    Overall Score:{" "}
                    <span className="font-semibold text-cyan-300">
                      {selectedAnalysis.analysisResult.overallScore}/10
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Difficulty Selector */}
            <div className="rounded-[20px] border border-white/10 bg-slate-950/60 p-4 mb-5">
              <label className="mb-3 block text-sm font-semibold text-white">
                Interview Difficulty
              </label>
              <div className="flex gap-3">
                {["easy", "medium", "hard"].map((level) => {
                  const isActive = difficulty === level;
                  const levelColors = {
                    easy: isActive
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10",
                    medium: isActive
                      ? "border-amber-400 bg-amber-500/20 text-amber-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10",
                    hard: isActive
                      ? "border-red-400 bg-red-500/20 text-red-300"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10",
                  };

                  return (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${levelColors[level]}`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-5">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedAnalysisId}
              className="w-full rounded-2xl bg-cyan-500 px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Generating Questions..." : "Generate Interview Questions"}
            </button>

            {/* Action Buttons */}
            {questions && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Regenerating..." : "Regenerate Questions"}
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saved
                    ? "Saved ✔"
                    : saving
                    ? "Saving..."
                    : "Save Questions"}
                </button>
              </div>
            )}
          </section>

          {/* Right Panel — Results */}
          <section className="rounded-[28px] border border-white/10 bg-slate-900 p-5 shadow-2xl sm:p-6 xl:p-7">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                Generated Questions
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Interview question bank
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Practice these questions to prepare for your upcoming interview.
                Click each category to expand.
              </p>
            </div>

            {!questions && !loading && (
              <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/5 px-6 text-center text-sm leading-6 text-slate-400">
                No questions generated yet. Select a resume analysis and click
                &quot;Generate Interview Questions&quot; to begin.
              </div>
            )}

            {loading && (
              <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-white/10 bg-white/5">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  <p className="text-sm text-slate-400">
                    Generating {difficulty} interview questions...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    This may take a few seconds
                  </p>
                </div>
              </div>
            )}

            {questions && !loading && (
              <div className="space-y-4">
                {/* Stats Bar */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-[18px] border border-cyan-400/20 bg-cyan-500/10 p-3 text-center">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-300">
                      Technical
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {questions.technical?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-purple-400/20 bg-purple-500/10 p-3 text-center">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-purple-300">
                      Behavioral
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {questions.behavioral?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 p-3 text-center">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">
                      HR
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {questions.hr?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 p-3 text-center">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-amber-300">
                      Project
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {questions.projectBased?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Difficulty Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Difficulty:</span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      questions.difficulty === "easy"
                        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                        : questions.difficulty === "hard"
                        ? "border-red-400/30 bg-red-500/15 text-red-300"
                        : "border-amber-400/30 bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {questions.difficulty?.charAt(0).toUpperCase() +
                      questions.difficulty?.slice(1)}
                  </span>
                  {questions.generatedAt && (
                    <span className="text-xs text-slate-500">
                      Generated{" "}
                      {new Date(questions.generatedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {/* Question Categories */}
                <QuestionCategory
                  title="Technical Round Questions"
                  questions={questions.technical}
                  difficulty={questions.difficulty}
                  color="cyan"
                  defaultOpen={true}
                />

                <QuestionCategory
                  title="Behavioral Questions"
                  questions={questions.behavioral}
                  difficulty={questions.difficulty}
                  color="purple"
                />

                <QuestionCategory
                  title="HR Questions"
                  questions={questions.hr}
                  difficulty={questions.difficulty}
                  color="emerald"
                />

                <QuestionCategory
                  title="Project-Based Questions"
                  questions={questions.projectBased}
                  difficulty={questions.difficulty}
                  color="amber"
                />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default InterviewPreparation;
