import {
  ActivityLevel,
  ApprovalRequest,
  CalendarEvent,
  ChildProfile,
  CustomNutritionFood,
  CycleDayEntry,
  FridgeItem,
  FridgeItemCategory,
  FridgeItemStatus,
  FridgeItemUnit,
  Chore,
  HabitEntry,
  HomeIssue,
  HomeProvider,
  NutritionFoodEntry,
  NutritionGoal,
  NutritionPace,
  NutritionSex,
  PersonalProfile,
  PurchaseRequest,
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
};

type TaskInsert = {
  title: string;
  assigneeRole: Role;
  priority: TaskPriority;
  deadlineAt?: string;
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
  tasks: StaffTaskDraftRecord[];
};

export type CompletedTaskNotificationRecord = {
  id: string;
  taskId: string;
  taskTitle: string;
  staffName: string;
  completedAt: string;
  read: boolean;
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
  themeName?: ThemeName;
  dailyCardDate?: string;
  dailyCardId?: string;
  nutritionGoal?: NutritionGoal;
  activityLevel?: ActivityLevel;
  nutritionSex?: NutritionSex;
  desiredWeight?: string;
  nutritionPace?: NutritionPace;
  calorieOverride?: string;
  activeMealPlanProfile?: string;
  periodRemindersEnabled?: boolean;
  periodReminderLeadDays?: number;
};

export type MealPlanProfileRecord = {
  key: string;
  label: string;
};

export type WeeklyMealPlanRecord = {
  entries: WeeklyMealPlanEntry[];
  profiles: MealPlanProfileRecord[];
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
    .select('full_name, nickname, date_of_birth, height_cm, weight_kg, cycle_tracking_enabled, cycle_last_period_start, cycle_length_days, cycle_period_length_days, cycle_entries_json')
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
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data: familyId, error: bootstrapError } = await client.rpc('ensure_user_family');
  if (bootstrapError) throw bootstrapError;

  const { data: member, error: memberError } = await client
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', user.id)
    .single();

  if (memberError) throw memberError;

  return {
    userId: user.id,
    familyId,
    role: member.role as Role,
  };
}

export async function listTasks(familyId: string): Promise<TaskItem[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('tasks')
    .select('id, title, assignee_role, priority, status, deadline_at, requires_parent_approval')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    assigneeRole: row.assignee_role as Role,
    assigneeName:
      row.assignee_role === 'mother' || row.assignee_role === 'admin'
        ? 'Mother'
        : row.assignee_role === 'staff'
          ? 'Staff'
          : 'Child',
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    deadline: row.deadline_at ? new Date(row.deadline_at).toISOString().slice(0, 16).replace('T', ' ') : 'No deadline',
    needsParentApproval: row.requires_parent_approval,
  }));
}

export async function createTask(session: AppSession, payload: TaskInsert) {
  const client = requireClient();

  const { error } = await client.from('tasks').insert({
    family_id: session.familyId,
    title: payload.title,
    assignee_role: payload.assigneeRole,
    priority: payload.priority,
    deadline_at: payload.deadlineAt || null,
    requires_parent_approval: payload.assigneeRole === 'child',
    created_by: session.userId,
  });

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
    .select('id, title, notes, starts_at, owner_user_id, owner_child_profile_id')
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
      date,
      time,
      endTime: meta.endTime || undefined,
      category: meta.category || 'General',
      color: meta.color || '#64748b',
      motherColor: meta.motherColor,
      staffColor: meta.staffColor,
      visibility: meta.visibility === 'staff_private' ? 'staff_private' : 'shared',
    };
  });
}

export async function listChildProfiles(familyId: string): Promise<ChildProfile[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('child_profiles')
    .select('id, name, age, date_of_birth, child_activities(id, activity_name, times_per_week, time, color, week_days, time_slots)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    age: typeof row.age === 'number' ? row.age : 0,
    dateOfBirth: normalizeBirthDateValue(row.date_of_birth),
    includeInMotherCalendar: true,
    activities: (row.child_activities ?? []).map((activity) => ({
      id: activity.id,
      name: activity.activity_name,
      timesPerWeek: activity.times_per_week,
      time: activity.time || undefined,
      color: activity.color || undefined,
      weekDays: Array.isArray(activity.week_days) ? (activity.week_days as WeekDayCode[]) : [],
      timeSlots: Array.isArray(activity.time_slots) ? (activity.time_slots as string[]) : [],
    })),
  }));
}

