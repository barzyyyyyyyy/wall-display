"use client";

import type { Sibling } from "@/lib/types";
import ScheduleGrid from "./ScheduleGrid";

type Props = {
  sibling: Sibling | null;
  onAdd: () => void;
  onEdit: () => void;
  onRemove: () => void;
};

export default function SiblingColumn({
  sibling,
  onAdd,
  onEdit,
  onRemove,
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
            aria-label="ערוך מערכת שעות"
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
        <ScheduleGrid lessons={sibling.lessons} />
      </div>
    </section>
  );
}
