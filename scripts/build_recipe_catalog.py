from __future__ import annotations

import ast
import csv
import heapq
import json
import math
import re
import zipfile
from collections import defaultdict
from pathlib import Path


ROOT = Path("/Users/ksu/promom/smart-mom-app")
SOURCE_ZIP = Path("/Users/ksu/Downloads/recipes.csv.zip")
OUTPUT_TS = ROOT / "src/lib/generated/importedRecipeCatalog.ts"

SECTION_LIMITS = {
    "breakfast": 18,
    "brunch": 8,
    "lunch": 16,
    "dinner": 16,
    "main_dish": 24,
    "soups": 14,
    "salads": 12,
    "sides": 10,
    "appetizers": 8,
    "sandwiches": 8,
    "pasta": 10,
    "pizza": 6,
    "desserts": 22,
    "baking": 18,
    "drinks": 12,
    "sauces": 10,
    "meal_prep": 8,
}

MEAT_WORDS = {
    "chicken",
    "beef",
    "pork",
    "turkey",
    "lamb",
    "bacon",
    "ham",
    "sausage",
    "shrimp",
    "salmon",
    "tuna",
    "fish",
    "anchovy",
    "crab",
    "meat",
    "steak",
    "veal",
    "duck",
}

HEALTHY_WORDS = {
    "healthy",
    "low-fat",
    "low fat",
    "low cholesterol",
    "vegetable",
    "salad",
    "smoothie",
    "fruit",
    "chicken breast",
    "high protein",
}

HOLIDAY_WORDS = {
    "christmas",
    "thanksgiving",
    "easter",
    "holiday",
    "halloween",
    "valentine",
}


def parse_r_c_list(raw: str) -> list[str]:
    raw = (raw or "").strip()
    if not raw or raw == "character(0)" or raw == "c()":
        return []
    if raw.startswith("c(") and raw.endswith(")"):
        raw = raw[2:-1]
    raw = raw.replace("\n", " ")
    try:
        values = ast.literal_eval("[" + raw + "]")
    except Exception:
        return []
    items: list[str] = []
    for value in values:
        text = str(value).strip()
        if text and text.lower() != "nan":
            items.append(text)
    return items


def parse_iso_minutes(value: str) -> int:
    value = (value or "").strip()
    if not value.startswith("PT"):
        return 0
    hours = re.search(r"(\d+)H", value)
    minutes = re.search(r"(\d+)M", value)
    return int(hours.group(1)) * 60 if hours else 0 + (int(minutes.group(1)) if minutes else 0)


def parse_numeric(value: str) -> float:
    try:
        return float(str(value).strip())
    except Exception:
        return 0.0


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:72] or "recipe"


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").replace("\\n", " ")).strip()


def classify_meal_type(title: str, category: str, keywords: list[str]) -> str:
    text = f"{title} {category} {' '.join(keywords)}".lower()
    if any(word in text for word in ["smoothie", "lemonade", "juice", "drink", "beverage", "cocktail", "tea", "coffee"]):
        return "drinks"
    if any(word in text for word in ["sauce", "gravy", "dressing", "dip", "spread", "marinade", "salsa", "pesto"]):
        return "sauces"
    if any(word in text for word in ["pizza", "calzone", "flatbread pizza"]):
        return "pizza"
    if any(word in text for word in ["pasta", "spaghetti", "macaroni", "lasagna", "fettuccine", "penne", "linguine", "noodle casserole"]):
        return "pasta"
    if any(word in text for word in ["sandwich", "burger", "wrap", "toastie", "panini", "quesadilla", "sloppy joe"]):
        return "sandwiches"
    if any(word in text for word in ["appetizer", "canape", "snack mix", "finger food", "dip", "stuffed mushroom"]):
        return "appetizers"
    if any(word in text for word in ["salad", "slaw", "tabbouleh", "coleslaw"]):
        return "salads"
    if any(word in text for word in ["soup", "chowder", "bisque", "broth", "gazpacho", "stew"]):
        return "soups"
    if any(word in text for word in ["bread", "muffin", "cookie", "brownie", "cake", "pie", "biscuit", "scone", "quick bread", "yeast bread", "roll"]):
        return "baking" if any(word in text for word in ["bread", "muffin", "scone", "biscuit", "quick bread", "yeast bread", "roll"]) else "desserts"
    if any(word in text for word in ["dessert", "ice cream", "cheesecake", "pudding", "candy", "frozen dessert", "bar cookie", "trifle"]):
        return "desserts"
    if any(word in text for word in ["breakfast", "omelet", "omelette", "pancake", "waffle", "granola", "oatmeal", "porridge", "cereal", "french toast", "breakfast casserole", "egg"]):
        return "breakfast"
    if "brunch" in text:
        return "brunch"
    if any(word in text for word in ["lunch", "lunch/snacks"]):
        return "lunch"
    if any(word in text for word in ["side", "potato", "rice", "beans", "vegetable", "side dish"]):
        return "sides"
    if any(word in text for word in ["meal prep", "freezer", "make ahead", "batch"]):
        return "meal_prep"
    if any(word in text for word in ["dinner", "one dish meal", "casserole", "curry", "skillet", "roast", "meat", "chicken", "pork", "beef", "seafood"]):
        return "main_dish"
    return "dinner"


