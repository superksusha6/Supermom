"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
// Generates an AI food photo for every recipe via OpenAI gpt-image-1, in a unified
// bright/clean style. Writes PNG to assets/recipes/<id>.png (compressed to .jpg in a
// later step). Skips ids that already have a .jpg. Resumable.
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const recipeSource_1 = require("./recipeSource");
const ALL = [
    ...recipeSource_1.AUTHORED_BREAKFASTS, ...recipeSource_1.AUTHORED_SALADS, ...recipeSource_1.AUTHORED_SOUPS, ...recipeSource_1.AUTHORED_MAINS,
    ...recipeSource_1.AUTHORED_SIDES, ...recipeSource_1.AUTHORED_DESSERTS, ...recipeSource_1.AUTHORED_SNACKS, ...recipeSource_1.AUTHORED_KIDS,
];
const STYLE = 'professional food photography, bright soft natural daylight, clean light neutral background, ' +
    'minimal prop styling, fresh and appetizing, sharp focus, high detail, 45 degree angle, ' +
    'no text, no watermark, no people, no hands';
const PROMPT_OVERRIDES = {
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
const apiKey = (_a = (fs.readFileSync(path.join(projectRoot, '.env'), 'utf8').match(/OPENAI_API_KEY=(.+)/) || [])[1]) === null || _a === void 0 ? void 0 : _a.trim();
if (!apiKey) {
    console.error('OPENAI_API_KEY missing');
    process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function promptFor(recipe) {
    const subject = PROMPT_OVERRIDES[recipe.id] || `${recipe.title}. ${recipe.description}`;
    return `${subject}. ${STYLE}`;
}
async function generateOne(recipe) {
    if (fs.existsSync(path.join(outDir, recipe.id + '.jpg')))
        return 'skip';
    for (let attempt = 0; attempt < 5; attempt++) {
        const r = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
            body: JSON.stringify({ model: 'gpt-image-1', prompt: promptFor(recipe), size: '1536x1024', quality: 'medium', n: 1 }),
        });
        if (r.status === 429 || r.status >= 500) {
            await sleep(8000 + attempt * 6000);
            continue;
        }
        const d = await r.json();
        if (!r.ok)
            throw new Error(JSON.stringify(d).slice(0, 200));
        fs.writeFileSync(path.join(outDir, recipe.id + '.png'), Buffer.from(d.data[0].b64_json, 'base64'));
        return 'ok';
    }
    throw new Error('rate limited after retries');
}
(async () => {
    let done = 0;
    const failed = [];
    for (const recipe of ALL) {
        try {
            const res = await generateOne(recipe);
            done++;
            console.log(`[${done}/${ALL.length}] ${recipe.id} ${res}`);
        }
        catch (e) {
            failed.push(recipe.id);
            console.log(`FAIL ${recipe.id}: ${e instanceof Error ? e.message : e}`);
        }
    }
    console.log(`\nDone. ok/skip ${done}, failed ${failed.length}: ${failed.join(', ')}`);
})();
