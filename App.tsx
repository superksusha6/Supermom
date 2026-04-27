import { StatusBar } from 'expo-status-bar';
import { SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  AppSession,
  createRecipe,
  createCompletedTaskNotification,
  createCalendarEvent,
  createDeleteApprovalRequest,
  createPurchaseRequest,
  createShoppingList,
  createShoppingShare,
  createTask,
  deleteChildProfile,
  deleteShoppingList,
  deleteShoppingShare,
  getOrCreateSessionContext,
  getMyProfile,
  getUserPreferences,
  listCalendarEvents,
  listChildProfiles,
  listCompletedTaskNotifications,
  listHabitEntries,
  listNutritionEntries,
  listApprovalRequests,
  listPurchaseRequests,
  listRecipes,
  listShoppingLists,
  listShoppingShares,
  listStaffProfiles,
  listStaffReminderNotifications,
  listTasks,
  listWeeklyMealPlan,
  markCompletedTaskNotificationsRead,
  resolveApprovalRequest,
  replaceGeneratedChildEvents,
  replaceHabitEntries,
  replaceNutritionEntries,
  replaceGeneratedStaffSchedule,
  sendPasswordResetEmail,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  StaffProfileRecord,
  StaffReminderNotificationRecord,
  CompletedTaskNotificationRecord,
  StaffTaskDraftRecord,
  toggleShoppingItemPurchased,
  updatePurchaseRequestStatus,
  updateShoppingListItems,
  updateCalendarEvent,
  upsertChildProfileRecord,
  upsertMyProfile,
  upsertStaffProfileRecord,
  upsertStaffReminderNotification,
  upsertUserPreferences,
  upsertWeeklyMealPlan,
  updateTaskStatus,
} from '@/lib/tasks';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { ChildrenScreen } from '@/screens/ChildrenScreen';
import { DocumentsScreen } from '@/screens/DocumentsScreen';
import { HabitsScreen } from '@/screens/HabitsScreen';
import { NutritionScreen } from '@/screens/NutritionScreen';
import { MealPlannerScreen } from '@/screens/MealPlannerScreen';
import { RecipesScreen } from '@/screens/RecipesScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ShoppingScreen } from '@/screens/ShoppingScreen';
import { ThemeColors, ThemeName, ThemeProvider, themePalettes, useTheme } from '@/theme/theme';
import { ActivityLevel, ApprovalRequest, CalendarEvent, CalendarScope, ChildProfile, CycleDayEntry, FridgeItem, FridgeItemStatus, HabitChallenge, HabitEntry, ImportedEmailEvent, MealPlanSlot, NutritionFoodEntry, NutritionGoal, NutritionPace, NutritionSex, PersonalProfile, PurchaseRequest, Recipe, Role, ShoppingItem, ShoppingListDoc, ShoppingShare, TaskItem, TaskPriority, TaskStatus, WeeklyMealPlanEntry } from '@/types/app';

type Screen = 'calendar' | 'nutrition' | 'recipes' | 'meal_planner' | 'habits' | 'children' | 'shopping' | 'documents' | 'settings';
type AuthMode = 'signin' | 'signup';
type ParentLabel = 'Mom' | 'Dad';
type UiRole = Exclude<Role, 'admin'>;
type WeekDayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type DraftActivity = {
  id: string;
  name: string;
  timesPerWeek: string;
  time: string;
  color: string;
  weekDays: WeekDayCode[];
  timeSlots: string[];
};
type StaffDraftTask = {
  id: string;
  title: string;
  time: string;
  priority: TaskPriority;
  weekDays: WeekDayCode[];
};
type StaffProfile = {
  id: string;
  name: string;
  dateOfBirth?: string;
  tasks: StaffDraftTask[];
};
type CompletedTaskNotification = {
  id: string;
  taskId: string;
  taskTitle: string;
  staffName: string;
  completedAt: string;
  read: boolean;
};
type StaffReminderNotification = {
  taskId: string;
  taskTitle: string;
  staffName: string;
  sentAt: string;
};
type TaskNotificationsFilter = 'all' | 'completed' | 'not_completed';
type TaskHistoryFilter = '3d' | '7d' | '10d' | '20d' | '30d' | '180d' | 'days' | 'date';
type TaskNotificationEntry = {
  id: string;
  kind: 'completed' | 'not_completed';
  title: string;
  staffName: string;
  happenedAt: string;
  deadline?: string;
  taskId: string;
};
const DEFAULT_TASK_HISTORY_FILTER: TaskHistoryFilter = '3d';
const AUTO_SCHEDULE_MONTHS_AHEAD = 6;
const CHILD_COLOR_PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const WEEK_DAYS: Array<{ code: WeekDayCode; label: string; jsDay: number }> = [
  { code: 'mon', label: 'Mon', jsDay: 1 },
  { code: 'tue', label: 'Tue', jsDay: 2 },
  { code: 'wed', label: 'Wed', jsDay: 3 },
  { code: 'thu', label: 'Thu', jsDay: 4 },
  { code: 'fri', label: 'Fri', jsDay: 5 },
  { code: 'sat', label: 'Sat', jsDay: 6 },
  { code: 'sun', label: 'Sun', jsDay: 0 },
];

