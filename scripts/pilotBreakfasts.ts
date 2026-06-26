/* eslint-disable no-console */
// Pilot: 15 breakfasts authored the verified way (explicit grams + foodRef).
// Runs computeRecipeNutrition over them and prints a review table.
import type { RecipeIngredient } from '@/types/app';
import { computeRecipeNutrition } from '@/lib/recipeNutrition';

type Authored = { id: string; title: string; servings: number; ingredients: RecipeIngredient[] };

const ing = (name: string, grams: number, foodRef: string, optional?: boolean): RecipeIngredient => ({
  id: foodRef,
  name,
  amount: grams + ' g',
  grams,
  foodRef,
  optional,
});

const BREAKFASTS: Authored[] = [
  {
    id: 'classic-omelet', title: 'Classic omelet', servings: 1,
    ingredients: [ing('eggs', 100, 'preset-egg'), ing('milk', 30, 'preset-milk-3-2'), ing('butter', 5, 'preset-butter')],
  },
  {
    id: 'scrambled-eggs', title: 'Scrambled eggs', servings: 1,
    ingredients: [ing('eggs', 100, 'preset-egg'), ing('butter', 5, 'preset-butter'), ing('milk', 15, 'preset-milk-3-2')],
  },
  {
    id: 'fried-eggs', title: 'Fried eggs', servings: 1,
    ingredients: [ing('eggs', 100, 'preset-egg'), ing('sunflower oil', 5, 'preset-sunflower-oil')],
  },
  {
    id: 'boiled-eggs', title: 'Boiled eggs', servings: 1,
    ingredients: [ing('eggs', 100, 'preset-egg')],
  },
  {
    id: 'oatmeal-porridge-milk', title: 'Oatmeal porridge (milk)', servings: 1,
    ingredients: [ing('rolled oats', 50, 'preset-oatmeal-dry'), ing('milk', 200, 'preset-milk-3-2'), ing('honey', 10, 'ing-honey')],
  },
  {
    id: 'oatmeal-porridge-water', title: 'Oatmeal porridge (water)', servings: 1,
    ingredients: [ing('rolled oats', 50, 'preset-oatmeal-dry'), ing('water', 200, 'preset-water')],
  },
  {
    id: 'rice-porridge-milk', title: 'Rice porridge (milk)', servings: 1,
    ingredients: [ing('rice', 50, 'preset-rice-dry'), ing('milk', 200, 'preset-milk-3-2'), ing('sugar', 8, 'ing-sugar'), ing('butter', 5, 'preset-butter')],
  },
  {
    id: 'rice-porridge-water', title: 'Rice porridge (water)', servings: 1,
    ingredients: [ing('rice', 50, 'preset-rice-dry'), ing('water', 200, 'preset-water')],
  },
  {
    id: 'semolina-porridge-milk', title: 'Semolina porridge (milk)', servings: 1,
    ingredients: [ing('semolina', 40, 'ing-semolina-dry'), ing('milk', 200, 'preset-milk-3-2'), ing('sugar', 8, 'ing-sugar'), ing('butter', 5, 'preset-butter')],
  },
  {
    id: 'semolina-porridge-water', title: 'Semolina porridge (water)', servings: 1,
    ingredients: [ing('semolina', 40, 'ing-semolina-dry'), ing('water', 200, 'preset-water')],
  },
  {
    id: 'buckwheat-porridge-milk', title: 'Buckwheat porridge (milk)', servings: 1,
    ingredients: [ing('buckwheat', 50, 'preset-buckwheat-dry'), ing('milk', 150, 'preset-milk-3-2'), ing('butter', 5, 'preset-butter')],
  },
  {
    id: 'buckwheat-porridge-water', title: 'Buckwheat porridge (water)', servings: 1,
    ingredients: [ing('buckwheat', 50, 'preset-buckwheat-dry'), ing('water', 150, 'preset-water')],
  },
  {
    id: 'syrniki', title: 'Syrniki', servings: 2,
    ingredients: [ing('cottage cheese', 250, 'preset-cottage-cheese-5'), ing('egg', 50, 'preset-egg'), ing('flour', 40, 'preset-wheat-flour-white'), ing('sugar', 15, 'ing-sugar'), ing('sunflower oil', 10, 'preset-sunflower-oil')],
  },
  {
    id: 'cottage-cheese-bake', title: 'Cottage cheese bake', servings: 4,
    ingredients: [ing('cottage cheese', 500, 'preset-cottage-cheese-5'), ing('eggs', 100, 'preset-egg'), ing('semolina', 40, 'ing-semolina-dry'), ing('sugar', 40, 'ing-sugar'), ing('raisins', 30, 'ing-raisins')],
  },
  {
    id: 'banana-pancakes', title: 'Banana pancakes', servings: 2,
    ingredients: [ing('banana', 120, 'preset-banana'), ing('egg', 50, 'preset-egg'), ing('flour', 90, 'preset-wheat-flour-white'), ing('milk', 120, 'preset-milk-3-2'), ing('sunflower oil', 7, 'preset-sunflower-oil')],
  },
  {
    id: 'french-toast', title: 'French toast', servings: 2,
    ingredients: [ing('bread', 120, 'ing-bread'), ing('eggs', 100, 'preset-egg'), ing('milk', 80, 'preset-milk-3-2'), ing('butter', 10, 'preset-butter'), ing('sugar', 5, 'ing-sugar')],
  },
  {
    id: 'homemade-granola', title: 'Homemade granola', servings: 6,
    ingredients: [ing('rolled oats', 200, 'preset-oatmeal-dry'), ing('honey', 60, 'ing-honey'), ing('sunflower oil', 30, 'preset-sunflower-oil'), ing('almonds', 60, 'preset-almonds'), ing('raisins', 50, 'ing-raisins')],
  },
  {
    id: 'yogurt-berries-granola', title: 'Yogurt with berries & granola', servings: 1,
    ingredients: [ing('greek yogurt', 150, 'preset-greek-yogurt'), ing('blueberries', 80, 'preset-blueberry'), ing('granola', 40, 'ing-granola'), ing('honey', 10, 'ing-honey')],
  },
  {
    id: 'avocado-toast', title: 'Avocado toast', servings: 1,
    ingredients: [ing('bread', 70, 'ing-bread'), ing('avocado', 100, 'preset-avocado'), ing('egg', 50, 'preset-egg')],
  },
];

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const padL = (s: string | number, n: number) => String(s).padStart(n);

