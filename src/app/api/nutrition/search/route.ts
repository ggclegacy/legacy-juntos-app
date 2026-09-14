import { actor, failure, ApiError } from "@/lib/server";
import { searchFoods } from "@/lib/nutrition/providers";
import { validBarcode } from "@/lib/nutrition/model";
export async function GET(request: Request) {
  try {
    const { db } = await actor(request);
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") ?? "").trim(),
      barcode = params.get("barcode") === "true";
    if (q.length < 2 || q.length > 160 || (barcode && !validBarcode(q)))
      throw new ApiError(400, "Enter a food name or a valid product barcode.");
    const { data: allowed, error } = await db.rpc("consume_ai_request");
    if (error || !allowed)
      throw new ApiError(429, "Please pause before searching again.");
    return Response.json(
      { foods: await searchFoods(q, barcode) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
