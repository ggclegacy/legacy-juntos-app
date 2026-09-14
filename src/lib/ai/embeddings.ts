import { z } from "zod";
import { ApiError } from "../server";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 512;
export const EMBEDDING_VERSION = `${EMBEDDING_MODEL}:512:source-v1`;
export const vectorSchema = z
  .array(z.number().finite())
  .length(EMBEDDING_DIMENSIONS)
  .refine((v) => v.some((x) => x !== 0));
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY)
    throw new ApiError(
      503,
      "Connect Apollo before preparing meaning-based recall.",
    );
  if (
    !texts.length ||
    texts.length > 12 ||
    texts.some((t) => !t.trim() || t.length > 6500)
  )
    throw new ApiError(400, "Embedding batch is too large.");
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: "float",
      input: texts,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new ApiError(
      503,
      "Meaning-based recall is temporarily unavailable. Keyword recall remains available.",
    );
  const parsed = z
    .object({
      data: z.array(
        z.object({ index: z.number().int().min(0), embedding: vectorSchema }),
      ),
    })
    .safeParse(await response.json());
  if (
    !parsed.success ||
    parsed.data.data.length !== texts.length ||
    new Set(parsed.data.data.map((x) => x.index)).size !== texts.length ||
    parsed.data.data.some((x) => x.index >= texts.length)
  )
    throw new ApiError(503, "The embedding response could not be verified.");
  return parsed.data.data
    .sort((a, b) => a.index - b.index)
    .map((x) => x.embedding);
}
