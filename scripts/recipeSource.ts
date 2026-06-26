// Authoring source for verified recipes. These carry everything EXCEPT
// nutritionPerServing / nutritionConfidence — those are computed deterministically
// by scripts/generateRecipes.ts (the engine) and baked into the emitted catalog.
// Keeping the source here means the catalog is fully regeneratable.
import type { Recipe, RecipeChoice, RecipeClassifier, RecipeIngredient, RecipeMealType } from '@/types/app';

export type AuthoredRecipe = Omit<Recipe, 'nutritionPerServing' | 'nutritionConfidence'>;

let ingredientSeq = 0;
// Ingredient with display amount + canonical grams + foodRef.
export const ing = (name: string, display: string, grams: number, foodRef: string): RecipeIngredient => ({
  id: 'i' + ++ingredientSeq,
  name,
  amount: display,
  grams,
  foodRef,
});

export const opt = (id: string, label: string, ingredient?: RecipeIngredient) => ({ id, label, ingredient });
export const choice = (
  id: string,
  label: string,
  defaultOptionId: string,
  options: ReturnType<typeof opt>[],
): RecipeChoice => ({ id, label, defaultOptionId, options });

const steps = (...texts: string[]) => texts.map((text, index) => ({ id: 's' + (index + 1), text }));

const liquid = (grams: number) =>
  choice('liquid', 'Liquid', 'milk', [
    opt('milk', 'Milk', ing('milk', `${grams} ml milk`, grams, 'preset-milk-3-2')),
    opt('water', 'Water', ing('water', `${grams} ml water`, grams, 'preset-water')),
  ]);

const sweetener = (defaultId: string, sugarG = 8, honeyG = 10) =>
  choice('sweetener', 'Sweetener', defaultId, [
    opt('sugar', 'Sugar', ing('sugar', `${sugarG} g sugar`, sugarG, 'ing-sugar')),
    opt('honey', 'Honey', ing('honey', `${honeyG} g honey`, honeyG, 'ing-honey')),
    opt('sweetener', 'Sweetener (0 cal)', ing('sweetener', 'sweetener to taste', 1, 'ing-sweetener')),
    opt('none', 'None'),
  ]);

const cl = (...classifiers: RecipeClassifier[]) => classifiers;
const breakfast: RecipeMealType = 'breakfast';

