import { StatusBar } from 'expo-status-bar';
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { inferShoppingItemCategory } from '@/lib/shopping';
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
  deleteCalendarEvent,
  deleteChildProfile,
  deleteRecipe,
  deleteShoppingList,
  deleteShoppingShare,
  getOrCreateSessionContext,
  getMyProfile,
  getWeeklyMealPlanRecord,
  getUserPreferences,
  listCalendarEvents,
  listCycleEntries,
  listChildProfiles,
  listCompletedTaskNotifications,
  listChores,
  listCustomNutritionFoods,
  listFridgeItems,
  listHabitEntries,
  listHomeIssues,
  listHomeProviders,
  listNutritionEntries,
  listApprovalRequests,
  listPurchaseRequests,
  listRecipes,
  listShoppingLists,
  listShoppingShares,
  listStaffProfiles,
  listStaffReminderNotifications,
  listTasks,
  markCompletedTaskNotificationsRead,
  resolveApprovalRequest,
  replaceGeneratedChildEvents,
  replaceCycleEntries,
  replaceChores,
  replaceCustomNutritionFoods,
  replaceHomeIssues,
  replaceHomeProviders,
  replaceFridgeItems,
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
  updateShoppingListMeta,
  updatePurchaseRequestStatus,
  updateShoppingListItems,
  updateCalendarEvent,
  upsertChildProfileRecord,
  upsertMyProfile,
  upsertStaffProfileRecord,
  upsertStaffReminderNotification,
  upsertUserPreferences,
  upsertWeeklyMealPlanRecord,
  updatePassword,
  updateRecipe,
  updateTaskStatus,
} from '@/lib/tasks';
import { getNutritionPlan } from '@/lib/nutrition';
import { choreStatus } from '@/lib/chores';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { ChoresScreen } from '@/screens/ChoresScreen';
import { FixItScreen } from '@/screens/FixItScreen';
import { ChildrenScreen } from '@/screens/ChildrenScreen';
import { HabitsScreen } from '@/screens/HabitsScreen';
import { NutritionScreen } from '@/screens/NutritionScreen';
import { MealPlannerScreen } from '@/screens/MealPlannerScreen';
import { RecipesScreen } from '@/screens/RecipesScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ShoppingScreen } from '@/screens/ShoppingScreen';
import { ThemeColors, ThemeName, ThemeProvider, themePalettes, useTheme } from '@/theme/theme';
import { ActivityLevel, ApprovalRequest, CalendarEvent, CalendarScope, ChildProfile, CustomNutritionFood, CycleDayEntry, FridgeItem, FridgeItemCategory, FridgeItemStatus, FridgeItemUnit, Chore, HabitChallenge, HabitEntry, HomeIssue, HomeProvider, MealPlanSlot, NutritionFoodEntry, NutritionGoal, NutritionMealType, NutritionPace, NutritionSex, PersonalProfile, PurchaseRequest, Recipe, Role, ShoppingItem, ShoppingItemInsight, ShoppingListDoc, ShoppingShare, TaskItem, TaskPriority, TaskStatus, WeeklyMealPlanEntry } from '@/types/app';

const HOME_TODAYS_MEALS_COVER = require('./assets/home/todays-meals-cover-v3.jpg');
const HOME_SHOPPING_LIST_COVER = require('./assets/home/shopping-list-cover-v3.jpg');

type Screen = 'calendar' | 'food' | 'family' | 'wellness' | 'fixit';
type FamilyTab = 'children' | 'chores';
type FoodTab = 'recipes' | 'plan' | 'shopping';
type AuthMode = 'signin' | 'signup' | 'reset' | 'recover';
type ParentLabel = 'Mom' | 'Dad';
type UiRole = Exclude<Role, 'admin'>;
type DashboardCalendarQuickAction = { type: 'add-plan' | 'today' | 'log-period'; token: number } | null;
type DashboardNutritionQuickAction = { type: 'add-meal'; mealType: NutritionMealType; token: number } | null;
type DashboardShoppingQuickAction = { type: 'add-item' | 'create-basket' | 'use-basket'; token: number } | null;
type DashboardFamilyQuickAction = { type: 'add-activity'; token: number } | null;
type DashboardWellnessQuickAction = { type: 'create-habit'; token: number } | null;
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
type ActivityColorEditorTarget = {
  activityId: string;
  target: 'draft' | 'child';
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
type DailyGuidanceCard = {
  id: string;
  title: string;
  message: string;
  focus: string;
  accent: string;
  backVariant: 'moon' | 'bloom' | 'wave';
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
type MealPlanProfilePreference = {
  key: string;
  label: string;
};

type DailyCardLocalState = {
  dateKey: string;
  selectedCardId: string | null;
  promptShown: boolean;
};

const LEGACY_LOCAL_SHOPPING_LISTS_KEY = 'smartmom.shoppingLists.v1';
const LOCAL_SHOPPING_LISTS_KEY = 'smartmom.shoppingLists.v2';
const LOCAL_SHOPPING_BOOTSTRAP_KEY = 'smartmom.shoppingBootstrap.v1';
const LOCAL_SHOPPING_INSIGHTS_KEY = 'smartmom.shoppingInsights.v1';
const LOCAL_FRIDGE_ITEMS_KEY = 'smartmom.fridgeItems.v1';
const LOCAL_CHILDREN_KEY = 'smartmom.children.v1';
const LOCAL_HABITS_KEY = 'smartmom.habits.v1';
const LOCAL_HABIT_REMINDERS_KEY = 'smartmom.habitRemindersEnabled.v1';
const LOCAL_PERIOD_REMINDERS_KEY = 'smartmom.periodRemindersEnabled.v1';
const LOCAL_PERIOD_REMINDER_LEAD_DAYS_KEY = 'smartmom.periodReminderLeadDays.v1';
const LOCAL_PERSONAL_PROFILE_KEY = 'smartmom.personalProfile.v1';
const LOCAL_DAILY_CARD_STATE_KEY = 'smartmom.dailyCardState.v1';

const DEFAULT_MEAL_PLAN_PROFILES: MealPlanProfilePreference[] = [
  { key: 'family', label: 'Family' },
  { key: 'adults', label: 'Adults' },
  { key: 'kids', label: 'Kids' },
];
const DEFAULT_MEAL_PLAN_PROFILE_KEYS = new Set(DEFAULT_MEAL_PLAN_PROFILES.map((profile) => profile.key));

function mergeMealPlanProfiles(profiles: MealPlanProfilePreference[]) {
  const seen = new Set<string>();
  const merged = [...DEFAULT_MEAL_PLAN_PROFILES, ...profiles].filter((profile) => {
    if (!profile?.key || !profile?.label) return false;
    if (seen.has(profile.key)) return false;
    seen.add(profile.key);
    return true;
  });
  return merged;
}

function deriveMealPlanProfilesFromEntries(entries: WeeklyMealPlanEntry[]): MealPlanProfilePreference[] {
  const derived = entries
    .map((entry) => ({
      key: entry.profileKey,
      label: entry.profileLabel,
    }))
    .filter(
      (profile): profile is MealPlanProfilePreference =>
        !!profile.key && !!profile.label && !DEFAULT_MEAL_PLAN_PROFILES.some((item) => item.key === profile.key),
    );
  return mergeMealPlanProfiles(derived);
}

function getCustomMealPlanProfiles(profiles: MealPlanProfilePreference[]) {
  return profiles.filter((profile) => !DEFAULT_MEAL_PLAN_PROFILE_KEYS.has(profile.key));
}

const DAILY_GUIDANCE_LIBRARY: DailyGuidanceCard[] = [
  { id: 'dg-01', title: 'Slow Down', message: 'It’s okay to slow down and just be.', focus: 'presence', accent: '#6d5dfc', backVariant: 'moon' },
  { id: 'dg-02', title: 'This Will Pass', message: 'Even this moment is temporary.', focus: 'perspective', accent: '#2b78ff', backVariant: 'wave' },
  { id: 'dg-03', title: 'No Perfection', message: 'You don’t have to handle everything perfectly.', focus: 'self-compassion', accent: '#b44b8a', backVariant: 'bloom' },
  { id: 'dg-04', title: 'Enough Already', message: 'You’re already doing enough.', focus: 'enoughness', accent: '#9146ff', backVariant: 'moon' },
  { id: 'dg-05', title: 'Take Time', message: 'You can give yourself time.', focus: 'patience', accent: '#dd5e5e', backVariant: 'bloom' },
  { id: 'dg-06', title: 'You Are Okay', message: 'You are okay, even if things feel hard right now.', focus: 'inner safety', accent: '#4677e8', backVariant: 'wave' },
  { id: 'dg-07', title: 'Keep Going', message: 'Sometimes it’s enough just not to give up.', focus: 'endurance', accent: '#c98b3f', backVariant: 'moon' },
  { id: 'dg-08', title: 'Pause Here', message: 'You are allowed to pause.', focus: 'rest', accent: '#4f8a6a', backVariant: 'bloom' },
  { id: 'dg-09', title: 'No Rush', message: 'Not everything has to be figured out right away.', focus: 'trust', accent: '#4f6fd9', backVariant: 'wave' },
  { id: 'dg-10', title: 'One Step', message: 'You can move forward one step at a time.', focus: 'small steps', accent: '#8a4fa8', backVariant: 'bloom' },
  { id: 'dg-11', title: 'Be Gentle', message: 'Today, you can be gentler with yourself.', focus: 'gentleness', accent: '#6f57d9', backVariant: 'moon' },
  { id: 'dg-12', title: 'Set It Down', message: 'You don’t have to be strong all the time.', focus: 'softness', accent: '#d06a8d', backVariant: 'bloom' },
  { id: 'dg-13', title: 'Small Matters', message: 'Even a small step matters.', focus: 'progress', accent: '#4b74c9', backVariant: 'wave' },
  { id: 'dg-14', title: 'Answers Later', message: 'It’s okay not to have all the answers yet.', focus: 'uncertainty', accent: '#c16958', backVariant: 'moon' },
  { id: 'dg-15', title: 'You’ve Carried Much', message: 'You’ve already handled a lot.', focus: 'recognition', accent: '#a24f7b', backVariant: 'bloom' },
  { id: 'dg-16', title: 'Not Forever', message: 'This does not define you forever.', focus: 'hope', accent: '#3d77f0', backVariant: 'wave' },
  { id: 'dg-17', title: 'Release Tension', message: 'You can release the tension you’re holding.', focus: 'relief', accent: '#8557d6', backVariant: 'moon' },
  { id: 'dg-18', title: 'Not Alone', message: 'You’re not alone in this.', focus: 'support', accent: '#bf5e85', backVariant: 'bloom' },
  { id: 'dg-19', title: 'For Now', message: 'For now, it’s enough to keep going.', focus: 'continuation', accent: '#4f79d8', backVariant: 'wave' },
  { id: 'dg-20', title: 'Feel It', message: 'You are allowed to feel everything you feel.', focus: 'emotional permission', accent: '#d26f8a', backVariant: 'bloom' },
  { id: 'dg-21', title: 'In Its Time', message: 'Everything will come in its own time.', focus: 'timing', accent: '#6b63f2', backVariant: 'moon' },
  { id: 'dg-22', title: 'Rest Freely', message: 'You can allow yourself to rest without explanation.', focus: 'rest without guilt', accent: '#d29b53', backVariant: 'wave' },
  { id: 'dg-23', title: 'Closer Than You Think', message: 'You’re closer than you think.', focus: 'encouragement', accent: '#5a8e6e', backVariant: 'bloom' },
  { id: 'dg-24', title: 'Not Yet Clear', message: 'Not everything needs to make sense right now.', focus: 'acceptance', accent: '#4d73c8', backVariant: 'wave' },
  { id: 'dg-25', title: 'Your Own Way', message: 'You’re handling things in your own way — and that’s enough.', focus: 'self-acceptance', accent: '#b5659a', backVariant: 'bloom' },
  { id: 'dg-26', title: 'Your Rhythm', message: 'You can trust your own rhythm.', focus: 'rhythm', accent: '#6758d7', backVariant: 'moon' },
  { id: 'dg-27', title: 'This Will Move', message: 'This moment will not last forever.', focus: 'change', accent: '#416fd1', backVariant: 'wave' },
  { id: 'dg-28', title: 'Choose Care', message: 'You can choose to take care of yourself.', focus: 'self-care', accent: '#c95f78', backVariant: 'bloom' },
  { id: 'dg-29', title: 'Strength Within', message: 'There is already strength within you.', focus: 'inner strength', accent: '#6c5de0', backVariant: 'moon' },
  { id: 'dg-30', title: 'Calmly Through', message: 'You will get through this — calmly, in your own time.', focus: 'calm resilience', accent: '#4979dc', backVariant: 'wave' },
  { id: 'dg-31', title: 'Universe', message: 'Create your own universe.', focus: 'creation', accent: '#d07b48', backVariant: 'wave' },
  { id: 'dg-32', title: 'Receive More', message: 'Want more — receive more.', focus: 'expansion', accent: '#9d57cf', backVariant: 'moon' },
  { id: 'dg-33', title: 'Follow Dreams', message: 'Follow your dreams.', focus: 'vision', accent: '#ef6d74', backVariant: 'bloom' },
  { id: 'dg-34', title: 'Your Light', message: 'Give the world a chance to enjoy your light.', focus: 'radiance', accent: '#dd8f46', backVariant: 'wave' },
  { id: 'dg-35', title: 'Start Doing', message: 'Stop thinking. Start doing.', focus: 'action', accent: '#4c79db', backVariant: 'moon' },
  { id: 'dg-36', title: 'Sexy Plan', message: 'Life plan: create and stay sexy.', focus: 'magnetism', accent: '#d05d95', backVariant: 'bloom' },
  { id: 'dg-37', title: 'Courage', message: 'Creativity takes courage.', focus: 'creative courage', accent: '#6e5ce0', backVariant: 'moon' },
  { id: 'dg-38', title: 'Action First', message: 'Action builds confidence — not the other way around.', focus: 'momentum', accent: '#2f74c8', backVariant: 'wave' },
  { id: 'dg-39', title: 'More Than You Think', message: 'You can do more than you think.', focus: 'capacity', accent: '#aa63cf', backVariant: 'bloom' },
  { id: 'dg-40', title: 'You’ve Got This', message: 'You’ve got this.', focus: 'belief', accent: '#4f8c6a', backVariant: 'wave' },
  { id: 'dg-41', title: 'Do What Makes You Happy', message: 'Don’t overthink — just do what makes you happy.', focus: 'joy', accent: '#d06d51', backVariant: 'bloom' },
  { id: 'dg-42', title: 'I’ll Handle It', message: 'Whatever — I’ll handle it.', focus: 'self-command', accent: '#5076d6', backVariant: 'moon' },
  { id: 'dg-43', title: 'Own Beauty', message: 'Everyone has their own kind of beautiful.', focus: 'beauty', accent: '#cf7a9e', backVariant: 'bloom' },
  { id: 'dg-44', title: 'Focus Inward', message: 'Focus on yourself.', focus: 'self-focus', accent: '#785ed8', backVariant: 'moon' },
  { id: 'dg-45', title: 'Go Higher', message: 'Anything is possible — go higher.', focus: 'elevation', accent: '#d89c44', backVariant: 'wave' },
  { id: 'dg-46', title: 'Think Bigger', message: 'Think bigger. Go further. Move forward.', focus: 'growth', accent: '#4a76d0', backVariant: 'wave' },
  { id: 'dg-47', title: 'Heart Knows', message: 'Listen to your heart.', focus: 'heart', accent: '#cb628a', backVariant: 'bloom' },
  { id: 'dg-48', title: 'Dreams Need Effort', message: 'Dreams require effort.', focus: 'discipline', accent: '#7161de', backVariant: 'moon' },
  { id: 'dg-49', title: 'Be Here Now', message: 'Spend less time in your head — be here now.', focus: 'presence', accent: '#4b8d90', backVariant: 'wave' },
  { id: 'dg-50', title: 'Exactly You', message: 'It’s good that you are exactly who you are.', focus: 'self-worth', accent: '#d06b70', backVariant: 'bloom' },
  { id: 'dg-51', title: 'Fear Won’t Stop You', message: 'Fear is not a reason to stop.', focus: 'bravery', accent: '#526fce', backVariant: 'moon' },
  { id: 'dg-52', title: 'Be Yourself', message: 'Be yourself — the world will adjust.', focus: 'authenticity', accent: '#c66e95', backVariant: 'bloom' },
  { id: 'dg-53', title: 'Stronger Belief', message: 'Let your belief in yourself be stronger than your fears.', focus: 'self-belief', accent: '#5f62de', backVariant: 'moon' },
  { id: 'dg-54', title: 'Create the Future', message: 'The future isn’t predicted — it’s created.', focus: 'agency', accent: '#db8d4d', backVariant: 'wave' },
  { id: 'dg-55', title: 'Better Than Yesterday', message: 'Be better than yesterday, not better than others.', focus: 'personal growth', accent: '#4f8d6f', backVariant: 'wave' },
  { id: 'dg-56', title: 'Perfect Time', message: 'Now is the perfect time to start.', focus: 'beginning', accent: '#5477d2', backVariant: 'moon' },
  { id: 'dg-57', title: 'Goals', message: 'Turn your dreams into goals.', focus: 'direction', accent: '#c96f8d', backVariant: 'bloom' },
  { id: 'dg-58', title: 'Capture Life', message: 'Eat. Love. Capture.', focus: 'living fully', accent: '#d58e51', backVariant: 'wave' },
  { id: 'dg-59', title: 'Create Dream Love', message: 'Create. Dream. Love.', focus: 'essence', accent: '#8e61db', backVariant: 'moon' },
  { id: 'dg-60', title: 'Bold Simple Consistent', message: 'Bold. Simple. Consistent.', focus: 'consistency', accent: '#447ac4', backVariant: 'wave' },
];

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadLocalDailyCardState(todayKey: string = getTodayKey()): DailyCardLocalState {
  const fallback: DailyCardLocalState = {
    dateKey: todayKey,
    selectedCardId: null,
    promptShown: false,
  };
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return fallback;
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_DAILY_CARD_STATE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    if (parsed.dateKey !== todayKey) return fallback;
    return {
      dateKey: todayKey,
      selectedCardId: typeof parsed.selectedCardId === 'string' ? parsed.selectedCardId : null,
      promptShown: !!parsed.promptShown,
    };
  } catch {
    return fallback;
  }
}

function persistLocalDailyCardState(state: DailyCardLocalState) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    globalThis.localStorage.setItem(LOCAL_DAILY_CARD_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; daily cards still work in memory.
  }
}

