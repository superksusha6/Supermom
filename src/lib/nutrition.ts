import { ActivityLevel, CustomNutritionFood, NutritionFoodEntry, NutritionGoal, NutritionMacros, NutritionPace, NutritionSex } from '@/types/app';

export type NutritionFoodPreset = {
  id: string;
  name: string;
  baseAmount: string;
  baseMode?: '100g' | '100ml' | 'serving';
  baseQuantity?: number;
  brand?: string;
  barcode?: string;
  servingGrams?: number;
  serving?: NutritionMacros;
  // Semi-liquid (sour cream, honey, yogurt, sauces…) — enables the "spoon" log unit.
  spoonable?: boolean;
  // Per-piece foods (egg, banana…): label shown in lists, e.g. "1 egg".
  pieceLabel?: string;
  aliases?: string[];
  isCustom?: boolean;
  source?: 'custom' | 'open_food_facts' | 'usda';
  sourceLabel?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
};

export const NUTRITION_FOOD_PRESETS: NutritionFoodPreset[] = [
  { id: 'preset-chicken-breast-raw', name: 'Chicken breast, raw', baseAmount: 'per 100 g', caloriesPer100g: 165, proteinPer100g: 31, fatPer100g: 3.6, carbsPer100g: 0 },
  { id: 'preset-turkey', name: 'Turkey', baseAmount: 'per 100 g', caloriesPer100g: 135, proteinPer100g: 29, fatPer100g: 1, carbsPer100g: 0 },
  { id: 'preset-beef', name: 'Beef', baseAmount: 'per 100 g', caloriesPer100g: 250, proteinPer100g: 26, fatPer100g: 15, carbsPer100g: 0 },
  { id: 'preset-ground-beef', name: 'Ground beef', baseAmount: 'per 100 g', caloriesPer100g: 270, proteinPer100g: 26, fatPer100g: 20, carbsPer100g: 0 },
  { id: 'preset-salmon', name: 'Salmon', baseAmount: 'per 100 g', caloriesPer100g: 208, proteinPer100g: 20, fatPer100g: 13, carbsPer100g: 0 },
  { id: 'preset-tuna-canned', name: 'Tuna, canned', baseAmount: 'per 100 g', caloriesPer100g: 130, proteinPer100g: 29, fatPer100g: 1, carbsPer100g: 0 },
  { id: 'preset-egg', name: 'Egg', baseAmount: 'per 100 g', servingGrams: 50, pieceLabel: '1 egg', caloriesPer100g: 155, proteinPer100g: 13, fatPer100g: 11, carbsPer100g: 1, aliases: ['chicken egg', 'eggs', 'raw egg'] },
  { id: 'preset-egg-white', name: 'Egg white', baseAmount: 'per 100 g', servingGrams: 33, pieceLabel: '1 white', caloriesPer100g: 52, proteinPer100g: 10.9, fatPer100g: 0.2, carbsPer100g: 0.7 },
  { id: 'preset-egg-yolk', name: 'Egg yolk', baseAmount: 'per 100 g', servingGrams: 17, pieceLabel: '1 yolk', caloriesPer100g: 322, proteinPer100g: 15.9, fatPer100g: 26.5, carbsPer100g: 3.6 },
  { id: 'preset-cottage-cheese-5', name: 'Cottage cheese 5%', baseAmount: 'per 100 g', caloriesPer100g: 120, proteinPer100g: 17, fatPer100g: 5, carbsPer100g: 3 },
  { id: 'preset-greek-yogurt', name: 'Greek yogurt', baseAmount: 'per 100 g', caloriesPer100g: 60, proteinPer100g: 10, fatPer100g: 2, carbsPer100g: 3, spoonable: true },

  { id: 'preset-rice-dry', name: 'Rice, dry', baseAmount: 'per 100 g', caloriesPer100g: 350, proteinPer100g: 7, fatPer100g: 1, carbsPer100g: 78 },
  { id: 'preset-buckwheat-dry', name: 'Buckwheat, dry', baseAmount: 'per 100 g', caloriesPer100g: 340, proteinPer100g: 13, fatPer100g: 3, carbsPer100g: 68 },
  { id: 'preset-oatmeal-dry', name: 'Oatmeal, dry', baseAmount: 'per 100 g', caloriesPer100g: 370, proteinPer100g: 12, fatPer100g: 6, carbsPer100g: 60 },
  { id: 'preset-pasta-dry', name: 'Pasta, dry', baseAmount: 'per 100 g', caloriesPer100g: 350, proteinPer100g: 12, fatPer100g: 1.5, carbsPer100g: 70 },
  { id: 'preset-quinoa-dry', name: 'Quinoa, dry', baseAmount: 'per 100 g', caloriesPer100g: 370, proteinPer100g: 14, fatPer100g: 6, carbsPer100g: 64 },
  { id: 'preset-bulgur-dry', name: 'Bulgur, dry', baseAmount: 'per 100 g', caloriesPer100g: 340, proteinPer100g: 12, fatPer100g: 1, carbsPer100g: 76 },
  { id: 'preset-rice-cooked', name: 'Rice, cooked', baseAmount: 'per 100 g', caloriesPer100g: 120, proteinPer100g: 2.5, fatPer100g: 0.3, carbsPer100g: 28 },
  { id: 'preset-buckwheat-cooked', name: 'Buckwheat, cooked', baseAmount: 'per 100 g', caloriesPer100g: 110, proteinPer100g: 4, fatPer100g: 1, carbsPer100g: 21 },
  { id: 'preset-oatmeal-porridge-water', name: 'Oatmeal porridge, water', baseAmount: 'per 100 g', caloriesPer100g: 70, proteinPer100g: 2.5, fatPer100g: 1.5, carbsPer100g: 12 },
  { id: 'preset-oatmeal-porridge-milk', name: 'Oatmeal porridge, milk', baseAmount: 'per 100 g', caloriesPer100g: 105, proteinPer100g: 3.6, fatPer100g: 3.2, carbsPer100g: 16 },
  { id: 'preset-rice-porridge-water', name: 'Rice porridge, water', baseAmount: 'per 100 g', caloriesPer100g: 78, proteinPer100g: 1.6, fatPer100g: 0.2, carbsPer100g: 17 },
  { id: 'preset-rice-porridge-milk', name: 'Rice porridge, milk', baseAmount: 'per 100 g', caloriesPer100g: 98, proteinPer100g: 3, fatPer100g: 2.2, carbsPer100g: 17 },
  { id: 'preset-buckwheat-porridge-water', name: 'Buckwheat porridge, water', baseAmount: 'per 100 g', caloriesPer100g: 92, proteinPer100g: 3.4, fatPer100g: 0.8, carbsPer100g: 19 },
  { id: 'preset-buckwheat-porridge-milk', name: 'Buckwheat porridge, milk', baseAmount: 'per 100 g', caloriesPer100g: 118, proteinPer100g: 4.3, fatPer100g: 3.1, carbsPer100g: 19 },
  { id: 'preset-pasta-cooked', name: 'Pasta, cooked', baseAmount: 'per 100 g', caloriesPer100g: 130, proteinPer100g: 5, fatPer100g: 1, carbsPer100g: 25 },

  { id: 'preset-avocado', name: 'Avocado', baseAmount: 'per 100 g', servingGrams: 150, pieceLabel: '1 avocado', caloriesPer100g: 160, proteinPer100g: 2, fatPer100g: 15, carbsPer100g: 9 },
  { id: 'preset-olive-oil', name: 'Olive oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-sunflower-oil', name: 'Sunflower oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-corn-oil', name: 'Corn oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-coconut-oil', name: 'Coconut oil', baseAmount: 'per 100 g', caloriesPer100g: 892, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-avocado-oil', name: 'Avocado oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-flaxseed-oil', name: 'Flaxseed oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-sesame-oil', name: 'Sesame oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-grape-seed-oil', name: 'Grape seed oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-walnut-oil', name: 'Walnut oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-ghee', name: 'Ghee', baseAmount: 'per 100 g', caloriesPer100g: 900, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0, spoonable: true },
  { id: 'preset-butter', name: 'Butter', baseAmount: 'per 100 g', caloriesPer100g: 750, proteinPer100g: 1, fatPer100g: 82, carbsPer100g: 1, spoonable: true },
  { id: 'preset-almonds', name: 'Almonds', baseAmount: 'per 100 g', caloriesPer100g: 580, proteinPer100g: 21, fatPer100g: 50, carbsPer100g: 22 },

  { id: 'preset-banana', name: 'Banana', baseAmount: 'per 100 g', servingGrams: 120, pieceLabel: '1 banana', caloriesPer100g: 89, proteinPer100g: 1, fatPer100g: 0.3, carbsPer100g: 23 },
  { id: 'preset-apple', name: 'Apple', baseAmount: 'per 100 g', servingGrams: 180, pieceLabel: '1 apple', caloriesPer100g: 52, proteinPer100g: 0.3, fatPer100g: 0.2, carbsPer100g: 14 },
  { id: 'preset-pear', name: 'Pear', baseAmount: 'per 100 g', servingGrams: 170, pieceLabel: '1 pear', caloriesPer100g: 57, proteinPer100g: 0.4, fatPer100g: 0.1, carbsPer100g: 15 },
  { id: 'preset-orange', name: 'Orange', baseAmount: 'per 100 g', servingGrams: 130, pieceLabel: '1 orange', caloriesPer100g: 47, proteinPer100g: 1, fatPer100g: 0.1, carbsPer100g: 12 },
  { id: 'preset-mandarin', name: 'Mandarin', baseAmount: 'per 100 g', servingGrams: 75, pieceLabel: '1 mandarin', caloriesPer100g: 53, proteinPer100g: 0.8, fatPer100g: 0.2, carbsPer100g: 13 },
  { id: 'preset-strawberry', name: 'Strawberry', baseAmount: 'per 100 g', caloriesPer100g: 32, proteinPer100g: 0.7, fatPer100g: 0.3, carbsPer100g: 8 },
  { id: 'preset-blueberry', name: 'Blueberry', baseAmount: 'per 100 g', caloriesPer100g: 57, proteinPer100g: 0.7, fatPer100g: 0.3, carbsPer100g: 14 },

  { id: 'preset-cucumber', name: 'Cucumber', baseAmount: 'per 100 g', caloriesPer100g: 15, proteinPer100g: 0.7, fatPer100g: 0.1, carbsPer100g: 3 },
  { id: 'preset-tomato', name: 'Tomato', baseAmount: 'per 100 g', caloriesPer100g: 20, proteinPer100g: 1, fatPer100g: 0.2, carbsPer100g: 4 },
  { id: 'preset-broccoli', name: 'Broccoli', baseAmount: 'per 100 g', caloriesPer100g: 34, proteinPer100g: 3, fatPer100g: 0.4, carbsPer100g: 7 },
  { id: 'preset-carrot', name: 'Carrot', baseAmount: 'per 100 g', caloriesPer100g: 41, proteinPer100g: 1, fatPer100g: 0.2, carbsPer100g: 10 },
  { id: 'preset-zucchini', name: 'Zucchini', baseAmount: 'per 100 g', caloriesPer100g: 17, proteinPer100g: 1, fatPer100g: 0.3, carbsPer100g: 3 },
  { id: 'preset-bell-pepper', name: 'Bell pepper', baseAmount: 'per 100 g', caloriesPer100g: 27, proteinPer100g: 1, fatPer100g: 0.2, carbsPer100g: 6 },
  { id: 'preset-onion', name: 'Onion', baseAmount: 'per 100 g', caloriesPer100g: 40, proteinPer100g: 1.1, fatPer100g: 0.1, carbsPer100g: 9.3 },
  { id: 'preset-potato-boiled', name: 'Boiled potato', baseAmount: 'per 100 g', caloriesPer100g: 77, proteinPer100g: 2, fatPer100g: 0.1, carbsPer100g: 17 },

  { id: 'preset-chicken-breast-grilled', name: 'Chicken breast, grilled', baseAmount: 'per 100 g', caloriesPer100g: 165, proteinPer100g: 31, fatPer100g: 3.6, carbsPer100g: 0 },
  { id: 'preset-chicken-thigh-skinless-grilled', name: 'Chicken thigh skinless, grilled', baseAmount: 'per 100 g', caloriesPer100g: 180, proteinPer100g: 26, fatPer100g: 8, carbsPer100g: 0 },
  { id: 'preset-chicken-wings-grilled', name: 'Chicken wings, grilled', baseAmount: 'per 100 g', caloriesPer100g: 220, proteinPer100g: 27, fatPer100g: 14, carbsPer100g: 0 },
  { id: 'preset-turkey-fillet-grilled', name: 'Turkey fillet, grilled', baseAmount: 'per 100 g', caloriesPer100g: 150, proteinPer100g: 29, fatPer100g: 3, carbsPer100g: 0 },
  { id: 'preset-beef-steak-grilled', name: 'Beef steak, grilled', baseAmount: 'per 100 g', caloriesPer100g: 250, proteinPer100g: 26, fatPer100g: 17, carbsPer100g: 0 },
  { id: 'preset-lean-beef-grilled', name: 'Lean beef, grilled', baseAmount: 'per 100 g', caloriesPer100g: 200, proteinPer100g: 30, fatPer100g: 10, carbsPer100g: 0 },
  { id: 'preset-veal-grilled', name: 'Veal, grilled', baseAmount: 'per 100 g', caloriesPer100g: 170, proteinPer100g: 30, fatPer100g: 5, carbsPer100g: 0 },
  { id: 'preset-lamb-grilled', name: 'Lamb, grilled', baseAmount: 'per 100 g', caloriesPer100g: 280, proteinPer100g: 25, fatPer100g: 20, carbsPer100g: 0 },
  { id: 'preset-salmon-grilled', name: 'Salmon, grilled', baseAmount: 'per 100 g', caloriesPer100g: 220, proteinPer100g: 22, fatPer100g: 15, carbsPer100g: 0 },
  { id: 'preset-trout-grilled', name: 'Trout, grilled', baseAmount: 'per 100 g', caloriesPer100g: 200, proteinPer100g: 21, fatPer100g: 13, carbsPer100g: 0 },
  { id: 'preset-tuna-grilled', name: 'Tuna, grilled', baseAmount: 'per 100 g', caloriesPer100g: 140, proteinPer100g: 30, fatPer100g: 1, carbsPer100g: 0 },
  { id: 'preset-shrimp-grilled', name: 'Shrimp, grilled', baseAmount: 'per 100 g', caloriesPer100g: 100, proteinPer100g: 24, fatPer100g: 1, carbsPer100g: 0 },
  { id: 'preset-squid-grilled', name: 'Squid, grilled', baseAmount: 'per 100 g', caloriesPer100g: 110, proteinPer100g: 18, fatPer100g: 2, carbsPer100g: 3 },

  { id: 'preset-wheat-flour-white', name: 'Wheat flour, white', baseAmount: 'per 100 g', caloriesPer100g: 364, proteinPer100g: 10, fatPer100g: 1, carbsPer100g: 76 },
  { id: 'preset-whole-wheat-flour', name: 'Whole wheat flour', baseAmount: 'per 100 g', caloriesPer100g: 340, proteinPer100g: 13, fatPer100g: 2.5, carbsPer100g: 72 },
  { id: 'preset-durum-flour', name: 'Durum flour', baseAmount: 'per 100 g', caloriesPer100g: 330, proteinPer100g: 13, fatPer100g: 1.5, carbsPer100g: 70 },
  { id: 'preset-oat-flour', name: 'Oat flour', baseAmount: 'per 100 g', caloriesPer100g: 380, proteinPer100g: 13, fatPer100g: 7, carbsPer100g: 65 },
  { id: 'preset-rice-flour', name: 'Rice flour', baseAmount: 'per 100 g', caloriesPer100g: 360, proteinPer100g: 6, fatPer100g: 1, carbsPer100g: 80 },
  { id: 'preset-corn-flour', name: 'Corn flour', baseAmount: 'per 100 g', caloriesPer100g: 360, proteinPer100g: 7, fatPer100g: 1.5, carbsPer100g: 79 },
  { id: 'preset-buckwheat-flour', name: 'Buckwheat flour', baseAmount: 'per 100 g', caloriesPer100g: 335, proteinPer100g: 13, fatPer100g: 3, carbsPer100g: 70 },
  { id: 'preset-green-buckwheat-flour', name: 'Green buckwheat flour', baseAmount: 'per 100 g', caloriesPer100g: 335, proteinPer100g: 13, fatPer100g: 3, carbsPer100g: 70 },
  { id: 'preset-almond-flour', name: 'Almond flour', baseAmount: 'per 100 g', caloriesPer100g: 600, proteinPer100g: 21, fatPer100g: 52, carbsPer100g: 20 },
  { id: 'preset-coconut-flour', name: 'Coconut flour', baseAmount: 'per 100 g', caloriesPer100g: 400, proteinPer100g: 20, fatPer100g: 12, carbsPer100g: 60 },

  { id: 'preset-water', name: 'Water', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-mineral-water', name: 'Mineral water', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-black-coffee', name: 'Black coffee', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 2, proteinPer100g: 0.3, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-americano', name: 'Americano', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 2, proteinPer100g: 0.3, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-espresso', name: 'Espresso', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 9, proteinPer100g: 0.5, fatPer100g: 0, carbsPer100g: 1 },
  { id: 'preset-tea-black-green', name: 'Black or green tea', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 1, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-cappuccino', name: 'Cappuccino', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 40, proteinPer100g: 2, fatPer100g: 2, carbsPer100g: 4 },
  { id: 'preset-latte', name: 'Latte', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 50, proteinPer100g: 2.5, fatPer100g: 2.5, carbsPer100g: 5 },
  { id: 'preset-milk-3-2', name: 'Milk 3.2%', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 60, proteinPer100g: 3, fatPer100g: 3.2, carbsPer100g: 5 },
  { id: 'preset-milk-1', name: 'Milk 1%', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 42, proteinPer100g: 3.4, fatPer100g: 1, carbsPer100g: 5 },
  { id: 'preset-almond-milk', name: 'Almond milk', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 15, proteinPer100g: 0.5, fatPer100g: 1.2, carbsPer100g: 0.3 },
  { id: 'preset-coconut-milk-drink', name: 'Coconut milk drink', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 20, proteinPer100g: 0.2, fatPer100g: 1.5, carbsPer100g: 1 },
  { id: 'preset-oat-milk', name: 'Oat milk', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 45, proteinPer100g: 1, fatPer100g: 1.5, carbsPer100g: 7 },
  { id: 'preset-orange-juice', name: 'Orange juice', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 45, proteinPer100g: 0.7, fatPer100g: 0.2, carbsPer100g: 10 },
  { id: 'preset-apple-juice', name: 'Apple juice', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 46, proteinPer100g: 0.1, fatPer100g: 0.1, carbsPer100g: 11 },
  { id: 'preset-cola', name: 'Cola', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 42, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 10.6 },
  { id: 'preset-diet-cola', name: 'Cola zero sugar', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-coca-cola-zero', name: 'Coca-Cola Zero', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 330, caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0, aliases: ['coke zero', 'coca cola zero sugar', 'cola zero'] },
  { id: 'preset-pepsi-diet', name: 'Pepsi Diet', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 330, caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0, aliases: ['diet pepsi', 'pepsi max', 'pepsi zero'] },
  { id: 'preset-sprite-zero', name: 'Sprite Zero', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 330, caloriesPer100g: 1, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0, aliases: ['sprite zero sugar', 'sprite no sugar'] },
  { id: 'preset-energy-drink', name: 'Energy drink', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 45, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 11 },
  { id: 'preset-sugar-free-energy-drink', name: 'Energy drink zero sugar', baseAmount: 'per 100 ml', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 5, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },

  { id: 'preset-chicken-soup', name: 'Chicken soup', baseAmount: 'per 100 g', caloriesPer100g: 40, proteinPer100g: 4, fatPer100g: 1.5, carbsPer100g: 3 },
  { id: 'preset-vegetable-soup', name: 'Vegetable soup', baseAmount: 'per 100 g', caloriesPer100g: 35, proteinPer100g: 2, fatPer100g: 1, carbsPer100g: 5 },
  { id: 'preset-borscht', name: 'Borscht', baseAmount: 'per 100 g', caloriesPer100g: 60, proteinPer100g: 3, fatPer100g: 2, carbsPer100g: 7 },
  { id: 'preset-pumpkin-cream-soup', name: 'Pumpkin puree soup', baseAmount: 'per 100 g', caloriesPer100g: 50, proteinPer100g: 1, fatPer100g: 2, carbsPer100g: 7 },
  { id: 'preset-creamy-soup', name: 'Creamy soup', baseAmount: 'per 100 g', caloriesPer100g: 80, proteinPer100g: 2, fatPer100g: 5, carbsPer100g: 7 },
  { id: 'preset-vegetable-salad-no-oil', name: 'Vegetable salad, no oil', baseAmount: 'per 100 g', caloriesPer100g: 30, proteinPer100g: 1.5, fatPer100g: 0.5, carbsPer100g: 5 },
  { id: 'preset-vegetable-salad-with-oil', name: 'Vegetable salad with oil', baseAmount: 'per 100 g', caloriesPer100g: 80, proteinPer100g: 1.5, fatPer100g: 5, carbsPer100g: 6 },
  { id: 'preset-chicken-caesar-salad', name: 'Caesar salad with chicken', baseAmount: 'per 100 g', caloriesPer100g: 150, proteinPer100g: 10, fatPer100g: 10, carbsPer100g: 5 },
  { id: 'preset-greek-salad', name: 'Greek salad', baseAmount: 'per 100 g', caloriesPer100g: 120, proteinPer100g: 4, fatPer100g: 9, carbsPer100g: 5 },
  { id: 'preset-tuna-salad', name: 'Tuna salad', baseAmount: 'per 100 g', caloriesPer100g: 130, proteinPer100g: 12, fatPer100g: 8, carbsPer100g: 3 },
  { id: 'preset-pasta-tomato-sauce', name: 'Pasta with tomato sauce', baseAmount: 'per 100 g', caloriesPer100g: 130, proteinPer100g: 4, fatPer100g: 2, carbsPer100g: 25 },
  { id: 'preset-pasta-chicken', name: 'Pasta with chicken', baseAmount: 'per 100 g', caloriesPer100g: 180, proteinPer100g: 10, fatPer100g: 5, carbsPer100g: 25 },
  { id: 'preset-pasta-creamy-sauce', name: 'Pasta with creamy sauce', baseAmount: 'per 100 g', caloriesPer100g: 220, proteinPer100g: 6, fatPer100g: 10, carbsPer100g: 25 },
  { id: 'preset-omelet-2-eggs', name: 'Omelet, 2 eggs', baseAmount: 'per 100 g', servingGrams: 120, caloriesPer100g: 150, proteinPer100g: 12, fatPer100g: 11, carbsPer100g: 1 },
  { id: 'preset-omelet-with-milk', name: 'Omelet with milk', baseAmount: 'per 100 g', caloriesPer100g: 170, proteinPer100g: 12, fatPer100g: 13, carbsPer100g: 2 },
  { id: 'preset-omelet-with-vegetables', name: 'Omelet with vegetables', baseAmount: 'per 100 g', caloriesPer100g: 120, proteinPer100g: 10, fatPer100g: 8, carbsPer100g: 4 },
  { id: 'preset-syrniki-classic', name: 'Syrniki, classic', baseAmount: 'per 100 g', caloriesPer100g: 220, proteinPer100g: 12, fatPer100g: 10, carbsPer100g: 20 },
  { id: 'preset-syrniki-no-sugar', name: 'Syrniki, no sugar', baseAmount: 'per 100 g', caloriesPer100g: 180, proteinPer100g: 14, fatPer100g: 8, carbsPer100g: 12 },

  // Ready home dishes with realistic cooked nutrition per 100 g (+ search synonyms)
  { id: 'preset-mashed-potatoes', name: 'Mashed potatoes', baseAmount: 'per 100 g', caloriesPer100g: 110, proteinPer100g: 2, fatPer100g: 4, carbsPer100g: 16, aliases: ['puree', 'potato puree', 'creamy mashed potato'] },
  { id: 'preset-mashed-potatoes-water', name: 'Mashed potatoes on water', baseAmount: 'per 100 g', caloriesPer100g: 80, proteinPer100g: 2, fatPer100g: 0.5, carbsPer100g: 17, aliases: ['mashed potato no butter'] },
  { id: 'preset-baked-potato', name: 'Baked potato', baseAmount: 'per 100 g', caloriesPer100g: 95, proteinPer100g: 2.5, fatPer100g: 0.3, carbsPer100g: 20, aliases: ['oven potato', 'roast potato'] },
  { id: 'preset-french-fries', name: 'French fries', baseAmount: 'per 100 g', caloriesPer100g: 310, proteinPer100g: 3.4, fatPer100g: 15, carbsPer100g: 41, aliases: ['fries', 'fried potato'] },

  { id: 'preset-boiled-buckwheat-side', name: 'Buckwheat, boiled', baseAmount: 'per 100 g', caloriesPer100g: 110, proteinPer100g: 4, fatPer100g: 1, carbsPer100g: 21, aliases: ['cooked buckwheat'] },
  { id: 'preset-boiled-bulgur-side', name: 'Bulgur, boiled', baseAmount: 'per 100 g', caloriesPer100g: 110, proteinPer100g: 3, fatPer100g: 0.3, carbsPer100g: 23, aliases: ['cooked bulgur'] },
  { id: 'preset-boiled-quinoa-side', name: 'Quinoa, boiled', baseAmount: 'per 100 g', caloriesPer100g: 120, proteinPer100g: 4.4, fatPer100g: 1.9, carbsPer100g: 21, aliases: ['cooked quinoa'] },

  { id: 'preset-dorado-steamed', name: 'Dorado, steamed', baseAmount: 'per 100 g', caloriesPer100g: 100, proteinPer100g: 19, fatPer100g: 3, carbsPer100g: 0, aliases: ['sea bream', 'dorada', 'baked dorado'] },
  { id: 'preset-seabass-steamed', name: 'Sea bass, steamed', baseAmount: 'per 100 g', caloriesPer100g: 100, proteinPer100g: 18, fatPer100g: 2.5, carbsPer100g: 0, aliases: ['baked sea bass', 'branzino'] },
  { id: 'preset-salmon-steamed', name: 'Salmon, steamed', baseAmount: 'per 100 g', caloriesPer100g: 200, proteinPer100g: 22, fatPer100g: 13, carbsPer100g: 0, aliases: ['baked salmon', 'poached salmon'] },
  { id: 'preset-cod-steamed', name: 'Cod, steamed', baseAmount: 'per 100 g', caloriesPer100g: 80, proteinPer100g: 18, fatPer100g: 0.7, carbsPer100g: 0, aliases: ['boiled cod', 'baked cod'] },
  { id: 'preset-pollock-steamed', name: 'Pollock, steamed', baseAmount: 'per 100 g', caloriesPer100g: 75, proteinPer100g: 16, fatPer100g: 0.9, carbsPer100g: 0, aliases: ['boiled pollock'] },
  { id: 'preset-pikeperch-steamed', name: 'Pike perch, steamed', baseAmount: 'per 100 g', caloriesPer100g: 84, proteinPer100g: 19, fatPer100g: 0.8, carbsPer100g: 0, aliases: ['zander', 'walleye'] },
  { id: 'preset-hake-steamed', name: 'Hake, steamed', baseAmount: 'per 100 g', caloriesPer100g: 86, proteinPer100g: 16, fatPer100g: 2, carbsPer100g: 0, aliases: ['boiled hake'] },
  { id: 'preset-pink-salmon-steamed', name: 'Pink salmon, steamed', baseAmount: 'per 100 g', caloriesPer100g: 140, proteinPer100g: 21, fatPer100g: 6, carbsPer100g: 0, aliases: ['baked pink salmon', 'humpback salmon'] },
  { id: 'preset-mackerel-baked', name: 'Mackerel, baked', baseAmount: 'per 100 g', caloriesPer100g: 190, proteinPer100g: 18, fatPer100g: 13, carbsPer100g: 0, aliases: ['baked mackerel'] },

  { id: 'preset-chicken-breast-boiled', name: 'Chicken breast, boiled', baseAmount: 'per 100 g', caloriesPer100g: 130, proteinPer100g: 27, fatPer100g: 2, carbsPer100g: 0, aliases: ['steamed chicken breast', 'poached chicken'] },
  { id: 'preset-chicken-cutlets', name: 'Chicken cutlets', baseAmount: 'per 100 g', caloriesPer100g: 170, proteinPer100g: 16, fatPer100g: 10, carbsPer100g: 6, aliases: ['chicken patties', 'chicken kotlety'] },
  { id: 'preset-turkey-cutlets', name: 'Turkey cutlets', baseAmount: 'per 100 g', caloriesPer100g: 150, proteinPer100g: 17, fatPer100g: 7, carbsPer100g: 5, aliases: ['turkey patties'] },
  { id: 'preset-meatballs', name: 'Meatballs', baseAmount: 'per 100 g', caloriesPer100g: 170, proteinPer100g: 12, fatPer100g: 10, carbsPer100g: 8, aliases: ['beef meatballs'] },
  { id: 'preset-beef-stew', name: 'Beef stew', baseAmount: 'per 100 g', caloriesPer100g: 180, proteinPer100g: 16, fatPer100g: 12, carbsPer100g: 2, aliases: ['braised beef', 'stewed beef'] },

  { id: 'preset-boiled-egg', name: 'Boiled egg', baseAmount: 'per 100 g', servingGrams: 50, pieceLabel: '1 egg', caloriesPer100g: 155, proteinPer100g: 13, fatPer100g: 11, carbsPer100g: 1, aliases: ['hard boiled egg'] },
  { id: 'preset-fried-eggs', name: 'Fried eggs', baseAmount: 'per 100 g', servingGrams: 60, pieceLabel: '1 egg', caloriesPer100g: 200, proteinPer100g: 13, fatPer100g: 16, carbsPer100g: 1, aliases: ['sunny side up'] },

  { id: 'preset-cottage-cheese-bake', name: 'Cottage cheese bake', baseAmount: 'per 100 g', caloriesPer100g: 170, proteinPer100g: 16, fatPer100g: 5, carbsPer100g: 15, aliases: ['curd bake', 'zapekanka'] },

  { id: 'preset-broccoli-steamed', name: 'Broccoli, steamed', baseAmount: 'per 100 g', caloriesPer100g: 35, proteinPer100g: 3, fatPer100g: 0.4, carbsPer100g: 7, aliases: ['boiled broccoli'] },
  { id: 'preset-cauliflower-steamed', name: 'Cauliflower, steamed', baseAmount: 'per 100 g', caloriesPer100g: 25, proteinPer100g: 2, fatPer100g: 0.3, carbsPer100g: 5, aliases: ['boiled cauliflower'] },
  { id: 'preset-vegetables-steamed', name: 'Vegetables, steamed', baseAmount: 'per 100 g', caloriesPer100g: 45, proteinPer100g: 2.5, fatPer100g: 0.5, carbsPer100g: 8, aliases: ['mixed steamed veg', 'veg stew'] },
  { id: 'preset-zucchini-steamed', name: 'Zucchini, steamed', baseAmount: 'per 100 g', caloriesPer100g: 20, proteinPer100g: 1, fatPer100g: 0.3, carbsPer100g: 4, aliases: ['boiled zucchini', 'courgette'] },

  { id: 'preset-mushroom-soup', name: 'Mushroom soup', baseAmount: 'per 100 g', caloriesPer100g: 50, proteinPer100g: 2, fatPer100g: 3, carbsPer100g: 4, aliases: ['cream of mushroom'] },

  // --- Baking, sweets & sweeteners ---
  { id: 'preset-cocoa-powder', name: 'Cocoa powder', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 228, proteinPer100g: 19.6, fatPer100g: 13.7, carbsPer100g: 57.9, aliases: ['cacao', 'unsweetened cocoa'] },
  { id: 'preset-sugar', name: 'Sugar', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 387, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 100, aliases: ['white sugar', 'granulated sugar'] },
  { id: 'preset-brown-sugar', name: 'Brown sugar', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 380, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 98 },
  { id: 'preset-powdered-sugar', name: 'Powdered sugar', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 389, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 100, aliases: ['icing sugar'] },
  { id: 'preset-honey', name: 'Honey', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 304, proteinPer100g: 0.3, fatPer100g: 0, carbsPer100g: 82 },
  { id: 'preset-maple-syrup', name: 'Maple syrup', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 260, proteinPer100g: 0, fatPer100g: 0.1, carbsPer100g: 67 },
  { id: 'preset-jam', name: 'Jam', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 278, proteinPer100g: 0.4, fatPer100g: 0.1, carbsPer100g: 69, aliases: ['fruit preserve', 'confiture'] },
  { id: 'preset-salt', name: 'Salt', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-starch', name: 'Cornstarch', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 381, proteinPer100g: 0.3, fatPer100g: 0.1, carbsPer100g: 91, aliases: ['starch', 'potato starch'] },
  { id: 'preset-baking-powder', name: 'Baking powder', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 53, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 28, aliases: ['baking soda'] },
  { id: 'preset-vanilla', name: 'Vanilla extract', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 288, proteinPer100g: 0.1, fatPer100g: 0.1, carbsPer100g: 12.7 },
  { id: 'preset-dark-chocolate', name: 'Dark chocolate', baseAmount: 'per 100 g', caloriesPer100g: 598, proteinPer100g: 7.8, fatPer100g: 43, carbsPer100g: 46, aliases: ['70% chocolate'] },
  { id: 'preset-milk-chocolate', name: 'Milk chocolate', baseAmount: 'per 100 g', caloriesPer100g: 535, proteinPer100g: 7.6, fatPer100g: 30, carbsPer100g: 59 },
  { id: 'preset-choco-spread', name: 'Chocolate hazelnut spread', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 539, proteinPer100g: 6.3, fatPer100g: 30.9, carbsPer100g: 57.5, aliases: ['nutella'] },
  { id: 'preset-peanut-butter', name: 'Peanut butter', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 588, proteinPer100g: 25, fatPer100g: 50, carbsPer100g: 20 },
  { id: 'preset-condensed-milk', name: 'Condensed milk', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 321, proteinPer100g: 7.9, fatPer100g: 8.7, carbsPer100g: 54 },
  { id: 'preset-ice-cream', name: 'Ice cream', baseAmount: 'per 100 g', caloriesPer100g: 207, proteinPer100g: 3.5, fatPer100g: 11, carbsPer100g: 24 },

  // --- Dairy ---
  { id: 'preset-milk-2-5', name: 'Milk 2.5%', baseAmount: 'per 100 g', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 52, proteinPer100g: 2.9, fatPer100g: 2.5, carbsPer100g: 4.7 },
  { id: 'preset-sour-cream', name: 'Sour cream 20%', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 206, proteinPer100g: 2.8, fatPer100g: 20, carbsPer100g: 3.4, aliases: ['smetana'] },
  { id: 'preset-cream-10', name: 'Cream 10%', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 118, proteinPer100g: 3, fatPer100g: 10, carbsPer100g: 4 },
  { id: 'preset-heavy-cream', name: 'Heavy cream 33%', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 322, proteinPer100g: 2.2, fatPer100g: 33, carbsPer100g: 3 },
  { id: 'preset-kefir', name: 'Kefir 2.5%', baseAmount: 'per 100 g', baseMode: '100ml', servingGrams: 250, caloriesPer100g: 53, proteinPer100g: 2.9, fatPer100g: 2.5, carbsPer100g: 4 },
  { id: 'preset-yogurt-natural', name: 'Natural yogurt', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 60, proteinPer100g: 5, fatPer100g: 3.2, carbsPer100g: 4.7 },
  { id: 'preset-hard-cheese', name: 'Hard cheese', baseAmount: 'per 100 g', caloriesPer100g: 356, proteinPer100g: 25, fatPer100g: 27, carbsPer100g: 1.3, aliases: ['gouda', 'cheddar', 'russian cheese'] },
  { id: 'preset-parmesan', name: 'Parmesan', baseAmount: 'per 100 g', caloriesPer100g: 392, proteinPer100g: 36, fatPer100g: 26, carbsPer100g: 3.2 },
  { id: 'preset-mozzarella', name: 'Mozzarella', baseAmount: 'per 100 g', caloriesPer100g: 280, proteinPer100g: 22, fatPer100g: 22, carbsPer100g: 2.2 },
  { id: 'preset-feta', name: 'Feta', baseAmount: 'per 100 g', caloriesPer100g: 265, proteinPer100g: 14, fatPer100g: 21, carbsPer100g: 4, aliases: ['brynza'] },
  { id: 'preset-cream-cheese', name: 'Cream cheese', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 342, proteinPer100g: 6, fatPer100g: 34, carbsPer100g: 4, aliases: ['philadelphia'] },
  { id: 'preset-cottage-cheese-9', name: 'Cottage cheese 9%', baseAmount: 'per 100 g', caloriesPer100g: 169, proteinPer100g: 16.7, fatPer100g: 9, carbsPer100g: 2 },

  // --- Vegetables ---
  { id: 'preset-cabbage', name: 'White cabbage', baseAmount: 'per 100 g', caloriesPer100g: 25, proteinPer100g: 1.3, fatPer100g: 0.1, carbsPer100g: 6, aliases: ['cabbage'] },
  { id: 'preset-spinach', name: 'Spinach', baseAmount: 'per 100 g', caloriesPer100g: 23, proteinPer100g: 2.9, fatPer100g: 0.4, carbsPer100g: 3.6 },
  { id: 'preset-garlic', name: 'Garlic', baseAmount: 'per 100 g', servingGrams: 3, pieceLabel: '1 clove', caloriesPer100g: 149, proteinPer100g: 6.4, fatPer100g: 0.5, carbsPer100g: 33 },
  { id: 'preset-green-peas', name: 'Green peas', baseAmount: 'per 100 g', caloriesPer100g: 81, proteinPer100g: 5.4, fatPer100g: 0.4, carbsPer100g: 14 },
  { id: 'preset-corn', name: 'Sweet corn', baseAmount: 'per 100 g', caloriesPer100g: 86, proteinPer100g: 3.2, fatPer100g: 1.2, carbsPer100g: 19 },
  { id: 'preset-green-beans', name: 'Green beans', baseAmount: 'per 100 g', caloriesPer100g: 31, proteinPer100g: 1.8, fatPer100g: 0.1, carbsPer100g: 7 },
  { id: 'preset-beetroot', name: 'Beetroot', baseAmount: 'per 100 g', caloriesPer100g: 43, proteinPer100g: 1.6, fatPer100g: 0.2, carbsPer100g: 10, aliases: ['beet'] },
  { id: 'preset-eggplant', name: 'Eggplant', baseAmount: 'per 100 g', caloriesPer100g: 25, proteinPer100g: 1, fatPer100g: 0.2, carbsPer100g: 6, aliases: ['aubergine'] },
  { id: 'preset-mushrooms', name: 'Mushrooms', baseAmount: 'per 100 g', caloriesPer100g: 22, proteinPer100g: 3.1, fatPer100g: 0.3, carbsPer100g: 3.3, aliases: ['champignon', 'button mushrooms'] },
  { id: 'preset-pumpkin', name: 'Pumpkin', baseAmount: 'per 100 g', caloriesPer100g: 26, proteinPer100g: 1, fatPer100g: 0.1, carbsPer100g: 6.5 },
  { id: 'preset-sweet-potato', name: 'Sweet potato', baseAmount: 'per 100 g', caloriesPer100g: 86, proteinPer100g: 1.6, fatPer100g: 0.1, carbsPer100g: 20 },
  { id: 'preset-celery', name: 'Celery', baseAmount: 'per 100 g', caloriesPer100g: 16, proteinPer100g: 0.7, fatPer100g: 0.2, carbsPer100g: 3 },
  { id: 'preset-lettuce', name: 'Lettuce', baseAmount: 'per 100 g', caloriesPer100g: 15, proteinPer100g: 1.4, fatPer100g: 0.2, carbsPer100g: 2.9, aliases: ['salad leaves'] },
  { id: 'preset-green-onion', name: 'Green onion', baseAmount: 'per 100 g', caloriesPer100g: 32, proteinPer100g: 1.8, fatPer100g: 0.2, carbsPer100g: 7, aliases: ['scallion'] },
  { id: 'preset-radish', name: 'Radish', baseAmount: 'per 100 g', caloriesPer100g: 16, proteinPer100g: 0.7, fatPer100g: 0.1, carbsPer100g: 3.4 },
  { id: 'preset-cauliflower-raw', name: 'Cauliflower', baseAmount: 'per 100 g', caloriesPer100g: 25, proteinPer100g: 1.9, fatPer100g: 0.3, carbsPer100g: 5 },

  // --- Legumes & soy ---
  { id: 'preset-lentils', name: 'Lentils, boiled', baseAmount: 'per 100 g', caloriesPer100g: 116, proteinPer100g: 9, fatPer100g: 0.4, carbsPer100g: 20 },
  { id: 'preset-chickpeas', name: 'Chickpeas, boiled', baseAmount: 'per 100 g', caloriesPer100g: 164, proteinPer100g: 8.9, fatPer100g: 2.6, carbsPer100g: 27, aliases: ['garbanzo'] },
  { id: 'preset-red-beans', name: 'Red beans, boiled', baseAmount: 'per 100 g', caloriesPer100g: 127, proteinPer100g: 8.7, fatPer100g: 0.5, carbsPer100g: 22, aliases: ['kidney beans'] },
  { id: 'preset-tofu', name: 'Tofu', baseAmount: 'per 100 g', caloriesPer100g: 76, proteinPer100g: 8, fatPer100g: 4.8, carbsPer100g: 1.9 },

  // --- Fruits & berries ---
  { id: 'preset-grapes', name: 'Grapes', baseAmount: 'per 100 g', caloriesPer100g: 69, proteinPer100g: 0.7, fatPer100g: 0.2, carbsPer100g: 18 },
  { id: 'preset-watermelon', name: 'Watermelon', baseAmount: 'per 100 g', caloriesPer100g: 30, proteinPer100g: 0.6, fatPer100g: 0.2, carbsPer100g: 8 },
  { id: 'preset-melon', name: 'Melon', baseAmount: 'per 100 g', caloriesPer100g: 34, proteinPer100g: 0.8, fatPer100g: 0.2, carbsPer100g: 8 },
  { id: 'preset-peach', name: 'Peach', baseAmount: 'per 100 g', servingGrams: 150, pieceLabel: '1 peach', caloriesPer100g: 39, proteinPer100g: 0.9, fatPer100g: 0.3, carbsPer100g: 10 },
  { id: 'preset-plum', name: 'Plum', baseAmount: 'per 100 g', servingGrams: 65, pieceLabel: '1 plum', caloriesPer100g: 46, proteinPer100g: 0.7, fatPer100g: 0.3, carbsPer100g: 11 },
  { id: 'preset-cherry', name: 'Cherry', baseAmount: 'per 100 g', caloriesPer100g: 63, proteinPer100g: 1.1, fatPer100g: 0.2, carbsPer100g: 16 },
  { id: 'preset-raspberry', name: 'Raspberry', baseAmount: 'per 100 g', caloriesPer100g: 52, proteinPer100g: 1.2, fatPer100g: 0.7, carbsPer100g: 12 },
  { id: 'preset-kiwi', name: 'Kiwi', baseAmount: 'per 100 g', servingGrams: 75, pieceLabel: '1 kiwi', caloriesPer100g: 61, proteinPer100g: 1.1, fatPer100g: 0.5, carbsPer100g: 15 },
  { id: 'preset-lemon', name: 'Lemon', baseAmount: 'per 100 g', caloriesPer100g: 29, proteinPer100g: 1.1, fatPer100g: 0.3, carbsPer100g: 9 },
  { id: 'preset-pineapple', name: 'Pineapple', baseAmount: 'per 100 g', caloriesPer100g: 50, proteinPer100g: 0.5, fatPer100g: 0.1, carbsPer100g: 13 },
  { id: 'preset-pomegranate', name: 'Pomegranate', baseAmount: 'per 100 g', caloriesPer100g: 83, proteinPer100g: 1.7, fatPer100g: 1.2, carbsPer100g: 19 },
  { id: 'preset-mango', name: 'Mango', baseAmount: 'per 100 g', caloriesPer100g: 60, proteinPer100g: 0.8, fatPer100g: 0.4, carbsPer100g: 15 },
  { id: 'preset-grapefruit', name: 'Grapefruit', baseAmount: 'per 100 g', caloriesPer100g: 42, proteinPer100g: 0.8, fatPer100g: 0.1, carbsPer100g: 11 },
  { id: 'preset-apricot', name: 'Apricot', baseAmount: 'per 100 g', caloriesPer100g: 48, proteinPer100g: 1.4, fatPer100g: 0.4, carbsPer100g: 11 },
  { id: 'preset-raisins', name: 'Raisins', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 299, proteinPer100g: 3.1, fatPer100g: 0.5, carbsPer100g: 79 },
  { id: 'preset-dates', name: 'Dates', baseAmount: 'per 100 g', caloriesPer100g: 282, proteinPer100g: 2.5, fatPer100g: 0.4, carbsPer100g: 75 },
  { id: 'preset-dried-apricots', name: 'Dried apricots', baseAmount: 'per 100 g', caloriesPer100g: 241, proteinPer100g: 3.4, fatPer100g: 0.5, carbsPer100g: 63 },
  { id: 'preset-prunes', name: 'Prunes', baseAmount: 'per 100 g', caloriesPer100g: 240, proteinPer100g: 2.2, fatPer100g: 0.4, carbsPer100g: 64 },

  // --- Nuts & seeds ---
  { id: 'preset-walnuts', name: 'Walnuts', baseAmount: 'per 100 g', caloriesPer100g: 654, proteinPer100g: 15, fatPer100g: 65, carbsPer100g: 14 },
  { id: 'preset-cashews', name: 'Cashews', baseAmount: 'per 100 g', caloriesPer100g: 553, proteinPer100g: 18, fatPer100g: 44, carbsPer100g: 30 },
  { id: 'preset-hazelnuts', name: 'Hazelnuts', baseAmount: 'per 100 g', caloriesPer100g: 628, proteinPer100g: 15, fatPer100g: 61, carbsPer100g: 17 },
  { id: 'preset-peanuts', name: 'Peanuts', baseAmount: 'per 100 g', caloriesPer100g: 567, proteinPer100g: 26, fatPer100g: 49, carbsPer100g: 16 },
  { id: 'preset-pistachios', name: 'Pistachios', baseAmount: 'per 100 g', caloriesPer100g: 562, proteinPer100g: 20, fatPer100g: 45, carbsPer100g: 28 },
  { id: 'preset-sunflower-seeds', name: 'Sunflower seeds', baseAmount: 'per 100 g', caloriesPer100g: 584, proteinPer100g: 21, fatPer100g: 51, carbsPer100g: 20 },
  { id: 'preset-pumpkin-seeds', name: 'Pumpkin seeds', baseAmount: 'per 100 g', caloriesPer100g: 559, proteinPer100g: 30, fatPer100g: 49, carbsPer100g: 11 },
  { id: 'preset-chia', name: 'Chia seeds', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 486, proteinPer100g: 17, fatPer100g: 31, carbsPer100g: 42 },
  { id: 'preset-flaxseed', name: 'Flaxseed', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 534, proteinPer100g: 18, fatPer100g: 42, carbsPer100g: 29 },
  { id: 'preset-sesame-seeds', name: 'Sesame seeds', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 573, proteinPer100g: 18, fatPer100g: 50, carbsPer100g: 23 },

  // --- Grains & bread ---
  { id: 'preset-white-bread', name: 'White bread', baseAmount: 'per 100 g', servingGrams: 35, pieceLabel: '1 slice', caloriesPer100g: 265, proteinPer100g: 9, fatPer100g: 3.2, carbsPer100g: 49, aliases: ['toast', 'loaf'] },
  { id: 'preset-rye-bread', name: 'Rye bread', baseAmount: 'per 100 g', servingGrams: 35, pieceLabel: '1 slice', caloriesPer100g: 259, proteinPer100g: 8.5, fatPer100g: 3.3, carbsPer100g: 48, aliases: ['black bread'] },
  { id: 'preset-whole-grain-bread', name: 'Whole grain bread', baseAmount: 'per 100 g', servingGrams: 40, pieceLabel: '1 slice', caloriesPer100g: 247, proteinPer100g: 13, fatPer100g: 3.4, carbsPer100g: 41 },
  { id: 'preset-corn-flakes', name: 'Corn flakes', baseAmount: 'per 100 g', caloriesPer100g: 357, proteinPer100g: 7, fatPer100g: 0.4, carbsPer100g: 84 },
  { id: 'preset-granola', name: 'Granola / muesli', baseAmount: 'per 100 g', caloriesPer100g: 450, proteinPer100g: 10, fatPer100g: 13, carbsPer100g: 72, aliases: ['muesli'] },
  { id: 'preset-semolina-dry', name: 'Semolina, dry', baseAmount: 'per 100 g', caloriesPer100g: 360, proteinPer100g: 10, fatPer100g: 1, carbsPer100g: 73, aliases: ['semolina'] },
  { id: 'preset-couscous', name: 'Couscous, boiled', baseAmount: 'per 100 g', caloriesPer100g: 112, proteinPer100g: 3.8, fatPer100g: 0.2, carbsPer100g: 23 },
  { id: 'preset-millet', name: 'Millet, boiled', baseAmount: 'per 100 g', caloriesPer100g: 119, proteinPer100g: 3.5, fatPer100g: 1, carbsPer100g: 23 },
  { id: 'preset-pearl-barley', name: 'Pearl barley, boiled', baseAmount: 'per 100 g', caloriesPer100g: 123, proteinPer100g: 2.3, fatPer100g: 0.4, carbsPer100g: 28 },

  // --- Meat & fish ---
  { id: 'preset-pork-grilled', name: 'Pork, grilled', baseAmount: 'per 100 g', caloriesPer100g: 242, proteinPer100g: 27, fatPer100g: 14, carbsPer100g: 0 },
  { id: 'preset-bacon', name: 'Bacon', baseAmount: 'per 100 g', caloriesPer100g: 541, proteinPer100g: 37, fatPer100g: 42, carbsPer100g: 1.4 },
  { id: 'preset-ham', name: 'Ham', baseAmount: 'per 100 g', caloriesPer100g: 145, proteinPer100g: 18, fatPer100g: 8, carbsPer100g: 1.5 },
  { id: 'preset-sausage', name: 'Boiled sausage', baseAmount: 'per 100 g', caloriesPer100g: 257, proteinPer100g: 12, fatPer100g: 22, carbsPer100g: 3, aliases: ['doctor sausage', 'bologna'] },
  { id: 'preset-frankfurter', name: 'Frankfurter', baseAmount: 'per 100 g', servingGrams: 50, pieceLabel: '1 sausage', caloriesPer100g: 297, proteinPer100g: 11, fatPer100g: 27, carbsPer100g: 2, aliases: ['hot dog sausage', 'wiener'] },
  { id: 'preset-chicken-liver', name: 'Chicken liver', baseAmount: 'per 100 g', caloriesPer100g: 137, proteinPer100g: 20, fatPer100g: 5.8, carbsPer100g: 0.7 },
  { id: 'preset-cod-raw', name: 'Cod, raw', baseAmount: 'per 100 g', caloriesPer100g: 82, proteinPer100g: 18, fatPer100g: 0.7, carbsPer100g: 0 },
  { id: 'preset-herring', name: 'Herring', baseAmount: 'per 100 g', caloriesPer100g: 158, proteinPer100g: 18, fatPer100g: 9, carbsPer100g: 0 },
  { id: 'preset-red-caviar', name: 'Red caviar', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 264, proteinPer100g: 24, fatPer100g: 18, carbsPer100g: 4 },
  { id: 'preset-crab-sticks', name: 'Crab sticks', baseAmount: 'per 100 g', caloriesPer100g: 94, proteinPer100g: 6, fatPer100g: 1, carbsPer100g: 14 },

  // --- Sauces & condiments ---
  { id: 'preset-mayonnaise', name: 'Mayonnaise', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 680, proteinPer100g: 1, fatPer100g: 75, carbsPer100g: 2.6 },
  { id: 'preset-ketchup', name: 'Ketchup', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 112, proteinPer100g: 1.7, fatPer100g: 0.4, carbsPer100g: 26 },
  { id: 'preset-mustard', name: 'Mustard', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 66, proteinPer100g: 4.4, fatPer100g: 4, carbsPer100g: 5 },
  { id: 'preset-soy-sauce', name: 'Soy sauce', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 53, proteinPer100g: 8, fatPer100g: 0.6, carbsPer100g: 4.9 },
  { id: 'preset-tomato-paste', name: 'Tomato paste', baseAmount: 'per 100 g', spoonable: true, caloriesPer100g: 82, proteinPer100g: 4.3, fatPer100g: 0.5, carbsPer100g: 19 },
];

export function getNutritionValuesForGrams(preset: NutritionFoodPreset, gramsValue: string) {
  if ((preset.baseMode || '100g') === 'serving') {
    // For serving-based items the amount is the number of servings (used as-is, no gram conversion).
    const count = Math.max(0, toNumber(gramsValue));
    const mult = count > 0 ? count : 1;
    return {
      grams: count > 0 ? count : 1,
      calories: String(Math.round(preset.caloriesPer100g * mult)),
      protein: String(Math.round(preset.proteinPer100g * mult * 10) / 10),
      fat: String(Math.round(preset.fatPer100g * mult * 10) / 10),
      carbs: String(Math.round(preset.carbsPer100g * mult * 10) / 10),
    };
  }
  const grams = Math.max(0, toNumber(gramsValue));
  const multiplier = grams / Math.max(1, preset.baseQuantity || 100);
  return {
    grams,
    calories: String(Math.round(preset.caloriesPer100g * multiplier)),
    protein: String(Math.round(preset.proteinPer100g * multiplier * 10) / 10),
    fat: String(Math.round(preset.fatPer100g * multiplier * 10) / 10),
    carbs: String(Math.round(preset.carbsPer100g * multiplier * 10) / 10),
  };
}

export function customNutritionFoodToPreset(food: CustomNutritionFood): NutritionFoodPreset {
  const baseQuantity = Math.max(1, food.baseQuantity || 100);
  return {
    id: food.id,
    name: food.name.trim(),
    baseAmount:
      food.baseMode === 'serving'
        ? 'per 1 serving'
        : `per ${baseQuantity} ${food.baseMode === '100ml' ? 'ml' : 'g'}`,
    baseMode: food.baseMode,
    baseQuantity,
    brand: food.brand,
    barcode: food.barcode,
    servingGrams: food.servingGrams || undefined,
    serving: food.serving,
    isCustom: true,
    source: 'custom',
    sourceLabel: 'Saved',
    caloriesPer100g: food.calories,
    proteinPer100g: food.protein,
    fatPer100g: food.fat,
    carbsPer100g: food.carbs,
  };
}

export function nutritionPresetToCustomFood(preset: NutritionFoodPreset): CustomNutritionFood {
  const baseMode = preset.baseMode || '100g';
  const defaultBaseQuantity = baseMode === 'serving' ? 1 : 100;
  return {
    id: preset.id,
    name: preset.name,
    brand: preset.brand?.trim() || undefined,
    barcode: preset.barcode?.trim() || undefined,
    servingGrams: preset.servingGrams || undefined,
    serving: preset.serving,
    baseMode,
    baseQuantity: Math.max(1, preset.baseQuantity || defaultBaseQuantity),
    calories: Math.max(0, Math.round(preset.caloriesPer100g * 10) / 10),
    protein: Math.max(0, Math.round(preset.proteinPer100g * 10) / 10),
    fat: Math.max(0, Math.round(preset.fatPer100g * 10) / 10),
    carbs: Math.max(0, Math.round(preset.carbsPer100g * 10) / 10),
  };
}

export function cleanNutritionNumber(value: string) {
  return value.replace(/[^0-9.,]/g, '').slice(0, 6);
}

export function toNumber(value?: string) {
  if (!value?.trim()) return 0;
  return Number(value.replace(',', '.')) || 0;
}

export function parseBirthDate(value?: string) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calcAge(dateOfBirth?: string) {
  const dob = parseBirthDate(dateOfBirth);
  if (!dob) return 0;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return Math.max(0, age);
}

export function getNutritionPlan({
  dateOfBirth,
  heightCm,
  weightKg,
  goal,
  activityLevel,
  sex,
  calorieOverride,
  desiredWeightKg,
  pace,
}: {
  dateOfBirth?: string;
  heightCm?: string;
  weightKg?: string;
  goal: NutritionGoal;
  activityLevel: ActivityLevel;
  sex: NutritionSex;
  calorieOverride?: string;
  desiredWeightKg?: string;
  pace?: NutritionPace;
}) {
  const height = toNumber(heightCm);
  const weight = toNumber(weightKg);
  const desiredWeight = toNumber(desiredWeightKg);
  const age = calcAge(dateOfBirth);
  if (!height || !weight || !age) return null;

  const bmr =
    sex === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const activityMultiplier = activityLevel === 'high' ? 1.7 : activityLevel === 'low' ? 1.3 : 1.5;
  const maintenanceCalories = bmr * activityMultiplier;
  const effectiveGoal =
    desiredWeight > 0
      ? desiredWeight < weight
        ? 'lose'
        : desiredWeight > weight
          ? 'gain'
          : 'maintain'
      : goal;
  const adjustment =
    effectiveGoal === 'gain'
      ? pace === 'fast'
        ? 320
        : 170
      : effectiveGoal === 'lose'
        ? pace === 'fast'
          ? -550
          : -250
        : 0;
  const calculatedCalories = maintenanceCalories + adjustment;
  const targetCalories = toNumber(calorieOverride) > 0 ? toNumber(calorieOverride) : calculatedCalories;

  const proteinTarget = weight * (goal === 'gain' ? 2 : 1.8);
  const fatTarget = weight * 0.8;
  const proteinCalories = proteinTarget * 4;
  const fatCalories = fatTarget * 9;
  const carbsTarget = Math.max(0, (targetCalories - proteinCalories - fatCalories) / 4);

  return {
    age,
    effectiveGoal,
    currentWeight: weight,
    desiredWeight: desiredWeight || weight,
    calories: Math.round(targetCalories),
    protein: Math.round(proteinTarget),
    fat: Math.round(fatTarget),
    carbs: Math.round(carbsTarget),
  };
}

export function getNutritionTotals(entries: NutritionFoodEntry[]) {
  return entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + toNumber(entry.calories),
      protein: acc.protein + toNumber(entry.protein),
      fat: acc.fat + toNumber(entry.fat),
      carbs: acc.carbs + toNumber(entry.carbs),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

export function buildMacroMessage(title: string, current: number, target: number, unit: string) {
  const diff = Math.round(target - current);
  if (diff > 0) return { title, text: `${diff} ${unit} left to hit your target.` };
  if (diff < 0) return { title, text: `${Math.abs(diff)} ${unit} over your target.` };
  return { title, text: 'Target reached.' };
}
