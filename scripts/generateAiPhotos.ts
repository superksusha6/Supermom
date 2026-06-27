/* eslint-disable no-console */
// Generates an AI food photo for every recipe via OpenAI gpt-image-1, in a unified
// bright/clean style. Writes PNG to assets/recipes/<id>.png (compressed to .jpg in a
// later step). Skips ids that already have a .jpg. Resumable.
import * as fs from 'fs';
import * as path from 'path';
import {
  AUTHORED_BREAKFASTS, AUTHORED_SALADS, AUTHORED_SOUPS, AUTHORED_MAINS,
  AUTHORED_SIDES, AUTHORED_DESSERTS, AUTHORED_SNACKS, AUTHORED_KIDS,
  type AuthoredRecipe,
} from './recipeSource';

const ALL: AuthoredRecipe[] = [
  ...AUTHORED_BREAKFASTS, ...AUTHORED_SALADS, ...AUTHORED_SOUPS, ...AUTHORED_MAINS,
  ...AUTHORED_SIDES, ...AUTHORED_DESSERTS, ...AUTHORED_SNACKS, ...AUTHORED_KIDS,
];

const STYLE =
  'professional food photography, bright soft natural daylight, clean light neutral background, ' +
  'minimal prop styling, fresh and appetizing, sharp focus, high detail, 45 degree angle, ' +
  'no text, no watermark, no people, no hands';

const PROMPT_OVERRIDES: Record<string, string> = {
  'rcp-syrniki': 'A plate of thick round Russian cottage cheese fritters (syrniki) dusted with sugar, with sour cream and berries',
  'rcp-cottage-cheese-bake': 'A slice of baked cottage cheese casserole with raisins on a plate',
  'rcp-vegetable-puree': 'A bowl of smooth vegetable puree of potato, carrot and zucchini, creamy',
  'rcp-chicken-vegetable-puree': 'A bowl of smooth pureed food of chicken, potato and carrot, creamy, for a toddler',
  'rcp-buckwheat-side': 'A bowl of cooked buckwheat groats (kasha) with a little butter',
  'rcp-boiled-eggs': 'A bowl of peeled boiled eggs, some halved showing the yellow yolk',
  'rcp-banana-bread': 'A sliced loaf of banana bread on a wooden board',
  'rcp-white-rice': 'A bowl of fluffy cooked white rice',
  'rcp-mashed-potatoes': 'A bowl of creamy mashed potatoes with a pat of butter',
  'rcp-lemonade': 'A glass jug and glass of fresh homemade lemonade with lemon slices and mint',
  'rcp-green-smoothie': 'A tall glass of green smoothie',
  'rcp-berry-smoothie': 'A tall glass of pink berry smoothie',
  'rcp-meatball-soup': 'A bowl of meatball soup with beef meatballs, potato and carrot in broth',
};

const projectRoot = path.resolve(__dirname, '..', '..');
const outDir = path.join(projectRoot, 'assets', 'recipes');
fs.mkdirSync(outDir, { recursive: true });
const apiKey = (fs.readFileSync(path.join(projectRoot, '.env'), 'utf8').match(/OPENAI_API_KEY=(.+)/) || [])[1]?.trim();
if (!apiKey) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function promptFor(recipe: AuthoredRecipe) {
  const subject = PROMPT_OVERRIDES[recipe.id] || `${recipe.title}. ${recipe.description}`;
  return `${subject}. ${STYLE}`;
}

async function generateOne(recipe: AuthoredRecipe) {
  if (fs.existsSync(path.join(outDir, recipe.id + '.jpg'))) return 'skip';
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'gpt-image-1', prompt: promptFor(recipe), size: '1536x1024', quality: 'medium', n: 1 }),
    });
    if (r.status === 429 || r.status >= 500) { await sleep(8000 + attempt * 6000); continue; }
    const d: any = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(d).slice(0, 200));
    fs.writeFileSync(path.join(outDir, recipe.id + '.png'), Buffer.from(d.data[0].b64_json, 'base64'));
    return 'ok';
  }
  throw new Error('rate limited after retries');
}

(async () => {
  let done = 0;
  const failed: string[] = [];
  for (const recipe of ALL) {
    try {
      const res = await generateOne(recipe);
      done++;
      console.log(`[${done}/${ALL.length}] ${recipe.id} ${res}`);
    } catch (e) {
      failed.push(recipe.id);
      console.log(`FAIL ${recipe.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\nDone. ok/skip ${done}, failed ${failed.length}: ${failed.join(', ')}`);
})();
