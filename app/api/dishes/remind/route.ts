import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { phone?: string; apiKey?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
  }

  const phone = (body.phone ?? "").replace(/\D/g, "");
  const apiKey = (body.apiKey ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!phone || !apiKey || !message) {
    return NextResponse.json(
      { ok: false, error: "missing phone, apiKey, or message" },
      { status: 400 },
    );
  }

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", message);
  url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const text = await res.text();
    const stripped = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const lower = stripped.toLowerCase();

    const looksOk =
      lower.includes("message queued") ||
      lower.includes("message sent") ||
      lower.includes("you will receive");

    if (!res.ok || !looksOk) {
      return NextResponse.json(
        { ok: false, error: stripped.slice(0, 250) },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
