import {
  ActivityLevel,
  ApprovalRequest,
  CalendarEvent,
  ChildProfile,
  ChildWord,
  CustomNutritionFood,
  CycleDayEntry,
  FridgeItem,
  FridgeItemCategory,
  FridgeItemStatus,
  FridgeItemUnit,
  Chore,
  MedicineItem,
  HabitEntry,
  HomeIssue,
  HomeProvider,
  NutritionFoodEntry,
  NutritionGoal,
  NutritionPace,
  NutritionSex,
  PhysiqueGoal,
  PersonalProfile,
  PurchaseRequest,
  StaffFeature,
  ChildFeature,
  StaffRolePreset,
  Recipe,
  RecipeClassifier,
  RecipeMealType,
  Role,
  ShoppingItem,
  ShoppingItemCategory,
  ShoppingListType,
  ShoppingListDoc,
  ShoppingShare,
  TaskItem,
  TaskPriority,
  TaskStatus,
  WeekDayCode,
  WeeklyMealPlanEntry,
} from '@/types/app';
import { supabase } from '@/lib/supabase';
import type { ThemeName } from '@/theme/theme';

export type AppSession = {
  userId: string;
  familyId: string;
  role: Role;
  allowedFeatures: StaffFeature[];
  staffProfileId?: string;
  childProfileId?: string;
  childFeatures?: ChildFeature[];
};

type TaskInsert = {
  title: string;
  assigneeRole: Role;
  priority: TaskPriority;
  deadlineAt?: string;
  staffProfileId?: string;
  notes?: string;
};

function isMissingTaskDetailsColumnError(error: { message?: string } | null): boolean {
  return !!error && String(error.message || '').toLowerCase().includes('details');
}

export type TaskPatch = {
  title?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadlineAt?: string | null;
  notes?: string | null;
};

type CalendarInsert = {
  title: string;
  date: string;
  time: string;
  endTime?: string;
  owner: Role;
  ownerName: string;
  ownerChildProfileId?: string | null;
  category?: string;
  color?: string;
  motherColor?: string;
  staffColor?: string;
  visibility?: 'shared' | 'staff_private';
  // Recurrence: an id shared by all occurrences of a repeating event, so they can be
  // recognised/removed together. Stored in the event meta (no schema change).
  seriesId?: string;
};

export type StaffTaskDraftRecord = {
  id: string;
  title: string;
  time: string;
  priority: TaskPriority;
  weekDays: WeekDayCode[];
};

export type StaffProfileRecord = {
  id: string;
  name: string;
  dateOfBirth?: string;
  photoUri?: string;
  tasks: StaffTaskDraftRecord[];
};

export type CompletedTaskNotificationRecord = {
  id: string;
  taskId: string;
  taskTitle: string;
  staffName: string;
  completedAt: string;
  read: boolean;
  comment?: string | null;
  photoUrl?: string | null;
  // The parent who assigned the task = who should be notified it's done. Null on
  // legacy rows (shown to every owner as a safe fallback).
  notifyUserId?: string | null;
};

export type StaffReminderNotificationRecord = {
  id: string;
  taskId: string;
  taskTitle: string;
  staffName: string;
  sentAt: string;
};

export type UserPreferencesRecord = {
  parentLabel: 'Mom' | 'Dad';
  // Stores the appearance mode ('light' | 'dark' | 'auto'); legacy rows may hold an old color name.
  themeName?: string;
  dailyCardDate?: string;
  dailyCardId?: string;
  nutritionGoal?: NutritionGoal;
  activityLevel?: ActivityLevel;
  nutritionSex?: NutritionSex;
  desiredWeight?: string;
  nutritionPace?: NutritionPace;
  physiqueGoal?: PhysiqueGoal;
  calorieOverride?: string;
  activeMealPlanProfile?: string;
  periodRemindersEnabled?: boolean;
  periodReminderLeadDays?: number;
  medsEnabled?: boolean;
  habitsEnabled?: boolean;
  habitRemindersEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  eventRemindersEnabled?: boolean;
  eventReminderLead?: string;
  habitColor?: string; // chosen accent colour for the monthly habit tracker (any hex)
};

export type MealPlanProfileRecord = {
  key: string;
  label: string;
};

export type MealRotationRecord = {
  enabled: boolean;
  order: string[];
  anchorWeekKey: string;
  mode: 'continuous' | 'monthly';
};

export type WeeklyMealPlanRecord = {
  entries: WeeklyMealPlanEntry[];
  profiles: MealPlanProfileRecord[];
  rotation?: MealRotationRecord | null;
};

export type MyProfileRecord = PersonalProfile;

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const client = requireClient();
  const cleanedName = fullName?.trim();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: cleanedName
      ? {
          data: {
            full_name: cleanedName,
          },
        }
      : undefined,
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const client = requireClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

function resolveAuthRedirectUrl() {
  const configured = process.env.EXPO_PUBLIC_APP_URL?.trim();
  if (configured) return configured;

  const fallback = 'https://supermom-rose.vercel.app';
  if (typeof globalThis === 'undefined' || !('location' in globalThis) || !globalThis.location) {
    return fallback;
  }

  const origin = globalThis.location.origin;
  const hostname = globalThis.location.hostname?.toLowerCase() || '';
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  const isPrivateLan =
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  const isHttp = globalThis.location.protocol === 'http:';

  if (!origin || isLoopback || isPrivateLan || isHttp) {
    return fallback;
  }

  return origin;
}

export async function sendPasswordResetEmail(email: string) {
  const client = requireClient();
  const baseUrl = resolveAuthRedirectUrl().replace(/\/+$/, '');
  const redirectTo = `${baseUrl}/?auth=recovery`;
  const { error } = await client.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getMyProfile(): Promise<MyProfileRecord | null> {
  const client = requireClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('No authenticated user.');

  const fullProfileQuery = await client
    .from('profiles')
    .select('full_name, nickname, date_of_birth, height_cm, weight_kg, photo_uri, cycle_tracking_enabled, cycle_last_period_start, cycle_length_days, cycle_period_length_days, cycle_entries_json')
    .eq('id', user.id)
    .maybeSingle();

  const coreProfileQuery = isMissingProfileColumnError(fullProfileQuery.error)
    ? await client
        .from('profiles')
        .select('full_name, nickname, date_of_birth, height_cm, weight_kg')
        .eq('id', user.id)
        .maybeSingle()
    : fullProfileQuery;

  const { data, error } = isMissingProfileColumnError(coreProfileQuery.error)
    ? await client
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
    : coreProfileQuery;

  if (error) throw error;
  if (!data) return null;
  const profileData = data as {
    full_name?: string | null;
    nickname?: string | null;
    date_of_birth?: string | null;
    height_cm?: number | null;
    weight_kg?: number | string | null;
    photo_uri?: string | null;
    cycle_tracking_enabled?: boolean | null;
    cycle_last_period_start?: string | null;
    cycle_length_days?: number | null;
    cycle_period_length_days?: number | null;
    cycle_entries_json?: unknown;
  };

  return {
    fullName: profileData.full_name || '',
    nickname: profileData.nickname || undefined,
    dateOfBirth: normalizeBirthDateValue(profileData.date_of_birth),
    heightCm: typeof profileData.height_cm === 'number' ? String(profileData.height_cm) : undefined,
    weightKg: profileData.weight_kg != null ? String(profileData.weight_kg) : undefined,
    photoUri: profileData.photo_uri || undefined,
    cycleTrackingEnabled: !!profileData.cycle_tracking_enabled,
    cycleLastPeriodStart: normalizeBirthDateValue(profileData.cycle_last_period_start),
    cycleLengthDays: typeof profileData.cycle_length_days === 'number' ? String(profileData.cycle_length_days) : undefined,
    cyclePeriodLengthDays: typeof profileData.cycle_period_length_days === 'number' ? String(profileData.cycle_period_length_days) : undefined,
    cycleEntries: Array.isArray(profileData.cycle_entries_json) ? (profileData.cycle_entries_json as CycleDayEntry[]) : [],
  };
}

export async function upsertMyProfile(payload: {
  fullName: string;
  nickname?: string;
  dateOfBirth?: string;
  heightCm?: string;
  weightKg?: string;
  photoUri?: string;
  cycleTrackingEnabled?: boolean;
  cycleLastPeriodStart?: string;
  cycleLengthDays?: string;
  cyclePeriodLengthDays?: string;
  cycleEntries?: CycleDayEntry[];
}) {
  const client = requireClient();
  const trimmed = payload.fullName.trim();

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('No authenticated user.');

  const existingProfile = await getMyProfile().catch(() => null);
  const fullNameToStore = trimmed || existingProfile?.fullName?.trim() || '';
  if (!fullNameToStore) return;
  const nicknameToStore = payload.nickname?.trim() || existingProfile?.nickname || undefined;
  const dateOfBirthToStore = payload.dateOfBirth?.trim() || existingProfile?.dateOfBirth || undefined;

  const baseProfilePayload = {
    id: user.id,
    full_name: fullNameToStore,
    nickname: nicknameToStore || null,
    date_of_birth: toStorageBirthDate(dateOfBirthToStore),
    height_cm: toNullableInt(payload.heightCm),
    weight_kg: toNullableDecimal(payload.weightKg),
    photo_uri: payload.photoUri !== undefined ? (payload.photoUri || null) : (existingProfile?.photoUri || null),
  };
  const fullProfilePayload = {
    ...baseProfilePayload,
    cycle_tracking_enabled:
      typeof payload.cycleTrackingEnabled === 'boolean'
        ? payload.cycleTrackingEnabled
        : !!existingProfile?.cycleTrackingEnabled,
    cycle_last_period_start: toStorageBirthDate(
      payload.cycleLastPeriodStart !== undefined
        ? payload.cycleLastPeriodStart
        : existingProfile?.cycleLastPeriodStart,
    ),
    cycle_length_days: toNullableInt(
      payload.cycleLengthDays !== undefined ? payload.cycleLengthDays : existingProfile?.cycleLengthDays,
    ),
    cycle_period_length_days: toNullableInt(
      payload.cyclePeriodLengthDays !== undefined
        ? payload.cyclePeriodLengthDays
        : existingProfile?.cyclePeriodLengthDays,
    ),
    cycle_entries_json: payload.cycleEntries !== undefined ? payload.cycleEntries : existingProfile?.cycleEntries || [],
  };

  const { error } = await client.from('profiles').upsert(fullProfilePayload, { onConflict: 'id' });

  if (isMissingProfileColumnError(error)) {
    const { error: fallbackError } = await client.from('profiles').upsert(
      baseProfilePayload,
      { onConflict: 'id' },
    );
    if (isMissingProfileColumnError(fallbackError)) {
      throw new Error('Supabase profiles table is missing personal profile columns. Run /Users/ksu/promom/smart-mom-app/supabase/profile_patch.sql in the Supabase SQL Editor, then Save again.');
    }
    if (fallbackError) throw fallbackError;
    return;
  }

  if (error) throw error;
}

export async function listCycleEntries(session: AppSession): Promise<CycleDayEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('cycle_entries')
    .select('entry_date, flow_level, discharge_type, feelings_json, pains_json, sleep_quality, sleep_hours, sleep_minutes, is_period_start')
    .eq('user_id', session.userId)
    .order('entry_date', { ascending: true });

  if (isMissingCycleEntriesTableError(error)) {
    throw new Error('Supabase cycle entries table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/cycle_entries.sql in the Supabase SQL Editor, then refresh.');
  }
  if (error) throw error;

  return ((data ?? []) as Array<{
    entry_date: string;
    flow_level?: string | null;
    discharge_type?: string | null;
    feelings_json?: unknown;
    pains_json?: unknown;
    sleep_quality?: string | null;
    sleep_hours?: number | null;
    sleep_minutes?: number | null;
    is_period_start?: boolean | null;
  }>).map((row) => ({
    date: row.entry_date,
    flowLevel: row.flow_level || undefined,
    dischargeType: row.discharge_type || undefined,
    feelings: Array.isArray(row.feelings_json) ? (row.feelings_json as string[]) : undefined,
    pains: Array.isArray(row.pains_json) ? (row.pains_json as string[]) : undefined,
    sleepQuality: row.sleep_quality || undefined,
    sleepHours: typeof row.sleep_hours === 'number' ? row.sleep_hours : undefined,
    sleepMinutes: typeof row.sleep_minutes === 'number' ? row.sleep_minutes : undefined,
    isPeriodStart: !!row.is_period_start,
  }));
}

export async function replaceCycleEntries(session: AppSession, entries: CycleDayEntry[]) {
  const client = requireClient();
  const { error: deleteError } = await client.from('cycle_entries').delete().eq('user_id', session.userId);
  if (isMissingCycleEntriesTableError(deleteError)) {
    throw new Error('Supabase cycle entries table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/cycle_entries.sql in the Supabase SQL Editor, then try again.');
  }
  if (deleteError) throw deleteError;
  if (entries.length === 0) return;

  const { error } = await client.from('cycle_entries').insert(
    entries.map((entry) => ({
      user_id: session.userId,
      entry_date: entry.date,
      flow_level: entry.flowLevel || null,
      discharge_type: entry.dischargeType || null,
      feelings_json: entry.feelings || [],
      pains_json: entry.pains || [],
      sleep_quality: entry.sleepQuality || null,
      sleep_hours: typeof entry.sleepHours === 'number' ? entry.sleepHours : null,
      sleep_minutes: typeof entry.sleepMinutes === 'number' ? entry.sleepMinutes : null,
      is_period_start: !!entry.isPeriodStart,
      updated_at: new Date().toISOString(),
    })),
  );
  if (isMissingCycleEntriesTableError(error)) {
    throw new Error('Supabase cycle entries table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/cycle_entries.sql in the Supabase SQL Editor, then try again.');
  }
  if (error) throw error;
}

function isMissingProfileColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes("column of 'profiles' in the schema cache") ||
    message.includes("Could not find the 'cycle_tracking_enabled' column of 'profiles'") ||
    message.includes("Could not find the 'cycle_last_period_start' column of 'profiles'") ||
    message.includes("Could not find the 'cycle_length_days' column of 'profiles'") ||
    message.includes("Could not find the 'cycle_period_length_days' column of 'profiles'") ||
    message.includes("Could not find the 'cycle_entries_json' column of 'profiles'") ||
    message.includes("Could not find the 'date_of_birth' column of 'profiles'") ||
    message.includes("Could not find the 'nickname' column of 'profiles'") ||
    message.includes("Could not find the 'height_cm' column of 'profiles'") ||
    message.includes("Could not find the 'weight_kg' column of 'profiles'") ||
    message.includes("column 'cycle_tracking_enabled' of relation 'profiles' does not exist") ||
    message.includes("column 'cycle_last_period_start' of relation 'profiles' does not exist") ||
    message.includes("column 'cycle_length_days' of relation 'profiles' does not exist") ||
    message.includes("column 'cycle_period_length_days' of relation 'profiles' does not exist") ||
    message.includes("column 'cycle_entries_json' of relation 'profiles' does not exist") ||
    message.includes("column 'date_of_birth' of relation 'profiles' does not exist") ||
    message.includes("column 'nickname' of relation 'profiles' does not exist") ||
    message.includes("column 'height_cm' of relation 'profiles' does not exist") ||
    message.includes("column 'weight_kg' of relation 'profiles' does not exist")
  );
}

function isMissingCycleEntriesTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes("relation \"public.cycle_entries\" does not exist") ||
    message.includes("Could not find the table 'public.cycle_entries'") ||
    message.includes("Could not find the table 'cycle_entries'")
  );
}

