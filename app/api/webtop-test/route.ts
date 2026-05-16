import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Throwaway diagnostic — checks whether Webtop's WAF will accept requests
// originating from Vercel's Edge network. Returns the upstream status + a
// short body preview so we can tell 403/HTML from a real JSON response.
export async function POST(req: Request) {
  let body: { cookie?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!body.cookie || !body.payload) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  try {
    const res = await fetch(
      "https://webtopserver.smartschool.co.il/server/api/dashboard/ShotefSchedualeDataForToday",
      {
        method: "POST",
        headers: {
          "accept": "application/json, text/plain, */*",
          "accept-language": "he-IL,he;q=0.9",
          "content-type": "application/json",
          "cookie": body.cookie,
          "language": "he",
          "origin": "https://webtop.smartschool.co.il",
          "referer": "https://webtop.smartschool.co.il/",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(body.payload),
      },
    );
    const text = await res.text();
    return NextResponse.json({
      status: res.status,
      preview: text.slice(0, 400),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "fetch failed" },
      { status: 500 },
    );
  }
}
