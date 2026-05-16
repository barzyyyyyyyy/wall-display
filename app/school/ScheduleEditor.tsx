"use client";

import { useState } from "react";
import type { Lesson, Sibling } from "@/lib/types";

const DAY_TABS = [
  { idx: 0, label: "א׳" },
  { idx: 1, label: "ב׳" },
  { idx: 2, label: "ג׳" },
  { idx: 3, label: "ד׳" },
  { idx: 4, label: "ה׳" },
  { idx: 5, label: "ו׳" },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Props = {
  initial: Sibling | null;
  onCancel: () => void;
  onSave: (sibling: Sibling) => void;
};

type Field = "subject" | "teacher" | "room";

function getLesson(
  lessons: Lesson[],
  day: number,
  period: number,
): Lesson | undefined {
  return lessons.find((l) => l.day === day && l.period === period);
}

function setLessonField(
  lessons: Lesson[],
  day: number,
  period: number,
  field: Field,
  value: string,
): Lesson[] {
  const idx = lessons.findIndex((l) => l.day === day && l.period === period);
  if (idx === -1) {
    if (field !== "subject" || !value.trim()) return lessons;
    return [...lessons, { day, period, subject: value }];
  }
  const next = { ...lessons[idx], [field]: value };
  if (field === "subject" && !value.trim()) {
    return [...lessons.slice(0, idx), ...lessons.slice(idx + 1)];
  }
  // Clean up empty optional fields
  if (!next.teacher?.trim()) delete next.teacher;
  if (!next.room?.trim()) delete next.room;
  return [...lessons.slice(0, idx), next, ...lessons.slice(idx + 1)];
}

export default function ScheduleEditor({ initial, onCancel, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [lessons, setLessons] = useState<Lesson[]>(initial?.lessons ?? []);
  const [activeDay, setActiveDay] = useState(0);

  const canSave = name.trim().length > 0;
  const dayLessons = lessons.filter((l) => l.day === activeDay);

  const update = (period: number, field: Field, value: string) => {
    setLessons((prev) => setLessonField(prev, activeDay, period, field, value));
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), lessons });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-8">
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-neutral-900/95 backdrop-blur-xl ring-1 ring-white/10">
        {/* Header */}
        <div className="border-b border-white/10 p-5 sm:p-6">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight">
            {initial ? "עריכת מערכת שעות" : "הוסף משתמש חדש"}
          </h2>
          <label className="block">
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
        </div>

        {/* Day tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-2 sm:px-5">
          {DAY_TABS.map((d) => {
            const count = lessons.filter((l) => l.day === d.idx).length;
            const active = activeDay === d.idx;
            return (
              <button
                key={d.idx}
                type="button"
                onClick={() => setActiveDay(d.idx)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                <span>יום {d.label}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-xs ${
                      active ? "bg-amber-300/30" : "bg-white/15"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lesson rows */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <p className="mb-3 px-1 text-xs text-white/40">
            השאר שדה ריק כדי להשמיט שיעור. שעות התחלה/סיום מחושבות אוטומטית.
          </p>
          <div className="flex flex-col gap-2">
            {PERIODS.map((period) => {
              const lesson = getLesson(lessons, activeDay, period);
              return (
                <div
                  key={period}
                  className="flex items-center gap-2 rounded-2xl bg-white/[0.04] p-2 ring-1 ring-white/10"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold tabular-nums">
                    {period}
                  </div>
                  <input
                    value={lesson?.subject ?? ""}
                    onChange={(e) => update(period, "subject", e.target.value)}
                    placeholder="מקצוע"
                    className="flex-1 min-w-0 rounded-lg bg-white/[0.06] px-3 py-2 text-base outline-none focus:bg-white/10"
                  />
                  <input
                    value={lesson?.teacher ?? ""}
                    onChange={(e) => update(period, "teacher", e.target.value)}
                    placeholder="מורה"
                    disabled={!lesson?.subject}
                    className="w-28 sm:w-40 rounded-lg bg-white/[0.06] px-3 py-2 text-sm outline-none focus:bg-white/10 disabled:opacity-30"
                  />
                  <input
                    value={lesson?.room ?? ""}
                    onChange={(e) => update(period, "room", e.target.value)}
                    placeholder="חדר"
                    disabled={!lesson?.subject}
                    className="hidden w-24 rounded-lg bg-white/[0.06] px-3 py-2 text-sm outline-none focus:bg-white/10 disabled:opacity-30 sm:block"
                  />
                </div>
              );
            })}
          </div>

          {dayLessons.length === 0 && (
            <p className="mt-4 text-center text-sm text-white/40">
              אין שיעורים ביום זה
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/20 p-4 sm:p-5">
          <span className="text-xs text-white/40">
            {lessons.length} שיעורים בסך הכל
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full bg-white/10 px-5 py-2.5 text-base hover:bg-white/20"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-full bg-white px-5 py-2.5 text-base font-medium text-neutral-950 hover:bg-white/90 disabled:opacity-40"
            >
              שמור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
