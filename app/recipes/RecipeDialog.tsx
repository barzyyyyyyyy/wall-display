"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/recipes";

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onUpdate: (updated: Recipe) => void;
  onDelete: () => void;
};

export default function RecipeDialog({
  recipe,
  onClose,
  onUpdate,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(recipe.name);
  const [ingredients, setIngredients] = useState<string[]>(
    recipe.ingredients.length > 0 ? recipe.ingredients : [""],
  );
  const [instructions, setInstructions] = useState<string[]>(
    recipe.instructions.length > 0 ? recipe.instructions : [""],
  );

  const startEdit = () => {
    setName(recipe.name);
    setIngredients(
      recipe.ingredients.length > 0 ? recipe.ingredients : [""],
    );
    setInstructions(
      recipe.instructions.length > 0 ? recipe.instructions : [""],
    );
    setEditing(true);
  };

  const save = () => {
    const cleanIngredients = ingredients
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const cleanInstructions = instructions
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    onUpdate({
      ...recipe,
      name: name.trim() || recipe.name,
      ingredients: cleanIngredients,
      instructions: cleanInstructions,
    });
    setEditing(false);
  };

  const updateIngredient = (i: number, v: string) =>
    setIngredients((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  const addIngredient = () => setIngredients((arr) => [...arr, ""]);
  const removeIngredient = (i: number) =>
    setIngredients((arr) =>
      arr.length === 1 ? [""] : arr.filter((_, idx) => idx !== i),
    );

  const updateInstruction = (i: number, v: string) =>
    setInstructions((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  const addInstruction = () => setInstructions((arr) => [...arr, ""]);
  const removeInstruction = (i: number) =>
    setInstructions((arr) =>
      arr.length === 1 ? [""] : arr.filter((_, idx) => idx !== i),
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-neutral-900/95 backdrop-blur-xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-xl font-bold outline-none focus:bg-white/15"
            />
          ) : (
            <h2 className="flex-1 truncate text-2xl font-bold tracking-tight">
              {recipe.name}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        {/* Meta */}
        {!editing && (recipe.time || recipe.servings || recipe.sourceUrl) && (
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3 text-xs text-white/50">
            {recipe.time && <span>⏱ {recipe.time}</span>}
            {recipe.servings && <span>🍽 {recipe.servings}</span>}
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto truncate text-orange-300 hover:underline"
                dir="ltr"
              >
                מקור ↗
              </a>
            )}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto p-5 sm:p-6">
          {/* Ingredients */}
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-orange-200">
              <span>🥘</span> מצרכים
            </h3>
            {editing ? (
              <div className="flex flex-col gap-2">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={ing}
                      onChange={(e) => updateIngredient(i, e.target.value)}
                      placeholder="לדוגמה: 2 כוסות קמח"
                      className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-base outline-none focus:bg-white/15"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(i)}
                      aria-label="הסר"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6l-12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredient}
                  className="rounded-lg bg-white/[0.04] py-2 text-sm text-white/60 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
                >
                  + הוסף מצרך
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl bg-white/[0.04] px-4 py-2.5 ring-1 ring-white/10"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
                    <span className="text-base text-white sm:text-lg">{ing}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Instructions */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-orange-200">
              <span>👨‍🍳</span> הוראות הכנה
            </h3>
            {editing ? (
              <div className="flex flex-col gap-2">
                {instructions.map((step, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="mt-2 text-sm font-bold tabular-nums text-white/40">
                      {i + 1}.
                    </span>
                    <textarea
                      value={step}
                      onChange={(e) => updateInstruction(i, e.target.value)}
                      placeholder="שלב הכנה"
                      rows={2}
                      className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-base outline-none focus:bg-white/15"
                    />
                    <button
                      type="button"
                      onClick={() => removeInstruction(i)}
                      aria-label="הסר"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6l-12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addInstruction}
                  className="rounded-lg bg-white/[0.04] py-2 text-sm text-white/60 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
                >
                  + הוסף שלב
                </button>
              </div>
            ) : (
              <ol className="space-y-3">
                {recipe.instructions.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-red-500 text-sm font-bold text-orange-950">
                      {i + 1}
                    </div>
                    <span className="text-base leading-relaxed text-white sm:text-lg">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/20 p-4 sm:p-5">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full bg-white/10 px-5 py-2.5 text-base hover:bg-white/20"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 text-base font-bold text-white shadow-md shadow-orange-500/30 hover:from-orange-400 hover:to-red-400 active:scale-95"
              >
                ✓ שמור
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`למחוק את "${recipe.name}"?`)) {
                    onDelete();
                  }
                }}
                className="rounded-full bg-white/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 hover:text-red-100"
              >
                🗑 מחק
              </button>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-full bg-white/15 px-5 py-2.5 text-base font-bold hover:bg-white/25"
              >
                ✏ ערוך
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
