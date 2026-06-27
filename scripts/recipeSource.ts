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

const salads: RecipeMealType = 'salads';

const dressingOil = (grams: number) =>
  choice('dressing', 'Dressing', 'oil', [
    opt('oil', 'Olive oil', ing('olive oil', `${grams} g olive oil`, grams, 'preset-olive-oil')),
    opt('none', 'None'),
  ]);

const dressingCaesar = (grams: number) =>
  choice('dressing', 'Dressing', 'caesar', [
    opt('caesar', 'Caesar dressing', ing('caesar dressing', `${grams} g Caesar dressing`, grams, 'ing-parmesan-dressing')),
    opt('none', 'None'),
  ]);

export const AUTHORED_SALADS: AuthoredRecipe[] = [
  {
    id: 'rcp-greek-salad', title: 'Greek salad', description: 'Cucumber, tomato, pepper, feta and olives.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'Greek', cookTimeMinutes: 12, servings: 2,
    tags: ['salad', 'vegetables', 'feta'], classifiers: cl('healthy', 'vegetarian', 'quick', 'gluten_free'),
    ingredients: [
      ing('cucumber', '150 g cucumber', 150, 'preset-cucumber'),
      ing('tomato', '180 g tomato', 180, 'preset-tomato'),
      ing('bell pepper', '80 g bell pepper', 80, 'preset-bell-pepper'),
      ing('red onion', '30 g red onion', 30, 'preset-onion'),
      ing('feta', '80 g feta', 80, 'ing-feta'),
      ing('olives', '50 g olives', 50, 'ing-olives'),
    ],
    choices: [dressingOil(15)],
    steps: steps('Chop the vegetables into chunks.', 'Add olives and crumbled feta.', 'Dress with olive oil and oregano and toss.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-caesar-chicken', title: 'Caesar salad with chicken', description: 'Romaine, grilled chicken, parmesan and croutons.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 20, servings: 2,
    tags: ['salad', 'chicken', 'caesar'], classifiers: cl('high_protein', 'family'),
    ingredients: [
      ing('romaine lettuce', '150 g romaine', 150, 'ing-romaine'),
      ing('grilled chicken', '200 g grilled chicken', 200, 'preset-chicken-breast-grilled'),
      ing('parmesan', '20 g parmesan', 20, 'ing-parmesan'),
      ing('croutons', '40 g croutons', 40, 'ing-croutons'),
    ],
    choices: [dressingCaesar(40)],
    steps: steps('Slice the grilled chicken.', 'Toss romaine with dressing.', 'Top with chicken, parmesan and croutons.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-caesar-shrimp', title: 'Caesar salad with shrimp', description: 'Romaine, grilled shrimp, parmesan and croutons.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 20, servings: 2,
    tags: ['salad', 'shrimp', 'caesar'], classifiers: cl('high_protein'),
    ingredients: [
      ing('romaine lettuce', '150 g romaine', 150, 'ing-romaine'),
      ing('grilled shrimp', '200 g grilled shrimp', 200, 'preset-shrimp-grilled'),
      ing('parmesan', '20 g parmesan', 20, 'ing-parmesan'),
      ing('croutons', '40 g croutons', 40, 'ing-croutons'),
    ],
    choices: [dressingCaesar(40)],
    steps: steps('Grill the shrimp briefly.', 'Toss romaine with dressing.', 'Top with shrimp, parmesan and croutons.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-caprese', title: 'Caprese salad', description: 'Tomato, mozzarella and basil with olive oil.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'Italian', cookTimeMinutes: 8, servings: 2,
    tags: ['salad', 'mozzarella', 'tomato'], classifiers: cl('vegetarian', 'quick', 'gluten_free', 'healthy'),
    ingredients: [
      ing('tomato', '250 g tomato', 250, 'preset-tomato'),
      ing('mozzarella', '150 g mozzarella', 150, 'ing-mozzarella'),
    ],
    choices: [dressingOil(15)],
    steps: steps('Slice tomato and mozzarella.', 'Layer with fresh basil.', 'Drizzle with olive oil and season.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-tuna-salad', title: 'Tuna salad', description: 'Tuna with greens, corn and fresh vegetables.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 10, servings: 2,
    tags: ['salad', 'tuna'], classifiers: cl('high_protein', 'quick', 'gluten_free'),
    ingredients: [
      ing('canned tuna', '160 g canned tuna', 160, 'preset-tuna-canned'),
      ing('salad greens', '100 g salad greens', 100, 'ing-salad-greens'),
      ing('cucumber', '100 g cucumber', 100, 'preset-cucumber'),
      ing('tomato', '100 g tomato', 100, 'preset-tomato'),
      ing('sweetcorn', '80 g sweetcorn', 80, 'ing-sweetcorn'),
    ],
    choices: [dressingOil(10)],
    steps: steps('Drain the tuna.', 'Toss greens, cucumber, tomato and corn.', 'Top with tuna and dress.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-chicken-avocado-salad', title: 'Chicken & avocado salad', description: 'Grilled chicken, avocado and fresh greens.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 18, servings: 2,
    tags: ['salad', 'chicken', 'avocado'], classifiers: cl('high_protein', 'healthy', 'gluten_free'),
    ingredients: [
      ing('grilled chicken', '200 g grilled chicken', 200, 'preset-chicken-breast-grilled'),
      ing('avocado', '150 g avocado', 150, 'preset-avocado'),
      ing('salad greens', '100 g salad greens', 100, 'ing-salad-greens'),
      ing('tomato', '100 g tomato', 100, 'preset-tomato'),
      ing('cucumber', '80 g cucumber', 80, 'preset-cucumber'),
    ],
    choices: [dressingOil(10)],
    steps: steps('Slice the grilled chicken and avocado.', 'Toss greens, tomato and cucumber.', 'Top with chicken and avocado, then dress.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-green-salad', title: 'Green salad', description: 'Simple leafy green salad.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 8, servings: 2,
    tags: ['salad', 'greens'], classifiers: cl('healthy', 'vegan', 'quick', 'gluten_free', 'low_sugar'),
    ingredients: [
      ing('salad greens', '150 g salad greens', 150, 'ing-salad-greens'),
      ing('cucumber', '100 g cucumber', 100, 'preset-cucumber'),
      ing('bell pepper', '80 g bell pepper', 80, 'preset-bell-pepper'),
    ],
    choices: [dressingOil(10)],
    steps: steps('Wash and tear the greens.', 'Add sliced cucumber and pepper.', 'Dress with olive oil and lemon.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-vegetable-salad', title: 'Vegetable salad', description: 'Chopped tomato, cucumber and pepper.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 10, servings: 2,
    tags: ['salad', 'vegetables'], classifiers: cl('healthy', 'vegan', 'quick', 'gluten_free', 'budget'),
    ingredients: [
      ing('tomato', '150 g tomato', 150, 'preset-tomato'),
      ing('cucumber', '150 g cucumber', 150, 'preset-cucumber'),
      ing('bell pepper', '100 g bell pepper', 100, 'preset-bell-pepper'),
      ing('red onion', '30 g red onion', 30, 'preset-onion'),
    ],
    choices: [dressingOil(15)],
    steps: steps('Chop all the vegetables.', 'Combine in a bowl.', 'Dress with olive oil and season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-beetroot-goat-cheese', title: 'Beetroot & goat cheese salad', description: 'Roasted beetroot, goat cheese and walnuts.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 15, servings: 2,
    tags: ['salad', 'beetroot', 'goat cheese'], classifiers: cl('vegetarian', 'healthy', 'gluten_free'),
    ingredients: [
      ing('beetroot', '200 g cooked beetroot', 200, 'ing-beetroot-cooked'),
      ing('goat cheese', '60 g goat cheese', 60, 'ing-goat-cheese'),
      ing('salad greens', '60 g salad greens', 60, 'ing-salad-greens'),
      ing('walnuts', '30 g walnuts', 30, 'ing-walnuts'),
      ing('balsamic', '10 g balsamic', 10, 'ing-balsamic'),
    ],
    choices: [dressingOil(10)],
    steps: steps('Slice the cooked beetroot.', 'Arrange on greens with crumbled goat cheese and walnuts.', 'Drizzle with balsamic and olive oil.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-quinoa-salad', title: 'Quinoa & vegetable salad', description: 'Quinoa with chickpeas and fresh vegetables.',
    mealType: salads, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 20, servings: 2,
    tags: ['salad', 'quinoa', 'chickpeas'], classifiers: cl('healthy', 'vegan', 'high_protein', 'gluten_free'),
    ingredients: [
      ing('cooked quinoa', '200 g cooked quinoa', 200, 'preset-boiled-quinoa-side'),
      ing('chickpeas', '80 g chickpeas', 80, 'ing-chickpeas-canned'),
      ing('cucumber', '100 g cucumber', 100, 'preset-cucumber'),
      ing('tomato', '100 g tomato', 100, 'preset-tomato'),
      ing('bell pepper', '80 g bell pepper', 80, 'preset-bell-pepper'),
    ],
    choices: [dressingOil(12)],
    steps: steps('Cook and cool the quinoa.', 'Mix with chickpeas and chopped vegetables.', 'Dress with olive oil and lemon.'),
    suitableForFamily: true,
  },
];

const soups: RecipeMealType = 'soups';

const creamChoice = (grams: number) =>
  choice('cream', 'Cream', 'with', [
    opt('with', 'With cream', ing('cream', `${grams} g cream`, grams, 'ing-heavy-cream')),
    opt('without', 'Without cream'),
  ]);

export const AUTHORED_SOUPS: AuthoredRecipe[] = [
  {
    id: 'rcp-chicken-noodle-soup', title: 'Chicken noodle soup', description: 'Light chicken broth with vegetables and noodles.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 35, servings: 4,
    tags: ['soup', 'chicken', 'noodles'], classifiers: cl('family', 'kids', 'high_protein'),
    ingredients: [
      ing('chicken breast', '300 g chicken breast', 300, 'preset-chicken-breast-raw'),
      ing('carrot', '100 g carrot', 100, 'preset-carrot'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('noodles', '80 g noodles', 80, 'preset-pasta-dry'),
      ing('water', '1.5 L water', 1500, 'preset-water'),
    ],
    steps: steps('Simmer the chicken until tender, then shred.', 'Add chopped vegetables and cook until soft.', 'Add noodles and cook until done; season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-meatball-soup', title: 'Meatball soup', description: 'Broth with small beef meatballs and potato.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 40, servings: 4,
    tags: ['soup', 'beef', 'meatballs'], classifiers: cl('family', 'kids', 'high_protein'),
    ingredients: [
      ing('ground beef', '250 g ground beef', 250, 'preset-ground-beef'),
      ing('potato', '250 g potato', 250, 'preset-potato-boiled'),
      ing('carrot', '100 g carrot', 100, 'preset-carrot'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('water', '1.5 L water', 1500, 'preset-water'),
    ],
    steps: steps('Roll the beef into small meatballs.', 'Simmer with diced potato, carrot and onion.', 'Cook until the meatballs and vegetables are done; season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-vegetable-soup', title: 'Vegetable soup', description: 'Light mixed-vegetable soup.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 30, servings: 4,
    tags: ['soup', 'vegetables'], classifiers: cl('healthy', 'vegan', 'family', 'budget'),
    ingredients: [
      ing('potato', '250 g potato', 250, 'preset-potato-boiled'),
      ing('carrot', '120 g carrot', 120, 'preset-carrot'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('zucchini', '150 g zucchini', 150, 'preset-zucchini'),
      ing('bell pepper', '100 g bell pepper', 100, 'preset-bell-pepper'),
      ing('olive oil', '10 g olive oil', 10, 'preset-olive-oil'),
      ing('water', '1.5 L water', 1500, 'preset-water'),
    ],
    steps: steps('Soften the onion in oil.', 'Add the chopped vegetables and water.', 'Simmer until tender and season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-tomato-soup', title: 'Tomato soup', description: 'Smooth tomato soup with a hint of olive oil.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['soup', 'tomato'], classifiers: cl('vegetarian', 'healthy', 'family'),
    ingredients: [
      ing('canned tomatoes', '400 g canned tomatoes', 400, 'ing-canned-tomatoes'),
      ing('tomato passata', '200 g passata', 200, 'ing-tomato-passata'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('olive oil', '15 g olive oil', 15, 'preset-olive-oil'),
      ing('water', '800 ml water', 800, 'preset-water'),
    ],
    steps: steps('Soften the onion in olive oil.', 'Add tomatoes, passata and water.', 'Simmer and blend until smooth; season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-pumpkin-cream-soup', title: 'Pumpkin cream soup', description: 'Velvety pumpkin soup, cream optional.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 30, servings: 4,
    tags: ['soup', 'pumpkin', 'cream'], classifiers: cl('vegetarian', 'healthy', 'family', 'gluten_free'),
    ingredients: [
      ing('pumpkin', '600 g pumpkin', 600, 'ing-pumpkin'),
      ing('carrot', '100 g carrot', 100, 'preset-carrot'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('butter', '15 g butter', 15, 'preset-butter'),
      ing('water', '800 ml water', 800, 'preset-water'),
    ],
    choices: [creamChoice(100)],
    steps: steps('Soften the onion and carrot in butter.', 'Add pumpkin and water; simmer until soft.', 'Blend smooth, stir in cream if using; season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-broccoli-cream-soup', title: 'Broccoli cream soup', description: 'Creamy broccoli soup, cream optional.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['soup', 'broccoli', 'cream'], classifiers: cl('vegetarian', 'healthy', 'family', 'gluten_free'),
    ingredients: [
      ing('broccoli', '500 g broccoli', 500, 'preset-broccoli'),
      ing('potato', '150 g potato', 150, 'preset-potato-boiled'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('butter', '15 g butter', 15, 'preset-butter'),
      ing('water', '800 ml water', 800, 'preset-water'),
    ],
    choices: [creamChoice(100)],
    steps: steps('Soften the onion in butter.', 'Add broccoli, potato and water; simmer until soft.', 'Blend smooth, stir in cream if using; season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-mushroom-cream-soup', title: 'Mushroom cream soup', description: 'Earthy mushroom soup, cream optional.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 30, servings: 4,
    tags: ['soup', 'mushroom', 'cream'], classifiers: cl('vegetarian', 'family'),
    ingredients: [
      ing('mushrooms', '400 g mushrooms', 400, 'ing-mushrooms'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('butter', '15 g butter', 15, 'preset-butter'),
      ing('flour', '20 g flour', 20, 'preset-wheat-flour-white'),
      ing('water', '800 ml water', 800, 'preset-water'),
    ],
    choices: [creamChoice(100)],
    steps: steps('Sauté the mushrooms and onion in butter.', 'Stir in flour, then add water and simmer.', 'Blend smooth, stir in cream if using; season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-lentil-soup', title: 'Lentil soup', description: 'Hearty lentil soup with vegetables.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 40, servings: 4,
    tags: ['soup', 'lentils'], classifiers: cl('healthy', 'vegan', 'high_protein', 'budget'),
    ingredients: [
      ing('lentils', '200 g dry lentils', 200, 'ing-lentils-dry'),
      ing('carrot', '100 g carrot', 100, 'preset-carrot'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('canned tomatoes', '200 g canned tomatoes', 200, 'ing-canned-tomatoes'),
      ing('olive oil', '15 g olive oil', 15, 'preset-olive-oil'),
      ing('water', '1.5 L water', 1500, 'preset-water'),
    ],
    steps: steps('Soften onion and carrot in oil.', 'Add lentils, tomatoes and water.', 'Simmer until the lentils are soft; season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-minestrone', title: 'Minestrone', description: 'Italian vegetable soup with beans and pasta.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'Italian', cookTimeMinutes: 40, servings: 4,
    tags: ['soup', 'vegetables', 'beans'], classifiers: cl('healthy', 'vegetarian', 'family'),
    ingredients: [
      ing('white beans', '200 g white beans', 200, 'ing-white-beans-canned'),
      ing('pasta', '60 g pasta', 60, 'preset-pasta-dry'),
      ing('canned tomatoes', '300 g canned tomatoes', 300, 'ing-canned-tomatoes'),
      ing('carrot', '100 g carrot', 100, 'preset-carrot'),
      ing('celery', '80 g celery', 80, 'ing-celery'),
      ing('zucchini', '120 g zucchini', 120, 'preset-zucchini'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('olive oil', '15 g olive oil', 15, 'preset-olive-oil'),
      ing('water', '1.2 L water', 1200, 'preset-water'),
    ],
    steps: steps('Soften onion, carrot and celery in oil.', 'Add tomatoes, beans, zucchini and water; simmer.', 'Add pasta and cook until done; season.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-cheese-soup', title: 'Cheese soup', description: 'Creamy potato soup with melted cheese.',
    mealType: soups, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 30, servings: 4,
    tags: ['soup', 'cheese', 'potato'], classifiers: cl('vegetarian', 'family', 'kids'),
    ingredients: [
      ing('cheddar', '150 g cheddar', 150, 'ing-cheddar'),
      ing('potato', '250 g potato', 250, 'preset-potato-boiled'),
      ing('carrot', '80 g carrot', 80, 'preset-carrot'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('butter', '15 g butter', 15, 'preset-butter'),
      ing('water', '1 L water', 1000, 'preset-water'),
    ],
    choices: [creamChoice(80)],
    steps: steps('Soften onion and carrot in butter.', 'Add potato and water; simmer until soft and blend.', 'Stir in grated cheese (and cream if using) until melted.'),
    suitableForChildren: true, suitableForFamily: true,
  },
];

const main: RecipeMealType = 'main_dish';
const pasta: RecipeMealType = 'pasta';

const parmesanTopping = (grams: number) =>
  choice('parmesan', 'Parmesan', 'with', [
    opt('with', 'With parmesan', ing('parmesan', `${grams} g parmesan`, grams, 'ing-parmesan')),
    opt('none', 'None'),
  ]);

const sourCreamChoice = (grams: number) =>
  choice('sourCream', 'Sour cream', 'with', [
    opt('with', 'With sour cream', ing('sour cream', `${grams} g sour cream`, grams, 'ing-sour-cream')),
    opt('without', 'Without'),
  ]);

export const AUTHORED_MAINS: AuthoredRecipe[] = [
  {
    id: 'rcp-grilled-chicken-breast', title: 'Grilled chicken breast', description: 'Simple juicy grilled chicken breast.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 18, servings: 2,
    tags: ['chicken', 'grill'], classifiers: cl('high_protein', 'healthy', 'gluten_free', 'quick'),
    ingredients: [ing('chicken breast', '300 g chicken breast', 300, 'preset-chicken-breast-grilled'), ing('olive oil', '10 g olive oil', 10, 'preset-olive-oil')],
    steps: steps('Season the chicken.', 'Brush with oil and grill 6–7 min per side.', 'Rest and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-chicken-cream-sauce', title: 'Chicken in cream sauce', description: 'Tender chicken in a light creamy sauce.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 30, servings: 4,
    tags: ['chicken', 'cream'], classifiers: cl('high_protein', 'family', 'kids'),
    ingredients: [
      ing('chicken breast', '500 g chicken breast', 500, 'preset-chicken-breast-raw'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('flour', '15 g flour', 15, 'preset-wheat-flour-white'),
      ing('butter', '15 g butter', 15, 'preset-butter'),
    ],
    choices: [creamChoice(200)],
    steps: steps('Brown the chicken pieces in butter.', 'Add onion and flour, then liquid.', 'Stir in cream if using and simmer until thick.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-chicken-cutlets', title: 'Chicken cutlets', description: 'Pan-fried ground chicken cutlets.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['chicken', 'cutlets'], classifiers: cl('high_protein', 'family', 'kids'),
    ingredients: [
      ing('ground chicken', '500 g ground chicken', 500, 'ing-ground-chicken'),
      ing('egg', '1 egg', 50, 'preset-egg'),
      ing('breadcrumbs', '50 g breadcrumbs', 50, 'ing-breadcrumbs'),
      ing('onion', '60 g onion', 60, 'preset-onion'),
      ing('sunflower oil', '20 g oil', 20, 'preset-sunflower-oil'),
    ],
    steps: steps('Mix mince with egg, grated onion and breadcrumbs.', 'Shape into patties.', 'Fry in oil until golden and cooked through.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-chicken-meatballs', title: 'Chicken meatballs', description: 'Soft chicken meatballs.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['chicken', 'meatballs'], classifiers: cl('high_protein', 'family', 'kids'),
    ingredients: [
      ing('ground chicken', '500 g ground chicken', 500, 'ing-ground-chicken'),
      ing('egg', '1 egg', 50, 'preset-egg'),
      ing('breadcrumbs', '40 g breadcrumbs', 40, 'ing-breadcrumbs'),
      ing('onion', '60 g onion', 60, 'preset-onion'),
      ing('sunflower oil', '15 g oil', 15, 'preset-sunflower-oil'),
    ],
    steps: steps('Mix mince with egg, onion and breadcrumbs.', 'Roll into balls.', 'Fry or simmer until cooked through.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-roast-chicken-vegetables', title: 'Roast chicken with vegetables', description: 'Oven-roasted chicken thighs with potato and carrot.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 50, servings: 4,
    tags: ['chicken', 'roast', 'vegetables'], classifiers: cl('high_protein', 'family', 'gluten_free'),
    ingredients: [
      ing('chicken thighs', '600 g chicken thighs', 600, 'preset-chicken-thigh-skinless-grilled'),
      ing('potato', '400 g potato', 400, 'preset-potato-boiled'),
      ing('carrot', '150 g carrot', 150, 'preset-carrot'),
      ing('onion', '100 g onion', 100, 'preset-onion'),
      ing('olive oil', '20 g olive oil', 20, 'preset-olive-oil'),
    ],
    steps: steps('Toss chicken and vegetables with oil and seasoning.', 'Spread on a tray.', 'Roast at 200°C until golden and cooked through.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-turkey-cutlets', title: 'Turkey cutlets', description: 'Lean ground turkey cutlets.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['turkey', 'cutlets'], classifiers: cl('high_protein', 'healthy', 'family', 'kids'),
    ingredients: [
      ing('ground turkey', '500 g ground turkey', 500, 'ing-ground-turkey'),
      ing('egg', '1 egg', 50, 'preset-egg'),
      ing('breadcrumbs', '50 g breadcrumbs', 50, 'ing-breadcrumbs'),
      ing('onion', '60 g onion', 60, 'preset-onion'),
      ing('sunflower oil', '20 g oil', 20, 'preset-sunflower-oil'),
    ],
    steps: steps('Mix turkey with egg, onion and breadcrumbs.', 'Shape into patties.', 'Fry until golden and cooked through.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-turkey-meatballs', title: 'Turkey meatballs', description: 'Tender turkey meatballs.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['turkey', 'meatballs'], classifiers: cl('high_protein', 'healthy', 'family', 'kids'),
    ingredients: [
      ing('ground turkey', '500 g ground turkey', 500, 'ing-ground-turkey'),
      ing('egg', '1 egg', 50, 'preset-egg'),
      ing('breadcrumbs', '40 g breadcrumbs', 40, 'ing-breadcrumbs'),
      ing('onion', '60 g onion', 60, 'preset-onion'),
      ing('sunflower oil', '15 g oil', 15, 'preset-sunflower-oil'),
    ],
    steps: steps('Mix turkey with egg, onion and breadcrumbs.', 'Roll into balls.', 'Fry or simmer until cooked through.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-turkey-fillet-vegetables', title: 'Turkey fillet with vegetables', description: 'Turkey fillet pan-cooked with vegetables.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['turkey', 'vegetables'], classifiers: cl('high_protein', 'healthy', 'gluten_free', 'family'),
    ingredients: [
      ing('turkey fillet', '500 g turkey fillet', 500, 'preset-turkey-fillet-grilled'),
      ing('zucchini', '200 g zucchini', 200, 'preset-zucchini'),
      ing('bell pepper', '150 g bell pepper', 150, 'preset-bell-pepper'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('olive oil', '20 g olive oil', 20, 'preset-olive-oil'),
    ],
    steps: steps('Sear the turkey pieces.', 'Add the vegetables and cook until tender.', 'Season and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-beef-stroganoff', title: 'Beef stroganoff', description: 'Beef strips in a creamy mushroom sauce.',
    mealType: main, mealSlot: 'dinner', cuisine: 'Eastern European', cookTimeMinutes: 35, servings: 4,
    tags: ['beef', 'mushroom'], classifiers: cl('high_protein', 'family'),
    ingredients: [
      ing('beef', '500 g beef', 500, 'preset-beef'),
      ing('mushrooms', '200 g mushrooms', 200, 'ing-mushrooms'),
      ing('onion', '100 g onion', 100, 'preset-onion'),
      ing('flour', '15 g flour', 15, 'preset-wheat-flour-white'),
      ing('butter', '15 g butter', 15, 'preset-butter'),
    ],
    choices: [sourCreamChoice(200)],
    steps: steps('Sear the beef strips and set aside.', 'Cook onion and mushrooms, dust with flour.', 'Return beef, add sour cream if using and simmer.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-goulash', title: 'Goulash', description: 'Slow-cooked beef and pepper stew.',
    mealType: main, mealSlot: 'dinner', cuisine: 'Hungarian', cookTimeMinutes: 80, servings: 4,
    tags: ['beef', 'stew', 'paprika'], classifiers: cl('high_protein', 'family'),
    ingredients: [
      ing('beef', '500 g beef', 500, 'preset-beef'),
      ing('onion', '120 g onion', 120, 'preset-onion'),
      ing('bell pepper', '150 g bell pepper', 150, 'preset-bell-pepper'),
      ing('canned tomatoes', '200 g canned tomatoes', 200, 'ing-canned-tomatoes'),
      ing('flour', '15 g flour', 15, 'preset-wheat-flour-white'),
      ing('sunflower oil', '20 g oil', 20, 'preset-sunflower-oil'),
    ],
    steps: steps('Brown the beef with onion.', 'Add paprika, pepper and tomatoes.', 'Simmer low until the beef is tender.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-beef-cutlets', title: 'Beef cutlets', description: 'Classic pan-fried beef cutlets.',
    mealType: main, mealSlot: 'dinner', cuisine: 'Eastern European', cookTimeMinutes: 25, servings: 4,
    tags: ['beef', 'cutlets'], classifiers: cl('high_protein', 'family', 'kids'),
    ingredients: [
      ing('ground beef', '500 g ground beef', 500, 'preset-ground-beef'),
      ing('egg', '1 egg', 50, 'preset-egg'),
      ing('breadcrumbs', '50 g breadcrumbs', 50, 'ing-breadcrumbs'),
      ing('onion', '60 g onion', 60, 'preset-onion'),
      ing('sunflower oil', '20 g oil', 20, 'preset-sunflower-oil'),
    ],
    steps: steps('Mix beef with egg, onion and breadcrumbs.', 'Shape into patties.', 'Fry until browned and cooked through.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-beef-stew', title: 'Beef stew', description: 'Hearty beef and potato stew.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 90, servings: 4,
    tags: ['beef', 'stew', 'potato'], classifiers: cl('high_protein', 'family', 'gluten_free'),
    ingredients: [
      ing('beef', '600 g beef', 600, 'preset-beef'),
      ing('potato', '300 g potato', 300, 'preset-potato-boiled'),
      ing('carrot', '150 g carrot', 150, 'preset-carrot'),
      ing('onion', '100 g onion', 100, 'preset-onion'),
      ing('sunflower oil', '20 g oil', 20, 'preset-sunflower-oil'),
    ],
    steps: steps('Brown the beef.', 'Add vegetables and water to cover.', 'Simmer low until everything is tender.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-baked-salmon', title: 'Baked salmon', description: 'Oven-baked salmon fillet.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 20, servings: 2,
    tags: ['salmon', 'fish', 'baked'], classifiers: cl('high_protein', 'healthy', 'gluten_free', 'quick'),
    ingredients: [ing('salmon', '300 g salmon', 300, 'preset-salmon'), ing('olive oil', '10 g olive oil', 10, 'preset-olive-oil')],
    steps: steps('Season the salmon and drizzle with oil.', 'Bake at 200°C for 12–15 minutes.', 'Serve with lemon.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-baked-white-fish', title: 'Baked white fish', description: 'Light baked white fish fillet.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 20, servings: 2,
    tags: ['fish', 'baked'], classifiers: cl('high_protein', 'healthy', 'gluten_free', 'quick', 'low_sugar'),
    ingredients: [ing('cod', '300 g cod', 300, 'preset-cod-steamed'), ing('olive oil', '15 g olive oil', 15, 'preset-olive-oil')],
    steps: steps('Season the fish.', 'Drizzle with oil and bake at 200°C for 12–15 minutes.', 'Serve with lemon.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-cod-vegetables', title: 'Cod with vegetables', description: 'Baked cod with a vegetable medley.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 30, servings: 4,
    tags: ['fish', 'cod', 'vegetables'], classifiers: cl('high_protein', 'healthy', 'gluten_free', 'family'),
    ingredients: [
      ing('cod', '500 g cod', 500, 'preset-cod-steamed'),
      ing('zucchini', '200 g zucchini', 200, 'preset-zucchini'),
      ing('carrot', '150 g carrot', 150, 'preset-carrot'),
      ing('bell pepper', '150 g bell pepper', 150, 'preset-bell-pepper'),
      ing('olive oil', '20 g olive oil', 20, 'preset-olive-oil'),
    ],
    steps: steps('Lay the cod on a bed of sliced vegetables.', 'Drizzle with oil and season.', 'Bake at 200°C until the fish flakes.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-fish-cutlets', title: 'Fish cutlets', description: 'Tender white-fish cutlets.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['fish', 'cutlets'], classifiers: cl('high_protein', 'family', 'kids'),
    ingredients: [
      ing('white fish', '500 g white fish', 500, 'preset-cod-steamed'),
      ing('egg', '1 egg', 50, 'preset-egg'),
      ing('breadcrumbs', '50 g breadcrumbs', 50, 'ing-breadcrumbs'),
      ing('onion', '60 g onion', 60, 'preset-onion'),
      ing('sunflower oil', '20 g oil', 20, 'preset-sunflower-oil'),
    ],
    steps: steps('Blitz fish with onion, then mix in egg and breadcrumbs.', 'Shape into patties.', 'Fry until golden and cooked through.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-pasta-bolognese', title: 'Pasta Bolognese', description: 'Spaghetti with rich beef and tomato sauce.',
    mealType: pasta, mealSlot: 'dinner', cuisine: 'Italian', cookTimeMinutes: 40, servings: 4,
    tags: ['pasta', 'beef', 'tomato'], classifiers: cl('family', 'kids', 'high_protein'),
    ingredients: [
      ing('pasta', '320 g pasta', 320, 'preset-pasta-dry'),
      ing('ground beef', '300 g ground beef', 300, 'preset-ground-beef'),
      ing('canned tomatoes', '300 g canned tomatoes', 300, 'ing-canned-tomatoes'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('carrot', '80 g carrot', 80, 'preset-carrot'),
      ing('olive oil', '15 g olive oil', 15, 'preset-olive-oil'),
    ],
    choices: [parmesanTopping(15)],
    steps: steps('Brown beef with onion and carrot.', 'Add tomatoes and simmer into a sauce.', 'Toss with cooked pasta; top with parmesan.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-pasta-carbonara', title: 'Pasta Carbonara', description: 'Spaghetti with egg, bacon and parmesan.',
    mealType: pasta, mealSlot: 'dinner', cuisine: 'Italian', cookTimeMinutes: 25, servings: 4,
    tags: ['pasta', 'bacon', 'egg'], classifiers: cl('family', 'high_protein'),
    ingredients: [
      ing('pasta', '320 g pasta', 320, 'preset-pasta-dry'),
      ing('bacon', '120 g bacon', 120, 'ing-bacon'),
      ing('eggs', '2 eggs', 100, 'preset-egg'),
      ing('parmesan', '50 g parmesan', 50, 'ing-parmesan'),
    ],
    steps: steps('Crisp the bacon.', 'Whisk eggs with parmesan.', 'Toss hot pasta with bacon, then the egg mix off the heat.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-pasta-alfredo', title: 'Pasta Alfredo', description: 'Creamy parmesan pasta.',
    mealType: pasta, mealSlot: 'dinner', cuisine: 'Italian', cookTimeMinutes: 25, servings: 4,
    tags: ['pasta', 'cream', 'parmesan'], classifiers: cl('family', 'kids', 'vegetarian'),
    ingredients: [
      ing('pasta', '320 g pasta', 320, 'preset-pasta-dry'),
      ing('cream', '200 g cream', 200, 'ing-heavy-cream'),
      ing('butter', '20 g butter', 20, 'preset-butter'),
      ing('parmesan', '50 g parmesan', 50, 'ing-parmesan'),
    ],
    steps: steps('Melt butter with cream.', 'Stir in parmesan to a smooth sauce.', 'Toss with cooked pasta.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-pasta-pesto', title: 'Pasta with pesto', description: 'Pasta tossed in basil pesto.',
    mealType: pasta, mealSlot: 'dinner', cuisine: 'Italian', cookTimeMinutes: 20, servings: 4,
    tags: ['pasta', 'pesto'], classifiers: cl('vegetarian', 'quick', 'family'),
    ingredients: [
      ing('pasta', '320 g pasta', 320, 'preset-pasta-dry'),
      ing('pesto', '100 g pesto', 100, 'ing-pesto'),
    ],
    choices: [parmesanTopping(15)],
    steps: steps('Cook the pasta.', 'Toss with pesto and a splash of pasta water.', 'Top with parmesan.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-pasta-salmon', title: 'Pasta with salmon', description: 'Creamy pasta with salmon.',
    mealType: pasta, mealSlot: 'dinner', cuisine: 'Italian', cookTimeMinutes: 25, servings: 4,
    tags: ['pasta', 'salmon', 'cream'], classifiers: cl('high_protein', 'family'),
    ingredients: [
      ing('pasta', '320 g pasta', 320, 'preset-pasta-dry'),
      ing('salmon', '250 g salmon', 250, 'preset-salmon'),
      ing('cream', '150 g cream', 150, 'ing-heavy-cream'),
      ing('onion', '60 g onion', 60, 'preset-onion'),
      ing('olive oil', '10 g olive oil', 10, 'preset-olive-oil'),
    ],
    steps: steps('Cook salmon pieces with onion.', 'Add cream and simmer to a sauce.', 'Toss with cooked pasta.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-lasagna', title: 'Lasagna', description: 'Layered pasta with beef ragu and cheese.',
    mealType: pasta, mealSlot: 'dinner', cuisine: 'Italian', cookTimeMinutes: 70, servings: 6,
    tags: ['pasta', 'beef', 'baked'], classifiers: cl('family', 'kids', 'high_protein'),
    ingredients: [
      ing('lasagna sheets', '250 g lasagna sheets', 250, 'preset-pasta-dry'),
      ing('ground beef', '400 g ground beef', 400, 'preset-ground-beef'),
      ing('canned tomatoes', '400 g canned tomatoes', 400, 'ing-canned-tomatoes'),
      ing('mozzarella', '200 g mozzarella', 200, 'ing-mozzarella'),
      ing('parmesan', '50 g parmesan', 50, 'ing-parmesan'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('olive oil', '15 g olive oil', 15, 'preset-olive-oil'),
    ],
    steps: steps('Make a beef and tomato ragu.', 'Layer with pasta sheets and cheese.', 'Bake at 190°C until bubbling and golden.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-mushroom-risotto', title: 'Mushroom risotto', description: 'Creamy rice with mushrooms and parmesan.',
    mealType: main, mealSlot: 'dinner', cuisine: 'Italian', cookTimeMinutes: 35, servings: 4,
    tags: ['rice', 'mushroom', 'risotto'], classifiers: cl('vegetarian', 'family', 'gluten_free'),
    ingredients: [
      ing('rice', '300 g rice', 300, 'preset-rice-dry'),
      ing('mushrooms', '300 g mushrooms', 300, 'ing-mushrooms'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('butter', '30 g butter', 30, 'preset-butter'),
    ],
    choices: [parmesanTopping(40)],
    steps: steps('Soften onion and mushrooms in butter.', 'Add rice and ladle in broth gradually, stirring.', 'Finish with parmesan when creamy.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-stuffed-peppers', title: 'Stuffed peppers', description: 'Peppers filled with beef and rice in tomato.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 50, servings: 4,
    tags: ['peppers', 'beef', 'rice'], classifiers: cl('family', 'high_protein', 'gluten_free'),
    ingredients: [
      ing('bell pepper', '400 g bell peppers', 400, 'preset-bell-pepper'),
      ing('ground beef', '300 g ground beef', 300, 'preset-ground-beef'),
      ing('rice', '100 g rice', 100, 'preset-rice-dry'),
      ing('canned tomatoes', '200 g canned tomatoes', 200, 'ing-canned-tomatoes'),
      ing('onion', '80 g onion', 80, 'preset-onion'),
      ing('olive oil', '15 g olive oil', 15, 'preset-olive-oil'),
    ],
    steps: steps('Mix beef with par-cooked rice and onion.', 'Stuff the peppers and set in a dish with tomato.', 'Bake at 190°C until the peppers are soft.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-vegetable-stew', title: 'Vegetable stew', description: 'Mixed vegetables braised in tomato.',
    mealType: main, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 40, servings: 4,
    tags: ['vegetables', 'stew'], classifiers: cl('healthy', 'vegan', 'family', 'budget', 'gluten_free'),
    ingredients: [
      ing('potato', '300 g potato', 300, 'preset-potato-boiled'),
      ing('zucchini', '250 g zucchini', 250, 'preset-zucchini'),
      ing('carrot', '150 g carrot', 150, 'preset-carrot'),
      ing('bell pepper', '150 g bell pepper', 150, 'preset-bell-pepper'),
      ing('canned tomatoes', '200 g canned tomatoes', 200, 'ing-canned-tomatoes'),
      ing('onion', '100 g onion', 100, 'preset-onion'),
      ing('olive oil', '20 g olive oil', 20, 'preset-olive-oil'),
    ],
    steps: steps('Soften onion in oil.', 'Add the chopped vegetables and tomatoes.', 'Braise gently until everything is tender.'),
    suitableForChildren: true, suitableForFamily: true,
  },
];

const sides: RecipeMealType = 'sides';
const desserts: RecipeMealType = 'desserts';
const appetizers: RecipeMealType = 'appetizers';
const drinks: RecipeMealType = 'drinks';

const butterChoice = (grams: number) =>
  choice('butter', 'Butter', 'with', [
    opt('with', 'With butter', ing('butter', `${grams} g butter`, grams, 'preset-butter')),
    opt('without', 'Without'),
  ]);

export const AUTHORED_SIDES: AuthoredRecipe[] = [
  {
    id: 'rcp-mashed-potatoes', title: 'Mashed potatoes', description: 'Creamy mashed potatoes.',
    mealType: sides, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['potato', 'side'], classifiers: cl('kids', 'family', 'vegetarian', 'gluten_free'),
    ingredients: [ing('potato', '600 g potato', 600, 'preset-potato-boiled'), ing('milk', '100 ml milk', 100, 'preset-milk-3-2')],
    choices: [butterChoice(30)],
    steps: steps('Boil the potatoes until soft.', 'Mash with warm milk and butter.', 'Season and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-baked-potato', title: 'Baked potatoes', description: 'Crispy oven-baked potatoes.',
    mealType: sides, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 45, servings: 4,
    tags: ['potato', 'side', 'baked'], classifiers: cl('family', 'vegan', 'gluten_free', 'budget'),
    ingredients: [ing('potato', '600 g potato', 600, 'preset-baked-potato')],
    choices: [dressingOil(15)],
    steps: steps('Cut the potatoes into wedges.', 'Toss with oil and seasoning.', 'Bake at 200°C until golden.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-white-rice', title: 'White rice', description: 'Fluffy boiled white rice.',
    mealType: sides, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 20, servings: 4,
    tags: ['rice', 'side'], classifiers: cl('family', 'vegetarian', 'gluten_free', 'budget'),
    ingredients: [ing('rice', '200 g rice', 200, 'preset-rice-dry')],
    choices: [butterChoice(20)],
    steps: steps('Rinse the rice.', 'Boil in salted water until tender.', 'Drain and fluff with butter if using.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-buckwheat-side', title: 'Buckwheat', description: 'Simple boiled buckwheat.',
    mealType: sides, mealSlot: 'dinner', cuisine: 'Eastern European', cookTimeMinutes: 25, servings: 4,
    tags: ['buckwheat', 'side'], classifiers: cl('healthy', 'vegetarian', 'gluten_free', 'budget'),
    ingredients: [ing('buckwheat', '200 g buckwheat', 200, 'preset-buckwheat-dry')],
    choices: [butterChoice(20)],
    steps: steps('Rinse the buckwheat.', 'Simmer covered in salted water until soft.', 'Fluff with butter if using.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-bulgur-side', title: 'Bulgur', description: 'Light fluffy bulgur.',
    mealType: sides, mealSlot: 'dinner', cuisine: 'Mediterranean', cookTimeMinutes: 20, servings: 4,
    tags: ['bulgur', 'side'], classifiers: cl('healthy', 'vegetarian', 'budget'),
    ingredients: [ing('bulgur', '200 g bulgur', 200, 'preset-bulgur-dry')],
    choices: [butterChoice(20)],
    steps: steps('Rinse the bulgur.', 'Simmer in salted water until tender.', 'Fluff with a fork.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-quinoa-side', title: 'Quinoa', description: 'Boiled fluffy quinoa.',
    mealType: sides, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 20, servings: 4,
    tags: ['quinoa', 'side'], classifiers: cl('healthy', 'vegan', 'high_protein', 'gluten_free'),
    ingredients: [ing('quinoa', '200 g quinoa', 200, 'preset-quinoa-dry')],
    choices: [butterChoice(20)],
    steps: steps('Rinse the quinoa.', 'Simmer in salted water until the grains pop open.', 'Fluff and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-baked-vegetables', title: 'Baked vegetables', description: 'Oven-roasted mixed vegetables.',
    mealType: sides, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 35, servings: 4,
    tags: ['vegetables', 'side', 'baked'], classifiers: cl('healthy', 'vegan', 'gluten_free', 'family'),
    ingredients: [
      ing('zucchini', '250 g zucchini', 250, 'preset-zucchini'),
      ing('bell pepper', '200 g bell pepper', 200, 'preset-bell-pepper'),
      ing('carrot', '150 g carrot', 150, 'preset-carrot'),
      ing('onion', '100 g onion', 100, 'preset-onion'),
    ],
    choices: [dressingOil(25)],
    steps: steps('Chop the vegetables into chunks.', 'Toss with oil and seasoning.', 'Roast at 200°C until caramelised.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-steamed-broccoli', title: 'Steamed broccoli', description: 'Bright steamed broccoli.',
    mealType: sides, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 12, servings: 4,
    tags: ['broccoli', 'side'], classifiers: cl('healthy', 'vegan', 'gluten_free', 'low_sugar', 'quick'),
    ingredients: [ing('broccoli', '500 g broccoli', 500, 'preset-broccoli')],
    choices: [dressingOil(10)],
    steps: steps('Cut the broccoli into florets.', 'Steam until just tender.', 'Drizzle with olive oil if using.'),
    suitableForChildren: true, suitableForFamily: true,
  },
];

export const AUTHORED_DESSERTS: AuthoredRecipe[] = [
  {
    id: 'rcp-banana-bread', title: 'Banana bread', description: 'Moist banana loaf.',
    mealType: desserts, mealSlot: 'snack', cuisine: 'European', cookTimeMinutes: 60, servings: 8,
    tags: ['banana', 'baking'], classifiers: cl('kids', 'family', 'vegetarian'),
    ingredients: [
      ing('flour', '250 g flour', 250, 'preset-wheat-flour-white'),
      ing('banana', '300 g banana', 300, 'preset-banana'),
      ing('eggs', '2 eggs', 100, 'preset-egg'),
      ing('sugar', '120 g sugar', 120, 'ing-sugar'),
      ing('butter', '80 g butter', 80, 'preset-butter'),
    ],
    steps: steps('Cream butter and sugar, beat in eggs and mashed banana.', 'Fold in the flour.', 'Bake in a loaf tin at 175°C for about 50 minutes.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-apple-crumble', title: 'Apple crumble', description: 'Baked apples under a buttery oat crumble.',
    mealType: desserts, mealSlot: 'snack', cuisine: 'British', cookTimeMinutes: 45, servings: 6,
    tags: ['apple', 'baking'], classifiers: cl('kids', 'family', 'vegetarian'),
    ingredients: [
      ing('apple', '600 g apple', 600, 'preset-apple'),
      ing('flour', '120 g flour', 120, 'preset-wheat-flour-white'),
      ing('butter', '80 g butter', 80, 'preset-butter'),
      ing('sugar', '80 g sugar', 80, 'ing-sugar'),
      ing('rolled oats', '60 g rolled oats', 60, 'preset-oatmeal-dry'),
    ],
    steps: steps('Slice apples into a dish with a little sugar.', 'Rub flour, oats, butter and sugar into a crumble.', 'Scatter over and bake at 180°C until golden.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-baked-apples', title: 'Baked apples', description: 'Whole apples baked with honey and nuts.',
    mealType: desserts, mealSlot: 'snack', cuisine: 'European', cookTimeMinutes: 35, servings: 4,
    tags: ['apple', 'baked'], classifiers: cl('healthy', 'kids', 'family', 'gluten_free', 'vegetarian'),
    ingredients: [
      ing('apple', '600 g apple', 600, 'preset-apple'),
      ing('raisins', '30 g raisins', 30, 'ing-raisins'),
      ing('walnuts', '30 g walnuts', 30, 'ing-walnuts'),
    ],
    choices: [sweetener('honey', 8, 40)],
    steps: steps('Core the apples.', 'Fill with raisins, nuts and sweetener.', 'Bake at 180°C until soft.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-oatmeal-cookies', title: 'Oatmeal cookies', description: 'Chewy oat and raisin cookies.',
    mealType: desserts, mealSlot: 'snack', cuisine: 'European', cookTimeMinutes: 25, servings: 12,
    tags: ['oats', 'cookies', 'baking'], classifiers: cl('kids', 'family', 'vegetarian'),
    ingredients: [
      ing('rolled oats', '200 g rolled oats', 200, 'preset-oatmeal-dry'),
      ing('flour', '100 g flour', 100, 'preset-wheat-flour-white'),
      ing('butter', '100 g butter', 100, 'preset-butter'),
      ing('sugar', '100 g sugar', 100, 'ing-sugar'),
      ing('egg', '1 egg', 50, 'preset-egg'),
      ing('raisins', '50 g raisins', 50, 'ing-raisins'),
    ],
    steps: steps('Cream butter and sugar, beat in the egg.', 'Mix in oats, flour and raisins.', 'Spoon onto a tray and bake at 180°C until golden.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-chia-pudding', title: 'Chia pudding', description: 'Overnight chia pudding with milk.',
    mealType: desserts, mealSlot: 'snack', cuisine: 'European', cookTimeMinutes: 5, servings: 2,
    tags: ['chia', 'no bake'], classifiers: cl('healthy', 'vegetarian', 'high_protein', 'gluten_free'),
    ingredients: [ing('chia seeds', '40 g chia seeds', 40, 'ing-chia-seeds'), ing('milk', '250 ml milk', 250, 'preset-milk-3-2')],
    choices: [sweetener('honey', 8, 15)],
    steps: steps('Stir chia into the milk with sweetener.', 'Chill for a few hours or overnight.', 'Top with fruit and serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-panna-cotta', title: 'Panna cotta', description: 'Silky set cream dessert.',
    mealType: desserts, mealSlot: 'snack', cuisine: 'Italian', cookTimeMinutes: 20, servings: 4,
    tags: ['cream', 'no bake'], classifiers: cl('vegetarian', 'gluten_free', 'family'),
    ingredients: [
      ing('cream', '400 g cream', 400, 'ing-heavy-cream'),
      ing('milk', '100 ml milk', 100, 'preset-milk-3-2'),
      ing('sugar', '60 g sugar', 60, 'ing-sugar'),
    ],
    steps: steps('Warm cream, milk and sugar with gelatin until dissolved.', 'Pour into moulds.', 'Chill until set and turn out.'),
    suitableForFamily: true,
  },
  {
    id: 'rcp-fruit-salad', title: 'Fruit salad', description: 'Fresh mixed fruit.',
    mealType: desserts, mealSlot: 'snack', cuisine: 'European', cookTimeMinutes: 10, servings: 4,
    tags: ['fruit', 'no bake'], classifiers: cl('healthy', 'vegan', 'gluten_free', 'quick', 'kids'),
    ingredients: [
      ing('banana', '120 g banana', 120, 'preset-banana'),
      ing('apple', '180 g apple', 180, 'preset-apple'),
      ing('orange', '130 g orange', 130, 'preset-orange'),
      ing('strawberries', '100 g strawberries', 100, 'preset-strawberry'),
      ing('blueberries', '80 g blueberries', 80, 'preset-blueberry'),
    ],
    steps: steps('Chop all the fruit.', 'Combine in a bowl.', 'Serve chilled.'),
    suitableForChildren: true, suitableForFamily: true,
  },
];

export const AUTHORED_SNACKS: AuthoredRecipe[] = [
  {
    id: 'rcp-hummus', title: 'Hummus', description: 'Smooth chickpea and tahini dip.',
    mealType: appetizers, mealSlot: 'snack', cuisine: 'Mediterranean', cookTimeMinutes: 10, servings: 4,
    tags: ['chickpeas', 'dip'], classifiers: cl('healthy', 'vegan', 'high_protein', 'gluten_free'),
    ingredients: [
      ing('chickpeas', '240 g chickpeas', 240, 'ing-chickpeas-canned'),
      ing('tahini', '40 g tahini', 40, 'ing-tahini'),
      ing('olive oil', '20 g olive oil', 20, 'preset-olive-oil'),
    ],
    steps: steps('Blend chickpeas with tahini and lemon.', 'Loosen with a little water.', 'Drizzle with olive oil to serve.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-guacamole', title: 'Guacamole', description: 'Fresh avocado dip with tomato.',
    mealType: appetizers, mealSlot: 'snack', cuisine: 'European', cookTimeMinutes: 10, servings: 4,
    tags: ['avocado', 'dip'], classifiers: cl('healthy', 'vegan', 'gluten_free', 'quick'),
    ingredients: [
      ing('avocado', '300 g avocado', 300, 'preset-avocado'),
      ing('tomato', '80 g tomato', 80, 'preset-tomato'),
      ing('onion', '30 g red onion', 30, 'preset-onion'),
    ],
    steps: steps('Mash the avocado with lime and salt.', 'Stir in diced tomato and onion.', 'Serve fresh.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-berry-smoothie', title: 'Berry smoothie', description: 'Creamy berry and yogurt smoothie.',
    mealType: drinks, mealSlot: 'snack', cuisine: 'European', cookTimeMinutes: 5, servings: 2,
    tags: ['smoothie', 'berries'], classifiers: cl('healthy', 'quick', 'vegetarian', 'gluten_free'),
    ingredients: [
      ing('banana', '120 g banana', 120, 'preset-banana'),
      ing('strawberries', '150 g strawberries', 150, 'preset-strawberry'),
      ing('blueberries', '80 g blueberries', 80, 'preset-blueberry'),
      ing('greek yogurt', '150 g Greek yogurt', 150, 'preset-greek-yogurt'),
      ing('milk', '150 ml milk', 150, 'preset-milk-3-2'),
    ],
    steps: steps('Add everything to a blender.', 'Blend until smooth.', 'Serve cold.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-green-smoothie', title: 'Green smoothie', description: 'Banana, apple and greens smoothie.',
    mealType: drinks, mealSlot: 'snack', cuisine: 'European', cookTimeMinutes: 5, servings: 2,
    tags: ['smoothie', 'greens'], classifiers: cl('healthy', 'vegan', 'quick', 'gluten_free'),
    ingredients: [
      ing('banana', '120 g banana', 120, 'preset-banana'),
      ing('spinach', '60 g spinach', 60, 'ing-salad-greens'),
      ing('apple', '180 g apple', 180, 'preset-apple'),
      ing('water', '200 ml water', 200, 'preset-water'),
    ],
    steps: steps('Add everything to a blender.', 'Blend until smooth.', 'Serve cold.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-lemonade', title: 'Homemade lemonade', description: 'Fresh lemonade, sweeten to taste.',
    mealType: drinks, mealSlot: 'snack', cuisine: 'European', cookTimeMinutes: 10, servings: 4,
    tags: ['lemonade', 'drink'], classifiers: cl('vegan', 'quick', 'gluten_free'),
    ingredients: [ing('water', '1 L water', 1000, 'preset-water')],
    choices: [sweetener('sugar', 60, 60)],
    steps: steps('Squeeze the lemons.', 'Stir lemon juice and sweetener into the water.', 'Chill and serve over ice.'),
    suitableForChildren: true, suitableForFamily: true,
  },
];

// New kids-only dishes (existing family dishes are already tagged `kids` in their
// own categories; these four fill the gaps the catalog did not yet cover).
export const AUTHORED_KIDS: AuthoredRecipe[] = [
  {
    id: 'rcp-vegetable-puree', title: 'Vegetable purée', description: 'Smooth purée of potato, carrot and zucchini.',
    mealType: main, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 25, servings: 2,
    tags: ['baby', 'puree', 'vegetables'], classifiers: cl('kids', 'healthy', 'vegetarian', 'gluten_free'),
    ingredients: [
      ing('potato', '200 g potato', 200, 'preset-potato-boiled'),
      ing('carrot', '100 g carrot', 100, 'preset-carrot'),
      ing('zucchini', '100 g zucchini', 100, 'preset-zucchini'),
      ing('butter', '10 g butter', 10, 'preset-butter'),
    ],
    steps: steps('Boil the vegetables until very soft.', 'Blend smooth with a little cooking water.', 'Stir in butter and serve warm.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-mac-and-cheese', title: 'Mac and cheese', description: 'Creamy cheesy pasta kids love.',
    mealType: pasta, mealSlot: 'dinner', cuisine: 'European', cookTimeMinutes: 25, servings: 4,
    tags: ['pasta', 'cheese', 'kids'], classifiers: cl('kids', 'family', 'vegetarian'),
    ingredients: [
      ing('pasta', '250 g pasta', 250, 'preset-pasta-dry'),
      ing('cheddar', '120 g cheddar', 120, 'ing-cheddar'),
      ing('milk', '200 ml milk', 200, 'preset-milk-3-2'),
      ing('butter', '20 g butter', 20, 'preset-butter'),
    ],
    steps: steps('Cook the pasta.', 'Make a quick cheese sauce with butter, milk and cheddar.', 'Stir the pasta through the sauce.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-chicken-vegetable-puree', title: 'Chicken & vegetable purée', description: 'Gentle chicken, potato and carrot purée.',
    mealType: main, mealSlot: 'lunch', cuisine: 'European', cookTimeMinutes: 30, servings: 2,
    tags: ['baby', 'puree', 'chicken'], classifiers: cl('kids', 'healthy', 'high_protein', 'gluten_free'),
    ingredients: [
      ing('chicken breast', '150 g chicken breast', 150, 'preset-chicken-breast-raw'),
      ing('potato', '150 g potato', 150, 'preset-potato-boiled'),
      ing('carrot', '100 g carrot', 100, 'preset-carrot'),
      ing('butter', '10 g butter', 10, 'preset-butter'),
    ],
    steps: steps('Simmer the chicken and vegetables until very soft.', 'Blend smooth with a little cooking liquid.', 'Stir in butter and serve warm.'),
    suitableForChildren: true, suitableForFamily: true,
  },
  {
    id: 'rcp-banana-oat-porridge', title: 'Banana oat porridge', description: 'Naturally sweet banana porridge, no added sugar.',
    mealType: breakfast, mealSlot: 'breakfast', cuisine: 'European', cookTimeMinutes: 10, servings: 1,
    tags: ['baby', 'oats', 'banana'], classifiers: cl('kids', 'healthy', 'vegetarian', 'low_sugar'),
    ingredients: [
      ing('rolled oats', '40 g rolled oats', 40, 'preset-oatmeal-dry'),
      ing('banana', '100 g banana', 100, 'preset-banana'),
      ing('milk', '150 ml milk', 150, 'preset-milk-3-2'),
    ],
    steps: steps('Simmer the oats in milk until creamy.', 'Mash the banana and stir through.', 'Serve warm.'),
    suitableForChildren: true, suitableForFamily: true,
  },
];