export async function getOrCreateSessionContext(): Promise<AppSession | null> {
  const client = requireClient();
  // Use getSession() (reads the persisted session and refreshes it if needed)
  // rather than getUser() (a server round-trip that 401s on transient network
  // hiccups and can make the app look logged out). RLS still enforces security.
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) throw sessionError;
  const user = session?.user;
  if (!user) return null;

  const { data: memberships, error: membershipsError } = await client
    .from('family_members')
    .select('family_id, role, features, status, staff_profile_id, linked_child_profile_id')
    .eq('user_id', user.id);
  if (membershipsError) throw membershipsError;

  // The user's own family (created for them on first run).
  const { data: familyId, error: bootstrapError } = await client.rpc('ensure_user_family');
  if (bootstrapError) throw bootstrapError;

  // Prefer an active staff membership in ANOTHER family (an invited nanny/cook/driver), so a
  // staff user lands in the family that invited them. A staff membership in the user's OWN
  // family is an accidental self-invite — ignore it so the owner is never trapped in staff view.
  const staffMembership = (memberships || []).find(
    (m) => m.role === 'staff' && m.status === 'active' && m.family_id !== familyId,
  );
  if (staffMembership) {
    return {
      userId: user.id,
      familyId: staffMembership.family_id as string,
      role: 'staff',
      allowedFeatures: normalizeStaffFeatures(staffMembership.features),
      staffProfileId: (staffMembership.staff_profile_id as string | null) ?? undefined,
    };
  }

  // Same idea for an invited child: prefer a child membership in ANOTHER family so the
  // kid lands in the family that invited them (a child row in their own family is a
  // self-invite anomaly — ignored so the account isn't trapped in child view).
  const childMembership = (memberships || []).find(
    (m) => m.role === 'child' && m.status === 'active' && m.family_id !== familyId,
  );
  if (childMembership) {
    return {
      userId: user.id,
      familyId: childMembership.family_id as string,
      role: 'child',
      allowedFeatures: [],
      childProfileId: (childMembership.linked_child_profile_id as string | null) ?? undefined,
      childFeatures: normalizeChildFeatures(childMembership.features),
    };
  }

  // A co-parent joined ANOTHER family as a full owner (role 'admin'). Land them in
  // that shared family (where the staff/tasks/calendar live), not their own empty one.
  const coparentMembership = (memberships || []).find(
    (m) => m.role === 'admin' && m.status === 'active' && m.family_id !== familyId,
  );
  if (coparentMembership) {
    return {
      userId: user.id,
      familyId: coparentMembership.family_id as string,
      role: 'admin',
      allowedFeatures: [],
    };
  }

  const { data: members, error: memberError } = await client
    .from('family_members')
    .select('role, features, linked_child_profile_id')
    .eq('family_id', familyId)
    .eq('user_id', user.id);

  if (memberError) throw memberError;
  // If a stray "staff" row exists in the user's own family (self-invite), prefer the owner row.
  const member = (members || []).find((m) => m.role !== 'staff') || (members || [])[0];
  if (!member) throw new Error('No membership found for your family.');

  // A child whose only membership is in this family (ensure_user_family returned it,
  // because they have no separate own family) reaches here — carry their profile link
  // + granted features so childProfileId isn't lost (which broke name/photo/chores).
  if (member.role === 'child') {
    return {
      userId: user.id,
      familyId,
      role: 'child',
      allowedFeatures: [],
      childProfileId: (member.linked_child_profile_id as string | null) ?? undefined,
      childFeatures: normalizeChildFeatures(member.features),
    };
  }

  return {
    userId: user.id,
    familyId,
    role: member.role as Role,
    allowedFeatures: normalizeStaffFeatures(member.features),
  };
}

// Note: 'schedule' was retired (it granted no real access — staff have no calendar).
// It's intentionally absent so any legacy grant carrying it is normalized away.
const STAFF_FEATURE_VALUES: StaffFeature[] = ['tasks', 'shopping', 'menu', 'recipes', 'fixit'];
function normalizeStaffFeatures(value: unknown): StaffFeature[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is StaffFeature => typeof v === 'string' && STAFF_FEATURE_VALUES.includes(v as StaffFeature));
}

const CHILD_FEATURE_VALUES: ChildFeature[] = ['dayplan', 'shopping', 'habits', 'nutrition', 'words'];
function normalizeChildFeatures(value: unknown): ChildFeature[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is ChildFeature => typeof v === 'string' && CHILD_FEATURE_VALUES.includes(v as ChildFeature));
}

// A family admin mints a child invite carrying the granted functions; the child accepts it.
export async function createChildInvite(
  session: AppSession,
  childProfileId: string,
  features: ChildFeature[],
): Promise<{ token: string; expiresAt: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('create_child_invite', {
    p_family_id: session.familyId,
    p_child_profile_id: childProfileId,
    p_features: features,
  });
  if (error) throw error;
  return { token: (data as { token: string }).token, expiresAt: (data as { expires_at: string }).expires_at };
}

export async function acceptChildInvite(token: string): Promise<{ familyId: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('accept_child_invite', { p_token: token });
  if (error) throw error;
  return { familyId: (data as { family_id: string }).family_id };
}

// A family owner mints a co-parent invite: the invitee joins as a full owner (admin).
export async function createCoparentInvite(session: AppSession): Promise<{ token: string; expiresAt: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('create_coparent_invite', { p_family_id: session.familyId });
  if (error) throw error;
  return { token: (data as { token: string }).token, expiresAt: (data as { expires_at: string }).expires_at };
}

// The invitee consumes a co-parent token and becomes a full owner of that family.
export async function acceptCoparentInvite(token: string): Promise<{ familyId: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('accept_coparent_invite', { p_token: token });
  if (error) throw error;
  return { familyId: (data as { family_id: string }).family_id };
}

// The owner changes an already-connected child's granted functions.
export async function setChildAccess(childProfileId: string, features: ChildFeature[]): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('set_child_access', { p_child_profile_id: childProfileId, p_features: features });
  if (error) throw error;
}

// Which child profiles have an activated, linked account (invite accepted).
export async function listChildConnections(session: AppSession): Promise<string[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('family_members')
    .select('linked_child_profile_id, role, status')
    .eq('family_id', session.familyId)
    .eq('role', 'child')
    .eq('status', 'active');
  if (error) return [];
  return (data || [])
    .map((row) => (row.linked_child_profile_id as string | null) || '')
    .filter((id): id is string => Boolean(id));
}

// A family admin mints a staff invite carrying the granted roles + features.
export async function createStaffInvite(
  session: AppSession,
  staffProfileId: string,
  roles: StaffRolePreset[],
  features: StaffFeature[],
): Promise<{ token: string; expiresAt: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('create_staff_invite', {
    p_family_id: session.familyId,
    p_staff_profile_id: staffProfileId,
    p_roles: roles,
    p_features: features,
  });
  if (error) throw error;
  return { token: (data as { token: string }).token, expiresAt: (data as { expires_at: string }).expires_at };
}

// The invited user consumes a token and is linked to the family as staff.
export async function acceptStaffInvite(token: string): Promise<{ familyId: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('accept_staff_invite', { p_token: token });
  if (error) throw error;
  return { familyId: (data as { family_id: string }).family_id };
}

// A newly-joined staff member writes their own date of birth back to their profile.
// Uses a security-definer RPC (staff can't update staff_profiles directly via RLS).
export async function deleteStaffProfileRecord(session: AppSession, staffProfileId: string): Promise<void> {
  // Revoke the live account's membership + expire pending invites + delete the profile,
  // atomically and server-side. Deleting only the staff_profiles row (as this used to)
  // left the family_members row — and all authorization keys off family_members, so a
  // "removed" staffer kept full access. session is kept for signature stability.
  void session;
  const client = requireClient();
  const { error } = await client.rpc('remove_staff_member', { p_staff_profile_id: staffProfileId });
  if (error) throw error;
}

export async function setStaffProfileDob(staffProfileId: string, dob: string): Promise<void> {
  const stored = toStorageBirthDate(dob); // "DD.MM.YYYY" -> "YYYY-MM-DD" for the date column
  if (!stored) return;
  const client = requireClient();
  const { error } = await client.rpc('set_staff_profile_dob', { p_staff_profile_id: staffProfileId, p_dob: stored });
  if (error) throw error;
}

// A connected staff member edits their OWN display name (staff_profiles writes are
// otherwise admin-only via RLS). The RPC also re-attributes their past proof history.
export async function setStaffOwnName(staffProfileId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name cannot be empty');
  const client = requireClient();
  const { error } = await client.rpc('set_staff_own_name', { p_staff_profile_id: staffProfileId, p_name: trimmed });
  if (error) throw error;
}

// Push edited role/feature checkboxes to an already-connected staff account.
// Without this the grants only ever reached the server inside the invite token,
// so changing them later had no effect on the person's actual access.
export async function setStaffAccess(
  staffProfileId: string,
  roles: StaffRolePreset[],
  features: StaffFeature[],
): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('set_staff_access', {
    p_staff_profile_id: staffProfileId,
    p_roles: roles,
    p_features: features,
  });
  if (error) throw error;
}

// Which staff profiles in this family have a real, activated account linked to them.
// Returns the set of staff_profile_ids that an invited user has actually joined with,
// so the admin can see "Connected ✓" vs "Not connected yet" on each profile.
export async function listStaffConnections(session: AppSession): Promise<string[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('family_members')
    .select('staff_profile_id, status, role')
    .eq('family_id', session.familyId)
    .eq('role', 'staff')
    .eq('status', 'active');
  if (error) {
    // Non-fatal: if the read fails, just treat everyone as not-yet-connected.
    return [];
  }
  return (data || [])
    .map((row) => (row.staff_profile_id as string | null) || '')
    .filter((id): id is string => Boolean(id));
}

export async function listTasks(familyId: string): Promise<TaskItem[]> {
  const client = requireClient();
  const baseCols = 'id, title, assignee_role, priority, status, deadline_at, requires_parent_approval, source_profile_id, created_at, created_by';
  const withDetails = await client
    .from('tasks')
    .select(`${baseCols}, details`)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  let data: any[] | null = withDetails.data;
  let error = withDetails.error;
  if (isMissingTaskDetailsColumnError(error)) {
    const fallback = await client.from('tasks').select(baseCols).eq('family_id', familyId).order('created_at', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    notes: 'details' in row && row.details ? String(row.details) : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    createdBy: row.created_by ?? undefined,
    assigneeRole: row.assignee_role as Role,
    assigneeName:
      row.assignee_role === 'mother' || row.assignee_role === 'admin'
        ? 'Mother'
        : row.assignee_role === 'staff'
          ? 'Staff'
          : 'Child',
    staffProfileId: row.source_profile_id ?? undefined,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    deadline: row.deadline_at ? new Date(row.deadline_at).toISOString().slice(0, 16).replace('T', ' ') : 'No deadline',
    needsParentApproval: row.requires_parent_approval,
  }));
}

export async function createTask(session: AppSession, payload: TaskInsert): Promise<string> {
  const client = requireClient();

  const base = {
    family_id: session.familyId,
    title: payload.title,
    assignee_role: payload.assigneeRole,
    priority: payload.priority,
    deadline_at: payload.deadlineAt || null,
    requires_parent_approval: payload.assigneeRole === 'child',
    source_profile_id: payload.staffProfileId ?? null,
    created_by: session.userId,
  };

  // Include the notes/details if provided; retry without it if the column isn't migrated.
  let res = await client.from('tasks').insert({ ...base, details: payload.notes || null }).select('id').single();
  if (isMissingTaskDetailsColumnError(res.error)) {
    res = await client.from('tasks').insert(base).select('id').single();
  }
  if (res.error) throw res.error;
  return (res.data as { id: string }).id;
}

export async function updateTask(taskId: string, patch: TaskPatch) {
  const client = requireClient();
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.deadlineAt !== undefined) update.deadline_at = patch.deadlineAt;
  if (patch.notes !== undefined) update.details = patch.notes || null;
  if (Object.keys(update).length === 0) return;
  let { error } = await client.from('tasks').update(update).eq('id', taskId);
  if (isMissingTaskDetailsColumnError(error) && 'details' in update) {
    const { details, ...rest } = update;
    if (Object.keys(rest).length === 0) return;
    ({ error } = await client.from('tasks').update(rest).eq('id', taskId));
  }
  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const client = requireClient();
  const { error } = await client.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const client = requireClient();
  const { error } = await client.from('tasks').update({ status }).eq('id', taskId);
  if (error) throw error;
}

export async function listApprovalRequests(familyId: string): Promise<ApprovalRequest[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('approval_requests')
    .select('id, task_id, action, status, created_at')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    requestedBy: 'child',
    action: row.action as 'delete' | 'critical_edit',
    status: row.status as 'pending' | 'approved' | 'declined',
    createdAt: new Date(row.created_at).toISOString().slice(0, 16).replace('T', ' '),
  }));
}

export async function createDeleteApprovalRequest(session: AppSession, taskId: string) {
  const client = requireClient();
  const { error } = await client.from('approval_requests').insert({
    family_id: session.familyId,
    task_id: taskId,
    requested_by_user_id: session.userId,
    action: 'delete',
  });

  if (error) throw error;
}

export async function resolveApprovalRequest(session: AppSession, requestId: string, status: 'approved' | 'declined') {
  const client = requireClient();

  const { data: request, error: requestError } = await client
    .from('approval_requests')
    .select('id, task_id')
    .eq('id', requestId)
    .single();

  if (requestError) throw requestError;

  const { error: updateError } = await client
    .from('approval_requests')
    .update({ status, resolved_by: session.userId, resolved_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateError) throw updateError;

  if (status === 'approved') {
    const { error: deleteError } = await client.from('tasks').delete().eq('id', request.task_id);
    if (deleteError) throw deleteError;
  }
}

export async function listCalendarEvents(familyId: string): Promise<CalendarEvent[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('events')
    .select('id, title, notes, starts_at, owner_user_id, owner_child_profile_id, source_profile_id')
    .eq('family_id', familyId)
    .order('starts_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const meta = parseEventNotes(row.notes);
    const startsAt = new Date(row.starts_at);
    const date = startsAt.toISOString().slice(0, 10);
    const time = formatTime12(startsAt);
    const owner: Role = (meta.owner as Role) || (row.owner_child_profile_id ? 'child' : 'mother');

    return {
      id: row.id,
      title: row.title,
      owner,
      ownerName: meta.ownerName || (owner === 'child' ? 'Child' : owner === 'staff' ? 'Staff' : 'Mother'),
      ownerChildProfileId: row.owner_child_profile_id || undefined,
      sourceProfileId: row.source_profile_id || undefined,
      date,
      time,
      endTime: meta.endTime || undefined,
      category: meta.category || 'General',
      color: meta.color || '#64748b',
      motherColor: meta.motherColor,
      staffColor: meta.staffColor,
      visibility: meta.visibility === 'staff_private' ? 'staff_private' : 'shared',
      seriesId: meta.seriesId || undefined,
    };
  });
}

