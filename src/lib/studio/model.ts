import { z } from "zod";
export const kinds = [
  "brand",
  "campaign",
  "content",
  "idea",
  "asset",
  "reference",
  "template",
  "deliverable",
  "insight",
] as const;
export const stages = [
  "idea",
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "archived",
] as const;
export const platforms = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "email",
  "website",
] as const;
const text = (max = 3000) => z.string().trim().max(max).default("");
export const detailsSchema = z
  .object({
    objective: text(),
    audience: text(),
    offer: text(),
    concept: text(),
    tone: text(),
    colors: text(500),
    fonts: text(500),
    photography: text(),
    rules: text(),
    products: text(),
    pillars: text(),
    approved_claims: text(),
    forbidden_claims: text(),
    cta: text(),
    handles: text(),
    instructions: text(6000),
    hooks: text(),
    script: text(10000),
    shot_list: text(6000),
    captions: text(6000),
    visual_direction: text(),
    tasks: text(),
    budget: z.number().min(0).max(10000000).nullable().default(null),
    start_date: z.iso.date().nullable().default(null),
    end_date: z.iso.date().nullable().default(null),
    platforms: z.array(z.enum(platforms)).max(7).default([]),
    pillar: text(200),
    series: text(200),
    assignees: z.array(z.uuid()).max(2).default([]),
    tags: text(1000),
    media_type: z
      .enum(["image", "video", "audio", "text", "document"])
      .default("text"),
    reference_type: z
      .enum(["person", "product", "location", "style", "logo", "other"])
      .default("other"),
    consent: z.boolean().default(false),
    rights: text(2000),
    disclosure: text(2000),
    sponsor: text(500),
    requirements: text(6000),
    posted_url: z
      .string()
      .max(2000)
      .refine((v) => !v || /^https:\/\//i.test(v), "Use an HTTPS URL.")
      .default(""),
    boundaries: text(),
    source_kind: z.enum(["manual", "performance_extract"]).default("manual"),
    source_consent: z.boolean().default(false),
  })
  .strict();
export const entryInput = z
  .object({
    kind: z.enum(kinds),
    title: z.string().trim().min(1).max(180),
    body: text(12000),
    visibility: z.enum(["private", "recipient", "shared"]).default("private"),
    recipient_id: z.uuid().nullable().default(null),
    context: z
      .enum(["personal", "juntos", "brand", "project"])
      .default("personal"),
    brand_id: z.uuid().nullable().default(null),
    campaign_id: z.uuid().nullable().default(null),
    parent_id: z.uuid().nullable().default(null),
    status: z.enum(stages).default("draft"),
    due_at: z.iso.datetime({ offset: true }).nullable().default(null),
    details: detailsSchema.default(() => detailsSchema.parse({})),
  })
  .strict()
  .superRefine((v, ctx) => {
    if ((v.visibility === "recipient") !== Boolean(v.recipient_id))
      ctx.addIssue({
        code: "custom",
        message: "Choose a recipient for a named share only.",
      });
    if (
      v.kind === "reference" &&
      v.details.reference_type === "person" &&
      v.visibility !== "private"
    )
      ctx.addIssue({
        code: "custom",
        message: "Personal likeness references must remain private.",
      });
    if (
      v.details.source_kind === "performance_extract" &&
      !v.details.source_consent
    )
      ctx.addIssue({
        code: "custom",
        message: "Explicit consent is required for a Performance extract.",
      });
  });
export type EntryInput = z.infer<typeof entryInput>;
export type Entry = EntryInput & {
  id: string;
  owner_id: string;
  workspace_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
};
export type Version = {
  id: string;
  entry_id: string;
  parent_version_id: string | null;
  object_key: string | null;
  text_content: string;
  mime_type: string;
  byte_size: number;
  provenance: "uploaded" | "generated" | "edited";
  provider: string | null;
  model: string | null;
  created_at: string;
  usage: Record<string, unknown>;
  is_original: boolean;
};
export type Review = {
  id: string;
  entry_id: string;
  version_id: string | null;
  author_id: string;
  decision: "comment" | "approved" | "revision_requested";
  body: string;
  created_at: string;
};
export const generationInput = z
  .object({
    entry_id: z.uuid(),
    modality: z.enum(["text", "image", "video", "audio"]),
    prompt: z.string().trim().min(1).max(5000),
    intent: z.string().max(200).default("campaign"),
    ratio: z.enum(["1:1", "9:16", "16:9"]).default("1:1"),
    preference: z.enum(["quality", "speed", "cost"]).default("quality"),
    transparent: z.boolean().default(false),
    reference_ids: z.array(z.uuid()).max(4).default([]),
    reference_version_ids: z.array(z.uuid()).max(4).default([]),
    parent_version_id: z.uuid().nullable().default(null),
    provider_consent: z.literal(true),
    model_key: z.string().max(100).optional(),
  })
  .strict();
export type GenerationInput = z.infer<typeof generationInput>;
export type Job = {
  id: string;
  entry_id: string;
  state: string;
  provider: string;
  model: string;
  error: string | null;
  created_at: string;
  attempts: number;
};
export type Metric = {
  id: string;
  entry_id: string;
  platform: string;
  metric: string;
  value: number;
  period_start: string;
  period_end: string;
  source: "manual" | "api";
  observed_at: string;
};
export function readable(
  entry: Pick<
    Entry,
    "owner_id" | "workspace_id" | "visibility" | "recipient_id"
  >,
  userId: string,
  workspaceId: string,
) {
  return (
    entry.workspace_id === workspaceId &&
    (entry.owner_id === userId ||
      entry.visibility === "shared" ||
      entry.recipient_id === userId)
  );
}
export function audienceFits(
  child: Pick<Entry, "owner_id" | "visibility" | "recipient_id">,
  parent: Pick<Entry, "owner_id" | "visibility" | "recipient_id">,
) {
  if (parent.visibility === "shared") return true;
  const parentReaders = new Set([
    parent.owner_id,
    ...(parent.recipient_id ? [parent.recipient_id] : []),
  ]);
  return (
    child.visibility !== "shared" &&
    parentReaders.has(child.owner_id) &&
    (!child.recipient_id || parentReaders.has(child.recipient_id))
  );
}
export const templates = [
  {
    title: "Founder field notes",
    kind: "content",
    pillar: "Building in public",
    body: "What I built → the real obstacle → one useful lesson → what comes next.",
    cadence: "One thoughtful update each week",
  },
  {
    title: "Six weeks to the stage",
    kind: "campaign",
    pillar: "Bodybuilding journey",
    body: "Choose public milestones. Plan posing, training atmosphere, personal reflections and sponsor deliverables. Keep measurements and health details private unless deliberately selected.",
    cadence: "Two stories and one weekly chapter",
  },
  {
    title: "The product, in its world",
    kind: "campaign",
    pillar: "Product story",
    body: "Hero product portrait → materials/details → lifestyle scene → founder explanation → launch CTA.",
    cadence: "Five pieces across launch week",
  },
  {
    title: "Recovery, explained",
    kind: "content",
    pillar: "Education",
    body: "One question clients ask → practical explanation → scope and limitations → invitation to learn more. Avoid unsupported treatment claims.",
    cadence: "One lesson each week",
  },
  {
    title: "Sponsor story",
    kind: "deliverable",
    pillar: "Partnerships",
    body: "Sponsor objective → honest personal experience → approved mentions → clear disclosure → deliverables → due dates → posted links and results.",
    cadence: "Match the signed agreement",
  },
] as const;
export function strategicGaps(entries: Entry[]) {
  const content = entries.filter(
    (e) => e.kind === "content" && e.status !== "archived",
  );
  return [
    !entries.some((e) => e.kind === "brand") &&
      "Create a Brand Vault profile so every brief has a consistent voice.",
    !content.some((e) => e.due_at) &&
      "Your publishing rhythm has no dated content yet. Choose a sustainable first week.",
    content.some((e) => e.status === "review") &&
      "Work is waiting in review. Resolve feedback before creating more variants.",
    !entries.some((e) => e.kind === "deliverable") &&
      "For partnership work, capture sponsor requirements and disclosure before production.",
  ].filter((x): x is string => Boolean(x));
}
