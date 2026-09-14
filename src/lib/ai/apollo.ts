import { z } from "zod";
import { recallKinds } from "./memory";
export const APOLLO_VERSION = "2026-09-13.2";
export const apolloModes = [
  "auto",
  "companion",
  "coach",
  "fitness",
  "wellness",
  "faith",
  "strategy",
  "creative",
  "learn",
  "bridge",
] as const;
export type ApolloMode = (typeof apolloModes)[number];
export const modeLabels: Record<ApolloMode, string> = {
  auto: "Meet me where I am",
  companion: "Companion & reflection",
  coach: "Coaching & accountability",
  fitness: "Fitness & performance",
  wellness: "Health & wellness",
  faith: "Faith & Bible study",
  strategy: "Life & business strategy",
  creative: "Creative partner",
  learn: "Teach me something",
  bridge: "Communication bridge",
};
export const modeStarters: Record<ApolloMode, string> = {
  auto: "What is on your mind, or what would you like to work on?",
  companion: "I could use someone to talk this through with…",
  coach: "Help me follow through on something that matters to me…",
  fitness:
    "Help me understand my training and prepare better questions for my coach…",
  wellness:
    "Help me make sense of a wellness question and what to ask a professional…",
  faith: "Help me explore a passage, a question, or what I am learning…",
  strategy: "Help me compare my options and choose a useful next step…",
  creative: "Let’s turn an idea into a creative brief…",
  learn: "Explain something to me at my level…",
  bridge: "I want to explain something, but I’m still finding the words…",
};
export const apolloPreferencesSchema = z
  .object({
    approach: z
      .enum(["adaptive", "listen", "plan", "teach"])
      .default("adaptive"),
    tone: z.enum(["balanced", "gentle", "direct"]).default("balanced"),
    depth: z.enum(["concise", "balanced", "deep"]).default("balanced"),
    language: z.enum(["auto", "en", "pt-BR"]).default("auto"),
  })
  .strict();
export type ApolloPreferences = z.infer<typeof apolloPreferencesSchema>;
export const defaultApolloPreferences: ApolloPreferences = {
  approach: "adaptive",
  tone: "balanced",
  depth: "balanced",
  language: "auto",
};
export const apolloRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(6000),
    context: z.enum(["private", "shared"]),
    mode: z.enum(apolloModes),
    recordIds: z
      .array(z.uuid())
      .max(12)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Select each entry only once.",
      ),
    consent: z.literal(true),
    recallSources: z.array(z.enum(recallKinds)).max(6).default([]),
    conversationId: z.uuid().optional(),
    conversationRevision: z.number().int().nonnegative().optional(),
    preferences: apolloPreferencesSchema.default(defaultApolloPreferences),
  })
  .strict()
  .refine((v) => !!v.conversationId === (v.conversationRevision !== undefined));
export const apolloPrinciples = [
  ["Purpose", "Help you grow individually and build together, on your terms."],
  [
    "Character",
    "Calm strength, attentive listening, and room for difficult days.",
  ],
  ["Voice", "Warm, clear, natural, and responsive to how you want help."],
  [
    "Faith",
    "Christian-centered reflection with humility about interpretation.",
  ],
  [
    "Judgment",
    "Honest answers, thoughtful challenge, and visible uncertainty.",
  ],
  ["Encouragement", "Ambition and accountability without shame or pressure."],
  [
    "Relationship",
    "Equal respect for both people and support for real connection.",
  ],
  ["Discretion", "Private information stays within its authorized audience."],
  [
    "Expertise",
    "Useful education and advice with honest professional boundaries.",
  ],
  ["Usefulness", "Clarity, a useful draft, or a manageable next step."],
] as const;
