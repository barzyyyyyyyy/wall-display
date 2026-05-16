"use client";

import { useState } from "react";
import type { Sibling } from "@/lib/types";

type Props = {
  initial: Sibling | null;
  onCancel: () => void;
  onSave: (sibling: Sibling) => void;
};

export default function LoginDialog({ initial, onCancel, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [curl, setCurl] = useState(initial?.scheduleCurl ?? "");

  const canSave =
    name.trim().length > 0 &&
    curl.trim().includes("ShotefSchedualeDataForToday");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave({ name: name.trim(), scheduleCurl: curl.trim() });
        }}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-neutral-900/95 backdrop-blur-xl ring-1 ring-white/10"
      >
        <div className="overflow-y-auto p-6 sm:p-8">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">
            הגדרת לוח שעות
          </h2>
          <p className="mb-5 text-sm text-white/60">
            הדבק כאן את ה-cURL של בקשת מערכת השעות מהדפדפן. הסשן תקף בדרך כלל
            לכמה שבועות; כשפג תוקפו צריך להדביק חדש.
          </p>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm text-white/60">
              שם להצגה
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: ליה"
              autoFocus
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-lg outline-none focus:bg-white/15"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-sm text-white/60">
              cURL של ShotefSchedualeDataForToday
            </span>
            <textarea
              value={curl}
              onChange={(e) => setCurl(e.target.value)}
              dir="ltr"
              spellCheck={false}
              rows={8}
              placeholder="curl 'https://webtopserver.smartschool.co.il/server/api/dashboard/ShotefSchedualeDataForToday' ..."
              className="w-full rounded-xl bg-white/10 px-3 py-2.5 font-mono text-xs outline-none focus:bg-white/15"
            />
          </label>

          <details className="mb-2 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
            <summary className="cursor-pointer text-sm text-white/70">
              איך משיגים את ה-cURL?
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pr-5 text-xs text-white/60">
              <li>פתח Chrome ועבור ל-webtop.smartschool.co.il, התחבר עם החשבון של האח/ות</li>
              <li>לחץ F12 → לשונית Network → סמן &quot;Preserve log&quot; → סנן ל-Fetch/XHR</li>
              <li>נווט לעמוד מערכת השעות</li>
              <li>בחר את הבקשה <code className="rounded bg-white/10 px-1">ShotefSchedualeDataForToday</code></li>
              <li>קליק ימני → Copy → Copy as cURL (bash) → הדבק כאן</li>
            </ol>
          </details>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 bg-black/20 p-4 sm:p-5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white/10 px-5 py-2.5 text-base hover:bg-white/20"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-full bg-white px-5 py-2.5 text-base font-medium text-neutral-950 hover:bg-white/90 disabled:opacity-40"
          >
            שמור
          </button>
        </div>
      </form>
    </div>
  );
}
