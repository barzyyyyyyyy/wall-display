"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import {
  buildQueue,
  DEFAULT_DISHES,
  MAX_PATTERN,
  type DishesPerson,
  type DishesState,
} from "@/lib/dishes";
import { useSharedState } from "@/lib/use-shared-state";
import { newId } from "@/lib/util";

type Toast = { kind: "success" | "error"; text: string };

export default function DishesPage() {
  const { state, setState } = useSharedState<DishesState>(
    "dishes",
    DEFAULT_DISHES,
  );
  const [input, setInput] = useState("");
  // Edit state — for the pattern editor we capture name + phone + key.
  // For queue rows we only edit `editName`.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<"pattern" | "queue" | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editKey, setEditKey] = useState("");

  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

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

  const advance = () => {
    setState((s) => {
      if (s.pattern.length < 2) return s;
      const [first, ...rest] = s.pattern;
      const pattern = [...rest, first];
      return { ...s, pattern, queue: buildQueue(pattern) };
    });
  };

  // ---------- queue-only operations ----------

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

  // ---------- edit lifecycle ----------

  const startEditPattern = (p: DishesPerson) => {
    setEditingId(p.id);
    setEditingTarget("pattern");
    setEditName(p.name);
    setEditPhone(p.phone ?? "");
    setEditKey(p.callmebot ?? "");
  };

  const startEditQueue = (p: DishesPerson) => {
    setEditingId(p.id);
    setEditingTarget("queue");
    setEditName(p.name);
  };

  const commitEdit = () => {
    if (!editingId || !editingTarget) {
      cancelEdit();
      return;
    }
    const t = editName.trim();
    if (!t) {
      cancelEdit();
      return;
    }
    if (editingTarget === "pattern") {
      const phone = editPhone.trim() || undefined;
      const key = editKey.trim() || undefined;
      setState((s) => {
        const pattern = s.pattern.map((p) =>
          p.id === editingId
            ? { ...p, name: t, phone, callmebot: key }
            : p,
        );
        return { ...s, pattern, queue: buildQueue(pattern) };
      });
    } else {
      setState((s) => ({
        ...s,
        queue: s.queue.map((p) => (p.id === editingId ? { ...p, name: t } : p)),
      }));
    }
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTarget(null);
    setEditName("");
    setEditPhone("");
    setEditKey("");
  };

  const toggleHighlight = () => {
    setState((s) => ({ ...s, highlight: !s.highlight }));
  };

  const regenerateQueue = () => {
    setState((s) => ({ ...s, queue: buildQueue(s.pattern) }));
  };

  const sendReminder = async () => {
    const target = state.queue[0];
    if (!target) return;
    if (!target.phone || !target.callmebot) {
      setToast({
        kind: "error",
        text: `אין מספר/מפתח עבור ${target.name}`,
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/dishes/remind", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: target.phone,
          apiKey: target.callmebot,
          message: `היי ${target.name}! זה תורך לפנות את המדיח 🍽️`,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!data.ok) {
        setToast({ kind: "error", text: data.error || "שגיאה בשליחה" });
      } else {
        setToast({ kind: "success", text: `תזכורת נשלחה ל${target.name} ✓` });
      }
    } catch (e) {
      setToast({
        kind: "error",
        text: e instanceof Error ? e.message : "שגיאה",
      });
    } finally {
      setSending(false);
    }
  };

  const next = state.queue[0] ?? null;
  const canRemind = !!next && !!next.phone && !!next.callmebot;

  return (
    <main className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
      <PageHeader title="תור מדיח 🍽️" accent="sky" />

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-4 overflow-y-auto lg:overflow-visible">
        {/* PATTERN — appears bottom on mobile, right on desktop */}
        <aside className="order-last flex w-full shrink-0 flex-col rounded-3xl bg-gradient-to-b from-sky-500/15 to-sky-500/5 p-3 ring-1 ring-sky-300/20 shadow-xl shadow-sky-900/20 sm:p-4 lg:order-first lg:w-80">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-base font-bold text-sky-100 sm:text-lg">
              <span>👥</span> הקבוצה
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                aria-label="עזרה: איך להפעיל WhatsApp"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-400/20 text-sm text-sky-100 ring-1 ring-sky-300/30 transition-colors hover:bg-sky-400/30"
              >
                ?
              </button>
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

          <ol className="flex min-h-0 flex-1 flex-col gap-1.5 lg:overflow-y-auto pr-1">
            {state.pattern.length === 0 && (
              <li className="flex flex-1 items-center justify-center text-center text-sm text-white/40 py-3">
                הקבוצה ריקה.
                <br />
                הוסף שמות והם יחזרו בתור.
              </li>
            )}
            {state.pattern.map((person, idx) => {
              const isEditing =
                editingId === person.id && editingTarget === "pattern";
              return (
                <li
                  key={person.id}
                  className={`flex items-start gap-2 rounded-xl px-3 py-2 ring-1 transition-colors ${
                    idx === 0
                      ? "bg-sky-400/25 ring-sky-300/40"
                      : "bg-white/[0.06] ring-white/10"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                      idx === 0
                        ? "bg-sky-300 text-sky-950"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {isEditing ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        placeholder="שם"
                        className="rounded-lg bg-white/10 px-2 py-1 text-base outline-none focus:bg-white/15"
                      />
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        dir="ltr"
                        placeholder="+972501234567"
                        className="rounded-lg bg-white/10 px-2 py-1 text-sm outline-none focus:bg-white/15"
                      />
                      <input
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        dir="ltr"
                        placeholder="CallMeBot key"
                        className="rounded-lg bg-white/10 px-2 py-1 text-sm outline-none focus:bg-white/15"
                      />
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-1.5 truncate text-base">
                        {person.name}
                        {person.phone && person.callmebot && (
                          <span
                            title="הוגדר WhatsApp"
                            className="text-[10px]"
                          >
                            📲
                          </span>
                        )}
                      </span>
                      {person.phone && (
                        <span
                          dir="ltr"
                          className="truncate text-[10px] text-white/40"
                        >
                          {person.phone}
                        </span>
                      )}
                    </div>
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
                      label={isEditing ? "שמור" : "ערוך"}
                      onClick={() =>
                        isEditing ? commitEdit() : startEditPattern(person)
                      }
                    >
                      {isEditing ? (
                        <path d="M5 13l4 4L19 7" />
                      ) : (
                        <>
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </>
                      )}
                    </IconButton>
                    <IconButton
                      label="הסר"
                      onClick={() => removeFromPattern(person.id)}
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ol>

        </aside>

        {/* MAIN — appears top on mobile, left on desktop */}
        <section className="order-first flex min-w-0 flex-1 flex-col gap-3 lg:order-last lg:gap-4">
          {/* Hero */}
          <div
            className={`flex shrink-0 flex-col items-center justify-center rounded-3xl p-4 ring-1 transition-all duration-500 sm:p-6 ${
              state.highlight
                ? "bg-gradient-to-br from-emerald-500/25 via-green-400/10 to-emerald-500/15 ring-emerald-300/40 shadow-2xl shadow-emerald-500/20"
                : "bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-white/10"
            }`}
          >
            <p
              className={`mb-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors sm:mb-4 sm:text-base ${
                state.highlight ? "text-emerald-200" : "text-white/50"
              }`}
            >
              {state.highlight ? "🔔 צריך לפנות מדיח" : "הבא בתור"}
            </p>

            {next ? (
              <div
                className={`mb-4 font-black tracking-tight transition-all duration-500 sm:mb-6 ${
                  state.highlight
                    ? "animate-glow-pulse text-6xl leading-none text-emerald-300 sm:text-8xl lg:text-[10rem]"
                    : "text-5xl text-white drop-shadow-[0_2px_30px_rgba(255,255,255,0.15)] sm:text-6xl lg:text-7xl"
                }`}
              >
                {next.name}
              </div>
            ) : (
              <div className="mb-4 text-3xl text-white/30 sm:mb-6 sm:text-5xl">
                —
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {next && (
                <button
                  type="button"
                  onClick={toggleHighlight}
                  className={`rounded-full px-4 py-2.5 text-sm font-bold ring-1 transition-all active:scale-95 sm:px-7 sm:py-3.5 sm:text-lg ${
                    state.highlight
                      ? "bg-white/10 text-white/80 ring-white/20 hover:bg-white/15"
                      : "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 ring-emerald-300/50 shadow-lg shadow-emerald-500/40 hover:from-emerald-300 hover:to-green-400 hover:shadow-emerald-500/60"
                  }`}
                >
                  {state.highlight ? "ביטול הדגשה" : "🍽️ צריך לפנות מדיח"}
                </button>
              )}
              {canRemind && (
                <button
                  type="button"
                  onClick={sendReminder}
                  disabled={sending}
                  className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2.5 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-500/30 transition-all hover:from-green-400 hover:to-emerald-400 active:scale-95 disabled:opacity-50 sm:px-6 sm:py-3.5 sm:text-lg"
                >
                  {sending ? "שולח…" : `📲 שלח תזכורת ל${next?.name ?? ""}`}
                </button>
              )}
              {state.pattern.length >= 2 && (
                <button
                  type="button"
                  onClick={advance}
                  className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-neutral-950 shadow-md transition-all hover:bg-white/90 active:scale-95 sm:px-6 sm:py-3.5 sm:text-lg"
                >
                  סיים — הבא ⏭️
                </button>
              )}
            </div>
          </div>

          {/* Big list */}
          <div className="flex min-h-0 flex-1 flex-col rounded-3xl bg-white/5 p-3 ring-1 ring-white/10 sm:p-5">
            <div className="mb-2 flex items-center justify-between px-1 sm:mb-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-white/85 sm:text-lg">
                <span>🔁</span> הסדר הבא
              </h3>
              <span className="hidden text-xs text-white/40 sm:inline">
                שינוי בקבוצה יאפס את הסדר
              </span>
            </div>
            <ol className="flex min-h-0 flex-1 flex-col gap-1 sm:gap-1.5 lg:overflow-y-auto">
              {state.queue.length === 0 && (
                <li className="flex flex-1 items-center justify-center py-4 text-sm text-white/40">
                  הוסף שמות לקבוצה כדי לראות את התור
                </li>
              )}
              {state.queue.map((p, i) => {
                const isEditing =
                  editingId === p.id && editingTarget === "queue";
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 ring-1 transition-all sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-2.5 ${
                      i === 0
                        ? "bg-gradient-to-r from-emerald-400/25 to-emerald-400/10 ring-emerald-300/40 shadow-md shadow-emerald-500/15"
                        : "bg-white/[0.05] ring-white/10"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold tabular-nums sm:h-9 sm:w-9 sm:rounded-xl sm:text-sm ${
                        i === 0
                          ? "bg-gradient-to-br from-emerald-300 to-green-400 text-emerald-950 shadow-md shadow-emerald-500/40"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {i + 1}
                    </div>
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        onBlur={commitEdit}
                        autoFocus
                        className="flex-1 rounded-lg bg-white/10 px-2 py-1 text-base outline-none focus:bg-white/15 sm:text-lg"
                      />
                    ) : (
                      <span
                        className={`flex-1 truncate ${
                          i === 0
                            ? "text-base font-bold text-emerald-50 sm:text-xl"
                            : "text-sm text-white/90 sm:text-lg"
                        }`}
                      >
                        {p.name}
                      </span>
                    )}
                    {i === 0 && !isEditing && (
                      <span className="hidden rounded-full bg-emerald-400/30 px-2.5 py-0.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/40 sm:inline">
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
                        label={isEditing ? "שמור" : "ערוך"}
                        onClick={() =>
                          isEditing ? commitEdit() : startEditQueue(p)
                        }
                      >
                        {isEditing ? (
                          <path d="M5 13l4 4L19 7" />
                        ) : (
                          <>
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </>
                        )}
                      </IconButton>
                      <IconButton
                        label="הסר"
                        onClick={() => removeFromQueue(p.id)}
                      >
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
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

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-medium shadow-lg ring-1 ${
            toast.kind === "success"
              ? "bg-emerald-500/95 text-white ring-emerald-300/50"
              : "bg-red-500/95 text-white ring-red-300/50"
          }`}
        >
          {toast.text}
        </div>
      )}

      {showHelp && <WhatsAppHelpModal onClose={() => setShowHelp(false)} />}
    </main>
  );
}

function WhatsAppHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-neutral-900/95 backdrop-blur-xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span>📲</span> הפעלת תזכורות WhatsApp
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
          {/* Phone field explanation */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-sky-200">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-400/20 text-sm text-sky-100 ring-1 ring-sky-300/30">
                1
              </span>
              שדה הטלפון
            </h3>
            <p className="mb-3 text-sm leading-relaxed text-white/75">
              מספר הטלפון של האדם שיקבל את התזכורת, בפורמט בינלאומי. דוגמה
              למספר ישראלי <span dir="ltr">050-123-4567</span>:
            </p>
            <ul className="space-y-1.5 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <span className="text-white/40">•</span>
                <span>הסר מקפים ורווחים:</span>
                <code className="rounded bg-white/10 px-2 py-0.5 font-mono" dir="ltr">
                  0501234567
                </code>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-white/40">•</span>
                <span>
                  החלף את ה-<code className="rounded bg-white/10 px-1.5 font-mono">0</code>{" "}
                  בהתחלה ב-<code className="rounded bg-white/10 px-1.5 font-mono">+972</code>:
                </span>
              </li>
              <li className="flex items-center gap-2 pr-7">
                <span className="text-emerald-300">✓</span>
                <code className="rounded bg-emerald-500/20 px-2.5 py-1 font-mono text-emerald-100" dir="ltr">
                  +972501234567
                </code>
              </li>
            </ul>
          </section>

          {/* CallMeBot key explanation */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-sky-200">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-400/20 text-sm text-sky-100 ring-1 ring-sky-300/30">
                2
              </span>
              שדה ה-CallMeBot key
            </h3>
            <p className="mb-3 text-sm leading-relaxed text-white/75">
              מפתח שמקבלים פעם אחת מ-CallMeBot — שירות בחינם שמאפשר לבוט לשלוח
              לך הודעות WhatsApp. כך משיגים אותו:
            </p>
            <ol className="space-y-2.5 text-sm text-white/75">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                  1
                </span>
                <span>
                  בטלפון של האדם, הוסף לאנשי הקשר מספר חדש:{" "}
                  <code className="rounded bg-white/10 px-2 py-0.5 font-mono" dir="ltr">
                    +34 644 51 95 23
                  </code>{" "}
                  (השם לא משנה, למשל &quot;CallMeBot&quot;)
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                  2
                </span>
                <span>
                  פתח WhatsApp ושלח לאיש הקשר הזה את ההודעה (באנגלית, בדיוק):
                  <div className="mt-1.5 rounded-lg bg-white/[0.06] px-3 py-2 font-mono text-xs text-emerald-200" dir="ltr">
                    I allow callmebot to send me messages
                  </div>
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                  3
                </span>
                <span>
                  המתן עד 5 דקות. הבוט יענה עם הודעה שמכילה את ה-API key
                  שלך — מספר כמו{" "}
                  <code className="rounded bg-white/10 px-1.5 font-mono" dir="ltr">
                    5523471
                  </code>
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                  4
                </span>
                <span>
                  העתק את המספר הזה והדבק בשדה{" "}
                  <code className="rounded bg-white/10 px-1.5 font-mono text-xs">
                    CallMeBot key
                  </code>{" "}
                  כאן
                </span>
              </li>
            </ol>
          </section>

          {/* Example summary */}
          <section className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-400/25">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
              לסיכום — דוגמה:
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-white/60">שם:</span>
                <span className="text-white">דניאל</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-white/60">טלפון:</span>
                <code className="font-mono text-emerald-100" dir="ltr">
                  +972501234567
                </code>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-white/60">CallMeBot key:</span>
                <code className="font-mono text-emerald-100" dir="ltr">
                  5523471
                </code>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-white/10 bg-black/20 p-4 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-5 py-2.5 text-base font-medium text-neutral-950 hover:bg-white/90"
          >
            הבנתי
          </button>
        </div>
      </div>
    </div>
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
