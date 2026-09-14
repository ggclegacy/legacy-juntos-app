import { z } from "zod";
export const topics = [
  "training",
  "nutrition",
  "wellness",
  "faith",
  "communication",
  "business",
  "creativity",
] as const;
export type KnowledgeTopic = (typeof topics)[number];
export const topicLabels: Record<KnowledgeTopic, string> = {
  training: "Training & bodybuilding",
  nutrition: "Nutrition & fuel",
  wellness: "Wellness & recovery",
  faith: "Faith & Scripture",
  communication: "Connection & communication",
  business: "Business & strategy",
  creativity: "Creativity & craft",
};
export const origins = [
  "personal_note",
  "coach_document",
  "published_reference",
  "research_draft",
] as const;
export const originLabels: Record<(typeof origins)[number], string> = {
  personal_note: "Your own notes",
  coach_document: "Coach / professional document",
  published_reference: "Published reference",
  research_draft: "AI research · review required",
};
export function safeSourceUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
    );
  } catch {
    return false;
  }
}
export const referenceSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    url: z.string().max(2000).refine(safeSourceUrl),
  })
  .strict();
export const documentInputSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    content: z.string().trim().min(1).max(60000),
    topic: z.enum(topics),
    origin: z.enum(origins),
    visibility: z.enum(["private", "shared", "recipient"]),
    recipient_id: z.uuid().nullable(),
    status: z.enum(["draft", "active", "archived"]),
    references: z.array(referenceSchema).max(20),
    source_name: z.string().trim().max(240),
    published_on: z.iso.date().nullable(),
    review_on: z.iso.date().nullable(),
    notes: z.string().max(2000),
  })
  .strict()
  .refine((v) =>
    v.visibility === "recipient" ? !!v.recipient_id : v.recipient_id === null,
  );
export type KnowledgeInput = z.infer<typeof documentInputSchema>;
export type KnowledgeDocument = KnowledgeInput & {
  id: string;
  owner_id: string;
  workspace_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};
export const knowledgeActionSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("create"), input: documentInputSchema })
    .strict(),
  z
    .object({
      action: z.literal("update"),
      id: z.uuid(),
      revision: z.number().int().positive(),
      input: documentInputSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("delete"),
      id: z.uuid(),
      revision: z.number().int().positive(),
    })
    .strict(),
]);
export const newKnowledge = (
  topic: KnowledgeTopic = "training",
): KnowledgeInput => ({
  title: "",
  content: "",
  topic,
  origin: "personal_note",
  visibility: "private",
  recipient_id: null,
  status: "draft",
  references: [],
  source_name: "",
  published_on: null,
  review_on: null,
  notes: "",
});
export type ResearchCitation = {
  start: number;
  end: number;
  url: string;
  title: string;
};
export type ResearchResult = {
  text: string;
  citations: ResearchCitation[];
  references: { title: string; url: string }[];
  searchedAt: string;
};
export function researchToDraft(
  result: ResearchResult,
  question: string,
  topic: KnowledgeTopic,
): KnowledgeInput {
  return {
    ...newKnowledge(topic),
    title: question.slice(0, 180),
    origin: "research_draft",
    content: result.text,
    references: result.references.slice(0, 20),
    source_name: "Apollo web research",
    notes: `AI synthesis from web research on ${result.searchedAt}. Review each source, its population and publication date before activating.`,
    status: "draft",
  };
}
