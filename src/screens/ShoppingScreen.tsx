import { useEffect, useMemo as useReactMemo, useRef, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { analyzeFridgePhoto } from '@/lib/fridgeVision';
import { STARTER_RECIPE_LIBRARY } from '@/lib/recipeCatalog';
import { SHOPPING_CATEGORY_OPTIONS, getShoppingItemCategoryLabel, inferShoppingItemCategory } from '@/lib/shopping';
import { SectionCard } from '@/components/SectionCard';
import { FridgeItem, FridgeItemCategory, FridgeItemStatus, FridgeItemUnit, PurchaseRequest, Recipe, Role, ShoppingItem, ShoppingItemCategory, ShoppingListDoc, ShoppingShare } from '@/types/app';
import { ThemeColors, ThemeName, useTheme, useThemeColors } from '@/theme/theme';

const SHOPPING_SUGGESTIONS = [
  'bread',
  'white bread',
  'whole wheat bread',
  'multigrain bread',
  'rye bread',
  'sourdough bread',
  'lavash',
  'baguette',
  'ciabatta',
  'brioche',
  'focaccia',
  'pita bread',
  'naan bread',
  'flatbread',
  'tortilla',
  'cornbread',
  'oat bread',
  'potato bread',
  'milk bread',
  'gluten-free bread',
  'seeded bread',
  'brown bread',
  'artisan bread',
  'rolls',
  'bread buns',
  'toast bread',
  'sandwich bread',
  'buns',
  'croissants',
  'cookies',
  'waffles',
  'crackers',
  'dry biscuits',
  'bagels',
  'milk',
  'kefir',
  'ryazhenka',
  'cream',
  'yogurt',
  'cottage cheese',
  'hard cheese',
  'soft cheese',
  'processed cheese',
  'butter',
  'margarine',
  'chicken eggs',
  'quail eggs',
  'chicken',
  'beef',
  'lamb',
  'turkey',
  'minced meat',
  'sausages',
  'cold cuts',
  'ham',
  'bacon',
  'fresh fish',
  'frozen fish',
  'smoked fish',
  'canned fish',
  'shrimp',
  'squid',
  'mussels',
  'pasta',
  'spaghetti',
  'noodles',
  'rice',
  'buckwheat',
  'quinoa',
  'bulgur',
  'oatmeal',
  'cereal',
  'potatoes',
  'sweet potato',
  'carrots',
  'onions',
  'red onion',
  'white onion',
  'green onion',
  'garlic',
  'tomatoes',
  'cucumbers',
  'bell pepper',
  'red bell pepper',
  'yellow bell pepper',
  'green bell pepper',
  'chili pepper',
  'eggplant',
  'zucchini',
  'courgette',
  'pumpkin',
  'butternut squash',
  'broccoli',
  'cauliflower',
  'cabbage',
  'red cabbage',
  'chinese cabbage',
  'greens',
  'lettuce',
  'iceberg lettuce',
  'romaine lettuce',
  'spinach',
  'arugula',
  'kale',
  'celery',
  'asparagus',
  'green beans',
  'string beans',
  'brussels sprouts',
  'beetroot',
  'radish',
  'turnip',
  'parsnip',
  'leek',
  'artichoke',
  'okra',
  'yam',
  'daikon',
  'ginger',
  'horseradish',
  'apples',
  'bananas',
  'oranges',
  'tangerines',
  'lemons',
  'pears',
  'grapes',
  'strawberries',
  'blueberries',
  'pineapple',
  'mango',
  'avocado',
  'nuts',
  'almonds',
  'cashews',
  'walnuts',
  'peanuts',
  'seeds',
  'dried fruits',
  'raisins',
  'dried apricots',
  'dates',
  'sugar',
  'salt',
  'pepper',
  'spices',
  'seasonings',
  'ketchup',
  'mayonnaise',
  'mustard',
  'soy sauce',
  'vinegar',
  'vegetable oil',
  'olive oil',
  'canned vegetables',
  'beans',
  'corn',
  'green peas',
  'snow peas',
  'peas',
  'canned tomatoes',
  'instant soups',
  'frozen vegetables',
  'frozen berries',
  'dumplings',
  'vareniki',
  'pizza',
  'ready meals',
  'juice',
  'nectars',
  'soda',
  'water',
  'still water',
  'sparkling water',
  'mineral water',
  'flavored water',
  'coconut water',
  'tonic water',
  'soda water',
  'club soda',
  'Masafi water (still)',
  'Masafi water (sparkling)',
  'Al Ain water (still)',
  'Al Ain water (sparkling)',
  'Mai Dubai water (still)',
  'Mai Dubai water (sparkling)',
  'Oasis water (still)',
  'Arwa water (still)',
  'Arwa water (sparkling)',
  'Aquafina water (still)',
  'Aquafina water (sparkling)',
  'Al Bayan water (still)',
  'Gulfa water (still)',
  'Falcon water (still)',
  'Al Wasmi water (still)',
  'Emirates water (still)',
  'Super Gulf water (still)',
  'Al Ghadeer water (still)',
  'Hayat water (still)',
  'Mai Blue water (still)',
  'Romana water (still)',
  'Rainbow water (still)',
  'Riviere water (still)',
  'Awafi water (still)',
  'Al Fajer water (still)',
  'Al Dana water (still)',
  'Al Shalal water (still)',
  'Al Amtar water (still)',
  'Blu water (sparkling)',
  'Evian water (still)',
  'Evian water (sparkling)',
  'VOSS water (still)',
  'VOSS water (sparkling)',
  'Volvic water (still)',
  'Fiji water (still)',
  'Highland Spring water (still)',
  'Acqua Panna water (still)',
  'Acqua Panna water (sparkling)',
  'Nestlé Pure Life water (still)',
  'Ice Mountain water (still)',
  'Poland Spring water (still)',
  'Deer Park water (still)',
  'Smartwater water (still)',
  'Glaceau Smartwater water (still)',
  'Aqua water (still)',
  'Dasani water (still)',
  'Arrowhead water (still)',
  'Perrier water (sparkling)',
  'San Pellegrino water (sparkling)',
  'Topo Chico water (sparkling)',
  'LaCroix water (sparkling)',
  'Bubly water (sparkling)',
  'Schweppes water (sparkling)',
  'Sparkling Ice water (sparkling)',
  'Gerolsteiner water (sparkling)',
  'Gerolsteiner water (still)',
  'Badoit water (sparkling)',
  'Badoit water (still)',
  'Ferrarelle water (sparkling)',
  'Ferrarelle water (still)',
  'Borjomi water (sparkling)',
  'Apollinaris water (sparkling)',
  'cola',
  'diet cola',
  'zero sugar cola',
  'Coca-Cola',
  'Coca-Cola Zero Sugar',
  'Coca-Cola Light',
  'Pepsi',
  'Diet Pepsi',
  'Pepsi Max',
  'Sprite',
  'Fanta',
  '7UP',
  'Dr Pepper',
  'energy drink',
  'Red Bull',
  'Monster Energy',
  'iced tea',
  'lemon iced tea',
  'peach iced tea',
  'green tea',
  'black tea',
  'herbal tea',
  'tea',
  'coffee',
  'espresso',
  'americano',
  'latte',
  'cappuccino',
  'flat white',
  'mocha',
  'hot chocolate',
  'almond milk',
  'soy milk',
  'oat milk',
  'fresh juice',
  'orange juice',
  'apple juice',
  'pineapple juice',
  'mango juice',
  'smoothie',
  'milkshake',
  'protein shake',
  'wine',
  'red wine',
  'white wine',
  'rosé wine',
  'sparkling wine',
  'champagne',
  'prosecco',
  'beer',
  'lager',
  'ale',
  'craft beer',
  'cocktail',
  'mocktail',
  'cocoa',
  'chocolate',
  'candies',
  'chocolate bars',
  'caramel',
  'chewing gum',
  'baby food',
  'baby formula',
  'baby puree',
  'baby cereals',
  'baby biscuits',
  'diapers',
  'training pants',
  'baby wipes',
  'baby soap',
  'baby shampoo',
  'baby cream',
  'baby bottles',
  'bottle nipples',
  'pacifiers',
  'bottle cleaning liquid',
  'soap',
  'liquid soap',
  'shampoo',
  'conditioner',
  'hair mask',
  'body wash',
  'body scrub',
  'deodorant',
  'toothpaste',
  'toothbrush',
  'dental floss',
  'mouthwash',
  'razor',
  'shaving foam',
  'makeup remover',
  'cotton pads',
  'cotton swabs',
  'face cream',
  'body cream',
  'sunscreen',
  'toilet paper',
  'wet wipes',
  'paper towels',
  'napkins',
  'trash bags',
  'storage bags',
  'plastic wrap',
  'foil',
  'baking paper',
  'dish sponges',
  'cleaning brushes',
  'rubber gloves',
  'dishwashing liquid',
  'dishwasher tablets',
  'dishwasher rinse aid',
  'dishwasher salt',
  'laundry detergent powder',
  'laundry gel',
  'fabric softener',
  'stain remover',
  'bleach',
  'floor cleaner',
  'glass cleaner',
  'kitchen cleaner',
  'bathroom cleaner',
  'descaler',
  'toilet cleaner',
  'air freshener',
  'antibacterial spray',
  'disinfecting wipes',
  'mop',
  'bucket',
  'dustpan',
  'broom',
  'brush',
  'microfiber cloths',
  'printer paper',
  'notebooks',
  'notepads',
  'pens',
  'pencils',
  'markers',
  'highlighters',
  'eraser',
  'sharpener',
  'tape',
  'glue',
  'scissors',
  'stapler',
  'paper clips',
  'plastic sleeves',
  'folders',
  'envelopes',
  'stickers',
  'cat food',
  'dog food',
  'wet pet food',
  'pet treats',
  'cat litter',
  'pet training pads',
  'pet bowls',
  'pet toys',
  'pet shampoo',
  'flea and tick treatment',
] as const;

const UNIT_OPTIONS = ['pcs', 'g', 'kg', 'packs'] as const;
type UnitOption = (typeof UNIT_OPTIONS)[number];
const FRIDGE_UNIT_OPTIONS: FridgeItemUnit[] = ['pcs', 'g', 'kg', 'ml', 'l', 'pack', 'bottle', 'jar'];
const FRIDGE_CATEGORY_OPTIONS: FridgeItemCategory[] = ['Dairy', 'Meat / Fish', 'Vegetables', 'Fruits', 'Drinks', 'Snacks', 'Frozen', 'Pantry', 'Home stock', 'Pharmacy', 'Baby / Kids', 'Other'];

type DraftRow = {
  id: string;
  name: string;
  amount: number;
  unit: UnitOption;
  unitOpen: boolean;
};

type Props = {
  lists: ShoppingListDoc[];
  fridgeItems: FridgeItem[];
  recipes: Recipe[];
  onImportFridgeItems: (items: Array<Omit<FridgeItem, 'id'>>) => void;
  shareTargets: Array<{ key: string; label: string }>;
  sharedInbox: ShoppingShare[];
  activeRecipientKey: string;
  currentRole: Role;
  currentActorLabel: string;
  purchaseRequests: PurchaseRequest[];
  onUpdateFridgeItemStatus: (itemId: string, status: FridgeItemStatus) => void;
  onAddFridgeItemToShopping: (itemId: string) => void;
  onAddAllLowFridgeItemsToShopping: () => void;
  onUpdateFridgeItem: (item: FridgeItem) => void;
  onUseFridgeItem: (itemId: string) => void;
  onTogglePurchased: (listId: string, itemId: string) => void;
  onCreateList: (
    items: Array<{ name: string; quantity: string; category?: ShoppingItemCategory }>,
    targetListId?: string | null,
    createBehavior?: 'default' | 'force-current',
  ) => void;
  onUpdateList: (listId: string, items: ShoppingItem[]) => void;
  onDeleteList: (listId: string) => void;
  onSaveAsBaseList: (listId: string) => void;
  onStartFromBaseList: () => void;
  onUsePastList: (listId: string) => void;
  onShareListToProfile: (listId: string, recipientKey: string) => void;
  onImportSharedList: (shareId: string) => void;
  onDismissSharedList: (shareId: string) => void;
  onCreatePurchaseRequest: (payload: { itemName: string; quantity: string; comment: string }) => void;
  onAddPurchaseRequestToList: (requestId: string) => void;
  onDismissPurchaseRequest: (requestId: string) => void;
  quickActionRequest?: { type: 'add-item' | 'create-basket' | 'use-basket'; token: number } | null;
};

type Filter = 'active' | 'purchased';
type ShoppingView = 'list' | 'fridge';
type InventoryFilter = 'all' | 'low' | 'use_soon';
type ShoppingCategory = 'all' | 'products' | 'pharmacy' | 'household' | 'personal_care' | 'kids' | 'drinks' | 'other';

type EditShoppingRow = {
  key: string;
  sourceId: string | null;
  name: string;
  quantity: string;
  amount: string;
  unit: UnitOption;
  category: ShoppingItemCategory;
  purchased: boolean;
};

type FridgeEditDraft = {
  id: string;
  name: string;
  amount: string;
  unit: FridgeItemUnit;
  category: FridgeItemCategory;
  expiresAt: string;
  note: string;
  opened: boolean;
  status: FridgeItemStatus;
};

type ComposerMode = 'list' | 'basket';

function createDraftRow(index: number): DraftRow {
  return {
    id: `draft-${index}-${Date.now()}`,
    name: '',
    amount: 1,
    unit: 'pcs',
    unitOpen: false,
  };
}

function getDraftAmountStep(unit: UnitOption, amount: number) {
  if (unit === 'g') {
    if (amount >= 500) return 50;
    if (amount >= 100) return 20;
    return 10;
  }
  if (unit === 'kg') return 1;
  return 1;
}

function normalizeAmountForUnit(unit: UnitOption, amount: number) {
  if (unit === 'g') {
    if (amount <= 1) return 100;
    return Math.max(10, amount);
  }
  return Math.max(1, amount);
}

function parseShoppingQuantityText(value: string): { amount: string; unit: UnitOption } {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+(?:[.,]\d+)?)\s*([a-zа-я]+)?$/i);
  if (!match) return { amount: '1', unit: 'pcs' };
  const rawAmount = match[1]?.replace(',', '.') || '1';
  const rawUnit = match[2] || 'pcs';
  if (rawUnit === 'g') return { amount: rawAmount, unit: 'g' };
  if (rawUnit === 'kg') return { amount: rawAmount, unit: 'kg' };
  if (rawUnit === 'pack' || rawUnit === 'packs' || rawUnit === 'package' || rawUnit === 'packages') {
    return { amount: rawAmount, unit: 'packs' };
  }
  return { amount: rawAmount, unit: 'pcs' };
}

function formatShoppingQuantity(amount: string, unit: UnitOption) {
  const trimmed = amount.trim() || '1';
  return `${trimmed} ${unit}`;
}