console.log(pad('Recipe', 30) + padL('kcal', 6) + padL('P', 6) + padL('F', 6) + padL('C', 6) + '  conf');
console.log('-'.repeat(64));

let allVerified = true;
const problems: string[] = [];

for (const recipe of BREAKFASTS) {
  const r = computeRecipeNutrition(recipe.ingredients, recipe.servings);
  if (r.confidence !== 'verified') allVerified = false;
  const n = r.nutrition;
  console.log(pad(recipe.title, 30) + padL(n.calories, 6) + padL(n.protein, 6) + padL(n.fat, 6) + padL(n.carbs, 6) + '  ' + r.confidence);
  for (const d of r.diagnostics) {
    if (d.via !== 'foodRef' || d.grams == null) {
      problems.push(recipe.title + ' -> ' + d.name + ' [' + d.via + ', ' + (d.grams ?? 'no grams') + ']');
    }
  }
}

console.log('\nAll verified: ' + allVerified);
if (problems.length) {
  console.log('Problems:');
  problems.forEach((p) => console.log('  ' + p));
}

// Detailed per-ingredient breakdown for a quick sanity read.
console.log('\n--- breakdown (per serving contribution) ---');
for (const recipe of BREAKFASTS) {
  const r = computeRecipeNutrition(recipe.ingredients, recipe.servings);
  console.log('\n' + recipe.title + '  (' + recipe.servings + ' serv) -> ' + r.nutrition.calories + ' kcal');
  for (const d of r.diagnostics) {
    const k = d.contribution ? Math.round(d.contribution.calories / recipe.servings) : 0;
    console.log('  ' + pad(d.name, 18) + padL(d.grams ?? '?', 5) + 'g  ' + padL(k, 5) + ' kcal  (' + d.matchedFood + ')');
  }
}
