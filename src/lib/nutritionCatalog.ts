import { NutritionFoodPreset } from '@/lib/nutrition';

const OPEN_FOOD_FACTS_FIELDS = [
  'code',
  'product_name',
  'generic_name',
  'brands',
  'nutriments',
  'serving_quantity',
  'serving_size',
  'product_quantity',
  'product_quantity_unit',
].join(',');

type SearchNutritionCatalogOptions = {
  signal?: AbortSignal;
  usdaApiKey?: string;
};

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  product_quantity?: number | string;
  product_quantity_unit?: string;
  nutriments?: Record<string, unknown>;
};

type OpenFoodFactsSearchResponse = {
  products?: OpenFoodFactsProduct[];
};

type OpenFoodFactsProductResponse = {
  status?: number;
  product?: OpenFoodFactsProduct;
};

type UsdaFoodNutrient = {
  nutrientName?: string;
  nutrientNumber?: string;
  value?: number;
};

type UsdaFood = {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  dataType?: string;
  foodNutrients?: UsdaFoodNutrient[];
};

type UsdaFoodSearchResponse = {
  foods?: UsdaFood[];
};

function toSafeNumber(value: unknown) {
  const numeric = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readOffNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (hasOwn(record, key)) {
      const numeric = toSafeNumber(record[key]);
      if (numeric !== null) return numeric;
    }
  }
  return null;
}

function collapseWhitespace(value?: string) {
  return value?.replace(/\s+/g, ' ').trim() || '';
}

