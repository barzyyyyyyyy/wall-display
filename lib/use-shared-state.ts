"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 5000;
const QUIET_AFTER_SAVE_MS = 3000;

async function fetchValue<T>(key: string): Promise<T | null> {
  const res = await fetch(`/api/state/${key}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { value: T | null };
  const v = data.value;
  if (v === null || v === undefined) return null;
  // Upstash stores arbitrary JSON; older versions returned strings.
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  }
  return v;
}

async function pushValue<T>(key: string, value: T): Promise<void> {
  await fetch(`/api/state/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

export function useSharedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const lastSerialized = useRef<string>("");
  const lastSaveAt = useRef<number>(0);
  const saving = useRef<Promise<void> | null>(null);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const value = await fetchValue<T>(key);
      if (cancelled) return;
      if (value !== null) {
        lastSerialized.current = JSON.stringify(value);
        setState(value);
      } else {
        lastSerialized.current = JSON.stringify(initial);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Save on local change
  useEffect(() => {
    if (!loaded) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    lastSaveAt.current = Date.now();
    saving.current = pushValue(key, state).finally(() => {
      saving.current = null;
    });
  }, [state, loaded, key]);

  // Polling
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(async () => {
      if (Date.now() - lastSaveAt.current < QUIET_AFTER_SAVE_MS) return;
      if (saving.current) return;
      const fresh = await fetchValue<T>(key);
      if (fresh === null) return;
      const freshSerialized = JSON.stringify(fresh);
      if (freshSerialized === lastSerialized.current) return;
      lastSerialized.current = freshSerialized;
      setState(fresh);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loaded, key]);

  return { state, setState, loaded };
}
