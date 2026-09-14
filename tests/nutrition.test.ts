import { describe, it, expect } from "vitest";
import {
  sum,
  totals,
  recipeFood,
  targetAt,
  normalizeBarcode,
  validBarcode,
  numberInput,
  foodSchema,
  mealSchema,
  type NutritionEvent,
  type Meal,
  type Targets,
} from "../src/lib/nutrition/model";
import { sampleFoods } from "../src/lib/nutrition/sample";
import { fromFdc } from "../src/lib/nutrition/providers";
const item = {
  id: crypto.randomUUID(),
  food: sampleFoods[0],
  grams: 150,
  portionSource: "weighed" as const,
};
const meal: Meal = {
  kind: "meal",
  name: "Test",
  date: "2026-09-13",
  slot: "Lunch",
  state: "eaten",
  items: [item],
  notes: "",
};
function event(
  payload: NutritionEvent["payload"],
  entity_id = crypto.randomUUID(),
  revision = 1,
): NutritionEvent {
  return {
    id: crypto.randomUUID(),
    entity_id,
    revision,
    created_at: "2026-09-13T12:00:00Z",
    payload,
  };
}
describe("nutrition calculations and data integrity", () => {
  it("scales weighed food without intermediate rounding", () => {
    expect(sum([item])).toEqual({
      kcal: 247.5,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
    });
  });
  it("counts only eaten latest revisions and selected date", () => {
    const a = event(meal);
    expect(
      totals(
        [
          a,
          event({ ...meal, state: "planned" }),
          event({ ...meal, date: "2026-09-12" }),
        ],
        meal.date,
      ).kcal,
    ).toBe(247.5);
    expect(
      totals(
        [a, event({ ...meal, state: "removed" }, a.entity_id, 2)],
        meal.date,
      ).kcal,
    ).toBe(0);
  });
  it("normalizes recipes against finished yield and freezes logged values", () => {
    const recipe = {
      kind: "recipe" as const,
      name: "Batch",
      items: [item],
      yieldGrams: 300,
      notes: "",
    };
    const food = recipeFood(recipe, "recipe");
    const portion = { ...item, food, grams: 100 };
    expect(sum([portion]).protein).toBe(15.5);
    recipe.items = [{ ...item, grams: 300 }];
    expect(sum([portion]).protein).toBe(15.5);
    expect(recipeFood(recipe, "recipe").per100.protein).toBe(31);
  });
  it("preserves targets by effective date", () => {
    const t: Targets = {
      kind: "targets",
      effective: "2026-09-01",
      source: "My coach",
      training: { kcal: 2000, protein: 150, carbs: 200, fat: 65 },
      rest: { kcal: 1900, protein: 150, carbs: 175, fat: 65 },
      notes: "",
    };
    const events = [
      event(t),
      event({
        ...t,
        effective: "2026-09-20",
        training: { ...t.training, kcal: 2200 },
      }),
    ];
    expect(targetAt(events, "2026-08-01")).toBeUndefined();
    expect(targetAt(events, "2026-09-13")?.training.kcal).toBe(2000);
    expect(targetAt(events, "2026-09-21")?.training.kcal).toBe(2200);
  });
  it("validates barcode check digits and equivalent leading zero form", () => {
    expect(validBarcode("036000291452")).toBe(true);
    expect(validBarcode("036000291453")).toBe(false);
    expect(normalizeBarcode("036000291452")).toBe(
      normalizeBarcode("00036000291452"),
    );
  });
  it("accepts decimal commas but rejects ambiguous thousands and negative portions", () => {
    expect(numberInput("4,5")).toBe(4.5);
    expect(() => numberInput("1,000.5")).toThrow();
    expect(
      mealSchema.safeParse({ ...meal, items: [{ ...item, grams: -10 }] })
        .success,
    ).toBe(false);
    expect(
      foodSchema.safeParse({
        ...item.food,
        per100: { ...item.food.per100, protein: NaN },
      }).success,
    ).toBe(false);
  });
  it("does not silently replace missing database nutrients with zero", () => {
    const row = {
      fdcId: 1,
      description: "Food",
      foodNutrients: [
        { nutrientId: 1008, value: 100 },
        { nutrientId: 1003, value: 10 },
        { nutrientId: 1005, value: 10 },
      ],
    };
    expect(fromFdc(row)).toBeNull();
    expect(
      fromFdc({
        ...row,
        foodNutrients: [...row.foodNutrients, { nutrientId: 1004, value: 0 }],
      })?.per100.fat,
    ).toBe(0);
  });
});
