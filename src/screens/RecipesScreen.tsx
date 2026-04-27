import { useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SectionCard } from '@/components/SectionCard';
import { Recipe, RecipeClassifier, RecipeMealType } from '@/types/app';
import { cleanNutritionNumber, getNutritionValuesForGrams, NUTRITION_FOOD_PRESETS, NutritionFoodPreset } from '@/lib/nutrition';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  recipes: Recipe[];
  onRecipeCreate: (recipe: Recipe) => Promise<Recipe> | Recipe;
};

const MEAL_FILTERS: Array<{ key: RecipeMealType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'main_dish', label: 'Main Dish' },
  { key: 'soups', label: 'Soups' },
  { key: 'desserts', label: 'Desserts' },
  { key: 'baking', label: 'Baking' },
];

const CLASSIFIER_FILTERS: Array<{ key: RecipeClassifier | 'all'; label: string }> = [
  { key: 'all', label: 'All types' },
  { key: 'kids', label: 'Kids' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'family', label: 'Family' },
  { key: 'quick', label: 'Quick' },
];

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

export function RecipesScreen({ recipes, onRecipeCreate }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [mealFilter, setMealFilter] = useState<RecipeMealType | 'all'>('all');
  const [classifierFilter, setClassifierFilter] = useState<RecipeClassifier | 'all'>('all');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftPhotoUri, setDraftPhotoUri] = useState('');
  const [draftMealType, setDraftMealType] = useState<RecipeMealType>('breakfast');
  const [draftCookTime, setDraftCookTime] = useState('');
  const [draftServings, setDraftServings] = useState('');
  const [draftSteps, setDraftSteps] = useState('');
  const [draftClassifiers, setDraftClassifiers] = useState<RecipeClassifier[]>([]);
  const [draftIngredientRows, setDraftIngredientRows] = useState<DraftIngredientRow[]>([createDraftIngredientRow()]);
  const [unitPickerOpenFor, setUnitPickerOpenFor] = useState<string | null>(null);

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
    setDraftTitle('');
    setDraftPhotoUri('');
    setDraftMealType('breakfast');
    setDraftCookTime('');
    setDraftServings('');
    setDraftSteps('');
    setDraftClassifiers([]);
    setDraftIngredientRows([createDraftIngredientRow()]);
    setUnitPickerOpenFor(null);
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
      id: `recipe-${Date.now()}`,
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
        calories: Math.round(draftNutrition.calories / (Number.parseInt(draftServings.trim() || '1', 10) || 1)),
        protein: Math.round((draftNutrition.protein / (Number.parseInt(draftServings.trim() || '1', 10) || 1)) * 10) / 10,
        fat: Math.round((draftNutrition.fat / (Number.parseInt(draftServings.trim() || '1', 10) || 1)) * 10) / 10,
        carbs: Math.round((draftNutrition.carbs / (Number.parseInt(draftServings.trim() || '1', 10) || 1)) * 10) / 10,
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
      const savedRecipe = await onRecipeCreate(nextRecipe);
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
    return recipes.filter((recipe) => {
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
  }, [classifierFilter, mealFilter, recipes, search]);

  const selectedRecipe = selectedRecipeId ? filteredRecipes.find((recipe) => recipe.id === selectedRecipeId) || null : null;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard
          title="Recipe Library"
          headerRight={
            <Pressable style={styles.addRecipeBtn} onPress={() => setBuilderOpen(true)}>
              <Text style={styles.addRecipeBtnText}>Add recipe</Text>
            </Pressable>
          }
        >
          <Text style={styles.heroText}>
            Start building your family recipe base here. Next we will connect this library to weekly meal plans and staff assignments.
          </Text>

          <TextInput
            placeholder="Search recipes or ingredients"
            placeholderTextColor={colors.subtext}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />

          <View style={styles.filterRow}>
            {MEAL_FILTERS.map((filter) => {
              const active = mealFilter === filter.key;
              return (
                <Pressable key={filter.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setMealFilter(filter.key)}>
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.classifierLabel}>Recipe type</Text>
          <View style={styles.filterRow}>
            {CLASSIFIER_FILTERS.map((filter) => {
              const active = classifierFilter === filter.key;
              return (
                <Pressable key={filter.key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setClassifierFilter(filter.key)}>
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{recipes.length}</Text>
              <Text style={styles.summaryLabel}>Recipes</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{recipes.filter((item) => item.suitableForChildren).length}</Text>
              <Text style={styles.summaryLabel}>Kids-ready</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{recipes.filter((item) => item.suitableForFamily).length}</Text>
              <Text style={styles.summaryLabel}>Family meals</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Saved Recipes">
          {filteredRecipes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No recipes match this search</Text>
              <Text style={styles.emptyText}>Try another ingredient, meal type, or clear the filter.</Text>
            </View>
          ) : (
            <View style={styles.recipeList}>
              {filteredRecipes.map((recipe) => {
                const active = selectedRecipe?.id === recipe.id;
                return (
                  <Pressable key={recipe.id} style={[styles.recipeCard, active && styles.recipeCardActive]} onPress={() => setSelectedRecipeId(recipe.id)}>
                    {recipe.photoUri ? <Image source={{ uri: recipe.photoUri }} style={styles.recipeCardPhoto} resizeMode="cover" /> : null}
                    <View style={styles.recipeCardTop}>
                      <View style={styles.recipeMetaWrap}>
                        <Text style={styles.recipeMealType}>{recipe.mealType}</Text>
                        <Text style={styles.recipeTitle}>{recipe.title}</Text>
                        <Text style={styles.recipeDescription}>{recipe.description}</Text>
                      </View>
                      <Pressable style={styles.openBtn} onPress={() => setSelectedRecipeId(recipe.id)}>
                        <Text style={styles.openBtnText}>Open</Text>
                      </Pressable>
                    </View>
                    <View style={styles.recipeStatsRow}>
                      <Text style={styles.recipeStat}>{selectedMealTypeLabel(recipe.mealType)}</Text>
                      <Text style={styles.recipeStat}>{recipe.cookTimeMinutes} min</Text>
                      <Text style={styles.recipeStat}>{recipe.servings} servings</Text>
                      <Text style={styles.recipeStat}>{recipe.nutritionPerServing.calories} kcal</Text>
                    </View>
                    <View style={styles.tagRow}>
                      {recipe.tags.map((tag) => (
                        <View key={`${recipe.id}-${tag}`} style={styles.tagChip}>
                          <Text style={styles.tagChipText}>{tag}</Text>
                        </View>
                      ))}
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
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleWrap}>
                  <Text style={styles.modalMealType}>{selectedRecipe.mealType}</Text>
                  <Text style={styles.modalTitle}>{selectedRecipe.title}</Text>
                  <Text style={styles.modalSubtitle}>{selectedRecipe.description}</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setSelectedRecipeId(null)}>
                  <Text style={styles.closeBtnText}>×</Text>
                </Pressable>
              </View>

              {selectedRecipe.photoUri ? <Image source={{ uri: selectedRecipe.photoUri }} style={styles.modalRecipePhoto} resizeMode="cover" /> : null}

              <View style={styles.modalStatsRow}>
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

              <View style={styles.nutritionRow}>
                <View style={styles.nutritionCard}>
                  <Text style={styles.nutritionValue}>{selectedRecipe.nutritionPerServing.calories}</Text>
                  <Text style={styles.nutritionLabel}>kcal</Text>
                </View>
                <View style={styles.nutritionCard}>
                  <Text style={styles.nutritionValue}>{selectedRecipe.nutritionPerServing.protein} g</Text>
                  <Text style={styles.nutritionLabel}>protein</Text>
                </View>
                <View style={styles.nutritionCard}>
                  <Text style={styles.nutritionValue}>{selectedRecipe.nutritionPerServing.fat} g</Text>
                  <Text style={styles.nutritionLabel}>fat</Text>
                </View>
                <View style={styles.nutritionCard}>
                  <Text style={styles.nutritionValue}>{selectedRecipe.nutritionPerServing.carbs} g</Text>
                  <Text style={styles.nutritionLabel}>carbs</Text>
                </View>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailHint}>Nutrition values are shown per serving.</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Ingredients</Text>
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <View key={ingredient.id} style={styles.detailRow}>
                      <Text style={styles.detailBullet}>•</Text>
                      <Text style={styles.detailText}>
                        {ingredient.amount} {ingredient.name}
                        {ingredient.optional ? ' (optional)' : ''}
                      </Text>
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

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Use Later</Text>
                  <Text style={styles.futureText}>Next step: connect this recipe to the weekly meal planner and staff meals screen.</Text>
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={builderOpen} animationType="slide" onRequestClose={() => setBuilderOpen(false)}>
        <View style={styles.builderScreen}>
          <View style={styles.builderScreenHeader}>
            <View style={styles.builderScreenTitleWrap}>
              <Text style={styles.modalMealType}>Custom recipe</Text>
              <Text style={styles.modalTitle}>Recipe Constructor</Text>
              <Text style={styles.modalSubtitle}>Add your own recipe with nutrition, ingredients, and steps.</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={() => setBuilderOpen(false)}>
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.builderScreenScroll} contentContainerStyle={styles.builderScreenScrollContent}>
            <View style={styles.builderSectionCard}>
              <TextInput placeholder="Recipe title" placeholderTextColor={colors.subtext} style={styles.builderInput} value={draftTitle} onChangeText={setDraftTitle} />
              {draftPhotoUri ? <Image source={{ uri: draftPhotoUri }} style={styles.photoPreview} resizeMode="cover" /> : null}
              <View style={styles.photoActionRow}>
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
              <View style={styles.builderSectionHeaderRow}>
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
                    <View style={styles.ingredientTopRow}>
                      <TextInput
                        placeholder="Product"
                        placeholderTextColor={colors.subtext}
                        style={[styles.builderInput, styles.builderInputWide]}
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
                        style={[styles.builderInput, styles.ingredientAmountInput]}
                        value={row.grams}
                        onFocus={() => updateDraftIngredientRow(row.id, (current) => (current.grams === '0' ? { ...current, grams: '' } : current))}
                        onChangeText={(text) => updateDraftIngredientRow(row.id, (current) => ({ ...current, grams: cleanNutritionNumber(text) }))}
                      />
                      <Pressable
                        style={styles.unitSelectBox}
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

              <Text style={styles.builderInlineHint}>Nutrition is calculated automatically from selected products and units. Pieces and spoons use estimated grams.</Text>
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
                {MEAL_FILTERS.filter((item) => item.key !== 'all').map((filter) => {
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
                {CLASSIFIER_FILTERS.filter((item) => item.key !== 'all').map((filter) => {
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
              <Pressable style={styles.builderSecondaryBtn} onPress={resetBuilder}>
                <Text style={styles.builderSecondaryBtnText}>Clear</Text>
              </Pressable>
              <Pressable style={styles.addRecipeBtn} onPress={saveDraftRecipe}>
                <Text style={styles.addRecipeBtnText}>{builderSaving ? 'Saving...' : 'Save recipe'}</Text>
              </Pressable>
            </View>
            {builderError ? <Text style={styles.builderErrorText}>{builderError}</Text> : null}
          </ScrollView>
          </View>
      </Modal>
    </>
  );
}

function selectedMealTypeLabel(value: RecipeMealType) {
  switch (value) {
    case 'main_dish':
      return 'Main dish';
    case 'soups':
      return 'Soup';
    case 'desserts':
      return 'Dessert';
    case 'baking':
      return 'Baking';
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    default:
      return value;
  }
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
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    classifierLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
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
    recipeCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 14,
      backgroundColor: colors.glassSoft,
    },
    recipeCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    recipeCardPhoto: {
      width: '100%',
      height: 150,
      borderRadius: 16,
      marginBottom: 12,
      backgroundColor: '#e8eef7',
    },
    recipeCardTop: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    recipeMetaWrap: {
      flex: 1,
      gap: 4,
    },
    recipeMealType: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    recipeTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    recipeDescription: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    openBtn: {
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    openBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    recipeStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 12,
    },
    recipeStat: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '600',
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    tagChip: {
      borderRadius: 999,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    tagChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
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
      padding: 12,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
    },
    modalCard: {
      maxHeight: '88%',
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
    builderTextarea: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    builderTextareaLarge: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    builderScreen: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingTop: 56,
    },
    builderScreenHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 18,
      paddingBottom: 14,
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
    ingredientTopRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    ingredientAmountInput: {
      width: 94,
      textAlign: 'center',
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
      paddingVertical: 10,
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
    nutritionValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
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
