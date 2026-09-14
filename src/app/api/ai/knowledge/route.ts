import { actor, body, failure, ApiError } from "@/lib/server";
import { knowledgeActionSchema, topics } from "@/lib/ai/knowledge/model";
import { z } from "zod";
const columns =
  "id,workspace_id,owner_id,title,content,topic,origin,visibility,recipient_id,status,references,source_name,published_on,review_on,reviewed_at,notes,revision,created_at,updated_at";
function databaseError(error: unknown) {
  if (error)
    throw new ApiError(
      503,
      "Knowledge storage is unavailable. Check the connection and database update 008.",
    );
}
export async function GET(request: Request) {
  try {
    const { db, user } = await actor(request),
      url = new URL(request.url);
    if (url.searchParams.has("history")) {
      const id = z.uuid().safeParse(url.searchParams.get("history"));
      if (!id.success) throw new ApiError(400, "Choose a document.");
      const { data, error } = await db
        .from("apollo_document_versions")
        .select("revision,snapshot,created_at")
        .eq("document_id", id.data)
        .order("revision", { ascending: false })
        .limit(20);
      databaseError(error);
      return Response.json(
        { items: data },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const offset = Math.max(
      0,
      Math.min(10000, Number(url.searchParams.get("offset")) || 0),
    );
    let query = db
      .from("apollo_documents")
      .select(columns)
      .order("updated_at", { ascending: false })
      .range(offset, offset + 29);
    const topic = url.searchParams.get("topic"),
      status = url.searchParams.get("status"),
      q = url.searchParams.get("q")?.trim().slice(0, 180);
    if (topic) {
      if (!topics.includes(topic as (typeof topics)[number]))
        throw new ApiError(400, "Unknown shelf.");
      query = query.eq("topic", topic);
    }
    if (status) {
      if (!["active", "draft", "archived"].includes(status))
        throw new ApiError(400, "Unknown document state.");
      query = query.eq("status", status);
    }
    if (url.searchParams.get("mine") === "true")
      query = query.eq("owner_id", user.id);
    if (q) query = query.ilike("title", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
    const { data, error } = await query;
    databaseError(error);
    return Response.json(
      { items: data, hasMore: data?.length === 30 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const parsed = knowledgeActionSchema.safeParse(await body(request, 320000));
    if (!parsed.success)
      throw new ApiError(
        400,
        "Review document details, content and audience before saving.",
      );
    const v = parsed.data;
    if (v.action === "delete") {
      const { data, error } = await db
        .from("apollo_documents")
        .delete()
        .eq("id", v.id)
        .eq("owner_id", user.id)
        .eq("revision", v.revision)
        .select("id");
      databaseError(error);
      if (!data?.length)
        throw new ApiError(
          409,
          "This document changed. Reload before deleting.",
        );
      return Response.json(
        { deleted: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (v.input.recipient_id === user.id)
      throw new ApiError(
        400,
        "Choose your other workspace member as recipient.",
      );
    const operation =
      v.action === "create"
        ? db
            .from("apollo_documents")
            .insert({
              ...v.input,
              owner_id: user.id,
              workspace_id: membership.workspace_id,
            })
        : db
            .from("apollo_documents")
            .update({ ...v.input, revision: v.revision + 1 })
            .eq("id", v.id)
            .eq("owner_id", user.id)
            .eq("revision", v.revision);
    const { data, error } = await operation.select(columns).maybeSingle();
    databaseError(error);
    if (!data)
      throw new ApiError(
        409,
        "This document changed or is unavailable. Reload before saving.",
      );
    return Response.json(
      { item: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
