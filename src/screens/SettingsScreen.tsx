import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { getNutritionPlan } from '@/lib/nutrition';
import { ActivityLevel, HabitEntry, HabitReminderMode, NutritionGoal, NutritionPace, NutritionSex, PersonalProfile } from '@/types/app';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type StaffSummary = {
  id: string;
  name: string;
  dateOfBirth?: string;
};

type ChildSummary = {
  id: string;
  name: string;
};

type Props = {
  parentLabel: 'Mom' | 'Dad';
  currentRole: 'mother' | 'child' | 'staff' | 'admin';
  staffEnabled: boolean;
  onToggleStaff: () => void;
  personalProfile: PersonalProfile;
  personalProfileReadonly: boolean;
  onPersonalProfileChange: Dispatch<SetStateAction<PersonalProfile>>;
  onSavePersonalProfile: () => Promise<boolean> | boolean;
  onEditPersonalProfile: () => void;
  personalProfileStatus?: string | null;
  personalProfileError?: string | null;
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
  habits: HabitEntry[];
  onHabitsChange: Dispatch<SetStateAction<HabitEntry[]>>;
  habitRemindersEnabled: boolean;
  onHabitRemindersEnabledChange: Dispatch<SetStateAction<boolean>>;
  periodRemindersEnabled: boolean;
  onPeriodRemindersEnabledChange: Dispatch<SetStateAction<boolean>>;
  periodReminderLeadDays: number;
  onPeriodReminderLeadDaysChange: Dispatch<SetStateAction<number>>;
  children: ChildSummary[];
  staffProfiles: StaffSummary[];
  activeFamilyViewKey: string;
  onSelectFamilyView: (target: string) => void;
  onSelectParentLabel: (label: 'Mom' | 'Dad') => void;
  onToggleChildProfileSetup: () => void;
  onToggleStaffProfileSetup: () => void;
  onEditStaffProfile: (staffId: string) => void;
};

type SettingsSectionKey = 'personal' | 'nutrition' | 'cycle' | 'notifications' | 'habits' | 'family';

