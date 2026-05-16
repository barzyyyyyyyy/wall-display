export type Sibling = {
  name: string;
  scheduleCurl: string;
};

export type SchoolConfig = {
  left: Sibling | null;
  right: Sibling | null;
};

export type Lesson = {
  period: number;
  subject: string;
  teacher?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
};

export type Schedule = {
  fetchedAt: number;
  dayIndex: number; // 1=Sunday, 7=Saturday (Israeli convention)
  dayName: string;
  lessons: Lesson[];
};

export type ScheduleResponse =
  | { ok: true; schedule: Schedule }
  | { ok: false; error: string; tokenExpired?: boolean };
