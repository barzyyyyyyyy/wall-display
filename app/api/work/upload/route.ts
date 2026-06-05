import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { hasRedis, redis } from "@/lib/redis";
import type { WorkShift, WorkState } from "@/lib/work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Gemini calls + retries can take a while

const STATE_KEY = "state:work";

const PROMPT = `You are looking at a weekly work schedule (likely written in Hebrew, formatted as a table or list).

Task: Find every work shift assigned to the person named "יואב" (Yoav).

Return ONLY a JSON array, in this exact shape:
[{"day": 0-6, "startTime": "HH:MM", "endTime": "HH:MM"}]

Rules:
- Day numbering: 0 = יום ראשון (Sunday), 1 = יום שני (Monday), 2 = יום שלישי (Tuesday), 3 = יום רביעי (Wednesday), 4 = יום חמישי (Thursday), 5 = יום שישי (Friday), 6 = שבת (Saturday).
- Times in 24-hour format ("08:30", "17:00"). No AM/PM.
- If a single day has multiple separate shifts (e.g. morning + evening), output one object per shift.
- If you cannot find any shift for יואב, return [].
- Output nothing except the JSON array — no markdown fences, no commentary.`;

export async function POST(req: Request) {
  let body: { image?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const image = body.image?.trim();
  const mimeType = body.mimeType || "image/jpeg";
  if (!image) {
    return NextResponse.json(
      { ok: false, error: "missing image" },
      { status: 400 },
    );
  }

  try {
    const text = await callGemini([
      { text: PROMPT },
      { inline_data: { mime_type: mimeType, data: image } },
    ]);

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not find a JSON array in the AI response.",
          raw: text.slice(0, 400),
        },
        { status: 500 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "AI response was not valid JSON",
          raw: text.slice(0, 400),
        },
        { status: 500 },
      );
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { ok: false, error: "AI response was not an array" },
        { status: 500 },
      );
    }

    const shifts: WorkShift[] = parsed
      .filter(
        (s): s is WorkShift =>
          !!s &&
          typeof (s as WorkShift).day === "number" &&
          (s as WorkShift).day >= 0 &&
          (s as WorkShift).day <= 6 &&
          typeof (s as WorkShift).startTime === "string" &&
          /^\d{1,2}:\d{2}$/.test((s as WorkShift).startTime) &&
          typeof (s as WorkShift).endTime === "string" &&
          /^\d{1,2}:\d{2}$/.test((s as WorkShift).endTime),
      )
      .map((s) => ({
        day: s.day,
        startTime: s.startTime.padStart(5, "0"),
        endTime: s.endTime.padStart(5, "0"),
      }))
      .sort((a, b) =>
        a.day !== b.day
          ? a.day - b.day
          : a.startTime.localeCompare(b.startTime),
      );

    const state: WorkState = { shifts, updatedAt: Date.now() };
    if (hasRedis() && redis) {
      await redis.set(STATE_KEY, JSON.stringify(state));
    }

    return NextResponse.json({ ok: true, shifts });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
