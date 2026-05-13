import type { Lesson, Schedule } from "./types";

// TODO: real Webtop integration — pending cURL captures from the user's browser.
export async function fetchWebtopSchedule(
  username: string,
  _password: string,
): Promise<Schedule> {
  if (process.env.WEBTOP_MOCK !== "false") {
    return mockSchedule(username);
  }
  throw new Error("Webtop integration not implemented yet");
}

function mockSchedule(username: string): Schedule {
  const subjects = [
    "מתמטיקה",
    "עברית",
    "אנגלית",
    "מדעים",
    "היסטוריה",
    "חינוך גופני",
    "תנ״ך",
    "אומנות",
    "מוזיקה",
    "מחשבים",
  ];
  const teachers = ["כהן", "לוי", "מזרחי", "פרידמן", "אברהם"];
  const lessons: Lesson[] = [];
  const seed = [...username].reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let day = 0; day <= 5; day++) {
    const periods = day === 5 ? 4 : 5 + ((seed + day) % 3);
    for (let p = 1; p <= periods; p++) {
      const subj = subjects[(seed + day * 3 + p) % subjects.length];
      const t = teachers[(seed + day + p) % teachers.length];
      lessons.push({ day, period: p, subject: subj, teacher: t });
    }
  }
  return { fetchedAt: Date.now(), lessons };
}
