import { NextResponse } from "next/server";
import type { ScheduleResponse } from "@/lib/types";
import { fetchWebtopScheduleFromCurl } from "@/lib/webtop";
import { hasRedis, redis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_SECONDS = 60 * 30; // 30 minutes

function hash(s: string): string {
  // Tiny stable hash (FNV-1a) — fine for cache keys
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16);
}

export async function POST(
  req: Request,
): Promise<NextResponse<ScheduleResponse>> {
  let body: { curl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const curl = body.curl?.trim();
  if (!curl) {
    return NextResponse.json(
      { ok: false, error: "Missing cURL" },
      { status: 400 },
    );
  }

  const cacheKey = `webtop:schedule:${hash(curl)}`;

  // Try cache first (per-cURL key — different siblings have different cURLs)
  if (hasRedis() && redis) {
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        const parsed =
          typeof cached === "string"
            ? JSON.parse(cached)
            : (cached as ScheduleResponse extends { ok: true; schedule: infer S } ? S : never);
        return NextResponse.json({ ok: true, schedule: parsed });
      }
    } catch {
      // Ignore cache errors and fall through to live fetch.
    }
  }

  try {
    const schedule = await fetchWebtopScheduleFromCurl(curl);

    if (hasRedis() && redis) {
      await redis
        .set(cacheKey, JSON.stringify(schedule), { ex: CACHE_TTL_SECONDS })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true, schedule });
  } catch (e) {
    const tokenExpired =
      e instanceof Error &&
      (e as Error & { tokenExpired?: boolean }).tokenExpired === true;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message, tokenExpired },
      { status: 500 },
    );
  }
}
