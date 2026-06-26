import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import * as ImagePicker from 'expo-image-picker';
import { SectionCard } from '@/components/SectionCard';
import { buildMacroMessage, cleanNutritionNumber, customNutritionFoodToPreset, getNutritionPlan, getNutritionTotals, getNutritionValuesForGrams, nutritionPresetToCustomFood, NUTRITION_FOOD_PRESETS, NutritionFoodPreset } from '@/lib/nutrition';
import { lookupNutritionBarcode, normalizeNutritionSearchText, searchNutritionCatalog } from '@/lib/nutritionCatalog';
import { analyzeMealPhoto, estimateMealByText } from '@/lib/mealVision';
import { ActivityLevel, CustomNutritionFood, NutritionEntrySource, NutritionFoodEntry, NutritionGoal, NutritionMealType, NutritionPace, NutritionSex, PersonalProfile } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  personalProfile: PersonalProfile;
  nutritionGoal: NutritionGoal;
  onNutritionGoalChange: Dispatch<SetStateAction<NutritionGoal>>;
  activityLevel: ActivityLevel;
  onActivityLevelChange: Dispatch<SetStateAction<ActivityLevel>>;
  nutritionSex: NutritionSex;
  onNutritionSexChange: Dispatch<SetStateAction<NutritionSex>>;
  desiredWeight: string;
  onDesiredWeightChange: Dispatch<SetStateAction<string>>;
  nutritionPace: NutritionPace;
  onNutritionPaceChange: Dispatch<SetStateAction<NutritionPace>>;
  calorieOverride: string;
  onCalorieOverrideChange: Dispatch<SetStateAction<string>>;
  nutritionEntries: NutritionFoodEntry[];
  onNutritionEntriesChange: Dispatch<SetStateAction<NutritionFoodEntry[]>>;
  customFoodPresets: CustomNutritionFood[];
  onCustomFoodPresetsChange: Dispatch<SetStateAction<CustomNutritionFood[]>>;
  quickActionRequest?: { type: 'add-meal'; mealType: NutritionMealType; token: number } | null;
  renderInlineContent?: boolean;
};

type NutritionLibraryMeta = {
  favorites: string[];
  recentIds: string[];
};

type AddFoodFlow = 'search' | 'scan' | 'photo';

const LOCAL_NUTRITION_LIBRARY_META_KEY = 'smartmom.nutritionLibraryMeta.v1';
const EMPTY_LIBRARY_META: NutritionLibraryMeta = { favorites: [], recentIds: [] };

function loadNutritionLibraryMeta(): NutritionLibraryMeta {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return EMPTY_LIBRARY_META;
    const raw = globalThis.localStorage.getItem(LOCAL_NUTRITION_LIBRARY_META_KEY);
    if (!raw) return EMPTY_LIBRARY_META;
    const parsed = JSON.parse(raw) as Partial<NutritionLibraryMeta>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((item): item is string => typeof item === 'string') : [],
      recentIds: Array.isArray(parsed.recentIds) ? parsed.recentIds.filter((item): item is string => typeof item === 'string') : [],
    };
  } catch {
    return EMPTY_LIBRARY_META;
  }
}

function persistNutritionLibraryMeta(meta: NutritionLibraryMeta) {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
    globalThis.localStorage.setItem(LOCAL_NUTRITION_LIBRARY_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore local persistence errors
  }
}

const NUTRITION_WEEK_RADIUS = 12;