export async function upsertChildProfileRecord(
  session: AppSession,
  payload: {
    id?: string;
    name: string;
    age: number;
    dateOfBirth?: string;
    includeInMotherCalendar?: boolean;
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

export async function createCalendarEvent(session: AppSession, payload: CalendarInsert) {
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
  });

  const { error } = await client.from('events').insert({
    family_id: session.familyId,
    title: payload.title,
    notes,
    starts_at: startsAt,
    owner_user_id: payload.owner === 'mother' ? session.userId : null,
    owner_child_profile_id: payload.ownerChildProfileId || null,
    created_by: session.userId,
  });

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
  });

  const { error } = await client
    .from('events')
    .update({
      title: payload.title,
      notes,
      starts_at: startsAt,
      owner_user_id: payload.owner === 'mother' ? session.userId : null,
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
  const { data, error } = await client
    .from('staff_profiles')
    .select('id, name, date_of_birth, tasks_json')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    dateOfBirth: normalizeBirthDateValue(row.date_of_birth),
    tasks: Array.isArray(row.tasks_json) ? (row.tasks_json as StaffTaskDraftRecord[]) : [],
  }));
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
  const { data, error } = await client
    .from('recipes')
    .select('id, title, description, meal_type, cuisine, cook_time_minutes, servings, tags_json, classifiers_json, nutrition_per_serving_json, ingredients_json, steps_json, suitable_for_children, suitable_for_family')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || 'Custom recipe',
    mealType: row.meal_type as RecipeMealType,
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

export async function createRecipe(session: AppSession, recipe: Recipe) {
  const client = requireClient();
  const basePayload = {
    family_id: session.familyId,
    title: recipe.title,
    description: recipe.description,
    meal_type: recipe.mealType,
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
    created_by: session.userId,
  };
  const { data, error } = await client
    .from('recipes')
    .insert({
      ...basePayload,
      photo_url: recipe.photoUri || null,
    })
    .select('id')
    .single();

  if (isMissingRecipePhotoColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await client.from('recipes').insert(basePayload).select('id').single();
    if (fallbackError) throw fallbackError;
    return fallbackData.id as string;
  }

  if (error) throw error;
  return data.id as string;
}

export async function updateRecipe(session: AppSession, recipe: Recipe) {
  const client = requireClient();
  const basePayload = {
    family_id: session.familyId,
    title: recipe.title,
    description: recipe.description,
    meal_type: recipe.mealType,
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
  };
  const { error } = await client.from('recipes').update(basePayload).eq('id', recipe.id).eq('family_id', session.familyId);

  if (isMissingRecipePhotoColumnError(error)) {
    const { error: fallbackError } = await client
      .from('recipes')
      .update({
        family_id: session.familyId,
        title: recipe.title,
        description: recipe.description,
        meal_type: recipe.mealType,
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
      })
      .eq('id', recipe.id)
      .eq('family_id', session.familyId);
    if (fallbackError) throw fallbackError;
    return;
  }

  if (error) throw error;
}

export async function deleteRecipe(session: AppSession, recipeId: string) {
  const client = requireClient();
  const { error } = await client.from('recipes').delete().eq('id', recipeId).eq('family_id', session.familyId);
  if (error) throw error;
}

function isMissingRecipePhotoColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return message.includes("Could not find the 'photo_url' column of 'recipes'") || message.includes("column 'photo_url' of relation 'recipes' does not exist");
}

export async function getWeeklyMealPlanRecord(familyId: string): Promise<WeeklyMealPlanRecord> {
  const client = requireClient();
  const fullQuery = await client
    .from('weekly_meal_plans')
    .select('entries_json, profiles_json')
    .eq('family_id', familyId)
    .maybeSingle();

  const { data, error } = isMissingWeeklyMealPlanProfilesColumnError(fullQuery.error)
    ? await client
        .from('weekly_meal_plans')
        .select('entries_json')
        .eq('family_id', familyId)
        .maybeSingle()
    : fullQuery;

  if (isMissingWeeklyMealPlanTableError(error)) {
    throw new Error('Supabase weekly meal plan table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/weekly_meal_plans.sql in the Supabase SQL Editor, then refresh.');
  }
  if (error) throw error;
  if (!data) return { entries: [], profiles: [] };

  const record = data as {
    entries_json?: unknown;
    profiles_json?: unknown;
  };

  return {
    entries: Array.isArray(record.entries_json) ? (record.entries_json as WeeklyMealPlanEntry[]) : [],
    profiles: Array.isArray(record.profiles_json)
      ? record.profiles_json.filter(
          (item): item is MealPlanProfileRecord =>
            !!item && typeof item === 'object' && 'key' in item && 'label' in item && typeof item.key === 'string' && typeof item.label === 'string',
        )
      : [],
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
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'family_id' },
  );

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
    .select('id, title, list_type, completed_at, created_at, shopping_list_items(id, item_name, quantity, category, comment, purchased, sort_order, created_at)')
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
      })),
  }));
}

