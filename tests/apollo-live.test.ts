import { it } from "vitest";
import { writeFile, mkdir } from "node:fs/promises";
import scenarios from "../evals/apollo-scenarios.json";
import { OpenAIProvider } from "../src/lib/ai/provider";
import {
  APOLLO_VERSION,
  apolloModes,
  type ApolloMode,
} from "../src/lib/ai/apollo";
// Opt-in only: real billed requests, synthetic inputs, manual grading required.
it.skipIf(process.env.APOLLO_LIVE_EVAL !== "true")(
  "captures synthetic Apollo responses for human review; this is not a behavior score",
  async () => {
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)
      throw new Error(
        "Configure OPENAI_API_KEY and OPENAI_MODEL in the local environment.",
      );
    const results = [];
    for (const s of scenarios) {
      if (!apolloModes.includes(s.mode as ApolloMode))
        throw new Error("Invalid scenario role");
      const response = await new OpenAIProvider().respond({
        message: s.message,
        mode: s.mode as ApolloMode,
        context: "private",
        records: [],
      });
      results.push({
        ...s,
        response: response.text,
        review: "PENDING HUMAN REVIEW",
      });
    }
    await mkdir("test-results", { recursive: true });
    await writeFile(
      "test-results/apollo-live-review.json",
      JSON.stringify(
        {
          identityVersion: APOLLO_VERSION,
          model: process.env.OPENAI_MODEL,
          createdAt: new Date().toISOString(),
          results,
        },
        null,
        2,
      ),
    );
  },
  600000,
);
