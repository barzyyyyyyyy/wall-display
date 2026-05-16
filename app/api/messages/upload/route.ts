import { NextResponse } from "next/server";
import { hasRedis, redis } from "@/lib/redis";
import type { MessagesState, WebtopMessage } from "@/lib/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_KEY = "state:messages";

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

  let body: { messages?: WebtopMessage[]; totalCount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { messages, totalCount } = body;
  if (!Array.isArray(messages)) {
    return NextResponse.json(
      { error: "messages must be an array" },
      { status: 400 },
    );
  }

  try {
    const next: MessagesState = {
      messages,
      totalCount: typeof totalCount === "number" ? totalCount : messages.length,
      updatedAt: Date.now(),
    };
    await redis.set(STATE_KEY, JSON.stringify(next));
    return NextResponse.json({ ok: true, count: messages.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
