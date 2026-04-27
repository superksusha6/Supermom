import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { buildMacroMessage, cleanNutritionNumber, getNutritionPlan, getNutritionTotals, getNutritionValuesForGrams, NUTRITION_FOOD_PRESETS, NutritionFoodPreset } from '@/lib/nutrition';
import { ActivityLevel, NutritionFoodEntry, NutritionGoal, NutritionMealType, NutritionPace, NutritionSex, PersonalProfile } from '@/types/app';
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
};

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
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasProfileInputs = Boolean(personalProfile.dateOfBirth && personalProfile.heightCm && personalProfile.weightKg);
  const [goalSetupCollapsed, setGoalSetupCollapsed] = useState(hasProfileInputs);
  const [activeMealType, setActiveMealType] = useState<NutritionMealType | null>(null);
  const [draftMealName, setDraftMealName] = useState('');
  const [draftCalories, setDraftCalories] = useState('');
  const [draftProtein, setDraftProtein] = useState('');
  const [draftFat, setDraftFat] = useState('');
  const [draftCarbs, setDraftCarbs] = useState('');
  const [foodSearch, setFoodSearch] = useState('');
  const [draftGrams, setDraftGrams] = useState('100');
  const [selectedPreset, setSelectedPreset] = useState<NutritionFoodPreset | null>(null);
  const [customFoodMode, setCustomFoodMode] = useState(false);
  const [customBrand, setCustomBrand] = useState('');
  const [customServingType, setCustomServingType] = useState<'100g' | '100ml' | 'serving'>('100g');
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);

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
  ];
  const mealData = mealSections.map((section) => {
    const entries = selectedDateEntries.filter((entry) => entry.mealType === section.key);
    return {
      ...section,
      entries,
      totals: getNutritionTotals(entries),
    };
  });
  const insights = plan
    ? [
        buildMacroMessage('Calories', totals.calories, plan.calories, 'kcal'),
        buildMacroMessage('Protein', totals.protein, plan.protein, 'g'),
        buildMacroMessage('Fat', totals.fat, plan.fat, 'g'),
        buildMacroMessage('Carbs', totals.carbs, plan.carbs, 'g'),
      ]
    : [];
  const filteredFoodPresets = useMemo(() => {
    const query = foodSearch.trim().toLowerCase();
    if (!query) return NUTRITION_FOOD_PRESETS.slice(0, 8);
    return NUTRITION_FOOD_PRESETS.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8);
  }, [foodSearch]);
  const hasExactFoodMatch = useMemo(() => {
    const query = foodSearch.trim().toLowerCase();
    if (!query) return false;
    return NUTRITION_FOOD_PRESETS.some((item) => item.name.toLowerCase() === query);
  }, [foodSearch]);
  const todayDateKey = useMemo(() => toDateKey(new Date()), []);
  const weekDays = useMemo(() => buildNutritionWeekDays(weekOffset, nutritionEntries), [nutritionEntries, weekOffset]);
  const selectedDateLabel = selectedDateKey === todayDateKey ? 'Today' : formatReadableDate(selectedDateKey);
  const selectedPresetValues = selectedPreset ? getNutritionValuesForGrams(selectedPreset, draftGrams) : null;
  const nutritionProgress = plan
    ? [
        { key: 'calories', label: 'Calories', short: 'K', current: totals.calories, target: plan.calories, size: 122, stroke: 8, unit: 'kcal' },
        { key: 'protein', label: 'Protein', short: 'P', current: totals.protein, target: plan.protein, size: 98, stroke: 8, unit: 'g' },
        { key: 'carbs', label: 'Carbs', short: 'C', current: totals.carbs, target: plan.carbs, size: 74, stroke: 8, unit: 'g' },
        { key: 'fat', label: 'Fat', short: 'F', current: totals.fat, target: plan.fat, size: 50, stroke: 8, unit: 'g' },
      ].map((item) => {
        const ratio = item.target > 0 ? item.current / item.target : 0;
        const progress = Math.max(0.08, Math.min(ratio, 1));
        const remaining = Math.max(0, Math.round(item.target - item.current));
        const status = ratio > 1.05 ? 'over' : ratio >= 1 ? 'done' : ratio >= 0.6 ? 'mid' : 'low';
        const color =
          status === 'over'
            ? '#166534'
            : status === 'done'
              ? '#22c55e'
              : status === 'mid'
                ? '#f59e0b'
                : '#ef4444';
        return { ...item, ratio, progress, remaining, status, color };
      })
    : [];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="Goal Setup">
        {plan ? (
          <>
            <View style={styles.goalTopRow}>
              <View style={styles.goalCompactSummary}>
                <Text style={styles.goalCompactTitle}>
                  {plan.calories} kcal • {plan.effectiveGoal === 'lose' ? 'Lose' : plan.effectiveGoal === 'gain' ? 'Gain' : 'Maintain'}
                </Text>
                <Text style={styles.goalCompactText}>
                  {personalProfile.weightKg || '0'} kg now • target {Math.round(plan.desiredWeight)} kg • {activityLevel}
                </Text>
              </View>
              <Pressable style={styles.goalToggleBtn} onPress={() => setGoalSetupCollapsed((prev) => !prev)}>
                <Text style={styles.goalToggleBtnText}>{goalSetupCollapsed ? 'Edit' : 'Hide'}</Text>
              </Pressable>
            </View>

            {!goalSetupCollapsed ? (
              <>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Current</Text>
                    <Text style={styles.summaryValue}>{personalProfile.weightKg || '0'} kg</Text>
                    <Text style={styles.summaryMeta}>{personalProfile.heightCm || '0'} cm</Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Target Weight</Text>
                    <TextInput
                      placeholder="55"
                      keyboardType="decimal-pad"
                      style={styles.inlineInput}
                      value={desiredWeight}
                      onChangeText={(text) => onDesiredWeightChange(cleanNutritionNumber(text))}
                    />
                    <Text style={styles.summaryMeta}>kg</Text>
                  </View>
                </View>

                <Text style={styles.label}>Goal</Text>
                <View style={styles.pillRow}>
                  {(['lose', 'maintain', 'gain'] as NutritionGoal[]).map((goal) => (
                    <Pressable key={goal} style={[styles.pillBtn, nutritionGoal === goal && styles.pillBtnActive]} onPress={() => onNutritionGoalChange(goal)}>
                      <Text style={[styles.pillBtnText, nutritionGoal === goal && styles.pillBtnTextActive]}>
                        {goal === 'lose' ? 'Lose' : goal === 'gain' ? 'Gain' : 'Maintain'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Pace</Text>
                <View style={styles.pillRow}>
                  {(['fast', 'flexible'] as NutritionPace[]).map((pace) => (
                    <Pressable key={pace} style={[styles.pillBtn, nutritionPace === pace && styles.pillBtnActive]} onPress={() => onNutritionPaceChange(pace)}>
                      <Text style={[styles.pillBtnText, nutritionPace === pace && styles.pillBtnTextActive]}>
                        {pace === 'fast' ? 'Fast result' : 'No deadline'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Activity</Text>
                <View style={styles.pillRow}>
                  {(['low', 'moderate', 'high'] as ActivityLevel[]).map((level) => (
                    <Pressable key={level} style={[styles.pillBtn, activityLevel === level && styles.pillBtnActive]} onPress={() => onActivityLevelChange(level)}>
                      <Text style={[styles.pillBtnText, activityLevel === level && styles.pillBtnTextActive]}>
                        {level === 'low' ? 'Low' : level === 'high' ? 'High' : 'Moderate'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Daily calories</Text>
                    <Text style={styles.summaryValue}>{plan.calories}</Text>
                    <Text style={styles.summaryMeta}>kcal target</Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Direction</Text>
                    <Text style={styles.summaryMacro}>
                      {plan.effectiveGoal === 'lose' ? 'Lose' : plan.effectiveGoal === 'gain' ? 'Gain' : 'Maintain'}
                    </Text>
                    <Text style={styles.summaryMeta}>
                      {Math.round(plan.desiredWeight)} kg target
                    </Text>
                  </View>
                </View>

                <View style={styles.insightsWrap}>
                  {insights.map((item) => (
                    <View key={item.title} style={styles.insightCard}>
                      <Text style={styles.insightTitle}>{item.title}</Text>
                      <Text style={styles.insightText}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyText}>Fill in date of birth, height, and weight in Settings to calculate your calories and macros.</Text>
        )}
      </SectionCard>

      <SectionCard title="Meals Today">
        <View style={styles.weekHeader}>
          <Pressable style={styles.weekArrowBtn} onPress={() => setWeekOffset((prev) => prev - 1)}>
            <Text style={styles.weekArrowText}>‹</Text>
          </Pressable>
          <View style={styles.weekTitleWrap}>
            <Text style={styles.weekTitle}>{selectedDateLabel}</Text>
            <Text style={styles.weekSubtitle}>{formatReadableDate(selectedDateKey)}</Text>
          </View>
          <Pressable style={styles.weekArrowBtn} onPress={() => setWeekOffset((prev) => prev + 1)}>
            <Text style={styles.weekArrowText}>›</Text>
          </Pressable>
        </View>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day) => {
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
                <Text style={[styles.weekDayCalories, today && styles.weekDayCaloriesToday, active && styles.weekDayCaloriesActive, today && hovered && styles.weekDayTextTodayHover]}>{day.calories ? `${day.calories} kcal` : 'empty'}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.sectionHint}>Tap `+` on any meal to add products for the selected day.</Text>
        <View style={styles.todaySummaryBar}>
          <View style={styles.todaySummaryTopRow}>
            <View style={styles.todaySummaryPrimary}>
              <Text style={styles.todaySummaryLabel}>Selected day eaten</Text>
              <Text style={styles.todaySummaryCalories}>{totals.calories} kcal</Text>
            </View>
          </View>
          {plan ? (
            <View style={styles.progressShowcase}>
              <View style={styles.multiRingWrap}>
                {nutritionProgress.map((item) => (
                  <View
                    key={item.key}
                    style={[
                      styles.multiRingTrack,
                      {
                        width: item.size,
                        height: item.size,
                        borderRadius: item.size / 2,
                        borderWidth: item.stroke,
                        borderColor: `${item.color}24`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.multiRingArc,
                        {
                          width: item.size,
                          height: item.size,
                          borderRadius: item.size / 2,
                          borderWidth: item.stroke,
                          borderTopColor: item.color,
                          borderRightColor: item.color,
                          transform: [{ rotate: `${item.progress * 270 - 135}deg` }],
                        },
                      ]}
                    />
                  </View>
                ))}
                <View style={styles.multiRingCenter}>
                  <Text style={styles.multiRingCenterLabel}>Day</Text>
                  <Text style={styles.multiRingCenterValue}>{totals.calories}</Text>
                  <Text style={styles.multiRingCenterMeta}>kcal</Text>
                </View>
              </View>
              <View style={styles.progressLegend}>
                {nutritionProgress.map((item) => (
                  <View key={item.key} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <View style={styles.legendCopy}>
                      <Text style={styles.legendTitle}>{item.label}</Text>
                      <Text style={styles.legendMeta}>
                        {Math.round(item.current)}/{Math.round(item.target)} {item.unit}
                      </Text>
                    </View>
                    <Text style={styles.legendStatus}>
                      {item.status === 'over'
                        ? 'over'
                        : item.status === 'done'
                          ? 'done'
                          : item.status === 'mid'
                            ? 'getting there'
                            : 'low'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.todaySummaryMacros}>
            <Text style={styles.todaySummaryMacro}>P {totals.protein}</Text>
            <Text style={styles.todaySummaryMacro}>C {totals.carbs}</Text>
            <Text style={styles.todaySummaryMacro}>F {totals.fat}</Text>
          </View>
        </View>
        <View style={styles.mealCardsWrap}>
          {mealData.map((section) => (
            <View key={section.key} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTitleWrap}>
                  <View style={[styles.mealIconBadge, { backgroundColor: `${section.accent}18`, borderColor: `${section.accent}4D` }]}>
                    <Text style={[styles.mealIconText, { color: section.accent }]}>{section.icon}</Text>
                  </View>
                  <View style={styles.mealHeaderCopy}>
                    <Text style={styles.mealTitle}>{section.title}</Text>
                    <Text style={styles.mealSubtitle}>{section.subtitle}</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.addMealBtn}
                  onPress={() => {
                    setActiveMealType(section.key);
                    setDraftMealName('');
                    setDraftCalories('');
                    setDraftProtein('');
                    setDraftFat('');
                    setDraftCarbs('');
                    setFoodSearch('');
                    setDraftGrams('100');
                    setSelectedPreset(null);
                    setCustomFoodMode(false);
                    setCustomBrand('');
                    setCustomServingType('100g');
                  }}
                >
                  <Text style={styles.addMealBtnText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.mealStatsRow}>
                <View style={styles.mealStatChip}>
                  <Text style={styles.mealStatValue}>{section.totals.calories}</Text>
                  <Text style={styles.mealStatLabel}>kcal</Text>
                </View>
                <View style={styles.mealStatChip}>
                  <Text style={styles.mealStatValue}>P {section.totals.protein}</Text>
                  <Text style={styles.mealStatLabel}>protein</Text>
                </View>
                <View style={styles.mealStatChip}>
                  <Text style={styles.mealStatValue}>F {section.totals.fat}</Text>
                  <Text style={styles.mealStatLabel}>fat</Text>
                </View>
                <View style={styles.mealStatChip}>
                  <Text style={styles.mealStatValue}>C {section.totals.carbs}</Text>
                  <Text style={styles.mealStatLabel}>carbs</Text>
                </View>
              </View>

              {section.entries.length ? (
                <View style={styles.entriesWrap}>
                  {section.entries.map((entry) => (
                    <View key={entry.id} style={styles.entryCard}>
                      <View style={styles.entryCopy}>
                        <Text style={styles.entryTitle}>{entry.name}</Text>
                        <Text style={styles.entryMeta}>
                          {entry.calories} kcal · P {entry.protein} · F {entry.fat} · C {entry.carbs}
                        </Text>
                      </View>
                      <Pressable style={styles.secondaryBtn} onPress={() => onNutritionEntriesChange((prev) => prev.filter((item) => item.id !== entry.id))}>
                        <Text style={styles.secondaryBtnText}>Delete</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.mealEmptyState}>
                  <Text style={styles.mealEmptyTitle}>Nothing here yet</Text>
                  <Text style={styles.mealEmptyText}>Add your first product to start tracking this meal.</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </SectionCard>

      <Modal visible={!!activeMealType} transparent animationType="fade" onRequestClose={() => setActiveMealType(null)}>
        <View style={styles.modalScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveMealType(null)} />
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalEyebrow}>Add product</Text>
              <Text style={styles.modalTitle}>
                {mealSections.find((item) => item.key === activeMealType)?.title || 'Meal'}
              </Text>
              <View style={styles.modalSection}>
                <TextInput
                  placeholder="Search foods"
                  style={styles.input}
                  value={foodSearch}
                  onChangeText={(text) => {
                    setFoodSearch(text);
                    if (!customFoodMode) {
                      setSelectedPreset(null);
                      setDraftMealName(text);
                    }
                  }}
                />
                {!customFoodMode ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScrollContent}>
                      {filteredFoodPresets.map((item) => (
                        <Pressable
                          key={item.id}
                          style={[styles.presetCard, selectedPreset?.id === item.id && styles.presetCardActive]}
                          onPress={() => {
                            const next = getNutritionValuesForGrams(item, draftGrams);
                            setSelectedPreset(item);
                            setDraftMealName(item.name);
                            setDraftCalories(next.calories);
                            setDraftProtein(next.protein);
                            setDraftFat(next.fat);
                            setDraftCarbs(next.carbs);
                            setFoodSearch(item.name);
                          }}
                        >
                          <Text style={styles.presetTitle}>{item.name}</Text>
                          <Text style={styles.presetServing}>{item.baseAmount}</Text>
                          <Text style={styles.presetMacros}>
                            {item.caloriesPer100g} kcal · P {item.proteinPer100g} · F {item.fatPer100g} · C {item.carbsPer100g}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    {foodSearch.trim() && !hasExactFoodMatch ? (
                      <Pressable
                        style={styles.customFoodBtn}
                        onPress={() => {
                          setCustomFoodMode(true);
                          setSelectedPreset(null);
                          setDraftMealName(foodSearch.trim());
                          setDraftCalories('');
                          setDraftProtein('');
                          setDraftFat('');
                          setDraftCarbs('');
                          setDraftGrams('100');
                          setCustomBrand('');
                          setCustomServingType('100g');
                        }}
                      >
                        <Text style={styles.customFoodBtnTitle}>Add custom food</Text>
                        <Text style={styles.customFoodBtnText}>Use this when the product is not in the list.</Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.customFoodCard}>
                    <View style={styles.customFoodHeader}>
                      <View>
                        <Text style={styles.customFoodTitle}>Custom food</Text>
                        <Text style={styles.customFoodText}>Enter values from the package or label.</Text>
                      </View>
                      <Pressable
                        style={styles.customFoodCloseBtn}
                        onPress={() => {
                          setCustomFoodMode(false);
                          setCustomBrand('');
                        }}
                      >
                        <Text style={styles.customFoodCloseText}>Back</Text>
                      </Pressable>
                    </View>
                    <TextInput placeholder="Brand optional" style={styles.input} value={customBrand} onChangeText={setCustomBrand} />
                    <View style={styles.pillRow}>
                      {[
                        { key: '100g' as const, label: '100 g' },
                        { key: '100ml' as const, label: '100 ml' },
                        { key: 'serving' as const, label: '1 serving' },
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
                )}
              </View>

              {selectedPreset ? (
                <View style={styles.productInfoCard}>
                  <Text style={styles.productInfoTitle}>{selectedPreset.name}</Text>
                  <Text style={styles.productInfoSubtitle}>Per 100 g</Text>
                  <View style={styles.productInfoStats}>
                    <Text style={styles.productInfoStat}>{selectedPreset.caloriesPer100g} kcal</Text>
                    <Text style={styles.productInfoStat}>P {selectedPreset.proteinPer100g}</Text>
                    <Text style={styles.productInfoStat}>F {selectedPreset.fatPer100g}</Text>
                    <Text style={styles.productInfoStat}>C {selectedPreset.carbsPer100g}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.modalSection}>
                {!selectedPreset || customFoodMode ? (
                  <TextInput placeholder="Product or meal" style={styles.input} value={draftMealName} onChangeText={setDraftMealName} />
                ) : null}
                {!customFoodMode || customServingType !== 'serving' ? (
                  <View style={styles.gramsRow}>
                    <View style={styles.gramsInputWrap}>
                      <Text style={styles.fieldLabel}>{customServingType === '100ml' ? 'Volume' : 'Amount'}</Text>
                      <TextInput
                        placeholder={customServingType === '100ml' ? 'ml' : 'Grams'}
                        keyboardType="decimal-pad"
                        style={styles.input}
                        value={draftGrams}
                        onChangeText={(text) => {
                          const grams = cleanNutritionNumber(text);
                          setDraftGrams(grams);
                          if (selectedPreset) {
                            const next = getNutritionValuesForGrams(selectedPreset, grams);
                            setDraftCalories(next.calories);
                            setDraftProtein(next.protein);
                            setDraftFat(next.fat);
                            setDraftCarbs(next.carbs);
                          }
                        }}
                      />
                    </View>
                    <View style={styles.gramsUnitChip}>
                      <Text style={styles.gramsUnitChipText}>{customServingType === '100ml' ? 'ml' : 'g'}</Text>
                    </View>
                  </View>
                ) : null}
                {customFoodMode ? (
                  <>
                    <View style={styles.row}>
                      <View style={styles.half}>
                        <TextInput placeholder="Calories" keyboardType="number-pad" style={styles.input} value={draftCalories} onChangeText={(text) => setDraftCalories(text.replace(/[^\d]/g, '').slice(0, 4))} />
                      </View>
                      <View style={styles.half}>
                        <TextInput placeholder="Protein" keyboardType="decimal-pad" style={styles.input} value={draftProtein} onChangeText={(text) => setDraftProtein(cleanNutritionNumber(text))} />
                      </View>
                    </View>
                    <View style={styles.row}>
                      <View style={styles.half}>
                        <TextInput placeholder="Fat" keyboardType="decimal-pad" style={styles.input} value={draftFat} onChangeText={(text) => setDraftFat(cleanNutritionNumber(text))} />
                      </View>
                      <View style={styles.half}>
                        <TextInput placeholder="Carbs" keyboardType="decimal-pad" style={styles.input} value={draftCarbs} onChangeText={(text) => setDraftCarbs(cleanNutritionNumber(text))} />
                      </View>
                    </View>
                  </>
                ) : selectedPresetValues ? (
                  <View style={styles.macroPreviewGrid}>
                    <View style={styles.macroPreviewCard}>
                      <Text style={styles.macroPreviewValue}>{selectedPresetValues.calories || '0'}</Text>
                      <Text style={styles.macroPreviewLabel}>kcal</Text>
                    </View>
                    <View style={styles.macroPreviewCard}>
                      <Text style={styles.macroPreviewValue}>{selectedPresetValues.protein || '0'}</Text>
                      <Text style={styles.macroPreviewLabel}>Protein</Text>
                    </View>
                    <View style={styles.macroPreviewCard}>
                      <Text style={styles.macroPreviewValue}>{selectedPresetValues.fat || '0'}</Text>
                      <Text style={styles.macroPreviewLabel}>Fat</Text>
                    </View>
                    <View style={styles.macroPreviewCard}>
                      <Text style={styles.macroPreviewValue}>{selectedPresetValues.carbs || '0'}</Text>
                      <Text style={styles.macroPreviewLabel}>Carbs</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalGhostBtn} onPress={() => setActiveMealType(null)}>
                <Text style={styles.modalGhostBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  if (!draftMealName.trim() || !activeMealType) return;
                  onNutritionEntriesChange((prev) => [
                    {
                      id: `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      name: formatNutritionEntryName({
                        name: draftMealName.trim(),
                        grams: draftGrams,
                        customBrand,
                        customFoodMode,
                        customServingType,
                      }),
                      mealType: activeMealType,
                      date: selectedDateKey,
                      calories: draftCalories || '0',
                      protein: draftProtein || '0',
                      fat: draftFat || '0',
                      carbs: draftCarbs || '0',
                    },
                    ...prev,
                  ]);
                  setDraftMealName('');
                  setDraftCalories('');
                  setDraftProtein('');
                  setDraftFat('');
                  setDraftCarbs('');
                  setFoodSearch('');
                  setDraftGrams('100');
                  setSelectedPreset(null);
                  setCustomFoodMode(false);
                  setCustomBrand('');
                  setCustomServingType('100g');
                  setActiveMealType(null);
                }}
              >
                <Text style={styles.primaryBtnText}>Save</Text>
              </Pressable>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildNutritionWeekDays(weekOffset: number, entries: NutritionFoodEntry[]) {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const mondayDiff = day === 0 ? -6 : 1 - day;
  monday.setDate(today.getDate() + mondayDiff + weekOffset * 7);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return labels.map((weekday, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = toDateKey(date);
    const totals = getNutritionTotals(entries.filter((entry) => entry.date === dateKey));
    return {
      dateKey,
      weekday,
      dayNumber: String(date.getDate()),
      calories: totals.calories,
    };
  });
}

function formatReadableDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

const createStyles = (colors: ThemeColors) =>
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
    sectionHint: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 12,
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
      flex: 1,
      alignItems: 'center',
      gap: 2,
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
    weekDaysRow: {
      flexDirection: 'row',
      gap: 8,
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
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
      gap: 8,
    },
    todaySummaryTopRow: {
      gap: 12,
    },
    todaySummaryPrimary: {
      gap: 6,
    },
    todaySummaryLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    todaySummaryCalories: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    progressShowcase: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 16,
      marginTop: 6,
    },
    multiRingWrap: {
      width: 130,
      height: 130,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    multiRingTrack: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    multiRingArc: {
      position: 'absolute',
      borderLeftColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    multiRingCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#ffffff',
      gap: 0,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.92)',
    },
    multiRingCenterLabel: {
      color: colors.subtext,
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    multiRingCenterValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    multiRingCenterMeta: {
      color: colors.subtext,
      fontSize: 9,
      fontWeight: '700',
    },
    progressLegend: {
      flex: 1,
      minWidth: 180,
      gap: 8,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendCopy: {
      flex: 1,
      gap: 1,
    },
    legendTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    legendMeta: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '600',
    },
    legendStatus: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
    },
    todaySummaryMacros: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    todaySummaryMacro: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      overflow: 'hidden',
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
      fontSize: 14,
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
      flexDirection: 'row',
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
      gap: 12,
    },
    mealCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 14,
      gap: 12,
    },
    mealHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
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
    mealStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mealStatChip: {
      minWidth: 72,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 2,
    },
    mealStatValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    mealStatLabel: {
      color: colors.subtext,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    entriesWrap: {
      gap: 10,
    },
    entryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 12,
    },
    entryCopy: {
      flex: 1,
      gap: 4,
    },
    entryTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    entryMeta: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    secondaryBtn: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    secondaryBtnText: {
      color: colors.text,
      fontWeight: '700',
    },
    mealEmptyState: {
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      padding: 14,
      gap: 4,
      backgroundColor: colors.glassSoft,
    },
    mealEmptyTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 14,
    },
    mealEmptyText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    modalScrim: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      maxHeight: '88%',
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
    modalContent: {
      padding: 18,
      paddingBottom: 20,
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
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 14,
    },
    presetScrollContent: {
      gap: 10,
      paddingBottom: 10,
      paddingRight: 6,
    },
    presetCard: {
      width: 190,
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
    customFoodBtn: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.selection,
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
      flexDirection: 'row',
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
      gap: 6,
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
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    gramsInputWrap: {
      flex: 1,
    },
    gramsUnitChip: {
      minWidth: 58,
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
    macroPreviewGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    macroPreviewCard: {
      width: '47%',
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
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 8,
    },
    modalGhostBtn: {
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
  });
