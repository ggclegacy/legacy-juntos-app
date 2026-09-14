import { z } from "zod";
const text = z.string().trim().max(1000);
export const macrosSchema = z
  .object({
    kcal: z.number().finite().min(0).max(10000),
    protein: z.number().finite().min(0).max(2000),
    carbs: z.number().finite().min(0).max(2000),
    fat: z.number().finite().min(0).max(2000),
  })
  .strict();
export type Macros = z.infer<typeof macrosSchema>;
export const foodSchema = z
  .object({
    id: text.min(1),
    name: text.min(1),
    brand: text,
    preparation: text,
    per100: macrosSchema,
    source: z.enum(["manual", "label", "USDA", "recipe", "sample"]),
    sourceId: text,
    barcode: text,
    notes: text,
  })
  .strict();
export type Food = z.infer<typeof foodSchema>;
export const itemSchema = z
  .object({
    id: z.uuid(),
    food: foodSchema,
    grams: z.number().finite().positive().max(20000),
    portionSource: z.enum([
      "entered",
      "weighed",
      "photo estimate",
      "text estimate",
      "recipe portion",
    ]),
  })
  .strict();
export type Item = z.infer<typeof itemSchema>;
export const mealSchema = z
  .object({
    kind: z.literal("meal"),
    name: text.min(1),
    date: z.iso.date(),
    slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
    state: z.enum(["planned", "eaten", "removed"]),
    items: z.array(itemSchema).min(1).max(60),
    notes: text,
  })
  .strict();
export type Meal = z.infer<typeof mealSchema>;
export const recipeSchema = z
  .object({
    kind: z.literal("recipe"),
    name: text.min(1),
    yieldGrams: z.number().finite().positive().max(50000),
    items: z.array(itemSchema).min(1).max(60),
    notes: text,
  })
  .strict();
export type Recipe = z.infer<typeof recipeSchema>;
export const targetSchema = z
  .object({
    kind: z.literal("targets"),
    effective: z.iso.date(),
    source: z.enum(["My coach", "My own targets"]),
    training: macrosSchema,
    rest: macrosSchema,
    notes: text,
  })
  .strict()
  .refine(
    (v) => v.training.kcal > 0 && v.rest.kcal > 0,
    "Enter positive daily calorie targets.",
  );
export type Targets = z.infer<typeof targetSchema>;
export const daySchema = z
  .object({
    kind: z.literal("day"),
    date: z.iso.date(),
    dayType: z.enum(["training", "rest"]),
    completeness: z.enum(["partial", "complete", "unlogged"]),
    waterMl: z.number().min(0).max(20000),
    notes: text,
  })
  .strict();
export type Day = z.infer<typeof daySchema>;
export const payloadSchema = z.union([
  mealSchema,
  recipeSchema,
  targetSchema,
  daySchema,
  z.object({ kind: z.literal("food"), food: foodSchema }).strict(),
]);
export type Payload = z.infer<typeof payloadSchema>;
export const eventSchema = z.object({
  id: z.uuid(),
  entity_id: z.uuid(),
  revision: z.number().int().positive(),
  payload: payloadSchema,
  created_at: z.iso.datetime({ offset: true }),
});
export type NutritionEvent = z.infer<typeof eventSchema>;
export const zero = (): Macros => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
export function scale(m: Macros, factor: number): Macros {
  return Object.fromEntries(
    Object.entries(m).map(([k, v]) => [k, v * factor]),
  ) as Macros;
}
export function sum(items: Item[]): Macros {
  return items.reduce((a, i) => {
    const b = scale(i.food.per100, i.grams / 100);
    return {
      kcal: a.kcal + b.kcal,
      protein: a.protein + b.protein,
      carbs: a.carbs + b.carbs,
      fat: a.fat + b.fat,
    };
  }, zero());
}
export function latest(events: NutritionEvent[]) {
  const map = new Map<string, NutritionEvent>();
  for (const e of events)
    if (!map.has(e.entity_id) || map.get(e.entity_id)!.revision < e.revision)
      map.set(e.entity_id, e);
  return [...map.values()];
}
export function totals(events: NutritionEvent[], date: string) {
  return sum(
    latest(events).flatMap((e) =>
      e.payload.kind === "meal" &&
      e.payload.date === date &&
      e.payload.state === "eaten"
        ? e.payload.items
        : [],
    ),
  );
}
export function targetAt(events: NutritionEvent[], date: string) {
  return latest(events)
    .filter((e) => e.payload.kind === "targets" && e.payload.effective <= date)
    .sort(
      (a, b) =>
        (b.payload as Targets).effective.localeCompare(
          (a.payload as Targets).effective,
        ) || b.created_at.localeCompare(a.created_at),
    )[0]?.payload as Targets | undefined;
}
export function recipeFood(r: Recipe, sourceId: string): Food {
  return {
    id: sourceId,
    name: r.name,
    brand: "",
    preparation: "Finished batch",
    per100: scale(sum(r.items), 100 / r.yieldGrams),
    source: "recipe",
    sourceId,
    barcode: "",
    notes:
      "Portion calculated from finished batch weight. Assumes a uniform mixture. " +
      r.notes,
  };
}
export function numberInput(raw: string) {
  if (!/^\d+(?:[.,]\d+)?$/.test(raw.trim()))
    throw new Error("Enter a positive number without thousands separators.");
  return Number(raw.replace(",", "."));
}
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function validBarcode(code: string) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((n, d, i) => n + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
export function normalizeBarcode(code: string) {
  return code.padStart(14, "0");
}
export function suggest(foods: Food[], remaining: Macros) {
  return foods
    .map((food) => {
      const nutrients = food.per100;
      const ratios = (["protein", "carbs", "fat"] as const)
        .filter((k) => nutrients[k] > 0)
        .map((k) => Math.max(0, remaining[k]) / nutrients[k]);
      const factor = Math.min(
        3,
        remaining.kcal > 0 && nutrients.kcal > 0
          ? remaining.kcal / nutrients.kcal
          : 0,
        ...ratios,
      );
      const grams = Math.floor((factor * 100) / 5) * 5;
      return { food, grams };
    })
    .filter((x) => x.grams >= 20)
    .sort(
      (a, b) =>
        b.food.per100.protein * b.grams - a.food.per100.protein * a.grams,
    )
    .slice(0, 3);
}
export function weekDates(end: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(end + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 6 + i);
    return d.toISOString().slice(0, 10);
  });
}