function hashStringToSeed(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

function seededShuffle<T>(source: T[], seedString: string) {
  const next = [...source];
  let seed = hashStringToSeed(seedString);
  for (let index = next.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

const DAILY_GUIDANCE_ROTATION = seededShuffle(DAILY_GUIDANCE_LIBRARY, 'daily-guidance-rotation-v1');

function getDayIndex(dateKey: string) {
  const [yearText, monthText, dayText] = dateKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return 0;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function pickDailyGuidanceCards(dateKey: string) {
  const source = DAILY_GUIDANCE_ROTATION;
  if (source.length <= 3) return source;
  const dayIndex = getDayIndex(dateKey);
  const startIndex = Math.abs((dayIndex * 7) % source.length);
  return Array.from({ length: 3 }, (_, offset) => source[(startIndex + offset) % source.length]);
}

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

const DASHBOARD_MEAL_CHOICES: Array<{ key: NutritionMealType; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
  { key: 'other', label: 'Other' },
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
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const styles = useMemo(() => createStyles(colors, themeName, isMobile), [colors, themeName, isMobile]);
  const initialDailyCardStateRef = useRef<DailyCardLocalState>(loadLocalDailyCardState());
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
  const [children, setChildren] = useState<ChildProfile[]>(() => loadLocalChildren());
  const [shoppingLists, setShoppingLists] = useState<ShoppingListDoc[]>(() => loadLocalShoppingLists());
  const [shoppingBootstrapComplete, setShoppingBootstrapComplete] = useState(() => loadShoppingBootstrapComplete());
  const [shoppingInsights, setShoppingInsights] = useState<ShoppingItemInsight[]>(() => loadLocalShoppingInsights());
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>(() => loadLocalFridgeItems());
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<WeeklyMealPlanEntry[]>(createDefaultWeeklyMealPlan);
  const [mealPlanProfiles, setMealPlanProfiles] = useState<MealPlanProfilePreference[]>(DEFAULT_MEAL_PLAN_PROFILES);
  const [activeMealPlanProfileKey, setActiveMealPlanProfileKey] = useState('family');
  const [nutritionGoal, setNutritionGoal] = useState<NutritionGoal>('maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [nutritionSex, setNutritionSex] = useState<NutritionSex>('female');
  const [desiredWeight, setDesiredWeight] = useState('');
  const [nutritionPace, setNutritionPace] = useState<NutritionPace>('flexible');
  const [calorieOverride, setCalorieOverride] = useState('');
  const [nutritionEntries, setNutritionEntries] = useState<NutritionFoodEntry[]>([]);
  const [customNutritionFoods, setCustomNutritionFoods] = useState<CustomNutritionFood[]>([]);
  const [homeIssues, setHomeIssues] = useState<HomeIssue[]>([]);
  const [homeProviders, setHomeProviders] = useState<HomeProvider[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [familyTab, setFamilyTab] = useState<FamilyTab>('children');
  const [habits, setHabits] = useState<HabitEntry[]>(() => loadLocalHabits());
  const [habitChallenges] = useState<HabitChallenge[]>([]);
  const [habitRemindersEnabled, setHabitRemindersEnabled] = useState(() => loadLocalHabitRemindersEnabled());
  const [periodRemindersEnabled, setPeriodRemindersEnabled] = useState(() => loadLocalPeriodRemindersEnabled());
  const [periodReminderLeadDays, setPeriodReminderLeadDays] = useState(() => loadLocalPeriodReminderLeadDays());
  const [shoppingShares, setShoppingShares] = useState<ShoppingShare[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [session, setSession] = useState<AppSession | null>(null);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authPasswordVisible, setAuthPasswordVisible] = useState(false);
  const [authPasswordConfirmVisible, setAuthPasswordConfirmVisible] = useState(false);
  const [authSignupSex, setAuthSignupSex] = useState<NutritionSex>('female');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [dashboardMealPickerOpen, setDashboardMealPickerOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [foodTab, setFoodTab] = useState<FoodTab>('recipes');
  const [dashboardCalendarQuickAction, setDashboardCalendarQuickAction] = useState<DashboardCalendarQuickAction>(null);
  const [dashboardNutritionQuickAction, setDashboardNutritionQuickAction] = useState<DashboardNutritionQuickAction>(null);
  const [dashboardShoppingQuickAction, setDashboardShoppingQuickAction] = useState<DashboardShoppingQuickAction>(null);
  const [dashboardFamilyQuickAction, setDashboardFamilyQuickAction] = useState<DashboardFamilyQuickAction>(null);
  const [dashboardWellnessQuickAction, setDashboardWellnessQuickAction] = useState<DashboardWellnessQuickAction>(null);
  const [dailyCardDateKey, setDailyCardDateKey] = useState(() => initialDailyCardStateRef.current.dateKey);
  const [selectedDailyCardId, setSelectedDailyCardId] = useState<string | null>(() => initialDailyCardStateRef.current.selectedCardId);
  const [dailyCardsModalOpen, setDailyCardsModalOpen] = useState(false);
  const [dailyCardsReady, setDailyCardsReady] = useState(false);
  const [dailyCardPromptShown, setDailyCardPromptShown] = useState(() => initialDailyCardStateRef.current.promptShown);
  const [revealingDailyCardId, setRevealingDailyCardId] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [personalProfileStatus, setPersonalProfileStatus] = useState<string | null>(null);
  const [personalProfileError, setPersonalProfileError] = useState<string | null>(null);
  const [personalProfileReadonly, setPersonalProfileReadonly] = useState(false);
  const [savedPersonalFullName, setSavedPersonalFullName] = useState('');
  const [savedPersonalDateOfBirth, setSavedPersonalDateOfBirth] = useState('');

  function PasswordEyeIcon({ visible, color }: { visible: boolean; color: string }) {
    return (
      <View style={[styles.passwordEyeIcon, { borderColor: color }]}>
        <View style={[styles.passwordEyePupil, { backgroundColor: color }]} />
        {visible ? null : <View style={[styles.passwordEyeSlash, { backgroundColor: color }]} />}
      </View>
    );
  }

  const [calendarScope, setCalendarScope] = useState<CalendarScope>('family');
  const [activeOwnerFilter, setActiveOwnerFilter] = useState<string>('mother');
  const [activeChildRoleId, setActiveChildRoleId] = useState<string | null>(null);
  const [activeStaffProfileId, setActiveStaffProfileId] = useState<string | null>(null);
  const [parentLabel, setParentLabel] = useState<ParentLabel>('Mom');
  const [personalProfile, setPersonalProfile] = useState<PersonalProfile>(() => loadLocalPersonalProfile());
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
  const habitsLoadedRef = useRef(false);
  const nutritionLoadedRef = useRef(false);
  const customNutritionFoodsLoadedRef = useRef(false);
  const homeFixitLoadedRef = useRef(false);
  const homeIssuesRef = useRef<HomeIssue[]>([]);
  const homeProvidersRef = useRef<HomeProvider[]>([]);
  const homeIssuesSaveInFlightRef = useRef(false);
  const homeIssuesNeedsResaveRef = useRef(false);
  const homeProvidersSaveInFlightRef = useRef(false);
  const homeProvidersNeedsResaveRef = useRef(false);
  const choresLoadedRef = useRef(false);
  const choresRef = useRef<Chore[]>([]);
  const choresSaveInFlightRef = useRef(false);
  const choresNeedsResaveRef = useRef(false);
  const fridgeLoadedRef = useRef(false);
  const fridgeSaveInFlightRef = useRef(false);
  const fridgePendingSaveRef = useRef<FridgeItem[] | null>(null);
  const fridgeSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualThemeSelectionRef = useRef(false);
  const latestPersonalProfileRef = useRef<PersonalProfile>(loadLocalPersonalProfile());
  const savedPersonalFullNameRef = useRef('');
  const savedPersonalDateOfBirthRef = useRef('');

  function formatCycleStartFromDateKey(dateKey: string) {
    const [yearText, monthText, dayText] = dateKey.split('-');
    return `${String(Number(dayText)).padStart(2, '0')}.${String(Number(monthText)).padStart(2, '0')}.${Number(yearText)}`;
  }

  function resolveCycleLastPeriodStart(entries: CycleDayEntry[], fallback = '') {
    const latestExplicitPeriodStartDateKey = [...entries]
      .filter((entry) => !!entry.isPeriodStart && !!entry.date)
      .map((entry) => entry.date)
      .sort((a, b) => b.localeCompare(a))[0];

    if (latestExplicitPeriodStartDateKey) {
      return formatCycleStartFromDateKey(latestExplicitPeriodStartDateKey);
    }

    const flowDates = [...new Set(entries.filter((entry) => !!entry.flowLevel && !!entry.date).map((entry) => entry.date))].sort();
    const inferredPeriodStartDateKeys = flowDates.filter((dateKey) => {
      const previousDateKey = toDateKey(addDays(parseDateKey(dateKey), -1));
      return !flowDates.includes(previousDateKey);
    });
    const latestInferredPeriodStartDateKey = [...inferredPeriodStartDateKeys].sort((a, b) => b.localeCompare(a))[0];
    if (latestInferredPeriodStartDateKey) {
      return formatCycleStartFromDateKey(latestInferredPeriodStartDateKey);
    }

    return fallback;
  }

  const persistNutritionEntries = async () => {
    if (nutritionSaveInFlightRef.current) {
      nutritionNeedsResaveRef.current = true;
      return;
    }
    const activeSession = sessionRef.current;
    if (!activeSession || !isSupabaseConfigured || !preferencesLoadedRef.current || !nutritionLoadedRef.current) return;
    nutritionSaveInFlightRef.current = true;
    try {
      do {
        nutritionNeedsResaveRef.current = false;
        await replaceNutritionEntries(activeSession, nutritionEntriesRef.current);
      } while (nutritionNeedsResaveRef.current);
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Could not save nutrition entries.');
    } finally {
      nutritionSaveInFlightRef.current = false;
    }
  };

  const persistCustomNutritionFoods = async () => {
    if (customFoodsSaveInFlightRef.current) {
      customFoodsNeedsResaveRef.current = true;
      return;
    }
    const activeSession = sessionRef.current;
    if (!activeSession || !isSupabaseConfigured || !preferencesLoadedRef.current || !customNutritionFoodsLoadedRef.current) return;
    customFoodsSaveInFlightRef.current = true;
    try {
      do {
        customFoodsNeedsResaveRef.current = false;
        await replaceCustomNutritionFoods(activeSession, customNutritionFoodsRef.current);
      } while (customFoodsNeedsResaveRef.current);
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Could not save custom foods.');
    } finally {
      customFoodsSaveInFlightRef.current = false;
    }
  };

  const persistMealPlanProfilePreferences = async () => {
    if (mealPlanProfilesSaveInFlightRef.current) {
      mealPlanProfilesNeedsResaveRef.current = true;
      return;
    }
    const activeSession = sessionRef.current;
    if (!activeSession || !isSupabaseConfigured || !preferencesLoadedRef.current) return;
    mealPlanProfilesSaveInFlightRef.current = true;
    try {
      do {
        mealPlanProfilesNeedsResaveRef.current = false;
        await Promise.all([
          upsertWeeklyMealPlanRecord(activeSession, {
            entries: weeklyMealPlanRef.current,
            profiles: getCustomMealPlanProfiles(mealPlanProfilesRef.current),
          }),
          upsertUserPreferences(activeSession, {
            activeMealPlanProfile: activeMealPlanProfileKeyRef.current,
          }),
        ]);
      } while (mealPlanProfilesNeedsResaveRef.current);
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Could not save meal plan profiles.');
    } finally {
      mealPlanProfilesSaveInFlightRef.current = false;
    }
  };

  const handleNutritionEntriesChange: Dispatch<SetStateAction<NutritionFoodEntry[]>> = (value) => {
    const nextValue = typeof value === 'function' ? value(nutritionEntriesRef.current) : value;
    nutritionEntriesRef.current = nextValue;
    setNutritionEntries(nextValue);
    void persistNutritionEntries();
  };

  const handleCustomNutritionFoodsChange: Dispatch<SetStateAction<CustomNutritionFood[]>> = (value) => {
    const nextValue = typeof value === 'function' ? value(customNutritionFoodsRef.current) : value;
    customNutritionFoodsRef.current = nextValue;
    setCustomNutritionFoods(nextValue);
    void persistCustomNutritionFoods();
  };

  const persistHomeIssues = async () => {
    if (homeIssuesSaveInFlightRef.current) {
      homeIssuesNeedsResaveRef.current = true;
      return;
    }
    const activeSession = sessionRef.current;
    if (!activeSession || !isSupabaseConfigured || !homeFixitLoadedRef.current) return;
    homeIssuesSaveInFlightRef.current = true;
    try {
      do {
        homeIssuesNeedsResaveRef.current = false;
        await replaceHomeIssues(activeSession, homeIssuesRef.current);
      } while (homeIssuesNeedsResaveRef.current);
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Could not save home issues.');
    } finally {
      homeIssuesSaveInFlightRef.current = false;
    }
  };

  const persistHomeProviders = async () => {
    if (homeProvidersSaveInFlightRef.current) {
      homeProvidersNeedsResaveRef.current = true;
      return;
    }
    const activeSession = sessionRef.current;
    if (!activeSession || !isSupabaseConfigured || !homeFixitLoadedRef.current) return;
    homeProvidersSaveInFlightRef.current = true;
    try {
      do {
        homeProvidersNeedsResaveRef.current = false;
        await replaceHomeProviders(activeSession, homeProvidersRef.current);
      } while (homeProvidersNeedsResaveRef.current);
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Could not save home contacts.');
    } finally {
      homeProvidersSaveInFlightRef.current = false;
    }
  };

  const handleHomeIssuesChange: Dispatch<SetStateAction<HomeIssue[]>> = (value) => {
    const nextValue = typeof value === 'function' ? value(homeIssuesRef.current) : value;
    homeIssuesRef.current = nextValue;
    setHomeIssues(nextValue);
    void persistHomeIssues();
  };

  const handleHomeProvidersChange: Dispatch<SetStateAction<HomeProvider[]>> = (value) => {
    const nextValue = typeof value === 'function' ? value(homeProvidersRef.current) : value;
    homeProvidersRef.current = nextValue;
    setHomeProviders(nextValue);
    void persistHomeProviders();
  };

  const persistChores = async () => {
    if (choresSaveInFlightRef.current) {
      choresNeedsResaveRef.current = true;
      return;
    }
    const activeSession = sessionRef.current;
    if (!activeSession || !isSupabaseConfigured || !choresLoadedRef.current) return;
    choresSaveInFlightRef.current = true;
    try {
      do {
        choresNeedsResaveRef.current = false;
        await replaceChores(activeSession, choresRef.current);
      } while (choresNeedsResaveRef.current);
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Could not save chores.');
    } finally {
      choresSaveInFlightRef.current = false;
    }
  };

  const handleChoresChange: Dispatch<SetStateAction<Chore[]>> = (value) => {
    const nextValue = typeof value === 'function' ? value(choresRef.current) : value;
    choresRef.current = nextValue;
    setChores(nextValue);
    void persistChores();
  };

  const handleMealPlanProfilesChange: Dispatch<SetStateAction<MealPlanProfilePreference[]>> = (value) => {
    const nextValue = mergeMealPlanProfiles(typeof value === 'function' ? value(mealPlanProfilesRef.current) : value);
    mealPlanProfilesRef.current = nextValue;
    setMealPlanProfiles(nextValue);
    void persistMealPlanProfilePreferences();
  };

  const handleActiveMealPlanProfileKeyChange: Dispatch<SetStateAction<string>> = (value) => {
    const nextValue = typeof value === 'function' ? value(activeMealPlanProfileKeyRef.current) : value;
    activeMealPlanProfileKeyRef.current = nextValue;
    setActiveMealPlanProfileKey(nextValue);
    void persistMealPlanProfilePreferences();
  };

  const sessionRef = useRef<AppSession | null>(null);
  const shoppingBootstrapCompleteRef = useRef(loadShoppingBootstrapComplete());
  const latestChildrenRef = useRef<ChildProfile[]>(loadLocalChildren());
  const latestHabitsRef = useRef<HabitEntry[]>(loadLocalHabits());
  const latestFridgeItemsRef = useRef<FridgeItem[]>([]);
  const nutritionEntriesRef = useRef<NutritionFoodEntry[]>([]);
  const customNutritionFoodsRef = useRef<CustomNutritionFood[]>([]);
  const mealPlanProfilesRef = useRef<MealPlanProfilePreference[]>(DEFAULT_MEAL_PLAN_PROFILES);
  const activeMealPlanProfileKeyRef = useRef('family');
  const weeklyMealPlanRef = useRef<WeeklyMealPlanEntry[]>(createDefaultWeeklyMealPlan());
  const nutritionSaveInFlightRef = useRef(false);
  const nutritionNeedsResaveRef = useRef(false);
  const customFoodsSaveInFlightRef = useRef(false);
  const customFoodsNeedsResaveRef = useRef(false);
  const mealPlanProfilesSaveInFlightRef = useRef(false);
  const mealPlanProfilesNeedsResaveRef = useRef(false);
  const dailyCardRevealAnim = useRef(new Animated.Value(0)).current;
  const [childActivitiesModalOpen, setChildActivitiesModalOpen] = useState(false);
  const [childActionsOpen, setChildActionsOpen] = useState(false);
  const [filtersEditHover, setFiltersEditHover] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildName, setEditingChildName] = useState('');
  const [editingChildDob, setEditingChildDob] = useState('');
  const [editingChildIncludeInMotherCalendar, setEditingChildIncludeInMotherCalendar] = useState(true);
  const [editingChildActivities, setEditingChildActivities] = useState<DraftActivity[]>([]);
  const [activityColorEditorOpen, setActivityColorEditorOpen] = useState(false);
  const [activityColorEditorTarget, setActivityColorEditorTarget] = useState<ActivityColorEditorTarget | null>(null);
  const [activityColorDraftValue, setActivityColorDraftValue] = useState('#3b82f6');
  const [lastSelectedChildId, setLastSelectedChildId] = useState<string | null>(null);
  const [pendingEditChildId, setPendingEditChildId] = useState<string | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const dailyCards = useMemo(() => pickDailyGuidanceCards(dailyCardDateKey), [dailyCardDateKey]);
  const selectedDailyCard = useMemo(
    () => dailyCards.find((card) => card.id === selectedDailyCardId) || null,
    [dailyCards, selectedDailyCardId],
  );
  const shouldShowDailyCardsModal = screen === 'calendar' && dailyCardsReady && dailyCardsModalOpen;
  const canDismissDailyCardsModal = !!selectedDailyCard && !revealingDailyCardId;
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

  function markShoppingBootstrapComplete() {
    shoppingBootstrapCompleteRef.current = true;
    setShoppingBootstrapComplete(true);
    persistShoppingBootstrapComplete(true);
  }

  function trackPurchasedShoppingItem(item: ShoppingItem, purchasedAt = new Date().toISOString()) {
    setShoppingInsights((prev) =>
      mergeShoppingInsights(prev, [
        {
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          purchasedAt,
        },
      ]),
    );
  }

  useEffect(() => {
    if (sessionRef.current) return;
    persistLocalShoppingLists(shoppingLists);
  }, [shoppingLists]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const styleId = 'smart-mom-hide-scrollbars';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        html, body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        *::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
          background: transparent !important;
        }

        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `;
      document.head.appendChild(styleEl);
    }

    return () => {
      styleEl?.remove();
    };
  }, []);

  useEffect(() => {
    if (sessionRef.current) return;
    persistLocalPersonalProfile(personalProfile);
  }, [personalProfile]);

  useEffect(() => {
    persistLocalShoppingInsights(shoppingInsights);
  }, [shoppingInsights]);

  useEffect(() => {
    setShoppingInsights((prev) => mergeShoppingInsights(prev, deriveShoppingInsightsFromLists(shoppingLists).flatMap((entry) =>
      entry.events.map((event) => ({
        name: entry.displayName,
        quantity: event.quantity,
        category: entry.category,
        purchasedAt: event.purchasedAt,
      })),
    )));
  }, [shoppingLists]);

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
  const todayDateKey = toDateKey(new Date());
  const currentShoppingList = useMemo(() => getCurrentShoppingList(shoppingLists), [shoppingLists]);
  const baseShoppingList = useMemo(() => getBaseShoppingList(shoppingLists), [shoppingLists]);
  const currentShoppingRemainingCount = useMemo(
    () => currentShoppingList?.items.filter((item) => !item.purchased).length ?? 0,
    [currentShoppingList],
  );
  const currentShoppingPurchasedCount = useMemo(
    () => currentShoppingList?.items.filter((item) => item.purchased).length ?? 0,
    [currentShoppingList],
  );
  const lowInventoryCount = useMemo(
    () => fridgeItems.filter((item) => item.status === 'low').length,
    [fridgeItems],
  );
  const todayNutritionCalories = useMemo(
    () =>
      Math.round(
        nutritionEntries
          .filter((entry) => entry.date === todayDateKey)
          .reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0),
      ),
    [nutritionEntries, todayDateKey],
  );
  const activeHabitsCount = useMemo(
    () => habits.filter((habit) => habit.enabled).length,
    [habits],
  );
  const completedHabitsTodayCount = useMemo(
    () => habits.filter((habit) => habit.enabled && habit.completedToday).length,
    [habits],
  );
  const nextUpcomingEvent = useMemo(() => {
    const nowDate = todayDateKey;
    return [...events]
      .filter((event) => event.date >= nowDate)
      .sort((left, right) => {
        const dateCompare = left.date.localeCompare(right.date);
        if (dateCompare !== 0) return dateCompare;
        return normalizeTimeText(left.time || '12:00 AM').localeCompare(normalizeTimeText(right.time || '12:00 AM'));
      })[0] || null;
  }, [events, todayDateKey]);
  const nextChildActivityEvent = useMemo(() => {
    const nowDate = todayDateKey;
    return [...events]
      .filter((event) => event.owner === 'child' && event.date >= nowDate)
      .sort((left, right) => {
        const dateCompare = left.date.localeCompare(right.date);
        if (dateCompare !== 0) return dateCompare;
        return normalizeTimeText(left.time || '12:00 AM').localeCompare(normalizeTimeText(right.time || '12:00 AM'));
      })[0] || null;
  }, [events, todayDateKey]);
  const nextExpectedPeriodStart = useMemo(() => {
    if (!personalProfile.cycleTrackingEnabled || !personalProfile.cycleLastPeriodStart || !personalProfile.cycleLengthDays) return null;
    const lastStart = parseBirthDate(personalProfile.cycleLastPeriodStart);
    const cycleLength = Number(personalProfile.cycleLengthDays);
    if (Number.isNaN(lastStart.getTime()) || !cycleLength) return null;
    const next = new Date(lastStart);
    next.setDate(next.getDate() + cycleLength);
    return next;
  }, [personalProfile.cycleLastPeriodStart, personalProfile.cycleLengthDays, personalProfile.cycleTrackingEnabled]);
  const periodReminderSummary = useMemo(() => {
    if (!periodRemindersEnabled || !nextExpectedPeriodStart) return null;
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntil = Math.ceil((toDateKey(nextExpectedPeriodStart) === todayDateKey ? 0 : (nextExpectedPeriodStart.getTime() - parseDateKey(todayDateKey).getTime()) / msPerDay));
    if (daysUntil < 0 || daysUntil > 3) return null;
    if (daysUntil === 0) return 'Expected today';
    if (daysUntil === 1) return 'Expected tomorrow';
    return `Expected in ${daysUntil} days`;
  }, [nextExpectedPeriodStart, periodRemindersEnabled, todayDateKey]);

  // --- Today summary (Home) ---
  const dailyCalorieTarget = useMemo(() => {
    const plan = getNutritionPlan({
      dateOfBirth: personalProfile.dateOfBirth,
      heightCm: personalProfile.heightCm,
      weightKg: personalProfile.weightKg,
      goal: nutritionGoal,
      activityLevel,
      sex: nutritionSex,
      calorieOverride,
      desiredWeightKg: desiredWeight,
      pace: nutritionPace,
    });
    return plan?.calories || 0;
  }, [personalProfile.dateOfBirth, personalProfile.heightCm, personalProfile.weightKg, nutritionGoal, activityLevel, nutritionSex, calorieOverride, desiredWeight, nutritionPace]);
  const eventsTodayCount = useMemo(
    () => events.filter((event) => event.date === todayDateKey).length,
    [events, todayDateKey],
  );
  const choresToday = useMemo(() => {
    const total = chores.length;
    const done = chores.filter((c) => choreStatus(c) !== 'todo').length;
    return { total, done };
  }, [chores]);
  const needsYouCount = useMemo(() => {
    const awaitingVerify = chores.filter((c) => c.verifier !== 'self' && choreStatus(c) === 'done').length;
    const urgentIssues = homeIssues.filter((i) => i.urgency === 'urgent' && i.status !== 'done').length;
    const pendingRequests = purchaseRequests.filter((r) => r.status === 'new').length;
    return awaitingVerify + urgentIssues + pendingRequests;
  }, [chores, homeIssues, purchaseRequests]);

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
      const localChildren = latestChildrenRef.current.length > 0 ? latestChildrenRef.current : loadLocalChildren();
      setChildren(enforceUniqueChildActivityColors(mergeChildrenPreferLocal(liveChildren, localChildren), CHILD_COLOR_PALETTE));
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
      let nextCycleEntries = profile.cycleEntries || [];
      const localCycleEntries = currentProfile.cycleEntries || [];
      try {
        const storedCycleEntries = await listCycleEntries(current);
        if (storedCycleEntries.length > 0) {
          nextCycleEntries = storedCycleEntries;
        } else if (nextCycleEntries.length > 0) {
          await replaceCycleEntries(current, nextCycleEntries).catch(() => null);
        } else if (localCycleEntries.length > 0) {
          nextCycleEntries = localCycleEntries;
          await Promise.all([
            replaceCycleEntries(current, localCycleEntries).catch(() => null),
            upsertMyProfile({
              fullName: (profile.fullName || '').trim() || savedPersonalFullNameRef.current || currentProfile.fullName || '',
              nickname: (profile.nickname || '').trim() || currentProfile.nickname || '',
              dateOfBirth: profile.dateOfBirth || savedPersonalDateOfBirthRef.current || currentProfile.dateOfBirth || '',
              heightCm: profile.heightCm || currentProfile.heightCm || '',
              weightKg: profile.weightKg || currentProfile.weightKg || '',
              cycleEntries: localCycleEntries,
              cycleTrackingEnabled:
                typeof profile.cycleTrackingEnabled === 'boolean'
                  ? profile.cycleTrackingEnabled
                  : !!currentProfile.cycleTrackingEnabled,
              cycleLastPeriodStart: resolveCycleLastPeriodStart(localCycleEntries, profile.cycleLastPeriodStart || currentProfile.cycleLastPeriodStart || ''),
              cycleLengthDays: profile.cycleLengthDays || currentProfile.cycleLengthDays || '28',
              cyclePeriodLengthDays: profile.cyclePeriodLengthDays || currentProfile.cyclePeriodLengthDays || '5',
            }).catch(() => null),
          ]);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!message.includes('Supabase cycle entries table is missing')) {
          throw error;
        }
      }
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
        cycleLastPeriodStart: resolveCycleLastPeriodStart(
          nextCycleEntries.length ? nextCycleEntries : currentProfile.cycleEntries || [],
          profile.cycleLastPeriodStart || currentProfile.cycleLastPeriodStart || '',
        ),
        cycleLengthDays: profile.cycleLengthDays || currentProfile.cycleLengthDays || '28',
        cyclePeriodLengthDays: profile.cyclePeriodLengthDays || currentProfile.cyclePeriodLengthDays || '5',
        cycleEntries: nextCycleEntries.length ? nextCycleEntries : currentProfile.cycleEntries || [],
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
      const [liveLists, liveFridgeItems, liveShares, livePurchaseRequests] = await Promise.all([
        listShoppingLists(current.familyId),
        listFridgeItems(current.familyId),
        listShoppingShares(current.familyId),
        listPurchaseRequests(current.familyId),
      ]);
      if (!shoppingBootstrapCompleteRef.current) {
        setShoppingLists([]);
        if (liveLists.length > 0) {
          await Promise.all(liveLists.map((list) => deleteShoppingList(current, list.id).catch(() => null)));
        }
      } else {
        setShoppingLists(liveLists);
      }
      const localFridgeItems = latestFridgeItemsRef.current.length > 0 ? latestFridgeItemsRef.current : loadLocalFridgeItems();
      const mergedFridgeItems = mergeFridgeItemsPreferLocal(liveFridgeItems, localFridgeItems);
      setFridgeItems(mergedFridgeItems);
      setShoppingShares(liveShares);
      setPurchaseRequests(livePurchaseRequests);
      fridgeLoadedRef.current = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync shopping.';
      setTasksError(message);
    }
  }

  function queueFridgeSave(nextItems: FridgeItem[], current: AppSession | null = session) {
    if (!current || !isSupabaseConfigured) return;

    const snapshot = nextItems.map((item) => ({ ...item }));

    const flushSave = async (itemsToSave: FridgeItem[]) => {
      if (fridgeSaveInFlightRef.current) {
        fridgePendingSaveRef.current = itemsToSave;
        return;
      }

      fridgeSaveInFlightRef.current = true;

      try {
        await replaceFridgeItems(current, itemsToSave);
      } catch (error) {
        setTasksError(error instanceof Error ? error.message : 'Could not save fridge items.');
      } finally {
        fridgeSaveInFlightRef.current = false;
        const pendingItems = fridgePendingSaveRef.current;
        fridgePendingSaveRef.current = null;

        if (pendingItems && !areFridgeItemsEqual(pendingItems, itemsToSave)) {
          void flushSave(pendingItems);
        }
      }
    };

    if (fridgeSaveTimerRef.current) {
      clearTimeout(fridgeSaveTimerRef.current);
    }

    fridgeSaveTimerRef.current = setTimeout(() => {
      fridgeSaveTimerRef.current = null;
      void flushSave(snapshot);
    }, 250);
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
      const liveWeeklyPlanRecord = await getWeeklyMealPlanRecord(current.familyId);
      if (liveWeeklyPlanRecord.entries.length > 0) {
        const mergedWeeklyPlan = mergeWeeklyMealPlan(liveWeeklyPlanRecord.entries);
        weeklyMealPlanRef.current = mergedWeeklyPlan;
        setWeeklyMealPlan(mergedWeeklyPlan);
        const nextProfiles = mergeMealPlanProfiles(
          liveWeeklyPlanRecord.profiles.length > 0
            ? liveWeeklyPlanRecord.profiles
            : deriveMealPlanProfilesFromEntries(mergedWeeklyPlan),
        );
        mealPlanProfilesRef.current = nextProfiles;
        setMealPlanProfiles(nextProfiles);
      } else if (liveWeeklyPlanRecord.profiles.length > 0) {
        const nextProfiles = mergeMealPlanProfiles(liveWeeklyPlanRecord.profiles);
        mealPlanProfilesRef.current = nextProfiles;
        setMealPlanProfiles(nextProfiles);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync weekly meal plan.';
      setTasksError(message);
    }
  }

  function handleWeeklyMealPlanChange(action: SetStateAction<WeeklyMealPlanEntry[]>) {
    setWeeklyMealPlan((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      weeklyMealPlanRef.current = next;
      if (session) {
        upsertWeeklyMealPlanRecord(session, {
          entries: next,
          profiles: getCustomMealPlanProfiles(mealPlanProfilesRef.current),
        }).catch((error) => {
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
      const todayKey = getTodayKey();
      const localDailyCardState = loadLocalDailyCardState(todayKey);
      if (preferences?.parentLabel) setParentLabel(preferences.parentLabel);
      if (!manualThemeSelectionRef.current && preferences?.themeName && preferences.themeName in themePalettes) {
        setThemeName(preferences.themeName);
      }
      if (preferences?.nutritionGoal) setNutritionGoal(preferences.nutritionGoal);
      if (preferences?.activityLevel) setActivityLevel(preferences.activityLevel);
      if (preferences?.nutritionSex) setNutritionSex(preferences.nutritionSex);
      if (typeof preferences?.desiredWeight === 'string') setDesiredWeight(preferences.desiredWeight);
      if (preferences?.nutritionPace) setNutritionPace(preferences.nutritionPace);
      if (typeof preferences?.calorieOverride === 'string') setCalorieOverride(preferences.calorieOverride);
      if (typeof preferences?.periodRemindersEnabled === 'boolean') setPeriodRemindersEnabled(preferences.periodRemindersEnabled);
      if (typeof preferences?.periodReminderLeadDays === 'number' && preferences.periodReminderLeadDays >= 1 && preferences.periodReminderLeadDays <= 3) {
        setPeriodReminderLeadDays(preferences.periodReminderLeadDays);
      }
      const nextActiveMealPlanProfile = preferences?.activeMealPlanProfile || 'family';
      if (nextActiveMealPlanProfile) {
        activeMealPlanProfileKeyRef.current = nextActiveMealPlanProfile;
        setActiveMealPlanProfileKey(nextActiveMealPlanProfile);
      } else {
        activeMealPlanProfileKeyRef.current = 'family';
        setActiveMealPlanProfileKey('family');
      }
      setDailyCardDateKey(todayKey);
      setRevealingDailyCardId(null);
      dailyCardRevealAnim.setValue(0);
      const preferredDailyCardId =
        localDailyCardState.selectedCardId ||
        (preferences?.dailyCardDate === todayKey && preferences.dailyCardId ? preferences.dailyCardId : null);
      setSelectedDailyCardId(preferredDailyCardId);
      setDailyCardPromptShown(localDailyCardState.promptShown || !!preferredDailyCardId);
      setDailyCardsModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync preferences.';
      setTasksError(message);
    } finally {
      preferencesLoadedRef.current = true;
      setDailyCardsReady(true);
    }
  }

  async function hydrateSessionContext(ctx: AppSession) {
    sessionRef.current = ctx;
    setSession(ctx);
    setRole(toUiRole(ctx.role));
    habitsLoadedRef.current = false;
    nutritionLoadedRef.current = false;
    customNutritionFoodsLoadedRef.current = false;
    homeFixitLoadedRef.current = false;
    choresLoadedRef.current = false;
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
      listHabitEntries(ctx)
        .then(async (liveHabits) => {
          const localHabits = latestHabitsRef.current.length > 0 ? latestHabitsRef.current : loadLocalHabits();
          const mergedHabits = mergeHabitsPreferLocal(liveHabits, localHabits);
          latestHabitsRef.current = mergedHabits;
          setHabits(mergedHabits);
          habitsLoadedRef.current = true;
          if (!areHabitsEqual(mergedHabits, liveHabits)) {
            await replaceHabitEntries(ctx, mergedHabits).catch((error) => {
              setTasksError(error instanceof Error ? error.message : 'Could not save habits.');
            });
          }
        })
        .catch((error) => {
          const localHabits = latestHabitsRef.current.length > 0 ? latestHabitsRef.current : loadLocalHabits();
          latestHabitsRef.current = localHabits;
          setHabits(localHabits);
          habitsLoadedRef.current = true;
          setTasksError(error instanceof Error ? error.message : 'Could not load habits.');
        }),
      listNutritionEntries(ctx).then((entries) => {
        nutritionEntriesRef.current = entries;
        setNutritionEntries(entries);
        nutritionLoadedRef.current = true;
      }),
      listCustomNutritionFoods(ctx).then((foods) => {
        customNutritionFoodsRef.current = foods;
        setCustomNutritionFoods(foods);
        customNutritionFoodsLoadedRef.current = true;
      }).catch((error) => {
        customNutritionFoodsRef.current = [];
        setCustomNutritionFoods([]);
        setTasksError(error instanceof Error ? error.message : 'Could not load custom foods.');
      }),
      Promise.all([listHomeIssues(ctx), listHomeProviders(ctx)])
        .then(([issues, provs]) => {
          homeIssuesRef.current = issues;
          homeProvidersRef.current = provs;
          setHomeIssues(issues);
          setHomeProviders(provs);
          homeFixitLoadedRef.current = true;
        })
        .catch(() => {
          // Tables may not be migrated yet — keep the section usable locally; the
          // migration hint surfaces when the user first tries to save.
          homeIssuesRef.current = [];
          homeProvidersRef.current = [];
          setHomeIssues([]);
          setHomeProviders([]);
          homeFixitLoadedRef.current = true;
        }),
      listChores(ctx)
        .then((rows) => {
          choresRef.current = rows;
          setChores(rows);
          choresLoadedRef.current = true;
        })
        .catch(() => {
          choresRef.current = [];
          setChores([]);
          choresLoadedRef.current = true;
        }),
    ]);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    if (typeof globalThis !== 'undefined' && 'location' in globalThis && globalThis.location) {
      const search = globalThis.location.search || '';
      const hash = globalThis.location.hash || '';
      const searchParams = new URLSearchParams(search);
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      const hasRecoveryFlag = searchParams.get('auth') === 'recovery' || hashParams.get('type') === 'recovery';

      if (hasRecoveryFlag) {
        setTasksError(null);
        setAuthInfo('Enter a new password for your account.');
        setAuthPassword('');
        setAuthPasswordConfirm('');
        setAuthMode('recover');
        setSignInModalOpen(true);
      }
    }

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
      if (event === 'PASSWORD_RECOVERY') {
        setTasksError(null);
        setAuthInfo('Enter a new password for your account.');
        setAuthPassword('');
        setAuthPasswordConfirm('');
        setAuthMode('recover');
        setSignInModalOpen(true);

        Promise.resolve()
          .then(() => getOrCreateSessionContext())
          .then((ctx) => {
            if (!ctx) return;
            return hydrateSessionContext(ctx);
          })
          .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not restore live session.'));
        return;
      }
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
    const nextDateKey = getTodayKey();
    if (dailyCardDateKey === nextDateKey) return;
    setDailyCardDateKey(nextDateKey);
    setSelectedDailyCardId(null);
    setDailyCardPromptShown(false);
    setRevealingDailyCardId(null);
    dailyCardRevealAnim.setValue(0);
    setDailyCardsReady(true);
    setDailyCardsModalOpen(false);
  }, [dailyCardDateKey, dailyCardRevealAnim]);

  useEffect(() => {
    if (screen !== 'calendar') {
      setDailyCardsModalOpen(false);
    }
  }, [screen]);

  useEffect(() => {
    if (screen !== 'calendar') return;
    if (!dailyCardsReady) return;
    if (selectedDailyCardId || revealingDailyCardId) return;
    if (dailyCardsModalOpen) return;
    if (dailyCardPromptShown) return;
    setDailyCardPromptShown(true);
    setDailyCardsModalOpen(true);
  }, [screen, dailyCardsReady, selectedDailyCardId, revealingDailyCardId, dailyCardsModalOpen, dailyCardPromptShown]);

  useEffect(() => {
    latestFridgeItemsRef.current = fridgeItems;
  }, [fridgeItems]);

  useEffect(() => {
    latestChildrenRef.current = children;
  }, [children]);

  useEffect(() => {
    nutritionEntriesRef.current = nutritionEntries;
  }, [nutritionEntries]);

  useEffect(() => {
    customNutritionFoodsRef.current = customNutritionFoods;
  }, [customNutritionFoods]);

  useEffect(() => {
    weeklyMealPlanRef.current = weeklyMealPlan;
  }, [weeklyMealPlan]);

  useEffect(() => {
    mealPlanProfilesRef.current = mealPlanProfiles;
  }, [mealPlanProfiles]);

  useEffect(() => {
    activeMealPlanProfileKeyRef.current = activeMealPlanProfileKey;
  }, [activeMealPlanProfileKey]);

  useEffect(() => {
    if (mealPlanProfiles.some((profile) => profile.key === activeMealPlanProfileKey)) return;
    activeMealPlanProfileKeyRef.current = 'family';
    setActiveMealPlanProfileKey('family');
  }, [mealPlanProfiles, activeMealPlanProfileKey]);

  useEffect(() => {
    setChildren((prev) => enforceUniqueChildActivityColors(prev, CHILD_COLOR_PALETTE));
  }, [children]);

  useEffect(() => {
    persistLocalChildren(children);
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
    persistLocalDailyCardState({
      dateKey: dailyCardDateKey,
      selectedCardId: selectedDailyCardId,
      promptShown: dailyCardPromptShown,
    });
  }, [dailyCardDateKey, selectedDailyCardId, dailyCardPromptShown]);

  useEffect(() => {
    latestHabitsRef.current = habits;
    persistLocalHabits(habits);
  }, [habits]);

  useEffect(() => {
    persistLocalHabitRemindersEnabled(habitRemindersEnabled);
  }, [habitRemindersEnabled]);

  useEffect(() => {
    persistLocalPeriodRemindersEnabled(periodRemindersEnabled);
  }, [periodRemindersEnabled]);

  useEffect(() => {
    persistLocalPeriodReminderLeadDays(periodReminderLeadDays);
  }, [periodReminderLeadDays]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured || !preferencesLoadedRef.current) return;
    upsertUserPreferences(session, {
      parentLabel,
      themeName,
      dailyCardDate: selectedDailyCardId ? dailyCardDateKey : undefined,
      dailyCardId: selectedDailyCardId || undefined,
      nutritionGoal,
      activityLevel,
      nutritionSex,
      desiredWeight,
      nutritionPace,
      calorieOverride,
      periodRemindersEnabled,
      periodReminderLeadDays,
    }).catch((error) =>
      setTasksError(error instanceof Error ? error.message : 'Could not save preferences.'),
    );
  }, [
    session,
    parentLabel,
    themeName,
    selectedDailyCardId,
    dailyCardDateKey,
    nutritionGoal,
    activityLevel,
    nutritionSex,
    desiredWeight,
    nutritionPace,
    calorieOverride,
    periodRemindersEnabled,
    periodReminderLeadDays,
  ]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured || !preferencesLoadedRef.current || !habitsLoadedRef.current) return;
    replaceHabitEntries(session, habits).catch((error) =>
      setTasksError(error instanceof Error ? error.message : 'Could not save habits.'),
    );
  }, [session, habits]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured || !preferencesLoadedRef.current || !fridgeLoadedRef.current) return;
    queueFridgeSave(fridgeItems, session);
  }, [session, fridgeItems]);

  useEffect(
    () => () => {
      if (fridgeSaveTimerRef.current) clearTimeout(fridgeSaveTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    persistLocalFridgeItems(fridgeItems);
  }, [fridgeItems]);

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
    sessionRef.current = null;
    setSession(null);
    setTasks([]);
    setEvents([]);
    setChildren([]);
    setStaffProfiles([]);
    setShoppingLists([]);
    setRecipes([]);
    setWeeklyMealPlan(createDefaultWeeklyMealPlan());
    setMealPlanProfiles(DEFAULT_MEAL_PLAN_PROFILES);
    setActiveMealPlanProfileKey('family');
    mealPlanProfilesRef.current = DEFAULT_MEAL_PLAN_PROFILES;
    activeMealPlanProfileKeyRef.current = 'family';
    mealPlanProfilesSaveInFlightRef.current = false;
    mealPlanProfilesNeedsResaveRef.current = false;
    setFridgeItems([]);
    setNutritionGoal('maintain');
    setActivityLevel('moderate');
    setNutritionSex('female');
    setDesiredWeight('');
    setNutritionPace('flexible');
    setCalorieOverride('');
    setNutritionEntries([]);
    setCustomNutritionFoods([]);
    setHomeIssues([]);
    setHomeProviders([]);
    setChores([]);
    homeIssuesRef.current = [];
    homeProvidersRef.current = [];
    choresRef.current = [];
    nutritionEntriesRef.current = [];
    customNutritionFoodsRef.current = [];
    habitsLoadedRef.current = false;
    setShoppingShares([]);
    setPurchaseRequests([]);
    setRequests([]);
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
    nutritionLoadedRef.current = false;
    customNutritionFoodsLoadedRef.current = false;
    homeFixitLoadedRef.current = false;
    choresLoadedRef.current = false;
    fridgeLoadedRef.current = false;
    manualThemeSelectionRef.current = false;
    nutritionSaveInFlightRef.current = false;
    nutritionNeedsResaveRef.current = false;
    customFoodsSaveInFlightRef.current = false;
    customFoodsNeedsResaveRef.current = false;
    setDailyCardDateKey(getTodayKey());
    setSelectedDailyCardId(null);
    setRevealingDailyCardId(null);
    setDailyCardsModalOpen(false);
    setDailyCardsReady(false);
    dailyCardRevealAnim.setValue(0);
    setThemeName('blue');
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

  async function handleRecipeUpdate(recipe: Recipe): Promise<Recipe> {
    if (session && isSupabaseConfigured) {
      await updateRecipe(session, recipe);
    }
    setRecipes((prev) => prev.map((item) => (item.id === recipe.id ? recipe : item)));
    return recipe;
  }

  async function handleRecipeDelete(recipeId: string): Promise<void> {
    if (session && isSupabaseConfigured) {
      await deleteRecipe(session, recipeId);
    }
    setRecipes((prev) => prev.filter((item) => item.id !== recipeId));
  }

  function openAuthMenu(mode: AuthMode) {
    setTasksError(null);
    setAuthInfo(null);
    setAuthPassword('');
    setAuthPasswordConfirm('');
    setAuthPasswordVisible(false);
    setAuthPasswordConfirmVisible(false);
    setAuthMode(mode);
    setSignInModalOpen(true);
  }

  function revealDailyCard(cardId: string) {
    if (selectedDailyCardId || revealingDailyCardId) return;
    setRevealingDailyCardId(cardId);
    dailyCardRevealAnim.setValue(0);
    Animated.timing(dailyCardRevealAnim, {
      toValue: 1,
      duration: 620,
      useNativeDriver: true,
    }).start(() => {
      setSelectedDailyCardId(cardId);
      setRevealingDailyCardId(null);
      dailyCardRevealAnim.setValue(0);
    });
  }

  function closeDailyCardsModal() {
    if (!selectedDailyCard || revealingDailyCardId) return;
    setDailyCardsModalOpen(false);
  }

  function renderDailyCardFace(card: DailyGuidanceCard, mode: 'reveal' | 'opened') {
    const compact = mode === 'reveal';
    return (
      <View style={compact ? styles.dailyCardRevealFace : styles.dailyCardOpenedFace}>
        <View style={compact ? styles.dailyCardFaceFrame : styles.dailyCardOpenedFrame} />
        <View style={[styles.dailyCardFaceSun, compact ? styles.dailyCardFaceSunCompact : styles.dailyCardFaceSunOpened]} />
        <View style={compact ? styles.dailyCardFaceRibbonTopCompact : styles.dailyCardFaceRibbonTopOpened} />
        <View style={compact ? styles.dailyCardFaceRibbonBottomCompact : styles.dailyCardFaceRibbonBottomOpened} />
        <View
          style={[
            styles.dailyCardFaceStar,
            compact ? styles.dailyCardFaceStarTopCompact : styles.dailyCardFaceStarTopOpened,
            { backgroundColor: card.accent },
          ]}
        />
        <View
          style={[
            styles.dailyCardFaceStar,
            compact ? styles.dailyCardFaceStarBottomCompact : styles.dailyCardFaceStarBottomOpened,
            { backgroundColor: card.accent },
          ]}
        />
        <View style={styles.dailyCardFaceCopy}>
          <Text style={compact ? styles.dailyCardRevealMessage : styles.dailyCardOpenedMessage}>{card.message}</Text>
        </View>
      </View>
    );
  }

  function renderDailyCardBack(card: DailyGuidanceCard) {
    return (
      <View style={styles.dailyCardBack}>
        <View style={styles.dailyCardBackFrame} />
        <View style={styles.dailyCardBackHaloTop} />
        <View style={styles.dailyCardBackHaloBottom} />
        <View style={styles.dailyCardBackBandTop} />
        <View style={styles.dailyCardBackBandBottom} />
        <View style={styles.dailyCardBackSealOuter} />
        <View style={styles.dailyCardBackSealInner} />
        <View style={styles.dailyCardBackSealCore} />
        {[
          { top: 26, left: 28, size: 3, opacity: 0.75 },
          { top: 48, right: 34, size: 2, opacity: 0.55 },
          { top: 84, left: 18, size: 2, opacity: 0.6 },
          { top: 156, right: 22, size: 3, opacity: 0.72 },
          { top: 188, left: 42, size: 2, opacity: 0.58 },
          { top: 202, right: 48, size: 2, opacity: 0.48 },
        ].map((star, index) => (
          <View
            key={`star-${card.id}-${index}`}
            style={[
              styles.dailyCardBackStarDust,
              {
                top: star.top,
                left: 'left' in star ? star.left : undefined,
                right: 'right' in star ? star.right : undefined,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  function selectCalendarProfile(target: string) {
    if (target === 'mother') {
      setRole('mother');
      setActiveChildRoleId(null);
      setActiveStaffProfileId(null);
      setActiveOwnerFilter('mother');
      setCalendarScope('my');
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
      setCalendarScope('family');
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
      setCalendarScope('family');
      setScreen('calendar');
      setChildActionsOpen(false);
    }
  }

  function handleSelectParentLabel(nextLabel: ParentLabel) {
    setParentLabel(nextLabel);
    if (role === 'mother' || activeOwnerFilter === 'mother') {
      setRole('mother');
      setActiveChildRoleId(null);
      setActiveStaffProfileId(null);
      setActiveOwnerFilter('mother');
      setCalendarScope('my');
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
    setChildTimePickerOpen(false);
    setChildTimeActivityId(null);
    setChildDraftActivities((prev) => [
      ...prev,
      createDefaultDraftActivity(
        getFirstAvailableActivityColor(
          [
            ...prev,
            ...children.flatMap((child) =>
              child.activities.map((activity) => ({
                id: activity.id,
                name: activity.name,
                timesPerWeek: String(activity.timesPerWeek),
                time: activity.time || '10:00 AM',
                color: activity.color || '',
                weekDays: activity.weekDays || [],
                timeSlots: activity.timeSlots || [],
              })),
            ),
          ],
          childColorPalette,
        ),
      ),
    ]);
  }

  function addEditingChildActivity() {
    setChildTimePickerOpen(false);
    setChildTimeActivityId(null);
    setEditingChildActivities((prev) => [
      ...prev,
      createDefaultDraftActivity(
        getFirstAvailableActivityColor(
          [
            ...prev,
            ...children
              .filter((child) => child.id !== editingChildId)
              .flatMap((child) =>
                child.activities.map((activity) => ({
                  id: activity.id,
                  name: activity.name,
                  timesPerWeek: String(activity.timesPerWeek),
                  time: activity.time || '10:00 AM',
                  color: activity.color || '',
                  weekDays: activity.weekDays || [],
                  timeSlots: activity.timeSlots || [],
                })),
              ),
          ],
          childColorPalette,
        ),
      ),
    ]);
  }

  function removeEditingChildActivity(activityId: string) {
    setEditingChildActivities((prev) => {
      const next = prev.filter((activity) => activity.id !== activityId);
      return next.length > 0 ? next : [createDefaultDraftActivity('#3b82f6')];
    });
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
    setChildTimePickerOpen(false);
    setChildTimeActivityId(null);
    setChildActivitiesModalOpen(true);
  }

  function getUnavailableActivityColors(activityId: string, target: 'draft' | 'child') {
    const sourceActivities = target === 'child' ? editingChildActivities : childDraftActivities;
    const used = new Set<string>();
    sourceActivities.forEach((activity) => {
      if (activity.id === activityId) return;
      const normalized = normalizeHexColor(activity.color);
      if (normalized) used.add(normalized);
    });
    children.forEach((child) => {
      if (target === 'child' && child.id === editingChildId) return;
      child.activities.forEach((activity) => {
        const normalized = normalizeHexColor(activity.color);
        if (normalized) used.add(normalized);
      });
    });
    return used;
  }

  function setActivityColor(activityId: string, color: string, target: 'draft' | 'child') {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    const unavailable = getUnavailableActivityColors(activityId, target);
    if (unavailable.has(normalized)) {
      setTasksError('This color is already used by another child activity.');
      return;
    }
    setTasksError((current) => (current === 'This color is already used by another child activity.' ? null : current));
    if (target === 'child') {
      setEditingChildActivities((prev) => prev.map((item) => (item.id === activityId ? { ...item, color: normalized } : item)));
      return;
    }
    setChildDraftActivities((prev) => prev.map((item) => (item.id === activityId ? { ...item, color: normalized } : item)));
  }

  function openActivityColorEditor(activityId: string, currentColor: string, target: 'draft' | 'child') {
    const normalized = normalizeHexColor(currentColor) || '#3b82f6';
    setActivityColorEditorTarget({ activityId, target });
    setActivityColorDraftValue(normalized);
    setActivityColorEditorOpen(true);
  }

  function applyCustomActivityColor() {
    if (!activityColorEditorTarget) return;
    setActivityColor(activityColorEditorTarget.activityId, activityColorDraftValue, activityColorEditorTarget.target);
    setActivityColorEditorOpen(false);
    setActivityColorEditorTarget(null);
  }

  function handleActivityColorPickerValue(nextValue: string, finalize = false) {
    const normalized = normalizeHexColor(nextValue);
    if (!normalized) return;
    setActivityColorDraftValue(normalized);
    if (activityColorEditorTarget) {
      setActivityColor(activityColorEditorTarget.activityId, normalized, activityColorEditorTarget.target);
    }
    if (finalize) setActivityColorEditorTarget(null);
  }

  function renderActivityPaletteButton(activityId: string, currentColor: string, target: 'draft' | 'child') {
    const normalized = normalizeHexColor(currentColor) || '#3b82f6';
    const unavailable = getUnavailableActivityColors(activityId, target);

    if (Platform.OS === 'web') {
      return (
        <View style={[styles.activityPaletteButton, { borderColor: currentColor || colors.primary }]}>
          <Text style={styles.activityPaletteButtonText}>🎨</Text>
          <input
            type="color"
            value={normalized}
            onClick={() => {
              setActivityColorEditorTarget({ activityId, target });
              setActivityColorDraftValue(normalized);
            }}
            onInput={(event) => {
              const nextColor = normalizeHexColor(event.currentTarget.value) || normalized;
              if (unavailable.has(nextColor.toLowerCase())) return;
              setActivityColorDraftValue(nextColor);
              setActivityColor(activityId, nextColor, target);
            }}
            onChange={(event) => {
              const nextColor = normalizeHexColor(event.currentTarget.value) || normalized;
              if (!unavailable.has(nextColor.toLowerCase())) {
                setActivityColorDraftValue(nextColor);
                setActivityColor(activityId, nextColor, target);
              }
              setActivityColorEditorTarget(null);
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </View>
      );
    }

    return (
      <Pressable style={[styles.activityPaletteButton, { borderColor: currentColor || colors.primary }]} onPress={() => openActivityColorEditor(activityId, currentColor, target)}>
        <Text style={styles.activityPaletteButtonText}>🎨</Text>
      </Pressable>
    );
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
      setTasksError('Enter date of birth in Day / Month / Year format.');
      return;
    }
    if (!isValidBirthDateInput(birthDateText)) {
      setTasksError('Use date format Day / Month / Year.');
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
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;

    if (!email || !password) {
      setTasksError('Enter email and password.');
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
      await signInWithEmail(email, password);
      const ctx = await getOrCreateSessionContext();
      if (ctx) {
        setSignInModalOpen(false);
        setSession(ctx);
        setRole(toUiRole(ctx.role));
        await Promise.allSettled([
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
        setTasksError(null);
        return;
      }
      setTasksError('Signed in, but could not load your profile session.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed.';
      setTasksError(message);
      setAuthPassword('');
      if (message.toLowerCase().includes('invalid login credentials')) {
        setAuthInfo('Check that you are using your latest password, or use Forgot password.');
      }
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
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;
    const passwordConfirm = authPasswordConfirm;

    if (!authName.trim() || !email || !password || !passwordConfirm) {
      setTasksError('Enter name, email, password and confirm password.');
      return;
    }
    if (!isValidEmail(email)) {
      setTasksError('Enter a valid email.');
      return;
    }
    if (password.length < 6) {
      setTasksError('Password must be at least 6 characters.');
      return;
    }
    if (password !== passwordConfirm) {
      setTasksError('Passwords do not match.');
      return;
    }

    try {
      setAuthLoading(true);
      setTasksError(null);
      setAuthInfo(null);
      const nextParentLabel: ParentLabel = authSignupSex === 'male' ? 'Dad' : 'Mom';
      const result = await signUpWithEmail(email, password, authName.trim());

      if (result?.session) {
        await upsertMyProfile({ fullName: authName.trim() });
        const ctx = await getOrCreateSessionContext();
        if (ctx) {
          setParentLabel(nextParentLabel);
          setNutritionSex(authSignupSex);
          setPersonalProfile((prev) => ({ ...prev, fullName: authName.trim() }));
          setSession(ctx);
          setRole(toUiRole(ctx.role));
          await upsertUserPreferences(ctx, { parentLabel: nextParentLabel, nutritionSex: authSignupSex });
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
        setParentLabel(nextParentLabel);
        setNutritionSex(authSignupSex);
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
    const email = authEmail.trim().toLowerCase();

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
      Alert.alert('Reset link sent', 'Check your email for the password reset link.');
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Could not send reset email.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handlePasswordRecoveryUpdate() {
    if (authLoading) return;
    const nextPassword = authPassword;
    const confirmPassword = authPasswordConfirm;

    if (!nextPassword || !confirmPassword) {
      setTasksError('Enter new password and confirm it.');
      return;
    }
    if (nextPassword.length < 6) {
      setTasksError('Password must be at least 6 characters.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setTasksError('Passwords do not match.');
      return;
    }

    try {
      setAuthLoading(true);
      setTasksError(null);
      setAuthInfo(null);
      await updatePassword(nextPassword);
      setAuthPassword('');
      setAuthPasswordConfirm('');
      setAuthInfo('Password updated. You can now continue in the app.');
      setSignInModalOpen(false);
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Could not update password.');
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
    const cycleLastPeriodStartInput = personalProfile.cycleLastPeriodStart?.trim() || '';
    const cycleLengthDays = personalProfile.cycleLengthDays?.trim() || '';
    const cyclePeriodLengthDays = personalProfile.cyclePeriodLengthDays?.trim() || '';
    setPersonalProfileStatus(null);
    setPersonalProfileError(null);
    if (!fullName) {
      setPersonalProfileError('Enter your name.');
      return false;
    }
    if (dateOfBirth && !isValidBirthDateInput(dateOfBirth)) {
      setPersonalProfileError('Use date format DD.MM.YYYY for your date of birth.');
      return false;
    }
    if (personalProfile.heightCm?.trim() && !/^\d{2,3}$/.test(personalProfile.heightCm.trim())) {
      setPersonalProfileError('Height should be a number in cm.');
      return false;
    }
    if (personalProfile.weightKg?.trim() && !/^\d{1,3}([.,]\d{1,2})?$/.test(personalProfile.weightKg.trim())) {
      setPersonalProfileError('Weight should be a number in kg.');
      return false;
    }
    if (cycleTrackingEnabled && cycleLastPeriodStartInput && !isValidBirthDateInput(cycleLastPeriodStartInput)) {
      setPersonalProfileError('Use date format DD.MM.YYYY for period start.');
      return false;
    }

    const cycleLastPeriodStart = cycleLastPeriodStartInput || resolveCycleLastPeriodStart(personalProfile.cycleEntries || [], '');

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
        await upsertMyProfile({
          ...normalizedProfile,
          cycleEntries: normalizedProfile.cycleEntries || [],
        });
        await refreshMyPersonalProfile();
        setPersonalProfileError(null);
        setPersonalProfileStatus('Saved');
        setPersonalProfileReadonly(true);
        return true;
      } catch (error) {
        setPersonalProfileStatus(null);
        setPersonalProfileError(getErrorMessage(error, 'Could not save personal data.'));
        return false;
      }
    }

    setPersonalProfileError(null);
    setPersonalProfileStatus('Saved');
    setPersonalProfileReadonly(true);
    return true;
  }

  async function handleParentLabelChange(nextLabel: ParentLabel) {
    if (nextLabel === parentLabel) return;
    setParentLabel(nextLabel);
    setNutritionSex(nextLabel === 'Dad' ? 'male' : 'female');
    if (session && isSupabaseConfigured) {
      try {
        await upsertUserPreferences(session, {
          parentLabel: nextLabel,
          nutritionSex: nextLabel === 'Dad' ? 'male' : 'female',
        });
        await refreshUserPreferences();
      } catch (error) {
        setTasksError(error instanceof Error ? error.message : 'Could not update account mode.');
      }
    }
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
        await upsertMyProfile({
          ...normalizedProfile,
          cycleEntries: normalizedProfile.cycleEntries || [],
        });
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

    const normalizedProfile: PersonalProfile = {
      ...personalProfile,
      cycleTrackingEnabled: true,
      cycleLastPeriodStart: resolveCycleLastPeriodStart(nextEntries, personalProfile.cycleLastPeriodStart || ''),
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
        await Promise.all([
          replaceCycleEntries(session, nextEntries),
          upsertMyProfile({
            ...normalizedProfile,
            cycleEntries: nextEntries,
          }),
        ]);
      } catch (error) {
        setPersonalProfileStatus(null);
        setPersonalProfileError(getErrorMessage(error, 'Could not save cycle entry.'));
      }
    }
  }

  async function handleRemoveCycleEntry(dateKey: string) {
    const nextEntries = (personalProfile.cycleEntries || []).filter((item) => item.date !== dateKey);

    const normalizedProfile: PersonalProfile = {
      ...personalProfile,
      cycleLastPeriodStart: resolveCycleLastPeriodStart(nextEntries, ''),
      cycleEntries: nextEntries,
    };

    latestPersonalProfileRef.current = normalizedProfile;
    setPersonalProfile(normalizedProfile);
    setPersonalProfileError(null);
    setPersonalProfileStatus('Cycle entry removed');

    if (session && isSupabaseConfigured) {
      try {
        await Promise.all([
          replaceCycleEntries(session, nextEntries),
          upsertMyProfile({
            ...normalizedProfile,
            cycleEntries: nextEntries,
          }),
        ]);
      } catch (error) {
        setPersonalProfileStatus(null);
        setPersonalProfileError(getErrorMessage(error, 'Could not remove cycle entry.'));
      }
    }
  }

  const settingsScreenNode = (
    <SettingsScreen
      parentLabel={parentLabel}
      currentRole={role}
      staffEnabled={staffEnabled}
      onToggleStaff={() => setStaffEnabled((v) => !v)}
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
      periodRemindersEnabled={periodRemindersEnabled}
      onPeriodRemindersEnabledChange={setPeriodRemindersEnabled}
      periodReminderLeadDays={periodReminderLeadDays}
      onPeriodReminderLeadDaysChange={setPeriodReminderLeadDays}
      children={children.map((child) => ({ id: child.id, name: child.name }))}
      staffProfiles={staffProfiles.map((profile) => ({ id: profile.id, name: profile.name, dateOfBirth: profile.dateOfBirth }))}
      activeFamilyViewKey={activeOwnerFilter}
      onSelectFamilyView={selectCalendarProfile}
      onSelectParentLabel={handleSelectParentLabel}
      onToggleChildProfileSetup={() => setChildSetupOpen((prev) => !prev)}
      onToggleStaffProfileSetup={() => setStaffSetupOpen((prev) => !prev)}
      onEditStaffProfile={openStaffProfileEditor}
    />
  );

  function handleDashboardAddMeal() {
    setDashboardMealPickerOpen(true);
  }

  function handleDashboardMealTypePick(mealType: NutritionMealType) {
    setDashboardMealPickerOpen(false);
    setScreen('calendar');
    setDashboardNutritionQuickAction({ type: 'add-meal', mealType, token: Date.now() });
  }

  function handleDashboardOpenShoppingList() {
    setScreen('food');
    setFoodTab('shopping');
    setDashboardShoppingQuickAction({ type: 'add-item', token: Date.now() });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.bgDecor}>
        <View style={styles.bgOrbA} />
        <View style={styles.bgOrbB} />
        <View style={styles.bgOrbC} />
      </View>
      <View style={styles.topBar}>
        <View style={styles.brandWrap}>
          <Text style={styles.brandTitle}>FamOs</Text>
          <Text style={styles.brandSubtitle}>your family operating system</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.menuButton} onPress={() => setSettingsPanelOpen(true)}>
            <Text style={styles.menuButtonIcon}>☰</Text>
          </Pressable>
        </View>
      </View>
      <Modal visible={settingsPanelOpen} transparent animationType="fade" onRequestClose={() => setSettingsPanelOpen(false)}>
        <View style={styles.settingsModalRoot}>
          <Pressable style={styles.settingsModalBackdrop} onPress={() => setSettingsPanelOpen(false)} />
          <View pointerEvents="box-none" style={styles.settingsModalLayer}>
            <View style={styles.settingsModalCard}>
              <View style={styles.settingsModalHeader}>
                <View style={styles.settingsModalHeaderCopy}>
                  <Text style={styles.settingsModalTitle}>Settings</Text>
                </View>
                <Pressable style={styles.settingsModalCloseBtn} onPress={() => setSettingsPanelOpen(false)}>
                  <Text style={styles.settingsModalCloseText}>Close</Text>
                </Pressable>
              </View>
              <View style={styles.settingsModalContent}>
                {settingsScreenNode}
              </View>
              <View style={styles.settingsUtilityCard}>
                <View style={styles.settingsUtilitySection}>
                  <Text style={styles.settingsUtilityTitle}>Theme</Text>
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
                        }}
                      >
                        {themeName === name ? <View style={styles.accountThemeSwatchInner} /> : null}
                      </Pressable>
                    ))}
                  </View>
                </View>

                {!session ? (
                  <View style={styles.settingsUtilityActionsRow}>
                    <Pressable
                      style={styles.accountMenuPrimaryItem}
                      onPress={() => {
                        setSettingsPanelOpen(false);
                        openAuthMenu('signin');
                      }}
                    >
                      <Text style={styles.accountMenuPrimaryItemText}>Log in</Text>
                    </Pressable>
                    <Pressable
                      style={styles.accountMenuItem}
                      onPress={() => {
                        setSettingsPanelOpen(false);
                        openAuthMenu('signup');
                      }}
                    >
                      <Text style={styles.accountMenuItemText}>Create account</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.accountMenuItem, styles.accountMenuDangerItem]}
                    onPress={() => {
                      signOut()
                        .then(() => {
                          resetSignedOutState();
                          setSettingsPanelOpen(false);
                        })
                        .catch((error) => setTasksError(error instanceof Error ? error.message : 'Sign-out failed.'));
                    }}
                  >
                    <Text style={[styles.accountMenuItemText, styles.accountMenuDangerText]}>Sign out</Text>
                  </Pressable>
                )}
              </View>
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
        <View style={styles.signInModalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSignInModalOpen(false)} />
          <View pointerEvents="box-none" style={styles.signInModalLayer}>
            <View style={styles.signInModalCard}>
            <Text style={styles.authTitle}>
              {authMode === 'signup'
                ? 'Create Account'
                : authMode === 'reset'
                  ? 'Reset Password'
                  : authMode === 'recover'
                    ? 'Set New Password'
                    : 'Sign In'}
            </Text>
            {authMode === 'signup' ? (
              <>
                <TextInput
                  placeholder="Full name"
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.input}
                  value={authName}
                  onChangeText={setAuthName}
                />
                <View style={styles.accountChoiceRow}>
                  <Pressable
                    style={[styles.accountChoiceChip, authSignupSex === 'female' && styles.accountChoiceChipActive]}
                    onPress={() => setAuthSignupSex('female')}
                  >
                    <Text style={[styles.accountChoiceChipText, authSignupSex === 'female' && styles.accountChoiceChipTextActive]}>Woman</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.accountChoiceChip, authSignupSex === 'male' && styles.accountChoiceChipActive]}
                    onPress={() => setAuthSignupSex('male')}
                  >
                    <Text style={[styles.accountChoiceChipText, authSignupSex === 'male' && styles.accountChoiceChipTextActive]}>Man</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
            {authMode !== 'recover' ? (
              <TextInput
                placeholder="Email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                style={styles.input}
                value={authEmail}
                onChangeText={setAuthEmail}
              />
            ) : (
              <Text style={styles.authInfoText}>Enter a new password for your account.</Text>
            )}
            {authMode !== 'reset' ? (
              <View style={styles.passwordInputWrap}>
                <TextInput
                  key={`auth-password-${authMode}`}
                  placeholder="Password"
                  secureTextEntry={!authPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType={authMode === 'signin' ? 'none' : 'newPassword'}
                  autoComplete={authMode === 'signin' ? 'off' : 'new-password'}
                  importantForAutofill={authMode === 'signin' ? 'no' : 'yes'}
                  style={[styles.input, styles.passwordInputField]}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                />
                <Pressable
                  style={styles.passwordToggleBtn}
                  onPress={() => setAuthPasswordVisible((prev) => !prev)}
                  hitSlop={10}
                >
                  <PasswordEyeIcon visible={authPasswordVisible} color={authPasswordVisible ? colors.primary : '#64748b'} />
                </Pressable>
              </View>
            ) : null}
            {authMode === 'signup' || authMode === 'recover' ? (
              <View style={styles.passwordInputWrap}>
                <TextInput
                  key={`auth-password-confirm-${authMode}`}
                  placeholder={authMode === 'recover' ? 'Confirm new password' : 'Confirm password'}
                  secureTextEntry={!authPasswordConfirmVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  importantForAutofill="yes"
                  style={[styles.input, styles.passwordInputField]}
                  value={authPasswordConfirm}
                  onChangeText={setAuthPasswordConfirm}
                />
                <Pressable
                  style={styles.passwordToggleBtn}
                  onPress={() => setAuthPasswordConfirmVisible((prev) => !prev)}
                  hitSlop={10}
                >
                  <PasswordEyeIcon visible={authPasswordConfirmVisible} color={authPasswordConfirmVisible ? colors.primary : '#64748b'} />
                </Pressable>
              </View>
            ) : null}
            {tasksError ? <Text style={styles.authErrorText}>{tasksError}</Text> : null}
            {authInfo ? <Text style={styles.authInfoText}>{authInfo}</Text> : null}
            {authMode === 'signin' ? (
              <Pressable
                onPress={() => {
                  setTasksError(null);
                  setAuthInfo('Enter your email to receive a reset link.');
                  setAuthPassword('');
                  setAuthPasswordConfirm('');
                  setAuthPasswordVisible(false);
                  setAuthPasswordConfirmVisible(false);
                  setAuthMode('reset');
                }}
                disabled={authLoading}
              >
                <Text style={styles.authSwitchText}>Forgot password?</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                setTasksError(null);
                setAuthInfo(null);
                setAuthPassword('');
                setAuthPasswordConfirm('');
                setAuthPasswordVisible(false);
                setAuthPasswordConfirmVisible(false);
                setAuthMode((prev) => {
                  if (prev === 'signup') return 'signin';
                  if (prev === 'reset') return 'signin';
                  if (prev === 'recover') return 'signin';
                  return 'signup';
                });
              }}
            >
              <Text style={styles.authSwitchText}>
                {authMode === 'signup'
                  ? 'Already have an account? Sign In'
                  : authMode === 'reset'
                    ? 'Back to Sign In'
                    : authMode === 'recover'
                      ? 'Back to Sign In'
                    : "Don't have an account? Sign Up"}
              </Text>
            </Pressable>
            <View style={styles.authActions}>
              <Pressable
                style={[styles.authBtn, styles.authSecondary]}
                onPress={() => {
                  setAuthPasswordVisible(false);
                  setAuthPasswordConfirmVisible(false);
                  setSignInModalOpen(false);
                }}
              >
                <Text style={[styles.authBtnText, styles.authSecondaryText]}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.authBtn, authLoading && styles.authBtnDisabled]}
                onPress={
                  authMode === 'signup'
                    ? handleSignUp
                    : authMode === 'reset'
                      ? handlePasswordReset
                      : authMode === 'recover'
                        ? handlePasswordRecoveryUpdate
                        : handleSignIn
                }
                disabled={authLoading}
              >
                <Text style={styles.authBtnText}>
                  {authLoading
                    ? 'Please wait...'
                    : authMode === 'signup'
                      ? 'Create Account'
                      : authMode === 'reset'
                        ? 'Send reset link'
                        : authMode === 'recover'
                          ? 'Update password'
                        : 'Sign In'}
                </Text>
              </Pressable>
            </View>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={dashboardMealPickerOpen} transparent animationType="fade" onRequestClose={() => setDashboardMealPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDashboardMealPickerOpen(false)} />
          <View style={styles.mealPickerCard}>
            <Text style={styles.mealPickerEyebrow}>Today&apos;s Meals</Text>
            <Text style={styles.mealPickerTitle}>Choose meal type</Text>
            <View style={styles.mealPickerGrid}>
              {DASHBOARD_MEAL_CHOICES.map((option) => (
                <Pressable key={option.key} style={styles.mealPickerOption} onPress={() => handleDashboardMealTypePick(option.key)}>
                  <Text style={styles.mealPickerOptionText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.mealPickerCloseBtn} onPress={() => setDashboardMealPickerOpen(false)}>
              <Text style={styles.mealPickerCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
        onNutritionEntriesChange={handleNutritionEntriesChange}
        customFoodPresets={customNutritionFoods}
        onCustomFoodPresetsChange={handleCustomNutritionFoodsChange}
        quickActionRequest={dashboardNutritionQuickAction}
        renderInlineContent={false}
      />
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>

      {role === 'mother' ? (
        <>
          {childSetupOpen ? (
            <View style={styles.authCard}>
              <Text style={styles.authTitle}>Child Profile Setup</Text>
              <TextInput placeholder="Child name" style={styles.input} value={childDraftName} onChangeText={setChildDraftName} />
              <TextInput
                placeholder="Date of birth (Day / Month / Year)"
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

                    <View style={styles.activitySmallInput}>
                      <Pressable style={styles.dropdownTrigger} onPress={() => openChildTimePicker(activity.id, activity.time)}>
                        <Text style={styles.dropdownValue}>{normalizeTimeText(activity.time || '10:00 AM')}</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.activityColorRow}>
                    {childColorPalette.map((paletteColor) => {
                      const active = activity.color === paletteColor;
                      const unavailable = getUnavailableActivityColors(activity.id, 'draft').has(paletteColor.toLowerCase());
                      if (unavailable && !active) return null;
                      return (
                        <Pressable
                          key={`${activity.id}-${paletteColor}`}
                          onPress={() => setActivityColor(activity.id, paletteColor, 'draft')}
                          style={[
                            styles.activityColorDot,
                            { backgroundColor: paletteColor },
                            active && styles.activityColorDotActive,
                          ]}
                        />
                      );
                    })}
                    {renderActivityPaletteButton(activity.id, activity.color, 'draft')}
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
        <NavButton label="Home" active={screen === 'calendar'} onPress={() => setScreen('calendar')} />
        <NavButton label="Food" active={screen === 'food'} onPress={() => setScreen('food')} />
        <NavButton label="Family" active={screen === 'family'} onPress={() => setScreen('family')} />
        <NavButton label="Wellness" active={screen === 'wellness'} onPress={() => setScreen('wellness')} />
        <NavButton label="Fix it" active={screen === 'fixit'} onPress={() => setScreen('fixit')} />
      </View>
      {screen === 'food' ? (
        <View style={styles.subnav}>
          <NavButton label="Recipes" active={foodTab === 'recipes'} onPress={() => setFoodTab('recipes')} />
          <NavButton label="Plan" active={foodTab === 'plan'} onPress={() => setFoodTab('plan')} />
          <NavButton label="Shopping" active={foodTab === 'shopping'} onPress={() => setFoodTab('shopping')} />
        </View>
      ) : null}
      {screen === 'family' ? (
        <View style={styles.subnav}>
          <NavButton label="Children" active={familyTab === 'children'} onPress={() => setFamilyTab('children')} />
          <NavButton label="Chores" active={familyTab === 'chores'} onPress={() => setFamilyTab('chores')} />
        </View>
      ) : null}
        {screen === 'calendar' ? (
          <>
            <View style={styles.summaryWrap}>
              <Pressable
                style={[styles.summaryCard, needsYouCount > 0 ? styles.summaryCardWarn : styles.summaryCardOk]}
                onPress={() => { setScreen('family'); setFamilyTab('chores'); }}
              >
                <Text style={styles.summaryLabel}>⚠️ Needs you</Text>
                <Text style={[styles.summaryValue, needsYouCount > 0 ? styles.summaryValueWarn : styles.summaryValueOk]}>
                  {needsYouCount > 0 ? needsYouCount : 'All clear'}
                </Text>
                <Text style={styles.summarySub}>{needsYouCount > 0 ? 'to review' : 'nothing pending'}</Text>
              </Pressable>

              <Pressable style={styles.summaryCard} onPress={() => setScreen('calendar')}>
                <Text style={styles.summaryLabel}>📅 Today</Text>
                <Text style={styles.summaryValue}>{eventsTodayCount}</Text>
                <Text style={styles.summarySub} numberOfLines={1}>
                  {nextUpcomingEvent ? `next: ${nextUpcomingEvent.title}` : eventsTodayCount ? 'events' : 'nothing planned'}
                </Text>
              </Pressable>

              {choresToday.total > 0 ? (
                <Pressable style={styles.summaryCard} onPress={() => { setScreen('family'); setFamilyTab('chores'); }}>
                  <Text style={styles.summaryLabel}>🧹 Chores</Text>
                  <Text style={styles.summaryValue}>{choresToday.done}/{choresToday.total}</Text>
                  <Text style={styles.summarySub}>done today</Text>
                </Pressable>
              ) : null}

              <Pressable style={styles.summaryCard} onPress={() => setScreen('wellness')}>
                <Text style={styles.summaryLabel}>🍎 You today</Text>
                <Text style={styles.summaryValue}>
                  {dailyCalorieTarget > 0 ? `${todayNutritionCalories}/${dailyCalorieTarget}` : todayNutritionCalories || '—'}
                </Text>
                <Text style={styles.summarySub}>
                  {dailyCalorieTarget > 0 ? 'kcal' : 'kcal · set goal'}
                  {activeHabitsCount > 0 ? ` · habits ${completedHabitsTodayCount}/${activeHabitsCount}` : ''}
                </Text>
              </Pressable>
            </View>
            <View style={styles.dashboardGrid}>
              <Pressable style={[styles.dashboardQuickCard, styles.dashboardQuickCardMeal]} onPress={handleDashboardAddMeal}>
                <View style={styles.dashboardQuickCardImage}>
                  <View style={styles.dashboardQuickCardPhotoFrame}>
                    <Image source={HOME_TODAYS_MEALS_COVER} resizeMode="contain" style={styles.dashboardQuickCardPhoto} />
                  </View>
                  <View style={[styles.dashboardQuickCardOverlay, styles.dashboardQuickCardOverlayWarm]} />
                  <View style={styles.dashboardQuickCardContent}>
                    <Text style={styles.dashboardQuickCardTitle}>Today&apos;s Meals</Text>
                  </View>
                </View>
              </Pressable>

              <Pressable style={[styles.dashboardQuickCard, styles.dashboardQuickCardShopping]} onPress={handleDashboardOpenShoppingList}>
                <View style={styles.dashboardQuickCardImage}>
                  <View style={styles.dashboardQuickCardPhotoFrame}>
                    <Image source={HOME_SHOPPING_LIST_COVER} resizeMode="contain" style={styles.dashboardQuickCardPhoto} />
                  </View>
                  <View style={[styles.dashboardQuickCardOverlay, styles.dashboardQuickCardOverlayCool]} />
                  <View style={styles.dashboardQuickCardContent}>
                    <Text style={styles.dashboardQuickCardTitle}>Shopping List</Text>
                  </View>
                </View>
              </Pressable>
            </View>
            <CalendarScreen
              isActive={screen === 'calendar'}
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
              periodRemindersEnabled={periodRemindersEnabled}
              periodReminderLeadDays={periodReminderLeadDays}
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
              onNutritionEntriesChange={handleNutritionEntriesChange}
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
              quickActionRequest={dashboardCalendarQuickAction}
              onCompleteStaffTask={markStaffTaskDone}
              getStaffTaskSuggestions={getStaffTaskSuggestions}
              onAddEvent={({ title, date, time, endTime, owner, ownerName, ownerChildProfileId, shareToParent, category, color, taskPriority, motherColor, staffColor, visibility }) => {
                const isStaffTask = owner === 'staff' && category.toLowerCase().includes('task');
                const deadlineAt = time ? `${date} ${time}` : date;
                const childForMirror =
                  owner === 'child' && ownerChildProfileId
                    ? children.find(
                        (item) =>
                          item.id === ownerChildProfileId &&
                          (shareToParent ?? (item.includeInMotherCalendar ?? true)),
                      )
                    : null;
                const mirrorEvent = childForMirror
                  ? buildParentMirrorEvent({
                      childId: childForMirror.id,
                      childName: childForMirror.name,
                      parentLabel,
                      title,
                      date,
                      time,
                      endTime,
                      color,
                    })
                  : null;
                if (session) {
                  const tempId = `tmp-e-${Date.now()}`;
                  const optimisticEvent: CalendarEvent = {
                    id: tempId,
                    title,
                    date,
                    time,
                    endTime,
                    owner,
                    ownerName,
                    ownerChildProfileId,
                    category,
                    color,
                    motherColor,
                    staffColor,
                    visibility,
                  };
                  const optimisticMirrorEvent = mirrorEvent ? { ...mirrorEvent, id: `tmp-mirror-${Date.now()}` } : null;

                  setEvents((prev) => [optimisticEvent, ...(optimisticMirrorEvent ? [optimisticMirrorEvent] : []), ...prev]);
                  Promise.all([
                    createCalendarEvent(session, {
                      title,
                      date,
                      time,
                      endTime,
                      owner,
                      ownerName,
                      ownerChildProfileId: ownerChildProfileId || null,
                      category,
                      color,
                      motherColor,
                      staffColor,
                      visibility,
                    }),
                    mirrorEvent
                      ? createCalendarEvent(session, {
                          title: mirrorEvent.title,
                          date: mirrorEvent.date,
                          time: mirrorEvent.time,
                          endTime: mirrorEvent.endTime,
                          owner: mirrorEvent.owner,
                          ownerName: mirrorEvent.ownerName,
                          ownerChildProfileId: mirrorEvent.ownerChildProfileId || null,
                          category: mirrorEvent.category,
                          color: mirrorEvent.color,
                          motherColor: mirrorEvent.motherColor,
                          staffColor: mirrorEvent.staffColor,
                          visibility: mirrorEvent.visibility,
                        })
                      : Promise.resolve(),
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
                      setEvents((prev) =>
                        prev.filter((event) => event.id !== tempId && event.id !== optimisticMirrorEvent?.id),
                      );
                      setTasksError(error instanceof Error ? error.message : 'Create event failed.');
                    });
                  return;
                }

                const eventId = `e${Date.now()}`;
                setEvents((prev) => {
                  const primaryEvent: CalendarEvent = {
                    id: eventId,
                    title,
                    date,
                    time,
                    endTime,
                    owner,
                    ownerName,
                    category,
                    color,
                    motherColor,
                    staffColor,
                    visibility,
                    ownerChildProfileId,
                  };
                  const localMirrorEvent = mirrorEvent ? { ...mirrorEvent, id: `e-mirror-${Date.now()}` } : null;
                  return [primaryEvent, ...(localMirrorEvent ? [localMirrorEvent] : []), ...prev];
                });
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
              onUpdateEvent={({ id, title, color, time, endTime, owner, ownerName, ownerChildProfileId, shareToParent, category, date, motherColor, staffColor, visibility }) => {
                const isStaffTask = owner === 'staff' && category.toLowerCase().includes('task');
                const sourceEvent = events.find((event) => event.id === id);
                const childForMirror =
                  owner === 'child' && ownerChildProfileId
                    ? children.find((item) => item.id === ownerChildProfileId)
                    : undefined;
                const counterpartEvent = findLinkedChildMirrorEvent(events, sourceEvent || null);
                const nextMirrorEvent =
                  childForMirror && (shareToParent ?? (childForMirror.includeInMotherCalendar ?? true))
                    ? buildParentMirrorEvent({
                        childId: childForMirror.id,
                        childName: childForMirror.name,
                        parentLabel,
                        title,
                        date,
                        time,
                        endTime,
                        color,
                      })
                    : null;
                if (session) {
                  const updates: Promise<void>[] = [
                    updateCalendarEvent(session, {
                      id,
                      title,
                      date,
                      time,
                      endTime,
                      owner,
                      ownerName,
                      ownerChildProfileId: ownerChildProfileId || null,
                      category,
                      color,
                      motherColor,
                      staffColor,
                      visibility,
                    }),
                  ];
                  if (counterpartEvent && nextMirrorEvent) {
                    updates.push(
                      updateCalendarEvent(session, {
                        id: counterpartEvent.id,
                        title: nextMirrorEvent.title,
                        date: nextMirrorEvent.date,
                        time: nextMirrorEvent.time,
                        endTime: nextMirrorEvent.endTime,
                        owner: nextMirrorEvent.owner,
                        ownerName: nextMirrorEvent.ownerName,
                        ownerChildProfileId: nextMirrorEvent.ownerChildProfileId || null,
                        category: nextMirrorEvent.category,
                        color: nextMirrorEvent.color,
                        motherColor: nextMirrorEvent.motherColor,
                        staffColor: nextMirrorEvent.staffColor,
                        visibility: nextMirrorEvent.visibility,
                      }),
                    );
                  }
                  Promise.all(updates)
                    .then(() => refreshLiveCalendar())
                    .catch((error) => setTasksError(error instanceof Error ? error.message : 'Update event failed.'));
                  return;
                }

                setEvents((prev) => {
                  let next = prev.map((event) =>
                    event.id === id ? { ...event, title, color, time, endTime, owner, ownerName, ownerChildProfileId, category, date, motherColor, staffColor, visibility } : event,
                  );
                  if (counterpartEvent && nextMirrorEvent) {
                    next = next.map((event) =>
                      event.id === counterpartEvent.id
                        ? {
                            ...event,
                            title: nextMirrorEvent.title,
                            color: nextMirrorEvent.color,
                            time: nextMirrorEvent.time,
                            endTime: nextMirrorEvent.endTime,
                            owner: nextMirrorEvent.owner,
                            ownerName: nextMirrorEvent.ownerName,
                            ownerChildProfileId: nextMirrorEvent.ownerChildProfileId,
                            category: nextMirrorEvent.category,
                            date: nextMirrorEvent.date,
                            motherColor: nextMirrorEvent.motherColor,
                            staffColor: nextMirrorEvent.staffColor,
                            visibility: nextMirrorEvent.visibility,
                          }
                        : event,
                    );
                  } else if (counterpartEvent && !nextMirrorEvent) {
                    next = next.filter((event) => event.id !== counterpartEvent.id);
                  } else if (!counterpartEvent && nextMirrorEvent) {
                    next = [{ ...nextMirrorEvent, id: `e-mirror-${Date.now()}` }, ...next];
                  }
                  return next;
                });
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
              onDeleteEvent={({ id }) => {
                const sourceEvent = events.find((event) => event.id === id) || null;
                const counterpartEvent = findLinkedChildMirrorEvent(events, sourceEvent);
                const deleteIds = [id, counterpartEvent?.id].filter(Boolean) as string[];

                if (session) {
                  Promise.all(deleteIds.map((eventId) => deleteCalendarEvent(session, eventId)))
                    .then(() => refreshLiveCalendar())
                    .catch((error) => setTasksError(error instanceof Error ? error.message : 'Delete event failed.'));
                  return;
                }

                setEvents((prev) => prev.filter((event) => !deleteIds.includes(event.id)));
              }}
            />
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
              onNutritionEntriesChange={handleNutritionEntriesChange}
              customFoodPresets={customNutritionFoods}
              onCustomFoodPresetsChange={handleCustomNutritionFoodsChange}
            />
          </>
        ) : null}

        {screen === 'family' && familyTab === 'children' ? (
          <ChildrenScreen
            children={children}
            onDeleteChild={handleDeleteChildDirect}
            onEditChild={openChildActivitiesEditor}
            quickActionRequest={dashboardFamilyQuickAction}
            onAddChild={() => {
              setEditingChildId(null);
              setChildDraftName('');
              setChildDraftDob('');
              setChildDraftIncludeInMotherCalendar(true);
              setChildDraftActivities([createDefaultDraftActivity()]);
              setChildSetupOpen(true);
              setStaffSetupOpen(false);
              setTasksError(null);
            }}
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

        {screen === 'family' && familyTab === 'chores' ? (
          <ChoresScreen chores={chores} onChoresChange={handleChoresChange} children={children} />
        ) : null}

        {screen === 'food' && foodTab === 'recipes' ? (
          <RecipesScreen
            recipes={recipes}
            onRecipeCreate={handleRecipeCreate}
            onRecipeUpdate={handleRecipeUpdate}
            onRecipeDelete={handleRecipeDelete}
            onNutritionEntriesChange={handleNutritionEntriesChange}
          />
        ) : null}

        {screen === 'food' && foodTab === 'plan' ? (
          <MealPlannerScreen
            recipes={recipes}
            weeklyPlan={weeklyMealPlan}
            onWeeklyPlanChange={handleWeeklyMealPlanChange}
            planProfiles={mealPlanProfiles}
            onPlanProfilesChange={handleMealPlanProfilesChange}
            activeProfileKey={activeMealPlanProfileKey}
            onActiveProfileKeyChange={handleActiveMealPlanProfileKeyChange}
          />
        ) : null}

        {screen === 'wellness' ? (
          <HabitsScreen
            habits={habits}
            onHabitsChange={setHabits}
            challenges={habitChallenges}
            habitRemindersEnabled={habitRemindersEnabled}
            quickActionRequest={dashboardWellnessQuickAction}
          />
        ) : null}

        {screen === 'fixit' ? (
          <FixItScreen
            issues={homeIssues}
            onIssuesChange={handleHomeIssuesChange}
            providers={homeProviders}
            onProvidersChange={handleHomeProvidersChange}
          />
        ) : null}

        {screen === 'food' && foodTab === 'shopping' ? (
          <ShoppingScreen
            lists={shoppingLists}
            fridgeItems={fridgeItems}
            recipes={recipes}
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
                      amount: item.amount ?? next[existingIndex].amount,
                      unit: item.unit ?? next[existingIndex].unit,
                      category: item.category ?? next[existingIndex].category,
                      note: item.note ?? next[existingIndex].note,
                      expiresAt: item.expiresAt ?? next[existingIndex].expiresAt,
                      opened: item.opened ?? next[existingIndex].opened,
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
              const nextFridgeItems = fridgeItems.map((item) => (item.id === itemId ? { ...item, status } : item));
              setFridgeItems(nextFridgeItems);
            }}
            onAddFridgeItemToShopping={(itemId) => {
              const targetItem = fridgeItems.find((item) => item.id === itemId);
              if (!targetItem) return;

              if (session && isSupabaseConfigured) {
                const latestList = getCurrentShoppingList(shoppingLists);
                if (latestList) {
                  const nextShoppingItems = mergeShoppingItemsWithFridgeItem(latestList.items, targetItem);
                  setShoppingLists((prev) =>
                    prev.map((list) => (list.id === latestList.id ? { ...list, items: nextShoppingItems } : list)),
                  );
                  updateShoppingListItems(session, latestList.id, nextShoppingItems)
                    .then(() => refreshLiveShopping())
                    .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not add item to shopping list.'));
                  return;
                }

                const shoppingItem = {
                  name: targetItem.name,
                  quantity: targetItem.quantity,
                  category: inferShoppingItemCategory(targetItem.name),
                  comment: [targetItem.note, targetItem.opened ? 'Opened' : '', targetItem.expiresAt ? `Use by ${targetItem.expiresAt}` : '']
                    .filter(Boolean)
                    .join(' · '),
                  purchased: false as const,
                };
                createShoppingList(session, 'Shopping List', [shoppingItem])
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not create shopping list.'));
                return;
              }

              setShoppingLists((prev) => {
                const shoppingItem = {
                  id: `si-fridge-restock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  name: targetItem.name,
                  quantity: targetItem.quantity,
                  category: inferShoppingItemCategory(targetItem.name),
                  comment: [targetItem.note, targetItem.opened ? 'Opened' : '', targetItem.expiresAt ? `Use by ${targetItem.expiresAt}` : '']
                    .filter(Boolean)
                    .join(' · '),
                  purchased: false,
                };
                if (prev.length === 0) {
                  return [
                    {
                      id: `sl-fridge-restock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      title: 'Shopping List',
                      listType: 'current',
                      createdAt: new Date().toISOString(),
                      items: [shoppingItem],
                    },
                  ];
                }
                const localCurrent = getCurrentShoppingList(prev);
                if (!localCurrent) return prev;
                return prev.map((list) =>
                  list.id === localCurrent.id ? { ...list, items: mergeShoppingItemsWithFridgeItem(localCurrent.items, targetItem) } : list,
                );
              });
            }}
            onAddAllLowFridgeItemsToShopping={() => {
              const lowItems = fridgeItems.filter((item) => item.status === 'low');
              if (lowItems.length === 0) return;

              if (session && isSupabaseConfigured) {
                const latestList = getCurrentShoppingList(shoppingLists);
                if (latestList) {
                  const nextShoppingItems = lowItems.reduce(
                    (items, item) => mergeShoppingItemsWithFridgeItem(items, item),
                    latestList.items,
                  );
                  setShoppingLists((prev) =>
                    prev.map((list) => (list.id === latestList.id ? { ...list, items: nextShoppingItems } : list)),
                  );
                  updateShoppingListItems(session, latestList.id, nextShoppingItems)
                    .then(() => refreshLiveShopping())
                    .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not add low items to shopping list.'));
                  return;
                }

                createShoppingList(
                  session,
                  'Shopping List',
                  lowItems.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    category: inferShoppingItemCategory(item.name),
                    comment: [item.note, item.opened ? 'Opened' : '', item.expiresAt ? `Use by ${item.expiresAt}` : '']
                      .filter(Boolean)
                      .join(' · '),
                    purchased: false,
                  })),
                )
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not create shopping list.'));
                return;
              }

              setShoppingLists((prev) => {
                if (prev.length === 0) {
                  return [
                    {
                      id: `sl-fridge-restock-all-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      title: 'Shopping List',
                      listType: 'current',
                      createdAt: new Date().toISOString(),
                      items: lowItems.map((item) => ({
                        id: `si-fridge-restock-all-${item.id}`,
                        name: item.name,
                        quantity: item.quantity,
                        category: inferShoppingItemCategory(item.name),
                        comment: [item.note, item.opened ? 'Opened' : '', item.expiresAt ? `Use by ${item.expiresAt}` : '']
                          .filter(Boolean)
                          .join(' · '),
                        purchased: false,
                      })),
                    },
                  ];
                }
                const localCurrent = getCurrentShoppingList(prev);
                if (!localCurrent) return prev;
                const nextItems = lowItems.reduce(
                  (items, item) => mergeShoppingItemsWithFridgeItem(items, item),
                  localCurrent.items,
                );
                return prev.map((list) => (list.id === localCurrent.id ? { ...list, items: nextItems } : list));
              });
            }}
            onUpdateFridgeItem={(nextItem) => {
              setFridgeItems((prev) => prev.map((item) => (item.id === nextItem.id ? nextItem : item)));
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
                category: inferShoppingItemCategory(item.name),
                comment: [item.note, item.opened ? 'Opened' : '', item.expiresAt ? `Use by ${item.expiresAt}` : ''].filter(Boolean).join(' · '),
                purchased: false,
              };

              if (session && isSupabaseConfigured) {
                const latestList = getCurrentShoppingList(shoppingLists);
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
                        listType: 'current',
                        createdAt: new Date().toISOString(),
                        items: [shoppingItem],
                      },
                    ];
                  }
                  const localCurrent = getCurrentShoppingList(prev);
                  if (!localCurrent) return prev;
                  return prev.map((list) => (list.id === localCurrent.id ? { ...list, items: [shoppingItem, ...localCurrent.items] } : list));
                });
              }

              setFridgeItems((prev) => prev.map((entry) => (entry.id === itemId ? { ...entry, status: 'out' } : entry)));
            }}
            onTogglePurchased={(listId, id) => {
              if (session && isSupabaseConfigured) {
                const targetList = shoppingLists.find((list) => list.id === listId);
                const targetItem = targetList?.items.find((item) => item.id === id);
                if (!targetItem) return;
                const nextPurchased = !targetItem.purchased;
                const shouldMoveToInventory = nextPurchased;
                const nextFridgeItems = shouldMoveToInventory
                  ? mergeFridgeItemsWithShoppingItem(latestFridgeItemsRef.current, targetItem)
                  : latestFridgeItemsRef.current;
                if (nextPurchased) trackPurchasedShoppingItem(targetItem);
                setShoppingLists((prev) =>
                  prev.map((list) =>
                    list.id === listId
                      ? {
                          ...list,
                          items: list.items.map((item) => (item.id === id ? { ...item, purchased: nextPurchased } : item)),
                        }
                      : list,
                    ),
                );
                if (shouldMoveToInventory) setFridgeItems(nextFridgeItems);
                Promise.all([toggleShoppingItemPurchased(id, nextPurchased)])
                  .then(() => {
                    return refreshLiveShopping();
                  })
                  .catch((error) => {
                    setShoppingLists((prev) =>
                      prev.map((list) =>
                        list.id === listId
                          ? {
                              ...list,
                              items: list.items.map((item) => (item.id === id ? { ...item, purchased: !nextPurchased } : item)),
                            }
                          : list,
                      ),
                    );
                    if (shouldMoveToInventory) setFridgeItems(latestFridgeItemsRef.current);
                    setTasksError(error instanceof Error ? error.message : 'Update failed.');
                  });
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
              const targetList = shoppingLists.find((list) => list.id === listId);
              const targetItem = targetList?.items.find((item) => item.id === id);
              if (targetItem && !targetItem.purchased) {
                setFridgeItems((prev) => mergeFridgeItemsWithShoppingItem(prev, targetItem));
              }
              if (targetItem && !targetItem.purchased) {
                trackPurchasedShoppingItem(targetItem);
              }
            }}
            onCreateList={(items, targetListId, createBehavior = 'default') => {
              const existingBaseList = getBaseShoppingList(shoppingLists);
              if (session && isSupabaseConfigured) {
                if (targetListId) {
                  const targetList = shoppingLists.find((list) => list.id === targetListId);
                  if (!targetList) return;
                  const nextItems = items.map((item, index) => ({
                    id: `si-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                    name: item.name,
                    quantity: item.quantity,
                    category: item.category || inferShoppingItemCategory(item.name),
                    purchased: false,
                  }));
                  const mergedItems = mergeShoppingItemsByName(nextItems, targetList.items);
                  updateShoppingListItems(session, targetListId, mergedItems)
                    .then(() => refreshLiveShopping())
                    .catch((error) => setTasksError(error instanceof Error ? error.message : 'Create list failed.'));
                  return;
                }
                const shouldCreateBaseList = !existingBaseList && createBehavior !== 'force-current';
                createShoppingList(
                  session,
                  shouldCreateBaseList ? 'Usual basket' : 'Shopping List',
                  items.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    category: item.category || inferShoppingItemCategory(item.name),
                    purchased: false,
                  })),
                  shouldCreateBaseList ? { listType: 'base' } : { listType: 'current' },
                )
                  .then(() => {
                    if (!existingBaseList || shouldCreateBaseList || createBehavior === 'force-current') markShoppingBootstrapComplete();
                    return refreshLiveShopping();
                  })
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Create list failed.'));
                return;
              }
              setShoppingLists((prev) => {
                if (targetListId && prev.some((list) => list.id === targetListId)) {
                  return prev.map((list) =>
                    list.id === targetListId
                      ? {
                          ...list,
                          items: mergeShoppingItemsByName(
                            items.map((item, index) => ({
                              id: `si-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                              name: item.name,
                              quantity: item.quantity,
                              category: item.category || inferShoppingItemCategory(item.name),
                              purchased: false,
                            })),
                            list.items,
                          ),
                        }
                      : list,
                  );
                }

                const shouldCreateBaseListLocal = !getBaseShoppingList(prev) && createBehavior !== 'force-current';
                return [
                  {
                    id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    title: shouldCreateBaseListLocal ? 'Usual basket' : 'Shopping List',
                    listType: shouldCreateBaseListLocal ? 'base' : 'current',
                    createdAt: new Date().toISOString(),
                    items: items.map((item, index) => ({
                      id: `si-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                      name: item.name,
                      quantity: item.quantity,
                      category: item.category || inferShoppingItemCategory(item.name),
                      purchased: false,
                    })),
                  },
                  ...prev,
                ];
              });
              if (!shoppingBootstrapCompleteRef.current && (!existingBaseList || createBehavior === 'force-current')) {
                markShoppingBootstrapComplete();
              }
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
                          category: item.category || inferShoppingItemCategory(item.name),
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
            onSaveAsBaseList={(listId) => {
              const sourceList = shoppingLists.find((list) => list.id === listId);
              if (!sourceList) return;
              const baseItems = sourceList.items.map((item) => ({ ...item, purchased: false }));
              const existingBaseList = getBaseShoppingList(shoppingLists);

              if (session && isSupabaseConfigured) {
                const persist = existingBaseList
                  ? updateShoppingListItems(session, existingBaseList.id, baseItems).then(() =>
                      updateShoppingListMeta(session, existingBaseList.id, {
                        title: 'Usual basket',
                        listType: 'base',
                        completedAt: null,
                      }),
                    )
                  : createShoppingList(session, 'Usual basket', baseItems, { listType: 'base' });
                persist
                  .then(() => {
                    markShoppingBootstrapComplete();
                    return refreshLiveShopping();
                  })
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not save family base list.'));
                return;
              }

              setShoppingLists((prev) => {
                const nextBase: ShoppingListDoc = existingBaseList
                  ? {
                      ...existingBaseList,
                      title: 'Usual basket',
                      listType: 'base',
                      items: cloneShoppingItems(baseItems),
                    }
                  : {
                      id: `sl-base-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      title: 'Usual basket',
                      listType: 'base',
                      createdAt: new Date().toISOString(),
                      items: cloneShoppingItems(baseItems),
                    };
                const withoutBase = prev.filter((list) => list.id !== existingBaseList?.id);
                return [nextBase, ...withoutBase];
              });
              markShoppingBootstrapComplete();
            }}
            onStartFromBaseList={() => {
              const baseList = getBaseShoppingList(shoppingLists);
              if (!baseList) return;
              const currentList = getCurrentShoppingList(shoppingLists);
              const nextItems = cloneShoppingItems(baseList.items);

              if (session && isSupabaseConfigured) {
                const archiveCurrent = currentList && currentList.items.length > 0
                  ? updateShoppingListMeta(session, currentList.id, {
                      listType: 'history',
                      completedAt: new Date().toISOString(),
                    })
                  : Promise.resolve();
                archiveCurrent
                  .then(() => {
                    if (currentList && currentList.items.length === 0) {
                      return updateShoppingListMeta(session, currentList.id, {
                        title: 'Shopping List',
                        listType: 'current',
                        completedAt: null,
                      }).then(() => updateShoppingListItems(session, currentList.id, nextItems));
                    }
                    return createShoppingList(session, 'Shopping List', nextItems, { listType: 'current' }).then(() => undefined);
                  })
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not start shopping from family list.'));
                return;
              }

              setShoppingLists((prev) => {
                const localBase = getBaseShoppingList(prev);
                const localCurrent = getCurrentShoppingList(prev);
                const archived = localCurrent && localCurrent.items.length > 0
                  ? prev.map((list) =>
                      list.id === localCurrent.id
                        ? { ...list, listType: 'history' as const, completedAt: new Date().toISOString() }
                        : list,
                    )
                  : prev;
                if (localCurrent && localCurrent.items.length === 0) {
                  return archived.map((list) =>
                    list.id === localCurrent.id
                      ? { ...list, title: 'Shopping List', listType: 'current' as const, completedAt: undefined, items: nextItems }
                      : list,
                  );
                }
                return [
                  {
                    id: `sl-current-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    title: 'Shopping List',
                    listType: 'current',
                    createdAt: new Date().toISOString(),
                    items: nextItems,
                  },
                  ...archived.filter((list) => list.id !== localBase?.id),
                  ...(localBase ? [localBase] : []),
                ];
              });
            }}
            onUsePastList={(listId) => {
              const sourceList = shoppingLists.find((list) => list.id === listId);
              if (!sourceList) return;
              const currentList = getCurrentShoppingList(shoppingLists);
              const nextItems = cloneShoppingItems(sourceList.items);

              if (session && isSupabaseConfigured) {
                const archiveCurrent = currentList && currentList.items.length > 0
                  ? updateShoppingListMeta(session, currentList.id, {
                      listType: 'history',
                      completedAt: new Date().toISOString(),
                    })
                  : Promise.resolve();
                archiveCurrent
                  .then(() => {
                    if (currentList && currentList.items.length === 0) {
                      return updateShoppingListMeta(session, currentList.id, {
                        title: 'Shopping List',
                        listType: 'current',
                        completedAt: null,
                      }).then(() => updateShoppingListItems(session, currentList.id, nextItems));
                    }
                    return createShoppingList(session, 'Shopping List', nextItems, { listType: 'current' }).then(() => undefined);
                  })
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Could not reuse past list.'));
                return;
              }

              setShoppingLists((prev) => {
                const localCurrent = getCurrentShoppingList(prev);
                const archived = localCurrent && localCurrent.items.length > 0
                  ? prev.map((list) =>
                      list.id === localCurrent.id
                        ? { ...list, listType: 'history' as const, completedAt: new Date().toISOString() }
                        : list,
                    )
                  : prev;
                if (localCurrent && localCurrent.items.length === 0) {
                  return archived.map((list) =>
                    list.id === localCurrent.id
                      ? { ...list, title: 'Shopping List', listType: 'current' as const, completedAt: undefined, items: nextItems }
                      : list,
                  );
                }
                return [
                  {
                    id: `sl-current-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    title: 'Shopping List',
                    listType: 'current',
                    createdAt: new Date().toISOString(),
                    items: nextItems,
                  },
                  ...archived,
                ];
              });
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
                const latestList = getCurrentShoppingList(shoppingLists);
                const itemToAdd = {
                  id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  name: request.itemName,
                  quantity: request.quantity,
                  category: inferShoppingItemCategory(request.itemName),
                  comment: request.comment,
                  purchased: false,
                };
                const persist = latestList
                  ? updateShoppingListItems(session, latestList.id, mergeShoppingItemsByName(latestList.items, [itemToAdd]))
                  : createShoppingList(session, 'Shopping List', [itemToAdd]);
                persist
                  .then(() => updatePurchaseRequestStatus(requestId, 'added'))
                  .then(() => refreshLiveShopping())
                  .catch((error) => setTasksError(error instanceof Error ? error.message : 'Add to list failed.'));
                return;
              }
              setShoppingLists((prev) => {
                const localCurrent = getCurrentShoppingList(prev);
                if (localCurrent) {
                  return prev.map((list) =>
                    list.id === localCurrent.id
                      ? {
                          ...list,
                          items: mergeShoppingItemsByName(localCurrent.items, [
                            {
                              id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                              name: request.itemName,
                              quantity: request.quantity,
                              category: inferShoppingItemCategory(request.itemName),
                              comment: request.comment,
                              purchased: false,
                            },
                          ]),
                        }
                      : list,
                  );
                }
                return [
                  {
                    id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    title: 'Shopping List',
                    listType: 'current',
                    createdAt: new Date().toISOString(),
                    items: [
                      {
                        id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        name: request.itemName,
                        quantity: request.quantity,
                        category: inferShoppingItemCategory(request.itemName),
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
            quickActionRequest={dashboardShoppingQuickAction}
          />
        ) : null}

        {shouldShowDailyCardsModal ? (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => {
              if (canDismissDailyCardsModal) closeDailyCardsModal();
            }}
          >
            <View style={styles.dailyCardsModalRoot}>
              <Pressable
                style={styles.dailyCardsBackdrop}
                onPress={() => {
                  if (canDismissDailyCardsModal) closeDailyCardsModal();
                }}
              />
              <View pointerEvents="box-none" style={styles.dailyCardsModalLayer}>
                <View style={styles.dailyCardsModalCard}>
                  <View style={styles.dailyCardsDeckRow}>
                    {(selectedDailyCard ? [selectedDailyCard] : dailyCards).map((card) => {
                      const isSelected = selectedDailyCard?.id === card.id;
                      const isRevealing = revealingDailyCardId === card.id;
                      return (
                        <Pressable
                          key={card.id}
                          focusable={false}
                          tabIndex={-1}
                          disabled={!!revealingDailyCardId}
                          onFocus={(event) => {
                            (event.target as unknown as { blur?: () => void })?.blur?.();
                          }}
                          style={styles.dailyCardSlot}
                          onPress={() => {
                            if (isSelected) {
                              closeDailyCardsModal();
                              return;
                            }
                            revealDailyCard(card.id);
                          }}
                        >
                          {isRevealing ? (
                            <Animated.View
                              style={[
                                styles.dailyCardRevealWrap,
                                {
                                  transform: [
                                    {
                                      translateY: dailyCardRevealAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -14],
                                      }),
                                    },
                                    {
                                      scale: dailyCardRevealAnim.interpolate({
                                        inputRange: [0, 0.45, 1],
                                        outputRange: [1, 1.08, 1.03],
                                      }),
                                    },
                                  ],
                                },
                              ]}
                            >
                              <Animated.View
                                style={[
                                  styles.dailyCardRevealLayer,
                                  {
                                    opacity: dailyCardRevealAnim.interpolate({
                                      inputRange: [0, 0.46, 0.54, 1],
                                      outputRange: [1, 1, 0, 0],
                                    }),
                                    transform: [
                                      {
                                        scaleX: dailyCardRevealAnim.interpolate({
                                          inputRange: [0, 0.46, 0.54, 1],
                                          outputRange: [1, 0.92, 0.88, 0.88],
                                        }),
                                      },
                                      {
                                        translateX: dailyCardRevealAnim.interpolate({
                                          inputRange: [0, 0.46, 0.54, 1],
                                          outputRange: [0, -6, -12, -12],
                                        }),
                                      },
                                    ],
                                  },
                                ]}
                              >
                                {renderDailyCardBack(card)}
                              </Animated.View>
                              <Animated.View
                                style={[
                                  styles.dailyCardRevealLayer,
                                  {
                                    opacity: dailyCardRevealAnim.interpolate({
                                      inputRange: [0, 0.46, 0.54, 1],
                                      outputRange: [0, 0, 1, 1],
                                    }),
                                    transform: [
                                      {
                                        scaleX: dailyCardRevealAnim.interpolate({
                                          inputRange: [0, 0.46, 0.54, 1],
                                          outputRange: [0.88, 0.88, 0.96, 1],
                                        }),
                                      },
                                      {
                                        translateX: dailyCardRevealAnim.interpolate({
                                          inputRange: [0, 0.46, 0.54, 1],
                                          outputRange: [12, 10, 4, 0],
                                        }),
                                      },
                                    ],
                                  },
                                ]}
                              >
                                {renderDailyCardFace(card, 'reveal')}
                              </Animated.View>
                            </Animated.View>
                          ) : isSelected ? (
                            <>
                              <View style={styles.dailyCardOpenedShadow} />
                              {renderDailyCardFace(card, 'opened')}
                            </>
                          ) : (
                            renderDailyCardBack(card)
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          </Modal>
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
              <Text style={styles.authTitle}>{editingChildName || 'Child'} profile</Text>
              <Pressable style={[styles.authBtn, styles.authSecondary]} onPress={() => setChildActivitiesModalOpen(false)}>
                <Text style={[styles.authBtnText, styles.authSecondaryText]}>Close</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.childEditorBody} contentContainerStyle={styles.childEditorBodyContent}>
              <TextInput
                placeholder="Child name"
                style={styles.input}
                value={editingChildName}
                onChangeText={setEditingChildName}
              />
              <TextInput
                placeholder="Date of birth (Day / Month / Year)"
                keyboardType="number-pad"
                style={styles.input}
                value={editingChildDob}
                onChangeText={(text) => setEditingChildDob(formatBirthDateInput(text))}
              />
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

                    <View style={styles.activitySmallInput}>
                      <Pressable style={styles.dropdownTrigger} onPress={() => openChildTimePicker(activity.id, activity.time, 'child')}>
                        <Text style={styles.dropdownValue}>{normalizeTimeText(activity.time || '10:00 AM')}</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.activityColorRow}>
                    {childColorPalette.map((paletteColor) => {
                      const active = activity.color === paletteColor;
                      const unavailable = getUnavailableActivityColors(activity.id, 'child').has(paletteColor.toLowerCase());
                      if (unavailable && !active) return null;
                      return (
                        <Pressable
                          key={`${activity.id}-edit-${paletteColor}`}
                          onPress={() => setActivityColor(activity.id, paletteColor, 'child')}
                          style={[
                            styles.activityColorDot,
                            { backgroundColor: paletteColor },
                            active && styles.activityColorDotActive,
                          ]}
                        />
                      );
                    })}
                    {renderActivityPaletteButton(activity.id, activity.color, 'child')}
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
      <Modal
        visible={activityColorEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setActivityColorEditorOpen(false);
          setActivityColorEditorTarget(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.authCard, styles.colorPickerCard]}>
            <Text style={styles.authTitle}>Choose activity color</Text>
            <Text style={styles.modalSub}>Used colors stay locked so activities do not duplicate in the calendar.</Text>
            <View style={styles.colorPickerPreviewRow}>
              <View style={[styles.colorPickerPreviewDot, { backgroundColor: activityColorDraftValue }]} />
              <Text style={styles.colorPickerHex}>{activityColorDraftValue.toUpperCase()}</Text>
            </View>
            {Platform.OS === 'web' ? (
              <input
                type="color"
                value={normalizeHexColor(activityColorDraftValue) || '#3b82f6'}
                onChange={(event) => setActivityColorDraftValue(normalizeHexColor(event.currentTarget.value) || '#3b82f6')}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 999,
                  border: 'none',
                  padding: 0,
                  background: 'transparent',
                  alignSelf: 'center',
                  cursor: 'pointer',
                }}
              />
            ) : null}
            <TextInput
              placeholder="#3B82F6"
              autoCapitalize="characters"
              autoCorrect={false}
              value={activityColorDraftValue}
              onChangeText={(text) => setActivityColorDraftValue(text)}
              style={styles.input}
            />
            <View style={styles.activityColorRow}>
              {childColorPalette.map((paletteColor) => {
                const unavailable =
                  activityColorEditorTarget &&
                  getUnavailableActivityColors(activityColorEditorTarget.activityId, activityColorEditorTarget.target).has(
                    paletteColor.toLowerCase(),
                  );
                const active = normalizeHexColor(activityColorDraftValue) === paletteColor.toLowerCase();
                if (unavailable && !active) return null;
                return (
                  <Pressable
                    key={`picker-${paletteColor}`}
                    style={[styles.activityColorDot, { backgroundColor: paletteColor }, active && styles.activityColorDotActive]}
                    onPress={() => setActivityColorDraftValue(paletteColor)}
                  />
                );
              })}
            </View>
            <View style={styles.authActions}>
              <Pressable
                style={[styles.authBtn, styles.authSecondary]}
                onPress={() => {
                  setActivityColorEditorOpen(false);
                  setActivityColorEditorTarget(null);
                }}
              >
                <Text style={[styles.authBtnText, styles.authSecondaryText]}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.authBtn} onPress={applyCustomActivityColor}>
                <Text style={styles.authBtnText}>Use color</Text>
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
  const usedColors = new Set<string>();

  const normalizedChildren = uniqueChildren.map((child) => {
    let childChanged = false;
    const normalizedActivities = child.activities.map((activity) => {
      const normalizedColor = normalizeHexColor(activity.color) || '';
      let nextColor = normalizedColor;
      if (!nextColor || usedColors.has(nextColor)) {
        nextColor = getNextUnusedPaletteColor(usedColors, palette);
      }
      const paletteMatch = paletteByLower.get(nextColor.toLowerCase());
      if (paletteMatch) nextColor = paletteMatch;
      if (normalizedColor !== nextColor) {
        changed = true;
        childChanged = true;
        usedColors.add(nextColor.toLowerCase());
        return { ...activity, color: nextColor };
      }
      usedColors.add(nextColor.toLowerCase());
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

function normalizeHexColor(color?: string | null) {
  const raw = (color || '').trim();
  if (!raw) return '';
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  const expanded = /^#([0-9a-fA-F]{3})$/.test(withHash)
    ? `#${withHash
        .slice(1)
        .split('')
        .map((char) => `${char}${char}`)
        .join('')}`
    : withHash;
  return /^#[0-9a-fA-F]{6}$/.test(expanded) ? expanded.toLowerCase() : '';
}

function getNextUnusedPaletteColor(usedColors: Set<string>, palette: string[]) {
  return palette.find((color) => !usedColors.has(color.toLowerCase())) || palette[0];
}

function getFirstAvailableActivityColor(activities: DraftActivity[], palette: string[]) {
  const usedColors = new Set(
    activities
      .map((activity) => normalizeHexColor(activity.color))
      .filter((color): color is string => Boolean(color))
      .map((color) => color.toLowerCase()),
  );
  return getNextUnusedPaletteColor(usedColors, palette);
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDashboardEventDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
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
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const styles = useMemo(() => createStyles(colors, themeName, isMobile), [colors, themeName, isMobile]);
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
      const cursor = parseDateKey(firstDate);
      while (cursor <= endDate) {
        const dateText = toDateKey(cursor);
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
      const cursor = parseDateKey(firstDate);
      let occurrenceIndex = 0;

      while (cursor <= endDate) {
        const dateText = toDateKey(cursor);
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

function stripChildMirrorTitle(title: string, childName: string) {
  const prefix = `${childName}: `;
  return title.startsWith(prefix) ? title.slice(prefix.length) : title;
}

function findLinkedChildMirrorEvent(events: CalendarEvent[], sourceEvent: CalendarEvent | null) {
  if (!sourceEvent || !sourceEvent.ownerChildProfileId) return null;
  if (sourceEvent.owner === 'child') {
    return (
      events.find(
        (event) =>
          event.id !== sourceEvent.id &&
          event.owner === 'mother' &&
          event.category === 'Child Plan' &&
          event.ownerChildProfileId === sourceEvent.ownerChildProfileId &&
          event.date === sourceEvent.date &&
          normalizeTimeText(event.time) === normalizeTimeText(sourceEvent.time),
      ) || null
    );
  }
  if (sourceEvent.owner === 'mother' && sourceEvent.category === 'Child Plan') {
    return (
      events.find(
        (event) =>
          event.id !== sourceEvent.id &&
          event.owner === 'child' &&
          event.ownerChildProfileId === sourceEvent.ownerChildProfileId &&
          event.date === sourceEvent.date &&
          normalizeTimeText(event.time) === normalizeTimeText(sourceEvent.time),
      ) || null
    );
  }
  return null;
}

function buildParentMirrorEvent(params: {
  childId: string;
  childName: string;
  parentLabel: ParentLabel;
  title: string;
  date: string;
  time: string;
  endTime?: string;
  color?: string;
}): CalendarEvent {
  const { childId, childName, parentLabel, title, date, time, endTime, color } = params;
  return {
    id: `e-manual-parent-${childId}-${date}-${normalizeTimeText(time)}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: `${childName}: ${title}`,
    owner: 'mother',
    ownerName: parentLabel,
    ownerChildProfileId: childId,
    date,
    time,
    endTime,
    category: 'Child Plan',
    color: color || '#64748b',
    visibility: 'shared',
  };
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

function mergeFridgeItemsWithShoppingItem(
  source: FridgeItem[],
  shoppingItem: Pick<ShoppingItem, 'name' | 'quantity' | 'comment' | 'category'>,
) {
  const normalizedName = shoppingItem.name.trim().toLowerCase();
  if (!normalizedName) return source;
  const parsedQuantity = parseFridgeQuantityText(shoppingItem.quantity);
  const inferredCategory = inferInventoryCategoryFromShoppingItem(shoppingItem);

  const next = [...source];
  const existingIndex = next.findIndex((entry) => entry.name.trim().toLowerCase() === normalizedName);
  const mergedEntry: FridgeItem = existingIndex >= 0
    ? {
        ...next[existingIndex],
        quantity: shoppingItem.quantity,
        amount: parsedQuantity.amount ?? next[existingIndex].amount,
        unit: parsedQuantity.unit ?? next[existingIndex].unit,
        category: next[existingIndex].category ?? inferredCategory,
        note: shoppingItem.comment || next[existingIndex].note,
        status: 'full',
      }
    : {
        id: `fridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: shoppingItem.name,
        quantity: shoppingItem.quantity,
        amount: parsedQuantity.amount,
        unit: parsedQuantity.unit,
        category: inferredCategory,
        note: shoppingItem.comment,
        status: 'full',
      };

  if (existingIndex >= 0) next.splice(existingIndex, 1);
  next.unshift(mergedEntry);
  return next;
}

function mergeShoppingItemsWithFridgeItem(source: ShoppingItem[], fridgeItem: Pick<FridgeItem, 'name' | 'quantity' | 'note' | 'opened' | 'expiresAt'>) {
  const normalizedName = fridgeItem.name.trim().toLowerCase();
  if (!normalizedName) return source;
  const comment = [fridgeItem.note, fridgeItem.opened ? 'Opened' : '', fridgeItem.expiresAt ? `Use by ${fridgeItem.expiresAt}` : '']
    .filter(Boolean)
    .join(' · ');
  const next = [...source];
  const existingIndex = next.findIndex((entry) => entry.name.trim().toLowerCase() === normalizedName);
  const mergedItem: ShoppingItem =
    existingIndex >= 0
      ? {
          ...next[existingIndex],
          quantity: fridgeItem.quantity,
          category: next[existingIndex].category || inferShoppingItemCategory(fridgeItem.name),
          comment: comment || next[existingIndex].comment,
          purchased: false,
        }
      : {
          id: `si-fridge-low-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: fridgeItem.name,
          quantity: fridgeItem.quantity,
          category: inferShoppingItemCategory(fridgeItem.name),
          comment,
          purchased: false,
        };

  if (existingIndex >= 0) next.splice(existingIndex, 1);
  next.unshift(mergedItem);
  return next;
}

function mergeShoppingItemsByName(primary: ShoppingItem[], secondary: ShoppingItem[]) {
  const seen = new Set<string>();
  const merged: ShoppingItem[] = [];

  const appendUnique = (items: ShoppingItem[]) => {
    items.forEach((item, index) => {
      const normalizedName = item.name.trim().toLowerCase();
      if (!normalizedName || seen.has(normalizedName)) return;
      seen.add(normalizedName);
      merged.push({
        ...item,
        id: item.id || `si-merged-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        category: item.category || inferShoppingItemCategory(item.name),
      });
    });
  };

  appendUnique(primary);
  appendUnique(secondary);

  return merged;
}

function calculateAverageRestockDays(events: Array<{ purchasedAt: string }>) {
  if (events.length < 2) return undefined;
  const sorted = [...events].sort((left, right) => left.purchasedAt.localeCompare(right.purchasedAt));
  const intervals: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(sorted[index - 1].purchasedAt).getTime();
    const current = new Date(sorted[index].purchasedAt).getTime();
    if (!Number.isFinite(previous) || !Number.isFinite(current) || current <= previous) continue;
    intervals.push((current - previous) / (1000 * 60 * 60 * 24));
  }
  if (intervals.length === 0) return undefined;
  return Number((intervals.reduce((sum, value) => sum + value, 0) / intervals.length).toFixed(1));
}

function mergeShoppingInsights(
  current: ShoppingItemInsight[],
  additions: Array<{
    name: string;
    quantity: string;
    category?: ShoppingItem['category'];
    purchasedAt: string;
  }>,
) {
  const next = new Map(current.map((entry) => [entry.normalizedName, entry] as const));

  additions.forEach((addition) => {
    const normalizedName = addition.name.trim().toLowerCase();
    if (!normalizedName) return;

    const existing = next.get(normalizedName);
    const existingEvents = existing?.events || [];
    const duplicateEvent = existingEvents.some(
      (event) => event.purchasedAt === addition.purchasedAt && event.quantity.trim().toLowerCase() === addition.quantity.trim().toLowerCase(),
    );
    if (duplicateEvent) return;

    const mergedEvents = [...existingEvents, { purchasedAt: addition.purchasedAt, quantity: addition.quantity }]
      .sort((left, right) => left.purchasedAt.localeCompare(right.purchasedAt))
      .slice(-24);
    const averageRestockDays = calculateAverageRestockDays(mergedEvents);
    const lastPurchasedAt = mergedEvents[mergedEvents.length - 1]?.purchasedAt || addition.purchasedAt;

    next.set(normalizedName, {
      normalizedName,
      displayName: addition.name,
      category: addition.category || existing?.category || inferShoppingItemCategory(addition.name),
      purchaseCount: mergedEvents.length,
      lastPurchasedAt,
      averageRestockDays,
      events: mergedEvents,
    });
  });

  return [...next.values()].sort((left, right) => right.lastPurchasedAt.localeCompare(left.lastPurchasedAt));
}

function deriveShoppingInsightsFromLists(lists: ShoppingListDoc[]) {
  const additions = lists.flatMap((list) =>
    list.items
      .filter((item) => item.purchased)
      .map((item) => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        purchasedAt: list.completedAt || list.createdAt,
      })),
  );
  return mergeShoppingInsights([], additions);
}

function loadLocalShoppingLists() {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return [];
  try {
    globalThis.localStorage.removeItem(LEGACY_LOCAL_SHOPPING_LISTS_KEY);
    const raw = globalThis.localStorage.getItem(LOCAL_SHOPPING_LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (list): list is ShoppingListDoc =>
        !!list &&
        typeof list.id === 'string' &&
        typeof list.title === 'string' &&
        typeof list.createdAt === 'string' &&
        Array.isArray(list.items),
    );
  } catch {
    return [];
  }
}

function persistLocalShoppingLists(lists: ShoppingListDoc[]) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    globalThis.localStorage.removeItem(LEGACY_LOCAL_SHOPPING_LISTS_KEY);
    if (lists.length === 0) {
      globalThis.localStorage.removeItem(LOCAL_SHOPPING_LISTS_KEY);
      return;
    }
    globalThis.localStorage.setItem(LOCAL_SHOPPING_LISTS_KEY, JSON.stringify(lists));
  } catch {
    // Ignore storage failures; the app should still work in memory.
  }
}

function loadLocalShoppingInsights() {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return [];
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_SHOPPING_INSIGHTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ShoppingItemInsight =>
        !!entry &&
        typeof entry.normalizedName === 'string' &&
        typeof entry.displayName === 'string' &&
        typeof entry.lastPurchasedAt === 'string' &&
        typeof entry.purchaseCount === 'number' &&
        Array.isArray(entry.events),
    );
  } catch {
    return [];
  }
}

function persistLocalShoppingInsights(insights: ShoppingItemInsight[]) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    if (insights.length === 0) {
      globalThis.localStorage.removeItem(LOCAL_SHOPPING_INSIGHTS_KEY);
      return;
    }
    globalThis.localStorage.setItem(LOCAL_SHOPPING_INSIGHTS_KEY, JSON.stringify(insights));
  } catch {
    // Ignore storage failures; insights are helpful but non-critical.
  }
}

