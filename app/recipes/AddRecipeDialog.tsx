"use client";

import { useRef, useState } from "react";
import type { ExtractedRecipe } from "@/lib/recipes";

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

type Props = {
  onCancel: () => void;
  onAdd: (recipe: ExtractedRecipe) => void;
};

type Mode = "choose" | "url" | "image";

export default function AddRecipeDialog({ onCancel, onAdd }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submitUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "url", url: trimmed }),
      });
      const data = (await res.json()) as
        | { ok: true; recipe: ExtractedRecipe }
        | { ok: false; error: string };
      if (!data.ok) {
        setError(data.error);
        return;
      }
      onAdd(data.recipe);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file);
      const res = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "image", image: base64, mimeType }),
      });
      const data = (await res.json()) as
        | { ok: true; recipe: ExtractedRecipe }
        | { ok: false; error: string };
      if (!data.ok) {
        setError(data.error);
        return;
      }
      onAdd(data.recipe);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onClick={onCancel}
    >
      <div
        className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-3xl bg-neutral-900/95 backdrop-blur-xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="text-xl font-bold tracking-tight">הוספת מתכון</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="סגור"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-300/30 border-t-orange-300" />
              <p className="text-base text-white/70">קורא את המתכון…</p>
              <p className="text-xs text-white/40">בדרך כלל לוקח 5-15 שניות</p>
            </div>
          )}

          {!loading && mode === "choose" && (
            <div className="flex flex-col gap-3">
              <p className="mb-2 text-sm text-white/60">
                איך להוסיף את המתכון?
              </p>
              <button
                type="button"
                onClick={() => setMode("url")}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4 text-right ring-1 ring-white/10 hover:bg-white/10"
              >
                <span className="text-3xl">🔗</span>
                <div>
                  <p className="font-bold">מקישור</p>
                  <p className="text-xs text-white/50">
                    הדבק URL של מתכון מאתר
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("image");
                  setTimeout(() => inputRef.current?.click(), 50);
                }}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4 text-right ring-1 ring-white/10 hover:bg-white/10"
              >
                <span className="text-3xl">📷</span>
                <div>
                  <p className="font-bold">מתמונה</p>
                  <p className="text-xs text-white/50">
                    צלם או העלה תמונה של המתכון
                  </p>
                </div>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFile}
              />
            </div>
          )}

          {!loading && mode === "url" && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setMode("choose");
                  setError(null);
                }}
                className="mb-3 text-sm text-white/60 hover:text-white"
              >
                ← חזרה
              </button>
              <label className="mb-1.5 block text-sm text-white/60">
                כתובת המתכון
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitUrl();
                }}
                placeholder="https://..."
                dir="ltr"
                autoFocus
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-base outline-none focus:bg-white/15"
              />
              <button
                type="button"
                onClick={submitUrl}
                disabled={!url.trim()}
                className="mt-3 w-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 text-base font-bold text-white shadow-md shadow-orange-500/30 hover:from-orange-400 hover:to-red-400 active:scale-95 disabled:opacity-40"
              >
                הבא את המתכון
              </button>
            </div>
          )}

          {!loading && mode === "image" && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setMode("choose");
                  setError(null);
                }}
                className="mb-3 text-sm text-white/60 hover:text-white"
              >
                ← חזרה
              </button>
              <p className="mb-3 text-sm text-white/60">
                בחר תמונה של מתכון (צילום מספר, צילום מסך וכו&apos;)
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 text-base font-bold text-white shadow-md shadow-orange-500/30 hover:from-orange-400 hover:to-red-400 active:scale-95"
              >
                📷 בחר תמונה
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFile}
              />
            </div>
          )}

          {error && !loading && (
            <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 ring-1 ring-red-400/30">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
