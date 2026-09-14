import { it, expect, vi, afterEach } from "vitest";
import { groundSuggestions, proposeLearning } from "../src/lib/ai/learning";
import { embedTexts } from "../src/lib/ai/embeddings";
const suggestion = {
  title: "Training time",
  content: "I prefer evenings",
  category: "preference",
  quote: "I prefer evenings",
  reason: "Stated preference",
  replacesId: null,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("requires a verbatim supporting quote and a known correction target", () => {
  expect(
    groundSuggestions({ suggestions: [suggestion] }, "I prefer evenings", []),
  ).toHaveLength(1);
  expect(
    groundSuggestions({ suggestions: [suggestion] }, "I prefer mornings", []),
  ).toHaveLength(0);
  expect(
    groundSuggestions(
      { suggestions: [{ ...suggestion, replacesId: "invented" }] },
      "I prefer evenings",
      [],
    ),
  ).toHaveLength(0);
});
it("validates and orders embedding results, rejecting malformed vectors", async () => {
  vi.stubEnv("OPENAI_API_KEY", "synthetic-key");
  const v = Array.from({ length: 512 }, (_, i) => (i === 0 ? 1 : 0));
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        data: [
          { index: 1, embedding: v },
          { index: 0, embedding: v.map((x) => x * 2) },
        ],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({ data: [{ index: 0, embedding: [1] }] }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect((await embedTexts(["one", "two"]))[0][0]).toBe(2);
  const payload = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(payload.dimensions).toBe(512);
  await expect(embedTexts(["one"])).rejects.toThrow(/verified/);
});
it("sends teaching proposals as structured private drafts, never writes memory", async () => {
  vi.stubEnv("OPENAI_API_KEY", "synthetic-key");
  vi.stubEnv("OPENAI_MODEL", "test-model");
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ suggestions: [suggestion] }),
              },
            ],
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect(await proposeLearning("I prefer evenings", [])).toHaveLength(1);
  const payload = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(payload.store).toBe(false);
  expect(payload.text.format.strict).toBe(true);
  expect(payload.instructions).toContain("Do not save anything");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