function mergeShoppingItemsByName(primary: ShoppingItem[], secondary: ShoppingItem[]) {
  const seen = new Set<string>();
  const merged: ShoppingItem[] = [];

  const append = (items: ShoppingItem[]) => {
    items.forEach((item, index) => {
      const normalizedName = item.name.trim().toLowerCase();
      if (!normalizedName || seen.has(normalizedName)) return;
      seen.add(normalizedName);
      merged.push({
        ...item,
        id: item.id || `si-local-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        category: item.category || inferShoppingItemCategory(item.name),
      });
    });
  };

  append(primary);
  append(secondary);

  return merged;
}

export function ShoppingScreen({
  lists,
  fridgeItems,
  recipes,
  onImportFridgeItems,
  shareTargets,
  sharedInbox,
  activeRecipientKey,
  currentRole,
  currentActorLabel,
  purchaseRequests,
  onUpdateFridgeItemStatus,
  onAddFridgeItemToShopping,
  onAddAllLowFridgeItemsToShopping,
  onUpdateFridgeItem,
  onUseFridgeItem,
  onTogglePurchased,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onSaveAsBaseList,
  onStartFromBaseList,
  onUsePastList,
  onShareListToProfile,
  onImportSharedList,
  onDismissSharedList,
  onCreatePurchaseRequest,
  onAddPurchaseRequestToList,
  onDismissPurchaseRequest,
  quickActionRequest,
}: Props) {
  const { themeName } = useTheme();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const styles = useReactMemo(() => createStyles(colors, themeName), [colors, themeName]);
  const [filter, setFilter] = useState<Filter>('active');
  const [shoppingView, setShoppingView] = useState<ShoppingView>('list');
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');
  const [shoppingCategory, setShoppingCategory] = useState<ShoppingCategory>('all');
  const [baseListOpen, setBaseListOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [addComposerOpen, setAddComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>('list');
  const [pendingCreateBehavior, setPendingCreateBehavior] = useState<'default' | 'force-current'>('default');
  const [fridgePhotoUri, setFridgePhotoUri] = useState<string | null>(null);
  const [fridgePhotoScanOpen, setFridgePhotoScanOpen] = useState(false);
  const [fridgePhotoLoading, setFridgePhotoLoading] = useState(false);
  const [fridgeEditOpen, setFridgeEditOpen] = useState(false);
  const [recognizedFridgeItems, setRecognizedFridgeItems] = useState<Array<Omit<FridgeItem, 'id'>>>([]);
  const [fridgeEditDraft, setFridgeEditDraft] = useState<FridgeEditDraft | null>(null);
  const [fridgeScanSource, setFridgeScanSource] = useState<'ai' | 'fallback' | null>(null);
  const [fridgeScanError, setFridgeScanError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<DraftRow[]>(() => [createDraftRow(0)]);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [focusedEditRowKey, setFocusedEditRowKey] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTargetListId, setEditTargetListId] = useState<string | null>(null);
  const [editTargetListTitle, setEditTargetListTitle] = useState('Shopping List');
  const [shareOpen, setShareOpen] = useState(false);
  const [requestItemName, setRequestItemName] = useState('');
  const [requestQuantity, setRequestQuantity] = useState('1 pcs');
  const [requestComment, setRequestComment] = useState('');
  const [requestInputFocused, setRequestInputFocused] = useState(false);
  const [noteHover, setNoteHover] = useState(false);
  const [notePulse, setNotePulse] = useState({ scale: 0.82, y: 0, rotate: 0, sway: 0 });
  const [editRows, setEditRows] = useState<EditShoppingRow[]>([]);
  const draftInputRefs = useRef<Record<string, TextInput | null>>({});
  const editInputRefs = useRef<Record<string, TextInput | null>>({});
  const cameraRef = useRef<CameraView | null>(null);
  const pendingFocusRowIdRef = useRef<string | null>(null);
  const pendingEditSourceIdRef = useRef<string | null>(null);
  const pendingEditRowKeyRef = useRef<string | null>(null);
  const pulseFrameRef = useRef(0);
  const shareHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const baseList = useReactMemo(
    () => lists.find((list) => list.listType === 'base' || list.title === 'Family base list' || list.title === 'Usual basket') || null,
    [lists],
  );
  const nonBaseLists = useReactMemo(
    () => lists.filter((list) => list.id !== baseList?.id),
    [baseList?.id, lists],
  );
  const activeList = useReactMemo(
    () => nonBaseLists.find((list) => list.listType === 'current') || nonBaseLists[0] || null,
    [nonBaseLists],
  );
  const historyLists = useReactMemo(
    () =>
      nonBaseLists.filter(
        (list) =>
          list.id !== activeList?.id &&
          (list.listType === 'history' || list.listType === undefined),
      ),
    [activeList?.id, nonBaseLists],
  );
  const needsBasketOnboarding = !baseList;
  const canStartFromBasket = !!baseList && !activeList;
  const fridgeActionLabel = currentRole === 'staff' ? 'Send request' : 'Add to list';
  const recipeCatalog = useReactMemo(
    () => [...recipes, ...STARTER_RECIPE_LIBRARY.filter((recipe) => !recipes.some((saved) => saved.id === recipe.id))],
    [recipes],
  );
  const visibleFridgeItems = useReactMemo(
    () =>
      fridgeItems
        .filter((item) => item.status !== 'out')
        .filter((item) => {
          if (inventoryFilter === 'low') return item.status === 'low';
          if (inventoryFilter === 'use_soon') return isFridgeItemUseSoon(item);
          return true;
        })
        .sort((left, right) => {
          const leftUrgency = isFridgeItemUseSoon(left) ? 2 : left.status === 'low' ? 1 : 0;
          const rightUrgency = isFridgeItemUseSoon(right) ? 2 : right.status === 'low' ? 1 : 0;
          return rightUrgency - leftUrgency;
        }),
    [fridgeItems, inventoryFilter],
  );

  useEffect(() => {
    if (!quickActionRequest) return;
    closeShareMenu();
    setMoreOpen(false);
    setBaseListOpen(false);

    if (quickActionRequest.type === 'use-basket') {
      if (baseList && !activeList) {
        onStartFromBaseList();
        return;
      }
      if (baseList) {
        setBaseListOpen(true);
        return;
      }
      openAddComposer('basket');
      return;
    }

    if (quickActionRequest.type === 'create-basket') {
      openAddComposer('basket');
      return;
    }

    openAddComposer('list', 'force-current');
  }, [quickActionRequest]);
  const visibleFridgeSections = useReactMemo(() => {
    const groups = new Map<string, FridgeItem[]>();
    visibleFridgeItems.forEach((item) => {
      const key = item.category || 'Other';
      const bucket = groups.get(key) || [];
      bucket.push(item);
      groups.set(key, bucket);
    });
    return Array.from(groups.entries()).map(([title, items]) => ({ title, items }));
  }, [visibleFridgeItems]);
  const restockItems = useReactMemo(() => fridgeItems.filter((item) => item.status === 'low'), [fridgeItems]);
  const fridgeInStockCount = useReactMemo(() => fridgeItems.filter((item) => item.status !== 'out').length, [fridgeItems]);
  const fridgeLowCount = useReactMemo(() => fridgeItems.filter((item) => item.status === 'low').length, [fridgeItems]);
  const fridgeUseSoonCount = useReactMemo(
    () => fridgeItems.filter((item) => item.status !== 'out' && isFridgeItemUseSoon(item)).length,
    [fridgeItems],
  );
  const visibleItems = useReactMemo(
    () =>
      activeList
        ? filter === 'purchased'
          ? activeList.items.filter((item) => item.purchased)
          : activeList.items.filter((item) => !item.purchased)
        : [],
    [activeList, filter],
  );
  const filteredShoppingItems = useReactMemo(
    () => visibleItems.filter((item) => shoppingCategory === 'all' || (item.category || inferShoppingItemCategory(item.name)) === shoppingCategory),
    [shoppingCategory, visibleItems],
  );
  const groupedShoppingItems = useReactMemo(() => {
    const buckets = new Map<ShoppingCategory, ShoppingItem[]>();
    filteredShoppingItems.forEach((item) => {
      const category = item.category || inferShoppingItemCategory(item.name);
      const current = buckets.get(category) || [];
      current.push(item);
      buckets.set(category, current);
    });
    return SHOPPING_CATEGORY_OPTIONS
      .filter((option) => option.key !== 'all')
      .map((option) => ({
        ...option,
        items: buckets.get(option.key) || [],
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredShoppingItems]);
  const totalShoppingItemsCount = activeList?.items.length ?? 0;
  const purchasedShoppingItemsCount = useReactMemo(
    () => (activeList ? activeList.items.filter((item) => item.purchased).length : 0),
    [activeList],
  );
  const remainingShoppingItemsCount = Math.max(totalShoppingItemsCount - purchasedShoppingItemsCount, 0);
  const activeCategoryOption = SHOPPING_CATEGORY_OPTIONS.find((option) => option.key === shoppingCategory);
  const visiblePurchaseRequests = useReactMemo(
    () => purchaseRequests.filter((request) => request.status === 'new'),
    [purchaseRequests],
  );
  const cookFromFridgeSuggestions = useReactMemo(() => getCookFromFridgeSuggestions(fridgeItems, recipeCatalog), [fridgeItems, recipeCatalog]);
  const fridgeEditRecipeIdeas = useReactMemo(() => {
    if (!fridgeEditDraft) return [];
    const normalizedName = fridgeEditDraft.name.trim().toLowerCase();
    if (!normalizedName) return [];
    return cookFromFridgeSuggestions
      .filter((item) => item.availableIngredients.some((ingredient) => isIngredientMatched(normalizedName, ingredient.toLowerCase())))
      .slice(0, 3);
  }, [cookFromFridgeSuggestions, fridgeEditDraft]);
  const purchaseRequestSuggestions = useReactMemo(() => {
    const query = requestItemName.trim().toLowerCase();
    if (!query) return [];
    return SHOPPING_SUGGESTIONS.filter((item) => {
      const normalized = item.toLowerCase();
      if (normalized.startsWith(query)) return true;
      return normalized.split(' ').some((word) => word.startsWith(query));
    }).slice(0, 6);
  }, [requestItemName]);

  useEffect(() => {
    if (!noteHover) {
      pulseFrameRef.current = 0;
      setNotePulse({ scale: 0.82, y: 0, rotate: 0, sway: 0 });
      return;
    }
    const wobbleTimer = setInterval(() => {
      pulseFrameRef.current += 1;
      const phase = pulseFrameRef.current;
      setNotePulse({
        scale: 0.87 + Math.sin(phase / 12) * 0.012,
        y: Math.sin(phase / 7.5) * -4.5,
        rotate: Math.sin(phase / 11) * 0.8,
        sway: Math.cos(phase / 9.5) * 3.2,
      });
    }, 34);
    return () => clearInterval(wobbleTimer);
  }, [noteHover]);

  const suggestionsByRow = useReactMemo(() => {
    const entries = draftRows.map((row) => {
      const query = row.name.trim().toLowerCase();
      if (!query) return [row.id, []] as const;
      const matches = SHOPPING_SUGGESTIONS.filter((item) => {
        const normalized = item.toLowerCase();
        if (normalized.startsWith(query)) return true;
        return normalized.split(' ').some((word) => word.startsWith(query));
      }).slice(0, 6);
      return [row.id, matches] as const;
    });
    return Object.fromEntries(entries) as Record<string, string[]>;
  }, [draftRows]);
  const editSuggestionsByRow = useReactMemo(() => {
    const entries = editRows.map((row) => {
      const query = row.name.trim().toLowerCase();
      if (!query) return [row.key, []] as const;
      const matches = SHOPPING_SUGGESTIONS.filter((item) => {
        const normalized = item.toLowerCase();
        if (normalized.startsWith(query)) return true;
        return normalized.split(' ').some((word) => word.startsWith(query));
      }).slice(0, 6);
      return [row.key, matches] as const;
    });
    return Object.fromEntries(entries) as Record<string, string[]>;
  }, [editRows]);

  useEffect(() => {
    if (!pendingFocusRowIdRef.current) return;
    const targetId = pendingFocusRowIdRef.current;
    const timer = setTimeout(() => {
      draftInputRefs.current[targetId]?.focus();
      pendingFocusRowIdRef.current = null;
    }, 0);
    return () => clearTimeout(timer);
  }, [draftRows]);

  useEffect(() => {
    if (!editOpen || !pendingEditSourceIdRef.current) return;
    const sourceId = pendingEditSourceIdRef.current;
    const timer = setTimeout(() => {
      const targetRow = editRows.find((row) => row.sourceId === sourceId);
      if (!targetRow) return;
      editInputRefs.current[targetRow.key]?.focus();
      pendingEditSourceIdRef.current = null;
    }, 0);
    return () => clearTimeout(timer);
  }, [editOpen, editRows]);

  useEffect(() => {
    if (!editOpen || !pendingEditRowKeyRef.current) return;
    const rowKey = pendingEditRowKeyRef.current;
    const timer = setTimeout(() => {
      editInputRefs.current[rowKey]?.focus();
      pendingEditRowKeyRef.current = null;
    }, 0);
    return () => clearTimeout(timer);
  }, [editOpen, editRows]);

  function updateRow(rowId: string, updater: (row: DraftRow) => DraftRow) {
    setDraftRows((prev) => prev.map((row) => (row.id === rowId ? updater(row) : row)));
  }

  function closeAllUnitMenus() {
    setDraftRows((prev) => prev.map((row) => (row.unitOpen ? { ...row, unitOpen: false } : row)));
  }

  function insertFreshTopRow() {
    const nextRow = createDraftRow(draftRows.length);
    pendingFocusRowIdRef.current = nextRow.id;
    setDraftRows((prev) => [nextRow, ...prev]);
    setFocusedRowId(nextRow.id);
  }

  function focusDraftComposer() {
    const targetId = draftRows[0]?.id;
    if (!targetId) {
      insertFreshTopRow();
      return;
    }
    pendingFocusRowIdRef.current = targetId;
    setFocusedRowId(targetId);
    setTimeout(() => {
      draftInputRefs.current[targetId]?.focus();
    }, 0);
  }

  function openAddComposer(mode: ComposerMode = 'list', createBehavior: 'default' | 'force-current' = 'default') {
    setComposerMode(mode);
    setPendingCreateBehavior(createBehavior);
    setDraftRows((prev) => (prev.length > 0 ? prev : [createDraftRow(0)]));
    setAddComposerOpen(true);
    setTimeout(() => {
      focusDraftComposer();
    }, 0);
  }

  function promoteTopFilledRow(rowId: string, rowName: string, index: number) {
    if (composerMode === 'basket') return false;
    if (index !== 0 || rowName.trim().length === 0) return false;
    let inserted = false;
    setDraftRows((prev) => {
      if (prev[0]?.id !== rowId) return prev;
      const nextRow = createDraftRow(prev.length);
      pendingFocusRowIdRef.current = nextRow.id;
      inserted = true;
      return [nextRow, ...prev];
    });
    if (inserted) {
      setFocusedRowId(null);
    }
    return inserted;
  }

  function saveDraftRows() {
    const prepared = draftRows
      .map((row) => ({
        name: row.name.trim(),
        quantity: `${row.amount} ${row.unit}`,
        category: inferShoppingItemCategory(row.name),
      }))
      .filter((row) => row.name.length > 0);

    if (prepared.length === 0) return;

    if (composerMode === 'basket') {
      if (baseList) {
        const merged = mergeShoppingItemsByName(
          baseList.items,
          prepared.map((item, index) => ({
            id: `basket-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            name: item.name,
            quantity: item.quantity,
            category: item.category,
            purchased: false,
          })),
        );
        onUpdateList(baseList.id, merged);
      } else {
        onCreateList(prepared, null);
      }
    } else {
      onCreateList(prepared, activeList?.id ?? null, pendingCreateBehavior);
    }
    setDraftRows([createDraftRow(0)]);
    setFocusedRowId(null);
    setAddComposerOpen(false);
    setComposerMode('list');
    setPendingCreateBehavior('default');
  }

  function closeBaseListPanel() {
    setBaseListOpen(false);
  }

  function useSingleBaseListItem(item: ShoppingItem) {
    onCreateList(
      [
        {
          name: item.name,
          quantity: item.quantity,
          category: item.category || inferShoppingItemCategory(item.name),
        },
      ],
      activeList?.id ?? null,
    );
  }

  function closeEditModal() {
    setEditOpen(false);
    setEditRows([]);
    setEditTargetListId(null);
    setFocusedEditRowKey(null);
    setNoteHover(false);
  }

  function openEditor(options?: { itemId?: string; listId?: string }) {
    const targetList = options?.listId ? lists.find((list) => list.id === options.listId) || null : activeList;
    if (!targetList) return;
    pendingEditSourceIdRef.current = options?.itemId ?? null;
    setEditTargetListId(targetList.id);
    setEditTargetListTitle(targetList.title);
    setEditRows(
      targetList.items.map((item, index) => ({
        key: `edit-${item.id}-${index}`,
        sourceId: item.id,
        name: item.name,
        quantity: item.quantity,
        ...parseShoppingQuantityText(item.quantity),
        category: item.category || inferShoppingItemCategory(item.name),
        purchased: item.purchased,
      })),
    );
    setFocusedEditRowKey(null);
    setEditOpen(true);
  }

  function openShareMenu() {
    if (shareHoverTimeoutRef.current) {
      clearTimeout(shareHoverTimeoutRef.current);
      shareHoverTimeoutRef.current = null;
    }
    setShareOpen(true);
  }

  function closeShareMenu() {
    if (shareHoverTimeoutRef.current) clearTimeout(shareHoverTimeoutRef.current);
    shareHoverTimeoutRef.current = null;
    setShareOpen(false);
  }

  function toggleShareMenu() {
    if (shareOpen) {
      closeShareMenu();
      return;
    }
    openShareMenu();
  }

  function formatShareText(list: ShoppingListDoc) {
    const lines = list.items.map((item) => `• ${item.name} — ${item.quantity}`);
    return `${list.title}\n\n${lines.join('\n')}`;
  }

  async function shareListToApps(mode: 'whatsapp' | 'apps') {
    if (!activeList) return;
    const message = formatShareText(activeList);
    try {
      if (mode === 'whatsapp') {
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
          setShareOpen(false);
          return;
        }
      }
      await Share.share({ message, title: activeList.title });
      setShareOpen(false);
    } catch {
      Alert.alert('Share failed', 'Could not open sharing right now.');
    }
  }

  function addEditRow() {
    const nextRow = {
      key: `new-${Date.now()}-${editRows.length}`,
      sourceId: null,
      name: '',
      quantity: '1 pcs',
      amount: '1',
      unit: 'pcs' as UnitOption,
      category: 'products' as ShoppingItemCategory,
      purchased: false,
    };
    pendingEditRowKeyRef.current = nextRow.key;
    setEditRows((prev) => [nextRow, ...prev]);
    setFocusedEditRowKey(nextRow.key);
  }

  function ensureFreshEditTopRow(rowKey: string, text: string, index: number) {
    if (editTargetListId === baseList?.id) return;
    if (index !== 0 || text.trim().length === 0) return;
    const nextRow = {
      key: `new-${Date.now()}-${editRows.length}`,
      sourceId: null,
      name: '',
      quantity: '1 pcs',
      amount: '1',
      unit: 'pcs' as UnitOption,
      category: 'products' as ShoppingItemCategory,
      purchased: false,
    };
    setEditRows((prev) => {
      if (prev[0]?.key !== rowKey) return prev;
      return [nextRow, ...prev];
    });
  }

  function promoteEditTopRowOnSubmit(rowKey: string, rowName: string, index: number) {
    if (editTargetListId !== baseList?.id) return false;
    if (index !== 0 || rowName.trim().length === 0) return false;
    const nextRow = {
      key: `new-${Date.now()}-${editRows.length}`,
      sourceId: null,
      name: '',
      quantity: '1 pcs',
      amount: '1',
      unit: 'pcs' as UnitOption,
      category: 'products' as ShoppingItemCategory,
      purchased: false,
    };
    pendingEditRowKeyRef.current = nextRow.key;
    setEditRows((prev) => {
      if (prev[0]?.key !== rowKey) return prev;
      return [nextRow, ...prev];
    });
    setFocusedEditRowKey(nextRow.key);
    return true;
  }

  function saveEditedList() {
    if (!editTargetListId) return;
    const cleaned = editRows
      .map((row) => ({
        id: row.sourceId || `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: row.name.trim(),
        quantity: formatShoppingQuantity(row.amount, row.unit),
        category: row.category,
        purchased: row.purchased,
      }))
      .filter((row) => row.name.length > 0);

    onUpdateList(editTargetListId, cleaned);
    setEditOpen(false);
    setEditRows([]);
    setEditTargetListId(null);
    setFocusedEditRowKey(null);
    setNoteHover(false);
  }

  function openFridgeEditor(item: FridgeItem) {
    setFridgeEditDraft({
      id: item.id,
      name: item.name,
      amount: typeof item.amount === 'number' ? String(item.amount) : '',
      unit: item.unit || 'pcs',
      category: item.category || 'Other',
      expiresAt: item.expiresAt || '',
      note: item.note || '',
      opened: !!item.opened,
      status: item.status,
    });
    setFridgeEditOpen(true);
  }

  function closeFridgeEditor() {
    setFridgeEditOpen(false);
    setFridgeEditDraft(null);
  }

  function adjustFridgeItemAmount(item: FridgeItem, delta: number) {
    const parsed = getCountableFridgeAmount(item);
    if (!parsed) {
      openFridgeEditor(item);
      return;
    }
    const nextAmount = Math.max(0, parsed.amount + delta);
    const nextStatus: FridgeItemStatus = nextAmount === 0 ? 'out' : nextAmount <= 2 ? 'low' : 'full';
    onUpdateFridgeItem({
      ...item,
      amount: nextAmount,
      unit: parsed.unit,
      quantity: `${nextAmount} ${parsed.unit}`,
      status: nextStatus,
    });
  }

  function saveFridgeEditor() {
    if (!fridgeEditDraft) return;
    const trimmedName = fridgeEditDraft.name.trim();
    if (!trimmedName) return;
    const normalizedAmount = Number(fridgeEditDraft.amount.replace(',', '.'));
    const hasAmount = Number.isFinite(normalizedAmount) && normalizedAmount > 0;
    onUpdateFridgeItem({
      id: fridgeEditDraft.id,
      name: trimmedName,
      quantity: hasAmount ? `${normalizedAmount} ${fridgeEditDraft.unit}` : fridgeEditDraft.unit === 'pcs' ? '1 pcs' : `1 ${fridgeEditDraft.unit}`,
      amount: hasAmount ? normalizedAmount : undefined,
      unit: fridgeEditDraft.unit,
      category: fridgeEditDraft.category,
      expiresAt: fridgeEditDraft.expiresAt || undefined,
      note: fridgeEditDraft.note.trim() || undefined,
      opened: fridgeEditDraft.opened,
      status: fridgeEditDraft.status,
    });
    closeFridgeEditor();
  }

  function submitPurchaseRequest() {
    const itemName = requestItemName.trim();
    const quantity = requestQuantity.trim();
    const comment = requestComment.trim();
    if (!itemName) return;
    onCreatePurchaseRequest({
      itemName,
      quantity: quantity || '1 pcs',
      comment,
    });
    setRequestItemName('');
    setRequestQuantity('1 pcs');
    setRequestComment('');
    setRequestInputFocused(false);
  }

  async function pickFridgePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to scan fridge products.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]?.uri || !result.assets?.[0]?.base64) return;

      const asset = result.assets[0];
      const assetBase64 = asset.base64;
      if (!assetBase64) return;
      setFridgePhotoUri(asset.uri);
      setFridgePhotoLoading(true);
      const detected = await analyzeFridgePhotoWithFallback(assetBase64, asset.mimeType ?? 'image/jpeg', asset.uri);
      setRecognizedFridgeItems(detected.items);
      setFridgeScanSource(detected.source);
      setFridgeScanError(detected.error);
      setFridgePhotoScanOpen(true);
    } catch {
      Alert.alert('Upload failed', 'Could not open the photo picker right now.');
    } finally {
      setFridgePhotoLoading(false);
    }
  }

  async function openFridgeCamera() {
    try {
      if (!cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          Alert.alert('Permission needed', 'Allow camera access to scan products in the fridge.');
          return;
        }
      }
      setCameraOpen(true);
    } catch {
      Alert.alert('Camera unavailable', 'Could not open the camera right now.');
    }
  }

  async function captureFridgePhoto() {
    try {
      if (!cameraRef.current) return;
      setFridgePhotoLoading(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, base64: true });
      if (!photo?.uri || !photo?.base64) return;
      setCameraOpen(false);
      setFridgePhotoUri(photo.uri);
      const detected = await analyzeFridgePhotoWithFallback(photo.base64, 'image/jpeg', photo.uri);
      setRecognizedFridgeItems(detected.items);
      setFridgeScanSource(detected.source);
      setFridgeScanError(detected.error);
      setFridgePhotoScanOpen(true);
    } catch {
      Alert.alert('Capture failed', 'Could not take a photo right now.');
    } finally {
      setFridgePhotoLoading(false);
    }
  }

  function saveRecognizedFridgeItems() {
    const cleaned = recognizedFridgeItems.filter((item) => item.name.trim().length > 0);
    if (cleaned.length === 0) return;
    onImportFridgeItems(cleaned);
    setFridgePhotoScanOpen(false);
    setFridgePhotoUri(null);
    setRecognizedFridgeItems([]);
    setFridgeScanSource(null);
    setFridgeScanError(null);
  }

  return (
    <>
      {currentRole === 'mother' && visiblePurchaseRequests.length > 0 ? (
        <SectionCard title="Requested By Staff">
          <View style={styles.requestListWrap}>
            {visiblePurchaseRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestTextWrap}>
                  <Text style={styles.requestTitle}>{request.itemName}</Text>
                  <Text style={styles.requestMeta}>
                    {request.quantity} · {request.requestedBy}
                  </Text>
                  {request.comment ? <Text style={styles.requestComment}>{request.comment}</Text> : null}
                </View>
                <View style={styles.requestActions}>
                  <Pressable style={styles.requestPrimaryBtn} onPress={() => onAddPurchaseRequestToList(request.id)}>
                    <Text style={styles.requestPrimaryBtnText}>Add to list</Text>
                  </Pressable>
                  <Pressable style={styles.requestGhostBtn} onPress={() => onDismissPurchaseRequest(request.id)}>
                    <Text style={styles.requestGhostBtnText}>Hide</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {currentRole === 'staff' ? (
        <SectionCard title="Need To Buy">
          <Text style={styles.requestHint}>Send low-stock items to {shareTargets[0]?.label === 'Mom' ? 'Mom/Dad' : 'parents'} while cleaning.</Text>
          <View style={styles.requestComposer}>
            <TextInput
              value={requestItemName}
              onChangeText={setRequestItemName}
              onFocus={() => setRequestInputFocused(true)}
              placeholder="What is running low?"
              placeholderTextColor={colors.subtext}
              style={styles.input}
            />
            {requestInputFocused && purchaseRequestSuggestions.length ? (
              <View style={styles.requestSuggestionList}>
                {purchaseRequestSuggestions.map((suggestion, index) => (
                  <Pressable
                    key={`request-suggestion-${suggestion}`}
                    style={[styles.requestSuggestionItem, index === purchaseRequestSuggestions.length - 1 && styles.requestSuggestionItemLast]}
                    onPress={() => {
                      setRequestItemName(suggestion);
                      setRequestInputFocused(false);
                    }}
                  >
                    <Text style={styles.requestSuggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.requestRow}>
              <TextInput
                value={requestQuantity}
                onChangeText={setRequestQuantity}
                placeholder="1 pcs"
                placeholderTextColor={colors.subtext}
                style={[styles.input, styles.requestQtyInput]}
              />
              <Pressable style={[styles.button, styles.requestSendBtn]} onPress={submitPurchaseRequest}>
                <Text style={styles.buttonText}>Send</Text>
              </Pressable>
            </View>
            <TextInput
              value={requestComment}
              onChangeText={setRequestComment}
              placeholder="Comment for parents"
              placeholderTextColor={colors.subtext}
              style={[styles.input, styles.requestCommentInput]}
            />
          </View>
        </SectionCard>
      ) : null}

      <View style={[styles.shoppingListSection, isMobile && styles.shoppingListSectionMobile]}>
        <View style={styles.shoppingTopTabs}>
          <Pressable
            style={[styles.shoppingTopTab, shoppingView === 'list' && styles.shoppingTopTabActive]}
            onPress={() => setShoppingView('list')}
          >
            <Text style={[styles.shoppingTopTabText, shoppingView === 'list' && styles.shoppingTopTabTextActive]}>Shopping List</Text>
          </Pressable>
          <Pressable
            style={[styles.shoppingTopTab, shoppingView === 'fridge' && styles.shoppingTopTabActive]}
            onPress={() => setShoppingView('fridge')}
          >
            <Text style={[styles.shoppingTopTabText, shoppingView === 'fridge' && styles.shoppingTopTabTextActive]}>Inventory</Text>
          </Pressable>
        </View>

        {shoppingView === 'list' ? (
        <>
        {moreOpen || shareOpen ? (
          <Pressable
            style={styles.shoppingPanelsBackdrop}
            onPress={() => {
              closeShareMenu();
              setMoreOpen(false);
            }}
          />
        ) : null}
        <View style={[styles.shoppingListHeader, isMobile && styles.shoppingListHeaderMobile]}>
          <View style={styles.shoppingListHeaderCopy}>
            <Text style={styles.shoppingListTitle}>Shopping List</Text>
            <Text style={styles.shoppingListSubtitle}>
              {needsBasketOnboarding
                ? 'Create your usual grocery basket'
                : canStartFromBasket
                  ? `${baseList?.items.length ?? 0} items ready in your usual basket`
                  : filter === 'active'
                    ? `${remainingShoppingItemsCount} to buy`
                    : `${purchasedShoppingItemsCount} purchased`}
            </Text>
          </View>
          <Pressable
            style={styles.shoppingPrimaryBtn}
            onPress={needsBasketOnboarding ? () => openAddComposer('basket') : canStartFromBasket ? onStartFromBaseList : () => openAddComposer('list')}
          >
            <Text style={styles.shoppingPrimaryBtnText}>
              {needsBasketOnboarding ? 'Create basket' : canStartFromBasket ? 'Use basket' : 'Add'}
            </Text>
          </Pressable>
        </View>

        {needsBasketOnboarding ? (
          <View style={styles.basketOnboardingCard}>
            <Text style={styles.basketOnboardingTitle}>Start with your usual products</Text>
            <Text style={styles.basketOnboardingText}>
              Add the groceries you buy most often. We will keep this basket handy and use it later for quick shopping starts and smart restock suggestions.
            </Text>
            <View style={styles.basketOnboardingActions}>
              <Pressable style={styles.shoppingPrimaryBtn} onPress={() => openAddComposer('basket')}>
                <Text style={styles.shoppingPrimaryBtnText}>Build my basket</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {!needsBasketOnboarding && !canStartFromBasket ? (
        <View style={styles.shoppingControlsBlock}>
          <View style={styles.row}>
            <Tab active={filter === 'active'} label="To buy" onPress={() => setFilter('active')} />
            <Tab active={filter === 'purchased'} label="Purchased" onPress={() => setFilter('purchased')} />
          </View>
        </View>
        ) : null}

        {!needsBasketOnboarding && !canStartFromBasket ? (
        <View style={styles.shoppingBoard}>
          {visibleItems.length === 0 ? (
            <View style={styles.shoppingEmptyState}>
              <Text style={styles.shoppingEmptyTitle}>Nothing here yet</Text>
              <Text style={styles.shoppingEmptyText}>
                {filter === 'active'
                  ? 'Add your first item to start your shopping list.'
                  : 'Purchased items will appear here after you check them off.'}
              </Text>
            </View>
          ) : (
            visibleItems.map((item) => (
              <View key={item.id} style={[styles.shoppingRow, isMobile && styles.shoppingRowMobile]}>
                <Pressable
                  style={[styles.shoppingCheckbox, isMobile && styles.shoppingCheckboxMobile, item.purchased && styles.shoppingCheckboxActive]}
                  onPress={() => {
                    if (activeList) onTogglePurchased(activeList.id, item.id);
                  }}
                >
                  {item.purchased ? <View style={styles.shoppingCheckboxDot} /> : null}
                </Pressable>
                <Pressable style={[styles.shoppingRowBody, isMobile && styles.shoppingRowBodyMobile]} onPress={() => openEditor({ itemId: item.id })}>
                  <View style={styles.shoppingRowTextWrap}>
                    <Text style={[styles.shoppingRowName, isMobile && styles.shoppingRowNameMobile, item.purchased && styles.shoppingRowNameDone]}>{item.name}</Text>
                    <Text style={[styles.shoppingRowSubtext, isMobile && styles.shoppingRowSubtextMobile, item.purchased && styles.shoppingRowQtyDone]}>
                      {item.category ? getShoppingItemCategoryLabel(item.category) : 'Tap to edit'}
                    </Text>
                  </View>
                  <View style={[styles.shoppingRowMeta, isMobile && styles.shoppingRowMetaMobile]}>
                    <Text style={[styles.shoppingRowQty, isMobile && styles.shoppingRowQtyMobile, item.purchased && styles.shoppingRowQtyDone]}>{item.quantity}</Text>
                  </View>
                </Pressable>
              </View>
            ))
          )}
        </View>
        ) : null}

        {!needsBasketOnboarding ? (
        <View style={styles.moreSection}>
          <Pressable
            style={[styles.moreToggleBtn, moreOpen && styles.moreToggleBtnActive]}
            onPress={() => {
              if (moreOpen) closeShareMenu();
              setMoreOpen((prev) => !prev);
            }}
          >
            <Text style={[styles.moreToggleBtnText, moreOpen && styles.moreToggleBtnTextActive]}>More</Text>
            <Text style={[styles.moreToggleBtnChevron, moreOpen && styles.moreToggleBtnTextActive]}>{moreOpen ? '−' : '+'}</Text>
          </Pressable>

          {moreOpen ? (
            <View style={styles.morePanel}>
              <View style={styles.moreActionGrid}>
                {activeList ? (
                  <Pressable style={styles.moreActionBtn} onPress={() => openEditor()}>
                    <Text style={styles.moreActionBtnText}>Edit list</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.moreActionBtn}
                  onPress={() => {
                    closeShareMenu();
                    setBaseListOpen(true);
                  }}
                >
                  <Text style={styles.moreActionBtnText}>Usual basket</Text>
                </Pressable>
              </View>

              <View style={styles.moreInlineActions}>
                <Pressable
                  style={styles.moreSecondaryBtn}
                  onPress={toggleShareMenu}
                >
                  <Text style={styles.moreSecondaryBtnText}>Share</Text>
                </Pressable>
                {historyLists[0] ? (
                  <Pressable style={styles.moreSecondaryBtn} onPress={() => onUsePastList(historyLists[0].id)}>
                    <Text style={styles.moreSecondaryBtnText}>Use last list</Text>
                  </Pressable>
                ) : null}
              </View>

              {shareOpen ? (
                <View style={styles.shareMenu}>
                  <Pressable style={styles.shareMenuItem} onPress={() => shareListToApps('whatsapp')}>
                    <Text style={styles.shareMenuItemText}>WhatsApp</Text>
                  </Pressable>
                  <Pressable style={styles.shareMenuItem} onPress={() => shareListToApps('apps')}>
                    <Text style={styles.shareMenuItemText}>Other apps</Text>
                  </Pressable>
                  <View style={styles.shareMenuDivider} />
                  {shareTargets
                    .filter((target) => target.key !== activeRecipientKey)
                    .map((target) => (
                      <Pressable
                        key={target.key}
                        style={styles.shareMenuItem}
                        onPress={() => {
                          if (!activeList) return;
                          onShareListToProfile(activeList.id, target.key);
                          closeShareMenu();
                        }}
                      >
                        <Text style={styles.shareMenuItemText}>Send to {target.label}</Text>
                      </Pressable>
                    ))}
                </View>
              ) : null}

              {sharedInbox.length > 0 ? (
                <View style={styles.moreSubsection}>
                  <Text style={styles.moreSubsectionTitle}>Shared with you</Text>
                  {sharedInbox.slice(0, 2).map((share) => (
                    <View key={share.id} style={styles.sharedInboxCard}>
                      <View style={styles.sharedInboxTextWrap}>
                        <Text style={styles.sharedInboxCardTitle}>{share.title}</Text>
                        <Text style={styles.sharedInboxMeta}>from {share.senderLabel}</Text>
                      </View>
                      <View style={styles.sharedInboxActions}>
                        <Pressable style={styles.sharedInboxBtn} onPress={() => onImportSharedList(share.id)}>
                          <Text style={styles.sharedInboxBtnText}>Add</Text>
                        </Pressable>
                        <Pressable style={[styles.sharedInboxBtn, styles.sharedInboxDismissBtn]} onPress={() => onDismissSharedList(share.id)}>
                          <Text style={styles.sharedInboxDismissText}>Hide</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {historyLists.length > 0 ? (
                <View style={styles.moreSubsection}>
                  <Text style={styles.moreSubsectionTitle}>Past lists</Text>
                  <View style={styles.shoppingHistoryList}>
                    {historyLists.slice(0, 2).map((list) => (
                      <View key={list.id} style={styles.shoppingHistoryCard}>
                        <View style={styles.shoppingHistoryCopy}>
                          <Text style={styles.shoppingHistoryCardTitle}>{list.title}</Text>
                          <Text style={styles.shoppingHistoryMeta}>
                            {list.items.length} item{list.items.length === 1 ? '' : 's'}
                          </Text>
                        </View>
                        <Pressable style={styles.shoppingHistoryBtn} onPress={() => onUsePastList(list.id)}>
                          <Text style={styles.shoppingHistoryBtnText}>Use again</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        ) : null}
        </>
        ) : (
        <SectionCard title="Inventory">
          <View style={[styles.fridgeHeaderRow, isMobile && styles.fridgeHeaderRowMobile]}>
            <Text style={styles.fridgeHint}>
              Track what you have at home, what is running low, and what should be used soon before it expires.
            </Text>
            <View style={[styles.fridgeHeaderActions, isMobile && styles.fridgeHeaderActionsMobile]}>
              <Pressable style={styles.fridgeUploadBtn} onPress={openFridgeCamera}>
                <Text style={styles.fridgeUploadBtnText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.fridgeUploadBtn} onPress={pickFridgePhoto}>
                <Text style={styles.fridgeUploadBtnText}>{fridgePhotoLoading ? 'Scanning...' : 'Photo'}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.fridgePhotoTip}>Tip: capture shelves or products front-on, with visible labels, and avoid cropping.</Text>
          <View style={[styles.fridgeSummaryRow, isMobile && styles.fridgeSummaryRowMobile]}>
            <Pressable
              style={[styles.fridgeSummaryChip, inventoryFilter === 'all' && styles.fridgeSummaryChipActive]}
              onPress={() => setInventoryFilter('all')}
            >
              <Text style={styles.fridgeSummaryValue}>{fridgeInStockCount}</Text>
              <Text style={[styles.fridgeSummaryLabel, inventoryFilter === 'all' && styles.fridgeSummaryLabelActive]}>In stock</Text>
            </Pressable>
            <Pressable
              style={[styles.fridgeSummaryChip, inventoryFilter === 'low' && styles.fridgeSummaryChipActive]}
              onPress={() => setInventoryFilter('low')}
            >
              <Text style={styles.fridgeSummaryValue}>{fridgeLowCount}</Text>
              <Text style={[styles.fridgeSummaryLabel, inventoryFilter === 'low' && styles.fridgeSummaryLabelActive]}>Low</Text>
            </Pressable>
            <Pressable
              style={[styles.fridgeSummaryChip, inventoryFilter === 'use_soon' && styles.fridgeSummaryChipActive]}
              onPress={() => setInventoryFilter('use_soon')}
            >
              <Text style={styles.fridgeSummaryValue}>{fridgeUseSoonCount}</Text>
              <Text style={[styles.fridgeSummaryLabel, inventoryFilter === 'use_soon' && styles.fridgeSummaryLabelActive]}>Use soon</Text>
            </Pressable>
          </View>
          <View style={styles.fridgeList}>
            {visibleFridgeItems.length === 0 ? (
              <View style={styles.fridgeEmptyCard}>
                <Text style={styles.fridgeEmptyTitle}>Nothing here yet</Text>
                <Text style={styles.fridgeEmptyText}>Add products or scan a shelf photo to start tracking what you have.</Text>
              </View>
            ) : null}
            {visibleFridgeSections.map((section) => (
              <View key={section.title} style={styles.fridgeSection}>
                <Text style={styles.fridgeSectionTitle}>{section.title}</Text>
                <View style={styles.fridgeSectionList}>
                  {section.items.map((item) => {
                    const statusMeta = getFridgeStatusMeta(item.status);
                    const secondaryMeta = [formatFridgeQuantity(item)].filter(Boolean).join(' · ');
                    const timingMeta = getFridgeTimingMeta(item);
                    const useSoon = isFridgeItemUseSoon(item);
                    const countableAmount = getCountableFridgeAmount(item);
                    return (
                      <Pressable key={item.id} style={[styles.fridgeCard, isMobile && styles.fridgeCardMobile]} onPress={() => openFridgeEditor(item)}>
                        <View style={[styles.fridgeCardTop, isMobile && styles.fridgeCardTopMobile]}>
                          <View style={styles.fridgeTextWrap}>
                            <View style={styles.fridgeNameRow}>
                              <Text style={[styles.fridgeItemName, isMobile && styles.fridgeItemNameMobile]}>{item.name}</Text>
                              {useSoon ? (
                                <Pressable
                                  style={styles.fridgeUseSoonAlert}
                                  onPress={(event) => {
                                    event.stopPropagation();
                                    openFridgeEditor(item);
                                  }}
                                >
                                  <Text style={styles.fridgeUseSoonAlertText}>!</Text>
                                </Pressable>
                              ) : null}
                            </View>
                            {secondaryMeta ? <Text style={styles.fridgeItemMeta}>{secondaryMeta}</Text> : null}
                            {timingMeta ? <Text style={[styles.fridgeItemMeta, useSoon && styles.fridgeItemMetaUrgent]}>{timingMeta}</Text> : null}
                            {item.note ? <Text style={styles.fridgeItemNote}>{item.note}</Text> : null}
                          </View>
                          <View style={styles.fridgeCardHeaderActions}>
                            <View style={[styles.fridgeStatusBadge, { backgroundColor: statusMeta.bg }]}>
                              <Text style={[styles.fridgeStatusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                            </View>
                            <Pressable
                              style={styles.fridgeMoreBtn}
                              onPress={(event) => {
                                event.stopPropagation();
                                openFridgeEditor(item);
                              }}
                            >
                              <Text style={styles.fridgeMoreBtnText}>...</Text>
                            </Pressable>
                          </View>
                        </View>
                        <View style={[styles.fridgeActionsRow, isMobile && styles.fridgeActionsRowMobile]}>
                          {countableAmount ? (
                            <View style={styles.fridgeCounter}>
                              <Pressable
                                style={styles.fridgeCounterBtn}
                                onPress={(event) => {
                                  event.stopPropagation();
                                  adjustFridgeItemAmount(item, -1);
                                }}
                              >
                                <Text style={styles.fridgeCounterBtnText}>−</Text>
                              </Pressable>
                              <Text style={styles.fridgeCounterValue}>{countableAmount.amount}</Text>
                              <Pressable
                                style={styles.fridgeCounterBtn}
                                onPress={(event) => {
                                  event.stopPropagation();
                                  adjustFridgeItemAmount(item, 1);
                                }}
                              >
                                <Text style={styles.fridgeCounterBtnText}>+</Text>
                              </Pressable>
                            </View>
                          ) : null}
                          <View style={[styles.fridgeStatusSwitch, isMobile && styles.fridgeStatusSwitchMobile]}>
                            {countableAmount ? null : item.status === 'low' ? (
                              <Pressable
                                style={styles.fridgeQuickActionBtn}
                                onPress={(event) => {
                                  event.stopPropagation();
                                  onUpdateFridgeItemStatus(item.id, 'full');
                                }}
                              >
                                <Text style={styles.fridgeQuickActionBtnText}>Back in stock</Text>
                              </Pressable>
                            ) : (
                              <Pressable
                                style={styles.fridgeQuickActionBtn}
                                onPress={(event) => {
                                  event.stopPropagation();
                                  onUpdateFridgeItemStatus(item.id, 'low');
                                }}
                              >
                                <Text style={styles.fridgeQuickActionBtnText}>Running low</Text>
                              </Pressable>
                            )}
                            <Pressable
                              style={[styles.fridgeQuickActionBtn, styles.fridgeQuickActionBtnDanger]}
                              onPress={(event) => {
                                event.stopPropagation();
                                onUpdateFridgeItemStatus(item.id, 'out');
                              }}
                            >
                              <Text style={[styles.fridgeQuickActionBtnText, styles.fridgeQuickActionBtnTextDanger]}>Used up</Text>
                            </Pressable>
                          </View>
                          <Pressable
                            style={[styles.fridgePrimaryBtn, isMobile && styles.fridgePrimaryBtnMobile]}
                            onPress={(event) => {
                              event.stopPropagation();
                              onUseFridgeItem(item.id);
                            }}
                          >
                            <Text style={styles.fridgePrimaryBtnText}>{fridgeActionLabel}</Text>
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </SectionCard>
        )}
      </View>

      <Modal
        visible={cameraOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setCameraOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.cameraModalCard}>
            <Text style={styles.modalTitle}>Scan With Camera</Text>
            <View style={styles.cameraPreviewWrap}>
              <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
            </View>
            <View style={styles.editButtonsRow}>
              <Pressable style={[styles.addInlineBtn, styles.editCancelBtn]} onPress={() => setCameraOpen(false)}>
                <Text style={styles.addInlineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.editSaveBtn]} onPress={captureFridgePhoto}>
                <Text style={styles.buttonText}>{fridgePhotoLoading ? 'Scanning...' : 'Capture'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={fridgePhotoScanOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setFridgePhotoScanOpen(false);
          setFridgePhotoUri(null);
          setRecognizedFridgeItems([]);
          setFridgeScanSource(null);
          setFridgeScanError(null);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setFridgePhotoScanOpen(false);
            setFridgePhotoUri(null);
            setRecognizedFridgeItems([]);
            setFridgeScanSource(null);
            setFridgeScanError(null);
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Scan Inventory Photo</Text>
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {fridgePhotoUri ? <Image source={{ uri: fridgePhotoUri }} style={styles.fridgePhotoPreview} resizeMode="cover" /> : null}
              <Text style={styles.fridgeScanHint}>Review the detected products before saving them to Inventory.</Text>
              {fridgeScanSource ? (
                <View style={[styles.fridgeScanStatusBadge, fridgeScanSource === 'ai' ? styles.fridgeScanStatusAi : styles.fridgeScanStatusFallback]}>
                  <Text style={[styles.fridgeScanStatusText, fridgeScanSource === 'ai' ? styles.fridgeScanStatusTextAi : styles.fridgeScanStatusTextFallback]}>
                    {fridgeScanSource === 'ai' ? 'AI detected products' : 'Demo fallback used'}
                  </Text>
                </View>
              ) : null}
              {fridgeScanError ? <Text style={styles.fridgeScanErrorText}>{fridgeScanError}</Text> : null}
              <View style={styles.fridgeDetectedList}>
                {recognizedFridgeItems.map((item, index) => {
                  const statusMeta = getFridgeStatusMeta(item.status);
                  return (
                    <View key={`${item.name}-${index}`} style={styles.fridgeDetectedCard}>
                      <TextInput
                        value={item.name}
                        onChangeText={(text) =>
                          setRecognizedFridgeItems((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, name: text } : entry)))
                        }
                        placeholder="Product"
                        placeholderTextColor={colors.subtext}
                        style={[styles.input, styles.fridgeDetectedNameInput]}
                      />
                      <TextInput
                        value={item.quantity}
                        onChangeText={(text) =>
                          setRecognizedFridgeItems((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, quantity: text } : entry)))
                        }
                        placeholder="Quantity"
                        placeholderTextColor={colors.subtext}
                        style={[styles.input, styles.fridgeDetectedQtyInput]}
                      />
                      <View style={styles.fridgeDetectedStatuses}>
                        {(['full', 'low', 'out'] as FridgeItemStatus[]).map((status) => {
                          const meta = getFridgeStatusMeta(status);
                          const active = item.status === status;
                          return (
                            <Pressable
                              key={`${item.name}-${status}`}
                              style={[styles.fridgeStatusOption, active && { backgroundColor: meta.bg, borderColor: meta.color }]}
                              onPress={() =>
                                setRecognizedFridgeItems((prev) =>
                                  prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, status } : entry)),
                                )
                              }
                            >
                              <Text style={[styles.fridgeStatusOptionText, active && { color: meta.color }]}>{meta.shortLabel}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Pressable
                        style={styles.deleteRowBtn}
                        onPress={() => setRecognizedFridgeItems((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}
                      >
                        <Text style={styles.deleteRowBtnText}>X</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.editButtonsRow}>
              <Pressable
                style={[styles.addInlineBtn, styles.editCancelBtn]}
                onPress={() => {
                  setFridgePhotoScanOpen(false);
                  setFridgePhotoUri(null);
                  setRecognizedFridgeItems([]);
                }}
              >
                <Text style={styles.addInlineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.editSaveBtn]} onPress={saveRecognizedFridgeItems}>
                <Text style={styles.buttonText}>Save to Fridge</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={fridgeEditOpen}
        animationType="fade"
        transparent
        onRequestClose={closeFridgeEditor}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeFridgeEditor}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Edit Fridge Item</Text>
            {fridgeEditDraft ? (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <TextInput
                  value={fridgeEditDraft.name}
                  onChangeText={(text) => setFridgeEditDraft((prev) => (prev ? { ...prev, name: text } : prev))}
                  placeholder="Product name"
                  placeholderTextColor={colors.subtext}
                  style={styles.input}
                />
                <View style={styles.fridgeEditAmountRow}>
                  <TextInput
                    value={fridgeEditDraft.amount}
                    onChangeText={(text) => setFridgeEditDraft((prev) => (prev ? { ...prev, amount: text.replace(/[^0-9.,]/g, '') } : prev))}
                    placeholder="Amount"
                    placeholderTextColor={colors.subtext}
                    style={[styles.input, styles.fridgeEditAmountInput]}
                  />
                  <View style={styles.fridgeEditChipWrap}>
                    {FRIDGE_UNIT_OPTIONS.map((unit) => (
                      <Pressable
                        key={`fridge-unit-${unit}`}
                        style={[styles.fridgeEditChip, fridgeEditDraft.unit === unit && styles.fridgeEditChipActive]}
                        onPress={() => setFridgeEditDraft((prev) => (prev ? { ...prev, unit } : prev))}
                      >
                        <Text style={[styles.fridgeEditChipText, fridgeEditDraft.unit === unit && styles.fridgeEditChipTextActive]}>{unit}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Text style={styles.fridgeEditLabel}>Category</Text>
                <View style={styles.fridgeEditChipWrap}>
                  {FRIDGE_CATEGORY_OPTIONS.map((category) => (
                    <Pressable
                      key={`fridge-category-${category}`}
                      style={[styles.fridgeEditChip, fridgeEditDraft.category === category && styles.fridgeEditChipActive]}
                      onPress={() => setFridgeEditDraft((prev) => (prev ? { ...prev, category } : prev))}
                    >
                      <Text style={[styles.fridgeEditChipText, fridgeEditDraft.category === category && styles.fridgeEditChipTextActive]}>{category}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.fridgeEditLabel}>Use by</Text>
                <TextInput
                  value={fridgeEditDraft.expiresAt}
                  onChangeText={(text) => setFridgeEditDraft((prev) => (prev ? { ...prev, expiresAt: text } : prev))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.subtext}
                  style={styles.input}
                />
                <Text style={styles.fridgeEditLabel}>Note</Text>
                <TextInput
                  value={fridgeEditDraft.note}
                  onChangeText={(text) => setFridgeEditDraft((prev) => (prev ? { ...prev, note: text } : prev))}
                  placeholder="Optional note"
                  placeholderTextColor={colors.subtext}
                  style={[styles.input, styles.requestCommentInput]}
                  multiline
                />
                <Pressable
                  style={[styles.fridgeOpenedToggle, fridgeEditDraft.opened && styles.fridgeOpenedToggleActive]}
                  onPress={() => setFridgeEditDraft((prev) => (prev ? { ...prev, opened: !prev.opened } : prev))}
                >
                  <Text style={[styles.fridgeOpenedToggleText, fridgeEditDraft.opened && styles.fridgeOpenedToggleTextActive]}>
                    {fridgeEditDraft.opened ? 'Opened product' : 'Mark as opened'}
                  </Text>
                </Pressable>
                {fridgeEditRecipeIdeas.length > 0 ? (
                  <View style={styles.fridgeRecipeIdeasSection}>
                    <Text style={styles.fridgeEditLabel}>Recipe ideas</Text>
                    <View style={styles.cookFromFridgeList}>
                      {fridgeEditRecipeIdeas.map((item) => (
                        <View key={`fridge-edit-${item.recipe.id}`} style={styles.cookRecipeCard}>
                          <View style={styles.cookRecipeTop}>
                            <View style={styles.cookRecipeTextWrap}>
                              <Text style={styles.cookRecipeTitle}>{item.recipe.title}</Text>
                              <Text style={styles.cookRecipeMeta}>
                                {labelRecipeMealType(item.recipe.mealType)}
                                {item.recipe.cookTimeMinutes ? ` · ${item.recipe.cookTimeMinutes} min` : ''}
                              </Text>
                            </View>
                            <View style={[styles.cookRecipeStatusBadge, item.missingCount === 0 ? styles.cookRecipeStatusReady : styles.cookRecipeStatusMissing]}>
                              <Text style={[styles.cookRecipeStatusText, item.missingCount === 0 ? styles.cookRecipeStatusTextReady : styles.cookRecipeStatusTextMissing]}>
                                {item.missingCount === 0 ? 'Can cook now' : `Missing ${item.missingCount}`}
                              </Text>
                            </View>
                          </View>
                          {item.missingIngredients.length > 0 ? (
                            <Text style={styles.cookRecipeMissingText}>Need: {item.missingIngredients.slice(0, 3).join(', ')}</Text>
                          ) : (
                            <Text style={styles.cookRecipeMatchText}>You already have what you need for this recipe.</Text>
                          )}
                          <View style={styles.cookRecipeActionsRow}>
                            {item.missingIngredients.length > 0 ? (
                              <Pressable
                                style={styles.cookRecipeActionBtn}
                                onPress={() =>
                                  onCreateList(
                                    item.missingIngredients.map((ingredientName) => ({
                                      name: ingredientName,
                                      quantity: '1 pcs',
                                    })),
                                    activeList?.id ?? null,
                                  )
                                }
                              >
                                <Text style={styles.cookRecipeActionBtnText}>Add missing to shopping</Text>
                              </Pressable>
                            ) : (
                              <View style={[styles.cookRecipeActionBtn, styles.cookRecipeActionBtnDisabled]}>
                                <Text style={[styles.cookRecipeActionBtnText, styles.cookRecipeActionBtnTextDisabled]}>Ready to cook</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
            <View style={styles.editButtonsRow}>
              <Pressable style={[styles.addInlineBtn, styles.editCancelBtn]} onPress={closeFridgeEditor}>
                <Text style={styles.addInlineBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.editSaveBtn]} onPress={saveFridgeEditor}>
                <Text style={styles.buttonText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={baseListOpen}
        animationType="fade"
        transparent
        onRequestClose={closeBaseListPanel}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeBaseListPanel}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Usual basket</Text>
            {baseList ? (
              <>
                <Text style={styles.baseListMeta}>
                  {baseList.items.length} item{baseList.items.length === 1 ? '' : 's'} saved
                </Text>
                <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                  <View style={styles.baseListActionRow}>
                    <Pressable
                      style={[styles.button, styles.baseListPrimaryAction]}
                      onPress={() => {
                        closeBaseListPanel();
                        onStartFromBaseList();
                      }}
                    >
                      <Text style={styles.buttonText}>Use list</Text>
                    </Pressable>
                    <Pressable
                      style={styles.addInlineBtn}
                      onPress={() => {
                        closeBaseListPanel();
                        openEditor({ listId: baseList.id });
                      }}
                    >
                      <Text style={styles.addInlineBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={styles.addInlineBtn}
                      onPress={() => {
                        closeBaseListPanel();
                        openAddComposer('basket');
                      }}
                    >
                      <Text style={styles.addInlineBtnText}>Add items</Text>
                    </Pressable>
                  </View>

                  {activeList ? (
                    <Pressable
                      style={styles.baseListLinkBtn}
                      onPress={() => {
                        onSaveAsBaseList(activeList.id);
                        closeBaseListPanel();
                      }}
                    >
                      <Text style={styles.baseListLinkBtnText}>Save current list as usual basket</Text>
                    </Pressable>
                  ) : null}

                  <View style={styles.baseListItemsWrap}>
                    {baseList.items.map((item) => (
                      <View key={item.id} style={styles.baseListItemCard}>
                        <View style={styles.baseListItemCopy}>
                          <Text style={styles.baseListItemName}>{item.name}</Text>
                          <Text style={styles.baseListItemMeta}>
                            {item.quantity}
                            {item.category ? `  •  ${getShoppingItemCategoryLabel(item.category)}` : ''}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.baseListItemUseBtn}
                          onPress={() => useSingleBaseListItem(item)}
                        >
                          <Text style={styles.baseListItemUseBtnText}>Use</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.editButtonsRow}>
                  <Pressable
                    style={[styles.addInlineBtn, styles.deleteListBtn]}
                    onPress={() => {
                      onDeleteList(baseList.id);
                      closeBaseListPanel();
                    }}
                  >
                    <Text style={styles.deleteListBtnText}>Delete basket</Text>
                  </Pressable>
                  <Pressable style={[styles.addInlineBtn, styles.editCancelBtn]} onPress={closeBaseListPanel}>
                    <Text style={styles.addInlineBtnText}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.baseListEmptyText}>
                  Save your usual products here once, then reopen this basket any time to edit it, add more items, or use it for shopping.
                </Text>
                <View style={styles.editButtonsRow}>
                  <Pressable
                    style={[styles.button, styles.baseListPrimaryAction]}
                    onPress={() => {
                      closeBaseListPanel();
                      openAddComposer('basket');
                    }}
                  >
                    <Text style={styles.buttonText}>Create basket</Text>
                  </Pressable>
                  {activeList ? (
                    <Pressable
                      style={styles.addInlineBtn}
                      onPress={() => {
                        onSaveAsBaseList(activeList.id);
                        closeBaseListPanel();
                      }}
                    >
                      <Text style={styles.addInlineBtnText}>Save current list</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={[styles.addInlineBtn, styles.editCancelBtn]} onPress={closeBaseListPanel}>
                    <Text style={styles.addInlineBtnText}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={editOpen}
        animationType="fade"
        transparent
        onRequestClose={closeEditModal}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={closeEditModal}
        >
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={[styles.modalHeaderRow, isMobile && styles.modalHeaderRowMobile]}>
              <Text style={styles.modalTitle}>{editTargetListTitle === 'Usual basket' ? 'Edit Usual Basket' : 'Edit Shopping List'}</Text>
              <View style={styles.modalHeaderActions}>
                <Pressable style={styles.modalPlusBtn} onPress={addEditRow}>
                  <Text style={styles.modalPlusBtnText}>+</Text>
                </Pressable>
                {editTargetListId ? (
                  <Pressable
                    style={styles.modalInlineDeleteBtn}
                    onPress={() => {
                      if (!editTargetListId) return;
                      onDeleteList(editTargetListId);
                      closeEditModal();
                    }}
                  >
                    <Text style={styles.modalInlineDeleteBtnText}>{editTargetListTitle === 'Usual basket' ? 'Delete basket' : 'Delete list'}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            {!isMobile ? (
              <View style={styles.editButtonsRow}>
                <Pressable style={[styles.button, styles.editSaveBtn]} onPress={saveEditedList}>
                  <Text style={styles.buttonText}>Save</Text>
                </Pressable>
                <Pressable style={[styles.addInlineBtn, styles.editCancelBtn]} onPress={closeEditModal}>
                  <Text style={styles.addInlineBtnText}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}
            <ScrollView style={[styles.modalBody, isMobile && styles.modalBodyWithFooter]} contentContainerStyle={styles.modalBodyContent}>
              <View style={styles.editRowsWrap}>
                {editRows.map((row, index) => {
                  const suggestions = focusedEditRowKey === row.key ? editSuggestionsByRow[row.key] || [] : [];
                  return (
                  <View key={row.key} style={styles.editRowCard}>
                    <View style={[styles.editRow, isMobile && styles.editRowMobile]}>
                      <TextInput
                        ref={(node) => {
                          editInputRefs.current[row.key] = node;
                        }}
                        value={row.name}
                        onChangeText={(text) => {
                          setEditRows((prev) =>
                            prev.map((item) =>
                              item.key === row.key
                                ? {
                                    ...item,
                                    name: text,
                                    category: text.trim().length > 0 ? inferShoppingItemCategory(text) : item.category,
                                  }
                                : item,
                            ),
                          );
                          ensureFreshEditTopRow(row.key, text, index);
                        }}
                        onFocus={() => setFocusedEditRowKey(row.key)}
                        onSubmitEditing={() => {
                          promoteEditTopRowOnSubmit(row.key, row.name, index);
                        }}
                        placeholder="Item name"
                        placeholderTextColor={colors.subtext}
                        style={[styles.input, styles.editNameInput, isMobile && styles.editNameInputMobile]}
                      />
                      <TextInput
                        value={row.amount}
                        onChangeText={(text) =>
                          setEditRows((prev) =>
                            prev.map((item) =>
                              item.key === row.key
                                ? {
                                    ...item,
                                    amount: text,
                                    quantity: formatShoppingQuantity(text, item.unit),
                                  }
                                : item,
                            ),
                          )
                        }
                        placeholder="1"
                        placeholderTextColor={colors.subtext}
                        style={[styles.input, styles.editQtyInput, isMobile && styles.editQtyInputMobile]}
                      />
                      <View style={[styles.editUnitRow, isMobile && styles.editUnitRowMobile]}>
                        {UNIT_OPTIONS.map((unit) => (
                          <Pressable
                            key={`${row.key}-${unit}`}
                            style={[styles.editUnitChip, row.unit === unit && styles.editUnitChipActive]}
                            onPress={() =>
                              setEditRows((prev) =>
                                prev.map((item) =>
                                  item.key === row.key
                                    ? {
                                        ...item,
                                        unit,
                                        quantity: formatShoppingQuantity(item.amount, unit),
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <Text style={[styles.editUnitChipText, row.unit === unit && styles.editUnitChipTextActive]}>{unit}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <Pressable
                        style={styles.deleteRowBtn}
                        onPress={() => {
                          setEditRows((prev) => prev.filter((item) => item.key !== row.key));
                          setFocusedEditRowKey((prev) => (prev === row.key ? null : prev));
                        }}
                      >
                        <Text style={styles.deleteRowBtnText}>X</Text>
                      </Pressable>
                    </View>
                    {suggestions.length ? (
                      <View style={styles.editSuggestionList}>
                        {suggestions.map((suggestion, suggestionIndex) => (
                          <Pressable
                            key={`${row.key}-${suggestion}`}
                            style={[styles.suggestionItem, suggestionIndex === suggestions.length - 1 && styles.suggestionItemLast]}
                            onPress={() => {
                              setEditRows((prev) =>
                                prev.map((item) =>
                                  item.key === row.key
                                    ? {
                                        ...item,
                                        name: suggestion,
                                        category: inferShoppingItemCategory(suggestion),
                                      }
                                    : item,
                                ),
                              );
                              setFocusedEditRowKey(null);
                            }}
                          >
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    <View style={styles.editCategoryRow}>
                      {SHOPPING_CATEGORY_OPTIONS.filter((option) => option.key !== 'all').map((option) => (
                        <Pressable
                          key={`${row.key}-${option.key}`}
                          style={[styles.editCategoryChip, row.category === option.key && styles.editCategoryChipActive]}
                          onPress={() =>
                            setEditRows((prev) =>
                              prev.map((item) => (item.key === row.key ? { ...item, category: option.key as ShoppingItemCategory } : item)),
                            )
                          }
                        >
                          <Text style={[styles.editCategoryChipText, row.category === option.key && styles.editCategoryChipTextActive]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )})}
              </View>
            </ScrollView>
            {isMobile ? (
              <View style={styles.mobileModalFooter}>
                <View style={styles.mobileModalFooterRow}>
                  <Pressable style={[styles.addInlineBtn, styles.editCancelBtn, styles.mobileFooterTertiaryBtn]} onPress={closeEditModal}>
                    <Text style={styles.addInlineBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.button, styles.editSaveBtn, styles.mobileFooterPrimaryBtn]} onPress={saveEditedList}>
                    <Text style={styles.buttonText}>Save</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={addComposerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setAddComposerOpen(false);
          setComposerMode('list');
          setPendingCreateBehavior('default');
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setAddComposerOpen(false);
            setComposerMode('list');
            setPendingCreateBehavior('default');
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            {composerMode === 'basket' ? (
              <View style={[styles.modalHeaderRow, isMobile && styles.modalHeaderRowMobile]}>
                <Text style={styles.modalTitle}>Build Your Usual Basket</Text>
                <View style={styles.modalHeaderActions}>
                  <Pressable
                    style={styles.modalPlusBtn}
                    onPress={() => {
                      closeAllUnitMenus();
                      setDraftRows((prev) => [createDraftRow(prev.length), ...prev]);
                    }}
                  >
                    <Text style={styles.modalPlusBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={styles.modalTitle}>Add shopping items</Text>
            )}
            {!isMobile ? (
              <View style={styles.addComposerActions}>
                {composerMode !== 'basket' ? (
                  <Pressable
                    style={styles.addRowBtn}
                    onPress={() => {
                      closeAllUnitMenus();
                      setDraftRows((prev) => [createDraftRow(prev.length), ...prev]);
                    }}
                  >
                    <Text style={styles.addRowBtnText}>+ Row</Text>
                  </Pressable>
                ) : null}
                <Pressable style={[styles.button, styles.editSaveBtn]} onPress={saveDraftRows}>
                  <Text style={styles.buttonText}>{composerMode === 'basket' ? 'Save basket' : 'Add items'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.addInlineBtn, styles.editCancelBtn]}
                  onPress={() => {
                    setAddComposerOpen(false);
                    setComposerMode('list');
                    setPendingCreateBehavior('default');
                  }}
                >
                  <Text style={styles.addInlineBtnText}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.sheet}>
              {draftRows.map((row, index) => {
                const suggestions = focusedRowId === row.id ? suggestionsByRow[row.id] || [] : [];
                return (
                  <View key={row.id} style={[styles.sheetRowWrap, row.unitOpen && styles.sheetRowWrapActive]}>
                    <View style={[styles.sheetRow, index === draftRows.length - 1 && styles.sheetRowLast, isMobile && styles.sheetRowMobile]}>
                      <TextInput
                        ref={(node) => {
                          draftInputRefs.current[row.id] = node;
                        }}
                        value={row.name}
                        onChangeText={(text) => {
                          updateRow(row.id, (current) => ({ ...current, name: text }));
                          setFocusedRowId(row.id);
                        }}
                        onFocus={() => {
                          setFocusedRowId(row.id);
                        }}
                        onSubmitEditing={() => {
                          promoteTopFilledRow(row.id, row.name, index);
                        }}
                        placeholder={index === 0 ? 'Start typing your shopping list...' : 'Next item'}
                        placeholderTextColor={colors.subtext}
                        style={[styles.sheetInput, isMobile && styles.sheetInputMobile]}
                      />

                      <View style={[styles.counterWrap, isMobile && styles.counterWrapMobile]}>
                        <Pressable
                          style={styles.counterBtn}
                          onPress={() =>
                            updateRow(row.id, (current) => {
                              const step = getDraftAmountStep(current.unit, current.amount);
                              const min = current.unit === 'g' ? 10 : 1;
                              return { ...current, amount: Math.max(min, current.amount - step) };
                            })
                          }
                        >
                          <Text style={styles.counterBtnText}>-</Text>
                        </Pressable>
                        <Text style={styles.counterValue}>{row.amount}</Text>
                        <Pressable
                          style={styles.counterBtn}
                          onPress={() =>
                            updateRow(row.id, (current) => {
                              const step = getDraftAmountStep(current.unit, current.amount);
                              return { ...current, amount: current.amount + step };
                            })
                          }
                        >
                          <Text style={styles.counterBtnText}>+</Text>
                        </Pressable>
                      </View>

                      <View style={[styles.unitWrap, isMobile && styles.unitWrapMobile]}>
                        <Pressable
                          style={styles.unitBtn}
                          onPress={() =>
                            setDraftRows((prev) =>
                              prev.map((current) =>
                                current.id === row.id
                                  ? { ...current, unitOpen: !current.unitOpen }
                                  : { ...current, unitOpen: false },
                              ),
                            )
                          }
                        >
                          <Text style={styles.unitBtnText}>{row.unit}</Text>
                        </Pressable>
                        {row.unitOpen ? (
                          <View style={styles.unitMenu}>
                            {UNIT_OPTIONS.map((unit) => (
                              <Pressable
                                key={unit}
                                style={[styles.unitMenuItem, row.unit === unit && styles.unitMenuItemActive]}
                                onPress={() => {
                                  updateRow(row.id, (current) => ({
                                    ...current,
                                    unit,
                                    amount: normalizeAmountForUnit(unit, current.amount),
                                    unitOpen: false,
                                  }));
                                }}
                              >
                                <Text style={[styles.unitMenuText, row.unit === unit && styles.unitMenuTextActive]}>{unit}</Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {suggestions.length ? (
                      <View style={styles.suggestionList}>
                        {suggestions.map((suggestion, suggestionIndex) => (
                          <Pressable
                            key={`${row.id}-${suggestion}`}
                            style={[styles.suggestionItem, suggestionIndex === suggestions.length - 1 && styles.suggestionItemLast]}
                            onPress={() => {
                              updateRow(row.id, (current) => ({ ...current, name: suggestion }));
                              setFocusedRowId(null);
                              closeAllUnitMenus();
                            }}
                          >
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
            {isMobile ? (
              <View style={styles.mobileModalFooter}>
                {composerMode !== 'basket' ? (
                  <Pressable
                    style={[styles.addInlineBtn, styles.mobileFooterSecondaryBtn]}
                    onPress={() => {
                      closeAllUnitMenus();
                      setDraftRows((prev) => [createDraftRow(prev.length), ...prev]);
                    }}
                  >
                    <Text style={styles.addInlineBtnText}>+ Row</Text>
                  </Pressable>
                ) : null}
                <View style={styles.mobileModalFooterRow}>
                  <Pressable
                    style={[styles.addInlineBtn, styles.editCancelBtn, styles.mobileFooterTertiaryBtn]}
                    onPress={() => {
                      setAddComposerOpen(false);
                      setComposerMode('list');
                      setPendingCreateBehavior('default');
                    }}
                  >
                    <Text style={styles.addInlineBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.button, styles.editSaveBtn, styles.mobileFooterPrimaryBtn]} onPress={saveDraftRows}>
                    <Text style={styles.buttonText}>{composerMode === 'basket' ? 'Save basket' : 'Add items'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function getFridgeStatusMeta(status: FridgeItemStatus) {
  if (status === 'full') {
    return {
      label: 'Full',
      shortLabel: 'Full',
      color: '#15803d',
      bg: 'rgba(34,197,94,0.14)',
    };
  }
  if (status === 'low') {
    return {
      label: 'Low',
      shortLabel: 'Low',
      color: '#b45309',
      bg: 'rgba(245,158,11,0.16)',
    };
  }
  return {
    label: 'Out',
    shortLabel: 'Out',
    color: '#b91c1c',
    bg: 'rgba(239,68,68,0.16)',
  };
}

function getCookFromFridgeSuggestions(fridgeItems: FridgeItem[], recipes: Recipe[]) {
  const availableItems = fridgeItems.filter((item) => item.status !== 'out').map((item) => item.name.trim().toLowerCase());
  if (availableItems.length === 0) return [];

  return recipes
    .map((recipe) => {
      const availableIngredients: string[] = [];
      const missingIngredients: string[] = [];

      recipe.ingredients.forEach((ingredient) => {
        const ingredientName = ingredient.name.trim().toLowerCase();
        const matched = availableItems.some((itemName) => isIngredientMatched(itemName, ingredientName));
        if (matched) {
          availableIngredients.push(ingredient.name);
        } else {
          missingIngredients.push(ingredient.name);
        }
      });

      return {
        recipe,
        availableIngredients,
        missingIngredients,
        availableCount: availableIngredients.length,
        missingCount: missingIngredients.length,
      };
    })
    .filter((entry) => entry.availableCount > 0 && entry.missingCount <= 3)
    .sort((left, right) => {
      if (left.missingCount !== right.missingCount) return left.missingCount - right.missingCount;
      if (left.availableCount !== right.availableCount) return right.availableCount - left.availableCount;
      return left.recipe.title.localeCompare(right.recipe.title);
    })
    .slice(0, 6);
}

function isIngredientMatched(fridgeItemName: string, ingredientName: string) {
  if (fridgeItemName === ingredientName) return true;
  if (fridgeItemName.includes(ingredientName) || ingredientName.includes(fridgeItemName)) return true;
  const fridgeTokens = fridgeItemName.split(/[\s,/-]+/).filter((token) => token.length >= 4);
  const ingredientTokens = ingredientName.split(/[\s,/-]+/).filter((token) => token.length >= 4);
  return fridgeTokens.some((token) => ingredientTokens.includes(token));
}

function labelRecipeMealType(mealType: Recipe['mealType']) {
  switch (mealType) {
    case 'main_dish':
      return 'Main dish';
    case 'meal_prep':
      return 'Meal prep';
    default:
      return mealType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function formatFridgeQuantity(item: Omit<FridgeItem, 'id'> | FridgeItem) {
  if (typeof item.amount === 'number' && item.unit) {
    const normalized = Number.isInteger(item.amount) ? String(item.amount) : item.amount.toFixed(1).replace(/\.0$/, '');
    return `${normalized} ${item.unit}`;
  }
  return item.quantity;
}

function getCountableFridgeAmount(item: Omit<FridgeItem, 'id'> | FridgeItem): { amount: number; unit: FridgeItemUnit } | null {
  const countableUnits: FridgeItemUnit[] = ['pcs', 'pack', 'bottle', 'jar'];
  if (typeof item.amount === 'number' && item.unit && countableUnits.includes(item.unit)) {
    return { amount: Math.max(0, Math.round(item.amount)), unit: item.unit };
  }
  const match = item.quantity.trim().toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*([a-z]+)/);
  if (!match) return null;
  const amount = Math.round(Number(match[1].replace(',', '.')));
  const rawUnit = match[2];
  const unitMap: Record<string, FridgeItemUnit> = {
    pc: 'pcs',
    pcs: 'pcs',
    piece: 'pcs',
    pieces: 'pcs',
    pack: 'pack',
    packs: 'pack',
    bottle: 'bottle',
    bottles: 'bottle',
    jar: 'jar',
    jars: 'jar',
  };
  const unit = unitMap[rawUnit];
  if (!unit) return null;
  return { amount: Math.max(0, amount), unit };
}

function isFridgeItemUseSoon(item: Omit<FridgeItem, 'id'> | FridgeItem) {
  if (!item.expiresAt) return false;
  const expiry = new Date(`${item.expiresAt}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 3;
}

function getFridgeTimingMeta(item: Omit<FridgeItem, 'id'> | FridgeItem) {
  const parts: string[] = [];
  if (item.expiresAt) {
    const expiry = new Date(`${item.expiresAt}T00:00:00`);
    if (!Number.isNaN(expiry.getTime())) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffMs = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        parts.push('Expired');
      } else if (diffDays === 0) {
        parts.push('Use today');
      } else if (diffDays === 1) {
        parts.push('Use in 1 day');
      } else {
        parts.push(`Use in ${diffDays} days`);
      }
    }
  }
  if (item.opened) parts.push('Opened');
  return parts.join(' · ');
}

async function simulateFridgeRecognition(_uri: string): Promise<Array<Omit<FridgeItem, 'id'>>> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return [
    { name: 'Milk', quantity: '1 bottle', amount: 1, unit: 'bottle', category: 'Dairy', note: 'Detected from photo', status: 'low', expiresAt: new Date(Date.now() + 86400000).toISOString().slice(0, 10), opened: true },
    { name: 'Eggs', quantity: '8 pcs', amount: 8, unit: 'pcs', category: 'Dairy', note: 'Detected from photo', status: 'full' },
    { name: 'Yogurt', quantity: '2 pcs', amount: 2, unit: 'pcs', category: 'Snacks', note: 'Detected from photo', status: 'low', expiresAt: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) },
    { name: 'Cheese', quantity: '1 pack', amount: 1, unit: 'pack', category: 'Dairy', note: 'Detected from photo', status: 'low', opened: true },
  ];
}