export async function createShoppingList(
  session: AppSession,
  title: string,
  items: Array<Pick<ShoppingItem, 'name' | 'quantity' | 'category' | 'comment' | 'purchased'>>,
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
    const extendedInsert = await client.from('shopping_list_items').insert(
      items.map((item, index) => ({
        list_id: data.id,
        item_name: item.name,
        quantity: item.quantity,
        category: item.category || null,
        comment: item.comment || null,
        purchased: item.purchased,
        sort_order: index,
      })),
    );
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

export async function updateShoppingListItems(session: AppSession, listId: string, items: ShoppingItem[]) {
  const client = requireClient();
  const { error: deleteError } = await client.from('shopping_list_items').delete().eq('list_id', listId);
  if (deleteError) throw deleteError;

  if (items.length === 0) return;

  const extendedInsert = await client.from('shopping_list_items').insert(
    items.map((item, index) => ({
      list_id: listId,
      item_name: item.name,
      quantity: item.quantity,
      category: item.category || null,
      comment: item.comment || null,
      purchased: item.purchased,
      sort_order: index,
    })),
  );
  if (isMissingShoppingListItemCategoryColumnError(extendedInsert.error)) {
    throw new Error(
      'Shopping item categories are not enabled in Supabase yet. Run /Users/ksu/promom/smart-mom-app/supabase/shopping_item_categories.sql in the Supabase SQL Editor, then save the list again.',
    );
  }
  if (extendedInsert.error) throw extendedInsert.error;
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
    .select('id, task_id, task_title, staff_name, completed_at, read')
    .eq('family_id', familyId)
    .order('completed_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    taskId: row.task_id || '',
    taskTitle: row.task_title,
    staffName: row.staff_name,
    completedAt: row.completed_at,
    read: row.read,
  }));
}

export async function createCompletedTaskNotification(
  session: AppSession,
  payload: Omit<CompletedTaskNotificationRecord, 'id'>,
) {
  const client = requireClient();
  const { error } = await client.from('completed_task_notifications').insert({
    family_id: session.familyId,
    task_id: payload.taskId || null,
    task_title: payload.taskTitle,
    staff_name: payload.staffName,
    completed_at: payload.completedAt,
    read: payload.read,
    created_by: session.userId,
  });
  if (error) throw error;
}

export async function markCompletedTaskNotificationsRead(session: AppSession) {
  const client = requireClient();
  const { error } = await client
    .from('completed_task_notifications')
    .update({ read: true })
    .eq('family_id', session.familyId)
    .eq('read', false);
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
    theme_name?: ThemeName | null;
    daily_card_date?: string | null;
    daily_card_id?: string | null;
    nutrition_goal?: NutritionGoal | null;
    activity_level?: ActivityLevel | null;
    nutrition_sex?: NutritionSex | null;
    desired_weight?: string | number | null;
    nutrition_pace?: NutritionPace | null;
    calorie_override?: string | number | null;
    active_meal_plan_profile?: string | null;
    period_reminders_enabled?: boolean | null;
    period_reminder_lead_days?: number | null;
  };

  return {
    parentLabel: record.parent_label,
    themeName: record.theme_name || undefined,
    dailyCardDate: record.daily_card_date || undefined,
    dailyCardId: record.daily_card_id || undefined,
    nutritionGoal: record.nutrition_goal || undefined,
    activityLevel: record.activity_level || undefined,
    nutritionSex: record.nutrition_sex || undefined,
    desiredWeight: record.desired_weight != null ? String(record.desired_weight) : undefined,
    nutritionPace: record.nutrition_pace || undefined,
    calorieOverride: record.calorie_override != null ? String(record.calorie_override) : undefined,
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
    ...('activeMealPlanProfile' in payload ? { active_meal_plan_profile: payload.activeMealPlanProfile || null } : {}),
    ...('periodRemindersEnabled' in payload ? { period_reminders_enabled: !!payload.periodRemindersEnabled } : {}),
    ...('periodReminderLeadDays' in payload ? { period_reminder_lead_days: payload.periodReminderLeadDays || null } : {}),
  };

  const { error } = await client.from('user_preferences').upsert(
    fullPayload,
    { onConflict: 'user_id' },
  );

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

