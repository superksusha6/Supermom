"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recipeNutrition_1 = require("@/lib/recipeNutrition");
const ing = (name, grams, foodRef) => ({
    id: foodRef,
    name,
    amount: grams + ' g',
    grams,
    foodRef,
});
const opt = (id, label, ingredient) => ({ id, label, ingredient });
const choice = (id, label, defaultOptionId, options) => ({
    id,
    label,
    defaultOptionId,
    options,
});
const liquid = (grams) => choice('liquid', 'Liquid', 'milk', [
    opt('milk', 'Milk', ing('milk', grams, 'preset-milk-3-2')),
    opt('water', 'Water', ing('water', grams, 'preset-water')),
]);
const sweetener = (defaultId, sugarG = 8, honeyG = 10) => choice('sweetener', 'Sweetener', defaultId, [
    opt('sugar', 'Sugar', ing('sugar', sugarG, 'ing-sugar')),
    opt('honey', 'Honey', ing('honey', honeyG, 'ing-honey')),
    opt('sweetener', 'Sweetener (0 cal)', ing('sweetener', 1, 'ing-sweetener')),
    opt('none', 'None'),
]);
const BREAKFASTS = [
    { id: 'classic-omelet', title: 'Classic omelet', servings: 1, ingredients: [ing('eggs', 100, 'preset-egg'), ing('milk', 30, 'preset-milk-3-2'), ing('butter', 5, 'preset-butter')] },
    { id: 'scrambled-eggs', title: 'Scrambled eggs', servings: 1, ingredients: [ing('eggs', 100, 'preset-egg'), ing('butter', 5, 'preset-butter'), ing('milk', 15, 'preset-milk-3-2')] },
    { id: 'fried-eggs', title: 'Fried eggs', servings: 1, ingredients: [ing('eggs', 100, 'preset-egg'), ing('sunflower oil', 5, 'preset-sunflower-oil')] },
    { id: 'boiled-eggs', title: 'Boiled eggs', servings: 1, ingredients: [ing('eggs', 100, 'preset-egg')] },
    { id: 'oatmeal-porridge', title: 'Oatmeal porridge', servings: 1, ingredients: [ing('rolled oats', 50, 'preset-oatmeal-dry')], choices: [liquid(200), sweetener('honey')] },
    { id: 'rice-porridge', title: 'Rice porridge', servings: 1, ingredients: [ing('rice', 50, 'preset-rice-dry'), ing('butter', 5, 'preset-butter')], choices: [liquid(200), sweetener('sugar')] },
    { id: 'semolina-porridge', title: 'Semolina porridge', servings: 1, ingredients: [ing('semolina', 40, 'ing-semolina-dry'), ing('butter', 5, 'preset-butter')], choices: [liquid(200), sweetener('sugar')] },
    { id: 'buckwheat-porridge', title: 'Buckwheat porridge', servings: 1, ingredients: [ing('buckwheat', 50, 'preset-buckwheat-dry'), ing('butter', 5, 'preset-butter')], choices: [liquid(150), sweetener('none')] },
    { id: 'syrniki', title: 'Syrniki', servings: 2, ingredients: [ing('cottage cheese', 250, 'preset-cottage-cheese-5'), ing('egg', 50, 'preset-egg'), ing('flour', 40, 'preset-wheat-flour-white'), ing('sunflower oil', 10, 'preset-sunflower-oil')], choices: [sweetener('sugar', 15)] },
    { id: 'cottage-cheese-bake', title: 'Cottage cheese bake', servings: 4, ingredients: [ing('cottage cheese', 500, 'preset-cottage-cheese-5'), ing('eggs', 100, 'preset-egg'), ing('semolina', 40, 'ing-semolina-dry'), ing('raisins', 30, 'ing-raisins')], choices: [sweetener('sugar', 40)] },
    { id: 'banana-pancakes', title: 'Banana pancakes', servings: 2, ingredients: [ing('banana', 120, 'preset-banana'), ing('egg', 50, 'preset-egg'), ing('flour', 90, 'preset-wheat-flour-white'), ing('milk', 120, 'preset-milk-3-2'), ing('sunflower oil', 7, 'preset-sunflower-oil')] },
    { id: 'french-toast', title: 'French toast', servings: 2, ingredients: [ing('bread', 120, 'ing-bread'), ing('eggs', 100, 'preset-egg'), ing('milk', 80, 'preset-milk-3-2'), ing('butter', 10, 'preset-butter')], choices: [sweetener('sugar', 5)] },
    { id: 'homemade-granola', title: 'Homemade granola', servings: 6, ingredients: [ing('rolled oats', 200, 'preset-oatmeal-dry'), ing('honey', 60, 'ing-honey'), ing('sunflower oil', 30, 'preset-sunflower-oil'), ing('almonds', 60, 'preset-almonds'), ing('raisins', 50, 'ing-raisins')] },
    {
        id: 'yogurt-berries-granola', title: 'Yogurt with berries & granola', servings: 1,
        ingredients: [ing('greek yogurt', 150, 'preset-greek-yogurt'), ing('blueberries', 80, 'preset-blueberry'), ing('granola', 40, 'ing-granola')],
        choices: [choice('topping', 'Honey', 'honey', [opt('honey', 'Honey', ing('honey', 10, 'ing-honey')), opt('none', 'None')])],
    },
    {
        id: 'avocado-toast', title: 'Avocado toast', servings: 1,
        ingredients: [ing('bread', 70, 'ing-bread'), ing('avocado', 100, 'preset-avocado')],
        choices: [choice('egg', 'Egg', 'with', [opt('with', 'With egg', ing('egg', 50, 'preset-egg')), opt('without', 'Without egg')])],
    },
];
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
function row(title, servings, ingredients, choices, selection) {
    const r = (0, recipeNutrition_1.computeRecipeNutritionForSelection)({ ingredients, choices, servings }, selection);
    const n = r.nutrition;
    return { line: pad(title, 32) + padL(n.calories, 6) + padL(n.protein, 6) + padL(n.fat, 6) + padL(n.carbs, 6) + '  ' + r.confidence, conf: r.confidence };
}
console.log('DEFAULT SELECTION');
console.log(pad('Recipe', 32) + padL('kcal', 6) + padL('P', 6) + padL('F', 6) + padL('C', 6) + '  conf');
console.log('-'.repeat(66));
let allVerified = true;
for (const b of BREAKFASTS) {
    const out = row(b.title, b.servings, b.ingredients, b.choices);
    if (out.conf !== 'verified')
        allVerified = false;
    console.log(out.line);
}
console.log('\nAll verified: ' + allVerified);
console.log('\nALTERNATIVE SELECTIONS (proves live recompute)');
console.log('-'.repeat(66));
const find = (id) => BREAKFASTS.find((b) => b.id === id);
const show = (label, id, selection) => {
    const b = find(id);
    console.log(pad(label, 40) + row(b.title, b.servings, b.ingredients, b.choices, selection).line.slice(32));
};
show('Oatmeal: water + no sweetener', 'oatmeal-porridge', { liquid: 'water', sweetener: 'none' });
show('Oatmeal: water + sweetener(0)', 'oatmeal-porridge', { liquid: 'water', sweetener: 'sweetener' });
show('Rice: water + no sweetener', 'rice-porridge', { liquid: 'water', sweetener: 'none' });
show('Semolina: water + no sweetener', 'semolina-porridge', { liquid: 'water', sweetener: 'none' });
show('Buckwheat: water (default no sweet)', 'buckwheat-porridge', { liquid: 'water' });
show('Syrniki: sweetener(0) instead of sugar', 'syrniki', { sweetener: 'sweetener' });
show('Avocado toast: without egg', 'avocado-toast', { egg: 'without' });
