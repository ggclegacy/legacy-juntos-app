import { z } from "zod";
import { actor, body, failure, ApiError } from "@/lib/server";
import { memoryActionSchema } from "@/lib/ai/memory";
const columns =
  "id,workspace_id,owner_id,title,content,category,visibility,recipient_id,status,pinned,effective_on,source_note,source_url,revision,created_at,updated_at";
function checked(error: unknown) {
  if (error)
    throw new ApiError(
      503,
      "Apollo memory is unavailable. Check the connection and apply memory migration 006 if needed.",
    );
}
export async function GET(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const url = new URL(request.url),
      type = url.searchParams.get("type") ?? "memories";
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(1000000)
      .parse(url.searchParams.get("offset") ?? 0);
    const id = url.searchParams.get("id");
    const beforeRaw = url.searchParams.get("before");
    const before = beforeRaw
      ? z.coerce.number().int().positive().parse(beforeRaw)
      : undefined;
    if (type === "turns" || type === "versions") {
      if (!z.uuid().safeParse(id).success)
        throw new ApiError(400, "Choose an entry first.");
      const { data, error } =
        type === "turns"
          ? await db
              .from("apollo_turns")
              .select(
                "id,ordinal,user_message,assistant_message,dependencies,created_at",
              )
              .eq("conversation_id", id)
              .lt("ordinal", before ?? 2147483647)
              .order("ordinal", { ascending: false })
              .range(offset, offset + 29)
          : await db
              .from("apollo_memory_versions")
              .select("revision,snapshot,created_at")
              .eq("memory_id", id)
              .order("revision", { ascending: false })
              .range(offset, offset + 29);
      checked(error);
      return Response.json(
        { items: data ?? [], hasMore: data?.length === 30 },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (type === "conversations") {
      const { data, error } = await db
        .from("apollo_conversations")
        .select("*")
        .eq("owner_id", user.id)
        .eq("workspace_id", membership.workspace_id)
        .order("updated_at", { ascending: false })
        .range(offset, offset + 29);
      checked(error);
      return Response.json(
        { items: data ?? [], hasMore: data?.length === 30 },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (type !== "memories") throw new ApiError(400, "Unknown memory view.");
    let query = db
      .from("apollo_memories")
      .select(columns)
      .eq("workspace_id", membership.workspace_id)
      .order("updated_at", { ascending: false });
    const search = (url.searchParams.get("q") ?? "").trim().slice(0, 300);
    if (search)
      query = query.textSearch("search_document", search, {
        type: "websearch",
        config: "simple",
      });
    const { data, error } = await query.range(offset, offset + 29);
    checked(error);
    return Response.json(
      { items: data ?? [], hasMore: data?.length === 30 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(
      error instanceof z.ZodError
        ? new ApiError(400, "Invalid memory request.")
        : error,
    );
  }
}
export async function POST(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const parsed = memoryActionSchema.safeParse(await body(request, 64000));
    if (!parsed.success)
      throw new ApiError(400, "Review the teaching and its audience.");
    const v = parsed.data;
    if (v.action === "teach" || v.action === "correct") {
      if (v.input.recipient_id === user.id)
        throw new ApiError(400, "Choose the other person as recipient.");
      const result =
        v.action === "teach"
          ? await db
              .from("apollo_memories")
              .insert({
                ...v.input,
                owner_id: user.id,
                workspace_id: membership.workspace_id,
              })
              .select(columns)
              .single()
          : await db
              .from("apollo_memories")
              .update({ ...v.input, revision: v.revision + 1 })
              .eq("id", v.id)
              .eq("owner_id", user.id)
              .eq("revision", v.revision)
              .select(columns)
              .maybeSingle();
      checked(result.error);
      if (!result.data)
        throw new ApiError(
          409,
          "This teaching changed. Reload it before saving.",
        );
      return Response.json(
        { item: result.data },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (v.action === "new_conversation") {
      const { data, error } = await db
        .from("apollo_conversations")
        .insert({
          title: v.title,
          context: v.context,
          owner_id: user.id,
          workspace_id: membership.workspace_id,
        })
        .select("*")
        .single();
      checked(error);
      return Response.json(
        { item: data },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const table =
      v.action === "forget" ? "apollo_memories" : "apollo_conversations";
    const { data, error } = await db
      .from(table)
      .delete()
      .eq("id", v.id)
      .eq("owner_id", user.id)
      .eq("revision", v.revision)
      .select("id");
    checked(error);
    if (!data?.length)
      throw new ApiError(
        409,
        "This entry changed or is unavailable. Reload before deleting.",
      );
    return Response.json(
      { deleted: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
