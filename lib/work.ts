export type WorkShift = {
  day: number; // 0 = Sunday … 6 = Saturday
  startTime: string; // "HH:MM"
  endTime: string;
};

export type WorkState = {
  shifts: WorkShift[];
  updatedAt: number;
};

export const DEFAULT_WORK: WorkState = { shifts: [], updatedAt: 0 };