def classify_meal_type_fast(title: str, category: str, keywords_raw: str) -> str:
    text = f"{title} {category} {keywords_raw}".lower()
    if any(word in text for word in ["smoothie", "lemonade", "juice", "drink", "beverage", "cocktail", "tea", "coffee"]):
        return "drinks"
    if any(word in text for word in ["sauce", "gravy", "dressing", "dip", "spread", "marinade", "salsa", "pesto"]):
        return "sauces"
    if "pizza" in text or "calzone" in text:
        return "pizza"
    if any(word in text for word in ["pasta", "spaghetti", "macaroni", "lasagna", "fettuccine", "penne", "linguine", "pasta shells"]):
        return "pasta"
    if any(word in text for word in ["sandwich", "burger", "wrap", "panini", "quesadilla", "sloppy joe"]):
        return "sandwiches"
    if any(word in text for word in ["appetizer", "canape", "finger food", "stuffed mushroom"]):
        return "appetizers"
    if any(word in text for word in ["salad", "slaw", "tabbouleh", "coleslaw"]):
        return "salads"
    if any(word in text for word in ["soup", "chowder", "bisque", "broth", "gazpacho", "stew"]):
        return "soups"
    if any(word in text for word in ["bread", "muffin", "cookie", "brownie", "cake", "pie", "biscuit", "scone", "quick bread", "yeast bread", "roll"]):
        return "baking" if any(word in text for word in ["bread", "muffin", "scone", "biscuit", "quick bread", "yeast bread", "roll"]) else "desserts"
    if any(word in text for word in ["dessert", "ice cream", "cheesecake", "pudding", "candy", "frozen dessert", "bar cookie", "trifle"]):
        return "desserts"
    if any(word in text for word in ["breakfast", "omelet", "omelette", "pancake", "waffle", "granola", "oatmeal", "porridge", "cereal", "french toast", "egg"]):
        return "breakfast"
    if "brunch" in text:
        return "brunch"
    if "lunch" in text:
        return "lunch"
    if any(word in text for word in ["side", "potato", "rice", "beans", "vegetable", "side dish"]):
        return "sides"
    if any(word in text for word in ["meal prep", "freezer", "make ahead", "batch"]):
        return "meal_prep"
    if any(word in text for word in ["one dish meal", "casserole", "curry", "skillet", "roast", "meat", "chicken", "pork", "beef", "seafood"]):
        return "main_dish"
    return "dinner"


def classify_meal_slot(meal_type: str) -> str:
    if meal_type in {"breakfast", "brunch"}:
        return meal_type
    if meal_type in {"drinks", "appetizers", "desserts", "baking"}:
        return "snack"
    if meal_type in {"salads", "soups", "sandwiches", "lunch"}:
        return "lunch"
    return "dinner"