export async function listChildProfiles(familyId: string): Promise<ChildProfile[]> {
  const client = requireClient();
  const activities = 'child_activities(id, activity_name, times_per_week, time, color, week_days, time_slots, day_times, day_end_times)';
  const extended = 'about, created_at, pet_type, pet_fed, pet_fed_today, pet_fed_date';
  const full = await client
    .from('child_profiles')
    .select(`id, name, age, date_of_birth, photo_uri, ${extended}, ${activities}`)
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });
  let data: any[] | null = full.data;
  let error: any = full.error;
  // Newer columns (about / pet_*) may not be migrated on every project — never let them
  // break the whole profile load (which would leave a child with no profile/name/photo).
  if (error && /about|pet_/.test(String(error?.message || ''))) {
    const fallback = await client
      .from('child_profiles')
      .select(`id, name, age, date_of_birth, photo_uri, created_at, ${activities}`)
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    age: typeof row.age === 'number' ? row.age : 0,
    dateOfBirth: normalizeBirthDateValue(row.date_of_birth),
    photoUri: 'photo_uri' in row && row.photo_uri ? String(row.photo_uri) : undefined,
    about: 'about' in row && row.about ? String(row.about) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    petType: 'pet_type' in row && row.pet_type ? String(row.pet_type) : undefined,
    petFed: 'pet_fed' in row && typeof row.pet_fed === 'number' ? row.pet_fed : 0,
    petFedToday: 'pet_fed_today' in row && typeof row.pet_fed_today === 'number' ? row.pet_fed_today : 0,
    petFedDate: 'pet_fed_date' in row && row.pet_fed_date ? String(row.pet_fed_date) : undefined,
    includeInMotherCalendar: true,
    activities: (row.child_activities ?? []).map((activity: any) => ({
      id: activity.id,
      name: activity.activity_name,
      timesPerWeek: activity.times_per_week,
      time: activity.time || undefined,
      color: activity.color || undefined,
      weekDays: Array.isArray(activity.week_days) ? (activity.week_days as WeekDayCode[]) : [],
      timeSlots: Array.isArray(activity.time_slots) ? (activity.time_slots as string[]) : [],
      dayTimes: activity.day_times && typeof activity.day_times === 'object' && Object.keys(activity.day_times).length ? activity.day_times : undefined,
      dayEndTimes: activity.day_end_times && typeof activity.day_end_times === 'object' && Object.keys(activity.day_end_times).length ? activity.day_end_times : undefined,
    })),
  }));
}

// Persist just a child's photo (data URI) to the server so it survives reloads and
// syncs across devices. Skips local-only ids that were never saved server-side.
export async function updateChildPhoto(session: AppSession, childId: string, photoUri: string | null): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('child_profiles')
    .update({ photo_uri: photoUri || null })
    .eq('family_id', session.familyId)
    .eq('id', childId);
  if (error) throw error;
}

// A child updates their own pet (choice / feeding). RLS lets a child edit only their own row.
export async function updateChildPet(
  session: AppSession,
  childId: string,
  fields: { petType?: string; petFed?: number; petFedToday?: number; petFedDate?: string | null },
): Promise<void> {
  const client = requireClient();
  const patch: Record<string, unknown> = {};
  if (fields.petType !== undefined) patch.pet_type = fields.petType;
  if (fields.petFed !== undefined) patch.pet_fed = fields.petFed;
  if (fields.petFedToday !== undefined) patch.pet_fed_today = fields.petFedToday;
  if (fields.petFedDate !== undefined) patch.pet_fed_date = fields.petFedDate;
  if (Object.keys(patch).length === 0) return;
  const { error } = await client.from('child_profiles').update(patch).eq('family_id', session.familyId).eq('id', childId);
  if (error) throw error;
}

// A child (or parent) writes the child's "about me". RLS lets a child edit only their own.
export async function updateChildAbout(session: AppSession, childId: string, about: string | null): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('child_profiles')
    .update({ about: about || null })
    .eq('family_id', session.familyId)
    .eq('id', childId);
  if (error) throw error;
}

// A child edits their own personal details (name / date of birth / about). RLS scopes it
// to their own row. `about` may not be migrated everywhere — retry without it.
export async function updateChildDetails(
  session: AppSession,
  childId: string,
  fields: { name?: string; dateOfBirth?: string | null; about?: string | null },
): Promise<void> {
  const client = requireClient();
  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.dateOfBirth !== undefined) patch.date_of_birth = fields.dateOfBirth;
  if (fields.about !== undefined) patch.about = fields.about;
  if (Object.keys(patch).length === 0) return;
  let { error } = await client.from('child_profiles').update(patch).eq('family_id', session.familyId).eq('id', childId);
  if (error && 'about' in patch && /about/.test(String((error as { message?: string }).message || ''))) {
    const { about, ...rest } = patch;
    if (Object.keys(rest).length === 0) return;
    ({ error } = await client.from('child_profiles').update(rest).eq('family_id', session.familyId).eq('id', childId));
  }
  if (error) throw error;
}

export async function upsertChildProfileRecord(
  session: AppSession,
  payload: {
    id?: string;
    name: string;
    age: number;
    dateOfBirth?: string;
    includeInMotherCalendar?: boolean;
    photoUri?: string;
    activities: ChildProfile['activities'];
  },
) {
  const client = requireClient();
  let childId = payload.id;

  if (childId) {
    const { error } = await client
      .from('child_profiles')
      .update({
        name: payload.name,
        age: payload.age,
        date_of_birth: toStorageBirthDate(payload.dateOfBirth),
        ...(payload.photoUri !== undefined ? { photo_uri: payload.photoUri || null } : {}),
      })
      .eq('family_id', session.familyId)
      .eq('id', childId);
    if (error) throw error;
  } else {
    const { data, error } = await client
      .from('child_profiles')
      .insert({
        family_id: session.familyId,
        name: payload.name,
        age: payload.age,
        date_of_birth: toStorageBirthDate(payload.dateOfBirth),
        photo_uri: payload.photoUri || null,
        created_by: session.userId,
      })
      .select('id')
      .single();
    if (error) throw error;
    childId = data.id;
  }

  const { error: deleteActivitiesError } = await client.from('child_activities').delete().eq('child_profile_id', childId);
  if (deleteActivitiesError) throw deleteActivitiesError;

  const nextActivities = payload.activities.filter((activity) => activity.name.trim());
  if (nextActivities.length > 0) {
    const { error: insertActivitiesError } = await client.from('child_activities').insert(
      nextActivities.map((activity) => ({
        child_profile_id: childId,
        activity_name: activity.name,
        times_per_week: activity.timesPerWeek,
        time: activity.time || null,
        color: activity.color || null,
        week_days: activity.weekDays || [],
        time_slots: activity.timeSlots || [],
        day_times: activity.dayTimes || {},
        day_end_times: activity.dayEndTimes || {},
      })),
    );
    if (insertActivitiesError) throw insertActivitiesError;
  }

  return childId as string;
}

export async function replaceGeneratedChildEvents(session: AppSession, childId: string, events: CalendarEvent[]) {
  const client = requireClient();

  const { error: deleteError } = await client
    .from('events')
    .delete()
    .eq('family_id', session.familyId)
    .eq('source_kind', 'child_schedule')
    .eq('source_profile_id', childId);
  if (deleteError) throw deleteError;

  if (events.length === 0) return;

  const { error: insertError } = await client.from('events').insert(
    events.map((event) => ({
      family_id: session.familyId,
      title: event.title,
      notes: JSON.stringify({
        color: event.color,
        motherColor: event.motherColor,
        staffColor: event.staffColor,
        visibility: event.visibility,
        category: event.category,
        owner: event.owner,
        ownerName: event.ownerName,
      }),
      starts_at: composeStartsAt(event.date, event.time),
      owner_user_id: event.owner === 'mother' ? session.userId : null,
      owner_child_profile_id: event.owner === 'child' ? childId : null,
      created_by: session.userId,
      source_kind: 'child_schedule',
      source_profile_id: childId,
    })),
  );
  if (insertError) throw insertError;
}

function buildEventRow(session: AppSession, payload: CalendarInsert) {
  const notes = JSON.stringify({
    color: payload.color,
    motherColor: payload.motherColor,
    staffColor: payload.staffColor,
    visibility: payload.visibility,
    category: payload.category,
    owner: payload.owner,
    ownerName: payload.ownerName,
    endTime: payload.endTime,
    seriesId: payload.seriesId,
  });
  return {
    family_id: session.familyId,
    title: payload.title,
    notes,
    starts_at: composeStartsAt(payload.date, payload.time),
    // A child creating a "mom" event leaves owner_user_id null (meta.owner='mother'
    // drives display) so it isn't mistakenly attributed to the child's user.
    owner_user_id: payload.owner === 'mother' && session.role !== 'child' ? session.userId : null,
    owner_child_profile_id: payload.ownerChildProfileId || null,
    created_by: session.userId,
  };
}

export async function createCalendarEvent(session: AppSession, payload: CalendarInsert) {
  const client = requireClient();
  const { error } = await client.from('events').insert(buildEventRow(session, payload));
  if (error) throw error;
}

// Insert many occurrences of a recurring event in one request.
export async function createCalendarEvents(session: AppSession, payloads: CalendarInsert[]) {
  if (payloads.length === 0) return;
  const client = requireClient();
  const { error } = await client.from('events').insert(payloads.map((p) => buildEventRow(session, p)));
  if (error) throw error;
}

export async function updateCalendarEvent(
  session: AppSession,
  payload: CalendarInsert & {
    id: string;
  },
) {
  const client = requireClient();
  const startsAt = composeStartsAt(payload.date, payload.time);
  const notes = JSON.stringify({
    color: payload.color,
    motherColor: payload.motherColor,
    staffColor: payload.staffColor,
    visibility: payload.visibility,
    category: payload.category,
    owner: payload.owner,
    ownerName: payload.ownerName,
    endTime: payload.endTime,
    seriesId: payload.seriesId, // keep an occurrence attached to its repeating series
  });

  const { error } = await client
    .from('events')
    .update({
      title: payload.title,
      notes,
      starts_at: startsAt,
      // Same guard as buildEventRow: a child editing a shared event must not stamp
      // their own uid as the (mom) owner.
      owner_user_id: payload.owner === 'mother' && session.role !== 'child' ? session.userId : null,
      owner_child_profile_id: payload.ownerChildProfileId || null,
    })
    .eq('id', payload.id)
    .eq('family_id', session.familyId);

  if (error) throw error;
}

export async function deleteCalendarEvent(session: AppSession, eventId: string) {
  const client = requireClient();
  const { error } = await client.from('events').delete().eq('id', eventId).eq('family_id', session.familyId);
  if (error) throw error;
}

// Delete many events at once (e.g. every occurrence of a repeating series).
export async function deleteCalendarEvents(session: AppSession, eventIds: string[]) {
  if (eventIds.length === 0) return;
  const client = requireClient();
  const { error } = await client.from('events').delete().in('id', eventIds).eq('family_id', session.familyId);
  if (error) throw error;
}

// --- Partner calendars (Phase 1: two separate accounts, privacy-first) ---------------------

export type PartnerLink = {
  id: string;
  status: 'pending' | 'accepted' | 'revoked';
  requesterId: string;
  requesterName?: string;
  partnerId?: string;
  partnerName?: string;
  createdAt: string;
  // The other person's display name relative to the current user, once accepted.
  partnerLabel?: string;
};

export type CalendarProposal = {
  id: string;
  linkId: string;
  fromUserId: string;
  fromName?: string;
  toUserId: string;
  title: string;
  startsAt: string;
  endTime?: string;
  notes?: string;
  color?: string;
  message?: string;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  createdAt: string;
  direction: 'incoming' | 'outgoing';
};

export async function createPartnerInvite(session: AppSession, requesterName: string): Promise<{ id: string; token: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('create_partner_invite', {
    p_family_id: session.familyId,
    p_requester_name: requesterName,
  });
  if (error) throw error;
  return data as { id: string; token: string };
}

export async function acceptPartnerInvite(token: string, familyId: string, partnerName: string): Promise<{ id: string; requester_name?: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('accept_partner_invite', {
    p_token: token,
    p_family_id: familyId,
    p_partner_name: partnerName,
  });
  if (error) throw error;
  return data as { id: string; requester_name?: string };
}

export async function revokePartnerLink(linkId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('revoke_partner_link', { p_id: linkId });
  if (error) throw error;
}

export async function listPartnerLinks(userId: string): Promise<PartnerLink[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('partner_links')
    .select('id, status, requester_id, requester_name, partner_id, partner_name, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const iAmRequester = row.requester_id === userId;
    return {
      id: row.id,
      status: row.status,
      requesterId: row.requester_id,
      requesterName: row.requester_name || undefined,
      partnerId: row.partner_id || undefined,
      partnerName: row.partner_name || undefined,
      createdAt: row.created_at,
      partnerLabel: (iAmRequester ? row.partner_name : row.requester_name) || undefined,
    };
  });
}

export async function createCalendarProposal(
  linkId: string,
  payload: { title: string; startsAt: string; endTime?: string; notes?: string; color?: string; message?: string },
): Promise<{ id: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('create_calendar_proposal', {
    p_link_id: linkId,
    p_title: payload.title,
    p_starts_at: payload.startsAt,
    p_end_time: payload.endTime || null,
    p_notes: payload.notes || null,
    p_color: payload.color || null,
    p_message: payload.message || null,
  });
  if (error) throw error;
  return data as { id: string };
}

export async function respondCalendarProposal(id: string, decision: 'confirm' | 'decline'): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('respond_calendar_proposal', { p_id: id, p_decision: decision });
  if (error) throw error;
}

export async function cancelCalendarProposal(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('cancel_calendar_proposal', { p_id: id });
  if (error) throw error;
}

export async function listCalendarProposals(userId: string): Promise<CalendarProposal[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('calendar_proposals')
    .select('id, link_id, from_user_id, from_name, to_user_id, title, starts_at, end_time, notes, color, message, status, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    linkId: row.link_id,
    fromUserId: row.from_user_id,
    fromName: row.from_name || undefined,
    toUserId: row.to_user_id,
    title: row.title,
    startsAt: row.starts_at,
    endTime: row.end_time || undefined,
    notes: row.notes || undefined,
    color: row.color || undefined,
    message: row.message || undefined,
    status: row.status,
    createdAt: row.created_at,
    direction: row.to_user_id === userId ? 'incoming' : 'outgoing',
  }));
}

// Build the event `notes` json exactly like createCalendarEvent, so a confirmed proposal
// renders identically on both calendars.
export function buildProposalNotes(payload: { color?: string; endTime?: string; category?: string; ownerName?: string }) {
  return JSON.stringify({
    color: payload.color,
    motherColor: undefined,
    staffColor: undefined,
    visibility: 'shared',
    category: payload.category || 'Together',
    owner: 'mother',
    ownerName: payload.ownerName || 'Together',
    endTime: payload.endTime,
  });
}

// Expose the wall-clock → UTC encoder used for event storage (for building a proposal's starts_at).
export function proposalStartsAt(date: string, time: string) {
  return composeStartsAt(date, time);
}

export async function deleteChildProfile(session: AppSession, childId: string) {
  const client = requireClient();

  const { error: deleteGeneratedEventsError } = await client
    .from('events')
    .delete()
    .eq('family_id', session.familyId)
    .eq('source_kind', 'child_schedule')
    .eq('source_profile_id', childId);

  if (deleteGeneratedEventsError) throw deleteGeneratedEventsError;

  const { error: deleteEventsError } = await client
    .from('events')
    .delete()
    .eq('family_id', session.familyId)
    .eq('owner_child_profile_id', childId);

  if (deleteEventsError) throw deleteEventsError;

  const { error: deleteChildError } = await client
    .from('child_profiles')
    .delete()
    .eq('family_id', session.familyId)
    .eq('id', childId);

  if (deleteChildError) throw deleteChildError;
}

export async function listStaffProfiles(familyId: string): Promise<StaffProfileRecord[]> {
  const client = requireClient();
  // Include photo_uri (staff avatar). If the column hasn't been added yet, retry
  // without it so the whole list doesn't fail.
  const withPhoto = await client
    .from('staff_profiles')
    .select('id, name, date_of_birth, tasks_json, photo_uri')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });

  let data: any[] | null = withPhoto.data;
  let error = withPhoto.error;
  if (error && String(error.message || '').toLowerCase().includes('photo_uri')) {
    const fallback = await client
      .from('staff_profiles')
      .select('id, name, date_of_birth, tasks_json')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    dateOfBirth: normalizeBirthDateValue(row.date_of_birth),
    photoUri: 'photo_uri' in row && row.photo_uri ? String(row.photo_uri) : undefined,
    tasks: Array.isArray(row.tasks_json) ? (row.tasks_json as StaffTaskDraftRecord[]) : [],
  }));
}

