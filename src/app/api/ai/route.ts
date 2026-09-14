import { actor, body, failure, ApiError } from "@/lib/server";
import { contextRecords } from "@/lib/model";
import { OpenAIProvider } from "@/lib/ai/provider";
import { apolloRequestSchema } from "@/lib/ai/apollo";
import { memoryContext, verifyDependencies } from "@/lib/ai/memory-context";
import { mergeDependencies } from "@/lib/ai/memory";
export async function POST(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const parsed = apolloRequestSchema.safeParse(await body(request));
    if (!parsed.success)
      throw new ApiError(
        400,
        "Review your message and consent to send it to the AI provider.",
      );
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)
      throw new ApiError(
        503,
        "AI is not connected yet. You can still use the private drafting guide.",
      );
    const { data: allowed, error: limitError } =
      await db.rpc("consume_ai_request");
    if (limitError || !allowed)
      throw new ApiError(
        429,
        "Please pause before trying again. The AI request limit has been reached.",
      );
    const { data, error } = await db
      .from("records")
      .select("*")
      .in("id", parsed.data.recordIds);
    if (error)
      throw new ApiError(500, "Could not prepare the selected context.");
    const records = contextRecords(
      data ?? [],
      user.id,
      membership.workspace_id,
      parsed.data.context,
      parsed.data.recordIds,
    );
    if (records.length !== parsed.data.recordIds.length)
      throw new ApiError(
        403,
        "Some selected context is unavailable for this audience. Select it again.",
      );
    const memory = await memoryContext(
      db,
      user.id,
      membership.workspace_id,
      parsed.data,
    );
    const dependencies = mergeDependencies(
      memory.dependencies,
      records.map((r) => ({
        kind: "record" as const,
        id: r.id,
        version: r.updated_at,
      })),
    );
    if (dependencies.length > 150)
      throw new ApiError(
        400,
        "Too much connected history. Start a new conversation with fewer sources.",
      );
    const result = await new OpenAIProvider().respond({
      ...parsed.data,
      records,
      sources: memory.sources,
      history: memory.history,
      omittedHistory: memory.omittedHistory,
      conversationSaved: !!memory.conversation,
    });
    const current = await actor(request);
    const { data: fresh, error: freshError } = await current.db
      .from("records")
      .select("*")
      .in("id", parsed.data.recordIds);
    const stillAllowed = contextRecords(
      fresh ?? [],
      current.user.id,
      current.membership.workspace_id,
      parsed.data.context,
      parsed.data.recordIds,
    );
    if (
      current.user.id !== user.id ||
      current.membership.workspace_id !== membership.workspace_id ||
      freshError ||
      stillAllowed.length !== records.length ||
      stillAllowed.some(
        (r) =>
          r.updated_at !== records.find((old) => old.id === r.id)?.updated_at,
      )
    )
      throw new ApiError(
        409,
        "Selected context changed while the AI was responding. Please review it and try again.",
      );
    // Legacy selected-record checks above also protect temporary chat without migration 006.
    if (
      memory.dependencies.length &&
      !(await verifyDependencies(
        current.db,
        parsed.data.context,
        memory.dependencies,
      ))
    )
      throw new ApiError(
        409,
        "Memory changed while Apollo was responding. Please try again with the current knowledge.",
      );
    let saved = false;
    if (memory.conversation) {
      const { error: saveError } = await current.db.rpc("append_apollo_turn", {
        p_conversation: memory.conversation.id,
        p_revision: memory.conversation.revision,
        p_user: parsed.data.message,
        p_assistant: result.text,
        p_dependencies: dependencies,
      });
      if (saveError)
        throw new ApiError(
          409,
          "The conversation changed or could not be saved. Open it again before retrying.",
        );
      saved = true;
    }
    return Response.json(
      {
        ...result,
        saved,
        conversationRevision: saved
          ? memory.conversation!.revision + 1
          : undefined,
        sources: memory.sources,
        historyUsed: memory.history.length,
        omittedHistory: memory.omittedHistory,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
