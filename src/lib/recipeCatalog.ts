import { Recipe, RecipeClassifier, RecipeMealType } from '@/types/app';
import { IMPORTED_RECIPE_LIBRARY } from '@/lib/generated/importedRecipeCatalog';
import { SPOONACULAR_RECIPE_LIBRARY } from '@/lib/generated/spoonacularRecipeCatalog';
import { THEMEALDB_RECIPE_LIBRARY } from '@/lib/generated/themealdbRecipeCatalog';

export const RECIPE_SECTION_FILTERS: Array<{ key: RecipeMealType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'soups', label: 'Soups' },
  { key: 'salads', label: 'Salads' },
  { key: 'pasta', label: 'Pasta' },
  { key: 'desserts', label: 'Desserts' },
  { key: 'baking', label: 'Baking' },
  { key: 'drinks', label: 'Drinks' },
  { key: 'main_dish', label: 'Family meals' },
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

const CURATED_STARTER_RECIPES: Recipe[] = [
  {
    id: 'starter-oatmeal-berries',
    title: 'Oatmeal with berries',
    description: 'Creamy oatmeal with berries for an easy family breakfast.',
    mealType: 'breakfast',
    mealSlot: 'breakfast',
    subtype: 'porridge',
    cuisine: 'Home',
    cookTimeMinutes: 12,
    servings: 2,
    tags: ['porridge', 'oats', 'berries'],
    classifiers: ['kids', 'family', 'healthy', 'quick'],
    nutritionPerServing: { calories: 286, protein: 9, fat: 7, carbs: 46 },
    ingredients: [
      { id: 'i1', name: 'rolled oats', amount: '80 g' },
      { id: 'i2', name: 'milk', amount: '300 ml' },
      { id: 'i3', name: 'berries', amount: '120 g' },
    ],
    steps: [
      { id: 's1', text: 'Heat the milk and stir in the oats.' },
      { id: 's2', text: 'Cook until creamy, then fold in the berries.' },
      { id: 's3', text: 'Serve warm.' },
    ],
    suitableForChildren: true,
    suitableForFamily: true,
  },
  {
    id: 'starter-chicken-soup',
    title: 'Chicken vegetable soup',
    description: 'Light chicken soup with carrots, potato, and herbs.',
    mealType: 'soups',
    mealSlot: 'lunch',
    subtype: 'chicken soup',
    cuisine: 'Home',
    cookTimeMinutes: 35,
    servings: 4,
    tags: ['soup', 'chicken', 'vegetables'],
    classifiers: ['family', 'healthy', 'kids'],
    nutritionPerServing: { calories: 182, protein: 18, fat: 6, carbs: 13 },
    ingredients: [
      { id: 'i1', name: 'chicken breast', amount: '300 g' },
      { id: 'i2', name: 'carrot', amount: '120 g' },
      { id: 'i3', name: 'potato', amount: '250 g' },
      { id: 'i4', name: 'onion', amount: '80 g' },
    ],
    steps: [
      { id: 's1', text: 'Simmer the chicken in water until tender.' },
      { id: 's2', text: 'Add chopped vegetables and cook until soft.' },
      { id: 's3', text: 'Season and finish with herbs.' },
    ],
    suitableForChildren: true,
    suitableForFamily: true,
  },
  {
    id: 'starter-pasta-tomato',
    title: 'Pasta with tomato sauce',
    description: 'Simple pasta with a quick tomato sauce.',
    mealType: 'pasta',
    mealSlot: 'dinner',
    subtype: 'pasta',
    cuisine: 'Italian-style',
    cookTimeMinutes: 20,
    servings: 3,
    tags: ['pasta', 'tomato'],
    classifiers: ['family', 'quick', 'vegetarian', 'budget'],
    nutritionPerServing: { calories: 348, protein: 10, fat: 7, carbs: 58 },
    ingredients: [
      { id: 'i1', name: 'pasta', amount: '240 g' },
      { id: 'i2', name: 'tomato passata', amount: '300 g' },
      { id: 'i3', name: 'olive oil', amount: '1 tbsp' },
    ],
    steps: [
      { id: 's1', text: 'Cook the pasta until al dente.' },
      { id: 's2', text: 'Warm the passata with olive oil and seasoning.' },
      { id: 's3', text: 'Toss together and serve.' },
    ],
    suitableForFamily: true,
  },
  {
    id: 'starter-greek-salad',
    title: 'Greek-style salad',
    description: 'Fresh salad with cucumber, tomato, olives, and cheese.',
    mealType: 'salads',
    mealSlot: 'lunch',
    subtype: 'salad',
    cuisine: 'Mediterranean',
    cookTimeMinutes: 10,
    servings: 2,
    tags: ['salad', 'vegetables'],
    classifiers: ['healthy', 'vegetarian', 'quick', 'gluten_free'],
    nutritionPerServing: { calories: 220, protein: 7, fat: 16, carbs: 11 },
    ingredients: [
      { id: 'i1', name: 'cucumber', amount: '150 g' },
      { id: 'i2', name: 'tomato', amount: '180 g' },
      { id: 'i3', name: 'feta', amount: '80 g' },
      { id: 'i4', name: 'olives', amount: '50 g' },
    ],
    steps: [
      { id: 's1', text: 'Chop the vegetables and place in a bowl.' },
      { id: 's2', text: 'Add olives and cheese.' },
      { id: 's3', text: 'Dress and serve.' },
    ],
  },
  {
    id: 'starter-banana-pancakes',
    title: 'Banana pancakes',
    description: 'Soft banana pancakes for breakfast or snack.',
    mealType: 'breakfast',
    mealSlot: 'breakfast',
    subtype: 'pancakes',
    cuisine: 'Home',
    cookTimeMinutes: 18,
    servings: 2,
    tags: ['banana', 'pancakes'],
    classifiers: ['kids', 'family', 'quick'],
    nutritionPerServing: { calories: 310, protein: 9, fat: 8, carbs: 51 },
    ingredients: [
      { id: 'i1', name: 'banana', amount: '1 pc' },
      { id: 'i2', name: 'egg', amount: '1 pc' },
      { id: 'i3', name: 'flour', amount: '90 g' },
      { id: 'i4', name: 'milk', amount: '120 ml' },
    ],
    steps: [
      { id: 's1', text: 'Mash the banana and whisk with egg and milk.' },
      { id: 's2', text: 'Stir in flour to make a smooth batter.' },
      { id: 's3', text: 'Cook small pancakes on a lightly oiled pan.' },
    ],
    suitableForChildren: true,
    suitableForFamily: true,
  },
];

