import type { ShoppingItemCategory } from '@/types/app';

export const SHOPPING_CATEGORY_OPTIONS: Array<{ key: ShoppingItemCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'products', label: 'Products' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'household', label: 'Household' },
  { key: 'personal_care', label: 'Personal care' },
  { key: 'kids', label: 'Kids' },
  { key: 'drinks', label: 'Drinks' },
  { key: 'other', label: 'Other' },
];

// Keyword dictionaries — English + Russian + common brand names, since items are
// typed in either language and often as a brand ("Diet Pepsi", "Nurofen"). Match is
// checked most-specific category first. Multi-word keys match as substrings; single
// tokens also match whole words so "tea" won't fire inside "steak".
const CATEGORY_KEYWORDS: Array<{ category: ShoppingItemCategory; keywords: string[] }> = [
  {
    category: 'pharmacy',
    keywords: [
      'medicine', 'medication', 'pill', 'tablet', 'capsule', 'syrup', 'ointment', 'vitamin', 'supplement',
      'ibuprofen', 'paracetamol', 'acetaminophen', 'aspirin', 'naproxen', 'antihistamine', 'antibiotic',
      'bandage', 'plaster', 'antiseptic', 'thermometer', 'pharmacy', 'first aid', 'cough', 'throat',
      'nurofen', 'panadol', 'advil', 'tylenol', 'strepsils', 'no-shpa', 'nospa', 'citramon', 'analgin',
      'mezim', 'smecta', 'nazivin', 'theraflu', 'coldrex', 'suprastin', 'pentalgin', 'validol', 'corvalol',
      'лекарств', 'таблетк', 'капсул', 'сироп', 'мазь', 'витамин', 'бинт', 'пластыр', 'антисептик',
      'градусник', 'аптек', 'нурофен', 'парацетамол', 'аспирин', 'ношпа', 'но-шпа', 'цитрамон', 'анальгин',
      'мезим', 'смекта', 'спрей', 'капли', 'жаропониж',
    ],
  },
  {
    category: 'kids',
    keywords: [
      'baby', 'diaper', 'nappy', 'wipes', 'formula', 'puree', 'pacifier', 'teether', 'kids', 'toddler',
      'pampers', 'huggies', 'merries', 'nutrilon', 'agusha',
      'подгузник', 'памперс', 'салфетк детск', 'детск', 'смесь', 'пюре', 'соск', 'пустышк', 'агуша', 'малыш',
    ],
  },
  {
    category: 'personal_care',
    keywords: [
      'soap', 'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'sunscreen', 'razor',
      'shaving', 'cotton pad', 'cotton swab', 'mouthwash', 'dental floss', 'body wash', 'body scrub',
      'face cream', 'body cream', 'hand cream', 'makeup', 'lotion', 'perfume', 'lipstick', 'mascara',
      'pad', 'tampon', 'sanitary', 'nivea', 'colgate', 'oral-b', 'gillette', 'libresse',
      'мыло', 'шампун', 'бальзам', 'зубн паст', 'зубн щётк', 'зубная', 'дезодорант', 'бритв', 'станок',
      'ватн диск', 'ватн палочк', 'гель для душа', 'крем для', 'крем', 'лосьон', 'духи', 'помад', 'тушь',
      'прокладк', 'тампон', 'шампунь',
    ],
  },
  {
    category: 'household',
    keywords: [
      'toilet paper', 'paper towel', 'napkin', 'trash bag', 'garbage bag', 'detergent', 'cleaner',
      'dishwasher', 'dish soap', 'laundry', 'sponge', 'foil', 'cling film', 'wrap', 'printer paper',
      'bleach', 'fabric softener', 'air freshener', 'matches', 'candle', 'battery', 'light bulb',
      'fairy', 'domestos', 'cif', 'ariel', 'tide', 'persil', 'lenor', 'sorti', 'ferry',
      'туалетн бумаг', 'бумажн полотенц', 'салфетк', 'мусорн', 'пакет', 'порошок', 'моющ', 'чист',
      'посудомоеч', 'стиральн', 'губк', 'фольг', 'плёнк', 'пленк', 'отбелив', 'кондиционер для бель',
      'освежитель', 'спичк', 'свеч', 'батарейк', 'лампочк', 'фейри', 'доместос', 'средство для',
    ],
  },
  {
    category: 'drinks',
    keywords: [
      'water', 'juice', 'cola', 'coffee', 'tea', 'milkshake', 'smoothie', 'wine', 'beer', 'drink', 'soda',
      'lemonade', 'kvass', 'compote', 'cocoa', 'energy drink', 'sparkling', 'mineral water',
      'pepsi', 'coca', 'coca-cola', 'sprite', 'fanta', '7up', 'seven up', 'red bull', 'adrenaline',
      'schweppes', 'lipton', 'nestea', 'bonaqua', 'borjomi', 'essentuki',
      'вода', 'сок', 'кола', 'кофе', 'чай', 'смузи', 'вино', 'пиво', 'напиток', 'газиров', 'лимонад',
      'квас', 'компот', 'какао', 'энергетик', 'минералк', 'морс', 'пепси', 'спрайт', 'фанта', 'боржоми',
    ],
  },
  {
    category: 'products',
    keywords: [
      'bread', 'loaf', 'bun', 'roll', 'milk', 'yogurt', 'kefir', 'cheese', 'butter', 'cream', 'sour cream',
      'cottage cheese', 'egg', 'chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp',
      'sausage', 'bacon', 'ham', 'steak', 'cutlet', 'fillet', 'mince', 'pasta', 'noodle', 'rice', 'buckwheat', 'oatmeal', 'flour', 'cereal',
      'potato', 'carrot', 'onion', 'garlic', 'tomato', 'cucumber', 'pepper', 'broccoli', 'cabbage',
      'lettuce', 'spinach', 'mushroom', 'zucchini', 'eggplant', 'corn', 'peas', 'bean',
      'apple', 'banana', 'orange', 'lemon', 'lime', 'pear', 'grape', 'berry', 'strawberry', 'watermelon',
      'nuts', 'oil', 'sugar', 'salt', 'spice', 'honey', 'jam', 'chocolate', 'candy', 'cookie', 'biscuit',
      'chips', 'crackers', 'ketchup', 'mayo', 'mustard', 'sauce', 'vinegar', 'canned', 'frozen', 'vegetable',
      'fruit', 'meat', 'dumpling', 'pelmeni',
      'хлеб', 'булк', 'батон', 'молоко', 'йогурт', 'кефир', 'сыр', 'масло', 'сливк', 'сметан', 'творог',
      'яйц', 'кур', 'говядин', 'свинин', 'индейк', 'рыб', 'лосось', 'тунец', 'креветк', 'колбас', 'сосиск',
      'бекон', 'ветчин', 'макарон', 'лапш', 'рис', 'гречк', 'овсянк', 'мук', 'хлопь', 'картош', 'картофел',
      'морков', 'лук', 'чеснок', 'помидор', 'томат', 'огурец', 'огурц', 'перец', 'капуст', 'салат',
      'шпинат', 'гриб', 'кабачок', 'баклажан', 'кукуруз', 'горош', 'фасол', 'яблок', 'банан', 'апельсин',
      'лимон', 'груш', 'виноград', 'ягод', 'клубник', 'арбуз', 'орех', 'сахар', 'соль', 'специ', 'мёд',
      'мед', 'варень', 'джем', 'шоколад', 'конфет', 'печень', 'чипс', 'кетчуп', 'майонез', 'горчиц',
      'соус', 'уксус', 'пельмен', 'вареник', 'сосиск', 'мясо', 'овощ', 'фрукт',
    ],
  },
];

