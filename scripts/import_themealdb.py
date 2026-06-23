from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
from urllib.request import urlopen


ROOT = Path("/Users/ksu/promom/smart-mom-app")
OUTPUT_TS = ROOT / "src/lib/generated/themealdbRecipeCatalog.ts"
BASE_URL = "https://www.themealdb.com/api/json/v1/1"


def fetch_json(path: str) -> dict[str, Any]:
    with urlopen(f"{BASE_URL}/{path}") as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:80] or "recipe"


def classify_meal_type(category: str, title: str, ingredients: list[str]) -> str:
    text = f"{category} {title} {' '.join(ingredients)}".lower()
    if "breakfast" in text:
      return "breakfast"
    if "dessert" in text:
      return "desserts"
    if "starter" in text:
      return "appetizers"
    if "side" in text:
      return "sides"
    if "pasta" in text:
      return "pasta"
    if "soup" in text or "broth" in text or "chowder" in text:
      return "soups"
    if "salad" in text:
      return "salads"
    if "drink" in text or "juice" in text or "tea" in text or "coffee" in text:
      return "drinks"
    if any(word in text for word in ["cake", "cookie", "brownie", "pie", "bread pudding"]):
      return "baking"
    return "main_dish"


def classify_meal_slot(meal_type: str) -> str:
    if meal_type == "breakfast":
      return "breakfast"
    if meal_type in {"desserts", "baking", "appetizers", "drinks"}:
      return "snack"
    if meal_type in {"soups", "salads", "sides"}:
      return "lunch"
    return "dinner"


def build_classifiers(category: str, title: str, tags: list[str], ingredients: list[str]) -> list[str]:
    text = f"{category} {title} {' '.join(tags)} {' '.join(ingredients)}".lower()
    result: list[str] = []
    if any(word in text for word in ["vegetarian", "vegan"]):
      result.append("vegetarian")
    if "vegan" in text:
      result.append("vegan")
      result.append("dairy_free")
    if any(word in text for word in ["breakfast", "pasta", "starter", "dessert"]) or len(ingredients) <= 8:
      result.append("quick")
    if any(word in text for word in ["chicken", "beef", "seafood", "lamb", "pork", "goat", "family"]):
      result.append("family")
    if any(word in text for word in ["egg", "milk", "chicken", "fish", "beef", "salmon", "yogurt", "beans"]):
      result.append("high_protein")
    if any(word in text for word in ["vegetable", "grill", "salad", "vegan", "breakfast"]):
      result.append("healthy")
    if any(word in text for word in ["pancake", "breakfast", "fruit", "pasta bake", "meatballs"]):
      result.append("kids")
    if any(word in text for word in ["bread", "pasta", "rice", "potato", "bean"]) and len(ingredients) <= 10:
      result.append("budget")
    return sorted(dict.fromkeys(result))


def extract_ingredients(meal: dict[str, Any]) -> list[dict[str, str]]:
    ingredients: list[dict[str, str]] = []
    for index in range(1, 21):
        ingredient = normalize_text(meal.get(f"strIngredient{index}"))
        measure = normalize_text(meal.get(f"strMeasure{index}"))
        if not ingredient:
            continue
        ingredients.append(
            {
                "id": f"ing-{meal['idMeal']}-{index}",
                "name": ingredient,
                "amount": measure or "to taste",
            }
        )
    return ingredients


def extract_steps(meal: dict[str, Any]) -> list[dict[str, str]]:
    raw = normalize_text(meal.get("strInstructions"))
    lines = [line.strip(" .") for line in re.split(r"\r?\n|\.\s+", raw) if line.strip()]
    return [{"id": f"step-{meal['idMeal']}-{index}", "text": line} for index, line in enumerate(lines[:12], start=1)]


def build_recipe(meal: dict[str, Any]) -> dict[str, Any]:
    category = normalize_text(meal.get("strCategory")) or "Miscellaneous"
    title = normalize_text(meal.get("strMeal")) or "Untitled recipe"
    tags = [normalize_text(tag) for tag in (meal.get("strTags") or "").split(",") if normalize_text(tag)]
    ingredients = extract_ingredients(meal)
    ingredient_names = [item["name"] for item in ingredients]
    meal_type = classify_meal_type(category, title, ingredient_names)
    classifiers = build_classifiers(category, title, tags, ingredient_names)
    return {
        "id": f"themealdb-{meal['idMeal']}",
        "title": title,
        "description": normalize_text(meal.get("strInstructions"))[:220] or f"{title} from TheMealDB.",
        "mealType": meal_type,
        "mealSlot": classify_meal_slot(meal_type),
        "subtype": category,
        "cuisine": normalize_text(meal.get("strArea")) or None,
        "cookTimeMinutes": 30,
        "servings": 4,
        "tags": sorted(dict.fromkeys([slugify(category).replace("-", "_"), *(slugify(tag).replace("-", "_") for tag in tags), *(slugify(name).replace("-", "_") for name in ingredient_names[:6])])),
        "classifiers": classifiers,
        "nutritionPerServing": {
            "calories": 0,
            "protein": 0,
            "fat": 0,
            "carbs": 0,
        },
        "ingredients": ingredients,
        "steps": extract_steps(meal),
        "photoUri": normalize_text(meal.get("strMealThumb")) or None,
        "suitableForChildren": "kids" in classifiers,
        "suitableForFamily": "family" in classifiers,
    }


def load_themealdb_recipes() -> list[dict[str, Any]]:
    categories_payload = fetch_json("categories.php")
    categories = [item["strCategory"] for item in categories_payload.get("categories", []) if item.get("strCategory")]
    seen_ids: set[str] = set()
    recipes: list[dict[str, Any]] = []

    for category in categories:
        meals_payload = fetch_json(f"filter.php?c={category.replace(' ', '%20')}")
        for meal_stub in meals_payload.get("meals", []) or []:
            meal_id = str(meal_stub.get("idMeal") or "").strip()
            if not meal_id or meal_id in seen_ids:
                continue
            detail_payload = fetch_json(f"lookup.php?i={meal_id}")
            meals = detail_payload.get("meals") or []
            if not meals:
                continue
            meal = meals[0]
            recipes.append(build_recipe(meal))
            seen_ids.add(meal_id)

    recipes.sort(key=lambda recipe: (recipe["mealType"], recipe["title"]))
    return recipes


def write_output(recipes: list[dict[str, Any]]) -> None:
    OUTPUT_TS.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(recipes, ensure_ascii=True, indent=2)
    OUTPUT_TS.write_text(
        "import { Recipe } from '@/types/app';\n\n"
        "export const THEMEALDB_RECIPE_LIBRARY: Recipe[] = "
        + body
        + ";\n",
        encoding="utf-8",
    )


def main() -> None:
    recipes = load_themealdb_recipes()
    write_output(recipes)
    print(f"Saved {len(recipes)} TheMealDB recipes to {OUTPUT_TS}")


if __name__ == "__main__":
    main()
