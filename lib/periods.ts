export type TimeRange = { start: string; end: string };

// Default Israeli school period times (HH:MM). Used as a fallback
// when Webtop doesn't supply explicit start/end times per lesson.
export const DEFAULT_PERIOD_TIMES: TimeRange[] = [
  { start: "08:00", end: "08:45" }, // 1
  { start: "08:45", end: "09:30" }, // 2
  { start: "09:45", end: "10:30" }, // 3
  { start: "10:30", end: "11:15" }, // 4
  { start: "11:35", end: "12:20" }, // 5
  { start: "12:20", end: "13:05" }, // 6
  { start: "13:20", end: "14:05" }, // 7
  { start: "14:05", end: "14:50" }, // 8
  { start: "14:50", end: "15:35" }, // 9
];

export function periodTimes(period: number): TimeRange | null {
  return DEFAULT_PERIOD_TIMES[period - 1] ?? null;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
