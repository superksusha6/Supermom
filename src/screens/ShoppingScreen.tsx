import { useEffect, useMemo as useReactMemo, useRef, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { analyzeFridgePhoto } from '@/lib/fridgeVision';
import { SectionCard } from '@/components/SectionCard';
import { FridgeItem, FridgeItemStatus, PurchaseRequest, Role, ShoppingItem, ShoppingListDoc, ShoppingShare } from '@/types/app';
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
  onImportFridgeItems: (items: Array<Omit<FridgeItem, 'id'>>) => void;
  shareTargets: Array<{ key: string; label: string }>;
  sharedInbox: ShoppingShare[];
  activeRecipientKey: string;
  currentRole: Role;
  currentActorLabel: string;
  purchaseRequests: PurchaseRequest[];
  onUpdateFridgeItemStatus: (itemId: string, status: FridgeItemStatus) => void;
  onUseFridgeItem: (itemId: string) => void;
  onTogglePurchased: (listId: string, itemId: string) => void;
  onCreateList: (items: Array<{ name: string; quantity: string }>, targetListId?: string | null) => void;
  onUpdateList: (listId: string, items: ShoppingItem[]) => void;
  onDeleteList: (listId: string) => void;
  onShareListToProfile: (listId: string, recipientKey: string) => void;
  onImportSharedList: (shareId: string) => void;
  onDismissSharedList: (shareId: string) => void;
  onCreatePurchaseRequest: (payload: { itemName: string; quantity: string; comment: string }) => void;
  onAddPurchaseRequestToList: (requestId: string) => void;
  onDismissPurchaseRequest: (requestId: string) => void;
};

type Filter = 'active' | 'purchased';
type ShoppingView = 'list' | 'fridge';
type FridgeView = 'in_fridge' | 'need_to_buy' | 'out';

type EditShoppingRow = {
  key: string;
  sourceId: string | null;
  name: string;
  quantity: string;
  purchased: boolean;
};

function createDraftRow(index: number): DraftRow {
  return {
    id: `draft-${index}-${Date.now()}`,
    name: '',
    amount: 1,
    unit: 'pcs',
    unitOpen: false,
  };
}