const MEAL_PLAN_SLOTS: Array<{ key: MealPlanSlot; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

const createDefaultWeeklyMealPlan = (): WeeklyMealPlanEntry[] => {
  const defaults = WEEK_DAYS.flatMap((day) =>
    MEAL_PLAN_SLOTS.map((slot) => ({
      id: `meal-plan-${day.code}-${slot.key}`,
      profileKey: 'family',
      dayKey: day.code,
      dayLabel: day.label,
      slot: slot.key,
      recipeId: undefined,
    })),
  );
  return defaults;
};
const ACTIVITY_OPTIONS = Array.from(
  new Set([
    'drawing',
    'painting',
    'clay modeling',
    'plasticine modeling',
    'ceramics',
    'applique',
    'origami',
    'art studio',
    'calligraphy',
    'comics',
    'animation',
    'photography',
    'videography',
    'video editing',
    'theater studio',
    'acting',
    'vocal training',
    'choir',
    'piano lessons',
    'guitar lessons',
    'violin lessons',
    'drum lessons',
    'music school',
    'dance',
    'ballet',
    'hip-hop dance',
    'jazz dance',
    'contemporary dance',
    'breakdance',
    'gymnastics',
    'rhythmic gymnastics',
    'artistic gymnastics',
    'acrobatics',
    'yoga',
    'stretching',
    'chess',
    'checkers',
    'robotics',
    'programming',
    '3D modeling',
    'LEGO construction',
    'engineering club',
    'science club',
    'kids experiments',
    'english language',
    'russian language',
    'spanish language',
    'french language',
    'italian language',
    'chinese language',
    'japanese language',
    'mathematics',
    'mental math',
    'logic',
    'physics',
    'chemistry',
    'biology',
    'geography',
    'history',
    'literature',
    'reading',
    'writing',
    'grammar',
    'public speaking',
    'debating',
    'speed reading',
    'exam preparation',
    'cooking classes',
    'gardening',
    'pet care',
    'volunteering',
    'football',
    'basketball',
    'volleyball',
    'tennis',
    'table tennis',
    'badminton',
    'padel',
    'golf',
    'swimming',
    'synchronized swimming',
    'water polo',
    'diving',
    'athletics',
    'running',
    'cycling',
    'BMX',
    'skateboarding',
    'roller skating',
    'scooter riding',
    'parkour',
    'rock climbing',
    'horse riding',
    'equestrian sports',
    'karate',
    'taekwondo',
    'judo',
    'boxing',
    'brazilian jiu-jitsu',
    'fencing',
    'archery',
    'dance battles',
    'esports',
    'board games club',
    'billiards',
    'bowling',
    'sewing',
    'handicrafts',
    'fashion design',
    'cosplay',
    'mental math training',
    'memory development',
    'financial literacy',
    'entrepreneurship for kids',
    'leadership programs',
    'social clubs',
    'group travel',
    'camps',
    'tourism',
    'hiking',
    'camping',
    'eco projects',
    'journalism',
    'school newspaper',
    'podcasts',
    'voice acting',
    'kids fitness',
    'kids crossfit',
    'quest games',
    'role-playing games',
    'game creation',
    'app development',
    'AI courses',
    'investment basics for teens',
    'time management',
    'interest clubs',
  ]),
);
const STAFF_TASK_OPTIONS = Array.from(
  new Set([
    'prepare breakfast',
    'prepare lunch',
    'prepare dinner',
    'prepare snacks for children',
    'create a weekly menu',
    'make a grocery list',
    'do grocery shopping',
    'organize the fridge',
    'check food expiration dates',
    'clean the fridge',
    'freeze food',
    'defrost food',
    'prepare meals for several days',
    'set the table',
    'clear the table',
    'load the dishwasher',
    'unload the dishwasher',
    'wash dishes by hand',
    'clean kitchen appliances',
    'wipe kitchen surfaces',
    'clean the stove',
    'clean the oven',
    'clean the microwave',
    'clean the sink',
    'take out the trash',
    'replace trash bags',
    'regular cleaning',
    'deep cleaning',
    'mop the floors',
    'vacuum',
    'sweep the floors',
    'dust surfaces',
    'clean mirrors',
    'clean windows',
    'clean window sills',
    'clean doors',
    'clean baseboards',
    'clean walls if needed',
    'tidy up toys',
    'put things back in place',
    'air out rooms',
    'change bed linens',
    'make the beds',
    'collect dirty laundry',
    'run laundry',
    'hang laundry to dry',
    'transfer laundry to dryer',
    'fold laundry',
    'iron clothes',
    'organize clothes in wardrobes',
    'organize the wardrobe',
    'sort clothes by season',
    'declutter clothes',
    'prepare clothes for donation',
    'organize closets',
    'organize shoes',
    'clean shoes',
    'prepare outfits for the next day',
    'prepare school uniforms',
    "pack children's bags",
    'prepare school snacks',
    'check backpacks',
    'wash baby bottles',
    'sterilize bottles',
    'prepare formula',
    'feed children',
    'wash children',
    'bathe children',
    'dress children',
    'change diapers',
    'put children to sleep',
    'go for a walk with children',
    'prepare items for a walk',
    'clean up after playtime',
    'organize activities for children',
    'read to children',
    'clean bathrooms',
    'clean toilets',
    'clean sinks',
    'clean the shower',
    'clean the bathtub',
    'replace towels',
    'restock toiletries',
    'water plants',
    'take care of plants',
    'clean the balcony',
    'clean the terrace',
    'wipe outdoor furniture',
    'sweep outdoor areas',
    'receive deliveries',
    'unpack groceries',
    'organize storage',
    'prepare the house for guests',
    'set the table for guests',
    'clean up after guests',
    'check household supplies',
    'make a household shopping list',
    'organize pantry storage',
    'organize the pantry',
    'maintain order throughout the day',
    'monitor kitchen cleanliness after cooking',
    "monitor cleanliness of children's areas",
    'check home safety',
    'prepare items for travel',
    'pack suitcases',
    'unpack suitcases',
    'organize items after travel',
    'feed pets',
    'provide fresh water for pets',
    'clean pet bowls',
    'clean feeding area',
    'walk the dog',
    'clean paws after walks',
    'clean the litter box',
    'replace litter',
    'remove pet hair',
    'vacuum pet areas',
    'clean pet beds',
    'wash pet beds',
    'brush pets',
    'bathe pets',
    'trim nails',
    "clean pets' ears",
    "monitor pets' health",
    'give medication if needed',
    'accompany to the vet',
    'order pet food and supplies',
    'unpack pet supplies',
    'tidy pet toys',
    "check cleanliness of pet areas",
  ]),
);

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { colors, themeName, setThemeName } = useTheme();
  const styles = useMemo(() => createStyles(colors, themeName), [colors, themeName]);
  const initialChildDraft = useMemo(
    () => ({
      name: '',
      dob: '',
      includeInMotherCalendar: true,
      activities: [] as DraftActivity[],
    }),
    [],
  );
  const [screen, setScreen] = useState<Screen>('calendar');
  const [role, setRole] = useState<UiRole>('mother');
  const [staffEnabled, setStaffEnabled] = useState(false);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingListDoc[]>([]);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<WeeklyMealPlanEntry[]>(createDefaultWeeklyMealPlan);
  const [nutritionGoal, setNutritionGoal] = useState<NutritionGoal>('maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [nutritionSex, setNutritionSex] = useState<NutritionSex>('female');
  const [desiredWeight, setDesiredWeight] = useState('');
  const [nutritionPace, setNutritionPace] = useState<NutritionPace>('flexible');
  const [calorieOverride, setCalorieOverride] = useState('');
  const [nutritionEntries, setNutritionEntries] = useState<NutritionFoodEntry[]>([]);
  const [habits, setHabits] = useState<HabitEntry[]>([]);
  const [habitChallenges] = useState<HabitChallenge[]>([]);
  const [habitRemindersEnabled, setHabitRemindersEnabled] = useState(true);
  const [importedEmailEvents, setImportedEmailEvents] = useState<ImportedEmailEvent[]>([]);
  const [shoppingShares, setShoppingShares] = useState<ShoppingShare[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [session, setSession] = useState<AppSession | null>(null);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [personalProfileStatus, setPersonalProfileStatus] = useState<string | null>(null);
  const [personalProfileError, setPersonalProfileError] = useState<string | null>(null);
  const [personalProfileReadonly, setPersonalProfileReadonly] = useState(false);
  const [savedPersonalFullName, setSavedPersonalFullName] = useState('');
  const [savedPersonalDateOfBirth, setSavedPersonalDateOfBirth] = useState('');

  const [calendarScope, setCalendarScope] = useState<CalendarScope>('all');
  const [activeOwnerFilter, setActiveOwnerFilter] = useState<string>('mother');
  const [activeChildRoleId, setActiveChildRoleId] = useState<string | null>(null);
  const [activeStaffProfileId, setActiveStaffProfileId] = useState<string | null>(null);
  const [parentLabel, setParentLabel] = useState<ParentLabel>('Mom');
  const [personalProfile, setPersonalProfile] = useState<PersonalProfile>({
    fullName: '',
    nickname: '',
    dateOfBirth: '',
    heightCm: '',
    weightKg: '',
    cycleTrackingEnabled: false,
    cycleLastPeriodStart: '',
    cycleLengthDays: '28',
    cyclePeriodLengthDays: '5',
    cycleEntries: [],
  });
  const [childDraftName, setChildDraftName] = useState(initialChildDraft.name);
  const [childDraftDob, setChildDraftDob] = useState(initialChildDraft.dob);
  const [childDraftIncludeInMotherCalendar, setChildDraftIncludeInMotherCalendar] = useState(initialChildDraft.includeInMotherCalendar);
  const [childSetupOpen, setChildSetupOpen] = useState(false);
  const [staffSetupOpen, setStaffSetupOpen] = useState(false);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [staffDraftName, setStaffDraftName] = useState('');
  const [staffDraftDob, setStaffDraftDob] = useState('');
  const [staffDraftTasks, setStaffDraftTasks] = useState<StaffDraftTask[]>([createDefaultStaffDraftTask()]);
  const [completedTaskNotifications, setCompletedTaskNotifications] = useState<CompletedTaskNotification[]>([]);
  const [staffReminderNotifications, setStaffReminderNotifications] = useState<StaffReminderNotification[]>([]);
  const [completedTasksOpen, setCompletedTasksOpen] = useState(false);
  const [taskNotificationsFilter, setTaskNotificationsFilter] = useState<TaskNotificationsFilter>('all');
  const [taskHistoryFilterOpen, setTaskHistoryFilterOpen] = useState(false);
  const [taskHistoryFilter, setTaskHistoryFilter] = useState<TaskHistoryFilter>(DEFAULT_TASK_HISTORY_FILTER);
  const [taskHistoryDaysInput, setTaskHistoryDaysInput] = useState('');
  const [taskHistoryDateInput, setTaskHistoryDateInput] = useState('');
  const [childDraftActivities, setChildDraftActivities] = useState<DraftActivity[]>(
    initialChildDraft.activities.length > 0 ? initialChildDraft.activities : [createDefaultDraftActivity()],
  );
  const [openWeekDayPickerFor, setOpenWeekDayPickerFor] = useState<string | null>(null);
  const [childTimePickerOpen, setChildTimePickerOpen] = useState(false);
  const [childTimeActivityId, setChildTimeActivityId] = useState<string | null>(null);
  const [childTimeEditorMode, setChildTimeEditorMode] = useState<'draft' | 'child' | 'staff'>('draft');
  const [activitySuggestionOpenFor, setActivitySuggestionOpenFor] = useState<string | null>(null);
  const [childDialStep, setChildDialStep] = useState<'hour' | 'minute'>('hour');
  const [childDialHour, setChildDialHour] = useState(10);
  const [childDialMinute, setChildDialMinute] = useState(0);
  const [childDialPeriod, setChildDialPeriod] = useState<'AM' | 'PM'>('AM');
  const childDialPeriodRef = useRef<'AM' | 'PM'>('AM');
  const filtersHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferencesLoadedRef = useRef(false);
  const manualThemeSelectionRef = useRef(false);
  const latestPersonalProfileRef = useRef<PersonalProfile>({
    fullName: '',
    nickname: '',
    dateOfBirth: '',
    heightCm: '',
    weightKg: '',
    cycleTrackingEnabled: false,
    cycleLastPeriodStart: '',
    cycleLengthDays: '28',
    cyclePeriodLengthDays: '5',
    cycleEntries: [],
  });
  const savedPersonalFullNameRef = useRef('');
  const savedPersonalDateOfBirthRef = useRef('');
  const sessionRef = useRef<AppSession | null>(null);
  const [childActivitiesModalOpen, setChildActivitiesModalOpen] = useState(false);
  const [childActionsOpen, setChildActionsOpen] = useState(false);
  const [filtersEditHover, setFiltersEditHover] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildName, setEditingChildName] = useState('');
  const [editingChildDob, setEditingChildDob] = useState('');
  const [editingChildIncludeInMotherCalendar, setEditingChildIncludeInMotherCalendar] = useState(true);
  const [editingChildActivities, setEditingChildActivities] = useState<DraftActivity[]>([]);
  const [lastSelectedChildId, setLastSelectedChildId] = useState<string | null>(null);
  const [pendingEditChildId, setPendingEditChildId] = useState<string | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const roleDisplayTabs = useMemo(() => {
    const tabs: Array<{ key: string; label: string; role: Role; childId?: string; staffProfileId?: string }> = [];
    tabs.push({ key: 'mother', label: parentLabel, role: 'mother' });
    if (children.length > 0) {
      children.forEach((child) => tabs.push({ key: `child-${child.id}`, label: child.name, role: 'child', childId: child.id }));
    }
    if (staffProfiles.length > 0) {
      staffProfiles.forEach((profile) =>
        tabs.push({
          key: `staff-${profile.id}`,
          label: profile.name,
          role: 'staff',
          staffProfileId: profile.id,
        }),
      );
    }
    return tabs;
  }, [children, staffProfiles, parentLabel]);
  const shoppingShareTargets = useMemo(
    () => [
      { key: 'parent:Mom', label: 'Mom' },
      { key: 'parent:Dad', label: 'Dad' },
      ...staffProfiles.map((profile) => ({ key: `staff:${profile.id}`, label: profile.name })),
    ],
    [staffProfiles],
  );
  const activeShoppingRecipientKey = useMemo(() => {
    if (role === 'child' && activeChildRoleId) return `child:${activeChildRoleId}`;
    if (role === 'staff' && activeStaffProfileId) return `staff:${activeStaffProfileId}`;
    return `parent:${parentLabel}`;
  }, [activeChildRoleId, activeStaffProfileId, parentLabel, role]);
  const visibleShoppingShares = useMemo(
    () => shoppingShares.filter((share) => share.recipientKey === activeShoppingRecipientKey),
    [activeShoppingRecipientKey, shoppingShares],
  );
  const currentShoppingActorLabel = useMemo(() => {
    if (role === 'child' && activeChildRoleId) return children.find((child) => child.id === activeChildRoleId)?.name || 'Child profile';
    if (role === 'staff' && activeStaffProfileId) return staffProfiles.find((profile) => profile.id === activeStaffProfileId)?.name || 'Staff profile';
    return parentLabel;
  }, [activeChildRoleId, activeStaffProfileId, children, parentLabel, role, staffProfiles]);
  const overdueStaffTasks = useMemo(
    () =>
      tasks.filter((task) => task.assigneeRole === 'staff' && task.status !== 'done' && isTaskOverdue(task.deadline)).sort((a, b) => {
        const aTime = parseTaskDeadline(a.deadline)?.getTime() ?? 0;
        const bTime = parseTaskDeadline(b.deadline)?.getTime() ?? 0;
        return bTime - aTime;
      }),
    [tasks],
  );
  const taskNotificationsCutoff = useMemo(
    () => getTaskHistoryCutoff(taskHistoryFilter, taskHistoryDaysInput, taskHistoryDateInput),
    [taskHistoryDateInput, taskHistoryDaysInput, taskHistoryFilter],
  );
  const taskNotificationEntries = useMemo<TaskNotificationEntry[]>(
    () =>
      [
        ...overdueStaffTasks.map((task) => ({
          id: `overdue-${task.id}`,
          kind: 'not_completed' as const,
          title: task.title,
          staffName: task.assigneeName,
          happenedAt: parseTaskDeadline(task.deadline)?.toISOString() ?? new Date().toISOString(),
          deadline: task.deadline,
          taskId: task.id,
        })),
        ...completedTaskNotifications.map((item) => ({
          id: item.id,
          kind: 'completed' as const,
          title: item.taskTitle,
          staffName: item.staffName,
          happenedAt: item.completedAt,
          taskId: item.taskId,
        })),
      ].sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime()),
    [completedTaskNotifications, overdueStaffTasks],
  );
  const visibleTaskNotificationEntries = useMemo(
    () =>
      taskNotificationEntries.filter((item) => {
        if (taskNotificationsFilter !== 'all' && item.kind !== taskNotificationsFilter) return false;
        return isTaskNotificationInRange(item.happenedAt, taskNotificationsCutoff);
      }),
    [taskNotificationEntries, taskNotificationsCutoff, taskNotificationsFilter],
  );
  const activeTaskNotificationEntries = useMemo(
    () => taskNotificationEntries.filter((item) => isTaskNotificationInRange(item.happenedAt, getTaskHistoryCutoff(DEFAULT_TASK_HISTORY_FILTER, '', ''))),
    [taskNotificationEntries],
  );
  const taskNotificationCount = activeTaskNotificationEntries.length;
  const latestTaskNotificationText = activeTaskNotificationEntries[0]
    ? activeTaskNotificationEntries[0].kind === 'not_completed'
      ? `${activeTaskNotificationEntries[0].staffName} has not completed ${activeTaskNotificationEntries[0].title}`
      : `${activeTaskNotificationEntries[0].staffName} completed ${activeTaskNotificationEntries[0].title}`
    : taskNotificationEntries[0]
      ? taskNotificationEntries[0].kind === 'not_completed'
        ? `${taskNotificationEntries[0].staffName} has not completed ${taskNotificationEntries[0].title}`
        : `${taskNotificationEntries[0].staffName} completed ${taskNotificationEntries[0].title}`
      : 'No task notifications yet';
  const parentDisplayName = personalProfile.nickname?.trim() || personalProfile.fullName?.trim() || parentLabel;
  const birthdayEvents = useMemo(
    () =>
      buildBirthdayEvents({
        parentProfile: personalProfile,
        parentLabel,
        parentDisplayName,
        children,
        staffProfiles,
        yearsAhead: 6,
      }),
    [children, parentDisplayName, parentLabel, personalProfile, staffProfiles],
  );
  const calendarEventsWithBirthdays = useMemo(
    () => mergeCalendarEventsWithBirthdays(events, birthdayEvents),
    [birthdayEvents, events],
  );
  const childDialItems = childDialStep === 'hour' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 12 }, (_, i) => i * 5);
  const childDialDots = useMemo(() => {
    const size = 230;
    const center = size / 2;
    const radius = 88;
    return childDialItems.map((item, index) => {
      const angle = (Math.PI * 2 * index) / 12 - Math.PI / 2;
      return {
        value: item,
        left: center + Math.cos(angle) * radius - 19,
        top: center + Math.sin(angle) * radius - 19,
      };
    });
  }, [childDialItems]);

  const childColorPalette = CHILD_COLOR_PALETTE;

  async function refreshLiveTasks(current: AppSession | null = session) {
    if (!current) return;
    setTasksLoading(true);
    setTasksError(null);
    try {
      const [liveTasks, liveRequests] = await Promise.all([listTasks(current.familyId), listApprovalRequests(current.familyId)]);
      setTasks(applyParentLabelToTasks(liveTasks, parentLabel));
      setRequests(liveRequests);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync tasks.';
      setTasksError(message);
    } finally {
      setTasksLoading(false);
    }
  }

  async function refreshLiveCalendar(current: AppSession | null = session) {
    if (!current) return;
    try {
      const liveEvents = await listCalendarEvents(current.familyId);
      setEvents(applyParentLabelToEvents(liveEvents, parentLabel));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync calendar.';
      setTasksError(message);
    }
  }

  async function refreshLiveChildren(current: AppSession | null = session) {
    if (!current) return;
    try {
      const liveChildren = await listChildProfiles(current.familyId);
      setChildren(enforceUniqueChildActivityColors(liveChildren, CHILD_COLOR_PALETTE));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync children.';
      setTasksError(message);
    }
  }

  async function refreshLiveStaffProfiles(current: AppSession | null = session) {
    if (!current) return;
    try {
      const liveStaffProfiles = await listStaffProfiles(current.familyId);
      if (liveStaffProfiles.length === 0) {
        setStaffProfiles([]);
        setStaffEnabled(false);
        return;
      }
      setStaffProfiles(
        liveStaffProfiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          dateOfBirth: profile.dateOfBirth,
          tasks: profile.tasks.map((task) => ({
            ...task,
            weekDays: Array.isArray(task.weekDays) ? task.weekDays : [],
          })),
        })),
      );
      setStaffEnabled(liveStaffProfiles.length > 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync staff profiles.';
      setTasksError(message);
    }
  }

  async function refreshMyPersonalProfile(current: AppSession | null = session) {
    if (!current) return;
    try {
      const profile = await getMyProfile();
      if (!profile) return;
      const currentProfile = latestPersonalProfileRef.current;
      const nextFullName = (profile.fullName || '').trim() || savedPersonalFullNameRef.current || currentProfile.fullName || '';
      const nextNickname = (profile.nickname || '').trim() || currentProfile.nickname || '';
      const nextDateOfBirth = profile.dateOfBirth || savedPersonalDateOfBirthRef.current || currentProfile.dateOfBirth || '';
      const nextProfile: PersonalProfile = {
        fullName: nextFullName,
        nickname: nextNickname,
        dateOfBirth: nextDateOfBirth,
        heightCm: profile.heightCm || currentProfile.heightCm || '',
        weightKg: profile.weightKg || currentProfile.weightKg || '',
        cycleTrackingEnabled: typeof profile.cycleTrackingEnabled === 'boolean' ? profile.cycleTrackingEnabled : !!currentProfile.cycleTrackingEnabled,
        cycleLastPeriodStart: profile.cycleLastPeriodStart || currentProfile.cycleLastPeriodStart || '',
        cycleLengthDays: profile.cycleLengthDays || currentProfile.cycleLengthDays || '28',
        cyclePeriodLengthDays: profile.cyclePeriodLengthDays || currentProfile.cyclePeriodLengthDays || '5',
        cycleEntries: profile.cycleEntries?.length ? profile.cycleEntries : currentProfile.cycleEntries || [],
      };
      latestPersonalProfileRef.current = nextProfile;
      setPersonalProfile(nextProfile);
      setSavedPersonalFullName(nextFullName);
      setSavedPersonalDateOfBirth(nextDateOfBirth);
      savedPersonalFullNameRef.current = nextFullName;
      savedPersonalDateOfBirthRef.current = nextDateOfBirth;
      if (nextFullName.trim()) {
        setPersonalProfileReadonly(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync personal profile.';
      setTasksError(message);
    }
  }

  async function refreshLiveShopping(current: AppSession | null = session) {
    if (!current) return;
    try {
      const [liveLists, liveShares, livePurchaseRequests] = await Promise.all([
        listShoppingLists(current.familyId),
        listShoppingShares(current.familyId),
        listPurchaseRequests(current.familyId),
      ]);
      setShoppingLists(liveLists);
      setShoppingShares(liveShares);
      setPurchaseRequests(livePurchaseRequests);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync shopping.';
      setTasksError(message);
    }
  }

  async function refreshLiveRecipes(current: AppSession | null = session) {
    if (!current) return;
    try {
      const liveRecipes = await listRecipes(current.familyId);
      setRecipes(liveRecipes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync recipes.';
      setTasksError(message);
    }
  }

  async function refreshLiveWeeklyMealPlan(current: AppSession | null = session) {
    if (!current) return;
    try {
      const liveWeeklyPlan = await listWeeklyMealPlan(current.familyId);
      if (liveWeeklyPlan.length > 0) setWeeklyMealPlan(mergeWeeklyMealPlan(liveWeeklyPlan));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync weekly meal plan.';
      setTasksError(message);
    }
  }

  function handleWeeklyMealPlanChange(action: SetStateAction<WeeklyMealPlanEntry[]>) {
    setWeeklyMealPlan((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (session) {
        upsertWeeklyMealPlan(session, next).catch((error) => {
          const message = error instanceof Error ? error.message : 'Failed to save weekly meal plan.';
          setTasksError(message);
        });
      }
      return next;
    });
  }

  async function refreshLiveNotifications(current: AppSession | null = session) {
    if (!current) return;
    try {
      const [liveCompleted, liveReminders] = await Promise.all([
        listCompletedTaskNotifications(current.familyId),
        listStaffReminderNotifications(current.familyId),
      ]);
      setCompletedTaskNotifications(
        liveCompleted.map((item) => ({
          id: item.id,
          taskId: item.taskId,
          taskTitle: item.taskTitle,
          staffName: item.staffName,
          completedAt: item.completedAt,
          read: item.read,
        })),
      );
      setStaffReminderNotifications(
        liveReminders.map((item) => ({
          id: item.id,
          taskId: item.taskId,
          taskTitle: item.taskTitle,
          staffName: item.staffName,
          sentAt: item.sentAt,
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync notifications.';
      setTasksError(message);
    }
  }

  async function refreshUserPreferences(current: AppSession | null = session) {
    if (!current) return;
    try {
      const preferences = await getUserPreferences(current);
      if (preferences?.parentLabel) setParentLabel(preferences.parentLabel);
      if (!manualThemeSelectionRef.current && preferences?.themeName && preferences.themeName in themePalettes) {
        setThemeName(preferences.themeName);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync preferences.';
      setTasksError(message);
    } finally {
      preferencesLoadedRef.current = true;
    }
  }

  async function hydrateSessionContext(ctx: AppSession) {
    setSession(ctx);
    setRole(toUiRole(ctx.role));
    await Promise.all([
      refreshLiveTasks(ctx),
      refreshLiveCalendar(ctx),
      refreshLiveChildren(ctx),
      refreshLiveStaffProfiles(ctx),
      refreshMyPersonalProfile(ctx),
      refreshLiveShopping(ctx),
      refreshLiveRecipes(ctx),
      refreshLiveWeeklyMealPlan(ctx),
      refreshLiveNotifications(ctx),
      refreshUserPreferences(ctx),
      listHabitEntries(ctx).then(setHabits),
      listNutritionEntries(ctx).then(setNutritionEntries),
    ]);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    async function bootstrap() {
      try {
        const ctx = await getOrCreateSessionContext();
        if (cancelled) return;
        if (ctx) {
          await hydrateSessionContext(ctx);
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Could not load live session.';
        setTasksError(message);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (!sessionRef.current) return;
        resetSignedOutState();
        return;
      }
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED' && event !== 'USER_UPDATED') return;

      Promise.resolve()
        .then(() => getOrCreateSessionContext())
        .then((ctx) => {
          if (!ctx) return;
          return hydrateSessionContext(ctx);
        })
        .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not restore live session.'));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    setChildren((prev) => enforceUniqueChildActivityColors(prev, CHILD_COLOR_PALETTE));
  }, [children]);

  useEffect(() => {
    latestPersonalProfileRef.current = personalProfile;
  }, [personalProfile]);

  useEffect(() => {
    savedPersonalFullNameRef.current = savedPersonalFullName;
  }, [savedPersonalFullName]);

  useEffect(() => {
    savedPersonalDateOfBirthRef.current = savedPersonalDateOfBirth;
  }, [savedPersonalDateOfBirth]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured || !preferencesLoadedRef.current) return;
    upsertUserPreferences(session, { parentLabel, themeName }).catch((error) =>
      setTasksError(error instanceof Error ? error.message : 'Could not save preferences.'),
    );
  }, [session, parentLabel, themeName]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured || !preferencesLoadedRef.current) return;
    replaceHabitEntries(session, habits).catch((error) =>
      setTasksError(error instanceof Error ? error.message : 'Could not save habits.'),
    );
  }, [session, habits]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured || !preferencesLoadedRef.current) return;
    replaceNutritionEntries(session, nutritionEntries).catch((error) =>
      setTasksError(error instanceof Error ? error.message : 'Could not save nutrition entries.'),
    );
  }, [session, nutritionEntries]);

  useEffect(() => {
    setTasks((prev) => applyParentLabelToTasks(prev, parentLabel));
    setEvents((prev) => applyParentLabelToEvents(prev, parentLabel));
  }, [parentLabel]);

  useEffect(() => {
    if (role !== 'child') return;
    if (children.length === 0) return;
    if (!activeChildRoleId || !children.some((child) => child.id === activeChildRoleId)) {
      setActiveChildRoleId(children[0].id);
    }
  }, [role, children, activeChildRoleId]);

  useEffect(() => {
    setChildActionsOpen(false);
  }, [screen, role, activeChildRoleId]);

  useEffect(() => {
    if (!pendingEditChildId) return;
    openChildActivitiesEditor(pendingEditChildId);
    setPendingEditChildId(null);
  }, [pendingEditChildId, children]);

  useEffect(() => {
    return () => {
      if (filtersHoverTimeoutRef.current) clearTimeout(filtersHoverTimeoutRef.current);
    };
  }, []);

  function showFiltersEditHover() {
    if (filtersHoverTimeoutRef.current) {
      clearTimeout(filtersHoverTimeoutRef.current);
      filtersHoverTimeoutRef.current = null;
    }
    setFiltersEditHover(true);
  }

  function hideFiltersEditHover() {
    if (filtersHoverTimeoutRef.current) clearTimeout(filtersHoverTimeoutRef.current);
    filtersHoverTimeoutRef.current = setTimeout(() => {
      setFiltersEditHover(false);
      filtersHoverTimeoutRef.current = null;
    }, 140);
  }

  function resetSignedOutState() {
    setSession(null);
    setTasks([]);
    setEvents([]);
    setChildren([]);
    setStaffProfiles([]);
    setShoppingLists([]);
    setRecipes([]);
    setWeeklyMealPlan(createDefaultWeeklyMealPlan());
    setFridgeItems([]);
    setNutritionGoal('maintain');
    setActivityLevel('moderate');
    setNutritionSex('female');
    setDesiredWeight('');
    setNutritionPace('flexible');
    setCalorieOverride('');
    setNutritionEntries([]);
    setShoppingShares([]);
    setPurchaseRequests([]);
    setRequests([]);
    setImportedEmailEvents([]);
    setHabits([]);
    setCompletedTaskNotifications([]);
    setStaffReminderNotifications([]);
    setParentLabel('Mom');
    setPersonalProfile({
      fullName: '',
      nickname: '',
      dateOfBirth: '',
      heightCm: '',
      weightKg: '',
      cycleTrackingEnabled: false,
      cycleLastPeriodStart: '',
      cycleLengthDays: '28',
      cyclePeriodLengthDays: '5',
      cycleEntries: [],
    });
    latestPersonalProfileRef.current = {
      fullName: '',
      nickname: '',
      dateOfBirth: '',
      heightCm: '',
      weightKg: '',
      cycleTrackingEnabled: false,
      cycleLastPeriodStart: '',
      cycleLengthDays: '28',
      cyclePeriodLengthDays: '5',
      cycleEntries: [],
    };
    setSavedPersonalFullName('');
    setSavedPersonalDateOfBirth('');
    savedPersonalFullNameRef.current = '';
    savedPersonalDateOfBirthRef.current = '';
    setPersonalProfileReadonly(false);
    setPersonalProfileStatus(null);
    setPersonalProfileError(null);
    preferencesLoadedRef.current = false;
    manualThemeSelectionRef.current = false;
    setThemeName('blue');
    setAccountMenuOpen(false);
  }

  async function handleRecipeCreate(recipe: Recipe): Promise<Recipe> {
    if (session && isSupabaseConfigured) {
      const savedRecipeId = await createRecipe(session, recipe);
      const savedRecipe = { ...recipe, id: savedRecipeId };
      setRecipes((prev) => mergeRecipes([savedRecipe, ...prev], []));
      return savedRecipe;
    }

    setRecipes((prev) => mergeRecipes([recipe, ...prev], []));
    return recipe;
  }

  function openAuthMenu(mode: AuthMode) {
    setTasksError(null);
    setAuthInfo(null);
    setAuthMode(mode);
    setSignInModalOpen(true);
    setAccountMenuOpen(false);
  }

  function selectCalendarProfile(target: string) {
    if (target === 'mother') {
      setRole('mother');
      setActiveChildRoleId(null);
      setActiveStaffProfileId(null);
      setActiveOwnerFilter('mother');
      setScreen('calendar');
      setChildActionsOpen(false);
      return;
    }

    if (target.startsWith('child:')) {
      const childId = target.replace('child:', '');
      setRole('child');
      setActiveChildRoleId(childId);
      setActiveStaffProfileId(null);
      setLastSelectedChildId(childId);
      setActiveOwnerFilter(target);
      setScreen('calendar');
      setChildActionsOpen(false);
      return;
    }

    if (target.startsWith('staff:')) {
      const staffId = target.replace('staff:', '');
      setRole('staff');
      setActiveStaffProfileId(staffId);
      setActiveChildRoleId(null);
      setActiveOwnerFilter(target);
      setScreen('calendar');
      setChildActionsOpen(false);
    }
  }

  function requestDelete(taskId: string) {
    if (session) {
      createDeleteApprovalRequest(session, taskId)
        .then(() => refreshLiveTasks())
        .catch((error) => setTasksError(error instanceof Error ? error.message : 'Request failed.'));
      return;
    }

    const newRequest: ApprovalRequest = {
      id: `r${Date.now()}`,
      taskId,
      requestedBy: 'child',
      action: 'delete',
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setRequests((prev) => [newRequest, ...prev]);
  }

  function resolveRequest(requestId: string, status: 'approved' | 'declined') {
    if (session) {
      resolveApprovalRequest(session, requestId, status)
        .then(() => refreshLiveTasks())
        .catch((error) => setTasksError(error instanceof Error ? error.message : 'Resolve failed.'));
      return;
    }

    const req = requests.find((r) => r.id === requestId);
    if (!req) return;

    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));

    if (status === 'approved') {
      setTasks((prev) => prev.filter((task) => task.id !== req.taskId));
    }
  }

  function addChildDraftActivity() {
    setOpenWeekDayPickerFor(null);
    setChildTimePickerOpen(false);
    setChildTimeActivityId(null);
    setChildDraftActivities((prev) => [...prev, createDefaultDraftActivity(childColorPalette[prev.length % childColorPalette.length])]);
  }

  function addEditingChildActivity() {
    setOpenWeekDayPickerFor(null);
    setChildTimePickerOpen(false);
    setChildTimeActivityId(null);
    setEditingChildActivities((prev) => [...prev, createDefaultDraftActivity(childColorPalette[prev.length % childColorPalette.length])]);
  }

  function removeEditingChildActivity(activityId: string) {
    setEditingChildActivities((prev) => {
      const next = prev.filter((activity) => activity.id !== activityId);
      return next.length > 0 ? next : [createDefaultDraftActivity('#3b82f6')];
    });
    if (openWeekDayPickerFor === activityId) setOpenWeekDayPickerFor(null);
  }

  function toggleWeekDay(activityId: string, dayCode: WeekDayCode, target: 'draft' | 'child') {
    const updater = (source: DraftActivity[]) =>
      source.map((activity) => {
        if (activity.id !== activityId) return activity;
        const hasDay = activity.weekDays.includes(dayCode);
        const nextWeekDays = hasDay ? activity.weekDays.filter((day) => day !== dayCode) : [...activity.weekDays, dayCode];
        return { ...activity, weekDays: nextWeekDays, timesPerWeek: String(nextWeekDays.length || 1) };
      });

    if (target === 'child') {
      setEditingChildActivities((prev) => updater(prev));
      return;
    }
    setChildDraftActivities((prev) => updater(prev));
  }

  function openChildTimePicker(activityId: string, sourceTime: string, target: 'draft' | 'child' | 'staff' = 'draft') {
    const parsed = parseTimeValue(sourceTime);
    setChildTimeEditorMode(target);
    setChildTimeActivityId(activityId);
    setChildDialHour(parsed.hour);
    setChildDialMinute(parsed.minute);
    childDialPeriodRef.current = parsed.period;
    setChildDialPeriod(parsed.period);
    setChildDialStep('hour');
    setChildTimePickerOpen(true);
  }

  function applyPickedChildTime(hour: number, minute: number, period: 'AM' | 'PM') {
    const next = formatClockTime(hour, minute, period);
    if (!childTimeActivityId) return;
    if (childTimeEditorMode === 'child') {
      setEditingChildActivities((prev) =>
        prev.map((activity) => (activity.id === childTimeActivityId ? { ...activity, time: next, timeSlots: [next] } : activity)),
      );
    } else if (childTimeEditorMode === 'staff') {
      setStaffDraftTasks((prev) => prev.map((task) => (task.id === childTimeActivityId ? { ...task, time: next } : task)));
    } else {
      setChildDraftActivities((prev) =>
        prev.map((activity) => (activity.id === childTimeActivityId ? { ...activity, time: next, timeSlots: [next] } : activity)),
      );
    }
  }

  function confirmChildTimePicker() {
    applyPickedChildTime(childDialHour, childDialMinute, childDialPeriodRef.current);
    setChildTimePickerOpen(false);
    setChildDialStep('hour');
  }

  function chooseChildDialValue(value: number) {
    if (childDialStep === 'hour') {
      setChildDialHour(value);
      setChildDialStep('minute');
      return;
    }

    setChildDialMinute(value);
    applyPickedChildTime(childDialHour, value, childDialPeriodRef.current);
    setChildTimePickerOpen(false);
    setChildDialStep('hour');
  }

  function openChildActivitiesEditor(childId: string) {
    const child = children.find((item) => item.id === childId);
    if (!child) return;
    setEditingChildId(child.id);
    setEditingChildName(child.name);
    setEditingChildDob(child.dateOfBirth || '');
    setEditingChildIncludeInMotherCalendar(child.includeInMotherCalendar ?? true);
    setEditingChildActivities(
      child.activities.length > 0
        ? child.activities.map((activity) => ({
            id: activity.id || createDraftActivityId(),
            name: activity.name || '',
            timesPerWeek: String(Math.max(1, Number(activity.timesPerWeek) || 1)),
            time: normalizeTimeText(activity.time || '10:00 AM'),
            color: activity.color || '#64748b',
            weekDays: Array.isArray(activity.weekDays) ? activity.weekDays : [],
            timeSlots:
              Array.isArray(activity.timeSlots) && activity.timeSlots.length > 0
                ? activity.timeSlots.map((slot) => normalizeTimeText(slot))
                : [normalizeTimeText(activity.time || '10:00 AM')],
          }))
        : [createDefaultDraftActivity('#3b82f6')],
    );
    setOpenWeekDayPickerFor(null);
    setChildTimePickerOpen(false);
    setChildTimeActivityId(null);
    setChildActivitiesModalOpen(true);
  }

  function getEditTargetChildId() {
    if (activeChildRoleId && children.some((child) => child.id === activeChildRoleId)) return activeChildRoleId;
    if (lastSelectedChildId && children.some((child) => child.id === lastSelectedChildId)) return lastSelectedChildId;
    if (activeOwnerFilter.startsWith('child:')) {
      const fromFilter = activeOwnerFilter.replace('child:', '');
      if (children.some((child) => child.id === fromFilter)) return fromFilter;
    }
    return children[0]?.id ?? null;
  }

  function openProfileEditorFromMother() {
    if (activeOwnerFilter.startsWith('staff:')) {
      const staffId = activeOwnerFilter.replace('staff:', '');
      if (!staffProfiles.some((profile) => profile.id === staffId)) return;
      openStaffProfileEditor(staffId);
      setChildActionsOpen(false);
      return;
    }

    const targetId = getEditTargetChildId();
    if (!targetId) return;
    openChildActivitiesEditor(targetId);
    setChildActionsOpen(false);
  }

  function deleteChildById(childId: string) {
    const child = children.find((item) => item.id === childId);
    if (!child) return;

    const matchingChildIds = children
      .filter((item) => getChildSignature(item) === getChildSignature(child))
      .map((item) => item.id);
    const childNames = new Set(
      children
        .filter((item) => matchingChildIds.includes(item.id))
        .map((item) => item.name.toLowerCase()),
    );

    setChildren((prev) => prev.filter((item) => !matchingChildIds.includes(item.id)));
    setEvents((prev) =>
      prev.filter((event) => {
        if (event.ownerChildProfileId && matchingChildIds.includes(event.ownerChildProfileId)) return false;
        if (event.owner === 'child' && childNames.has(event.ownerName.toLowerCase())) return false;
        return true;
      }),
    );
    setTasks((prev) =>
      prev.filter((task) => {
        if (task.assigneeRole !== 'child') return true;
        return !childNames.has(task.assigneeName.toLowerCase());
      }),
    );

    if (activeChildRoleId && matchingChildIds.includes(activeChildRoleId)) setActiveChildRoleId(null);
    if (lastSelectedChildId && matchingChildIds.includes(lastSelectedChildId)) setLastSelectedChildId(null);
    if (activeOwnerFilter.startsWith('child:') && matchingChildIds.includes(activeOwnerFilter.replace('child:', ''))) setActiveOwnerFilter('mother');
    if (editingChildId && matchingChildIds.includes(editingChildId)) setChildActivitiesModalOpen(false);
    if (role === 'child' && activeChildRoleId && matchingChildIds.includes(activeChildRoleId)) setRole('mother');
  }

  function handleDeleteChildFromMenu() {
    const targetId = getEditTargetChildId();
    if (!targetId) return;

    const targetChild = children.find((child) => child.id === targetId);
    if (!targetChild) return;

    setChildActionsOpen(false);

    const performDelete = () => {
      const matchingChildIds = children
        .filter((child) => getChildSignature(child) === getChildSignature(targetChild))
        .map((child) => child.id);
      if (session) {
        Promise.all(matchingChildIds.map((id) => deleteChildProfile(session, id)))
          .then(() => {
            deleteChildById(targetId);
            return Promise.all([refreshLiveChildren(), refreshLiveCalendar()]);
          })
          .catch((error) => setTasksError(error instanceof Error ? error.message : 'Delete failed.'));
        return;
      }

      deleteChildById(targetId);
    };

    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      const confirmed = globalThis.confirm(`Delete "${targetChild.name}" profile?\nThis action cannot be undone.`);
      if (confirmed) performDelete();
      return;
    }

    Alert.alert('Delete child profile?', `Delete "${targetChild.name}" profile?\nThis action cannot be undone.`, [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: performDelete,
      },
    ]);
  }

  function handleDeleteChildDirect(childId: string) {
    const targetChild = children.find((child) => child.id === childId);
    if (!targetChild) return;

    const performDelete = () => {
      const matchingChildIds = children
        .filter((child) => getChildSignature(child) === getChildSignature(targetChild))
        .map((child) => child.id);

      if (session) {
        Promise.all(matchingChildIds.map((id) => deleteChildProfile(session, id)))
          .then(() => {
            deleteChildById(childId);
            return Promise.all([refreshLiveChildren(), refreshLiveCalendar()]);
          })
          .catch((error) => setTasksError(error instanceof Error ? error.message : 'Delete failed.'));
        return;
      }

      deleteChildById(childId);
    };

    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      const confirmed = globalThis.confirm(`Delete "${targetChild.name}" profile?\nThis action cannot be undone.`);
      if (confirmed) performDelete();
      return;
    }

    Alert.alert('Delete child profile?', `Delete "${targetChild.name}" profile?\nThis action cannot be undone.`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: performDelete },
    ]);
  }

  const showDeleteInChildMenu = role === 'child' || activeOwnerFilter.startsWith('child:');

  async function saveEditingChildActivities() {
    if (!editingChildId) return;
    const normalizedActivities = normalizeDraftActivities(editingChildActivities);

    const oldChild = children.find((child) => child.id === editingChildId);
    const oldChildName = oldChild?.name || editingChildName;
    const childName = editingChildName.trim() || oldChildName;
    const nextEvents = buildChildScheduleEvents({
      childId: editingChildId,
      childName,
      activities: normalizedActivities,
      includeInParentCalendar: editingChildIncludeInMotherCalendar,
      parentLabel,
      monthsAhead: AUTO_SCHEDULE_MONTHS_AHEAD,
    });

    if (session && isSupabaseConfigured) {
      try {
        const savedChildId = await upsertChildProfileRecord(session, {
          id: editingChildId,
          name: childName,
          age: editingChildDob.trim() ? calcAge(editingChildDob.trim()) : oldChild?.age || 0,
          dateOfBirth: editingChildDob.trim() || oldChild?.dateOfBirth,
          includeInMotherCalendar: editingChildIncludeInMotherCalendar,
          activities: normalizedActivities.map((activity, index) => ({
            id: activity.id || `a-${editingChildId}-${index + 1}`,
            name: activity.name,
            timesPerWeek: Math.max(1, Number(activity.timesPerWeek) || 1),
            time: activity.time,
            color: activity.color || '#64748b',
            weekDays: activity.weekDays,
            timeSlots: activity.timeSlots,
          })),
        });
        setChildren((prev) =>
          enforceUniqueChildActivityColors(
            prev.map((child) =>
              child.id === savedChildId
                ? {
                    ...child,
                    id: savedChildId,
                    name: childName,
                    dateOfBirth: editingChildDob.trim() || child.dateOfBirth,
                    age: editingChildDob.trim() ? calcAge(editingChildDob.trim()) : child.age,
                    includeInMotherCalendar: editingChildIncludeInMotherCalendar,
                    activities: normalizedActivities.map((activity, index) => ({
                      id: activity.id || `a-${savedChildId}-${index + 1}`,
                      name: activity.name,
                      timesPerWeek: Math.max(1, Number(activity.timesPerWeek) || 1),
                      time: activity.time,
                      color: activity.color || '#64748b',
                      weekDays: activity.weekDays,
                      timeSlots: activity.timeSlots,
                    })),
                  }
                : child,
            ),
            CHILD_COLOR_PALETTE,
          ),
        );
        await replaceGeneratedChildEvents(session, editingChildId, nextEvents);
        await Promise.all([refreshLiveChildren(), refreshLiveCalendar()]);
        setChildActivitiesModalOpen(false);
        setOpenWeekDayPickerFor(null);
        setChildTimePickerOpen(false);
        setChildTimeActivityId(null);
        return;
      } catch (error) {
        setTasksError(error instanceof Error ? error.message : 'Could not save child profile.');
        return;
      }
    }

    setChildren((prev) =>
      prev.map((child) =>
        child.id === editingChildId
          ? {
              ...child,
              name: editingChildName.trim() || child.name,
              dateOfBirth: editingChildDob.trim() || child.dateOfBirth,
              age: editingChildDob.trim() ? calcAge(editingChildDob.trim()) : child.age,
              includeInMotherCalendar: editingChildIncludeInMotherCalendar,
              activities: normalizedActivities.map((activity, index) => ({
                id: activity.id || `a-${editingChildId}-${index + 1}`,
                name: activity.name,
                timesPerWeek: Math.max(1, Number(activity.timesPerWeek) || 1),
                time: activity.time,
                color: activity.color || '#64748b',
                weekDays: activity.weekDays,
                timeSlots: activity.timeSlots,
              })),
            }
          : child,
      ),
    );

    setEvents((prev) => {
      const withoutOld = prev.filter((event) => !isAutoScheduleEventForChild(event, editingChildId, oldChildName));
      return [...withoutOld, ...nextEvents];
    });

    setChildActivitiesModalOpen(false);
    setOpenWeekDayPickerFor(null);
    setChildTimePickerOpen(false);
    setChildTimeActivityId(null);
  }

  async function saveChildProfileDraft() {
    const name = childDraftName.trim();
    const birthDateText = childDraftDob.trim();
    if (!name) {
      setTasksError('Enter child name.');
      return;
    }
    if (!birthDateText) {
      setTasksError('Enter date of birth in DD.MM.YYYY.');
      return;
    }
    if (!isValidBirthDateInput(birthDateText)) {
      setTasksError('Use date format DD.MM.YYYY.');
      return;
    }

    const validActivities = normalizeDraftActivities(childDraftActivities);

    const optimisticChildId = `c${Date.now()}`;
    const age = calcAge(birthDateText);
    const optimisticEvents = buildChildScheduleEvents({
      childId: optimisticChildId,
      childName: name,
      activities: validActivities,
      includeInParentCalendar: childDraftIncludeInMotherCalendar,
      parentLabel,
      monthsAhead: AUTO_SCHEDULE_MONTHS_AHEAD,
    });

    if (session && isSupabaseConfigured) {
      try {
        const childId = await upsertChildProfileRecord(session, {
          name,
          age,
          dateOfBirth: birthDateText,
          includeInMotherCalendar: childDraftIncludeInMotherCalendar,
          activities: validActivities.map((activity, index) => ({
            id: `a-${optimisticChildId}-${index + 1}`,
            name: activity.name,
            timesPerWeek: Math.max(1, Number(activity.timesPerWeek) || 1),
            time: activity.time,
            color: activity.color || '#64748b',
            weekDays: activity.weekDays,
            timeSlots: activity.timeSlots,
          })),
        });
        setChildren((prev) =>
          enforceUniqueChildActivityColors(
            [
              ...prev,
              {
                id: childId,
                name,
                age,
                dateOfBirth: birthDateText,
                includeInMotherCalendar: childDraftIncludeInMotherCalendar,
                activities: validActivities.map((activity, index) => ({
                  id: `a-${childId}-${index + 1}`,
                  name: activity.name,
                  timesPerWeek: Math.max(1, Number(activity.timesPerWeek) || 1),
                  time: activity.time,
                  color: activity.color || '#64748b',
                  weekDays: activity.weekDays,
                  timeSlots: activity.timeSlots,
                })),
              },
            ],
            CHILD_COLOR_PALETTE,
          ),
        );
        await replaceGeneratedChildEvents(
          session,
          childId,
          optimisticEvents.map((event) => ({ ...event, id: event.id.replace(optimisticChildId, childId), ownerChildProfileId: childId })),
        );
        await Promise.all([refreshLiveChildren(), refreshLiveCalendar()]);
        setChildDraftName('');
        setChildDraftDob('');
        setChildDraftIncludeInMotherCalendar(true);
        setChildDraftActivities([createDefaultDraftActivity()]);
        setOpenWeekDayPickerFor(null);
        setChildTimePickerOpen(false);
        setChildTimeActivityId(null);
        setTasksError(null);
        return;
      } catch (error) {
        setTasksError(error instanceof Error ? error.message : 'Could not create child profile.');
        return;
      }
    }

    setChildren((prev) => [
      ...prev,
      {
        id: optimisticChildId,
        name,
        age,
        dateOfBirth: birthDateText,
        includeInMotherCalendar: childDraftIncludeInMotherCalendar,
        activities: validActivities.map((activity, index) => ({
          id: `a-${optimisticChildId}-${index + 1}`,
          name: activity.name,
          timesPerWeek: Math.max(1, Number(activity.timesPerWeek) || 1),
          time: activity.time,
          color: activity.color || '#64748b',
          weekDays: activity.weekDays,
          timeSlots: activity.timeSlots,
        })),
      },
    ]);

    setEvents((prev) => [
      ...prev,
      ...optimisticEvents,
    ]);

    setChildDraftName('');
    setChildDraftDob('');
    setChildDraftIncludeInMotherCalendar(true);
    setChildDraftActivities([createDefaultDraftActivity()]);
    setOpenWeekDayPickerFor(null);
    setChildTimePickerOpen(false);
    setChildTimeActivityId(null);
    setTasksError(null);
  }

  function addStaffDraftTask() {
    setStaffDraftTasks((prev) => [...prev, createDefaultStaffDraftTask()]);
  }

  function removeStaffDraftTask(taskId: string) {
    setStaffDraftTasks((prev) => {
      const next = prev.filter((task) => task.id !== taskId);
      return next.length > 0 ? next : [createDefaultStaffDraftTask()];
    });
  }

  function openStaffProfileEditor(staffId: string) {
    const profile = staffProfiles.find((item) => item.id === staffId);
    if (!profile) return;
    setEditingStaffId(staffId);
    setStaffDraftName(profile.name);
    setStaffDraftDob(profile.dateOfBirth || '');
    setStaffDraftTasks(profile.tasks.length > 0 ? profile.tasks.map((task) => ({ ...task })) : [createDefaultStaffDraftTask()]);
    setStaffSetupOpen(true);
    setChildSetupOpen(false);
    setTasksError(null);
  }

  function toggleStaffTaskWeekDay(taskId: string, dayCode: WeekDayCode) {
    setStaffDraftTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const hasDay = task.weekDays.includes(dayCode);
        return {
          ...task,
          weekDays: hasDay ? task.weekDays.filter((day) => day !== dayCode) : [...task.weekDays, dayCode],
        };
      }),
    );
  }

  async function saveStaffProfileDraft() {
    const staffName = staffDraftName.trim();
    const staffDob = staffDraftDob.trim();
    const validTasks = staffDraftTasks
      .map((task) => ({
        ...task,
        title: task.title.trim(),
        time: task.time.trim() ? normalizeTimeText(task.time.trim()) : '',
        weekDays: task.weekDays,
      }))
      .filter((task) => task.title);

    if (!staffName) {
      setTasksError('Enter staff name.');
      return;
    }
    if (staffDob && !isValidBirthDateInput(staffDob)) {
      setTasksError('Use date format DD.MM.YYYY for staff date of birth.');
      return;
    }
    if (validTasks.some((task) => task.weekDays.length === 0)) {
      setTasksError('Select weekdays for each staff task.');
      return;
    }
    const optimisticStaffId = editingStaffId || `staff-${Date.now()}`;
    const staffProfile: StaffProfile = {
      id: optimisticStaffId,
      name: staffName,
      dateOfBirth: staffDob || undefined,
      tasks: validTasks,
    };
    const schedule = buildStaffSchedule({
      staffId: optimisticStaffId,
      staffName,
      tasks: validTasks,
      monthsAhead: AUTO_SCHEDULE_MONTHS_AHEAD,
    });

    if (session && isSupabaseConfigured) {
      try {
        const staffId = await upsertStaffProfileRecord(session, {
          id: editingStaffId || undefined,
          name: staffName,
          dateOfBirth: staffDob || undefined,
          tasks: validTasks.map((task) => ({
            id: task.id,
            title: task.title,
            time: task.time,
            priority: task.priority,
            weekDays: task.weekDays,
          })),
        });
        await replaceGeneratedStaffSchedule(
          session,
          staffId,
          schedule.tasks.map((task) => ({
            ...task,
            id: task.id.replace(optimisticStaffId, staffId),
          })),
          schedule.events.map((event) => ({
            ...event,
            id: event.id.replace(optimisticStaffId, staffId),
          })),
        );
        await Promise.all([refreshLiveStaffProfiles(), refreshLiveTasks(), refreshLiveCalendar()]);
        setStaffEnabled(true);
        setRole('staff');
        setActiveStaffProfileId(staffId);
        setActiveOwnerFilter(`staff:${staffId}`);
        setScreen('calendar');
        setStaffDraftName('');
        setStaffDraftDob('');
        setStaffDraftTasks([createDefaultStaffDraftTask()]);
        setEditingStaffId(null);
        setStaffSetupOpen(false);
        setTasksError(null);
        return;
      } catch (error) {
        setTasksError(error instanceof Error ? error.message : 'Could not save staff profile.');
        return;
      }
    }

    setStaffProfiles((prev) =>
      editingStaffId ? prev.map((item) => (item.id === editingStaffId ? staffProfile : item)) : [staffProfile, ...prev],
    );
    setStaffEnabled(true);
    setRole('staff');
    setActiveStaffProfileId(optimisticStaffId);
    setActiveOwnerFilter(`staff:${optimisticStaffId}`);
    setScreen('calendar');
    setTasks((prev) => {
      const filtered = editingStaffId ? prev.filter((item) => !item.id.startsWith(`t-staff-${optimisticStaffId}-`)) : prev;
      return [...schedule.tasks, ...filtered];
    });
    setEvents((prev) => {
      const filtered = editingStaffId ? prev.filter((item) => !item.id.startsWith(`e-staff-${optimisticStaffId}-`)) : prev;
      return [...schedule.events, ...filtered];
    });

    setStaffDraftName('');
    setStaffDraftDob('');
    setStaffDraftTasks([createDefaultStaffDraftTask()]);
    setEditingStaffId(null);
    setStaffSetupOpen(false);
    setTasksError(null);
  }

  function markStaffTaskDone(taskId: string) {
    const task = tasks.find((item) => item.id === taskId && item.assigneeRole === 'staff');
    if (!task || task.status === 'done') return;

    const confirmCompletion = async () => {
      const completedAt = new Date().toISOString();
      if (session && isSupabaseConfigured) {
        try {
          await updateTaskStatus(taskId, 'done');
          await createCompletedTaskNotification(session, {
            taskId,
            taskTitle: task.title,
            staffName: task.assigneeName,
            completedAt,
            read: false,
          });
          await Promise.all([refreshLiveTasks(), refreshLiveNotifications()]);
          return;
        } catch (error) {
          setTasksError(error instanceof Error ? error.message : 'Could not mark task complete.');
          return;
        }
      }

      setTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, status: 'done' } : item)));
      setCompletedTaskNotifications((prev) => [
        {
          id: `completed-${Date.now()}`,
          taskId,
          taskTitle: task.title,
          staffName: task.assigneeName,
          completedAt,
          read: false,
        },
        ...prev,
      ]);
    };

    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      if (globalThis.confirm('Task completed?')) confirmCompletion();
      return;
    }

    Alert.alert('Task completed?', 'Mark this task as completed?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: confirmCompletion },
    ]);
  }

  async function handleSignIn() {
    if (authLoading) return;
    if (!authEmail.trim() || !authPassword.trim()) {
      setTasksError('Enter email and password.');
      return;
    }
    if (!isValidEmail(authEmail.trim())) {
      setTasksError('Enter a valid email.');
      return;
    }

    try {
      setAuthLoading(true);
      setTasksError(null);
      setAuthInfo(null);
      await signInWithEmail(authEmail.trim(), authPassword.trim());
      const ctx = await getOrCreateSessionContext();
      if (ctx) {
        setSignInModalOpen(false);
        setSession(ctx);
        setRole(toUiRole(ctx.role));
        await Promise.all([
          refreshLiveTasks(ctx),
          refreshLiveCalendar(ctx),
          refreshLiveChildren(ctx),
          refreshLiveStaffProfiles(ctx),
          refreshMyPersonalProfile(ctx),
          refreshLiveShopping(ctx),
          refreshLiveRecipes(ctx),
          refreshLiveNotifications(ctx),
          refreshUserPreferences(ctx),
        ]);
      }
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  function openTaskNotifications() {
    if (session && isSupabaseConfigured) {
      markCompletedTaskNotificationsRead(session)
        .then(() => refreshLiveNotifications())
        .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not update notifications.'));
    } else {
      setCompletedTaskNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    }
    setTaskNotificationsFilter('all');
    setTaskHistoryFilterOpen(false);
    setTaskHistoryFilter(DEFAULT_TASK_HISTORY_FILTER);
    setTaskHistoryDaysInput('');
    setTaskHistoryDateInput('');
    setCompletedTasksOpen(true);
  }

  function sendStaffTaskReminder(task: TaskItem) {
    if (task.assigneeRole !== 'staff') return;
    const sentAt = new Date().toISOString();
    if (session && isSupabaseConfigured) {
      upsertStaffReminderNotification(session, {
        taskId: task.id,
        taskTitle: task.title,
        staffName: task.assigneeName,
        sentAt,
      })
        .then(() => refreshLiveNotifications())
        .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not send reminder.'));
      return;
    }
    setStaffReminderNotifications((prev) => {
      const existing = prev.find((item) => item.taskId === task.id);
      if (existing) {
        return prev.map((item) => (item.taskId === task.id ? { ...item, sentAt } : item));
      }
      return [
        {
          taskId: task.id,
          taskTitle: task.title,
          staffName: task.assigneeName,
          sentAt,
        },
        ...prev,
      ];
    });
  }

  async function handleSignUp() {
    if (authLoading) return;
    if (!authName.trim() || !authEmail.trim() || !authPassword.trim() || !authPasswordConfirm.trim()) {
      setTasksError('Enter name, email, password and confirm password.');
      return;
    }
    if (!isValidEmail(authEmail.trim())) {
      setTasksError('Enter a valid email.');
      return;
    }
    if (authPassword.trim().length < 6) {
      setTasksError('Password must be at least 6 characters.');
      return;
    }
    if (authPassword !== authPasswordConfirm) {
      setTasksError('Passwords do not match.');
      return;
    }

    try {
      setAuthLoading(true);
      setTasksError(null);
      setAuthInfo(null);
      const result = await signUpWithEmail(authEmail.trim(), authPassword.trim(), authName.trim());

      if (result?.session) {
        await upsertMyProfile({ fullName: authName.trim() });
        const ctx = await getOrCreateSessionContext();
        if (ctx) {
          setSession(ctx);
          setRole(toUiRole(ctx.role));
          await Promise.all([
            refreshLiveTasks(ctx),
            refreshLiveCalendar(ctx),
            refreshLiveChildren(ctx),
            refreshLiveStaffProfiles(ctx),
            refreshMyPersonalProfile(ctx),
            refreshLiveShopping(ctx),
            refreshLiveRecipes(ctx),
            refreshLiveNotifications(ctx),
            refreshUserPreferences(ctx),
          ]);
        }
      } else {
        setAuthInfo('Account created. Check your email to confirm, then sign in.');
      }
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Sign-up failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (authLoading) return;
    const email = authEmail.trim();

    if (!email) {
      setTasksError('Enter your email first.');
      return;
    }
    if (!isValidEmail(email)) {
      setTasksError('Enter a valid email.');
      return;
    }

    try {
      setAuthLoading(true);
      setTasksError(null);
      setAuthInfo(null);
      await sendPasswordResetEmail(email);
      setAuthInfo('Password reset email sent. Check your inbox.');
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Could not send reset email.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function savePersonalProfile() {
    const rawFullName = personalProfile.fullName.trim();
    const fullName = rawFullName || savedPersonalFullNameRef.current || latestPersonalProfileRef.current.fullName || '';
    const nickname = personalProfile.nickname?.trim() || '';
    const rawDateOfBirth = personalProfile.dateOfBirth?.trim() || '';
    const dateOfBirth = rawDateOfBirth || savedPersonalDateOfBirthRef.current || latestPersonalProfileRef.current.dateOfBirth || '';
    const heightCm = personalProfile.heightCm?.trim() || '';
    const weightKg = personalProfile.weightKg?.trim().replace(',', '.') || '';
    const cycleTrackingEnabled = !!personalProfile.cycleTrackingEnabled;
    const cycleLastPeriodStart = personalProfile.cycleLastPeriodStart?.trim() || '';
    const cycleLengthDays = personalProfile.cycleLengthDays?.trim() || '';
    const cyclePeriodLengthDays = personalProfile.cyclePeriodLengthDays?.trim() || '';
    setPersonalProfileStatus(null);
    setPersonalProfileError(null);
    if (!fullName) {
      setPersonalProfileError('Enter your name.');
      return;
    }
    if (dateOfBirth && !isValidBirthDateInput(dateOfBirth)) {
      setPersonalProfileError('Use date format DD.MM.YYYY for your date of birth.');
      return;
    }
    if (personalProfile.heightCm?.trim() && !/^\d{2,3}$/.test(personalProfile.heightCm.trim())) {
      setPersonalProfileError('Height should be a number in cm.');
      return;
    }
    if (personalProfile.weightKg?.trim() && !/^\d{1,3}([.,]\d{1,2})?$/.test(personalProfile.weightKg.trim())) {
      setPersonalProfileError('Weight should be a number in kg.');
      return;
    }
    if (cycleTrackingEnabled && cycleLastPeriodStart && !isValidBirthDateInput(cycleLastPeriodStart)) {
      setPersonalProfileError('Use date format DD.MM.YYYY for period start.');
      return;
    }

    const normalizedProfile: PersonalProfile = {
      fullName,
      nickname,
      dateOfBirth,
      heightCm,
      weightKg,
      cycleTrackingEnabled,
      cycleLastPeriodStart,
      cycleLengthDays,
      cyclePeriodLengthDays,
      cycleEntries: personalProfile.cycleEntries || [],
    };

    latestPersonalProfileRef.current = normalizedProfile;
    setPersonalProfile(normalizedProfile);
    setSavedPersonalFullName(fullName);
    setSavedPersonalDateOfBirth(dateOfBirth);
    savedPersonalFullNameRef.current = fullName;
    savedPersonalDateOfBirthRef.current = dateOfBirth;

    if (session && isSupabaseConfigured) {
      try {
        await upsertMyProfile(normalizedProfile);
        await refreshMyPersonalProfile();
        setPersonalProfileError(null);
        setPersonalProfileStatus('Saved');
        setPersonalProfileReadonly(true);
        return;
      } catch (error) {
        setPersonalProfileStatus(null);
        setPersonalProfileError(getErrorMessage(error, 'Could not save personal data.'));
        return;
      }
    }

    setPersonalProfileError(null);
    setPersonalProfileStatus('Saved');
    setPersonalProfileReadonly(true);
  }

  async function handleMarkPeriodStart(dateKey: string) {
    const [yearText, monthText, dayText] = dateKey.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!year || !month || !day) return;

    const normalizedProfile: PersonalProfile = {
      ...personalProfile,
      cycleTrackingEnabled: true,
      cycleLastPeriodStart: `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`,
      cycleLengthDays: personalProfile.cycleLengthDays?.trim() || '28',
      cyclePeriodLengthDays: personalProfile.cyclePeriodLengthDays?.trim() || '5',
      cycleEntries: personalProfile.cycleEntries || [],
    };

    latestPersonalProfileRef.current = normalizedProfile;
    setPersonalProfile(normalizedProfile);
    setPersonalProfileError(null);
    setPersonalProfileStatus('Cycle updated');

    if (session && isSupabaseConfigured) {
      try {
        await upsertMyProfile(normalizedProfile);
      } catch (error) {
        setPersonalProfileStatus(null);
        setPersonalProfileError(getErrorMessage(error, 'Could not update cycle tracking.'));
      }
    }
  }

  async function handleSaveCycleEntry(entry: CycleDayEntry) {
    if (!entry.date) return;

    const nextEntries = [
      ...(personalProfile.cycleEntries || []).filter((item) => item.date !== entry.date),
      entry,
    ].sort((a, b) => a.date.localeCompare(b.date));

    const latestPeriodStartEntry = [...nextEntries]
      .filter((item) => item.isPeriodStart)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const normalizedProfile: PersonalProfile = {
      ...personalProfile,
      cycleTrackingEnabled: true,
      cycleLastPeriodStart: latestPeriodStartEntry
        ? (() => {
            const [startYearText, startMonthText, startDayText] = latestPeriodStartEntry.date.split('-');
            return `${String(Number(startDayText)).padStart(2, '0')}.${String(Number(startMonthText)).padStart(2, '0')}.${Number(startYearText)}`;
          })()
        : '',
      cycleLengthDays: personalProfile.cycleLengthDays?.trim() || '28',
      cyclePeriodLengthDays: personalProfile.cyclePeriodLengthDays?.trim() || '5',
      cycleEntries: nextEntries,
    };

    latestPersonalProfileRef.current = normalizedProfile;
    setPersonalProfile(normalizedProfile);
    setPersonalProfileError(null);
    setPersonalProfileStatus('Cycle entry saved');

    if (session && isSupabaseConfigured) {
      try {
        await upsertMyProfile(normalizedProfile);
      } catch (error) {
        setPersonalProfileStatus(null);
        setPersonalProfileError(getErrorMessage(error, 'Could not save cycle entry.'));
      }
    }
  }

  async function handleRemoveCycleEntry(dateKey: string) {
    const nextEntries = (personalProfile.cycleEntries || []).filter((item) => item.date !== dateKey);
    const latestPeriodStartEntry = [...nextEntries]
      .filter((item) => item.isPeriodStart)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    const normalizedProfile: PersonalProfile = {
      ...personalProfile,
      cycleLastPeriodStart: latestPeriodStartEntry
        ? (() => {
            const [startYearText, startMonthText, startDayText] = latestPeriodStartEntry.date.split('-');
            return `${String(Number(startDayText)).padStart(2, '0')}.${String(Number(startMonthText)).padStart(2, '0')}.${Number(startYearText)}`;
          })()
        : '',
      cycleEntries: nextEntries,
    };

    latestPersonalProfileRef.current = normalizedProfile;
    setPersonalProfile(normalizedProfile);
    setPersonalProfileError(null);
    setPersonalProfileStatus('Cycle entry removed');

    if (session && isSupabaseConfigured) {
      try {
        await upsertMyProfile(normalizedProfile);
      } catch (error) {
        setPersonalProfileStatus(null);
        setPersonalProfileError(getErrorMessage(error, 'Could not remove cycle entry.'));
      }
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.bgDecor}>
        <View style={styles.bgOrbA} />
        <View style={styles.bgOrbB} />
        <View style={styles.bgOrbC} />
      </View>
      <View style={styles.header}>
        <View>
          <Text style={styles.h1}>Smart Assistant</Text>
          <Text style={styles.sub}>UI Language: English</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.menuButton} onPress={() => setAccountMenuOpen((prev) => !prev)}>
            <View style={styles.menuButtonAvatar}>
              <Text style={styles.menuButtonAvatarText}>{session ? 'M' : 'A'}</Text>
            </View>
            <Text style={styles.menuButtonText}>{session ? 'Account' : 'Log in'}</Text>
          </Pressable>
        </View>
      </View>
      <Modal visible={accountMenuOpen} transparent animationType="fade" onRequestClose={() => setAccountMenuOpen(false)}>
        <View style={styles.accountMenuModalRoot}>
          <Pressable style={styles.menuBackdrop} onPress={() => setAccountMenuOpen(false)} />
          <View pointerEvents="box-none" style={styles.accountMenuModalLayer}>
            <View style={styles.accountMenu}>
              <View style={styles.accountMenuHeader}>
                <Text style={styles.accountMenuTitle}>Account</Text>
                <Text style={styles.accountMenuStatus}>{session ? getSessionRoleLabel(session.role, parentLabel) : 'Choose how to enter'}</Text>
              </View>

              {!session ? (
                <>
                  <Pressable style={styles.accountMenuPrimaryItem} onPress={() => openAuthMenu('signin')}>
                    <Text style={styles.accountMenuPrimaryItemText}>Log in</Text>
                  </Pressable>
                  <Pressable style={styles.accountMenuItem} onPress={() => openAuthMenu('signup')}>
                    <Text style={styles.accountMenuItemText}>Create account</Text>
                  </Pressable>
                </>
              ) : null}

              <View style={styles.accountMenuDivider} />

              <View style={styles.accountMenuSection}>
                <Text style={styles.accountMenuSectionLabel}>Theme</Text>
                <View style={styles.accountThemeSwatches}>
                  {(['grey', 'blue', 'blush', 'neonBloom', 'mocha'] as ThemeName[]).map((name) => (
                    <Pressable
                      key={name}
                      hitSlop={8}
                      style={[
                        styles.themeSwatch,
                        styles.accountThemeSwatch,
                        { backgroundColor: themePalettes[name].primary },
                        themeName === name && styles.themeSwatchActive,
                      ]}
                      onPress={() => {
                        manualThemeSelectionRef.current = true;
                        setThemeName(name);
                        setAccountMenuOpen(false);
                      }}
                    >
                      {themeName === name ? <View style={styles.accountThemeSwatchInner} /> : null}
                    </Pressable>
                  ))}
                </View>
              </View>

              {session ? (
                <>
                  <View style={styles.accountMenuDivider} />
                  <Pressable
                    style={[styles.accountMenuItem, styles.accountMenuDangerItem]}
                    onPress={() => {
                      signOut()
                        .then(() => resetSignedOutState())
                        .catch((error) => setTasksError(error instanceof Error ? error.message : 'Sign-out failed.'));
                    }}
                  >
                    <Text style={[styles.accountMenuItemText, styles.accountMenuDangerText]}>Sign out</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      {!isSupabaseConfigured ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>Supabase keys are not configured. Add .env values to connect live data.</Text>
        </View>
      ) : null}
      <Modal visible={signInModalOpen} transparent animationType="fade" onRequestClose={() => setSignInModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.signInModalCard}>
            <Text style={styles.authTitle}>{authMode === 'signup' ? 'Create Account' : 'Sign In'}</Text>
            {authMode === 'signup' ? (
              <TextInput placeholder="Full name" style={styles.input} value={authName} onChangeText={setAuthName} />
            ) : null}
            <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={styles.input} value={authEmail} onChangeText={setAuthEmail} />
            <TextInput placeholder="Password" secureTextEntry style={styles.input} value={authPassword} onChangeText={setAuthPassword} />
            {authMode === 'signup' ? (
              <TextInput
                placeholder="Confirm password"
                secureTextEntry
                style={styles.input}
                value={authPasswordConfirm}
                onChangeText={setAuthPasswordConfirm}
              />
            ) : null}
            {authInfo ? <Text style={styles.authInfoText}>{authInfo}</Text> : null}
            {authMode === 'signin' ? (
              <Pressable onPress={handlePasswordReset} disabled={authLoading}>
                <Text style={styles.authSwitchText}>Forgot password?</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                setTasksError(null);
                setAuthInfo(null);
                setAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
              }}
            >
              <Text style={styles.authSwitchText}>
                {authMode === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Text>
            </Pressable>
            <View style={styles.authActions}>
              <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={() => setSignInModalOpen(false)}>
                <Text style={[styles.authBtnText, styles.authSecondaryText]}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.authBtn, authLoading && styles.authBtnDisabled]}
                onPress={authMode === 'signup' ? handleSignUp : handleSignIn}
                disabled={authLoading}
              >
                <Text style={styles.authBtnText}>
                  {authLoading ? 'Please wait...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
      <View style={styles.parentToggleRow}>
        <View style={styles.roleRowWrapTop}>
          <View style={styles.parentPickerWrap}>
            <Pressable
              style={[styles.roleChip, parentLabel === 'Mom' && styles.roleChipActive]}
              onPress={() => {
                setParentLabel('Mom');
                selectCalendarProfile('mother');
              }}
            >
              <Text style={[styles.roleChipText, parentLabel === 'Mom' && styles.roleChipTextActive]}>Mom</Text>
            </Pressable>
            <Pressable
              style={[styles.roleChip, parentLabel === 'Dad' && styles.roleChipActive]}
              onPress={() => {
                setParentLabel('Dad');
                selectCalendarProfile('mother');
              }}
            >
              <Text style={[styles.roleChipText, parentLabel === 'Dad' && styles.roleChipTextActive]}>Dad</Text>
            </Pressable>
          </View>

          <View style={styles.roleRowTop}>
            {roleDisplayTabs
              .filter((tab) => tab.role !== 'mother')
              .map((tab) => {
                const isActive =
                  tab.role === 'child'
                    ? role === 'child' && activeChildRoleId === tab.childId
                    : role === 'staff' && activeStaffProfileId === tab.staffProfileId;
                return (
                  <Pressable
                    key={`top-${tab.key}`}
                    onPress={() =>
                      selectCalendarProfile(tab.role === 'child' ? `child:${tab.childId}` : `staff:${tab.staffProfileId}`)
                    }
                    style={[
                      styles.roleChip,
                      tab.role === 'staff' && styles.staffRoleChip,
                      isActive && styles.roleChipActive,
                      tab.role === 'staff' && isActive && styles.staffRoleChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        tab.role === 'staff' && styles.staffRoleChipText,
                        isActive && styles.roleChipTextActive,
                        tab.role === 'staff' && isActive && styles.staffRoleChipTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </View>
      </View>

      {children.length > 0 || staffProfiles.length > 0 ? (
        <View style={styles.roleRowWrap}>
          <View style={styles.childActionsWrap}>
            <Pressable
              style={[
                styles.childActionsBtn,
                children.length === 0 && staffProfiles.length === 0 && styles.childActionsBtnDisabled,
              ]}
              disabled={children.length === 0 && staffProfiles.length === 0}
              onPress={() => setChildActionsOpen((prev) => !prev)}
            >
              <Text style={styles.childActionsIcon}>⋮</Text>
            </Pressable>
            {childActionsOpen ? (
              <View style={styles.childActionsInlineMenu}>
                <Pressable
                  style={styles.childActionsModalItem}
                  onPress={openProfileEditorFromMother}
                >
                  <Text style={styles.childActionsMenuText}>Edit</Text>
                </Pressable>
                {showDeleteInChildMenu ? (
                  <Pressable
                    style={[styles.childActionsModalItem, styles.childActionsInlineDelete]}
                    onPress={() => {
                      setChildActionsOpen(false);
                      handleDeleteChildFromMenu();
                    }}
                  >
                    <Text style={[styles.childActionsMenuText, styles.childActionsDeleteText]}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {role === 'mother' ? (
        <>
          <View style={styles.authActions}>
            <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={() => setChildSetupOpen((prev) => !prev)}>
              <Text style={[styles.authBtnText, styles.authSecondaryText]}>
                {childSetupOpen ? 'Hide Child Profile Setup' : 'Child Profile Setup'}
              </Text>
            </Pressable>
            <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={() => setStaffSetupOpen((prev) => !prev)}>
              <Text style={[styles.authBtnText, styles.authSecondaryText]}>
                {staffSetupOpen ? 'Hide Staff Profile' : 'Staff Profile'}
              </Text>
            </Pressable>
          </View>

          {childSetupOpen ? (
            <View style={styles.authCard}>
              <Text style={styles.authTitle}>Child Profile Setup</Text>
              <TextInput placeholder="Child name" style={styles.input} value={childDraftName} onChangeText={setChildDraftName} />
              <TextInput
                placeholder="Date of birth (DD.MM.YYYY)"
                keyboardType="number-pad"
                style={styles.input}
                value={childDraftDob}
                onChangeText={(text) => setChildDraftDob(formatBirthDateInput(text))}
              />

              <Text style={styles.authInfoText}>Activities (clubs / hobbies)</Text>
              {childDraftActivities.map((activity, index) => (
                <View key={activity.id} style={styles.activityDraftCard}>
                  <TextInput
                    placeholder={`Activity ${index + 1}`}
                    style={styles.input}
                    value={activity.name}
                    onFocus={() => setActivitySuggestionOpenFor(activity.id)}
                    onChangeText={(text) => {
                      setActivitySuggestionOpenFor(activity.id);
                      setChildDraftActivities((prev) => prev.map((item) => (item.id === activity.id ? { ...item, name: text } : item)));
                    }}
                    onEndEditing={() => {
                      setTimeout(() => setActivitySuggestionOpenFor((current) => (current === activity.id ? null : current)), 120);
                    }}
                  />
                  {activitySuggestionOpenFor === activity.id && getActivitySuggestions(activity.name).length > 0 ? (
                    <View style={styles.suggestionList}>
                      {getActivitySuggestions(activity.name).map((suggestion) => (
                        <Pressable
                          key={`${activity.id}-draft-${suggestion}`}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setActivitySuggestionOpenFor(null);
                            setChildDraftActivities((prev) =>
                              prev.map((item) => (item.id === activity.id ? { ...item, name: suggestion } : item)),
                            );
                          }}
                        >
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.activityDraftRow}>
                    <View style={styles.activitySmallInput}>
                      <Pressable
                        style={styles.dropdownTrigger}
                        onPress={() => setOpenWeekDayPickerFor((prev) => (prev === activity.id ? null : activity.id))}
                      >
                        <Text style={[styles.dropdownValue, activity.weekDays.length === 0 && styles.dropdownPlaceholder]}>
                          {activity.weekDays.length === 0 ? 'Select days' : formatWeekDaysLabel(activity.weekDays)}
                        </Text>
                      </Pressable>
                      {openWeekDayPickerFor === activity.id ? (
                        <View style={styles.dropdownPanel}>
                          <View style={styles.dropdownChipWrap}>
                            {WEEK_DAYS.map((day) => {
                              const selected = activity.weekDays.includes(day.code);
                              return (
                                <Pressable
                                  key={`${activity.id}-day-${day.code}`}
                                  style={[styles.dropdownChip, selected && styles.dropdownChipActive]}
                                  onPress={() => toggleWeekDay(activity.id, day.code, 'draft')}
                                >
                                  <Text style={[styles.dropdownChipText, selected && styles.dropdownChipTextActive]}>{day.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.activitySmallInput}>
                      <Pressable style={styles.dropdownTrigger} onPress={() => openChildTimePicker(activity.id, activity.time)}>
                        <Text style={styles.dropdownValue}>{normalizeTimeText(activity.time || '10:00 AM')}</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.activityColorRow}>
                    {childColorPalette.map((paletteColor) => {
                      const active = activity.color === paletteColor;
                      return (
                        <Pressable
                          key={`${activity.id}-${paletteColor}`}
                          onPress={() => {
                            setChildDraftActivities((prev) => prev.map((item) => (item.id === activity.id ? { ...item, color: paletteColor } : item)));
                          }}
                          style={[
                            styles.activityColorDot,
                            { backgroundColor: paletteColor },
                            active && styles.activityColorDotActive,
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={styles.authActions}>
                <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={addChildDraftActivity}>
                  <Text style={[styles.authBtnText, styles.authSecondaryText]}>+ Add activity</Text>
                </Pressable>
              </View>

              <View style={styles.row}>
                <Pressable
                  style={[styles.roleChip, childDraftIncludeInMotherCalendar && styles.roleChipActive]}
                  onPress={() => setChildDraftIncludeInMotherCalendar(true)}
                >
                  <Text style={[styles.roleChipText, childDraftIncludeInMotherCalendar && styles.roleChipTextActive]}>
                    {`Add to ${parentLabel.toLowerCase()} calendar`}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.roleChip, !childDraftIncludeInMotherCalendar && styles.roleChipActive]}
                  onPress={() => setChildDraftIncludeInMotherCalendar(false)}
                >
                  <Text style={[styles.roleChipText, !childDraftIncludeInMotherCalendar && styles.roleChipTextActive]}>Only child profile</Text>
                </Pressable>
              </View>

              <View style={styles.authActions}>
                <Pressable style={styles.authBtn} onPress={saveChildProfileDraft}>
                  <Text style={styles.authBtnText}>Save Child</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {staffSetupOpen ? (
            <View style={styles.authCard}>
              <Text style={styles.authTitle}>Staff Profile</Text>
              <TextInput placeholder="Staff name" style={styles.input} value={staffDraftName} onChangeText={setStaffDraftName} />
              <TextInput
                placeholder="Date of birth (DD.MM.YYYY)"
                keyboardType="number-pad"
                style={styles.input}
                value={staffDraftDob}
                onChangeText={(text) => setStaffDraftDob(formatBirthDateInput(text))}
              />

              <View style={styles.eventsHeader}>
                <Pressable style={styles.addIconBtn} onPress={addStaffDraftTask}>
                  <Text style={styles.addIconText}>+</Text>
                </Pressable>
                <Text style={styles.createHint}>Add recurring staff duties</Text>
              </View>

              {staffDraftTasks.map((task, index) => (
                <View key={task.id} style={styles.activityDraftCard}>
                  <View style={styles.staffTaskRow}>
                    <Pressable style={styles.clockBtn} onPress={() => openChildTimePicker(task.id, task.time || '10:00 AM', 'staff')}>
                      <Text style={styles.clockBtnText}>◷</Text>
                    </Pressable>
                    <View style={styles.staffTaskInputWrap}>
                      <TextInput
                        placeholder={`Duty ${index + 1}`}
                        style={[styles.input, styles.staffTaskInput]}
                        value={task.title}
                        onChangeText={(text) =>
                          setStaffDraftTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, title: text } : item)))
                        }
                      />
                      <Text style={styles.staffTaskTimeLabel}>{task.time ? task.time : 'No time set'}</Text>
                    </View>
                  </View>

                  {getStaffTaskSuggestions(task.title).length > 0 ? (
                    <View style={styles.suggestionList}>
                      {getStaffTaskSuggestions(task.title).map((suggestion) => (
                        <Pressable
                          key={`${task.id}-staff-${suggestion}`}
                          style={styles.suggestionItem}
                          onPress={() =>
                            setStaffDraftTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, title: suggestion } : item)))
                          }
                        >
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.dropdownChipWrap}>
                    {WEEK_DAYS.map((day) => {
                      const selected = task.weekDays.includes(day.code);
                      return (
                        <Pressable
                          key={`${task.id}-staff-day-${day.code}`}
                          style={[styles.dropdownChip, selected && styles.dropdownChipActive]}
                          onPress={() => toggleStaffTaskWeekDay(task.id, day.code)}
                        >
                          <Text style={[styles.dropdownChipText, selected && styles.dropdownChipTextActive]}>{day.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.row}>
                    <Pressable
                      style={[styles.roleChip, task.priority === 'non_urgent' && styles.roleChipActive]}
                      onPress={() =>
                        setStaffDraftTasks((prev) =>
                          prev.map((item) => (item.id === task.id ? { ...item, priority: 'non_urgent' } : item)),
                        )
                      }
                    >
                      <Text style={[styles.roleChipText, task.priority === 'non_urgent' && styles.roleChipTextActive]}>Non-urgent</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.roleChip, task.priority === 'urgent' && styles.roleChipActive]}
                      onPress={() =>
                        setStaffDraftTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, priority: 'urgent' } : item)))
                      }
                    >
                      <Text style={[styles.roleChipText, task.priority === 'urgent' && styles.roleChipTextActive]}>Urgent</Text>
                    </Pressable>
                  </View>

                  <View style={styles.authActions}>
                    <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={() => removeStaffDraftTask(task.id)}>
                      <Text style={[styles.authBtnText, styles.activityRemoveText]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              <View style={styles.authActions}>
                <Pressable style={styles.authBtn} onPress={saveStaffProfileDraft}>
                  <Text style={styles.authBtnText}>Save Staff</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.nav}>
        <NavButton label="Calendar" active={screen === 'calendar'} onPress={() => setScreen('calendar')} />
        <NavButton label="Nutrition" active={screen === 'nutrition'} onPress={() => setScreen('nutrition')} />
        <NavButton label="Recipes" active={screen === 'recipes'} onPress={() => setScreen('recipes')} />
        <NavButton label="Meal Plan" active={screen === 'meal_planner'} onPress={() => setScreen('meal_planner')} />
        <NavButton label="Habits" active={screen === 'habits'} onPress={() => setScreen('habits')} />
        <NavButton label="Children" active={screen === 'children'} onPress={() => setScreen('children')} />
        <NavButton label="Shopping" active={screen === 'shopping'} onPress={() => setScreen('shopping')} />
        <NavButton label="Documents" active={screen === 'documents'} onPress={() => setScreen('documents')} />
        <NavButton label="Settings" active={screen === 'settings'} onPress={() => setScreen('settings')} />
      </View>
        {screen === 'calendar' ? (
          <>
            <CalendarScreen
              parentLabel={parentLabel}
              currentRole={role}
              personalDateOfBirth={personalProfile.dateOfBirth}
              personalHeightCm={personalProfile.heightCm}
              personalWeightKg={personalProfile.weightKg}
              cycleTrackingEnabled={personalProfile.cycleTrackingEnabled}
              cycleLastPeriodStart={personalProfile.cycleLastPeriodStart}
              cycleLengthDays={personalProfile.cycleLengthDays}
              cyclePeriodLengthDays={personalProfile.cyclePeriodLengthDays}
              cycleEntries={personalProfile.cycleEntries}
              onMarkPeriodStart={handleMarkPeriodStart}
              onSaveCycleEntry={handleSaveCycleEntry}
              onRemoveCycleEntry={handleRemoveCycleEntry}
              nutritionGoal={nutritionGoal}
              activityLevel={activityLevel}
              nutritionSex={nutritionSex}
              desiredWeight={desiredWeight}
              nutritionPace={nutritionPace}
              calorieOverride={calorieOverride}
              nutritionEntries={nutritionEntries}
              onNutritionEntriesChange={setNutritionEntries}
              children={children}
              staffProfiles={staffProfiles.map((profile) => ({ id: profile.id, name: profile.name }))}
              events={calendarEventsWithBirthdays.filter((e) => {
                if (activeOwnerFilter.startsWith('staff:')) {
                  const staffId = activeOwnerFilter.replace('staff:', '');
                  const profile = staffProfiles.find((item) => item.id === staffId);
                  if (!profile) return false;
                  if (!(e.owner === 'staff' && e.ownerName === profile.name)) return false;
                  return true;
                }
                return true;
              })}
              tasks={tasks}
              scope={calendarScope}
              onScopeChange={setCalendarScope}
              activeOwnerFilter={activeOwnerFilter}
              onSelectOwnerFilter={setActiveOwnerFilter}
              showStaff={staffProfiles.length > 0}
              filtersBelowSection={
                role === 'mother' ? (
                  <Pressable style={styles.calendarTasksSummaryInline} onPress={openTaskNotifications}>
                    <View style={styles.calendarTasksSummaryTextWrap}>
                      <Text style={styles.calendarTasksSummaryTitle}>Tasks</Text>
                      <Text style={styles.calendarTasksSummaryMeta} numberOfLines={1} ellipsizeMode="tail">
                        {latestTaskNotificationText}
                      </Text>
                    </View>
                    <View style={styles.calendarTasksSummaryBadge}>
                      <Text style={styles.calendarTasksSummaryBadgeText}>{`+${taskNotificationCount}`}</Text>
                    </View>
                  </Pressable>
                ) : undefined
              }
              filtersHeaderRight={
                children.length > 0 || staffProfiles.length > 0 ? (
                  <View style={styles.filtersActionsWrap}>
                    <Pressable
                      style={[
                        styles.childActionsBtn,
                        children.length === 0 && staffProfiles.length === 0 && styles.childActionsBtnDisabled,
                      ]}
                      disabled={children.length === 0 && staffProfiles.length === 0}
                      onHoverIn={showFiltersEditHover}
                      onHoverOut={hideFiltersEditHover}
                      onPress={openProfileEditorFromMother}
                    >
                      <Text style={styles.childActionsIcon}>⋮</Text>
                    </Pressable>
                    {filtersEditHover && !(children.length === 0 && staffProfiles.length === 0) ? (
                      <Pressable
                        style={styles.filtersHoverLabel}
                        onHoverIn={showFiltersEditHover}
                        onHoverOut={hideFiltersEditHover}
                        onPress={openProfileEditorFromMother}
                      >
                        <Text style={styles.filtersHoverLabelText}>Edit</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : undefined
              }
              onCompleteStaffTask={markStaffTaskDone}
              getStaffTaskSuggestions={getStaffTaskSuggestions}
              onAddEvent={({ title, date, time, owner, ownerName, ownerChildProfileId, category, color, taskPriority, motherColor, staffColor, visibility }) => {
                const isStaffTask = owner === 'staff' && category.toLowerCase().includes('task');
                const deadlineAt = time ? `${date} ${time}` : date;
                if (session) {
                  const tempId = `tmp-e-${Date.now()}`;
                  const optimisticEvent: CalendarEvent = {
                    id: tempId,
                    title,
                    date,
                    time,
                    owner,
                    ownerName,
                    ownerChildProfileId,
                    category,
                    color,
                    motherColor,
                    staffColor,
                    visibility,
                  };

                  setEvents((prev) => [optimisticEvent, ...prev]);
                  Promise.all([
                    createCalendarEvent(session, {
                      title,
                      date,
                      time,
                      owner,
                      ownerName,
                      ownerChildProfileId: ownerChildProfileId || null,
                      category,
                      color,
                      motherColor,
                      staffColor,
                      visibility,
                    }),
                    isStaffTask
                      ? createTask(session, {
                          title,
                          assigneeRole: 'staff',
                          priority: taskPriority || 'non_urgent',
                          deadlineAt: toIsoDeadline(date, time),
                        })
                      : Promise.resolve(),
                  ])
                    .then(() => Promise.all([refreshLiveCalendar(), isStaffTask ? refreshLiveTasks() : Promise.resolve()]))
                    .catch((error) => {
                      setEvents((prev) => prev.filter((event) => event.id !== tempId));
                      setTasksError(error instanceof Error ? error.message : 'Create event failed.');
                    });
                  return;
                }

                const eventId = `e${Date.now()}`;
                setEvents((prev) => [
                  {
                    id: eventId,
                    title,
                    date,
                    time,
                    owner,
                    ownerName,
                    category,
                    color,
                    motherColor,
                    staffColor,
                    visibility,
                    ownerChildProfileId,
                  },
                  ...prev,
                ]);
                if (isStaffTask) {
                  setTasks((prev) => [
                    {
                      id: eventId.replace(/^e/, 't'),
                      title,
                      assigneeRole: 'staff',
                      assigneeName: ownerName,
                      priority: taskPriority || 'non_urgent',
                      status: 'new',
                      deadline: deadlineAt,
                      needsParentApproval: false,
                    },
                    ...prev,
                  ]);
                }
              }}
              onUpdateEvent={({ id, title, color, time, owner, ownerName, ownerChildProfileId, category, date, motherColor, staffColor, visibility }) => {
                const isStaffTask = owner === 'staff' && category.toLowerCase().includes('task');
                if (session) {
                  updateCalendarEvent(session, {
                    id,
                    title,
                    date,
                    time,
                    owner,
                    ownerName,
                    ownerChildProfileId: ownerChildProfileId || null,
                    category,
                    color,
                    motherColor,
                    staffColor,
                    visibility,
                  })
                    .then(() => refreshLiveCalendar())
                    .catch((error) => setTasksError(error instanceof Error ? error.message : 'Update event failed.'));
                  return;
                }

                setEvents((prev) =>
                  prev.map((event) =>
                    event.id === id ? { ...event, title, color, time, owner, ownerName, ownerChildProfileId, category, date, motherColor, staffColor, visibility } : event,
                  ),
                );
                setTasks((prev) =>
                  prev.map((task) =>
                    task.id === id.replace(/^e/, 't')
                      ? {
                          ...task,
                          title,
                          assigneeRole: isStaffTask ? 'staff' : task.assigneeRole,
                          assigneeName: ownerName,
                          priority: task.priority,
                          deadline: time ? `${date} ${time}` : date,
                        }
                      : task,
                  ),
                );
              }}
            />
          </>
        ) : null}

        {screen === 'children' ? (
          <ChildrenScreen
            children={children}
            onDeleteChild={handleDeleteChildDirect}
            onAddActivity={(childId, activityName, timesPerWeek) => {
              setChildren((prev) =>
                prev.map((child) =>
                  child.id === childId
                    ? {
                        ...child,
                        activities: [
                          ...child.activities,
                          {
                            id: `a${Date.now()}`,
                            name: activityName,
                            timesPerWeek,
                          },
                        ],
                      }
                    : child,
                ),
              );
            }}
          />
        ) : null}

        {screen === 'nutrition' ? (
          <NutritionScreen
            personalProfile={personalProfile}
            nutritionGoal={nutritionGoal}
            onNutritionGoalChange={setNutritionGoal}
            activityLevel={activityLevel}
            onActivityLevelChange={setActivityLevel}
            nutritionSex={nutritionSex}
            onNutritionSexChange={setNutritionSex}
            desiredWeight={desiredWeight}
            onDesiredWeightChange={setDesiredWeight}
            nutritionPace={nutritionPace}
            onNutritionPaceChange={setNutritionPace}
            calorieOverride={calorieOverride}
            onCalorieOverrideChange={setCalorieOverride}
            nutritionEntries={nutritionEntries}
            onNutritionEntriesChange={setNutritionEntries}
          />
        ) : null}

        {screen === 'recipes' ? <RecipesScreen recipes={recipes} onRecipeCreate={handleRecipeCreate} /> : null}

        {screen === 'meal_planner' ? (
          <MealPlannerScreen recipes={recipes} weeklyPlan={weeklyMealPlan} onWeeklyPlanChange={handleWeeklyMealPlanChange} />
        ) : null}

        {screen === 'habits' ? (
          <HabitsScreen
            habits={habits}
            onHabitsChange={setHabits}
            challenges={habitChallenges}
            habitRemindersEnabled={habitRemindersEnabled}
          />
        ) : null}

        {screen === 'shopping' ? (
          <ShoppingScreen
            lists={shoppingLists}
            fridgeItems={fridgeItems}
            shareTargets={shoppingShareTargets}
            sharedInbox={visibleShoppingShares}
            activeRecipientKey={activeShoppingRecipientKey}
            currentRole={role}
            currentActorLabel={currentShoppingActorLabel}
            purchaseRequests={purchaseRequests}
            onImportFridgeItems={(items) => {
              setFridgeItems((prev) => {
                const next = [...prev];
                items.forEach((item) => {
                  const existingIndex = next.findIndex((entry) => entry.name.trim().toLowerCase() === item.name.trim().toLowerCase());
                  if (existingIndex >= 0) {
                    next[existingIndex] = {
                      ...next[existingIndex],
                      quantity: item.quantity,
                      category: item.category,
                      note: item.note,
                      status: item.status,
                    };
                  } else {
                    next.unshift({
                      id: `fridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      ...item,
                    });
                  }
                });
                return next;
              });
            }}
            onUpdateFridgeItemStatus={(itemId, status) => {
              setFridgeItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, status } : item)));
            }}
            onUseFridgeItem={(itemId) => {
              const item = fridgeItems.find((entry) => entry.id === itemId);
              if (!item) return;

              if (role === 'staff') {
                if (session && isSupabaseConfigured) {
                  createPurchaseRequest(session, {
                    itemName: item.name,
                    quantity: item.quantity,
                    comment: item.note,
                    requestedBy: currentShoppingActorLabel,
                  })
                    .then(() => refreshLiveShopping())
                    .catch((error) => setTasksError(error instanceof Error ? error.message : 'Request failed.'));
                } else {
                  setPurchaseRequests((prev) => [
                    {
                      id: `pr-fridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      itemName: item.name,
                      quantity: item.quantity,
                      comment: item.note,
                      requestedBy: currentShoppingActorLabel,
                      createdAt: new Date().toISOString(),
                      status: 'new',
                    },
                    ...prev,
                  ]);
                }
                setFridgeItems((prev) => prev.map((entry) => (entry.id === itemId ? { ...entry, status: 'out' } : entry)));
                return;
              }

              const shoppingItem = {
                id: `si-fridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: item.name,
                quantity: item.quantity,
                comment: item.note,
                purchased: false,
              };

              if (session && isSupabaseConfigured) {
                const latestList = shoppingLists[0];
                const persist = latestList
                  ? updateShoppingListItems(session, latestList.id, [shoppingItem, ...latestList.items])
                  : createShoppingList(session, 'Shopping List', [shoppingItem]);
                persist
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Create list failed.'));
              } else {
                setShoppingLists((prev) => {
                  if (prev.length === 0) {
                    return [
                      {
                        id: `sl-fridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        title: 'Shopping List',
                        createdAt: new Date().toISOString(),
                        items: [shoppingItem],
                      },
                    ];
                  }
                  return prev.map((list, index) => (index === 0 ? { ...list, items: [shoppingItem, ...list.items] } : list));
                });
              }

              setFridgeItems((prev) => prev.map((entry) => (entry.id === itemId ? { ...entry, status: 'out' } : entry)));
            }}
            onTogglePurchased={(listId, id) => {
              if (session && isSupabaseConfigured) {
                const targetList = shoppingLists.find((list) => list.id === listId);
                const targetItem = targetList?.items.find((item) => item.id === id);
                if (!targetItem) return;
                toggleShoppingItemPurchased(id, !targetItem.purchased)
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Update failed.'));
                return;
              }
              setShoppingLists((prev) =>
                prev.map((list) =>
                  list.id === listId
                    ? {
                        ...list,
                        items: list.items.map((item) => (item.id === id ? { ...item, purchased: !item.purchased } : item)),
                      }
                    : list,
                ),
              );
            }}
            onCreateList={(items, targetListId) => {
              if (session && isSupabaseConfigured) {
                if (targetListId) {
                  const targetList = shoppingLists.find((list) => list.id === targetListId);
                  if (!targetList) return;
                  const mergedItems = [
                    ...items.map((item, index) => ({
                      id: `si-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                      name: item.name,
                      quantity: item.quantity,
                      purchased: false,
                    })),
                    ...targetList.items,
                  ];
                  updateShoppingListItems(session, targetListId, mergedItems)
                    .then(() => refreshLiveShopping())
                    .catch((error) => setTasksError(error instanceof Error ? error.message : 'Create list failed.'));
                  return;
                }
                createShoppingList(
                  session,
                  'Shopping List',
                  items.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    purchased: false,
                  })),
                )
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Create list failed.'));
                return;
              }
              setShoppingLists((prev) => {
                if (targetListId && prev.some((list) => list.id === targetListId)) {
                  return prev.map((list) =>
                    list.id === targetListId
                      ? {
                          ...list,
                          items: [
                            ...items.map((item, index) => ({
                              id: `si-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                              name: item.name,
                              quantity: item.quantity,
                              purchased: false,
                            })),
                            ...list.items,
                          ],
                        }
                      : list,
                  );
                }

                return [
                  {
                    id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    title: 'Shopping List',
                    createdAt: new Date().toISOString(),
                    items: items.map((item, index) => ({
                      id: `si-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                      name: item.name,
                      quantity: item.quantity,
                      purchased: false,
                    })),
                  },
                  ...prev,
                ];
              });
            }}
            onUpdateList={(listId, items) => {
              if (session && isSupabaseConfigured) {
                updateShoppingListItems(session, listId, items)
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Update list failed.'));
                return;
              }
              setShoppingLists((prev) =>
                prev.map((list) =>
                  list.id === listId
                    ? {
                        ...list,
                        items: items.map((item, index) => ({
                          id: item.id || `si-${listId}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                          name: item.name,
                          quantity: item.quantity,
                          purchased: item.purchased,
                        })),
                      }
                    : list,
                ),
              );
            }}
            onDeleteList={(listId) => {
              if (session && isSupabaseConfigured) {
                deleteShoppingList(session, listId)
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Delete list failed.'));
                return;
              }
              setShoppingLists((prev) => prev.filter((list) => list.id !== listId));
            }}
            onShareListToProfile={(listId, recipientKey) => {
              const target = shoppingShareTargets.find((item) => item.key === recipientKey);
              const sourceList = shoppingLists.find((item) => item.id === listId);
              if (!target || !sourceList) return;
              if (session && isSupabaseConfigured) {
                createShoppingShare(session, {
                  listId: sourceList.id,
                  title: sourceList.title,
                  senderLabel:
                    role === 'child'
                      ? children.find((child) => child.id === activeChildRoleId)?.name || 'Child profile'
                      : role === 'staff'
                        ? staffProfiles.find((profile) => profile.id === activeStaffProfileId)?.name || 'Staff profile'
                        : parentLabel,
                  recipientKey,
                  recipientLabel: target.label,
                  items: sourceList.items.map((item) => ({ ...item })),
                })
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Share failed.'));
                return;
              }
              setShoppingShares((prev) => [
                {
                  id: `ssh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  listId: sourceList.id,
                  title: sourceList.title,
                  createdAt: new Date().toISOString(),
                  senderLabel:
                    role === 'child'
                      ? children.find((child) => child.id === activeChildRoleId)?.name || 'Child profile'
                      : role === 'staff'
                        ? staffProfiles.find((profile) => profile.id === activeStaffProfileId)?.name || 'Staff profile'
                        : parentLabel,
                  recipientKey,
                  recipientLabel: target.label,
                  items: sourceList.items.map((item) => ({ ...item })),
                },
                ...prev,
              ]);
            }}
            onImportSharedList={(shareId) => {
              const share = shoppingShares.find((item) => item.id === shareId);
              if (!share) return;
              if (session && isSupabaseConfigured) {
                createShoppingList(
                  session,
                  `${share.title} · ${share.senderLabel}`,
                  share.items.map((item) => ({ ...item })),
                )
                  .then(() => deleteShoppingShare(shareId))
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Import failed.'));
                return;
              }
              setShoppingLists((prev) => [
                {
                  id: `sl-shared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  title: `${share.title} · ${share.senderLabel}`,
                  createdAt: new Date().toISOString(),
                  items: share.items.map((item, index) => ({
                    ...item,
                    id: `si-shared-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                  })),
                },
                ...prev,
              ]);
              setShoppingShares((prev) => prev.filter((item) => item.id !== shareId));
            }}
            onDismissSharedList={(shareId) => {
              if (session && isSupabaseConfigured) {
                deleteShoppingShare(shareId)
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Hide failed.'));
                return;
              }
              setShoppingShares((prev) => prev.filter((item) => item.id !== shareId));
            }}
            onCreatePurchaseRequest={(payload) => {
              if (session && isSupabaseConfigured) {
                createPurchaseRequest(session, {
                  itemName: payload.itemName,
                  quantity: payload.quantity,
                  comment: payload.comment,
                  requestedBy: currentShoppingActorLabel,
                })
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Request failed.'));
                return;
              }
              setPurchaseRequests((prev) => [
                {
                  id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  itemName: payload.itemName,
                  quantity: payload.quantity,
                  comment: payload.comment,
                  requestedBy: currentShoppingActorLabel,
                  createdAt: new Date().toISOString(),
                  status: 'new',
                },
                ...prev,
              ]);
            }}
            onAddPurchaseRequestToList={(requestId) => {
              const request = purchaseRequests.find((item) => item.id === requestId);
              if (!request) return;
              if (session && isSupabaseConfigured) {
                const latestList = shoppingLists[0];
                const itemToAdd = {
                  id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  name: request.itemName,
                  quantity: request.quantity,
                  comment: request.comment,
                  purchased: false,
                };
                const persist = latestList
                  ? updateShoppingListItems(session, latestList.id, [itemToAdd, ...latestList.items])
                  : createShoppingList(session, 'Shopping List', [itemToAdd]);
                persist
                  .then(() => updatePurchaseRequestStatus(requestId, 'added'))
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Add to list failed.'));
                return;
              }
              setShoppingLists((prev) => {
                if (prev.length > 0) {
                  const [latest, ...rest] = prev;
                  return [
                    {
                      ...latest,
                      items: [
                        {
                          id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                          name: request.itemName,
                          quantity: request.quantity,
                          comment: request.comment,
                          purchased: false,
                        },
                        ...latest.items,
                      ],
                    },
                    ...rest,
                  ];
                }
                return [
                  {
                    id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    title: 'Shopping List',
                    createdAt: new Date().toISOString(),
                    items: [
                      {
                        id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        name: request.itemName,
                        quantity: request.quantity,
                        comment: request.comment,
                        purchased: false,
                      },
                    ],
                  },
                ];
              });
              setPurchaseRequests((prev) => prev.map((item) => (item.id === requestId ? { ...item, status: 'added' } : item)));
            }}
            onDismissPurchaseRequest={(requestId) => {
              if (session && isSupabaseConfigured) {
                updatePurchaseRequestStatus(requestId, 'dismissed')
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Hide failed.'));
                return;
              }
              setPurchaseRequests((prev) => prev.map((item) => (item.id === requestId ? { ...item, status: 'dismissed' } : item)));
            }}
          />
        ) : null}

        {screen === 'documents' ? (
          <DocumentsScreen
            importedItems={importedEmailEvents}
            onImportedItemsChange={setImportedEmailEvents}
            onAddImportedEventToCalendar={(item) => {
              if (session) {
                createCalendarEvent(session, {
                  title: item.title,
                  date: item.date,
                  time: item.time,
                  owner: 'mother',
                  ownerName: parentLabel,
                  ownerChildProfileId: null,
                  category: 'Imported',
                  color: '#7c3aed',
                  motherColor: undefined,
                  staffColor: undefined,
                  visibility: 'shared',
                })
                  .then(() => refreshLiveCalendar())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Imported event failed.'));
                return;
              }

              setEvents((prev) => [
                {
                  id: `e${Date.now()}`,
                  title: item.title,
                  date: item.date,
                  time: item.time,
                  owner: 'mother',
                  ownerName: parentLabel,
                  category: 'Imported',
                  color: '#7c3aed',
                },
                ...prev,
              ]);
            }}
          />
        ) : null}

        {screen === 'settings' ? (
          <SettingsScreen
            staffEnabled={staffEnabled}
            onToggleStaff={() => setStaffEnabled((v) => !v)}
            debugSessionUserId={session?.userId || null}
            personalProfile={personalProfile}
            personalProfileReadonly={personalProfileReadonly}
            onPersonalProfileChange={(value) => {
              setPersonalProfileStatus(null);
              setPersonalProfileError(null);
              setPersonalProfileReadonly(false);
              setPersonalProfile((prev) => {
                const nextProfile = typeof value === 'function' ? value(prev) : value;
                latestPersonalProfileRef.current = nextProfile;
                return nextProfile;
              });
            }}
            onSavePersonalProfile={savePersonalProfile}
            onEditPersonalProfile={() => {
              setPersonalProfileStatus(null);
              setPersonalProfileError(null);
              setPersonalProfileReadonly(false);
            }}
            personalProfileStatus={personalProfileStatus}
            personalProfileError={personalProfileError}
            nutritionGoal={nutritionGoal}
            onNutritionGoalChange={setNutritionGoal}
            activityLevel={activityLevel}
            onActivityLevelChange={setActivityLevel}
            nutritionSex={nutritionSex}
            onNutritionSexChange={setNutritionSex}
            desiredWeight={desiredWeight}
            onDesiredWeightChange={setDesiredWeight}
            nutritionPace={nutritionPace}
            onNutritionPaceChange={setNutritionPace}
            calorieOverride={calorieOverride}
            onCalorieOverrideChange={setCalorieOverride}
            habits={habits}
            onHabitsChange={setHabits}
            habitRemindersEnabled={habitRemindersEnabled}
            onHabitRemindersEnabledChange={setHabitRemindersEnabled}
            staffProfiles={staffProfiles.map((profile) => ({ id: profile.id, name: profile.name, dateOfBirth: profile.dateOfBirth }))}
            onEditStaffProfile={openStaffProfileEditor}
          />
        ) : null}
      </ScrollView>

      <Modal visible={completedTasksOpen} transparent animationType="fade" onRequestClose={() => setCompletedTasksOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.childEditorModalCard}>
            <View style={styles.childEditorHeader}>
              <Text style={styles.authTitle}>Tasks</Text>
              <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={() => setCompletedTasksOpen(false)}>
                <Text style={[styles.authBtnText, styles.authSecondaryText]}>Close</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Pressable
                style={[styles.authBtn, styles.completedBtn, taskNotificationsFilter !== 'completed' && styles.authBtnDimmed]}
                onPress={() => setTaskNotificationsFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))}
              >
                <Text style={styles.authBtnText}>Completed</Text>
              </Pressable>
              <Pressable
                style={[styles.authBtn, styles.reminderBtn, taskNotificationsFilter !== 'not_completed' && styles.authBtnDimmed]}
                onPress={() => setTaskNotificationsFilter((prev) => (prev === 'not_completed' ? 'all' : 'not_completed'))}
              >
                <Text style={styles.authBtnText}>Not completed</Text>
              </Pressable>
              <Pressable
                style={[styles.authBtn, styles.authSecondary, taskHistoryFilterOpen && styles.taskFilterBtnActive]}
                onPress={() => setTaskHistoryFilterOpen((prev) => !prev)}
              >
                <Text style={[styles.authBtnText, styles.authSecondaryText, taskHistoryFilterOpen && styles.taskFilterBtnTextActive]}>Filter</Text>
              </Pressable>
            </View>
            {taskHistoryFilterOpen ? (
              <View style={styles.taskFiltersPanel}>
                <View style={styles.row}>
                  {[
                    { key: '7d', label: 'Week' },
                    { key: '10d', label: '10 days' },
                    { key: '20d', label: '20 days' },
                    { key: '30d', label: 'Month' },
                    { key: '180d', label: '6 months' },
                  ].map((option) => (
                    <Pressable
                      key={option.key}
                      style={[styles.taskFilterChip, taskHistoryFilter === option.key && styles.taskFilterChipActive]}
                      onPress={() => {
                        setTaskHistoryFilter(option.key as TaskHistoryFilter);
                        setTaskHistoryDaysInput('');
                        setTaskHistoryDateInput('');
                      }}
                    >
                      <Text style={[styles.taskFilterChipText, taskHistoryFilter === option.key && styles.taskFilterChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  placeholder="Any number of days ago"
                  keyboardType="number-pad"
                  style={styles.input}
                  value={taskHistoryDaysInput}
                  onChangeText={(text) => {
                    setTaskHistoryFilter('days');
                    setTaskHistoryDaysInput(text.replace(/\D/g, ''));
                  }}
                />
                <TextInput
                  placeholder="From date YYYY-MM-DD"
                  style={styles.input}
                  value={taskHistoryDateInput}
                  onChangeText={(text) => {
                    setTaskHistoryFilter('date');
                    setTaskHistoryDateInput(text.replace(/[^0-9-]/g, '').slice(0, 10));
                  }}
                />
                <Text style={styles.meta}>By default the main list shows only the last 3 days.</Text>
              </View>
            ) : null}
            <ScrollView style={styles.childEditorBody} contentContainerStyle={styles.childEditorBodyContent}>
              {visibleTaskNotificationEntries.map((item) => {
                const reminder = staffReminderNotifications.find((notification) => notification.taskId === item.taskId);
                return (
                  <View key={item.id} style={styles.item}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.meta}>Staff: {item.staffName}</Text>
                    {item.kind === 'completed' ? (
                      <>
                        <Text style={styles.meta}>Completed at {new Date(item.happenedAt).toLocaleString()}</Text>
                        <View style={styles.row}>
                          <Pressable style={[styles.authBtn, styles.completedBtn]}>
                            <Text style={styles.authBtnText}>Completed</Text>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.meta}>Deadline: {item.deadline}</Text>
                        <Text style={styles.meta}>Missed at {new Date(item.happenedAt).toLocaleString()}</Text>
                        <View style={styles.row}>
                          <Pressable
                            style={[styles.authBtn, styles.reminderBtn]}
                            onPress={() => {
                              const overdueTask = overdueStaffTasks.find((task) => task.id === item.taskId);
                              if (overdueTask) sendStaffTaskReminder(overdueTask);
                            }}
                          >
                            <Text style={styles.authBtnText}>{reminder ? 'Reminder sent' : `Notify ${item.staffName}`}</Text>
                          </Pressable>
                        </View>
                        {reminder ? <Text style={styles.meta}>Sent at {new Date(reminder.sentAt).toLocaleString()}</Text> : null}
                      </>
                    )}
                  </View>
                );
              })}
              {visibleTaskNotificationEntries.length === 0 ? <Text style={styles.empty}>No task notifications for this filter.</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={childActivitiesModalOpen} transparent animationType="fade" onRequestClose={() => setChildActivitiesModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.childEditorModalCard}>
            <View style={styles.childEditorHeader}>
              <Text style={styles.authTitle}>{editingChildName || 'Child'} activities</Text>
              <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={() => setChildActivitiesModalOpen(false)}>
                <Text style={[styles.authBtnText, styles.authSecondaryText]}>Close</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.childEditorBody} contentContainerStyle={styles.childEditorBodyContent}>
              {editingChildActivities.map((activity, index) => (
                <View key={activity.id} style={styles.activityDraftCard}>
                  <TextInput
                    placeholder={`Activity ${index + 1}`}
                    style={styles.input}
                    value={activity.name}
                    onFocus={() => setActivitySuggestionOpenFor(activity.id)}
                    onChangeText={(text) => {
                      setActivitySuggestionOpenFor(activity.id);
                      setEditingChildActivities((prev) => prev.map((item) => (item.id === activity.id ? { ...item, name: text } : item)));
                    }}
                    onEndEditing={() => {
                      setTimeout(() => setActivitySuggestionOpenFor((current) => (current === activity.id ? null : current)), 120);
                    }}
                  />
                  {activitySuggestionOpenFor === activity.id && getActivitySuggestions(activity.name).length > 0 ? (
                    <View style={styles.suggestionList}>
                      {getActivitySuggestions(activity.name).map((suggestion) => (
                        <Pressable
                          key={`${activity.id}-edit-${suggestion}`}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setActivitySuggestionOpenFor(null);
                            setEditingChildActivities((prev) =>
                              prev.map((item) => (item.id === activity.id ? { ...item, name: suggestion } : item)),
                            );
                          }}
                        >
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.activityDraftRow}>
                    <View style={styles.activitySmallInput}>
                      <Pressable
                        style={styles.dropdownTrigger}
                        onPress={() => setOpenWeekDayPickerFor((prev) => (prev === activity.id ? null : activity.id))}
                      >
                        <Text style={[styles.dropdownValue, activity.weekDays.length === 0 && styles.dropdownPlaceholder]}>
                          {activity.weekDays.length === 0 ? 'Select days' : formatWeekDaysLabel(activity.weekDays)}
                        </Text>
                      </Pressable>
                      {openWeekDayPickerFor === activity.id ? (
                        <View style={styles.dropdownPanel}>
                          <View style={styles.dropdownChipWrap}>
                            {WEEK_DAYS.map((day) => {
                              const selected = activity.weekDays.includes(day.code);
                              return (
                                <Pressable
                                  key={`${activity.id}-edit-day-${day.code}`}
                                  style={[styles.dropdownChip, selected && styles.dropdownChipActive]}
                                  onPress={() => toggleWeekDay(activity.id, day.code, 'child')}
                                >
                                  <Text style={[styles.dropdownChipText, selected && styles.dropdownChipTextActive]}>{day.label}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.activitySmallInput}>
                      <Pressable style={styles.dropdownTrigger} onPress={() => openChildTimePicker(activity.id, activity.time, 'child')}>
                        <Text style={styles.dropdownValue}>{normalizeTimeText(activity.time || '10:00 AM')}</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.activityColorRow}>
                {childColorPalette.map((paletteColor) => {
                      const active = activity.color === paletteColor;
                      return (
                        <Pressable
                          key={`${activity.id}-edit-${paletteColor}`}
                          onPress={() =>
                            setEditingChildActivities((prev) =>
                              prev.map((item) => (item.id === activity.id ? { ...item, color: paletteColor } : item)),
                            )
                          }
                          style={[
                            styles.activityColorDot,
                            { backgroundColor: paletteColor },
                            active && styles.activityColorDotActive,
                          ]}
                        />
                      );
                    })}
                  </View>

                  <View style={styles.authActions}>
                    <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={() => removeEditingChildActivity(activity.id)}>
                      <Text style={[styles.authBtnText, styles.activityRemoveText]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.authActions}>
              <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={addEditingChildActivity}>
                <Text style={[styles.authBtnText, styles.authSecondaryText]}>+ Add activity</Text>
              </Pressable>
            </View>

            <View style={styles.row}>
              <Pressable
                style={[styles.roleChip, editingChildIncludeInMotherCalendar && styles.roleChipActive]}
                onPress={() => setEditingChildIncludeInMotherCalendar(true)}
              >
                <Text style={[styles.roleChipText, editingChildIncludeInMotherCalendar && styles.roleChipTextActive]}>
                  {`Add to ${parentLabel.toLowerCase()} calendar`}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.roleChip, !editingChildIncludeInMotherCalendar && styles.roleChipActive]}
                onPress={() => setEditingChildIncludeInMotherCalendar(false)}
              >
                <Text style={[styles.roleChipText, !editingChildIncludeInMotherCalendar && styles.roleChipTextActive]}>Only child profile</Text>
              </Pressable>
            </View>

            <View style={styles.authActions}>
              <Pressable style={styles.authBtn} onPress={saveEditingChildActivities}>
                <Text style={styles.authBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={childTimePickerOpen} transparent animationType="fade" onRequestClose={() => setChildTimePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.clockModalCard}>
            <Text style={styles.authTitle}>Pick Time</Text>
            <Text style={styles.modalSub}>{childDialStep === 'hour' ? 'Step 1: Select hour' : 'Step 2: Select minute'}</Text>
            <View style={styles.clockDial}>
              {childDialDots.map((dot) => (
                <Pressable
                  key={`${childDialStep}-${dot.value}`}
                  style={[
                    styles.clockNumber,
                    { left: dot.left, top: dot.top },
                    (childDialStep === 'hour' ? childDialHour === dot.value : childDialMinute === dot.value) && styles.clockNumberActive,
                  ]}
                  onPress={() => chooseChildDialValue(dot.value)}
                >
                  <Text style={styles.clockNumberText}>{childDialStep === 'minute' ? String(dot.value).padStart(2, '0') : dot.value}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.ampmToggle}
                onPress={() => {
                  const nextPeriod: 'AM' | 'PM' = childDialPeriodRef.current === 'AM' ? 'PM' : 'AM';
                  childDialPeriodRef.current = nextPeriod;
                  setChildDialPeriod(nextPeriod);
                }}
              >
                <Text style={styles.ampmText}>{childDialPeriod}</Text>
              </Pressable>
            </View>
            <Text style={styles.timePreview}>{formatClockTime(childDialHour, childDialMinute, childDialPeriod)}</Text>
            <View style={styles.authActions}>
              <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={confirmChildTimePicker}>
                <Text style={[styles.authBtnText, styles.authSecondaryText, styles.timeDoneText]}>✓ Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function enforceUniqueChildActivityColors(children: ChildProfile[], palette: string[]) {
  const uniqueChildren = dedupeChildren(children);
  const paletteByLower = new Map(palette.map((color) => [color.toLowerCase(), color]));
  let changed = false;

  const normalizedChildren = uniqueChildren.map((child) => {
    let childChanged = false;
    const normalizedActivities = child.activities.map((activity) => {
      const currentLower = (activity.color || '').trim().toLowerCase();
      const nextLower = currentLower && paletteByLower.has(currentLower) ? currentLower : palette[0].toLowerCase();
      const nextColor = paletteByLower.get(nextLower) || palette[0];
      if (currentLower !== nextLower) {
        changed = true;
        childChanged = true;
        return { ...activity, color: nextColor };
      }
      return activity;
    });

    return childChanged ? { ...child, activities: normalizedActivities } : child;
  });

  if (uniqueChildren !== children) changed = true;
  return changed ? normalizedChildren : children;
}

function getChildSignature(child: ChildProfile) {
  const normalizedName = child.name.trim().toLowerCase();
  const normalizedDob = (child.dateOfBirth || '').trim();
  return `${normalizedName}::${normalizedDob}`;
}

function dedupeChildren(children: ChildProfile[]) {
  const bySignature = new Map<string, ChildProfile>();
  let changed = false;

  children.forEach((child) => {
    const signature = getChildSignature(child);
    const existing = bySignature.get(signature);
    if (!existing) {
      bySignature.set(signature, child);
      return;
    }

    changed = true;
    const existingActivities = new Map(
      existing.activities.map((activity) => [
        `${activity.name.trim().toLowerCase()}::${activity.timesPerWeek}::${normalizeTimeText(activity.time || '')}`,
        activity,
      ]),
    );

    child.activities.forEach((activity) => {
      const key = `${activity.name.trim().toLowerCase()}::${activity.timesPerWeek}::${normalizeTimeText(activity.time || '')}`;
      if (!existingActivities.has(key)) existingActivities.set(key, activity);
    });

    bySignature.set(signature, {
      ...existing,
      includeInMotherCalendar: existing.includeInMotherCalendar || child.includeInMotherCalendar,
      activities: Array.from(existingActivities.values()),
    });
  });

  return changed ? Array.from(bySignature.values()) : children;
}

function createDefaultDraftActivity(color: string = '#ef4444') {
  const defaultTime = '10:00 AM';
  return {
    id: createDraftActivityId(),
    name: '',
    timesPerWeek: '1',
    time: defaultTime,
    color,
    weekDays: [] as WeekDayCode[],
    timeSlots: [defaultTime],
  };
}

function createDraftActivityId() {
  return `new-activity-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultStaffDraftTask(): StaffDraftTask {
  return {
    id: `staff-task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    title: '',
    time: '',
    priority: 'non_urgent',
    weekDays: [],
  };
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildMonthCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const firstWeekDay = (firstDay.getDay() + 6) % 7;
  const cells: Array<{ key: string; label: string; dateKey: string | null }> = [];

  for (let i = 0; i < firstWeekDay; i += 1) {
    cells.push({ key: `empty-${i}`, label: '', dateKey: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({
      key: `day-${year}-${month}-${day}`,
      label: String(day),
      dateKey: toDateKey(date),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-tail-${cells.length}`, label: '', dateKey: null });
  }

  return cells;
}

function NavButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, themeName } = useTheme();
  const styles = useMemo(() => createStyles(colors, themeName), [colors, themeName]);
  return (
    <Pressable onPress={onPress} style={[styles.navBtn, active && styles.navBtnActive]}>
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </Pressable>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getSessionRoleLabel(role: Role, parentLabel: ParentLabel) {
  if (role === 'admin') return `${parentLabel} mode`;
  if (role === 'mother') return `${parentLabel} mode`;
  if (role === 'child') return 'Child mode';
  if (role === 'staff') return 'Staff mode';
  return capitalize(role);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function parseTaskDeadline(value: string) {
  const text = value.trim();
  if (!text || text.toLowerCase() === 'no deadline') return null;

  const full = text.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
  if (full) {
    const parsedTime = parseTimeValue(full[2]);
    const date = new Date(`${full[1]}T00:00:00`);
    const hour24 = parsedTime.period === 'PM' ? (parsedTime.hour % 12) + 12 : parsedTime.hour % 12;
    date.setHours(hour24, parsedTime.minute, 0, 0);
    return date;
  }

  const dateOnly = text.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) {
    const date = new Date(`${dateOnly[1]}T23:59:59`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function toIsoDeadline(date: string, time: string) {
  const normalizedTime = normalizeTimeText(time);
  const parsed = parseTimeValue(normalizedTime);
  const hour24 = parsed.period === 'PM' ? (parsed.hour % 12) + 12 : parsed.hour % 12;
  const hh = String(hour24).padStart(2, '0');
  const mm = String(parsed.minute).padStart(2, '0');
  return `${date}T${hh}:${mm}:00`;
}

function getTaskHistoryCutoff(filter: TaskHistoryFilter, customDays: string, customDate: string) {
  const now = new Date();
  const subtractDays = (days: number) => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff;
  };

  if (filter === 'date') {
    const normalized = customDate.trim();
    if (normalized) {
      const parsed = new Date(`${normalized}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return subtractDays(3);
  }

  if (filter === 'days') {
    const parsedDays = Number.parseInt(customDays.trim(), 10);
    if (Number.isFinite(parsedDays) && parsedDays >= 0) return subtractDays(parsedDays);
    return subtractDays(3);
  }

  if (filter === '7d') return subtractDays(7);
  if (filter === '10d') return subtractDays(10);
  if (filter === '20d') return subtractDays(20);
  if (filter === '30d') return subtractDays(30);
  if (filter === '180d') return subtractDays(180);
  return subtractDays(3);
}

function isTaskNotificationInRange(value: string, cutoff: Date | null) {
  if (!cutoff) return true;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() >= cutoff.getTime();
}

function isTaskOverdue(deadline: string) {
  const parsed = parseTaskDeadline(deadline);
  if (!parsed) return false;
  return parsed.getTime() < Date.now();
}

function getActivitySuggestions(query: string, limit: number = 8) {
  return getSuggestionsFromOptions(ACTIVITY_OPTIONS, query, limit);
}

function getStaffTaskSuggestions(query: string, limit: number = 8) {
  return getSuggestionsFromOptions(STAFF_TASK_OPTIONS, query, limit);
}

function getSuggestionsFromOptions(options: string[], query: string, limit: number) {
  const text = normalizeActivityText(query);
  if (!text) return [];
  if (options.some((option) => normalizeActivityText(option) === text)) return [];
  const queryWords = text.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return [];

  const startsWithMatches: string[] = [];
  const includesMatches: string[] = [];
  const seen = new Set<string>();

  options.forEach((activity) => {
    const normalized = normalizeActivityText(activity);
    if (seen.has(normalized)) return;
    seen.add(normalized);

    if (normalized === text) return;

    const words = normalized.split(/\s+/).filter(Boolean);
    const wordPrefixMatch = queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)));
    if (wordPrefixMatch) {
      startsWithMatches.push(activity);
      return;
    }
    if (normalized.includes(text)) includesMatches.push(activity);
  });

  return [...startsWithMatches, ...includesMatches].slice(0, limit);
}

function normalizeActivityText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatWeekDaysLabel(days: WeekDayCode[]) {
  if (days.length === 0) return 'Select days';
  return WEEK_DAYS.filter((day) => days.includes(day.code))
    .map((day) => day.label)
    .join(', ');
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

function normalizeDraftActivities(activities: DraftActivity[]) {
  return activities
    .map((activity) => ({
      ...activity,
      name: activity.name.trim(),
      timesPerWeek: String(activity.weekDays.length || Number(activity.timesPerWeek.trim()) || 1),
      time: normalizeTimeText(activity.time.trim() || '10:00 AM'),
      weekDays: activity.weekDays.length > 0 ? activity.weekDays : [jsDayToWeekDayCode(new Date().getDay())],
      timeSlots: [normalizeTimeText(activity.time.trim() || '10:00 AM')],
    }))
    .filter((activity) => activity.name);
}

function buildChildScheduleEvents(params: {
  childId: string;
  childName: string;
  activities: DraftActivity[];
  includeInParentCalendar: boolean;
  parentLabel: ParentLabel;
  monthsAhead: number;
}) {
  const { childId, childName, activities, includeInParentCalendar, parentLabel, monthsAhead } = params;
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + Math.max(1, monthsAhead));
  const scheduleEvents: CalendarEvent[] = [];

  activities.forEach((activity, activityIndex) => {
    const color = activity.color || '#64748b';
    const slots = activity.timeSlots.length > 0 ? activity.timeSlots : [activity.time || '10:00 AM'];
    const weekDays = activity.weekDays.length > 0 ? activity.weekDays : [jsDayToWeekDayCode(now.getDay())];

    weekDays.forEach((dayCode) => {
      const firstDate = getNextDateForWeekDay(dayCode, now);
      const cursor = new Date(firstDate);
      while (cursor <= endDate) {
        const dateText = cursor.toISOString().slice(0, 10);
        slots.forEach((timeSlot, timeIndex) => {
          const slot = normalizeTimeText(timeSlot);
          const seed = `${activityIndex}-${dayCode}-${timeIndex}-${dateText}`;
          scheduleEvents.push({
            id: `e-auto-child-${childId}-${seed}`,
            title: `${activity.name} (${childName})`,
            owner: 'child',
            ownerName: childName,
            ownerChildProfileId: childId,
            date: dateText,
            time: slot,
            category: childName,
            color,
          });

          if (includeInParentCalendar) {
            scheduleEvents.push({
              id: `e-auto-parent-${childId}-${seed}`,
              title: `${childName}: ${activity.name}`,
              owner: 'mother',
              ownerName: parentLabel,
              date: dateText,
              time: slot,
              category: 'Child Plan',
              color,
            });
          }
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    });
  });

  return scheduleEvents;
}

function buildStaffSchedule(params: {
  staffId: string;
  staffName: string;
  tasks: StaffDraftTask[];
  monthsAhead: number;
}) {
  const { staffId, staffName, tasks, monthsAhead } = params;
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + Math.max(1, monthsAhead));
  const taskItems: TaskItem[] = [];
  const calendarEvents: CalendarEvent[] = [];

  tasks.forEach((task, taskIndex) => {
    const weekDays = task.weekDays.length > 0 ? task.weekDays : [jsDayToWeekDayCode(now.getDay())];

    weekDays.forEach((dayCode) => {
      const firstDate = getNextDateForWeekDay(dayCode, now);
      const cursor = new Date(firstDate);
      let occurrenceIndex = 0;

      while (cursor <= endDate) {
        const dateText = cursor.toISOString().slice(0, 10);
        const seed = `${taskIndex}-${dayCode}-${dateText}-${occurrenceIndex}`;
        const taskId = `t-staff-${staffId}-${seed}`;

        taskItems.push({
          id: taskId,
          title: task.title,
          assigneeRole: 'staff',
          assigneeName: staffName,
          priority: task.priority,
          status: 'new',
          deadline: task.time ? `${dateText} ${task.time}` : dateText,
          needsParentApproval: false,
        });

        calendarEvents.push({
          id: taskId.replace(/^t-/, 'e-'),
          title: task.title,
          owner: 'staff',
          ownerName: staffName,
          date: dateText,
          time: task.time || '',
          category: 'Staff Task',
          color: task.priority === 'urgent' ? '#ef4444' : '#9ca3af',
        });

        occurrenceIndex += 1;
        cursor.setDate(cursor.getDate() + 7);
      }
    });
  });

  return { tasks: taskItems, events: calendarEvents };
}

function buildBirthdayEvents(params: {
  parentProfile: PersonalProfile;
  parentLabel: ParentLabel;
  parentDisplayName: string;
  children: ChildProfile[];
  staffProfiles: StaffProfile[];
  yearsAhead: number;
}) {
  const { parentProfile, parentLabel, parentDisplayName, children, staffProfiles, yearsAhead } = params;
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  const finalYear = currentYear + Math.max(1, yearsAhead);
  const events: CalendarEvent[] = [];

  const pushBirthdaySeries = (payload: {
    key: string;
    titleName: string;
    owner: Role;
    ownerName: string;
    dateOfBirth?: string;
    ownerChildProfileId?: string;
  }) => {
    const parsed = parseBirthDateFlexible(payload.dateOfBirth);
    if (!parsed) return;
    for (let year = lastYear; year <= finalYear; year += 1) {
      const birthdayDate = new Date(year, parsed.getMonth(), parsed.getDate());
      events.push({
        id: `birthday-${payload.key}-${year}`,
        title: `Birthday of ${payload.titleName}`,
        owner: payload.owner,
        ownerName: payload.ownerName,
        ownerChildProfileId: payload.ownerChildProfileId,
        date: toDateKey(birthdayDate),
        time: '09:00 AM',
        category: 'Birthday',
        color: '#f59e0b',
      });
    }
  };

  pushBirthdaySeries({
    key: `parent-${parentLabel.toLowerCase()}`,
    titleName: parentDisplayName,
    owner: 'mother',
    ownerName: parentLabel,
    dateOfBirth: parentProfile.dateOfBirth,
  });

  children.forEach((child) =>
    pushBirthdaySeries({
      key: `child-${child.id}`,
      titleName: child.name,
      owner: 'child',
      ownerName: child.name,
      dateOfBirth: child.dateOfBirth,
      ownerChildProfileId: child.id,
    }),
  );

  staffProfiles.forEach((profile) =>
    pushBirthdaySeries({
      key: `staff-${profile.id}`,
      titleName: profile.name,
      owner: 'staff',
      ownerName: profile.name,
      dateOfBirth: profile.dateOfBirth,
    }),
  );

  return events;
}

function mergeCalendarEventsWithBirthdays(baseEvents: CalendarEvent[], birthdayEvents: CalendarEvent[]) {
  const seen = new Set(baseEvents.map((event) => event.id));
  return [...baseEvents, ...birthdayEvents.filter((event) => !seen.has(event.id))].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return normalizeTimeText(a.time || '12:00 AM').localeCompare(normalizeTimeText(b.time || '12:00 AM'));
  });
}

function mergeRecipes(primary: Recipe[], fallback: Recipe[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((recipe) => {
    if (seen.has(recipe.id)) return false;
    seen.add(recipe.id);
    return true;
  });
}

function mergeWeeklyMealPlan(savedPlan: WeeklyMealPlanEntry[]) {
  const savedKeys = new Set(savedPlan.map((entry) => `${entry.profileKey || 'family'}-${entry.dayKey}-${entry.slot}`));
  const defaultFamilyPlan = createDefaultWeeklyMealPlan().filter((entry) => !savedKeys.has(`${entry.profileKey || 'family'}-${entry.dayKey}-${entry.slot}`));
  return [...savedPlan, ...defaultFamilyPlan];
}

function isAutoScheduleEventForChild(event: CalendarEvent, childId: string, childName: string) {
  if (event.id.startsWith(`e-auto-child-${childId}-`) || event.id.startsWith(`e-auto-parent-${childId}-`)) return true;
  if (event.ownerChildProfileId === childId) return true;
  if (event.owner === 'mother' && event.category === 'Child Plan' && event.title.startsWith(`${childName}:`)) return true;
  return false;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyParentLabelToTasks(tasks: TaskItem[], parentLabel: ParentLabel) {
  return tasks.map((task) => (task.assigneeRole === 'mother' || task.assigneeRole === 'admin' ? { ...task, assigneeName: parentLabel } : task));
}

function applyParentLabelToEvents(events: CalendarEvent[], parentLabel: ParentLabel) {
  return events.map((event) => (event.owner === 'mother' || event.owner === 'admin' ? { ...event, ownerName: parentLabel } : event));
}

function toUiRole(role: Role): UiRole {
  return role === 'admin' ? 'mother' : role;
}

function jsDayToWeekDayCode(jsDay: number): WeekDayCode {
  const found = WEEK_DAYS.find((day) => day.jsDay === jsDay);
  return found ? found.code : 'mon';
}

function getNextDateForWeekDay(dayCode: WeekDayCode, fromDate: Date = new Date()) {
  const target = WEEK_DAYS.find((day) => day.code === dayCode)?.jsDay ?? 1;
  const date = new Date(fromDate);
  const diff = (target - fromDate.getDay() + 7) % 7;
  date.setDate(fromDate.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function calcAge(dateOfBirth: string) {
  const dob = parseBirthDate(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

function isValidBirthDateInput(value: string) {
  const parsed = parseBirthDate(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return parsed <= now && parsed.getFullYear() >= 1900;
}

function parseBirthDate(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return new Date('invalid');
  const day = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const year = Number(match[3]);
  const parsed = new Date(year, monthIndex, day);
  const isExact =
    parsed.getFullYear() === year && parsed.getMonth() === monthIndex && parsed.getDate() === day;
  return isExact ? parsed : new Date('invalid');
}

function parseBirthDateFlexible(value?: string) {
  if (!value?.trim()) return null;
  const dotParsed = parseBirthDate(value);
  if (!Number.isNaN(dotParsed.getTime())) return dotParsed;
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return null;
  const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getErrorMessage(error: unknown, fallback: string) {
  const normalize = (message: string) => {
    if (
      message.includes("column of 'profiles' in the schema cache") ||
      message.includes("Could not find the 'date_of_birth' column of 'profiles'") ||
      message.includes("Could not find the 'nickname' column of 'profiles'") ||
      message.includes("Could not find the 'height_cm' column of 'profiles'") ||
      message.includes("Could not find the 'weight_kg' column of 'profiles'") ||
      message.includes("Could not find the 'cycle_tracking_enabled' column of 'profiles'") ||
      message.includes("Could not find the 'cycle_last_period_start' column of 'profiles'") ||
      message.includes("Could not find the 'cycle_length_days' column of 'profiles'") ||
      message.includes("Could not find the 'cycle_period_length_days' column of 'profiles'") ||
      message.includes("Could not find the 'cycle_entries_json' column of 'profiles'") ||
      message.includes("column 'date_of_birth' of relation 'profiles' does not exist") ||
      message.includes("column 'nickname' of relation 'profiles' does not exist") ||
      message.includes("column 'height_cm' of relation 'profiles' does not exist") ||
      message.includes("column 'weight_kg' of relation 'profiles' does not exist") ||
      message.includes("column 'cycle_tracking_enabled' of relation 'profiles' does not exist") ||
      message.includes("column 'cycle_last_period_start' of relation 'profiles' does not exist") ||
      message.includes("column 'cycle_length_days' of relation 'profiles' does not exist") ||
      message.includes("column 'cycle_period_length_days' of relation 'profiles' does not exist") ||
      message.includes("column 'cycle_entries_json' of relation 'profiles' does not exist") ||
      message.includes('Supabase profiles table is missing personal profile columns')
    ) {
      return 'Supabase profile table is not updated yet. Run /Users/ksu/promom/smart-mom-app/supabase/profile_patch.sql in the Supabase SQL Editor, then try Save again.';
    }
    if (
      message.includes('Supabase weekly meal plan table is missing') ||
      message.includes("relation \"public.weekly_meal_plans\" does not exist") ||
      message.includes("Could not find the table 'public.weekly_meal_plans'") ||
      message.includes("Could not find the table 'weekly_meal_plans'")
    ) {
      return 'Supabase weekly meal plan table is not updated yet. Run /Users/ksu/promom/smart-mom-app/supabase/weekly_meal_plans.sql in the Supabase SQL Editor, then refresh the app.';
    }
    if (
      message.includes('Supabase habits table is missing') ||
      message.includes('Supabase nutrition table is missing') ||
      message.includes("relation \"public.habit_entries\" does not exist") ||
      message.includes("relation \"public.nutrition_entries\" does not exist") ||
      message.includes("Could not find the table 'public.habit_entries'") ||
      message.includes("Could not find the table 'public.nutrition_entries'") ||
      message.includes("Could not find the table 'habit_entries'") ||
      message.includes("Could not find the table 'nutrition_entries'")
    ) {
      return 'Supabase habits/nutrition tables are not updated yet. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then refresh the app.';
    }
    return message;
  };

  if (error instanceof Error && error.message) return normalize(error.message);
  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error ? error.message : null;
    const maybeDetails = 'details' in error ? error.details : null;
    const maybeHint = 'hint' in error ? error.hint : null;
    const parts = [maybeMessage, maybeDetails, maybeHint].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    if (parts.length > 0) return normalize(parts.join(' '));
  }
  return fallback;
}

const createStyles = (colors: ThemeColors, themeName: ThemeName) => {
  const neonBloomActiveFill = themeName === 'neonBloom' ? 'rgba(140, 158, 255, 0.26)' : colors.selection;
  const neonBloomActiveBorder = themeName === 'neonBloom' ? '#ef55a5' : colors.primary;
  const neonBloomActiveText = themeName === 'neonBloom' ? '#ffffff' : colors.primary;
  const orbAColor =
    themeName === 'mocha' ? 'rgba(255, 244, 236, 0.08)' : 'rgba(255,255,255,0.45)';
  const orbBColor =
    themeName === 'mocha' ? 'rgba(111, 77, 58, 0.12)' : 'rgba(191,219,254,0.55)';
  const orbCColor =
    themeName === 'mocha' ? 'rgba(34, 23, 18, 0.08)' : 'rgba(255,255,255,0.25)';

  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bgDecor: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgOrbA: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: orbAColor,
    top: -70,
    left: -40,
  },
  bgOrbB: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: orbBColor,
    top: 150,
    right: -70,
  },
  bgOrbC: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: orbCColor,
    bottom: -120,
    left: 40,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  accountMenuModalRoot: {
    flex: 1,
  },
  accountMenuModalLayer: {
    position: 'absolute',
    top: 8,
    right: 16,
    left: 16,
    alignItems: 'flex-end',
    zIndex: 60,
  },
  header: {
    marginHorizontal: 16,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  headerActions: {
    position: 'relative',
    alignItems: 'flex-end',
    zIndex: 90,
  },
  menuButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  menuButtonAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  menuButtonText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  accountMenu: {
    marginTop: 54,
    width: 248,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  accountMenuHeader: {
    gap: 2,
  },
  accountMenuTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  accountMenuStatus: {
    color: colors.subtext,
    fontWeight: '600',
    fontSize: 13,
  },
  accountMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.8,
  },
  accountMenuItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountMenuItemText: {
    color: colors.text,
    fontWeight: '700',
  },
  accountMenuPrimaryItem: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.primary,
  },
  accountMenuPrimaryItemText: {
    color: '#fff',
    fontWeight: '800',
  },
  accountMenuSection: {
    gap: 8,
  },
  accountMenuSectionLabel: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountThemeSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountThemeSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountThemeSwatchInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  themeSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  themeSwatchActive: {
    borderColor: colors.text,
  },
  accountMenuDangerItem: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  accountMenuDangerText: {
    color: '#b91c1c',
  },
  h1: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  sub: {
    color: colors.subtext,
    marginTop: 2,
  },
  warning: {
    backgroundColor: 'rgba(255,243,199,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 16,
  },
  warningText: {
    color: '#92400e',
    fontWeight: '600',
  },
  authCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  authTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.98)',
    color: colors.text,
  },
  authActions: {
    flexDirection: 'row',
    gap: 8,
  },
  authBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: 'rgba(37,99,235,0.28)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  authSecondary: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
  },
  authBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  authSecondaryText: {
    color: colors.primary,
  },
  completedBtn: {
    backgroundColor: colors.done,
  },
  reminderBtn: {
    backgroundColor: colors.urgent,
  },
  authBtnDisabled: {
    opacity: 0.6,
  },
  authBtnDimmed: {
    opacity: 0.55,
  },
  taskFilterBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selection,
  },
  taskFilterBtnTextActive: {
    color: colors.primary,
  },
  authInfoText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '600',
    marginTop: -2,
    marginBottom: 6,
  },
  authSwitchText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskFiltersPanel: {
    marginTop: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSoft,
    gap: 8,
  },
  taskFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.glassStrong,
  },
  taskFilterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selection,
  },
  taskFilterChipText: {
    color: colors.text,
    fontWeight: '600',
  },
  taskFilterChipTextActive: {
    color: colors.primary,
  },
  staffMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  staffMonthLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  activityDraftCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 10,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  staffTaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  staffTaskInputWrap: {
    flex: 1,
    gap: 6,
  },
  staffTaskInput: {
    marginBottom: 0,
  },
  staffTaskTimeLabel: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.99)',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  suggestionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  activityDraftRow: {
    flexDirection: 'row',
    gap: 8,
  },
  activitySmallInput: {
    flex: 1,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  dropdownValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.text,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  staffDayDot: {
    position: 'absolute',
    bottom: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
  createHint: {
    color: colors.subtext,
    fontWeight: '600',
  },
  clockBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.selection,
  },
  clockBtnText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  item: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  meta: {
    color: colors.subtext,
    fontSize: 13,
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
  empty: {
    color: colors.subtext,
  },
  dropdownPlaceholder: {
    color: colors.subtext,
    fontWeight: '600',
  },
  dropdownPanel: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.99)',
    padding: 8,
  },
  dropdownChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dropdownChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  dropdownChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selection,
  },
  dropdownChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownChipTextActive: {
    color: colors.primary,
  },
  activityColorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityColorDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  activityColorDotActive: {
    borderColor: '#0f172a',
    borderWidth: 2,
  },
  roleRowWrap: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 8,
    zIndex: 260,
    elevation: 18,
  },
  roleRowWrapTop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    zIndex: 260,
    elevation: 18,
  },
  roleRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingRight: 8,
  },
  roleRowTop: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  childActionsWrap: {
    position: 'relative',
    width: 38,
    height: 38,
    overflow: 'visible',
    zIndex: 50,
    elevation: 8,
  },
  childActionsBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childActionsBtnDisabled: {
    opacity: 0.45,
  },
  childActionsIcon: {
    color: '#475569',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -2,
  },
  childActionsInlineMenu: {
    position: 'absolute',
    right: 44,
    top: 0,
    width: 160,
    backgroundColor: colors.glassStrong,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    zIndex: 120,
    elevation: 12,
  },
  childActionsModalItem: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childActionsInlineDelete: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#fff1f2',
  },
  filtersActionsWrap: {
    position: 'relative',
    width: 38,
    height: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 90,
  },
  filtersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filtersHoverLabel: {
    position: 'absolute',
    right: 46,
    top: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.62)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 150,
    elevation: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  filtersHoverLabelText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  filtersActionsMenu: {
    position: 'absolute',
    right: 0,
    top: 44,
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    zIndex: 140,
    elevation: 14,
  },
  childActionsMenuText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  childActionsDeleteText: {
    color: colors.urgent,
  },
  parentToggleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  parentPickerWrap: {
    position: 'relative',
    width: 120,
    zIndex: 280,
  },
  parentPickerPanel: {
    marginTop: 6,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.glassStrong,
  },
  parentPickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  parentPickerItemActive: {
    backgroundColor: colors.selection,
  },
  parentPickerText: {
    color: colors.text,
    fontWeight: '700',
  },
  parentPickerTextActive: {
    color: colors.primary,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  roleChipActive: {
    borderColor: neonBloomActiveBorder,
    backgroundColor: neonBloomActiveFill,
  },
  roleChipText: {
    color: colors.text,
    fontWeight: '700',
  },
  roleChipTextActive: {
    color: neonBloomActiveText,
  },
  staffRoleChip: {
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  staffRoleChipActive: {
    borderColor: neonBloomActiveBorder,
    backgroundColor: neonBloomActiveFill,
  },
  staffRoleChipText: {
    color: '#4b5563',
  },
  staffRoleChipTextActive: {
    color: neonBloomActiveText,
  },
  nav: {
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
    zIndex: 1,
  },
  calendarTasksSummary: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarTasksSummaryInline: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.glassSoft,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarTasksSummaryTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  calendarTasksSummaryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  calendarTasksSummaryMeta: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  calendarTasksSummaryBadge: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.selection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTasksSummaryBadgeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  navBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.glassStrong,
  },
  navBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selection,
  },
  navText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  navTextActive: {
    color: colors.primary,
  },
  body: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  clockModalCard: {
    backgroundColor: 'rgba(248,250,252,0.97)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  childEditorModalCard: {
    backgroundColor: 'rgba(248,250,252,0.97)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    padding: 14,
    gap: 10,
    maxHeight: '86%',
  },
  signInModalCard: {
    backgroundColor: 'rgba(248,250,252,0.97)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    padding: 16,
    gap: 8,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  childEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  childEditorBody: {
    maxHeight: 430,
  },
  childEditorBodyContent: {
    gap: 10,
    paddingBottom: 6,
  },
  modalSub: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '600',
  },
  clockDial: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSoft,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockNumber: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockNumberActive: {
    backgroundColor: colors.selection,
    borderColor: colors.primary,
  },
  clockNumberText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  ampmToggle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.selection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmText: {
    color: colors.primary,
    fontWeight: '800',
  },
  timePreview: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  timeDoneText: {
    color: '#16a34a',
  },
  activityRemoveText: {
    color: '#dc2626',
  },
  });
};
