import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SectionCard } from '@/components/SectionCard';
import { RECIPE_CLASSIFIER_FILTERS, RECIPE_SECTION_FILTERS, STARTER_RECIPE_LIBRARY } from '@/lib/recipeCatalog';
import { NutritionFoodEntry, NutritionMealType, Recipe, RecipeClassifier, RecipeMealType } from '@/types/app';
import { cleanNutritionNumber, getNutritionValuesForGrams, NUTRITION_FOOD_PRESETS, NutritionFoodPreset } from '@/lib/nutrition';
import { computeRecipeNutritionForSelection, resolveRecipeIngredients, type RecipeSelection } from '@/lib/recipeNutrition';
import { RECIPE_IMAGES } from '@/lib/generated/recipeImageMap';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  recipes: Recipe[];
  onRecipeCreate: (recipe: Recipe) => Promise<Recipe> | Recipe;
  onRecipeUpdate: (recipe: Recipe) => Promise<Recipe> | Recipe;
  onRecipeDelete: (recipeId: string) => Promise<void> | void;
  onNutritionEntriesChange?: Dispatch<SetStateAction<NutritionFoodEntry[]>>;
};

const LOG_MEAL_TYPES: NutritionMealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function createRecipeLogId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function todayDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function defaultMealTypeForSlot(slot?: Recipe['mealSlot']): NutritionMealType {
  if (slot === 'breakfast' || slot === 'brunch') return 'breakfast';
  if (slot === 'lunch') return 'lunch';
  if (slot === 'dinner') return 'dinner';
  return 'snack';
}

type RecipeLayoutMode = 'list' | 'grid';

type IngredientUnit = 'g' | 'ml' | 'pcs' | 'tbsp' | 'tsp';

const INGREDIENT_UNITS: Array<{ key: IngredientUnit; label: string }> = [
  { key: 'g', label: 'g' },
  { key: 'ml', label: 'ml' },
  { key: 'pcs', label: 'pc' },
  { key: 'tbsp', label: 'tbsp' },
  { key: 'tsp', label: 'tsp' },
];

type DraftIngredientRow = {
  id: string;
  query: string;
  grams: string;
  unit: IngredientUnit;
  preset: NutritionFoodPreset | null;
};

function createDraftIngredientRow(): DraftIngredientRow {
  return {
    id: `draft-ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query: '',
    grams: '0',
    unit: 'g',
    preset: null,
  };
}

function createDraftIngredientRowFromRecipe(ingredient: Recipe['ingredients'][number]): DraftIngredientRow {
  const amountMatch = ingredient.amount.trim().match(/^(\d+(?:[.,]\d+)?)\s*(g|ml|pc|pcs|tbsp|tsp)$/i);
  const normalizedUnit = (amountMatch?.[2] || 'g').toLowerCase();
  const unit: IngredientUnit =
    normalizedUnit === 'pc' || normalizedUnit === 'pcs'
      ? 'pcs'
      : normalizedUnit === 'ml'
        ? 'ml'
        : normalizedUnit === 'tbsp'
          ? 'tbsp'
          : normalizedUnit === 'tsp'
            ? 'tsp'
            : 'g';
  const preset =
    NUTRITION_FOOD_PRESETS.find((item) => item.name.trim().toLowerCase() === ingredient.name.trim().toLowerCase()) || null;

  return {
    id: `draft-ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query: ingredient.name,
    grams: amountMatch?.[1]?.replace(',', '.') || '',
    unit,
    preset,
  };
}

function getPieceGramEstimate(preset: NutritionFoodPreset | null, query: string) {
  const value = `${preset?.name || ''} ${query}`.toLowerCase();
  if (value.includes('egg')) return 50;
  if (value.includes('banana')) return 118;
  if (value.includes('apple')) return 180;
  if (value.includes('carrot')) return 70;
  if (value.includes('onion')) return 110;
  if (value.includes('tomato')) return 120;
  if (value.includes('cucumber')) return 200;
  if (value.includes('potato')) return 150;
  if (value.includes('bread')) return 35;
  return 100;
}

function getIngredientCalculationGrams(row: DraftIngredientRow) {
  const amount = Number(row.grams.replace(',', '.')) || 0;
  switch (row.unit) {
    case 'ml':
      return amount;
    case 'pcs':
      return amount * getPieceGramEstimate(row.preset, row.query);
    case 'tbsp':
      return amount * 15;
    case 'tsp':
      return amount * 5;
    case 'g':
    default:
      return amount;
  }
}

function getIngredientNutrition(row: DraftIngredientRow) {
  if (!row.preset) return null;
  return getNutritionValuesForGrams(row.preset, String(getIngredientCalculationGrams(row)));
}

function formatIngredientAmount(row: DraftIngredientRow) {
  const amount = row.grams.trim() || '0';
  return `${amount} ${row.unit === 'pcs' ? 'pc' : row.unit}`;
}

function getRecipeDisplayTags(recipe: Recipe) {
  const tags = [...recipe.classifiers, ...recipe.tags]
    .filter(Boolean)
    .filter((tag) => !['beginner_cook', 'easy', '60_mins', 'very_low_carbs', 'brunch'].includes(tag.toLowerCase()));
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 2);
}

function getRecipePlaceholderTone(mealType: RecipeMealType) {
  switch (mealType) {
    case 'breakfast':
    case 'brunch':
      return { bg: '#fff7ed', accent: '#f59e0b' };
    case 'soups':
    case 'salads':
      return { bg: '#ecfdf5', accent: '#10b981' };
    case 'desserts':
    case 'baking':
      return { bg: '#fdf2f8', accent: '#ec4899' };
    case 'drinks':
      return { bg: '#eff6ff', accent: '#3b82f6' };
    default:
      return { bg: '#eef2ff', accent: '#6366f1' };
  }
}

function getRecipePlaceholderEmoji(mealType: RecipeMealType) {
  switch (mealType) {
    case 'breakfast':
    case 'brunch':
      return '🍳';
    case 'soups':
      return '🍲';
    case 'salads':
      return '🥗';
    case 'pasta':
      return '🍝';
    case 'pizza':
      return '🍕';
    case 'sandwiches':
      return '🥪';
    case 'sides':
      return '🥔';
    case 'desserts':
    case 'baking':
      return '🍰';
    case 'drinks':
      return '🥤';
    case 'appetizers':
      return '🥣';
    case 'sauces':
      return '🥫';
    default:
      return '🍽️';
  }
}

function getShortRecipeDescription(recipe: Recipe) {
  const text = recipe.description.trim();
  if (!text) return '';
  const compact = text
    .replace(/\s+/g, ' ')
    .replace(/^this\s+/i, '')
    .replace(/^these\s+/i, '')
    .trim();
  if (compact.length <= 88) return compact;
  return `${compact.slice(0, 85).trimEnd()}...`;
}

// Lightweight vector-free icons drawn with Views (crisp, consistent, no deps).
function SearchIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 1.8, borderColor: color }} />
      <View style={{ position: 'absolute', right: 0, bottom: 0, width: 6, height: 1.8, borderRadius: 1, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

function FilterIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 16, height: 14, justifyContent: 'space-between', paddingVertical: 1 }}>
      {[2, 8, 5].map((knobLeft, i) => (
        <View key={i} style={{ height: 2, borderRadius: 1, backgroundColor: color }}>
          <View style={{ position: 'absolute', top: -2, left: knobLeft, width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        </View>
      ))}
    </View>
  );
}

function GridIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 16, height: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between' }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: color }} />
      ))}
    </View>
  );
}

function ListIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 16, height: 14, justifyContent: 'space-between', paddingVertical: 1 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 3, borderRadius: 1.5, backgroundColor: color }} />
      ))}
    </View>
  );
}

// Authored amounts sometimes already contain the food name ("300 g avocado"),
// while user recipes keep them separate ("200 g" + "flour"). Avoid duplicating.
function formatIngredientLine(ingredient: { amount: string; name: string; optional?: boolean }) {
  const amount = ingredient.amount.trim();
  const name = ingredient.name.trim();
  const base = amount.toLowerCase().includes(name.toLowerCase()) ? amount : `${amount} ${name}`.trim();
  return ingredient.optional ? `${base} (optional)` : base;
}

export function RecipesScreen({ recipes, onRecipeCreate, onRecipeUpdate, onRecipeDelete, onNutritionEntriesChange }: Props) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [mealFilter, setMealFilter] = useState<RecipeMealType | 'all'>('all');
  const [classifierFilter, setClassifierFilter] = useState<RecipeClassifier | 'all'>('all');
  const [layoutMode, setLayoutMode] = useState<RecipeLayoutMode>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftPhotoUri, setDraftPhotoUri] = useState('');
  const [draftMealType, setDraftMealType] = useState<RecipeMealType>('breakfast');
  const [draftCookTime, setDraftCookTime] = useState('');
  const [draftServings, setDraftServings] = useState('');
  const [draftSteps, setDraftSteps] = useState('');
  const [draftClassifiers, setDraftClassifiers] = useState<RecipeClassifier[]>([]);
  const [draftIngredientRows, setDraftIngredientRows] = useState<DraftIngredientRow[]>([createDraftIngredientRow()]);
  const [manualNutritionOn, setManualNutritionOn] = useState(false);
  const [manualNutrition, setManualNutrition] = useState({ calories: '', protein: '', fat: '', carbs: '' });
  const [unitPickerOpenFor, setUnitPickerOpenFor] = useState<string | null>(null);

  const starterRecipes = useMemo(
    () => STARTER_RECIPE_LIBRARY.filter((recipe) => !recipes.some((saved) => saved.id === recipe.id)),
    [recipes],
  );
  const ownedRecipeIds = useMemo(() => new Set(recipes.map((recipe) => recipe.id)), [recipes]);
  const catalogRecipes = useMemo(() => [...recipes, ...starterRecipes], [recipes, starterRecipes]);
  const editingRecipe = useMemo(() => (editingRecipeId ? recipes.find((recipe) => recipe.id === editingRecipeId) || null : null), [editingRecipeId, recipes]);

  const draftNutrition = useMemo(() => {
    return draftIngredientRows.reduce(
      (acc, row) => {
        if (!row.preset) return acc;
        const values = getIngredientNutrition(row);
        if (!values) return acc;
        acc.calories += Number(values.calories) || 0;
        acc.protein += Number(values.protein) || 0;
        acc.fat += Number(values.fat) || 0;
        acc.carbs += Number(values.carbs) || 0;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 },
    );
  }, [draftIngredientRows]);

  // When manual entry is on, the typed totals win over the auto-calculated ones.
  const effectiveNutrition = manualNutritionOn
    ? {
        calories: Number(manualNutrition.calories) || 0,
        protein: Number(manualNutrition.protein.replace(',', '.')) || 0,
        fat: Number(manualNutrition.fat.replace(',', '.')) || 0,
        carbs: Number(manualNutrition.carbs.replace(',', '.')) || 0,
      }
    : draftNutrition;

  function enableManualNutrition() {
    // Prefill with the current auto values so the user edits from there.
    setManualNutrition({
      calories: String(Math.round(draftNutrition.calories) || ''),
      protein: String(Math.round(draftNutrition.protein * 10) / 10 || ''),
      fat: String(Math.round(draftNutrition.fat * 10) / 10 || ''),
      carbs: String(Math.round(draftNutrition.carbs * 10) / 10 || ''),
    });
    setManualNutritionOn(true);
  }

  function toggleDraftClassifier(value: RecipeClassifier) {
    setDraftClassifiers((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  function updateDraftIngredientRow(rowId: string, updater: (row: DraftIngredientRow) => DraftIngredientRow) {
    setDraftIngredientRows((prev) => prev.map((row) => (row.id === rowId ? updater(row) : row)));
  }

  function addDraftIngredientRow() {
    setDraftIngredientRows((prev) => [createDraftIngredientRow(), ...prev]);
  }

  function removeDraftIngredientRow(rowId: string) {
    setDraftIngredientRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== rowId)));
    setUnitPickerOpenFor((current) => (current === rowId ? null : current));
  }

  async function pickDraftPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to add recipe photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.55,
        base64: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.uri) return;
      const mimeType = asset.mimeType || 'image/jpeg';
      setDraftPhotoUri(asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri);
    } catch {
      Alert.alert('Photo failed', 'Could not open the photo picker right now.');
    }
  }

  function resetBuilder() {
    setEditingRecipeId(null);
    setDraftTitle('');
    setDraftPhotoUri('');
    setDraftMealType('breakfast');
    setDraftCookTime('');
    setDraftServings('');
    setDraftSteps('');
    setDraftClassifiers([]);
    setDraftIngredientRows([createDraftIngredientRow()]);
    setManualNutritionOn(false);
    setManualNutrition({ calories: '', protein: '', fat: '', carbs: '' });
    setUnitPickerOpenFor(null);
  }

  function openBuilderForCreate() {
    resetBuilder();
    setBuilderError(null);
    setBuilderOpen(true);
  }

  function openBuilderForEdit(recipe: Recipe) {
    setEditingRecipeId(recipe.id);
    setDraftTitle(recipe.title);
    setDraftPhotoUri(recipe.photoUri || '');
    setDraftMealType(recipe.mealType);
    setDraftCookTime(recipe.cookTimeMinutes ? String(recipe.cookTimeMinutes) : '');
    setDraftServings(recipe.servings ? String(recipe.servings) : '1');
    setDraftSteps(recipe.steps.map((step) => step.text).join('\n'));
    setDraftClassifiers(recipe.classifiers);
    const rows = recipe.ingredients.length
      ? recipe.ingredients.map((ingredient) => createDraftIngredientRowFromRecipe(ingredient))
      : [createDraftIngredientRow()];
    setDraftIngredientRows(rows);
    // If the saved nutrition differs from what the ingredients produce, it was
    // entered manually — keep it as manual so editing doesn't overwrite it.
    const autoCalories = rows.reduce((sum, row) => {
      const values = row.preset ? getIngredientNutrition(row) : null;
      return sum + (values ? Number(values.calories) || 0 : 0);
    }, 0);
    const servings = recipe.servings || 1;
    const savedTotalCalories = recipe.nutritionPerServing.calories * servings;
    if (savedTotalCalories > 0 && Math.abs(savedTotalCalories - autoCalories) > 1.5) {
      setManualNutritionOn(true);
      setManualNutrition({
        calories: String(Math.round(recipe.nutritionPerServing.calories * servings)),
        protein: String(Math.round(recipe.nutritionPerServing.protein * servings * 10) / 10),
        fat: String(Math.round(recipe.nutritionPerServing.fat * servings * 10) / 10),
        carbs: String(Math.round(recipe.nutritionPerServing.carbs * servings * 10) / 10),
      });
    } else {
      setManualNutritionOn(false);
      setManualNutrition({ calories: '', protein: '', fat: '', carbs: '' });
    }
    setUnitPickerOpenFor(null);
    setBuilderError(null);
    setSelectedRecipeId(null);
    setBuilderOpen(true);
  }

  async function handleDeleteRecipePress(recipe: Recipe) {
    Alert.alert('Delete recipe?', 'This will remove your custom recipe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await onRecipeDelete(recipe.id);
            setSelectedRecipeId(null);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not delete recipe.';
            Alert.alert('Delete failed', message);
          }
        },
      },
    ]);
  }

  async function saveDraftRecipe() {
    if (builderSaving) return;
    const title = draftTitle.trim();
    if (!title) return;
    const stepLines = draftSteps
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const nextRecipe: Recipe = {
      id: editingRecipeId || `recipe-${Date.now()}`,
      title,
      description: stepLines[0] || 'Custom recipe',
      mealType: draftMealType,
      cuisine: 'Home',
      cookTimeMinutes: Number.parseInt(draftCookTime.trim() || '0', 10) || 0,
      servings: Number.parseInt(draftServings.trim() || '1', 10) || 1,
      tags: [],
      classifiers: draftClassifiers,
      photoUri: draftPhotoUri || undefined,
      nutritionPerServing: {
        calories: Math.round(effectiveNutrition.calories / (Number.parseInt(draftServings.trim() || '1', 10) || 1)),
        protein: Math.round((effectiveNutrition.protein / (Number.parseInt(draftServings.trim() || '1', 10) || 1)) * 10) / 10,
        fat: Math.round((effectiveNutrition.fat / (Number.parseInt(draftServings.trim() || '1', 10) || 1)) * 10) / 10,
        carbs: Math.round((effectiveNutrition.carbs / (Number.parseInt(draftServings.trim() || '1', 10) || 1)) * 10) / 10,
      },
      ingredients: draftIngredientRows
        .filter((row) => row.preset || row.query.trim())
        .map((row, index) => ({
          id: `ingredient-${index}-${Date.now()}`,
          name: row.preset?.name || row.query.trim(),
          amount: formatIngredientAmount(row),
        })),
      steps: stepLines.map((item, index) => ({ id: `step-${index}-${Date.now()}`, text: item })),
      suitableForChildren: draftClassifiers.includes('kids'),
      suitableForFamily: draftClassifiers.includes('family'),
    };

    try {
      setBuilderSaving(true);
      setBuilderError(null);
      const savedRecipe = editingRecipeId ? await onRecipeUpdate(nextRecipe) : await onRecipeCreate(nextRecipe);
      setSelectedRecipeId(savedRecipe.id);
      setBuilderOpen(false);
      resetBuilder();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save recipe.';
      setBuilderError(
        message.includes("Could not find the table 'public.recipes'")
          ? 'Supabase recipes table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/recipes.sql in Supabase SQL Editor, then save again.'
          : message,
      );
    } finally {
      setBuilderSaving(false);
    }
  }

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalogRecipes.filter((recipe) => {
      if (mealFilter !== 'all' && recipe.mealType !== mealFilter) return false;
      if (classifierFilter !== 'all' && !recipe.classifiers.includes(classifierFilter)) return false;
      if (!query) return true;
      const haystack = [
        recipe.title,
        recipe.description,
        recipe.cuisine || '',
        recipe.tags.join(' '),
        recipe.classifiers.join(' '),
        ...recipe.ingredients.map((item) => item.name),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [catalogRecipes, classifierFilter, mealFilter, search]);

  const activeFilterCount = (mealFilter !== 'all' ? 1 : 0) + (classifierFilter !== 'all' ? 1 : 0);

  const selectedRecipe = selectedRecipeId ? catalogRecipes.find((recipe) => recipe.id === selectedRecipeId) || null : null;

  // Live customization: chosen option per choice slot; recomputed nutrition + ingredients.
  const [recipeSelection, setRecipeSelection] = useState<RecipeSelection>({});
  const [logMealType, setLogMealType] = useState<NutritionMealType>('lunch');
  const [logServings, setLogServings] = useState(1);
  const [logAdded, setLogAdded] = useState(false);
  useEffect(() => {
    setRecipeSelection({});
    setLogServings(1);
    setLogAdded(false);
    setLogMealType(defaultMealTypeForSlot(selectedRecipe?.mealSlot));
    // selectedRecipe is keyed by selectedRecipeId; re-running on id change is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecipeId]);

  const recipeView = useMemo(() => {
    if (!selectedRecipe) return null;
    // Recompute from ingredients only when the recipe has variant choices to apply.
    // Otherwise trust the saved per-serving nutrition — this preserves manually
    // entered values that the ingredients can't reproduce.
    const hasChoices = (selectedRecipe.choices?.length ?? 0) > 0;
    return {
      nutrition: hasChoices
        ? computeRecipeNutritionForSelection(selectedRecipe, recipeSelection).nutrition
        : selectedRecipe.nutritionPerServing,
      ingredients: resolveRecipeIngredients(selectedRecipe.ingredients, selectedRecipe.choices, recipeSelection),
    };
  }, [selectedRecipe, recipeSelection]);

  function handleLogToToday() {
    if (!selectedRecipe || !recipeView || !onNutritionEntriesChange) return;
    const servings = Math.max(1, logServings);
    const n = recipeView.nutrition;
    const round1 = (value: number) => Math.round(value * servings * 10) / 10;
    const entry: NutritionFoodEntry = {
      id: createRecipeLogId(),
      name: `${selectedRecipe.title}${servings > 1 ? ` ×${servings}` : ''}`,
      mealType: logMealType,
      date: todayDateKey(),
      calories: String(Math.round(n.calories * servings)),
      protein: String(round1(n.protein)),
      fat: String(round1(n.fat)),
      carbs: String(round1(n.carbs)),
    };
    onNutritionEntriesChange((prev) => [entry, ...prev]);
    setLogAdded(true);
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard
          title="Recipes"
          headerRight={
            <Pressable style={styles.addRecipeBtn} onPress={openBuilderForCreate}>
              <Text style={styles.addRecipeBtnText}>Add recipe</Text>
            </Pressable>
          }
        >
          <View style={styles.searchRow}>
            <SearchIcon color={colors.subtext} />
            <TextInput
              placeholder="Search recipes"
              placeholderTextColor={colors.subtext}
              style={styles.searchField}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <Pressable hitSlop={8} style={styles.searchClearBtn} onPress={() => setSearch('')}>
                <Text style={styles.searchClearText}>×</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.toolbar}>
            <Pressable
              style={[styles.filterBtn, (filtersOpen || activeFilterCount > 0) && styles.filterBtnActive]}
              onPress={() => setFiltersOpen((value) => !value)}
            >
              <FilterIcon color={filtersOpen || activeFilterCount > 0 ? '#ffffff' : colors.text} />
              <Text style={[styles.filterBtnText, (filtersOpen || activeFilterCount > 0) && styles.filterBtnTextActive]}>Filters</Text>
              {activeFilterCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>

            <View style={styles.segment}>
              <Pressable style={[styles.segmentBtn, layoutMode === 'grid' && styles.segmentBtnActive]} onPress={() => setLayoutMode('grid')}>
                <GridIcon color={layoutMode === 'grid' ? '#ffffff' : colors.subtext} />
              </Pressable>
              <Pressable style={[styles.segmentBtn, layoutMode === 'list' && styles.segmentBtnActive]} onPress={() => setLayoutMode('list')}>
                <ListIcon color={layoutMode === 'list' ? '#ffffff' : colors.subtext} />
              </Pressable>
            </View>
          </View>

          {filtersOpen ? (
            <View style={styles.filterPanel}>
              <Text style={styles.filterGroupLabel}>Category</Text>
              <View style={styles.filterRow}>
                {RECIPE_SECTION_FILTERS.map((filter) => {
                  const active = mealFilter === filter.key;
                  return (
                    <Pressable key={filter.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setMealFilter(filter.key)}>
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.filterGroupLabel}>Recipe type</Text>
              <View style={styles.filterRow}>
                {RECIPE_CLASSIFIER_FILTERS.map((filter) => {
                  const active = classifierFilter === filter.key;
                  return (
                    <Pressable key={filter.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setClassifierFilter(filter.key)}>
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {mealFilter !== 'all' || classifierFilter !== 'all' ? (
                <Pressable style={styles.clearFiltersBtn} onPress={() => { setMealFilter('all'); setClassifierFilter('all'); }}>
                  <Text style={styles.clearFiltersText}>Clear all filters</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {filteredRecipes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No recipes match this search</Text>
              <Text style={styles.emptyText}>Try another search or clear the filters.</Text>
            </View>
          ) : (
            <View style={[styles.recipeList, layoutMode === 'grid' && styles.recipeGrid]}>
              {filteredRecipes.map((recipe) => {
                const active = selectedRecipe?.id === recipe.id;
                const displayTags = getRecipeDisplayTags(recipe);
                const placeholderTone = getRecipePlaceholderTone(recipe.mealType);
                const shortDescription = getShortRecipeDescription(recipe);
                const gridMode = layoutMode === 'grid';
                const listRow = !gridMode && !isMobile;
                return (
                  <Pressable
                    key={recipe.id}
                    style={[styles.recipeCard, gridMode && styles.recipeCardGrid, gridMode && isMobile && styles.recipeCardGridMobile, listRow && styles.recipeCardListRow, active && styles.recipeCardActive]}
                    onPress={() => setSelectedRecipeId(recipe.id)}
                  >
                    {RECIPE_IMAGES[recipe.id] || recipe.photoUri ? (
                      <View style={[styles.recipeCardPhotoFrame, gridMode && styles.recipeCardPhotoFrameGrid, listRow && styles.recipeCardPhotoFrameListRow]}>
                        <Image source={RECIPE_IMAGES[recipe.id] || { uri: recipe.photoUri }} style={[styles.recipeCardPhoto, gridMode && styles.recipeCardPhotoGrid]} resizeMode="cover" />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.recipeCardPhotoFallback,
                          gridMode && styles.recipeCardPhotoFallbackGrid,
                          listRow && styles.recipeCardPhotoFrameListRow,
                          { backgroundColor: placeholderTone.bg },
                        ]}
                      >
                        <View
                          style={[
                            styles.recipeCardPhotoOrb,
                            gridMode && styles.recipeCardPhotoOrbGrid,
                            { backgroundColor: `${placeholderTone.accent}22` },
                          ]}
                        />
                        <View style={styles.recipeCardPhotoEmojiWrap} pointerEvents="none">
                          <Text style={[styles.recipeCardPhotoEmoji, gridMode && styles.recipeCardPhotoEmojiGrid]}>
                            {getRecipePlaceholderEmoji(recipe.mealType)}
                          </Text>
                        </View>
                        <Text style={[styles.recipeCardPhotoLabel, gridMode && styles.recipeCardPhotoLabelGrid, { color: placeholderTone.accent }]}>
                          {selectedMealTypeLabel(recipe.mealType)}
                        </Text>
                      </View>
                    )}
                    <View style={listRow ? styles.recipeCardBodyListRow : undefined}>
                      <View style={styles.recipeCardTop}>
                        <View style={styles.recipeMetaWrap}>
                          <Text style={[styles.recipeTitle, gridMode && styles.recipeTitleGrid]} numberOfLines={gridMode ? 2 : 3}>
                            {recipe.title}
                          </Text>
                          {shortDescription ? (
                            <Text style={[styles.recipeDescription, gridMode && styles.recipeDescriptionGrid]} numberOfLines={2}>
                              {shortDescription}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={[styles.recipeStatsRow, gridMode && styles.recipeStatsRowGrid]}>
                        <Text style={styles.recipeStat}>{recipe.cookTimeMinutes} min</Text>
                        <Text style={styles.recipeStat}>{recipe.servings} servings</Text>
                        <Text style={styles.recipeStat}>{recipe.nutritionPerServing.calories} kcal</Text>
                      </View>
                      {displayTags.length ? (
                        <View style={[styles.tagRow, gridMode && styles.tagRowGrid]}>
                          {displayTags.map((tag) => (
                            <View key={`${recipe.id}-${tag}`} style={[styles.tagChip, gridMode && styles.tagChipGrid]}>
                              <Text style={styles.tagChipText}>{formatTagLabel(tag)}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </SectionCard>
      </ScrollView>

      <Modal visible={!!selectedRecipe} transparent animationType="fade" onRequestClose={() => setSelectedRecipeId(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedRecipeId(null)} />
          {selectedRecipe ? (
            <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>
              <View style={styles.modalHandle} />
              <View style={[styles.modalHeader, isMobile && styles.modalHeaderMobile]}>
                <View style={styles.modalTitleWrap}>
                  <Text style={styles.modalMealType}>{selectedRecipe.mealType}</Text>
                  <Text style={styles.modalTitle}>{selectedRecipe.title}</Text>
                  <Text style={styles.modalSubtitle}>{selectedRecipe.description}</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setSelectedRecipeId(null)}>
                  <Text style={styles.closeBtnText}>×</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {RECIPE_IMAGES[selectedRecipe.id] || selectedRecipe.photoUri ? (
                <Image
                  source={RECIPE_IMAGES[selectedRecipe.id] || { uri: selectedRecipe.photoUri }}
                  style={[styles.modalRecipePhoto, isMobile && styles.modalRecipePhotoMobile]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.modalRecipePhoto,
                    isMobile && styles.modalRecipePhotoMobile,
                    styles.modalPhotoPlaceholder,
                    { backgroundColor: getRecipePlaceholderTone(selectedRecipe.mealType).bg },
                  ]}
                >
                  <Text style={styles.modalPhotoPlaceholderEmoji}>{getRecipePlaceholderEmoji(selectedRecipe.mealType)}</Text>
                </View>
              )}
              {!RECIPE_IMAGES[selectedRecipe.id] && selectedRecipe.photoUri && selectedRecipe.photoCredit ? (
                <Text style={styles.photoCreditText}>
                  Photo: {selectedRecipe.photoCredit.name} / {selectedRecipe.photoCredit.source}
                </Text>
              ) : null}

              <View style={[styles.modalStatsRow, isMobile && styles.modalStatsRowMobile]}>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatValue}>{selectedRecipe.cookTimeMinutes}</Text>
                  <Text style={styles.modalStatLabel}>minutes</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatValue}>{selectedRecipe.servings}</Text>
                  <Text style={styles.modalStatLabel}>servings</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatValue}>{selectedRecipe.cuisine || 'Home'}</Text>
                  <Text style={styles.modalStatLabel}>style</Text>
                </View>
              </View>

              <View style={[styles.nutritionRow, isMobile && styles.nutritionRowMobile]}>
                <View style={[styles.nutritionCard, isMobile && styles.nutritionCardMobile]}>
                  <Text style={styles.nutritionValue}>{(recipeView?.nutrition ?? selectedRecipe.nutritionPerServing).calories}</Text>
                  <Text style={styles.nutritionLabel}>kcal</Text>
                </View>
                <View style={[styles.nutritionCard, isMobile && styles.nutritionCardMobile]}>
                  <Text style={styles.nutritionValue}>{(recipeView?.nutrition ?? selectedRecipe.nutritionPerServing).protein} g</Text>
                  <Text style={styles.nutritionLabel}>protein</Text>
                </View>
                <View style={[styles.nutritionCard, isMobile && styles.nutritionCardMobile]}>
                  <Text style={styles.nutritionValue}>{(recipeView?.nutrition ?? selectedRecipe.nutritionPerServing).fat} g</Text>
                  <Text style={styles.nutritionLabel}>fat</Text>
                </View>
                <View style={[styles.nutritionCard, isMobile && styles.nutritionCardMobile]}>
                  <Text style={styles.nutritionValue}>{(recipeView?.nutrition ?? selectedRecipe.nutritionPerServing).carbs} g</Text>
                  <Text style={styles.nutritionLabel}>carbs</Text>
                </View>
              </View>

                {ownedRecipeIds.has(selectedRecipe.id) ? (
                  <View style={styles.recipeOwnerActions}>
                    <Pressable style={styles.builderSecondaryBtn} onPress={() => openBuilderForEdit(selectedRecipe)}>
                      <Text style={styles.builderSecondaryBtnText}>Edit recipe</Text>
                    </Pressable>
                    <Pressable style={styles.recipeDeleteBtn} onPress={() => handleDeleteRecipePress(selectedRecipe)}>
                      <Text style={styles.recipeDeleteBtnText}>Delete recipe</Text>
                    </Pressable>
                  </View>
                ) : null}

                {selectedRecipe.choices?.length ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Customize</Text>
                    {selectedRecipe.choices.map((choiceItem) => {
                      const currentOptionId = recipeSelection[choiceItem.id] ?? choiceItem.defaultOptionId;
                      return (
                        <View key={choiceItem.id} style={styles.choiceRow}>
                          <Text style={styles.choiceLabel}>{choiceItem.label}</Text>
                          <View style={styles.choiceOptions}>
                            {choiceItem.options.map((option) => {
                              const active = option.id === currentOptionId;
                              return (
                                <Pressable
                                  key={option.id}
                                  style={[styles.choiceChip, active && styles.choiceChipActive]}
                                  onPress={() => setRecipeSelection((prev) => ({ ...prev, [choiceItem.id]: option.id }))}
                                >
                                  <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{option.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Ingredients</Text>
                  <Text style={styles.detailHint}>Per serving · {selectedRecipe.servings} servings total</Text>
                  {(recipeView?.ingredients ?? selectedRecipe.ingredients).map((ingredient) => (
                    <View key={ingredient.id} style={styles.detailRow}>
                      <Text style={styles.detailBullet}>•</Text>
                      <Text style={styles.detailText}>{formatIngredientLine(ingredient)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Steps</Text>
                  {selectedRecipe.steps.map((step, index) => (
                    <View key={step.id} style={styles.stepCard}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step.text}</Text>
                    </View>
                  ))}
                </View>

                {onNutritionEntriesChange ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Log this meal</Text>
                    <View style={styles.choiceOptions}>
                      {LOG_MEAL_TYPES.map((mealTypeOption) => {
                        const active = logMealType === mealTypeOption;
                        return (
                          <Pressable
                            key={mealTypeOption}
                            style={[styles.choiceChip, active && styles.choiceChipActive]}
                            onPress={() => {
                              setLogMealType(mealTypeOption);
                              setLogAdded(false);
                            }}
                          >
                            <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                              {mealTypeOption.charAt(0).toUpperCase() + mealTypeOption.slice(1)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.logServingsRow}>
                      <Text style={styles.choiceLabel}>Servings</Text>
                      <View style={styles.stepper}>
                        <Pressable style={styles.stepperBtn} onPress={() => { setLogServings((value) => Math.max(1, value - 1)); setLogAdded(false); }}>
                          <Text style={styles.stepperBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.stepperValue}>{logServings}</Text>
                        <Pressable style={styles.stepperBtn} onPress={() => { setLogServings((value) => value + 1); setLogAdded(false); }}>
                          <Text style={styles.stepperBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                    <Pressable style={[styles.logBtn, logAdded && styles.logBtnDone]} onPress={handleLogToToday}>
                      <Text style={styles.logBtnText}>
                        {logAdded
                          ? 'Added to today ✓  ·  add again'
                          : `Add to today  ·  ${Math.round((recipeView?.nutrition.calories ?? 0) * Math.max(1, logServings))} kcal`}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={builderOpen} transparent animationType="fade" onRequestClose={() => setBuilderOpen(false)}>
        <View style={styles.builderScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBuilderOpen(false)} />
          <View style={styles.builderScreen}>
          <View style={[styles.builderScreenHeader, isMobile && styles.builderScreenHeaderMobile]}>
            <View style={styles.builderScreenTitleWrap}>
              <Text style={styles.modalMealType}>Custom recipe</Text>
              <Text style={styles.modalTitle}>{editingRecipeId ? 'Edit recipe' : 'Recipe Constructor'}</Text>
              <Text style={styles.modalSubtitle}>
                {editingRecipeId ? 'Update your recipe, ingredients, nutrition and steps.' : 'Add your own recipe with nutrition, ingredients, and steps.'}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={() => setBuilderOpen(false)}>
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.builderScreenScroll} contentContainerStyle={styles.builderScreenScrollContent}>
            <View style={styles.builderSectionCard}>
              <TextInput placeholder="Recipe title" placeholderTextColor={colors.subtext} style={styles.builderInput} value={draftTitle} onChangeText={setDraftTitle} />
              {draftPhotoUri ? <Image source={{ uri: draftPhotoUri }} style={styles.photoPreview} resizeMode="cover" /> : null}
              <View style={[styles.photoActionRow, isMobile && styles.photoActionRowMobile]}>
                <Pressable style={styles.builderSecondaryBtn} onPress={pickDraftPhoto}>
                  <Text style={styles.builderSecondaryBtnText}>{draftPhotoUri ? 'Change photo' : 'Add photo'}</Text>
                </Pressable>
                {draftPhotoUri ? (
                  <Pressable style={styles.builderSecondaryBtn} onPress={() => setDraftPhotoUri('')}>
                    <Text style={styles.builderSecondaryBtnText}>Remove photo</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.builderSectionCard}>
              <Text style={styles.builderSectionTitle}>1. Time and servings</Text>
              <View style={styles.builderGrid}>
                <TextInput placeholder="Cook time" placeholderTextColor={colors.subtext} keyboardType="number-pad" style={styles.builderInput} value={draftCookTime} onChangeText={setDraftCookTime} />
                <TextInput placeholder="Servings" placeholderTextColor={colors.subtext} keyboardType="number-pad" style={styles.builderInput} value={draftServings} onChangeText={setDraftServings} />
              </View>
            </View>

            <View style={styles.builderSectionCard}>
              <View style={[styles.builderSectionHeaderRow, isMobile && styles.builderSectionHeaderRowMobile]}>
                <Text style={styles.builderSectionTitle}>2. Ingredients</Text>
                <Pressable style={styles.addIngredientTopBtn} onPress={addDraftIngredientRow}>
                  <Text style={styles.addIngredientTopBtnText}>+ Add ingredient</Text>
                </Pressable>
              </View>
              {draftIngredientRows.map((row) => {
                const queryText = row.query.trim();
                const suggestions = queryText
                  ? NUTRITION_FOOD_PRESETS.filter((item) => item.name.toLowerCase().includes(queryText.toLowerCase()) && item.name.toLowerCase() !== queryText.toLowerCase()).slice(0, 5)
                  : [];
                const ingredientNutrition = getIngredientNutrition(row);
                const calculationGrams = getIngredientCalculationGrams(row);
                return (
                  <View key={row.id} style={[styles.ingredientBuilderCard, unitPickerOpenFor === row.id && styles.ingredientBuilderCardOpen]}>
                    <View style={[styles.ingredientTopRow, isMobile && styles.ingredientTopRowMobile]}>
                      <TextInput
                        placeholder="Product"
                        placeholderTextColor={colors.subtext}
                        style={[styles.builderInput, styles.builderInputWide, isMobile && styles.builderInputWideMobile]}
                        value={row.query}
                        onChangeText={(text) =>
                          updateDraftIngredientRow(row.id, (current) => ({
                            ...current,
                            query: text,
                            preset: current.preset && current.preset.name.toLowerCase() === text.trim().toLowerCase() ? current.preset : null,
                          }))
                        }
                      />
                      <TextInput
                        placeholder="0"
                        placeholderTextColor={colors.subtext}
                        keyboardType="number-pad"
                        style={[styles.builderInput, styles.ingredientAmountInput, isMobile && styles.ingredientAmountInputMobile]}
                        value={row.grams}
                        onFocus={() => updateDraftIngredientRow(row.id, (current) => (current.grams === '0' ? { ...current, grams: '' } : current))}
                        onChangeText={(text) => updateDraftIngredientRow(row.id, (current) => ({ ...current, grams: cleanNutritionNumber(text) }))}
                      />
                      <Pressable
                        style={[styles.unitSelectBox, isMobile && styles.unitSelectBoxMobile]}
                        onPress={() => setUnitPickerOpenFor((current) => (current === row.id ? null : row.id))}
                      >
                        <Text style={styles.unitSelectText}>{INGREDIENT_UNITS.find((unit) => unit.key === row.unit)?.label || row.unit}</Text>
                        {unitPickerOpenFor === row.id ? (
                          <View style={styles.unitFloatingMenu}>
                            {INGREDIENT_UNITS.map((unit) => {
                              const active = row.unit === unit.key;
                              return (
                                <Pressable
                                  key={`${row.id}-${unit.key}`}
                                  style={[styles.unitFloatingItem, active && styles.unitFloatingItemActive]}
                                  onPress={() => {
                                    updateDraftIngredientRow(row.id, (current) => ({ ...current, unit: unit.key }));
                                    setUnitPickerOpenFor(null);
                                  }}
                                >
                                  <Text style={[styles.unitFloatingItemText, active && styles.unitFloatingItemTextActive]}>{unit.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        ) : null}
                      </Pressable>
                    </View>

                    {suggestions.length > 0 ? (
                      <View style={styles.productSuggestionMenu}>
                        {suggestions.map((item) => (
                          <Pressable
                            key={`${row.id}-${item.id}`}
                            style={styles.productSuggestionItem}
                            onPress={() => updateDraftIngredientRow(row.id, (current) => ({ ...current, query: item.name, preset: item }))}
                          >
                            <Text style={styles.productSuggestionText}>{item.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.ingredientBuilderFooter}>
                      {ingredientNutrition ? (
                        <Text style={styles.builderHint}>{`${ingredientNutrition.calories} kcal · calculated as ${Math.round(calculationGrams)} g`}</Text>
                      ) : (
                        <View style={styles.builderHint} />
                      )}
                      <Pressable style={styles.builderRemoveBtn} onPress={() => removeDraftIngredientRow(row.id)}>
                        <Text style={styles.builderRemoveBtnText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              <View style={styles.nutritionHintRow}>
                <Text style={[styles.builderInlineHint, { flex: 1 }]}>
                  {manualNutritionOn
                    ? 'Manual totals for the whole recipe. They’re divided by servings on save.'
                    : 'Nutrition is calculated automatically from selected products and units. Pieces and spoons use estimated grams.'}
                </Text>
                <Pressable onPress={() => (manualNutritionOn ? setManualNutritionOn(false) : enableManualNutrition())}>
                  <Text style={styles.nutritionToggleLink}>{manualNutritionOn ? 'Use auto' : 'Enter manually'}</Text>
                </Pressable>
              </View>
              {manualNutritionOn ? (
                <View style={styles.nutritionRow}>
                  <View style={styles.nutritionCard}>
                    <TextInput
                      style={styles.nutritionInput}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.subtext}
                      value={manualNutrition.calories}
                      onChangeText={(t) => setManualNutrition((p) => ({ ...p, calories: t.replace(/[^\d]/g, '').slice(0, 5) }))}
                    />
                    <Text style={styles.nutritionLabel}>total kcal</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <TextInput
                      style={styles.nutritionInput}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.subtext}
                      value={manualNutrition.protein}
                      onChangeText={(t) => setManualNutrition((p) => ({ ...p, protein: t.replace(/[^\d.,]/g, '') }))}
                    />
                    <Text style={styles.nutritionLabel}>protein (g)</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <TextInput
                      style={styles.nutritionInput}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.subtext}
                      value={manualNutrition.fat}
                      onChangeText={(t) => setManualNutrition((p) => ({ ...p, fat: t.replace(/[^\d.,]/g, '') }))}
                    />
                    <Text style={styles.nutritionLabel}>fat (g)</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <TextInput
                      style={styles.nutritionInput}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.subtext}
                      value={manualNutrition.carbs}
                      onChangeText={(t) => setManualNutrition((p) => ({ ...p, carbs: t.replace(/[^\d.,]/g, '') }))}
                    />
                    <Text style={styles.nutritionLabel}>carbs (g)</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.nutritionRow}>
                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionValue}>{Math.round(draftNutrition.calories)}</Text>
                    <Text style={styles.nutritionLabel}>total kcal</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionValue}>{Math.round(draftNutrition.protein * 10) / 10} g</Text>
                    <Text style={styles.nutritionLabel}>protein</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionValue}>{Math.round(draftNutrition.fat * 10) / 10} g</Text>
                    <Text style={styles.nutritionLabel}>fat</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <Text style={styles.nutritionValue}>{Math.round(draftNutrition.carbs * 10) / 10} g</Text>
                    <Text style={styles.nutritionLabel}>carbs</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.builderSectionCard}>
              <Text style={styles.builderSectionTitle}>3. Preparation</Text>
              <TextInput
                placeholder={'Recipe steps, one per line\nExample: Mix all ingredients'}
                placeholderTextColor={colors.subtext}
                style={[styles.builderInput, styles.builderTextareaLarge]}
                multiline
                value={draftSteps}
                onChangeText={setDraftSteps}
              />
            </View>

            <View style={styles.builderSectionCard}>
              <Text style={styles.builderSectionTitle}>4. Recipe type</Text>
              <Text style={styles.builderMiniLabel}>Section</Text>
              <View style={styles.filterRow}>
                {RECIPE_SECTION_FILTERS.filter((item) => item.key !== 'all').map((filter) => {
                  const active = draftMealType === filter.key;
                  return (
                    <Pressable key={`draft-${filter.key}`} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setDraftMealType(filter.key as RecipeMealType)}>
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.builderMiniLabel}>Recipe type</Text>
              <View style={styles.filterRow}>
                {RECIPE_CLASSIFIER_FILTERS.filter((item) => item.key !== 'all').map((filter) => {
                  const active = draftClassifiers.includes(filter.key as RecipeClassifier);
                  return (
                    <Pressable
                      key={`draft-classifier-${filter.key}`}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => toggleDraftClassifier(filter.key as RecipeClassifier)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.builderActions}>
              <Pressable
                style={styles.builderSecondaryBtn}
                onPress={() => {
                  if (editingRecipe) {
                    openBuilderForEdit(editingRecipe);
                    return;
                  }
                  resetBuilder();
                }}
              >
                <Text style={styles.builderSecondaryBtnText}>{editingRecipe ? 'Reset' : 'Clear'}</Text>
              </Pressable>
              <Pressable style={[styles.addRecipeBtn, styles.builderPrimaryBtn]} onPress={saveDraftRecipe}>
                <Text style={styles.addRecipeBtnText}>
                  {builderSaving ? 'Saving...' : editingRecipeId ? 'Save changes' : 'Save recipe'}
                </Text>
              </Pressable>
            </View>
            {builderError ? <Text style={styles.builderErrorText}>{builderError}</Text> : null}
          </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function selectedMealTypeLabel(value: RecipeMealType) {
  switch (value) {
    case 'brunch':
      return 'Brunch';
    case 'dinner':
      return 'Dinner';
    case 'main_dish':
      return 'Main dish';
    case 'soups':
      return 'Soup';
    case 'salads':
      return 'Salad';
    case 'sides':
      return 'Side';
    case 'appetizers':
      return 'Appetizer';
    case 'sandwiches':
      return 'Sandwich';
    case 'pasta':
      return 'Pasta';
    case 'pizza':
      return 'Pizza';
    case 'desserts':
      return 'Dessert';
    case 'baking':
      return 'Baking';
    case 'drinks':
      return 'Drink';
    case 'sauces':
      return 'Sauce';
    case 'meal_prep':
      return 'Meal prep';
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    default:
      return value;
  }
}

function formatTagLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingBottom: 120,
      gap: 2,
    },
    heroText: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    addRecipeBtn: {
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    addRecipeBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
      marginBottom: 12,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      borderRadius: 16,
      paddingHorizontal: 14,
      height: 46,
      marginBottom: 12,
    },
    searchField: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 0,
    },
    searchClearBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchClearText: {
      color: colors.subtext,
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 18,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    filterBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    filterBtnText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    filterBtnTextActive: {
      color: '#ffffff',
    },
    filterBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    filterBadgeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '900',
    },
    segment: {
      flexDirection: 'row',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      padding: 3,
      gap: 2,
    },
    segmentBtn: {
      width: 36,
      height: 32,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
    },
    filterPanel: {
      borderTopWidth: 1,
      borderColor: colors.border,
      marginTop: 12,
      paddingTop: 12,
      marginBottom: 4,
      gap: 6,
    },
    filterGroupLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 4,
    },
    clearFiltersBtn: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearFiltersText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '700',
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    filterChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.glassSoft,
    },
    filterChipActive: {
      backgroundColor: colors.selection,
      borderColor: colors.primary,
    },
    filterChipText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: colors.text,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
    },
    summaryCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 12,
      backgroundColor: colors.glassSoft,
      alignItems: 'center',
    },
    summaryValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    summaryLabel: {
      color: colors.subtext,
      fontSize: 12,
      marginTop: 4,
    },
    recipeList: {
      gap: 12,
    },
    recipeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
    },
    recipeCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 14,
      backgroundColor: colors.glassSoft,
      overflow: 'hidden',
    },
    recipeCardGrid: {
      width: '31.8%',
      padding: 10,
    },
    recipeCardListRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    recipeCardPhotoFrameListRow: {
      width: 200,
      height: 132,
      marginBottom: 0,
      flexShrink: 0,
    },
    recipeCardBodyListRow: {
      flex: 1,
      gap: 8,
      justifyContent: 'center',
    },
    recipeCardGridMobile: {
      width: '48.2%',
    },
    recipeCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    recipeCardPhotoFrame: {
      width: '100%',
      height: 190,
      borderRadius: 16,
      marginBottom: 12,
      backgroundColor: 'transparent',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recipeCardPhotoFrameGrid: {
      height: undefined,
      aspectRatio: 1.18,
      marginBottom: 8,
    },
    recipeCardPhoto: {
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
    },
    recipeCardPhotoGrid: {
      width: '100%',
      height: '100%',
    },
    recipeCardPhotoFallback: {
      width: '100%',
      height: 190,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      alignItems: 'flex-start',
      justifyContent: 'flex-end',
      padding: 18,
      position: 'relative',
    },
    recipeCardPhotoFallbackGrid: {
      height: undefined,
      aspectRatio: 1.18,
      padding: 12,
      marginBottom: 8,
    },
    recipeCardPhotoOrb: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 999,
      top: -36,
      right: -28,
    },
    recipeCardPhotoOrbGrid: {
      width: 92,
      height: 92,
      top: -18,
      right: -14,
    },
    recipeCardPhotoLabel: {
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    recipeCardPhotoLabelGrid: {
      fontSize: 11,
      letterSpacing: 0.6,
    },
    recipeCardPhotoEmojiWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recipeCardPhotoEmoji: {
      fontSize: 64,
      opacity: 0.9,
    },
    recipeCardPhotoEmojiGrid: {
      fontSize: 40,
    },
    modalPhotoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalPhotoPlaceholderEmoji: {
      fontSize: 72,
      opacity: 0.9,
    },
    photoCreditText: {
      color: colors.subtext,
      fontSize: 10,
      marginTop: -6,
      marginBottom: 6,
      textAlign: 'right',
    },
    recipeCardTop: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    recipeMetaWrap: {
      flex: 1,
      gap: 6,
    },
    recipeMealType: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    recipeTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    recipeTitleGrid: {
      fontSize: 14,
      lineHeight: 18,
    },
    recipeDescription: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 19,
    },
    recipeDescriptionGrid: {
      fontSize: 11,
      lineHeight: 15,
    },
    recipeStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 12,
    },
    recipeStatsRowGrid: {
      gap: 8,
      marginTop: 8,
    },
    recipeStat: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '700',
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    tagRowGrid: {
      gap: 5,
      marginTop: 8,
    },
    tagChip: {
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.7)',
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    tagChipGrid: {
      paddingHorizontal: 7,
      paddingVertical: 4,
    },
    tagChipText: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
    },
    emptyCard: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.glassSoft,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    emptyText: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: 12,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
    },
    modalCard: {
      maxHeight: '88%',
      width: '100%',
      maxWidth: 760,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.96)',
      backgroundColor: 'rgba(248,250,252,0.97)',
      padding: 18,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 14 },
      elevation: 24,
    },
    modalCardMobile: {
      maxHeight: '92%',
      padding: 14,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
    },
    modalHandle: {
      width: 52,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    },
    modalHeaderMobile: {
      alignItems: 'flex-start',
    },
    modalTitleWrap: {
      flex: 1,
      gap: 4,
    },
    modalMealType: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    modalTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '900',
    },
    modalSubtitle: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    modalRecipePhoto: {
      width: '100%',
      height: 210,
      borderRadius: 22,
      marginBottom: 14,
      backgroundColor: '#e8eef7',
    },
    modalRecipePhotoMobile: {
      height: 170,
      borderRadius: 18,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    closeBtnText: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 24,
    },
    builderSectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
    },
    builderSectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    builderSectionHeaderRowMobile: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    addIngredientTopBtn: {
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    addIngredientTopBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '800',
    },
    builderMiniLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 8,
    },
    builderInlineHint: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 8,
    },
    builderErrorText: {
      color: '#b91c1c',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
      marginHorizontal: 18,
      marginTop: -6,
      marginBottom: 18,
    },
    builderInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
      marginBottom: 12,
    },
    photoPreview: {
      width: '100%',
      height: 190,
      borderRadius: 18,
      marginBottom: 12,
      backgroundColor: '#e8eef7',
    },
    photoActionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    photoActionRowMobile: {
      flexDirection: 'column',
    },
    builderTextarea: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    builderTextareaLarge: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    builderScrim: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    builderScreen: {
      width: '100%',
      maxWidth: 640,
      maxHeight: '92%',
      backgroundColor: colors.bg,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingTop: 18,
    },
    builderScreenHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 18,
      paddingBottom: 14,
    },
    builderScreenHeaderMobile: {
      alignItems: 'stretch',
    },
    builderScreenTitleWrap: {
      flex: 1,
      gap: 4,
    },
    builderScreenScroll: {
      flex: 1,
    },
    builderScreenScrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 36,
      gap: 14,
    },
    builderSectionCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.42)',
      borderRadius: 22,
      padding: 14,
      shadowColor: colors.shadow,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    builderGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 4,
    },
    builderInputWide: {
      flex: 1,
      minWidth: 220,
    },
    builderInputWideMobile: {
      width: '100%',
      minWidth: 0,
    },
    ingredientTopRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    ingredientTopRowMobile: {
      flexWrap: 'wrap',
    },
    ingredientAmountInput: {
      width: 94,
      textAlign: 'center',
    },
    ingredientAmountInputMobile: {
      width: '100%',
      textAlign: 'left',
    },
    unitSelectBox: {
      width: 86,
      minHeight: 48,
      position: 'relative',
      zIndex: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 12,
      marginBottom: 12,
    },
    unitSelectBoxMobile: {
      width: 100,
    },
    unitSelectText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    unitFloatingMenu: {
      position: 'absolute',
      top: 56,
      right: 0,
      width: 112,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 8,
      gap: 6,
      shadowColor: colors.shadow,
      shadowOpacity: 0.85,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
      elevation: 30,
      zIndex: 999,
    },
    unitFloatingItem: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: '#f8fafc',
    },
    unitFloatingItemActive: {
      backgroundColor: colors.selection,
    },
    unitFloatingItemText: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    unitFloatingItemTextActive: {
      color: colors.text,
    },
    ingredientBuilderCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.62)',
      borderRadius: 18,
      padding: 12,
      marginBottom: 12,
      zIndex: 1,
    },
    ingredientBuilderCardOpen: {
      zIndex: 100,
      elevation: 30,
    },
    productSuggestionMenu: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: '#ffffff',
      padding: 6,
      gap: 4,
      marginTop: -4,
      marginBottom: 12,
    },
    productSuggestionItem: {
      borderRadius: 12,
      backgroundColor: '#f8fafc',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    productSuggestionText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    ingredientBuilderFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 4,
    },
    builderHint: {
      flex: 1,
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
    },
    builderRemoveBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: colors.glassStrong,
    },
    builderRemoveBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    builderActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 4,
      marginBottom: 18,
      paddingHorizontal: 18,
    },
    builderSecondaryBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.62)',
      paddingHorizontal: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    builderPrimaryBtn: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    builderSecondaryBtnText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    modalStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 12,
    },
    modalStatsRowMobile: {
      gap: 8,
    },
    modalStatCard: {
      flex: 1,
      minWidth: 94,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      backgroundColor: '#ffffff',
      alignItems: 'center',
    },
    modalStatValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    modalStatLabel: {
      color: colors.subtext,
      fontSize: 12,
      marginTop: 4,
    },
    modalScroll: {
      marginTop: 4,
    },
    nutritionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 12,
    },
    nutritionRowMobile: {
      gap: 8,
    },
    nutritionCard: {
      minWidth: '22%',
      flex: 1,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      backgroundColor: '#ffffff',
      alignItems: 'center',
    },
    nutritionCardMobile: {
      minWidth: '47%',
      padding: 10,
    },
    nutritionValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    nutritionHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
    },
    nutritionToggleLink: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    nutritionInput: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
      alignSelf: 'stretch',
      width: '100%',
      paddingVertical: 2,
    },
    nutritionLabel: {
      color: colors.subtext,
      fontSize: 12,
      marginTop: 4,
      textTransform: 'capitalize',
    },
    modalScrollContent: {
      paddingBottom: 12,
      gap: 12,
    },
    detailSection: {
      gap: 8,
      borderWidth: 1,
      borderColor: '#e0e9f5',
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 14,
    },
    recipeOwnerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 2,
    },
    recipeDeleteBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.28)',
      backgroundColor: 'rgba(254, 242, 242, 0.92)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recipeDeleteBtnText: {
      color: '#dc2626',
      fontSize: 13,
      fontWeight: '800',
    },
    detailSectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    detailHint: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 18,
    },
    choiceRow: {
      gap: 8,
      paddingVertical: 6,
    },
    choiceLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    choiceOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    choiceChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    choiceChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    choiceChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    choiceChipTextActive: {
      color: '#ffffff',
    },
    logServingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    stepperBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperBtnText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 20,
    },
    stepperValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      minWidth: 20,
      textAlign: 'center',
    },
    logBtn: {
      marginTop: 10,
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      alignItems: 'center',
    },
    logBtnDone: {
      backgroundColor: '#22c55e',
    },
    logBtnText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '800',
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingVertical: 2,
    },
    detailBullet: {
      color: colors.primary,
      fontSize: 16,
      lineHeight: 20,
    },
    detailText: {
      flex: 1,
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    stepCard: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      backgroundColor: '#f8fbff',
      padding: 12,
    },
    stepBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    stepBadgeText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
    stepText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    futureText: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
  });