export function SettingsScreen({
  parentLabel,
  currentRole,
  staffEnabled,
  onToggleStaff,
  personalProfile,
  personalProfileReadonly,
  onPersonalProfileChange,
  onSavePersonalProfile,
  onEditPersonalProfile,
  personalProfileStatus,
  personalProfileError,
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
  habits,
  onHabitsChange,
  habitRemindersEnabled,
  onHabitRemindersEnabledChange,
  periodRemindersEnabled,
  onPeriodRemindersEnabledChange,
  periodReminderLeadDays,
  onPeriodReminderLeadDaysChange,
  children,
  staffProfiles,
  activeFamilyViewKey,
  onSelectFamilyView,
  onSelectParentLabel,
  onToggleChildProfileSetup,
  onToggleStaffProfileSetup,
  onEditStaffProfile,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const showCycleTracking = currentRole === 'mother' && parentLabel === 'Mom';
  const nutritionPlan = useMemo(
    () =>
      getNutritionPlan({
        dateOfBirth: personalProfile.dateOfBirth,
        heightCm: personalProfile.heightCm,
        weightKg: personalProfile.weightKg,
        goal: nutritionGoal,
        activityLevel,
        sex: nutritionSex,
        desiredWeightKg: desiredWeight,
        pace: nutritionPace,
        calorieOverride,
      }),
    [personalProfile.dateOfBirth, personalProfile.heightCm, personalProfile.weightKg, nutritionGoal, activityLevel, nutritionSex, desiredWeight, nutritionPace, calorieOverride],
  );
  const [customHabitTitle, setCustomHabitTitle] = useState('');
  const [customHabitTarget, setCustomHabitTarget] = useState('');
  const [customHabitIcon, setCustomHabitIcon] = useState('✨');
  const [customHabitMarkStyle, setCustomHabitMarkStyle] = useState<NonNullable<HabitEntry['markStyle']>>('circle');
  const [activeSection, setActiveSection] = useState<SettingsSectionKey | null>(null);
  const habitIconOptions = [
    '💧',
    '🛏️',
    '🧘',
    '🥗',
    '🚶',
    '🏋️',
    '🤸',
    '🏃',
    '🚴',
    '📖',
    '📝',
    '🧠',
    '🎹',
    '🎯',
    '⏰',
    '💻',
    '✅',
    '🧹',
    '🧺',
    '🍳',
    '🪥',
    '😊',
    '🙏',
    '📱',
    '❤️',
  ];
  const habitMarkStyles: Array<{ key: NonNullable<HabitEntry['markStyle']>; label: string }> = [
    { key: 'circle', label: '●' },
    { key: 'check', label: '✓' },
    { key: 'heart', label: '♥' },
    { key: 'star', label: '★' },
    { key: 'diamond', label: '◆' },
  ];
  const reminderModes: Array<{ key: HabitReminderMode; label: string }> = [
    { key: 'off', label: 'Off' },
    { key: 'smart', label: 'Smart' },
    { key: 'custom', label: 'Custom' },
  ];

  const getSmartReminderTime = (icon: string) =>
    (
      {
        '💧': '14:00',
        '🛏️': '22:00',
        '🧘': '20:30',
        '🥗': '13:00',
        '🚶': '18:00',
        '🏋️': '18:30',
        '🤸': '08:00',
        '🏃': '07:00',
        '🚴': '07:30',
        '📖': '20:30',
        '📝': '21:00',
        '🧠': '19:30',
        '🎹': '17:30',
        '🎯': '09:00',
        '⏰': '21:30',
        '💻': '10:00',
        '✅': '09:00',
        '🧹': '11:00',
        '🧺': '16:00',
        '🍳': '18:30',
        '🪥': '22:00',
        '😊': '19:00',
        '🙏': '21:00',
        '📱': '20:00',
        '❤️': '20:30',
      } as Record<string, string>
    )[icon] || '19:00';

  const personalSummary = [personalProfile.fullName?.trim(), personalProfile.dateOfBirth?.trim()].filter(Boolean).join(' • ') || 'Add your main details';
  const nutritionSummary = nutritionPlan
    ? `${nutritionGoal === 'lose' ? 'Lose' : nutritionGoal === 'gain' ? 'Gain' : 'Maintain'} • ${activityLevel === 'high' ? 'Active' : activityLevel === 'low' ? 'Low activity' : 'Moderate'} • ${nutritionPlan.calories} kcal`
    : 'Set your goal and nutrition target';
  const cycleSummary = personalProfile.cycleTrackingEnabled
    ? `${personalProfile.cycleLengthDays || '28'} days • ${personalProfile.cyclePeriodLengthDays || '5'} days`
    : 'Disabled';
  const notificationsSummary = [
    habitRemindersEnabled ? 'Habits on' : 'Habits off',
    periodRemindersEnabled ? `Period ${periodReminderLeadDays} day${periodReminderLeadDays === 1 ? '' : 's'} before` : 'Period off',
  ].join(' • ');
  const habitsSummary = `${habits.filter((habit) => habit.enabled).length} active • ${habits.length} total`;
  const familySummary = [
    parentLabel,
    `${children.length} child${children.length === 1 ? '' : 'ren'}`,
    staffEnabled ? 'staff on' : 'staff off',
  ].join(' • ');

  const sectionRows: Array<{ key: SettingsSectionKey; title: string; subtitle: string }> = [
    { key: 'personal', title: 'Personal', subtitle: personalSummary },
    { key: 'nutrition', title: 'Nutrition', subtitle: nutritionSummary },
    ...(showCycleTracking ? [{ key: 'cycle' as const, title: 'Cycle', subtitle: cycleSummary }] : []),
    { key: 'notifications', title: 'Notifications', subtitle: notificationsSummary },
    { key: 'habits', title: 'Habit trackers', subtitle: habitsSummary },
    { key: 'family', title: 'Family & Access', subtitle: familySummary },
  ];

  const activeSectionTitle =
    activeSection === 'personal'
      ? 'Personal'
      : activeSection === 'nutrition'
        ? 'Nutrition'
        : activeSection === 'cycle'
          ? 'Cycle'
          : activeSection === 'notifications'
            ? 'Notifications'
            : activeSection === 'habits'
              ? 'Habit trackers'
              : activeSection === 'family'
                ? 'Family & Access'
                : '';

  const activeSectionSubtitle =
    activeSection === 'personal'
      ? 'Basic personal information and health profile.'
      : activeSection === 'nutrition'
        ? 'Your goal, activity level and calorie target.'
        : activeSection === 'cycle'
          ? 'Cycle settings and period timing.'
          : activeSection === 'notifications'
            ? 'Global reminder behavior.'
            : activeSection === 'habits'
              ? 'Enable, edit and create trackers.'
              : activeSection === 'family'
                ? 'Family profiles, staff access and workspace.'
                : '';

  function openSection(section: SettingsSectionKey) {
    if (section === 'personal' || section === 'cycle') onEditPersonalProfile();
    setActiveSection(section);
  }

  function closeSection() {
    setActiveSection(null);
  }

  async function handleSaveAndClose() {
    const didSave = await onSavePersonalProfile();
    if (didSave) closeSection();
  }

  function renderPersonalEditor() {
    return (
      <>
        <Text style={styles.label}>Name</Text>
        <TextInput
          placeholder="Your full name"
          style={styles.input}
          value={personalProfile.fullName}
          onChangeText={(text) => onPersonalProfileChange((prev) => ({ ...prev, fullName: text }))}
        />

        <Text style={styles.label}>Nickname</Text>
        <TextInput
          placeholder="Nickname"
          style={styles.input}
          value={personalProfile.nickname || ''}
          onChangeText={(text) => onPersonalProfileChange((prev) => ({ ...prev, nickname: text }))}
        />

        <Text style={styles.label}>Date of Birth</Text>
        <TextInput
          placeholder="DD.MM.YYYY"
          keyboardType="number-pad"
          style={styles.input}
          value={personalProfile.dateOfBirth || ''}
          onChangeText={(text) => onPersonalProfileChange((prev) => ({ ...prev, dateOfBirth: formatBirthDateInput(text) }))}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              placeholder="170"
              keyboardType="number-pad"
              style={styles.input}
              value={personalProfile.heightCm || ''}
              onChangeText={(text) => onPersonalProfileChange((prev) => ({ ...prev, heightCm: text.replace(/[^\d]/g, '').slice(0, 3) }))}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              placeholder="60.5"
              keyboardType="decimal-pad"
              style={styles.input}
              value={personalProfile.weightKg || ''}
              onChangeText={(text) => onPersonalProfileChange((prev) => ({ ...prev, weightKg: text.replace(/[^0-9.,]/g, '').slice(0, 6) }))}
            />
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={handleSaveAndClose}>
          <Text style={styles.primaryBtnText}>Save</Text>
        </Pressable>
        {personalProfileStatus ? <Text style={styles.statusText}>{personalProfileStatus}</Text> : null}
        {personalProfileError ? <Text style={styles.errorText}>{personalProfileError}</Text> : null}
      </>
    );
  }

  function renderNutritionEditor() {
    return (
      <>
        {nutritionPlan ? (
          <View style={styles.nutritionPlanCard}>
            <Text style={styles.nutritionPlanTitle}>Calculated daily target</Text>
            <Text style={styles.nutritionPlanCalories}>{nutritionPlan.calories} kcal</Text>
            <Text style={styles.nutritionPlanMeta}>
              {nutritionPlan.effectiveGoal === 'lose' ? 'Weight loss' : nutritionPlan.effectiveGoal === 'gain' ? 'Weight gain' : 'Weight maintenance'}
              {` • ${Math.round(nutritionPlan.desiredWeight)} kg target`}
            </Text>
            <View style={styles.nutritionPlanMacros}>
              <View style={styles.nutritionPlanMacro}>
                <Text style={styles.nutritionPlanMacroValue}>{nutritionPlan.protein} g</Text>
                <Text style={styles.nutritionPlanMacroLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionPlanMacro}>
                <Text style={styles.nutritionPlanMacroValue}>{nutritionPlan.fat} g</Text>
                <Text style={styles.nutritionPlanMacroLabel}>Fat</Text>
              </View>
              <View style={styles.nutritionPlanMacro}>
                <Text style={styles.nutritionPlanMacroValue}>{nutritionPlan.carbs} g</Text>
                <Text style={styles.nutritionPlanMacroLabel}>Carbs</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.helpText}>Fill in date of birth, height, and weight in Personal to calculate calories and macros automatically.</Text>
        )}

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

        <Text style={styles.label}>Lifestyle / activity</Text>
        <View style={styles.pillRow}>
          {([
            { key: 'low' as ActivityLevel, label: 'Mostly sitting' },
            { key: 'moderate' as ActivityLevel, label: 'Mixed routine' },
            { key: 'high' as ActivityLevel, label: 'Very active' },
          ]).map((level) => (
            <Pressable key={level.key} style={[styles.pillBtn, activityLevel === level.key && styles.pillBtnActive]} onPress={() => onActivityLevelChange(level.key)}>
              <Text style={[styles.pillBtnText, activityLevel === level.key && styles.pillBtnTextActive]}>{level.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Sex</Text>
        <View style={styles.pillRow}>
          {(['female', 'male'] as NutritionSex[]).map((sex) => (
            <Pressable key={sex} style={[styles.pillBtn, nutritionSex === sex && styles.pillBtnActive]} onPress={() => onNutritionSexChange(sex)}>
              <Text style={[styles.pillBtnText, nutritionSex === sex && styles.pillBtnTextActive]}>{sex === 'female' ? 'Female' : 'Male'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Desired Weight (kg)</Text>
        <TextInput
          placeholder="Optional target weight"
          keyboardType="decimal-pad"
          style={styles.input}
          value={desiredWeight}
          onChangeText={(text) => onDesiredWeightChange(text.replace(/[^0-9.,]/g, '').slice(0, 6))}
        />

        <Text style={styles.label}>Timeline</Text>
        <View style={styles.pillRow}>
          {(['fast', 'flexible'] as NutritionPace[]).map((pace) => (
            <Pressable key={pace} style={[styles.pillBtn, nutritionPace === pace && styles.pillBtnActive]} onPress={() => onNutritionPaceChange(pace)}>
              <Text style={[styles.pillBtnText, nutritionPace === pace && styles.pillBtnTextActive]}>
                {pace === 'fast' ? 'Fast result' : 'No deadline'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Daily Calories Override</Text>
        <TextInput
          placeholder="Optional manual target, e.g. 1800"
          keyboardType="number-pad"
          style={styles.input}
          value={calorieOverride}
          onChangeText={(text) => onCalorieOverrideChange(text.replace(/[^\d]/g, '').slice(0, 4))}
        />

        <Pressable style={styles.primaryBtn} onPress={closeSection}>
          <Text style={styles.primaryBtnText}>Save</Text>
        </Pressable>
      </>
    );
  }

  function renderCycleEditor() {
    return (
      <>
        <Text style={styles.label}>Cycle Tracking</Text>
        <Pressable
          style={[styles.toggle, personalProfile.cycleTrackingEnabled && styles.toggleOn]}
          onPress={() => onPersonalProfileChange((prev) => ({ ...prev, cycleTrackingEnabled: !prev }))}
        >
          <Text style={styles.toggleText}>{personalProfile.cycleTrackingEnabled ? 'Enabled' : 'Disabled'}</Text>
        </Pressable>

        {personalProfile.cycleTrackingEnabled ? (
          <>
            <Text style={styles.label}>Last Period Start</Text>
            <TextInput
              placeholder="DD.MM.YYYY"
              keyboardType="number-pad"
              style={styles.input}
              value={personalProfile.cycleLastPeriodStart || ''}
              onChangeText={(text) => onPersonalProfileChange((prev) => ({ ...prev, cycleLastPeriodStart: formatBirthDateInput(text) }))}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Cycle Length (days)</Text>
                <TextInput
                  placeholder="28"
                  keyboardType="number-pad"
                  style={styles.input}
                  value={personalProfile.cycleLengthDays || ''}
                  onChangeText={(text) => onPersonalProfileChange((prev) => ({ ...prev, cycleLengthDays: text.replace(/[^\d]/g, '').slice(0, 2) }))}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Period Length (days)</Text>
                <TextInput
                  placeholder="5"
                  keyboardType="number-pad"
                  style={styles.input}
                  value={personalProfile.cyclePeriodLengthDays || ''}
                  onChangeText={(text) =>
                    onPersonalProfileChange((prev) => ({ ...prev, cyclePeriodLengthDays: text.replace(/[^\d]/g, '').slice(0, 2) }))
                  }
                />
              </View>
            </View>
          </>
        ) : null}

        <Pressable style={styles.primaryBtn} onPress={handleSaveAndClose}>
          <Text style={styles.primaryBtnText}>Save</Text>
        </Pressable>
        {personalProfileStatus ? <Text style={styles.statusText}>{personalProfileStatus}</Text> : null}
        {personalProfileError ? <Text style={styles.errorText}>{personalProfileError}</Text> : null}
      </>
    );
  }

  function renderNotificationsEditor() {
    return (
      <>
        <Text style={styles.helpText}>Control global reminder behavior here. Per-habit reminder details stay inside Habit Trackers.</Text>
        <View style={styles.masterReminderRow}>
          <View style={styles.masterReminderCopy}>
            <Text style={styles.masterReminderTitle}>Habit reminders</Text>
            <Text style={styles.masterReminderSubtitle}>{habitRemindersEnabled ? 'Reminders are allowed app-wide.' : 'All habit reminders are paused.'}</Text>
          </View>
          <Pressable style={[styles.toggle, habitRemindersEnabled && styles.toggleOn]} onPress={() => onHabitRemindersEnabledChange((prev) => !prev)}>
            <Text style={styles.toggleText}>{habitRemindersEnabled ? 'On' : 'Off'}</Text>
          </Pressable>
        </View>

        {showCycleTracking ? (
          <View style={styles.masterReminderRow}>
            <View style={styles.masterReminderCopy}>
              <Text style={styles.masterReminderTitle}>Period reminders</Text>
              <Text style={styles.masterReminderSubtitle}>
                {periodRemindersEnabled
                  ? `Remind me ${periodReminderLeadDays} day${periodReminderLeadDays === 1 ? '' : 's'} before my period may start.`
                  : 'Period reminders are off.'}
              </Text>
            </View>
            <Pressable
              style={[styles.toggle, periodRemindersEnabled && styles.toggleOn]}
              onPress={() => onPeriodRemindersEnabledChange((prev) => !prev)}
            >
              <Text style={styles.toggleText}>{periodRemindersEnabled ? 'On' : 'Off'}</Text>
            </Pressable>
          </View>
        ) : null}

        {showCycleTracking && periodRemindersEnabled ? (
          <>
            <Text style={styles.label}>Remind me before</Text>
            <View style={styles.pillRow}>
              {[1, 2, 3].map((days) => (
                <Pressable
                  key={days}
                  style={[styles.pillBtn, periodReminderLeadDays === days && styles.pillBtnActive]}
                  onPress={() => onPeriodReminderLeadDaysChange(days)}
                >
                  <Text style={[styles.pillBtnText, periodReminderLeadDays === days && styles.pillBtnTextActive]}>
                    {days} day{days === 1 ? '' : 's'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Pressable style={styles.primaryBtn} onPress={closeSection}>
          <Text style={styles.primaryBtnText}>Save</Text>
        </Pressable>
      </>
    );
  }

  function renderHabitsEditor() {
    return (
      <>
        <Text style={styles.helpText}>Turn ready-made trackers on only when you need them, edit the target, or add your own custom one.</Text>
        <View style={styles.habitSettingsWrap}>
          {habits.map((habit) => (
            <View key={habit.id} style={styles.habitSettingsCard}>
              <View style={styles.habitSettingsTop}>
                <View style={styles.habitSettingsTitleWrap}>
                  <Text style={styles.habitSettingsIcon}>{habit.icon}</Text>
                  <View style={styles.habitSettingsCopy}>
                    <Text style={styles.habitSettingsTitle}>{habit.title}</Text>
                    <Text style={styles.habitSettingsMeta}>{habit.builtIn ? 'Built-in tracker' : 'Custom tracker'}</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.toggle, habit.enabled && styles.toggleOn]}
                  onPress={() => onHabitsChange((prev) => prev.map((item) => (item.id === habit.id ? { ...item, enabled: !item.enabled } : item)))}
                >
                  <Text style={styles.toggleText}>{habit.enabled ? 'On' : 'Off'}</Text>
                </Pressable>
              </View>
              <TextInput
                placeholder="Target"
                style={styles.input}
                value={habit.targetText}
                onChangeText={(text) => onHabitsChange((prev) => prev.map((item) => (item.id === habit.id ? { ...item, targetText: text } : item)))}
              />
              <Text style={styles.label}>Reminder</Text>
              <View style={styles.pillRow}>
                {reminderModes.map((mode) => (
                  <Pressable
                    key={`${habit.id}-${mode.key}`}
                    style={[styles.pillBtn, (habit.reminderMode || 'off') === mode.key && styles.pillBtnActive]}
                    onPress={() =>
                      onHabitsChange((prev) =>
                        prev.map((item) =>
                          item.id === habit.id
                            ? {
                                ...item,
                                reminderMode: mode.key,
                                reminderTime: mode.key === 'off' ? '' : mode.key === 'smart' ? getSmartReminderTime(item.icon) : item.reminderTime || '20:00',
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <Text style={[styles.pillBtnText, (habit.reminderMode || 'off') === mode.key && styles.pillBtnTextActive]}>{mode.label}</Text>
                  </Pressable>
                ))}
              </View>
              {(habit.reminderMode || 'off') !== 'off' ? (
                <>
                  <Text style={styles.label}>{(habit.reminderMode || 'off') === 'smart' ? 'Suggested time' : 'Custom time'}</Text>
                  <TextInput
                    placeholder="20:00"
                    style={[styles.input, !habitRemindersEnabled && styles.inputDimmed]}
                    editable={(habit.reminderMode || 'off') === 'custom' && habitRemindersEnabled}
                    value={(habit.reminderMode || 'off') === 'smart' ? getSmartReminderTime(habit.icon) : habit.reminderTime || '20:00'}
                    onChangeText={(text) => onHabitsChange((prev) => prev.map((item) => (item.id === habit.id ? { ...item, reminderTime: text } : item)))}
                  />
                </>
              ) : null}
              <Text style={styles.label}>Mark style</Text>
              <View style={styles.pillRow}>
                {habitMarkStyles.map((option) => (
                  <Pressable
                    key={`${habit.id}-${option.key}`}
                    style={[styles.markStyleChoice, habit.markStyle === option.key && styles.markStyleChoiceActive]}
                    onPress={() => onHabitsChange((prev) => prev.map((item) => (item.id === habit.id ? { ...item, markStyle: option.key } : item)))}
                  >
                    <Text style={styles.markStyleChoiceText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              {!habit.builtIn ? (
                <Pressable style={styles.secondaryBtn} onPress={() => onHabitsChange((prev) => prev.filter((item) => item.id !== habit.id))}>
                  <Text style={styles.secondaryBtnText}>Remove custom tracker</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.customHabitCard}>
          <Text style={styles.label}>Add custom tracker</Text>
          <TextInput placeholder="Tracker title" style={styles.input} value={customHabitTitle} onChangeText={setCustomHabitTitle} />
          <TextInput placeholder="Target or norm" style={styles.input} value={customHabitTarget} onChangeText={setCustomHabitTarget} />
          <Text style={styles.label}>Icon</Text>
          <View style={styles.pillRow}>
            {habitIconOptions.map((icon) => (
              <Pressable key={icon} style={[styles.iconChoice, customHabitIcon === icon && styles.iconChoiceActive]} onPress={() => setCustomHabitIcon(icon)}>
                <Text style={styles.iconChoiceText}>{icon}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Design</Text>
          <View style={styles.pillRow}>
            {habitMarkStyles.map((option) => (
              <Pressable
                key={option.key}
                style={[styles.markStyleChoice, customHabitMarkStyle === option.key && styles.markStyleChoiceActive]}
                onPress={() => setCustomHabitMarkStyle(option.key)}
              >
                <Text style={styles.markStyleChoiceText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              if (!customHabitTitle.trim()) return;
              onHabitsChange((prev) => [
                {
                  id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  title: customHabitTitle.trim(),
                  icon: customHabitIcon,
                  color: '#ec4899',
                  targetText: customHabitTarget.trim() || 'My custom goal',
                  enabled: true,
                  builtIn: false,
                  markStyle: customHabitMarkStyle,
                  reminderMode: 'off',
                  reminderTime: '',
                  completedToday: false,
                  streak: 0,
                },
                ...prev,
              ]);
              setCustomHabitTitle('');
              setCustomHabitTarget('');
              setCustomHabitIcon('✨');
              setCustomHabitMarkStyle('circle');
            }}
          >
            <Text style={styles.primaryBtnText}>Add tracker</Text>
          </Pressable>
        </View>
      </>
    );
  }

  function renderFamilyEditor() {
    return (
      <>
        {currentRole === 'mother' ? (
          <>
            <Text style={styles.label}>Parent profile</Text>
            <View style={styles.pillRow}>
              {(['Mom', 'Dad'] as Array<'Mom' | 'Dad'>).map((label) => (
                <Pressable key={label} style={[styles.pillBtn, parentLabel === label && styles.pillBtnActive]} onPress={() => onSelectParentLabel(label)}>
                  <Text style={[styles.pillBtnText, parentLabel === label && styles.pillBtnTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Open family workspace</Text>
            <View style={styles.pillRow}>
              <Pressable style={[styles.pillBtn, activeFamilyViewKey === 'mother' && styles.pillBtnActive]} onPress={() => onSelectFamilyView('mother')}>
                <Text style={[styles.pillBtnText, activeFamilyViewKey === 'mother' && styles.pillBtnTextActive]}>{parentLabel}</Text>
              </Pressable>
              {children.map((child) => (
                <Pressable
                  key={`settings-child-${child.id}`}
                  style={[styles.pillBtn, activeFamilyViewKey === `child:${child.id}` && styles.pillBtnActive]}
                  onPress={() => onSelectFamilyView(`child:${child.id}`)}
                >
                  <Text style={[styles.pillBtnText, activeFamilyViewKey === `child:${child.id}` && styles.pillBtnTextActive]}>{child.name}</Text>
                </Pressable>
              ))}
              {staffProfiles.map((profile) => (
                <Pressable
                  key={`settings-staff-${profile.id}`}
                  style={[styles.pillBtn, activeFamilyViewKey === `staff:${profile.id}` && styles.pillBtnActive]}
                  onPress={() => onSelectFamilyView(`staff:${profile.id}`)}
                >
                  <Text style={[styles.pillBtnText, activeFamilyViewKey === `staff:${profile.id}` && styles.pillBtnTextActive]}>{profile.name}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.profileActionsRow}>
              <Pressable style={styles.secondaryBtn} onPress={onToggleChildProfileSetup}>
                <Text style={styles.secondaryBtnText}>Child Profile Setup</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={onToggleStaffProfileSetup}>
                <Text style={styles.secondaryBtnText}>Staff Profile</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <Text style={styles.label}>Staff profiles</Text>
        {staffProfiles.length === 0 ? <Text style={styles.emptyText}>No staff profiles yet.</Text> : null}
        {staffProfiles.map((profile) => (
          <View key={profile.id} style={styles.staffCard}>
            <View style={styles.staffCopy}>
              <Text style={styles.staffName}>{profile.name}</Text>
              <Text style={styles.staffMeta}>{profile.dateOfBirth ? `Birthday: ${profile.dateOfBirth}` : 'Birthday not set yet'}</Text>
            </View>
            <Pressable style={styles.secondaryBtn} onPress={() => onEditStaffProfile(profile.id)}>
              <Text style={styles.secondaryBtnText}>Edit</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.label}>Enable Staff Access</Text>
        <Pressable style={[styles.toggle, staffEnabled && styles.toggleOn]} onPress={onToggleStaff}>
          <Text style={styles.toggleText}>{staffEnabled ? 'Enabled' : 'Disabled'}</Text>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.settingsList}>
          {sectionRows.map((section, index) => (
            <Pressable
              key={section.key}
              style={[styles.settingsRow, index === sectionRows.length - 1 && styles.settingsRowLast]}
              onPress={() => openSection(section.key)}
            >
              <View style={styles.settingsRowCopy}>
                <Text style={styles.settingsRowTitle}>{section.title}</Text>
                <Text style={styles.settingsRowSubtitle}>{section.subtitle}</Text>
              </View>
              <Text style={styles.settingsRowChevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!activeSection} transparent animationType="fade" onRequestClose={closeSection}>
        <View style={styles.editorModalRoot}>
          <Pressable style={styles.editorModalBackdrop} onPress={closeSection} />
          <View style={styles.editorModalLayer}>
            <View style={styles.editorModalCard}>
              <View style={styles.editorModalHeader}>
                <View style={styles.editorModalHeaderCopy}>
                  <Text style={styles.editorModalTitle}>{activeSectionTitle}</Text>
                  <Text style={styles.editorModalSubtitle}>{activeSectionSubtitle}</Text>
                </View>
                <Pressable style={styles.secondaryBtn} onPress={closeSection}>
                  <Text style={styles.secondaryBtnText}>Close</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorScrollContent} showsVerticalScrollIndicator={false}>
                {activeSection === 'personal' ? renderPersonalEditor() : null}
                {activeSection === 'nutrition' ? renderNutritionEditor() : null}
                {activeSection === 'cycle' ? renderCycleEditor() : null}
                {activeSection === 'notifications' ? renderNotificationsEditor() : null}
                {activeSection === 'habits' ? renderHabitsEditor() : null}
                {activeSection === 'family' ? renderFamilyEditor() : null}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      minHeight: 0,
    },
    content: {
      flexGrow: 1,
      gap: 14,
      paddingBottom: 32,
    },
    settingsList: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      overflow: 'hidden',
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingsRowLast: {
      borderBottomWidth: 0,
    },
    settingsRowCopy: {
      flex: 1,
      gap: 3,
    },
    settingsRowTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    settingsRowSubtitle: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },
    settingsRowChevron: {
      color: colors.subtext,
      fontSize: 22,
      lineHeight: 22,
      fontWeight: '700',
    },
    editorModalRoot: {
      flex: 1,
      position: 'relative',
    },
    editorModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
    },
    editorModalLayer: {
      flex: 1,
      justifyContent: 'center',
      padding: 16,
    },
    editorModalCard: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 880,
      maxHeight: '88%',
      minHeight: '62%',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.98)',
      backgroundColor: 'rgba(248,250,252,0.995)',
      padding: 16,
      gap: 12,
      overflow: 'hidden',
    },
    editorModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    editorModalHeaderCopy: {
      flex: 1,
      gap: 2,
    },
    editorModalTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    editorModalSubtitle: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600',
    },
    editorScroll: {
      flex: 1,
      minHeight: 0,
    },
    editorScrollContent: {
      flexGrow: 1,
      gap: 10,
      paddingBottom: 12,
    },
    profileActionsRow: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    half: {
      flex: 1,
    },
    readonlyWrap: {
      gap: 10,
    },
    infoRow: {
      gap: 4,
    },
    infoLabel: {
      color: colors.subtext,
      fontWeight: '700',
    },
    infoValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    label: {
      color: colors.text,
      marginBottom: 8,
      fontWeight: '700',
    },
    input: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.glassStrong,
      color: colors.text,
      marginBottom: 12,
    },
    primaryBtn: {
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      backgroundColor: colors.primary,
      marginTop: 4,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '800',
    },
    statusText: {
      color: colors.done,
      marginTop: 10,
      fontWeight: '700',
    },
    errorText: {
      color: colors.urgent,
      marginTop: 10,
      fontWeight: '700',
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
    helpText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    nutritionPlanCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 14,
      gap: 8,
      marginBottom: 14,
    },
    nutritionPlanTitle: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    nutritionPlanCalories: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
    },
    nutritionPlanMeta: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },
    nutritionPlanMacros: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    nutritionPlanMacro: {
      flex: 1,
      minWidth: 92,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassSoft,
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 2,
    },
    nutritionPlanMacroValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    nutritionPlanMacroLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
    },
    habitSettingsWrap: {
      gap: 10,
      marginTop: 10,
    },
    habitSettingsCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 12,
      gap: 8,
    },
    habitSettingsTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    habitSettingsTitleWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    habitSettingsIcon: {
      fontSize: 18,
    },
    habitSettingsCopy: {
      flex: 1,
      gap: 2,
    },
    habitSettingsTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    habitSettingsMeta: {
      color: colors.subtext,
      fontSize: 11,
    },
    customHabitCard: {
      marginTop: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 12,
    },
    masterReminderRow: {
      marginTop: 10,
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
    masterReminderCopy: {
      flex: 1,
      gap: 2,
    },
    masterReminderTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    masterReminderSubtitle: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 16,
    },
    iconChoice: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconChoiceActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    iconChoiceText: {
      fontSize: 18,
    },
    markStyleChoice: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    markStyleChoiceActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    markStyleChoiceText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    staffCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
      padding: 14,
      marginBottom: 10,
    },
    staffCopy: {
      flex: 1,
      gap: 4,
    },
    staffName: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 16,
    },
    staffMeta: {
      color: colors.subtext,
      fontWeight: '600',
    },
    emptyText: {
      color: colors.subtext,
      marginBottom: 6,
    },
    toggle: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.glassStrong,
    },
    toggleOn: {
      backgroundColor: 'rgba(220,252,231,0.72)',
      borderColor: colors.done,
    },
    toggleText: {
      color: colors.text,
      fontWeight: '700',
    },
    inputDimmed: {
      opacity: 0.72,
    },
  });
