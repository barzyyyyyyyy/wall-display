import type { Lesson, Schedule } from "./types";
import { periodTimes } from "./periods";

interface ParsedRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

const HE_DAY_NAMES = [
  "",
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
];

/** Parse a `curl` command (Chrome's "Copy as cURL (bash)" output) into pieces. */
export function parseCurl(text: string): ParsedRequest {
  // Strip backslash line continuations
  const cleaned = text.replace(/\\\s*\r?\n\s*/g, " ");

  // URL: first single-quoted token after `curl` (may or may not have method flags)
  const urlMatch = cleaned.match(/\bcurl\s+(?:--?\w+\s+)*['"]([^'"]+)['"]/);
  const url = urlMatch?.[1] ?? "";

  // Headers (-H 'name: value')
  const headers: Record<string, string> = {};
  const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(cleaned)) !== null) {
    const line = m[1];
    const colon = line.indexOf(":");
    if (colon > 0) {
      const name = line.slice(0, colon).trim();
      const value = line.slice(colon + 1).trim();
      if (value) headers[name.toLowerCase()] = value;
    }
  }

  // Cookie can be supplied via -b 'cookie-string'
  const cookieMatch = cleaned.match(/-b\s+['"]([^'"]+)['"]/);
  if (cookieMatch) {
    headers["cookie"] = cookieMatch[1];
  }

  // Body: --data-raw '...'
  let body = "";
  const bodyMatch = cleaned.match(/--data-raw\s+['"]([\s\S]+?)['"](?:\s|$)/);
  if (bodyMatch) {
    body = bodyMatch[1];
  }

  return { url, headers, body };
}

interface WebtopApiResponse {
  status: boolean;
  data?: {
    allowToViewThis: boolean;
    scheduale: Array<{
      dayIndex: number;
      hoursData: Array<{
        hour: number;
        hourName: string | null;
        scheduale: Array<{
          day: number;
          hour: number;
          subject: string;
          teacherPrivateName?: string | null;
          teacherLastName?: string | null;
          room?: string | null;
        }>;
      }>;
    }>;
  };
  message?: string | null;
  errorId?: string | null;
  errorDescription?: string | null;
}

function cleanSubject(s: string): string {
  // Webtop encodes gershayim (״) as a doubled grave accent
  return s.replace(/``/g, "״").trim();
}

function parseScheduleJson(json: WebtopApiResponse): Schedule {
  if (!json.status || !json.data) {
    const msg =
      json.errorDescription ??
      json.message ??
      "Webtop returned an error";
    throw new Error(msg);
  }

  const dayObj = json.data.scheduale[0];
  if (!dayObj) {
    return {
      fetchedAt: Date.now(),
      dayIndex: 0,
      dayName: "",
      lessons: [],
    };
  }

  const lessons: Lesson[] = [];
  for (const slot of dayObj.hoursData) {
    if (!slot.scheduale || slot.scheduale.length === 0) continue;
    const first = slot.scheduale[0];
    const teacher = [first.teacherPrivateName, first.teacherLastName]
      .filter((p): p is string => !!p && p.length > 0)
      .join(" ");
    const times = periodTimes(slot.hour);
    lessons.push({
      period: slot.hour,
      subject: cleanSubject(first.subject ?? ""),
      teacher: teacher || undefined,
      room: first.room ?? undefined,
      startTime: times?.start,
      endTime: times?.end,
    });
  }

  return {
    fetchedAt: Date.now(),
    dayIndex: dayObj.dayIndex,
    dayName: HE_DAY_NAMES[dayObj.dayIndex] ?? "",
    lessons,
  };
}

/** Re-runs the user's captured Webtop cURL to fetch today's schedule. */
export async function fetchWebtopScheduleFromCurl(
  curlText: string,
): Promise<Schedule> {
  const parsed = parseCurl(curlText);
  if (!parsed.url) {
    throw new Error("Could not parse URL from cURL");
  }
  if (!/ShotefSchedualeDataForToday/i.test(parsed.url)) {
    throw new Error(
      "cURL must be for ShotefSchedualeDataForToday — copy that specific request from the Network tab",
    );
  }

  // Drop forbidden / unsafe headers that the browser auto-sets and that
  // Node's fetch refuses to pass through.
  const skip = new Set([
    "host",
    "connection",
    "content-length",
    "accept-encoding",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
    "sec-fetch-dest",
    "sec-fetch-mode",
    "sec-fetch-site",
  ]);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.headers)) {
    if (!skip.has(k)) headers[k] = v;
  }

  const res = await fetch(parsed.url, {
    method: "POST",
    headers,
    body: parsed.body || undefined,
    cache: "no-store",
  });

  const responseText = await res.text();

  // Try to parse as JSON regardless of status — Webtop sometimes returns
  // 200 with status:false on expiry, or a non-JSON HTML page when blocked.
  let data: WebtopApiResponse | null = null;
  try {
    data = JSON.parse(responseText) as WebtopApiResponse;
  } catch {
    /* not JSON */
  }

  if (!data) {
    // Non-JSON response means we're being blocked / error page.
    const e = new Error(
      `Webtop ${res.status}: ${responseText.slice(0, 250).replace(/\s+/g, " ")}`,
    );
    if (res.status === 401 || res.status === 403) {
      (e as Error & { tokenExpired?: boolean }).tokenExpired = true;
    }
    throw e;
  }

  if (!data.status) {
    const msg =
      data.errorDescription ?? data.message ?? "Webtop returned status:false";
    const e = new Error(msg);
    // Webtop returns status:false with various error codes on expiry.
    if (/login|session|token|אינך|מחובר|פג|תוקף/i.test(msg)) {
      (e as Error & { tokenExpired?: boolean }).tokenExpired = true;
    }
    throw e;
  }

  return parseScheduleJson(data);
}
