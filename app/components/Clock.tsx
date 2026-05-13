"use client";

import { useEffect, useState } from "react";

function greetingFor(hour: number): {
  text: string;
  emoji: string;
  gradient: string;
} {
  if (hour >= 5 && hour < 12)
    return {
      text: "בוקר טוב",
      emoji: "☀️",
      gradient: "from-amber-200 via-orange-200 to-rose-200",
    };
  if (hour >= 12 && hour < 17)
    return {
      text: "צהריים טובים",
      emoji: "🌤️",
      gradient: "from-sky-200 via-cyan-200 to-emerald-200",
    };
  if (hour >= 17 && hour < 21)
    return {
      text: "ערב טוב",
      emoji: "🌆",
      gradient: "from-rose-300 via-orange-200 to-amber-200",
    };
  return {
    text: "לילה טוב",
    emoji: "🌙",
    gradient: "from-indigo-200 via-violet-200 to-sky-200",
  };
}

function format(now: Date) {
  const time = now.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return { time, date };
}

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-[10rem] leading-none">&nbsp;</div>
      </div>
    );
  }

  const { time, date } = format(now);
  const greeting = greetingFor(now.getHours());

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-8 flex items-center gap-4 text-5xl font-medium">
        <span className="animate-float text-6xl drop-shadow-[0_4px_20px_rgba(255,200,140,0.4)]">
          {greeting.emoji}
        </span>
        <span
          className={`bg-gradient-to-r bg-clip-text text-transparent ${greeting.gradient}`}
        >
          {greeting.text}
        </span>
      </div>
      <div className="text-[10rem] leading-none font-extralight tabular-nums tracking-tight text-white drop-shadow-[0_4px_60px_rgba(255,200,140,0.2)]">
        {time}
      </div>
      <div className="mt-5 text-2xl font-light text-white/70">{date}</div>
    </div>
  );
}