// A staff member sets their own avatar (or the admin sets it). Uses a security-definer
// RPC because staff can't UPDATE staff_profiles directly under RLS (same as DOB).
export async function setStaffProfilePhoto(staffProfileId: string, photoUri: string | null): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('set_staff_profile_photo', {
    p_staff_profile_id: staffProfileId,
    p_photo: photoUri || null,
  });
  if (error) throw error;
}

export async function upsertStaffProfileRecord(
  session: AppSession,
  payload: {
    id?: string;
    name: string;
    dateOfBirth?: string;
    tasks: StaffTaskDraftRecord[];
  },
) {
  const client = requireClient();
  const staffId = payload.id || createTextId('staff');

  const { error } = await client.from('staff_profiles').upsert(
    {
      id: staffId,
      family_id: session.familyId,
      name: payload.name,
      date_of_birth: toStorageBirthDate(payload.dateOfBirth),
      tasks_json: payload.tasks,
      created_by: session.userId,
    },
    { onConflict: 'id' },
  );

  if (error) throw error;
  return staffId;
}

export async function listRecipes(familyId: string): Promise<Recipe[]> {
  const client = requireClient();
  const baseColumns =
    'id, title, description, meal_type, cuisine, cook_time_minutes, servings, tags_json, classifiers_json, nutrition_per_serving_json, ingredients_json, steps_json, suitable_for_children, suitable_for_family';
  // Include photo_url (saved photos) and meal_types_json (multi-section recipes)
  // so both survive a reload. If a column hasn't been added yet, drop just that
  // column and retry instead of failing the whole list.
  const optionalColumns = ['photo_url', 'meal_types_json'];
  let data: any[] | null = null;
  let error: any = null;
  let cols = [...optionalColumns];
  for (let attempt = 0; attempt < optionalColumns.length + 1; attempt += 1) {
    const select = cols.length ? `${baseColumns}, ${cols.join(', ')}` : baseColumns;
    const res = await client
      .from('recipes')
      .select(select)
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });
    data = res.data;
    error = res.error;
    const missing = cols.find((c) => isMissingRecipeColumnError(error, c));
    if (!missing) break;
    cols = cols.filter((c) => c !== missing);
  }

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || 'Custom recipe',
    mealType: row.meal_type as RecipeMealType,
    mealTypes:
      Array.isArray(row.meal_types_json) && row.meal_types_json.length
        ? (row.meal_types_json as RecipeMealType[])
        : [row.meal_type as RecipeMealType],
    cuisine: row.cuisine || undefined,
    cookTimeMinutes: row.cook_time_minutes || 0,
    servings: row.servings || 1,
    tags: Array.isArray(row.tags_json) ? (row.tags_json as string[]) : [],
    classifiers: Array.isArray(row.classifiers_json) ? (row.classifiers_json as RecipeClassifier[]) : [],
    nutritionPerServing:
      row.nutrition_per_serving_json && typeof row.nutrition_per_serving_json === 'object'
        ? (row.nutrition_per_serving_json as Recipe['nutritionPerServing'])
        : { calories: 0, protein: 0, fat: 0, carbs: 0 },
    ingredients: Array.isArray(row.ingredients_json) ? (row.ingredients_json as Recipe['ingredients']) : [],
    steps: Array.isArray(row.steps_json) ? (row.steps_json as Recipe['steps']) : [],
    photoUri: 'photo_url' in row && row.photo_url ? String(row.photo_url) : undefined,
    suitableForChildren: !!row.suitable_for_children,
    suitableForFamily: !!row.suitable_for_family,
  }));
}

// Columns that may not exist yet on older databases. On a "missing column"
// error we drop just the offending optional column and retry.
const OPTIONAL_RECIPE_COLUMNS = ['photo_url', 'meal_types_json'];

function recipePayload(session: AppSession, recipe: Recipe) {
  return {
    family_id: session.familyId,
    title: recipe.title,
    description: recipe.description,
    meal_type: recipe.mealType,
    meal_types_json: recipe.mealTypes && recipe.mealTypes.length ? recipe.mealTypes : [recipe.mealType],
    cuisine: recipe.cuisine || null,
    cook_time_minutes: recipe.cookTimeMinutes,
    servings: recipe.servings,
    tags_json: recipe.tags,
    classifiers_json: recipe.classifiers,
    nutrition_per_serving_json: recipe.nutritionPerServing,
    ingredients_json: recipe.ingredients,
    steps_json: recipe.steps,
    suitable_for_children: !!recipe.suitableForChildren,
    suitable_for_family: !!recipe.suitableForFamily,
    photo_url: recipe.photoUri || null,
  } as Record<string, unknown>;
}

export async function createRecipe(session: AppSession, recipe: Recipe) {
  const client = requireClient();
  const payload: Record<string, unknown> = { ...recipePayload(session, recipe), created_by: session.userId };
  for (let attempt = 0; attempt < OPTIONAL_RECIPE_COLUMNS.length + 1; attempt += 1) {
    const { data, error } = await client.from('recipes').insert(payload).select('id').single();
    if (!error) return data.id as string;
    const missing = OPTIONAL_RECIPE_COLUMNS.find((c) => c in payload && isMissingRecipeColumnError(error, c));
    if (!missing) throw error;
    delete payload[missing];
  }
  throw new Error('Could not save recipe');
}

export async function updateRecipe(session: AppSession, recipe: Recipe) {
  const client = requireClient();
  const payload: Record<string, unknown> = recipePayload(session, recipe);
  for (let attempt = 0; attempt < OPTIONAL_RECIPE_COLUMNS.length + 1; attempt += 1) {
    const { error } = await client.from('recipes').update(payload).eq('id', recipe.id).eq('family_id', session.familyId);
    if (!error) return;
    const missing = OPTIONAL_RECIPE_COLUMNS.find((c) => c in payload && isMissingRecipeColumnError(error, c));
    if (!missing) throw error;
    delete payload[missing];
  }
  throw new Error('Could not update recipe');
}

export async function deleteRecipe(session: AppSession, recipeId: string) {
  const client = requireClient();
  const { error } = await client.from('recipes').delete().eq('id', recipeId).eq('family_id', session.familyId);
  if (error) throw error;
}

function isMissingRecipeColumnError(error: unknown, column: string) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return message.includes(column) && (message.includes('does not exist') || message.includes('Could not find') || message.includes('schema cache'));
}

function parseMealRotation(raw: unknown): MealRotationRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.enabled !== 'boolean' && !Array.isArray(r.order)) return null;
  return {
    enabled: r.enabled === true,
    order: Array.isArray(r.order) ? r.order.filter((k): k is string => typeof k === 'string') : [],
    anchorWeekKey: typeof r.anchorWeekKey === 'string' ? r.anchorWeekKey : '',
    mode: r.mode === 'monthly' ? 'monthly' : 'continuous',
  };
}

export async function getWeeklyMealPlanRecord(familyId: string): Promise<WeeklyMealPlanRecord> {
  const client = requireClient();
  // Newest schema carries rotation_json; degrade gracefully if that column (or the
  // older profiles_json) isn't present yet.
  const rotationQuery = await client
    .from('weekly_meal_plans')
    .select('entries_json, profiles_json, rotation_json')
    .eq('family_id', familyId)
    .maybeSingle();

  const afterRotation = isMissingWeeklyMealPlanRotationColumnError(rotationQuery.error)
    ? await client
        .from('weekly_meal_plans')
        .select('entries_json, profiles_json')
        .eq('family_id', familyId)
        .maybeSingle()
    : rotationQuery;

  const { data, error } = isMissingWeeklyMealPlanProfilesColumnError(afterRotation.error)
    ? await client
        .from('weekly_meal_plans')
        .select('entries_json')
        .eq('family_id', familyId)
        .maybeSingle()
    : afterRotation;

  if (isMissingWeeklyMealPlanTableError(error)) {
    throw new Error('Supabase weekly meal plan table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/weekly_meal_plans.sql in the Supabase SQL Editor, then refresh.');
  }
  if (error) throw error;
  if (!data) return { entries: [], profiles: [], rotation: null };

  const record = data as {
    entries_json?: unknown;
    profiles_json?: unknown;
    rotation_json?: unknown;
  };

  return {
    entries: Array.isArray(record.entries_json) ? (record.entries_json as WeeklyMealPlanEntry[]) : [],
    profiles: Array.isArray(record.profiles_json)
      ? record.profiles_json.filter(
          (item): item is MealPlanProfileRecord =>
            !!item && typeof item === 'object' && 'key' in item && 'label' in item && typeof item.key === 'string' && typeof item.label === 'string',
        )
      : [],
    rotation: parseMealRotation(record.rotation_json),
  };
}

export async function listWeeklyMealPlan(familyId: string): Promise<WeeklyMealPlanEntry[]> {
  const record = await getWeeklyMealPlanRecord(familyId);
  return record.entries;
}

export async function upsertWeeklyMealPlanRecord(session: AppSession, record: WeeklyMealPlanRecord) {
  const client = requireClient();
  const { error } = await client.from('weekly_meal_plans').upsert(
    {
      family_id: session.familyId,
      entries_json: record.entries,
      profiles_json: record.profiles,
      ...(record.rotation !== undefined ? { rotation_json: record.rotation ?? {} } : {}),
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'family_id' },
  );

  if (isMissingWeeklyMealPlanRotationColumnError(error)) {
    // Older DB without the rotation column — save the rest so meal planning still works.
    const { error: retryError } = await client.from('weekly_meal_plans').upsert(
      {
        family_id: session.familyId,
        entries_json: record.entries,
        profiles_json: record.profiles,
        updated_by: session.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'family_id' },
    );
    if (retryError) throw retryError;
    return;
  }
  if (isMissingWeeklyMealPlanTableError(error)) {
    throw new Error('Supabase weekly meal plan table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/weekly_meal_plans.sql in the Supabase SQL Editor, then try again.');
  }
  if (isMissingWeeklyMealPlanProfilesColumnError(error)) {
    throw new Error('Supabase weekly meal plan profiles column is missing. Run /Users/ksu/promom/smart-mom-app/supabase/weekly_meal_plans.sql in the Supabase SQL Editor, then try again.');
  }
  if (error) throw error;
}

export async function upsertWeeklyMealPlan(session: AppSession, entries: WeeklyMealPlanEntry[]) {
  await upsertWeeklyMealPlanRecord(session, { entries, profiles: [] });
}

function isMissingWeeklyMealPlanTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes("relation \"public.weekly_meal_plans\" does not exist") ||
    message.includes("Could not find the table 'public.weekly_meal_plans'") ||
    message.includes("Could not find the table 'weekly_meal_plans'")
  );
}

function isMissingWeeklyMealPlanProfilesColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes("Could not find the 'profiles_json' column of 'weekly_meal_plans'") ||
    message.includes("Could not find the 'profiles_json' column of 'public.weekly_meal_plans'") ||
    message.includes("column 'profiles_json' of relation 'weekly_meal_plans' does not exist") ||
    message.includes("column 'profiles_json' of relation 'public.weekly_meal_plans' does not exist")
  );
}

function isMissingWeeklyMealPlanRotationColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes("Could not find the 'rotation_json' column of 'weekly_meal_plans'") ||
    message.includes("Could not find the 'rotation_json' column of 'public.weekly_meal_plans'") ||
    message.includes("column 'rotation_json' of relation 'weekly_meal_plans' does not exist") ||
    message.includes("column 'rotation_json' of relation 'public.weekly_meal_plans' does not exist")
  );
}

function isMissingFridgeItemsTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes("relation \"public.fridge_items\" does not exist") ||
    message.includes("Could not find the table 'public.fridge_items'") ||
    message.includes("Could not find the table 'fridge_items'")
  );
}

export async function replaceGeneratedStaffSchedule(
  session: AppSession,
  staffId: string,
  tasks: TaskItem[],
  events: CalendarEvent[],
) {
  const client = requireClient();

  const { error: deleteTasksError } = await client
    .from('tasks')
    .delete()
    .eq('family_id', session.familyId)
    .eq('source_kind', 'staff_schedule')
    .eq('source_profile_id', staffId);
  if (deleteTasksError) throw deleteTasksError;

  const { error: deleteEventsError } = await client
    .from('events')
    .delete()
    .eq('family_id', session.familyId)
    .eq('source_kind', 'staff_schedule')
    .eq('source_profile_id', staffId);
  if (deleteEventsError) throw deleteEventsError;

  if (tasks.length > 0) {
    const { error: insertTasksError } = await client.from('tasks').insert(
      tasks.map((task) => ({
        family_id: session.familyId,
        title: task.title,
        assignee_role: task.assigneeRole,
        priority: task.priority,
        status: task.status,
        deadline_at: task.deadline === 'No deadline' ? null : toIsoFromAppDeadline(task.deadline),
        requires_parent_approval: task.needsParentApproval,
        created_by: session.userId,
        source_kind: 'staff_schedule',
        source_profile_id: staffId,
      })),
    );
    if (insertTasksError) throw insertTasksError;
  }

  if (events.length > 0) {
    const { error: insertEventsError } = await client.from('events').insert(
      events.map((event) => ({
        family_id: session.familyId,
        title: event.title,
        notes: JSON.stringify({
          color: event.color,
          motherColor: event.motherColor,
          staffColor: event.staffColor,
          visibility: event.visibility,
          category: event.category,
          owner: event.owner,
          ownerName: event.ownerName,
        }),
        starts_at: composeStartsAt(event.date, event.time),
        owner_user_id: null,
        owner_child_profile_id: null,
        created_by: session.userId,
        source_kind: 'staff_schedule',
        source_profile_id: staffId,
      })),
    );
    if (insertEventsError) throw insertEventsError;
  }
}

export async function listShoppingLists(familyId: string): Promise<ShoppingListDoc[]> {
  const client = requireClient();
  const extendedQuery = await client
    .from('shopping_lists')
    .select('id, title, list_type, completed_at, created_at, shopping_list_items(id, item_name, quantity, category, comment, purchased, sort_order, created_at, added_by_name, added_at)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  const { data, error } = isMissingShoppingListItemCategoryColumnError(extendedQuery.error)
    ? await client
        .from('shopping_lists')
        .select('id, title, created_at, shopping_list_items(id, item_name, quantity, comment, purchased, sort_order, created_at)')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
    : extendedQuery;

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    listType: 'list_type' in row && typeof row.list_type === 'string' ? (row.list_type as ShoppingListType) : undefined,
    createdAt: row.created_at,
    completedAt: 'completed_at' in row && typeof row.completed_at === 'string' ? row.completed_at : undefined,
    items: [...(row.shopping_list_items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .map((item) => ({
        id: item.id,
        name: item.item_name,
        quantity: item.quantity,
        category: 'category' in item && typeof item.category === 'string' ? (item.category as ShoppingItemCategory) : undefined,
        comment: item.comment || undefined,
        purchased: item.purchased,
        addedBy: 'added_by_name' in item && typeof item.added_by_name === 'string' ? item.added_by_name : undefined,
        addedAt: 'added_at' in item && typeof item.added_at === 'string' ? item.added_at : undefined,
      })),
  }));
}

// Insert item rows, tolerating the attribution columns not being migrated yet
// (fall back to inserting without them so a save never fails outright).
async function insertShoppingItemRows(
  client: ReturnType<typeof requireClient>,
  listId: string,
  items: Array<Pick<ShoppingItem, 'name' | 'quantity' | 'category' | 'comment' | 'purchased' | 'addedBy' | 'addedAt'>>,
) {
  const withAttribution = items.map((item, index) => ({
    list_id: listId,
    item_name: item.name,
    quantity: item.quantity,
    category: item.category || null,
    comment: item.comment || null,
    purchased: item.purchased,
    sort_order: index,
    added_by_name: item.addedBy || null,
    added_at: item.addedAt || null,
  }));
  const result = await client.from('shopping_list_items').insert(withAttribution);
  if (isMissingShoppingItemAttributionColumnError(result.error)) {
    const withoutAttribution = withAttribution.map(({ added_by_name, added_at, ...rest }) => rest);
    return client.from('shopping_list_items').insert(withoutAttribution);
  }
  return result;
}

