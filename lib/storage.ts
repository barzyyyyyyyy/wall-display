import type { SchoolConfig } from "./types";

const KEY = "wall-display.school.config";

const EMPTY: SchoolConfig = { left: null, right: null };

export function loadSchoolConfig(): SchoolConfig {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return JSON.parse(raw) as SchoolConfig;
  } catch {
    return EMPTY;
  }
}

export function saveSchoolConfig(config: SchoolConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(config));
}

export function clearSlot(slot: "left" | "right") {
  const config = loadSchoolConfig();
  config[slot] = null;
  saveSchoolConfig(config);
}
