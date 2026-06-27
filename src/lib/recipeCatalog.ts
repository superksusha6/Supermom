import { Recipe, RecipeClassifier, RecipeMealType } from '@/types/app';
import { VERIFIED_RECIPE_LIBRARY } from '@/lib/generated/verifiedRecipeCatalog';

export const RECIPE_SECTION_FILTERS: Array<{ key: RecipeMealType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'soups', label: 'Soups' },
  { key: 'salads', label: 'Salads' },
  { key: 'main_dish', label: 'Mains' },
  { key: 'pasta', label: 'Pasta' },
  { key: 'sides', label: 'Sides' },
  { key: 'desserts', label: 'Desserts' },
  { key: 'appetizers', label: 'Snacks' },
  { key: 'drinks', label: 'Drinks' },
];

export const RECIPE_CLASSIFIER_FILTERS: Array<{ key: RecipeClassifier | 'all'; label: string }> = [
  { key: 'all', label: 'All types' },
  { key: 'kids', label: 'Kids' },
  { key: 'family', label: 'Family' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'quick', label: 'Quick' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'high_protein', label: 'High protein' },
];

// The recipe library is now exclusively the hand-authored, nutrition-verified set
// (see scripts/recipeSource.ts → scripts/generateRecipes.ts). The old imported /
// TheMealDB / Spoonacular base was removed.
export const STARTER_RECIPE_LIBRARY: Recipe[] = [...VERIFIED_RECIPE_LIBRARY].sort((left, right) => {
  if (left.mealType !== right.mealType) return left.mealType.localeCompare(right.mealType);
  return left.title.localeCompare(right.title);
});