function loadLocalFridgeItems(): FridgeItem[] {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return [];
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_FRIDGE_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FridgeItem =>
        !!item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.quantity === 'string' &&
        typeof item.status === 'string',
    );
  } catch {
    return [];
  }
}

function persistLocalFridgeItems(items: FridgeItem[]) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    if (items.length === 0) {
      globalThis.localStorage.removeItem(LOCAL_FRIDGE_ITEMS_KEY);
      return;
    }
    globalThis.localStorage.setItem(LOCAL_FRIDGE_ITEMS_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage failures; inventory should still work in memory.
  }
}

function areFridgeItemsEqual(left: FridgeItem[], right: FridgeItem[]) {
  if (left.length !== right.length) return false;
  const serialize = (items: FridgeItem[]) =>
    [...items]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((item) =>
        JSON.stringify({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          amount: item.amount ?? null,
          unit: item.unit ?? null,
          category: item.category ?? null,
          note: item.note ?? null,
          expiresAt: item.expiresAt ?? null,
          opened: item.opened ?? null,
          status: item.status,
        }),
      );
  const leftSerialized = serialize(left);
  const rightSerialized = serialize(right);
  return leftSerialized.every((value, index) => value === rightSerialized[index]);
}

function mergeFridgeItemsPreferLocal(serverItems: FridgeItem[], localItems: FridgeItem[]) {
  if (serverItems.length === 0) return localItems;
  if (localItems.length === 0) return serverItems;

  const merged = new Map<string, FridgeItem>();
  serverItems.forEach((item) => {
    merged.set(item.id, item);
  });
  localItems.forEach((item) => {
    merged.set(item.id, item);
  });
  return [...merged.values()];
}

