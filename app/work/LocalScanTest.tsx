"use client";

import { useRef, useState } from "react";
import type { LocalScanResult, ScanProgress } from "@/lib/local-ocr";
import type { WorkShift } from "@/lib/work";

const SHORT_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export default function LocalScanTest({
  onAcceptShifts,
}: {
  onAcceptShifts: (shifts: WorkShift[]) => void;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [result, setResult] = useState<LocalScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      const { scanScheduleLocally } = await import("@/lib/local-ocr");
      const r = await scanScheduleLocally(file, (p) => setProgress(p));
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10 sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-white/85">
          🔬 OCR מקומי{" "}
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
            ניסיוני
          </span>
        </h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={running}
          className="rounded-full bg-white/10 px-4 py-1.5 text-sm hover:bg-white/20 disabled:opacity-40"
        >
          {running ? "סורק…" : "סרוק במכשיר"}
        </button>
      </div>
      <p className="mb-3 text-xs text-white/40">
        רץ לגמרי בדפדפן עם Tesseract.js — בלי שליחה ל-AI חיצוני. הורדה ראשונה
        של מודל העברית (~10MB) קורית פעם אחת.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />

      {running && (
        <div className="rounded-xl bg-white/[0.04] px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-white/60">
            <span>{progress?.phase ?? "מתחיל…"}</span>
            <span className="tabular-nums">
              {progress ? `${Math.round(progress.progress * 100)}%` : ""}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-white/60 transition-all"
              style={{ width: `${(progress?.progress ?? 0) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 ring-1 ring-red-400/30">
          {error}
        </p>
      )}

      {result && !running && (
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-sm font-medium text-white/80">
              נמצאו {result.shifts.length} משמרות עבור יואב
            </p>
            {result.shifts.length > 0 ? (
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {result.shifts.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-white/[0.05] px-3 py-2 text-sm"
                  >
                    <span className="text-white/70">יום {SHORT_DAYS[s.day]}</span>
                    <span dir="ltr" className="font-mono tabular-nums">
                      {s.startTime} – {s.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-white/40">
                שום משמרת לא זוהתה. ראה דיאגנוסטיקה למטה.
              </p>
            )}
          </div>

          {result.shifts.length > 0 && (
            <button
              type="button"
              onClick={() => onAcceptShifts(result.shifts)}
              className="w-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-500/30 hover:from-violet-400 hover:to-purple-400 active:scale-95"
            >
              ✓ השתמש בתוצאות אלה
            </button>
          )}

          <details className="rounded-xl bg-black/20 p-3 text-xs">
            <summary className="cursor-pointer text-white/60">
              דיאגנוסטיקה (מה Tesseract ראה)
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <p className="mb-1 font-medium text-white/70">
                  כותרות ימים ({result.diagnostics.dayHeaders.length})
                </p>
                {result.diagnostics.dayHeaders.length > 0 ? (
                  <ul className="space-y-0.5 text-white/50">
                    {result.diagnostics.dayHeaders.map((h, i) => (
                      <li key={i} dir="ltr" className="font-mono">
                        day={h.day} cx={Math.round(h.cx)} text=&quot;{h.text}&quot;
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/30">לא זוהו כותרות ימים</p>
                )}
              </div>

              <div>
                <p className="mb-1 font-medium text-white/70">
                  שורות שמכילות &quot;יואב&quot; ({result.diagnostics.yoavLines.length})
                </p>
                {result.diagnostics.yoavLines.length > 0 ? (
                  <pre className="overflow-x-auto rounded bg-black/40 p-2 text-[11px] text-white/60">
                    {result.diagnostics.yoavLines.join("\n")}
                  </pre>
                ) : (
                  <p className="text-white/30">לא נמצאו</p>
                )}
              </div>

              <details>
                <summary className="cursor-pointer text-white/50">
                  טקסט גולמי מלא
                </summary>
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-black/40 p-2 text-[10px] text-white/60 whitespace-pre-wrap">
                  {result.diagnostics.rawText}
                </pre>
              </details>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
