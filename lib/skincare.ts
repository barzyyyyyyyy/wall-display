export type SkincareSteps = {
  day1Morning: string[];
  day1Evening: string[];
  day2Morning: string[];
  day2Evening: string[];
};

export type SkincareSlot = 0 | 1 | 2 | 3;

export type SkincareAnchor = {
  /** Wall-clock time when the user said "now is slot X". */
  timestamp: number;
  /** Which slot was current at that timestamp. */
  slot: SkincareSlot;
};

export type SkincareState = {
  steps: SkincareSteps;
  anchor: SkincareAnchor | null;
  updatedAt: number;
};

export const DEFAULT_SKINCARE: SkincareState = {
  steps: {
    day1Morning: [],
    day1Evening: [],
    day2Morning: [],
    day2Evening: [],
  },
  anchor: null,
  updatedAt: 0,
};

export const SLOT_NAMES = [
  "יום 1 בוקר",
  "יום 1 ערב",
  "יום 2 בוקר",
  "יום 2 ערב",
] as const;

/** Local hour-of-day where "morning" ends and "evening" begins (24h, local). */
export const EVENING_HOUR = 14;

function startOfDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Decide whether a given Date falls in the morning or evening slot. */
export function isEvening(d: Date): boolean {
  return d.getHours() >= EVENING_HOUR;
}

/** Compute the slot you're in *right now* given an anchor reference. */
export function currentSlot(anchor: SkincareAnchor, now: Date): SkincareSlot {
  const anchorDate = new Date(anchor.timestamp);
  const daysSince = Math.round(
    (startOfDayMs(now) - startOfDayMs(anchorDate)) / 86_400_000,
  );
  const phaseDelta = (isEvening(now) ? 1 : 0) - (isEvening(anchorDate) ? 1 : 0);
  const totalHalfDays = daysSince * 2 + phaseDelta;
  const slot = ((((anchor.slot + totalHalfDays) % 4) + 4) % 4) as SkincareSlot;
  return slot;
}

export function getStepsForSlot(
  steps: SkincareSteps,
  slot: SkincareSlot,
): string[] {
  switch (slot) {
    case 0:
      return steps.day1Morning;
    case 1:
      return steps.day1Evening;
    case 2:
      return steps.day2Morning;
    case 3:
      return steps.day2Evening;
  }
}

export function hasAnyRoutine(steps: SkincareSteps): boolean {
  return (
    steps.day1Morning.length +
      steps.day1Evening.length +
      steps.day2Morning.length +
      steps.day2Evening.length >
    0
  );
}