function isMissingShoppingItemAttributionColumnError(error: unknown) {
  const message = String((error as { message?: string } | undefined)?.message || '').toLowerCase();
  return (
    message.includes('added_by_name') ||
    message.includes('added_at')
  );
}

export async function createShoppingList(
  session: AppSession,
  title: string,
  items: Array<Pick<ShoppingItem, 'name' | 'quantity' | 'category' | 'comment' | 'purchased' | 'addedBy' | 'addedAt'>>,
  options?: {
    listType?: ShoppingListType;
    completedAt?: string | null;
  },
) {
  const client = requireClient();
  const insertPayload = {
    family_id: session.familyId,
    title,
    created_by: session.userId,
    list_type: options?.listType || 'current',
    completed_at: options?.completedAt || null,
  };
  const fullInsert = await client
    .from('shopping_lists')
    .insert(insertPayload)
    .select('id')
    .single();
  const { data, error } = isMissingShoppingListsTypeColumnError(fullInsert.error)
    ? await client
        .from('shopping_lists')
        .insert({
          family_id: session.familyId,
          title,
          created_by: session.userId,
        })
        .select('id')
        .single()
    : fullInsert;
  if (error) throw error;

  if (items.length > 0) {
    const extendedInsert = await insertShoppingItemRows(client, data.id, items);
    if (isMissingShoppingListItemCategoryColumnError(extendedInsert.error)) {
      throw new Error(
        'Shopping item categories are not enabled in Supabase yet. Run /Users/ksu/promom/smart-mom-app/supabase/shopping_item_categories.sql in the Supabase SQL Editor, then save the list again.',
      );
    } else if (extendedInsert.error) {
      throw extendedInsert.error;
    }
  }

  return data.id as string;
}

// A row someone else inserted moments ago won't be in our snapshot. Never treat such
// a row as "the user deleted it" — a shared list must not lose a just-added item.
const CONCURRENT_INSERT_GRACE_MS = 60 * 1000;

function shoppingItemRow(listId: string, item: ShoppingItem, index: number) {
  return {
    list_id: listId,
    item_name: item.name,
    quantity: item.quantity,
    category: item.category || null,
    comment: item.comment || null,
    purchased: item.purchased,
    sort_order: index,
    added_by_name: item.addedBy || null,
    added_at: item.addedAt || null,
  };
}

const CATEGORY_MIGRATION_MESSAGE =
  'Shopping item categories are not enabled in Supabase yet. Run /Users/ksu/promom/smart-mom-app/supabase/shopping_item_categories.sql in the Supabase SQL Editor, then save the list again.';

// Sync the list by ITEM IDENTITY instead of wiping and re-inserting it.
// The old delete-everything-then-reinsert approach gave every item a brand-new id on
// each save, so two people editing the same list overwrote each other, in-flight
// toggles hit deleted rows, and the list was briefly empty (which other devices could
// see and auto-remove).
export async function updateShoppingListItems(session: AppSession, listId: string, items: ShoppingItem[]) {
  const client = requireClient();

  const { data: existingRows, error: readError } = await client
    .from('shopping_list_items')
    .select('id, created_at')
    .eq('list_id', listId);
  if (readError) throw readError;

  const existing = new Map((existingRows ?? []).map((row) => [String(row.id), String(row.created_at || '')]));

  const updates: Array<Record<string, unknown>> = [];
  const inserts: Array<Record<string, unknown>> = [];
  items.forEach((item, index) => {
    const row = shoppingItemRow(listId, item, index);
    if (item.id && existing.has(String(item.id))) updates.push({ id: item.id, ...row });
    else inserts.push(row);
  });

  // Delete only rows this client knew about and the user actually removed.
  const keptIds = new Set(updates.map((row) => String(row.id)));
  const cutoff = Date.now() - CONCURRENT_INSERT_GRACE_MS;
  const removedIds = [...existing.entries()]
    .filter(([id, createdAt]) => {
      if (keptIds.has(id)) return false;
      const created = Date.parse(createdAt);
      return Number.isNaN(created) || created < cutoff;
    })
    .map(([id]) => id);
  if (removedIds.length > 0) {
    const { error } = await client.from('shopping_list_items').delete().in('id', removedIds);
    if (error) throw error;
  }

  if (updates.length > 0) {
    let { error } = await client.from('shopping_list_items').upsert(updates, { onConflict: 'id' });
    if (isMissingShoppingItemAttributionColumnError(error)) {
      const stripped = updates.map(({ added_by_name, added_at, ...rest }) => rest);
      ({ error } = await client.from('shopping_list_items').upsert(stripped, { onConflict: 'id' }));
    }
    if (isMissingShoppingListItemCategoryColumnError(error)) throw new Error(CATEGORY_MIGRATION_MESSAGE);
    if (error) throw error;
  }

  if (inserts.length > 0) {
    let result = await client.from('shopping_list_items').insert(inserts);
    if (isMissingShoppingItemAttributionColumnError(result.error)) {
      const stripped = inserts.map(({ added_by_name, added_at, ...rest }) => rest);
      result = await client.from('shopping_list_items').insert(stripped);
    }
    if (isMissingShoppingListItemCategoryColumnError(result.error)) throw new Error(CATEGORY_MIGRATION_MESSAGE);
    if (result.error) throw result.error;
  }
}

export async function deleteShoppingList(session: AppSession, listId: string) {
  const client = requireClient();
  const { error } = await client.from('shopping_lists').delete().eq('family_id', session.familyId).eq('id', listId);
  if (error) throw error;
}

export async function updateShoppingListMeta(
  session: AppSession,
  listId: string,
  payload: {
    title?: string;
    listType?: ShoppingListType;
    completedAt?: string | null;
  },
) {
  const client = requireClient();
  const updatePayload = {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.listType !== undefined ? { list_type: payload.listType } : {}),
    ...(payload.completedAt !== undefined ? { completed_at: payload.completedAt } : {}),
  };
  if (Object.keys(updatePayload).length === 0) return;
  const fullUpdate = await client.from('shopping_lists').update(updatePayload).eq('family_id', session.familyId).eq('id', listId);
  if (isMissingShoppingListsTypeColumnError(fullUpdate.error)) {
    const fallbackPayload = {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
    };
    if (Object.keys(fallbackPayload).length === 0) return;
    const { error } = await client.from('shopping_lists').update(fallbackPayload).eq('family_id', session.familyId).eq('id', listId);
    if (error) throw error;
    return;
  }
  if (fullUpdate.error) throw fullUpdate.error;
}

export async function toggleShoppingItemPurchased(itemId: string, purchased: boolean) {
  const client = requireClient();
  const { error } = await client.from('shopping_list_items').update({ purchased }).eq('id', itemId);
  if (error) throw error;
}

export async function listFridgeItems(familyId: string): Promise<FridgeItem[]> {
  const client = requireClient();
  const { data, error } = await client.from('fridge_items').select('*').eq('family_id', familyId).order('created_at', { ascending: false });
  if (isMissingFridgeItemsTableError(error)) {
    throw new Error('Supabase fridge table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/fridge_items.sql in the Supabase SQL Editor, then refresh.');
  }
  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    item_name: string;
    quantity: string;
    amount?: number | null;
    unit?: string | null;
    category?: string | null;
    note?: string | null;
    expires_at?: string | null;
    opened?: boolean | null;
    status?: string | null;
  }>).map((row) => ({
    id: row.id,
    name: row.item_name,
    quantity: row.quantity,
    amount: typeof row.amount === 'number' ? row.amount : undefined,
    unit: typeof row.unit === 'string' ? (row.unit as FridgeItemUnit) : undefined,
    category: (row.category as FridgeItemCategory | null) || undefined,
    note: typeof row.note === 'string' ? row.note : undefined,
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
    opened: typeof row.opened === 'boolean' ? row.opened : undefined,
    status: (row.status as FridgeItemStatus) || 'full',
  }));
}

export async function replaceFridgeItems(session: AppSession, items: FridgeItem[]) {
  const client = requireClient();
  const dedupedItems = Array.from(
    new Map(
      items.map((item, index) => [
        item.id || `fridge-${index}-${item.name.trim().toLowerCase()}`,
        {
          ...item,
          id: item.id || `fridge-${index}-${item.name.trim().toLowerCase()}`,
        },
      ]),
    ).values(),
  );

  const itemIds = dedupedItems.map((item) => item.id);

  if (itemIds.length === 0) {
    const { error: deleteAllError } = await client.from('fridge_items').delete().eq('family_id', session.familyId);
    if (isMissingFridgeItemsTableError(deleteAllError)) {
      throw new Error('Supabase fridge table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/fridge_items.sql in the Supabase SQL Editor, then try again.');
    }
    if (deleteAllError) throw deleteAllError;
    return;
  }

  const staleIdsFilter = `(${itemIds.map((id) => `"${id}"`).join(',')})`;
  const { error: deleteError } = await client.from('fridge_items').delete().eq('family_id', session.familyId).not('id', 'in', staleIdsFilter);
  if (isMissingFridgeItemsTableError(deleteError)) {
    throw new Error('Supabase fridge table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/fridge_items.sql in the Supabase SQL Editor, then try again.');
  }
  if (deleteError) throw deleteError;

  const { error } = await client
    .from('fridge_items')
    .upsert(
      dedupedItems.map((item) => ({
        id: item.id,
        family_id: session.familyId,
        item_name: item.name,
        quantity: item.quantity,
        amount: typeof item.amount === 'number' ? item.amount : null,
        unit: item.unit || null,
        category: item.category || null,
        note: item.note || null,
        expires_at: item.expiresAt || null,
        opened: typeof item.opened === 'boolean' ? item.opened : false,
        status: item.status,
        created_by: session.userId,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' },
    );
  if (isMissingFridgeItemsColumnError(error)) {
    const { error: fallbackError } = await client
      .from('fridge_items')
      .upsert(
        dedupedItems.map((item) => ({
          id: item.id,
          family_id: session.familyId,
          item_name: item.name,
          quantity: item.quantity,
          category: item.category || null,
          note: item.note || null,
          status: item.status,
          created_by: session.userId,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' },
      );
    if (isMissingFridgeItemsTableError(fallbackError)) {
      throw new Error('Supabase fridge table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/fridge_items.sql in the Supabase SQL Editor, then try again.');
    }
    if (fallbackError) throw fallbackError;
    return;
  }
  if (isMissingFridgeItemsTableError(error)) {
    throw new Error('Supabase fridge table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/fridge_items.sql in the Supabase SQL Editor, then try again.');
  }
  if (error) throw error;
}

function isMissingFridgeItemsColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes("column fridge_items.amount does not exist") ||
    message.includes("column fridge_items.unit does not exist") ||
    message.includes("column fridge_items.expires_at does not exist") ||
    message.includes("column fridge_items.opened does not exist") ||
    message.includes("Could not find the 'amount' column") ||
    message.includes("Could not find the 'unit' column") ||
    message.includes("Could not find the 'expires_at' column") ||
    message.includes("Could not find the 'opened' column")
  );
}

function isMissingShoppingListItemCategoryColumnError(error: unknown) {
  const message = String((error as { message?: string } | undefined)?.message || '').toLowerCase();
  return (
    message.includes("column shopping_list_items.category does not exist") ||
    message.includes("column shopping_lists.list_type does not exist") ||
    message.includes("column shopping_lists.completed_at does not exist")
  );
}

function isMissingShoppingListsTypeColumnError(error: unknown) {
  const message = String((error as { message?: string } | undefined)?.message || '').toLowerCase();
  return (
    message.includes("column shopping_lists.list_type does not exist") ||
    message.includes("column shopping_lists.completed_at does not exist")
  );
}

export async function listShoppingShares(familyId: string): Promise<ShoppingShare[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('shopping_shares')
    .select('id, list_id, title, created_at, sender_label, recipient_key, recipient_label, items_json')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    listId: row.list_id || '',
    title: row.title,
    createdAt: row.created_at,
    senderLabel: row.sender_label,
    recipientKey: row.recipient_key,
    recipientLabel: row.recipient_label,
    items: Array.isArray(row.items_json) ? (row.items_json as ShoppingItem[]) : [],
  }));
}

// Who a shopping list can be sent to: the other co-parents (keyed by user id so two
// parents never collide) + connected staff with shopping access.
export type FamilyShopper = { key: string; label: string };
export async function listFamilyShoppers(session: AppSession): Promise<FamilyShopper[]> {
  const client = requireClient();
  const { data, error } = await client.rpc('list_family_shoppers', { p_family_id: session.familyId });
  if (error) throw error;
  return ((data as Array<{ kind: string; target_id: string; name: string }>) ?? []).map((row) => ({
    key: row.kind === 'staff' ? `staff:${row.target_id}` : `user:${row.target_id}`,
    label: row.name || (row.kind === 'staff' ? 'Staff' : 'Parent'),
  }));
}

export async function createShoppingShare(
  session: AppSession,
  payload: Omit<ShoppingShare, 'id' | 'createdAt'>,
) {
  const client = requireClient();
  const { error } = await client.from('shopping_shares').insert({
    family_id: session.familyId,
    list_id: payload.listId || null,
    title: payload.title,
    sender_label: payload.senderLabel,
    recipient_key: payload.recipientKey,
    recipient_label: payload.recipientLabel,
    items_json: payload.items,
    created_by: session.userId,
  });
  if (error) throw error;
}

export async function deleteShoppingShare(shareId: string) {
  const client = requireClient();
  const { error } = await client.from('shopping_shares').delete().eq('id', shareId);
  if (error) throw error;
}

export async function listPurchaseRequests(familyId: string): Promise<PurchaseRequest[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('purchase_requests')
    .select('id, item_name, quantity, comment, requested_by, created_at, status')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    itemName: row.item_name,
    quantity: row.quantity,
    comment: row.comment || undefined,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    status: row.status as PurchaseRequest['status'],
  }));
}

export async function createPurchaseRequest(
  session: AppSession,
  payload: Omit<PurchaseRequest, 'id' | 'createdAt' | 'status'>,
) {
  const client = requireClient();
  const { error } = await client.from('purchase_requests').insert({
    family_id: session.familyId,
    item_name: payload.itemName,
    quantity: payload.quantity,
    comment: payload.comment || null,
    requested_by: payload.requestedBy,
    status: 'new',
    created_by: session.userId,
  });
  if (error) throw error;
}

export async function updatePurchaseRequestStatus(requestId: string, status: PurchaseRequest['status']) {
  const client = requireClient();
  const { error } = await client.from('purchase_requests').update({ status }).eq('id', requestId);
  if (error) throw error;
}

export async function listCompletedTaskNotifications(familyId: string): Promise<CompletedTaskNotificationRecord[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('completed_task_notifications')
    .select('id, task_id, task_title, staff_name, completed_at, read, staff_comment, photo_url, notify_user_id')
    .eq('family_id', familyId)
    .order('completed_at', { ascending: false });
  // Resilient if the proof columns haven't been migrated yet: retry without them.
  if (error) {
    const fallback = await client
      .from('completed_task_notifications')
      .select('id, task_id, task_title, staff_name, completed_at, read')
      .eq('family_id', familyId)
      .order('completed_at', { ascending: false });
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []).map((row) => ({
      id: row.id,
      taskId: row.task_id || '',
      taskTitle: row.task_title,
      staffName: row.staff_name,
      completedAt: row.completed_at,
      read: row.read,
      comment: null,
      photoUrl: null,
      notifyUserId: null,
    }));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    taskId: row.task_id || '',
    taskTitle: row.task_title,
    staffName: row.staff_name,
    completedAt: row.completed_at,
    read: row.read,
    comment: (row as { staff_comment?: string | null }).staff_comment ?? null,
    photoUrl: (row as { photo_url?: string | null }).photo_url ?? null,
    notifyUserId: (row as { notify_user_id?: string | null }).notify_user_id ?? null,
  }));
}