async function analyzeFridgePhotoWithFallback(
  imageBase64: string,
  mimeType: string,
  uri: string,
): Promise<{ items: Array<Omit<FridgeItem, 'id'>>; source: 'ai' | 'fallback'; error: string | null }> {
  try {
    const result = await analyzeFridgePhoto({ imageBase64, mimeType });
    if (result.length > 0) {
      return { items: result, source: 'ai', error: null };
    }
    return {
      items: await simulateFridgeRecognition(uri),
      source: 'fallback',
      error: 'AI returned an empty result for this photo.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vision request failed.';
    return {
      items: await simulateFridgeRecognition(uri),
      source: 'fallback',
      error: message,
    };
  }
}

function FridgeModeIcon({ active }: { active: boolean }) {
  const { themeName } = useTheme();
  const colors = useThemeColors();
  const styles = useReactMemo(() => createStyles(colors, themeName), [colors, themeName]);
  return (
    <View style={[styles.fridgeModeIconBox, active && styles.fridgeModeIconBoxActive]}>
      <View style={[styles.fridgeModeBody, active && styles.fridgeModeBodyActive]}>
        <View style={styles.fridgeModeDivider} />
        <View style={[styles.fridgeModeHandle, styles.fridgeModeHandleTop, active && styles.fridgeModeHandleActive]} />
        <View style={[styles.fridgeModeHandle, styles.fridgeModeHandleBottom, active && styles.fridgeModeHandleActive]} />
      </View>
      <Text style={[styles.fridgeModeSnowflake, active && styles.fridgeModeSnowflakeActive]}>✻</Text>
    </View>
  );
}

function ShoppingModeIcon({ active }: { active: boolean }) {
  const { themeName } = useTheme();
  const colors = useThemeColors();
  const styles = useReactMemo(() => createStyles(colors, themeName), [colors, themeName]);
  return (
    <View style={styles.shoppingCartIconBox}>
      <View style={styles.shoppingCartHandle} />
      <View style={styles.shoppingCartHandleStem} />
      <View style={styles.shoppingCartBasket}>
        <View style={styles.shoppingCartGridRow}>
          <View style={styles.shoppingCartGridCell} />
          <View style={styles.shoppingCartGridCell} />
          <View style={styles.shoppingCartGridCell} />
        </View>
        <View style={styles.shoppingCartGridRow}>
          <View style={styles.shoppingCartGridCell} />
          <View style={styles.shoppingCartGridCell} />
          <View style={styles.shoppingCartGridCell} />
        </View>
      </View>
      <View style={styles.shoppingCartBase} />
      <View style={[styles.shoppingCartWheel, styles.shoppingCartWheelLeft]} />
      <View style={[styles.shoppingCartWheel, styles.shoppingCartWheelRight]} />
      <View style={[styles.shoppingCartWheelInner, styles.shoppingCartWheelInnerLeft]} />
      <View style={[styles.shoppingCartWheelInner, styles.shoppingCartWheelInnerRight]} />
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { themeName } = useTheme();
  const colors = useThemeColors();
  const styles = useReactMemo(() => createStyles(colors, themeName), [colors, themeName]);
  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors, themeName: ThemeName) => {
  const notePalette =
    themeName === 'grey'
      ? {
          paper: 'rgba(232, 236, 240, 0.94)',
          ghost: 'rgba(216, 222, 228, 0.96)',
          empty: 'rgba(198, 205, 212, 0.88)',
          border: 'rgba(114, 121, 130, 0.46)',
          rule: 'rgba(122, 130, 138, 0.36)',
          pin: '#6b7076',
        }
      : themeName === 'blue'
        ? {
            paper: 'rgba(245, 250, 255, 0.96)',
            ghost: 'rgba(231, 241, 252, 0.97)',
            empty: 'rgba(214, 228, 244, 0.9)',
            border: 'rgba(111, 145, 196, 0.34)',
            rule: 'rgba(109, 143, 194, 0.28)',
            pin: '#2d6df6',
          }
        : themeName === 'mocha'
          ? {
              paper: 'rgba(244, 230, 220, 0.9)',
              ghost: 'rgba(205, 175, 156, 0.86)',
              empty: 'rgba(142, 98, 76, 0.58)',
              border: 'rgba(94, 54, 36, 0.34)',
              rule: 'rgba(162, 119, 97, 0.2)',
              pin: '#a27761',
            }
        : themeName === 'neonBloom'
          ? {
              paper: 'rgba(250, 252, 255, 0.95)',
              ghost: 'rgba(238, 244, 255, 0.96)',
              empty: 'rgba(223, 232, 245, 0.88)',
              border: 'rgba(140, 158, 255, 0.34)',
              rule: 'rgba(205, 213, 55, 0.28)',
              pin: '#ef55a5',
            }
        : {
            paper: 'rgba(255, 246, 248, 0.96)',
            ghost: 'rgba(249, 232, 236, 0.96)',
            empty: 'rgba(240, 221, 226, 0.9)',
            border: 'rgba(224, 164, 173, 0.34)',
            rule: 'rgba(254, 131, 132, 0.22)',
            pin: colors.primary,
          };

  const notePaper = notePalette.paper;
  const notePaperGhost = notePalette.ghost;
  const notePaperEmpty = notePalette.empty;
  const noteBorder = notePalette.border;
  const noteRule = notePalette.rule;
  const notePinColor = notePalette.pin;

  return StyleSheet.create({
    shoppingModeSwitch: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    shoppingModeBtn: {
      flex: 1,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.42)',
      paddingHorizontal: 18,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    shoppingModeBtnActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(255,255,255,0.86)',
      shadowColor: colors.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    shoppingModeIcon: {
      fontSize: 20,
      lineHeight: 22,
    },
    shoppingModeText: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
    },
    shoppingModeTextActive: {
      color: colors.primary,
    },
    shoppingCartIconBox: {
      width: 36,
      height: 28,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    shoppingCartHandle: {
      position: 'absolute',
      top: 3,
      left: 0,
      width: 11,
      height: 4,
      borderRadius: 999,
      backgroundColor: '#111111',
    },
    shoppingCartHandleStem: {
      position: 'absolute',
      top: 5,
      left: 9,
      width: 4,
      height: 13,
      borderRadius: 999,
      backgroundColor: '#111111',
      transform: [{ rotate: '-13deg' }],
    },
    shoppingCartBasket: {
      position: 'absolute',
      top: 8,
      left: 10,
      width: 23,
      height: 12,
      borderWidth: 2.4,
      borderColor: '#111111',
      borderTopWidth: 4,
      borderTopLeftRadius: 1,
      borderTopRightRadius: 3,
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 2,
      backgroundColor: 'transparent',
      paddingHorizontal: 3,
      paddingVertical: 1,
      gap: 2,
      transform: [{ skewX: '-12deg' }],
    },
    shoppingCartGridRow: {
      flexDirection: 'row',
      gap: 2,
      justifyContent: 'space-between',
    },
    shoppingCartGridCell: {
      width: 2.2,
      height: 6.5,
      borderRadius: 2,
      backgroundColor: '#111111',
    },
    shoppingCartBase: {
      position: 'absolute',
      bottom: 5,
      left: 11,
      width: 17,
      height: 3.5,
      borderRadius: 999,
      backgroundColor: '#111111',
    },
    shoppingCartWheel: {
      position: 'absolute',
      bottom: 0,
      width: 7,
      height: 7,
      borderRadius: 999,
      borderWidth: 2.3,
      borderColor: '#111111',
      backgroundColor: 'transparent',
    },
    shoppingCartWheelLeft: {
      left: 8,
    },
    shoppingCartWheelRight: {
      right: 2,
    },
    shoppingCartWheelInner: {
      position: 'absolute',
      bottom: 2.5,
      width: 2.2,
      height: 2.2,
      borderRadius: 999,
      backgroundColor: '#111111',
    },
    shoppingCartWheelInnerLeft: {
      left: 10.3,
    },
    shoppingCartWheelInnerRight: {
      right: 4.3,
    },
    fridgeModeIconBox: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    fridgeModeIconBoxActive: {
      transform: [{ scale: 1.04 }],
    },
    fridgeModeBody: {
      width: 16,
      height: 22,
      borderWidth: 2,
      borderColor: colors.text,
      borderRadius: 4,
      backgroundColor: 'transparent',
      position: 'relative',
    },
    fridgeModeBodyActive: {
      borderColor: colors.primary,
    },
    fridgeModeDivider: {
      position: 'absolute',
      top: 9,
      left: 1,
      right: 1,
      height: 2,
      backgroundColor: colors.text,
      opacity: 0.9,
    },
    fridgeModeHandle: {
      position: 'absolute',
      left: 2,
      width: 2,
      borderRadius: 999,
      backgroundColor: colors.text,
    },
    fridgeModeHandleTop: {
      top: 4,
      height: 6,
    },
    fridgeModeHandleBottom: {
      top: 12,
      height: 6,
    },
    fridgeModeHandleActive: {
      backgroundColor: colors.primary,
    },
    fridgeModeSnowflake: {
      position: 'absolute',
      right: -1,
      top: 5,
      fontSize: 12,
      lineHeight: 12,
      color: colors.text,
      fontWeight: '700',
    },
    fridgeModeSnowflakeActive: {
      color: colors.primary,
    },
    fridgeHint: {
      flex: 1,
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    fridgePhotoTip: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 10,
    },
    fridgeSummaryRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    fridgeSummaryRowMobile: {
      gap: 6,
    },
    fridgeSummaryChip: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
    },
    fridgeSummaryChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    fridgeSummaryValue: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 18,
      fontWeight: '800',
    },
    fridgeSummaryLabel: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
    },
    fridgeSummaryLabelActive: {
      color: colors.primary,
    },
    fridgeHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    fridgeHeaderRowMobile: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 8,
    },
    fridgeHeaderActions: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    fridgeHeaderActionsMobile: {
      width: '100%',
      justifyContent: 'space-between',
    },
    fridgeUploadBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    fridgeUploadBtnText: {
      color: colors.primary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '800',
    },
    fridgeTabsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    fridgeTabsRowMobile: {
      flexWrap: 'wrap',
      gap: 6,
    },
    fridgeTabBtn: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 10,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fridgeTabBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    fridgeTabText: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    fridgeTabTextActive: {
      color: colors.primary,
    },
    fridgeList: {
      gap: 10,
    },
    fridgeSection: {
      gap: 8,
    },
    fridgeSectionTitle: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
      paddingHorizontal: 2,
    },
    fridgeSectionList: {
      gap: 6,
    },
    fridgeEmptyCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      padding: 14,
      gap: 4,
    },
    fridgeEmptyTitle: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800',
    },
    fridgeEmptyText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    fridgeCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
    },
    fridgeCardMobile: {
      paddingHorizontal: 9,
      paddingVertical: 8,
      gap: 6,
    },
    fridgeCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    fridgeCardTopMobile: {
      gap: 7,
    },
    fridgeTextWrap: {
      flex: 1,
      gap: 2,
    },
    fridgeNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    fridgeItemName: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 16,
      fontWeight: '800',
    },
    fridgeItemNameMobile: {
      fontSize: 13,
      lineHeight: 15,
    },
    fridgeItemMeta: {
      color: colors.subtext,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '600',
    },
    fridgeItemMetaUrgent: {
      color: '#b91c1c',
    },
    fridgeItemNote: {
      color: colors.subtext,
      fontSize: 10,
      lineHeight: 13,
    },
    fridgeCardHeaderActions: {
      alignItems: 'flex-end',
      gap: 5,
    },
    fridgeUseSoonAlert: {
      width: 16,
      height: 16,
      borderRadius: 999,
      backgroundColor: 'rgba(239,68,68,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.26)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fridgeUseSoonAlertText: {
      color: '#b91c1c',
      fontSize: 10,
      lineHeight: 10,
      fontWeight: '900',
    },
    fridgeMoreBtn: {
      minWidth: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 7,
      paddingVertical: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fridgeMoreBtnText: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 11,
      fontWeight: '900',
    },
    fridgeStatusBadge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    fridgeStatusText: {
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '800',
    },
    fridgeActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexWrap: 'wrap',
      gap: 6,
    },
    fridgeActionsRowMobile: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 8,
    },
    fridgeCounter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    fridgeCounterBtn: {
      width: 22,
      height: 22,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fridgeCounterBtnText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 13,
      fontWeight: '800',
    },
    fridgeCounterValue: {
      minWidth: 16,
      color: colors.text,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '800',
      textAlign: 'center',
    },
    fridgeStatusSwitch: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      flex: 1,
    },
    fridgeStatusSwitchMobile: {
      width: '100%',
    },
    fridgeQuickActionBtn: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    fridgeQuickActionBtnDanger: {
      borderColor: 'rgba(248,113,113,0.28)',
      backgroundColor: 'rgba(254,242,242,0.94)',
    },
    fridgeQuickActionBtnText: {
      color: colors.text,
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
    },
    fridgeQuickActionBtnTextDanger: {
      color: '#b91c1c',
    },
    fridgeStatusOption: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    fridgeStatusOptionText: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
    },
    fridgePrimaryBtn: {
      borderRadius: 10,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fridgePrimaryBtnMobile: {
      width: '100%',
    },
    fridgePrimaryBtnText: {
      color: '#fff',
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '800',
    },
    fridgeEditAmountRow: {
      gap: 10,
    },
    fridgeEditAmountInput: {
      marginBottom: 0,
    },
    fridgeEditLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 8,
      marginTop: 2,
    },
    fridgeEditChipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    fridgeEditChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    fridgeEditChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    fridgeEditChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    fridgeEditChipTextActive: {
      color: colors.primary,
    },
    fridgeOpenedToggle: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fridgeOpenedToggleActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    fridgeOpenedToggleText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    fridgeOpenedToggleTextActive: {
      color: colors.primary,
    },
    fridgeRecipeIdeasSection: {
      gap: 8,
      marginTop: 6,
    },
    cookFromFridgeSection: {
      marginTop: 14,
      gap: 10,
    },
    restockHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    },
    cookFromFridgeTitle: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
    },
    cookFromFridgeHint: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    cookFromFridgeList: {
      gap: 10,
    },
    cookRecipeCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      padding: 12,
      gap: 6,
    },
    cookRecipeTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    cookRecipeTextWrap: {
      flex: 1,
      gap: 2,
    },
    cookRecipeTitle: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 19,
      fontWeight: '800',
    },
    cookRecipeMeta: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
    },
    cookRecipeStatusBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    cookRecipeStatusReady: {
      backgroundColor: 'rgba(34,197,94,0.14)',
    },
    cookRecipeStatusMissing: {
      backgroundColor: 'rgba(245,158,11,0.16)',
    },
    cookRecipeStatusText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
    },
    cookRecipeStatusTextReady: {
      color: '#15803d',
    },
    cookRecipeStatusTextMissing: {
      color: '#b45309',
    },
    cookRecipeMatchText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    cookRecipeMissingText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
    },
    cookRecipeActionsRow: {
      marginTop: 2,
      flexDirection: 'row',
    },
    cookRecipeActionBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      paddingHorizontal: 12,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cookRecipeActionBtnDisabled: {
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
    },
    cookRecipeActionBtnText: {
      color: colors.primary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '800',
    },
    cookRecipeActionBtnTextDisabled: {
      color: colors.subtext,
    },
    fridgePhotoPreview: {
      width: '100%',
      height: 180,
      borderRadius: 16,
      marginBottom: 10,
      backgroundColor: colors.glassSoft,
    },
    fridgeScanHint: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 10,
    },
    fridgeScanStatusBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 8,
    },
    fridgeScanStatusAi: {
      backgroundColor: 'rgba(34,197,94,0.14)',
    },
    fridgeScanStatusFallback: {
      backgroundColor: 'rgba(245,158,11,0.16)',
    },
    fridgeScanStatusText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
    },
    fridgeScanStatusTextAi: {
      color: '#15803d',
    },
    fridgeScanStatusTextFallback: {
      color: '#b45309',
    },
    fridgeScanErrorText: {
      color: '#b45309',
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 10,
    },
    fridgeDetectedList: {
      gap: 10,
    },
    fridgeDetectedCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      padding: 10,
      gap: 8,
    },
    fridgeDetectedNameInput: {
      marginBottom: 0,
    },
    fridgeDetectedQtyInput: {
      marginBottom: 0,
    },
    fridgeDetectedStatuses: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    cameraModalCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 14,
    },
    cameraPreviewWrap: {
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: '#0f172a',
      marginTop: 6,
      marginBottom: 12,
    },
    cameraPreview: {
      width: '100%',
      height: 360,
    },
    listsStage: {
      position: 'relative',
      marginBottom: 14,
      paddingTop: 14,
      minHeight: 520,
      overflow: 'visible',
    },
    headerActionsStack: {
      position: 'absolute',
      top: 36,
      right: 14,
      zIndex: 90,
      alignItems: 'flex-end',
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    shoppingControlsBlock: {
      gap: 8,
      marginBottom: 18,
    },
    shoppingControlsLabel: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    editListHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
      marginTop: -2,
      marginBottom: 18,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.38)',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    editListHintBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 999,
      backgroundColor: colors.selection,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    editListHintBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    editListHintText: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
    },
    requestHint: {
      color: colors.subtext,
      fontSize: 13,
      marginBottom: 10,
      fontWeight: '600',
    },
    requestComposer: {
      gap: 10,
    },
    requestSuggestionList: {
      marginTop: -2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.glassStrong,
      overflow: 'hidden',
    },
    requestSuggestionItem: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    requestSuggestionItemLast: {
      borderBottomWidth: 0,
    },
    requestSuggestionText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    requestRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    requestQtyInput: {
      flex: 1,
      marginBottom: 0,
    },
    requestCommentInput: {
      marginBottom: 0,
    },
    requestSendBtn: {
      minWidth: 110,
      paddingHorizontal: 14,
    },
    requestListWrap: {
      gap: 10,
    },
    requestCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.glassStrong,
      padding: 12,
      gap: 10,
    },
    requestTextWrap: {
      gap: 3,
    },
    requestTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 15,
    },
    requestMeta: {
      color: colors.subtext,
      fontWeight: '700',
      fontSize: 12,
    },
    requestComment: {
      color: colors.text,
      fontSize: 13,
    },
    requestActions: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    requestPrimaryBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      backgroundColor: colors.selection,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    requestPrimaryBtnText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 12,
    },
    requestGhostBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    requestGhostBtnText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 12,
    },
    shoppingListSection: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 30,
      backgroundColor: 'rgba(255,255,255,0.34)',
      padding: 18,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 14 },
      elevation: 10,
      position: 'relative',
    },
    shoppingListSectionMobile: {
      padding: 14,
      borderRadius: 22,
    },
    shoppingListHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      marginBottom: 14,
      padding: 14,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.56)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.72)',
    },
    shoppingListHeaderMobile: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    shoppingListHeaderActionsMobile: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    shoppingListHeaderCopy: {
      gap: 4,
      flex: 1,
    },
    shoppingPrimaryBtn: {
      minWidth: 76,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    shoppingPrimaryBtnText: {
      color: '#ffffff',
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '800',
    },
    basketOnboardingCard: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.72)',
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.62)',
      padding: 18,
      gap: 10,
      marginBottom: 18,
    },
    basketOnboardingTitle: {
      color: colors.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
    },
    basketOnboardingText: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600',
      maxWidth: 620,
    },
    basketOnboardingActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
    },
    basketSecondaryBtn: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(223,232,244,0.9)',
      backgroundColor: '#ffffff',
      paddingHorizontal: 14,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    basketSecondaryBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    shoppingListBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      backgroundColor: colors.selection,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: 'rgba(45,109,246,0.16)',
    },
    shoppingListBadgeText: {
      color: colors.primary,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
    },
    shoppingListTitle: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 28,
      fontWeight: '800',
    },
    shoppingListSubtitle: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    shoppingListStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 2,
    },
    shoppingListStatCard: {
      minWidth: 92,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 11,
      backgroundColor: 'rgba(245,250,255,0.92)',
      borderWidth: 1,
      borderColor: 'rgba(215,229,247,0.92)',
      gap: 2,
    },
    shoppingListStatValue: {
      color: colors.text,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '800',
    },
    shoppingListStatLabel: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
    },
    shoppingListHeaderActions: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      alignSelf: 'flex-start',
    },
    shoppingTopTabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
      flexWrap: 'wrap',
    },
    shoppingTopTab: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.74)',
      backgroundColor: 'rgba(255,255,255,0.56)',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    shoppingTopTabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    shoppingTopTabText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    shoppingTopTabTextActive: {
      color: colors.primary,
    },
    aiAssistantCard: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.72)',
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.58)',
      padding: 16,
      gap: 12,
      marginBottom: 18,
    },
    aiAssistantHeader: {
      gap: 2,
    },
    aiAssistantTitle: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
    },
    aiAssistantCaption: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    aiSuggestionList: {
      gap: 10,
    },
    aiSuggestionCard: {
      borderWidth: 1,
      borderColor: 'rgba(223,232,244,0.9)',
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    aiSuggestionCopy: {
      flex: 1,
      gap: 4,
    },
    aiSuggestionTitle: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '700',
    },
    aiSuggestionSource: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '600',
    },
    aiSuggestionActions: {
      alignItems: 'flex-end',
      gap: 8,
    },
    aiSuggestionAddBtn: {
      minWidth: 64,
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
    },
    aiSuggestionAddBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '800',
    },
    aiSuggestionDismissBtn: {
      minWidth: 64,
      borderRadius: 12,
      backgroundColor: 'rgba(244,247,251,0.98)',
      borderWidth: 1,
      borderColor: 'rgba(220,228,239,0.92)',
      paddingHorizontal: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    aiSuggestionDismissBtnText: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
    },
    shoppingSetupIntroCopy: {
      gap: 4,
    },
    shoppingUtilityRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginBottom: 16,
    },
    shoppingUtilityBtn: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.75)',
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.44)',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    shoppingUtilityBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    shoppingUtilityBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    shoppingUtilityBtnTextActive: {
      color: colors.primary,
    },
    shoppingBaseSection: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.42)',
      padding: 18,
      gap: 12,
      marginBottom: 16,
    },
    shoppingBaseCopy: {
      gap: 4,
    },
    shoppingBaseTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    shoppingBaseText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 19,
    },
    shoppingBaseActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    shoppingBaseBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 14,
      backgroundColor: colors.selection,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    shoppingBaseBtnDisabled: {
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
    },
    shoppingBaseBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    shoppingBaseBtnTextDisabled: {
      color: colors.subtext,
    },
    shoppingCategoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    shoppingCategoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    },
    shoppingCategorySummary: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    shoppingCategoryChip: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.74)',
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.56)',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    shoppingCategoryChipActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(255,255,255,0.94)',
    },
    shoppingCategoryChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    shoppingCategoryChipTextActive: {
      color: colors.primary,
    },
    tab: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.74)',
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 10,
      backgroundColor: 'rgba(255,255,255,0.56)',
    },
    tabActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(255,255,255,0.94)',
    },
    tabText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 15,
    },
    tabTextActive: {
      color: colors.primary,
    },
    shoppingBoard: {
      gap: 18,
    },
    shoppingPanelsBackdrop: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 20,
      backgroundColor: 'transparent',
    },
    moreSection: {
      marginTop: 18,
      zIndex: 30,
    },
    moreToggleBtn: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.74)',
      backgroundColor: 'rgba(255,255,255,0.48)',
      paddingHorizontal: 16,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    moreToggleBtnActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(255,255,255,0.84)',
    },
    moreToggleBtnText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800',
    },
    moreToggleBtnTextActive: {
      color: colors.primary,
    },
    moreToggleBtnChevron: {
      color: colors.subtext,
      fontSize: 18,
      lineHeight: 18,
      fontWeight: '700',
    },
    morePanel: {
      marginTop: 10,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.72)',
      backgroundColor: 'rgba(255,255,255,0.54)',
      padding: 16,
      gap: 14,
      zIndex: 31,
    },
    moreActionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    moreActionBtn: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(223,232,244,0.9)',
      backgroundColor: '#ffffff',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    moreActionBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    moreInlineActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    moreSecondaryBtn: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.44)',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    moreSecondaryBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    baseListMeta: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
      marginTop: -6,
      marginBottom: 6,
    },
    baseListActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    baseListPrimaryAction: {
      minWidth: 120,
    },
    baseListLinkBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 14,
      paddingVertical: 11,
      marginBottom: 12,
    },
    baseListLinkBtnText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
    },
    baseListItemsWrap: {
      gap: 10,
    },
    baseListItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    baseListItemCopy: {
      flex: 1,
      gap: 4,
    },
    baseListItemName: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
    },
    baseListItemMeta: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    baseListItemUseBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      backgroundColor: colors.selection,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    baseListItemUseBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    baseListEmptyText: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      marginTop: 2,
      marginBottom: 8,
    },
    moreSubsection: {
      gap: 10,
    },
    moreSubsectionTitle: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
    },
    shoppingEmptyState: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      backgroundColor: colors.glassStrong,
      padding: 22,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 220,
    },
    shoppingEmptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 6,
    },
    shoppingEmptyText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      maxWidth: 360,
    },
    shoppingGroup: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.74)',
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.56)',
      padding: 18,
      gap: 14,
    },
    shoppingGroupTitle: {
      color: colors.text,
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '800',
    },
    shoppingGroupList: {
      gap: 12,
    },
    shoppingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      borderWidth: 1,
      borderColor: 'rgba(228,236,246,0.92)',
      borderRadius: 20,
      backgroundColor: '#ffffff',
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    shoppingRowMobile: {
      gap: 10,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    shoppingCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 1.7,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      marginTop: 2,
    },
    shoppingCheckboxMobile: {
      width: 20,
      height: 20,
      borderRadius: 7,
      marginTop: 1,
    },
    shoppingCheckboxActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    shoppingCheckboxDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: '#ffffff',
    },
    shoppingRowBody: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 14,
    },
    shoppingRowBodyMobile: {
      gap: 10,
      alignItems: 'center',
    },
    shoppingRowTextWrap: {
      flex: 1,
      gap: 4,
    },
    shoppingRowName: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '800',
    },
    shoppingRowNameMobile: {
      fontSize: 14,
      lineHeight: 18,
    },
    shoppingRowNameDone: {
      color: colors.subtext,
      textDecorationLine: 'line-through',
    },
    shoppingRowSubtext: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
    },
    shoppingRowSubtextMobile: {
      fontSize: 11,
      lineHeight: 14,
    },
    shoppingRowQty: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
    },
    shoppingRowQtyMobile: {
      fontSize: 12,
      lineHeight: 15,
    },
    shoppingRowMeta: {
      alignItems: 'flex-end',
      gap: 8,
      flexShrink: 0,
    },
    shoppingRowMetaMobile: {
      alignItems: 'flex-start',
      flexShrink: 1,
      minWidth: 54,
    },
    shoppingRowCategoryChip: {
      borderWidth: 1,
      borderColor: 'rgba(218,228,242,0.9)',
      borderRadius: 999,
      backgroundColor: 'rgba(244,248,253,0.95)',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    shoppingRowCategoryText: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
    },
    shoppingRowQtyDone: {
      color: colors.subtext,
      textDecorationLine: 'line-through',
      opacity: 0.75,
    },
    shoppingHistorySection: {
      marginTop: 18,
      gap: 10,
    },
    shoppingHistoryTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    shoppingHistoryList: {
      gap: 10,
    },
    shoppingHistoryCard: {
      borderWidth: 1,
      borderColor: 'rgba(223,232,244,0.9)',
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    shoppingHistoryCopy: {
      flex: 1,
      gap: 2,
    },
    shoppingHistoryCardTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    shoppingHistoryMeta: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    shoppingHistoryBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      backgroundColor: colors.selection,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    shoppingHistoryBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    carouselWrap: {
      position: 'relative',
      minHeight: 520,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      backgroundColor: 'transparent',
    },
    carouselHalo: {
      position: 'absolute',
      width: 760,
      height: 340,
      borderRadius: 999,
      backgroundColor: 'rgba(15, 23, 42, 0.08)',
      opacity: 0.16,
      transform: [{ translateY: 32 }],
    },
    carouselGlow: {
      position: 'absolute',
      width: 580,
      height: 250,
      borderRadius: 999,
      backgroundColor: colors.selection,
      opacity: 0.07,
      transform: [{ translateY: 20 }],
    },
    carouselRail: {
      position: 'absolute',
      bottom: 10,
      width: 520,
      height: 88,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      backgroundColor: 'rgba(15,23,42,0.14)',
      opacity: 0.22,
    },
    noteSheet: {
      position: 'absolute',
      width: '100%',
      maxWidth: 388,
      minHeight: 494,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: noteBorder,
      backgroundColor: notePaper,
      paddingTop: 28,
      paddingBottom: 30,
      paddingHorizontal: 22,
      overflow: 'hidden',
      transform: [{ scale: 0.74 }],
    },
    noteSheetGhost: {
      backgroundColor: notePaperGhost,
      borderColor: noteBorder,
    },
    noteSheetEmpty: {
      backgroundColor: notePaperEmpty,
      borderColor: noteBorder,
    },
    noteSheetFarLeft: {
      transform: [{ translateX: -322 }, { translateY: 22 }, { scale: 0.42 }, { rotate: '-22deg' }],
      opacity: 0.22,
      zIndex: 1,
    },
    noteSheetLeft: {
      transform: [{ translateX: -190 }, { translateY: 10 }, { scale: 0.56 }, { rotate: '-14deg' }],
      opacity: 0.4,
      zIndex: 2,
    },
    noteSheetRight: {
      transform: [{ translateX: 190 }, { translateY: 10 }, { scale: 0.56 }, { rotate: '14deg' }],
      opacity: 0.4,
      zIndex: 2,
    },
    noteSheetFarRight: {
      transform: [{ translateX: 322 }, { translateY: 22 }, { scale: 0.42 }, { rotate: '22deg' }],
      opacity: 0.22,
      zIndex: 1,
    },
    noteSheetFront: {
      transform: [{ scale: 0.98 }],
      opacity: 1,
      zIndex: 5,
    },
    noteSheetHover: {
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 46,
      shadowOffset: { width: 0, height: 30 },
      elevation: 22,
    },
    noteGhostLabel: {
      position: 'absolute',
      left: 18,
      right: 18,
      top: 82,
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
      opacity: 0.34,
    },
    notePlaceholderLabel: {
      position: 'absolute',
      left: 18,
      right: 18,
      top: 102,
      color: colors.subtext,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'center',
      opacity: 0.28,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    headerEditBtn: {
      minWidth: 104,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.82)',
      backgroundColor: 'rgba(255,255,255,0.82)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 80,
      paddingHorizontal: 16,
    },
    headerEditBtnText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '800',
    },
    headerShareBtn: {
      minWidth: 104,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    headerShareBtnText: {
      color: '#ffffff',
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '800',
    },
    shareMenu: {
      width: 190,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    shareMenuItem: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: colors.glassStrong,
    },
    shareMenuItemText: {
      color: colors.text,
      fontWeight: '700',
    },
    shareMenuDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    sharedInboxWrap: {
      marginBottom: 14,
      gap: 8,
    },
    sharedInboxTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    sharedInboxCard: {
      borderWidth: 1,
      borderColor: 'rgba(223,232,244,0.9)',
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sharedInboxTextWrap: {
      flex: 1,
      gap: 2,
    },
    sharedInboxCardTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    sharedInboxMeta: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    sharedInboxActions: {
      flexDirection: 'row',
      gap: 8,
    },
    sharedInboxBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      backgroundColor: colors.selection,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    sharedInboxBtnText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 12,
    },
    sharedInboxDismissBtn: {
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    sharedInboxDismissText: {
      color: colors.subtext,
      fontWeight: '700',
      fontSize: 12,
    },
    backToShoppingBtn: {
      alignSelf: 'flex-start',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 14,
    },
    backToShoppingBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    notePin: {
      position: 'absolute',
      top: 4,
      right: 88,
      width: 16,
      height: 44,
      borderRadius: 12,
      borderWidth: 2.2,
      borderColor: notePinColor,
      backgroundColor: 'transparent',
      transform: [{ rotate: '-28deg' }],
      opacity: 0.82,
    },
    noteTitle: {
      textAlign: 'center',
      color: colors.text,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '800',
      letterSpacing: 4.6,
      marginBottom: 26,
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      minHeight: 34,
      marginBottom: 8,
    },
    noteEmptyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      minHeight: 34,
    },
    noteCheckbox: {
      width: 16,
      height: 16,
      marginTop: 6,
      borderWidth: 1.2,
      borderColor: colors.subtext,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.86)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    noteCheckboxActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    noteCheckboxDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.primary,
    },
    noteRowTextWrap: {
      flex: 1,
      minHeight: 28,
      justifyContent: 'flex-end',
      position: 'relative',
    },
    noteLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: noteRule,
    },
    noteTextRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
      paddingBottom: 6,
    },
    noteItemName: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    noteItemQty: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '800',
      flexShrink: 0,
    },
    noteItemNameDone: {
      textDecorationLine: 'line-through',
      opacity: 0.42,
    },
    noteItemQtyDone: {
      textDecorationLine: 'line-through',
      opacity: 0.42,
    },
    noteEmptyText: {
      position: 'absolute',
      left: 26,
      bottom: 7,
      color: colors.subtext,
      fontSize: 13,
      fontStyle: 'italic',
    },
    noteLeafLeft: {
      position: 'absolute',
      left: -18,
      bottom: -6,
      width: 36,
      height: 58,
      borderRadius: 18,
      backgroundColor: colors.glassStrong,
      transform: [{ rotate: '26deg' }],
      opacity: 0.34,
    },
    noteLeafRight: {
      position: 'absolute',
      left: 26,
      bottom: -18,
      width: 24,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.primary,
      transform: [{ rotate: '-22deg' }],
      opacity: 0.18,
    },
    carouselHotspotLeft: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 92,
      zIndex: 30,
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingLeft: 0,
    },
    carouselHotspotRight: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 92,
      zIndex: 30,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 0,
    },
    carouselArrow: {
      width: 34,
      height: 34,
      borderRadius: 17,
      overflow: 'hidden',
      textAlign: 'center',
      lineHeight: 33,
      fontSize: 24,
      color: colors.text,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      opacity: 0.66,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 760,
      maxHeight: '86%',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.96)',
      backgroundColor: 'rgba(248,250,252,0.97)',
      padding: 18,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
      elevation: 16,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 14,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    modalHeaderRowMobile: {
      marginBottom: 10,
    },
    modalHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    modalPlusBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalPlusBtnText: {
      color: colors.primary,
      fontSize: 22,
      lineHeight: 22,
      fontWeight: '700',
    },
    modalInlineDeleteBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.selection,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalInlineDeleteBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    modalBody: {
      maxHeight: 420,
    },
    modalBodyWithFooter: {
      marginBottom: 12,
    },
    modalBodyContent: {
      paddingBottom: 4,
    },
    editRowsWrap: {
      gap: 8,
    },
    editRowCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.card,
      padding: 10,
      gap: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.glassStrong,
      color: colors.text,
      fontSize: 16,
    },
    editRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editRowMobile: {
      flexWrap: 'wrap',
      alignItems: 'stretch',
    },
    editUnitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    editUnitRowMobile: {
      flex: 1,
      minWidth: 120,
    },
    editUnitChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 8,
      paddingVertical: 9,
      minWidth: 46,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editUnitChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    editUnitChipText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    editUnitChipTextActive: {
      color: colors.primary,
    },
    editCategoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    editCategoryChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    editCategoryChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    editCategoryChipText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    editCategoryChipTextActive: {
      color: colors.primary,
    },
    editNameInput: {
      flex: 1,
      marginBottom: 0,
    },
    editNameInputMobile: {
      width: '100%',
      flexBasis: '100%',
    },
    editQtyInput: {
      width: 110,
      marginBottom: 0,
    },
    editQtyInputMobile: {
      flex: 1,
      minWidth: 88,
      width: undefined,
    },
    deleteRowBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteRowBtnText: {
      color: colors.urgent,
      fontWeight: '800',
      fontSize: 13,
    },
    editButtonsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    editButtonsRowMobile: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    modalActionBtnMobile: {
      width: '100%',
    },
    mobileModalFooter: {
      gap: 8,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    mobileModalFooterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    mobileFooterPrimaryBtn: {
      flex: 1,
      minWidth: 0,
    },
    mobileFooterSecondaryBtn: {
      width: '100%',
    },
    mobileFooterTertiaryBtn: {
      flexShrink: 0,
      minWidth: 96,
    },
    addInlineBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addInlineBtnText: {
      color: colors.text,
      fontWeight: '700',
    },
    deleteListBtn: {
      backgroundColor: colors.selection,
    },
    deleteListBtnText: {
      color: colors.primary,
      fontWeight: '700',
    },
    editSaveBtn: {
      flexGrow: 1,
      minWidth: 120,
    },
    editCancelBtn: {
      backgroundColor: colors.card,
    },
    sheet: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.glassStrong,
      overflow: 'visible',
      marginBottom: 12,
      zIndex: 20,
      elevation: 20,
    },
    sheetRowWrap: {
      position: 'relative',
      overflow: 'visible',
      zIndex: 1,
    },
    sheetRowWrapActive: {
      zIndex: 80,
      elevation: 30,
    },
    sheetRow: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: 'transparent',
    },
    sheetRowMobile: {
      flexWrap: 'nowrap',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 4,
    },
    sheetRowLast: {
      borderBottomWidth: 0,
    },
    sheetInput: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      paddingVertical: 7,
    },
    sheetInputMobile: {
      flex: 1,
      minWidth: 0,
      paddingRight: 6,
    },
    counterWrap: {
      width: 74,
      height: 26,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    counterWrapMobile: {
      width: 88,
      minWidth: 88,
      flexShrink: 0,
    },
    counterBtn: {
      width: 17,
      height: 17,
      borderRadius: 8.5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.selection,
    },
    counterBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 13,
    },
    counterValue: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 12,
      minWidth: 14,
      textAlign: 'center',
    },
    unitWrap: {
      position: 'relative',
      width: 56,
      alignItems: 'flex-end',
      zIndex: 5,
    },
    unitWrapMobile: {
      width: 42,
      alignItems: 'flex-end',
      flexShrink: 0,
    },
    unitBtn: {
      width: 42,
      height: 26,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitBtnText: {
      color: colors.text,
      fontSize: 10,
      fontWeight: '800',
    },
    unitMenu: {
      position: 'absolute',
      top: 29,
      right: 0,
      width: 66,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      overflow: 'hidden',
      zIndex: 120,
      elevation: 40,
    },
    unitMenuItem: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    unitMenuItemActive: {
      backgroundColor: colors.selection,
    },
    unitMenuText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 10,
    },
    unitMenuTextActive: {
      color: colors.primary,
    },
    suggestionList: {
      marginTop: -2,
      marginLeft: 8,
      marginRight: 122,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.glassStrong,
      overflow: 'hidden',
      zIndex: 10,
    },
    editSuggestionList: {
      marginTop: -2,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.glassStrong,
      overflow: 'hidden',
      zIndex: 10,
    },
    suggestionItem: {
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionItemLast: {
      borderBottomWidth: 0,
    },
    suggestionText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '500',
    },
    addRowBtn: {
      minWidth: 74,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      zIndex: 1,
      paddingHorizontal: 12,
    },
    addRowBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 16,
    },
    addComposerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 14,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 11,
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
      zIndex: 1,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '700',
    },
  });
};
