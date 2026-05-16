#!/usr/bin/env node
// Re-runs each sibling's captured Webtop cURL from your home computer's IP
// (which the Webtop WAF allows), then pushes the resulting schedule to the
// wall-display app on Vercel. Schedule it via Windows Task Scheduler to keep
// the display fresh — see README.md.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "config.json");

if (!fs.existsSync(CONFIG_PATH)) {
  console.error(
    `[update-schedule] config.json not found at ${CONFIG_PATH}\n` +
      `Copy config.example.json to config.json and fill it in.`,
  );
  process.exit(1);
}

/** @typedef {{day:number,period:number,subject:string,teacher?:string,room?:string}} Lesson */

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

function log(...args) {
  const ts = new Date().toLocaleString("he-IL", { hour12: false });
  console.log(`[${ts}]`, ...args);
}

function parseCurl(text) {
  const cleaned = text.replace(/\\\s*\r?\n\s*/g, " ");
  const urlMatch = cleaned.match(/\bcurl\s+(?:--?\w+\s+)*['"]([^'"]+)['"]/);
  const url = urlMatch?.[1] ?? "";

  const headers = {};
  const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = headerRegex.exec(cleaned)) !== null) {
    const line = m[1];
    const colon = line.indexOf(":");
    if (colon > 0) {
      const name = line.slice(0, colon).trim();
      const value = line.slice(colon + 1).trim();
      if (value) headers[name.toLowerCase()] = value;
    }
  }
  const cookieMatch = cleaned.match(/-b\s+['"]([^'"]+)['"]/);
  if (cookieMatch) headers["cookie"] = cookieMatch[1];

  let body = "";
  const bodyMatch = cleaned.match(/--data-raw\s+(['"])([\s\S]*?)\1/);
  if (bodyMatch) body = bodyMatch[2];

  return { url, headers, body };
}

function cleanSubject(s) {
  return (s ?? "").replace(/``/g, "״").trim();
}

/** Parse Webtop's ShotefSchedualeDataForToday response into our Lesson[] shape. */
function parseScheduleResponse(json) {
  if (!json?.status || !json?.data) {
    throw new Error(json?.errorDescription ?? json?.message ?? "Webtop returned an error");
  }
  const dayObj = json.data.scheduale?.[0];
  if (!dayObj) return [];

  const lessons /** @type {Lesson[]} */ = [];
  for (const slot of dayObj.hoursData ?? []) {
    if (!slot.scheduale || slot.scheduale.length === 0) continue;
    const first = slot.scheduale[0];
    const teacher = [first.teacherPrivateName, first.teacherLastName]
      .filter((p) => p && String(p).trim().length > 0)
      .join(" ");
    lessons.push({
      day: dayObj.dayIndex - 1, // Webtop 1=Sun → JS 0=Sun
      period: slot.hour,
      subject: cleanSubject(first.subject ?? ""),
      teacher: teacher || undefined,
      room: first.room ?? undefined,
    });
  }
  return lessons;
}

async function fetchSiblingLessons(curlText) {
  const { url, headers, body } = parseCurl(curlText);
  if (!url) throw new Error("Could not parse URL from cURL");

  // Drop browser-only sec-* headers that some fetch impls complain about
  // (Node 18+ generally allows them, but they're noise.)
  delete headers["accept-encoding"];

  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) {
    const preview = await res.text().catch(() => "");
    throw new Error(`Webtop HTTP ${res.status}: ${preview.slice(0, 200)}`);
  }
  const json = await res.json();
  return parseScheduleResponse(json);
}

async function uploadToServer({ slot, name, lessons }) {
  const res = await fetch(config.uploadUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sync-secret": config.uploadKey,
    },
    body: JSON.stringify({ slot, name, lessons }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}


async function processSibling(sib) {
  try {
    const lessons = await fetchSiblingLessons(sib.curl);
    if (lessons.length === 0) {
      log(`⚠ ${sib.name}: Webtop returned 0 lessons (weekend or holiday?). Skipping upload.`);
      return;
    }
    const result = await uploadToServer({ slot: sib.slot, name: sib.name, lessons });
    log(
      `✓ ${sib.name} (${sib.slot}): pulled ${lessons.length} lessons, total now ${result.totalLessons}`,
    );
  } catch (e) {
    log(`✗ ${sib.name} (${sib.slot}): ${e.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  if (!config.uploadUrl || !config.uploadKey) {
    console.error("config.json missing uploadUrl or uploadKey");
    process.exit(1);
  }
  if (!Array.isArray(config.siblings) || config.siblings.length === 0) {
    console.error("config.json has no siblings");
    process.exit(1);
  }
  log(`Running for ${config.siblings.length} sibling(s)`);
  for (const sib of config.siblings) {
    await processSibling(sib);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
