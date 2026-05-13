"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type MenuItem = {
  href: string;
  label: string;
  icon: string;
  iconBg: string;
  activeRing: string;
};

const items: MenuItem[] = [
  {
    href: "/school",
    label: "בית ספר",
    icon: "📚",
    iconBg: "bg-gradient-to-br from-amber-400/40 to-orange-500/30 ring-amber-300/40 shadow-amber-500/20",
    activeRing: "ring-amber-300/50 shadow-amber-500/20",
  },
  {
    href: "/shopping",
    label: "רשימת קניות",
    icon: "🛒",
    iconBg: "bg-gradient-to-br from-emerald-400/40 to-green-500/30 ring-emerald-300/40 shadow-emerald-500/20",
    activeRing: "ring-emerald-300/50 shadow-emerald-500/20",
  },
  {
    href: "/dishes",
    label: "תור מדיח",
    icon: "🍽️",
    iconBg: "bg-gradient-to-br from-sky-400/40 to-cyan-500/30 ring-sky-300/40 shadow-sky-500/20",
    activeRing: "ring-sky-300/50 shadow-sky-500/20",
  },
];

export default function SideMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`relative z-30 flex h-full shrink-0 flex-col gap-3 overflow-hidden border-l border-white/10 bg-white/[0.03] p-3 transition-[width] duration-300 ease-out ${
        open ? "w-72" : "w-20"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 text-white transition-all hover:bg-white/20 active:scale-90 active:bg-white/30"
      >
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <nav
        className={`flex flex-col gap-2 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl p-2.5 ring-1 transition-all hover:bg-white/10 active:scale-95 ${
                active
                  ? `bg-white/12 shadow-lg ${item.activeRing}`
                  : "bg-white/[0.06] ring-white/10"
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-3xl ring-1 shadow-md ${item.iconBg}`}
              >
                {item.icon}
              </div>
              <span className="whitespace-nowrap text-lg font-medium text-white">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
