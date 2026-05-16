"use client";

import PageHeader from "@/app/components/PageHeader";
import LiveTime from "@/app/components/LiveTime";
import { DEFAULT_MESSAGES, type MessagesState } from "@/lib/messages";
import { useSharedState } from "@/lib/use-shared-state";

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const time = d.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `היום, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `אתמול, ${time}`;
  const date = d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${date} ${time}`;
}

function formatUpdated(ms: number): string {
  if (!ms) return "מעולם לא";
  const d = new Date(ms);
  return d.toLocaleString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function MessagesPage() {
  const { state, loaded } = useSharedState<MessagesState>(
    "messages",
    DEFAULT_MESSAGES,
  );

  const unreadCount = state.messages.filter((m) => !m.hasRead).length;

  return (
    <main className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
      <PageHeader
        title="הודעות מוובטופ 📬"
        accent="orange"
        extra={<LiveTime className="text-base font-medium text-white/70" />}
      />

      {loaded && state.messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-3xl text-white/60">אין הודעות עדיין</p>
          <p className="max-w-md text-sm text-white/40">
            ההודעות יופיעו כאן אחרי שסקריפט הסנכרון יריץ פעם ראשונה. ראה
            scripts/README.md.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-white/40">
            <span>
              {state.messages.length} מוצגות מתוך {state.totalCount} בסה״כ
              {unreadCount > 0 && (
                <span className="ms-2 inline-block rounded-full bg-orange-400/20 px-2 py-0.5 text-orange-100 ring-1 ring-orange-300/30">
                  {unreadCount} לא נקראו
                </span>
              )}
            </span>
            <span>עודכן {formatUpdated(state.updatedAt)}</span>
          </div>

          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {state.messages.map((m, i) => (
              <li
                key={m.messageId || `${m.date}-${i}`}
                className={`flex items-start gap-3 rounded-2xl px-4 py-3 ring-1 transition-colors ${
                  m.hasRead
                    ? "bg-white/[0.03] ring-white/10"
                    : "bg-gradient-to-r from-orange-500/10 to-orange-400/[0.04] ring-orange-300/25 shadow-md shadow-orange-500/5"
                }`}
              >
                <div className="mt-1.5 flex shrink-0 items-center justify-center">
                  {m.hasRead ? (
                    <span className="h-2 w-2 rounded-full bg-white/15" />
                  ) : (
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,0.7)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span
                      className={`truncate ${
                        m.hasRead ? "text-white/40" : "text-orange-100/80"
                      }`}
                    >
                      {m.sender || "—"}
                    </span>
                    {m.hasAttachments && (
                      <span className="text-white/40">📎</span>
                    )}
                  </div>
                  <p
                    className={`truncate text-lg leading-tight ${
                      m.hasRead
                        ? "font-normal text-white/65"
                        : "font-semibold text-white"
                    }`}
                  >
                    {m.subject || "(ללא נושא)"}
                  </p>
                </div>
                <span
                  className="shrink-0 text-xs tabular-nums text-white/40"
                  dir="ltr"
                >
                  {formatDate(m.date)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
