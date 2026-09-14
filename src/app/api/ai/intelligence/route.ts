import { z } from "zod";
import { actor, body, failure, ApiError } from "@/lib/server";
import {
  recallKinds,
  type MemorySource,
  type ApolloMemory,
  sourceAllowed,
} from "@/lib/ai/memory";
import { EMBEDDING_VERSION, embedTexts } from "@/lib/ai/embeddings";
import { verifyDependencies } from "@/lib/ai/memory-context";
import { proposeLearning } from "@/lib/ai/learning";
const sourceSchema = z.array(z.enum(recallKinds)).min(1).max(7);
const requestSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("index"),
      context: z.enum(["private", "shared"]),
      sources: sourceSchema,
      consent: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("suggest"),
      message: z.string().trim().min(1).max(6000),
      consent: z.literal(true),
    })
    .strict(),
]);
function audience(context: string, sources: string[]) {
  if (
    context === "shared" &&
    sources.some((s) => ["training", "nutrition", "protocol"].includes(s))
  )
    throw new ApiError(
      400,
      "Health and performance indexing is private to you.",
    );
}
export async function GET(request: Request) {
  try {
    const { db } = await actor(request),
      url = new URL(request.url);
    const context = z
      .enum(["private", "shared"])
      .parse(url.searchParams.get("context") ?? "private");
    const sources = sourceSchema.parse(
      (url.searchParams.get("sources") ?? "memory").split(","),
    );
    audience(context, sources);
    const { data, error } = await db.rpc("apollo_index_status", {
      p_context: context,
      p_sources: sources,
      p_model: EMBEDDING_VERSION,
    });
    if (error)
      throw new ApiError(
        503,
        "Meaning-based recall needs database update 007.",
      );
    return Response.json(
      {
        ...(data?.[0] ?? { total: 0, indexed: 0 }),
        aiConfigured: !!process.env.OPENAI_API_KEY,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(
      e instanceof z.ZodError ? new ApiError(400, "Invalid recall areas.") : e,
    );
  }
}
export async function POST(request: Request) {
  try {
    const who = await actor(request),
      { db, user, membership } = who;
    const parsed = requestSchema.safeParse(await body(request));
    if (!parsed.success)
      throw new ApiError(
        400,
        "Review the request and consent before sending to Apollo.",
      );
    const v = parsed.data;
    if (v.action === "index") audience(v.context, v.sources);
    const limit = await db.rpc("consume_ai_request");
    if (limit.error || !limit.data)
      throw new ApiError(429, "Please pause before the next AI request.");
    if (v.action === "index") {
      const { data, error } = await db.rpc("pending_apollo_embeddings", {
        p_context: v.context,
        p_sources: v.sources,
        p_model: EMBEDDING_VERSION,
      });
      if (error)
        throw new ApiError(
          503,
          "Apply database update 007 before preparing meaning-based recall.",
        );
      const sources = (data ?? []) as MemorySource[];
      if (
        sources.some(
          (s) =>
            !v.sources.includes(s.kind) ||
            !sourceAllowed(s, user.id, v.context),
        )
      )
        throw new ApiError(403, "A source is unavailable for this audience.");
      if (!sources.length) return Response.json({ indexed: 0, complete: true });
      const vectors = await embedTexts(
        sources.map((s) => (s.title + "\n" + s.content).slice(0, 6500)),
      );
      const current = await actor(request);
      if (
        current.user.id !== user.id ||
        current.membership.workspace_id !== membership.workspace_id ||
        !(await verifyDependencies(current.db, v.context, sources))
      )
        throw new ApiError(
          409,
          "Sources changed during indexing. Please try again.",
        );
      const saved = await current.db.from("apollo_embeddings").upsert(
        sources.map((s, i) => ({
          owner_id: user.id,
          workspace_id: membership.workspace_id,
          context: v.context,
          kind: s.kind,
          source_id: s.id,
          source_version: s.version,
          model: EMBEDDING_VERSION,
          embedding: vectors[i],
        })),
        { onConflict: "owner_id,context,kind,source_id,model" },
      );
      if (saved.error)
        throw new ApiError(
          409,
          "The index could not be saved; its sources may have changed. Retry this batch.",
        );
      return Response.json(
        { indexed: sources.length, complete: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    // Only authorized active teachings authored by this person are considered for correction.
    const recalled = await db.rpc("recall_apollo", {
      p_query: v.message,
      p_context: "private",
      p_sources: ["memory"],
      p_limit: 8,
    });
    if (recalled.error)
      throw new ApiError(
        503,
        "Learning review needs the connected memory database.",
      );
    const ids = ((recalled.data ?? []) as MemorySource[])
      .filter((s) => s.owner_id === user.id)
      .map((s) => s.id);
    const existing = ids.length
      ? await db
          .from("apollo_memories")
          .select("*")
          .in("id", ids)
          .eq("owner_id", user.id)
      : { data: [], error: null };
    if (existing.error)
      throw new ApiError(503, "Could not compare current teachings.");
    const memories = (existing.data ?? []) as ApolloMemory[];
    const suggestions = await proposeLearning(v.message, memories);
    const current = await actor(request);
    if (
      current.user.id !== user.id ||
      current.membership.workspace_id !== membership.workspace_id ||
      !(await verifyDependencies(
        current.db,
        "private",
        memories.map((m) => ({
          kind: "memory",
          id: m.id,
          version: String(m.revision),
        })),
      ))
    )
      throw new ApiError(
        409,
        "Your teachings changed during review. Ask Apollo to review them again.",
      );
    return Response.json(
      { suggestions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
