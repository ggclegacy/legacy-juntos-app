import { actor, body, failure, ApiError } from "@/lib/server";
import { payloadSchema } from "@/lib/nutrition/model";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(new URL(request.url).searchParams.get("offset") ?? 0);
    const { data, error } = await db
      .from("nutrition_events")
      .select("id,entity_id,revision,payload,created_at")
      .eq("owner_id", user.id)
      .eq("workspace_id", membership.workspace_id)
      .order("id")
      .range(offset, offset + 199);
    if (error)
      throw new ApiError(
        503,
        "Private nutrition storage is unavailable. Apply migration 005.",
      );
    return Response.json(
      { events: data, nextOffset: data.length === 200 ? offset + 200 : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const parsed = z
      .object({
        id: z.uuid(),
        entity_id: z.uuid(),
        revision: z.number().int().positive(),
        payload: payloadSchema,
      })
      .strict()
      .safeParse(await body(request, 200000));
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    const input = parsed.data;
    const { data, error } = await db
      .from("nutrition_events")
      .insert({
        ...input,
        owner_id: user.id,
        workspace_id: membership.workspace_id,
      })
      .select("id,entity_id,revision,payload,created_at")
      .single();
    if (error) {
      const { data: existing } = await db
        .from("nutrition_events")
        .select("id,entity_id,revision,payload,created_at")
        .eq("id", input.id)
        .eq("owner_id", user.id)
        .eq("workspace_id", membership.workspace_id)
        .single();
      const known = payloadSchema.safeParse(existing?.payload);
      if (
        existing &&
        existing.entity_id === input.entity_id &&
        existing.revision === input.revision &&
        known.success &&
        JSON.stringify(known.data) === JSON.stringify(input.payload)
      )
        return Response.json(
          { event: existing },
          { headers: { "Cache-Control": "no-store" } },
        );
      throw new ApiError(
        409,
        "Could not save this version. Reload to check for changes before retrying.",
      );
    }
    return Response.json(
      { event: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
