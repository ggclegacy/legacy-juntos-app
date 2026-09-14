import { apolloInstructions } from "./apollo-instructions";
import {
  APOLLO_VERSION,
  type ApolloMode,
  type ApolloPreferences,
} from "./apollo";
import type { LifeRecord } from "../model";
export type AiRequest = {
  message: string;
  context: "private" | "shared";
  records: LifeRecord[];
  mode: ApolloMode;
  preferences?: ApolloPreferences;
};
export type AiResult = { text: string; provider: string };
export interface AiProvider {
  respond(input: AiRequest): Promise<AiResult>;
}
export interface VoiceProvider {
  connect(input: {
    context: "private" | "shared";
    recordIds: string[];
  }): Promise<{ disconnect: () => void; mute: (muted: boolean) => void }>;
}
export class OpenAIProvider implements AiProvider {
  async respond(input: AiRequest) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        store: false,
        instructions: apolloInstructions(input.mode, input.preferences),
        input: JSON.stringify({
          mode: input.mode,
          context: input.context,
          authorizedContext: input.records.map((r) => ({
            title: r.title,
            body: r.body,
            domain: r.domain,
            metadata: r.metadata,
          })),
          message: input.message,
        }),
        max_output_tokens: input.preferences?.depth === "deep" ? 2200 : 1200,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error("Provider unavailable");
    const result = await response.json();
    const text = (result.output ?? [])
      .flatMap(
        (item: { content?: { type: string; text?: string }[] }) =>
          item.content ?? [],
      )
      .filter((item: { type: string }) => item.type === "output_text")
      .map((item: { text: string }) => item.text)
      .join("\n");
    if (!text) throw new Error("Empty provider response");
    return { text, provider: "OpenAI", identityVersion: APOLLO_VERSION };
  }
}
