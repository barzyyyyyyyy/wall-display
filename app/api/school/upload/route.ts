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

// Coerce any previously-stored value into a Sibling shape with a real
// lessons array. Handles the older { name, username, password } format too.
function normalizeSibling(value: unknown): Sibling | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const name = typeof v.name === "string" ? v.name : "";
  const lessons = Array.isArray(v.lessons) ? (v.lessons as Lesson[]) : [];
  return { name, lessons };
}

export async function POST(req: Request) {
  const auth = req.headers.get("x-sync-secret");
  if (!process.env.SYNC_SECRET || auth !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasRedis() || !redis) {
    return NextResponse.json(
      { error: "database not configured" },
      { status: 500 },
    );
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

  try {
    // Load and normalize existing config (handles legacy shapes).
    let existing: SchoolConfig = { left: null, right: null };
    const raw = await redis.get(STATE_KEY);
    if (raw) {
      const parsed =
        typeof raw === "string" ? JSON.parse(raw) : (raw as unknown);
      if (parsed && typeof parsed === "object") {
        const p = parsed as Record<string, unknown>;
        existing = {
          left: normalizeSibling(p.left),
          right: normalizeSibling(p.right),
        };
      }
    }

    const current: Sibling | null = existing[slot];

    let mergedLessons: Lesson[];
    if (replaceAll || !current) {
      mergedLessons = lessons;
    } else {
      const replacedDays = new Set(lessons.map((l) => l.day));
      mergedLessons = [
        ...current.lessons.filter((l) => !replacedDays.has(l.day)),
        ...lessons,
      ];
    }

    const next: SchoolConfig = {
      ...existing,
      [slot]: {
        name: name ?? current?.name ?? "",
        lessons: mergedLessons,
      },
    };

    await redis.set(STATE_KEY, JSON.stringify(next));

    return NextResponse.json({
      ok: true,
      slot,
      name: next[slot]?.name,
      lessonsInPayload: lessons.length,
      totalLessons: mergedLessons.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json(
      { error: `upload failed: ${message}` },
      { status: 500 },
    );
  }
}