def build_classifiers(title: str, category: str, keywords: list[str], ingredients: list[str], servings: int) -> list[str]:
    text = f"{title} {category} {' '.join(keywords)} {' '.join(ingredients)}".lower()
    result: list[str] = []
    if "kid" in text:
        result.append("kids")
    if "family" in text or servings >= 4:
        result.append("family")
    if any(word in text for word in HEALTHY_WORDS):
        result.append("healthy")
    if "vegetarian" in text or (not any(word in text for word in MEAT_WORDS) and any(word in text for word in ["vegetable", "salad", "pasta", "bread", "dessert", "smoothie", "soup"])):
        result.append("vegetarian")
    if "vegan" in text:
        result.append("vegan")
    if "gluten free" in text or "gluten-free" in text:
        result.append("gluten_free")
    if "dairy free" in text or "dairy-free" in text:
        result.append("dairy_free")
    protein = sum(1 for item in ingredients if any(word in item.lower() for word in ["chicken", "beef", "turkey", "egg", "salmon", "tuna", "shrimp", "beans", "lentil", "yogurt"]))
    if protein >= 2:
        result.append("high_protein")
    if any(word in text for word in ["low sugar", "sugar free", "sugar-free"]):
        result.append("low_sugar")
    if any(word in text for word in ["cheap", "budget", "inexpensive"]) or len(ingredients) <= 6:
        result.append("budget")
    if any(word in text for word in ["lunchbox", "lunch box", "portable", "muffin", "wrap", "sandwich"]):
        result.append("lunchbox")
    if any(word in text for word in ["freezer", "make ahead", "make-ahead"]):
        result.append("freezer_friendly")
    if any(word in text for word in HOLIDAY_WORDS):
        result.append("holiday")
    if any(word in text for word in ["quick", "< 30 mins", "< 15 mins"]):
        result.append("quick")
    return sorted(dict.fromkeys(result))


def score_recipe(row: dict[str, str], meal_type: str, instructions: list[str], ingredients: list[str]) -> float:
    rating = parse_numeric(row.get("AggregatedRating"))
    reviews = parse_numeric(row.get("ReviewCount"))
    calories = parse_numeric(row.get("Calories"))
    desc = clean_text(row.get("Description", ""))
    score = rating * 20 + math.log1p(reviews) * 12
    if len(instructions) >= 3:
        score += 14
    if len(ingredients) >= 4:
        score += 10
    if row.get("Images"):
        score += 8
    if desc and "make and share this" not in desc.lower():
        score += 4
    if meal_type in {"breakfast", "main_dish", "soups", "desserts", "baking"}:
        score += 3
    if calories > 0:
        score += 2
    return score


def first_image(raw: str) -> str | None:
    images = parse_r_c_list(raw)
    return images[0] if images else None


def parse_instructions(raw: str) -> list[str]:
    parts = parse_r_c_list(raw)
    if parts:
        return [clean_text(part) for part in parts if clean_text(part)]
    text = clean_text(raw)
    if not text:
        return []
    chunks = [clean_text(chunk) for chunk in re.split(r"(?<=[.!?])\s+", text) if clean_text(chunk)]
    return chunks