export async function listHabitEntries(session: AppSession): Promise<HabitEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('habit_entries')
    .select('id, title, icon, color, target_text, enabled, built_in, mark_style, reminder_mode, reminder_time, completed_today, streak')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false });
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
    streak: Number(row.streak) || 0,
  }));
}

export async function replaceHabitEntries(session: AppSession, habits: HabitEntry[]) {
  const client = requireClient();
  const { error: deleteError } = await client.from('habit_entries').delete().eq('user_id', session.userId);
  if (isMissingHabitEntriesTableError(deleteError)) {
    throw new Error('Supabase habits table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.');
  }
  if (deleteError) throw deleteError;
  if (habits.length === 0) return;
  const { error } = await client.from('habit_entries').upsert(
    habits.map((habit) => ({
      id: habit.id,
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
    })),
    { onConflict: 'id' },
  );
  if (isMissingHabitEntriesTableError(error)) {
    throw new Error('Supabase habits table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.');
  }
  if (error) throw error;
}

export async function listNutritionEntries(session: AppSession): Promise<NutritionFoodEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('nutrition_entries')
    .select('id, name, meal_type, entry_date, calories, protein, fat, carbs, source_json')
    .eq('user_id', session.userId)
    .order('entry_date', { ascending: false });
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

  const nextIds = new Set(foods.map((food) => food.id));
  const buildRow = (food: CustomNutritionFood, omit: Set<string>) => {
    const row: Record<string, unknown> = {
      id: food.id,
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
    .select('id')
    .eq('user_id', session.userId);
  if (isMissingCustomNutritionFoodsTableError(existingError)) {
    throw new Error('Supabase custom nutrition foods table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/custom_nutrition_foods.sql in the Supabase SQL Editor, then try again.');
  }
  if (existingError) throw existingError;

  const staleIds = (existingRows ?? []).map((row) => row.id).filter((id) => !nextIds.has(id));
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
    .select('id')
    .eq('user_id', session.userId);
  if (isMissingNutritionEntriesTableError(existingError)) {
    throw new Error('Supabase nutrition table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.');
  }
  if (existingError) throw existingError;

  const staleIds = (existingRows ?? []).map((row) => row.id).filter((id) => !nextIds.has(id));
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
  return `${date}T${hh}:${mm}:00`;
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
  let hours = value.getHours();
  const minutes = value.getMinutes();
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

export async function listChores(session: AppSession): Promise<Chore[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('chores')
    .select('id, title, child_profile_id, recurrence, verifier, points, last_done_date, last_verified_date, sort_order')
    .eq('family_id', session.familyId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (isMissingHomeTableError(error, 'chores')) throw new Error(CHORES_MIGRATION_HINT);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    childId: row.child_profile_id || undefined,
    recurrence: (row.recurrence as Chore['recurrence']) || 'weekly',
    verifier: (row.verifier === 'parent' || row.verifier === 'nanny' ? row.verifier : 'self') as Chore['verifier'],
    points: Number(row.points) || 0,
    lastDoneDate: row.last_done_date || undefined,
    lastVerifiedDate: row.last_verified_date || undefined,
  }));
}

export async function replaceChores(session: AppSession, chores: Chore[]) {
  const client = requireClient();
  if (chores.length > 0) {
    const { error } = await client.from('chores').upsert(
      chores.map((chore, index) => ({
        id: chore.id,
        family_id: session.familyId,
        created_by: session.userId,
        title: chore.title,
        child_profile_id: chore.childId || null,
        recurrence: chore.recurrence,
        verifier: chore.verifier,
        points: chore.points || 0,
        last_done_date: chore.lastDoneDate || null,
        last_verified_date: chore.lastVerifiedDate || null,
        sort_order: index,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' },
    );
    if (isMissingHomeTableError(error, 'chores')) throw new Error(CHORES_MIGRATION_HINT);
    if (error) throw error;
  }
  const keepIds = chores.map((chore) => chore.id);
  let removal = client.from('chores').delete().eq('family_id', session.familyId);
  if (keepIds.length > 0) removal = removal.not('id', 'in', `(${keepIds.join(',')})`);
  const { error: deleteError } = await removal;
  if (deleteError && !isMissingHomeTableError(deleteError, 'chores')) throw deleteError;
}
