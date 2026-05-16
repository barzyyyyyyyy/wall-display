import { NextResponse } from "next/server";
import { hasRedis, redis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_KEYS = new Set(["shopping", "dishes", "school", "work", "messages"]);

function keyOf(name: string) {
  return `state:${name}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!VALID_KEYS.has(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }
  if (!hasRedis() || !redis) {
    return NextResponse.json(
      { error: "database not configured" },
      { status: 500 },
    );
  }
  try {
    const value = await redis.get(keyOf(key));
    return NextResponse.json({ value: value ?? null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "redis error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!VALID_KEYS.has(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }
  if (!hasRedis() || !redis) {
    return NextResponse.json(
      { error: "database not configured" },
      { status: 500 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  try {
    await redis.set(keyOf(key), JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "redis error" },
      { status: 500 },
    );
  }
}
