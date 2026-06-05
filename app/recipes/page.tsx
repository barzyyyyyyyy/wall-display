"use client";

import { useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import {
  DEFAULT_RECIPES,
  type ExtractedRecipe,
  type Recipe,
  type RecipesState,
} from "@/lib/recipes";
import { useSharedState } from "@/lib/use-shared-state";
import { newId } from "@/lib/util";
import AddRecipeDialog from "./AddRecipeDialog";
import RecipeDialog from "./RecipeDialog";

export default function RecipesPage() {
  const { state, setState, loaded } = useSharedState<RecipesState>(
    "recipes",
    DEFAULT_RECIPES,
  );
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const addRecipe = (extracted: ExtractedRecipe) => {
    const recipe: Recipe = {
      id: newId(),
      name: extracted.name,
      ingredients: extracted.ingredients,
      instructions: extracted.instructions,
      sourceUrl: extracted.sourceUrl,
      time: extracted.time,
      servings: extracted.servings,
      createdAt: Date.now(),
    };
    setState((s) => ({
      recipes: [recipe, ...s.recipes],
      updatedAt: Date.now(),
    }));
    setAdding(false);
    // Open the new recipe so user can verify / edit
    setOpenId(recipe.id);
  };

  const updateRecipe = (updated: Recipe) => {
    setState((s) => ({
      recipes: s.recipes.map((r) => (r.id === updated.id ? updated : r)),
      updatedAt: Date.now(),
    }));
  };

  const deleteRecipe = (id: string) => {
    setState((s) => ({
      recipes: s.recipes.filter((r) => r.id !== id),
      updatedAt: Date.now(),
    }));
    setOpenId(null);
  };

  const open = state.recipes.find((r) => r.id === openId) ?? null;

  return (
    <main className="relative flex min-w-0 flex-1 flex-col p-3 sm:p-4">
      <PageHeader title="מתכונים 🍳" accent="orange" />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-xs text-white/40">
            {state.recipes.length === 0
              ? "אין מתכונים עדיין"
              : `${state.recipes.length} מתכונים`}
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/30 hover:from-orange-400 hover:to-red-400 active:scale-95"
          >
            + הוסף מתכון
          </button>
        </div>

        {loaded && state.recipes.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="text-6xl">🍳</div>
            <p className="text-2xl text-white/70">אין מתכונים עדיין</p>
            <p className="max-w-md text-sm text-white/40">
              הוסף מתכון מקישור או מתמונה. שמור הכל במקום אחד.
            </p>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-7 py-3.5 text-lg font-bold text-white shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-red-400 active:scale-95"
            >
              + הוסף מתכון ראשון
            </button>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pb-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {state.recipes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setOpenId(r.id)}
                className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-orange-500/15 via-red-500/10 to-orange-500/5 p-3 text-center ring-1 ring-orange-300/20 transition-all hover:from-orange-500/25 hover:to-red-500/15 hover:ring-orange-300/40 active:scale-95"
              >
                <span className="text-3xl sm:text-4xl">🍳</span>
                <span className="line-clamp-3 text-sm font-bold leading-tight text-white sm:text-base">
                  {r.name}
                </span>
                {(r.time || r.servings) && (
                  <span className="text-[10px] text-white/40">
                    {r.time}
                    {r.time && r.servings ? " · " : ""}
                    {r.servings}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {adding && (
        <AddRecipeDialog
          onCancel={() => setAdding(false)}
          onAdd={addRecipe}
        />
      )}

      {open && (
        <RecipeDialog
          recipe={open}
          onClose={() => setOpenId(null)}
          onUpdate={updateRecipe}
          onDelete={() => deleteRecipe(open.id)}
        />
      )}
    </main>
  );
}
