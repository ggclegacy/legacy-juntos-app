import { actor, body, failure, ApiError } from "@/lib/server";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    const { db } = await actor(request);
    const p = z
      .object({
        entry_id: z.uuid(),
        platform: z.enum([
          "instagram",
          "facebook",
          "tiktok",
          "youtube",
          "linkedin",
          "email",
          "website",
        ]),
        metric: z.enum([
          "views",
          "impressions",
          "reach",
          "watch_seconds",
          "saves",
          "shares",
          "comments",
          "clicks",
          "followers",
          "conversions",
        ]),
        value: z.number().min(0).max(1e12),
        period_start: z.iso.date(),
        period_end: z.iso.date(),
      })
      .strict()
      .safeParse(await body(request));
    if (!p.success || p.data.period_end < p.data.period_start)
      throw new ApiError(400, "Check the metric and date range.");
    const { data, error } = await db
      .from("studio_metrics")
      .insert(p.data)
      .select()
      .single();
    if (error)
      throw new ApiError(403, "Could not save this manual measurement.");
    return Response.json(
      { metric: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
