"use client";

import { useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import LiveTime from "@/app/components/LiveTime";
import { DEFAULT_SCHOOL_CONFIG } from "@/lib/storage";
import type { SchoolConfig, Sibling } from "@/lib/types";
import { useSharedState } from "@/lib/use-shared-state";
import SiblingColumn from "./SiblingColumn";
import ScheduleEditor from "./ScheduleEditor";

type Slot = "left" | "right";

// Migrate any older Sibling shape (e.g. {name, username, password}) to the
// new lessons-based shape. Old credentials are discarded.
function normalize(s: Sibling | null): Sibling | null {
  if (!s) return null;
  if (Array.isArray(s.lessons)) return { name: s.name, lessons: s.lessons };
  return { name: s.name, lessons: [] };
}

export default function SchoolPage() {
  const { state: config, setState: setConfig } = useSharedState<SchoolConfig>(
    "school",
    DEFAULT_SCHOOL_CONFIG,
  );
  const [editing, setEditing] = useState<Slot | null>(null);

  const handleSave = (slot: Slot, sibling: Sibling) => {
    setConfig((c) => ({ ...c, [slot]: sibling }));
    setEditing(null);
  };

  const handleRemove = (slot: Slot) => {
    setConfig((c) => ({ ...c, [slot]: null }));
  };

  return (
    <main className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
      <PageHeader
        title="בית ספר 📚"
        accent="amber"
        extra={<LiveTime className="text-base font-medium text-white/70" />}
      />
      <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 overflow-y-auto sm:grid-cols-2 sm:gap-4 sm:overflow-visible">
        {(["right", "left"] as const).map((slot) => (
          <SiblingColumn
            key={slot}
            sibling={normalize(config[slot])}
            onAdd={() => setEditing(slot)}
            onEdit={() => setEditing(slot)}
            onRemove={() => handleRemove(slot)}
          />
        ))}
      </div>
      {editing && (
        <ScheduleEditor
          initial={normalize(config[editing])}
          onCancel={() => setEditing(null)}
          onSave={(sibling) => handleSave(editing, sibling)}
        />
      )}
    </main>
  );
}
