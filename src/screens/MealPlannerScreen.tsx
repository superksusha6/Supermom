import { Dispatch, SetStateAction, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { NUTRITION_FOOD_PRESETS } from '@/lib/nutrition';
import { MealPlanSlot, Recipe, WeeklyMealPlanEntry } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  recipes: Recipe[];
  weeklyPlan: WeeklyMealPlanEntry[];
  onWeeklyPlanChange: Dispatch<SetStateAction<WeeklyMealPlanEntry[]>>;
  planProfiles: MealPlanProfile[];
  onPlanProfilesChange: Dispatch<SetStateAction<MealPlanProfile[]>>;
  activeProfileKey: string;
  onActiveProfileKeyChange: Dispatch<SetStateAction<string>>;
};

const DAYS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const SLOTS: Array<{ key: MealPlanSlot; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

type MealPlanProfile = {
  key: string;
  label: string;
};

const DEFAULT_PLAN_PROFILES: MealPlanProfile[] = [
  { key: 'family', label: 'Family' },
  { key: 'adults', label: 'Adults' },
  { key: 'kids', label: 'Kids' },
];
const DEFAULT_PLAN_PROFILE_KEYS = new Set(DEFAULT_PLAN_PROFILES.map((profile) => profile.key));

const SIMPLE_MEAL_PRESET_IDS = new Set([
  'preset-oatmeal-porridge-water',
  'preset-oatmeal-porridge-milk',
  'preset-rice-porridge-water',
  'preset-rice-porridge-milk',
  'preset-buckwheat-porridge-water',
  'preset-buckwheat-porridge-milk',
  'preset-omelet-2-eggs',
  'preset-omelet-with-milk',
  'preset-omelet-with-vegetables',
  'preset-syrniki-classic',
  'preset-syrniki-no-sugar',
  'preset-chicken-soup',
  'preset-vegetable-soup',
  'preset-borscht',
  'preset-pumpkin-cream-soup',
  'preset-creamy-soup',
  'preset-vegetable-salad-no-oil',
  'preset-vegetable-salad-with-oil',
  'preset-chicken-caesar-salad',
  'preset-greek-salad',
  'preset-tuna-salad',
  'preset-pasta-tomato-sauce',
  'preset-pasta-chicken',
  'preset-pasta-creamy-sauce',
  'preset-rice-cooked',
  'preset-buckwheat-cooked',
  'preset-pasta-cooked',
]);

const SIMPLE_MEAL_PRESETS = NUTRITION_FOOD_PRESETS.filter((preset) => SIMPLE_MEAL_PRESET_IDS.has(preset.id));
const normalizeSimpleMealName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
type DraftSimpleMealItem = {
  id: string;
  title: string;
  grams: string;
};

function createDraftSimpleMealItem(): DraftSimpleMealItem {
  return {
    id: `simple-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    grams: '100',
  };
}

function getMatchedSimpleMealPreset(title: string) {
  return SIMPLE_MEAL_PRESETS.find((preset) => normalizeSimpleMealName(preset.name) === normalizeSimpleMealName(title));
}

function getSimpleMealSuggestions(title: string) {
  const searchText = normalizeSimpleMealName(title);
  if (!searchText) return [];
  return SIMPLE_MEAL_PRESETS.filter((preset) => normalizeSimpleMealName(preset.name).includes(searchText)).slice(0, 8);
}

function getDraftSimpleMealCalories(item: DraftSimpleMealItem) {
  const preset = getMatchedSimpleMealPreset(item.title);
  const gramsValue = Number.parseInt(item.grams.trim(), 10);
  const grams = Number.isFinite(gramsValue) && gramsValue > 0 ? gramsValue : 100;
  if (!preset) return { grams, calories: undefined as number | undefined };
  return {
    grams,
    calories: Math.round((preset.caloriesPer100g * grams) / 100),
  };
}

function getEntryCustomItems(entry?: WeeklyMealPlanEntry | null) {
  if (entry?.customItems?.length) return entry.customItems;
  if (!entry?.customTitle) return [];
  return [
    {
      id: `${entry.id}-legacy`,
      title: entry.customTitle,
      grams: entry.customGrams,
      calories: entry.customCalories,
    },
  ];
}

function getCustomItemsSummary(items: Array<{ title: string; grams?: number; calories?: number }>, hideCalories = false) {
  if (items.length === 0) return { title: '', meta: 'manual meal' };
  const title = items.map((item) => item.title).filter(Boolean).join(' + ');
  const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalGrams = items.reduce((sum, item) => sum + (item.grams || 0), 0);
  return {
    title,
    meta: hideCalories
      ? totalGrams > 0
        ? `${totalGrams} g`
        : 'manual meal'
      : totalCalories > 0
        ? `${totalGrams > 0 ? `${totalGrams} g • ` : ''}${totalCalories} kcal`
        : totalGrams > 0
          ? `${totalGrams} g`
          : 'manual meal',
  };
}

export function MealPlannerScreen({
  recipes,
  weeklyPlan,
  onWeeklyPlanChange,
  planProfiles,
  onPlanProfilesChange,
  activeProfileKey,
  onActiveProfileKeyChange,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const simpleMealScrollRef = useRef<ScrollView | null>(null);
  const simpleMealInputRefs = useRef<Record<string, TextInput | null>>({});
  const [pickerTarget, setPickerTarget] = useState<{ dayKey: string; slot: MealPlanSlot } | null>(null);
  const [selectedApplyDays, setSelectedApplyDays] = useState<string[]>([]);
  const [recipeSort, setRecipeSort] = useState<'default' | 'kcal_asc' | 'kcal_desc'>('default');
  const [newProfileName, setNewProfileName] = useState('');
  const [profileActionTargetKey, setProfileActionTargetKey] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ dayKey: string; slot: MealPlanSlot } | null>(null);
  const [pickerMode, setPickerMode] = useState<'recipe' | 'simple'>('simple');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [customMealItems, setCustomMealItems] = useState<DraftSimpleMealItem[]>([createDraftSimpleMealItem()]);
  const [activeSimpleMealItemId, setActiveSimpleMealItemId] = useState<string | null>(null);
  const [customHideCalories, setCustomHideCalories] = useState(false);
  const [customMealNote, setCustomMealNote] = useState('');

  const recipesById = useMemo(() => Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
  const activeProfile = planProfiles.find((profile) => profile.key === activeProfileKey) || planProfiles[0];
  const activeWeeklyPlan = useMemo(
    () => weeklyPlan.filter((entry) => (entry.profileKey || 'family') === activeProfileKey),
    [activeProfileKey, weeklyPlan],
  );
  const sortedRecipes = useMemo(() => {
    const next = [...recipes];
    if (recipeSort === 'kcal_asc') next.sort((a, b) => a.nutritionPerServing.calories - b.nutritionPerServing.calories);
    if (recipeSort === 'kcal_desc') next.sort((a, b) => b.nutritionPerServing.calories - a.nutritionPerServing.calories);
    return next;
  }, [recipeSort, recipes]);
  const recipeSearchText = recipeSearch.trim().toLowerCase();
  const visibleRecipes = useMemo(
    () => (recipeSearchText ? sortedRecipes.filter((recipe) => recipe.title.toLowerCase().includes(recipeSearchText)) : []),
    [recipeSearchText, sortedRecipes],
  );
  const emptySlotDayKeys = useMemo(() => {
    if (!pickerTarget) return [];
    return DAYS.filter((day) => {
      const entry = activeWeeklyPlan.find((item) => item.dayKey === day.key && item.slot === pickerTarget.slot);
      return !entry?.recipeId && !entry?.customTitle && !(entry?.customItems?.length);
    }).map((day) => day.key);
  }, [activeWeeklyPlan, pickerTarget]);
  function setRecipeForSlot(dayKey: string, slot: MealPlanSlot, recipeId?: string) {
    const targetDays = Array.from(new Set([dayKey, ...selectedApplyDays]));
    onWeeklyPlanChange((prev) => {
      const next = [...prev];
      targetDays.forEach((targetDayKey) => {
        const existingIndex = next.findIndex(
          (entry) => (entry.profileKey || 'family') === activeProfileKey && entry.dayKey === targetDayKey && entry.slot === slot,
        );
        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            profileKey: activeProfileKey,
            profileLabel: activeProfile.label,
            recipeId,
            customTitle: undefined,
            customCalories: undefined,
            customGrams: undefined,
            customItems: undefined,
            customHideCalories: undefined,
            customNote: undefined,
          };
          return;
        }
        const day = DAYS.find((item) => item.key === targetDayKey);
        next.push({
          id: `meal-plan-${activeProfileKey}-${targetDayKey}-${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          profileKey: activeProfileKey,
          profileLabel: activeProfile.label,
          dayKey: targetDayKey,
          dayLabel: day?.label || targetDayKey,
          slot,
          recipeId,
        });
      });
      return next;
    });
    setPickerTarget(null);
    setSelectedApplyDays([]);
    resetCustomMealDraft();
    setRecipeSearch('');
  }

  function setCustomMealForSlot(dayKey: string, slot: MealPlanSlot) {
    const normalizedItems = customMealItems
      .map((item) => ({ item, title: item.title.trim() }))
      .filter((item) => item.title)
      .map(({ item, title }) => {
        const { grams, calories } = getDraftSimpleMealCalories(item);
        return {
          id: item.id,
          title,
          grams,
          calories,
        };
      });
    if (normalizedItems.length === 0) return;

    const summary = getCustomItemsSummary(normalizedItems);
    const note = customMealNote.trim() || undefined;
    const targetDays = Array.from(new Set([dayKey, ...selectedApplyDays]));

    onWeeklyPlanChange((prev) => {
      const next = [...prev];
      targetDays.forEach((targetDayKey) => {
        const existingIndex = next.findIndex(
          (entry) => (entry.profileKey || 'family') === activeProfileKey && entry.dayKey === targetDayKey && entry.slot === slot,
        );
        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            profileKey: activeProfileKey,
            profileLabel: activeProfile.label,
            recipeId: undefined,
            customItems: normalizedItems,
            customTitle: summary.title,
            customCalories: normalizedItems.reduce((sum, item) => sum + (item.calories || 0), 0) || undefined,
            customGrams: normalizedItems.reduce((sum, item) => sum + (item.grams || 0), 0) || undefined,
            customHideCalories,
            customNote: note,
          };
          return;
        }
        const day = DAYS.find((item) => item.key === targetDayKey);
        next.push({
          id: `meal-plan-${activeProfileKey}-${targetDayKey}-${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          profileKey: activeProfileKey,
          profileLabel: activeProfile.label,
          dayKey: targetDayKey,
          dayLabel: day?.label || targetDayKey,
          slot,
          customItems: normalizedItems,
          customTitle: summary.title,
          customCalories: normalizedItems.reduce((sum, item) => sum + (item.calories || 0), 0) || undefined,
          customGrams: normalizedItems.reduce((sum, item) => sum + (item.grams || 0), 0) || undefined,
          customHideCalories,
          customNote: note,
        });
      });
      return next;
    });
    setPickerTarget(null);
    setSelectedApplyDays([]);
    resetCustomMealDraft();
    setRecipeSearch('');
  }

  function openRecipePicker(dayKey: string, slot: MealPlanSlot) {
    setPickerTarget({ dayKey, slot });
    setSelectedApplyDays([dayKey]);
    setPickerMode('simple');
    setRecipeSearch('');
  }

  function openSlot(dayKey: string, slot: MealPlanSlot, entry?: WeeklyMealPlanEntry) {
    if (entry?.recipeId || entry?.customTitle || entry?.customItems?.length) {
      setDetailTarget({ dayKey, slot });
      return;
    }
    openRecipePicker(dayKey, slot);
  }

  function resetCustomMealDraft() {
    setCustomMealItems([createDraftSimpleMealItem()]);
    setActiveSimpleMealItemId(null);
    setCustomHideCalories(false);
    setCustomMealNote('');
  }

  function updateDraftSimpleMealItem(itemId: string, patch: Partial<DraftSimpleMealItem>) {
    setCustomMealItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }

  function selectSimpleMealPreset(itemId: string, preset: (typeof SIMPLE_MEAL_PRESETS)[number]) {
    updateDraftSimpleMealItem(itemId, { title: preset.name });
    setActiveSimpleMealItemId(null);
  }

  function addDraftSimpleMealItem() {
    const nextItem = createDraftSimpleMealItem();
    setCustomMealItems((prev) => [nextItem, ...prev]);
    setActiveSimpleMealItemId(nextItem.id);
    setTimeout(() => {
      simpleMealScrollRef.current?.scrollTo({ y: 0, animated: true });
      simpleMealInputRefs.current[nextItem.id]?.focus();
    }, 60);
  }

  function removeDraftSimpleMealItem(itemId: string) {
    setCustomMealItems((prev) => {
      const next = prev.filter((item) => item.id !== itemId);
      return next.length > 0 ? next : [createDraftSimpleMealItem()];
    });
    setActiveSimpleMealItemId((prev) => (prev === itemId ? null : prev));
  }

  function toggleApplyDay(dayKey: string) {
    setSelectedApplyDays((prev) => (prev.includes(dayKey) ? prev.filter((item) => item !== dayKey) : [...prev, dayKey]));
  }

  function addPlanProfile() {
    const label = newProfileName.trim();
    if (!label) return;
    const key = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onPlanProfilesChange((prev) => [...prev, { key, label }]);
    onActiveProfileKeyChange(key);
    setProfileActionTargetKey(null);
    setNewProfileName('');
  }

  function handlePlanProfilePress(profile: MealPlanProfile) {
    if (DEFAULT_PLAN_PROFILE_KEYS.has(profile.key)) {
      setProfileActionTargetKey(null);
      onActiveProfileKeyChange(profile.key);
      return;
    }
    onActiveProfileKeyChange(profile.key);
    setProfileActionTargetKey((current) => (current === profile.key ? null : profile.key));
  }

  function deleteCustomPlanProfile(profileKey: string) {
    setProfileActionTargetKey(null);
    onPlanProfilesChange((prev) => prev.filter((item) => item.key !== profileKey));
    onWeeklyPlanChange((prev) => prev.filter((entry) => (entry.profileKey || 'family') !== profileKey));
    onActiveProfileKeyChange((current) => (current === profileKey ? 'family' : current));
  }

  const staffPlanText = useMemo(() => buildStaffMealPlanText(activeWeeklyPlan, recipesById, activeProfile.label), [activeProfile.label, activeWeeklyPlan, recipesById]);

  const renderMealCell = (dayKey: string, slot: { key: MealPlanSlot; label: string }, compact = false) => {
    const entry = activeWeeklyPlan.find((item) => item.dayKey === dayKey && item.slot === slot.key);
    const recipe = entry?.recipeId ? recipesById[entry.recipeId] : null;
    const customItems = getEntryCustomItems(entry);
    const customSummary = getCustomItemsSummary(customItems, !!entry?.customHideCalories);
    const customMealTitle = customSummary.title || entry?.customTitle;
    const hasMeal = Boolean(recipe || customMealTitle);

    return (
      <Pressable
        key={`${dayKey}-${slot.key}`}
        style={[
          styles.weekGridMealCell,
          compact && styles.weekGridMealCellCompact,
          hasMeal && styles.weekGridMealCellFilled,
        ]}
        onPress={() => openSlot(dayKey, slot.key, entry)}
      >
        {compact ? <Text style={styles.mobileSlotLabel}>{slot.label}</Text> : null}
        {recipe ? (
          <>
            <Text style={[styles.weekGridRecipeTitle, compact && styles.weekGridRecipeTitleCompact]}>{recipe.title}</Text>
            <Text style={styles.weekGridRecipeMeta}>{recipe.nutritionPerServing.calories} kcal</Text>
          </>
        ) : customMealTitle ? (
          <>
            <Text style={[styles.weekGridRecipeTitle, compact && styles.weekGridRecipeTitleCompact]}>{customMealTitle}</Text>
            <Text style={styles.weekGridRecipeMeta}>{customSummary.meta}</Text>
          </>
        ) : (
          <Text style={[styles.weekGridEmptyText, compact && styles.weekGridEmptyTextCompact]}>+</Text>
        )}
      </Pressable>
    );
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard title="Weekly Meal Planner">
          <Text style={styles.heroText}>Build a weekly menu from your saved recipes. Next we can connect this plan to staff and shopping.</Text>

          <Text style={styles.profileLabel}>Meal plan profile</Text>
          <View style={styles.profileTabs}>
            {planProfiles.map((profile) => {
              const active = activeProfileKey === profile.key;
              const showDelete = profileActionTargetKey === profile.key && !DEFAULT_PLAN_PROFILE_KEYS.has(profile.key);
              return (
                <View key={profile.key} style={styles.profileTabWrap}>
                  <Pressable style={[styles.profileTab, active && styles.profileTabActive]} onPress={() => handlePlanProfilePress(profile)}>
                    <Text style={[styles.profileTabText, active && styles.profileTabTextActive]}>{profile.label}</Text>
                  </Pressable>
                  {showDelete ? (
                    <Pressable style={styles.profileDeleteInlineBtn} onPress={() => deleteCustomPlanProfile(profile.key)}>
                      <Text style={styles.profileDeleteInlineText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
          <View style={[styles.addProfileRow, isMobile && styles.addProfileRowMobile]}>
            <TextInput
              placeholder="Add profile name, e.g. Emma or Staff diet"
              placeholderTextColor={colors.subtext}
              style={[styles.profileInput, isMobile && styles.profileInputMobile]}
              value={newProfileName}
              onChangeText={setNewProfileName}
            />
            <Pressable style={[styles.addProfileBtn, isMobile && styles.addProfileBtnMobile]} onPress={addPlanProfile}>
              <Text style={styles.addProfileBtnText}>Add</Text>
            </Pressable>
          </View>

          <View style={[styles.staffExportCard, isMobile && styles.staffExportCardMobile]}>
            <View style={styles.staffExportCopy}>
              <Text style={styles.staffExportTitle}>Staff meal plan</Text>
              <Text style={styles.staffExportText}>Prepare a clean weekly menu for {activeProfile.label} with recipes and ingredients for staff.</Text>
            </View>
            <View style={[styles.staffExportActions, isMobile && styles.staffExportActionsMobile]}>
              <Pressable
                style={[styles.staffExportBtn, isMobile && styles.staffExportBtnMobile]}
                onPress={() => Share.share({ title: 'Weekly Meal Plan', message: staffPlanText })}
              >
                <Text style={styles.staffExportBtnText}>Send</Text>
              </Pressable>
              <Pressable
                style={[styles.staffExportBtn, isMobile && styles.staffExportBtnMobile]}
                onPress={() => printStaffMealPlan(activeWeeklyPlan, recipesById, activeProfile.label)}
              >
                <Text style={styles.staffExportBtnText}>PDF</Text>
              </Pressable>
            </View>
          </View>
        </SectionCard>

        <View style={styles.weekMenuSection}>
          <View style={styles.weekMenuHeader}>
            <Text style={styles.weekMenuTitle}>{activeProfile.label} Weekly Menu</Text>
          </View>
          {isMobile ? (
            <View style={styles.mobileWeekList}>
              {DAYS.map((day) => (
                <View key={day.key} style={styles.mobileDayCard}>
                  <Text style={styles.mobileDayTitle}>{day.label}</Text>
                  <View style={styles.mobileDaySlots}>
                    {SLOTS.map((slot) => renderMealCell(day.key, slot, true))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.weekGrid, styles.weekGridWide]}>
                <View style={styles.weekGridHeaderRow}>
                  <View style={[styles.weekGridHeaderCell, styles.weekGridDayHeaderCell, styles.weekGridDayHeaderCellWide]}>
                    <Text style={styles.weekGridHeaderText}>Day</Text>
                  </View>
                  {SLOTS.map((slot) => (
                    <View key={`header-${slot.key}`} style={[styles.weekGridHeaderCell, styles.weekGridHeaderCellWide]}>
                      <Text style={styles.weekGridHeaderText}>{slot.label}</Text>
                    </View>
                  ))}
                </View>

                {DAYS.map((day) => (
                  <View key={day.key} style={styles.weekGridRow}>
                    <View style={[styles.weekGridDayCell, styles.weekGridDayCellWide]}>
                      <Text style={styles.weekGridDayText}>{day.label}</Text>
                    </View>
                    {SLOTS.map((slot) => {
                      const entry = activeWeeklyPlan.find((item) => item.dayKey === day.key && item.slot === slot.key);
                      const recipe = entry?.recipeId ? recipesById[entry.recipeId] : null;
                      const customItems = getEntryCustomItems(entry);
                      const customSummary = getCustomItemsSummary(customItems, !!entry?.customHideCalories);
                      const customMealTitle = customSummary.title || entry?.customTitle;
                      const hasMeal = Boolean(recipe || customMealTitle);
                      return (
                        <Pressable
                          key={`${day.key}-${slot.key}`}
                          style={[styles.weekGridMealCell, styles.weekGridMealCellWide, hasMeal && styles.weekGridMealCellFilled]}
                          onPress={() => openSlot(day.key, slot.key, entry)}
                        >
                          {recipe ? (
                            <>
                              <Text style={styles.weekGridRecipeTitle}>{recipe.title}</Text>
                              <Text style={styles.weekGridRecipeMeta}>{recipe.nutritionPerServing.calories} kcal</Text>
                            </>
                          ) : customMealTitle ? (
                            <>
                              <Text style={styles.weekGridRecipeTitle}>{customMealTitle}</Text>
                              <Text style={styles.weekGridRecipeMeta}>{customSummary.meta}</Text>
                            </>
                          ) : (
                            <Text style={styles.weekGridEmptyText}>+</Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={!!pickerTarget} transparent animationType="fade" onRequestClose={() => setPickerTarget(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerTarget(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add meal</Text>
              <Pressable style={styles.closeBtn} onPress={() => {
                setPickerTarget(null);
                setSelectedApplyDays([]);
                resetCustomMealDraft();
                setRecipeSearch('');
              }}>
                <Text style={styles.closeBtnText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.modeTabs}>
              {[
                { key: 'recipe' as const, label: 'Saved recipe' },
                { key: 'simple' as const, label: 'Simple meal' },
              ].map((option) => {
                const active = pickerMode === option.key;
                return (
                  <Pressable key={option.key} style={[styles.modeTab, active && styles.modeTabActive]} onPress={() => setPickerMode(option.key)}>
                    <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalHint}>Apply this {pickerTarget ? SLOTS.find((slot) => slot.key === pickerTarget.slot)?.label.toLowerCase() : 'meal'} to:</Text>
            <View style={styles.applyDaysRow}>
              {DAYS.map((day) => {
                const active = selectedApplyDays.includes(day.key);
                const emptyForCurrentSlot = emptySlotDayKeys.includes(day.key);
                return (
                  <Pressable
                    key={`apply-${day.key}`}
                    style={[styles.applyDayChip, emptyForCurrentSlot && styles.applyDayChipAvailable, active && styles.applyDayChipActive]}
                    onPress={() => toggleApplyDay(day.key)}
                  >
                    <Text style={[styles.applyDayChipText, emptyForCurrentSlot && styles.applyDayChipAvailableText, active && styles.applyDayChipTextActive]}>
                      {day.label.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {pickerMode === 'recipe' ? (
              <>
                <TextInput
                  placeholder="Search saved recipes"
                  placeholderTextColor={colors.subtext}
                  style={styles.simpleMealInput}
                  value={recipeSearch}
                  onChangeText={setRecipeSearch}
                />
                <View style={styles.sortRow}>
                  {[
                    { key: 'default' as const, label: 'Default' },
                    { key: 'kcal_asc' as const, label: 'Low kcal' },
                    { key: 'kcal_desc' as const, label: 'High kcal' },
                  ].map((option) => {
                    const active = recipeSort === option.key;
                    return (
                      <Pressable key={option.key} style={[styles.sortChip, active && styles.sortChipActive]} onPress={() => setRecipeSort(option.key)}>
                        <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <ScrollView contentContainerStyle={styles.modalList}>
                  <Pressable
                    style={styles.recipePickerCard}
                    onPress={() => pickerTarget && setRecipeForSlot(pickerTarget.dayKey, pickerTarget.slot, undefined)}
                  >
                    <Text style={styles.recipePickerTitle}>Clear slot</Text>
                    <Text style={styles.recipePickerMeta}>Remove meal from this slot</Text>
                  </Pressable>

                  {!recipeSearchText ? (
                    <Text style={styles.emptyPickerText}>Start typing to find a saved recipe.</Text>
                  ) : null}

                  {recipeSearchText && visibleRecipes.length === 0 ? (
                    <Text style={styles.emptyPickerText}>No saved recipes found.</Text>
                  ) : null}

                  {visibleRecipes.map((recipe) => (
                    <Pressable
                      key={recipe.id}
                      style={styles.recipePickerCard}
                      onPress={() => pickerTarget && setRecipeForSlot(pickerTarget.dayKey, pickerTarget.slot, recipe.id)}
                    >
                      <Text style={styles.recipePickerTitle}>{recipe.title}</Text>
                      <Text style={styles.recipePickerMeta}>
                        {recipe.cookTimeMinutes} min • {recipe.servings} servings • {recipe.nutritionPerServing.calories} kcal
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <ScrollView ref={simpleMealScrollRef} contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
                <View style={styles.simpleMealCard}>
                {customMealItems.map((item, index) => {
                  const suggestions = getSimpleMealSuggestions(item.title);
                  const itemCalories = getDraftSimpleMealCalories(item);
                  return (
                    <View key={item.id} style={styles.simpleMealRowCard}>
                      <View style={styles.simpleMealRowHeader}>
                        <Text style={styles.simpleMealRowLabel}>Item {index + 1}</Text>
                        {customMealItems.length > 1 ? (
                          <Pressable style={styles.removeItemBtn} onPress={() => removeDraftSimpleMealItem(item.id)}>
                            <Text style={styles.removeItemBtnText}>Remove</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <View style={styles.autocompleteWrap}>
                        <TextInput
                          placeholder="Type a meal, e.g. oatmeal porridge or omelet"
                          placeholderTextColor={colors.subtext}
                          style={styles.simpleMealInput}
                          ref={(node) => {
                            simpleMealInputRefs.current[item.id] = node;
                          }}
                          value={item.title}
                          onFocus={() => setActiveSimpleMealItemId(item.id)}
                          onChangeText={(text) => {
                            setActiveSimpleMealItemId(item.id);
                            updateDraftSimpleMealItem(item.id, { title: text });
                          }}
                        />
                        {activeSimpleMealItemId === item.id && suggestions.length > 0 ? (
                          <View style={styles.autocompleteDropdown}>
                            {suggestions.map((preset) => (
                              <Pressable key={preset.id} style={styles.autocompleteOption} onPress={() => selectSimpleMealPreset(item.id, preset)}>
                                <Text style={styles.autocompleteOptionTitle}>{preset.name}</Text>
                                <Text style={styles.autocompleteOptionMeta}>{Math.round(preset.caloriesPer100g)} kcal · {preset.baseAmount}</Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.gramsRow}>
                        <TextInput
                          placeholder="100"
                          placeholderTextColor={colors.subtext}
                          style={styles.gramsInput}
                          value={item.grams}
                          onChangeText={(text) => updateDraftSimpleMealItem(item.id, { grams: text.replace(/[^\d]/g, '').slice(0, 4) })}
                          keyboardType="number-pad"
                        />
                        <View style={styles.gramsUnitPill}>
                          <Text style={styles.gramsUnitText}>g</Text>
                        </View>
                        <View style={styles.itemCaloriesPill}>
                          {!customHideCalories ? (
                            <>
                              <Text style={styles.itemCaloriesText}>{itemCalories.calories ? `${itemCalories.calories} kcal` : 'manual'}</Text>
                              <Pressable style={styles.hideCaloriesBtn} onPress={() => setCustomHideCalories(true)}>
                                <Text style={styles.hideCaloriesBtnText}>×</Text>
                              </Pressable>
                            </>
                          ) : (
                            <Pressable style={styles.showCaloriesBtn} onPress={() => setCustomHideCalories(false)}>
                              <Text style={styles.showCaloriesBtnText}>Show kcal</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
                <Pressable style={styles.addItemBtn} onPress={addDraftSimpleMealItem}>
                  <Text style={styles.addItemBtnText}>+ Add item</Text>
                </Pressable>
                <TextInput
                  placeholder="Note for staff, optional"
                  placeholderTextColor={colors.subtext}
                  style={[styles.simpleMealInput, styles.simpleMealNoteInput]}
                  value={customMealNote}
                  onChangeText={setCustomMealNote}
                  multiline
                />
                <View style={styles.exportActions}>
                  <Pressable
                    style={styles.staffExportBtn}
                    onPress={() => pickerTarget && setRecipeForSlot(pickerTarget.dayKey, pickerTarget.slot, undefined)}
                  >
                    <Text style={styles.staffExportBtnText}>Clear slot</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.staffExportBtnPrimary, !customMealItems.some((item) => item.title.trim()) && styles.disabledBtn]}
                    onPress={() => pickerTarget && setCustomMealForSlot(pickerTarget.dayKey, pickerTarget.slot)}
                    disabled={!customMealItems.some((item) => item.title.trim())}
                  >
                    <Text style={styles.staffExportBtnPrimaryText}>Save meal</Text>
                  </Pressable>
                </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!detailTarget} transparent animationType="fade" onRequestClose={() => setDetailTarget(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDetailTarget(null)} />
          {detailTarget ? (
            <View style={styles.modalCard}>
              {(() => {
                const entry = activeWeeklyPlan.find((item) => item.dayKey === detailTarget.dayKey && item.slot === detailTarget.slot);
                const recipe = entry?.recipeId ? recipesById[entry.recipeId] : null;
                return (
                  <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{DAYS.find((day) => day.key === detailTarget.dayKey)?.label} · {SLOTS.find((slot) => slot.key === detailTarget.slot)?.label}</Text>
                <Pressable style={styles.closeBtn} onPress={() => setDetailTarget(null)}>
                  <Text style={styles.closeBtnText}>×</Text>
                </Pressable>
              </View>
              {recipe ? (
                <View style={styles.slotDetailCard}>
                  <Text style={styles.slotDetailTitle}>{recipe.title}</Text>
                  <Text style={styles.slotDetailMeta}>
                    {recipe.cookTimeMinutes} min • {recipe.servings} servings • {recipe.nutritionPerServing.calories} kcal
                  </Text>
                  <View style={styles.exportActions}>
                    <Pressable
                      style={styles.staffExportBtn}
                      onPress={() => {
                        openRecipePicker(detailTarget.dayKey, detailTarget.slot);
                        setDetailTarget(null);
                      }}
                    >
                      <Text style={styles.staffExportBtnText}>Change recipe</Text>
                    </Pressable>
                    <Pressable style={styles.staffExportBtnPrimary} onPress={() => Share.share({ title: recipe.title, message: buildSingleRecipeText(recipe) })}>
                      <Text style={styles.staffExportBtnPrimaryText}>Share recipe</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.detailSectionTitle}>Ingredients</Text>
                  {recipe.ingredients.map((ingredient) => (
                    <Text key={ingredient.id} style={styles.detailText}>• {ingredient.amount} {ingredient.name}</Text>
                  ))}
                  <Text style={styles.detailSectionTitle}>Steps</Text>
                  {recipe.steps.map((step, index) => (
                    <Text key={step.id} style={styles.detailText}>{index + 1}. {step.text}</Text>
                  ))}
                </View>
              ) : getEntryCustomItems(entry).length > 0 ? (
                <View style={styles.slotDetailCard}>
                  <Text style={styles.slotDetailTitle}>{getCustomItemsSummary(getEntryCustomItems(entry), !!entry?.customHideCalories).title}</Text>
                  <Text style={styles.slotDetailMeta}>{getCustomItemsSummary(getEntryCustomItems(entry), !!entry?.customHideCalories).meta}</Text>
                  {getEntryCustomItems(entry).map((item) => (
                    <Text key={item.id} style={styles.detailText}>
                      • {item.title}{item.grams ? ` · ${item.grams} g` : ''}{!entry?.customHideCalories && item.calories ? ` · ${item.calories} kcal` : ''}
                    </Text>
                  ))}
                  {entry?.customNote ? <Text style={styles.detailText}>{entry.customNote}</Text> : null}
                  <View style={styles.exportActions}>
                    <Pressable
                      style={styles.staffExportBtn}
                      onPress={() => {
                        openRecipePicker(detailTarget.dayKey, detailTarget.slot);
                        setPickerMode('simple');
                        setCustomMealItems(
                          getEntryCustomItems(entry).map((item) => ({
                            id: item.id,
                            title: item.title,
                            grams: item.grams ? String(item.grams) : '100',
                          })),
                        );
                        setActiveSimpleMealItemId(null);
                        setCustomHideCalories(!!entry?.customHideCalories);
                        setCustomMealNote(entry?.customNote || '');
                        setDetailTarget(null);
                      }}
                    >
                      <Text style={styles.staffExportBtnText}>Edit meal</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
                  </>
                );
              })()}
            </View>
          ) : null}
        </View>
      </Modal>

    </>
  );
}

function buildStaffMealPlanText(weeklyPlan: WeeklyMealPlanEntry[], recipesById: Record<string, Recipe>, profileLabel: string) {
  const lines = [`Weekly Meal Plan for Staff`, `Profile: ${profileLabel}`, ''];
  DAYS.forEach((day) => {
    lines.push(day.label);
    let hasMeals = false;
    SLOTS.forEach((slot) => {
      const entry = weeklyPlan.find((item) => item.dayKey === day.key && item.slot === slot.key);
      const recipe = entry?.recipeId ? recipesById[entry.recipeId] : null;
      const customItems = getEntryCustomItems(entry);
      const customSummary = getCustomItemsSummary(customItems, !!entry?.customHideCalories);
      const customTitle = customSummary.title || entry?.customTitle;
      if (!recipe && !customTitle) return;
      hasMeals = true;
      if (recipe) {
        lines.push(`${slot.label}: ${recipe.title}`);
        lines.push(`Open the app if ingredients or recipe steps are needed.`);
      } else if (customTitle) {
        lines.push(`${slot.label}: ${customTitle}${customSummary.meta !== 'manual meal' ? ` (${customSummary.meta})` : ''}`);
        customItems.forEach((item) =>
          lines.push(`- ${item.title}${item.grams ? ` · ${item.grams} g` : ''}${!entry?.customHideCalories && item.calories ? ` · ${item.calories} kcal` : ''}`),
        );
        if (entry?.customNote) lines.push(`Note: ${entry.customNote}`);
      }
      lines.push('');
    });
    if (!hasMeals) lines.push('No meals planned.');
    lines.push('');
  });
  return lines.join('\n').trim();
}

function buildSingleRecipeText(recipe: Recipe) {
  const lines = [recipe.title, `${recipe.cookTimeMinutes} min | ${recipe.servings} servings | ${recipe.nutritionPerServing.calories} kcal/serving`, ''];
  if (recipe.ingredients.length) {
    lines.push('Ingredients:');
    recipe.ingredients.forEach((item) => lines.push(`- ${item.amount} ${item.name}`));
    lines.push('');
  }
  if (recipe.steps.length) {
    lines.push('Steps:');
    recipe.steps.forEach((step, index) => lines.push(`${index + 1}. ${step.text}`));
  }
  return lines.join('\n').trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildStaffMealPlanTableHtml(weeklyPlan: WeeklyMealPlanEntry[], recipesById: Record<string, Recipe>, profileLabel: string) {
  const headerCells = SLOTS.map((slot) => `<th>${escapeHtml(slot.label)}</th>`).join('');
  const rows = DAYS.map((day) => {
    const slotCells = SLOTS.map((slot) => {
      const entry = weeklyPlan.find((item) => item.dayKey === day.key && item.slot === slot.key);
      const recipe = entry?.recipeId ? recipesById[entry.recipeId] : null;
      const customItems = getEntryCustomItems(entry);
      const customSummary = getCustomItemsSummary(customItems, !!entry?.customHideCalories);
      const customTitle = customSummary.title || entry?.customTitle;

      if (recipe) {
        return `
          <td>
            <div class="meal-title">${escapeHtml(recipe.title)}</div>
            <div class="meal-meta">${escapeHtml(`${recipe.nutritionPerServing.calories} kcal`)}</div>
          </td>
        `;
      }

      if (customTitle) {
        const note = entry?.customNote ? `<div class="meal-note">${escapeHtml(entry.customNote)}</div>` : '';
        return `
          <td>
            <div class="meal-title">${escapeHtml(customTitle)}</div>
            <div class="meal-meta">${escapeHtml(customSummary.meta)}</div>
            ${note}
          </td>
        `;
      }

      return `<td><div class="meal-empty">—</div></td>`;
    }).join('');

    return `
      <tr>
        <th class="day-cell">${escapeHtml(day.label)}</th>
        ${slotCells}
      </tr>
    `;
  }).join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Weekly Meal Plan</title>
        <style>
          body {
            margin: 32px;
            color: #172033;
            font-family: Inter, "Helvetica Neue", Arial, sans-serif;
            background: #ffffff;
          }
          .header {
            margin-bottom: 18px;
          }
          .eyebrow {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #4f7cff;
            margin-bottom: 8px;
          }
          h1 {
            margin: 0 0 6px;
            font-size: 28px;
            line-height: 1.1;
          }
          .subtitle {
            font-size: 14px;
            color: #5d6b86;
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            table-layout: fixed;
            border: 1px solid #d9e4f2;
            border-radius: 18px;
            overflow: hidden;
          }
          thead th {
            background: #3f6df2;
            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 14px 12px;
            border-right: 1px solid rgba(255,255,255,0.16);
          }
          thead th:last-child {
            border-right: 0;
          }
          tbody th,
          tbody td {
            vertical-align: top;
            padding: 14px 12px;
            border-top: 1px solid #e4edf8;
            border-right: 1px solid #edf2f7;
          }
          tbody td:last-child {
            border-right: 0;
          }
          .day-cell {
            width: 116px;
            background: #f8fbff;
            font-size: 13px;
            font-weight: 800;
            text-align: left;
          }
          .meal-title {
            font-size: 13px;
            font-weight: 800;
            line-height: 1.35;
            margin-bottom: 4px;
          }
          .meal-meta {
            font-size: 11px;
            font-weight: 700;
            color: #5d6b86;
            line-height: 1.4;
          }
          .meal-note {
            margin-top: 6px;
            font-size: 11px;
            line-height: 1.4;
            color: #7a889f;
          }
          .meal-empty {
            font-size: 13px;
            color: #9aa7bc;
          }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="eyebrow">Staff meal plan</div>
          <h1>Family Weekly Menu</h1>
          <div class="subtitle">Profile: ${escapeHtml(profileLabel)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:116px">Day</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function printStaffMealPlan(weeklyPlan: WeeklyMealPlanEntry[], recipesById: Record<string, Recipe>, profileLabel: string) {
  const text = buildStaffMealPlanText(weeklyPlan, recipesById, profileLabel);
  if (typeof window === 'undefined') {
    Share.share({ title: 'Weekly Meal Plan', message: text });
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    Share.share({ title: 'Weekly Meal Plan', message: text });
    return;
  }

  printWindow.document.write(buildStaffMealPlanTableHtml(weeklyPlan, recipesById, profileLabel));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingBottom: 120,
    },
    heroText: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    profileLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 8,
    },
    profileTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    profileTabWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    profileTab: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      backgroundColor: '#ffffff',
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    profileTabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    profileTabText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '800',
    },
    profileTabTextActive: {
      color: colors.primary,
    },
    profileDeleteInlineBtn: {
      borderRadius: 999,
      backgroundColor: '#fff1f1',
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    profileDeleteInlineText: {
      color: '#c24646',
      fontSize: 11,
      fontWeight: '800',
    },
    addProfileRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    addProfileRowMobile: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    profileInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: '#ffffff',
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      fontWeight: '600',
    },
    profileInputMobile: {
      width: '100%',
    },
    addProfileBtn: {
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      justifyContent: 'center',
    },
    addProfileBtnMobile: {
      alignItems: 'center',
      width: '100%',
    },
    addProfileBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
    staffExportCard: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 14,
    },
    staffExportCardMobile: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    staffExportCopy: {
      flex: 1,
      minWidth: 210,
      gap: 4,
    },
    staffExportActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    staffExportActionsMobile: {
      width: '100%',
      justifyContent: 'space-between',
    },
    staffExportTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    staffExportText: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 18,
    },
    staffExportBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
    },
    staffExportBtnMobile: {
      flex: 1,
      minWidth: 92,
    },
    staffExportBtnText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    staffExportBtnPrimary: {
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
    },
    staffExportBtnPrimaryText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
    weekMenuSection: {
      marginBottom: 12,
    },
    weekMenuHeader: {
      marginBottom: 10,
      paddingHorizontal: 2,
    },
    weekMenuTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    weekGrid: {
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    weekGridWide: {
      width: '100%',
    },
    weekGridHeaderRow: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
    },
    weekGridHeaderCell: {
      width: 150,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      borderLeftWidth: 1,
      borderLeftColor: 'rgba(255,255,255,0.18)',
    },
    weekGridHeaderCellWide: {
      flex: 1,
      width: 'auto',
    },
    weekGridDayHeaderCell: {
      width: 130,
      borderLeftWidth: 0,
    },
    weekGridDayHeaderCellWide: {
      width: 130,
      flexShrink: 0,
      flexGrow: 0,
    },
    weekGridHeaderText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    weekGridRow: {
      flexDirection: 'row',
      minHeight: 104,
    },
    weekGridDayCell: {
      width: 130,
      backgroundColor: 'rgba(248,251,255,0.84)',
      borderRightWidth: 1,
      borderRightColor: '#e4edf8',
      borderBottomWidth: 1,
      borderBottomColor: '#e4edf8',
      padding: 12,
      justifyContent: 'center',
    },
    weekGridDayCellWide: {
      width: 140,
      flexShrink: 0,
    },
    weekGridDayText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    weekGridMealCell: {
      width: 150,
      padding: 10,
      borderRightWidth: 1,
      borderRightColor: '#edf2f7',
      borderBottomWidth: 1,
      borderBottomColor: '#edf2f7',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.72)',
    },
    weekGridMealCellWide: {
      flex: 1,
      width: 'auto',
    },
    weekGridMealCellCompact: {
      width: '100%',
      borderRightWidth: 0,
      borderWidth: 1,
      borderColor: '#edf2f7',
      borderRadius: 16,
      padding: 12,
      minHeight: 82,
      justifyContent: 'flex-start',
      gap: 4,
    },
    weekGridMealCellFilled: {
      backgroundColor: colors.selection,
    },
    weekGridRecipeTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
      lineHeight: 17,
      marginBottom: 6,
    },
    weekGridRecipeMeta: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '800',
    },
    weekGridRecipeTitleCompact: {
      marginBottom: 2,
    },
    weekGridEmptyText: {
      color: colors.primary,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
    },
    weekGridEmptyTextCompact: {
      textAlign: 'left',
      fontSize: 22,
      lineHeight: 24,
    },
    mobileWeekList: {
      gap: 12,
    },
    mobileDayCard: {
      borderWidth: 1,
      borderColor: '#d9e4f2',
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 12,
      gap: 10,
    },
    mobileDayTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    mobileDaySlots: {
      gap: 8,
    },
    mobileSlotLabel: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 2,
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
      maxHeight: '72%',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.96)',
      backgroundColor: 'rgba(248,250,252,0.97)',
      padding: 18,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    modalHint: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
    },
    applyDaysRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    applyDayChip: {
      borderWidth: 1,
      borderColor: '#d9e4f2',
      borderRadius: 999,
      backgroundColor: '#ffffff',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    applyDayChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    applyDayChipAvailable: {
      borderColor: '#68c78a',
      backgroundColor: '#eefaf1',
    },
    applyDayChipText: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '800',
    },
    applyDayChipAvailableText: {
      color: '#2f8f54',
    },
    applyDayChipTextActive: {
      color: colors.primary,
    },
    sortRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    modeTabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    modeTab: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      borderRadius: 14,
      backgroundColor: '#ffffff',
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modeTabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    modeTabText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '900',
    },
    modeTabTextActive: {
      color: colors.primary,
    },
    sortChip: {
      borderWidth: 1,
      borderColor: '#d9e4f2',
      borderRadius: 12,
      backgroundColor: '#ffffff',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    sortChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    sortChipText: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '800',
    },
    sortChipTextActive: {
      color: colors.primary,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.glassSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 24,
    },
    modalList: {
      gap: 10,
      paddingBottom: 10,
    },
    recipePickerCard: {
      borderWidth: 1,
      borderColor: '#d9e4f2',
      borderRadius: 16,
      padding: 14,
      backgroundColor: '#ffffff',
    },
    recipePickerTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 4,
    },
    recipePickerMeta: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 18,
    },
    emptyPickerText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    simpleMealCard: {
      borderWidth: 1,
      borderColor: '#d9e4f2',
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 14,
      gap: 10,
    },
    simpleMealRowCard: {
      borderWidth: 1,
      borderColor: '#e5edf8',
      borderRadius: 16,
      backgroundColor: '#f8fbff',
      padding: 12,
      gap: 10,
    },
    simpleMealRowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    simpleMealRowLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    removeItemBtn: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      backgroundColor: '#ffffff',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    removeItemBtnText: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '800',
    },
    autocompleteWrap: {
      position: 'relative',
      zIndex: 3,
    },
    simpleMealInput: {
      borderWidth: 1,
      borderColor: '#e1eaf6',
      borderRadius: 14,
      backgroundColor: '#f8fbff',
      color: colors.text,
      height: 64,
      paddingHorizontal: 14,
      paddingVertical: 0,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
    autocompleteDropdown: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: '#d9e4f2',
      borderRadius: 16,
      backgroundColor: '#ffffff',
      overflow: 'hidden',
    },
    autocompleteOption: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: '#edf2f7',
    },
    autocompleteOptionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 3,
    },
    autocompleteOptionMeta: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
    },
    gramsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    gramsInput: {
      width: 96,
      borderWidth: 1,
      borderColor: '#e1eaf6',
      borderRadius: 14,
      backgroundColor: '#f8fbff',
      color: colors.text,
      height: 52,
      paddingHorizontal: 14,
      paddingVertical: 0,
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 20,
      textAlign: 'center',
    },
    gramsUnitPill: {
      minWidth: 54,
      borderWidth: 1,
      borderColor: '#e1eaf6',
      borderRadius: 14,
      backgroundColor: '#ffffff',
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gramsUnitText: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '900',
    },
    itemCaloriesPill: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#e1eaf6',
      backgroundColor: '#ffffff',
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
    },
    itemCaloriesText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '900',
    },
    hideCaloriesBtn: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.glassSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hideCaloriesBtnText: {
      color: colors.subtext,
      fontSize: 14,
      fontWeight: '900',
      lineHeight: 14,
    },
    showCaloriesBtn: {
      borderRadius: 999,
      paddingHorizontal: 2,
      paddingVertical: 0,
    },
    showCaloriesBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '900',
    },
    addItemBtn: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    addItemBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '900',
    },
    simpleMealNoteInput: {
      minHeight: 84,
      textAlignVertical: 'top',
    },
    disabledBtn: {
      opacity: 0.45,
    },
    slotDetailCard: {
      borderWidth: 1,
      borderColor: '#d9e4f2',
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 14,
      gap: 10,
    },
    slotDetailTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    slotDetailMeta: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    detailSectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
      marginTop: 4,
    },
    detailText: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600',
    },
    exportPreviewCard: {
      borderWidth: 1,
      borderColor: '#d9e4f2',
      borderRadius: 18,
      backgroundColor: '#ffffff',
      padding: 14,
      marginBottom: 12,
    },
    exportPreviewText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '600',
    },
    exportActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
  });