function loadLocalChildren(): ChildProfile[] {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return [];
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_CHILDREN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (child): child is ChildProfile =>
        !!child &&
        typeof child === 'object' &&
        typeof child.id === 'string' &&
        typeof child.name === 'string' &&
        typeof child.age === 'number' &&
        Array.isArray(child.activities),
    );
  } catch {
    return [];
  }
}

function persistLocalChildren(children: ChildProfile[]) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    if (children.length === 0) {
      globalThis.localStorage.removeItem(LOCAL_CHILDREN_KEY);
      return;
    }
    globalThis.localStorage.setItem(LOCAL_CHILDREN_KEY, JSON.stringify(children));
  } catch {
    // Ignore storage failures; child profiles should still work in memory.
  }
}

function mergeChildrenPreferLocal(serverChildren: ChildProfile[], localChildren: ChildProfile[]) {
  if (serverChildren.length === 0) return localChildren;
  if (localChildren.length === 0) return serverChildren;

  const merged = new Map<string, ChildProfile>();
  serverChildren.forEach((child) => {
    merged.set(child.id, child);
  });
  localChildren.forEach((child) => {
    merged.set(child.id, child);
  });
  return [...merged.values()];
}

function loadLocalHabits(): HabitEntry[] {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return [];
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_HABITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (habit): habit is HabitEntry =>
        !!habit &&
        typeof habit === 'object' &&
        typeof habit.id === 'string' &&
        typeof habit.title === 'string' &&
        typeof habit.icon === 'string' &&
        typeof habit.color === 'string' &&
        typeof habit.targetText === 'string' &&
        typeof habit.enabled === 'boolean',
    );
  } catch {
    return [];
  }
}

