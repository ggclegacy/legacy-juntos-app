import { actor, body, failure, ApiError } from "@/lib/server";
import { payloadSchema } from "@/lib/training/model";
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
      .from("training_documents")
      .select("id,revision,payload,updated_at")
      .eq("owner_id", user.id)
      .eq("workspace_id", membership.workspace_id)
      .order("id")
      .range(offset, offset + 199);
    if (error)
      throw new ApiError(
        503,
        "Training storage is unavailable. Apply migration 002 and retry.",
      );
    return Response.json(
      {
        documents: data,
        nextOffset: data.length === 200 ? offset + 200 : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const parsed = z
      .object({
        id: z.uuid(),
        revision: z.number().int().min(0),
        payload: payloadSchema,
      })
      .strict()
      .safeParse(await body(request, 500000));
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    const { id, revision, payload } = parsed.data;
    const row = { payload, revision: revision + 1 };
    const result =
      revision === 0
        ? await db
            .from("training_documents")
            .insert({
              ...row,
              id,
              owner_id: user.id,
              workspace_id: membership.workspace_id,
            })
            .select("id,revision,payload,updated_at")
            .single()
        : await db
            .from("training_documents")
            .update(row)
            .eq("id", id)
            .eq("owner_id", user.id)
            .eq("workspace_id", membership.workspace_id)
            .eq("revision", revision)
            .select("id,revision,payload,updated_at")
            .single();
    if (result.error) {
      const { data: existing } = await db
        .from("training_documents")
        .select("id,revision,payload,updated_at")
        .eq("id", id)
        .eq("owner_id", user.id)
        .eq("workspace_id", membership.workspace_id)
        .single();
      const known = payloadSchema.safeParse(existing?.payload);
      if (
        existing?.revision === revision + 1 &&
        known.success &&
        JSON.stringify(known.data) === JSON.stringify(payload)
      )
        return Response.json(
          { document: existing },
          { headers: { "Cache-Control": "no-store" } },
        );
      throw new ApiError(
        409,
        "This draft could not be synced. Another tab may have changed it. Export your local copy before reloading cloud data.",
      );
    }
    return Response.json(
      { document: result.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
