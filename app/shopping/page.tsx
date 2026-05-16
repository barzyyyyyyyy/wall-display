"use client";

import { useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import {
  DEFAULT_SHOPPING,
  newId,
  type ShoppingItem,
  type ShoppingState,
} from "@/lib/shopping";
import { useSharedState } from "@/lib/use-shared-state";

export default function ShoppingPage() {
  const { state, setState, loaded } = useSharedState<ShoppingState>(
    "shopping",
    DEFAULT_SHOPPING,
  );
  const [input, setInput] = useState("");
  const [editingPile, setEditingPile] = useState(false);
  const [newCommon, setNewCommon] = useState("");
  const [showAddCommon, setShowAddCommon] = useState(false);

  const addItem = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const exists = state.items.some(
      (i) => i.text.toLocaleLowerCase("he") === t.toLocaleLowerCase("he"),
    );
    if (exists) return;
    setState((s) => ({ ...s, items: [...s.items, { id: newId(), text: t }] }));
  };

  const removeItem = (id: string) => {
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  };

  const clearAll = () => {
    setState((s) => ({ ...s, items: [] }));
  };

  const removeCommon = (name: string) => {
    setState((s) => ({ ...s, common: s.common.filter((c) => c !== name) }));
  };

  const addCommon = (name: string) => {
    const t = name.trim();
    if (!t) return;
    if (state.common.includes(t)) return;
    setState((s) => ({ ...s, common: [...s.common, t] }));
  };

  return (
    <main className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
      <PageHeader title="רשימת קניות 🛒" accent="emerald" />

      {/* Items list — main focus, grows to fill */}
      <section className="flex min-h-0 flex-1 flex-col rounded-3xl bg-white/5 p-3 ring-1 ring-white/10 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addItem(input);
                setInput("");
              }
            }}
            placeholder="הוסף פריט…"
            className="flex-1 rounded-2xl bg-white/10 px-4 py-2.5 text-base outline-none focus:bg-white/15 sm:px-5 sm:py-3 sm:text-lg"
          />
          <button
            type="button"
            onClick={() => {
              addItem(input);
              setInput("");
            }}
            disabled={!input.trim()}
            className="rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 px-4 py-2.5 text-base font-bold text-emerald-950 shadow-md shadow-emerald-500/30 transition-all hover:from-emerald-300 hover:to-green-400 active:scale-95 disabled:opacity-40 sm:px-5 sm:py-3 sm:text-lg"
          >
            הוסף
          </button>
          {state.items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-2xl bg-white/10 px-3 py-2.5 text-sm text-white/60 hover:bg-white/20 hover:text-white sm:px-4 sm:py-3"
              aria-label="נקה הכל"
            >
              נקה
            </button>
          )}
        </div>

        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 sm:gap-2">
          {loaded && state.items.length === 0 && (
            <li className="flex flex-1 items-center justify-center px-4 text-center text-sm text-white/40 sm:text-base">
              אין פריטים. לחץ על אחד למטה כדי להוסיף.
            </li>
          )}
          {state.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </ul>
      </section>

      {/* Common items pile — bounded height on mobile so items list stays prominent */}
      <section className="mt-3 flex max-h-[40vh] shrink-0 flex-col rounded-3xl bg-white/5 p-3 ring-1 ring-white/10 sm:mt-4 sm:max-h-[45vh] sm:p-5 lg:max-h-[35vh]">
        <div className="mb-2 flex items-center justify-between sm:mb-3">
          <h2 className="text-sm font-medium text-white/70 sm:text-base">
            פריטים נפוצים
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddCommon((v) => !v)}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 sm:text-sm"
            >
              {showAddCommon ? "ביטול" : "+ חדש"}
            </button>
            <button
              type="button"
              onClick={() => setEditingPile((v) => !v)}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 sm:text-sm"
            >
              {editingPile ? "סיום" : "ערוך"}
            </button>
          </div>
        </div>

        {showAddCommon && (
          <div className="mb-3 flex gap-2">
            <input
              value={newCommon}
              onChange={(e) => setNewCommon(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addCommon(newCommon);
                  setNewCommon("");
                  setShowAddCommon(false);
                }
              }}
              placeholder="שם פריט נפוץ חדש"
              autoFocus
              className="flex-1 rounded-2xl bg-white/10 px-4 py-2.5 outline-none focus:bg-white/15"
            />
            <button
              type="button"
              onClick={() => {
                addCommon(newCommon);
                setNewCommon("");
                setShowAddCommon(false);
              }}
              disabled={!newCommon.trim()}
              className="rounded-2xl bg-white px-4 py-2.5 font-medium text-neutral-950 hover:bg-white/90 disabled:opacity-40"
            >
              הוסף
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-wrap content-start gap-1.5 overflow-y-auto sm:gap-2">
          {state.common.map((name) => (
            <CommonChip
              key={name}
              name={name}
              editing={editingPile}
              onAdd={() => addItem(name)}
              onRemove={() => removeCommon(name)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function ItemRow({
  item,
  onRemove,
}: {
  item: ShoppingItem;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10 sm:px-5 sm:py-3.5">
      <span className="flex-1 text-base sm:text-xl">{item.text}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="הסר"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </button>
    </li>
  );
}

function CommonChip({
  name,
  editing,
  onAdd,
  onRemove,
}: {
  name: string;
  editing: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  if (editing) {
    return (
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5 text-sm text-red-200 ring-1 ring-red-400/30 hover:bg-red-500/25 sm:px-4 sm:py-2 sm:text-base"
      >
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
        <span>{name}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm text-emerald-50 ring-1 ring-emerald-300/30 transition-all hover:bg-emerald-400/25 active:scale-95 sm:px-4 sm:py-2 sm:text-base"
    >
      {name}
    </button>
  );
}
