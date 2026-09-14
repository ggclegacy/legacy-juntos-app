import { it, expect, vi } from "vitest";
import {
  boundedSources,
  dependenciesMatch,
  memoryInputSchema,
  type MemorySource,
} from "../src/lib/ai/memory";
import { memoryContext } from "../src/lib/ai/memory-context";
import type { SupabaseClient } from "@supabase/supabase-js";
it("bounds context while keeping the original memory intact", () => {
  const source = {
    content: "a".repeat(12000),
    title: "Large teaching",
    details: {},
  } as MemorySource;
  expect(boundedSources([source])[0].content).toHaveLength(6000);
  expect(source.content).toHaveLength(12000);
  expect(boundedSources([source])[0].details.excerpt).toBe(true);
});
it("rejects invalid audiences, unsafe source links and treats corrections as different versions", () => {
  const input = {
    title: "Preference",
    content: "Listen first",
    category: "preference",
    visibility: "private",
  };
  expect(memoryInputSchema.safeParse(input).success).toBe(true);
  expect(
    memoryInputSchema.safeParse({ ...input, visibility: "recipient" }).success,
  ).toBe(false);
  expect(
    memoryInputSchema.safeParse({ ...input, source_url: "javascript:alert(1)" })
      .success,
  ).toBe(false);
  expect(
    dependenciesMatch(
      [{ kind: "memory", id: "x", version: "2" }],
      [{ kind: "memory", id: "x", version: "1" }],
    ),
  ).toBe(false);
});
it("omits historical answers after a dependency is corrected", async () => {
  const c = {
    id: "conversation",
    owner_id: "n",
    workspace_id: "w",
    context: "private",
    revision: 1,
  };
  const turn = {
    id: "turn",
    user_message: "Question",
    assistant_message: "Outdated private answer",
    dependencies: [{ kind: "memory", id: "m", version: "1" }],
    ordinal: 1,
    created_at: "now",
  };
  const db = {
    from: (table: string) =>
      table === "apollo_conversations"
        ? {
            select: () => ({
              eq: () => ({ single: async () => ({ data: c }) }),
            }),
          }
        : {
            select: () => ({
              eq: () => ({
                order: () => ({ limit: async () => ({ data: [turn] }) }),
              }),
            }),
          },
    rpc: vi.fn().mockResolvedValue({ data: [] }),
  } as unknown as SupabaseClient;
  const result = await memoryContext(db, "n", "w", {
    context: "private",
    message: "Continue",
    recallSources: [],
    conversationId: "conversation",
    conversationRevision: 1,
  });
  expect(result.history).toEqual([]);
  expect(result.omittedHistory).toBe(true);
});
