import { actor, body, failure, ApiError } from "@/lib/server";
import { recordInput } from "@/lib/model";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    const { db, membership } = await actor(request);
    const cursor = new URL(request.url).searchParams.get("cursor");
    let query = db
      .from("records")
      .select("*")
      .eq("workspace_id", membership.workspace_id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(250);
    if (cursor) {
      let value;
      try {
        value = JSON.parse(cursor);
      } catch {
        throw new ApiError(400, "Invalid page cursor.");
      }
      const parsed = z
        .object({ created_at: z.iso.datetime({ offset: true }), id: z.uuid() })
        .strict()
        .safeParse(value);
      if (!parsed.success) throw new ApiError(400, "Invalid page cursor.");
      query = query.or(
        `created_at.lt.${parsed.data.created_at},and(created_at.eq.${parsed.data.created_at},id.lt.${parsed.data.id})`,
      );
    }
    const { data, error } = await query;
    if (error) throw new ApiError(500, "Your entries could not be loaded.");
    const last = data?.length === 250 ? data[data.length - 1] : null;
    return Response.json(
      {
        records: data,
        nextCursor: last ? { created_at: last.created_at, id: last.id } : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const parsed = recordInput.safeParse(await body(request));
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    const { data, error } = await db
      .from("records")
      .insert({
        ...parsed.data,
        owner_id: user.id,
        workspace_id: membership.workspace_id,
      })
      .select()
      .single();
    if (error)
      throw new ApiError(
        400,
        "Could not save. Check the audience and linked entry.",
      );
    return Response.json({ record: data }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const { db, user } = await actor(request);
    const raw = await body(request);
    const id = z.uuid().safeParse(raw.id);
    const parsed = recordInput.safeParse(raw.record);
    if (!id.success || !parsed.success)
      throw new ApiError(400, "Check the entry fields.");
    const { data, error } = await db
      .from("records")
      .update(parsed.data)
      .eq("id", id.data)
      .eq("owner_id", user.id)
      .select()
      .single();
    if (error)
      throw new ApiError(
        403,
        "Could not update. Only the owner can edit, and linked replies must keep the same audience.",
      );
    return Response.json({ record: data });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const { db, user } = await actor(request);
    const parsed = z.object({ id: z.uuid() }).safeParse(await body(request));
    if (!parsed.success) throw new ApiError(400, "Choose an entry.");
    const { data, error } = await db
      .from("records")
      .delete()
      .eq("id", parsed.data.id)
      .eq("owner_id", user.id)
      .select("id");
    if (error || !data?.length)
      throw new ApiError(
        403,
        "Could not delete. Remove linked replies first; only owners can delete entries.",
      );
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
