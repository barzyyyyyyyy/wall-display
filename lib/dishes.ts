import { newId } from "./util";

export type DishesPerson = {
  id: string;
  name: string;
  phone?: string; // E.164 format, e.g. "+972501234567"
  callmebot?: string; // CallMeBot API key (digits)
};

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
    const p = pattern[i % pattern.length];
    out.push({
      id: newId(),
      name: p.name,
      phone: p.phone,
      callmebot: p.callmebot,
    });
  }
  return out;
}