export async function createCompletedTaskNotification(
  session: AppSession,
  payload: Omit<CompletedTaskNotificationRecord, 'id'>,
) {
  const client = requireClient();
  const base = {
    family_id: session.familyId,
    task_id: payload.taskId || null,
    task_title: payload.taskTitle,
    staff_name: payload.staffName,
    completed_at: payload.completedAt,
    read: payload.read,
    created_by: session.userId,
    notify_user_id: payload.notifyUserId ?? null,
  };
  const { error } = await client
    .from('completed_task_notifications')
    .insert({ ...base, staff_comment: payload.comment ?? null, photo_url: payload.photoUrl ?? null });
  // Resilient if the proof columns haven't been migrated yet: retry without them.
  if (error) {
    const fallback = await client.from('completed_task_notifications').insert(base);
    if (fallback.error) throw fallback.error;
  }
}

export async function markCompletedTaskNotificationsRead(session: AppSession) {
  const client = requireClient();
  // Only clear notifications meant for THIS owner (their assigned tasks) plus legacy
  // untargeted ones — never the other parent's, so their unread badge is left intact.
  let { error } = await client
    .from('completed_task_notifications')
    .update({ read: true })
    .eq('family_id', session.familyId)
    .eq('read', false)
    .or(`notify_user_id.eq.${session.userId},notify_user_id.is.null`);
  // Resilient if the notify_user_id column isn't migrated yet: fall back to family-wide.
  if (error) {
    ({ error } = await client
      .from('completed_task_notifications')
      .update({ read: true })
      .eq('family_id', session.familyId)
      .eq('read', false));
  }
  if (error) throw error;
}

export async function listStaffReminderNotifications(familyId: string): Promise<StaffReminderNotificationRecord[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('staff_reminder_notifications')
    .select('id, task_id, task_title, staff_name, sent_at')
    .eq('family_id', familyId)
    .order('sent_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    staffName: row.staff_name,
    sentAt: row.sent_at,
  }));
}

export async function upsertStaffReminderNotification(
  session: AppSession,
  payload: Omit<StaffReminderNotificationRecord, 'id'>,
) {
  const client = requireClient();
  const { error } = await client.from('staff_reminder_notifications').upsert(
    {
      family_id: session.familyId,
      task_id: payload.taskId,
      task_title: payload.taskTitle,
      staff_name: payload.staffName,
      sent_at: payload.sentAt,
      created_by: session.userId,
    },
    { onConflict: 'family_id,task_id' },
  );
  if (error) throw error;
}

export async function getUserPreferences(session: AppSession): Promise<UserPreferencesRecord | null> {
  const client = requireClient();
  const { data, error } = await client.from('user_preferences').select('*').eq('user_id', session.userId).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const record = data as {
    parent_label: 'Mom' | 'Dad';
    theme_name?: string | null;
    daily_card_date?: string | null;
    daily_card_id?: string | null;
    nutrition_goal?: NutritionGoal | null;
    activity_level?: ActivityLevel | null;
    nutrition_sex?: NutritionSex | null;
    desired_weight?: string | number | null;
    nutrition_pace?: NutritionPace | null;
    calorie_override?: string | number | null;
    physique_goal?: PhysiqueGoal | null;
    active_meal_plan_profile?: string | null;
    period_reminders_enabled?: boolean | null;
    period_reminder_lead_days?: number | null;
    meds_enabled?: boolean | null;
    habits_enabled?: boolean | null;
    habit_reminders_enabled?: boolean | null;
    quiet_hours_enabled?: boolean | null;
    quiet_hours_start?: string | null;
    quiet_hours_end?: string | null;
    event_reminders_enabled?: boolean | null;
    event_reminder_lead?: string | null;
    habit_color?: string | null;
  };

  const boolOrUndef = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

  return {
    parentLabel: record.parent_label,
    medsEnabled: boolOrUndef(record.meds_enabled),
    habitsEnabled: boolOrUndef(record.habits_enabled),
    habitRemindersEnabled: boolOrUndef(record.habit_reminders_enabled),
    quietHoursEnabled: boolOrUndef(record.quiet_hours_enabled),
    quietHoursStart: record.quiet_hours_start || undefined,
    quietHoursEnd: record.quiet_hours_end || undefined,
    eventRemindersEnabled: boolOrUndef(record.event_reminders_enabled),
    eventReminderLead: record.event_reminder_lead || undefined,
    themeName: record.theme_name || undefined,
    dailyCardDate: record.daily_card_date || undefined,
    dailyCardId: record.daily_card_id || undefined,
    nutritionGoal: record.nutrition_goal || undefined,
    activityLevel: record.activity_level || undefined,
    nutritionSex: record.nutrition_sex || undefined,
    desiredWeight: record.desired_weight != null ? String(record.desired_weight) : undefined,
    nutritionPace: record.nutrition_pace || undefined,
    calorieOverride: record.calorie_override != null ? String(record.calorie_override) : undefined,
    physiqueGoal: record.physique_goal || undefined,
    habitColor: record.habit_color || undefined,
    activeMealPlanProfile: record.active_meal_plan_profile || undefined,
    periodRemindersEnabled: typeof record.period_reminders_enabled === 'boolean' ? record.period_reminders_enabled : undefined,
    periodReminderLeadDays:
      typeof record.period_reminder_lead_days === 'number' && Number.isFinite(record.period_reminder_lead_days)
        ? record.period_reminder_lead_days
        : undefined,
  };
}

export async function upsertUserPreferences(
  session: AppSession,
  payload: Partial<UserPreferencesRecord>,
) {
  const client = requireClient();
  const fullPayload = {
    user_id: session.userId,
    family_id: session.familyId,
    updated_at: new Date().toISOString(),
    ...('parentLabel' in payload ? { parent_label: payload.parentLabel || 'Mom' } : {}),
    ...('themeName' in payload ? { theme_name: payload.themeName || null } : {}),
    ...('dailyCardDate' in payload ? { daily_card_date: payload.dailyCardDate || null } : {}),
    ...('dailyCardId' in payload ? { daily_card_id: payload.dailyCardId || null } : {}),
    ...('nutritionGoal' in payload ? { nutrition_goal: payload.nutritionGoal || null } : {}),
    ...('activityLevel' in payload ? { activity_level: payload.activityLevel || null } : {}),
    ...('nutritionSex' in payload ? { nutrition_sex: payload.nutritionSex || null } : {}),
    ...('desiredWeight' in payload ? { desired_weight: payload.desiredWeight || null } : {}),
    ...('nutritionPace' in payload ? { nutrition_pace: payload.nutritionPace || null } : {}),
    ...('calorieOverride' in payload ? { calorie_override: payload.calorieOverride || null } : {}),
    ...('physiqueGoal' in payload ? { physique_goal: payload.physiqueGoal || null } : {}),
    ...('activeMealPlanProfile' in payload ? { active_meal_plan_profile: payload.activeMealPlanProfile || null } : {}),
    ...('periodRemindersEnabled' in payload ? { period_reminders_enabled: !!payload.periodRemindersEnabled } : {}),
    ...('periodReminderLeadDays' in payload ? { period_reminder_lead_days: payload.periodReminderLeadDays || null } : {}),
    ...('medsEnabled' in payload ? { meds_enabled: !!payload.medsEnabled } : {}),
    ...('habitsEnabled' in payload ? { habits_enabled: !!payload.habitsEnabled } : {}),
    ...('habitRemindersEnabled' in payload ? { habit_reminders_enabled: !!payload.habitRemindersEnabled } : {}),
    ...('quietHoursEnabled' in payload ? { quiet_hours_enabled: !!payload.quietHoursEnabled } : {}),
    ...('quietHoursStart' in payload ? { quiet_hours_start: payload.quietHoursStart || null } : {}),
    ...('quietHoursEnd' in payload ? { quiet_hours_end: payload.quietHoursEnd || null } : {}),
    ...('eventRemindersEnabled' in payload ? { event_reminders_enabled: !!payload.eventRemindersEnabled } : {}),
    ...('eventReminderLead' in payload ? { event_reminder_lead: payload.eventReminderLead || null } : {}),
    ...('habitColor' in payload ? { habit_color: payload.habitColor || null } : {}),
  };

  let { error } = await client.from('user_preferences').upsert(
    fullPayload,
    { onConflict: 'user_id' },
  );

  // If a NEWER optional column isn't migrated yet, retry WITHOUT those columns rather
  // than dropping to the minimal fallback — so all the established preferences still save.
  if (error && isMissingUserPreferencesColumnError(error)) {
    const OPTIONAL_NEW_COLS = [
      'physique_goal',
      'meds_enabled',
      'habits_enabled',
      'habit_reminders_enabled',
      'quiet_hours_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
      'event_reminders_enabled',
      'event_reminder_lead',
      'habit_color',
    ];
    const rest: Record<string, unknown> = {};
    Object.entries(fullPayload).forEach(([k, v]) => {
      if (!OPTIONAL_NEW_COLS.includes(k)) rest[k] = v;
    });
    ({ error } = await client.from('user_preferences').upsert(rest, { onConflict: 'user_id' }));
  }

  if (isMissingUserPreferencesColumnError(error)) {
    const { error: fallbackError } = await client.from('user_preferences').upsert(
      {
        user_id: session.userId,
        family_id: session.familyId,
        parent_label: payload.parentLabel || 'Mom',
        theme_name: payload.themeName || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (fallbackError) throw fallbackError;
    return;
  }

  if (error) throw error;
}

function isMissingUserPreferencesColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: unknown }).message || '');
  const code = String((error as { code?: unknown }).code || '');
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes("Could not find the 'daily_card_date' column of 'user_preferences'") ||
    message.includes("Could not find the 'daily_card_id' column of 'user_preferences'") ||
    message.includes("Could not find the 'nutrition_goal' column of 'user_preferences'") ||
    message.includes("Could not find the 'activity_level' column of 'user_preferences'") ||
    message.includes("Could not find the 'nutrition_sex' column of 'user_preferences'") ||
    message.includes("Could not find the 'desired_weight' column of 'user_preferences'") ||
    message.includes("Could not find the 'nutrition_pace' column of 'user_preferences'") ||
    message.includes("Could not find the 'calorie_override' column of 'user_preferences'") ||
    message.includes("Could not find the 'active_meal_plan_profile' column of 'user_preferences'") ||
    message.includes("Could not find the 'period_reminders_enabled' column of 'user_preferences'") ||
    message.includes("Could not find the 'period_reminder_lead_days' column of 'user_preferences'") ||
    message.includes("column 'daily_card_date' of relation 'user_preferences' does not exist") ||
    message.includes("column 'daily_card_id' of relation 'user_preferences' does not exist") ||
    message.includes("column 'nutrition_goal' of relation 'user_preferences' does not exist") ||
    message.includes("column 'activity_level' of relation 'user_preferences' does not exist") ||
    message.includes("column 'nutrition_sex' of relation 'user_preferences' does not exist") ||
    message.includes("column 'desired_weight' of relation 'user_preferences' does not exist") ||
    message.includes("column 'nutrition_pace' of relation 'user_preferences' does not exist") ||
    message.includes("column 'calorie_override' of relation 'user_preferences' does not exist") ||
    message.includes("column 'active_meal_plan_profile' of relation 'user_preferences' does not exist") ||
    message.includes("column 'period_reminders_enabled' of relation 'user_preferences' does not exist") ||
    message.includes("column 'period_reminder_lead_days' of relation 'user_preferences' does not exist")
  );
}

const HABIT_BASE_COLUMNS =
  'id, title, icon, color, target_text, enabled, built_in, mark_style, reminder_mode, reminder_time, completed_today, streak';

function isMissingHabitCompletedDateError(error: { message?: string } | null): boolean {
  return !!error && String(error.message || '').toLowerCase().includes('completed_date');
}

export async function listHabitEntries(session: AppSession): Promise<HabitEntry[]> {
  const client = requireClient();
  // Progressively drop newer columns (completions, completed_date) if they haven't
  // been migrated yet, so the app keeps working before the SQL is applied.
  const selects = [
    `${HABIT_BASE_COLUMNS}, completed_date, completions`,
    `${HABIT_BASE_COLUMNS}, completed_date`,
    HABIT_BASE_COLUMNS,
  ];
  let data: any[] | null = null;
  let error: any = null;
  for (const sel of selects) {
    const res = await client
      .from('habit_entries')
      .select(sel)
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });
    data = res.data as any[] | null;
    error = res.error;
    if (!error) break;
    const m = String(error?.message || '').toLowerCase();
    // Only fall back for a missing-column error; otherwise stop and report it.
    if (!(m.includes('completions') || m.includes('completed_date'))) break;
  }
  if (isMissingHabitEntriesTableError(error)) {
    throw new Error('Supabase habits table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then refresh.');
  }
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    icon: row.icon,
    color: row.color,
    targetText: row.target_text,
    enabled: !!row.enabled,
    builtIn: !!row.built_in,
    markStyle: row.mark_style || 'circle',
    reminderMode: row.reminder_mode || 'off',
    reminderTime: row.reminder_time || '',
    completedToday: !!row.completed_today,
    completedDate: 'completed_date' in row && row.completed_date ? String(row.completed_date) : undefined,
    streak: Number(row.streak) || 0,
    completions:
      row && typeof row.completions === 'object' && row.completions
        ? (row.completions as Record<string, boolean>)
        : undefined,
  }));
}

const HABITS_TABLE_MISSING_MSG =
  'Supabase habits table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.';

// Delete one habit by id. replaceHabitEntries never wipes to empty (transient-empty
// guard), so deleting the LAST habit needs an explicit per-id delete to reach the server.
export async function deleteHabitEntry(session: AppSession, id: string): Promise<void> {
  const client = requireClient();
  // Habit ids like 'seed-water' aren't UUIDs; the server stores their coerced form.
  const { error } = await client.from('habit_entries').delete().eq('user_id', session.userId).eq('id', coerceToUuid(id));
  if (error && !isMissingHabitEntriesTableError(error)) throw error;
}

