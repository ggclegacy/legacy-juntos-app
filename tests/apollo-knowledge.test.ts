import { it, expect, vi, afterEach } from "vitest";
import {
  parseResearch,
  validateImport,
  extractDocument,
  researchQuestion,
} from "../src/lib/ai/knowledge/provider";
import {
  newKnowledge,
  documentInputSchema,
  researchToDraft,
  safeSourceUrl,
} from "../src/lib/ai/knowledge/model";
import { sourceAllowed } from "../src/lib/ai/memory";
import type { MemorySource } from "../src/lib/ai/memory";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const research = {
  output: [
    { type: "web_search_call", status: "completed" },
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: "Training evidence [1]",
          annotations: [
            {
              type: "url_citation",
              start_index: 18,
              end_index: 21,
              url: "https://acsm.org/example",
              title: "Reference",
            },
          ],
        },
      ],
    },
  ],
};
it("accepts attributed citations and returns only private review drafts", () => {
  const result = parseResearch(research);
  expect(result.references[0].url).toBe("https://acsm.org/example");
  expect(
    researchToDraft(result, "Training question", "training"),
  ).toMatchObject({
    visibility: "private",
    status: "draft",
    origin: "research_draft",
  });
});
it("rejects uncited answers, fake completed searches and unsafe source URLs", () => {
  expect(() => parseResearch({ output: research.output.slice(1) })).toThrow(
    /complete/,
  );
  const tampered = structuredClone(research);
  const a = tampered.output[1].content![0].annotations![0];
  a.url = "javascript:alert(1)";
  expect(() => parseResearch(tampered)).toThrow(/cited/);
  expect(safeSourceUrl("https://user:password@example.com")).toBe(false);
  expect(safeSourceUrl("data:text/html,hello")).toBe(false);
});
it("requires a supported file signature before sending a document", () => {
  expect(() =>
    validateImport({
      filename: "x.pdf",
      mime: "application/pdf",
      data:
        "data:application/pdf;base64," +
        Buffer.from("<script>hello</script>").toString("base64"),
      consent: true,
    }),
  ).toThrow(/supported/);
  expect(() =>
    validateImport({
      filename: "x.pdf",
      mime: "application/pdf",
      data: "https://example.com/file.pdf",
      consent: true,
    }),
  ).toThrow(/format/);
});
it("validates document limits and prevents private knowledge in Juntos context", () => {
  expect(
    documentInputSchema.safeParse({
      ...newKnowledge(),
      title: "A",
      content: "x".repeat(60001),
    }).success,
  ).toBe(false);
  expect(
    sourceAllowed(
      {
        kind: "knowledge",
        owner_id: "n",
        visibility: "private",
      } as MemorySource,
      "n",
      "shared",
    ),
  ).toBe(false);
  expect(
    sourceAllowed(
      {
        kind: "knowledge",
        owner_id: "k",
        visibility: "shared",
      } as MemorySource,
      "n",
      "shared",
    ),
  ).toBe(true);
});
it("keeps research questions isolated and requires the real search tool", async () => {
  vi.stubEnv("OPENAI_API_KEY", "synthetic");
  vi.stubEnv("OPENAI_MODEL", "test-model");
  const fetcher = vi.fn().mockResolvedValue(Response.json(research));
  vi.stubGlobal("fetch", fetcher);
  await researchQuestion("Resistance training evidence", "training");
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.store).toBe(false);
  expect(body.tool_choice).toBe("required");
  expect(body.tools[0].type).toBe("web_search");
  expect(body.tools[0].filters.allowed_domains).toContain("acsm.org");
  expect(JSON.parse(body.input)).toEqual({
    question: "Resistance training evidence",
    topic: "training",
  });
  expect(body.input).not.toContain("memory");
});
it("returns a validated extraction draft without persistent file uploads or automatic storage", async () => {
  vi.stubEnv("OPENAI_API_KEY", "synthetic");
  vi.stubEnv("OPENAI_MODEL", "test-model");
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  text: "Squat: 3 sets",
                  complete: false,
                  limitations: ["Page 2 unclear"],
                }),
              },
            ],
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = await extractDocument({
    filename: "coach.pdf",
    mime: "application/pdf",
    data:
      "data:application/pdf;base64," +
      Buffer.from("%PDF-synthetic fixture").toString("base64"),
    consent: true,
  });
  expect(result.complete).toBe(false);
  expect(result.limitations).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.input[0].content[1].type).toBe("input_file");
  expect(body.store).toBe(false);
  expect(body.text.format.strict).toBe(true);
});
it("bounds source metadata as well as the passage text", async () => {
  const { boundedSources } = await import("../src/lib/ai/memory");
  const source = {
    kind: "knowledge",
    title: "A reference",
    content: "passage",
    details: {
      references: Array.from({ length: 20 }, () => ({
        url: "https://example.com/" + "x".repeat(1800),
        title: "Source",
      })),
      origin: "published_reference",
    },
  } as unknown as MemorySource;
  const result = boundedSources([source]);
  expect(JSON.stringify(result).length).toBeLessThan(5000);
  expect(result[0].details.detailsOmitted).toBe(true);
});
