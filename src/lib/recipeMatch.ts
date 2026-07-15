import { FridgeItem, Recipe, RecipeIngredient } from '@/types/app';

// Ingredients you don't shop for per-recipe — assumed always on hand.
const PANTRY_STAPLES = new Set<string>([
  'salt', 'pepper', 'peppercorn', 'water', 'oil', 'olive', 'sunflower', 'vegetable',
  'соль', 'перец', 'вода', 'масло',
]);

// Descriptor words that carry no identity — dropped before matching.
const STOPWORDS = new Set<string>([
  'fresh', 'dried', 'ground', 'chopped', 'sliced', 'minced', 'grated', 'large', 'small', 'medium',
  'ripe', 'the', 'and', 'for', 'with', 'taste', 'optional', 'boneless', 'skinless', 'extra', 'virgin',
  'raw', 'cooked', 'whole', 'half', 'can', 'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'clove', 'cloves',
  'pinch', 'handful', 'packet', 'pack', 'some', 'plain', 'unsalted', 'salted', 'free', 'range', 'organic',
  'свежий', 'сушеный', 'молотый', 'нарезанный', 'крупный', 'мелкий', 'для', 'вкусу',
]);

// A tiny synonym map so plurals/variants collapse to one canonical token.
const SYNONYMS: Record<string, string> = {
  tomatoes: 'tomato', помидоры: 'tomato', помидор: 'tomato',
  onions: 'onion', лук: 'onion',
  eggs: 'egg', яйцо: 'egg', яйца: 'egg',
  potatoes: 'potato', картофель: 'potato', картошка: 'potato',
  chicken: 'chicken', курица: 'chicken', куриц: 'chicken',
  cheese: 'cheese', сыр: 'cheese',
  milk: 'milk', молоко: 'milk',
  butter: 'butter', масло: 'butter',
  garlic: 'garlic', чеснок: 'garlic',
  carrots: 'carrot', морковь: 'carrot',
  rice: 'rice', рис: 'rice',
  flour: 'flour', мука: 'flour',
};

function canonical(word: string): string {
  let w = word.toLowerCase().replace(/[^a-zа-яё]/gi, '');
  if (!w) return '';
  if (SYNONYMS[w]) return SYNONYMS[w];
  // Light English singularisation.
  if (w.endsWith('ies') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith('ses') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) w = w.slice(0, -1);
  return SYNONYMS[w] || w;
}

// Meaningful tokens of an ingredient/inventory name (drops amounts, units, descriptors).
export function ingredientTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[\s,()/•·\-]+/)
    .map(canonical)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function isStapleIngredient(ingredient: RecipeIngredient): boolean {
  const toks = ingredientTokens(ingredient.name);
  return toks.length > 0 && toks.every((t) => PANTRY_STAPLES.has(t));
}

export type InventoryIndex = { tokens: Set<string>; names: string[] };

// Build a fast lookup once from the current inventory (in-stock items only).
export function buildInventoryIndex(fridgeItems: FridgeItem[]): InventoryIndex {
  const tokens = new Set<string>();
  const names: string[] = [];
  fridgeItems.forEach((item) => {
    if (item.status === 'out') return; // out of stock = you don't have it
    names.push(item.name.toLowerCase());
    ingredientTokens(item.name).forEach((t) => tokens.add(t));
  });
  return { tokens, names };
}

function isHeld(ingredient: RecipeIngredient, index: InventoryIndex): boolean {
  const toks = ingredientTokens(ingredient.name);
  if (!toks.length) return true; // nothing identifiable — don't block on it
  return toks.some(
    (t) => index.tokens.has(t) || (t.length >= 4 && index.names.some((name) => name.includes(t))),
  );
}

export type RecipeMatchStatus = 'can' | 'almost' | 'none';
export type RecipeMatch = {
  total: number;
  haveCount: number;
  missing: RecipeIngredient[];
  status: RecipeMatchStatus;
};

// How cookable a recipe is against what's in the inventory right now.
export function matchRecipeToInventory(recipe: Recipe, index: InventoryIndex): RecipeMatch {
  const required = recipe.ingredients.filter((ing) => !ing.optional && !isStapleIngredient(ing));
  const missing: RecipeIngredient[] = [];
  required.forEach((ing) => {
    if (!isHeld(ing, index)) missing.push(ing);
  });
  const total = required.length;
  const haveCount = total - missing.length;
  const status: RecipeMatchStatus =
    total > 0 && missing.length === 0 ? 'can' : missing.length >= 1 && missing.length <= 2 ? 'almost' : 'none';
  return { total, haveCount, missing, status };
}
