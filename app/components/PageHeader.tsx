import Link from "next/link";

type Accent = "amber" | "emerald" | "sky" | "violet" | "orange" | "neutral";

const accentDot: Record<Accent, string> = {
  amber:
    "bg-gradient-to-br from-amber-300 to-orange-400 shadow-[0_0_16px_rgba(252,211,77,0.7)]",
  emerald:
    "bg-gradient-to-br from-emerald-300 to-green-400 shadow-[0_0_16px_rgba(110,231,183,0.7)]",
  sky: "bg-gradient-to-br from-sky-300 to-cyan-400 shadow-[0_0_16px_rgba(125,211,252,0.7)]",
  violet:
    "bg-gradient-to-br from-violet-300 to-purple-400 shadow-[0_0_16px_rgba(196,181,253,0.7)]",
  orange:
    "bg-gradient-to-br from-orange-300 to-red-400 shadow-[0_0_16px_rgba(253,186,116,0.7)]",
  neutral: "bg-white/60",
};

export default function PageHeader({
  title,
  accent = "neutral",
  extra,
}: {
  title: string;
  accent?: Accent;
  extra?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-2 pb-3">
      <Link
        href="/"
        aria-label="חזרה לבית"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 text-white transition-all hover:bg-white/20 active:scale-90 active:bg-white/30"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
      <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
        <span
          className={`inline-block h-3 w-3 rounded-full ${accentDot[accent]}`}
        />
        {title}
      </h1>
      <div className="flex h-11 min-w-11 items-center justify-end">{extra}</div>
    </header>
  );
}
