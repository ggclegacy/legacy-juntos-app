import { z } from "zod";
export const memoryCategories = [
  "fact",
  "preference",
  "lesson",
  "workflow",
  "decision",
] as const;
export const recallKinds = [
  "memory",
  "record",
  "conversation",
  "training",
  "nutrition",
  "protocol",
] as const;
export type RecallKind = (typeof recallKinds)[number];
export const recallLabels: Record<RecallKind, string> = {
  memory: "Teachings & preferences",
  record: "Life, projects & shared plans",
  conversation: "Past conversations",
  training: "Training & prep",
  nutrition: "Nutrition",
  protocol: "Protocols & labs",
};
export const memoryInputSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    content: z.string().trim().min(1).max(12000),
    category: z.enum(memoryCategories),
    visibility: z.enum(["private", "shared", "recipient"]),
    recipient_id: z.uuid().nullable().default(null),
    status: z.enum(["active", "archived"]).default("active"),
    pinned: z.boolean().default(false),
    effective_on: z.iso.date().nullable().default(null),
    source_note: z.string().trim().max(1000).default(""),
    source_url: z
      .union([
        z.literal(""),
        z
          .url()
          .max(2000)
          .refine((v) => /^https?:\/\//.test(v)),
      ])
      .default(""),
  })
  .strict()
  .refine((v) =>
    v.visibility === "recipient" ? !!v.recipient_id : v.recipient_id === null,
  );
export type MemoryInput = z.infer<typeof memoryInputSchema>;
export type ApolloMemory = MemoryInput & {
  id: string;
  owner_id: string;
  workspace_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
};
export type Conversation = {
  record_ids?: string[];
  id: string;
  owner_id: string;
  workspace_id: string;
  title: string;
  context: "private" | "shared";
  revision: number;
  updated_at: string;
};
export type Dependency = { kind: RecallKind; id: string; version: string };
export type MemorySource = Dependency & {
  title: string;
  content: string;
  owner_id: string;
  visibility: string;
  updated_at: string;
  pinned: boolean;
  details: Record<string, unknown>;
};
export type ConversationTurn = {
  id: string;
  ordinal: number;
  user_message: string;
  assistant_message: string;
  dependencies: Dependency[];
  created_at: string;
};
export const memoryActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("teach"), input: memoryInputSchema }).strict(),
  z
    .object({
      action: z.literal("correct"),
      id: z.uuid(),
      revision: z.number().int().positive(),
      input: memoryInputSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("forget"),
      id: z.uuid(),
      revision: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      action: z.literal("new_conversation"),
      recordIds: z.array(z.uuid()).max(12).default([]),
      title: z.string().trim().min(1).max(180),
      context: z.enum(["private", "shared"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("delete_conversation"),
      id: z.uuid(),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
]);
export function dependenciesMatch(
  expected: Dependency[],
  actual: Dependency[],
) {
  const keys = new Set(actual.map((d) => `${d.kind}:${d.id}:${d.version}`));
  return expected.every((d) => keys.has(`${d.kind}:${d.id}:${d.version}`));
}
export function mergeDependencies(...groups: Dependency[][]): Dependency[] {
  return [
    ...new Map(
      groups
        .flat()
        .map((d) => [
          `${d.kind}:${d.id}:${d.version}`,
          { kind: d.kind, id: d.id, version: d.version },
        ]),
    ).values(),
  ];
}
export function sourceAllowed(
  s: MemorySource,
  owner: string,
  context: "private" | "shared",
) {
  // RLS also enforces recipient/workspace visibility; this is a second audience guard.
  if (context === "shared")
    return (
      (s.kind === "conversation" && s.owner_id === owner) ||
      ((s.kind === "memory" || s.kind === "record") &&
        s.visibility === "shared")
    );
  return (
    s.owner_id === owner ||
    ((s.kind === "memory" || s.kind === "record") &&
      ["shared", "recipient"].includes(s.visibility))
  );
}
export function boundedSources(sources: MemorySource[], budget = 24000) {
  const result: MemorySource[] = [];
  for (const source of sources.slice(0, 12)) {
    if (budget < 500) break;
    const content = source.content.slice(0, Math.min(6000, budget));
    result.push({
      ...source,
      content,
      details: {
        ...source.details,
        excerpt:
          content.length < source.content.length || !!source.details.excerpt,
      },
    });
    budget -= content.length + source.title.length + 300;
  }
  return result;
}
