import type { GenerationInput } from "./model";
export type ModelSpec = {
  key: string;
  provider: string;
  model: string;
  modality: GenerationInput["modality"];
  ratios: string[];
  references: number;
  transparency: boolean;
  rank: number;
  speed: number;
  cost: number;
  env: string[];
  estimatedUsd?: number;
};
export const catalog: ModelSpec[] = [
  {
    key: "image-quality",
    provider: "openai",
    model: "gpt-image-2.5-sunburst",
    modality: "image",
    ratios: ["1:1", "9:16", "16:9"],
    references: 4,
    transparency: true,
    rank: 100,
    speed: 40,
    cost: 40,
    env: ["OPENAI_API_KEY"],
  },
  {
    key: "image-fast",
    provider: "openai",
    model: "gpt-image-2.5-flare",
    modality: "image",
    ratios: ["1:1", "9:16", "16:9"],
    references: 4,
    transparency: true,
    rank: 80,
    speed: 90,
    cost: 70,
    env: ["OPENAI_API_KEY"],
  },
  {
    key: "cinematic-video",
    provider: "runway",
    model: "gen4.5",
    modality: "video",
    ratios: ["9:16", "16:9"],
    references: 1,
    transparency: false,
    rank: 90,
    speed: 50,
    cost: 50,
    env: ["RUNWAYML_API_SECRET"],
    estimatedUsd: 0.6,
  },
  {
    key: "voiceover",
    provider: "elevenlabs",
    model: "eleven_v3",
    modality: "audio",
    ratios: ["1:1", "9:16", "16:9"],
    references: 0,
    transparency: false,
    rank: 90,
    speed: 70,
    cost: 70,
    env: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"],
  },
  {
    key: "creative-director",
    provider: "openai",
    model: "configured-text-model",
    modality: "text",
    ratios: ["1:1", "9:16", "16:9"],
    references: 0,
    transparency: false,
    rank: 90,
    speed: 80,
    cost: 80,
    env: ["OPENAI_API_KEY", "OPENAI_MODEL"],
  },
];
export class RoutingError extends Error {}
export function routeModel(
  input: GenerationInput,
  env: Record<string, string | undefined> = process.env,
): ModelSpec {
  const candidates = catalog.filter(
    (m) =>
      m.modality === input.modality &&
      m.ratios.includes(input.ratio) &&
      m.references >=
        input.reference_ids.length +
          (input.parent_version_id && input.modality === "image" ? 1 : 0) &&
      (!input.transparent || m.transparency) &&
      (!input.model_key || input.model_key === m.key) &&
      m.env.every((key) => Boolean(env[key])),
  );
  const metric =
    input.preference === "speed"
      ? "speed"
      : input.preference === "cost"
        ? "cost"
        : "rank";
  const selected = candidates.sort((a, b) => b[metric] - a[metric])[0];
  if (!selected)
    throw new RoutingError(
      "No connected provider supports these settings. Check Connections or simplify the request.",
    );
  return {
    ...selected,
    model: selected.modality === "text" ? env.OPENAI_MODEL! : selected.model,
  };
}
export function providerStatus(
  env: Record<string, string | undefined> = process.env,
) {
  const worker = Boolean(
    env.STUDIO_WORKER_ENABLED === "true" &&
    env.STUDIO_WORKER_SECRET &&
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return catalog.map((m) => ({
    ...m,
    env: undefined,
    configured: m.env.every((key) => Boolean(env[key])),
    enabled: worker && m.env.every((key) => Boolean(env[key])),
    model:
      m.modality === "text"
        ? env.OPENAI_MODEL || "Choose a text model during setup"
        : m.model,
  }));
}
