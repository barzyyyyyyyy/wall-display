export type Sibling = {
  name: string;
  username: string;
  password: string;
};

export type SchoolConfig = {
  left: Sibling | null;
  right: Sibling | null;
};

export type Lesson = {
  day: number;
  period: number;
  subject: string;
  teacher?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
};

export type Schedule = {
  fetchedAt: number;
  lessons: Lesson[];
};

export type ScheduleResponse =
  | { ok: true; schedule: Schedule }
  | { ok: false; error: string };
