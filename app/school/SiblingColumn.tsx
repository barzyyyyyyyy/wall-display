"use client";

import type { Schedule, Sibling } from "@/lib/types";
import ScheduleGrid from "./ScheduleGrid";

type Props = {
  sibling: Sibling | null;
  schedule: Schedule | null;
  loading: boolean;
  error: { message: string; tokenExpired?: boolean } | null;
  onAdd: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onRetry: () => void;
};

export default function SiblingColumn({
  sibling,
  schedule,
  loading,
  error,
  onAdd,
  onEdit,
  onRemove,
  onRetry,
}: Props) {
  if (!sibling) {
    return (
      <button
        onClick={onAdd}
        className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/15 bg-white/[0.03] text-neutral-300 hover:border-white/30 hover:bg-white/[0.06] active:bg-white/10"
      >
        <span className="text-5xl">+</span>
        <span className="text-lg">הוסף משתמש</span>
      </button>
    );
  }

  return (
    <section className="flex min-h-0 flex-col rounded-3xl bg-white/5 ring-1 ring-white/10 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="truncate text-2xl font-semibold tracking-tight">
          {sibling.name}
        </h2>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={onEdit}
            aria-label="ערוך"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            aria-label="הסר"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {loading && (
          <div className="flex flex-1 items-center justify-center text-white/50">
            טוען מערכת שעות…
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-base text-amber-200">{error.message}</p>
            {error.tokenExpired && (
              <p className="text-xs text-white/50">
                התחבר מחדש ל-Webtop בדפדפן והדבק cURL חדש.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onRetry}
                className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                נסה שוב
              </button>
              <button
                onClick={onEdit}
                className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                עדכן cURL
              </button>
            </div>
          </div>
        )}
        {!loading && !error && schedule && <ScheduleGrid schedule={schedule} />}
      </div>
    </section>
  );
}
