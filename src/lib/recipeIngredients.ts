import type { NutritionFoodPreset } from '@/lib/nutrition';

// Supplement to NUTRITION_FOOD_PRESETS for recipe ingredients that are not in the
// food-logging presets. Values are per-100 g (USDA FoodData Central reference) and
// are meant to be frozen here so recipe nutrition is computed deterministically and
// offline — no network call during build. New entries should be sourced from USDA
// (Foundation / SR Legacy) and committed with the number, not fetched at runtime.
export const RECIPE_INGREDIENT_SUPPLEMENT: NutritionFoodPreset[] = [
  { id: 'ing-feta', name: 'Feta cheese', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 264, proteinPer100g: 14.2, fatPer100g: 21.3, carbsPer100g: 4.1, aliases: ['feta'] },
  { id: 'ing-parmesan', name: 'Parmesan cheese', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 392, proteinPer100g: 35.8, fatPer100g: 25.8, carbsPer100g: 3.2, aliases: ['parmesan', 'parmigiano'] },
  { id: 'ing-mozzarella', name: 'Mozzarella cheese', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 280, proteinPer100g: 22.2, fatPer100g: 20.3, carbsPer100g: 2.2, aliases: ['mozzarella'] },
  { id: 'ing-goat-cheese', name: 'Goat cheese', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 364, proteinPer100g: 21.6, fatPer100g: 29.8, carbsPer100g: 2.5, aliases: ['goat cheese', 'chevre'] },
  { id: 'ing-cheddar', name: 'Cheddar cheese', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 403, proteinPer100g: 24.9, fatPer100g: 33.1, carbsPer100g: 1.3, aliases: ['cheddar', 'cheese'] },

  { id: 'ing-olives', name: 'Olives', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 115, proteinPer100g: 0.8, fatPer100g: 10.7, carbsPer100g: 6.3, aliases: ['olives', 'black olives', 'kalamata'] },
  { id: 'ing-tomato-passata', name: 'Tomato passata', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 35, proteinPer100g: 1.6, fatPer100g: 0.3, carbsPer100g: 7, aliases: ['passata', 'tomato sauce', 'strained tomatoes', 'tomato puree'] },
  { id: 'ing-canned-tomatoes', name: 'Canned tomatoes', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 32, proteinPer100g: 1.6, fatPer100g: 0.3, carbsPer100g: 7, aliases: ['chopped tomatoes', 'crushed tomatoes', 'diced tomatoes'] },
  { id: 'ing-tomato-paste', name: 'Tomato paste', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 82, proteinPer100g: 4.3, fatPer100g: 0.5, carbsPer100g: 19, aliases: ['tomato concentrate'] },

  { id: 'ing-heavy-cream', name: 'Heavy cream', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 340, proteinPer100g: 2.8, fatPer100g: 36, carbsPer100g: 2.9, aliases: ['cream', 'double cream', 'whipping cream'] },
  { id: 'ing-sour-cream', name: 'Sour cream', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 198, proteinPer100g: 2.4, fatPer100g: 19.4, carbsPer100g: 4.6, aliases: ['sour cream', 'smetana'] },
  { id: 'ing-cream-cheese', name: 'Cream cheese', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 342, proteinPer100g: 6.2, fatPer100g: 34, carbsPer100g: 4.1, aliases: ['cream cheese'] },

  { id: 'ing-sugar', name: 'Sugar', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 387, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 100, aliases: ['sugar', 'white sugar', 'caster sugar'] },
  { id: 'ing-brown-sugar', name: 'Brown sugar', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 380, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 98, aliases: ['brown sugar'] },
  { id: 'ing-honey', name: 'Honey', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 304, proteinPer100g: 0.3, fatPer100g: 0, carbsPer100g: 82, aliases: ['honey'] },
  // Erythritol / stevia-type sweetener, labeled ~0 kcal. Used as a "sugar substitute" swap option.
  { id: 'ing-sweetener', name: 'Sweetener (0 cal)', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0, aliases: ['sweetener', 'sugar substitute', 'stevia', 'erythritol'] },
  { id: 'ing-maple-syrup', name: 'Maple syrup', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 260, proteinPer100g: 0, fatPer100g: 0.1, carbsPer100g: 67, aliases: ['maple syrup'] },

  { id: 'ing-lentils-dry', name: 'Lentils, dry', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 352, proteinPer100g: 24.6, fatPer100g: 1.1, carbsPer100g: 63, aliases: ['lentils', 'red lentils', 'green lentils'] },
  { id: 'ing-chickpeas-canned', name: 'Chickpeas, canned', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 139, proteinPer100g: 7.1, fatPer100g: 2.6, carbsPer100g: 22.5, aliases: ['chickpeas', 'garbanzo'] },
  { id: 'ing-white-beans-canned', name: 'White beans, canned', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 114, proteinPer100g: 7.5, fatPer100g: 0.4, carbsPer100g: 20.7, aliases: ['white beans', 'cannellini', 'kidney beans'] },

  { id: 'ing-bacon', name: 'Bacon', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 393, proteinPer100g: 12.6, fatPer100g: 37, carbsPer100g: 1.4, aliases: ['bacon', 'pancetta'] },
  { id: 'ing-shrimp-raw', name: 'Shrimp, raw', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 99, proteinPer100g: 24, fatPer100g: 0.3, carbsPer100g: 0.2, aliases: ['shrimp', 'prawns'] },

  { id: 'ing-pesto', name: 'Pesto', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 418, proteinPer100g: 5.8, fatPer100g: 41, carbsPer100g: 6.3, aliases: ['pesto', 'basil pesto'] },
  { id: 'ing-mayonnaise', name: 'Mayonnaise', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 680, proteinPer100g: 1, fatPer100g: 75, carbsPer100g: 0.6, aliases: ['mayo', 'mayonnaise'] },
  { id: 'ing-parmesan-dressing', name: 'Caesar dressing', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 542, proteinPer100g: 2.5, fatPer100g: 57, carbsPer100g: 3.4, aliases: ['caesar dressing'] },

  { id: 'ing-chia-seeds', name: 'Chia seeds', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 486, proteinPer100g: 16.5, fatPer100g: 30.7, carbsPer100g: 42.1, aliases: ['chia', 'chia seeds'] },
  { id: 'ing-walnuts', name: 'Walnuts', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 654, proteinPer100g: 15.2, fatPer100g: 65.2, carbsPer100g: 13.7, aliases: ['walnuts'] },
  { id: 'ing-pine-nuts', name: 'Pine nuts', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 673, proteinPer100g: 13.7, fatPer100g: 68.4, carbsPer100g: 13.1, aliases: ['pine nuts'] },
  { id: 'ing-raisins', name: 'Raisins', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 299, proteinPer100g: 3.1, fatPer100g: 0.5, carbsPer100g: 79, aliases: ['raisins'] },

  { id: 'ing-bread', name: 'Bread', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 265, proteinPer100g: 9, fatPer100g: 3.2, carbsPer100g: 49, aliases: ['bread', 'white bread', 'toast', 'baguette'] },
  { id: 'ing-breadcrumbs', name: 'Breadcrumbs', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 395, proteinPer100g: 13.4, fatPer100g: 5.3, carbsPer100g: 72, aliases: ['breadcrumbs', 'panko'] },

  { id: 'ing-semolina-dry', name: 'Semolina, dry', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 360, proteinPer100g: 12.7, fatPer100g: 1.1, carbsPer100g: 73, aliases: ['semolina', 'manka', 'cream of wheat'] },
  // Granola macros are derived from the homemade-granola recipe in this pilot
  // (oats + honey + oil + almonds + raisins), per 100 g of the finished mix.
  { id: 'ing-granola', name: 'Granola', baseAmount: 'per 100 g', source: 'usda', sourceLabel: 'USDA', caloriesPer100g: 421, proteinPer100g: 9.6, fatPer100g: 18.1, carbsPer100g: 55.5, aliases: ['granola', 'muesli'] },
];
