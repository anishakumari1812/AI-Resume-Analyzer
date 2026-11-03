import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import AnalysisCard from "../components/AnalysisCard";
import { apiRequest, getApiErrorMessage } from "../utils/api";

function AnalyzerWorkspace({ demoMode = false }) {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roleContextWarning, setRoleContextWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const targetRoleInputRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const handleAnalyze = async () => {
    const trimmedResumeText = resumeText.trim();

    if (!trimmedResumeText && !resumeFile) {
      setError("Please paste resume or upload PDF.");
      setRoleContextWarning(false);
      setAnalysis(null);
      return;
    }

    if (!targetRole.trim() && !jobDescription.trim()) {
      setRoleContextWarning(true);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setRoleContextWarning(false);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("resumeText", trimmedResumeText);
      formData.append("jobDescription", jobDescription.trim());
      formData.append("targetRole", targetRole.trim());
      if (resumeFile) {
        formData.append("resumeFile", resumeFile);
      }

      const token = localStorage.getItem("token");

      const headers = demoMode
        ? {}
        : {
            Authorization: `Bearer ${token}`,
          };

      const data = await apiRequest("/api/analyzer", {
        method: "POST",
        headers,
        body: formData,
      }, "We couldn't analyze the resume. Please try again.");

      setAnalysis({
        analysisResult: data.analysis,
        resumeText: data.resumeText,
        jobDescription: data.jobDescription,
        targetRole: data.targetRole,
        resumeLabel: data.resumeLabel,
        jobLabel: data.jobLabel,
        originalFileName: data.originalFileName,
      });

      setSaved(false);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "We couldn't analyze the resume. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!analysis || demoMode) return;

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      await apiRequest("/api/analyzer/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeText: analysis.resumeText,
          jobDescription: analysis.jobDescription,
          targetRole: analysis.targetRole,
          analysisResult: analysis.analysisResult,
          resumeLabel: analysis.resumeLabel,
          jobLabel: analysis.jobLabel,
          originalFileName: analysis.originalFileName,
        }),
      }, "We couldn't save this analysis. Please try again.");

      setSaved(true);
    } catch (err) {
      console.error("Save error:", err);
      alert(getApiErrorMessage(err, "We couldn't save this analysis. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {roleContextWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-information-title"
        >
          <div className="w-full max-w-md rounded-[28px] border border-amber-400/25 bg-slate-900 p-7 shadow-2xl shadow-black/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-300">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Action needed</p>
            <h2 id="role-information-title" className="mt-2 text-2xl font-semibold text-white">Role Information Required</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">To generate an accurate ATS analysis and personalized career recommendations, provide either a Target Role or a Job Description before analyzing your resume.</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">This gives the AI the context it needs to evaluate your resume against the right job requirements.</p>
            <button
              onClick={() => {
                setRoleContextWarning(false);
                targetRoleInputRef.current?.focus();
              }}
              className="mt-7 w-full rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Add Role Information
            </button>
          </div>
        </div>
      )}
      <header className="border-b border-white/10 bg-slate-900/90 backdrop-blur">
        <div className="w-full px-6 py-5 sm:px-8 xl:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                {demoMode ? "Public Demo Mode" : "AI Career Coach"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Resume Analysis
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">
                {demoMode
                  ? "Try the analyzer instantly without creating an account. Saving and history are available in full account mode."
                  : "Structured feedback, clearer strengths and weaknesses, and recruiter-style suggestions."}
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Mode
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {demoMode ? "Demo" : "AI Analysis"}
                </p>
              </div>

              {demoMode ? (
                <>
                  <Link
                    to="/"
                    className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Back Home
                  </Link>
                  <Link
                    to="/signup"
                    className="flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Create Account
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Home
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
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-6 sm:px-8 xl:px-10">
        <div className="grid items-start gap-6 2xl:grid-cols-[1.03fr_0.97fr]">
          <section className="rounded-[28px] border border-white/10 bg-slate-900 text-white shadow-2xl 2xl:sticky 2xl:top-6 2xl:h-[calc(100vh-150px)]">
            <div className="flex h-full flex-col p-5 sm:p-6 xl:p-7">
              <div className="mb-5 flex-shrink-0">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                      Resume Input
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                      Analyze your resume draft
                    </h2>
                    <p className="mt-3 text-base leading-7 text-slate-400">
                      Paste your resume below to receive structured feedback. You
                      can also upload a PDF and add a job description for ATS
                      matching.
                    </p>
                  </div>

                  <div className="w-fit rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      Current Mode
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      Manual Paste + PDF
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                <div className="rounded-[28px] border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-400/20">
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your resume here..."
                    className="min-h-[220px] w-full resize-none rounded-[22px] border border-white/10 bg-slate-950 px-5 py-5 text-[15px] leading-7 text-white outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 lg:min-h-[240px]"
                  />
                </div>

                <div className="mt-5 rounded-[28px] border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-400/20">
                  <label className="mb-3 block text-sm font-semibold text-slate-200">
                    Target Role <span className="text-cyan-300">(Required if no job description)</span>
                  </label>
                  <input
                    type="text"
                    ref={targetRoleInputRef}
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Example: Backend Developer"
                    className="w-full rounded-[18px] border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Provide a target role or paste a job description to give the analysis the right context.
                  </p>
                </div>

                <div className="mt-5 rounded-[28px] border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-400/20">
                  <label className="mb-3 block text-sm font-semibold text-slate-200">
                    Upload Resume PDF (Optional)
                  </label>

                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setResumeFile(e.target.files[0] || null)}
                    className="block w-full cursor-pointer rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300 transition file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-300 hover:border-white/20 focus:border-cyan-400 focus:outline-none"
                  />

                  {resumeFile && (
                    <p className="mt-3 text-sm text-slate-400">
                      Selected file: {resumeFile.name}
                    </p>
                  )}
                </div>

                <div className="mt-5 rounded-[28px] border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-400/20">
                  <label className="mb-3 block text-sm font-semibold text-slate-200">
                    Job Description (Optional)
                  </label>

                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here for ATS matching..."
                    className="min-h-[130px] w-full resize-none rounded-[22px] border border-white/10 bg-slate-950 px-5 py-5 text-[15px] leading-7 text-white outline-none transition placeholder:text-slate-500 hover:border-white/20 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>

                {error && (
                  <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-4 flex-shrink-0 border-t border-white/10 pt-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-medium text-slate-200">
                      Best results come from resumes that include projects,
                      technical skills, experience, and measurable impact.
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Example: technologies used, your contributions, and
                      quantified outcomes.
                    </p>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={loading || (!resumeText.trim() && !resumeFile)}
                    className="inline-flex min-w-[190px] items-center justify-center rounded-2xl bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Analyzing Resume..." : "Analyze Resume"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl 2xl:sticky 2xl:top-6 2xl:h-[calc(100vh-150px)]">
            <div className="flex h-full flex-col p-5 sm:p-6 xl:p-7">
              <div className="mb-5 flex-shrink-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Analysis Result
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Resume evaluation output
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-400">
                  Review the generated feedback to understand how your resume is
                  currently positioned and where it can be improved.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                <AnalysisCard
                  analysis={analysis?.analysisResult || null}
                  loading={loading}
                />
              </div>

              {analysis && (
                <div className="mt-4 flex-shrink-0 border-t border-white/10 pt-4">
                  {demoMode ? (
                    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-amber-400" />

                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-300">
                            Demo Mode
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            Save, history, and deletion are available in full account mode.
                            Create an account to unlock the full experience.
                          </p>

                          <div className="mt-3">
                            <Link
                              to="/signup"
                              className="inline-flex items-center rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-amber-300"
                            >
                              Create Account
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSaveAnalysis}
                      disabled={saving || saved}
                      className="w-full rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saved ? "Saved ✔" : saving ? "Saving..." : "Save Analysis"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default AnalyzerWorkspace;
