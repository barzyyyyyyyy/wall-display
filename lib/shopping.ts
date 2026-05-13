export type ShoppingItem = { id: string; text: string };

export type ShoppingState = {
  items: ShoppingItem[];
  common: string[];
};

const KEY = "wall-display.shopping";

const DEFAULT_COMMON = [
  "חלב",
  "לחם",
  "ביצים",
  "גבינה צהובה",
  "קוטג׳",
  "חמאה",
  "עגבניות",
  "מלפפונים",
  "פירות",
  "יוגורט",
  "שמן",
  "סוכר",
];

const EMPTY: ShoppingState = { items: [], common: DEFAULT_COMMON };

export function loadShopping(): ShoppingState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as ShoppingState;
    return {
      items: parsed.items ?? [],
      common: parsed.common ?? DEFAULT_COMMON,
    };
  } catch {
    return EMPTY;
  }
}

export function saveShopping(state: ShoppingState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export { newId } from "./util";
