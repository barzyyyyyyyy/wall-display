import { newId } from "./util";

export type DishesPerson = { id: string; name: string };

export type DishesState = {
  pattern: DishesPerson[];
  queue: DishesPerson[];
  highlight: boolean;
};

const KEY = "wall-display.dishes";
const EMPTY: DishesState = { pattern: [], queue: [], highlight: false };

export const MAX_PATTERN = 10;
export const QUEUE_LENGTH = 10;

type LegacyState = {
  pattern?: DishesPerson[];
  queue?: DishesPerson[];
  highlight?: boolean;
};

export function loadDishes(): DishesState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as LegacyState;
    const pattern = parsed.pattern ?? parsed.queue ?? [];
    const queue =
      parsed.pattern && parsed.queue ? parsed.queue : buildQueue(pattern);
    return { pattern, queue, highlight: parsed.highlight ?? false };
  } catch {
    return EMPTY;
  }
}

export function saveDishes(state: DishesState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function buildQueue(pattern: DishesPerson[]): DishesPerson[] {
  if (pattern.length === 0) return [];
  const out: DishesPerson[] = [];
  for (let i = 0; i < QUEUE_LENGTH; i++) {
    out.push({ id: newId(), name: pattern[i % pattern.length].name });
  }
  return out;
}
