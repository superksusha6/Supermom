import { ActivityLevel, NutritionFoodEntry, NutritionGoal, NutritionPace, NutritionSex } from '@/types/app';

export type NutritionFoodPreset = {
  id: string;
  name: string;
  baseAmount: string;
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
  { id: 'preset-egg', name: 'Egg', baseAmount: 'per 100 g', caloriesPer100g: 155, proteinPer100g: 13, fatPer100g: 11, carbsPer100g: 1 },
  { id: 'preset-egg-white', name: 'Egg white', baseAmount: 'per 100 g', caloriesPer100g: 52, proteinPer100g: 10.9, fatPer100g: 0.2, carbsPer100g: 0.7 },
  { id: 'preset-egg-yolk', name: 'Egg yolk', baseAmount: 'per 100 g', caloriesPer100g: 322, proteinPer100g: 15.9, fatPer100g: 26.5, carbsPer100g: 3.6 },
  { id: 'preset-cottage-cheese-5', name: 'Cottage cheese 5%', baseAmount: 'per 100 g', caloriesPer100g: 120, proteinPer100g: 17, fatPer100g: 5, carbsPer100g: 3 },
  { id: 'preset-greek-yogurt', name: 'Greek yogurt', baseAmount: 'per 100 g', caloriesPer100g: 60, proteinPer100g: 10, fatPer100g: 2, carbsPer100g: 3 },

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

  { id: 'preset-avocado', name: 'Avocado', baseAmount: 'per 100 g', caloriesPer100g: 160, proteinPer100g: 2, fatPer100g: 15, carbsPer100g: 9 },
  { id: 'preset-olive-oil', name: 'Olive oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-sunflower-oil', name: 'Sunflower oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-corn-oil', name: 'Corn oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-coconut-oil', name: 'Coconut oil', baseAmount: 'per 100 g', caloriesPer100g: 892, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-avocado-oil', name: 'Avocado oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-flaxseed-oil', name: 'Flaxseed oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-sesame-oil', name: 'Sesame oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-grape-seed-oil', name: 'Grape seed oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-walnut-oil', name: 'Walnut oil', baseAmount: 'per 100 g', caloriesPer100g: 884, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-ghee', name: 'Ghee', baseAmount: 'per 100 g', caloriesPer100g: 900, proteinPer100g: 0, fatPer100g: 100, carbsPer100g: 0 },
  { id: 'preset-butter', name: 'Butter', baseAmount: 'per 100 g', caloriesPer100g: 750, proteinPer100g: 1, fatPer100g: 82, carbsPer100g: 1 },
  { id: 'preset-almonds', name: 'Almonds', baseAmount: 'per 100 g', caloriesPer100g: 580, proteinPer100g: 21, fatPer100g: 50, carbsPer100g: 22 },

  { id: 'preset-banana', name: 'Banana', baseAmount: 'per 100 g', caloriesPer100g: 89, proteinPer100g: 1, fatPer100g: 0.3, carbsPer100g: 23 },
  { id: 'preset-apple', name: 'Apple', baseAmount: 'per 100 g', caloriesPer100g: 52, proteinPer100g: 0.3, fatPer100g: 0.2, carbsPer100g: 14 },
  { id: 'preset-pear', name: 'Pear', baseAmount: 'per 100 g', caloriesPer100g: 57, proteinPer100g: 0.4, fatPer100g: 0.1, carbsPer100g: 15 },
  { id: 'preset-orange', name: 'Orange', baseAmount: 'per 100 g', caloriesPer100g: 47, proteinPer100g: 1, fatPer100g: 0.1, carbsPer100g: 12 },
  { id: 'preset-mandarin', name: 'Mandarin', baseAmount: 'per 100 g', caloriesPer100g: 53, proteinPer100g: 0.8, fatPer100g: 0.2, carbsPer100g: 13 },
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

  { id: 'preset-water', name: 'Water', baseAmount: 'per 100 ml', caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-mineral-water', name: 'Mineral water', baseAmount: 'per 100 ml', caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-black-coffee', name: 'Black coffee', baseAmount: 'per 100 ml', caloriesPer100g: 2, proteinPer100g: 0.3, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-americano', name: 'Americano', baseAmount: 'per 100 ml', caloriesPer100g: 2, proteinPer100g: 0.3, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-espresso', name: 'Espresso', baseAmount: 'per 100 ml', caloriesPer100g: 9, proteinPer100g: 0.5, fatPer100g: 0, carbsPer100g: 1 },
  { id: 'preset-tea-black-green', name: 'Black or green tea', baseAmount: 'per 100 ml', caloriesPer100g: 1, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-cappuccino', name: 'Cappuccino', baseAmount: 'per 100 ml', caloriesPer100g: 40, proteinPer100g: 2, fatPer100g: 2, carbsPer100g: 4 },
  { id: 'preset-latte', name: 'Latte', baseAmount: 'per 100 ml', caloriesPer100g: 50, proteinPer100g: 2.5, fatPer100g: 2.5, carbsPer100g: 5 },
  { id: 'preset-milk-3-2', name: 'Milk 3.2%', baseAmount: 'per 100 ml', caloriesPer100g: 60, proteinPer100g: 3, fatPer100g: 3.2, carbsPer100g: 5 },
  { id: 'preset-milk-1', name: 'Milk 1%', baseAmount: 'per 100 ml', caloriesPer100g: 42, proteinPer100g: 3.4, fatPer100g: 1, carbsPer100g: 5 },
  { id: 'preset-almond-milk', name: 'Almond milk', baseAmount: 'per 100 ml', caloriesPer100g: 15, proteinPer100g: 0.5, fatPer100g: 1.2, carbsPer100g: 0.3 },
  { id: 'preset-coconut-milk-drink', name: 'Coconut milk drink', baseAmount: 'per 100 ml', caloriesPer100g: 20, proteinPer100g: 0.2, fatPer100g: 1.5, carbsPer100g: 1 },
  { id: 'preset-oat-milk', name: 'Oat milk', baseAmount: 'per 100 ml', caloriesPer100g: 45, proteinPer100g: 1, fatPer100g: 1.5, carbsPer100g: 7 },
  { id: 'preset-orange-juice', name: 'Orange juice', baseAmount: 'per 100 ml', caloriesPer100g: 45, proteinPer100g: 0.7, fatPer100g: 0.2, carbsPer100g: 10 },
  { id: 'preset-apple-juice', name: 'Apple juice', baseAmount: 'per 100 ml', caloriesPer100g: 46, proteinPer100g: 0.1, fatPer100g: 0.1, carbsPer100g: 11 },
  { id: 'preset-cola', name: 'Cola', baseAmount: 'per 100 ml', caloriesPer100g: 42, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 10.6 },
  { id: 'preset-diet-cola', name: 'Cola zero sugar', baseAmount: 'per 100 ml', caloriesPer100g: 0, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },
  { id: 'preset-energy-drink', name: 'Energy drink', baseAmount: 'per 100 ml', caloriesPer100g: 45, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 11 },
  { id: 'preset-sugar-free-energy-drink', name: 'Energy drink zero sugar', baseAmount: 'per 100 ml', caloriesPer100g: 5, proteinPer100g: 0, fatPer100g: 0, carbsPer100g: 0 },

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
  { id: 'preset-omelet-2-eggs', name: 'Omelet, 2 eggs', baseAmount: 'per 100 g', caloriesPer100g: 150, proteinPer100g: 12, fatPer100g: 11, carbsPer100g: 1 },
  { id: 'preset-omelet-with-milk', name: 'Omelet with milk', baseAmount: 'per 100 g', caloriesPer100g: 170, proteinPer100g: 12, fatPer100g: 13, carbsPer100g: 2 },
  { id: 'preset-omelet-with-vegetables', name: 'Omelet with vegetables', baseAmount: 'per 100 g', caloriesPer100g: 120, proteinPer100g: 10, fatPer100g: 8, carbsPer100g: 4 },
  { id: 'preset-syrniki-classic', name: 'Syrniki, classic', baseAmount: 'per 100 g', caloriesPer100g: 220, proteinPer100g: 12, fatPer100g: 10, carbsPer100g: 20 },
  { id: 'preset-syrniki-no-sugar', name: 'Syrniki, no sugar', baseAmount: 'per 100 g', caloriesPer100g: 180, proteinPer100g: 14, fatPer100g: 8, carbsPer100g: 12 },
];

export function getNutritionValuesForGrams(preset: NutritionFoodPreset, gramsValue: string) {
  const grams = Math.max(0, toNumber(gramsValue));
  const multiplier = grams / 100;
  return {
    grams,
    calories: String(Math.round(preset.caloriesPer100g * multiplier)),
    protein: String(Math.round(preset.proteinPer100g * multiplier * 10) / 10),
    fat: String(Math.round(preset.fatPer100g * multiplier * 10) / 10),
    carbs: String(Math.round(preset.carbsPer100g * multiplier * 10) / 10),
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
