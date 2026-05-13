"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import {
  buildQueue,
  loadDishes,
  MAX_PATTERN,
  saveDishes,
  type DishesPerson,
  type DishesState,
} from "@/lib/dishes";
import { newId } from "@/lib/util";

export default function DishesPage() {
  const [state, setState] = useState<DishesState>({
    pattern: [],
    queue: [],
    highlight: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    setState(loadDishes());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveDishes(state);
  }, [state, loaded]);

  // ---------- pattern operations (also reset the big list) ----------

  const addToPattern = (name: string) => {
    const t = name.trim();
    if (!t) return;
    if (state.pattern.length >= MAX_PATTERN) return;
    setState((s) => {
      const pattern = [...s.pattern, { id: newId(), name: t }];
      return { ...s, pattern, queue: buildQueue(pattern) };
    });
  };

  const removeFromPattern = (id: string) => {
    setState((s) => {
      const pattern = s.pattern.filter((p) => p.id !== id);
      return { ...s, pattern, queue: buildQueue(pattern) };
    });
  };

  const moveInPattern = (id: string, dir: -1 | 1) => {
    setState((s) => {
      const idx = s.pattern.findIndex((p) => p.id === id);
      if (idx === -1) return s;
      const next = idx + dir;
      if (next < 0 || next >= s.pattern.length) return s;
      const pattern = [...s.pattern];
      [pattern[idx], pattern[next]] = [pattern[next], pattern[idx]];
      return { ...s, pattern, queue: buildQueue(pattern) };
    });
  };

  const renameInPattern = (id: string, name: string) => {
    const t = name.trim();
    if (!t) return;
    setState((s) => {
      const pattern = s.pattern.map((p) =>
        p.id === id ? { ...p, name: t } : p,
      );
      return { ...s, pattern, queue: buildQueue(pattern) };
    });
  };

  const advance = () => {
    setState((s) => {
      if (s.pattern.length < 2) return s;
      const [first, ...rest] = s.pattern;
      const pattern = [...rest, first];
      return { ...s, pattern, queue: buildQueue(pattern) };
    });
  };

  // ---------- queue-only operations (do NOT touch pattern) ----------

  const removeFromQueue = (id: string) => {
    setState((s) => ({ ...s, queue: s.queue.filter((p) => p.id !== id) }));
  };

  const moveInQueue = (id: string, dir: -1 | 1) => {
    setState((s) => {
      const idx = s.queue.findIndex((p) => p.id === id);
      if (idx === -1) return s;
      const next = idx + dir;
      if (next < 0 || next >= s.queue.length) return s;
      const queue = [...s.queue];
      [queue[idx], queue[next]] = [queue[next], queue[idx]];
      return { ...s, queue };
    });
  };

  const renameInQueue = (id: string, name: string) => {
    const t = name.trim();
    if (!t) return;
    setState((s) => ({
      ...s,
      queue: s.queue.map((p) => (p.id === id ? { ...p, name: t } : p)),
    }));
  };

  // ---------- shared edit lifecycle ----------

  const startEdit = (p: DishesPerson) => {
    setEditingId(p.id);
    setEditValue(p.name);
  };
  const commitEdit = (target: "pattern" | "queue") => {
    if (editingId) {
      if (target === "pattern") renameInPattern(editingId, editValue);
      else renameInQueue(editingId, editValue);
    }
    setEditingId(null);
    setEditValue("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const toggleHighlight = () => {
    setState((s) => ({ ...s, highlight: !s.highlight }));
  };

  const regenerateQueue = () => {
    setState((s) => ({ ...s, queue: buildQueue(s.pattern) }));
  };

  const next = state.queue[0] ?? null;

  return (
    <main className="relative flex min-w-0 flex-1 flex-col p-4">
      <PageHeader title="תור מדיח 🍽️" accent="sky" />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* RIGHT (RTL first): pattern editor */}
        <aside className="flex w-72 shrink-0 flex-col rounded-3xl bg-gradient-to-b from-sky-500/15 to-sky-500/5 ring-1 ring-sky-300/20 p-4 shadow-xl shadow-sky-900/20">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-lg font-bold text-sky-100">
              <span>👥</span> הקבוצה
            </h2>
            <span className="rounded-full bg-sky-400/20 px-2 py-0.5 text-xs font-medium text-sky-100">
              {state.pattern.length} / {MAX_PATTERN}
            </span>
          </div>

          <div className="mb-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addToPattern(input);
                  setInput("");
                }
              }}
              placeholder="הוסף לקבוצה…"
              disabled={state.pattern.length >= MAX_PATTERN}
              className="flex-1 rounded-xl bg-white/10 px-3 py-2.5 outline-none focus:bg-white/15 disabled:opacity-40"
            />
            <button
              type="button"
              onClick={() => {
                addToPattern(input);
                setInput("");
              }}
              disabled={!input.trim() || state.pattern.length >= MAX_PATTERN}
              className="rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 px-4 py-2.5 font-bold text-sky-950 shadow-md shadow-sky-500/30 transition-all hover:from-sky-300 hover:to-cyan-400 active:scale-95 disabled:opacity-40"
            >
              +
            </button>
          </div>

          <ol className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {state.pattern.length === 0 && (
              <li className="flex flex-1 items-center justify-center text-center text-sm text-white/40">
                הקבוצה ריקה.
                <br />
                הוסף שמות והם יחזרו בתור.
              </li>
            )}
            {state.pattern.map((person, idx) => (
              <li
                key={person.id}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 ring-1 transition-colors ${
                  idx === 0
                    ? "bg-sky-400/25 ring-sky-300/40"
                    : "bg-white/[0.06] ring-white/10"
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                    idx === 0
                      ? "bg-sky-300 text-sky-950"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {idx + 1}
                </div>
                {editingId === person.id ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit("pattern");
                      if (e.key === "Escape") cancelEdit();
                    }}
                    onBlur={() => commitEdit("pattern")}
                    autoFocus
                    className="flex-1 rounded-lg bg-white/10 px-2 py-1 text-base outline-none focus:bg-white/15"
                  />
                ) : (
                  <span className="flex-1 truncate text-base">
                    {person.name}
                  </span>
                )}
                <div className="flex shrink-0 gap-0.5">
                  <IconButton
                    label="העלה"
                    disabled={idx === 0}
                    onClick={() => moveInPattern(person.id, -1)}
                  >
                    <path d="M18 15l-6-6-6 6" />
                  </IconButton>
                  <IconButton
                    label="הורד"
                    disabled={idx === state.pattern.length - 1}
                    onClick={() => moveInPattern(person.id, 1)}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </IconButton>
                  <IconButton
                    label="ערוך"
                    onClick={() =>
                      editingId === person.id
                        ? commitEdit("pattern")
                        : startEdit(person)
                    }
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </IconButton>
                  <IconButton
                    label="הסר"
                    onClick={() => removeFromPattern(person.id)}
                  >
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        {/* LEFT (RTL second): hero + main editable list */}
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Hero: next name + toggle + advance */}
          <div
            className={`flex shrink-0 flex-col items-center justify-center rounded-3xl ring-1 p-6 transition-all duration-500 ${
              state.highlight
                ? "bg-gradient-to-br from-emerald-500/25 via-green-400/10 to-emerald-500/15 ring-emerald-300/40 shadow-2xl shadow-emerald-500/20"
                : "bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-white/10"
            }`}
          >
            <p
              className={`mb-4 text-base font-bold uppercase tracking-[0.2em] transition-colors ${
                state.highlight ? "text-emerald-200" : "text-white/50"
              }`}
            >
              {state.highlight ? "🔔 צריך לפנות מדיח" : "הבא בתור"}
            </p>

            {next ? (
              <div
                className={`mb-6 font-black tracking-tight transition-all duration-500 ${
                  state.highlight
                    ? "animate-glow-pulse text-[10rem] leading-none text-emerald-300"
                    : "text-7xl text-white drop-shadow-[0_2px_30px_rgba(255,255,255,0.15)]"
                }`}
              >
                {next.name}
              </div>
            ) : (
              <div className="mb-6 text-5xl text-white/30">—</div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              {next && (
                <button
                  type="button"
                  onClick={toggleHighlight}
                  className={`rounded-full px-7 py-3.5 text-lg font-bold ring-1 transition-all active:scale-95 ${
                    state.highlight
                      ? "bg-white/10 text-white/80 ring-white/20 hover:bg-white/15"
                      : "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 ring-emerald-300/50 shadow-lg shadow-emerald-500/40 hover:from-emerald-300 hover:to-green-400 hover:shadow-emerald-500/60"
                  }`}
                >
                  {state.highlight ? "ביטול הדגשה" : "🍽️ צריך לפנות מדיח"}
                </button>
              )}
              {state.pattern.length >= 2 && (
                <button
                  type="button"
                  onClick={advance}
                  className="rounded-full bg-white px-6 py-3.5 text-lg font-bold text-neutral-950 shadow-md transition-all hover:bg-white/90 active:scale-95"
                >
                  סיים — הבא ⏭️
                </button>
              )}
            </div>
          </div>

          {/* Main editable big list */}
          <div className="flex min-h-0 flex-1 flex-col rounded-3xl bg-white/5 ring-1 ring-white/10 p-5">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white/85">
                <span>🔁</span> הסדר הבא
              </h3>
              <span className="text-xs text-white/40">
                שינוי בקבוצה יאפס את הסדר
              </span>
            </div>
            <ol className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
              {state.queue.length === 0 && (
                <li className="flex flex-1 items-center justify-center text-white/40">
                  הוסף שמות לקבוצה כדי לראות את התור
                </li>
              )}
              {state.queue.map((p, i) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ring-1 transition-all ${
                    i === 0
                      ? "bg-gradient-to-r from-emerald-400/25 to-emerald-400/10 ring-emerald-300/40 shadow-md shadow-emerald-500/15"
                      : "bg-white/[0.05] ring-white/10"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tabular-nums ${
                      i === 0
                        ? "bg-gradient-to-br from-emerald-300 to-green-400 text-emerald-950 shadow-md shadow-emerald-500/40"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {editingId === p.id ? (
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit("queue");
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onBlur={() => commitEdit("queue")}
                      autoFocus
                      className="flex-1 rounded-lg bg-white/10 px-2 py-1 text-lg outline-none focus:bg-white/15"
                    />
                  ) : (
                    <span
                      className={`flex-1 truncate ${
                        i === 0
                          ? "text-xl font-bold text-emerald-50"
                          : "text-lg text-white/90"
                      }`}
                    >
                      {p.name}
                    </span>
                  )}
                  {i === 0 && editingId !== p.id && (
                    <span className="rounded-full bg-emerald-400/30 px-2.5 py-0.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/40">
                      ⭐ הבא
                    </span>
                  )}
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton
                      label="העלה"
                      disabled={i === 0}
                      onClick={() => moveInQueue(p.id, -1)}
                    >
                      <path d="M18 15l-6-6-6 6" />
                    </IconButton>
                    <IconButton
                      label="הורד"
                      disabled={i === state.queue.length - 1}
                      onClick={() => moveInQueue(p.id, 1)}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </IconButton>
                    <IconButton
                      label="ערוך"
                      onClick={() =>
                        editingId === p.id
                          ? commitEdit("queue")
                          : startEdit(p)
                      }
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </IconButton>
                    <IconButton
                      label="הסר"
                      onClick={() => removeFromQueue(p.id)}
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={regenerateQueue}
              disabled={state.pattern.length === 0}
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] py-2.5 text-sm font-bold text-white/80 ring-1 ring-white/15 transition-all hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.06]"
            >
              <span>🔄</span>
              צור רשימה חדשה
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-white/10 disabled:hover:text-white/70"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
