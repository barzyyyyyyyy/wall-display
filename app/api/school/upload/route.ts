import { NextResponse } from "next/server";
import { hasRedis, redis } from "@/lib/redis";
import type { Lesson, SchoolConfig, Sibling } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_KEY = "state:school";

type UploadBody = {
  slot?: "left" | "right";
  name?: string;
  lessons?: Lesson[];
  /** When true, the lessons array replaces ALL lessons. Otherwise lessons
   *  for the day(s) present in the payload replace just those days, leaving
   *  other days untouched. */
  replaceAll?: boolean;
};

export async function POST(req: Request) {
  const auth = req.headers.get("x-sync-secret");
  if (!process.env.SYNC_SECRET || auth !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasRedis() || !redis) {
    return NextResponse.json({ error: "no db" }, { status: 500 });
  }

  let body: UploadBody;
  try {
    body = (await req.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { slot, name, lessons, replaceAll } = body;
  if (slot !== "left" && slot !== "right") {
    return NextResponse.json(
      { error: "slot must be 'left' or 'right'" },
      { status: 400 },
    );
  }
  if (!Array.isArray(lessons)) {
    return NextResponse.json(
      { error: "lessons must be an array" },
      { status: 400 },
    );
  }

  // Load existing config
  let existing: SchoolConfig = { left: null, right: null };
  try {
    const raw = await redis.get(STATE_KEY);
    if (raw) {
      existing = (typeof raw === "string" ? JSON.parse(raw) : raw) as SchoolConfig;
    }
  } catch {
    /* fall through with empty config */
  }

  const current: Sibling | null = existing[slot];

  let mergedLessons: Lesson[];
  if (replaceAll || !current) {
    mergedLessons = lessons;
  } else {
    // Replace only the days present in the new payload
    const replacedDays = new Set(lessons.map((l) => l.day));
    mergedLessons = [
      ...current.lessons.filter((l) => !replacedDays.has(l.day)),
      ...lessons,
    ];
  }

  const next: SchoolConfig = {
    ...existing,
    [slot]: { name: name ?? current?.name ?? "", lessons: mergedLessons },
  };

  await redis.set(STATE_KEY, JSON.stringify(next));

  return NextResponse.json({
    ok: true,
    slot,
    name: next[slot]?.name,
    lessonsInPayload: lessons.length,
    totalLessons: mergedLessons.length,
  });
}
