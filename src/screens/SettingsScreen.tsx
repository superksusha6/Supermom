import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { getNutritionPlan } from '@/lib/nutrition';
import { ActivityLevel, HabitEntry, HabitReminderMode, NutritionGoal, NutritionPace, NutritionSex, PhysiqueGoal, PersonalProfile } from '@/types/app';
import { PhysiqueSilhouette } from '@/components/PhysiqueSilhouette';

const PHYSIQUE_OPTIONS: { key: PhysiqueGoal; label: string; labelMale?: string; note: string }[] = [
  { key: 'lean', label: 'Lean', note: 'Slimmer look · moderate protein, lighter calories' },
  { key: 'toned', label: 'Toned', note: 'Defined, not bulky · higher protein (recomposition)' },
  { key: 'athletic', label: 'Athletic', note: 'Fit & energetic · high protein, more carbs' },
  { key: 'curvy', label: 'Curvy', labelMale: 'Solid', note: 'Comfortable & strong · balanced macros' },
  { key: 'strong', label: 'Strong', note: 'Build muscle · highest protein, small surplus' },
];

const QUIET_HOUR_OPTIONS = ['20:00', '21:00', '22:00', '23:00', '06:00', '07:00', '08:00', '09:00'];
const EVENT_LEAD_OPTIONS = ['10 min', '30 min', '1 hour', '1 day'];
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
  physiqueGoal: PhysiqueGoal;
  onPhysiqueGoalChange: Dispatch<SetStateAction<PhysiqueGoal>>;
  calorieOverride: string;
  onCalorieOverrideChange: Dispatch<SetStateAction<string>>;
  habits: HabitEntry[];
  onHabitsChange: Dispatch<SetStateAction<HabitEntry[]>>;
  habitsEnabled: boolean;
  onHabitsEnabledChange: Dispatch<SetStateAction<boolean>>;
  habitRemindersEnabled: boolean;
  onHabitRemindersEnabledChange: Dispatch<SetStateAction<boolean>>;
  medsEnabled: boolean;
  onToggleMeds: () => void;
  onOpenMeds: () => void;
  periodRemindersEnabled: boolean;
  onPeriodRemindersEnabledChange: Dispatch<SetStateAction<boolean>>;
  periodReminderLeadDays: number;
  onPeriodReminderLeadDaysChange: Dispatch<SetStateAction<number>>;
  quietHoursEnabled: boolean;
  onQuietHoursEnabledChange: Dispatch<SetStateAction<boolean>>;
  quietHoursStart: string;
  onQuietHoursStartChange: (value: string) => void;
  quietHoursEnd: string;
  onQuietHoursEndChange: (value: string) => void;
  eventRemindersEnabled: boolean;
  onEventRemindersEnabledChange: Dispatch<SetStateAction<boolean>>;
  eventReminderLead: string;
  onEventReminderLeadChange: (value: string) => void;
  children: ChildSummary[];
  staffProfiles: StaffSummary[];
  activeFamilyViewKey: string;
  onSelectFamilyView: (target: string) => void;
  onSelectParentLabel: (label: 'Mom' | 'Dad') => void;
  onToggleChildProfileSetup: () => void;
  onToggleStaffProfileSetup: () => void;
  onEditStaffProfile: (staffId: string) => void;
  onInviteStaff: (staffId: string) => void;
  partnerConnectedName?: string | null;
  onInvitePartner: () => void;
  onRemovePartner: () => void;
  pushState: 'unsupported' | 'default' | 'denied' | 'enabled' | 'error';
  onTogglePush: () => void;
};