export const STARTER_RECIPE_LIBRARY: Recipe[] = buildStarterRecipeLibrary([
  ...CURATED_STARTER_RECIPES,
  ...SPOONACULAR_RECIPE_LIBRARY,
  ...THEMEALDB_RECIPE_LIBRARY,
  ...IMPORTED_RECIPE_LIBRARY,
]);

function buildStarterRecipeLibrary(source: Recipe[]) {
  const byTitle = new Map<string, Recipe>();

  source.forEach((recipe) => {
    const key = normalizeRecipeTitle(recipe.title);
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, recipe);
      return;
    }

    if (scoreRecipeQuality(recipe) > scoreRecipeQuality(existing)) {
      byTitle.set(key, recipe);
    }
  });

  return Array.from(byTitle.values()).sort((left, right) => {
    if (left.mealType !== right.mealType) return left.mealType.localeCompare(right.mealType);
    return left.title.localeCompare(right.title);
  });
}

function normalizeRecipeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function scoreRecipeQuality(recipe: Recipe) {
  let score = 0;
  if (recipe.id.startsWith('starter-')) score += 100;
  if (recipe.photoUri) score += 30;
  score += recipe.ingredients.length * 4;
  score += recipe.steps.length * 5;
  score += recipe.classifiers.length * 3;
  score += recipe.tags.length;
  if (recipe.nutritionPerServing.calories > 0) score += 12;
  if (recipe.suitableForChildren) score += 4;
  if (recipe.suitableForFamily) score += 4;
  return score;
}