export const AUTHORED_BREAKFASTS: AuthoredRecipe[] = [
  {
    id: 'rcp-classic-omelet', title: 'Classic omelet', description: 'Soft folded omelet with a splash of milk.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 10, servings: 1,
    tags: ['eggs', 'quick'], classifiers: cl('quick', 'high_protein', 'vegetarian', 'gluten_free'),
    ingredients: [ing('eggs', '2 eggs', 100, 'preset-egg'), ing('milk', '30 ml milk', 30, 'preset-milk-3-2'), ing('butter', '5 g butter', 5, 'preset-butter')],
    steps: steps('Whisk the eggs with milk and a pinch of salt.', 'Melt the butter in a non-stick pan over medium heat.', 'Pour in the eggs, cook gently, then fold and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-scrambled-eggs', title: 'Scrambled eggs', description: 'Creamy soft-scrambled eggs.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 8, servings: 1,
    tags: ['eggs', 'quick'], classifiers: cl('quick', 'high_protein', 'vegetarian', 'gluten_free'),
    ingredients: [ing('eggs', '2 eggs', 100, 'preset-egg'), ing('butter', '5 g butter', 5, 'preset-butter'), ing('milk', '15 ml milk', 15, 'preset-milk-3-2')],
    steps: steps('Whisk the eggs with milk.', 'Melt butter over low heat and add the eggs.', 'Stir slowly until just set and creamy.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-fried-eggs', title: 'Fried eggs', description: 'Sunny-side-up fried eggs.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 6, servings: 1,
    tags: ['eggs', 'quick'], classifiers: cl('quick', 'high_protein', 'gluten_free'),
    ingredients: [ing('eggs', '2 eggs', 100, 'preset-egg'), ing('sunflower oil', '1 tsp oil', 5, 'preset-sunflower-oil')],
    steps: steps('Heat the oil in a pan.', 'Crack in the eggs and fry until the whites set.', 'Season and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-boiled-eggs', title: 'Boiled eggs', description: 'Simple boiled eggs, soft or hard.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 10, servings: 1,
    tags: ['eggs', 'quick'], classifiers: cl('quick', 'high_protein', 'vegetarian', 'gluten_free', 'budget'),
    ingredients: [ing('eggs', '2 eggs', 100, 'preset-egg')],
    steps: steps('Bring water to a boil.', 'Lower in the eggs and cook 6–9 minutes to taste.', 'Cool under cold water and peel.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-oatmeal-porridge', title: 'Oatmeal porridge', description: 'Creamy oats, your choice of milk or water and sweetener.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 10, servings: 1,
    tags: ['oats', 'porridge'], classifiers: cl('healthy', 'vegetarian', 'kids', 'family'),
    ingredients: [ing('rolled oats', '50 g rolled oats', 50, 'preset-oatmeal-dry')],
    choices: [liquid(200), sweetener('honey')],
    steps: steps('Bring the liquid to a simmer.', 'Stir in the oats and cook until creamy.', 'Sweeten to taste and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-rice-porridge', title: 'Rice porridge', description: 'Comforting rice porridge with milk or water.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 25, servings: 1,
    tags: ['rice', 'porridge'], classifiers: cl('kids', 'family', 'gluten_free'),
    ingredients: [ing('rice', '50 g rice', 50, 'preset-rice-dry'), ing('butter', '5 g butter', 5, 'preset-butter')],
    choices: [liquid(200), sweetener('sugar')],
    steps: steps('Rinse the rice and add to the liquid.', 'Simmer gently, stirring, until soft and creamy.', 'Stir in butter, sweeten and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-semolina-porridge', title: 'Semolina porridge', description: 'Smooth semolina porridge, no lumps.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 12, servings: 1,
    tags: ['semolina', 'porridge'], classifiers: cl('kids', 'family', 'quick'),
    ingredients: [ing('semolina', '40 g semolina', 40, 'ing-semolina-dry'), ing('butter', '5 g butter', 5, 'preset-butter')],
    choices: [liquid(200), sweetener('sugar')],
    steps: steps('Heat the liquid to a simmer.', 'Rain in the semolina while whisking constantly.', 'Cook 2–3 minutes, add butter, sweeten and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-buckwheat-porridge', title: 'Buckwheat porridge', description: 'Nutty buckwheat, milk or water.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 20, servings: 1,
    tags: ['buckwheat', 'porridge'], classifiers: cl('healthy', 'family', 'gluten_free'),
    ingredients: [ing('buckwheat', '50 g buckwheat', 50, 'preset-buckwheat-dry'), ing('butter', '5 g butter', 5, 'preset-butter')],
    choices: [liquid(150), sweetener('none')],
    steps: steps('Rinse the buckwheat.', 'Add to the liquid and simmer covered until soft.', 'Stir in butter and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-syrniki', title: 'Syrniki', description: 'Golden cottage cheese pancakes.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'Eastern European', cookTimeMinutes: 20, servings: 2,
    tags: ['cottage cheese', 'pancakes'], classifiers: cl('kids', 'family', 'high_protein', 'vegetarian'),
    ingredients: [
      ing('cottage cheese', '250 g cottage cheese', 250, 'preset-cottage-cheese-5'),
      ing('egg', '1 egg', 50, 'preset-egg'),
      ing('flour', '40 g flour', 40, 'preset-wheat-flour-white'),
      ing('sunflower oil', '2 tsp oil', 10, 'preset-sunflower-oil'),
    ],
    choices: [sweetener('sugar', 15)],
    steps: steps('Mix cottage cheese, egg, flour and sweetener into a dough.', 'Shape small patties and dust with flour.', 'Fry in oil until golden on both sides.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-cottage-cheese-bake', title: 'Cottage cheese bake', description: 'Baked cottage cheese casserole with raisins.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'Eastern European', cookTimeMinutes: 45, servings: 4,
    tags: ['cottage cheese', 'baked'], classifiers: cl('kids', 'family', 'high_protein', 'vegetarian'),
    ingredients: [
      ing('cottage cheese', '500 g cottage cheese', 500, 'preset-cottage-cheese-5'),
      ing('eggs', '2 eggs', 100, 'preset-egg'),
      ing('semolina', '40 g semolina', 40, 'ing-semolina-dry'),
      ing('raisins', '30 g raisins', 30, 'ing-raisins'),
    ],
    choices: [sweetener('sugar', 40)],
    steps: steps('Mix cottage cheese, eggs, semolina, raisins and sweetener.', 'Pour into a greased dish.', 'Bake at 180°C for about 35 minutes until set and golden.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-banana-pancakes', title: 'Banana pancakes', description: 'Soft naturally-sweet banana pancakes.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 18, servings: 2,
    tags: ['banana', 'pancakes'], classifiers: cl('kids', 'family', 'quick', 'vegetarian'),
    ingredients: [
      ing('banana', '1 banana', 120, 'preset-banana'),
      ing('egg', '1 egg', 50, 'preset-egg'),
      ing('flour', '90 g flour', 90, 'preset-wheat-flour-white'),
      ing('milk', '120 ml milk', 120, 'preset-milk-3-2'),
      ing('sunflower oil', '1.5 tsp oil', 7, 'preset-sunflower-oil'),
    ],
    steps: steps('Mash the banana and whisk with egg and milk.', 'Stir in flour to a smooth batter.', 'Cook small pancakes in a lightly oiled pan.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-french-toast', title: 'French toast', description: 'Custard-soaked toast, pan-fried golden.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'French', cookTimeMinutes: 15, servings: 2,
    tags: ['bread', 'eggs'], classifiers: cl('kids', 'family', 'quick', 'vegetarian'),
    ingredients: [
      ing('bread', '4 slices bread', 120, 'ing-bread'),
      ing('eggs', '2 eggs', 100, 'preset-egg'),
      ing('milk', '80 ml milk', 80, 'preset-milk-3-2'),
      ing('butter', '10 g butter', 10, 'preset-butter'),
    ],
    choices: [sweetener('sugar', 5)],
    steps: steps('Whisk eggs, milk and sweetener.', 'Soak the bread slices in the custard.', 'Fry in butter until golden on both sides.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-homemade-granola', title: 'Homemade granola', description: 'Crunchy baked oat granola with almonds.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 30, servings: 6,
    tags: ['oats', 'granola', 'meal prep'], classifiers: cl('healthy', 'vegetarian', 'family', 'freezer_friendly'),
    ingredients: [
      ing('rolled oats', '200 g rolled oats', 200, 'preset-oatmeal-dry'),
      ing('honey', '60 g honey', 60, 'ing-honey'),
      ing('sunflower oil', '30 ml oil', 30, 'preset-sunflower-oil'),
      ing('almonds', '60 g almonds', 60, 'preset-almonds'),
      ing('raisins', '50 g raisins', 50, 'ing-raisins'),
    ],
    steps: steps('Mix oats, almonds, honey and oil.', 'Spread on a tray and bake at 160°C, stirring, until golden.', 'Cool, then mix in the raisins. Store airtight.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-yogurt-berries-granola', title: 'Yogurt with berries & granola', description: 'Greek yogurt bowl with berries and granola.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 5, servings: 1,
    tags: ['yogurt', 'berries', 'granola'], classifiers: cl('healthy', 'quick', 'high_protein', 'vegetarian'),
    ingredients: [
      ing('greek yogurt', '150 g Greek yogurt', 150, 'preset-greek-yogurt'),
      ing('blueberries', '80 g blueberries', 80, 'preset-blueberry'),
      ing('granola', '40 g granola', 40, 'ing-granola'),
    ],
    choices: [choice('topping', 'Honey', 'honey', [opt('honey', 'Honey', ing('honey', '10 g honey', 10, 'ing-honey')), opt('none', 'None')])],
    steps: steps('Spoon the yogurt into a bowl.', 'Top with berries and granola.', 'Drizzle with honey if you like.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-avocado-toast', title: 'Avocado toast', description: 'Smashed avocado on toast, egg optional.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 8, servings: 1,
    tags: ['avocado', 'toast'], classifiers: cl('healthy', 'quick', 'vegetarian'),
    ingredients: [ing('bread', '2 slices bread', 70, 'ing-bread'), ing('avocado', '1/2 avocado', 100, 'preset-avocado')],
    choices: [choice('egg', 'Egg', 'with', [opt('with', 'With egg', ing('egg', '1 egg', 50, 'preset-egg')), opt('without', 'Without egg')])],
    steps: steps('Toast the bread.', 'Mash the avocado with salt and lemon and spread on top.', 'Add a fried or poached egg if you like.'),
    suitableForChildren: true, suitableForFamily: true,
  },
];
