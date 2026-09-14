import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../server";
import {
  boundedSources,
  dependenciesMatch,
  mergeDependencies,
  sourceAllowed,
  type Conversation,
  type ConversationTurn,
  type Dependency,
  type MemorySource,
  type RecallKind,
} from "./memory";
export async function verifyDependencies(
  db: SupabaseClient,
  context: "private" | "shared",
  dependencies: Dependency[],
) {
  if (!dependencies.length) return true;
  const { data, error } = await db.rpc("check_apollo_sources", {
    p_context: context,
    p_keys: dependencies,
  });
  if (error)
    throw new ApiError(
      503,
      "Memory access could not be verified. Try again after checking the connection.",
    );
  return dependenciesMatch(dependencies, data ?? []);
}
export async function memoryContext(
  db: SupabaseClient,
  userId: string,
  workspaceId: string,
  input: {
    context: "private" | "shared";
    message: string;
    recallSources: RecallKind[];
    conversationId?: string;
    conversationRevision?: number;
  },
) {
  let conversation: Conversation | undefined;
  let history: ConversationTurn[] = [];
  let omittedHistory = false;
  if (input.conversationId) {
    const { data, error } = await db
      .from("apollo_conversations")
      .select("*")
      .eq("id", input.conversationId)
      .single();
    if (
      error ||
      !data ||
      data.owner_id !== userId ||
      data.workspace_id !== workspaceId ||
      data.context !== input.context
    )
      throw new ApiError(
        403,
        "This conversation is unavailable for this context.",
      );
    if (data.revision !== input.conversationRevision)
      throw new ApiError(
        409,
        "This conversation changed in another window. Open it again before continuing.",
      );
    conversation = data;
    const turns = await db
      .from("apollo_turns")
      .select(
        "id,ordinal,user_message,assistant_message,dependencies,created_at",
      )
      .eq("conversation_id", input.conversationId)
      .order("ordinal", { ascending: false })
      .limit(12);
    if (turns.error)
      throw new ApiError(503, "Could not load conversation history.");
    const candidates = (turns.data ?? []) as ConversationTurn[];
    let budget = 20000;
    const allDependencies = mergeDependencies(
      ...candidates.map((t) => t.dependencies),
    );
    const verified = allDependencies.length
      ? await db.rpc("check_apollo_sources", {
          p_context: input.context,
          p_keys: allDependencies,
        })
      : { data: [], error: null };
    if (verified.error)
      throw new ApiError(503, "Could not verify conversation sources.");
    for (const turn of candidates) {
      const size = turn.user_message.length + turn.assistant_message.length;
      if (
        !dependenciesMatch(turn.dependencies, verified.data ?? []) ||
        size > budget
      ) {
        omittedHistory = true;
        continue;
      }
      if (
        mergeDependencies(
          ...history.map((t) => t.dependencies),
          turn.dependencies,
        ).length > 100
      ) {
        omittedHistory = true;
        continue;
      }
      budget -= size;
      history.push(turn);
    }
    history = history.reverse();
    omittedHistory ||= (conversation?.revision ?? 0) > history.length;
  }
  let sources: MemorySource[] = [];
  if (input.recallSources.length) {
    if (
      input.context === "shared" &&
      input.recallSources.some((s) =>
        ["training", "nutrition", "protocol"].includes(s),
      )
    )
      throw new ApiError(
        400,
        "Health and performance recall is private to you.",
      );
    const { data, error } = await db.rpc("recall_apollo", {
      p_query: input.message,
      p_context: input.context,
      p_sources: input.recallSources,
      p_limit: 12,
    });
    if (error)
      throw new ApiError(
        503,
        "Recall is unavailable. Check the connection and apply memory migration 006 if needed.",
      );
    const found = (data ?? []) as MemorySource[];
    if (
      found.some(
        (s) =>
          !input.recallSources.includes(s.kind) ||
          !sourceAllowed(s, userId, input.context),
      )
    )
      throw new ApiError(403, "Memory was unavailable for this audience.");
    sources = boundedSources(found);
  }
  return {
    conversation,
    history,
    sources,
    omittedHistory,
    // Same-thread turns are immutable and deleted only with the conversation,
    // whose existence/revision is checked atomically on append. Carry external
    // source lineage, not every earlier turn ID, so long threads do not age out.
    dependencies: mergeDependencies(
      sources,
      ...history.map((t) => t.dependencies),
    ),
  };
}
