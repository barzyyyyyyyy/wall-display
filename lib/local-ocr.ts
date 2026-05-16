"use client";

import type { WorkShift } from "./work";

// Each canonical Hebrew day name + the single-letter abbreviation maps to a day index.
const DAY_NAMES: Record<string, number> = {
  ראשון: 0,
  שני: 1,
  שלישי: 2,
  רביעי: 3,
  חמישי: 4,
  שישי: 5,
  שבת: 6,
  א: 0,
  ב: 1,
  ג: 2,
  ד: 3,
  ה: 4,
  ו: 5,
  ש: 6,
};

type Bbox = { x0: number; y0: number; x1: number; y1: number } | undefined;

export type DayHeader = { day: number; cx: number; text: string };

export type ScanDiagnostics = {
  rawText: string;
  yoavLines: string[];
  dayHeaders: DayHeader[];
};

export type LocalScanResult = {
  shifts: WorkShift[];
  diagnostics: ScanDiagnostics;
};

export type ScanProgress = { phase: string; progress: number };

function bboxCenter(b: Bbox): number {
  return b ? (b.x0 + b.x1) / 2 : 0;
}

function normalizeTime(hourStr: string, minStr: string): string | null {
  const h = parseInt(hourStr, 10);
  const m = parseInt(minStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Match "10:00-17:00", "10:00–17:00", "10-17", "10.00 - 17.00", etc.
const TIME_RANGE =
  /(\d{1,2})[:.]?(\d{2})?\s*[-–—]\s*(\d{1,2})[:.]?(\d{2})?/;

function parseTimeRange(
  text: string,
): { start: string; end: string } | null {
  const m = text.match(TIME_RANGE);
  if (!m) return null;
  const start = normalizeTime(m[1], m[2] ?? "00");
  const end = normalizeTime(m[3], m[4] ?? "00");
  if (!start || !end) return null;
  return { start, end };
}

export async function scanScheduleLocally(
  file: File,
  onProgress?: (p: ScanProgress) => void,
): Promise<LocalScanResult> {
  onProgress?.({ phase: "loading library", progress: 0 });
  // Heavy library — only load when actually scanning.
  const { createWorker } = await import("tesseract.js");

  onProgress?.({ phase: "loading hebrew model", progress: 0 });
  // tesseract.js v6: createWorker(langs, oem, options)
  const worker = await createWorker(["heb", "eng"], 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (typeof m.progress === "number" && m.status) {
        onProgress?.({ phase: m.status, progress: m.progress });
      }
    },
  });

  type WordLike = { text?: string; bbox?: Bbox };
  type LineLike = { text?: string; bbox?: Bbox; words?: WordLike[] };
  type OcrData = {
    text?: string;
    lines?: LineLike[];
    words?: WordLike[];
    blocks?: Array<{
      paragraphs?: Array<{
        lines?: LineLike[];
      }>;
    }>;
  };

  let data: OcrData;
  try {
    // v6: pass output options to get block/line/word data with bboxes.
    const recognized = await worker.recognize(file, undefined, {
      blocks: true,
    } as unknown as Parameters<typeof worker.recognize>[2]);
    data = recognized.data as unknown as OcrData;
  } finally {
    await worker.terminate();
  }

  onProgress?.({ phase: "parsing", progress: 1 });

  // Flatten lines/words from blocks if present, otherwise use top-level.
  const allLines: LineLike[] = [];
  const allWords: WordLike[] = [];
  if (data.blocks && data.blocks.length > 0) {
    for (const block of data.blocks) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          allLines.push(line);
          for (const w of line.words ?? []) allWords.push(w);
        }
      }
    }
  }
  if (allLines.length === 0 && data.lines) allLines.push(...data.lines);
  if (allWords.length === 0 && data.words) allWords.push(...data.words);

  // 1. Detect day-header words (single Hebrew letters or full day names).
  const dayHeaders: DayHeader[] = [];
  for (const w of allWords) {
    const t = (w.text ?? "").trim();
    if (!t) continue;
    const letterMatch = t.match(/^([אבגדהוש])[׳'`]?$/);
    if (letterMatch && letterMatch[1] in DAY_NAMES) {
      dayHeaders.push({
        day: DAY_NAMES[letterMatch[1]],
        cx: bboxCenter(w.bbox),
        text: t,
      });
      continue;
    }
    const fullMatch = t.match(
      /^(?:יום\s+)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)$/,
    );
    if (fullMatch && fullMatch[1] in DAY_NAMES) {
      dayHeaders.push({
        day: DAY_NAMES[fullMatch[1]],
        cx: bboxCenter(w.bbox),
        text: t,
      });
    }
  }

  // De-duplicate day headers: if the same day appears multiple times keep
  // the one closest to the top of the image (header row).
  const dedupedHeaders = new Map<number, DayHeader>();
  for (const h of dayHeaders) {
    if (!dedupedHeaders.has(h.day)) dedupedHeaders.set(h.day, h);
  }
  const headers = Array.from(dedupedHeaders.values());

  // 2. Find lines that mention יואב.
  const yoavLines: LineLike[] = [];
  for (const line of allLines) {
    if ((line.text ?? "").includes("יואב")) yoavLines.push(line);
  }

  // 3. Extract time ranges from each Yoav line and assign each to a day
  //    based on x-position (nearest header).
  const shifts: WorkShift[] = [];
  const assignDay = (cx: number): number => {
    if (headers.length === 0) return 0;
    let best = headers[0];
    let bestDist = Math.abs(cx - best.cx);
    for (let i = 1; i < headers.length; i++) {
      const d = Math.abs(cx - headers[i].cx);
      if (d < bestDist) {
        best = headers[i];
        bestDist = d;
      }
    }
    return best.day;
  };

  for (const line of yoavLines) {
    // Walk words; sometimes a time range is a single word ("10:00-17:00"),
    // sometimes it's spread across multiple words. Try both.
    const words = line.words ?? [];

    // Pass 1: time range fully contained in a single word.
    for (const w of words) {
      const t = (w.text ?? "").trim();
      if (!t) continue;
      const range = parseTimeRange(t);
      if (range) {
        shifts.push({
          day: assignDay(bboxCenter(w.bbox)),
          startTime: range.start,
          endTime: range.end,
        });
      }
    }

    // Pass 2: time range that may span words ("10:00 - 17:00"). Scan the
    // whole line text and re-find positions roughly.
    const lineText = line.text ?? "";
    const matches = [...lineText.matchAll(new RegExp(TIME_RANGE, "g"))];
    for (const m of matches) {
      const range = (() => {
        const s = normalizeTime(m[1], m[2] ?? "00");
        const e = normalizeTime(m[3], m[4] ?? "00");
        return s && e ? { start: s, end: e } : null;
      })();
      if (!range) continue;
      // Skip if we already captured this exact range via a single word.
      const dup = shifts.some(
        (s) => s.startTime === range.start && s.endTime === range.end,
      );
      if (dup) continue;
      // We don't have a precise x for multi-word matches; use line center.
      shifts.push({
        day: assignDay(bboxCenter(line.bbox)),
        startTime: range.start,
        endTime: range.end,
      });
    }
  }

  // De-duplicate exact (day, start, end) triples.
  const seen = new Set<string>();
  const unique: WorkShift[] = [];
  for (const s of shifts) {
    const k = `${s.day}|${s.startTime}|${s.endTime}`;
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(s);
    }
  }
  unique.sort((a, b) =>
    a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime),
  );

  return {
    shifts: unique,
    diagnostics: {
      rawText: data.text ?? "",
      yoavLines: yoavLines.map((l) => l.text ?? ""),
      dayHeaders: headers,
    },
  };
}
