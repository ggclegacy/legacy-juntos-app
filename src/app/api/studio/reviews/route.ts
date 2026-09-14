import { actor, body, failure, ApiError } from "@/lib/server";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    const { db } = await actor(request);
    const p = z
      .object({
        entry_id: z.uuid(),
        version_id: z.uuid().nullable(),
        decision: z.enum(["comment", "approved", "revision_requested"]),
        body: z.string().trim().min(1).max(6000),
      })
      .strict()
      .safeParse(await body(request));
    if (!p.success)
      throw new ApiError(400, "Add feedback and choose a valid review action.");
    const { data, error } = await db
      .from("studio_reviews")
      .insert(p.data)
      .select()
      .single();
    if (error)
      throw new ApiError(
        403,
        "This review could not be saved. Check entry access and selected version.",
      );
    return Response.json(
      { review: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
