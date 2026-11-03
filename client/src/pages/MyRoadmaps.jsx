import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest, getApiErrorMessage } from "../utils/api";

const progressFor = (roadmap) => {
  const topics = roadmap.learningRoadmap?.goals?.flatMap((goal) => goal.subtopics || []) || [];
  const completed = topics.filter((topic) => topic.completed).length;
  return { total: topics.length, completed, percent: topics.length ? Math.round((completed / topics.length) * 100) : 0 };
};
const formatDate = (date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));

function MyRoadmaps() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [active, setActive] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` };

  useEffect(() => {
    const initialHeaders = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    apiRequest("/api/roadmap", { headers: initialHeaders })
      .then(setRoadmaps)
      .catch((err) => setError(getApiErrorMessage(err, "We couldn't load your roadmaps.")));
  }, []);
  const openRoadmap = async (id) => { try { const roadmap = await apiRequest(`/api/roadmap/${id}`, { headers }); setActive(roadmap); } catch (err) { setError(getApiErrorMessage(err)); } };
  const toggle = async (goalIndex, subtopicIndex, completed) => {
    if (!active) return;
    const key = `${goalIndex}-${subtopicIndex}`;
    const previous = active;
    const goals = active.learningRoadmap.goals.map((goal, i) => i !== goalIndex ? goal : { ...goal, subtopics: goal.subtopics.map((topic, j) => j === subtopicIndex ? { ...topic, completed } : topic) });
    setActive({ ...active, learningRoadmap: { ...active.learningRoadmap, goals } }); setUpdating(key);
    try { const data = await apiRequest(`/api/roadmap/${active._id}/progress`, { method: "PATCH", headers, body: JSON.stringify({ goalIndex, subtopicIndex, completed }) }); setActive(data.roadmap); setRoadmaps((items) => items.map((roadmap) => roadmap._id === data.roadmap._id ? data.roadmap : roadmap)); }
    catch (err) { setActive(previous); setError(getApiErrorMessage(err, "We couldn't update that topic.")); } finally { setUpdating(""); }
  };
  const activeProgress = active && progressFor(active);
  return <div className="min-h-screen bg-slate-950 text-white"><header className="border-b border-white/10 bg-slate-900/90"><div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10"><div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Career planning</p><h1 className="mt-1 text-3xl font-bold">My Roadmaps</h1><p className="mt-2 text-sm text-slate-400">Track your learning progress for every career path you&apos;ve planned.</p></div><Link to="/dashboard" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold">Dashboard</Link></div></header><main className="mx-auto max-w-7xl px-6 py-8 sm:px-10">{error && <p className="mb-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{!roadmaps.length ? <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900 p-12 text-center"><h2 className="text-2xl font-bold">No Saved Roadmaps Yet</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">Generate and save a learning roadmap from the Skill Gap Analysis page to start tracking your progress.</p><Link to="/skill-gap-analysis" className="mt-6 inline-block rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">Create a Roadmap</Link></div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{roadmaps.map((roadmap) => { const progress = progressFor(roadmap); return <article key={roadmap._id} className="rounded-3xl border border-white/10 bg-slate-900 p-6"><p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Target Role</p><h2 className="mt-2 text-2xl font-bold">{roadmap.targetRole}</h2><div className="mt-5 space-y-2 text-sm text-slate-400"><p>Created <span className="text-slate-200">{formatDate(roadmap.createdAt)}</span></p><p>Last updated <span className="text-slate-200">{formatDate(roadmap.updatedAt)}</span></p></div><div className="mt-6"><div className="flex justify-between text-sm"><span className="text-slate-400">Overall Progress</span><span className="font-semibold text-emerald-300">{progress.percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-400" style={{ width: `${progress.percent}%` }} /></div><p className="mt-2 text-sm text-slate-400">{progress.completed} / {progress.total} Topics Completed</p></div><button onClick={() => openRoadmap(roadmap._id)} className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950">Continue Learning</button></article>; })}</div>}{active && <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Saved Roadmap</p><h2 className="mt-2 text-3xl font-bold">{active.targetRole}</h2></div><button onClick={() => setActive(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Close</button></div><div className="mt-6 rounded-2xl bg-white/5 p-4"><div className="flex justify-between"><span className="text-sm text-slate-400">Overall Progress</span><span className="font-semibold text-emerald-300">{activeProgress.percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-400" style={{ width: `${activeProgress.percent}%` }} /></div><p className="mt-2 text-sm text-slate-400">{activeProgress.completed} / {activeProgress.total} Topics Completed</p></div><div className="mt-6 space-y-4">{(active.learningRoadmap?.goals || []).map((goal, goalIndex) => { const goalProgress = progressFor({ learningRoadmap: { goals: [goal] } }); return <article key={`${goal.skillName}-${goalIndex}`} className="rounded-2xl border border-white/10 p-5"><div className="flex justify-between gap-4"><div><h3 className="text-lg font-semibold">{goal.skillName}</h3><p className="mt-1 text-sm text-slate-400">{goal.explanation}</p></div><span className="text-sm font-semibold text-emerald-300">{goalProgress.completed} / {goalProgress.total}</span></div><div className="mt-4 space-y-2">{(goal.subtopics || []).map((topic, subtopicIndex) => <label key={`${topic.title}-${subtopicIndex}`} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm"><input disabled={updating === `${goalIndex}-${subtopicIndex}`} type="checkbox" checked={Boolean(topic.completed)} onChange={(event) => toggle(goalIndex, subtopicIndex, event.target.checked)} className="h-4 w-4 accent-emerald-400" /><span className={topic.completed ? "text-slate-400 line-through" : "text-white"}>{topic.title}</span></label>)}</div></article>; })}</div></section>}</main></div>;
}

export default MyRoadmaps;
