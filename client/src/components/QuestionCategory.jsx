import { useState } from "react";

function QuestionCategory({ title, questions, difficulty, color, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorStyles = {
    cyan: {
      border: "border-cyan-400/20",
      bg: "bg-cyan-500/5",
      headerBg: "bg-cyan-500/10",
      text: "text-cyan-300",
      badge: "border-cyan-400/30 bg-cyan-500/20 text-cyan-200",
      dot: "bg-cyan-400",
    },
    purple: {
      border: "border-purple-400/20",
      bg: "bg-purple-500/5",
      headerBg: "bg-purple-500/10",
      text: "text-purple-300",
      badge: "border-purple-400/30 bg-purple-500/20 text-purple-200",
      dot: "bg-purple-400",
    },
    emerald: {
      border: "border-emerald-400/20",
      bg: "bg-emerald-500/5",
      headerBg: "bg-emerald-500/10",
      text: "text-emerald-300",
      badge: "border-emerald-400/30 bg-emerald-500/20 text-emerald-200",
      dot: "bg-emerald-400",
    },
    amber: {
      border: "border-amber-400/20",
      bg: "bg-amber-500/5",
      headerBg: "bg-amber-500/10",
      text: "text-amber-300",
      badge: "border-amber-400/30 bg-amber-500/20 text-amber-200",
      dot: "bg-amber-400",
    },
  };

  const styles = colorStyles[color] || colorStyles.cyan;

  const difficultyColors = {
    easy: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
    medium: "border-amber-400/30 bg-amber-500/15 text-amber-300",
    hard: "border-red-400/30 bg-red-500/15 text-red-300",
  };

  const difficultyStyle = difficultyColors[difficulty] || difficultyColors.medium;

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-[24px] border ${styles.border} ${styles.bg} overflow-hidden transition-all duration-300`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-5 ${styles.headerBg} transition hover:brightness-110`}
      >
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
          <h3 className={`text-sm font-semibold uppercase tracking-[0.18em] ${styles.text}`}>
            {title}
          </h3>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
            {questions.length}
          </span>
        </div>

        <svg
          className={`h-5 w-5 ${styles.text} transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="p-5 space-y-3">
          {questions.map((item, index) => (
            <div
              key={index}
              className="rounded-[18px] border border-white/10 bg-slate-950/40 p-4"
            >
              {item.codingProblem ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">
                    {item.codingProblem.title}
                  </p>
                  <p className="text-sm text-slate-400">
                    {item.codingProblem.platform}
                  </p>
                  <a
                    href={item.codingProblem.link}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex text-sm font-semibold ${styles.text} hover:underline`}
                  >
                    Open problem
                  </a>
                </div>
              ) : (
                <>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                  Q{item.number || index + 1}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${difficultyStyle}`}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
                  {title.replace(" Questions", "")}
                </span>
              </div>

              <p className="text-sm leading-7 text-slate-200">
                {item.question}
              </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default QuestionCategory;