export async function replaceHabitEntries(session: AppSession, habits: HabitEntry[]) {
  const client = requireClient();
  // Never wipe: an empty set here is a transient/reset state, not a deliberate
  // "delete every habit" — and this function used to delete-all-then-reinsert on
  // EVERY change (even ticking a box), so an interrupted save emptied the server.
  if (habits.length === 0) return;

  // Habit ids can be non-UUID strings (the starter defaults are 'seed-water',
  // 'seed-exercise', …). The `id` column is uuid, so writing the raw id makes the
  // WHOLE upsert fail and nothing persists — which is why the server stayed empty
  // and habits only ever lived in this device's localStorage. Coerce to a stable
  // deterministic UUID (same string → same UUID) so saves succeed and don't dupe.
  const baseRows = habits.map((habit) => ({
    id: coerceToUuid(habit.id),
    user_id: session.userId,
    family_id: session.familyId,
    title: habit.title,
    icon: habit.icon,
    color: habit.color,
    target_text: habit.targetText,
    enabled: !!habit.enabled,
    built_in: !!habit.builtIn,
    mark_style: habit.markStyle || 'circle',
    reminder_mode: habit.reminderMode || 'off',
    reminder_time: habit.reminderTime || null,
    completed_today: !!habit.completedToday,
    streak: habit.streak || 0,
    updated_at: new Date().toISOString(),
  }));
  const withDateRows = baseRows.map((row, index) => ({
    ...row,
    completed_date: habits[index].completedDate || null,
  }));
  const fullRows = withDateRows.map((row, index) => ({
    ...row,
    completions: habits[index].completions || {},
  }));

  // 1) Upsert the current habits FIRST. If anything interrupts us after this, the
  //    latest data is already saved — the worst case is a stale row lingering.
  //    Fall back progressively if the completions / completed_date columns aren't
  //    migrated yet, so ticking never fails on an older DB.
  let { error } = await client.from('habit_entries').upsert(fullRows, { onConflict: 'id' });
  if (error && String(error.message || '').toLowerCase().includes('completions')) {
    ({ error } = await client.from('habit_entries').upsert(withDateRows, { onConflict: 'id' }));
  }
  if (isMissingHabitCompletedDateError(error)) {
    ({ error } = await client.from('habit_entries').upsert(baseRows, { onConflict: 'id' }));
  }
  if (isMissingHabitEntriesTableError(error)) throw new Error(HABITS_TABLE_MISSING_MSG);
  if (error) throw error;

  // 2) Then remove only the rows the user actually deleted. Best-effort: if this
  //    read/delete fails, the save above still stands.
  const keepIds = new Set(habits.map((h) => coerceToUuid(h.id)));
  const { data: existing, error: readError } = await client
    .from('habit_entries')
    .select('id')
    .eq('user_id', session.userId);
  if (readError) return;
  const removeIds = (existing ?? []).map((row) => String(row.id)).filter((id) => !keepIds.has(id));
  if (removeIds.length > 0) {
    await client.from('habit_entries').delete().in('id', removeIds);
  }
}

export async function listNutritionEntries(session: AppSession): Promise<NutritionFoodEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('nutrition_entries')
    .select('id, name, meal_type, entry_date, calories, protein, fat, carbs, source_json')
    .eq('user_id', session.userId)
    .order('entry_date', { ascending: false })
    // Stable secondary sort so two reads return rows in the same order — otherwise a
    // reordered-but-identical array defeats the client's no-op equality guard.
    .order('id', { ascending: true });
  if (isMissingNutritionEntriesTableError(error)) {
    throw new Error('Supabase nutrition table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then refresh.');
  }
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    mealType: row.meal_type,
    date: row.entry_date,
    calories: String(row.calories ?? '0'),
    protein: String(row.protein ?? '0'),
    fat: String(row.fat ?? '0'),
    carbs: String(row.carbs ?? '0'),
    source: (row.source_json as NutritionFoodEntry['source']) || undefined,
  }));
}

export async function listCustomNutritionFoods(session: AppSession): Promise<CustomNutritionFood[]> {
  const client = requireClient();
  const optionalCols = ['serving_grams', 'serving_json', 'barcode'];
  const omit = new Set<string>();
  let data: Record<string, unknown>[] | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const cols = ['id', 'name', 'brand', 'barcode', 'serving_grams', 'serving_json', 'base_mode', 'base_quantity', 'calories', 'protein', 'fat', 'carbs']
      .filter((c) => !omit.has(c))
      .join(', ');
    const result = await client
      .from('custom_nutrition_foods')
      .select(cols)
      .eq('user_id', session.userId)
      .order('updated_at', { ascending: false });
    if (!result.error) {
      data = result.data as unknown as Record<string, unknown>[];
      break;
    }
    if (isMissingCustomNutritionFoodsTableError(result.error)) {
      throw new Error('Supabase custom nutrition foods table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/custom_nutrition_foods.sql in the Supabase SQL Editor, then refresh.');
    }
    const missingCol = missingColumnName(result.error);
    if (missingCol && optionalCols.includes(missingCol) && !omit.has(missingCol)) {
      omit.add(missingCol);
      continue;
    }
    throw result.error;
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    brand: (row.brand as string) || undefined,
    barcode: (row.barcode as string) || undefined,
    servingGrams: row.serving_grams != null ? Number(row.serving_grams) : undefined,
    serving: (row.serving_json as CustomNutritionFood['serving']) || undefined,
    baseMode: (row.base_mode as CustomNutritionFood['baseMode']) || '100g',
    baseQuantity: Number(row.base_quantity) || 100,
    calories: Number(row.calories) || 0,
    protein: Number(row.protein) || 0,
    fat: Number(row.fat) || 0,
    carbs: Number(row.carbs) || 0,
  }));
}

// custom_nutrition_foods.id is a uuid column, but foods cached from a barcode/USDA
// search carry ids like "off-<barcode>" / "usda-<fdcId>". Writing those made the WHOLE
// batch upsert fail (invalid uuid), so NONE of the user's typed products persisted and
// everything vanished on reload. Coerce any non-uuid id to a STABLE uuid (deterministic
// from the original string) so it saves, doesn't duplicate on re-save, and reads back fine.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function coerceToUuid(id: string): string {
  if (id && UUID_RE.test(id)) return id;
  // FNV-1a over the string into four 32-bit words → 32 hex chars → UUID (v5-style bits).
  const words: number[] = [];
  for (let seed = 0; seed < 4; seed += 1) {
    let h = 0x811c9dc5 ^ (seed * 0x01000193);
    const s = `${seed}:${id}`;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    words.push(h >>> 0);
  }
  const hex = words.map((w) => w.toString(16).padStart(8, '0')).join('');
  const b = hex.split('');
  b[12] = '5'; // version
  b[16] = ((parseInt(b[16], 16) & 0x3) | 0x8).toString(16); // variant
  const h = b.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export async function replaceCustomNutritionFoods(session: AppSession, foods: CustomNutritionFood[]) {
  const client = requireClient();
  if (foods.length === 0) {
    const { error: deleteError } = await client.from('custom_nutrition_foods').delete().eq('user_id', session.userId);
    if (isMissingCustomNutritionFoodsTableError(deleteError)) {
      throw new Error('Supabase custom nutrition foods table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/custom_nutrition_foods.sql in the Supabase SQL Editor, then try again.');
    }
    if (deleteError) throw deleteError;
    return;
  }

  const nextIds = new Set(foods.map((food) => coerceToUuid(food.id)));
  const buildRow = (food: CustomNutritionFood, omit: Set<string>) => {
    const row: Record<string, unknown> = {
      id: coerceToUuid(food.id),
      user_id: session.userId,
      family_id: session.familyId,
      name: food.name,
      brand: food.brand || null,
      barcode: food.barcode || null,
      base_mode: food.baseMode,
      base_quantity: food.baseQuantity,
      calories: food.calories,
      protein: food.protein,
      fat: food.fat,
      carbs: food.carbs,
      updated_at: new Date().toISOString(),
    };
    if (!omit.has('serving_grams')) row.serving_grams = food.servingGrams ?? null;
    if (!omit.has('serving_json')) row.serving_json = food.serving ?? null;
    if (!omit.has('barcode')) row.barcode = food.barcode || null;
    return row;
  };
  // Save resiliently: if an optional column has not been migrated yet, drop it and retry
  // instead of failing the whole save (which would otherwise lose the user's data).
  const omit = new Set<string>();
  let error: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await client
      .from('custom_nutrition_foods')
      .upsert(foods.map((food) => buildRow(food, omit)), { onConflict: 'id' });
    error = result.error;
    if (!error) break;
    if (isMissingCustomNutritionFoodsTableError(error)) {
      throw new Error('Supabase custom nutrition foods table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/custom_nutrition_foods.sql in the Supabase SQL Editor, then try again.');
    }
    const missingCol = missingColumnName(error);
    if (missingCol && !omit.has(missingCol)) {
      omit.add(missingCol);
      continue;
    }
    break;
  }
  if (error) throw error;

  const { data: existingRows, error: existingError } = await client
    .from('custom_nutrition_foods')
    .select('id, created_at')
    .eq('user_id', session.userId);
  if (isMissingCustomNutritionFoodsTableError(existingError)) {
    throw new Error('Supabase custom nutrition foods table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/custom_nutrition_foods.sql in the Supabase SQL Editor, then try again.');
  }
  if (existingError) throw existingError;

  // Only delete rows this snapshot knew about. A product another device added seconds ago
  // won't be in our list — the grace window keeps it from being deleted by a stale save.
  const cutoff = Date.now() - CONCURRENT_INSERT_GRACE_MS;
  const staleIds = (existingRows ?? [])
    .filter((row) => {
      if (nextIds.has(row.id)) return false;
      const created = Date.parse(String((row as { created_at?: string }).created_at || ''));
      return Number.isNaN(created) || created < cutoff;
    })
    .map((row) => row.id);
  if (!staleIds.length) return;

  const { error: staleDeleteError } = await client.from('custom_nutrition_foods').delete().eq('user_id', session.userId).in('id', staleIds);
  if (isMissingCustomNutritionFoodsTableError(staleDeleteError)) {
    throw new Error('Supabase custom nutrition foods table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/custom_nutrition_foods.sql in the Supabase SQL Editor, then try again.');
  }
  if (staleDeleteError) throw staleDeleteError;
}

export async function replaceNutritionEntries(session: AppSession, entries: NutritionFoodEntry[]) {
  const client = requireClient();
  if (entries.length === 0) {
    const { error: deleteError } = await client.from('nutrition_entries').delete().eq('user_id', session.userId);
    if (isMissingNutritionEntriesTableError(deleteError)) {
      throw new Error('Supabase nutrition table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.');
    }
    if (deleteError) throw deleteError;
    return;
  }

  const nextIds = new Set(entries.map((entry) => entry.id));
  const { error } = await client.from('nutrition_entries').upsert(
    entries.map((entry) => ({
      id: entry.id,
      user_id: session.userId,
      family_id: session.familyId,
      name: entry.name,
      meal_type: entry.mealType,
      entry_date: entry.date,
      calories: Number(entry.calories) || 0,
      protein: Number(entry.protein) || 0,
      fat: Number(entry.fat) || 0,
      carbs: Number(entry.carbs) || 0,
      source_json: entry.source ?? null,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'id' },
  );
  if (isMissingNutritionEntriesTableError(error)) {
    throw new Error('Supabase nutrition table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.');
  }
  if (error) throw error;

  const { data: existingRows, error: existingError } = await client
    .from('nutrition_entries')
    .select('id, created_at')
    .eq('user_id', session.userId);
  if (isMissingNutritionEntriesTableError(existingError)) {
    throw new Error('Supabase nutrition table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.');
  }
  if (existingError) throw existingError;

  // Grace window so a diary entry another device logged seconds ago isn't deleted by this
  // (possibly stale) snapshot.
  const cutoff = Date.now() - CONCURRENT_INSERT_GRACE_MS;
  const staleIds = (existingRows ?? [])
    .filter((row) => {
      if (nextIds.has(row.id)) return false;
      const created = Date.parse(String((row as { created_at?: string }).created_at || ''));
      return Number.isNaN(created) || created < cutoff;
    })
    .map((row) => row.id);
  if (!staleIds.length) return;

  const { error: staleDeleteError } = await client.from('nutrition_entries').delete().eq('user_id', session.userId).in('id', staleIds);
  if (isMissingNutritionEntriesTableError(staleDeleteError)) {
    throw new Error('Supabase nutrition table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.');
  }
  if (staleDeleteError) throw staleDeleteError;
}

function isMissingHabitEntriesTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes("relation \"public.habit_entries\" does not exist") ||
    message.includes("Could not find the table 'public.habit_entries'") ||
    message.includes("Could not find the table 'habit_entries'")
  );
}

function isMissingNutritionEntriesTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes("relation \"public.nutrition_entries\" does not exist") ||
    message.includes("Could not find the table 'public.nutrition_entries'") ||
    message.includes("Could not find the table 'nutrition_entries'")
  );
}

function isMissingCustomNutritionFoodsTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes("relation \"public.custom_nutrition_foods\" does not exist") ||
    message.includes("Could not find the table 'public.custom_nutrition_foods'") ||
    message.includes("Could not find the table 'custom_nutrition_foods'")
  );
}

// Returns the name of an un-migrated optional column referenced by a PostgREST error, if any.
function missingColumnName(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  for (const col of ['serving_json', 'serving_grams', 'barcode']) {
    if (
      message.includes(`'${col}' column`) ||
      message.includes(`"${col}"`) ||
      message.includes(`column ${col} `) ||
      message.includes(`.${col}`)
    ) {
      return col;
    }
  }
  return null;
}

function parseEventNotes(notes: string | null): Record<string, string> {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
  } catch {
    return {};
  }
  return {};
}

