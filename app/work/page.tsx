"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LiveTime from "@/app/components/LiveTime";
import { DEFAULT_WORK, type WorkShift, type WorkState } from "@/lib/work";
import { useSharedState } from "@/lib/use-shared-state";
import LocalScanTest from "./LocalScanTest";

const DAY_NAMES = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
];
const SHORT_DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight
  return mins;
}

function formatHours(mins: number): string {
  if (mins === 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} שעות`;
  return `${h}:${String(m).padStart(2, "0")} שעות`;
}

function shiftsByDay(shifts: WorkShift[]): Map<number, WorkShift[]> {
  const map = new Map<number, WorkShift[]>();
  for (const s of shifts) {
    if (!map.has(s.day)) map.set(s.day, []);
    map.get(s.day)!.push(s);
  }
  return map;
}

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
  return {
    base64: dataUrl.split(",")[1] ?? "",
    mimeType: "image/jpeg",
  };
}

export default function WorkPage() {
  const { state, setState } = useSharedState<WorkState>("work", DEFAULT_WORK);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file later
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file);
      const res = await fetch("/api/work/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const data = (await res.json()) as
        | { ok: true; shifts: WorkShift[] }
        | { ok: false; error: string; raw?: string };
      if (!data.ok) {
        setError(data.error + (data.raw ? `\n\n${data.raw}` : ""));
        return;
      }
      setState({ shifts: data.shifts, updatedAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאה");
    } finally {
      setUploading(false);
    }
  };

  const triggerUpload = () => inputRef.current?.click();

  const clearShifts = () => {
    if (!confirm("למחוק את כל המשמרות?")) return;
    setState({ shifts: [], updatedAt: Date.now() });
  };

  const today = now?.getDay() ?? 0;
  const byDay = shiftsByDay(state.shifts);
  const todayShifts = byDay.get(today) ?? [];

  // Find next upcoming shift (today not counted if all today's shifts have ended,
  // or if today simply has none)
  const todayMins = now ? now.getHours() * 60 + now.getMinutes() : 0;
  let nextShift: WorkShift | null = null;
  let nextShiftDay = -1;
  for (let i = 0; i < 7; i++) {
    const d = (today + i) % 7;
    const candidates = byDay.get(d) ?? [];
    const valid = candidates.filter((s) => {
      if (i === 0) {
        const startMins =
          parseInt(s.startTime.split(":")[0], 10) * 60 +
          parseInt(s.startTime.split(":")[1], 10);
        return startMins >= todayMins; // not started yet today
      }
      return true;
    });
    if (valid.length > 0) {
      nextShift = valid[0];
      nextShiftDay = d;
      break;
    }
  }

  return (
    <main className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
      <PageHeader
        title="שעות עבודה 💼"
        accent="violet"
        extra={<LiveTime className="text-base font-medium text-white/70" />}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />

      {/* Empty state */}
      {state.shifts.length === 0 && !uploading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="text-6xl">📷</div>
          <div>
            <p className="mb-1 text-2xl text-white/80">אין לוח שעות עבודה</p>
            <p className="text-sm text-white/40">
              העלה תמונה של לוח המשמרות, ואני אחלץ את המשמרות של יואב
            </p>
          </div>
          <button
            type="button"
            onClick={triggerUpload}
            className="rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-7 py-3.5 text-lg font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:from-violet-400 hover:to-purple-400 active:scale-95"
          >
            📷 העלה תמונת לוח
          </button>
          {error && (
            <p className="max-w-md whitespace-pre-wrap break-words text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Uploading state */}
      {uploading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-300/30 border-t-violet-300" />
          <p className="text-lg text-white/70">קורא את התמונה…</p>
          <p className="text-sm text-white/40">בדרך כלל לוקח 5–15 שניות</p>
        </div>
      )}

      {/* Filled state */}
      {state.shifts.length > 0 && !uploading && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto sm:gap-4">
          {/* Today / next shift hero */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-500/25 via-purple-500/10 to-violet-500/15 p-6 ring-1 ring-violet-300/30 shadow-xl shadow-violet-900/20 sm:p-8">
            {todayShifts.length > 0 ? (
              <>
                <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-violet-200">
                  היום בעבודה
                </p>
                <p className="mb-4 text-lg text-white/70">
                  {DAY_NAMES[today]}
                </p>
                <div className="flex flex-col gap-3">
                  {todayShifts.map((s, i) => {
                    const mins = minutesBetween(s.startTime, s.endTime);
                    return (
                      <div
                        key={i}
                        className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
                      >
                        <div
                          className="font-bold tracking-tight text-white text-6xl sm:text-7xl lg:text-8xl"
                          dir="ltr"
                        >
                          {s.startTime} → {s.endTime}
                        </div>
                        <div className="text-xl text-violet-200/80">
                          {formatHours(mins)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : nextShift ? (
              <>
                <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-violet-200">
                  המשמרת הבאה
                </p>
                <p className="mb-4 text-lg text-white/70">
                  {nextShiftDay === today
                    ? "מאוחר יותר היום"
                    : DAY_NAMES[nextShiftDay]}
                </p>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <div
                    className="font-bold tracking-tight text-white text-5xl sm:text-6xl lg:text-7xl"
                    dir="ltr"
                  >
                    {nextShift.startTime} → {nextShift.endTime}
                  </div>
                  <div className="text-lg text-violet-200/80">
                    {formatHours(
                      minutesBetween(nextShift.startTime, nextShift.endTime),
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-2xl text-white/60">אין משמרות השבוע</p>
            )}
          </div>

          {/* Weekly overview */}
          <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 px-1 text-lg font-bold text-white/85">
              <span>📅</span> השבוע
            </h2>
            <ol className="flex flex-col gap-1.5">
              {SHORT_DAY_NAMES.map((short, day) => {
                const shifts = byDay.get(day) ?? [];
                const isToday = day === today;
                return (
                  <li
                    key={day}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
                      isToday
                        ? "bg-violet-400/15 ring-violet-300/30"
                        : "bg-white/[0.04] ring-white/10"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        isToday
                          ? "bg-violet-300 text-violet-950"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {short}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-white/60">
                        {DAY_NAMES[day]}
                      </div>
                      {shifts.length === 0 ? (
                        <div className="text-base text-white/30">חופש</div>
                      ) : (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {shifts.map((s, i) => (
                            <div
                              key={i}
                              className="font-mono text-base text-white tabular-nums"
                              dir="ltr"
                            >
                              {s.startTime}–{s.endTime}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-2">
            <p className="text-xs text-white/40">
              עודכן לאחרונה:{" "}
              {state.updatedAt
                ? new Date(state.updatedAt).toLocaleString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "מעולם לא"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearShifts}
                className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/20 hover:text-white"
              >
                נקה
              </button>
              <button
                type="button"
                onClick={triggerUpload}
                className="rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-violet-500/30 hover:from-violet-400 hover:to-purple-400 active:scale-95"
              >
                📷 העלה לוח חדש
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

          <LocalScanTest
            onAcceptShifts={(shifts) =>
              setState({ shifts, updatedAt: Date.now() })
            }
          />
        </div>
      )}

      {state.shifts.length === 0 && !uploading && (
        <div className="mt-4 w-full max-w-2xl">
          <LocalScanTest
            onAcceptShifts={(shifts) =>
              setState({ shifts, updatedAt: Date.now() })
            }
          />
        </div>
      )}
    </main>
  );
}
