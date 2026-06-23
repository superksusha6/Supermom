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

export function inferShoppingItemCategory(name: string): ShoppingItemCategory {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return 'other';

  const pharmacyKeywords = ['medicine', 'vitamin', 'supplement', 'ibuprofen', 'paracetamol', 'bandage', 'antiseptic', 'thermometer', 'pharmacy'];
  const kidsKeywords = ['baby', 'diaper', 'wipes', 'formula', 'puree', 'pacifier', 'bottle', 'kids'];
  const personalCareKeywords = ['soap', 'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'cream', 'sunscreen', 'razor', 'shaving', 'cotton pads', 'cotton swabs', 'mouthwash', 'dental floss', 'body wash', 'body scrub', 'face cream', 'body cream', 'makeup remover'];
  const householdKeywords = ['toilet paper', 'paper towels', 'napkins', 'trash bags', 'detergent', 'cleaner', 'dishwasher', 'laundry', 'sponge', 'foil', 'wrap', 'printer paper'];
  const drinksKeywords = ['water', 'juice', 'cola', 'coffee', 'tea', 'milkshake', 'smoothie', 'wine', 'beer', 'drink', 'soda'];
  const productKeywords = ['bread', 'milk', 'yogurt', 'cheese', 'egg', 'chicken', 'beef', 'fish', 'pasta', 'rice', 'buckwheat', 'oatmeal', 'potato', 'carrot', 'onion', 'garlic', 'tomato', 'cucumber', 'pepper', 'broccoli', 'cabbage', 'apple', 'banana', 'orange', 'lemon', 'pear', 'berry', 'nuts', 'oil', 'sugar', 'salt', 'spices', 'vegetable', 'fruit', 'meat'];

  if (pharmacyKeywords.some((keyword) => normalized.includes(keyword))) return 'pharmacy';
  if (kidsKeywords.some((keyword) => normalized.includes(keyword))) return 'kids';
  if (personalCareKeywords.some((keyword) => normalized.includes(keyword))) return 'personal_care';
  if (householdKeywords.some((keyword) => normalized.includes(keyword))) return 'household';
  if (drinksKeywords.some((keyword) => normalized.includes(keyword))) return 'drinks';
  if (productKeywords.some((keyword) => normalized.includes(keyword))) return 'products';
  return 'other';
}

export function getShoppingItemCategoryLabel(category: ShoppingItemCategory | 'all') {
  return SHOPPING_CATEGORY_OPTIONS.find((option) => option.key === category)?.label || 'Other';
}
