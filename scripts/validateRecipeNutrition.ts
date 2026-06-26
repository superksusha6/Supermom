/* eslint-disable no-console */
// One-off validation harness: runs computeRecipeNutrition on the 5 curated starter
// recipes and compares the computed per-serving macros against the stored ones.
// Fixtures are copied verbatim from CURATED_STARTER_RECIPES (recipeCatalog.ts) to
// keep the compile graph small (no 25k-line generated catalog pulled in).
import type { RecipeIngredient, RecipeNutrition } from '@/types/app';
import { computeRecipeNutrition } from '@/lib/recipeNutrition';

type Fixture = {
  id: string;
  servings: number;
  stored: RecipeNutrition;
  ingredients: RecipeIngredient[];
};

const FIXTURES: Fixture[] = [
  {
    id: 'starter-oatmeal-berries',
    servings: 2,
    stored: { calories: 286, protein: 9, fat: 7, carbs: 46 },
    ingredients: [
      { id: 'i1', name: 'rolled oats', amount: '80 g' },
      { id: 'i2', name: 'milk', amount: '300 ml' },
      { id: 'i3', name: 'berries', amount: '120 g' },
    ],
  },
  {
    id: 'starter-chicken-soup',
    servings: 4,
    stored: { calories: 182, protein: 18, fat: 6, carbs: 13 },
    ingredients: [
      { id: 'i1', name: 'chicken breast', amount: '300 g' },
      { id: 'i2', name: 'carrot', amount: '120 g' },
      { id: 'i3', name: 'potato', amount: '250 g' },
      { id: 'i4', name: 'onion', amount: '80 g' },
    ],
  },
  {
    id: 'starter-pasta-tomato',
    servings: 3,
    stored: { calories: 348, protein: 10, fat: 7, carbs: 58 },
    ingredients: [
      { id: 'i1', name: 'pasta', amount: '240 g' },
      { id: 'i2', name: 'tomato passata', amount: '300 g' },
      { id: 'i3', name: 'olive oil', amount: '1 tbsp' },
    ],
  },
  {
    id: 'starter-greek-salad',
    servings: 2,
    stored: { calories: 220, protein: 7, fat: 16, carbs: 11 },
    ingredients: [
      { id: 'i1', name: 'cucumber', amount: '150 g' },
      { id: 'i2', name: 'tomato', amount: '180 g' },
      { id: 'i3', name: 'feta', amount: '80 g' },
      { id: 'i4', name: 'olives', amount: '50 g' },
    ],
  },
  {
    id: 'starter-banana-pancakes',
    servings: 2,
    stored: { calories: 310, protein: 9, fat: 8, carbs: 51 },
    ingredients: [
      { id: 'i1', name: 'banana', amount: '1 pc' },
      { id: 'i2', name: 'egg', amount: '1 pc' },
      { id: 'i3', name: 'flour', amount: '90 g' },
      { id: 'i4', name: 'milk', amount: '120 ml' },
    ],
  },
  // Same recipe authored the VERIFIED way: explicit grams + foodRef on every
  // ingredient, plus the cooking oil the old list omitted.
  {
    id: 'banana-pancakes-VERIFIED',
    servings: 2,
    stored: { calories: 310, protein: 9, fat: 8, carbs: 51 },
    ingredients: [
      { id: 'i1', name: 'banana', amount: '1 pc', grams: 120, foodRef: 'preset-banana' },
      { id: 'i2', name: 'egg', amount: '1 pc', grams: 50, foodRef: 'preset-egg' },
      { id: 'i3', name: 'flour', amount: '90 g', grams: 90, foodRef: 'preset-wheat-flour-white' },
      { id: 'i4', name: 'milk', amount: '120 ml', grams: 120, foodRef: 'preset-milk-3-2' },
      { id: 'i5', name: 'sunflower oil', amount: '1 tsp', grams: 7, foodRef: 'preset-sunflower-oil' },
    ],
  },
];

function pct(computed: number, stored: number) {
  if (stored === 0) return computed === 0 ? 0 : 100;
  return Math.round(((computed - stored) / stored) * 100);
}

let worstCalorieDev = 0;

for (const fixture of FIXTURES) {
  const result = computeRecipeNutrition(fixture.ingredients, fixture.servings);
  const c = result.nutrition;
  const s = fixture.stored;
  const calDev = pct(c.calories, s.calories);
  worstCalorieDev = Math.max(worstCalorieDev, Math.abs(calDev));

  console.log('\n=== ' + fixture.id + ' (' + result.confidence + ') ===');
  console.log(
    'computed  kcal ' + c.calories + '  P ' + c.protein + '  F ' + c.fat + '  C ' + c.carbs,
  );
  console.log(
    'stored    kcal ' + s.calories + '  P ' + s.protein + '  F ' + s.fat + '  C ' + s.carbs,
  );
  console.log(
    'delta     kcal ' + calDev + '%  P ' + pct(c.protein, s.protein) + '%  F ' + pct(c.fat, s.fat) + '%  C ' + pct(c.carbs, s.carbs) + '%',
  );
  for (const d of result.diagnostics) {
    const matched = d.matchedFood ? d.matchedFood + ' [' + d.via + ' ' + d.score + ']' : 'UNRESOLVED [' + d.via + ']';
    const grams = d.grams == null ? 'grams?' : d.grams + 'g';
    const contrib = d.contribution ? d.contribution.calories + ' kcal' : '—';
    console.log('  - ' + d.name + ' (' + grams + ') -> ' + matched + '  ' + contrib);
  }
}

console.log('\nWorst calorie deviation: ' + worstCalorieDev + '%');
