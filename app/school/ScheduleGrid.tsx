"use client";

import { useEffect, useState } from "react";
import type { Lesson, Schedule } from "@/lib/types";
import { periodTimes, toMinutes } from "@/lib/periods";

type LessonWithTimes = Lesson & { start: string; end: string };
type Status = "past" | "current" | "upcoming";

function enrich(lesson: Lesson): LessonWithTimes | null {
  const explicit =
    lesson.startTime && lesson.endTime
      ? { start: lesson.startTime, end: lesson.endTime }
      : null;
  const times = explicit ?? periodTimes(lesson.period);
  if (!times) return null;
  return { ...lesson, start: times.start, end: times.end };
}

function statusOf(l: LessonWithTimes, nowMin: number): Status {
  const start = toMinutes(l.start);
  const end = toMinutes(l.end);
  if (nowMin < start) return "upcoming";
  if (nowMin >= end) return "past";
  return "current";
}

export default function ScheduleGrid({ schedule }: { schedule: Schedule }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const lessons = schedule.lessons
    .map(enrich)
    .filter((l): l is LessonWithTimes => l !== null)
    .sort((a, b) => a.period - b.period);

  if (lessons.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-3xl text-white/70">אין שיעורים</p>
        {schedule.dayName && (
          <p className="text-base text-white/40">{schedule.dayName}</p>
        )}
      </div>
    );
  }

  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {schedule.dayName && (
        <p className="mb-2 px-1 text-sm text-white/40">{schedule.dayName}</p>
      )}
      <div className="grid min-h-0 flex-1 auto-rows-fr gap-2">
        {lessons.map((lesson) => {
          const status = statusOf(lesson, nowMin);
          return (
            <LessonRow key={lesson.period} lesson={lesson} status={status} />
          );
        })}
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  status,
}: {
  lesson: LessonWithTimes;
  status: Status;
}) {
  const base =
    "flex items-center gap-4 rounded-2xl px-5 ring-1 transition-colors min-h-0";
  const styles: Record<Status, string> = {
    past: "bg-white/[0.03] ring-white/5 text-white/35",
    current: "bg-white/15 ring-white/30 text-white shadow-lg shadow-black/20",
    upcoming: "bg-white/[0.07] ring-white/10 text-white",
  };

  return (
    <div className={`${base} ${styles[status]}`}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-semibold tabular-nums">
        {lesson.period}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-3xl font-semibold leading-tight">
          {lesson.subject}
        </div>
        <div className="flex flex-wrap gap-x-3 text-base opacity-70">
          {lesson.teacher && <span className="truncate">{lesson.teacher}</span>}
          {lesson.room && (
            <span className="truncate text-sm opacity-80">{lesson.room}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end text-base tabular-nums opacity-80">
        <span dir="ltr" className="font-medium">
          {lesson.start}
        </span>
        <span dir="ltr" className="text-sm opacity-60">
          {lesson.end}
        </span>
      </div>
      {status === "current" && (
        <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/25 px-3 py-1.5 text-xs font-medium text-emerald-100 ring-1 ring-emerald-400/40">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          עכשיו
        </span>
      )}
    </div>
  );
}