function normalizeBirthDateValue(value: string | null | undefined) {
  if (!value) return undefined;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return value;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function toStorageBirthDate(value?: string) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function toNullableInt(value?: string) {
  if (!value?.trim()) return null;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableDecimal(value?: string) {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function composeStartsAt(date: string, time: string) {
  const parsed = parseTimeValue(time);
  const hour24 = parsed.period === 'PM' ? (parsed.hour % 12) + 12 : parsed.hour % 12;
  const hh = String(hour24).padStart(2, '0');
  const mm = String(parsed.minute).padStart(2, '0');
  // Store the entered wall-clock time explicitly as UTC and read it back as UTC
  // (see formatTime12) so the time can't drift by the viewer's timezone offset.
  return `${date}T${hh}:${mm}:00.000Z`;
}

function parseTimeValue(value: string) {
  const text = value.trim();
  const twelve = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelve) {
    return {
      hour: clampNumber(parseInt(twelve[1], 10), 1, 12),
      minute: clampNumber(parseInt(twelve[2], 10), 0, 59),
      period: twelve[3].toUpperCase() === 'PM' ? 'PM' : 'AM',
    } as const;
  }

  const twentyFour = text.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const rawHour = clampNumber(parseInt(twentyFour[1], 10), 0, 23);
    const minute = clampNumber(parseInt(twentyFour[2], 10), 0, 59);
    return {
      hour: rawHour % 12 === 0 ? 12 : rawHour % 12,
      minute,
      period: rawHour >= 12 ? 'PM' : 'AM',
    } as const;
  }

  return { hour: 10, minute: 0, period: 'AM' as const };
}

function formatTime12(value: Date) {
  // Read back in UTC to match how composeStartsAt stored the wall-clock time.
  let hours = value.getUTCHours();
  const minutes = value.getUTCMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createTextId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${random}`;
}

function toIsoFromAppDeadline(value: string) {
  const [datePart, ...timeParts] = value.trim().split(' ');
  const timePart = timeParts.join(' ').trim();
  if (!datePart || !timePart) return null;
  return composeStartsAt(datePart, timePart);
}

// --- Fix it: home issues + saved repair contacts -------------------------------------------

function isMissingHomeTableError(error: unknown, table: string) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return (
    message.includes(`relation "public.${table}" does not exist`) ||
    message.includes(`Could not find the table 'public.${table}'`) ||
    message.includes(`Could not find the table '${table}'`)
  );
}

const HOME_FIXIT_MIGRATION_HINT =
  'Supabase "Fix it" tables are missing. Run /Users/ksu/promom/smart-mom-app/supabase/home_fixit.sql in the Supabase SQL Editor, then refresh.';

export async function listHomeIssues(session: AppSession): Promise<HomeIssue[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('home_issues')
    .select('id, title, description, category, location, urgency, status, reported_by, provider_id, cost, scheduled_at, resolved_at, created_at')
    .eq('family_id', session.familyId)
    .order('created_at', { ascending: false });
  if (isMissingHomeTableError(error, 'home_issues')) throw new Error(HOME_FIXIT_MIGRATION_HINT);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    category: row.category || 'other',
    location: row.location || undefined,
    urgency: (row.urgency as HomeIssue['urgency']) || 'normal',
    status: (row.status as HomeIssue['status']) || 'new',
    reportedBy: row.reported_by || undefined,
    providerId: row.provider_id || undefined,
    cost: row.cost != null ? Number(row.cost) : undefined,
    scheduledAt: row.scheduled_at || undefined,
    resolvedAt: row.resolved_at || undefined,
    createdAt: row.created_at || undefined,
  }));
}

export async function replaceHomeIssues(session: AppSession, issues: HomeIssue[]) {
  const client = requireClient();
  if (issues.length > 0) {
    const { error } = await client.from('home_issues').upsert(
      issues.map((issue) => ({
        id: issue.id,
        family_id: session.familyId,
        created_by: session.userId,
        title: issue.title,
        description: issue.description || null,
        category: issue.category || 'other',
        location: issue.location || null,
        urgency: issue.urgency || 'normal',
        status: issue.status || 'new',
        reported_by: issue.reportedBy || null,
        provider_id: issue.providerId || null,
        cost: issue.cost ?? null,
        scheduled_at: issue.scheduledAt || null,
        resolved_at: issue.resolvedAt || null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' },
    );
    if (isMissingHomeTableError(error, 'home_issues')) throw new Error(HOME_FIXIT_MIGRATION_HINT);
    if (error) throw error;
  }
  const keepIds = issues.map((issue) => issue.id);
  let removal = client.from('home_issues').delete().eq('family_id', session.familyId);
  if (keepIds.length > 0) removal = removal.not('id', 'in', `(${keepIds.join(',')})`);
  const { error: deleteError } = await removal;
  if (deleteError && !isMissingHomeTableError(deleteError, 'home_issues')) throw deleteError;
}

export async function listHomeProviders(session: AppSession): Promise<HomeProvider[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('home_providers')
    .select('id, name, category, phone, notes')
    .eq('family_id', session.familyId)
    .order('created_at', { ascending: false });
  if (isMissingHomeTableError(error, 'home_providers')) throw new Error(HOME_FIXIT_MIGRATION_HINT);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category || undefined,
    phone: row.phone || undefined,
    notes: row.notes || undefined,
  }));
}

export async function replaceHomeProviders(session: AppSession, providers: HomeProvider[]) {
  const client = requireClient();
  if (providers.length > 0) {
    const { error } = await client.from('home_providers').upsert(
      providers.map((provider) => ({
        id: provider.id,
        family_id: session.familyId,
        created_by: session.userId,
        name: provider.name,
        category: provider.category || null,
        phone: provider.phone || null,
        notes: provider.notes || null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' },
    );
    if (isMissingHomeTableError(error, 'home_providers')) throw new Error(HOME_FIXIT_MIGRATION_HINT);
    if (error) throw error;
  }
  const keepIds = providers.map((provider) => provider.id);
  let removal = client.from('home_providers').delete().eq('family_id', session.familyId);
  if (keepIds.length > 0) removal = removal.not('id', 'in', `(${keepIds.join(',')})`);
  const { error: deleteError } = await removal;
  if (deleteError && !isMissingHomeTableError(deleteError, 'home_providers')) throw deleteError;
}

// --- Chores --------------------------------------------------------------------------------

const CHORES_MIGRATION_HINT =
  'Supabase "chores" table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/chores.sql in the Supabase SQL Editor, then refresh.';

// Columns added after the first chores.sql — tolerate them being un-migrated so
// chores still save (without those fields) instead of failing the whole write.
const CHORE_OPTIONAL_COLS = ['verifier', 'last_done_date', 'last_verified_date', 'points', 'sort_order'];
function choreMissingColumn(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  for (const col of CHORE_OPTIONAL_COLS) {
    if (message.includes(`'${col}'`) || message.includes(`"${col}"`) || message.includes(`column ${col} `) || message.includes(`.${col}`)) {
      return col;
    }
  }
  return null;
}

export async function listChores(session: AppSession): Promise<Chore[]> {
  const client = requireClient();
  const allCols = ['id', 'title', 'child_profile_id', 'recurrence', 'verifier', 'points', 'last_done_date', 'last_verified_date', 'sort_order'];
  const omit = new Set<string>();
  let data: Record<string, unknown>[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await client
      .from('chores')
      .select(allCols.filter((c) => !omit.has(c)).join(', '))
      .eq('family_id', session.familyId)
      .order('created_at', { ascending: true });
    if (!result.error) {
      data = result.data as unknown as Record<string, unknown>[];
      break;
    }
    if (isMissingHomeTableError(result.error, 'chores')) throw new Error(CHORES_MIGRATION_HINT);
    const mc = choreMissingColumn(result.error);
    if (mc && CHORE_OPTIONAL_COLS.includes(mc) && !omit.has(mc)) {
      omit.add(mc);
      continue;
    }
    throw result.error;
  }
  return data.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    childId: (row.child_profile_id as string) || undefined,
    recurrence: ((row.recurrence as Chore['recurrence']) || 'weekly'),
    verifier: (row.verifier === 'parent' || row.verifier === 'nanny' ? row.verifier : 'self') as Chore['verifier'],
    points: Number(row.points) || 0,
    lastDoneDate: (row.last_done_date as string) || undefined,
    lastVerifiedDate: (row.last_verified_date as string) || undefined,
  }));
}

export async function replaceChores(session: AppSession, chores: Chore[]) {
  const client = requireClient();
  const buildRow = (chore: Chore, index: number, omit: Set<string>) => {
    const row: Record<string, unknown> = {
      id: chore.id,
      family_id: session.familyId,
      created_by: session.userId,
      title: chore.title,
      child_profile_id: chore.childId || null,
      recurrence: chore.recurrence,
      updated_at: new Date().toISOString(),
    };
    if (!omit.has('verifier')) row.verifier = chore.verifier;
    if (!omit.has('points')) row.points = chore.points || 0;
    if (!omit.has('last_done_date')) row.last_done_date = chore.lastDoneDate || null;
    if (!omit.has('last_verified_date')) row.last_verified_date = chore.lastVerifiedDate || null;
    if (!omit.has('sort_order')) row.sort_order = index;
    return row;
  };
  if (chores.length > 0) {
    const omit = new Set<string>();
    let error: unknown = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = await client.from('chores').upsert(chores.map((c, i) => buildRow(c, i, omit)), { onConflict: 'id' });
      error = result.error;
      if (!error) break;
      if (isMissingHomeTableError(error, 'chores')) throw new Error(CHORES_MIGRATION_HINT);
      const mc = choreMissingColumn(error);
      if (mc && !omit.has(mc)) {
        omit.add(mc);
        continue;
      }
      break;
    }
    if (error) throw error;
  }
  const keepIds = chores.map((chore) => chore.id);
  let removal = client.from('chores').delete().eq('family_id', session.familyId);
  if (keepIds.length > 0) removal = removal.not('id', 'in', `(${keepIds.join(',')})`);
  const { error: deleteError } = await removal;
  if (deleteError && !isMissingHomeTableError(deleteError, 'chores')) throw deleteError;
}

// Which of the child's day-plan events they've ticked done on a given date.
export async function listChildEventChecks(session: AppSession, doneDate: string): Promise<string[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('child_event_checks')
    .select('event_id')
    .eq('family_id', session.familyId)
    .eq('done_date', doneDate);
  if (error) {
    if (isMissingHomeTableError(error, 'child_event_checks')) return [];
    throw error;
  }
  return (data ?? []).map((r) => String((r as { event_id: string }).event_id));
}

// A child ticks / un-ticks one of their day-plan events for a date.
export async function setChildEventDone(session: AppSession, eventId: string, doneDate: string, done: boolean): Promise<void> {
  const client = requireClient();
  const childId = session.childProfileId;
  if (!childId) return;
  if (done) {
    const { error } = await client
      .from('child_event_checks')
      .upsert(
        { family_id: session.familyId, child_profile_id: childId, event_id: eventId, done_date: doneDate },
        { onConflict: 'child_profile_id,event_id,done_date' },
      );
    if (error && !isMissingHomeTableError(error, 'child_event_checks')) throw error;
  } else {
    const { error } = await client
      .from('child_event_checks')
      .delete()
      .eq('family_id', session.familyId)
      .eq('child_profile_id', childId)
      .eq('event_id', eventId)
      .eq('done_date', doneDate);
    if (error && !isMissingHomeTableError(error, 'child_event_checks')) throw error;
  }
}

// A child marks ONE of their own chores done/undone. Single-row update (their RLS
// allows updating their own chore; they have no bulk/insert rights, so replaceChores
// can't be used from a child session).
export async function setChoreDone(session: AppSession, choreId: string, doneDate: string | null) {
  const client = requireClient();
  const { error } = await client
    .from('chores')
    .update({ last_done_date: doneDate, updated_at: new Date().toISOString() })
    .eq('id', coerceToUuid(choreId));
  if (error && !isMissingHomeTableError(error, 'chores')) throw error;
}

// A child ADDS one chore for themselves. Single-row insert (their RLS allows
// inserting only a chore assigned to their own profile; they can't delete — that
// stays an adult action). Column-fallback mirrors replaceChores for older schemas.
export async function addChildChore(session: AppSession, chore: Chore) {
  const client = requireClient();
  const childId = session.childProfileId;
  if (!childId) return;
  const buildRow = (omit: Set<string>) => {
    const row: Record<string, unknown> = {
      // The id column is uuid; client ids like 'c1753…' aren't. Coerce (same string →
      // same uuid) so the insert succeeds and later toggles/deletes still line up.
      id: coerceToUuid(chore.id),
      family_id: session.familyId,
      created_by: session.userId,
      title: chore.title,
      child_profile_id: childId,
      recurrence: chore.recurrence,
      updated_at: new Date().toISOString(),
    };
    if (!omit.has('verifier')) row.verifier = chore.verifier;
    if (!omit.has('points')) row.points = chore.points || 0;
    return row;
  };
  const omit = new Set<string>();
  let error: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await client.from('chores').insert(buildRow(omit));
    error = result.error;
    if (!error) return;
    if (isMissingHomeTableError(error, 'chores')) throw new Error(CHORES_MIGRATION_HINT);
    const mc = choreMissingColumn(error);
    if (mc && !omit.has(mc)) {
      omit.add(mc);
      continue;
    }
    break;
  }
  if (error) throw error;
}

// ---------- CHILD WORDS (vocabulary deck) ----------
const CHILD_WORDS_MIGRATION_HINT =
  'Supabase child_words table is missing. Run smart-mom-app/supabase/child_words.sql, then try again.';

function rowToChildWord(row: Record<string, unknown>): ChildWord {
  return {
    id: String(row.id),
    term: (row.term as string) || '',
    translation: (row.translation as string) || undefined,
    example: (row.example as string) || undefined,
    distractors: Array.isArray(row.distractors) ? (row.distractors as string[]) : [],
    srcLang: (row.src_lang as string) || 'es',
    tgtLang: (row.tgt_lang as string) || 'ru',
    box: typeof row.box === 'number' ? (row.box as number) : 1,
    dueDate: (row.due_date as string) || '',
    lastResult: typeof row.last_result === 'boolean' ? (row.last_result as boolean) : undefined,
    enrichedAt: (row.enriched_at as string) || undefined,
    createdAt: (row.created_at as string) || '',
  };
}

// A child's own vocabulary deck (RLS scopes to their linked profile).
export async function listChildWords(session: AppSession): Promise<ChildWord[]> {
  const client = requireClient();
  const childId = session.childProfileId;
  if (!childId) return [];
  // Filter by child_profile_id only — RLS already restricts to this child's own rows,
  // and adding a family_id filter would silently hide words if the session resolved a
  // slightly different family id than the rows were written under.
  const { data, error } = await client
    .from('child_words')
    .select('*')
    .eq('child_profile_id', childId)
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingHomeTableError(error, 'child_words')) return [];
    throw error;
  }
  return (data as unknown as Record<string, unknown>[]).map(rowToChildWord);
}

// The child adds one word to their own deck.
export async function addChildWord(session: AppSession, word: ChildWord): Promise<void> {
  const client = requireClient();
  const childId = session.childProfileId;
  if (!childId) return;
  const { error } = await client.from('child_words').insert({
    // id column is uuid; client ids like 'w1753…' aren't — coerce so the insert works
    // and later update/delete (which coerce the same way) target the same row.
    id: coerceToUuid(word.id),
    family_id: session.familyId,
    child_profile_id: childId,
    term: word.term,
    translation: word.translation ?? null,
    example: word.example ?? null,
    distractors: word.distractors ?? [],
    src_lang: word.srcLang,
    tgt_lang: word.tgtLang,
    box: word.box,
    due_date: word.dueDate,
    enriched_at: word.enrichedAt ?? null,
  });
  if (error) {
    if (isMissingHomeTableError(error, 'child_words')) throw new Error(CHILD_WORDS_MIGRATION_HINT);
    throw error;
  }
}

// Update SRS progress / translation / example on one of the child's own words.
export async function updateChildWord(
  session: AppSession,
  wordId: string,
  patch: Partial<Pick<ChildWord, 'term' | 'translation' | 'example' | 'distractors' | 'box' | 'dueDate' | 'lastResult' | 'enrichedAt'>>,
): Promise<void> {
  const client = requireClient();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.term !== undefined) row.term = patch.term;
  if (patch.translation !== undefined) row.translation = patch.translation ?? null;
  if (patch.example !== undefined) row.example = patch.example ?? null;
  if (patch.distractors !== undefined) row.distractors = patch.distractors;
  if (patch.box !== undefined) row.box = patch.box;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.lastResult !== undefined) row.last_result = patch.lastResult;
  if (patch.enrichedAt !== undefined) row.enriched_at = patch.enrichedAt ?? null;
  const { error } = await client.from('child_words').update(row).eq('id', coerceToUuid(wordId));
  if (error && !isMissingHomeTableError(error, 'child_words')) throw error;
}

// The child removes one of their own words.
export async function deleteChildWord(session: AppSession, wordId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('child_words').delete().eq('id', coerceToUuid(wordId));
  if (error && !isMissingHomeTableError(error, 'child_words')) throw error;
}

const MEDICINES_MIGRATION_HINT =
  'Supabase medicines table is missing. Run smart-mom-app/supabase/medicines.sql in the Supabase SQL Editor, then try again.';

export async function listMedicines(session: AppSession): Promise<MedicineItem[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('medicines')
    .select('id, name, category, expiry, quantity, location, for_whom, note')
    .eq('family_id', session.familyId)
    .order('created_at', { ascending: true });
  if (error) {
    if (isMissingHomeTableError(error, 'medicines')) throw new Error(MEDICINES_MIGRATION_HINT);
    throw error;
  }
  return (data as unknown as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    name: (row.name as string) || '',
    category: (row.category as MedicineItem['category']) || 'other',
    expiry: (row.expiry as string) || undefined,
    quantity: (row.quantity as string) || undefined,
    location: (row.location as string) || undefined,
    forWhom: (row.for_whom as string) || undefined,
    note: (row.note as string) || undefined,
  }));
}

export async function replaceMedicines(session: AppSession, medicines: MedicineItem[]) {
  const client = requireClient();
  if (medicines.length > 0) {
    const rows = medicines.map((item) => ({
      id: item.id,
      family_id: session.familyId,
      created_by: session.userId,
      name: item.name,
      category: item.category,
      expiry: item.expiry || null,
      quantity: item.quantity || null,
      location: item.location || null,
      for_whom: item.forWhom || null,
      note: item.note || null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await client.from('medicines').upsert(rows, { onConflict: 'id' });
    if (error) {
      if (isMissingHomeTableError(error, 'medicines')) throw new Error(MEDICINES_MIGRATION_HINT);
      throw error;
    }
  }
  const keepIds = medicines.map((item) => item.id);
  let removal = client.from('medicines').delete().eq('family_id', session.familyId);
  if (keepIds.length > 0) removal = removal.not('id', 'in', `(${keepIds.join(',')})`);
  const { error: deleteError } = await removal;
  if (deleteError && !isMissingHomeTableError(deleteError, 'medicines')) throw deleteError;
}
