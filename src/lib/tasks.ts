import {
  ApprovalRequest,
  CalendarEvent,
  ChildProfile,
  CycleDayEntry,
  HabitEntry,
  NutritionFoodEntry,
  PersonalProfile,
  PurchaseRequest,
  Recipe,
  RecipeClassifier,
  RecipeMealType,
  Role,
  ShoppingItem,
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

export async function sendPasswordResetEmail(email: string) {
  const client = requireClient();
  const { error } = await client.auth.resetPasswordForEmail(email);
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
    cycle_tracking_enabled: !!payload.cycleTrackingEnabled,
    cycle_last_period_start: toStorageBirthDate(payload.cycleLastPeriodStart),
    cycle_length_days: toNullableInt(payload.cycleLengthDays),
    cycle_period_length_days: toNullableInt(payload.cyclePeriodLengthDays),
    cycle_entries_json: payload.cycleEntries || [],
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
    const owner: Role = row.owner_child_profile_id ? 'child' : (meta.owner as Role) || 'mother';

    return {
      id: row.id,
      title: row.title,
      owner,
      ownerName: meta.ownerName || (owner === 'child' ? 'Child' : owner === 'staff' ? 'Staff' : 'Mother'),
      ownerChildProfileId: row.owner_child_profile_id || undefined,
      date,
      time,
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

function isMissingRecipePhotoColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return message.includes("Could not find the 'photo_url' column of 'recipes'") || message.includes("column 'photo_url' of relation 'recipes' does not exist");
}

export async function listWeeklyMealPlan(familyId: string): Promise<WeeklyMealPlanEntry[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('weekly_meal_plans')
    .select('entries_json')
    .eq('family_id', familyId)
    .maybeSingle();

  if (isMissingWeeklyMealPlanTableError(error)) {
    throw new Error('Supabase weekly meal plan table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/weekly_meal_plans.sql in the Supabase SQL Editor, then refresh.');
  }
  if (error) throw error;
  if (!data || !Array.isArray(data.entries_json)) return [];
  return data.entries_json as WeeklyMealPlanEntry[];
}

export async function upsertWeeklyMealPlan(session: AppSession, entries: WeeklyMealPlanEntry[]) {
  const client = requireClient();
  const { error } = await client.from('weekly_meal_plans').upsert(
    {
      family_id: session.familyId,
      entries_json: entries,
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'family_id' },
  );

  if (isMissingWeeklyMealPlanTableError(error)) {
    throw new Error('Supabase weekly meal plan table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/weekly_meal_plans.sql in the Supabase SQL Editor, then try again.');
  }
  if (error) throw error;
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
  const { data, error } = await client
    .from('shopping_lists')
    .select('id, title, created_at, shopping_list_items(id, item_name, quantity, comment, purchased, sort_order, created_at)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    items: [...(row.shopping_list_items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .map((item) => ({
        id: item.id,
        name: item.item_name,
        quantity: item.quantity,
        comment: item.comment || undefined,
        purchased: item.purchased,
      })),
  }));
}

export async function createShoppingList(
  session: AppSession,
  title: string,
  items: Array<Pick<ShoppingItem, 'name' | 'quantity' | 'comment' | 'purchased'>>,
) {
  const client = requireClient();
  const { data, error } = await client
    .from('shopping_lists')
    .insert({
      family_id: session.familyId,
      title,
      created_by: session.userId,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (items.length > 0) {
    const { error: itemsError } = await client.from('shopping_list_items').insert(
      items.map((item, index) => ({
        list_id: data.id,
        item_name: item.name,
        quantity: item.quantity,
        comment: item.comment || null,
        purchased: item.purchased,
        sort_order: index,
      })),
    );
    if (itemsError) throw itemsError;
  }

  return data.id as string;
}

export async function updateShoppingListItems(session: AppSession, listId: string, items: ShoppingItem[]) {
  const client = requireClient();
  const { error: deleteError } = await client.from('shopping_list_items').delete().eq('list_id', listId);
  if (deleteError) throw deleteError;

  if (items.length === 0) return;

  const { error: insertError } = await client.from('shopping_list_items').insert(
    items.map((item, index) => ({
      list_id: listId,
      item_name: item.name,
      quantity: item.quantity,
      comment: item.comment || null,
      purchased: item.purchased,
      sort_order: index,
    })),
  );
  if (insertError) throw insertError;
}

export async function deleteShoppingList(session: AppSession, listId: string) {
  const client = requireClient();
  const { error } = await client.from('shopping_lists').delete().eq('family_id', session.familyId).eq('id', listId);
  if (error) throw error;
}

export async function toggleShoppingItemPurchased(itemId: string, purchased: boolean) {
  const client = requireClient();
  const { error } = await client.from('shopping_list_items').update({ purchased }).eq('id', itemId);
  if (error) throw error;
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
  const { data, error } = await client
    .from('user_preferences')
    .select('parent_label, theme_name')
    .eq('user_id', session.userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    parentLabel: data.parent_label as 'Mom' | 'Dad',
    themeName: (data.theme_name as ThemeName | null) || undefined,
  };
}

export async function upsertUserPreferences(
  session: AppSession,
  payload: Partial<UserPreferencesRecord>,
) {
  const client = requireClient();
  const { error } = await client.from('user_preferences').upsert(
    {
      user_id: session.userId,
      family_id: session.familyId,
      parent_label: payload.parentLabel || 'Mom',
      theme_name: payload.themeName || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
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
    .select('id, name, meal_type, entry_date, calories, protein, fat, carbs')
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
  }));
}

export async function replaceNutritionEntries(session: AppSession, entries: NutritionFoodEntry[]) {
  const client = requireClient();
  const { error: deleteError } = await client.from('nutrition_entries').delete().eq('user_id', session.userId);
  if (isMissingNutritionEntriesTableError(deleteError)) {
    throw new Error('Supabase nutrition table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.');
  }
  if (deleteError) throw deleteError;
  if (entries.length === 0) return;
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
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'id' },
  );
  if (isMissingNutritionEntriesTableError(error)) {
    throw new Error('Supabase nutrition table is missing. Run /Users/ksu/promom/smart-mom-app/supabase/habits_nutrition.sql in the Supabase SQL Editor, then try again.');
  }
  if (error) throw error;
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
