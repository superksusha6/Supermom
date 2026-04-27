import { Dispatch, ReactNode, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native';
import { ActivityLevel, CalendarEvent, CalendarScope, ChildProfile, CycleDayEntry, NutritionFoodEntry, NutritionGoal, NutritionPace, NutritionSex, Role, TaskItem } from '@/types/app';
import { SectionCard } from '@/components/SectionCard';
import { cleanNutritionNumber, getNutritionPlan, getNutritionTotals, getNutritionValuesForGrams, NUTRITION_FOOD_PRESETS, NutritionFoodPreset } from '@/lib/nutrition';
import { ThemeColors, useThemeColors } from '@/theme/theme';

type Props = {
  parentLabel: 'Mom' | 'Dad';
  currentRole: Role;
  personalDateOfBirth?: string;
  personalHeightCm?: string;
  personalWeightKg?: string;
  cycleTrackingEnabled?: boolean;
  cycleLastPeriodStart?: string;
  cycleLengthDays?: string;
  cyclePeriodLengthDays?: string;
  cycleEntries?: CycleDayEntry[];
  onMarkPeriodStart?: (dateKey: string) => void | Promise<void>;
  onSaveCycleEntry?: (entry: CycleDayEntry) => void | Promise<void>;
  onRemoveCycleEntry?: (dateKey: string) => void | Promise<void>;
  nutritionGoal: NutritionGoal;
  activityLevel: ActivityLevel;
  nutritionSex: NutritionSex;
  desiredWeight: string;
  nutritionPace: NutritionPace;
  calorieOverride: string;
  nutritionEntries: NutritionFoodEntry[];
  onNutritionEntriesChange: Dispatch<SetStateAction<NutritionFoodEntry[]>>;
  children: ChildProfile[];
  staffProfiles: Array<{ id: string; name: string }>;
  events: CalendarEvent[];
  tasks: TaskItem[];
  scope: CalendarScope;
  onScopeChange: Dispatch<SetStateAction<CalendarScope>>;
  activeOwnerFilter: string;
  onSelectOwnerFilter: (key: string) => void;
  showStaff: boolean;
  filtersBelowSection?: ReactNode;
  filtersHeaderRight?: ReactNode;
  onAddEvent: (payload: {
    title: string;
    date: string;
    time: string;
    owner: Role;
    ownerName: string;
    ownerChildProfileId?: string;
    category: string;
    color: string;
    taskPriority?: 'urgent' | 'non_urgent';
    motherColor?: string;
    staffColor?: string;
    visibility?: 'shared' | 'staff_private';
  }) => void;
  onUpdateEvent: (payload: {
    id: string;
    title: string;
    color: string;
    time: string;
    date: string;
    owner: Role;
    ownerName: string;
    ownerChildProfileId?: string;
    category: string;
    motherColor?: string;
    staffColor?: string;
    visibility?: 'shared' | 'staff_private';
  }) => void;
  onCompleteStaffTask: (taskId: string) => void;
  getStaffTaskSuggestions: (query: string, limit?: number) => string[];
};

export function CalendarScreen({
  parentLabel,
  currentRole,
  personalDateOfBirth,
  personalHeightCm,
  personalWeightKg,
  cycleTrackingEnabled,
  cycleLastPeriodStart,
  cycleLengthDays,
  cyclePeriodLengthDays,
  cycleEntries,
  onMarkPeriodStart,
  onSaveCycleEntry,
  onRemoveCycleEntry,
  nutritionGoal,
  activityLevel,
  nutritionSex,
  desiredWeight,
  nutritionPace,
  calorieOverride,
  nutritionEntries,
  onNutritionEntriesChange,
  children,
  staffProfiles,
  events,
  tasks,
  scope,
  onScopeChange,
  activeOwnerFilter,
  onSelectOwnerFilter,
  showStaff,
  filtersBelowSection,
  filtersHeaderRight,
  onAddEvent,
  onUpdateEvent,
  onCompleteStaffTask,
  getStaffTaskSuggestions,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const taskInputWrapRef = useRef<View | null>(null);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [energyModeOpen, setEnergyModeOpen] = useState(false);
  const [nutritionInfoOpen, setNutritionInfoOpen] = useState(false);
  const [nutritionEditorOpen, setNutritionEditorOpen] = useState(false);
  const [editingNutritionEntryId, setEditingNutritionEntryId] = useState<string | null>(null);
  const [nutritionDraftName, setNutritionDraftName] = useState('');
  const [nutritionDraftMealType, setNutritionDraftMealType] = useState<NutritionFoodEntry['mealType']>('breakfast');
  const [nutritionDraftCalories, setNutritionDraftCalories] = useState('');
  const [nutritionDraftProtein, setNutritionDraftProtein] = useState('');
  const [nutritionDraftFat, setNutritionDraftFat] = useState('');
  const [nutritionDraftCarbs, setNutritionDraftCarbs] = useState('');
  const [nutritionDraftGrams, setNutritionDraftGrams] = useState('100');
  const [nutritionFoodSearch, setNutritionFoodSearch] = useState('');
  const [selectedNutritionPreset, setSelectedNutritionPreset] = useState<NutritionFoodPreset | null>(null);
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [generalDayModalNumber, setGeneralDayModalNumber] = useState<number | null>(null);
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [cycleMarking, setCycleMarking] = useState(false);
  const [cycleActionStatus, setCycleActionStatus] = useState<string | null>(null);
  const [localCycleLastPeriodStart, setLocalCycleLastPeriodStart] = useState<string | null>(null);
  const [selectedFlowLevel, setSelectedFlowLevel] = useState<string | null>('moderate');
  const [selectedDischargeType, setSelectedDischargeType] = useState<string | null>('red');
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>(['normal']);
  const [selectedPains, setSelectedPains] = useState<string[]>(['light']);
  const [selectedSleepQuality, setSelectedSleepQuality] = useState('tired');
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [markAsPeriodStart, setMarkAsPeriodStart] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [tonePickerOpen, setTonePickerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#ffffff');
  const [customHex, setCustomHex] = useState('');
  const [hasPickedColor, setHasPickedColor] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editColorPickerOpen, setEditColorPickerOpen] = useState(false);
  const [editTonePickerOpen, setEditTonePickerOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('#ffffff');
  const [editCategory, setEditCategory] = useState('General');
  const [editVisibility, setEditVisibility] = useState<'shared' | 'staff_private'>('shared');
  const [editMotherColor, setEditMotherColor] = useState<string | undefined>(undefined);
  const [editStaffColor, setEditStaffColor] = useState<string | undefined>(undefined);
  const [editCustomHex, setEditCustomHex] = useState('');
  const [editHasPickedColor, setEditHasPickedColor] = useState(false);
  const [editBaseColor, setEditBaseColor] = useState('#ef4444');
  const [editToneIndex, setEditToneIndex] = useState(4);
  const [newTime, setNewTime] = useState('10:00 AM');
  const [editTime, setEditTime] = useState('10:00 AM');
  const [newAssignee, setNewAssignee] = useState<string>('mother');
  const [editAssignee, setEditAssignee] = useState<string>('mother');
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timeTarget, setTimeTarget] = useState<'create' | 'edit'>('create');
  const [dialStep, setDialStep] = useState<'hour' | 'minute'>('hour');
  const [dialHour, setDialHour] = useState(10);
  const [dialMinute, setDialMinute] = useState(0);
  const [dialPeriod, setDialPeriod] = useState<'AM' | 'PM'>('AM');
  const [baseColor, setBaseColor] = useState('#ef4444');
  const [toneIndex, setToneIndex] = useState(4);
  const [creatorMode, setCreatorMode] = useState<'general' | 'staff_assigned_task' | 'staff_self_plan' | 'staff_self_task'>('general');
  const [newTaskPriority, setNewTaskPriority] = useState<'urgent' | 'non_urgent'>('non_urgent');
  const [taskSuggestionFrame, setTaskSuggestionFrame] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [confettiBurstKey, setConfettiBurstKey] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0, y: 0 });
  const confettiAnim = useRef(new Animated.Value(0)).current;

  const basePalette = ['#ff7a00', '#ffcc00', '#22c55e', '#06b6d4', '#2563eb', '#7c3aed', '#ec4899', '#8b5a2b', '#111827'];
  const toneColors = useMemo(() => buildToneScale(baseColor, 11), [baseColor]);
  const editToneColors = useMemo(() => buildToneScale(editBaseColor, 11), [editBaseColor]);
  const dialItems = dialStep === 'hour' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 12 }, (_, i) => i * 5);
  const dialDots = useMemo(() => {
    const size = 230;
    const center = size / 2;
    const radius = 88;
    return dialItems.map((item, index) => {
      const angle = (Math.PI * 2 * index) / 12 - Math.PI / 2;
      return {
        value: item,
        left: center + Math.cos(angle) * radius - 19,
        top: center + Math.sin(angle) * radius - 19,
      };
    });
  }, [dialItems]);

  useEffect(() => {
    const next = toneColors[Math.min(toneIndex, toneColors.length - 1)] || baseColor;
    setNewColor(next);
    setCustomHex(next);
    setHasPickedColor(true);
  }, [toneColors, toneIndex, baseColor]);
  useEffect(() => {
    const next = editToneColors[Math.min(editToneIndex, editToneColors.length - 1)] || editBaseColor;
    setEditColor(next);
    setEditCustomHex(next);
    setEditHasPickedColor(true);
  }, [editToneColors, editToneIndex, editBaseColor]);

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        const birthdayEvent = isBirthdayEvent(event);
        if (currentRole === 'mother' && birthdayEvent) {
          if (activeOwnerFilter === 'staff' || activeOwnerFilter.startsWith('child:')) return false;
          return true;
        }

        if (scope === 'my_only' && event.owner === 'staff') return false;
        if (currentRole === 'mother' && event.owner === 'staff' && event.visibility === 'staff_private') return false;

        if (activeOwnerFilter === 'mother') return event.owner === 'mother';
        if (activeOwnerFilter === 'staff') return event.owner === 'staff';
        if (activeOwnerFilter.startsWith('child:')) {
          const childId = activeOwnerFilter.replace('child:', '');
          const child = children.find((item) => item.id === childId);
          return (
            event.owner === 'child' &&
            (event.ownerChildProfileId === childId || (!!child && event.ownerName.toLowerCase() === child.name.toLowerCase()))
          );
        }
        return true;
      }),
    [events, scope, activeOwnerFilter, children, currentRole],
  );

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday-based index: Mon=0 ... Sun=6
    const firstWeekDay = (firstDay.getDay() + 6) % 7;
    const cells: Array<{ key: string; label: string; dateKey: string | null }> = [];

    for (let i = 0; i < firstWeekDay; i += 1) {
      cells.push({ key: `empty-${i}`, label: '', dateKey: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({
        key: `day-${day}`,
        label: String(day),
        dateKey: toDateKey(date),
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ key: `empty-tail-${cells.length}`, label: '', dateKey: null });
    }

    return cells;
  }, [currentMonth]);

  const selectedEvents = useMemo(() => {
    const eventsByDay = filtered.filter((event) => event.date === selectedDateKey);
    return eventsByDay.sort((a, b) => a.time.localeCompare(b.time));
  }, [filtered, selectedDateKey]);
  const nutritionPlan = useMemo(
    () =>
      getNutritionPlan({
        dateOfBirth: personalDateOfBirth,
        heightCm: personalHeightCm,
        weightKg: personalWeightKg,
        goal: nutritionGoal,
        activityLevel,
        sex: nutritionSex,
        desiredWeightKg: desiredWeight,
        pace: nutritionPace,
        calorieOverride,
      }),
    [personalDateOfBirth, personalHeightCm, personalWeightKg, nutritionGoal, activityLevel, nutritionSex, desiredWeight, nutritionPace, calorieOverride],
  );
  const activeStaffProfile = useMemo(() => {
    if (!activeOwnerFilter.startsWith('staff:')) return null;
    const staffId = activeOwnerFilter.replace('staff:', '');
    return staffProfiles.find((profile) => profile.id === staffId) || null;
  }, [activeOwnerFilter, staffProfiles]);
  const isMotherViewingStaffCalendar = currentRole === 'mother' && !!activeStaffProfile;
  const isStaffViewingOwnCalendar = currentRole === 'staff' && !!activeStaffProfile;
  const resolveDisplayColor = (event: CalendarEvent) => {
    if (event.owner === 'staff') {
      if (currentRole === 'mother') return event.motherColor || event.color || '#64748b';
      return event.staffColor || event.color || '#64748b';
    }
    return event.color || '#64748b';
  };
  const taskSuggestions = useMemo(
    () =>
      creatorMode === 'staff_assigned_task' || creatorMode === 'staff_self_task'
        ? getStaffTaskSuggestions(newTitle)
        : [],
    [creatorMode, getStaffTaskSuggestions, newTitle],
  );
  const dayDotColorsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    filtered.forEach((event) => {
      if (isBirthdayEvent(event)) return;
      const eventColor = resolveDisplayColor(event);
      if (eventColor) {
        const existing = map.get(event.date) || [];
        map.set(event.date, [...existing, eventColor]);
      }
    });
    return map;
  }, [filtered, currentRole]);
  const birthdayDates = useMemo(() => {
    const map = new Set<string>();
    filtered.forEach((event) => {
      if (isBirthdayEvent(event)) map.add(event.date);
    });
    return map;
  }, [filtered]);
  const selectedBirthdayEvents = useMemo(() => selectedEvents.filter((event) => isBirthdayEvent(event)), [selectedEvents]);
  const selectedBirthdayNames = useMemo(
    () => selectedBirthdayEvents.map((event) => extractBirthdayName(event.title)).filter((name): name is string => !!name),
    [selectedBirthdayEvents],
  );
  const nutritionStatusByDate = useMemo(() => {
    const grouped = new Map<string, NutritionFoodEntry[]>();
    nutritionEntries.forEach((entry) => {
      const existing = grouped.get(entry.date) || [];
      grouped.set(entry.date, [...existing, entry]);
    });
    const map = new Map<string, { color: string; totals: ReturnType<typeof getNutritionTotals> }>();
    grouped.forEach((entries, dateKey) => {
      const totals = getNutritionTotals(entries);
      const ratio = nutritionPlan?.calories ? totals.calories / nutritionPlan.calories : 0;
      const color = ratio > 1.05 ? '#ef4444' : ratio >= 0.8 ? '#22c55e' : '#f59e0b';
      map.set(dateKey, { color, totals });
    });
    return map;
  }, [nutritionEntries, nutritionPlan]);
  const selectedNutritionEntries = useMemo(() => nutritionEntries.filter((entry) => entry.date === selectedDateKey), [nutritionEntries, selectedDateKey]);
  const selectedNutritionTotals = useMemo(() => getNutritionTotals(selectedNutritionEntries), [selectedNutritionEntries]);
  const selectedNutritionMeals = useMemo(() => {
    const sections: Array<{ key: NutritionFoodEntry['mealType']; title: string }> = [
      { key: 'breakfast', title: 'Breakfast' },
      { key: 'lunch', title: 'Lunch' },
      { key: 'dinner', title: 'Dinner' },
      { key: 'snack', title: 'Snacks' },
    ];
    return sections
      .map((section) => ({
        ...section,
        entries: selectedNutritionEntries.filter((entry) => entry.mealType === section.key),
      }))
      .filter((section) => section.entries.length > 0);
  }, [selectedNutritionEntries]);
  const effectiveCycleTrackingEnabled = !!cycleTrackingEnabled || !!localCycleLastPeriodStart;
  const effectiveCycleLastPeriodStart = localCycleLastPeriodStart || cycleLastPeriodStart;
  const cycleInfoByDate = useMemo(() => {
    const map = new Map<string, { phase: 'period' | 'fertile' | 'ovulation' | 'pms'; color: string; label: string }>();
    if (!effectiveCycleTrackingEnabled || !effectiveCycleLastPeriodStart || !isValidBirthDateInput(effectiveCycleLastPeriodStart)) return map;

    const cycleLength = Math.max(21, Math.min(40, Number(cycleLengthDays) || 28));
    const periodLength = Math.max(2, Math.min(10, Number(cyclePeriodLengthDays) || 5));
    const lastStart = parseBirthDateToDate(effectiveCycleLastPeriodStart);
    if (!lastStart) return map;

    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const rangeStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - cycleLength);
    const rangeEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 31 + cycleLength);

    let cycleStart = new Date(lastStart);
    while (cycleStart > rangeStart) {
      const previous = addDays(cycleStart, -cycleLength);
      if (previous < rangeStart) break;
      cycleStart = previous;
    }

    for (let cursor = new Date(cycleStart); cursor <= rangeEnd; cursor = addDays(cursor, cycleLength)) {
      const normalizedCursor = new Date(cursor);

      for (let day = 0; day < periodLength; day += 1) {
        map.set(toDateKey(addDays(normalizedCursor, day)), { phase: 'period', color: '#e11d48', label: 'Period' });
      }

      const ovulationDate = addDays(normalizedCursor, cycleLength - 14);
      for (let day = -4; day <= -1; day += 1) {
        map.set(toDateKey(addDays(ovulationDate, day)), { phase: 'fertile', color: '#14b8a6', label: 'Fertile window' });
      }
      map.set(toDateKey(ovulationDate), { phase: 'ovulation', color: '#0f766e', label: 'Ovulation' });
      map.set(toDateKey(addDays(ovulationDate, 1)), { phase: 'fertile', color: '#14b8a6', label: 'Fertile window' });

      for (let day = 3; day >= 1; day -= 1) {
        const pmsDate = addDays(normalizedCursor, cycleLength - day);
        const key = toDateKey(pmsDate);
        if (!map.has(key)) map.set(key, { phase: 'pms', color: '#a78bfa', label: 'PMS' });
      }
    }

    return map;
  }, [effectiveCycleTrackingEnabled, effectiveCycleLastPeriodStart, cycleLengthDays, cyclePeriodLengthDays, currentMonth]);
  const selectedCycleInfo = useMemo(() => cycleInfoByDate.get(selectedDateKey) || null, [cycleInfoByDate, selectedDateKey]);
  const selectedCycleEntry = useMemo(
    () => (cycleEntries || []).find((entry) => entry.date === selectedDateKey) || null,
    [cycleEntries, selectedDateKey],
  );
  const cyclePeriodEntryDates = useMemo(() => {
    const set = new Set<string>();
    (cycleEntries || []).forEach((entry) => {
      if (entry.flowLevel && entry.date) set.add(entry.date);
    });
    return set;
  }, [cycleEntries]);
  const cyclePeriodStartDates = useMemo(() => {
    const set = new Set<string>();
    (cycleEntries || []).forEach((entry) => {
      if (entry.isPeriodStart && entry.date) set.add(entry.date);
    });
    if (effectiveCycleLastPeriodStart && isValidBirthDateInput(effectiveCycleLastPeriodStart)) {
      const parsed = parseBirthDateToDate(effectiveCycleLastPeriodStart);
      if (parsed) set.add(toDateKey(parsed));
    }
    return set;
  }, [cycleEntries, effectiveCycleLastPeriodStart]);
  const selectedDateLabel = useMemo(() => formatDateForCycleAction(selectedDateKey), [selectedDateKey]);
  const isSelectedDateCurrentPeriodStart = effectiveCycleLastPeriodStart === selectedDateLabel;
  const filteredNutritionFoodPresets = useMemo(() => {
    const query = nutritionFoodSearch.trim().toLowerCase();
    if (!query) return NUTRITION_FOOD_PRESETS.slice(0, 8);
    return NUTRITION_FOOD_PRESETS.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8);
  }, [nutritionFoodSearch]);
  const calendarWeeks = useMemo(() => {
    const weeks: Array<Array<{ key: string; label: string; dateKey: string | null }>> = [];
    for (let index = 0; index < calendarDays.length; index += 7) {
      weeks.push(calendarDays.slice(index, index + 7));
    }
    return weeks;
  }, [calendarDays]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long' });
  const currentYear = currentMonth.getFullYear();
  const birthDateParts = useMemo(() => parseBirthDate(personalDateOfBirth), [personalDateOfBirth]);
  const selectedDateParts = useMemo(() => parseDateKeyParts(selectedDateKey), [selectedDateKey]);
  const personalYearNumber = useMemo(
    () => (birthDateParts && selectedDateParts ? calculatePersonalYearNumber(selectedDateParts.year, birthDateParts) : null),
    [birthDateParts, selectedDateParts],
  );
  const personalMonthNumber = useMemo(
    () => (personalYearNumber && selectedDateParts ? reduceToSingleDigit(personalYearNumber + selectedDateParts.month) : null),
    [personalYearNumber, selectedDateParts],
  );
  const selectedPersonalDayNumber = useMemo(
    () => (birthDateParts ? calculatePersonalEnergyNumber(selectedDateKey, birthDateParts) : null),
    [birthDateParts, selectedDateKey],
  );
  const selectedGeneralDayNumber = useMemo(() => calculateGeneralEnergyNumber(selectedDateKey), [selectedDateKey]);
  const selectedGeneralDayInfo = useMemo(() => getSpecialGeneralDayInfo(selectedGeneralDayNumber), [selectedGeneralDayNumber]);
  const yearOptions = useMemo(() => Array.from({ length: 121 }, (_, i) => currentYear - 60 + i), [currentYear]);
  const currentYearIndex = useMemo(() => yearOptions.findIndex((y) => y === currentYear), [yearOptions, currentYear]);

  function moveMonth(step: number) {
    setCurrentMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + step, 1);
      setSelectedDateKey(toDateKey(next));
      return next;
    });
  }

  async function handleMarkPeriodStartPress() {
    if (cycleMarking) return;
    setLocalCycleLastPeriodStart(selectedDateLabel);
    setCycleActionStatus(`Saved ${selectedDateLabel}`);
    if (!onMarkPeriodStart) return;
    try {
      setCycleMarking(true);
      await onMarkPeriodStart(selectedDateKey);
    } finally {
      setCycleMarking(false);
    }
  }

  async function handleSaveCyclePanel() {
    const entry: CycleDayEntry = {
      date: selectedDateKey,
      flowLevel: selectedFlowLevel || undefined,
      dischargeType: selectedDischargeType || undefined,
      feelings: selectedFeelings,
      pains: selectedPains,
      sleepQuality: selectedSleepQuality,
      sleepHours,
      sleepMinutes,
      isPeriodStart: markAsPeriodStart,
    };

    if (onSaveCycleEntry) {
      setLocalCycleLastPeriodStart(selectedDateLabel);
      setCycleActionStatus(`Saved for ${selectedDateLabel}`);
      try {
        setCycleMarking(true);
        await onSaveCycleEntry(entry);
      } finally {
        setCycleMarking(false);
      }
    } else {
      await handleMarkPeriodStartPress();
    }
    setCycleModalOpen(false);
  }

  function toggleSelection(value: string, selectedValues: string[], setSelectedValues: Dispatch<SetStateAction<string[]>>) {
    setSelectedValues((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  async function handleRemoveCycleDay() {
    if (!onRemoveCycleEntry) return;
    try {
      setCycleMarking(true);
      await onRemoveCycleEntry(selectedDateKey);
      setCycleActionStatus(`Removed entry for ${selectedDateLabel}`);
      setCycleModalOpen(false);
    } finally {
      setCycleMarking(false);
    }
  }

  function adjustSleepHours(step: number) {
    setSleepHours((prev) => Math.max(0, Math.min(24, prev + step)));
  }

  function adjustSleepMinutes(step: number) {
    const total = sleepHours * 60 + sleepMinutes + step;
    const clamped = Math.max(0, Math.min(24 * 60, total));
    setSleepHours(Math.floor(clamped / 60));
    setSleepMinutes(clamped % 60);
  }

  useEffect(() => {
    setCycleActionStatus(null);
  }, [selectedDateKey]);
  useEffect(() => {
    setLocalCycleLastPeriodStart(cycleLastPeriodStart || null);
  }, [cycleLastPeriodStart]);
  useEffect(() => {
    setSelectedFlowLevel(selectedCycleEntry?.flowLevel || null);
    setSelectedDischargeType(selectedCycleEntry?.dischargeType || null);
    setSelectedFeelings(selectedCycleEntry?.feelings?.length ? selectedCycleEntry.feelings : ['normal']);
    setSelectedPains(selectedCycleEntry?.pains?.length ? selectedCycleEntry.pains : ['light']);
    setSelectedSleepQuality(selectedCycleEntry?.sleepQuality || 'tired');
    setSleepHours(selectedCycleEntry?.sleepHours || 0);
    setSleepMinutes(selectedCycleEntry?.sleepMinutes || 0);
    setMarkAsPeriodStart(!!selectedCycleEntry?.isPeriodStart || isSelectedDateCurrentPeriodStart);
  }, [isSelectedDateCurrentPeriodStart, selectedCycleEntry]);

  function moveYear(step: number) {
    setCurrentMonth((prev) => {
      const next = new Date(prev.getFullYear() + step, prev.getMonth(), 1);
      setSelectedDateKey(toDateKey(next));
      return next;
    });
  }

  function pickMonthYear(monthIndex: number, year: number) {
    const next = new Date(year, monthIndex, 1);
    setCurrentMonth(next);
    setSelectedDateKey(toDateKey(next));
    setPickerOpen(false);
  }

  function pickFromScreen() {
    setTonePickerOpen(true);
    setColorPickerOpen(true);
  }

  function resetNutritionEditor(mealType: NutritionFoodEntry['mealType'] = 'breakfast') {
    setEditingNutritionEntryId(null);
    setNutritionDraftName('');
    setNutritionDraftMealType(mealType);
    setNutritionDraftCalories('');
    setNutritionDraftProtein('');
    setNutritionDraftFat('');
    setNutritionDraftCarbs('');
    setNutritionDraftGrams('100');
    setNutritionFoodSearch('');
    setSelectedNutritionPreset(null);
  }

  function openNutritionCreate(mealType: NutritionFoodEntry['mealType'] = 'breakfast') {
    resetNutritionEditor(mealType);
    setNutritionEditorOpen(true);
  }

  function openNutritionEdit(entry: NutritionFoodEntry) {
    setEditingNutritionEntryId(entry.id);
    setNutritionDraftName(entry.name.replace(/\s•\s\d+(?:[.,]\d+)?\sg$/i, ''));
    setNutritionDraftMealType(entry.mealType);
    setNutritionDraftCalories(entry.calories);
    setNutritionDraftProtein(entry.protein);
    setNutritionDraftFat(entry.fat);
    setNutritionDraftCarbs(entry.carbs);
    const gramsMatch = entry.name.match(/•\s(\d+(?:[.,]\d+)?)\sg$/i);
    setNutritionDraftGrams(gramsMatch?.[1] || '100');
    const matchedPreset = NUTRITION_FOOD_PRESETS.find((item) => item.name.toLowerCase() === entry.name.replace(/\s•\s\d+(?:[.,]\d+)?\sg$/i, '').trim().toLowerCase()) || null;
    setSelectedNutritionPreset(matchedPreset);
    setNutritionFoodSearch(matchedPreset?.name || '');
    setNutritionEditorOpen(true);
  }

  function openTimePicker(target: 'create' | 'edit') {
    const source = target === 'create' ? newTime : editTime;
    const parsed = parseTimeValue(source);
    setTimeTarget(target);
    setDialHour(parsed.hour);
    setDialMinute(parsed.minute);
    setDialPeriod(parsed.period);
    setDialStep('hour');
    setTimePickerOpen(true);
  }

  function chooseDialValue(value: number) {
    if (dialStep === 'hour') {
      setDialHour(value);
      setDialStep('minute');
      return;
    }

    setDialMinute(value);
    const next = formatClockTime(dialHour, value, dialPeriod);
    if (timeTarget === 'create') setNewTime(next);
    else setEditTime(next);
    setTimePickerOpen(false);
    setDialStep('hour');
  }

  function openEditModal(event: CalendarEvent) {
    const isAutoGeneratedStaffTask = event.id.startsWith('e-staff-');
    if (event.owner === 'staff' && isAutoGeneratedStaffTask) return;
    if (isBirthdayEvent(event)) return;
    setEditingEventId(event.id);
    setEditTitle(event.title);
    setEditCategory(event.category || 'General');
    setEditVisibility(event.visibility || 'shared');
    setEditMotherColor(event.motherColor);
    setEditStaffColor(event.staffColor);
    setEditTime(normalizeTimeText(event.time));
    if (event.owner === 'child') {
      const child = children.find((item) => item.name === event.ownerName);
      setEditAssignee(child ? `child:${child.id}` : 'mother');
    } else if (event.owner === 'staff') {
      const staff = staffProfiles.find((item) => item.name === event.ownerName);
      setEditAssignee(staff ? `staff:${staff.id}` : 'mother');
    } else {
      setEditAssignee('mother');
    }
    const initialEditColor =
      event.owner === 'staff'
        ? currentRole === 'mother'
          ? event.motherColor || event.color || '#64748b'
          : event.staffColor || event.color || '#64748b'
        : event.color;
    if (initialEditColor) {
      setEditColor(initialEditColor);
      setEditCustomHex(initialEditColor);
      setEditBaseColor(initialEditColor);
      setEditHasPickedColor(true);
    } else {
      setEditColor('#ffffff');
      setEditCustomHex('');
      setEditBaseColor('#2563eb');
      setEditHasPickedColor(false);
    }
    setEditOpen(true);
  }

  function openCreator(mode: 'general' | 'staff_assigned_task' | 'staff_self_plan' | 'staff_self_task') {
    setCreatorMode(mode);
    setHasPickedColor(false);
    setColorPickerOpen(false);
    setTonePickerOpen(false);
    setNewTitle('');
    setCustomHex('');
    setNewTime('10:00 AM');

    if (mode === 'staff_assigned_task') {
      setNewAssignee(activeStaffProfile ? `staff:${activeStaffProfile.id}` : 'mother');
      setBaseColor('#f97316');
      setToneIndex(6);
      setNewTaskPriority('non_urgent');
      setNewColor('#fdba74');
      setCustomHex('#fdba74');
      setHasPickedColor(true);
      setCreatorOpen(true);
      return;
    }

    if (mode === 'staff_self_plan') {
      setNewAssignee(activeStaffProfile ? `staff:${activeStaffProfile.id}` : 'mother');
      setBaseColor('#22c55e');
      setToneIndex(5);
      setNewColor('#86efac');
      setCustomHex('#86efac');
      setHasPickedColor(true);
      setCreatorOpen(true);
      return;
    }

    if (mode === 'staff_self_task') {
      setNewAssignee(activeStaffProfile ? `staff:${activeStaffProfile.id}` : 'mother');
      setBaseColor('#2563eb');
      setToneIndex(5);
      setNewTaskPriority('non_urgent');
      setNewColor('#93c5fd');
      setCustomHex('#93c5fd');
      setHasPickedColor(true);
      setCreatorOpen(true);
      return;
    }

    setNewAssignee('mother');
    setBaseColor('#2563eb');
    setToneIndex(4);
    setNewColor('#ffffff');
    setCreatorOpen(true);
  }

  function updateTaskSuggestionFrame() {
    taskInputWrapRef.current?.measureInWindow((x, y, width, height) => {
      setTaskSuggestionFrame({ x, y, width, height });
    });
  }

  useEffect(() => {
    if (!creatorOpen || !(creatorMode === 'staff_assigned_task' || creatorMode === 'staff_self_task') || taskSuggestions.length === 0) return;
    const frame = globalThis.requestAnimationFrame?.(() => updateTaskSuggestionFrame());
    return () => {
      if (typeof frame === 'number' && globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame(frame);
    };
  }, [creatorMode, creatorOpen, taskSuggestions.length]);

  useEffect(() => {
    if (!confettiVisible) return;
    confettiAnim.setValue(0);
    const animation = Animated.timing(confettiAnim, {
      toValue: 1,
      duration: 1300,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) {
        setConfettiVisible(false);
      }
    });
    return () => {
      animation.stop();
    };
  }, [confettiAnim, confettiBurstKey, confettiVisible]);

  function triggerBirthdayCelebration(origin?: { x: number; y: number }) {
    if (origin) {
      setConfettiOrigin(origin);
    }
    setConfettiVisible(false);
    setConfettiBurstKey((prev) => prev + 1);
    setConfettiVisible(true);
  }

  return (
    <>
      <Modal visible={confettiVisible} transparent animationType="none" onRequestClose={() => setConfettiVisible(false)}>
        <View pointerEvents="none" style={styles.fullscreenConfettiOverlay}>
          {CONFETTI_BITS.map((bit) => (
            <Animated.View
              key={`fullscreen-confetti-${confettiBurstKey}-${bit.id}`}
              style={[
                styles.fullscreenConfettiBit,
                {
                  backgroundColor: bit.color,
                  width: bit.size,
                  height: bit.height,
                  left: confettiOrigin.x - bit.size / 2,
                  top: confettiOrigin.y - bit.height / 2,
                  transform: [
                    {
                      translateY: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.sin((bit.angle * Math.PI) / 180) * bit.distance],
                      }),
                    },
                    {
                      translateX: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.cos((bit.angle * Math.PI) / 180) * bit.distance],
                      }),
                    },
                    { perspective: 900 },
                    {
                      scale: confettiAnim.interpolate({
                        inputRange: [0, 0.35, 0.7, 1],
                        outputRange: [0.18, 0.75, 1.6, bit.endScale],
                      }),
                    },
                    {
                      rotate: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [`${bit.rotateStart}deg`, `${bit.rotateEnd}deg`],
                      }),
                    },
                  ],
                  opacity: confettiAnim.interpolate({
                    inputRange: [0, 0.08, 0.85, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </Modal>

      {currentRole === 'mother' ? (
        <>
          <SectionCard title="Filters" headerRight={filtersHeaderRight}>
            <View style={styles.row}>
              <Chip active={activeOwnerFilter === 'mother'} label={parentLabel} onPress={() => onSelectOwnerFilter('mother')} styles={styles} />
              {children.map((child) => (
                <Chip
                  key={`filter-child-${child.id}`}
                  active={activeOwnerFilter === `child:${child.id}`}
                  label={child.name}
                  onPress={() => onSelectOwnerFilter(`child:${child.id}`)}
                  styles={styles}
                />
              ))}
              {staffProfiles.map((profile) => (
                <Chip
                  key={`filter-staff-${profile.id}`}
                  active={activeOwnerFilter === `staff:${profile.id}`}
                  label={profile.name}
                  onPress={() => onSelectOwnerFilter(`staff:${profile.id}`)}
                  styles={styles}
                />
              ))}
            </View>
          </SectionCard>
          {filtersBelowSection ? <View style={styles.filtersBelowRow}>{filtersBelowSection}</View> : null}
        </>
      ) : null}

      <SectionCard title="Calendar">
        {currentRole === 'mother' ? (
          <View style={styles.calendarCloverWrap}>
            <View style={styles.calendarTopActions}>
              <Pressable onPress={() => setCycleModalOpen(true)} style={[styles.calendarPeriodBtn, cycleModalOpen && styles.calendarPeriodBtnActive]}>
                <PeriodDropIcon styles={styles} active={cycleModalOpen} />
              </Pressable>
              <Pressable
                onPress={() => {
                  onSelectOwnerFilter('mother');
                  setEnergyModeOpen((prev) => !prev);
                }}
                style={[styles.calendarCloverBtn, energyModeOpen && styles.calendarCloverBtnActive]}
              >
                <CloverIcon styles={styles} active={energyModeOpen} />
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={styles.calendarHeader}>
          <View style={styles.navRow}>
            <Pressable style={styles.arrow} onPress={() => moveYear(-1)}>
              <Text style={styles.arrowText}>{'<<'}</Text>
            </Pressable>
            <Pressable style={styles.arrow} onPress={() => moveMonth(-1)}>
              <Text style={styles.arrowText}>{'<'}</Text>
            </Pressable>
          </View>
          <View style={styles.centerButtons}>
            <Pressable style={[styles.monthButton, pickerOpen && styles.monthButtonActive]} onPress={() => setPickerOpen((v) => !v)}>
              <Text style={[styles.monthButtonText, pickerOpen && styles.monthButtonTextActive]}>{monthLabel}</Text>
            </Pressable>
            <Pressable style={[styles.yearButton, pickerOpen && styles.monthButtonActive]} onPress={() => setPickerOpen((v) => !v)}>
              <Text style={[styles.monthButtonText, pickerOpen && styles.monthButtonTextActive]}>{currentYear}</Text>
            </Pressable>
          </View>
          <View style={styles.navRow}>
            <Pressable style={styles.arrow} onPress={() => moveMonth(1)}>
              <Text style={styles.arrowText}>{'>'}</Text>
            </Pressable>
            <Pressable style={styles.arrow} onPress={() => moveYear(1)}>
              <Text style={styles.arrowText}>{'>>'}</Text>
            </Pressable>
          </View>
        </View>

        {pickerOpen ? (
          <View style={styles.pickerCard}>
            <View style={styles.pickerColumns}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerTitle}>Month</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator>
                  {monthNames.map((name, index) => (
                    <Pressable
                      key={name}
                      style={[styles.pickerItem, index === currentMonth.getMonth() && styles.pickerItemActive]}
                      onPress={() => pickMonthYear(index, currentYear)}
                    >
                      <Text style={[styles.pickerItemText, index === currentMonth.getMonth() && styles.pickerItemTextActive]}>{name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerTitle}>Year</Text>
                <FlatList
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator
                  data={yearOptions}
                  keyExtractor={(item) => String(item)}
                  initialScrollIndex={Math.max(0, currentYearIndex - 3)}
                  getItemLayout={(_, index) => ({
                    length: 38,
                    offset: 38 * index,
                    index,
                  })}
                  renderItem={({ item: year }) => (
                    <Pressable
                      style={[styles.pickerItem, year === currentYear && styles.pickerItemActive]}
                      onPress={() => pickMonthYear(currentMonth.getMonth(), year)}
                    >
                      <Text style={[styles.pickerItemText, year === currentYear && styles.pickerItemTextActive]}>{year}</Text>
                    </Pressable>
                  )}
                />
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.weekHeader}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <Text key={day} style={[styles.weekday, energyModeOpen && styles.energyWeekday]}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGridWrap}>
          {energyModeOpen ? (
            <View style={styles.energyCalendarWrap}>
              {calendarWeeks.map((week, weekIndex) => (
                <View key={`energy-week-${weekIndex}`} style={styles.energyWeekBlock}>
                  <View style={[styles.grid, styles.dayRowGlass, styles.energyDayRowGlass]}>
                    {week.map((cell) => (
                      <Pressable
                        key={cell.key}
                        disabled={!cell.dateKey}
                        style={[
                          styles.dayCell,
                          styles.energyDayCell,
                          cell.dateKey === selectedDateKey && styles.energyDayCellSelected,
                        ]}
                        onPress={(event) => {
                          if (cell.dateKey) {
                            setSelectedDateKey(cell.dateKey);
                            if (birthdayDates.has(cell.dateKey)) {
                              triggerBirthdayCelebration({
                                x: event.nativeEvent.pageX,
                                y: event.nativeEvent.pageY,
                              });
                            }
                          }
                        }}
                      >
                        <View
                          style={[
                            styles.dayNumberWrap,
                            styles.energyDayNumberWrap,
                            cell.dateKey && getSpecialGeneralDayInfo(calculateGeneralEnergyNumber(cell.dateKey)) && styles.energyDayNumberWrapSpecial,
                            cell.dateKey === selectedDateKey && styles.energyDayNumberWrapSelected,
                          ]}
                        >
                          <View style={styles.energyDayNumberInline}>
                            <Text
                              style={[
                                styles.dayText,
                                styles.energyDayText,
                                cell.dateKey === selectedDateKey && styles.energyDayTextSelected,
                              ]}
                            >
                              {cell.label}
                            </Text>
                            {cell.dateKey && getSpecialGeneralDayInfo(calculateGeneralEnergyNumber(cell.dateKey)) ? (
                              <Pressable
                                style={styles.energyDaySpecialIconWrap}
                                onPress={() => setGeneralDayModalNumber(calculateGeneralEnergyNumber(cell.dateKey!))}
                              >
                                <Text
                                  style={[
                                    styles.energyDaySpecialIcon,
                                    calculateGeneralEnergyNumber(cell.dateKey) === 6 && styles.energyDaySpecialIconLove,
                                    calculateGeneralEnergyNumber(cell.dateKey) === 8 && styles.energyDaySpecialIconDollar,
                                  ]}
                                >
                                  {getSpecialGeneralDayInfo(calculateGeneralEnergyNumber(cell.dateKey))?.icon}
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.energyRowsWrap}>
                    <View style={styles.energyValuesWrap}>
                      {week.map((cell) => (
                        <View key={`${cell.key}-energy`} style={styles.energyValueCell}>
                          <Text style={styles.energyValueText} />
                          <Text style={styles.energyValueText}>
                            {cell.dateKey && birthDateParts ? String(calculatePersonalEnergyNumber(cell.dateKey, birthDateParts)) : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.grid, styles.dayRowGlass]}>
              {calendarDays.map((cell) => (
                <Pressable
                  key={cell.key}
                  disabled={!cell.dateKey}
                  style={[
                    styles.dayCell,
                    cell.dateKey === selectedDateKey && styles.dayCellSelected,
                    cell.dateKey && birthdayDates.has(cell.dateKey) && styles.dayCellBirthday,
                  ]}
                  onPress={(event) => {
                    if (cell.dateKey) {
                      setSelectedDateKey(cell.dateKey);
                      if (birthdayDates.has(cell.dateKey)) {
                        triggerBirthdayCelebration({
                          x: event.nativeEvent.pageX,
                          y: event.nativeEvent.pageY,
                        });
                      }
                    }
                  }}
                >
                  <View
                    style={[
                      styles.dayNumberWrap,
                      cell.dateKey && birthdayDates.has(cell.dateKey) && styles.dayNumberWrapBirthday,
                      cell.dateKey && cyclePeriodEntryDates.has(cell.dateKey) && styles.dayNumberWrapPeriodDay,
                      cell.dateKey && cyclePeriodStartDates.has(cell.dateKey) && styles.dayNumberWrapPeriodStart,
                      cell.dateKey === selectedDateKey &&
                        !cyclePeriodEntryDates.has(cell.dateKey || '') &&
                        !cyclePeriodStartDates.has(cell.dateKey || '') &&
                        styles.dayNumberWrapSelected,
                    ]}
                  >
                    <View style={cell.dateKey && birthdayDates.has(cell.dateKey) ? styles.dayNumberInnerRing : undefined}>
                      <Text
                        style={[
                          styles.dayText,
                          cell.dateKey && birthdayDates.has(cell.dateKey) && styles.dayTextBirthday,
                          cell.dateKey && cyclePeriodEntryDates.has(cell.dateKey) && styles.dayTextPeriodDay,
                          cell.dateKey && cyclePeriodStartDates.has(cell.dateKey) && styles.dayTextPeriodStart,
                          cell.dateKey === selectedDateKey &&
                            !cyclePeriodEntryDates.has(cell.dateKey || '') &&
                            !cyclePeriodStartDates.has(cell.dateKey || '') &&
                            styles.dayTextSelected,
                        ]}
                      >
                        {cell.label}
                      </Text>
                    </View>
                  </View>
                  {cell.dateKey && dayDotColorsByDate.has(cell.dateKey) ? (
                    <View style={styles.dayDotsRow}>
                      {cycleInfoByDate.has(cell.dateKey) ? (
                        cycleInfoByDate.get(cell.dateKey)?.phase === 'period' ? null : (
                          <View
                            style={[
                              styles.cycleDayDot,
                              { backgroundColor: cycleInfoByDate.get(cell.dateKey)?.color || '#e11d48' },
                              cycleInfoByDate.get(cell.dateKey)?.phase === 'ovulation' && styles.cycleDayDotOvulation,
                            ]}
                          />
                        )
                      ) : null}
                      {nutritionStatusByDate.has(cell.dateKey) ? (
                        <View
                          style={[
                            styles.nutritionDayDot,
                            { backgroundColor: nutritionStatusByDate.get(cell.dateKey)?.color || '#22c55e' },
                          ]}
                        />
                      ) : null}
                      {(dayDotColorsByDate.get(cell.dateKey) || []).slice(0, 4).map((dotColor, index) => (
                        <View key={`${cell.dateKey}-dot-${index}`} style={[styles.dayDot, { backgroundColor: dotColor || '#64748b' }]} />
                      ))}
                    </View>
                  ) : cell.dateKey && nutritionStatusByDate.has(cell.dateKey) ? (
                    <View style={styles.dayDotsRow}>
                      {cycleInfoByDate.has(cell.dateKey) ? (
                        cycleInfoByDate.get(cell.dateKey)?.phase === 'period' ? null : (
                          <View
                            style={[
                              styles.cycleDayDot,
                              { backgroundColor: cycleInfoByDate.get(cell.dateKey)?.color || '#e11d48' },
                              cycleInfoByDate.get(cell.dateKey)?.phase === 'ovulation' && styles.cycleDayDotOvulation,
                            ]}
                          />
                        )
                      ) : null}
                      <View
                        style={[
                          styles.nutritionDayDot,
                          { backgroundColor: nutritionStatusByDate.get(cell.dateKey)?.color || '#22c55e' },
                        ]}
                      />
                    </View>
                  ) : cell.dateKey && cycleInfoByDate.has(cell.dateKey) ? (
                    <View style={styles.dayDotsRow}>
                      {cycleInfoByDate.get(cell.dateKey)?.phase === 'period' ? null : (
                        <View
                          style={[
                            styles.cycleDayDot,
                            { backgroundColor: cycleInfoByDate.get(cell.dateKey)?.color || '#e11d48' },
                            cycleInfoByDate.get(cell.dateKey)?.phase === 'ovulation' && styles.cycleDayDotOvulation,
                          ]}
                        />
                      )}
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </View>
        {energyModeOpen ? (
          <View style={styles.energyInfoCard}>
            {birthDateParts ? (
              <>
                <View style={styles.energyInfoSection}>
                  <View style={styles.energyInfoHeader}>
                    <Text style={styles.energyInfoTitle}>{`Personal Day: ${selectedPersonalDayNumber}`}</Text>
                  </View>
                  <Text style={styles.energyInfoText}>{getEnergyMeaning(selectedPersonalDayNumber || 0, 'day')}</Text>
                </View>
                <View style={styles.energyInfoSection}>
                  <View style={styles.energyInfoHeader}>
                    <Text style={styles.energyInfoTitle}>{`Personal Month: ${personalMonthNumber}`}</Text>
                  </View>
                  <Text style={styles.energyInfoText}>{getEnergyMeaning(personalMonthNumber || 0, 'month')}</Text>
                </View>
                <View style={styles.energyInfoSection}>
                  <View style={styles.energyInfoHeader}>
                    <Text style={styles.energyInfoTitle}>{`Personal Year: ${personalYearNumber}`}</Text>
                  </View>
                  <Text style={styles.energyInfoText}>{getEnergyMeaning(personalYearNumber || 0, 'year')}</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.energyInfoTitle}>Personal Calculation</Text>
                <Text style={styles.energyInfoText}>Add your date of birth in the profile to see your personal year, month, and day.</Text>
              </>
            )}
          </View>
        ) : null}
        {energyModeOpen && selectedGeneralDayInfo ? (
          <View style={styles.generalDaysHintBlock}>
            <View style={styles.generalDaysHintRow}>
              <Text
                style={[
                  styles.generalDaysHintIcon,
                  selectedGeneralDayInfo.day === 6 ? styles.generalDaysHintHeart : null,
                  selectedGeneralDayInfo.day === 8 ? styles.generalDayDollarIcon : null,
                  selectedGeneralDayInfo.day === 3 ? styles.generalDayIdeaIcon : null,
                ]}
              >
                {selectedGeneralDayInfo.icon}
              </Text>
              <Text style={styles.generalDaysHintText}>{selectedGeneralDayInfo.description}</Text>
            </View>
          </View>
        ) : null}
        {effectiveCycleTrackingEnabled ? (
          <View style={styles.cycleHintRow}>
            <View style={styles.cycleHintItem}>
              <View style={[styles.cycleHintDot, { backgroundColor: '#e11d48' }]} />
              <Text style={styles.cycleHintText}>Period</Text>
            </View>
            <View style={styles.cycleHintItem}>
              <View style={[styles.cycleHintDot, { backgroundColor: '#14b8a6' }]} />
              <Text style={styles.cycleHintText}>Fertile</Text>
            </View>
            <View style={styles.cycleHintItem}>
              <View style={[styles.cycleHintDot, styles.cycleHintDotOvulation]} />
              <Text style={styles.cycleHintText}>Ovulation</Text>
            </View>
            <View style={styles.cycleHintItem}>
              <View style={[styles.cycleHintDot, { backgroundColor: '#a78bfa' }]} />
              <Text style={styles.cycleHintText}>PMS</Text>
            </View>
          </View>
        ) : null}
        {effectiveCycleTrackingEnabled && selectedCycleInfo ? (
          <View style={styles.cycleInfoCard}>
            <View style={styles.cycleInfoHeader}>
              <View style={[styles.cycleInfoBadge, { backgroundColor: selectedCycleInfo.color }]} />
              <Text style={styles.cycleInfoTitle}>{selectedCycleInfo.label}</Text>
            </View>
            <Text style={styles.cycleInfoText}>
              {selectedCycleInfo.phase === 'period'
                ? 'These days are marked as your expected period window.'
                : selectedCycleInfo.phase === 'ovulation'
                  ? 'This is the predicted ovulation day based on your current cycle settings.'
                  : selectedCycleInfo.phase === 'fertile'
                    ? 'This day belongs to the predicted fertile window.'
                    : 'This is part of the expected PMS window before the next cycle.'}
            </Text>
          </View>
        ) : null}
      </SectionCard>

      <Modal visible={generalDayModalNumber !== null} transparent animationType="fade" onRequestClose={() => setGeneralDayModalNumber(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {generalDayModalNumber && getSpecialGeneralDayInfo(generalDayModalNumber) ? (
              <>
                <View style={styles.generalDayModalHeader}>
                  <Text style={styles.generalDayModalIcon}>{getSpecialGeneralDayInfo(generalDayModalNumber)?.icon}</Text>
                  <Text style={styles.createTitle}>{`General Day ${generalDayModalNumber}`}</Text>
                </View>
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
                  <Text style={styles.energyInfoText}>{getSpecialGeneralDayInfo(generalDayModalNumber)?.description}</Text>
                  {getSpecialGeneralDayInfo(generalDayModalNumber)?.points.map((point) => (
                    <View key={`modal-${generalDayModalNumber}-${point.label}`} style={styles.generalDayPointRow}>
                      <Text style={styles.generalDayPointIcon}>{point.icon}</Text>
                      <Text style={styles.generalDayPointText}>{point.label}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setGeneralDayModalNumber(null)}>
                    <Text style={styles.cancelBtnText}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={cycleModalOpen} transparent animationType="fade" onRequestClose={() => setCycleModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.cyclePanelModalCard]}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.cyclePanelScrollContent} showsVerticalScrollIndicator>
              <View style={styles.cyclePanelTopRow}>
                <Pressable style={styles.cyclePanelCloseBtn} onPress={() => setCycleModalOpen(false)}>
                  <Text style={styles.cyclePanelCloseText}>×</Text>
                </Pressable>
                <View style={styles.cyclePanelDateWrap}>
                  <Text style={styles.cyclePanelTodayText}>{`Today: ${selectedDateLabel}`}</Text>
                </View>
                <View style={styles.cyclePanelCalendarBadge}>
                  <Text style={styles.cyclePanelCalendarBadgeText}>{selectedDateParts?.day || ''}</Text>
                </View>
              </View>

              <View style={styles.cyclePanelTimelineCard}>
                <View style={styles.cyclePanelWeekRow}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <Text key={day} style={styles.cyclePanelWeekText}>{day}</Text>
                  ))}
                </View>
                <View style={styles.cyclePanelRangeRow}>
                  {Array.from({ length: 7 }, (_, index) => {
                    const baseDate = selectedDateParts
                      ? new Date(selectedDateParts.year, selectedDateParts.month - 1, selectedDateParts.day)
                      : new Date();
                    const date = addDays(baseDate, index - 3);
                    const isSelected = toDateKey(date) === selectedDateKey;
                    return (
                      <Pressable key={toDateKey(date)} onPress={() => setSelectedDateKey(toDateKey(date))} style={[styles.cyclePanelRangeItem, isSelected && styles.cyclePanelRangeItemActive]}>
                        <Text style={[styles.cyclePanelRangeText, isSelected && styles.cyclePanelRangeTextActive]}>{date.getDate()}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable style={styles.cyclePanelSettingsChip}>
                  <Text style={styles.cyclePanelSettingsChipText}>Adjust</Text>
                </Pressable>
              </View>

              <View style={styles.cyclePanelSection}>
                <View style={styles.cyclePanelSectionHeader}>
                  <Text style={styles.cyclePanelSectionTitle}>Flow</Text>
                  <Text style={styles.cyclePanelSectionLink}>More</Text>
                </View>
                <Pressable style={[styles.cyclePanelStartToggle, markAsPeriodStart && styles.cyclePanelStartToggleActive]} onPress={() => setMarkAsPeriodStart((prev) => !prev)}>
                  <Text style={[styles.cyclePanelStartToggleText, markAsPeriodStart && styles.cyclePanelStartToggleTextActive]}>
                    {markAsPeriodStart ? 'Marked as period start' : 'Mark as period start'}
                  </Text>
                </Pressable>
                <View style={styles.cyclePanelOptionsRow}>
                  {FLOW_OPTIONS.map((option) => (
                    <Pressable
                      key={option.id}
                      style={[styles.cyclePanelOptionCard, selectedFlowLevel === option.id && styles.cyclePanelOptionCardActive]}
                      onPress={() => setSelectedFlowLevel((prev) => (prev === option.id ? null : option.id))}
                    >
                      <Text style={styles.cyclePanelOptionDrop}>{option.icon}</Text>
                      <Text style={styles.cyclePanelOptionLabel}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.cyclePanelSection}>
                <View style={styles.cyclePanelSectionHeader}>
                  <Text style={styles.cyclePanelSectionTitle}>Spotting</Text>
                  <Text style={styles.cyclePanelSectionLink}>More</Text>
                </View>
                <View style={styles.cyclePanelOptionsRow}>
                  {DISCHARGE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.id}
                      style={[styles.cyclePanelOptionCard, styles.cyclePanelOptionCardCompact, selectedDischargeType === option.id && styles.cyclePanelOptionCardActive]}
                      onPress={() => setSelectedDischargeType((prev) => (prev === option.id ? null : option.id))}
                    >
                      <Text style={styles.cyclePanelOptionGlyph}>{option.icon}</Text>
                      <Text style={styles.cyclePanelOptionLabel}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.cyclePanelSection}>
                <View style={styles.cyclePanelSectionHeader}>
                  <Text style={styles.cyclePanelSectionTitle}>Feelings</Text>
                  <Text style={styles.cyclePanelSectionLink}>More</Text>
                </View>
                <View style={styles.cyclePanelOptionsRow}>
                  {FEELING_OPTIONS.map((option) => (
                    <Pressable
                      key={option.id}
                      style={[styles.cyclePanelOptionCard, styles.cyclePanelOptionCardWarm, selectedFeelings.includes(option.id) && styles.cyclePanelOptionCardWarmActive]}
                      onPress={() => toggleSelection(option.id, selectedFeelings, setSelectedFeelings)}
                    >
                      <Text style={[styles.cyclePanelOptionGlyph, styles.cyclePanelOptionGlyphWarm]}>{option.icon}</Text>
                      <Text style={styles.cyclePanelOptionLabel}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.cyclePanelSection}>
                <View style={styles.cyclePanelSectionHeader}>
                  <Text style={styles.cyclePanelSectionTitle}>Pain</Text>
                  <Text style={styles.cyclePanelSectionLink}>More</Text>
                </View>
                <View style={styles.cyclePanelOptionsRow}>
                  {PAIN_OPTIONS.map((option) => (
                    <Pressable
                      key={option.id}
                      style={[styles.cyclePanelOptionCard, styles.cyclePanelOptionCardPain, selectedPains.includes(option.id) && styles.cyclePanelOptionCardPainActive]}
                      onPress={() => toggleSelection(option.id, selectedPains, setSelectedPains)}
                    >
                      <Text style={[styles.cyclePanelOptionGlyph, styles.cyclePanelOptionGlyphPain]}>{option.icon}</Text>
                      <Text style={styles.cyclePanelOptionLabel}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.cyclePanelSection}>
                <View style={styles.cyclePanelSectionHeader}>
                  <Text style={styles.cyclePanelSectionTitle}>Sleep quality</Text>
                  <Text style={styles.cyclePanelSectionLink}>More</Text>
                </View>
                <View style={styles.cyclePanelOptionsRow}>
                  {SLEEP_QUALITY_OPTIONS.map((option) => (
                    <Pressable
                      key={option.id}
                      style={[styles.cyclePanelOptionCard, styles.cyclePanelOptionCardSleep, selectedSleepQuality === option.id && styles.cyclePanelOptionCardSleepActive]}
                      onPress={() => setSelectedSleepQuality(option.id)}
                    >
                      <Text style={[styles.cyclePanelOptionGlyph, styles.cyclePanelOptionGlyphSleep]}>{option.icon}</Text>
                      <Text style={styles.cyclePanelOptionLabel}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.cyclePanelSection}>
                <View style={styles.cyclePanelSectionHeader}>
                  <Text style={styles.cyclePanelSectionTitle}>Sleep</Text>
                  <Text style={styles.cyclePanelSectionLink}>More</Text>
                </View>
                <View style={styles.cycleSleepCard}>
                  <View style={styles.cycleSleepControl}>
                    <Pressable style={styles.cycleSleepAdjustButton} onPress={() => adjustSleepHours(-1)}>
                      <Text style={styles.cycleSleepAdjustText}>−</Text>
                    </Pressable>
                    <Text style={styles.cycleSleepHours}>{String(sleepHours).padStart(2, '0')}</Text>
                    <Text style={styles.cycleSleepUnit}>H</Text>
                    <Pressable style={styles.cycleSleepAdjustButton} onPress={() => adjustSleepHours(1)}>
                      <Text style={styles.cycleSleepAdjustText}>+</Text>
                    </Pressable>
                  </View>
                  <View style={styles.cycleSleepControl}>
                    <Pressable style={styles.cycleSleepAdjustButton} onPress={() => adjustSleepMinutes(-5)}>
                      <Text style={styles.cycleSleepAdjustText}>−</Text>
                    </Pressable>
                    <Text style={styles.cycleSleepHours}>{String(sleepMinutes).padStart(2, '0')}</Text>
                    <Text style={styles.cycleSleepUnit}>MIN</Text>
                    <Pressable style={styles.cycleSleepAdjustButton} onPress={() => adjustSleepMinutes(5)}>
                      <Text style={styles.cycleSleepAdjustText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {effectiveCycleLastPeriodStart ? <Text style={styles.cycleSavedText}>{`Current start: ${effectiveCycleLastPeriodStart}`}</Text> : null}
              {cycleActionStatus ? <Text style={styles.cycleSavedText}>{cycleActionStatus}</Text> : null}
            </ScrollView>

            <View style={styles.cyclePanelFooter}>
              {selectedCycleEntry ? (
                <Pressable style={styles.cancelBtn} onPress={handleRemoveCycleDay} disabled={cycleMarking}>
                  <Text style={styles.cancelBtnText}>Remove day entry</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[
                  styles.addBtn,
                  styles.cyclePanelSaveButton,
                  isSelectedDateCurrentPeriodStart && styles.cyclePrimaryButtonSaved,
                  cycleMarking && styles.cycleActionButtonDisabled,
                ]}
                onPress={handleSaveCyclePanel}
                disabled={cycleMarking}
              >
                <Text style={[styles.addBtnText, styles.cyclePanelSaveButtonText]}>
                  {cycleMarking ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Pressable style={styles.nutritionCalendarCard} onPress={() => setNutritionInfoOpen((prev) => !prev)}>
        <View style={styles.nutritionCalendarHeader}>
          <View style={styles.nutritionCalendarHeaderCopy}>
            <Text style={styles.nutritionCalendarTitle}>Nutrition on {selectedDateKey}</Text>
            <Text style={styles.nutritionCalendarSummary}>
              {selectedNutritionEntries.length > 0
                ? `${selectedNutritionTotals.calories}/${nutritionPlan?.calories || 0} kcal · P ${selectedNutritionTotals.protein} · C ${selectedNutritionTotals.carbs} · F ${selectedNutritionTotals.fat}`
                : 'No food logged yet. Tap + to add meals for this day.'}
            </Text>
          </View>
          <View style={styles.nutritionCalendarActions}>
            <Pressable
              style={styles.nutritionCalendarAddBtn}
              onPress={(event) => {
                event.stopPropagation();
                openNutritionCreate('breakfast');
              }}
            >
              <Text style={styles.nutritionCalendarAddText}>+</Text>
            </Pressable>
          </View>
        </View>
        {nutritionInfoOpen ? (
          <View style={styles.nutritionCalendarBody}>
            {selectedNutritionMeals.length > 0 ? (
              selectedNutritionMeals.map((section) => (
                <View key={section.key} style={styles.nutritionCalendarMealBlock}>
                  <View style={styles.nutritionCalendarMealHeader}>
                    <Text style={styles.nutritionCalendarMealTitle}>{section.title}</Text>
                    <Pressable
                      style={styles.nutritionMealInlineAddBtn}
                      onPress={(event) => {
                        event.stopPropagation();
                        openNutritionCreate(section.key);
                      }}
                    >
                      <Text style={styles.nutritionMealInlineAddText}>+</Text>
                    </Pressable>
                  </View>
                  {section.entries.map((entry) => (
                    <Pressable
                      key={entry.id}
                      style={styles.nutritionCalendarMealEntryRow}
                      onPress={(event) => {
                        event.stopPropagation();
                        openNutritionEdit(entry);
                      }}
                    >
                      <Text style={styles.nutritionCalendarMealEntry}>
                        {entry.name} · {entry.calories} kcal · P {entry.protein} · F {entry.fat} · C {entry.carbs}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.nutritionCalendarEmptyState}>
                <Text style={styles.nutritionCalendarEmptyText}>Add breakfast, lunch, dinner, or snacks for this day.</Text>
              </View>
            )}
          </View>
        ) : null}
      </Pressable>

      <Modal visible={nutritionEditorOpen} transparent animationType="fade" onRequestClose={() => setNutritionEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.createTitle}>{editingNutritionEntryId ? `Edit Food · ${selectedDateKey}` : `Add Food · ${selectedDateKey}`}</Text>
            <TextInput
              placeholder="Search foods"
              style={styles.oneFieldInput}
              value={nutritionFoodSearch}
              onChangeText={setNutritionFoodSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nutritionPresetScroll}>
              {filteredNutritionFoodPresets.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.nutritionPresetCard}
                  onPress={() => {
                    const next = getNutritionValuesForGrams(item, nutritionDraftGrams);
                    setSelectedNutritionPreset(item);
                    setNutritionDraftName(item.name);
                    setNutritionFoodSearch(item.name);
                    setNutritionDraftCalories(next.calories);
                    setNutritionDraftProtein(next.protein);
                    setNutritionDraftFat(next.fat);
                    setNutritionDraftCarbs(next.carbs);
                  }}
                >
                  <Text style={styles.nutritionPresetTitle}>{item.name}</Text>
                  <Text style={styles.nutritionPresetMeta}>
                    {item.caloriesPer100g} kcal · P {item.proteinPer100g} · F {item.fatPer100g} · C {item.carbsPer100g}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {selectedNutritionPreset ? (
              <View style={styles.nutritionPresetInfo}>
                <Text style={styles.nutritionPresetInfoTitle}>{selectedNutritionPreset.name}</Text>
                <Text style={styles.nutritionPresetInfoMeta}>
                  per 100 g · {selectedNutritionPreset.caloriesPer100g} kcal · P {selectedNutritionPreset.proteinPer100g} · F {selectedNutritionPreset.fatPer100g} · C {selectedNutritionPreset.carbsPer100g}
                </Text>
              </View>
            ) : null}
            <View style={styles.row}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as NutritionFoodEntry['mealType'][]).map((mealType) => (
                <Chip
                  key={mealType}
                  active={nutritionDraftMealType === mealType}
                  label={mealType === 'snack' ? 'Snacks' : mealType[0].toUpperCase() + mealType.slice(1)}
                  onPress={() => setNutritionDraftMealType(mealType)}
                  styles={styles}
                />
              ))}
            </View>
            <TextInput placeholder="Product" value={nutritionDraftName} onChangeText={setNutritionDraftName} style={styles.oneFieldInput} />
            <Text style={styles.inlineInputLabel}>Weight in grams</Text>
            <TextInput
              placeholder="100"
              keyboardType="decimal-pad"
              value={nutritionDraftGrams}
              onChangeText={(text) => {
                const grams = cleanNutritionNumber(text);
                setNutritionDraftGrams(grams);
                if (selectedNutritionPreset) {
                  const next = getNutritionValuesForGrams(selectedNutritionPreset, grams);
                  setNutritionDraftCalories(next.calories);
                  setNutritionDraftProtein(next.protein);
                  setNutritionDraftFat(next.fat);
                  setNutritionDraftCarbs(next.carbs);
                }
              }}
              style={styles.oneFieldInput}
            />
            <View style={styles.row}>
              <TextInput placeholder="Calories" keyboardType="number-pad" value={nutritionDraftCalories} onChangeText={(text) => setNutritionDraftCalories(text.replace(/[^\d]/g, '').slice(0, 4))} style={[styles.oneFieldInput, styles.halfInput]} />
              <TextInput placeholder="Protein" keyboardType="decimal-pad" value={nutritionDraftProtein} onChangeText={(text) => setNutritionDraftProtein(cleanNutritionNumber(text))} style={[styles.oneFieldInput, styles.halfInput]} />
            </View>
            <View style={styles.row}>
              <TextInput placeholder="Fat" keyboardType="decimal-pad" value={nutritionDraftFat} onChangeText={(text) => setNutritionDraftFat(cleanNutritionNumber(text))} style={[styles.oneFieldInput, styles.halfInput]} />
              <TextInput placeholder="Carbs" keyboardType="decimal-pad" value={nutritionDraftCarbs} onChangeText={(text) => setNutritionDraftCarbs(cleanNutritionNumber(text))} style={[styles.oneFieldInput, styles.halfInput]} />
            </View>
            <View style={styles.modalActions}>
              {editingNutritionEntryId ? (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    onNutritionEntriesChange((prev) => prev.filter((entry) => entry.id !== editingNutritionEntryId));
                    setNutritionEditorOpen(false);
                    resetNutritionEditor();
                  }}
                >
                  <Text style={styles.cancelBtnText}>Delete</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setNutritionEditorOpen(false);
                    resetNutritionEditor();
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.addBtn}
                onPress={() => {
                  if (!nutritionDraftName.trim()) return;
                  const payload: NutritionFoodEntry = {
                    id: editingNutritionEntryId || `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    name: `${nutritionDraftName.trim()}${nutritionDraftGrams ? ` • ${nutritionDraftGrams} g` : ''}`,
                    mealType: nutritionDraftMealType,
                    date: selectedDateKey,
                    calories: nutritionDraftCalories || '0',
                    protein: nutritionDraftProtein || '0',
                    fat: nutritionDraftFat || '0',
                    carbs: nutritionDraftCarbs || '0',
                  };
                  onNutritionEntriesChange((prev) =>
                    editingNutritionEntryId ? prev.map((entry) => (entry.id === editingNutritionEntryId ? payload : entry)) : [payload, ...prev],
                  );
                  setNutritionEditorOpen(false);
                  resetNutritionEditor(nutritionDraftMealType);
                }}
              >
                <Text style={styles.addBtnText}>{editingNutritionEntryId ? 'Save' : 'Add'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SectionCard title={`Events on ${selectedDateKey}`}>
        {selectedBirthdayNames.length > 0 ? (
          <View style={styles.birthdaySummaryCard}>
            <View style={styles.birthdaySummaryIconWrap}>
              <BirthdayCakeIcon styles={styles} />
            </View>
            <Text style={styles.birthdaySummaryText}>
              {selectedBirthdayNames.length === 1
                ? `Today is ${selectedBirthdayNames[0]}'s birthday`
                : `Birthdays: ${selectedBirthdayNames.join(', ')}`}
            </Text>
          </View>
        ) : null}
        {isMotherViewingStaffCalendar ? (
          <View style={styles.eventsHeader}>
            <Pressable style={styles.addActionBtn} onPress={() => openCreator('staff_assigned_task')}>
              <Text style={styles.addActionBtnText}>+ Add tasks</Text>
            </Pressable>
          </View>
        ) : isStaffViewingOwnCalendar ? (
          <View style={styles.staffActionStack}>
            <View style={styles.eventsHeader}>
              <Pressable style={styles.addActionBtn} onPress={() => openCreator('staff_self_plan')}>
                <Text style={styles.addActionBtnText}>+ Add plan</Text>
              </Pressable>
            </View>
            <View style={styles.eventsHeader}>
              <Pressable style={styles.addActionBtn} onPress={() => openCreator('staff_self_task')}>
                <Text style={styles.addActionBtnText}>+ Add tasks</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.eventsHeader}>
            <Pressable style={styles.addActionBtn} onPress={() => openCreator('general')}>
              <Text style={styles.addActionBtnText}>+ Add plan</Text>
            </Pressable>
          </View>
        )}

        {selectedEvents.map((event) => (
          <Pressable style={styles.item} key={event.id} onPress={() => openEditModal(event)}>
            <View style={styles.eventTop}>
              <Text style={styles.title}>
                {event.time ? `${event.time} ` : ''}
                {event.title}
              </Text>
              {isBirthdayEvent(event) ? (
                <View style={styles.birthdayEventBadge}>
                  <View style={styles.birthdayEventBadgeRow}>
                    <BirthdayCakeIcon styles={styles} compact />
                    <Text style={styles.birthdayEventBadgeText}>Birthday</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.eventBadge, { backgroundColor: resolveDisplayColor(event) }]}>
                  <Text style={styles.eventBadgeText}>{event.category || 'General'}</Text>
                </View>
              )}
            </View>
            {event.owner === 'staff' && event.category?.toLowerCase().includes('task') ? (
              <Pressable
                style={styles.staffCheckRow}
                disabled={resolveStaffTask(tasks, event)?.status === 'done'}
                onPress={() => {
                  const task = resolveStaffTask(tasks, event);
                  if (task) onCompleteStaffTask(task.id);
                }}
              >
                <View style={[styles.staffCheckbox, resolveStaffTask(tasks, event)?.status === 'done' && styles.staffCheckboxDone]}>
                  {resolveStaffTask(tasks, event)?.status === 'done' ? <Text style={styles.staffCheckboxTick}>✓</Text> : null}
                </View>
                <Text style={styles.eventMetaText}>
                  {resolveStaffTask(tasks, event)?.status === 'done' ? 'Completed' : 'Tap to mark completed'}
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        ))}
        {selectedEvents.length === 0 ? <Text style={styles.empty}>No events for the selected day.</Text> : null}
      </SectionCard>

      <Modal visible={creatorOpen} transparent animationType="fade" onRequestClose={() => setCreatorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
              <Text style={styles.createTitle}>
                {creatorMode === 'staff_assigned_task'
                  ? 'Add Task for Staff'
                  : creatorMode === 'staff_self_plan'
                    ? 'Add My Plan'
                    : creatorMode === 'staff_self_task'
                      ? 'Add My Task'
                      : 'Create Event / Plan'}
              </Text>
              <Text style={styles.modalSub}>Date: {selectedDateKey}</Text>
              {creatorMode === 'staff_assigned_task' || creatorMode === 'staff_self_task' ? (
                <View style={styles.taskCreatorCard}>
                  <View style={styles.taskCreatorRow}>
                    <Pressable style={styles.clockBtn} onPress={() => openTimePicker('create')}>
                      <Text style={styles.clockBtnText}>◷</Text>
                    </Pressable>
                    <View
                      ref={taskInputWrapRef}
                      style={styles.taskCreatorInputWrap}
                      onLayout={() => {
                        if (taskSuggestions.length > 0) updateTaskSuggestionFrame();
                      }}
                    >
                      <TextInput
                        placeholder={creatorMode === 'staff_assigned_task' ? 'Write the task for staff...' : 'Write your task here...'}
                        value={newTitle}
                        onChangeText={(text) => {
                          setNewTitle(text);
                        }}
                        style={[styles.input, styles.taskCreatorInput]}
                      />
                      <Text style={styles.taskCreatorTimeLabel}>{newTime}</Text>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <Chip
                      active={newTaskPriority === 'non_urgent'}
                      label="Non-urgent"
                      onPress={() => setNewTaskPriority('non_urgent')}
                      styles={styles}
                    />
                    <Chip active={newTaskPriority === 'urgent'} label="Urgent" onPress={() => setNewTaskPriority('urgent')} styles={styles} />
                  </View>
                  <View style={styles.staffColorPickerRow}>
                    <Pressable style={styles.inlineColorTrigger} onPress={() => setColorPickerOpen(true)}>
                      <View style={styles.inlineColorOuter}>
                        <View style={[styles.inlineColorInner, { backgroundColor: newColor || '#ffffff' }]} />
                      </View>
                    </Pressable>
                    <Text style={styles.createHint}>
                      {creatorMode === 'staff_assigned_task' ? 'Mom color in your calendar' : 'Your color in your calendar'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.oneFieldRow}>
                  {creatorMode === 'general' ? (
                    <Pressable style={styles.inlineColorTrigger} onPress={() => setColorPickerOpen(true)}>
                      <View style={styles.inlineColorOuter}>
                        <View style={[styles.inlineColorInner, { backgroundColor: hasPickedColor ? newColor : '#ffffff' }]} />
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.inlineColorTrigger} onPress={() => setColorPickerOpen(true)}>
                      <View style={styles.inlineColorOuter}>
                        <View
                          style={[
                            styles.inlineColorInner,
                            {
                              backgroundColor: hasPickedColor ? newColor : creatorMode === 'staff_self_plan' ? '#86efac' : '#93c5fd',
                            },
                          ]}
                        />
                      </View>
                    </Pressable>
                  )}
                  <TextInput placeholder="Write your plan here..." value={newTitle} onChangeText={setNewTitle} style={styles.oneFieldInput} multiline />
                </View>
              )}
              {creatorMode === 'staff_assigned_task' || creatorMode === 'staff_self_task' ? null : (
                <View style={styles.timeRow}>
                  <Pressable style={styles.clockBtn} onPress={() => openTimePicker('create')}>
                    <Text style={styles.clockBtnText}>Clock</Text>
                  </Pressable>
                  <Text style={styles.timeValue}>{newTime}</Text>
                </View>
              )}
              {creatorMode === 'general' ? (
                <View style={styles.row}>
                  <Chip active={newAssignee === 'mother'} label={parentLabel} onPress={() => setNewAssignee('mother')} styles={styles} />
                  {children.map((child) => (
                    <Chip
                      key={child.id}
                      active={newAssignee === `child:${child.id}`}
                      label={child.name}
                      onPress={() => setNewAssignee(`child:${child.id}`)}
                      styles={styles}
                    />
                  ))}
                </View>
              ) : null}
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setCreatorOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.addBtn}
                  onPress={() => {
                      if (!newTitle.trim()) return;
                      const selectedChildId = newAssignee.startsWith('child:') ? newAssignee.replace('child:', '') : null;
                      const selectedStaffId = newAssignee.startsWith('staff:') ? newAssignee.replace('staff:', '') : null;
                      const selectedChild = selectedChildId ? children.find((item) => item.id === selectedChildId) : null;
                      const selectedStaff = selectedStaffId ? staffProfiles.find((item) => item.id === selectedStaffId) : null;
                      const isStaffAssignedTask = creatorMode === 'staff_assigned_task';
                      const isStaffSelfPlan = creatorMode === 'staff_self_plan';
                      const isStaffSelfTask = creatorMode === 'staff_self_task';
                      onAddEvent({
                        title: newTitle.trim(),
                        date: selectedDateKey,
                        time: newTime,
                        owner: selectedChild ? 'child' : selectedStaff ? 'staff' : 'mother',
                        ownerName: selectedChild ? selectedChild.name : selectedStaff ? selectedStaff.name : parentLabel,
                        ownerChildProfileId: selectedChild ? selectedChild.id : undefined,
                        category: isStaffAssignedTask
                          ? `${parentLabel} Task`
                          : isStaffSelfPlan
                            ? 'My Plan'
                            : isStaffSelfTask
                              ? 'My Task'
                              : selectedChild
                                ? selectedChild.name
                                : 'General',
                        color: isStaffAssignedTask
                          ? newTaskPriority === 'urgent'
                            ? '#f87171'
                            : '#fca5a5'
                          : isStaffSelfPlan
                            ? '#86efac'
                            : isStaffSelfTask
                              ? newTaskPriority === 'urgent'
                                ? '#60a5fa'
                                : '#93c5fd'
                              : hasPickedColor
                                ? newColor
                                : '#64748b',
                        taskPriority: isStaffAssignedTask || isStaffSelfTask ? newTaskPriority : undefined,
                        motherColor: selectedStaff ? (creatorMode === 'staff_assigned_task' ? newColor : undefined) : undefined,
                        staffColor: selectedStaff ? (creatorMode === 'staff_assigned_task' ? undefined : newColor) : undefined,
                        visibility: creatorMode === 'staff_self_plan' ? 'staff_private' : 'shared',
                      });
                      setNewTitle('');
                      setCreatorOpen(false);
                    }}
                >
                  <Text style={styles.addBtnText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
          {taskSuggestions.length > 0 && taskSuggestionFrame ? (
            <View
              style={[
                styles.floatingTaskSuggestionOverlay,
                {
                  left: taskSuggestionFrame.x,
                  top: taskSuggestionFrame.y + taskSuggestionFrame.height + 6,
                  width: taskSuggestionFrame.width,
                },
              ]}
            >
              {taskSuggestions.map((suggestion) => (
                <Pressable
                  key={`floating-calendar-task-${suggestion}`}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setNewTitle(suggestion);
                    setTaskSuggestionFrame(null);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator>
              <Text style={styles.createTitle}>Edit Event / Plan</Text>
              <View style={styles.oneFieldRow}>
                <Pressable style={styles.inlineColorTrigger} onPress={() => setEditColorPickerOpen(true)}>
                  <View style={styles.inlineColorOuter}>
                    <View style={[styles.inlineColorInner, { backgroundColor: editHasPickedColor ? editColor : '#ffffff' }]} />
                  </View>
                </Pressable>
                <TextInput
                  placeholder="Edit your plan..."
                  value={editTitle}
                  onChangeText={setEditTitle}
                  style={styles.oneFieldInput}
                  multiline
                />
              </View>
              <View style={styles.timeRow}>
                <Pressable style={styles.clockBtn} onPress={() => openTimePicker('edit')}>
                  <Text style={styles.clockBtnText}>Clock</Text>
                </Pressable>
                <Text style={styles.timeValue}>{editTime}</Text>
              </View>
              <View style={styles.row}>
                <Chip active={editAssignee === 'mother'} label={parentLabel} onPress={() => setEditAssignee('mother')} styles={styles} />
                {children.map((child) => (
                  <Chip
                    key={`edit-${child.id}`}
                    active={editAssignee === `child:${child.id}`}
                    label={child.name}
                    onPress={() => setEditAssignee(`child:${child.id}`)}
                    styles={styles}
                  />
                ))}
                {staffProfiles.map((profile) => (
                  <Chip
                    key={`edit-staff-${profile.id}`}
                    active={editAssignee === `staff:${profile.id}`}
                    label={profile.name}
                    onPress={() => setEditAssignee(`staff:${profile.id}`)}
                    styles={styles}
                  />
                ))}
              </View>
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setEditOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.addBtn}
                  onPress={() => {
                    if (!editingEventId || !editTitle.trim()) return;
                    const selectedChildId = editAssignee.startsWith('child:') ? editAssignee.replace('child:', '') : null;
                    const selectedStaffId = editAssignee.startsWith('staff:') ? editAssignee.replace('staff:', '') : null;
                    const selectedChild = selectedChildId ? children.find((item) => item.id === selectedChildId) : null;
                    const selectedStaff = selectedStaffId ? staffProfiles.find((item) => item.id === selectedStaffId) : null;
                    onUpdateEvent({
                      id: editingEventId,
                      title: editTitle.trim(),
                      color: editHasPickedColor ? editColor : '#64748b',
                      time: editTime,
                      date: selectedDateKey,
                      owner: selectedChild ? 'child' : selectedStaff ? 'staff' : 'mother',
                      ownerName: selectedChild ? selectedChild.name : selectedStaff ? selectedStaff.name : parentLabel,
                      ownerChildProfileId: selectedChild ? selectedChild.id : undefined,
                      category: selectedChild ? selectedChild.name : selectedStaff ? editCategory : 'General',
                      motherColor: selectedStaff
                        ? currentRole === 'mother'
                          ? editColor
                          : editMotherColor
                        : undefined,
                      staffColor: selectedStaff
                        ? currentRole === 'staff'
                          ? editColor
                          : editStaffColor
                        : undefined,
                      visibility: selectedStaff ? editVisibility : 'shared',
                    });
                    setEditOpen(false);
                  }}
                >
                  <Text style={styles.addBtnText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={timePickerOpen} transparent animationType="fade" onRequestClose={() => setTimePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.clockModalCard}>
            <Text style={styles.createTitle}>Pick Time</Text>
            <Text style={styles.modalSub}>{dialStep === 'hour' ? 'Step 1: Select hour' : 'Step 2: Select minute'}</Text>
            <View style={styles.clockDial}>
              {dialDots.map((dot) => (
                <Pressable
                  key={`${dialStep}-${dot.value}`}
                  style={[
                    styles.clockNumber,
                    { left: dot.left, top: dot.top },
                    (dialStep === 'hour' ? dialHour === dot.value : dialMinute === dot.value) && styles.clockNumberActive,
                  ]}
                  onPress={() => chooseDialValue(dot.value)}
                >
                  <Text style={styles.clockNumberText}>{dialStep === 'minute' ? String(dot.value).padStart(2, '0') : dot.value}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.ampmToggle} onPress={() => setDialPeriod((prev) => (prev === 'AM' ? 'PM' : 'AM'))}>
                <Text style={styles.ampmText}>{dialPeriod}</Text>
              </Pressable>
            </View>
            <Text style={styles.timePreview}>{formatClockTime(dialHour, dialMinute, dialPeriod)}</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setTimePickerOpen(false)}>
                <Text style={styles.cancelBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={colorPickerOpen} transparent animationType="fade" onRequestClose={() => setColorPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.colorModalCard}>
            <Text style={styles.createTitle}>Choose Color</Text>
            <View style={styles.paletteRow}>
              {basePalette.map((color) => (
                <Pressable
                  key={color}
                  style={[styles.baseColorDot, { backgroundColor: color }, baseColor === color && styles.baseColorDotActive]}
                  onPress={() => {
                    setBaseColor(color);
                    setToneIndex(5);
                    setTonePickerOpen(true);
                  }}
                />
              ))}
            </View>

            {tonePickerOpen ? (
              <View style={styles.toneBlock}>
                <Text style={styles.toneLabel}>Brightness / Lightness</Text>
                <View style={styles.toneTrack}>
                  {toneColors.map((tone, index) => (
                    <Pressable
                      key={`${tone}-${index}`}
                      style={[styles.toneStep, { backgroundColor: tone }, index === toneIndex && styles.toneStepActive]}
                      onPress={() => setToneIndex(index)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <TextInput
              placeholder="#RRGGBB"
              value={customHex}
              onChangeText={(value) => {
                setCustomHex(value);
                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                  setNewColor(value);
                  setBaseColor(value);
                  setHasPickedColor(true);
                }
              }}
              style={styles.input}
            />
            <Pressable style={styles.pipetteBtn} onPress={pickFromScreen}>
              <Text style={styles.pipetteText}>Pipette from screen</Text>
            </Pressable>
            <ColorWheelPicker
              color={newColor}
              onChange={(value) => {
                setNewColor(value);
                setCustomHex(value);
                setBaseColor(value);
                setHasPickedColor(true);
              }}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setColorPickerOpen(false)}>
                <Text style={styles.cancelBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editColorPickerOpen} transparent animationType="fade" onRequestClose={() => setEditColorPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.colorModalCard}>
            <Text style={styles.createTitle}>Choose Color</Text>
            <View style={styles.paletteRow}>
              {basePalette.map((color) => (
                <Pressable
                  key={`edit-${color}`}
                  style={[styles.baseColorDot, { backgroundColor: color }, editBaseColor === color && styles.baseColorDotActive]}
                  onPress={() => {
                    setEditBaseColor(color);
                    setEditToneIndex(5);
                    setEditTonePickerOpen(true);
                  }}
                />
              ))}
            </View>

            {editTonePickerOpen ? (
              <View style={styles.toneBlock}>
                <Text style={styles.toneLabel}>Brightness / Lightness</Text>
                <View style={styles.toneTrack}>
                  {editToneColors.map((tone, index) => (
                    <Pressable
                      key={`edit-tone-${tone}-${index}`}
                      style={[styles.toneStep, { backgroundColor: tone }, index === editToneIndex && styles.toneStepActive]}
                      onPress={() => setEditToneIndex(index)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <TextInput
              placeholder="#RRGGBB"
              value={editCustomHex}
              onChangeText={(value) => {
                setEditCustomHex(value);
                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                  setEditColor(value);
                  setEditBaseColor(value);
                  setEditHasPickedColor(true);
                }
              }}
              style={styles.input}
            />
            <Pressable
              style={styles.pipetteBtn}
              onPress={() => {
                setEditTonePickerOpen(true);
                setEditColorPickerOpen(true);
              }}
            >
              <Text style={styles.pipetteText}>Pipette from screen</Text>
            </Pressable>
            <ColorWheelPicker
              color={editColor}
              onChange={(value) => {
                setEditColor(value);
                setEditCustomHex(value);
                setEditBaseColor(value);
                setEditHasPickedColor(true);
              }}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditColorPickerOpen(false)}>
                <Text style={styles.cancelBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function reduceToSingleDigit(value: number) {
  let next = Math.abs(Math.trunc(value));
  while (next > 9) {
    next = String(next)
      .split('')
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return next === 0 ? 9 : next;
}

function calculateGeneralEnergyNumber(dateKey: string) {
  const [yearText, monthText, dayText] = dateKey.split('-');
  const generalYear = reduceToSingleDigit(Number(yearText));
  const generalMonth = reduceToSingleDigit(generalYear + Number(monthText));
  return reduceToSingleDigit(generalMonth + Number(dayText));
}

function calculatePersonalYearNumber(year: number, birthDate: { day: number; month: number }) {
  const generalYear = reduceToSingleDigit(year);
  return reduceToSingleDigit(generalYear + birthDate.day + birthDate.month);
}

function calculatePersonalEnergyNumber(dateKey: string, birthDate: { day: number; month: number }) {
  const [yearText, monthText, dayText] = dateKey.split('-');
  const personalYear = calculatePersonalYearNumber(Number(yearText), birthDate);
  const personalMonth = reduceToSingleDigit(personalYear + Number(monthText));
  return reduceToSingleDigit(personalMonth + Number(dayText));
}

function parseDateKeyParts(dateKey: string) {
  const [yearText, monthText, dayText] = dateKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function formatDateForCycleAction(dateKey: string) {
  const parsed = parseDateKeyParts(dateKey);
  if (!parsed) return dateKey;
  return `${String(parsed.day).padStart(2, '0')}.${String(parsed.month).padStart(2, '0')}.${parsed.year}`;
}

function parseBirthDate(value?: string) {
  if (!value) return null;
  const raw = value.trim();
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const day = Number(dotted?.[1] || iso?.[3]);
  const month = Number(dotted?.[2] || iso?.[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return { day, month };
}

function parseBirthDateToDate(value?: string) {
  if (!value) return null;
  const raw = value.trim();
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dotted && !iso) return null;
  const day = Number(dotted?.[1] || iso?.[3]);
  const month = Number(dotted?.[2] || iso?.[2]) - 1;
  const year = Number(dotted?.[3] || iso?.[1]);
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isValidBirthDateInput(value: string) {
  return parseBirthDateToDate(value) !== null;
}

function getEnergyMeaning(value: number, kind: 'year' | 'month' | 'day') {
  const meanings: Record<number, { year: string; month: string; day: string }> = {
    1: {
      year:
        'A year of new beginnings and the start of a new life cycle.\n\nThis is a time to take initiative, put yourself out there, and launch new projects, ideas, and directions. It is a period for shaping your path and identity.\n\nThis year lays the foundation for the next 9-year cycle, so it is important to use it intentionally and not miss opportunities for growth and new starts.\n\nIn the positive:\ngrowth, forward movement, new opportunities, a sense of purpose, successful beginnings.\n\nIn the negative:\nfears, doubts, low energy, anxiety, feeling lost or unsure of your direction.\n\nRecommendations:\n- start new things without delay\n- take action, even in small steps\n- do not get stuck in fear or overthinking\n- express yourself and show up\n- maintain your energy through movement and activity\n\nEssence:\nthis is a starting point. Your actions will determine whether this year becomes a foundation for long-term growth or a period of stagnation.',
      month:
        'Focus on starting and taking initiative.\nThis is the time to set direction and take action.\n\nIn the positive:\nenergy, determination, momentum\n\nIn the negative:\npressure, rushing\n\nRecommendations:\n- start what you have been postponing\n- take initiative\n- set a clear direction\n\nEssence:\ntake responsibility and initiative into your own hands',
      day: 'A day for action and personal initiative.\nTake responsibility and do not wait for the perfect moment - it is already here.\nFocus: step forward and take charge',
    },
    2: {
      year:
        'A year of relationships and interaction with others.\n\nThis is a time to build connections, develop partnerships, and cultivate patience, softness, and diplomacy.\n\nThis year is focused on strengthening what has already been started, as well as developing skills in communication, psychology, partnership, and overall interaction with people. It is important to consciously improve your diplomacy, emotional intelligence, and relationship-building abilities.\n\nIn the positive:\nharmony, creating and strengthening relationships, support, partnerships, improved communication. Favorable for marriage, starting a family, having children, forming alliances, and building long-term connections.\n\nIn the negative:\nresentment, emotional ups and downs, tendency toward depression, conflicts. There may be a desire to break off relationships, separate from a partner, lose connections with friends and partners, and even destroy agreements or business relationships.\n\nRecommendations:\n- build and strengthen relationships\n- develop communication, diplomacy, and psychological skills\n- avoid making emotional decisions\n- practice patience and flexibility\n- maintain and protect important connections\n\nEssence:\nthis is a year of relationships. The stronger your ability to interact with others, the more stable your life and future results will be.',
      month:
        'Focus on interaction and balance.\nWhat matters is how you build relationships with others.\n\nIn the positive:\nsupport, softness, mutual understanding\n\nIn the negative:\nsensitivity, emotional dependency\nconflicts or misunderstandings with a partner or friends\n\nRecommendations:\n- build open communication\n- be more flexible\n- avoid reacting emotionally\n- maintain connection instead of breaking it\n\nEssence:\nalign your relationships',
      day: 'A day for communication and subtle interactions.\nBe mindful with your words and avoid unnecessary tension.\nFocus: maintain harmony in relationships',
    },
    3: {
      year:
        'A year of learning, analysis, and thoughtful decision-making.\n\nThis is a period where it is important to think clearly, go into details, and make decisions based on logic rather than emotions.\n\nIt is a productive year: with the right approach, it brings results, valuable experience, and a clearer understanding of what to do next.\n\nIn the positive:\nclarity, successful decisions, growth through learning and analysis, useful insights, and forward movement with understanding.\n\nIn the negative:\nillusions, overconfidence, excitement, impulsive decisions without proper calculation.\n\nRecommendations:\n- analyze every important decision\n- think several steps ahead\n- pay attention to details and avoid superficial actions\n- focus on learning and developing your knowledge\n- stay rational and avoid emotional decisions\n\nEssence:\nthis is a year where results depend on your mindset. The more analytical and conscious you are, the more value and growth you gain.',
      month:
        'Focus on decisions and thinking.\nIt is important to understand what you are doing, not rush.\n\nIn the positive:\nclarity, successful decisions\n\nIn the negative:\nimpulsiveness, self-deception\n\nRecommendations:\n- analyze before acting\n- do not trust emotions immediately\n- think a few steps ahead\n\nEssence:\nthink before you act',
      day: 'A day for thoughtful decisions.\nTake your time and rely on logic before acting.\nFocus: think before you act',
    },
    4: {
      year:
        'A year of unpredictable events and unexpected situations.\n\nThings may not go according to plan, so it is important to stay calm and not overreact.\n\nThis period is strongly connected to your inner state. How you perceive and respond to what is happening will define your experience.\n\nIn the positive:\npositive unexpected events\nnew opportunities through unusual situations\ninsights and deeper understanding\ninner growth\n\nIn the negative:\nanxiety, overthinking\na sense of instability\nnegative emotional state\nconstant dissatisfaction\na sarcastic or cynical attitude\n\nRecommendations:\n- stay focused on your goals\n- remain calm in any situation\n- manage your emotional state\n- consciously choose positivity and gratitude\n- do not fixate on what is not working\n\nEssence:\nthis is a year where your inner state shapes your reality. The more positive and balanced you are, the smoother everything unfolds.',
      month:
        'Focus on your state and perception.\nHow you respond affects everything.\n\nIn the positive:\ncalmness, inner control\n\nIn the negative:\nnegativity, dissatisfaction\nirritation, tendency to devalue everything\n\nRecommendations:\n- monitor your state\n- avoid negativity\n- maintain inner balance\n\nEssence:\ncontrol your state and develop a positive mindset',
      day: 'A day to manage your inner state.\nReactions may intensify, so staying balanced is key.\nFocus: calmness and stability',
    },
    5: {
      year:
        'A year of change, movement, and new opportunities.\n\nThis is a period when life accelerates: new events, people, and directions appear. It is important to stay flexible and open to change.\n\nIn the positive:\nchange and new opportunities\nrelocations, travel, lifestyle changes\nexpansion, scaling, growth\nnew connections and networking\nvisibility and personal image building\n\nIn the negative:\nimpulsiveness and chaotic actions\nlack of logic and strategy\nhasty decisions\ninstability due to lack of focus\n\nRecommendations:\n- use opportunities for growth and scaling\n- travel, change your environment, try new things\n- show yourself and develop your personal brand\n- consider launching or expanding a business\n- make decisions consciously, not impulsively\n- maintain focus and logical thinking\n\nEssence:\nthis is a year of change and expansion. The more actively you use opportunities and adapt to change, the more you grow and move to the next level.',
      month:
        'Focus on change and movement.\nA time to avoid staying stuck.\n\nIn the positive:\nnew opportunities, momentum\nexpansion, new experiences\n\nIn the negative:\nbreakdown of logic\nimpulsive decisions\n\nRecommendations:\n- try new things\n- travel, change your environment, take breaks\n- stay flexible\n- keep your focus\n\nEssence:\nmove and expand',
      day: 'A day of movement and change.\nGreat for trying something new and shifting your environment.\nFocus: stay flexible and open',
    },
    6: {
      year:
        'A year of love, relationships, and choices.\n\nThis is a period where the main focus is on emotions, family, and close connections.\n\nIt is a year to learn how to love, accept, and make conscious choices in relationships.\n\nIn the positive:\nlove, harmony, warm relationships\ncloser connection with partner and family\nstrengthening bonds\ncare and support\n\nIn the negative:\nheightened emotions and sensitivity\nchallenges in relationships\nconflicts and emotional stress\ndifficulty making decisions\n\nRecommendations:\n- learn to love and accept\n- work on your relationships\n- give attention to family and loved ones\n- make conscious choices\n- avoid emotional drama\n\nEssence:\nthis is a year of love and choice. The decisions you make in relationships will define your harmony and emotional state.',
      month:
        'Focus on close relationships and emotions.\nWhat happens in your personal life is key.\n\nIn the positive:\nwarmth, harmony, support\n\nIn the negative:\ndrama, emotional ups and downs\ndifficulty making choices\n\nRecommendations:\n- give attention to relationships\n- avoid emotional overload\n- make conscious choices\n\nEssence:\nmaintain harmony',
      day: 'A day to focus on close relationships.\nNurture connection and avoid emotional extremes.\nFocus: care and emotional balance',
    },
    7: {
      year:
        'A year of transformation, deep reflection, and inner change.\n\nThis is a period when powerful events may occur, disrupting your usual stability. The key is to go through these experiences consciously and come out with a new level of awareness.\n\nThis year often brings crisis moments, but they are necessary for growth and transformation.\n\nIn the positive:\ntransformation of consciousness\ndeep inner changes\nmental discipline and self-awareness\nre-evaluation of values\nrapid realizations and growth\n\nIn the negative:\ncrisis situations\nfeeling like the ground is being pulled from under you\nsuffering and emotional stress\nblaming others\nemotional instability\n\nRecommendations:\n- maintain mental discipline\n- treat challenges as opportunities for growth\n- avoid falling into negativity and suffering\n- do not blame others\n- work on your inner state (meditation, stillness, awareness)\n- avoid major purchases\n- do not sell real estate\n- secure your money and avoid impulsive spending\n- avoid medical operations if possible\n\nImportant:\n- this year requires financial caution\n- focus on preserving rather than risking\n- events may unfold quickly, so staying grounded is essential\n\nEssence:\nthis is a year of transformation through challenges. The more awareness and inner discipline you maintain, the stronger your growth and outcome will be.',
      month:
        'Focus on inner work.\nA period of transformation, inner and spiritual growth.\n\nIn the positive:\ndepth, awareness\ninner and spiritual growth\n\nIn the negative:\nchaos, anxiety\noverthinking, possible physical vulnerability\n\nRecommendations:\n- slow down and listen to yourself\n- dedicate time to inner development\n- practices: yoga, meditation\n- take care of your health\n- do check-ups\n\nEssence:\ngo inward and grow from within',
      day: 'A day to slow down and turn inward.\nGive yourself space to reflect and reconnect.\nFocus: awareness and inner clarity',
    },
    8: {
      year:
        'A year of work, responsibility, and the realization of accumulated experience.\n\nThis is a period when you receive results based on your past actions and efforts. The main focus is on learning, working, and building practical skills.\n\nThis year requires discipline and strong focus on what you do.\n\nIn the positive:\nrealization of accumulated experience\nmoney as a result of your actions\ngrowth through work and skills\nprofessional development\nstable income with the right approach\n\nIn the negative:\npressure and overload\nmistakes due to greed or rushing\nfinancial difficulties from poor decisions\nnegative consequences of impulsive actions\n\nRecommendations:\n- focus on work and learning\n- build skills that generate income\n- act consistently and steadily\n- earn rather than take risks\n- avoid rapid business expansion\n- do not take loans or credits\n- avoid major commitments\n- avoid registering a marriage or business\n- do not scale aggressively\n\nImportant:\n- this is a year of results: your outcomes reflect your past actions\n- if your foundation is strong, money and opportunities may come\n- avoid trying to rush or skip stages\n\nEssence:\nthis is a year to work, build, and stabilize. The more discipline and focus you have, the stronger your financial results and future stability will be.',
      month:
        'Focus on work and results.\nWhat matters is what you actually do.\n\nIn the positive:\nproductivity, money\n\nIn the negative:\noverload, pressure\nrigidity in actions\n\nRecommendations:\n- work systematically\n- maintain discipline\n- focus on results\n\nEssence:\ndeliver results',
      day: 'A day to focus on work and results.\nChannel your energy into productive and practical tasks.\nFocus: productivity and outcomes',
    },
    9: {
      year:
        'A year of completion, reset, and deep transformation.\n\nThis is a period when a full life cycle comes to an end: people, situations, and projects may leave, and your lifestyle can change.\n\nIt is important to accept what is happening and not resist change.\n\nIn the positive:\nconscious completion of cycles\nacceptance of change\ninner strength and maturity\nrenewal through endings\nservice and helping others\nthe opportunity to start a new life after a reset\n\nIn the negative:\nlosses and breakdowns\nresistance to change\nstress, fear, emotional overload\nintense life situations\n\nRecommendations:\n- accept changes calmly\n- do not resist endings\n- develop inner strength, patience, and humility\n- take care of your health and body\n- include physical activity and sports\n- focus on service and helping others\n- let go of the past\n\nImportant:\n- significant life changes and resets may occur\n- people or important phases may come to an end\n- children may be born as a sign of a new cycle\n- pay special attention to your health\n- preparation for a new cycle (Personal Year 1)\n\nEssence:\nthis is a year of completion. The more you let go of the old, the easier it is to begin a new chapter.',
      month:
        'Focus on completion.\nA time to let go and close cycles.\n\nIn the positive:\nrelease, completion\n\nIn the negative:\ntension, resistance\nfear of letting go\n\nRecommendations:\n- finish what is unfinished\n- do not hold on to the past\n- accept changes\n\nEssence:\nlet go and complete',
      day: 'A day for closure and release.\nLet go of what no longer serves you and complete what is unfinished.\nFocus: release and completion',
    },
  };

  return meanings[value]?.[kind] || '';
}

function getPreviewText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const sentence = normalized.split('. ')[0]?.trim() || normalized;
  return sentence.replace(/[.]+$/, '');
}

function getSpecialGeneralDayInfo(value: number) {
  const items: Record<
    number,
    {
      day: number;
      icon: string;
      hint: string;
      description: string;
      numberStyle: { color: string };
      points: Array<{ icon: string; label: string }>;
    }
  > = {
    3: {
      day: 3,
      icon: '📈',
      hint: 'analysis, logic, clear thinking',
      description:
        'A day for analysis, logic, and clear thinking.\n\nBest used for reviewing, calculating, and making sense of things.\n\nBest for:\n— planning and analysis\n— calculations and checking numbers\n— discussing ideas without rushing\n— work meetings that require thinking\n— comparing options before decisions or purchases\n\nEssence:\nanalyze, calculate, verify',
      numberStyle: { color: '#f59e0b' },
      points: [
        { icon: '📈', label: 'Planning and analysis' },
        { icon: '🧮', label: 'Calculations and checking numbers' },
        { icon: '🧠', label: 'Thinking before decisions' },
      ],
    },
    6: {
      day: 6,
      icon: '♥',
      hint: 'love, comfort, connection',
      description:
        'A day for love, connection, beauty, and comfort.\n\nIdeal for interactions, relationships, and enjoyable experiences.\n\nBest for:\n— dates and romantic moments\n— meeting friends and socializing\n— important meetings and agreements\n— important business meetings\n— beauty treatments, spa, self-care\n— haircuts and cosmetic procedures\n— shopping for yourself, your home, and comfort\n\nEssence:\nconnect, enjoy, create comfort',
      numberStyle: { color: '#e11d48' },
      points: [
        { icon: '♥', label: 'Dates and romantic moments' },
        { icon: '🤝', label: 'Meetings, agreements, socializing' },
        { icon: '🛁', label: 'Beauty, self-care, comfort shopping' },
      ],
    },
    8: {
      day: 8,
      icon: '$',
      hint: 'work, money, results',
      description:
        'A day for work, responsibility, and results.\n\nEverything done today requires effort, discipline, and commitment.\n\nBest for:\n— work and tasks\n— financial matters\n— deals and serious decisions\n— major purchases with awareness of responsibility\n— situations where you are ready to take full responsibility\n\nImportant:\n— results come through effort and discipline\n— everything requires full involvement\n— any start will develop through work and responsibility\n\nEssence:\ntake responsibility, work, and achieve results',
      numberStyle: { color: '#16a34a' },
      points: [
        { icon: '$', label: 'Financial matters and serious decisions' },
        { icon: '💼', label: 'Work, tasks, full responsibility' },
        { icon: '📈', label: 'Results through discipline and effort' },
      ],
    },
  };

  return items[value] || null;
}

function isBirthdayEvent(event: CalendarEvent) {
  return event.category === 'Birthday' || event.id.startsWith('birthday-');
}

const CONFETTI_BITS = [
  { id: 1, color: '#fb7185', angle: 180, distance: 210, rotateStart: 0, rotateEnd: 210, size: 10, height: 18, endScale: 2.2 },
  { id: 2, color: '#f59e0b', angle: 205, distance: 250, rotateStart: 14, rotateEnd: 230, size: 9, height: 16, endScale: 2.6 },
  { id: 3, color: '#60a5fa', angle: 230, distance: 320, rotateStart: -16, rotateEnd: 180, size: 11, height: 20, endScale: 2.9 },
  { id: 4, color: '#34d399', angle: 250, distance: 350, rotateStart: 8, rotateEnd: 240, size: 8, height: 15, endScale: 2.4 },
  { id: 5, color: '#f472b6', angle: 275, distance: 260, rotateStart: -8, rotateEnd: 260, size: 10, height: 17, endScale: 2.7 },
  { id: 6, color: '#a78bfa', angle: 295, distance: 300, rotateStart: 4, rotateEnd: 220, size: 9, height: 18, endScale: 2.8 },
  { id: 7, color: '#fbbf24', angle: 320, distance: 380, rotateStart: -12, rotateEnd: 190, size: 10, height: 16, endScale: 3.1 },
  { id: 8, color: '#22c55e', angle: 340, distance: 420, rotateStart: 12, rotateEnd: 250, size: 11, height: 21, endScale: 3.3 },
  { id: 9, color: '#38bdf8', angle: 0, distance: 280, rotateStart: -10, rotateEnd: 200, size: 8, height: 16, endScale: 2.5 },
  { id: 10, color: '#fb7185', angle: 20, distance: 360, rotateStart: 15, rotateEnd: 280, size: 10, height: 18, endScale: 3.2 },
  { id: 11, color: '#f97316', angle: 45, distance: 310, rotateStart: -14, rotateEnd: 205, size: 9, height: 17, endScale: 2.8 },
  { id: 12, color: '#818cf8', angle: 65, distance: 265, rotateStart: 10, rotateEnd: 235, size: 10, height: 19, endScale: 2.6 },
  { id: 13, color: '#2dd4bf', angle: 90, distance: 230, rotateStart: -5, rotateEnd: 210, size: 8, height: 14, endScale: 2.3 },
  { id: 14, color: '#facc15', angle: 115, distance: 350, rotateStart: 6, rotateEnd: 240, size: 11, height: 18, endScale: 3.1 },
  { id: 15, color: '#fb7185', angle: 140, distance: 300, rotateStart: 0, rotateEnd: 220, size: 10, height: 18, endScale: 2.9 },
  { id: 16, color: '#34d399', angle: 160, distance: 250, rotateStart: 12, rotateEnd: 250, size: 9, height: 15, endScale: 2.5 },
  { id: 17, color: '#60a5fa', angle: 188, distance: 420, rotateStart: -12, rotateEnd: 190, size: 11, height: 20, endScale: 3.4 },
  { id: 18, color: '#f59e0b', angle: 214, distance: 370, rotateStart: 16, rotateEnd: 245, size: 8, height: 16, endScale: 3 },
  { id: 19, color: '#f472b6', angle: 236, distance: 290, rotateStart: -10, rotateEnd: 270, size: 10, height: 17, endScale: 2.7 },
  { id: 20, color: '#22c55e', angle: 260, distance: 410, rotateStart: 4, rotateEnd: 215, size: 9, height: 16, endScale: 3.2 },
  { id: 21, color: '#818cf8', angle: 286, distance: 390, rotateStart: -8, rotateEnd: 240, size: 10, height: 19, endScale: 3.15 },
  { id: 22, color: '#fbbf24', angle: 310, distance: 330, rotateStart: 8, rotateEnd: 230, size: 11, height: 18, endScale: 2.95 },
  { id: 23, color: '#2dd4bf', angle: 334, distance: 270, rotateStart: -14, rotateEnd: 205, size: 8, height: 15, endScale: 2.55 },
  { id: 24, color: '#f97316', angle: 18, distance: 400, rotateStart: 10, rotateEnd: 255, size: 10, height: 18, endScale: 3.2 },
  { id: 25, color: '#fb7185', angle: 52, distance: 345, rotateStart: -6, rotateEnd: 225, size: 9, height: 16, endScale: 3 },
  { id: 26, color: '#facc15', angle: 78, distance: 430, rotateStart: 12, rotateEnd: 245, size: 11, height: 20, endScale: 3.45 },
];

function extractBirthdayName(title: string) {
  const match = title.match(/^Birthday of (.+)$/i);
  return match?.[1]?.trim() || title.trim();
}

function BirthdayCakeIcon({
  styles,
  compact = false,
}: {
  styles: ReturnType<typeof createStyles>;
  compact?: boolean;
}) {
  return (
    <View style={[styles.cakeIconWrap, compact && styles.cakeIconWrapCompact]}>
      <View style={[styles.cakeFlame, compact && styles.cakeFlameCompact]} />
      <View style={[styles.cakeCandle, compact && styles.cakeCandleCompact]} />
      <View style={[styles.cakeTopLayer, compact && styles.cakeTopLayerCompact]}>
        <View style={styles.cakeIcingRow}>
          <View style={styles.cakeIcingDot} />
          <View style={styles.cakeIcingDot} />
          <View style={styles.cakeIcingDot} />
        </View>
      </View>
      <View style={[styles.cakeBottomLayer, compact && styles.cakeBottomLayerCompact]}>
        <View style={styles.cakeIcingRow}>
          <View style={styles.cakeIcingDot} />
          <View style={styles.cakeIcingDot} />
          <View style={styles.cakeIcingDot} />
          <View style={styles.cakeIcingDot} />
        </View>
      </View>
      <View style={[styles.cakePlate, compact && styles.cakePlateCompact]} />
    </View>
  );
}

function resolveStaffTask(tasks: TaskItem[], event: CalendarEvent) {
  const taskId = event.id.replace(/^e-/, 't-');
  const direct = tasks.find((task) => task.id === taskId);
  if (direct) return direct;

  const deadline = event.time ? `${event.date} ${event.time}` : event.date;
  return tasks.find((task) => task.assigneeRole === 'staff' && task.assigneeName === event.ownerName && task.title === event.title && task.deadline === deadline);
}

function buildToneScale(hex: string, steps: number) {
  const source = hexToRgb(hex) || { r: 239, g: 68, b: 68 };
  const middle = Math.floor((steps - 1) / 2);
  return Array.from({ length: steps }, (_, index) => {
    if (index === middle) return rgbToHex(source.r, source.g, source.b);

    if (index < middle) {
      const factor = (middle - index) / middle;
      const mixed = mixRgb(source, { r: 0, g: 0, b: 0 }, factor * 0.55);
      return rgbToHex(mixed.r, mixed.g, mixed.b);
    }

    const factor = (index - middle) / middle;
    const mixed = mixRgb(source, { r: 255, g: 255, b: 255 }, factor * 0.75);
    return rgbToHex(mixed.r, mixed.g, mixed.b);
  });
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(value)) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function hexToRgba(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampNumber(alpha, 0, 1)})`;
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslToHex(h: number, s: number, l: number) {
  const normalizedH = ((h % 360) + 360) % 360;
  const normalizedS = clampNumber(s, 0, 100) / 100;
  const normalizedL = clampNumber(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * normalizedL - 1)) * normalizedS;
  const segment = normalizedH / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = x;
  } else if (segment < 2) {
    red = x;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = x;
  } else if (segment < 4) {
    green = x;
    blue = chroma;
  } else if (segment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const offset = normalizedL - chroma / 2;
  return rgbToHex((red + offset) * 255, (green + offset) * 255, (blue + offset) * 255);
}

function hexToHsl(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const red = rgb.r / 255;
  const green = rgb.g / 255;
  const blue = rgb.b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return {
    h: hue,
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function mixRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function formatClockTime(hour: number, minute: number, period: 'AM' | 'PM') {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

function parseTimeValue(value: string) {
  const text = value.trim();
  const twelve = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelve) {
    const hour = clampNumber(parseInt(twelve[1], 10), 1, 12);
    const minute = clampNumber(parseInt(twelve[2], 10), 0, 59);
    const period = twelve[3].toUpperCase() === 'PM' ? 'PM' : 'AM';
    return { hour, minute, period } as const;
  }

  const twentyFour = text.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const rawHour = clampNumber(parseInt(twentyFour[1], 10), 0, 23);
    const minute = clampNumber(parseInt(twentyFour[2], 10), 0, 59);
    const period = rawHour >= 12 ? 'PM' : 'AM';
    const hour = rawHour % 12 === 0 ? 12 : rawHour % 12;
    return { hour, minute, period } as const;
  }

  return { hour: 10, minute: 0, period: 'AM' as const };
}

function normalizeTimeText(value: string) {
  const parsed = parseTimeValue(value);
  return formatClockTime(parsed.hour, parsed.minute, parsed.period);
}

function ColorWheelPicker({ color, onChange }: { color: string; onChange: (value: string) => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const wheelSize = 220;
  const wheelRadius = 96;
  const selectorSize = 26;
  const wheelPoints = useMemo(() => buildColorWheelPoints(wheelSize, wheelRadius), []);
  const marker = useMemo(() => getWheelMarkerPosition(color, wheelSize, wheelRadius), [color]);

  function handleMove(locationX: number, locationY: number) {
    onChange(pickWheelColor(locationX, locationY, wheelSize, wheelRadius));
  }

  return (
    <View style={styles.colorWheelBlock}>
      <Text style={styles.toneLabel}>Custom color wheel</Text>
      <View
        style={[styles.colorWheel, { width: wheelSize, height: wheelSize, borderRadius: wheelSize / 2 }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => handleMove(event.nativeEvent.locationX, event.nativeEvent.locationY)}
        onResponderMove={(event) => handleMove(event.nativeEvent.locationX, event.nativeEvent.locationY)}
      >
        {wheelPoints.map((point) => (
          <View
            key={point.key}
            pointerEvents="none"
            style={[
              styles.colorWheelDot,
              {
                left: point.x - point.size / 2,
                top: point.y - point.size / 2,
                width: point.size,
                height: point.size,
                borderRadius: point.size / 2,
                backgroundColor: point.color,
              },
            ]}
          />
        ))}
        <View
          pointerEvents="none"
          style={[
            styles.colorWheelSelector,
            {
              left: marker.x - selectorSize / 2,
              top: marker.y - selectorSize / 2,
              width: selectorSize,
              height: selectorSize,
              borderRadius: selectorSize / 2,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.colorWheelHint}>Drag the pipette around the circle to pick an individual shade.</Text>
    </View>
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pickWheelColor(x: number, y: number, size: number, radius: number) {
  const center = size / 2;
  const dx = x - center;
  const dy = y - center;
  const distance = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
  const hue = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normalizedHue = (hue + 450) % 360;
  const ratio = clampNumber(distance / radius, 0, 1);
  const saturation = 14 + ratio * 86;
  const lightness = 84 - ratio * 36;
  return hslToHex(normalizedHue, saturation, lightness);
}

function buildColorWheelPoints(size: number, radius: number) {
  const center = size / 2;
  const rings = 9;
  const points: Array<{ key: string; x: number; y: number; color: string; size: number }> = [
    {
      key: 'wheel-center',
      x: center,
      y: center,
      color: '#f8fafc',
      size: 18,
    },
  ];

  for (let ring = 1; ring <= rings; ring += 1) {
    const ratio = ring / rings;
    const ringRadius = radius * ratio;
    const segments = Math.max(10, Math.round(16 + ratio * 26));
    for (let index = 0; index < segments; index += 1) {
      const hue = (index / segments) * 360;
      const angle = ((hue - 90) * Math.PI) / 180;
      points.push({
        key: `wheel-${ring}-${index}`,
        x: center + Math.cos(angle) * ringRadius,
        y: center + Math.sin(angle) * ringRadius,
        color: hslToHex(hue, 14 + ratio * 86, 84 - ratio * 36),
        size: ring === rings ? 12 : 14,
      });
    }
  }

  return points;
}

function getWheelMarkerPosition(color: string, size: number, radius: number) {
  const hsl = hexToHsl(color) || { h: 0, s: 0, l: 100 };
  const center = size / 2;
  const ratio = clampNumber((hsl.s - 14) / 86, 0, 1);
  const distance = radius * ratio;
  const angle = ((hsl.h - 90) * Math.PI) / 180;
  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance,
  };
}

function Chip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function CloverIcon({
  styles,
  active,
}: {
  styles: ReturnType<typeof createStyles>;
  active: boolean;
}) {
  return (
    <View style={styles.cloverIcon}>
      <View style={[styles.cloverLeaf, styles.cloverLeafTop, active && styles.cloverLeafActive]} />
      <View style={[styles.cloverLeaf, styles.cloverLeafLeft, active && styles.cloverLeafActive]} />
      <View style={[styles.cloverLeaf, styles.cloverLeafRight, active && styles.cloverLeafActive]} />
      <View style={[styles.cloverLeaf, styles.cloverLeafBottom, active && styles.cloverLeafActive]} />
    </View>
  );
}

function PeriodDropIcon({
  styles,
  active,
}: {
  styles: ReturnType<typeof createStyles>;
  active: boolean;
}) {
  return <View style={[styles.periodDropIcon, active && styles.periodDropIconActive]} />;
}

const FLOW_OPTIONS = [
  { id: 'light', label: 'Light', icon: '◔' },
  { id: 'moderate', label: 'Moderate', icon: '◕' },
  { id: 'heavy', label: 'Heavy', icon: '⬤' },
  { id: 'very_heavy', label: 'Very heavy', icon: '◉' },
];

const DISCHARGE_OPTIONS = [
  { id: 'red', label: 'Red', icon: '●●●' },
  { id: 'brown', label: 'Brown', icon: '◌◌◌' },
];

const FEELING_OPTIONS = [
  { id: 'mood', label: 'Mood swings', icon: '☀︎☁︎' },
  { id: 'awkward', label: 'Awkwardness', icon: '◠' },
  { id: 'normal', label: 'Normal', icon: '✿' },
  { id: 'joy', label: 'Joy', icon: '☼' },
  { id: 'sensitive', label: 'Sensitivity', icon: '❋' },
  { id: 'anger', label: 'Anger', icon: '⚡' },
  { id: 'confidence', label: 'Confidence', icon: '☼' },
  { id: 'anxiety', label: 'Anxiety', icon: '☄' },
  { id: 'hopeless', label: 'Hopelessness', icon: '☂' },
  { id: 'gratitude', label: 'Gratitude', icon: '❀' },
];

const PAIN_OPTIONS = [
  { id: 'none', label: 'No pain', icon: '○' },
  { id: 'light', label: 'Light', icon: '◔' },
  { id: 'medium', label: 'Medium', icon: '◑' },
  { id: 'strong', label: 'Strong', icon: '◉' },
  { id: 'spasms', label: 'Spasms', icon: '⚡' },
  { id: 'ovulation', label: 'Ovulation', icon: '◍' },
  { id: 'chest', label: 'Chest discomfort', icon: '◡' },
  { id: 'headache', label: 'Headache', icon: '☹' },
  { id: 'migraine', label: 'Migraine', icon: '✹' },
  { id: 'lower_back', label: 'Lower back', icon: '▱' },
  { id: 'leg', label: 'Leg', icon: '∕' },
  { id: 'joint', label: 'Joint', icon: '◇' },
  { id: 'vulva', label: 'Vulva', icon: '◐' },
];

const SLEEP_QUALITY_OPTIONS = [
  { id: 'falling_asleep', label: 'Trouble falling asleep', icon: '✿' },
  { id: 'cheerful', label: 'Refreshed after sleep', icon: '☺' },
  { id: 'tired', label: 'Tired after sleep', icon: '☁' },
  { id: 'restless', label: 'Restless sleep', icon: '✕' },
];

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filtersBelowRow: {
    marginTop: 14,
    alignItems: 'flex-start',
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.glassStrong,
  },
  chipActive: {
    backgroundColor: colors.selection,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: '#fff',
  },
  calendarCloverWrap: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  calendarTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarPeriodBtn: {
    width: 22,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarPeriodBtnActive: {
    transform: [{ scale: 1.06 }],
  },
  calendarCloverBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: '#15803d',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220, 252, 231, 0.95)',
  },
  calendarCloverBtnActive: {
    backgroundColor: '#16a34a',
    borderColor: '#15803d',
  },
  cloverIcon: {
    width: 22,
    height: 22,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloverLeaf: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderWidth: 1.4,
    borderColor: '#166534',
    backgroundColor: 'transparent',
    borderRadius: 999,
  },
  cloverLeafTop: {
    top: 0,
    left: 6,
  },
  cloverLeafLeft: {
    top: 6,
    left: 0,
  },
  cloverLeafRight: {
    top: 6,
    right: 0,
  },
  cloverLeafBottom: {
    bottom: 0,
    left: 6,
  },
  cloverLeafActive: {
    borderColor: '#ffffff',
  },
  periodDropIcon: {
    width: 18,
    height: 18,
    backgroundColor: '#e11d48',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    transform: [{ rotate: '135deg' }],
  },
  periodDropIconActive: {
    backgroundColor: '#be123c',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navRow: {
    flexDirection: 'row',
    gap: 6,
  },
  arrow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.glassStrong,
  },
  arrowText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  centerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthButton: {
    minWidth: 74,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.selection,
    alignItems: 'center',
  },
  yearButton: {
    minWidth: 64,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.selection,
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: colors.primary,
  },
  monthButtonText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  monthButtonTextActive: {
    color: '#fff',
  },
  pickerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    backgroundColor: colors.glassStrong,
  },
  pickerColumns: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  pickerColumn: {
    width: 120,
  },
  pickerTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 6,
  },
  pickerScroll: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 6,
    backgroundColor: colors.glassSoft,
  },
  pickerItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.glassStrong,
    marginBottom: 6,
    alignSelf: 'center',
    minWidth: 88,
    alignItems: 'center',
    minHeight: 32,
  },
  pickerItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selection,
  },
  pickerItemText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  pickerItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarGridWrap: {
    position: 'relative',
  },
  dayRowGlass: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: colors.selection,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  energyDayRowGlass: {
    borderRadius: 18,
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: hexToRgba(colors.primary, 0.08) || colors.selection,
    borderColor: hexToRgba(colors.primary, 0.14) || colors.border,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  energyCalendarWrap: {
    gap: 8,
  },
  energyWeekBlock: {
    gap: 1,
    overflow: 'visible',
  },
  energyWeekLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  energyContentCol: {
    flex: 1,
  },
  energyRowsWrap: {
    alignItems: 'stretch',
  },
  energyLabelsCol: {
    width: 52,
    alignItems: 'flex-start',
  },
  energyLabelsSpacer: {
    height: 34,
  },
  energyLabelsStack: {
    gap: 3,
  },
  energyLabelText: {
    color: colors.primary,
    opacity: 0.72,
    fontSize: 9,
    lineHeight: 12,
    minHeight: 12,
    textAlign: 'left',
  },
  energyValuesWrap: {
    flex: 1,
    flexDirection: 'row',
  },
  energyValueCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    gap: 3,
  },
  generalDayIconBtn: {
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generalDayIconText: {
    fontSize: 12,
    lineHeight: 14,
  },
  generalDayDollarIcon: {
    color: '#111111',
  },
  generalDayIdeaIcon: {
    color: '#f59e0b',
  },
  energyValueText: {
    minHeight: 12,
    color: colors.primary,
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '500',
  },
  energyInfoCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  energyInfoSection: {
    paddingBottom: 8,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  energyInfoSectionLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  energyInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  energyInfoTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  energyInfoChevron: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '500',
  },
  energyInfoPreview: {
    marginTop: 4,
    color: colors.subtext,
    fontSize: 11,
    lineHeight: 14,
  },
  energyInfoText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 6,
  },
  generalDayCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  generalDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  generalDayTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generalDayTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  generalDayChevron: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '500',
  },
  generalDayPreview: {
    marginTop: 4,
    color: colors.subtext,
    fontSize: 11,
    lineHeight: 14,
  },
  generalDayBody: {
    marginTop: 8,
    gap: 6,
  },
  generalDayText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 17,
  },
  generalDayPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  generalDayPointIcon: {
    width: 18,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  generalDayPointText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  generalDayModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  generalDayModalIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
  generalDaysHintBlock: {
    marginTop: 10,
    gap: 4,
  },
  generalDaysHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  generalDaysHintIcon: {
    color: '#16a34a',
    fontSize: 11,
    lineHeight: 16,
  },
  generalDaysHintHeart: {
    color: '#e11d48',
  },
  generalDaysHintDollar: {
    color: '#111111',
  },
  generalDaysHintText: {
    flex: 1,
    color: colors.subtext,
    fontSize: 11,
    lineHeight: 16,
  },
  personalInfoCollapsedCard: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personalInfoCollapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personalInfoCollapsedTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  personalInfoCollapsedChevron: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 18,
    fontWeight: '500',
  },
  personalInfoCollapsedPreview: {
    marginTop: 4,
    color: colors.subtext,
    fontSize: 11,
    lineHeight: 14,
  },
  personalInfoCollapsedBody: {
    marginTop: 8,
  },
  emailImportCard: {
    marginTop: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    padding: 14,
    gap: 10,
  },
  emailImportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  emailImportHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  emailImportTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  emailImportSummary: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  emailImportBody: {
    gap: 10,
  },
  emailImportInboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  emailImportActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  emailImportInboxLabel: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  emailImportInboxValue: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  emailImportPickerBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.selection,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emailImportPickerBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  emailImportFormats: {
    color: colors.subtext,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  emailImportHint: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  emailImportItem: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSoft,
    padding: 12,
    gap: 6,
  },
  emailImportItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  emailImportBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.selection,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emailImportBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  emailImportConfidence: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '700',
  },
  emailImportItemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  emailImportItemMeta: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  emailImportItemSubtle: {
    color: colors.subtext,
    fontSize: 11,
    lineHeight: 16,
  },
  emailImportItemNotes: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  emailImportActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  emailImportGhostBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  emailImportGhostText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  emailImportAddBtn: {
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  emailImportAddText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  emailImportEmpty: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSoft,
    padding: 12,
  },
  emailImportEmptyText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  fullscreenConfettiOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 999,
  },
  fullscreenConfettiBit: {
    position: 'absolute',
    top: -40,
    borderRadius: 3,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
  energyWeekday: {
    color: colors.primary,
    opacity: 0.72,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },
  energyDayCell: {
    height: 26,
    borderRadius: 0,
    marginBottom: 0,
  },
  energyDayCellSelected: {
    backgroundColor: 'transparent',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellBirthday: {
    backgroundColor: 'transparent',
  },
  dayNumberWrap: {
    minWidth: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  energyDayNumberWrap: {
    minWidth: 14,
    height: 18,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  energyDayNumberWrapSpecial: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.85)',
    backgroundColor: 'rgba(220, 252, 231, 0.18)',
  },
  energyDayNumberWrapSelected: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: hexToRgba(colors.primary, 0.14) || colors.selection,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, 0.28) || colors.primary,
  },
  dayNumberWrapBirthday: {
    borderWidth: 1.5,
    borderColor: '#d6577d',
    backgroundColor: 'rgba(255, 240, 246, 0.62)',
    shadowColor: 'rgba(214, 87, 125, 0.18)',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  dayNumberWrapSelected: {
    backgroundColor: colors.primary,
  },
  dayNumberWrapPeriodDay: {
    backgroundColor: 'rgba(252, 231, 243, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.42)',
  },
  dayNumberWrapPeriodStart: {
    backgroundColor: 'rgba(251, 207, 232, 0.92)',
    borderWidth: 1.5,
    borderColor: '#e11d48',
    shadowColor: 'rgba(225, 29, 72, 0.18)',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  dayNumberInnerRing: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(214, 87, 125, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: colors.text,
    fontWeight: '600',
  },
  energyDayText: {
    color: '#111111',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 14,
  },
  energyDayTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  energyDayNumberInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  energyDaySpecialIconWrap: {
    minWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyDaySpecialIcon: {
    fontSize: 10,
    lineHeight: 10,
    color: '#16a34a',
  },
  energyDaySpecialIconLove: {
    color: '#e11d48',
  },
  energyDaySpecialIconDollar: {
    color: '#111111',
  },
  dayTextBirthday: {
    color: '#c24369',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextPeriodDay: {
    color: '#be185d',
    fontWeight: '700',
  },
  dayTextPeriodStart: {
    color: '#be123c',
    fontWeight: '800',
  },
  dayDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cycleDayDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  cycleDropMarker: {
    width: 10,
    height: 10,
    backgroundColor: '#e11d48',
    borderRadius: 10,
    borderBottomLeftRadius: 2,
    transform: [{ rotate: '-45deg' }],
    marginBottom: 1,
  },
  cycleDayDotOvulation: {
    backgroundColor: '#d1fae5',
    borderWidth: 1.5,
    borderColor: '#0f766e',
  },
  nutritionDayDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  dayDotsRow: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    pointerEvents: 'none',
  },
  cycleActionCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    zIndex: 20,
  },
  cycleActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cycleActionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  cycleActionCaption: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  cycleActionText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  cycleSelectedDatePill: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  cycleSelectedDateLabel: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cycleSelectedDateValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  cycleActionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  cyclePrimaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#e11d48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 21,
  },
  cyclePrimaryButtonSaved: {
    backgroundColor: '#16a34a',
  },
  cyclePrimaryButtonIcon: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 12,
  },
  cyclePrimaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  cycleActionButtonDisabled: {
    opacity: 0.6,
  },
  cycleActionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  cycleSavedText: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  cycleHintRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cycleHintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cycleHintDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  cycleHintDotOvulation: {
    backgroundColor: '#d1fae5',
    borderWidth: 1.5,
    borderColor: '#0f766e',
  },
  cycleHintText: {
    color: colors.subtext,
    fontSize: 11,
    fontWeight: '700',
  },
  cycleInfoCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cycleInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cycleInfoBadge: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  cycleInfoTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  cycleInfoText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  cyclePanelModalCard: {
    padding: 0,
    maxWidth: 380,
    backgroundColor: colors.glassStrong,
    overflow: 'hidden',
  },
  cyclePanelScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 18,
  },
  cyclePanelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cyclePanelCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyclePanelCloseText: {
    color: colors.subtext,
    fontSize: 22,
    lineHeight: 24,
  },
  cyclePanelDateWrap: {
    flex: 1,
    alignItems: 'center',
  },
  cyclePanelTodayText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cyclePanelCalendarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassSoft,
  },
  cyclePanelCalendarBadgeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  cyclePanelTimelineCard: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSoft,
    padding: 12,
  },
  cyclePanelWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  cyclePanelWeekText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '500',
  },
  cyclePanelRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.selection,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cyclePanelRangeItem: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyclePanelRangeItemActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  cyclePanelRangeText: {
    color: colors.subtext,
    fontSize: 16,
    fontWeight: '600',
  },
  cyclePanelRangeTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  cyclePanelSettingsChip: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.selection,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cyclePanelSettingsChipText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  cyclePanelSection: {
    gap: 10,
  },
  cyclePanelStartToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cyclePanelStartToggleActive: {
    backgroundColor: colors.selection,
    borderColor: colors.primary,
  },
  cyclePanelStartToggleText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  cyclePanelStartToggleTextActive: {
    color: colors.primary,
  },
  cyclePanelSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cyclePanelSectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cyclePanelSectionLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  cyclePanelOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cyclePanelOptionCard: {
    width: '22%',
    minWidth: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 8,
  },
  cyclePanelOptionCardCompact: {
    width: '22%',
  },
  cyclePanelOptionCardWarm: {
    borderColor: hexToRgba(colors.nonUrgent, 0.35) || colors.border,
  },
  cyclePanelOptionCardPain: {
    borderColor: hexToRgba(colors.primary, 0.28) || colors.border,
  },
  cyclePanelOptionCardSleep: {
    borderColor: hexToRgba(colors.primary, 0.22) || colors.border,
  },
  cyclePanelOptionCardActive: {
    backgroundColor: colors.selection,
    borderColor: colors.primary,
  },
  cyclePanelOptionCardWarmActive: {
    backgroundColor: colors.selection,
    borderColor: colors.primary,
  },
  cyclePanelOptionCardPainActive: {
    backgroundColor: colors.selection,
    borderColor: colors.primary,
  },
  cyclePanelOptionCardSleepActive: {
    backgroundColor: colors.selection,
    borderColor: colors.primary,
  },
  cyclePanelOptionDrop: {
    color: '#dc2626',
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '800',
  },
  cyclePanelOptionGlyph: {
    color: '#dc2626',
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  cyclePanelOptionGlyphWarm: {
    color: colors.primary,
  },
  cyclePanelOptionGlyphPain: {
    color: colors.primary,
  },
  cyclePanelOptionGlyphSleep: {
    color: colors.primary,
  },
  cyclePanelOptionLabel: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  cycleSleepCard: {
    borderRadius: 22,
    backgroundColor: colors.glassSoft,
    minHeight: 128,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cycleSleepControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cycleSleepAdjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleSleepAdjustText: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
  },
  cycleSleepHours: {
    color: colors.text,
    fontSize: 44,
    lineHeight: 58,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cycleSleepUnit: {
    color: colors.subtext,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    marginRight: 6,
    marginTop: 10,
  },
  cyclePanelFooter: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: colors.glassStrong,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cyclePanelSaveButton: {
    marginTop: 0,
    borderRadius: 16,
    minHeight: 50,
  },
  cyclePanelSaveButtonText: {
    fontSize: 16,
  },
  nutritionCalendarCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  nutritionCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  nutritionCalendarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutritionCalendarAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.selection,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  nutritionCalendarAddText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  nutritionCalendarHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  nutritionCalendarTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  nutritionCalendarSummary: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  nutritionCalendarBody: {
    gap: 10,
    paddingTop: 2,
  },
  nutritionCalendarMealBlock: {
    gap: 4,
  },
  nutritionCalendarMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nutritionCalendarMealTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  nutritionMealInlineAddBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nutritionMealInlineAddText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 16,
  },
  nutritionCalendarMealEntryRow: {
    borderRadius: 12,
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nutritionCalendarMealEntry: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  nutritionCalendarEmptyState: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.glassSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nutritionCalendarEmptyText: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  nutritionPresetScroll: {
    gap: 10,
    paddingBottom: 10,
  },
  nutritionPresetCard: {
    width: 188,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    padding: 12,
    gap: 4,
  },
  nutritionPresetTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  nutritionPresetMeta: {
    color: colors.subtext,
    fontSize: 11,
    lineHeight: 16,
  },
  nutritionPresetInfo: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  nutritionPresetInfoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  nutritionPresetInfoMeta: {
    color: colors.subtext,
    fontSize: 11,
    lineHeight: 16,
  },
  inlineInputLabel: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 13,
  },
  halfInput: {
    flex: 1,
  },
  item: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
  },
  staffCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  staffCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffCheckboxDone: {
    borderColor: colors.done,
    backgroundColor: '#dcfce7',
  },
  staffCheckboxTick: {
    color: colors.done,
    fontWeight: '800',
  },
  eventMetaText: {
    color: colors.subtext,
    fontWeight: '600',
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  eventBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  birthdayEventBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  birthdayEventBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  birthdayEventBadgeText: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 11,
  },
  birthdaySummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(255, 251, 235, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  birthdaySummaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  birthdaySummaryText: {
    flex: 1,
    color: '#92400e',
    fontWeight: '800',
    fontSize: 13,
  },
  cakeIconWrap: {
    width: 18,
    height: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cakeIconWrapCompact: {
    width: 16,
    height: 14,
  },
  cakeFlame: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#fde68a',
    marginBottom: 1,
  },
  cakeFlameCompact: {
    width: 4,
    height: 4,
  },
  cakeCandle: {
    width: 1.5,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#1f2937',
    marginBottom: 1,
  },
  cakeCandleCompact: {
    height: 4,
  },
  cakeTopLayer: {
    width: 9,
    height: 4,
    borderRadius: 2,
    borderWidth: 1.3,
    borderColor: '#1f2937',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  cakeTopLayerCompact: {
    width: 8,
    height: 4,
  },
  cakeBottomLayer: {
    width: 14,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1.3,
    borderColor: '#1f2937',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 1,
  },
  cakeBottomLayerCompact: {
    width: 12,
    height: 4,
  },
  cakeIcingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    marginTop: 0.5,
  },
  cakeIcingDot: {
    width: 2,
    height: 1.5,
    borderRadius: 999,
    backgroundColor: '#1f2937',
  },
  cakePlate: {
    width: 16,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#1f2937',
    marginTop: 1,
  },
  cakePlateCompact: {
    width: 14,
  },
  meta: {
    color: colors.subtext,
    marginTop: 2,
  },
  empty: {
    color: colors.subtext,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  staffActionStack: {
    gap: 6,
    marginBottom: 4,
  },
  staffColorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  addIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  addActionBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addActionBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  createHint: {
    color: colors.subtext,
    fontWeight: '600',
  },
  createTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: colors.glassStrong,
  },
  addBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: 'rgba(37,99,235,0.28)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.text,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  baseColorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#000',
  },
  baseColorDotActive: {
    borderWidth: 3,
  },
  toneBlock: {
    marginBottom: 8,
  },
  toneLabel: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 6,
  },
  toneTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toneStep: {
    flex: 1,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  toneStepActive: {
    borderWidth: 3,
  },
  pipetteBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.glassStrong,
    marginBottom: 8,
  },
  pipetteText: {
    color: colors.text,
    fontWeight: '700',
  },
  colorWheelBlock: {
    marginBottom: 10,
    alignItems: 'center',
    gap: 10,
  },
  colorWheel: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    overflow: 'hidden',
  },
  colorWheelDot: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.16)',
  },
  colorWheelSelector: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  colorWheelHint: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  oneFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  inlineColorTrigger: {
    marginTop: 10,
  },
  inlineColorOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassStrong,
  },
  inlineColorInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#000',
    backgroundColor: 'transparent',
  },
  oneFieldInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: colors.glassStrong,
  },
  taskCreatorCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 10,
    gap: 8,
    backgroundColor: colors.glassSoft,
    overflow: 'visible',
    zIndex: 6,
  },
  taskCreatorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    zIndex: 7,
  },
  taskCreatorInputWrap: {
    flex: 1,
    gap: 6,
    position: 'relative',
    zIndex: 8,
  },
  taskCreatorInput: {
    marginBottom: 0,
  },
  taskCreatorTimeLabel: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.glassStrong,
  },
  taskSuggestionOverlay: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.72)',
    zIndex: 30,
    elevation: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    maxHeight: 220,
  },
  floatingTaskSuggestionOverlay: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 120,
    elevation: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    maxHeight: 240,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'transparent',
  },
  suggestionText: {
    color: colors.text,
    fontWeight: '500',
  },
  timeRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clockBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassStrong,
  },
  clockBtnText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  timeValue: {
    color: colors.text,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    backgroundColor: 'rgba(248,250,252,0.97)',
    padding: 14,
    overflow: 'visible',
  },
  modalScroll: {
    overflow: 'visible',
  },
  modalScrollContent: {
    overflow: 'visible',
    paddingBottom: 8,
  },
  colorModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    padding: 14,
  },
  clockModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    padding: 14,
    alignItems: 'center',
  },
  clockDial: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    backgroundColor: colors.glassSoft,
    marginBottom: 10,
  },
  clockNumber: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassStrong,
  },
  clockNumberActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selection,
  },
  clockNumberText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  ampmToggle: {
    position: 'absolute',
    top: 95,
    left: 95,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.selection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11,
  },
  timePreview: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSub: {
    color: colors.subtext,
    marginBottom: 8,
    fontWeight: '600',
  },
  modalActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.glassStrong,
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: '700',
  },
  });