function persistLocalHabits(habits: HabitEntry[]) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    if (habits.length === 0) {
      globalThis.localStorage.removeItem(LOCAL_HABITS_KEY);
      return;
    }
    globalThis.localStorage.setItem(LOCAL_HABITS_KEY, JSON.stringify(habits));
  } catch {
    // Ignore local storage failures; habits still work in memory.
  }
}

function mergeHabitsPreferLocal(serverHabits: HabitEntry[], localHabits: HabitEntry[]) {
  if (serverHabits.length === 0) return localHabits;
  if (localHabits.length === 0) return serverHabits;

  const merged = new Map<string, HabitEntry>();
  serverHabits.forEach((habit) => {
    merged.set(habit.id, habit);
  });
  localHabits.forEach((habit) => {
    merged.set(habit.id, habit);
  });
  return [...merged.values()];
}

function areHabitsEqual(left: HabitEntry[], right: HabitEntry[]) {
  if (left.length !== right.length) return false;
  const normalize = (habits: HabitEntry[]) =>
    [...habits]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((habit) => ({
        id: habit.id,
        title: habit.title,
        icon: habit.icon,
        color: habit.color,
        targetText: habit.targetText,
        enabled: !!habit.enabled,
        builtIn: !!habit.builtIn,
        markStyle: habit.markStyle || 'circle',
        reminderMode: habit.reminderMode || 'off',
        reminderTime: habit.reminderTime || '',
        completedToday: !!habit.completedToday,
        streak: Number(habit.streak) || 0,
      }));
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function loadLocalHabitRemindersEnabled() {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return true;
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_HABIT_REMINDERS_KEY);
    if (raw == null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

function persistLocalHabitRemindersEnabled(enabled: boolean) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    globalThis.localStorage.setItem(LOCAL_HABIT_REMINDERS_KEY, String(enabled));
  } catch {
    // Ignore local storage failures; reminders toggle still works in memory.
  }
}

