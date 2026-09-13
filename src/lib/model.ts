import { z } from "zod";
export const domains = [
  "personal",
  "connect",
  "faith",
  "performance",
  "business",
  "studio",
  "conversations",
  "vision",
  "memories",
  "legacy",
] as const;
export type Domain = (typeof domains)[number];
export const visibilitySchema = z.enum(["private", "recipient", "shared"]);
export type Visibility = z.infer<typeof visibilitySchema>;
export const setSchema = z.object({
  exercise: z.string().trim().min(1).max(100),
  reps: z.number().int().min(1).max(1000),
  weight: z.number().min(0).max(1500),
  unit: z.enum(["kg", "lb"]),
  rpe: z.number().min(1).max(10).optional(),
});
export type WorkoutSet = z.infer<typeof setSchema>;
export const metadataSchema = z
  .object({
    sets: z.array(setSchema).max(100).optional(),
    prep: z.boolean().optional(),
    stage: z
      .enum(["idea", "concept", "production", "review", "ready"])
      .optional(),
    audience: z.string().max(1000).optional(),
    objective: z.string().max(2000).optional(),
    visual: z.string().max(3000).optional(),
    deliverables: z.string().max(3000).optional(),
    passage: z.string().max(200).optional(),
    horizon: z.enum(["now", "next", "future"]).optional(),
    sleep: z.number().min(0).max(24).optional(),
    energy: z.number().int().min(1).max(5).optional(),
    bodyweight: z.number().positive().max(1000).optional(),
    unit: z.enum(["kg", "lb"]).optional(),
    amount: z.number().min(0).max(100000000).optional(),
    currency: z.enum(["USD", "BRL"]).optional(),
    prompt: z.string().max(2000).optional(),
  })
  .strict();
export const recordInput = z
  .object({
    domain: z.enum(domains),
    kind: z.enum([
      "goal",
      "habit",
      "journal",
      "reflection",
      "prayer",
      "workout",
      "wellness",
      "prep",
      "project",
      "task",
      "decision",
      "campaign",
      "conversation",
      "comment",
      "dream",
      "memory",
      "service",
      "appreciation",
      "expense",
      "ai_memory",
    ]),
    title: z.string().trim().min(1).max(180),
    body: z.string().trim().max(12000).default(""),
    visibility: visibilitySchema.default("private"),
    recipient_id: z.uuid().nullable().default(null),
    parent_id: z.uuid().nullable().default(null),
    status: z.enum(["open", "active", "done"]).default("open"),
    due_at: z.iso.date().nullable().default(null),
    metadata: metadataSchema.default({}),
  })
  .strict()
  .superRefine((v, ctx) => {
    if ((v.visibility === "recipient") !== Boolean(v.recipient_id))
      ctx.addIssue({
        code: "custom",
        message: "Choose a recipient only for a named share.",
      });
    if (
      v.kind === "expense" &&
      (v.metadata.amount === undefined || !v.metadata.currency)
    )
      ctx.addIssue({
        code: "custom",
        message: "Enter an amount and currency.",
      });
    if (v.kind === "workout" && !v.metadata.sets?.length)
      ctx.addIssue({
        code: "custom",
        message: "Add at least one workout set.",
      });
  });
export type RecordInput = z.infer<typeof recordInput>;
export type LifeRecord = RecordInput & {
  id: string;
  owner_id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
};
export type Member = {
  user_id: string;
  display_name: string;
  workspace_id: string;
};
export function canRead(
  record: LifeRecord,
  userId: string,
  workspaceId: string,
) {
  return (
    record.workspace_id === workspaceId &&
    (record.owner_id === userId ||
      record.visibility === "shared" ||
      (record.visibility === "recipient" && record.recipient_id === userId))
  );
}
export function contextRecords(
  records: LifeRecord[],
  userId: string,
  workspaceId: string,
  context: "private" | "shared",
  ids: string[],
) {
  return records
    .filter(
      (r) =>
        ids.includes(r.id) &&
        canRead(r, userId, workspaceId) &&
        (context === "private" || r.visibility === "shared"),
    )
    .slice(0, 12);
}
export function volume(sets: WorkoutSet[], unit: "kg" | "lb") {
  return sets
    .filter((s) => s.unit === unit)
    .reduce((n, s) => n + s.reps * s.weight, 0);
}
export function personalBest(
  sets: WorkoutSet[],
  exercise: string,
  unit: "kg" | "lb",
) {
  return Math.max(
    0,
    ...sets
      .filter(
        (s) =>
          s.exercise.toLowerCase() === exercise.toLowerCase() &&
          s.unit === unit,
      )
      .map((s) => s.weight),
  );
}