export function ShoppingScreen({
  lists,
  fridgeItems,
  onImportFridgeItems,
  shareTargets,
  sharedInbox,
  activeRecipientKey,
  currentRole,
  currentActorLabel,
  purchaseRequests,
  onUpdateFridgeItemStatus,
  onUseFridgeItem,
  onTogglePurchased,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onShareListToProfile,
  onImportSharedList,
  onDismissSharedList,
  onCreatePurchaseRequest,
  onAddPurchaseRequestToList,
  onDismissPurchaseRequest,
}: Props) {
  const { themeName } = useTheme();
  const colors = useThemeColors();
  const styles = useReactMemo(() => createStyles(colors, themeName), [colors, themeName]);
  const [filter, setFilter] = useState<Filter>('active');
  const [shoppingView, setShoppingView] = useState<ShoppingView>('list');
  const [fridgeView, setFridgeView] = useState<FridgeView>('in_fridge');
  const [fridgePhotoUri, setFridgePhotoUri] = useState<string | null>(null);
  const [fridgePhotoScanOpen, setFridgePhotoScanOpen] = useState(false);
  const [fridgePhotoLoading, setFridgePhotoLoading] = useState(false);
  const [recognizedFridgeItems, setRecognizedFridgeItems] = useState<Array<Omit<FridgeItem, 'id'>>>([]);
  const [fridgeScanSource, setFridgeScanSource] = useState<'ai' | 'fallback' | null>(null);
  const [fridgeScanError, setFridgeScanError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<DraftRow[]>(() => [createDraftRow(0)]);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [requestItemName, setRequestItemName] = useState('');
  const [requestQuantity, setRequestQuantity] = useState('1 pcs');
  const [requestComment, setRequestComment] = useState('');
  const [requestInputFocused, setRequestInputFocused] = useState(false);
  const [noteHover, setNoteHover] = useState(false);
  const [notePulse, setNotePulse] = useState({ scale: 0.82, y: 0, rotate: 0, sway: 0 });
  const [editRows, setEditRows] = useState<EditShoppingRow[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const draftInputRefs = useRef<Record<string, TextInput | null>>({});
  const cameraRef = useRef<CameraView | null>(null);
  const pendingFocusRowIdRef = useRef<string | null>(null);
  const pulseFrameRef = useRef(0);
  const shareHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const activeList = lists.length > 0 ? lists[0] : null;
  const previousLists = lists.slice(1);
  const fridgeActionLabel = currentRole === 'staff' ? 'Send request' : 'Add to list';
  const visibleFridgeItems = useReactMemo(() => {
    if (fridgeView === 'in_fridge') return fridgeItems.filter((item) => item.status !== 'out');
    if (fridgeView === 'need_to_buy') return fridgeItems.filter((item) => item.status === 'low');
    return fridgeItems.filter((item) => item.status === 'out');
  }, [fridgeItems, fridgeView]);
  const normalizedOffset = previousLists.length > 0 ? historyOffset % previousLists.length : 0;
  const leftNearList = previousLists[normalizedOffset] || null;
  const leftFarList = previousLists[(normalizedOffset + 1) % previousLists.length] || null;
  const visibleItems = useReactMemo(
    () => (activeList ? activeList.items.filter((item) => item.purchased === (filter === 'purchased')) : []),
    [activeList, filter],
  );
  const visiblePurchaseRequests = useReactMemo(
    () => purchaseRequests.filter((request) => request.status === 'new'),
    [purchaseRequests],
  );
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
    setHistoryOffset(0);
  }, [lists.length]);

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

  useEffect(() => {
    if (!pendingFocusRowIdRef.current) return;
    const targetId = pendingFocusRowIdRef.current;
    const timer = setTimeout(() => {
      draftInputRefs.current[targetId]?.focus();
      pendingFocusRowIdRef.current = null;
    }, 0);
    return () => clearTimeout(timer);
  }, [draftRows]);

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

  function promoteTopFilledRow(rowId: string, rowName: string, index: number) {
    if (index !== 0 || rowName.trim().length === 0) return false;
    draftInputRefs.current[rowId]?.blur();
    insertFreshTopRow();
    return true;
  }

  function saveDraftRows() {
    const prepared = draftRows
      .map((row) => ({
        name: row.name.trim(),
        quantity: `${row.amount} ${row.unit}`,
      }))
      .filter((row) => row.name.length > 0);

    if (prepared.length === 0) return;

    onCreateList(prepared, activeList?.id ?? null);
    setDraftRows([createDraftRow(0)]);
    setFocusedRowId(null);
    setHistoryOffset(0);
  }

  function openEditor() {
    if (!activeList) return;
    setEditRows(
      activeList.items.map((item, index) => ({
        key: `edit-${item.id}-${index}`,
        sourceId: item.id,
        name: item.name,
        quantity: item.quantity,
        purchased: item.purchased,
      })),
    );
    setEditOpen(true);
  }

  function showShareMenu() {
    if (shareHoverTimeoutRef.current) {
      clearTimeout(shareHoverTimeoutRef.current);
      shareHoverTimeoutRef.current = null;
    }
    setShareOpen(true);
  }

  function hideShareMenu() {
    if (shareHoverTimeoutRef.current) clearTimeout(shareHoverTimeoutRef.current);
    shareHoverTimeoutRef.current = setTimeout(() => {
      setShareOpen(false);
      shareHoverTimeoutRef.current = null;
    }, 140);
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

  function cycleList(direction: 'left' | 'right') {
    if (previousLists.length === 0) return;
    setHistoryOffset((prev) => {
      if (direction === 'left') return (prev + 1) % previousLists.length;
      return (prev - 1 + previousLists.length) % previousLists.length;
    });
  }

  function addEditRow() {
    setEditRows((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        sourceId: null,
        name: '',
        quantity: '1 pcs',
        purchased: false,
      },
    ]);
  }

  function saveEditedList() {
    if (!activeList) return;
    const cleaned = editRows
      .map((row) => ({
        id: row.sourceId || `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: row.name.trim(),
        quantity: row.quantity.trim() || '1 pcs',
        purchased: row.purchased,
      }))
      .filter((row) => row.name.length > 0);

    onUpdateList(activeList.id, cleaned);
    setEditOpen(false);
    setEditRows([]);
    setNoteHover(false);
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

      <View style={styles.shoppingModeSwitch}>
        <Pressable
          style={[styles.shoppingModeBtn, shoppingView === 'list' && styles.shoppingModeBtnActive]}
          onPress={() => setShoppingView('list')}
        >
          <ShoppingModeIcon active={shoppingView === 'list'} />
          <Text style={[styles.shoppingModeText, shoppingView === 'list' && styles.shoppingModeTextActive]}>Shopping List</Text>
        </Pressable>
        <Pressable
          style={[styles.shoppingModeBtn, shoppingView === 'fridge' && styles.shoppingModeBtnActive]}
          onPress={() => setShoppingView('fridge')}
        >
          <FridgeModeIcon active={shoppingView === 'fridge'} />
          <Text style={[styles.shoppingModeText, shoppingView === 'fridge' && styles.shoppingModeTextActive]}>Smart Fridge</Text>
        </Pressable>
      </View>

      {shoppingView === 'list' ? (
      <View style={styles.listsStage}>
        {activeList ? (
          <View style={styles.headerActionsStack}>
            <Pressable style={styles.headerEditBtn} onPress={openEditor}>
              <Text style={styles.headerEditBtnText}>⋮</Text>
            </Pressable>
            <Pressable
              style={styles.headerShareBtn}
              onHoverIn={showShareMenu}
              onHoverOut={hideShareMenu}
              onPress={() => setShareOpen((prev) => !prev)}
            >
              <Text style={styles.headerShareBtnText}>⤴</Text>
            </Pressable>
            {shareOpen ? (
              <Pressable style={styles.shareMenu} onHoverIn={showShareMenu} onHoverOut={hideShareMenu}>
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
                      onHoverIn={showShareMenu}
                      onHoverOut={hideShareMenu}
                      onPress={() => {
                        if (!activeList) return;
                        onShareListToProfile(activeList.id, target.key);
                        setShareOpen(false);
                      }}
                    >
                      <Text style={styles.shareMenuItemText}>Send to {target.label}</Text>
                    </Pressable>
                  ))}
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {sharedInbox.length > 0 ? (
          <View style={styles.sharedInboxWrap}>
            <Text style={styles.sharedInboxTitle}>Shared With This Profile</Text>
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
        <View style={styles.row}>
          <Tab active={filter === 'active'} label="Active" onPress={() => setFilter('active')} />
          <Tab active={filter === 'purchased'} label="Purchased" onPress={() => setFilter('purchased')} />
        </View>

        <View style={styles.carouselWrap}>
          <View style={styles.carouselHalo} />
          <View style={styles.carouselGlow} />
          <View style={styles.carouselRail} />
          <Pressable style={styles.carouselHotspotLeft} onPress={() => cycleList('left')}>
            <Text style={styles.carouselArrow}>‹</Text>
          </Pressable>
          <Pressable style={styles.carouselHotspotRight} onPress={() => cycleList('right')}>
            <Text style={styles.carouselArrow}>›</Text>
          </Pressable>

          {leftFarList ? (
            <View style={[styles.noteSheet, styles.noteSheetFarLeft, styles.noteSheetGhost]}>
              <View style={styles.notePin} />
              <Text style={styles.noteGhostLabel}>{leftFarList.title}</Text>
            </View>
          ) : null}
          {leftNearList ? (
            <View style={[styles.noteSheet, styles.noteSheetLeft, styles.noteSheetGhost]}>
              <View style={styles.notePin} />
              <Text style={styles.noteGhostLabel}>{leftNearList.title}</Text>
            </View>
          ) : null}

          <Pressable
            style={[
              styles.noteSheet,
              styles.noteSheetFront,
              noteHover && styles.noteSheetHover,
              {
                transform: [
                  { perspective: 1200 },
                  { rotateZ: `${notePulse.rotate}deg` },
                  { rotateY: `${notePulse.sway * 0.16}deg` },
                  { translateX: notePulse.sway },
                  { translateY: notePulse.y },
                  { scale: notePulse.scale },
                ],
              },
            ]}
            onHoverIn={() => setNoteHover(true)}
            onHoverOut={() => {
              setNoteHover(false);
            }}
            onPress={openEditor}
          >
            <View style={styles.notePin} />
            <Text style={styles.noteTitle}>SHOPPING{'\n'}LIST</Text>

            {visibleItems.length === 0 ? (
              <View style={styles.noteEmptyRow}>
                <View style={styles.noteCheckbox} />
                <View style={styles.noteLine} />
                <Text style={styles.noteEmptyText}>No items yet</Text>
              </View>
            ) : (
              visibleItems.slice(0, 12).map((item) => (
                <View key={item.id} style={styles.noteRow}>
                  <View style={[styles.noteCheckbox, item.purchased && styles.noteCheckboxActive]}>
                    {item.purchased ? <View style={styles.noteCheckboxDot} /> : null}
                  </View>
                  <View style={styles.noteRowTextWrap}>
                    <View style={styles.noteLine} />
                    <View style={styles.noteTextRow}>
                      <Text style={[styles.noteItemName, item.purchased && styles.noteItemNameDone]}>{item.name}</Text>
                      <Text style={[styles.noteItemQty, item.purchased && styles.noteItemQtyDone]}>{item.quantity}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            <View style={styles.noteLeafLeft} />
            <View style={styles.noteLeafRight} />
          </Pressable>

          <View style={[styles.noteSheet, styles.noteSheetRight, styles.noteSheetEmpty]}>
            <View style={styles.notePin} />
            <Text style={styles.notePlaceholderLabel}>new list</Text>
          </View>
          <View style={[styles.noteSheet, styles.noteSheetFarRight, styles.noteSheetEmpty]}>
            <View style={styles.notePin} />
            <Text style={styles.notePlaceholderLabel}>new list</Text>
          </View>
        </View>
      </View>
      ) : (
        <SectionCard title="Smart Fridge">
          <View style={styles.fridgeHeaderRow}>
            <Text style={styles.fridgeHint}>
              Track what is full, running low, or out. Send low-stock items to shopping in one tap.
            </Text>
            <View style={styles.fridgeHeaderActions}>
              <Pressable style={styles.fridgeUploadBtn} onPress={openFridgeCamera}>
                <Text style={styles.fridgeUploadBtnText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.fridgeUploadBtn} onPress={pickFridgePhoto}>
                <Text style={styles.fridgeUploadBtnText}>{fridgePhotoLoading ? 'Scanning...' : 'Photo'}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.fridgePhotoTip}>Tip: capture the whole fridge front-on, with visible shelves and labels, and avoid cropping.</Text>
          <View style={styles.fridgeTabsRow}>
            <Pressable style={[styles.fridgeTabBtn, fridgeView === 'in_fridge' && styles.fridgeTabBtnActive]} onPress={() => setFridgeView('in_fridge')}>
              <Text style={[styles.fridgeTabText, fridgeView === 'in_fridge' && styles.fridgeTabTextActive]}>In Fridge</Text>
            </Pressable>
            <Pressable
              style={[styles.fridgeTabBtn, fridgeView === 'need_to_buy' && styles.fridgeTabBtnActive]}
              onPress={() => setFridgeView('need_to_buy')}
            >
              <Text style={[styles.fridgeTabText, fridgeView === 'need_to_buy' && styles.fridgeTabTextActive]}>Need To Buy</Text>
            </Pressable>
            <Pressable style={[styles.fridgeTabBtn, fridgeView === 'out' && styles.fridgeTabBtnActive]} onPress={() => setFridgeView('out')}>
              <Text style={[styles.fridgeTabText, fridgeView === 'out' && styles.fridgeTabTextActive]}>Out</Text>
            </Pressable>
          </View>
          <View style={styles.fridgeList}>
            {visibleFridgeItems.length === 0 ? (
              <View style={styles.fridgeEmptyCard}>
                <Text style={styles.fridgeEmptyTitle}>Nothing here yet</Text>
                <Text style={styles.fridgeEmptyText}>
                  {fridgeView === 'in_fridge'
                    ? 'Add products or scan a fridge photo to start tracking what you have.'
                    : fridgeView === 'need_to_buy'
                      ? 'Items marked as low will appear here so you can shop faster.'
                      : 'Items marked as out will appear here after they run out.'}
                </Text>
              </View>
            ) : null}
            {visibleFridgeItems.map((item) => {
              const statusMeta = getFridgeStatusMeta(item.status);
              return (
                <View key={item.id} style={styles.fridgeCard}>
                  <View style={styles.fridgeCardTop}>
                    <View style={styles.fridgeTextWrap}>
                      <Text style={styles.fridgeItemName}>{item.name}</Text>
                      <Text style={styles.fridgeItemMeta}>
                        {item.quantity}
                        {item.category ? ` · ${item.category}` : ''}
                      </Text>
                      {item.note ? <Text style={styles.fridgeItemNote}>{item.note}</Text> : null}
                    </View>
                    <View style={[styles.fridgeStatusBadge, { backgroundColor: statusMeta.bg }]}>
                      <Text style={[styles.fridgeStatusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                    </View>
                  </View>
                  <View style={styles.fridgeActionsRow}>
                    <View style={styles.fridgeStatusSwitch}>
                      {(['full', 'low', 'out'] as FridgeItemStatus[]).map((status) => {
                        const meta = getFridgeStatusMeta(status);
                        const active = item.status === status;
                        return (
                          <Pressable
                            key={`${item.id}-${status}`}
                            style={[styles.fridgeStatusOption, active && { backgroundColor: meta.bg, borderColor: meta.color }]}
                            onPress={() => onUpdateFridgeItemStatus(item.id, status)}
                          >
                            <Text style={[styles.fridgeStatusOptionText, active && { color: meta.color }]}>{meta.shortLabel}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Pressable style={styles.fridgePrimaryBtn} onPress={() => onUseFridgeItem(item.id)}>
                      <Text style={styles.fridgePrimaryBtnText}>{fridgeActionLabel}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </SectionCard>
      )}

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
            <Text style={styles.modalTitle}>Scan Fridge Photo</Text>
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {fridgePhotoUri ? <Image source={{ uri: fridgePhotoUri }} style={styles.fridgePhotoPreview} resizeMode="cover" /> : null}
              <Text style={styles.fridgeScanHint}>Review the detected products before saving them to Smart Fridge.</Text>
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
        visible={editOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setEditOpen(false);
          setEditRows([]);
          setNoteHover(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setEditOpen(false);
            setEditRows([]);
            setNoteHover(false);
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Edit Shopping List</Text>
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <View style={styles.editRowsWrap}>
                {editRows.map((row) => (
                  <View key={row.key} style={styles.editRow}>
                    <TextInput
                      value={row.name}
                      onChangeText={(text) => setEditRows((prev) => prev.map((item) => (item.key === row.key ? { ...item, name: text } : item)))}
                      placeholder="Item name"
                      placeholderTextColor={colors.subtext}
                      style={[styles.input, styles.editNameInput]}
                    />
                    <TextInput
                      value={row.quantity}
                      onChangeText={(text) => setEditRows((prev) => prev.map((item) => (item.key === row.key ? { ...item, quantity: text } : item)))}
                      placeholder="1 pcs"
                      placeholderTextColor={colors.subtext}
                      style={[styles.input, styles.editQtyInput]}
                    />
                    <Pressable style={styles.deleteRowBtn} onPress={() => setEditRows((prev) => prev.filter((item) => item.key !== row.key))}>
                      <Text style={styles.deleteRowBtnText}>X</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.editButtonsRow}>
              <Pressable style={styles.addInlineBtn} onPress={addEditRow}>
                <Text style={styles.addInlineBtnText}>+ Add row</Text>
              </Pressable>
              {activeList ? (
                <Pressable
                  style={[styles.addInlineBtn, styles.deleteListBtn]}
                  onPress={() => {
                  onDeleteList(activeList.id);
                  setEditOpen(false);
                  setEditRows([]);
                  setNoteHover(false);
                  }}
                >
                  <Text style={styles.deleteListBtnText}>Delete list</Text>
                </Pressable>
              ) : null}
              <Pressable style={[styles.button, styles.editSaveBtn]} onPress={saveEditedList}>
                <Text style={styles.buttonText}>Save</Text>
              </Pressable>
              <Pressable
                style={[styles.addInlineBtn, styles.editCancelBtn]}
                onPress={() => {
                  setEditOpen(false);
                  setEditRows([]);
                  setNoteHover(false);
                }}
              >
                <Text style={styles.addInlineBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SectionCard title="🛒">
        <View style={styles.sheet}>
          {draftRows.map((row, index) => {
            const suggestions = focusedRowId === row.id ? suggestionsByRow[row.id] || [] : [];
            return (
              <View key={row.id} style={[styles.sheetRowWrap, row.unitOpen && styles.sheetRowWrapActive]}>
                <View style={[styles.sheetRow, index === draftRows.length - 1 && styles.sheetRowLast]}>
                  <TextInput
                    ref={(node) => {
                      draftInputRefs.current[row.id] = node;
                    }}
                    value={row.name}
                    onChangeText={(text) => {
                      updateRow(row.id, (current) => ({ ...current, name: text }));
                      setFocusedRowId(row.id);
                    }}
                    onPressIn={() => {
                      if (promoteTopFilledRow(row.id, row.name, index)) return;
                    }}
                    onFocus={() => {
                      if (promoteTopFilledRow(row.id, row.name, index)) return;
                      setFocusedRowId(row.id);
                    }}
                    placeholder={index === 0 ? 'Start typing your shopping list...' : 'Next item'}
                    placeholderTextColor={colors.subtext}
                    style={styles.sheetInput}
                  />

                  <View style={styles.counterWrap}>
                    <Pressable style={styles.counterBtn} onPress={() => updateRow(row.id, (current) => ({ ...current, amount: Math.max(1, current.amount - 1) }))}>
                      <Text style={styles.counterBtnText}>-</Text>
                    </Pressable>
                    <Text style={styles.counterValue}>{row.amount}</Text>
                    <Pressable style={styles.counterBtn} onPress={() => updateRow(row.id, (current) => ({ ...current, amount: current.amount + 1 }))}>
                      <Text style={styles.counterBtnText}>+</Text>
                    </Pressable>
                  </View>

                  <View style={styles.unitWrap}>
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
                              updateRow(row.id, (current) => ({ ...current, unit, unitOpen: false }));
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

        <Pressable
          style={styles.addRowBtn}
          onPress={() => {
            closeAllUnitMenus();
            setDraftRows((prev) => [createDraftRow(prev.length), ...prev]);
          }}
        >
          <Text style={styles.addRowBtnText}>+</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={saveDraftRows}>
          <Text style={styles.buttonText}>Add List</Text>
        </Pressable>
      </SectionCard>
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

async function simulateFridgeRecognition(_uri: string): Promise<Array<Omit<FridgeItem, 'id'>>> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return [
    { name: 'Milk', quantity: '1 bottle', category: 'Dairy', note: 'Detected from photo', status: 'low' },
    { name: 'Eggs', quantity: '8 pcs', category: 'Dairy', note: 'Detected from photo', status: 'full' },
    { name: 'Yogurt', quantity: '0 cups', category: 'Snacks', note: 'Detected from photo', status: 'out' },
    { name: 'Cheese', quantity: '1 pack', category: 'Dairy', note: 'Detected from photo', status: 'low' },
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
      marginBottom: 12,
    },
    shoppingModeBtn: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    shoppingModeBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    shoppingModeIcon: {
      fontSize: 20,
      lineHeight: 22,
    },
    shoppingModeText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
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
    fridgeHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    fridgeHeaderActions: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
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
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      padding: 12,
      gap: 10,
    },
    fridgeCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    fridgeTextWrap: {
      flex: 1,
      gap: 2,
    },
    fridgeItemName: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '800',
    },
    fridgeItemMeta: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    fridgeItemNote: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
    },
    fridgeStatusBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    fridgeStatusText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '800',
    },
    fridgeActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    fridgeStatusSwitch: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      flex: 1,
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
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fridgePrimaryBtnText: {
      color: '#fff',
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '800',
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
      paddingTop: 8,
      minHeight: 430,
      overflow: 'visible',
    },
    headerActionsStack: {
      position: 'absolute',
      top: 12,
      right: 10,
      zIndex: 90,
      alignItems: 'flex-end',
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 10,
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
    tab: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.glassStrong,
    },
    tabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    tabText: {
      color: colors.text,
      fontWeight: '600',
    },
    tabTextActive: {
      color: colors.primary,
    },
    carouselWrap: {
      position: 'relative',
      minHeight: 430,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      backgroundColor: 'transparent',
    },
    carouselHalo: {
      position: 'absolute',
      width: 620,
      height: 280,
      borderRadius: 999,
      backgroundColor: 'rgba(15, 23, 42, 0.08)',
      opacity: 0.32,
      transform: [{ translateY: 18 }],
    },
    carouselGlow: {
      position: 'absolute',
      width: 480,
      height: 220,
      borderRadius: 999,
      backgroundColor: colors.selection,
      opacity: 0.12,
      transform: [{ translateY: 12 }],
    },
    carouselRail: {
      position: 'absolute',
      bottom: 18,
      width: 420,
      height: 72,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      backgroundColor: 'rgba(15,23,42,0.14)',
      opacity: 0.45,
    },
    noteSheet: {
      position: 'absolute',
      width: '100%',
      maxWidth: 320,
      minHeight: 420,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: noteBorder,
      backgroundColor: notePaper,
      paddingTop: 20,
      paddingBottom: 22,
      paddingHorizontal: 16,
      overflow: 'hidden',
      transform: [{ scale: 0.68 }],
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
      transform: [{ translateX: -276 }, { translateY: 18 }, { scale: 0.5 }, { rotate: '-20deg' }],
      opacity: 0.92,
      zIndex: 1,
    },
    noteSheetLeft: {
      transform: [{ translateX: -154 }, { translateY: 0 }, { scale: 0.64 }, { rotate: '-14deg' }],
      opacity: 0.97,
      zIndex: 2,
    },
    noteSheetRight: {
      transform: [{ translateX: 154 }, { translateY: 0 }, { scale: 0.64 }, { rotate: '14deg' }],
      opacity: 0.97,
      zIndex: 2,
    },
    noteSheetFarRight: {
      transform: [{ translateX: 276 }, { translateY: 18 }, { scale: 0.5 }, { rotate: '20deg' }],
      opacity: 0.92,
      zIndex: 1,
    },
    noteSheetFront: {
      transform: [{ scale: 0.86 }],
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
      top: 60,
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      opacity: 0.6,
    },
    notePlaceholderLabel: {
      position: 'absolute',
      left: 18,
      right: 18,
      top: 86,
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
      opacity: 0.48,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    headerEditBtn: {
      width: 38,
      height: 38,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 80,
    },
    headerEditBtnText: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      marginTop: -2,
    },
    headerShareBtn: {
      width: 38,
      height: 38,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerShareBtnText: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: '800',
      marginTop: -1,
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
      marginRight: 58,
      marginBottom: 10,
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
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.glassStrong,
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
      color: colors.text,
      fontWeight: '700',
      fontSize: 12,
    },
    notePin: {
      position: 'absolute',
      top: -2,
      right: 74,
      width: 14,
      height: 40,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: notePinColor,
      backgroundColor: 'transparent',
      transform: [{ rotate: '-28deg' }],
      opacity: 0.62,
    },
    noteTitle: {
      textAlign: 'center',
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '800',
      letterSpacing: 4,
      marginBottom: 18,
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      minHeight: 24,
      marginBottom: 4,
    },
    noteEmptyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 24,
    },
    noteCheckbox: {
      width: 12,
      height: 12,
      marginTop: 5,
      borderWidth: 1,
      borderColor: colors.subtext,
      borderRadius: 2,
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
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.primary,
    },
    noteRowTextWrap: {
      flex: 1,
      minHeight: 21,
      justifyContent: 'flex-end',
      position: 'relative',
    },
    noteLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: noteRule,
    },
    noteTextRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
      paddingBottom: 4,
    },
    noteItemName: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    noteItemQty: {
      color: colors.subtext,
      fontSize: 10,
      fontWeight: '700',
      flexShrink: 0,
    },
    noteItemNameDone: {
      textDecorationLine: 'line-through',
      opacity: 0.58,
    },
    noteItemQtyDone: {
      textDecorationLine: 'line-through',
      opacity: 0.58,
    },
    noteEmptyText: {
      position: 'absolute',
      left: 20,
      bottom: 5,
      color: colors.subtext,
      fontSize: 11,
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
    modalBody: {
      maxHeight: 420,
    },
    modalBodyContent: {
      paddingBottom: 4,
    },
    editRowsWrap: {
      gap: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.glassStrong,
      color: colors.text,
    },
    editRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editNameInput: {
      flex: 1,
      marginBottom: 0,
    },
    editQtyInput: {
      width: 110,
      marginBottom: 0,
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
    sheetRowLast: {
      borderBottomWidth: 0,
    },
    sheetInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      paddingVertical: 7,
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
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      alignSelf: 'flex-start',
      zIndex: 1,
    },
    addRowBtnText: {
      color: colors.primary,
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 26,
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