export function normalizeNutritionSearchText(value?: string) {
  return collapseWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getOpenFoodFactsBaseMode(product: OpenFoodFactsProduct): '100g' | '100ml' {
  const unit = collapseWhitespace(String(product.product_quantity_unit || '')).toLowerCase();
  if (['ml', 'cl', 'dl', 'l'].includes(unit)) return '100ml';
  const servingSize = collapseWhitespace(product.serving_size).toLowerCase();
  if (/\b(ml|cl|dl|l)\b/.test(servingSize)) return '100ml';
  const productName = collapseWhitespace(`${product.product_name || ''} ${product.generic_name || ''}`).toLowerCase();
  if (/\b(water|juice|drink|soda|cola|milk|coffee|tea|smoothie|kefir|yogurt drink)\b/.test(productName)) return '100ml';
  return '100g';
}

function readOpenFoodFactsServingGrams(product: OpenFoodFactsProduct): number | undefined {
  const quantity = Number(product.serving_quantity);
  if (Number.isFinite(quantity) && quantity > 0) return Math.round(quantity);
  const match = collapseWhitespace(product.serving_size).match(/([\d.]+)\s*(g|ml)/i);
  if (match) {
    const parsed = Math.round(parseFloat(match[1]));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function mapOpenFoodFactsProduct(product: OpenFoodFactsProduct): NutritionFoodPreset | null {
  const name = collapseWhitespace(product.product_name || product.generic_name);
  if (!name) return null;
  const nutriments = product.nutriments || {};
  const calories =
    readOffNumber(nutriments, ['energy-kcal_100g', 'energy-kcal']) ??
    (() => {
      const kj = readOffNumber(nutriments, ['energy-kj_100g', 'energy_100g', 'energy-kj']);
      return kj !== null ? Math.round((kj / 4.184) * 10) / 10 : null;
    })();
  const protein = readOffNumber(nutriments, ['proteins_100g', 'proteins']) ?? 0;
  const fat = readOffNumber(nutriments, ['fat_100g', 'fat']) ?? 0;
  const carbs = readOffNumber(nutriments, ['carbohydrates_100g', 'carbohydrates']) ?? 0;
  if (calories === null) return null;

  const brand = collapseWhitespace(product.brands?.split(',')[0]);
  const baseMode = getOpenFoodFactsBaseMode(product);
  const code = collapseWhitespace(product.code);
  const servingGrams = readOpenFoodFactsServingGrams(product);
  return {
    id: code ? `off-${code}` : `off-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    brand: brand || undefined,
    barcode: code || undefined,
    servingGrams,
    baseAmount: baseMode === '100ml' ? 'per 100 ml' : 'per 100 g',
    baseMode,
    baseQuantity: 100,
    source: 'open_food_facts',
    sourceLabel: 'Open Food Facts',
    caloriesPer100g: Math.max(0, Math.round(calories * 10) / 10),
    proteinPer100g: Math.max(0, Math.round(protein * 10) / 10),
    fatPer100g: Math.max(0, Math.round(fat * 10) / 10),
    carbsPer100g: Math.max(0, Math.round(carbs * 10) / 10),
  };
}

async function searchOpenFoodFactsFoods(query: string, signal?: AbortSignal) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query,
  )}&search_simple=1&action=process&json=1&page_size=24&fields=${OPEN_FOOD_FACTS_FIELDS}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Open Food Facts search failed with ${response.status}`);
  }
  const data = (await response.json()) as OpenFoodFactsSearchResponse;
  return (data.products || []).map(mapOpenFoodFactsProduct).filter((item): item is NutritionFoodPreset => Boolean(item));
}

function readUsdaNutrient(nutrients: UsdaFoodNutrient[] | undefined, names: string[], numbers: string[]) {
  for (const nutrient of nutrients || []) {
    if (nutrient.value == null) continue;
    if (
      (nutrient.nutrientName && names.includes(nutrient.nutrientName)) ||
      (nutrient.nutrientNumber && numbers.includes(nutrient.nutrientNumber))
    ) {
      return nutrient.value;
    }
  }
  return null;
}

function mapUsdaFood(food: UsdaFood): NutritionFoodPreset | null {
  const name = collapseWhitespace(food.description);
  if (!name) return null;
  const calories = readUsdaNutrient(food.foodNutrients, ['Energy'], ['1008']);
  if (calories === null) return null;
  const protein = readUsdaNutrient(food.foodNutrients, ['Protein'], ['1003']) ?? 0;
  const fat = readUsdaNutrient(food.foodNutrients, ['Total lipid (fat)'], ['1004']) ?? 0;
  const carbs = readUsdaNutrient(food.foodNutrients, ['Carbohydrate, by difference'], ['1005']) ?? 0;
  return {
    id: food.fdcId ? `usda-${food.fdcId}` : `usda-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    brand: collapseWhitespace(food.brandOwner) || undefined,
    baseAmount: 'per 100 g',
    baseMode: '100g',
    baseQuantity: 100,
    source: 'usda',
    sourceLabel: 'USDA',
    caloriesPer100g: Math.max(0, Math.round(calories * 10) / 10),
    proteinPer100g: Math.max(0, Math.round(protein * 10) / 10),
    fatPer100g: Math.max(0, Math.round(fat * 10) / 10),
    carbsPer100g: Math.max(0, Math.round(carbs * 10) / 10),
  };
}

async function searchUsdaFoods(query: string, apiKey: string, signal?: AbortSignal) {
  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      pageSize: 6,
      dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'],
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`USDA search failed with ${response.status}`);
  }
  const data = (await response.json()) as UsdaFoodSearchResponse;
  return (data.foods || []).map(mapUsdaFood).filter((item): item is NutritionFoodPreset => Boolean(item));
}

function buildPresetKey(preset: NutritionFoodPreset) {
  return `${collapseWhitespace(preset.brand).toLowerCase()}::${collapseWhitespace(preset.name).toLowerCase()}::${preset.baseMode || '100g'}`;
}

function dedupePresets(items: NutritionFoodPreset[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = buildPresetKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildFallbackQueries(query: string) {
  const tokens = normalizeNutritionSearchText(query)
    .split(' ')
    .filter((token) => token.length >= 3);
  if (tokens.length <= 1) return [] as string[];

  const variants = [tokens[0], ...tokens.slice(1).sort((a, b) => b.length - a.length)].filter(Boolean);
  return [...new Set(variants)].slice(0, 3);
}

function scoreNutritionPresetMatch(item: NutritionFoodPreset, query: string) {
  const normalizedQuery = normalizeNutritionSearchText(query);
  const normalizedBrand = normalizeNutritionSearchText(item.brand);
  const normalizedTitle = normalizeNutritionSearchText(`${item.brand || ''} ${item.name}`);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  const exactScore = normalizedTitle === normalizedQuery ? 400 : 0;
  const prefixScore = normalizedTitle.startsWith(normalizedQuery) ? 200 : 0;
  const includeScore = normalizedTitle.includes(normalizedQuery) ? 120 : 0;
  const brandScore = normalizedBrand && normalizedBrand.startsWith(normalizedQuery) ? 140 : 0;
  const allTokensScore = tokens.length > 1 && tokens.every((token) => normalizedTitle.includes(token)) ? 100 : 0;
  const tokenScore = tokens.reduce((sum, token) => sum + (normalizedTitle.includes(token) ? 20 : 0), 0);

  return exactScore + prefixScore + includeScore + brandScore + allTokensScore + tokenScore;
}

async function searchSourceWithFallback(
  source: (query: string, signal?: AbortSignal) => Promise<NutritionFoodPreset[]>,
  query: string,
  signal?: AbortSignal,
) {
  const primary = await source(query, signal);
  if (primary.length > 0) return primary;

  const fallbackQueries = buildFallbackQueries(query);
  if (!fallbackQueries.length) return primary;

  const fallbacks = await Promise.allSettled(fallbackQueries.map((variant) => source(variant, signal)));
  return dedupePresets(
    fallbacks.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
  );
}

export async function searchNutritionCatalog(query: string, options: SearchNutritionCatalogOptions = {}) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [] as NutritionFoodPreset[];

  const sources = await Promise.allSettled([
    searchSourceWithFallback(searchOpenFoodFactsFoods, trimmed, options.signal),
    options.usdaApiKey?.trim()
      ? searchSourceWithFallback((variant, signal) => searchUsdaFoods(variant, options.usdaApiKey!.trim(), signal), trimmed, options.signal)
      : Promise.resolve([] as NutritionFoodPreset[]),
  ]);

  if (options.signal?.aborted) {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    throw error;
  }

  const merged = dedupePresets(
    sources.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
  );

  if (merged.length > 0) {
    return [...merged]
      .sort((a, b) => scoreNutritionPresetMatch(b, trimmed) - scoreNutritionPresetMatch(a, trimmed))
      .slice(0, 12);
  }

  const rejected = sources.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
  if (rejected) {
    throw rejected.reason instanceof Error ? rejected.reason : new Error('Could not load nutrition catalog.');
  }

  return [];
}

export async function lookupNutritionBarcode(barcode: string, signal?: AbortSignal) {
  const cleaned = barcode.trim();
  if (!cleaned) return null;
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleaned)}.json?fields=${OPEN_FOOD_FACTS_FIELDS}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    },
  );
  if (!response.ok) {
    throw new Error(`Barcode lookup failed with ${response.status}`);
  }
  const data = (await response.json()) as OpenFoodFactsProductResponse;
  if (data.status === 0 || !data.product) return null;
  return mapOpenFoodFactsProduct(data.product);
}
