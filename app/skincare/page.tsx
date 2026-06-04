"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LiveTime from "@/app/components/LiveTime";
import {
  currentSlot,
  DEFAULT_SKINCARE,
  EVENING_HOUR,
  getStepsForSlot,
  hasAnyRoutine,
  isEvening,
  SLOT_NAMES,
  type SkincareSlot,
  type SkincareState,
  type SkincareSteps,
} from "@/lib/skincare";
import { useSharedState } from "@/lib/use-shared-state";

async function fileToCompressedBase64(
  file: File,
  maxDim = 1500,
  quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality,
    ),
  );
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { base64: dataUrl.split(",")[1] ?? "", mimeType: "image/jpeg" };
}

export default function SkincarePage() {
  const { state, setState } = useSharedState<SkincareState>(
    "skincare",
    DEFAULT_SKINCARE,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tick every 30 seconds so the slot auto-flips when crossing the boundary.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const has = hasAnyRoutine(state.steps);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file);
      const res = await fetch("/api/skincare/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const data = (await res.json()) as
        | { ok: true; steps: SkincareSteps }
        | { ok: false; error: string; raw?: string };
      if (!data.ok) {
        setError(data.error + (data.raw ? `\n\n${data.raw}` : ""));
        return;
      }
      // Keep an existing anchor; if none, default to "now = Day 1 of the
      // current half-day" (slot 0 if morning, slot 1 if evening). User can
      // re-anchor with the chips below.
      const now2 = new Date();
      const defaultAnchor = {
        timestamp: now2.getTime(),
        slot: (isEvening(now2) ? 1 : 0) as SkincareSlot,
      };
      setState({
        steps: data.steps,
        anchor: state.anchor ?? defaultAnchor,
        updatedAt: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאה");
    } finally {
      setUploading(false);
    }
  };

  const setAnchorTo = (slot: SkincareSlot) => {
    setState({
      ...state,
      anchor: { timestamp: Date.now(), slot },
      updatedAt: Date.now(),
    });
  };

  const clearAll = () => {
    if (!confirm("למחוק את השגרה?")) return;
    setState(DEFAULT_SKINCARE);
  };

  const slot: SkincareSlot =
    state.anchor && now ? currentSlot(state.anchor, now) : 0;
  const steps = getStepsForSlot(state.steps, slot);

  // Compute when the next slot starts so we can show "switches at HH:MM"
  const nextBoundary = (() => {
    if (!now) return null;
    const next = new Date(now);
    if (now.getHours() < EVENING_HOUR) {
      next.setHours(EVENING_HOUR, 0, 0, 0);
    } else {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
    }
    return next;
  })();
  const boundaryLabel = nextBoundary
    ? nextBoundary.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <main className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
      <PageHeader
        title="טיפול פנים 🧴"
        accent="pink"
        extra={<LiveTime className="text-base font-medium text-white/70" />}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />

      {!has && !uploading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="text-6xl">🧴</div>
          <div>
            <p className="mb-1 text-2xl text-white/80">אין שגרה עדיין</p>
            <p className="max-w-md text-sm text-white/40">
              העלה תמונה של שגרת טיפול הפנים שלך — Gemini יקרא את התמונה
              ויחלץ את הצעדים לארבע הפזות.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-7 py-3.5 text-lg font-bold text-white shadow-lg shadow-fuchsia-500/30 transition-all hover:from-fuchsia-400 hover:to-pink-400 active:scale-95"
          >
            📷 העלה תמונת שגרה
          </button>
          {error && (
            <p className="max-w-md whitespace-pre-wrap break-words text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      )}

      {uploading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-300/30 border-t-pink-300" />
          <p className="text-lg text-white/70">קורא את התמונה…</p>
          <p className="text-sm text-white/40">בדרך כלל לוקח 5–15 שניות</p>
        </div>
      )}

      {has && !uploading && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto sm:gap-4">
          {/* Current slot hero */}
          <div className="rounded-3xl bg-gradient-to-br from-fuchsia-500/25 via-pink-500/10 to-fuchsia-500/15 p-5 ring-1 ring-pink-300/30 shadow-xl shadow-fuchsia-900/20 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-200">
                כרגע
              </p>
              {nextBoundary && (
                <p className="text-xs text-white/40" dir="ltr">
                  → next at {boundaryLabel}
                </p>
              )}
            </div>
            <h2 className="mb-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {SLOT_NAMES[slot]}
            </h2>

            {steps.length === 0 ? (
              <p className="text-base text-white/50">
                אין צעדים מוגדרים לפזה הזו
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-4 rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/10"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-300 to-pink-400 text-base font-bold text-fuchsia-950 shadow-md shadow-fuchsia-500/30">
                      {i + 1}
                    </div>
                    <span className="text-lg text-white sm:text-xl">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Slot picker / re-anchor */}
          <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 sm:p-5">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="flex items-center gap-2 text-base font-bold text-white/85 sm:text-lg">
                <span>🔄</span> הסבב
              </h3>
              <p className="text-xs text-white/40">
                לחץ על השלב הנוכחי כדי לכוון מחדש
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([0, 1, 2, 3] as SkincareSlot[]).map((s) => {
                const active = s === slot;
                const slotSteps = getStepsForSlot(state.steps, s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAnchorTo(s)}
                    className={`flex flex-col items-center gap-1 rounded-2xl p-3 ring-1 transition-all active:scale-95 ${
                      active
                        ? "bg-gradient-to-br from-fuchsia-400/30 to-pink-400/20 text-white ring-pink-300/40 shadow-md shadow-pink-500/15"
                        : "bg-white/[0.04] text-white/70 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm font-bold">
                      {SLOT_NAMES[s]}
                    </span>
                    <span className="text-xs opacity-60">
                      {slotSteps.length} צעדים
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-2">
            <p className="text-xs text-white/40">
              עודכן:{" "}
              {state.updatedAt
                ? new Date(state.updatedAt).toLocaleString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/20 hover:text-white"
              >
                נקה
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-fuchsia-500/30 hover:from-fuchsia-400 hover:to-pink-400 active:scale-95"
              >
                📷 העלה שגרה חדשה
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 px-4 py-3 ring-1 ring-red-400/30">
              <p className="whitespace-pre-wrap break-words text-sm text-red-200">
                {error}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
