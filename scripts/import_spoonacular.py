from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen


ROOT = Path("/Users/ksu/promom/smart-mom-app")
OUTPUT_TS = ROOT / "src/lib/generated/spoonacularRecipeCatalog.ts"
BASE_URL = "https://api.spoonacular.com/recipes/complexSearch"


def fetch_json(params: dict[str, Any]) -> dict[str, Any]:
    query = urlencode(params)
    with urlopen(f"{BASE_URL}?{query}") as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:80] or "recipe"


def classify_meal_type(dish_types: list[str], title: str) -> str:
    text = f"{' '.join(dish_types)} {title}".lower()
    if "breakfast" in text:
        return "breakfast"
    if "brunch" in text:
        return "brunch"
    if "soup" in text:
        return "soups"
    if "salad" in text:
        return "salads"
    if "side dish" in text:
        return "sides"
    if "appetizer" in text:
        return "appetizers"
    if "drink" in text or "beverage" in text:
        return "drinks"
    if "dessert" in text:
        return "desserts"
    if any(word in text for word in ["bread", "cookie", "cake", "muffin", "brownie", "biscuit"]):
        return "baking"
    if "pasta" in text:
        return "pasta"
    if "sandwich" in text:
        return "sandwiches"
    if "main course" in text or "main dish" in text:
        return "main_dish"
    return "dinner"


def classify_meal_slot(meal_type: str) -> str:
    if meal_type in {"breakfast", "brunch"}:
        return meal_type
    if meal_type in {"desserts", "baking", "appetizers", "drinks"}:
        return "snack"
    if meal_type in {"soups", "salads", "sides", "sandwiches"}:
        return "lunch"
    return "dinner"


def build_classifiers(recipe: dict[str, Any]) -> list[str]:
    result: list[str] = []
    title = normalize_text(recipe.get("title")).lower()
    diets = [normalize_text(item).lower() for item in recipe.get("diets", [])]
    dish_types = [normalize_text(item).lower() for item in recipe.get("dishTypes", [])]
    if "vegetarian" in diets:
        result.append("vegetarian")
    if "vegan" in diets:
        result.extend(["vegan", "dairy_free"])
    if "gluten free" in diets:
        result.append("gluten_free")
    if any(item in diets for item in ["ketogenic", "whole30", "paleo"]) or "salad" in dish_types:
        result.append("healthy")
    if "breakfast" in dish_types or "sandwich" in dish_types or recipe.get("readyInMinutes", 0) <= 25:
        result.append("quick")
    if recipe.get("servings", 0) >= 4:
        result.append("family")
    if any(word in title for word in ["pancake", "banana", "meatball", "mac", "nugget"]):
        result.append("kids")
    if recipe.get("cheap"):
        result.append("budget")
    if recipe.get("veryHealthy"):
        result.append("healthy")
    if recipe.get("veryPopular"):
        result.append("family")
    return sorted(dict.fromkeys(result))


def build_recipe(item: dict[str, Any]) -> dict[str, Any]:
    dish_types = [normalize_text(value) for value in item.get("dishTypes", []) if normalize_text(value)]
    meal_type = classify_meal_type(dish_types, item.get("title", ""))
    return {
        "id": f"spoonacular-{item['id']}",
        "title": normalize_text(item.get("title")) or "Untitled recipe",
        "description": normalize_text(item.get("summary"))[:220] or f"{normalize_text(item.get('title'))} from Spoonacular.",
        "mealType": meal_type,
        "mealSlot": classify_meal_slot(meal_type),
        "subtype": dish_types[0] if dish_types else "Recipe",
        "cuisine": None,
        "cookTimeMinutes": int(item.get("readyInMinutes") or 0),
        "servings": int(item.get("servings") or 1),
        "tags": sorted(dict.fromkeys([slugify(tag).replace("-", "_") for tag in dish_types[:6]])),
        "classifiers": build_classifiers(item),
        "nutritionPerServing": {"calories": 0, "protein": 0, "fat": 0, "carbs": 0},
        "ingredients": [],
        "steps": [],
        "photoUri": normalize_text(item.get("image")) or None,
        "suitableForChildren": "kids" in build_classifiers(item),
        "suitableForFamily": "family" in build_classifiers(item),
    }


def main() -> None:
    api_key = os.getenv("SPOONACULAR_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("SPOONACULAR_API_KEY is missing. Add it to your environment before running this importer.")

    categories = [
        "breakfast",
        "main course",
        "soup",
        "salad",
        "dessert",
        "drink",
        "bread",
        "side dish",
        "appetizer",
        "sandwich",
        "pasta",
    ]

    recipes: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    for category in categories:
        payload = fetch_json(
            {
                "apiKey": api_key,
                "number": 12,
                "addRecipeInformation": "true",
                "fillIngredients": "true",
                "sort": "popularity",
                "type": category,
            }
        )
        for item in payload.get("results", []) or []:
            recipe_id = int(item.get("id") or 0)
            if not recipe_id or recipe_id in seen_ids:
                continue
            recipes.append(build_recipe(item))
            seen_ids.add(recipe_id)

    recipes.sort(key=lambda recipe: (recipe["mealType"], recipe["title"]))
    OUTPUT_TS.write_text(
        "import { Recipe } from '@/types/app';\n\n"
        + "export const SPOONACULAR_RECIPE_LIBRARY: Recipe[] = "
        + json.dumps(recipes, ensure_ascii=True, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Saved {len(recipes)} Spoonacular recipes to {OUTPUT_TS}")


if __name__ == "__main__":
    main()