export function NutritionScreen({
  personalProfile,
  nutritionGoal,
  onNutritionGoalChange,
  activityLevel,
  onActivityLevelChange,
  nutritionSex,
  onNutritionSexChange,
  desiredWeight,
  onDesiredWeightChange,
  nutritionPace,
  onNutritionPaceChange,
  calorieOverride,
  onCalorieOverrideChange,
  nutritionEntries,
  onNutritionEntriesChange,
  customFoodPresets,
  onCustomFoodPresetsChange,
  quickActionRequest,
  renderInlineContent = true,
}: Props) {
  // USDA FoodData Central for accurate reference foods (e.g. "boiled egg", "chicken breast").
  // Falls back to USDA's public DEMO_KEY when no dedicated key is configured (low rate limits;
  // set EXPO_PUBLIC_USDA_API_KEY for production-grade limits).
  const usdaApiKey = process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const styles = useMemo(() => createStyles(colors, isMobile), [colors, isMobile]);
  const hasProfileInputs = Boolean(personalProfile.dateOfBirth && personalProfile.heightCm && personalProfile.weightKg);
  const [activeMealType, setActiveMealType] = useState<NutritionMealType | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<NutritionMealType | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [addTab, setAddTab] = useState<'search' | 'recent' | 'frequent' | 'saved'>('recent');
  const [sessionAddedCount, setSessionAddedCount] = useState(0);
  const [sessionAddedName, setSessionAddedName] = useState('');
  const [quickAddedIds, setQuickAddedIds] = useState<string[]>([]);
  const [cardAddedFlash, setCardAddedFlash] = useState(false);
  const [addFoodFlow, setAddFoodFlow] = useState<AddFoodFlow>('search');
  const [draftMealName, setDraftMealName] = useState('');
  const [draftCalories, setDraftCalories] = useState('');
  const [draftProtein, setDraftProtein] = useState('');
  const [draftFat, setDraftFat] = useState('');
  const [draftCarbs, setDraftCarbs] = useState('');
  // Independent per-serving values for a custom food (entered directly, not converted).
  const [draftServingCalories, setDraftServingCalories] = useState('');
  const [draftServingProtein, setDraftServingProtein] = useState('');
  const [draftServingFat, setDraftServingFat] = useState('');
  const [draftServingCarbs, setDraftServingCarbs] = useState('');
  const [foodSearch, setFoodSearch] = useState('');
  const [draftGrams, setDraftGrams] = useState('100');
  // At log time, which unit the food is logged in.
  const [loggingUnit, setLoggingUnit] = useState<'base' | 'spoon' | 'serving'>('base');
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  // When set, the custom-food editor is editing this saved food's definition (no diary entry).
  const [editingCustomFoodId, setEditingCustomFoodId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<NutritionFoodPreset | null>(null);
  const [customFoodMode, setCustomFoodMode] = useState(false);
  const [photoEstimateMode, setPhotoEstimateMode] = useState(false);
  const [customBrand, setCustomBrand] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [customServingGrams, setCustomServingGrams] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [customServingType, setCustomServingType] = useState<'100g' | '100ml' | 'serving'>('100g');
  const [catalogResults, setCatalogResults] = useState<NutritionFoodPreset[]>([]);
  const [catalogSearchLoading, setCatalogSearchLoading] = useState(false);
  const [catalogSearchError, setCatalogSearchError] = useState<string | null>(null);
  const [libraryMeta, setLibraryMeta] = useState<NutritionLibraryMeta>(() => loadNutritionLibraryMeta());
  const [barcodeCameraOpen, setBarcodeCameraOpen] = useState(false);
  const [barcodeLookupBusy, setBarcodeLookupBusy] = useState(false);
  const [barcodeLookupError, setBarcodeLookupError] = useState<string | null>(null);
  const [mealPhotoLoading, setMealPhotoLoading] = useState(false);
  const [mealPhotoError, setMealPhotoError] = useState<string | null>(null);
  const [mealPhotoNote, setMealPhotoNote] = useState<string | null>(null);
  const [mealPhotoConfidence, setMealPhotoConfidence] = useState<'low' | 'medium' | 'high' | null>(null);
  const [aiEstimateLoading, setAiEstimateLoading] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const weekScrollRef = useRef<ScrollView>(null);
  const [weekViewportWidth, setWeekViewportWidth] = useState(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const plan = getNutritionPlan({
    dateOfBirth: personalProfile.dateOfBirth,
    heightCm: personalProfile.heightCm,
    weightKg: personalProfile.weightKg,
    goal: nutritionGoal,
    activityLevel,
    sex: nutritionSex,
    desiredWeightKg: desiredWeight,
    pace: nutritionPace,
    calorieOverride,
  });

  const selectedDateEntries = useMemo(() => nutritionEntries.filter((entry) => entry.date === selectedDateKey), [nutritionEntries, selectedDateKey]);
  const totals = getNutritionTotals(selectedDateEntries);
  const mealSections: Array<{ key: NutritionMealType; title: string; icon: string; accent: string; subtitle: string }> = [
    { key: 'breakfast', title: 'Breakfast', icon: 'Sun', accent: '#f59e0b', subtitle: 'Start your day with energy' },
    { key: 'lunch', title: 'Lunch', icon: 'Sky', accent: '#0ea5e9', subtitle: 'Main meal for focus and balance' },
    { key: 'dinner', title: 'Dinner', icon: 'Moon', accent: '#fb7185', subtitle: 'Keep the evening nourishing' },
    { key: 'snack', title: 'Snacks', icon: 'Spark', accent: '#8b5cf6', subtitle: 'Small bites between meals' },
    { key: 'other', title: 'Other', icon: 'Mix', accent: '#64748b', subtitle: 'Anything that does not fit the usual meal slots' },
  ];
  const mealData = mealSections.map((section) => {
    const entries = selectedDateEntries.filter((entry) => entry.mealType === section.key);
    return {
      ...section,
      entries,
      totals: getNutritionTotals(entries),
    };
  });
  const allFoodPresets = useMemo(
    () => [...customFoodPresets.map(customNutritionFoodToPreset), ...NUTRITION_FOOD_PRESETS],
    [customFoodPresets],
  );
  const mealTypeUsageCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeMealType) return map;
    nutritionEntries
      .filter((entry) => entry.mealType === activeMealType)
      .forEach((entry) => {
        const key = entry.name.trim().toLowerCase();
        if (!key) return;
        map.set(key, (map.get(key) || 0) + 1);
      });
    return map;
  }, [activeMealType, nutritionEntries]);
  const filteredFoodPresets = useMemo(() => {
    const query = normalizeNutritionSearchText(foodSearch);
    if (!query) return [] as NutritionFoodPreset[];
    const aliasTextOf = (item: NutritionFoodPreset) =>
      item.aliases?.length ? normalizeNutritionSearchText(item.aliases.join(' ')) : '';
    const scorePreset = (item: NutritionFoodPreset) => {
      const displayTitle = item.brand?.trim() ? `${item.brand.trim()} ${item.name}` : item.name;
      const name = normalizeNutritionSearchText(item.name);
      const title = normalizeNutritionSearchText(displayTitle);
      const brand = normalizeNutritionSearchText(item.brand);
      const aliasText = aliasTextOf(item);
      const tokens = query.split(' ').filter(Boolean);
      const mealScore = mealTypeUsageCounts.get(name) || mealTypeUsageCounts.get(title) || 0;
      const prefixScore = name.startsWith(query) || title.startsWith(query) || brand.startsWith(query) || aliasText.startsWith(query) ? 100 : 0;
      const favoriteScore = libraryMeta.favorites.includes(item.id) ? 20 : 0;
      const recentIndex = libraryMeta.recentIds.indexOf(item.id);
      const recentScore = recentIndex >= 0 ? Math.max(0, 12 - recentIndex) : 0;
      const haystack = `${title} ${aliasText}`;
      const tokenScore = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 20 : 0), 0);
      const allTokensScore = tokens.length > 1 && tokens.every((token) => haystack.includes(token)) ? 100 : 0;
      return prefixScore + favoriteScore + recentScore + mealScore * 10 + tokenScore + allTokensScore;
    };
    return [...allFoodPresets]
      .filter((item) => {
        const title = item.brand?.trim() ? `${item.brand.trim()} ${item.name}` : item.name;
        const normalizedName = normalizeNutritionSearchText(item.name);
        const normalizedTitle = normalizeNutritionSearchText(title);
        const normalizedBrand = normalizeNutritionSearchText(item.brand);
        const aliasText = aliasTextOf(item);
        const tokens = query.split(' ').filter(Boolean);
        const haystack = `${normalizedTitle} ${aliasText}`;
        return (
          normalizedName.includes(query) ||
          normalizedTitle.includes(query) ||
          normalizedBrand.includes(query) ||
          aliasText.includes(query) ||
          (tokens.length > 1 && tokens.every((token) => haystack.includes(token)))
        );
      })
      .sort((a, b) => scorePreset(b) - scorePreset(a))
      .slice(0, 8);
  }, [allFoodPresets, foodSearch, libraryMeta.favorites, libraryMeta.recentIds, mealTypeUsageCounts]);

  const entryUsageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of nutritionEntries) {
      const key = normalizeNutritionSearchText(entry.source?.displayName || entry.name);
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [nutritionEntries]);

  // Recent reflects the foods actually in your diary (newest first). When you delete
  // an entry, the food drops out of Recent — it is not a separate sticky history.
  const recentPresets = useMemo(() => {
    // Prefer the full saved custom food (which carries both grams + serving units)
    // over the entry-derived preset when the names match.
    const savedByName = new Map<string, NutritionFoodPreset>();
    for (const food of customFoodPresets) {
      savedByName.set(normalizeNutritionSearchText(food.name), customNutritionFoodToPreset(food));
    }
    const seen = new Set<string>();
    const result: NutritionFoodPreset[] = [];
    for (const entry of nutritionEntries) {
      if (!entry.source) continue;
      const key = normalizeNutritionSearchText(entry.source.displayName);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(savedByName.get(key) || presetFromEntrySource(entry.source, `recent-${entry.id}`));
      if (result.length >= 25) break;
    }
    return result;
  }, [nutritionEntries, customFoodPresets]);

  const frequentPresets = useMemo(
    () =>
      allFoodPresets
        .map((preset) => ({ preset, count: entryUsageCounts.get(normalizeNutritionSearchText(preset.name)) || 0 }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 25)
        .map((item) => item.preset),
    [allFoodPresets, entryUsageCounts],
  );

  // Merged "Recent" list: recently used + frequently used, deduped (one category).
  const usedPresets = useMemo(() => {
    const seen = new Set<string>();
    const out: NutritionFoodPreset[] = [];
    for (const p of [...recentPresets, ...frequentPresets]) {
      const key = normalizeNutritionSearchText(p.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  }, [recentPresets, frequentPresets]);
  const savedPresets = useMemo(() => customFoodPresets.map(customNutritionFoodToPreset), [customFoodPresets]);
  const visibleCatalogResults = useMemo(() => {
    const existingKeys = new Set(
      allFoodPresets.map((item) => `${(item.brand || '').trim().toLowerCase()}::${item.name.trim().toLowerCase()}::${item.baseMode || '100g'}`),
    );
    return catalogResults.filter((item) => {
      const key = `${(item.brand || '').trim().toLowerCase()}::${item.name.trim().toLowerCase()}::${item.baseMode || '100g'}`;
      return !existingKeys.has(key);
    });
  }, [allFoodPresets, catalogResults]);
  const hasExactFoodMatch = useMemo(() => {
    const query = normalizeNutritionSearchText(foodSearch);
    if (!query) return false;
    return [...allFoodPresets, ...catalogResults].some((item) => {
      const title = item.brand?.trim() ? `${item.brand.trim()} ${item.name}` : item.name;
      const normalizedTitle = normalizeNutritionSearchText(title);
      const normalizedBrand = normalizeNutritionSearchText(item.brand);
      return normalizeNutritionSearchText(item.name) === query || normalizedTitle === query || normalizedBrand === query;
    });
  }, [allFoodPresets, catalogResults, foodSearch]);
  const todayDateKey = useMemo(() => toDateKey(new Date()), []);
  const weeks = useMemo(() => buildNutritionWeeks(nutritionEntries), [nutritionEntries]);

  const scrollToCurrentWeek = (animated: boolean) => {
    if (weekViewportWidth <= 0) return;
    weekScrollRef.current?.scrollTo({ x: NUTRITION_WEEK_RADIUS * weekViewportWidth, animated });
  };

  useEffect(() => {
    scrollToCurrentWeek(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekViewportWidth]);
  const selectedDateLabel = selectedDateKey === todayDateKey ? 'Today' : formatReadableDate(selectedDateKey);
  // The weight/volume unit (g or ml) of the food's base, used for labels.
  const baseUnitLabel = (selectedPreset?.baseMode || '100g') === '100ml' ? 'ml' : 'g';
  const isLiquidPreset = (selectedPreset?.baseMode || '100g') === '100ml';
  // A tablespoon: 15 g/ml. Available for liquids, tagged semi-liquids, and foods whose
  // name reads as a spoonable dry/sticky product (flour, sugar, cocoa, honey, sauce…).
  const SPOON_SIZE = 15;
  const SPOONABLE_NAME_HINTS = [
    'flour', 'sugar', 'cocoa', 'starch', 'semolina', 'powder', 'honey', 'jam', 'jelly',
    'ketchup', 'mayonnaise', 'mustard', 'sauce', 'syrup', 'spread', 'hummus', 'tahini',
    'oil', 'butter', 'yogurt', 'yoghurt', 'cream', 'paste', 'pesto', 'condensed milk', 'bran',
  ];
  const spoonable =
    !!selectedPreset &&
    selectedPreset.baseMode !== 'serving' &&
    (isLiquidPreset ||
      selectedPreset.spoonable === true ||
      SPOONABLE_NAME_HINTS.some((hint) => selectedPreset.name.toLowerCase().includes(hint)));
  // Real serving weight only (no faked "1 serving = 100 g").
  const servingWeight =
    selectedPreset && selectedPreset.baseMode !== 'serving' && selectedPreset.servingGrams && selectedPreset.servingGrams > 0
      ? selectedPreset.servingGrams
      : 0;
  // Build a weight-based "1 portion" preset (serving or spoon) on the per-100 basis.
  const buildPortionPreset = (base: NutritionFoodPreset, weight: number, label: string): NutritionFoodPreset => {
    const f = weight / 100;
    return {
      ...base,
      baseMode: 'serving',
      baseQuantity: 1,
      baseAmount: label,
      caloriesPer100g: Math.round(base.caloriesPer100g * f),
      proteinPer100g: Math.round(base.proteinPer100g * f * 10) / 10,
      fatPer100g: Math.round(base.fatPer100g * f * 10) / 10,
      carbsPer100g: Math.round(base.carbsPer100g * f * 10) / 10,
    };
  };
  const servingLoggingPreset: NutritionFoodPreset | null = (() => {
    if (!selectedPreset) return null;
    if (selectedPreset.serving) {
      return {
        ...selectedPreset,
        baseMode: 'serving',
        baseQuantity: 1,
        baseAmount: 'per 1 serving',
        caloriesPer100g: selectedPreset.serving.calories,
        proteinPer100g: selectedPreset.serving.protein,
        fatPer100g: selectedPreset.serving.fat,
        carbsPer100g: selectedPreset.serving.carbs,
      };
    }
    if (servingWeight > 0) {
      return buildPortionPreset(selectedPreset, servingWeight, `per serving (${servingWeight} ${baseUnitLabel})`);
    }
    return null;
  })();
  const spoonLoggingPreset: NutritionFoodPreset | null =
    selectedPreset && spoonable ? buildPortionPreset(selectedPreset, SPOON_SIZE, `per spoon (${SPOON_SIZE} ${baseUnitLabel})`) : null;
  const servingUnitLabel = `serving${
    selectedPreset?.serving
      ? selectedPreset.servingGrams && selectedPreset.servingGrams > 0
        ? ` (${selectedPreset.servingGrams} ${baseUnitLabel})`
        : ''
      : servingWeight > 0
        ? ` (${servingWeight} ${baseUnitLabel})`
        : ''
  }`;
  const spoonUnitLabel = `spoon (${SPOON_SIZE} ${baseUnitLabel})`;
  const effectiveLoggingPreset =
    loggingUnit === 'serving' && servingLoggingPreset
      ? servingLoggingPreset
      : loggingUnit === 'spoon' && spoonLoggingPreset
        ? spoonLoggingPreset
        : selectedPreset;
  const currentUnitLabel =
    loggingUnit === 'serving' ? servingUnitLabel : loggingUnit === 'spoon' ? spoonUnitLabel : baseUnitLabel;
  // Only applicable units are shown; inapplicable ones are hidden. Order: base, spoon, serving.
  const logUnits: Array<{ kind: 'base' | 'spoon' | 'serving'; label: string }> = selectedPreset
    ? [
        ...(selectedPreset.baseMode !== 'serving' ? [{ kind: 'base' as const, label: baseUnitLabel }] : []),
        ...(spoonLoggingPreset ? [{ kind: 'spoon' as const, label: spoonUnitLabel }] : []),
        ...(servingLoggingPreset || selectedPreset.baseMode === 'serving'
          ? [{ kind: 'serving' as const, label: servingUnitLabel }]
          : []),
      ]
    : [];
  const selectedPresetValues = effectiveLoggingPreset ? getNutritionValuesForGrams(effectiveLoggingPreset, draftGrams) : null;
  const selectedPresetBaseMode = effectiveLoggingPreset?.baseMode || '100g';
  const selectedPresetReference = effectiveLoggingPreset
    ? effectiveLoggingPreset.baseMode === 'serving'
      ? {
          label: 'Per 1 serving',
          values: getNutritionValuesForGrams(effectiveLoggingPreset, '1'),
        }
      : {
          label: effectiveLoggingPreset.baseAmount,
          values: {
            calories: String(effectiveLoggingPreset.caloriesPer100g),
            protein: String(effectiveLoggingPreset.proteinPer100g),
            fat: String(effectiveLoggingPreset.fatPer100g),
            carbs: String(effectiveLoggingPreset.carbsPer100g),
          },
        }
    : null;
  const customHasPer100 =
    (Number(draftCalories.replace(',', '.')) || 0) > 0 ||
    (Number(draftProtein.replace(',', '.')) || 0) > 0 ||
    (Number(draftFat.replace(',', '.')) || 0) > 0 ||
    (Number(draftCarbs.replace(',', '.')) || 0) > 0;
  const customPreviewServing = !customHasPer100 && (Number(draftServingCalories.replace(',', '.')) || 0) > 0;
  const customFoodPreviewPreset = useMemo<NutritionFoodPreset | null>(() => {
    if (!customFoodMode || !draftMealName.trim()) return null;
    // When only per-serving was filled, preview/log that serving directly.
    if (customPreviewServing) {
      return {
        id: 'custom-preview',
        name: draftMealName.trim(),
        baseAmount: 'per 1 serving',
        baseMode: 'serving',
        baseQuantity: 1,
        caloriesPer100g: Number(draftServingCalories.replace(',', '.')) || 0,
        proteinPer100g: Number(draftServingProtein.replace(',', '.')) || 0,
        fatPer100g: Number(draftServingFat.replace(',', '.')) || 0,
        carbsPer100g: Number(draftServingCarbs.replace(',', '.')) || 0,
      };
    }
    return {
      id: 'custom-preview',
      name: draftMealName.trim(),
      baseAmount: `per 100 ${customServingType === '100ml' ? 'ml' : 'g'}`,
      baseMode: customServingType,
      baseQuantity: 100,
      caloriesPer100g: Number(draftCalories.replace(',', '.')) || 0,
      proteinPer100g: Number(draftProtein.replace(',', '.')) || 0,
      fatPer100g: Number(draftFat.replace(',', '.')) || 0,
      carbsPer100g: Number(draftCarbs.replace(',', '.')) || 0,
    };
  }, [customFoodMode, customServingType, customPreviewServing, draftCalories, draftCarbs, draftFat, draftMealName, draftProtein, draftServingCalories, draftServingProtein, draftServingFat, draftServingCarbs]);
  const customFoodPreviewValues = useMemo(() => {
    if (!customFoodPreviewPreset) return null;
    const amount = customFoodPreviewPreset.baseMode === 'serving' ? '1' : draftGrams || '100';
    return getNutritionValuesForGrams(customFoodPreviewPreset, amount);
  }, [customFoodPreviewPreset, draftGrams]);
  const nutritionProgress = plan
    ? [
        { key: 'calories', label: 'Calories', current: totals.calories, target: plan.calories, unit: 'kcal' },
        { key: 'protein', label: 'Protein', current: totals.protein, target: plan.protein, unit: 'g' },
        { key: 'carbs', label: 'Carbs', current: totals.carbs, target: plan.carbs, unit: 'g' },
        { key: 'fat', label: 'Fat', current: totals.fat, target: plan.fat, unit: 'g' },
      ].map((item) => {
        const ratio = item.target > 0 ? item.current / item.target : 0;
        // The norm fills the whole track: 100% = full bar. Over-target just caps the
        // fill at 100% and turns it red, with the exact excess shown next to the value.
        const fill = Math.min(ratio, 1);
        const isOver = ratio > 1;
        const over = Math.max(0, Math.round(item.current - item.target));
        const overPercent = Math.max(0, Math.round((ratio - 1) * 100));
        // Only the calories bar turns red on overflow; macros stay blue and just
        // surface the excess amount as text.
        const color = item.key === 'calories' && isOver ? '#ef4444' : colors.primary;
        return { ...item, ratio, fill, isOver, over, overPercent, color };
      })
    : [];

  const loggedDates = useMemo(() => {
    const set = new Set<string>();
    for (const entry of nutritionEntries) set.add(entry.date);
    return set;
  }, [nutritionEntries]);

  const nutritionStreak = useMemo(() => {
    let count = 0;
    const cursor = new Date();
    for (let i = 0; i < 366; i += 1) {
      if (!loggedDates.has(toDateKey(cursor))) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [loggedDates]);

  useEffect(() => {
    const query = foodSearch.trim();
    if (customFoodMode || photoEstimateMode || !activeMealType || query.length < 2) {
      setCatalogResults([]);
      setCatalogSearchLoading(false);
      setCatalogSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setCatalogSearchLoading(true);
      setCatalogSearchError(null);
      try {
        const results = await searchNutritionCatalog(query, {
          signal: controller.signal,
          usdaApiKey,
        });
        setCatalogResults(results);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setCatalogResults([]);
        setCatalogSearchError('Could not reach the nutrition database right now.');
      } finally {
        if (!controller.signal.aborted) setCatalogSearchLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeMealType, customFoodMode, foodSearch, photoEstimateMode, usdaApiKey]);

  useEffect(() => {
    persistNutritionLibraryMeta(libraryMeta);
  }, [libraryMeta]);

  useEffect(() => {
    if (!quickActionRequest || quickActionRequest.type !== 'add-meal') return;
    setSelectedDateKey(todayDateKey);
    scrollToCurrentWeek(false);
    setAddFoodFlow('search');
    setPhotoEstimateMode(false);
    setCustomFoodMode(false);
    setFoodSearch('');
    setCatalogResults([]);
    setCatalogSearchError(null);
    setSelectedPreset(null);
    setDraftMealName('');
    setDraftGrams('100');
    setDraftCalories('');
    setDraftProtein('');
    setDraftFat('');
    setDraftCarbs('');
    setActiveMealType(quickActionRequest.mealType);
  }, [quickActionRequest, todayDateKey]);

  function createUuid() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function savePresetToLibrary(preset: NutritionFoodPreset) {
    if (preset.source && preset.source !== 'custom') {
      const cachedPreset = nutritionPresetToCustomFood(preset);
      onCustomFoodPresetsChange((prev) => {
        const filtered = prev.filter((item) => item.id !== cachedPreset.id);
        return [cachedPreset, ...filtered];
      });
    }
  }

  function quickAddPreset(item: NutritionFoodPreset) {
    if (!activeMealType) return;
    const baseMode = item.baseMode || '100g';
    const amount =
      baseMode === 'serving'
        ? String(item.baseQuantity || 1)
        : item.servingGrams && item.servingGrams > 0
          ? String(item.servingGrams)
          : '100';
    const values = getNutritionValuesForGrams(item, amount);
    const entry: NutritionFoodEntry = {
      id: createUuid(),
      name: formatNutritionEntryName({
        name: item.name,
        grams: amount,
        customBrand: item.brand || '',
        customFoodMode: baseMode !== '100g',
        customServingType: baseMode,
      }),
      mealType: activeMealType,
      date: selectedDateKey,
      calories: values.calories,
      protein: values.protein,
      fat: values.fat,
      carbs: values.carbs,
      source: {
        displayName: item.name,
        brand: item.brand,
        grams: amount,
        baseMode,
        baseQuantity: item.baseQuantity || (baseMode === 'serving' ? 1 : 100),
        caloriesPer100g: item.caloriesPer100g,
        proteinPer100g: item.proteinPer100g,
        fatPer100g: item.fatPer100g,
        carbsPer100g: item.carbsPer100g,
        servingGrams: item.servingGrams,
      },
    };
    onNutritionEntriesChange((prev) => [entry, ...prev]);
    registerRecentPreset(item.id);
    if (item.source && item.source !== 'custom') savePresetToLibrary(item);
    setSessionAddedCount((prev) => prev + 1);
    setSessionAddedName(item.name);
    setQuickAddedIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
  }

  function quickAddSelected() {
    if (!effectiveLoggingPreset || !activeMealType || cardAddedFlash) return;
    const logPreset = effectiveLoggingPreset;
    const baseMode = logPreset.baseMode || '100g';
    const grams = draftGrams || (baseMode === 'serving' ? '1' : '100');
    const values = getNutritionValuesForGrams(logPreset, grams);
    const entry: NutritionFoodEntry = {
      id: createUuid(),
      name: formatNutritionEntryName({
        name: logPreset.name,
        grams,
        customBrand: logPreset.brand || '',
        customFoodMode: baseMode !== '100g',
        customServingType: baseMode,
      }),
      mealType: activeMealType,
      date: selectedDateKey,
      calories: values.calories,
      protein: values.protein,
      fat: values.fat,
      carbs: values.carbs,
      source: {
        displayName: logPreset.name,
        brand: logPreset.brand,
        grams,
        baseMode,
        baseQuantity: logPreset.baseQuantity || (baseMode === 'serving' ? 1 : 100),
        caloriesPer100g: logPreset.caloriesPer100g,
        proteinPer100g: logPreset.proteinPer100g,
        fatPer100g: logPreset.fatPer100g,
        carbsPer100g: logPreset.carbsPer100g,
        servingGrams: logPreset.servingGrams,
      },
    };
    onNutritionEntriesChange((prev) => [entry, ...prev]);
    registerRecentPreset(logPreset.id);
    if (logPreset.source && logPreset.source !== 'custom') savePresetToLibrary(logPreset);
    setSessionAddedCount((prev) => prev + 1);
    setSessionAddedName(logPreset.name);
    // Fill the circle with a check briefly, then return to search for the next product.
    setCardAddedFlash(true);
    setTimeout(() => {
      setCardAddedFlash(false);
      setSelectedPreset(null);
      setLoggingUnit('base');
      setDraftMealName('');
      setDraftCalories('');
      setDraftProtein('');
      setDraftFat('');
      setDraftCarbs('');
      setDraftGrams('100');
      setFoodSearch('');
      setAddTab('recent');
    }, 550);
  }

  function registerRecentPreset(presetId: string) {
    setLibraryMeta((prev) => ({
      ...prev,
      recentIds: [presetId, ...prev.recentIds.filter((item) => item !== presetId)].slice(0, 14),
    }));
  }

  function toggleFavoritePreset(preset: NutritionFoodPreset) {
    savePresetToLibrary(preset);
    setLibraryMeta((prev) => {
      const exists = prev.favorites.includes(preset.id);
      return {
        favorites: exists ? prev.favorites.filter((item) => item !== preset.id) : [preset.id, ...prev.favorites].slice(0, 14),
        recentIds: exists ? prev.recentIds : [preset.id, ...prev.recentIds.filter((item) => item !== preset.id)].slice(0, 14),
      };
    });
  }

  function applyPresetSelection(item: NutritionFoodPreset) {
    const displayTitle = item.brand?.trim() ? `${item.brand.trim()} ${item.name}` : item.name;
    const baseMode = item.baseMode || '100g';
    const startServing = baseMode === 'serving';
    // Grams/ml default to 100; the serving weight only applies to the serving unit.
    const defaultAmount = startServing ? '1' : '100';
    const next = getNutritionValuesForGrams(item, defaultAmount);
    setSelectedPreset(item);
    setLoggingUnit(startServing ? 'serving' : 'base');
    setUnitPickerOpen(false);
    setDraftMealName(displayTitle);
    setDraftCalories(next.calories);
    setDraftProtein(next.protein);
    setDraftFat(next.fat);
    setDraftCarbs(next.carbs);
    setCustomServingType(baseMode === 'serving' ? '100g' : baseMode);
    setDraftGrams(defaultAmount);
    setFoodSearch(displayTitle);
  }

  function openMealAdder(mealKey: NutritionMealType) {
    setEditingEntryId(null);
    setAddTab('recent');
    setSessionAddedCount(0);
    setSessionAddedName('');
    setQuickAddedIds([]);
    setActiveMealType(mealKey);
    setDraftMealName('');
    setDraftCalories('');
    setDraftProtein('');
    setDraftFat('');
    setDraftCarbs('');
    setFoodSearch('');
    setDraftGrams('100');
    setSelectedPreset(null);
    setAddFoodFlow('search');
    setCustomFoodMode(false);
    setPhotoEstimateMode(false);
    setCustomBrand('');
    setCustomBarcode('');
    setCustomServingGrams('');
    setDraftServingCalories('');
    setDraftServingProtein('');
    setDraftServingFat('');
    setDraftServingCarbs('');
    setLoggingUnit('base');
    setCustomServingType('100g');
    setMealPhotoError(null);
    setMealPhotoNote(null);
    setMealPhotoConfidence(null);
  }

  function removeNutritionEntry(entryId: string) {
    onNutritionEntriesChange((prev) => prev.filter((entry) => entry.id !== entryId));
  }

  function editNutritionEntry(entry: NutritionFoodEntry) {
    const source = entry.source;
    if (!source) return;
    const preset = presetFromEntrySource(source, `entry-src-${entry.id}`);
    const values = getNutritionValuesForGrams(preset, source.grams);
    setEditingEntryId(entry.id);
    setActiveMealType(entry.mealType);
    setSelectedPreset(preset);
    setLoggingUnit(source.baseMode === 'serving' ? 'serving' : 'base');
    setDraftMealName(source.displayName);
    setDraftCalories(values.calories);
    setDraftProtein(values.protein);
    setDraftFat(values.fat);
    setDraftCarbs(values.carbs);
    setCustomServingType(source.baseMode);
    setDraftGrams(source.grams);
    setFoodSearch(source.displayName);
    setAddFoodFlow('search');
    setCustomFoodMode(false);
    setPhotoEstimateMode(false);
    setExpandedMeal(null);
  }

  function editCustomFood(item: NutritionFoodPreset) {
    const isServingBase = (item.baseMode || '100g') === 'serving';
    const serv =
      item.serving ||
      (isServingBase
        ? {
            calories: item.caloriesPer100g,
            protein: item.proteinPer100g,
            fat: item.fatPer100g,
            carbs: item.carbsPer100g,
          }
        : null);
    setCustomFoodMode(true);
    setPhotoEstimateMode(false);
    setEditingEntryId(null);
    setEditingCustomFoodId(item.id);
    setSelectedPreset(null);
    setLoggingUnit('base');
    setUnitPickerOpen(false);
    setDraftMealName(item.name);
    setCustomBrand(item.brand || '');
    setCustomBarcode(item.barcode || '');
    setCustomServingType(item.baseMode === '100ml' ? '100ml' : '100g');
    setDraftCalories(isServingBase ? '' : String(item.caloriesPer100g ?? ''));
    setDraftProtein(isServingBase ? '' : String(item.proteinPer100g ?? ''));
    setDraftFat(isServingBase ? '' : String(item.fatPer100g ?? ''));
    setDraftCarbs(isServingBase ? '' : String(item.carbsPer100g ?? ''));
    setDraftServingCalories(serv ? String(serv.calories ?? '') : '');
    setDraftServingProtein(serv ? String(serv.protein ?? '') : '');
    setDraftServingFat(serv ? String(serv.fat ?? '') : '');
    setDraftServingCarbs(serv ? String(serv.carbs ?? '') : '');
    setCustomServingGrams(item.servingGrams ? String(item.servingGrams) : '');
    setDraftGrams('100');
    setAddFoodFlow('search');
    setFoodSearch('');
    setExpandedMeal(null);
  }

  function renderPresetRow(item: NutritionFoodPreset, nameOnly = false) {
    const isLiquid = (item.baseMode || '100g') === '100ml';
    const usePiece = !!item.pieceLabel && !!item.servingGrams;
    const portionLabel = usePiece
      ? `${item.pieceLabel} (${item.servingGrams} ${isLiquid ? 'ml' : 'g'})`
      : isLiquid
        ? '100 ml'
        : '100 g';
    const rowKcal = usePiece
      ? Math.round((item.caloriesPer100g * (item.servingGrams as number)) / 100)
      : Math.round(item.caloriesPer100g);
    const infoLine = `${item.brand?.trim() ? `${item.brand.trim()} · ` : ''}${portionLabel} · ${rowKcal} kcal`;
    return (
      <Pressable key={item.id} style={styles.catalogResultCard} onPress={() => applyPresetSelection(item)}>
        <View style={styles.catalogResultCopy}>
          <Text style={styles.catalogResultTitle} numberOfLines={1}>{item.name}</Text>
          {nameOnly ? null : <Text style={styles.catalogResultSubtitle} numberOfLines={1}>{infoLine}</Text>}
        </View>
        <View style={styles.catalogResultActions}>
          <Pressable
            style={[styles.favoritePill, libraryMeta.favorites.includes(item.id) && styles.favoritePillActive]}
            onPress={(event) => {
              event.stopPropagation?.();
              toggleFavoritePreset(item);
            }}
          >
            <Text style={[styles.favoritePillText, libraryMeta.favorites.includes(item.id) && styles.favoritePillTextActive]}>★</Text>
          </Pressable>
          {item.isCustom ? (
            <Pressable
              style={styles.editPresetPill}
              onPress={(event) => {
                event.stopPropagation?.();
                editCustomFood(item);
              }}
            >
              <Text style={styles.editPresetPillText}>✎</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.quickAddPill, quickAddedIds.includes(item.id) && styles.quickAddPillActive]}
            onPress={(event) => {
              event.stopPropagation?.();
              quickAddPreset(item);
            }}
          >
            {quickAddedIds.includes(item.id) ? <Text style={styles.quickAddPillText}>✓</Text> : null}
          </Pressable>
        </View>
      </Pressable>
    );
  }

  function applyDraftGrams(value: string) {
    const grams = cleanNutritionNumber(value);
    setDraftGrams(grams);
    if (effectiveLoggingPreset) {
      const next = getNutritionValuesForGrams(effectiveLoggingPreset, grams);
      setDraftCalories(next.calories);
      setDraftProtein(next.protein);
      setDraftFat(next.fat);
      setDraftCarbs(next.carbs);
    }
  }

  function setLoggingMode(kind: 'base' | 'spoon' | 'serving') {
    setLoggingUnit(kind);
    const target =
      kind === 'serving' && servingLoggingPreset
        ? servingLoggingPreset
        : kind === 'spoon' && spoonLoggingPreset
          ? spoonLoggingPreset
          : selectedPreset;
    // base (g/ml) → 100; spoon/serving → 1 portion.
    const nextAmount = kind === 'base' ? '100' : '1';
    setDraftGrams(nextAmount);
    if (target) {
      const v = getNutritionValuesForGrams(target, nextAmount);
      setDraftCalories(v.calories);
      setDraftProtein(v.protein);
      setDraftFat(v.fat);
      setDraftCarbs(v.carbs);
    }
  }

  async function openBarcodeScanner() {
    try {
      // On web the browser prompts for camera access via getUserMedia inside the scanner
      // component; the expo-camera permission gate only applies to native builds.
      if (Platform.OS !== 'web' && !cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          Alert.alert('Permission needed', 'Allow camera access to scan product barcodes.');
          return;
        }
      }
      setBarcodeLookupError(null);
      setManualBarcode('');
      setAddFoodFlow('scan');
      setBarcodeCameraOpen(true);
    } catch {
      Alert.alert('Camera unavailable', 'Could not open the barcode scanner right now.');
    }
  }

  async function captureMealPhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow camera access to estimate meal calories from a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      const asset = result.assets[0];
      const assetBase64 = asset.base64;
      if (!assetBase64) return;
      setMealPhotoLoading(true);
      setMealPhotoError(null);
      setMealPhotoNote(null);
      setMealPhotoConfidence(null);
      const estimate = await analyzeMealPhoto({
        imageBase64: assetBase64,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      if (!estimate) {
        setMealPhotoError('We could not estimate this meal from the photo.');
        return;
      }
      setPhotoEstimateMode(true);
      setCustomFoodMode(true);
      setSelectedPreset(null);
      setDraftMealName(estimate.mealName);
      setCustomBrand('');
      setCustomServingType('100g');
      setDraftGrams(String(Math.max(1, Math.round(estimate.estimatedAmountGrams || 100))));
      setDraftCalories(String(Math.round(estimate.caloriesPer100g * 10) / 10));
      setDraftProtein(String(Math.round(estimate.proteinPer100g * 10) / 10));
      setDraftFat(String(Math.round(estimate.fatPer100g * 10) / 10));
      setDraftCarbs(String(Math.round(estimate.carbsPer100g * 10) / 10));
      setFoodSearch(estimate.mealName);
      setAddFoodFlow('photo');
      setMealPhotoConfidence(estimate.confidence || null);
      setMealPhotoNote(
        [estimate.note, estimate.detectedFoods?.length ? `Detected: ${estimate.detectedFoods.join(', ')}` : null]
          .filter(Boolean)
          .join(' · '),
      );
    } catch {
      setMealPhotoError('Could not analyze the meal photo right now.');
    } finally {
      setMealPhotoLoading(false);
    }
  }

  async function estimateByName() {
    if (aiEstimateLoading) return;
    const name = (foodSearch.trim() || draftMealName.trim());
    if (!name) {
      setMealPhotoError('Type a dish name first, then tap AI.');
      return;
    }
    setAiEstimateLoading(true);
    setMealPhotoError(null);
    try {
      const estimate = await estimateMealByText(name);
      if (!estimate) {
        setMealPhotoError('AI could not estimate this dish. Try a clearer name.');
        return;
      }
      setPhotoEstimateMode(true);
      setCustomFoodMode(true);
      setSelectedPreset(null);
      setEditingEntryId(null);
      setDraftMealName(estimate.mealName);
      setCustomBrand('');
      setCustomBarcode('');
      setCustomServingGrams('');
      setDraftServingCalories('');
      setDraftServingProtein('');
      setDraftServingFat('');
      setDraftServingCarbs('');
      setLoggingUnit('base');
      setCustomServingType('100g');
      setDraftGrams(String(Math.max(1, Math.round(estimate.estimatedAmountGrams || 100))));
      setDraftCalories(String(estimate.caloriesPer100g));
      setDraftProtein(String(estimate.proteinPer100g));
      setDraftFat(String(estimate.fatPer100g));
      setDraftCarbs(String(estimate.carbsPer100g));
      setFoodSearch(estimate.mealName);
      setMealPhotoConfidence(estimate.confidence || null);
      setMealPhotoNote(
        [estimate.note, estimate.detectedFoods?.length ? `Includes: ${estimate.detectedFoods.join(', ')}` : null]
          .filter(Boolean)
          .join(' · '),
      );
    } catch {
      setMealPhotoError('Could not reach the AI estimator right now.');
    } finally {
      setAiEstimateLoading(false);
    }
  }

  async function handleBarcodeScanned(data?: string) {
    const code = (data || '').trim();
    if (!code || barcodeLookupBusy) return;
    setBarcodeLookupBusy(true);
    setBarcodeLookupError(null);
    try {
      // Local-first: a product entered or scanned before is remembered by barcode and resolves instantly (offline too).
      const remembered = customFoodPresets.find((food) => food.barcode === code || food.id === `off-${code}`);
      const preset = remembered ? customNutritionFoodToPreset(remembered) : await lookupNutritionBarcode(code);
      if (!preset) {
        setBarcodeLookupError('We found the barcode, but there is no product data for it yet. Add it once and it will be remembered.');
        return;
      }
      const displayTitle = preset.brand?.trim() ? `${preset.brand.trim()} ${preset.name}` : preset.name;
      const baseMode = preset.baseMode || '100g';
      const defaultAmount =
        baseMode === 'serving'
          ? String(preset.baseQuantity || 1)
          : preset.servingGrams && preset.servingGrams > 0
            ? String(preset.servingGrams)
            : String(preset.baseQuantity || 100);
      const next = getNutritionValuesForGrams(preset, defaultAmount);
      setSelectedPreset(preset);
      setDraftMealName(displayTitle);
      setDraftCalories(next.calories);
      setDraftProtein(next.protein);
      setDraftFat(next.fat);
      setDraftCarbs(next.carbs);
      setCustomServingType(baseMode);
      setDraftGrams(defaultAmount);
      setCustomBarcode(code);
      setManualBarcode('');
      setFoodSearch(displayTitle);
      setAddFoodFlow('scan');
      setBarcodeCameraOpen(false);
      if (!remembered) savePresetToLibrary(preset);
    } catch {
      setBarcodeLookupError('Could not load product details from the barcode right now.');
    } finally {
      setBarcodeLookupBusy(false);
    }
  }

  return (
    <>
      {renderInlineContent ? (
        <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="Meals Today">
        <View style={styles.weekTitleWrap}>
          <Text style={styles.weekTitle}>{selectedDateLabel}</Text>
          <Text style={styles.weekSubtitle}>{formatReadableDate(selectedDateKey)}</Text>
        </View>
        <ScrollView
          ref={weekScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={(event) => setWeekViewportWidth(event.nativeEvent.layout.width)}
        >
          {weeks.map((week) => (
            <View key={week.key} style={[styles.weekPage, weekViewportWidth ? { width: weekViewportWidth } : null]}>
              {week.days.map((day) => {
                const active = day.dateKey === selectedDateKey;
                const today = day.dateKey === todayDateKey;
                const hovered = day.dateKey === hoveredDateKey;
                return (
                  <Pressable
                    key={day.dateKey}
                    style={[
                      styles.weekDayCard,
                      today && styles.weekDayCardToday,
                      hovered && styles.weekDayCardHover,
                      active && styles.weekDayCardActive,
                      today && hovered && styles.weekDayCardTodayHover,
                      today && active && hovered && styles.weekDayCardTodayActiveHover,
                    ]}
                    onPress={() => setSelectedDateKey(day.dateKey)}
                    onHoverIn={() => setHoveredDateKey(day.dateKey)}
                    onHoverOut={() => setHoveredDateKey(null)}
                  >
                    <Text style={[styles.weekDayName, today && styles.weekDayNameToday, active && styles.weekDayNameActive, today && hovered && styles.weekDayTextTodayHover]}>{day.weekday}</Text>
                    <Text style={[styles.weekDayNumber, today && styles.weekDayNumberToday, active && styles.weekDayNumberActive, today && hovered && styles.weekDayTextTodayHover]}>{day.dayNumber}</Text>
                    {loggedDates.has(day.dateKey) ? (
                      <View style={styles.weekDayCheck}>
                        <Text style={styles.weekDayCheckText}>✓</Text>
                      </View>
                    ) : (
                      <View style={styles.weekDayCheckPlaceholder} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
        {nutritionStreak > 0 ? (
          <View style={styles.streakRow}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={styles.streakText}>
              {`${nutritionStreak}-day logging streak`}
            </Text>
          </View>
        ) : null}
        <View style={styles.todaySummaryBar}>
          <View style={styles.todaySummaryPrimary}>
            <Text style={styles.todaySummaryLabel}>{plan ? 'Calories left' : 'Selected day eaten'}</Text>
            <View style={styles.todaySummaryHeadline}>
              <Text style={styles.todaySummaryCalories}>
                {plan ? Math.max(0, Math.round(plan.calories - totals.calories)) : totals.calories}
              </Text>
              <Text style={styles.todaySummaryCaloriesTarget}>{plan ? 'left' : 'kcal'}</Text>
            </View>
            {plan && totals.calories > plan.calories ? (
              <Text style={styles.todaySummaryOver}>
                {`+${Math.round(totals.calories - plan.calories)} kcal over`}
              </Text>
            ) : null}
          </View>
          {plan ? (
            <View style={styles.macroBars}>
              {nutritionProgress.map((item) => (
                <View key={item.key} style={styles.macroBarRow}>
                  <View style={styles.macroBarHeader}>
                    <Text style={styles.macroBarLabel}>{item.label}</Text>
                    <Text style={styles.macroBarValue}>
                      <Text style={[styles.macroBarCurrent, { color: item.color }]}>
                        {Math.round(item.current)}
                      </Text>
                      <Text style={styles.macroBarTarget}>
                        {` / ${Math.round(item.target)} ${item.unit}`}
                      </Text>
                      {item.isOver ? (
                        <Text style={[styles.macroBarOver, { color: item.color }]}>
                          {`  +${item.over} ${item.unit} (${item.overPercent}%)`}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                  <View style={styles.macroBarTrack}>
                    <View
                      style={[
                        styles.macroBarFill,
                        { width: `${item.fill * 100}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.mealCardsWrap}>
          {mealData.map((section) => {
            const hasEntries = section.entries.length > 0;
            const isExpanded = expandedMeal === section.key;
            return (
            <View key={section.key} style={styles.mealRowCard}>
              <View style={styles.mealRowHeader}>
                <Pressable
                  style={styles.mealRowMain}
                  onPress={() => (hasEntries ? setExpandedMeal((prev) => (prev === section.key ? null : section.key)) : openMealAdder(section.key))}
                >
                  <View style={styles.mealTitleWrap}>
                    <View style={[styles.mealIconBadge, { backgroundColor: `${section.accent}18`, borderColor: `${section.accent}4D` }]}>
                      <Text style={[styles.mealIconText, { color: section.accent }]}>{section.icon}</Text>
                    </View>
                    <View style={styles.mealHeaderCopy}>
                      <Text style={styles.mealTitle}>{section.title}</Text>
                      <Text style={styles.mealRowMeta}>
                        {hasEntries
                          ? `${section.entries.length} item${section.entries.length === 1 ? '' : 's'} • ${isExpanded ? 'tap to collapse' : 'tap to view'}`
                          : 'Tap + to add foods'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.mealCaloriesCol}>
                    <Text style={styles.mealCaloriesValue}>{section.totals.calories}</Text>
                    <Text style={styles.mealCaloriesLabel}>kcal</Text>
                  </View>
                </Pressable>
                <Pressable style={styles.addMealBtn} onPress={() => openMealAdder(section.key)}>
                  <Text style={styles.addMealBtnText}>+</Text>
                </Pressable>
              </View>
              {isExpanded && hasEntries ? (
                <View style={styles.mealEntriesWrap}>
                  {section.entries.map((entry) => (
                    <View key={entry.id} style={styles.mealEntryRow}>
                      <Pressable
                        style={styles.mealEntryCopy}
                        disabled={!entry.source}
                        onPress={() => editNutritionEntry(entry)}
                      >
                        <Text style={styles.mealEntryName}>{entry.name}</Text>
                        <Text style={styles.mealEntryMeta}>
                          {`${entry.calories} kcal · P ${entry.protein} · F ${entry.fat} · C ${entry.carbs}`}
                          {entry.source ? '  ·  tap to edit' : ''}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.mealEntryDelete} onPress={() => removeNutritionEntry(entry.id)}>
                        <Text style={styles.mealEntryDeleteText}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={styles.mealAddMoreBtn} onPress={() => openMealAdder(section.key)}>
                    <Text style={styles.mealAddMoreText}>+ Add food</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            );
          })}
        </View>
      </SectionCard>

        </ScrollView>
      ) : null}

      <Modal visible={!!activeMealType} transparent animationType="fade" onRequestClose={() => { setActiveMealType(null); setEditingEntryId(null); setEditingCustomFoodId(null); setCustomFoodMode(false); }}>
        <View style={styles.modalScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setActiveMealType(null); setEditingEntryId(null); setEditingCustomFoodId(null); setCustomFoodMode(false); }} />
          <View style={styles.modalCard}>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalEyebrow}>{editingCustomFoodId ? 'Edit food' : editingEntryId ? 'Edit product' : 'Add product'}</Text>
              <Text style={styles.modalTitle}>
                {mealSections.find((item) => item.key === activeMealType)?.title || 'Meal'}
              </Text>
              <View style={styles.modalSection}>
                {!customFoodMode ? (
                  <View style={styles.searchRow}>
                    <View style={styles.searchInputWrap}>
                      <TextInput
                        placeholder="Search foods"
                        style={[styles.input, styles.searchInput]}
                        value={foodSearch}
                        onChangeText={(text) => {
                          setFoodSearch(text);
                          if (!customFoodMode || addFoodFlow === 'search') {
                            setSelectedPreset(null);
                            setDraftMealName(text);
                          }
                        }}
                      />
                    </View>
                    <View style={styles.searchToolsRow}>
                      <Pressable style={styles.toolIconBtn} onPress={openBarcodeScanner}>
                        <Text style={styles.toolIconGlyph}>▦</Text>
                        <Text style={styles.toolIconLabel}>Scan</Text>
                      </Pressable>
                      <Pressable style={styles.toolIconBtn} onPress={captureMealPhoto}>
                        <Text style={styles.toolIconGlyph}>◉</Text>
                        <Text style={styles.toolIconLabel}>Photo</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.toolIconBtn, aiEstimateLoading && styles.aiEstimateBtnDisabled]}
                        disabled={aiEstimateLoading}
                        onPress={estimateByName}
                      >
                        <Text style={styles.toolIconGlyph}>✨</Text>
                        <Text style={styles.toolIconLabel}>{aiEstimateLoading ? '…' : 'AI'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
                {barcodeLookupError ? <Text style={styles.catalogError}>{barcodeLookupError}</Text> : null}
                {mealPhotoError ? <Text style={styles.catalogError}>{mealPhotoError}</Text> : null}
                {photoEstimateMode ? (
                  <View style={styles.photoPreviewCard}>
                    <View style={styles.photoPreviewHeader}>
                      <View style={styles.photoPreviewCopy}>
                        <Text style={styles.photoPreviewTitle}>{draftMealName || 'Meal estimate'}</Text>
                        <Text style={styles.photoPreviewSubtitle}>Estimated portion: {draftGrams || '0'} g</Text>
                      </View>
                      {mealPhotoConfidence ? (
                        <View
                          style={[
                            styles.confidenceBadge,
                            mealPhotoConfidence === 'high'
                              ? styles.confidenceBadgeHigh
                              : mealPhotoConfidence === 'medium'
                                ? styles.confidenceBadgeMedium
                                : styles.confidenceBadgeLow,
                          ]}
                        >
                          <Text style={styles.confidenceBadgeText}>{mealPhotoConfidence} confidence</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.photoPreviewStats}>
                      <Text style={styles.productInfoStat}>{draftCalories || '0'} kcal / 100 g</Text>
                      <Text style={styles.productInfoStat}>P {draftProtein || '0'}</Text>
                      <Text style={styles.productInfoStat}>F {draftFat || '0'}</Text>
                      <Text style={styles.productInfoStat}>C {draftCarbs || '0'}</Text>
                    </View>
                    {mealPhotoNote ? <Text style={styles.photoPreviewNote}>{mealPhotoNote}</Text> : null}
                    <Text style={styles.photoPreviewHint}>You can edit the grams and nutrition below before saving.</Text>
                  </View>
                ) : null}
                {!customFoodMode && !selectedPreset ? (
                  <>
                    <View style={styles.addTabsRow}>
                      {([
                        { key: 'recent', label: 'Recent' },
                        { key: 'saved', label: 'Saved' },
                      ] as const).map((tab) => (
                        <Pressable
                          key={tab.key}
                          style={[styles.addTab, addTab === tab.key && styles.addTabActive]}
                          onPress={() => {
                            setAddTab(tab.key);
                            setFoodSearch('');
                          }}
                        >
                          <Text style={[styles.addTabText, addTab === tab.key && styles.addTabTextActive]}>{tab.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {sessionAddedCount > 0 ? (
                      <View style={styles.sessionAddedBanner}>
                        <Text style={styles.sessionAddedText}>
                          {`✓ Added ${sessionAddedCount} item${sessionAddedCount === 1 ? '' : 's'}${sessionAddedName ? ` · last: ${sessionAddedName}` : ''}`}
                        </Text>
                        <Text style={styles.sessionAddedHint}>Tap ✓ on a food to add it · tap a row to set grams · Done to finish</Text>
                      </View>
                    ) : null}
                    {foodSearch.trim().length >= 1 && filteredFoodPresets.length ? (
                      <View style={styles.quickSection}>
                        <View style={styles.quickSectionHeader}>
                          <Text style={styles.quickSectionTitle}>
                            {activeMealType
                              ? `Usually for ${mealSections.find((item) => item.key === activeMealType)?.title?.toLowerCase() || 'this meal'}`
                              : 'Quick suggestions'}
                          </Text>
                          <Text style={styles.quickSectionMeta}>{filteredFoodPresets.length}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScrollContent}>
                          {filteredFoodPresets.map((item) => (
                            <Pressable
                              key={item.id}
                              style={styles.presetCard}
                              onPress={() => applyPresetSelection(item)}
                            >
                              <Pressable
                                style={[styles.favoritePill, libraryMeta.favorites.includes(item.id) && styles.favoritePillActive]}
                                onPress={(event) => {
                                  event.stopPropagation?.();
                                  toggleFavoritePreset(item);
                                }}
                              >
                                <Text style={[styles.favoritePillText, libraryMeta.favorites.includes(item.id) && styles.favoritePillTextActive]}>★</Text>
                              </Pressable>
                              <Text style={styles.presetTitle}>{item.name}</Text>
                              <Text style={styles.presetServing}>{item.baseAmount}</Text>
                              <Text style={styles.presetMacros}>
                                {item.caloriesPer100g} kcal · P {item.proteinPer100g} · F {item.fatPer100g} · C {item.carbsPer100g}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    ) : null}
                    {!foodSearch.trim() && addTab === 'recent' ? (
                      <View style={styles.presetListWrap}>
                        {usedPresets.length ? (
                          usedPresets.map((p) => renderPresetRow(p, true))
                        ) : (
                          <Text style={styles.catalogEmpty}>Nothing yet — foods you add will show up here for quick re-adding.</Text>
                        )}
                      </View>
                    ) : null}
                    {!foodSearch.trim() && addTab === 'saved' ? (
                      <View style={styles.presetListWrap}>
                        {savedPresets.length ? (
                          savedPresets.map((p) => renderPresetRow(p, false))
                        ) : (
                          <Text style={styles.catalogEmpty}>No saved foods yet — scanned and custom foods are saved here.</Text>
                        )}
                      </View>
                    ) : null}
                    {foodSearch.trim() && !hasExactFoodMatch ? (
                      <Pressable
                        style={styles.customFoodBtn}
                        onPress={() => {
                          setCustomFoodMode(true);
                          setEditingCustomFoodId(null);
                          setSelectedPreset(null);
                          setDraftMealName(foodSearch.trim());
                          setDraftCalories('');
                          setDraftProtein('');
                          setDraftFat('');
                          setDraftCarbs('');
                          setDraftGrams('100');
                          setCustomBrand('');
                          setCustomBarcode('');
                          setCustomServingGrams('');
                          setDraftServingCalories('');
                          setDraftServingProtein('');
                          setDraftServingFat('');
                          setDraftServingCarbs('');
                          setLoggingUnit('base');
                          setCustomServingType('100g');
                        }}
                      >
                        <Text style={styles.customFoodBtnTitle}>Add custom food</Text>
                        <Text style={styles.customFoodBtnText}>Use this when the product is not in the list.</Text>
                      </Pressable>
                    ) : null}
                    {foodSearch.trim().length >= 2 ? (
                      <View style={styles.catalogSection}>
                        <View style={styles.catalogHeader}>
                          <View style={styles.catalogHeaderCopy}>
                            <Text style={styles.catalogTitle}>Nutrition database</Text>
                          </View>
                          <Text style={styles.catalogMeta}>
                            {catalogSearchLoading
                              ? 'Searching...'
                              : visibleCatalogResults.length
                                ? `${visibleCatalogResults.length} found`
                                : 'No matches yet'}
                          </Text>
                        </View>
                        {catalogSearchError ? <Text style={styles.catalogError}>{catalogSearchError}</Text> : null}
                        {!catalogSearchLoading && !visibleCatalogResults.length && !catalogSearchError ? (
                          <Text style={styles.catalogEmpty}>Try a more specific product name or save it manually as a custom food.</Text>
                        ) : null}
                        {visibleCatalogResults.map((item) => renderPresetRow(item))}
                      </View>
                    ) : null}
                  </>
                ) : customFoodMode ? (
                  <View style={styles.customFoodCard}>
                    <View style={styles.customFoodHeader}>
                      <View>
                        <Text style={styles.customFoodTitle}>{photoEstimateMode ? 'AI estimate' : 'Custom food'}</Text>
                        <Text style={styles.customFoodText}>
                          {photoEstimateMode
                            ? 'AI estimate of the ready dish per 100 g. Adjust the portion or nutrition if needed before saving.'
                            : `Enter nutrition from the package per ${customServingType === 'serving' ? '1 serving' : customServingType === '100ml' ? '100 ml' : '100 g'}, then choose how much was eaten.`}
                        </Text>
                        {mealPhotoNote ? <Text style={styles.customFoodText}>{mealPhotoNote}</Text> : null}
                      </View>
                      <Pressable
                        style={styles.customFoodCloseBtn}
                        onPress={() => {
                          setCustomFoodMode(false);
                          setEditingCustomFoodId(null);
                          setPhotoEstimateMode(false);
                          setCustomBrand('');
                          setCustomBarcode('');
                          setCustomServingGrams('');
                          setDraftServingCalories('');
                          setDraftServingProtein('');
                          setDraftServingFat('');
                          setDraftServingCarbs('');
                          setLoggingUnit('base');
                          setMealPhotoError(null);
                          setMealPhotoNote(null);
                        }}
                      >
                        <Text style={styles.customFoodCloseText}>Back</Text>
                      </Pressable>
                    </View>
                    <TextInput placeholder="Brand optional" style={styles.input} value={customBrand} onChangeText={setCustomBrand} />
                    <TextInput
                      placeholder="Barcode optional — saved so scanning finds this product"
                      style={styles.input}
                      value={customBarcode}
                      onChangeText={setCustomBarcode}
                      keyboardType="number-pad"
                    />
                    <View style={styles.pillRow}>
                      {[
                        { key: '100g' as const, label: 'Per 100 g' },
                        { key: '100ml' as const, label: 'Per 100 ml' },
                      ].map((option) => (
                        <Pressable
                          key={option.key}
                          style={[styles.pillBtn, customServingType === option.key && styles.pillBtnActive]}
                          onPress={() => setCustomServingType(option.key)}
                        >
                          <Text style={[styles.pillBtnText, customServingType === option.key && styles.pillBtnTextActive]}>{option.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>

              {selectedPreset && selectedPresetReference ? (
                <View style={styles.productInfoCard}>
                  <View style={styles.productInfoCopy}>
                    <Text style={styles.productInfoTitle}>{selectedPreset.name}</Text>
                    <Text style={styles.productInfoSubtitle}>{selectedPresetReference.label}</Text>
                    <View style={styles.productInfoStats}>
                      <Text style={styles.productInfoStat}>{selectedPresetReference.values.calories} kcal</Text>
                      <Text style={styles.productInfoStat}>P {selectedPresetReference.values.protein}</Text>
                      <Text style={styles.productInfoStat}>F {selectedPresetReference.values.fat}</Text>
                      <Text style={styles.productInfoStat}>C {selectedPresetReference.values.carbs}</Text>
                    </View>
                  </View>
                  {!editingEntryId ? (
                    <Pressable
                      style={[styles.cardAddPill, cardAddedFlash && styles.cardAddPillActive]}
                      onPress={quickAddSelected}
                    >
                      {cardAddedFlash ? <Text style={styles.cardAddPillText}>✓</Text> : null}
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.modalSection}>
                {selectedPreset || customFoodMode ? (
                  <>
                    {(() => {
                      const unit = customFoodMode ? customServingType : selectedPresetBaseMode;
                      const isServing = unit === 'serving';
                      // Custom-food creation keeps a plain grams field; selecting a food shows a unit picker.
                      const showUnitPicker = !customFoodMode && !!selectedPreset && logUnits.length >= 1;
                      return (
                        <>
                          <View style={styles.gramsRow}>
                            <View style={styles.gramsInputWrap}>
                              <Text style={styles.fieldLabel}>{isServing ? 'Amount' : unit === '100ml' ? 'Volume' : 'Amount'}</Text>
                              <TextInput
                                placeholder={isServing ? 'How many' : unit === '100ml' ? 'ml' : 'Grams'}
                                keyboardType="decimal-pad"
                                style={styles.input}
                                value={draftGrams}
                                onChangeText={(text) => applyDraftGrams(text)}
                              />
                            </View>
                            {showUnitPicker ? (
                              <Pressable
                                style={styles.unitSelect}
                                onPress={() => setUnitPickerOpen((prev) => !prev)}
                              >
                                <Text style={styles.unitSelectText} numberOfLines={1}>
                                  {currentUnitLabel}
                                </Text>
                                <Text style={styles.unitSelectCaret}>{unitPickerOpen ? '▴' : '▾'}</Text>
                              </Pressable>
                            ) : (
                              <View style={styles.gramsUnitChip}>
                                <Text style={styles.gramsUnitChipText}>{isServing ? servingUnitLabel : unit === '100ml' ? 'ml' : 'g'}</Text>
                              </View>
                            )}
                          </View>
                          {showUnitPicker && unitPickerOpen ? (
                            <View style={styles.unitMenu}>
                              {logUnits.map((u) => {
                                const active = u.kind === loggingUnit;
                                return (
                                  <Pressable
                                    key={u.kind}
                                    style={[styles.unitMenuItem, active && styles.unitMenuItemActive]}
                                    onPress={() => {
                                      setLoggingMode(u.kind);
                                      setUnitPickerOpen(false);
                                    }}
                                  >
                                    <Text style={[styles.unitMenuItemText, active && styles.unitMenuItemTextActive]}>
                                      {u.kind === 'base' ? u.label : `1 ${u.label}`}
                                    </Text>
                                    {active ? <Text style={styles.unitMenuCheck}>✓</Text> : null}
                                  </Pressable>
                                );
                              })}
                            </View>
                          ) : null}
                        </>
                      );
                    })()}
                    {customFoodMode ? (
                      <>
                    <View style={styles.row}>
                      <View style={styles.half}>
                        <Text style={styles.fieldLabel}>
                          Calories {customServingType === 'serving' ? 'per serving' : customServingType === '100ml' ? 'per 100 ml' : 'per 100 g'}
                        </Text>
                        <TextInput placeholder="Calories" keyboardType="number-pad" style={styles.input} value={draftCalories} onChangeText={(text) => setDraftCalories(text.replace(/[^\d]/g, '').slice(0, 4))} />
                      </View>
                      <View style={styles.half}>
                        <Text style={styles.fieldLabel}>
                          Protein {customServingType === 'serving' ? 'per serving' : customServingType === '100ml' ? 'per 100 ml' : 'per 100 g'}
                        </Text>
                        <TextInput placeholder="Protein" keyboardType="decimal-pad" style={styles.input} value={draftProtein} onChangeText={(text) => setDraftProtein(cleanNutritionNumber(text))} />
                      </View>
                    </View>
                    <View style={styles.row}>
                      <View style={styles.half}>
                        <Text style={styles.fieldLabel}>
                          Fat {customServingType === 'serving' ? 'per serving' : customServingType === '100ml' ? 'per 100 ml' : 'per 100 g'}
                        </Text>
                        <TextInput placeholder="Fat" keyboardType="decimal-pad" style={styles.input} value={draftFat} onChangeText={(text) => setDraftFat(cleanNutritionNumber(text))} />
                      </View>
                      <View style={styles.half}>
                        <Text style={styles.fieldLabel}>
                          Carbs {customServingType === 'serving' ? 'per serving' : customServingType === '100ml' ? 'per 100 ml' : 'per 100 g'}
                        </Text>
                        <TextInput placeholder="Carbs" keyboardType="decimal-pad" style={styles.input} value={draftCarbs} onChangeText={(text) => setDraftCarbs(cleanNutritionNumber(text))} />
                      </View>
                    </View>
                    <Text style={styles.servingSectionLabel}>Per 1 serving (optional)</Text>
                    <Text style={styles.servingSectionHint}>Fill this if 1 serving is logged as-is (e.g. 1 kiwi). Values are used directly, not converted.</Text>
                    <View style={styles.row}>
                      <View style={styles.half}>
                        <Text style={styles.fieldLabel}>Calories / serving</Text>
                        <TextInput placeholder="Calories" keyboardType="number-pad" style={styles.input} value={draftServingCalories} onChangeText={(text) => setDraftServingCalories(text.replace(/[^\d]/g, '').slice(0, 4))} />
                      </View>
                      <View style={styles.half}>
                        <Text style={styles.fieldLabel}>Protein / serving</Text>
                        <TextInput placeholder="Protein" keyboardType="decimal-pad" style={styles.input} value={draftServingProtein} onChangeText={(text) => setDraftServingProtein(cleanNutritionNumber(text))} />
                      </View>
                    </View>
                    <View style={styles.row}>
                      <View style={styles.half}>
                        <Text style={styles.fieldLabel}>Fat / serving</Text>
                        <TextInput placeholder="Fat" keyboardType="decimal-pad" style={styles.input} value={draftServingFat} onChangeText={(text) => setDraftServingFat(cleanNutritionNumber(text))} />
                      </View>
                      <View style={styles.half}>
                        <Text style={styles.fieldLabel}>Carbs / serving</Text>
                        <TextInput placeholder="Carbs" keyboardType="decimal-pad" style={styles.input} value={draftServingCarbs} onChangeText={(text) => setDraftServingCarbs(cleanNutritionNumber(text))} />
                      </View>
                    </View>
                    <Text style={styles.fieldLabel}>1 serving weighs (optional) — shown as the unit label, e.g. "serving (100 g)"</Text>
                    <TextInput
                      placeholder="Grams per serving"
                      style={styles.input}
                      value={customServingGrams}
                      onChangeText={(text) => setCustomServingGrams(cleanNutritionNumber(text))}
                      keyboardType="decimal-pad"
                    />
                    {customFoodPreviewValues ? (
                      <>
                        <Text style={styles.portionResultLabel}>For {draftGrams || '0'} {customServingType === '100ml' ? 'ml' : 'g'} you log:</Text>
                        <View style={styles.macroChipsRow}>
                          <View style={[styles.macroChip, styles.macroChipPrimary]}>
                            <Text style={styles.macroChipText}>{customFoodPreviewValues.calories || '0'} kcal</Text>
                          </View>
                          <View style={styles.macroChip}><Text style={styles.macroChipText}>P {customFoodPreviewValues.protein || '0'}</Text></View>
                          <View style={styles.macroChip}><Text style={styles.macroChipText}>F {customFoodPreviewValues.fat || '0'}</Text></View>
                          <View style={styles.macroChip}><Text style={styles.macroChipText}>C {customFoodPreviewValues.carbs || '0'}</Text></View>
                        </View>
                      </>
                    ) : null}
                      </>
                    ) : selectedPresetValues ? (
                      <>
                      <Text style={styles.portionResultLabel}>
                        {loggingUnit === 'serving' || loggingUnit === 'spoon'
                          ? `For ${draftGrams || '1'} ${loggingUnit}${(draftGrams || '1') === '1' ? '' : 's'} you log:`
                          : `For ${draftGrams || '0'} ${selectedPresetBaseMode === '100ml' ? 'ml' : 'g'} you log:`}
                      </Text>
                      <View style={styles.macroChipsRow}>
                        <View style={[styles.macroChip, styles.macroChipPrimary]}>
                          <Text style={styles.macroChipText}>{selectedPresetValues.calories || '0'} kcal</Text>
                        </View>
                        <View style={styles.macroChip}><Text style={styles.macroChipText}>P {selectedPresetValues.protein || '0'}</Text></View>
                        <View style={styles.macroChip}><Text style={styles.macroChipText}>F {selectedPresetValues.fat || '0'}</Text></View>
                        <View style={styles.macroChip}><Text style={styles.macroChipText}>C {selectedPresetValues.carbs || '0'}</Text></View>
                      </View>
                      </>
                    ) : null}
                  </>
                ) : null}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalGhostBtn, sessionAddedCount > 0 && styles.modalDoneBtn]}
                onPress={() => { setActiveMealType(null); setEditingEntryId(null); setEditingCustomFoodId(null); setCustomFoodMode(false); }}
              >
                <Text style={[styles.modalGhostBtnText, sessionAddedCount > 0 && styles.modalDoneBtnText]}>
                  {sessionAddedCount > 0 ? 'Done' : 'Cancel'}
                </Text>
              </Pressable>
              {customFoodMode || editingEntryId ? (
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  if (!draftMealName.trim() || !activeMealType) return;
                  let nextEntryCalories = draftCalories || '0';
                  let nextEntryProtein = draftProtein || '0';
                  let nextEntryFat = draftFat || '0';
                  let nextEntryCarbs = draftCarbs || '0';
                  if (selectedPreset && selectedPreset.source && selectedPreset.source !== 'custom') {
                    savePresetToLibrary(selectedPreset);
                  }
                  if (customFoodMode) {
                    if (!photoEstimateMode) {
                      // Two independent value sets: per-100 (for grams) and per-serving (used as-is).
                      const per100Cal = Number(draftCalories) || 0;
                      const per100P = Number(draftProtein.replace(',', '.')) || 0;
                      const per100F = Number(draftFat.replace(',', '.')) || 0;
                      const per100C = Number(draftCarbs.replace(',', '.')) || 0;
                      const hasPer100 = per100Cal > 0 || per100P > 0 || per100F > 0 || per100C > 0;
                      const servCal = Number(draftServingCalories) || 0;
                      const servP = Number(draftServingProtein.replace(',', '.')) || 0;
                      const servF = Number(draftServingFat.replace(',', '.')) || 0;
                      const servC = Number(draftServingCarbs.replace(',', '.')) || 0;
                      const hasServing = servCal > 0 || servP > 0 || servF > 0 || servC > 0;
                      const servingMacros = hasServing
                        ? { calories: servCal, protein: servP, fat: servF, carbs: servC }
                        : undefined;
                      const servingWeightInput = Number(customServingGrams) || 0;
                      // Decide the per-100 (grams) basis:
                      // 1) per-100 filled → use it.
                      // 2) only per-serving + a serving weight → derive per-100 so grams still works.
                      // 3) only per-serving, no weight → serving-only food (grams unavailable).
                      let foodBaseMode: '100g' | '100ml' | 'serving';
                      let baseCal: number;
                      let baseP: number;
                      let baseF: number;
                      let baseC: number;
                      if (hasPer100) {
                        foodBaseMode = customServingType === 'serving' ? '100g' : customServingType;
                        baseCal = per100Cal;
                        baseP = per100P;
                        baseF = per100F;
                        baseC = per100C;
                      } else if (hasServing && servingWeightInput > 0) {
                        const k = 100 / servingWeightInput;
                        foodBaseMode = '100g';
                        baseCal = Math.round(servCal * k);
                        baseP = Math.round(servP * k * 10) / 10;
                        baseF = Math.round(servF * k * 10) / 10;
                        baseC = Math.round(servC * k * 10) / 10;
                      } else {
                        foodBaseMode = 'serving';
                        baseCal = servCal;
                        baseP = servP;
                        baseF = servF;
                        baseC = servC;
                      }
                      const nextCustomFood: CustomNutritionFood = {
                        id: editingCustomFoodId || (selectedPreset?.isCustom ? selectedPreset.id : createUuid()),
                        name: draftMealName.trim(),
                        brand: customBrand.trim() || undefined,
                        barcode: customBarcode.trim() || selectedPreset?.barcode || undefined,
                        serving: servingMacros,
                        servingGrams: servingWeightInput > 0 ? servingWeightInput : undefined,
                        baseMode: foodBaseMode,
                        baseQuantity: foodBaseMode === 'serving' ? 1 : 100,
                        calories: baseCal,
                        protein: baseP,
                        fat: baseF,
                        carbs: baseC,
                      };
                      onCustomFoodPresetsChange((prev) => {
                        const filtered = prev.filter((item) => item.id !== nextCustomFood.id);
                        return [nextCustomFood, ...filtered];
                      });
                      // Editing a saved food's definition: update it and close, no diary entry.
                      if (editingCustomFoodId) {
                        setEditingCustomFoodId(null);
                        setCustomFoodMode(false);
                        setSelectedPreset(null);
                        setDraftMealName('');
                        setDraftCalories('');
                        setDraftProtein('');
                        setDraftFat('');
                        setDraftCarbs('');
                        setDraftServingCalories('');
                        setDraftServingProtein('');
                        setDraftServingFat('');
                        setDraftServingCarbs('');
                        setCustomServingGrams('');
                        setDraftGrams('100');
                        setFoodSearch('');
                        setAddTab('saved');
                        return;
                      }
                    }
                    if (customFoodPreviewPreset && customFoodPreviewValues) {
                      nextEntryCalories = customFoodPreviewValues.calories || '0';
                      nextEntryProtein = customFoodPreviewValues.protein || '0';
                      nextEntryFat = customFoodPreviewValues.fat || '0';
                      nextEntryCarbs = customFoodPreviewValues.carbs || '0';
                    }
                  }
                  if (selectedPreset) registerRecentPreset(selectedPreset.id);
                  const sourcePreset = customFoodMode ? customFoodPreviewPreset : effectiveLoggingPreset;
                  const entrySource: NutritionEntrySource | undefined = sourcePreset
                    ? {
                        displayName: customFoodMode ? draftMealName.trim() : sourcePreset.name,
                        brand: customFoodMode ? customBrand.trim() || undefined : sourcePreset.brand,
                        grams: customFoodMode
                          ? sourcePreset.baseMode === 'serving'
                            ? '1'
                            : draftGrams || '100'
                          : draftGrams || (sourcePreset.baseMode === 'serving' ? '1' : '100'),
                        baseMode: sourcePreset.baseMode || '100g',
                        baseQuantity: sourcePreset.baseQuantity || (sourcePreset.baseMode === 'serving' ? 1 : 100),
                        caloriesPer100g: sourcePreset.caloriesPer100g,
                        proteinPer100g: sourcePreset.proteinPer100g,
                        fatPer100g: sourcePreset.fatPer100g,
                        carbsPer100g: sourcePreset.carbsPer100g,
                        servingGrams: sourcePreset.servingGrams,
                      }
                    : undefined;
                  const builtEntry: NutritionFoodEntry = {
                    id: editingEntryId || createUuid(),
                    name: formatNutritionEntryName({
                      name: draftMealName.trim(),
                      grams: draftGrams,
                      customBrand,
                      customFoodMode,
                      customServingType,
                    }),
                    mealType: activeMealType,
                    date: selectedDateKey,
                    calories: nextEntryCalories,
                    protein: nextEntryProtein,
                    fat: nextEntryFat,
                    carbs: nextEntryCarbs,
                    source: entrySource,
                  };
                  onNutritionEntriesChange((prev) =>
                    editingEntryId
                      ? prev.map((entry) => (entry.id === editingEntryId ? builtEntry : entry))
                      : [builtEntry, ...prev],
                  );
                  setDraftMealName('');
                  setDraftCalories('');
                  setDraftProtein('');
                  setDraftFat('');
                  setDraftCarbs('');
                  setFoodSearch('');
                  setDraftGrams('100');
                  setSelectedPreset(null);
                  setCustomFoodMode(false);
                  setPhotoEstimateMode(false);
                  setCustomBrand('');
                  setCustomBarcode('');
                  setCustomServingGrams('');
                  setCustomServingType('100g');
                  setCatalogResults([]);
                  setCatalogSearchError(null);
                  setMealPhotoError(null);
                  setMealPhotoNote(null);
                  setActiveMealType(null);
                  setEditingEntryId(null);
                }}
              >
                <Text style={styles.primaryBtnText}>{editingCustomFoodId ? 'Save changes' : editingEntryId ? 'Update' : '✓ Add'}</Text>
              </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={barcodeCameraOpen} transparent animationType="fade" onRequestClose={() => setBarcodeCameraOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.barcodeModalCard}>
            <Text style={styles.modalEyebrow}>Barcode scan</Text>
            <Text style={styles.modalTitle}>Scan product package</Text>
            <Text style={styles.barcodeHint}>Point the camera at the barcode and we will try to fill calories and macros automatically.</Text>
            <View style={styles.barcodePreviewWrap}>
              <BarcodeScanner
                active={barcodeCameraOpen}
                paused={barcodeLookupBusy}
                onDetected={(code) => void handleBarcodeScanned(code)}
              />
              <View pointerEvents="none" style={styles.barcodeFrame} />
            </View>
            {barcodeLookupError ? <Text style={styles.catalogError}>{barcodeLookupError}</Text> : null}
            <Text style={styles.barcodeHint}>Or enter the barcode digits manually:</Text>
            <View style={styles.barcodeManualRow}>
              <TextInput
                placeholder="e.g. 4601234567890"
                style={[styles.input, styles.barcodeManualInput]}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                keyboardType="number-pad"
              />
              <Pressable
                style={[styles.primaryBtn, (!manualBarcode.trim() || barcodeLookupBusy) && styles.barcodeFindBtnDisabled]}
                disabled={!manualBarcode.trim() || barcodeLookupBusy}
                onPress={() => void handleBarcodeScanned(manualBarcode)}
              >
                <Text style={styles.primaryBtnText}>Find</Text>
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalGhostBtn} onPress={() => setBarcodeCameraOpen(false)}>
                <Text style={styles.modalGhostBtnText}>Cancel</Text>
              </Pressable>
              <View style={styles.barcodeStatusPill}>
                <Text style={styles.barcodeStatusText}>{barcodeLookupBusy ? 'Looking up...' : 'Ready to scan'}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildNutritionWeeks(entries: NutritionFoodEntry[]) {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOfWeek = todayMidnight.getDay();
  const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const currentMonday = new Date(todayMidnight);
  currentMonday.setDate(todayMidnight.getDate() + mondayDiff);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return Array.from({ length: NUTRITION_WEEK_RADIUS * 2 + 1 }, (_, weekIndex) => {
    const weekOffset = weekIndex - NUTRITION_WEEK_RADIUS;
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() + weekOffset * 7);
    const days = labels.map((weekday, dayIndex) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + dayIndex);
      const dateKey = toDateKey(date);
      const totals = getNutritionTotals(entries.filter((entry) => entry.date === dateKey));
      return {
        dateKey,
        weekday,
        dayNumber: String(date.getDate()),
        calories: totals.calories,
      };
    });
    return { key: toDateKey(monday), days };
  });
}

function formatReadableDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function presetFromEntrySource(source: NutritionEntrySource, idSeed: string): NutritionFoodPreset {
  return {
    id: idSeed,
    name: source.displayName,
    brand: source.brand,
    baseAmount:
      source.baseMode === 'serving'
        ? 'per 1 serving'
        : `per ${source.baseQuantity} ${source.baseMode === '100ml' ? 'ml' : 'g'}`,
    baseMode: source.baseMode,
    baseQuantity: source.baseQuantity,
    servingGrams: source.servingGrams,
    source: 'custom',
    sourceLabel: 'Saved',
    caloriesPer100g: source.caloriesPer100g,
    proteinPer100g: source.proteinPer100g,
    fatPer100g: source.fatPer100g,
    carbsPer100g: source.carbsPer100g,
  };
}

function formatNutritionEntryName({
  name,
  grams,
  customBrand,
  customFoodMode,
  customServingType,
}: {
  name: string;
  grams: string;
  customBrand: string;
  customFoodMode: boolean;
  customServingType: '100g' | '100ml' | 'serving';
}) {
  const title = customBrand.trim() ? `${customBrand.trim()} ${name}` : name;
  if (!customFoodMode) return `${title}${grams ? ` • ${grams} g` : ''}`;
  if (customServingType === 'serving') return `${title} • 1 serving`;
  if (customServingType === '100ml') return `${title}${grams ? ` • ${grams} ml` : ' • 100 ml'}`;
  return `${title}${grams ? ` • ${grams} g` : ' • 100 g'}`;
}

const createStyles = (colors: ThemeColors, isMobile = false) =>
  StyleSheet.create({
    content: {
      gap: 14,
      paddingBottom: 32,
    },
    label: {
      color: colors.text,
      marginBottom: 8,
      fontWeight: '700',
    },
    fieldLabel: {
      color: colors.text,
      marginBottom: 8,
      fontWeight: '700',
      fontSize: 13,
    },
    weekHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    weekArrowBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekArrowText: {
      color: colors.text,
      fontSize: 26,
      lineHeight: 26,
      fontWeight: '700',
    },
    weekTitleWrap: {
      alignItems: 'center',
      gap: 2,
      marginBottom: 12,
    },
    weekTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
    weekSubtitle: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
    },
    weekPage: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
      paddingVertical: 2,
      marginBottom: 12,
    },
    weekDayCard: {
      flex: 1,
      minHeight: 76,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
      paddingVertical: 8,
    },
    weekDayCardToday: {
      borderColor: '#f59e0b',
      backgroundColor: '#fff7ed',
    },
    weekDayCardHover: {
      borderColor: '#93c5fd',
      backgroundColor: '#eff6ff',
      transform: [{ translateY: -1 }],
    },
    weekDayCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      shadowColor: colors.shadow,
      shadowOpacity: 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 5,
    },
    weekDayCardTodayHover: {
      borderColor: '#f97316',
      backgroundColor: '#ffedd5',
      transform: [{ translateY: -1 }],
    },
    weekDayCardTodayActiveHover: {
      borderColor: '#f97316',
      backgroundColor: '#fed7aa',
      shadowColor: '#f97316',
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    weekDayName: {
      color: colors.subtext,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    weekDayNameActive: {
      color: colors.primary,
    },
    weekDayNameToday: {
      color: '#c2410c',
    },
    weekDayNumber: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
      marginTop: 3,
    },
    weekDayNumberActive: {
      color: colors.text,
    },
    weekDayNumberToday: {
      color: '#9a3412',
    },
    weekDayCalories: {
      color: colors.subtext,
      fontSize: 9,
      fontWeight: '700',
      marginTop: 3,
    },
    weekDayCheck: {
      marginTop: 4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#22c55e',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekDayCheckText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '900',
      lineHeight: 12,
    },
    weekDayCheckPlaceholder: {
      marginTop: 4,
      width: 16,
      height: 16,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    streakFlame: {
      fontSize: 14,
    },
    streakText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    mealCaloriesCol: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      marginRight: 10,
    },
    mealCaloriesValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    mealCaloriesLabel: {
      color: colors.subtext,
      fontSize: 10,
      fontWeight: '700',
    },
    weekDayCaloriesActive: {
      color: colors.text,
    },
    weekDayCaloriesToday: {
      color: '#c2410c',
    },
    weekDayTextTodayHover: {
      color: '#7c2d12',
    },
    todaySummaryBar: {
      marginTop: 4,
      marginBottom: 16,
      gap: 10,
      alignSelf: isMobile ? 'stretch' : 'flex-start',
      maxWidth: isMobile ? undefined : 520,
      width: isMobile ? undefined : '100%',
    },
    todaySummaryPrimary: {
      gap: 2,
    },
    todaySummaryLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    todaySummaryHeadline: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    todaySummaryCalories: {
      color: colors.text,
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    todaySummaryCaloriesTarget: {
      color: colors.subtext,
      fontSize: 14,
      fontWeight: '700',
    },
    todaySummaryOver: {
      color: '#ef4444',
      fontSize: 13,
      fontWeight: '800',
    },
    macroBars: {
      gap: 12,
      marginTop: 6,
    },
    macroBarRow: {
      gap: 6,
    },
    macroBarHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    macroBarLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    macroBarValue: {
      fontSize: 13,
    },
    macroBarCurrent: {
      fontSize: 13,
      fontWeight: '800',
    },
    macroBarTarget: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '600',
    },
    macroBarTrack: {
      position: 'relative',
      height: 10,
      borderRadius: 5,
      backgroundColor: 'rgba(120,134,160,0.18)',
      overflow: 'hidden',
    },
    macroBarFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 5,
    },
    macroBarOver: {
      color: '#ef4444',
      fontSize: 13,
      fontWeight: '800',
    },
    input: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: '#ffffff',
      color: colors.text,
      marginBottom: 12,
      fontSize: isMobile ? 16 : 14,
      fontWeight: '600',
    },
    inlineInput: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.glassSoft,
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      minWidth: 84,
    },
    row: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 12,
    },
    half: {
      flex: 1,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    pillBtn: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pillBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    pillBtnText: {
      color: colors.subtext,
      fontWeight: '700',
      fontSize: 12,
    },
    pillBtnTextActive: {
      color: colors.primary,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    goalTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    goalCompactSummary: {
      flex: 1,
      gap: 4,
    },
    goalCompactTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    goalCompactText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    goalToggleBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    goalToggleBtnText: {
      color: colors.text,
      fontWeight: '700',
    },
    summaryCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 12,
      gap: 4,
    },
    summaryLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
    },
    summaryValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
    },
    summaryMacro: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    summaryMeta: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    insightsWrap: {
      gap: 8,
    },
    insightCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 12,
      gap: 4,
    },
    insightTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    insightText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    emptyText: {
      color: colors.subtext,
      marginBottom: 6,
    },
    primaryBtn: {
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 20,
      alignItems: 'center',
      backgroundColor: colors.primary,
      marginTop: 4,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '800',
    },
    mealCardsWrap: {
      gap: 10,
    },
    mealRowCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    mealRowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    mealRowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    mealEntriesWrap: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    mealEntryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    mealEntryCopy: {
      flex: 1,
      gap: 2,
    },
    mealEntryName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    mealEntryMeta: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    mealEntryDelete: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glassSoft,
    },
    mealEntryDeleteText: {
      color: colors.subtext,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 20,
    },
    mealAddMoreBtn: {
      marginTop: 2,
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    mealAddMoreText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    mealTitleWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    mealIconBadge: {
      width: 46,
      height: 46,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealIconText: {
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    mealHeaderCopy: {
      flex: 1,
      gap: 3,
    },
    mealTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    mealSubtitle: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
    },
    mealRowMeta: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    addMealBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addMealBtnText: {
      color: colors.primary,
      fontSize: 24,
      lineHeight: 26,
      fontWeight: '800',
    },
    modalScrim: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      justifyContent: 'center',
      padding: isMobile ? 12 : 20,
    },
    modalCard: {
      maxHeight: isMobile ? '94%' : '88%',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.96)',
      backgroundColor: 'rgba(248,250,252,0.97)',
      shadowColor: '#0f172a',
      shadowOpacity: 0.34,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 16 },
      elevation: 20,
      overflow: 'hidden',
    },
    modalScroll: {
      flexShrink: 1,
    },
    modalContent: {
      padding: isMobile ? 14 : 18,
      paddingBottom: isMobile ? 16 : 20,
    },
    modalSection: {
      gap: 10,
      marginBottom: 12,
    },
    modalEyebrow: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    modalTitle: {
      color: colors.text,
      fontSize: isMobile ? 21 : 24,
      fontWeight: '800',
      marginBottom: 14,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'stretch',
      marginBottom: 12,
    },
    searchInputWrap: {
      flex: 1,
    },
    searchInput: {
      marginBottom: 0,
    },
    searchToolsRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 8,
      alignItems: 'stretch',
    },
    toolIconBtn: {
      minWidth: isMobile ? 64 : 82,
      height: 56,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      gap: 1,
    },
    toolIconGlyph: {
      color: colors.primary,
      fontSize: 17,
      fontWeight: '800',
      lineHeight: 18,
    },
    toolIconLabel: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    flowTabsRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 10,
      marginBottom: 4,
    },
    flowTab: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#ffffff',
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 4,
    },
    flowTabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      shadowColor: colors.shadow,
      shadowOpacity: 0.14,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    flowTabTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    flowTabTitleActive: {
      color: colors.primary,
    },
    flowTabHint: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '600',
    },
    flowTabHintActive: {
      color: colors.primary,
    },
    scanBtn: {
      minWidth: 84,
      height: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    scanBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    flowActionCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#ffffff',
      padding: 14,
      gap: 12,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    flowActionCopy: {
      gap: 4,
    },
    flowActionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    flowActionText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    flowActionBtn: {
      alignSelf: isMobile ? 'stretch' : 'flex-start',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 11,
      alignItems: 'center',
    },
    flowActionBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
    photoPreviewCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      backgroundColor: '#f8fbff',
      padding: 12,
      gap: 10,
    },
    photoPreviewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    photoPreviewCopy: {
      flex: 1,
      gap: 2,
    },
    photoPreviewTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    photoPreviewSubtitle: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    photoPreviewStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    photoPreviewNote: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },
    photoPreviewHint: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 16,
    },
    confidenceBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    confidenceBadgeHigh: {
      backgroundColor: '#dcfce7',
    },
    confidenceBadgeMedium: {
      backgroundColor: '#fef3c7',
    },
    confidenceBadgeLow: {
      backgroundColor: '#fee2e2',
    },
    confidenceBadgeText: {
      color: colors.text,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    quickSection: {
      gap: 10,
      marginBottom: 12,
    },
    quickSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    quickSectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    quickSectionMeta: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
    },
    searchEmptyHint: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 10,
    },
    addTabsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
    },
    addTab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      alignItems: 'center',
    },
    addTabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    addTabText: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
    },
    addTabTextActive: {
      color: colors.primary,
    },
    presetListWrap: {
      gap: 8,
      marginBottom: 10,
    },
    presetScrollContent: {
      gap: 10,
      paddingBottom: 10,
      paddingRight: 6,
    },
    presetCard: {
      position: 'relative',
      width: isMobile ? 166 : 190,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      backgroundColor: '#ffffff',
      padding: 12,
      gap: 4,
      shadowColor: colors.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
    favoritePill: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    favoritePillActive: {
      borderColor: '#f59e0b',
      backgroundColor: '#fff7ed',
    },
    favoritePillText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '900',
    },
    favoritePillTextActive: {
      color: '#d97706',
    },
    editPresetPill: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editPresetPillText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '900',
    },
    quickAddPill: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#c7d2e3',
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickAddPillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    quickAddPillText: {
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '900',
      lineHeight: 19,
    },
    quickAddPillPlus: {
      color: colors.primary,
      fontSize: 20,
      lineHeight: 22,
    },
    sessionAddedBanner: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      paddingVertical: 9,
      paddingHorizontal: 12,
      marginBottom: 12,
      gap: 2,
    },
    sessionAddedText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    sessionAddedHint: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '600',
    },
    modalDoneBtn: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    modalDoneBtnText: {
      color: '#ffffff',
    },
    presetCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    presetTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    presetServing: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    presetMacros: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 16,
    },
    catalogSection: {
      gap: 10,
      marginBottom: 12,
    },
    catalogHeader: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 12,
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    catalogHeaderCopy: {
      flex: 1,
      gap: 3,
    },
    catalogTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    catalogMeta: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
    },
    catalogError: {
      color: '#b91c1c',
      fontSize: 12,
      fontWeight: '700',
    },
    catalogEmpty: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
    },
    catalogResultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#e1e8f2',
      backgroundColor: '#ffffff',
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: 10,
    },
    catalogResultActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    catalogResultTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    catalogResultCopy: {
      flex: 1,
      gap: 1,
    },
    catalogResultTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    catalogResultSubtitle: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
    },
    catalogResultMacros: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      paddingRight: 44,
    },
    aiEstimateBtnDisabled: {
      opacity: 0.6,
    },
    customFoodBtn: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      padding: 14,
      marginBottom: 12,
    },
    customFoodBtnTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 3,
    },
    customFoodBtnText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
    },
    customFoodCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#ffffff',
      padding: 14,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    customFoodHeader: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    customFoodTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    customFoodText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    customFoodCloseBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    customFoodCloseText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    productInfoCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      backgroundColor: '#ffffff',
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    productInfoCopy: {
      flex: 1,
      gap: 6,
    },
    cardAddPill: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: '#c7d2e3',
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardAddPillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    cardAddPillText: {
      color: '#ffffff',
      fontSize: 22,
      fontWeight: '900',
      lineHeight: 24,
    },
    productInfoTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    productInfoSubtitle: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    productInfoStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    productInfoStat: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      backgroundColor: '#f8fbff',
      paddingHorizontal: 10,
      paddingVertical: 6,
      overflow: 'hidden',
    },
    gramsRow: {
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'flex-end',
      gap: 10,
    },
    gramsInputWrap: {
      flex: 1,
    },
    gramsUnitChip: {
      minWidth: isMobile ? undefined : 58,
      width: isMobile ? '100%' : undefined,
      height: 50,
      marginBottom: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    gramsUnitChipText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    unitSelect: {
      minWidth: isMobile ? undefined : 150,
      width: isMobile ? '100%' : undefined,
      height: 50,
      marginBottom: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      gap: 8,
    },
    unitSelectText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      flexShrink: 1,
    },
    unitSelectCaret: {
      color: colors.subtext,
      fontSize: 14,
      fontWeight: '800',
    },
    unitMenu: {
      marginTop: -4,
      marginBottom: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    unitMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    unitMenuItemActive: {
      backgroundColor: colors.glassSoft,
    },
    unitMenuItemText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    unitMenuItemTextActive: {
      color: colors.primary,
    },
    unitMenuCheck: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '900',
    },
    portionResultLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 12,
      marginBottom: 8,
    },
    servingSectionLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 16,
    },
    servingSectionHint: {
      color: colors.subtext,
      fontSize: 11,
      marginTop: 2,
      marginBottom: 8,
    },
    macroChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 4,
    },
    macroChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
    },
    macroChipPrimary: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    macroChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    servingChipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 8,
      flexWrap: 'wrap',
    },
    servingChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    servingChipActive: {
      backgroundColor: colors.primary,
    },
    servingChipText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    servingChipTextActive: {
      color: '#ffffff',
    },
    servingChipHint: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    macroPreviewGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    macroPreviewCard: {
      width: isMobile ? '48%' : '47%',
      minHeight: 76,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent: 'center',
      gap: 4,
    },
    macroPreviewValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    macroPreviewLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
    },
    modalActions: {
      flexDirection: isMobile ? 'column-reverse' : 'row',
      justifyContent: 'flex-end',
      gap: 10,
      paddingHorizontal: isMobile ? 14 : 18,
      paddingTop: 12,
      paddingBottom: isMobile ? 14 : 18,
      borderTopWidth: 1,
      borderTopColor: '#e1e8f2',
      backgroundColor: 'rgba(248,250,252,0.98)',
    },
    modalGhostBtn: {
      alignItems: 'center',
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      backgroundColor: '#ffffff',
    },
    modalGhostBtnText: {
      color: colors.text,
      fontWeight: '700',
    },
    barcodeModalCard: {
      maxHeight: isMobile ? '92%' : '88%',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.96)',
      backgroundColor: 'rgba(248,250,252,0.97)',
      shadowColor: '#0f172a',
      shadowOpacity: 0.34,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 16 },
      elevation: 20,
      overflow: 'hidden',
      padding: isMobile ? 14 : 18,
      gap: 12,
    },
    barcodeHint: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
      marginTop: -8,
    },
    barcodeManualRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    barcodeManualInput: {
      flex: 1,
    },
    barcodeFindBtnDisabled: {
      opacity: 0.5,
    },
    barcodePreviewWrap: {
      borderRadius: 22,
      overflow: 'hidden',
      height: isMobile ? 240 : 320,
      position: 'relative',
      backgroundColor: '#0f172a',
    },
    barcodePreview: {
      flex: 1,
    },
    barcodeFrame: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: isMobile ? 180 : 220,
      height: isMobile ? 90 : 110,
      marginLeft: isMobile ? -90 : -110,
      marginTop: isMobile ? -45 : -55,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.92)',
      backgroundColor: 'transparent',
    },
    barcodeStatusPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
      justifyContent: 'center',
    },
    barcodeStatusText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
  });
