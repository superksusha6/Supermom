export type Role = 'mother' | 'child' | 'staff' | 'admin';

export type TaskPriority = 'urgent' | 'non_urgent';
export type TaskStatus = 'new' | 'in_progress' | 'done';

export type CalendarScope = 'my_only' | 'all';
export type WeekDayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type ChildActivity = {
  id: string;
  name: string;
  timesPerWeek: number;
  time?: string;
  color?: string;
  weekDays?: WeekDayCode[];
  timeSlots?: string[];
};

export type ChildProfile = {
  id: string;
  name: string;
  age: number;
  dateOfBirth?: string;
  includeInMotherCalendar?: boolean;
  activities: ChildActivity[];
};

export type PersonalProfile = {
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
};

export type CycleDayEntry = {
  date: string;
  flowLevel?: string;
  dischargeType?: string;
  feelings?: string[];
  pains?: string[];
  sleepQuality?: string;
  sleepHours?: number;
  sleepMinutes?: number;
  isPeriodStart?: boolean;
};

export type NutritionGoal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'low' | 'moderate' | 'high';
export type NutritionSex = 'female' | 'male';
export type NutritionPace = 'fast' | 'flexible';
export type NutritionMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type HabitReminderMode = 'off' | 'smart' | 'custom';

export type NutritionFoodEntry = {
  id: string;
  name: string;
  mealType: NutritionMealType;
  date: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
};

export type HabitEntry = {
  id: string;
  title: string;
  icon: string;
  color: string;
  targetText: string;
  enabled: boolean;
  builtIn?: boolean;
  markStyle?: 'circle' | 'check' | 'heart' | 'star' | 'diamond';
  reminderMode?: HabitReminderMode;
  reminderTime?: string;
  completedToday: boolean;
  streak: number;
};

export type HabitChallenge = {
  id: string;
  title: string;
  subtitle: string;
  progressCurrent: number;
  progressTotal: number;
  accent: string;
};

export type TaskItem = {
  id: string;
  title: string;
  assigneeRole: Role;
  assigneeName: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  needsParentApproval: boolean;
};

export type ApprovalRequest = {
  id: string;
  taskId: string;
  requestedBy: 'child';
  action: 'delete' | 'critical_edit';
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  owner: Role;
  ownerName: string;
  ownerChildProfileId?: string;
  date: string;
  time: string;
  category?: string;
  color?: string;
  motherColor?: string;
  staffColor?: string;
  visibility?: 'shared' | 'staff_private';
};

export type ImportedEmailEvent = {
  id: string;
  sourceKind?: 'email' | 'file';
  sourceLabel: string;
  sender?: string;
  subject?: string;
  fileName?: string;
  mimeType?: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  notes?: string;
  confidence?: number;
  status: 'pending' | 'ignored' | 'added';
};

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  comment?: string;
  purchased: boolean;
};

export type ShoppingListDoc = {
  id: string;
  title: string;
  createdAt: string;
  items: ShoppingItem[];
};

export type ShoppingShare = {
  id: string;
  listId: string;
  title: string;
  createdAt: string;
  senderLabel: string;
  recipientKey: string;
  recipientLabel: string;
  items: ShoppingItem[];
};

export type PurchaseRequest = {
  id: string;
  itemName: string;
  quantity: string;
  comment?: string;
  requestedBy: string;
  createdAt: string;
  status: 'new' | 'added' | 'dismissed';
};

export type FridgeItemStatus = 'full' | 'low' | 'out';

export type FridgeItem = {
  id: string;
  name: string;
  quantity: string;
  category?: string;
  note?: string;
  status: FridgeItemStatus;
};

export type RecipeMealType = 'breakfast' | 'lunch' | 'main_dish' | 'soups' | 'desserts' | 'baking';
export type RecipeClassifier = 'kids' | 'healthy' | 'vegetarian' | 'family' | 'quick';

export type RecipeIngredient = {
  id: string;
  name: string;
  amount: string;
  optional?: boolean;
};

export type RecipeStep = {
  id: string;
  text: string;
};

export type RecipeNutrition = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  mealType: RecipeMealType;
  cuisine?: string;
  cookTimeMinutes: number;
  servings: number;
  tags: string[];
  classifiers: RecipeClassifier[];
  nutritionPerServing: RecipeNutrition;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  photoUri?: string;
  suitableForChildren?: boolean;
  suitableForFamily?: boolean;
};

export type MealPlanSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type WeeklyMealPlanEntry = {
  id: string;
  profileKey?: string;
  dayKey: string;
  dayLabel: string;
  slot: MealPlanSlot;
  recipeId?: string;
  customItems?: Array<{
    id: string;
    title: string;
    grams?: number;
    calories?: number;
  }>;
  customTitle?: string;
  customCalories?: number;
  customGrams?: number;
  customHideCalories?: boolean;
  customNote?: string;
};
