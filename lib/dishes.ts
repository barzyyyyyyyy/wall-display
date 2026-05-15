import { newId } from "./util";

export type DishesPerson = { id: string; name: string };

export type DishesState = {
  pattern: DishesPerson[];
  queue: DishesPerson[];
  highlight: boolean;
};

export const DEFAULT_DISHES: DishesState = {
  pattern: [],
  queue: [],
  highlight: false,
};

export const MAX_PATTERN = 10;
export const QUEUE_LENGTH = 10;

export function buildQueue(pattern: DishesPerson[]): DishesPerson[] {
  if (pattern.length === 0) return [];
  const out: DishesPerson[] = [];
  for (let i = 0; i < QUEUE_LENGTH; i++) {
    out.push({ id: newId(), name: pattern[i % pattern.length].name });
  }
  return out;
}