function loadLocalPeriodRemindersEnabled() {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return false;
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_PERIOD_REMINDERS_KEY);
    if (raw == null) return false;
    return raw === 'true';
  } catch {
    return false;
  }
}

function persistLocalPeriodRemindersEnabled(enabled: boolean) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    globalThis.localStorage.setItem(LOCAL_PERIOD_REMINDERS_KEY, String(enabled));
  } catch {
    // Ignore storage failures; the toggle should still work in memory.
  }
}

function loadLocalPeriodReminderLeadDays() {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return 2;
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_PERIOD_REMINDER_LEAD_DAYS_KEY);
    const value = Number(raw);
    return value >= 1 && value <= 3 ? value : 2;
  } catch {
    return 2;
  }
}

function persistLocalPeriodReminderLeadDays(days: number) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    globalThis.localStorage.setItem(LOCAL_PERIOD_REMINDER_LEAD_DAYS_KEY, String(days));
  } catch {
    // Ignore storage failures; the selection should still work in memory.
  }
}

function loadLocalPersonalProfile(): PersonalProfile {
  const fallback: PersonalProfile = {
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
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return fallback;
  try {
    const raw = globalThis.localStorage.getItem(LOCAL_PERSONAL_PROFILE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersonalProfile> | null;
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      ...fallback,
      ...parsed,
      cycleEntries: Array.isArray(parsed.cycleEntries) ? parsed.cycleEntries : [],
    };
  } catch {
    return fallback;
  }
}

function persistLocalPersonalProfile(profile: PersonalProfile) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    globalThis.localStorage.setItem(LOCAL_PERSONAL_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage failures; the profile should still work in memory.
  }
}

