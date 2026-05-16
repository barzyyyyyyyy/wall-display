"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import { DEFAULT_SCHOOL_CONFIG } from "@/lib/storage";
import type {
  Schedule,
  ScheduleResponse,
  SchoolConfig,
  Sibling,
} from "@/lib/types";
import { useSharedState } from "@/lib/use-shared-state";
import SiblingColumn from "./SiblingColumn";
import LoginDialog from "./LoginDialog";

type Slot = "left" | "right";

export default function SchoolPage() {
  const { state: config, setState: setConfig, loaded } =
    useSharedState<SchoolConfig>("school", DEFAULT_SCHOOL_CONFIG);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [schedules, setSchedules] = useState<Record<Slot, Schedule | null>>({
    left: null,
    right: null,
  });
  const [errors, setErrors] = useState<Record<Slot, string | null>>({
    left: null,
    right: null,
  });
  const [loading, setLoading] = useState<Record<Slot, boolean>>({
    left: false,
    right: false,
  });

  const fetchSchedule = useCallback(async (slot: Slot, sibling: Sibling) => {
    setLoading((s) => ({ ...s, [slot]: true }));
    setErrors((s) => ({ ...s, [slot]: null }));
    try {
      const res = await fetch("/api/webtop/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: sibling.username,
          password: sibling.password,
        }),
      });
      const data: ScheduleResponse = await res.json();
      if (!data.ok) {
        setErrors((s) => ({ ...s, [slot]: data.error }));
        return;
      }
      setSchedules((s) => ({ ...s, [slot]: data.schedule }));
    } catch (e) {
      setErrors((s) => ({
        ...s,
        [slot]: e instanceof Error ? e.message : "שגיאה בטעינה",
      }));
    } finally {
      setLoading((s) => ({ ...s, [slot]: false }));
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (config.left) fetchSchedule("left", config.left);
    if (config.right) fetchSchedule("right", config.right);
  }, [loaded, config.left, config.right, fetchSchedule]);

  const handleSave = (slot: Slot, sibling: Sibling) => {
    setConfig((c) => ({ ...c, [slot]: sibling }));
    setEditing(null);
  };

  const handleRemove = (slot: Slot) => {
    setConfig((c) => ({ ...c, [slot]: null }));
    setSchedules((s) => ({ ...s, [slot]: null }));
    setErrors((s) => ({ ...s, [slot]: null }));
  };

  return (
    <main className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
      <PageHeader title="בית ספר 📚" accent="amber" />
      <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 overflow-y-auto sm:grid-cols-2 sm:gap-4 sm:overflow-visible">
        {(["right", "left"] as const).map((slot) => (
          <SiblingColumn
            key={slot}
            sibling={config[slot]}
            schedule={schedules[slot]}
            loading={loading[slot]}
            error={errors[slot]}
            onAdd={() => setEditing(slot)}
            onEdit={() => setEditing(slot)}
            onRemove={() => handleRemove(slot)}
            onRetry={() => {
              const s = config[slot];
              if (s) fetchSchedule(slot, s);
            }}
          />
        ))}
      </div>
      {editing && (
        <LoginDialog
          initial={config[editing]}
          onCancel={() => setEditing(null)}
          onSave={(sibling) => handleSave(editing, sibling)}
        />
      )}
    </main>
  );
}
