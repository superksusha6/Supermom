import type { RecipeChoice, RecipeIngredient, RecipeNutrition } from '@/types/app';
import { NUTRITION_FOOD_PRESETS, type NutritionFoodPreset } from '@/lib/nutrition';
import { RECIPE_INGREDIENT_SUPPLEMENT } from '@/lib/recipeIngredients';

// Canonical ingredient dictionary: food-logging presets + recipe-only supplement.
// Every entry carries per-100 (g or ml) macros, so recipe nutrition is just
// (grams / 100) * macros summed over ingredients, divided by servings.
const DICTIONARY: NutritionFoodPreset[] = [...NUTRITION_FOOD_PRESETS, ...RECIPE_INGREDIENT_SUPPLEMENT];
const DICTIONARY_BY_ID = new Map(DICTIONARY.map((item) => [item.id, item]));

// Minimum name-match score required before we accept a fuzzy (non-foodRef) match.
const NAME_MATCH_THRESHOLD = 120;

export type IngredientResolution = {
  food: NutritionFoodPreset | null;
  via: 'foodRef' | 'name' | 'none';
  score: number;
};

export type IngredientDiagnostic = {
  name: string;
  grams: number | null;
  matchedFood: string | null;
  via: 'foodRef' | 'name' | 'none';
  score: number;
  contribution: RecipeNutrition | null;
};

export type RecipeNutritionResult = {
  nutrition: RecipeNutrition;
  confidence: 'verified' | 'approx';
  diagnostics: IngredientDiagnostic[];
};

function normalize(value?: string) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreFoodMatch(food: NutritionFoodPreset, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const candidates = [food.name, ...(food.aliases || [])].map(normalize).filter(Boolean);

  let best = 0;
  for (const candidate of candidates) {
    let score = 0;
    if (candidate === normalizedQuery) score = 400;
    else if (candidate.startsWith(normalizedQuery)) score = 220;
    else if (candidate.includes(normalizedQuery)) score = 140;

    const candidateTokens = candidate.split(' ');
    const allTokens = queryTokens.length > 0 && queryTokens.every((token) => candidate.includes(token));
    if (allTokens) score += 100;
    score += queryTokens.reduce(
      (sum, token) => sum + (candidateTokens.includes(token) ? 25 : candidate.includes(token) ? 12 : 0),
      0,
    );

    if (score > best) best = score;
  }
  return best;
}

export function resolveIngredientFood(ingredient: Pick<RecipeIngredient, 'name' | 'foodRef'>): IngredientResolution {
  if (ingredient.foodRef) {
    const food = DICTIONARY_BY_ID.get(ingredient.foodRef);
    if (food) return { food, via: 'foodRef', score: 1000 };
  }

  let best: NutritionFoodPreset | null = null;
  let bestScore = 0;
  for (const food of DICTIONARY) {
    const score = scoreFoodMatch(food, ingredient.name);
    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }
  if (best && bestScore >= NAME_MATCH_THRESHOLD) return { food: best, via: 'name', score: bestScore };
  return { food: null, via: 'none', score: bestScore };
}

function parseFraction(token: string) {
  if (token.includes('/')) {
    const [numerator, denominator] = token.split('/').map((part) => Number(part.replace(',', '.')));
    return denominator ? numerator / denominator : 0;
  }
  return Number(token.replace(',', '.')) || 0;
}

// Converts a display amount string to grams. Handles explicit mass/volume
// (g/kg/ml/cl/dl/l) and piece counts ("1 pc", "2 eggs") when the matched food
// has a known per-piece weight. Returns null when it cannot be resolved (e.g.
// "1 tbsp" with no density) so the caller can flag the recipe as approximate.
export function parseAmountToGrams(amount: string, food?: NutritionFoodPreset | null): number | null {
  const text = (amount || '').trim().toLowerCase();
  if (!text) return null;

  const massMatch = text.match(/(\d+(?:[.,/]\d+)?)\s*(kg|g|ml|cl|dl|l)\b/);
  if (massMatch) {
    const value = parseFraction(massMatch[1]);
    switch (massMatch[2]) {
      case 'kg':
        return value * 1000;
      case 'l':
        return value * 1000;
      case 'dl':
        return value * 100;
      case 'cl':
        return value * 10;
      case 'ml':
        return value;
      case 'g':
      default:
        return value;
    }
  }

  // Piece count: "1 pc", "2", "1 egg" → count * per-piece weight (if known).
  const countMatch = text.match(/^(\d+(?:[.,/]\d+)?)\b/);
  if (countMatch && food?.servingGrams) {
    return parseFraction(countMatch[1]) * food.servingGrams;
  }
  return null;
}