function matchesKeyword(normalized: string, tokens: string[], keyword: string): boolean {
  if (keyword.includes(' ')) return normalized.includes(keyword);
  // Cyrillic stems match as substrings even when short, so "яйц" catches "яйцо" and
  // "кур" catches "курица". Latin: substring for long words, whole-word for short ones
  // (so "tea" doesn't fire inside "steak" or "egg" inside "eggplant").
  if (/[а-яё]/i.test(keyword)) return keyword.length >= 3 && normalized.includes(keyword);
  if (keyword.length >= 5) return normalized.includes(keyword);
  return tokens.includes(keyword);
}

export function inferShoppingItemCategory(name: string): ShoppingItemCategory {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return 'other';
  const tokens = normalized.split(/[^a-zа-яё0-9]+/i).filter(Boolean);
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => matchesKeyword(normalized, tokens, keyword))) return category;
  }
  return 'other';
}

// --- Learned corrections -------------------------------------------------------------------
// When a user hand-picks a category for a product, remember it (by name) so the next time
// that product is added it lands in the same aisle. Stored locally per device.
const OVERRIDES_KEY = 'smartmom.catOverrides.v1';
let overridesCache: Record<string, ShoppingItemCategory> | null = null;

function overrideStore(): Storage | null {
  try {
    return (globalThis as unknown as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function loadOverrides(): Record<string, ShoppingItemCategory> {
  if (overridesCache) return overridesCache;
  overridesCache = {};
  try {
    const raw = overrideStore()?.getItem(OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') overridesCache = parsed as Record<string, ShoppingItemCategory>;
    }
  } catch {
    overridesCache = {};
  }
  return overridesCache;
}

export function recordCategoryOverride(name: string, category: ShoppingItemCategory) {
  const key = name.trim().toLowerCase();
  if (!key) return;
  const map = loadOverrides();
  if (map[key] === category) return;
  map[key] = category;
  try {
    overrideStore()?.setItem(OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // best-effort; overrides are a convenience, not critical state
  }
}

// Override-aware categorization for NEW items (a remembered correction wins over the guess).
export function categorizeItem(name: string): ShoppingItemCategory {
  const key = name.trim().toLowerCase();
  if (key) {
    const map = loadOverrides();
    if (map[key]) return map[key];
  }
  return inferShoppingItemCategory(name);
}

export function getShoppingItemCategoryLabel(category: ShoppingItemCategory | 'all') {
  return SHOPPING_CATEGORY_OPTIONS.find((option) => option.key === category)?.label || 'Other';
}
