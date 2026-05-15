export type ShoppingItem = { id: string; text: string };

export type ShoppingState = {
  items: ShoppingItem[];
  common: string[];
};

export const DEFAULT_COMMON = [
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

export const DEFAULT_SHOPPING: ShoppingState = {
  items: [],
  common: DEFAULT_COMMON,
};

export { newId } from "./util";
