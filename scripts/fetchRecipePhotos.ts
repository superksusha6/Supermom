/* eslint-disable no-console */
// Fetches one stock photo per recipe from Pexels and records the URL + author for
// attribution. Output: src/lib/generated/recipePhotos.json (committed, merged on
// re-run so existing entries are kept). Reads PEXELS_API_KEY from .env. Run once;
// the generator merges these into the recipe catalog.
import * as fs from 'fs';
import * as path from 'path';
import {
  AUTHORED_BREAKFASTS,
  AUTHORED_SALADS,
  AUTHORED_SOUPS,
  AUTHORED_MAINS,
  AUTHORED_SIDES,
  AUTHORED_DESSERTS,
  AUTHORED_SNACKS,
  AUTHORED_KIDS,
  type AuthoredRecipe,
} from './recipeSource';

const ALL: AuthoredRecipe[] = [
  ...AUTHORED_BREAKFASTS,
  ...AUTHORED_SALADS,
  ...AUTHORED_SOUPS,
  ...AUTHORED_MAINS,
  ...AUTHORED_SIDES,
  ...AUTHORED_DESSERTS,
  ...AUTHORED_SNACKS,
  ...AUTHORED_KIDS,
];

// Better search terms for dishes whose title alone returns poor results.
const QUERY_OVERRIDES: Record<string, string> = {
  Syrniki: 'cottage cheese pancakes',
  'Cottage cheese bake': 'baked cheesecake',
  'Banana oat porridge': 'banana oatmeal',
  'Beetroot & goat cheese salad': 'beetroot salad goat cheese',
  'Stuffed peppers': 'stuffed bell peppers',
  'Semolina porridge': 'semolina porridge',
  'Mac and cheese': 'macaroni and cheese',
  // Re-targeted after a photo-correspondence audit (wrong / generic / duplicate).
  'Buckwheat porridge': 'buckwheat porridge bowl',
  'French toast': 'french toast slices',
  'Chicken in cream sauce': 'creamy chicken breast skillet',
  'Vegetable purée': 'vegetable puree bowl',
  'Chicken & vegetable purée': 'mashed baby food bowl',
  'Chicken meatballs': 'chicken meatballs plate',
  'Broccoli cream soup': 'broccoli soup bowl',
  Minestrone: 'minestrone soup bowl',
  'Baked salmon': 'baked salmon fillet plate',
  'Baked white fish': 'cooked white fish fillet plate',
  'Homemade granola': 'granola in jar',
  'White rice': 'cooked white rice bowl',
  'Berry smoothie': 'berry smoothie glass',
  'Green smoothie': 'green smoothie glass',
  'Turkey meatballs': 'meatballs in tomato sauce',
  'Chicken cutlets': 'breaded chicken cutlet plate',
  'Turkey cutlets': 'breaded turkey patty plate',
  'Quinoa & vegetable salad': 'quinoa salad bowl',
  Quinoa: 'cooked quinoa bowl',
  Goulash: 'hungarian beef goulash',
  'Tuna salad': 'tuna salad bowl',
  Hummus: 'hummus bowl dip',
  'Chicken & avocado salad': 'chicken avocado salad plate',
  'Turkey fillet with vegetables': 'turkey breast fillet plate',
  'Vegetable soup': 'vegetable soup bowl',
  'Cheese soup': 'cheese soup bowl',
  'Homemade lemonade': 'lemonade glass jug',
};

// Recipe ids whose previous photo was wrong/generic/duplicate — re-fetch these.
const REFETCH_IDS = new Set<string>([
  'rcp-buckwheat-side', 'rcp-french-toast', 'rcp-chicken-cream-sauce', 'rcp-vegetable-puree',
  'rcp-chicken-meatballs', 'rcp-broccoli-cream-soup', 'rcp-minestrone', 'rcp-baked-salmon',
  'rcp-baked-white-fish', 'rcp-homemade-granola', 'rcp-white-rice', 'rcp-berry-smoothie',
  'rcp-green-smoothie', 'rcp-turkey-meatballs', 'rcp-chicken-cutlets', 'rcp-turkey-cutlets',
  'rcp-quinoa-salad', 'rcp-quinoa-side', 'rcp-goulash', 'rcp-tuna-salad', 'rcp-hummus',
  'rcp-chicken-avocado-salad', 'rcp-turkey-fillet-vegetables', 'rcp-vegetable-soup',
  'rcp-cheese-soup', 'rcp-lemonade',
]);

const projectRoot = path.resolve(__dirname, '..', '..');
const envText = fs.readFileSync(path.join(projectRoot, '.env'), 'utf8');
const apiKey = (envText.match(/PEXELS_API_KEY=(.+)/) || [])[1]?.trim();
if (!apiKey) {
  console.error('PEXELS_API_KEY not found in .env');
  process.exit(1);
}

const outPath = path.join(projectRoot, 'src', 'lib', 'generated', 'recipePhotos.json');
let photos: Record<string, { photoUri: string; name: string; url: string; source: string }> = {};
try {
  photos = JSON.parse(fs.readFileSync(outPath, 'utf8'));
} catch {
  photos = {};
}

// Drop flagged entries so they are re-fetched with the corrected queries.
for (const id of REFETCH_IDS) delete photos[id];

(async () => {
  let fetched = 0;
  let missing = 0;
  // Track photos already assigned so we never reuse the same image twice.
  const usedUris = new Set<string>(Object.values(photos).map((p) => p.photoUri));
  for (const recipe of ALL) {
    if (photos[recipe.id]) continue;
    const query = QUERY_OVERRIDES[recipe.title] || recipe.title;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`;
    try {
      const response = await fetch(url, { headers: { Authorization: apiKey } });
      if (!response.ok) {
        console.error(`HTTP ${response.status} for "${query}"`);
        if (response.status === 429) break; // rate limited — stop, keep what we have
        missing++;
        continue;
      }
      const data: any = await response.json();
      const candidates: any[] = data.photos || [];
      const photo = candidates.find((p) => !usedUris.has(p.src.landscape)) || candidates[0];
      if (!photo) {
        console.log(`NO PHOTO: ${recipe.title} (q="${query}")`);
        missing++;
        continue;
      }
      usedUris.add(photo.src.landscape);
      photos[recipe.id] = {
        photoUri: photo.src.landscape,
        name: photo.photographer,
        url: photo.url,
        source: 'Pexels',
      };
      fetched++;
      console.log(`${recipe.id} -> ${photo.photographer}`);
    } catch (error) {
      console.error(`Failed "${query}": ${error instanceof Error ? error.message : String(error)}`);
      missing++;
    }
  }
  fs.writeFileSync(outPath, JSON.stringify(photos, null, 2) + '\n', 'utf8');
  console.log(`\nFetched ${fetched}, missing ${missing}, total mapped ${Object.keys(photos).length} -> ${path.relative(projectRoot, outPath)}`);
})();
