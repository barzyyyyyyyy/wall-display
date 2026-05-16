export type Lesson = {
  day: number; // 0 = Sun, 6 = Sat
  period: number;
  subject: string;
  teacher?: string;
  room?: string;
};

export type Sibling = {
  name: string;
  lessons: Lesson[];
};

export type SchoolConfig = {
  left: Sibling | null;
  right: Sibling | null;
};
