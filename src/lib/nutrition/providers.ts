import { ApiError } from "@/lib/server";
import { foodSchema, normalizeBarcode, type Food } from "./model";
type FdcFood = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  dataType?: string;
  foodNutrients?: { nutrientId: number; value?: number; unitName?: string }[];
};
export function fromFdc(row: FdcFood): Food | null {
  const n = row.foodNutrients ?? [];
  const get = (ids: number[]) => {
    for (const id of ids) {
      const v = n.find((v) => v.nutrientId === id)?.value;
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return null;
  };
  const kcal = get([1008, 2048, 2047]),
    protein = get([1003]),
    carbs = get([1005]),
    fat = get([1004]);
  if (kcal === null || protein === null || carbs === null || fat === null)
    return null;
  const parsed = foodSchema.safeParse({
    id: `fdc-${row.fdcId}`,
    name: row.description,
    brand: row.brandName ?? row.brandOwner ?? "",
    preparation: row.dataType ?? "",
    per100: { kcal, protein, carbs, fat },
    source: "USDA",
    sourceId: String(row.fdcId),
    barcode: row.gtinUpc ?? "",
    notes:
      "USDA FoodData Central. Confirm product, preparation, and portion against your food.",
  });
  return parsed.success ? parsed.data : null;
}
export async function searchFoods(
  query: string,
  barcode = false,
): Promise<Food[]> {
  if (!process.env.USDA_API_KEY)
    throw new ApiError(
      503,
      "Food database search needs a USDA API key. You can add a custom food or use your saved foods now.",
    );
  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(process.env.USDA_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        query,
        pageSize: 25,
        dataType: barcode
          ? ["Branded"]
          : ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"],
      }),
    },
  );
  if (!response.ok)
    throw new ApiError(
      502,
      "Food search is unavailable. Your meal draft is unchanged.",
    );
  const data = await response.json();
  return (data.foods ?? [])
    .filter(
      (f: FdcFood) =>
        !barcode ||
        (f.gtinUpc && normalizeBarcode(f.gtinUpc) === normalizeBarcode(query)),
    )
    .map(fromFdc)
    .filter((f: Food | null): f is Food => f !== null)
    .slice(0, 12);
}
