import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import type { SkincareSteps } from "@/lib/skincare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROMPT = `You are looking at a skincare routine (likely written in Hebrew). It defines steps for FOUR phases of a 2-day rotation:

1. יום 1 בוקר  — Day 1 Morning
2. יום 1 ערב   — Day 1 Evening
3. יום 2 בוקר  — Day 2 Morning
4. יום 2 ערב   — Day 2 Evening

The image may use any layout (table, grid, list) and labels like "יום 1"/"יום א'"/"יום ראשון", "בוקר"/"AM", "ערב"/"לילה"/"PM".

Return ONLY a JSON object with this exact shape (no markdown, no commentary):

{"day1Morning":["..."],"day1Evening":["..."],"day2Morning":["..."],"day2Evening":["..."]}

Rules:
- Each step is one short string in the original language of the image (likely Hebrew).
- Preserve product names exactly as written.
- If a phase has no steps in the image, use an empty array [].
- Don't invent steps that aren't in the image.`;

export async function POST(req: Request) {
  let body: { image?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
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

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not find a JSON object in the AI response.",
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

    const normalize = (v: unknown): string[] =>
      Array.isArray(v)
        ? v
            .map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter((s) => s.length > 0)
        : [];

    const p = parsed as Record<string, unknown>;
    const steps: SkincareSteps = {
      day1Morning: normalize(p.day1Morning),
      day1Evening: normalize(p.day1Evening),
      day2Morning: normalize(p.day2Morning),
      day2Evening: normalize(p.day2Evening),
    };

    return NextResponse.json({ ok: true, steps });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown error" },
      { status: 500 },
    );
  }
}
