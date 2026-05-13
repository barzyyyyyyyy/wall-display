import { NextResponse } from "next/server";
import type { ScheduleResponse } from "@/lib/types";
import { fetchWebtopSchedule } from "@/lib/webtop";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse<ScheduleResponse>> {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Missing username or password" },
      { status: 400 },
    );
  }

  try {
    const schedule = await fetchWebtopSchedule(username, password);
    return NextResponse.json({ ok: true, schedule });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
