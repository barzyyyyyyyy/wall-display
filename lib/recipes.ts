export type Recipe = {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string[];
  sourceUrl?: string;
  time?: string;
  servings?: string;
  createdAt: number;
};

export type RecipesState = {
  recipes: Recipe[];
  updatedAt: number;
};

export const DEFAULT_RECIPES: RecipesState = {
  recipes: [],
  updatedAt: 0,
};

/** A parsed recipe before it's saved. */
export type ExtractedRecipe = {
  name: string;
  ingredients: string[];
  instructions: string[];
  time?: string;
  servings?: string;
  sourceUrl?: string;
};