function loadShoppingBootstrapComplete() {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return false;
  try {
    return globalThis.localStorage.getItem(LOCAL_SHOPPING_BOOTSTRAP_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistShoppingBootstrapComplete(value: boolean) {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return;
  try {
    if (value) {
      globalThis.localStorage.setItem(LOCAL_SHOPPING_BOOTSTRAP_KEY, 'true');
    } else {
      globalThis.localStorage.removeItem(LOCAL_SHOPPING_BOOTSTRAP_KEY);
    }
  } catch {
    // Ignore storage failures; onboarding can still work in memory.
  }
}

function cloneShoppingItems(items: ShoppingItem[]) {
  return items.map((item, index) => ({
    ...item,
    id: `${item.id || 'si'}-clone-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    purchased: false,
  }));
}

function getBaseShoppingList(lists: ShoppingListDoc[]) {
  return lists.find((list) => list.listType === 'base' || list.title === 'Family base list' || list.title === 'Usual basket') || null;
}

function getCurrentShoppingList(lists: ShoppingListDoc[]) {
  const baseList = getBaseShoppingList(lists);
  return lists.find((list) => list.id !== baseList?.id && (list.listType === 'current' || list.listType === undefined)) || null;
}

function parseFridgeQuantityText(value: string): { amount?: number; unit?: FridgeItemUnit } {
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)/);
  if (!match) return {};
  const amount = Number(match[1].replace(',', '.'));
  const rawUnit = match[2].toLowerCase();
  const unitMap: Record<string, FridgeItemUnit> = {
    pc: 'pcs',
    pcs: 'pcs',
    piece: 'pcs',
    pieces: 'pcs',
    g: 'g',
    gr: 'g',
    gram: 'g',
    grams: 'g',
    kg: 'kg',
    kilo: 'kg',
    kilos: 'kg',
    ml: 'ml',
    l: 'l',
    lt: 'l',
    liter: 'l',
    liters: 'l',
    pack: 'pack',
    packs: 'pack',
    bottle: 'bottle',
    bottles: 'bottle',
    jar: 'jar',
    jars: 'jar',
  };
  return {
    amount: Number.isFinite(amount) ? amount : undefined,
    unit: unitMap[rawUnit],
  };
}

function inferInventoryCategoryFromShoppingItem(
  item: Pick<ShoppingItem, 'name' | 'category'>,
): FridgeItemCategory {
  if (item.category === 'household' || item.category === 'personal_care') return 'Home stock';
  if (item.category === 'pharmacy') return 'Pharmacy';
  if (item.category === 'kids') return 'Baby / Kids';
  return inferFridgeCategory(item.name);
}

function inferFridgeCategory(name: string): FridgeItemCategory {
  const normalized = name.trim().toLowerCase();
  if (/(vitamin|supplement|ibuprofen|paracetamol|medicine|bandage|antiseptic|thermometer|pharmacy)/.test(normalized)) return 'Pharmacy';
  if (/(soap|shampoo|conditioner|toothpaste|toothbrush|deodorant|sunscreen|diaper|wipes|toilet paper|paper towels|trash bags|foil|baking paper|dishwashing|detergent|softener|bleach|cleaner|air freshener|spray|sponges|gloves|mop|bucket|broom|printer paper|notebooks|pens|pencils|markers|folders|envelopes|stickers|cat food|dog food|litter|pet toys|pet shampoo|training pads|razor|shaving|cotton pads|cotton swabs)/.test(normalized)) return 'Home stock';
  if (/(milk|yogurt|cheese|butter|cream|kefir|curd|egg)/.test(normalized)) return 'Dairy';
  if (/(chicken|beef|turkey|fish|salmon|tuna|shrimp|meat)/.test(normalized)) return 'Meat / Fish';
  if (/(tomato|cucumber|pepper|broccoli|carrot|onion|spinach|lettuce|zucchini|potato)/.test(normalized)) return 'Vegetables';
  if (/(apple|banana|orange|pear|berry|grape|mango|avocado|fruit)/.test(normalized)) return 'Fruits';
  if (/(water|juice|cola|drink|tea|coffee|milkshake|smoothie)/.test(normalized)) return 'Drinks';
  if (/(ice cream|cookie|cracker|snack|chips|bar|chocolate)/.test(normalized)) return 'Snacks';
  if (/(frozen|dumplings|vareniki)/.test(normalized)) return 'Frozen';
  if (/(baby|formula|puree)/.test(normalized)) return 'Baby / Kids';
  if (/(rice|pasta|oatmeal|flour|oil|sauce|bread|beans|quinoa|buckwheat|pantry)/.test(normalized)) return 'Pantry';
  return 'Other';
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
  return toDateKey(date);
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
      message.includes('Supabase custom nutrition foods table is missing') ||
      message.includes('Supabase fridge table is missing') ||
      message.includes("relation \"public.habit_entries\" does not exist") ||
      message.includes("relation \"public.nutrition_entries\" does not exist") ||
      message.includes("relation \"public.custom_nutrition_foods\" does not exist") ||
      message.includes("relation \"public.fridge_items\" does not exist") ||
      message.includes("Could not find the table 'public.habit_entries'") ||
      message.includes("Could not find the table 'public.nutrition_entries'") ||
      message.includes("Could not find the table 'public.custom_nutrition_foods'") ||
      message.includes("Could not find the table 'public.fridge_items'") ||
      message.includes("Could not find the table 'habit_entries'") ||
      message.includes("Could not find the table 'nutrition_entries'") ||
      message.includes("Could not find the table 'custom_nutrition_foods'") ||
      message.includes("Could not find the table 'fridge_items'")
    ) {
      return 'Supabase habits/nutrition/fridge tables are not updated yet. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql, /Users/ksu/promom/smart-mom-app/supabase/custom_nutrition_foods.sql and /Users/ksu/promom/smart-mom-app/supabase/fridge_items.sql in the Supabase SQL Editor, then refresh the app.';
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

const createStyles = (colors: ThemeColors, themeName: ThemeName, isMobile = false) => {
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
    top: isMobile ? 6 : 8,
    right: isMobile ? 10 : 16,
    left: isMobile ? 10 : 16,
    alignItems: 'flex-end',
    zIndex: 60,
  },
  topBar: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: isMobile ? 8 : 10,
    paddingHorizontal: isMobile ? 10 : 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: isMobile ? 12 : 18,
    zIndex: 90,
  },
  brandWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: isMobile ? 2 : 4,
  },
  brandTitle: {
    color: colors.text,
    fontSize: isMobile ? 22 : 26,
    lineHeight: isMobile ? 24 : 28,
    fontWeight: '300',
    letterSpacing: isMobile ? 0.4 : 0.8,
  },
  brandSubtitle: {
    marginTop: 2,
    color: colors.subtext,
    fontSize: isMobile ? 11 : 12,
    lineHeight: isMobile ? 15 : 17,
    fontWeight: '500',
    letterSpacing: isMobile ? 0.2 : 0.35,
  },
  headerActions: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    zIndex: 90,
  },
  menuButton: {
    width: isMobile ? 42 : 46,
    height: isMobile ? 42 : 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  menuButtonIcon: {
    color: colors.text,
    fontWeight: '800',
    fontSize: isMobile ? 18 : 20,
    lineHeight: isMobile ? 18 : 20,
  },
  accountMenu: {
    marginTop: 54,
    width: isMobile ? 220 : 248,
    padding: isMobile ? 12 : 14,
    borderRadius: isMobile ? 17 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.98)',
    backgroundColor: 'rgba(248,250,252,0.995)',
    gap: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
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
    backgroundColor: 'rgba(203,213,225,0.9)',
    opacity: 1,
  },
  accountMenuItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214,223,235,0.95)',
    backgroundColor: '#ffffff',
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
  settingsUtilityCard: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214,223,235,0.8)',
    paddingTop: 12,
  },
  settingsUtilitySection: {
    gap: 10,
  },
  settingsUtilityTitle: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  settingsUtilityActionsRow: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 10,
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
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 8,
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  passwordInputField: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingRight: 8,
    backgroundColor: 'transparent',
  },
  passwordToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordEyeIcon: {
    width: 18,
    height: 10,
    borderWidth: 1.6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  passwordEyePupil: {
    width: 4.5,
    height: 4.5,
    borderRadius: 999,
  },
  passwordEyeSlash: {
    position: 'absolute',
    width: 18,
    height: 1.8,
    borderRadius: 999,
    transform: [{ rotate: '-35deg' }],
  },
  accountChoiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accountChoiceChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.98)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountChoiceChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selection,
  },
  accountChoiceChipText: {
    color: colors.text,
    fontWeight: '700',
  },
  accountChoiceChipTextActive: {
    color: colors.primary,
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
  activityColorDotDisabled: {
    opacity: 0.28,
  },
  activityPaletteButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassStrong,
  },
  activityPaletteButtonText: {
    fontSize: 14,
  },
  colorPickerCard: {
    width: '100%',
    maxWidth: 420,
    gap: 14,
  },
  colorPickerPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  colorPickerPreviewDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorPickerHex: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
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
    gap: isMobile ? 6 : 8,
    paddingHorizontal: isMobile ? 10 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isMobile ? 8 : 10,
    zIndex: 1,
  },
  subnav: {
    position: 'relative',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isMobile ? 6 : 8,
    paddingHorizontal: isMobile ? 10 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isMobile ? 10 : 12,
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
  dailyCardSummary: {
    marginHorizontal: isMobile ? 10 : 16,
    marginBottom: isMobile ? 10 : 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: isMobile ? 18 : 24,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: isMobile ? 13 : 18,
    paddingVertical: isMobile ? 12 : 16,
    gap: isMobile ? 6 : 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: isMobile ? 14 : 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: isMobile ? 7 : 10,
  },
  dailyCardSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dailyCardSummaryEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  dailyCardSummaryAction: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
  dailyCardSummaryText: {
    color: colors.text,
    fontSize: isMobile ? 16 : 18,
    lineHeight: isMobile ? 23 : 26,
    fontWeight: '700',
  },
  dailyCardSummaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dailyCardSummaryAccent: {
    width: 22,
    height: 6,
    borderRadius: 999,
  },
  dailyCardChooseCta: {
    marginHorizontal: isMobile ? 10 : 16,
    marginBottom: isMobile ? 10 : 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: isMobile ? 18 : 24,
    backgroundColor: colors.selection,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  dailyCardChooseEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  dailyCardChooseTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
  },
  dashboardGrid: {
    marginHorizontal: isMobile ? 10 : 16,
    marginBottom: isMobile ? 10 : 14,
    width: '100%',
    maxWidth: isMobile ? undefined : 940,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: isMobile ? 'nowrap' : 'wrap',
    gap: isMobile ? 10 : 12,
  },
  summaryWrap: {
    marginHorizontal: isMobile ? 10 : 16,
    marginTop: isMobile ? 8 : 12,
    marginBottom: isMobile ? 10 : 14,
    width: '100%',
    maxWidth: isMobile ? undefined : 940,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: isMobile ? '46%' : 180,
    minWidth: isMobile ? '46%' : 160,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1e8f2',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  summaryCardWarn: { borderColor: '#fed7aa', backgroundColor: '#fff7ed' },
  summaryCardOk: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  summaryLabel: { color: colors.subtext, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  summaryValueWarn: { color: '#ea580c' },
  summaryValueOk: { color: '#16a34a' },
  summarySub: { color: colors.subtext, fontSize: 11, fontWeight: '600' },
  dashboardQuickCard: {
    flex: 1,
    aspectRatio: 768 / 486,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: isMobile ? 18 : 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  dashboardQuickCardMeal: {
    backgroundColor: 'rgba(255,246,238,0.98)',
    borderColor: 'rgba(251,146,60,0.24)',
  },
  dashboardQuickCardShopping: {
    backgroundColor: 'rgba(239,248,255,0.98)',
    borderColor: 'rgba(59,130,246,0.22)',
  },
  dashboardQuickCardImage: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  dashboardQuickCardPhotoFrame: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: isMobile ? 8 : 14,
    paddingVertical: isMobile ? 8 : 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardQuickCardPhoto: {
    width: '100%',
    height: '100%',
  },
  dashboardQuickCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dashboardQuickCardOverlayWarm: {
    backgroundColor: 'rgba(44, 28, 17, 0.06)',
  },
  dashboardQuickCardOverlayCool: {
    backgroundColor: 'rgba(30, 27, 21, 0.05)',
  },
  dashboardQuickCardContent: {
    paddingHorizontal: isMobile ? 14 : 18,
    paddingVertical: isMobile ? 12 : 16,
  },
  dashboardQuickCardTitle: {
    color: '#ffffff',
    fontSize: isMobile ? 19 : 22,
    lineHeight: isMobile ? 24 : 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  navBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: isMobile ? 12 : 14,
    paddingHorizontal: isMobile ? 9 : 10,
    paddingVertical: isMobile ? 7 : 8,
    backgroundColor: colors.glassStrong,
  },
  navBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.selection,
  },
  navText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: isMobile ? 12 : 13,
  },
  navTextActive: {
    color: colors.primary,
  },
  body: {
    flex: 1,
  },
  content: {
    padding: isMobile ? 10 : 16,
    paddingBottom: 30,
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    padding: isMobile ? 12 : 20,
  },
  dailyCardsModalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: isMobile ? 12 : 20,
  },
  dailyCardsModalLayer: {
    flex: 1,
    justifyContent: 'center',
  },
  dailyCardsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 18, 34, 0.74)',
  },
  dailyCardsModalCard: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  dailyCardsEyebrow: {
    color: '#8fb3ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  dailyCardsTitle: {
    color: '#f8fbff',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  dailyCardsSubtitle: {
    color: 'rgba(234, 240, 255, 0.88)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 480,
    fontWeight: '600',
    marginBottom: 6,
  },
  dailyCardsDeckRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 14,
    paddingVertical: 10,
    flexWrap: 'wrap',
  },
  dailyCardSlot: {
    width: 152,
    height: 238,
    outlineWidth: 0,
    outlineColor: 'transparent',
    outlineOffset: 0,
    boxShadow: 'none',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  dailyCardRevealWrap: {
    width: 152,
    height: 238,
    position: 'relative',
  },
  dailyCardRevealLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 152,
    height: 238,
  },
  dailyCardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 152,
    height: 238,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: '#271c49',
    shadowColor: '#0f172a',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    backfaceVisibility: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyCardBackFrame: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(230, 210, 255, 0.16)',
  },
  dailyCardBackHaloTop: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: 'rgba(170, 150, 240, 0.16)',
    top: -34,
    right: -20,
  },
  dailyCardBackHaloBottom: {
    position: 'absolute',
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: 'rgba(101, 162, 220, 0.14)',
    bottom: -42,
    left: -26,
  },
  dailyCardBackBandTop: {
    position: 'absolute',
    top: 38,
    left: -12,
    width: 176,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(225, 232, 245, 0.18)',
    transform: [{ rotate: '20deg' }],
  },
  dailyCardBackBandBottom: {
    position: 'absolute',
    bottom: 38,
    left: -10,
    width: 180,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(198, 221, 210, 0.16)',
    transform: [{ rotate: '-18deg' }],
  },
  dailyCardBackSealOuter: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(190, 200, 240, 0.34)',
  },
  dailyCardBackSealInner: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    backgroundColor: 'rgba(196, 206, 244, 0.12)',
    borderColor: 'rgba(196, 206, 244, 0.48)',
  },
  dailyCardBackSealCore: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbe4ff',
    shadowColor: '#fff',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  dailyCardBackStarDust: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  dailyCardRevealFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 152,
    height: 238,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(201, 210, 235, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyCardFaceFrame: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(186, 193, 214, 0.74)',
  },
  dailyCardFaceSun: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(244, 220, 154, 0.4)',
  },
  dailyCardFaceSunCompact: {
    width: 56,
    height: 56,
    top: 18,
    right: -8,
  },
  dailyCardFaceSunOpened: {
    width: 76,
    height: 76,
    top: 20,
    right: -12,
  },
  dailyCardFaceRibbonTopCompact: {
    position: 'absolute',
    top: 16,
    left: -10,
    width: 120,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(164, 215, 225, 0.52)',
    transform: [{ rotate: '22deg' }],
  },
  dailyCardFaceRibbonTopOpened: {
    position: 'absolute',
    top: 18,
    left: -16,
    width: 154,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(164, 215, 225, 0.52)',
    transform: [{ rotate: '22deg' }],
  },
  dailyCardFaceRibbonBottomCompact: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    width: 128,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(191, 231, 176, 0.42)',
    transform: [{ rotate: '-22deg' }],
  },
  dailyCardFaceRibbonBottomOpened: {
    position: 'absolute',
    bottom: 24,
    left: 14,
    width: 158,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(191, 231, 176, 0.42)',
    transform: [{ rotate: '-22deg' }],
  },
  dailyCardFaceStar: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    borderRadius: 4,
    opacity: 0.9,
  },
  dailyCardFaceStarTopCompact: {
    width: 12,
    height: 12,
    top: 18,
    right: 22,
  },
  dailyCardFaceStarBottomCompact: {
    width: 10,
    height: 10,
    bottom: 28,
    right: 18,
  },
  dailyCardFaceStarTopOpened: {
    width: 16,
    height: 16,
    top: 22,
    right: 22,
  },
  dailyCardFaceStarBottomOpened: {
    width: 14,
    height: 14,
    bottom: 28,
    right: 18,
  },
  dailyCardFaceCopy: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 4,
    zIndex: 2,
  },
  dailyCardRevealMessage: {
    color: '#41546e',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 116,
  },
  dailyCardOpenedStage: {
    width: 152,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  dailyCardOpenedShadow: {
    position: 'absolute',
    width: 136,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.14)',
    transform: [{ translateY: 108 }],
  },
  dailyCardOpenedFace: {
    width: 152,
    height: 238,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(250, 248, 243, 0.98)',
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  dailyCardOpenedFrame: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(197, 202, 219, 0.68)',
  },
  dailyCardOpenedMessage: {
    color: '#41546e',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 118,
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
    backgroundColor: 'rgba(248,250,252,0.995)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.99)',
    padding: 16,
    gap: 8,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 18,
  },
  authErrorText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  signInModalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  signInModalLayer: {
    flex: 1,
    justifyContent: 'center',
  },
  settingsModalRoot: {
    flex: 1,
    position: 'relative',
  },
  settingsModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  settingsModalLayer: {
    position: 'absolute',
    top: isMobile ? 6 : 72,
    right: isMobile ? 10 : 16,
    bottom: isMobile ? 10 : 16,
    left: isMobile ? 10 : 16,
    alignItems: 'flex-end',
    zIndex: 60,
  },
  settingsModalCard: {
    backgroundColor: 'rgba(248,250,252,0.995)',
    borderRadius: isMobile ? 18 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.99)',
    padding: isMobile ? 12 : 16,
    gap: 10,
    width: isMobile ? '100%' : 460,
    maxWidth: isMobile ? 360 : 460,
    minWidth: isMobile ? undefined : 460,
    maxHeight: '100%',
    height: isMobile ? undefined : '100%',
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 18,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingsModalHeaderCopy: {
    flex: 1,
  },
  settingsModalTitle: {
    color: colors.text,
    fontSize: isMobile ? 16 : 17,
    fontWeight: '800',
  },
  mealPickerCard: {
    width: '100%',
    maxWidth: isMobile ? 360 : 420,
    alignSelf: 'center',
    borderRadius: isMobile ? 22 : 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.99)',
    backgroundColor: 'rgba(248,250,252,0.995)',
    padding: isMobile ? 16 : 18,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 18,
  },
  mealPickerEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  mealPickerTitle: {
    color: colors.text,
    fontSize: isMobile ? 22 : 24,
    fontWeight: '800',
  },
  mealPickerGrid: {
    gap: 10,
  },
  mealPickerOption: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealPickerOptionText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  mealPickerCloseBtn: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mealPickerCloseText: {
    color: colors.subtext,
    fontSize: 14,
    fontWeight: '700',
  },
  settingsModalSubtitle: {
    color: colors.subtext,
    fontSize: isMobile ? 12 : 13,
    lineHeight: isMobile ? 18 : 19,
    fontWeight: '600',
  },
  settingsModalCloseBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(214,223,235,0.95)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  settingsModalCloseText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  settingsModalContent: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
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