def build_recipe(row: dict[str, str], meal_type: str) -> dict:
    title = clean_text(row["Name"])
    description = clean_text(row.get("Description", "")) or f"{title} from the imported recipe library."
    keywords = parse_r_c_list(row.get("Keywords", ""))
    ingredient_parts = parse_r_c_list(row.get("RecipeIngredientParts", ""))
    ingredient_quantities = parse_r_c_list(row.get("RecipeIngredientQuantities", ""))
    instructions = parse_instructions(row.get("RecipeInstructions", ""))
    servings = max(1, int(parse_numeric(row.get("RecipeServings")) or 1))
    classifiers = build_classifiers(title, row.get("RecipeCategory", ""), keywords, ingredient_parts, servings)
    tags = sorted(dict.fromkeys(
        [slugify(row.get("RecipeCategory", "")).replace("-", "_")] +
        [slugify(keyword).replace("-", "_") for keyword in keywords[:8] if keyword] +
        ([slugify(meal_type)] if meal_type else [])
    ))
    tags = [tag for tag in tags if tag and tag != "recipe"]
    cook_time = parse_iso_minutes(row.get("CookTime", "")) or parse_iso_minutes(row.get("TotalTime", "")) or parse_iso_minutes(row.get("PrepTime", ""))
    return {
        "id": f"imported-{row['RecipeId']}",
        "title": title,
        "description": description[:220],
        "mealType": meal_type,
        "mealSlot": classify_meal_slot(meal_type),
        "subtype": clean_text(row.get("RecipeCategory", ""))[:80] or meal_type.replace("_", " "),
        "cuisine": None,
        "cookTimeMinutes": cook_time,
        "servings": servings,
        "tags": tags[:12],
        "classifiers": classifiers,
        "nutritionPerServing": {
            "calories": round(parse_numeric(row.get("Calories"))),
            "protein": round(parse_numeric(row.get("ProteinContent")), 1),
            "fat": round(parse_numeric(row.get("FatContent")), 1),
            "carbs": round(parse_numeric(row.get("CarbohydrateContent")), 1),
        },
        "ingredients": [
            {
                "id": f"ing-{row['RecipeId']}-{index}",
                "name": ingredient,
                "amount": clean_text(ingredient_quantities[index]) if index < len(ingredient_quantities) and clean_text(ingredient_quantities[index]) else "to taste",
            }
            for index, ingredient in enumerate(ingredient_parts[:18])
            if clean_text(ingredient)
        ],
        "steps": [
            {"id": f"step-{row['RecipeId']}-{index}", "text": step}
            for index, step in enumerate(instructions[:12])
            if step
        ],
        "photoUri": first_image(row.get("Images", "")),
        "suitableForChildren": "kids" in classifiers,
        "suitableForFamily": "family" in classifiers or servings >= 4,
    }


def prune_nones(value):
    if isinstance(value, dict):
        return {key: prune_nones(inner) for key, inner in value.items() if inner is not None}
    if isinstance(value, list):
        return [prune_nones(item) for item in value]
    return value


def main() -> None:
    if not SOURCE_ZIP.exists():
        raise SystemExit(f"Missing source file: {SOURCE_ZIP}")

    picked: dict[str, list[tuple[float, int, dict]]] = defaultdict(list)
    seen_titles: set[str] = set()
    order = 0

    with zipfile.ZipFile(SOURCE_ZIP) as zf:
        with zf.open("recipes.csv") as raw_file:
            reader = csv.DictReader((line.decode("utf-8", errors="replace") for line in raw_file))
            for row in reader:
                title = clean_text(row.get("Name", ""))
                if not title:
                    continue
                title_key = title.lower()
                if title_key in seen_titles:
                    continue
                meal_type = classify_meal_type_fast(title, row.get("RecipeCategory", ""), row.get("Keywords", ""))
                if meal_type not in SECTION_LIMITS:
                    continue
                ingredient_parts = parse_r_c_list(row.get("RecipeIngredientParts", ""))
                instructions = parse_instructions(row.get("RecipeInstructions", ""))
                if len(ingredient_parts) < 3 or len(instructions) < 2:
                    continue
                score = score_recipe(row, meal_type, instructions, ingredient_parts)
                recipe = prune_nones(build_recipe(row, meal_type))
                bucket = picked[meal_type]
                heapq.heappush(bucket, (score, order, recipe))
                order += 1
                bucket_limit = SECTION_LIMITS[meal_type] * 5
                if len(bucket) > bucket_limit:
                    heapq.heappop(bucket)
                seen_titles.add(title_key)

    final_recipes: list[dict] = []
    for section, limit in SECTION_LIMITS.items():
        ranked = sorted(picked.get(section, []), key=lambda item: item[0], reverse=True)
        final_recipes.extend(recipe for _, _, recipe in ranked[:limit])

    final_recipes = sorted(final_recipes, key=lambda recipe: (recipe["mealType"], recipe["title"].lower()))

    content = (
        "import { Recipe } from '@/types/app';\n\n"
        f"export const IMPORTED_RECIPE_LIBRARY: Recipe[] = {json.dumps(final_recipes, ensure_ascii=False, indent=2)};\n"
    )
    OUTPUT_TS.write_text(content, encoding="utf-8")
    print(f"Imported recipes: {len(final_recipes)}")
    section_counts = defaultdict(int)
    for recipe in final_recipes:
        section_counts[recipe['mealType']] += 1
    for key in sorted(section_counts):
        print(f"{key}: {section_counts[key]}")


if __name__ == "__main__":
    main()