type SettingsSectionKey = 'personal' | 'nutrition' | 'cycle' | 'notifications' | 'habits' | 'meds' | 'addons' | 'family';

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
  physiqueGoal,
  onPhysiqueGoalChange,
  calorieOverride,
  onCalorieOverrideChange,
  habits,
  onHabitsChange,
  habitsEnabled,
  onHabitsEnabledChange,
  habitRemindersEnabled,
  onHabitRemindersEnabledChange,
  medsEnabled,
  onToggleMeds,
  onOpenMeds,
  periodRemindersEnabled,
  onPeriodRemindersEnabledChange,
  periodReminderLeadDays,
  onPeriodReminderLeadDaysChange,
  quietHoursEnabled,
  onQuietHoursEnabledChange,
  quietHoursStart,
  onQuietHoursStartChange,
  quietHoursEnd,
  onQuietHoursEndChange,
  eventRemindersEnabled,
  onEventRemindersEnabledChange,
  eventReminderLead,
  onEventReminderLeadChange,
  children,
  staffProfiles,
  activeFamilyViewKey,
  onSelectFamilyView,
  onSelectParentLabel,
  onToggleChildProfileSetup,
  onToggleStaffProfileSetup,
  onEditStaffProfile,
  onInviteStaff,
  partnerConnectedName,
  onInvitePartner,
  onRemovePartner,
  pushState,
  onTogglePush,
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
  const [habitsScreenOpen, setHabitsScreenOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showCreateHabit, setShowCreateHabit] = useState(false);
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

  const settingsGroups: Array<{ header: string; rows: Array<{ key: SettingsSectionKey; title: string }> }> = [
    {
      header: 'Profile',
      rows: [{ key: 'personal', title: 'Personal & Nutrition' }],
    },
    {
      header: 'Preferences',
      rows: [
        { key: 'notifications', title: 'Notifications' },
        { key: 'addons', title: 'Add-ons' },
      ],
    },
    {
      header: 'Family',
      rows: [{ key: 'family', title: 'Family & Access' }],
    },
  ];

  const activeSectionTitle =
    activeSection === 'personal'
      ? 'Personal & Nutrition'
      : activeSection === 'nutrition'
        ? 'Nutrition'
        : activeSection === 'cycle'
          ? 'Cycle'
          : activeSection === 'notifications'
            ? 'Notifications'
            : activeSection === 'habits'
              ? 'Habits'
              : activeSection === 'meds'
                ? 'Medicine cabinet'
                : activeSection === 'addons'
                  ? 'Add-ons'
                  : activeSection === 'family'
                    ? 'Family & Access'
                    : '';

  const activeSectionSubtitle =
    activeSection === 'personal'
      ? 'Personal details, health profile and nutrition target.'
      : activeSection === 'nutrition'
        ? 'Your goal, activity level and calorie target.'
        : activeSection === 'cycle'
          ? 'Cycle settings and period timing.'
          : activeSection === 'notifications'
            ? 'Global reminder behavior.'
            : activeSection === 'habits'
              ? 'Enable, edit and create trackers.'
              : activeSection === 'meds'
                ? 'Optional meds inventory with expiry reminders.'
                : activeSection === 'addons'
                  ? 'Optional features — turn on what you need.'
                  : activeSection === 'family'
                    ? 'Family profiles, staff access and workspace.'
                    : '';

  function openSection(section: SettingsSectionKey) {
    if (section === 'personal' || section === 'cycle') onEditPersonalProfile();
    setHabitsScreenOpen(false);
    setEditingHabitId(null);
    setShowCreateHabit(false);
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

      </>
    );
  }

  function renderNutritionEditor() {
    return (
      <>
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

        <Text style={styles.label}>Target physique</Text>
        <Text style={styles.helpText}>The shape you’re working toward — it fine-tunes protein and calories. (Body composition is built with training over time; this just sets the nutrition.)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.physiqueRow}>
          {PHYSIQUE_OPTIONS.map((opt) => {
            const active = physiqueGoal === opt.key;
            const label = nutritionSex === 'male' ? opt.labelMale || opt.label : opt.label;
            return (
              <Pressable
                key={opt.key}
                style={[styles.physiqueCard, active && styles.physiqueCardActive]}
                onPress={() => onPhysiqueGoalChange(opt.key)}
              >
                <PhysiqueSilhouette physique={opt.key} sex={nutritionSex} color={active ? colors.primary : colors.subtext} size={38} />
                <Text style={[styles.physiqueLabel, active && styles.physiqueLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.physiqueNote}>{(PHYSIQUE_OPTIONS.find((o) => o.key === physiqueGoal) || PHYSIQUE_OPTIONS[1]).note}</Text>

        <Text style={styles.label}>Daily Calories Override</Text>
        <TextInput
          placeholder="Optional manual target, e.g. 1800"
          keyboardType="number-pad"
          style={styles.input}
          value={calorieOverride}
          onChangeText={(text) => onCalorieOverrideChange(text.replace(/[^\d]/g, '').slice(0, 4))}
        />

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

            {periodRemindersEnabled ? (
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
          </>
        ) : null}
      </>
    );
  }

  function renderNotificationsEditor() {
    return (
      <>
        <Text style={styles.helpText}>Global reminders that apply across the whole app.</Text>

        <View style={styles.masterReminderRow}>
          <View style={styles.masterReminderCopy}>
            <Text style={styles.masterReminderTitle}>Quiet hours</Text>
            <Text style={styles.masterReminderSubtitle}>
              {quietHoursEnabled ? `No reminders ${quietHoursStart}–${quietHoursEnd}.` : 'Reminders can arrive any time.'}
            </Text>
          </View>
          <Pressable style={[styles.toggle, quietHoursEnabled && styles.toggleOn]} onPress={() => onQuietHoursEnabledChange((prev) => !prev)}>
            <Text style={styles.toggleText}>{quietHoursEnabled ? 'On' : 'Off'}</Text>
          </Pressable>
        </View>

        {quietHoursEnabled ? (
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>From</Text>
              <View style={styles.pillRow}>
                {QUIET_HOUR_OPTIONS.map((t) => (
                  <Pressable key={`qs-${t}`} style={[styles.pillBtn, quietHoursStart === t && styles.pillBtnActive]} onPress={() => onQuietHoursStartChange(t)}>
                    <Text style={[styles.pillBtnText, quietHoursStart === t && styles.pillBtnTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>To</Text>
              <View style={styles.pillRow}>
                {QUIET_HOUR_OPTIONS.map((t) => (
                  <Pressable key={`qe-${t}`} style={[styles.pillBtn, quietHoursEnd === t && styles.pillBtnActive]} onPress={() => onQuietHoursEndChange(t)}>
                    <Text style={[styles.pillBtnText, quietHoursEnd === t && styles.pillBtnTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.masterReminderRow}>
          <View style={styles.masterReminderCopy}>
            <Text style={styles.masterReminderTitle}>Event reminders</Text>
            <Text style={styles.masterReminderSubtitle}>
              {eventRemindersEnabled ? `Remind before calendar events & appointments (${eventReminderLead}).` : 'No reminders for calendar events.'}
            </Text>
          </View>
          <Pressable style={[styles.toggle, eventRemindersEnabled && styles.toggleOn]} onPress={() => onEventRemindersEnabledChange((prev) => !prev)}>
            <Text style={styles.toggleText}>{eventRemindersEnabled ? 'On' : 'Off'}</Text>
          </Pressable>
        </View>

        {eventRemindersEnabled ? (
          <>
            <Text style={styles.label}>Remind me before</Text>
            <View style={styles.pillRow}>
              {EVENT_LEAD_OPTIONS.map((opt) => (
                <Pressable key={opt} style={[styles.pillBtn, eventReminderLead === opt && styles.pillBtnActive]} onPress={() => onEventReminderLeadChange(opt)}>
                  <Text style={[styles.pillBtnText, eventReminderLead === opt && styles.pillBtnTextActive]}>{opt}</Text>
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
        <View style={styles.masterReminderRow}>
          <View style={styles.masterReminderCopy}>
            <Text style={styles.masterReminderTitle}>Enable habits</Text>
            <Text style={styles.masterReminderSubtitle}>{habitsEnabled ? 'Habit tracking is on (opens from the menu).' : 'Habit tracking is off.'}</Text>
          </View>
          <Pressable style={[styles.toggle, habitsEnabled && styles.toggleOn]} onPress={() => onHabitsEnabledChange((prev) => !prev)}>
            <Text style={styles.toggleText}>{habitsEnabled ? 'On' : 'Off'}</Text>
          </Pressable>
        </View>

        {habitsEnabled ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              setEditingHabitId(null);
              setShowCreateHabit(false);
              setHabitsScreenOpen(true);
            }}
          >
            <Text style={styles.secondaryBtnText}>My habits</Text>
          </Pressable>
        ) : null}
      </>
    );
  }

  function renderMyHabitsScreen() {
    const editingHabit = editingHabitId ? habits.find((h) => h.id === editingHabitId) : null;

    // Edit one habit in its own screen.
    if (editingHabit) {
      return (
        <>
          <Pressable style={styles.habitsBackRow} onPress={() => setEditingHabitId(null)}>
            <Text style={styles.habitsBackText}>‹ Back to my habits</Text>
          </Pressable>
          <TextInput
            placeholder="Habit name"
            style={styles.input}
            value={editingHabit.title}
            onChangeText={(text) => onHabitsChange((prev) => prev.map((item) => (item.id === editingHabit.id ? { ...item, title: text } : item)))}
          />
          <TextInput
            placeholder="Target or norm"
            style={styles.input}
            value={editingHabit.targetText}
            onChangeText={(text) => onHabitsChange((prev) => prev.map((item) => (item.id === editingHabit.id ? { ...item, targetText: text } : item)))}
          />
          <Text style={styles.label}>Icon</Text>
          <View style={styles.pillRow}>
            {habitIconOptions.map((icon) => (
              <Pressable
                key={`${editingHabit.id}-${icon}`}
                style={[styles.iconChoice, editingHabit.icon === icon && styles.iconChoiceActive]}
                onPress={() => onHabitsChange((prev) => prev.map((item) => (item.id === editingHabit.id ? { ...item, icon } : item)))}
              >
                <Text style={styles.iconChoiceText}>{icon}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Design</Text>
          <View style={styles.pillRow}>
            {habitMarkStyles.map((option) => (
              <Pressable
                key={`${editingHabit.id}-${option.key}`}
                style={[styles.markStyleChoice, editingHabit.markStyle === option.key && styles.markStyleChoiceActive]}
                onPress={() => onHabitsChange((prev) => prev.map((item) => (item.id === editingHabit.id ? { ...item, markStyle: option.key } : item)))}
              >
                <Text style={styles.markStyleChoiceText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.primaryBtn, styles.habitCreateBtn]} onPress={() => setEditingHabitId(null)}>
            <Text style={styles.primaryBtnText}>Save</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              const id = editingHabit.id;
              setEditingHabitId(null);
              onHabitsChange((prev) => prev.filter((item) => item.id !== id));
            }}
          >
            <Text style={[styles.secondaryBtnText, styles.habitDeleteText]}>Delete habit</Text>
          </Pressable>
        </>
      );
    }

    // Create a new habit in its own screen.
    if (showCreateHabit) {
      return (
        <>
          <Pressable style={styles.habitsBackRow} onPress={() => setShowCreateHabit(false)}>
            <Text style={styles.habitsBackText}>‹ Back to my habits</Text>
          </Pressable>
          <TextInput placeholder="Habit name" style={styles.input} value={customHabitTitle} onChangeText={setCustomHabitTitle} />
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
            style={[styles.primaryBtn, styles.habitCreateBtn]}
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
              setShowCreateHabit(false);
            }}
          >
            <Text style={styles.primaryBtnText}>Save habit</Text>
          </Pressable>
        </>
      );
    }

    // The habit list.
    return (
      <>
        <Pressable style={styles.habitsBackRow} onPress={() => setHabitsScreenOpen(false)}>
          <Text style={styles.habitsBackText}>‹ Back to Add-ons</Text>
        </Pressable>

        {habits.length > 0 ? (
          <View style={styles.habitSettingsWrap}>
            {habits.map((habit) => (
              <Pressable key={habit.id} style={styles.habitListRow} onPress={() => setEditingHabitId(habit.id)}>
                <View style={styles.habitRowIcon}>
                  <Text style={styles.habitRowIconText}>{habit.icon}</Text>
                </View>
                <View style={styles.habitSettingsCopy}>
                  <Text style={styles.habitSettingsTitle}>{habit.title}</Text>
                  {habit.targetText ? <Text style={styles.habitSettingsMeta}>{habit.targetText}</Text> : null}
                </View>
                <Text style={styles.habitRowChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.helpText}>No habits yet — create your first one below.</Text>
        )}

        <Pressable style={[styles.primaryBtn, styles.habitCreateBtn]} onPress={() => { setEditingHabitId(null); setShowCreateHabit(true); }}>
          <Text style={styles.primaryBtnText}>+ Create new habit</Text>
        </Pressable>
      </>
    );
  }

  function renderMedsEditor() {
    return (
      <>
        <View style={styles.masterReminderRow}>
          <View style={styles.masterReminderCopy}>
            <Text style={styles.masterReminderTitle}>Enable medicine cabinet</Text>
            <Text style={styles.masterReminderSubtitle}>
              {medsEnabled ? 'Meds inventory is on — opens from the Home menu.' : 'Track medicines, quantities and expiry dates.'}
            </Text>
          </View>
          <Pressable style={[styles.toggle, medsEnabled && styles.toggleOn]} onPress={onToggleMeds}>
            <Text style={styles.toggleText}>{medsEnabled ? 'On' : 'Off'}</Text>
          </Pressable>
        </View>
        {medsEnabled ? (
          <>
            <Text style={styles.helpText}>Keep a simple list of what you have at home, with expiry reminders so nothing runs out or goes stale.</Text>
            <Pressable style={[styles.primaryBtn, styles.editorSaveBtn]} onPress={onOpenMeds}>
              <Text style={styles.primaryBtnText}>Open medicine cabinet</Text>
            </Pressable>
          </>
        ) : null}
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
            <View style={styles.staffCardActions}>
              <Pressable style={styles.secondaryBtn} onPress={() => onInviteStaff(profile.id)}>
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Invite</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => onEditStaffProfile(profile.id)}>
                <Text style={styles.secondaryBtnText}>Edit</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.label}>Partner calendar</Text>
        <Text style={styles.emptyText}>
          Connect your partner's own account. You can send a proposed time slot from any day — they confirm it on their side and it lands in both calendars. Neither of you can read the other's calendar.
        </Text>
        {partnerConnectedName ? (
          <View style={styles.staffCard}>
            <View style={styles.staffCopy}>
              <Text style={styles.staffName}>{partnerConnectedName}</Text>
              <Text style={styles.staffMeta}>Connected · you can send time slots</Text>
            </View>
            <View style={styles.staffCardActions}>
              <Pressable style={styles.secondaryBtn} onPress={onRemovePartner}>
                <Text style={[styles.secondaryBtnText, { color: '#dc2626' }]}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.secondaryBtn} onPress={onInvitePartner}>
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Invite partner</Text>
          </Pressable>
        )}

        {pushState === 'unsupported' ? (
          <Text style={styles.emptyText}>Push notifications aren't supported in this browser. On iPhone, add FamOs to your Home Screen first, then enable them here.</Text>
        ) : (
          <>
            <Pressable
              style={[styles.toggle, pushState === 'enabled' && styles.toggleOn]}
              onPress={onTogglePush}
            >
              <Text style={styles.toggleText}>
                {pushState === 'enabled' ? 'Push notifications: On' : 'Enable push notifications'}
              </Text>
            </Pressable>
            <Text style={styles.emptyText}>
              {pushState === 'enabled'
                ? "You'll get a push when your partner sends a slot or answers yours — even with the app closed."
                : pushState === 'denied'
                  ? 'Blocked in your browser. Allow notifications for this site, then tap again.'
                  : 'Get alerted on this device when a slot arrives or is answered.'}
            </Text>
          </>
        )}

        <Text style={styles.label}>Enable Staff Access</Text>
        <Pressable style={[styles.toggle, staffEnabled && styles.toggleOn]} onPress={onToggleStaff}>
          <Text style={styles.toggleText}>{staffEnabled ? 'Enabled' : 'Disabled'}</Text>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <View style={styles.content}>
        {settingsGroups.map((group) => (
          <View key={group.header} style={styles.settingsGroup}>
            <View style={styles.settingsList}>
              {group.rows.map((section, index) => (
                <Pressable
                  key={section.key}
                  style={[styles.settingsRow, index === group.rows.length - 1 && styles.settingsRowLast]}
                  onPress={() => openSection(section.key)}
                >
                  <Text style={styles.settingsRowTitle}>{section.title}</Text>
                  <Text style={styles.settingsRowChevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>

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
                {activeSection === 'personal' ? (
                  <>
                    {renderPersonalEditor()}
                    <View style={styles.editorSectionDivider} />
                    {renderNutritionEditor()}
                    {showCycleTracking ? (
                      <>
                        <View style={styles.editorSectionDivider} />
                        {renderCycleEditor()}
                      </>
                    ) : null}
                    <Pressable style={[styles.primaryBtn, styles.editorSaveBtn]} onPress={handleSaveAndClose}>
                      <Text style={styles.primaryBtnText}>Save &amp; close</Text>
                    </Pressable>
                    {personalProfileStatus ? <Text style={styles.statusText}>{personalProfileStatus}</Text> : null}
                    {personalProfileError ? <Text style={styles.errorText}>{personalProfileError}</Text> : null}
                  </>
                ) : null}
                {activeSection === 'notifications' ? renderNotificationsEditor() : null}
                {activeSection === 'addons' ? (
                  habitsScreenOpen ? (
                    renderMyHabitsScreen()
                  ) : (
                    <>
                      <Text style={styles.addonModuleLabel}>Habits</Text>
                      {renderHabitsEditor()}
                      <View style={styles.editorSectionDivider} />
                      <Text style={styles.addonModuleLabel}>Medicine cabinet</Text>
                      {renderMedsEditor()}
                    </>
                  )
                ) : null}
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
    settingsGroup: {
      gap: 8,
    },
    editorSectionDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 18,
    },
    settingsGroupLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginLeft: 4,
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
      height: 52,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingsRowLast: {
      borderBottomWidth: 0,
    },
    settingsRowTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 15.5,
      fontWeight: '700',
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
      justifyContent: 'center',
      alignItems: 'center',
    },
    editorModalLayer: {
      flex: 1,
      justifyContent: 'center',
      padding: 14,
    },
    editorModalCard: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 412,
      maxHeight: '88%',
      minHeight: '62%',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
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
    editorSaveBtn: {
      marginTop: 18,
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
    addonModuleLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    physiqueRow: {
      flexDirection: 'row',
      gap: 8,
      paddingTop: 8,
      paddingBottom: 4,
    },
    physiqueCard: {
      width: 66,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.glassStrong,
    },
    physiqueCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.selection,
    },
    physiqueLabel: {
      color: colors.subtext,
      fontSize: 11.5,
      fontWeight: '700',
    },
    physiqueLabelActive: {
      color: colors.primary,
    },
    physiqueNote: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
      marginTop: 6,
      marginBottom: 12,
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
    habitListRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 14,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    habitRowIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    habitRowIconText: {
      fontSize: 20,
    },
    habitListRowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    habitRowChevron: {
      color: colors.subtext,
      fontSize: 22,
      fontWeight: '500',
      opacity: 0.65,
    },
    habitDeleteText: {
      color: colors.urgent,
    },
    habitCreateBtn: {
      marginTop: 12,
    },
    habitsBackRow: {
      alignSelf: 'flex-start',
      backgroundColor: colors.glassSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    habitsBackText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    habitRemoveBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    habitRemoveX: {
      color: colors.subtext,
      fontSize: 15,
      fontWeight: '700',
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
      fontSize: 15,
      fontWeight: '800',
    },
    habitSettingsMeta: {
      color: colors.subtext,
      fontSize: 12.5,
      fontWeight: '600',
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
    staffCardActions: {
      flexDirection: 'row',
      gap: 8,
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
      backgroundColor: colors.glassStrong,
      borderColor: colors.done,
      borderWidth: 2,
    },
    toggleText: {
      color: colors.text,
      fontWeight: '700',
    },
    inputDimmed: {
      opacity: 0.72,
    },
  });
