import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, getApiErrorMessage } from "../utils/api";

const resumeLabel = (analysis) => analysis.resumeLabel || analysis.originalFileName || analysis.resumeText?.split("\n").find(Boolean) || "Untitled Resume";
const formatDate = (date) => date ? new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Unknown date";
const getProgress = (goals = []) => {
  const total = goals.reduce((count, goal) => count + (goal.subtopics?.length || 0), 0);
  const completed = goals.reduce((count, goal) => count + (goal.subtopics?.filter((topic) => topic.completed).length || 0), 0);
  return { total, completed, percentage: total ? Math.round((completed / total) * 100) : 0 };
};

function GoalCard({ goal, index, onToggle }) {
  const [open, setOpen] = useState(index === 0);
  const progress = getProgress([goal]);

  return <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
    <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-white/[.03]">
      <div><h3 className="font-semibold text-white">{goal.skillName}</h3><p className="mt-1 text-sm text-slate-400">{progress.completed} / {progress.total} completed</p></div>
      <div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-400" style={{ width: `${progress.percentage}%` }} /></div><span className="text-sm font-semibold text-emerald-300">{progress.percentage}%</span></div>
    </button>
    {open && <div className="border-t border-white/10 p-4"><p className="mb-3 text-sm text-slate-400">{goal.explanation}</p><div className="space-y-2">{(goal.subtopics || []).map((topic, topicIndex) => <label key={`${topic.title}-${topicIndex}`} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-white"><input type="checkbox" checked={Boolean(topic.completed)} onChange={(event) => onToggle(index, topicIndex, event.target.checked)} className="h-4 w-4 accent-emerald-400" /><span className={topic.completed ? "text-slate-400 line-through" : ""}>{topic.title}</span></label>)}</div></div>}
  </article>;
}

function SkillGapAnalysis() {
  const [analyses, setAnalyses] = useState([]);
  const [analysisId, setAnalysisId] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [roadmapState, setRoadmapState] = useState("idle");
  const [roadmapId, setRoadmapId] = useState(null);
  const [showReplace, setShowReplace] = useState(false);
  const [error, setError] = useState("");
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);

  const selected = useMemo(() => analyses.find((analysis) => analysis._id === analysisId), [analyses, analysisId]);
  const targetRole = selected?.targetRole?.trim() || "";
  const savedAnalysis = selected?.skillGapAnalyses?.[targetRole] || null;
  const goals = result?.learningRoadmap?.goals || [];
  const progress = getProgress(goals);
  const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    apiRequest("/api/analyzer/history", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(setAnalyses)
      .catch((err) => setError(getApiErrorMessage(err, "We couldn't load your saved resume analyses.")))
      .finally(() => setLoadingAnalyses(false));
  }, []);

  useEffect(() => {
    setResult(savedAnalysis);
    setRoadmapState("idle");
    setRoadmapId(null);
    setShowReplace(false);
    setError("");
  }, [analysisId, savedAnalysis]);

  useEffect(() => {
    if (!result || !targetRole) return;
    let active = true;
    apiRequest(`/api/roadmap/check/${encodeURIComponent(targetRole)}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((data) => {
        if (!active || !data.exists) return;
        const sameRoadmap = JSON.stringify(data.roadmap.learningRoadmap?.goals || []) === JSON.stringify(result.learningRoadmap?.goals || []) && data.roadmap.analysisRef === analysisId;
        setRoadmapId(data.roadmap._id);
        setRoadmapState(sameRoadmap ? "saved" : "idle");
      })
      .catch(() => {});
    return () => { active = false; };
  }, [result, targetRole, analysisId]);

  const generate = async () => {
    if (!analysisId) return setError("Please select a saved resume analysis first.");
    if (!targetRole) return setError("This saved analysis has no target role. Analyze the resume again before continuing.");
    try {
      setStatus("loading"); setError(""); setRoadmapState("idle"); setRoadmapId(null);
      const data = await apiRequest("/api/skill-gap/generate", { method: "POST", headers: authHeaders(), body: JSON.stringify({ analysisId }) });
      setResult(data.skillGapAnalysis);
    } catch (err) { setError(getApiErrorMessage(err, "We couldn't generate the skill gap analysis.")); } finally { setStatus("idle"); }
  };

  const saveAnalysis = async () => {
    if (!result || !analysisId) return;
    try {
      setStatus("saving");
      const data = await apiRequest("/api/skill-gap/save", { method: "POST", headers: authHeaders(), body: JSON.stringify({ analysisId, skillGapAnalysis: result }) });
      setResult(data.skillGapAnalysis);
      setAnalyses((items) => items.map((item) => item._id === analysisId ? { ...item, skillGapAnalyses: { ...(item.skillGapAnalyses || {}), [targetRole]: data.skillGapAnalysis } } : item));
    } catch (err) { setError(getApiErrorMessage(err)); } finally { setStatus("idle"); }
  };

  const persistRoadmap = async (force = false) => {
    try {
      setRoadmapState("saving");
      const data = await apiRequest("/api/roadmap/save", { method: "POST", headers: authHeaders(), body: JSON.stringify({ analysisId, learningRoadmap: result.learningRoadmap, readinessPercentage: result.readinessPercentage, expectedReadiness: result.expectedReadiness, estimatedTimeline: result.estimatedTimeline, force }) });
      setRoadmapId(data.roadmap._id); setRoadmapState("saved"); setShowReplace(false);
    } catch (err) {
      if (err.status === 409) { setRoadmapState("idle"); setShowReplace(true); } else { setRoadmapState("idle"); setError(getApiErrorMessage(err, "We couldn't save the roadmap.")); }
    }
  };

  const toggle = async (goalIndex, topicIndex, completed) => {
    const next = { ...result, learningRoadmap: { ...result.learningRoadmap, goals: goals.map((goal, i) => i !== goalIndex ? goal : { ...goal, subtopics: goal.subtopics.map((topic, j) => j === topicIndex ? { ...topic, completed } : topic) }) } };
    setResult(next);
    if (!roadmapId || roadmapState !== "saved") return;
    try {
      const data = await apiRequest(`/api/roadmap/${roadmapId}/progress`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ goalIndex, subtopicIndex: topicIndex, completed }) });
      setResult((current) => ({ ...current, learningRoadmap: data.roadmap.learningRoadmap }));
    } catch (err) { setResult(result); setError(getApiErrorMessage(err, "We couldn't update roadmap progress.")); }
  };

  return <div className="min-h-screen bg-slate-950 text-white">
    {showReplace && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-7 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Roadmap Already Exists</p><h2 className="mt-3 text-2xl font-bold">Replace {targetRole} roadmap?</h2><p className="mt-3 text-sm leading-6 text-slate-400">You already have a saved roadmap for this role. Replacing it permanently swaps its topics and progress for the newly generated roadmap.</p><div className="mt-6 flex gap-3"><button onClick={() => setShowReplace(false)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold">Cancel</button><button onClick={() => persistRoadmap(true)} className="flex-1 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950">Replace Roadmap</button></div></div></div>}
    <header className="border-b border-white/10 bg-slate-900/90"><div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Role Readiness</p><h1 className="mt-1 text-3xl font-bold">Skill Gap Analysis</h1></div><div className="flex gap-3"><Link to="/my-roadmaps" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold">My Roadmaps</Link><Link to="/dashboard" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold">Dashboard</Link></div></div></header>
    <main className="grid gap-6 px-6 py-6 xl:grid-cols-[.38fr_.62fr] sm:px-10">
      <section className="h-fit rounded-3xl border border-white/10 bg-slate-900 p-6"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Configuration</p>
        {loadingAnalyses ? <p className="mt-5 text-sm text-slate-400">Loading saved resume analyses...</p> : analyses.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-4"><p className="text-sm font-semibold text-white">No saved resume analyses found.</p><p className="mt-2 text-sm leading-6 text-slate-400">Analyze and save a resume first to generate a tailored skill gap analysis.</p><Link to="/analyzer" className="mt-4 inline-flex rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Analyze a Resume</Link></div> : <><label className="mt-5 block text-sm text-slate-300">Saved Resume Analysis<select value={analysisId} onChange={(event) => setAnalysisId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white"><option value="">Select an analysis</option>{analyses.map((analysis) => <option key={analysis._id} value={analysis._id}>{analysis.targetRole || "Target role not saved"} — {resumeLabel(analysis)} — JD: {analysis.jobDescription?.trim() ? "Provided" : "Not provided"} — {formatDate(analysis.createdAt)}</option>)}</select></label>
          {selected && <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Selected Analysis</p><div className="mt-3 space-y-2 text-slate-300"><p>Target Role: <span className="font-medium text-white">{targetRole || "Not saved"}</span></p><p>Resume: <span className="font-medium text-white">{resumeLabel(selected)}</span></p><p>Job Description: <span className="font-medium text-white">{selected.jobDescription?.trim() ? "Provided" : "Not provided"}</span></p><p>Analyzed: <span className="font-medium text-white">{formatDate(selected.createdAt)}</span></p></div></div>}
          <button onClick={generate} disabled={status === "loading" || !analysisId} className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{status === "loading" ? "Analyzing..." : result ? "Regenerate Analysis" : "Generate Skill Gap Analysis"}</button>{result && <button onClick={saveAnalysis} disabled={status === "saving"} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold">{status === "saving" ? "Saving..." : "Save Analysis"}</button>}</>}
        {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      </section>
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-6">{!result ? <div className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center text-slate-400">Select a saved resume analysis to generate a learning roadmap.</div> : <div className="space-y-5"><div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Readiness score</p><div className="mt-2 flex items-end justify-between"><h2 className="text-2xl font-bold">{targetRole}</h2><span className="text-4xl font-bold text-emerald-300">{result.readinessPercentage || 0}%</span></div><div className="mt-4 flex flex-wrap gap-4 text-sm"><p className="text-slate-400">Expected after roadmap: <span className="font-semibold text-emerald-300">{result.expectedReadiness ?? "—"}%</span></p>{result.estimatedTimeline && <p className="text-slate-400">Estimated timeline: <span className="text-slate-200">{result.estimatedTimeline}</span></p>}</div></div><div className="grid gap-4 sm:grid-cols-2">{[["Current Skills", result.currentSkills], ["Missing Skills", result.missingSkills], ["Strengths", result.strengths], ["Weaknesses", result.weaknesses]].map(([title, items]) => <div key={title} className="rounded-2xl border border-white/10 p-4"><h3 className="font-semibold">{title}</h3><div className="mt-3 flex flex-wrap gap-2">{(items || []).map((item) => <span key={item} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{item}</span>)}</div></div>)}</div><div><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Learning Roadmap</h2><span className="text-sm font-semibold text-emerald-300">{progress.percentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-400" style={{ width: `${progress.percentage}%` }} /></div><p className="mt-2 text-sm text-slate-400">{progress.completed} / {progress.total} Topics Completed</p><div className="mt-5 space-y-3">{goals.map((goal, index) => <GoalCard key={`${goal.skillName}-${index}`} goal={goal} index={index} onToggle={toggle} />)}</div></div><button onClick={() => persistRoadmap()} disabled={roadmapState === "saving" || roadmapState === "saved"} className={`ml-auto flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed ${roadmapState === "saved" ? "bg-emerald-500/15 text-emerald-300" : "bg-cyan-400 text-slate-950"}`}>{roadmapState === "saved" ? "✓ Saved to My Roadmaps" : roadmapState === "saving" ? "Saving..." : "Save Roadmap"}</button></div>}</section>
    </main>
  </div>;
}

export default SkillGapAnalysis;
