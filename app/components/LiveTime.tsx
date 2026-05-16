"use client";

import { useEffect, useState } from "react";

export default function LiveTime({
  className = "",
}: {
  className?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <span className={className}>&nbsp;</span>;
  }
  const t = now.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <span dir="ltr" className={`tabular-nums ${className}`}>
      {t}
    </span>
  );
}