function scaleMacros(food: NutritionFoodPreset, grams: number): RecipeNutrition {
  const factor = grams / 100;
  return {
    calories: food.caloriesPer100g * factor,
    protein: food.proteinPer100g * factor,
    fat: food.fatPer100g * factor,
    carbs: food.carbsPer100g * factor,
  };
}

function roundNutrition(value: RecipeNutrition): RecipeNutrition {
  return {
    calories: Math.round(value.calories),
    protein: Math.round(value.protein * 10) / 10,
    fat: Math.round(value.fat * 10) / 10,
    carbs: Math.round(value.carbs * 10) / 10,
  };
}

export function computeRecipeNutrition(ingredients: RecipeIngredient[], servings: number): RecipeNutritionResult {
  const total: RecipeNutrition = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  const diagnostics: IngredientDiagnostic[] = [];
  let verified = true;

  for (const ingredient of ingredients) {
    const resolution = resolveIngredientFood(ingredient);
    const grams = ingredient.grams ?? parseAmountToGrams(ingredient.amount, resolution.food);
    const isExplicit = ingredient.grams != null && ingredient.foodRef != null && resolution.via === 'foodRef';
    if (!isExplicit) verified = false;

    if (!resolution.food || grams == null) {
      // Unresolved ingredients only break "verified"; optional zero-macro items
      // (salt/pepper "to taste") are expected to contribute nothing.
      if (!ingredient.optional) verified = false;
      diagnostics.push({
        name: ingredient.name,
        grams: grams ?? null,
        matchedFood: resolution.food?.name ?? null,
        via: resolution.via,
        score: resolution.score,
        contribution: null,
      });
      continue;
    }

    const contribution = scaleMacros(resolution.food, grams);
    total.calories += contribution.calories;
    total.protein += contribution.protein;
    total.fat += contribution.fat;
    total.carbs += contribution.carbs;

    diagnostics.push({
      name: ingredient.name,
      grams,
      matchedFood: resolution.food.name,
      via: resolution.via,
      score: resolution.score,
      contribution: roundNutrition(contribution),
    });
  }

  const perServingDivisor = Math.max(1, servings);
  const nutrition: RecipeNutrition = {
    calories: Math.round(total.calories / perServingDivisor),
    protein: Math.round((total.protein / perServingDivisor) * 10) / 10,
    fat: Math.round((total.fat / perServingDivisor) * 10) / 10,
    carbs: Math.round((total.carbs / perServingDivisor) * 10) / 10,
  };

  return { nutrition, confidence: verified ? 'verified' : 'approx', diagnostics };
}

// Selection maps a choice id to the chosen option id. Missing entries fall back to
// the choice's default option.
export type RecipeSelection = Record<string, string>;

// Builds the concrete ingredient list for a given selection: base ingredients plus,
// for each choice, the ingredient of the selected (or default) option. Options
// without an ingredient (e.g. "no sweetener") contribute nothing.
export function resolveRecipeIngredients(
  baseIngredients: RecipeIngredient[],
  choices?: RecipeChoice[],
  selection?: RecipeSelection,
): RecipeIngredient[] {
  const resolved = [...baseIngredients];
  for (const choice of choices || []) {
    const chosenId = selection?.[choice.id] ?? choice.defaultOptionId;
    const option = choice.options.find((item) => item.id === chosenId) ?? choice.options.find((item) => item.id === choice.defaultOptionId);
    if (option?.ingredient) resolved.push(option.ingredient);
  }
  return resolved;
}

export function computeRecipeNutritionForSelection(
  recipe: { ingredients: RecipeIngredient[]; choices?: RecipeChoice[]; servings: number },
  selection?: RecipeSelection,
): RecipeNutritionResult {
  const ingredients = resolveRecipeIngredients(recipe.ingredients, recipe.choices, selection);
  return computeRecipeNutrition(ingredients, recipe.servings);
}
