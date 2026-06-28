export type Role = 'mother' | 'child' | 'staff' | 'admin';

export type TaskPriority = 'urgent' | 'non_urgent';
export type TaskStatus = 'new' | 'in_progress' | 'done';

export type CalendarScope = 'my' | 'family';
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
export type NutritionMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type HabitReminderMode = 'off' | 'smart' | 'custom';

export type NutritionEntrySource = {
  displayName: string;
  brand?: string;
  grams: string;
  baseMode: '100g' | '100ml' | 'serving';
  baseQuantity: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  servingGrams?: number;
};

export type NutritionFoodEntry = {
  id: string;
  name: string;
  mealType: NutritionMealType;
  date: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  source?: NutritionEntrySource;
};

export type NutritionMacros = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type CustomNutritionFood = {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  servingGrams?: number;
  // Independent per-serving values (used as-is, not converted from grams).
  serving?: NutritionMacros;
  baseMode: '100g' | '100ml' | 'serving';
  baseQuantity: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type HomeIssueUrgency = 'urgent' | 'normal' | 'low';
export type HomeIssueStatus = 'new' | 'scheduled' | 'done';

export type HomeIssue = {
  id: string;
  title: string;
  description?: string;
  category: string;
  location?: string;
  urgency: HomeIssueUrgency;
  status: HomeIssueStatus;
  reportedBy?: string;
  providerId?: string;
  cost?: number;
  scheduledAt?: string;
  resolvedAt?: string;
  createdAt?: string;
};

export type HomeProvider = {
  id: string;
  name: string;
  category?: string;
  phone?: string;
  notes?: string;
};

export type ChoreRecurrence = 'daily' | 'weekly' | 'once';
export type ChoreStatus = 'todo' | 'done' | 'verified';
export type ChoreVerifier = 'self' | 'parent' | 'nanny';

export type Chore = {
  id: string;
  title: string;
  childId?: string;
  recurrence: ChoreRecurrence;
  verifier: ChoreVerifier;
  points: number;
  // Date (YYYY-MM-DD) the chore was last marked done / verified. "Done for the
  // current period" is derived from these + recurrence, so it resets each day/week.
  lastDoneDate?: string;
  lastVerifiedDate?: string;
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
  endTime?: string;
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
  category?: ShoppingItemCategory;
  comment?: string;
  purchased: boolean;
};

export type ShoppingPurchaseEvent = {
  purchasedAt: string;
  quantity: string;
};

export type ShoppingItemInsight = {
  normalizedName: string;
  displayName: string;
  category?: ShoppingItemCategory;
  purchaseCount: number;
  lastPurchasedAt: string;
  averageRestockDays?: number;
  events: ShoppingPurchaseEvent[];
};

export type ShoppingItemCategory = 'products' | 'pharmacy' | 'household' | 'personal_care' | 'kids' | 'drinks' | 'other';

export type ShoppingListType = 'base' | 'current' | 'history';

export type ShoppingListDoc = {
  id: string;
  title: string;
  listType?: ShoppingListType;
  createdAt: string;
  completedAt?: string;
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

export type FridgeItemUnit = 'pcs' | 'g' | 'kg' | 'ml' | 'l' | 'pack' | 'bottle' | 'jar';

export type FridgeItemCategory =
  | 'Dairy'
  | 'Meat / Fish'
  | 'Vegetables'
  | 'Fruits'
  | 'Drinks'
  | 'Snacks'
  | 'Frozen'
  | 'Pantry'
  | 'Home stock'
  | 'Pharmacy'
  | 'Baby / Kids'
  | 'Other';

export type FridgeItem = {
  id: string;
  name: string;
  quantity: string;
  amount?: number;
  unit?: FridgeItemUnit;
  category?: FridgeItemCategory;
  note?: string;
  expiresAt?: string;
  opened?: boolean;
  status: FridgeItemStatus;
};

export type RecipeMealType =
  | 'breakfast'
  | 'brunch'
  | 'lunch'
  | 'dinner'
  | 'main_dish'
  | 'soups'
  | 'salads'
  | 'sides'
  | 'appetizers'
  | 'sandwiches'
  | 'pasta'
  | 'pizza'
  | 'desserts'
  | 'baking'
  | 'drinks'
  | 'sauces'
  | 'meal_prep';
export type RecipeClassifier =
  | 'kids'
  | 'healthy'
  | 'vegetarian'
  | 'family'
  | 'quick'
  | 'vegan'
  | 'gluten_free'
  | 'dairy_free'
  | 'high_protein'
  | 'low_sugar'
  | 'budget'
  | 'lunchbox'
  | 'freezer_friendly'
  | 'holiday';

export type RecipeIngredient = {
  id: string;
  name: string;
  amount: string;
  optional?: boolean;
  // Verified-nutrition authoring fields. `grams` is the canonical mass (or ml for
  // liquids) used to compute macros; `foodRef` pins the ingredient to a specific
  // nutrition source (preset id, `usda-<fdcId>`, or `off-<code>`) so the match is
  // deterministic instead of relying on name lookup.
  grams?: number;
  foodRef?: string;
};

// A single selectable alternative inside a RecipeChoice. `ingredient` is the food
// this option adds to the recipe; omit it for a "none / remove" option (e.g. no
// sweetener) so the option contributes nothing.
export type RecipeChoiceOption = {
  id: string;
  label: string;
  ingredient?: RecipeIngredient;
};

// A curated customization slot on a recipe (e.g. liquid: milk/water, sweetener:
// sugar/honey/none). The user picks one option; nutrition recomputes live. Slots
// are authored deliberately so swaps stay sensible (no flour→oil nonsense).
export type RecipeChoice = {
  id: string;
  label: string;
  defaultOptionId: string;
  options: RecipeChoiceOption[];
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
  mealSlot?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'snack';
  subtype?: string;
  cuisine?: string;
  cookTimeMinutes: number;
  servings: number;
  tags: string[];
  classifiers: RecipeClassifier[];
  nutritionPerServing: RecipeNutrition;
  // 'verified' = every ingredient has explicit grams + foodRef and macros were
  // computed deterministically; 'approx' = at least one ingredient fell back to a
  // name match or estimated amount. Drives the "≈ approx" label in the UI.
  nutritionConfidence?: 'verified' | 'approx';
  // Always-present base ingredients. `nutritionPerServing` is computed for the
  // default selection of `choices`.
  ingredients: RecipeIngredient[];
  // Optional customization slots (liquid, sweetener, add-ons). When present the UI
  // lets the user switch/remove and recomputes nutrition for the chosen selection.
  choices?: RecipeChoice[];
  steps: RecipeStep[];
  photoUri?: string;
  // Attribution for stock photos (e.g. Pexels) — shown as small credit text.
  photoCredit?: { name: string; url: string; source: string };
  suitableForChildren?: boolean;
  suitableForFamily?: boolean;
};

export type MealPlanSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type WeeklyMealPlanEntry = {
  id: string;
  profileKey?: string;
  profileLabel?: string;
  dayKey: string;
  dayLabel: string;
  slot: MealPlanSlot;
  recipeId?: string;
  // Chosen recipe customization (choiceId -> optionId) for this planned slot, so the
  // planner shows the customized nutrition/ingredients. Absent = recipe defaults.
  recipeSelection?: Record<string, string>;
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
