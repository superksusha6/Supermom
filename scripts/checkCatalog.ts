/* eslint-disable no-console */
import { STARTER_RECIPE_LIBRARY } from '@/lib/recipeCatalog';

const breakfasts = STARTER_RECIPE_LIBRARY.filter((r) => r.mealType === 'breakfast');
console.log('Total recipes: ' + STARTER_RECIPE_LIBRARY.length);
console.log('Breakfasts: ' + breakfasts.length);
console.log('All breakfasts verified: ' + breakfasts.every((r) => r.nutritionConfidence === 'verified'));
console.log('Breakfast titles:');
for (const r of breakfasts) console.log('  ' + r.title + '  (' + r.nutritionPerServing.calories + ' kcal, ' + (r.nutritionConfidence || 'none') + ', choices: ' + (r.choices?.length || 0) + ')');
