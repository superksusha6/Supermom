# Recipe Library Plan

## Best source options

### 1. TheMealDB
- Type: lightweight recipe API
- Good for: quick starter import, demos, world cuisines
- Strengths:
  - free test key for development
  - recipes, ingredients, instructions, area/cuisine, category
  - simple API
- Weaknesses:
  - much smaller library than large datasets
  - metadata is limited

### 2. Edamam Recipe Search API
- Type: commercial recipe API
- Good for: structured production search
- Strengths:
  - meal type, dish type, cuisine type
  - nutrition-aware ecosystem
  - strong filtering
- Weaknesses:
  - paid limits
  - external-content licensing constraints

### 3. Food.com recipes datasets
- Type: large offline datasets
- Good for: building our own internal recipe library
- Strengths:
  - huge volume
  - ingredients, steps, tags, categories, servings, nutrition in many variants
  - best source for bulk import and classification
- Weaknesses:
  - requires cleaning and normalization
  - not all variants have clean nutrition/photo fields

### 4. 64K Dishes datasets
- Type: structured offline datasets
- Good for: clean initial seeding
- Strengths:
  - ready categories/subcategories
  - JSON-like ingredients and directions
  - easier to normalize than raw scraped corpora
- Weaknesses:
  - smaller than Food.com family
  - quality depends on the dataset version

## Recommended stack

### Phase 1
- Use `TheMealDB` for fast visible expansion in the app.
- Keep custom family recipes in Supabase.

### Phase 2
- Add a bulk import pipeline from a large dataset like `Food.com` or `64K Dishes`.
- Normalize all imported recipes into one internal shape.

### Phase 3
- Optionally add `Edamam` only if we need premium search or advanced nutrition metadata.

## Internal recipe taxonomy

We should separate recipe organization into 4 layers instead of one flat field.

### A. Meal slot
- breakfast
- brunch
- lunch
- dinner
- snack
- teatime

### B. Main section
- breakfast
- lunch
- main_dish
- soups
- salads
- sides
- appetizers
- sandwiches
- pasta
- pizza
- desserts
- baking
- drinks
- sauces
- meal_prep

### C. Dish subtype
- porridge
- omelet
- pancakes
- cereal
- soup
- stew
- salad
- pasta
- rice
- chicken
- meat
- fish
- seafood
- vegetable
- sandwich
- pastry
- cake
- cookies
- bread
- smoothie
- sauce

### D. Lifestyle / audience tags
- kids
- family
- healthy
- quick
- vegetarian
- vegan
- gluten_free
- dairy_free
- high_protein
- low_sugar
- budget
- lunchbox
- freezer_friendly
- holiday

## Mapping from external sources

### TheMealDB
- `Category` -> main section
- `Area` -> cuisine
- ingredient lines -> ingredients
- instructions -> steps

### Edamam
- `mealType` -> meal slot
- `dishType` -> main section or subtype
- `cuisineType` -> cuisine
- health/diet labels -> lifestyle tags

### Food.com
- site category + tags -> main section + lifestyle tags
- recipe name + instructions -> subtype inference

## What should change in our app next

### Current limitation
Current local types are too narrow:
- meal types: `breakfast | lunch | main_dish | soups | desserts | baking`
- classifiers: `kids | healthy | vegetarian | family | quick`

### Next schema target
We should expand recipes to support:
- `mealSlot`
- `section`
- `subtype`
- `cuisine`
- `tags[]`

This will let us filter by:
- meal time
- recipe family
- dietary style
- audience
- cuisine

## First import priority

If we want the fastest visible improvement for the app:
1. Breakfasts
2. Soups
3. Main dishes
4. Desserts
5. Baking
6. Kids lunchbox meals
7. Quick family meals

## Starter category pack

### Breakfast
- porridge
- omelet
- pancakes
- cottage cheese dishes
- yogurt bowls
- smoothies

### Lunch
- soups
- salads
- rice bowls
- pasta
- sandwiches

### Main dishes
- chicken
- beef
- fish
- vegetarian mains
- casseroles

### Desserts
- cakes
- cookies
- bars
- puddings

### Baking
- bread
- muffins
- pies
- pastries

## Implementation recommendation

Best practical path for this project:
- keep custom recipes in Supabase
- add richer taxonomy to local types and Supabase schema
- seed the first library from a clean structured source
- later add optional API-powered discovery
