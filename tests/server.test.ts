import { describe, it, expect, vi, afterEach } from "vitest";
import { actor, body, ApiError } from "../src/lib/server";
import { OpenAIProvider } from "../src/lib/ai/provider";
afterEach(() => vi.unstubAllGlobals());
describe("request and provider boundary", () => {
  it("requires a bearer token before accessing any service", async () => {
    await expect(
      actor(new Request("http://localhost/api/records")),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("limits request bytes while reading, not after unlimited buffering", async () => {
    const request = new Request("http://localhost/api/records", {
      method: "POST",
      body: "x".repeat(32001),
    });
    await expect(body(request)).rejects.toMatchObject({ status: 413 });
  });
  it("rejects malformed JSON", async () => {
    await expect(
      body(
        new Request("http://localhost/api/records", {
          method: "POST",
          body: "{",
        }),
      ),
    ).rejects.toBeInstanceOf(ApiError);
  });
  it("provider opts out of response storage, has no write tools, and receives no hidden conversation", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  {
                    type: "output_text",
                    text: "What would you like to clarify?",
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const result = await new OpenAIProvider().respond({
      message: "Help me explain my idea",
      context: "private",
      records: [],
      mode: "bridge",
    });
    expect(result.text).toBe("What would you like to clarify?");
    const payload = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(payload.store).toBe(false);
    expect(payload.tools).toBeUndefined();
    expect(payload.previous_response_id).toBeUndefined();
    expect(JSON.parse(payload.input).authorizedContext).toEqual([]);
  });
  it("does not present provider errors as a generated answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 })),
    );
    await expect(
      new OpenAIProvider().respond({
        message: "Hello",
        context: "shared",
        records: [],
        mode: "companion",
      }),
    ).rejects.toThrow("Provider unavailable");
  });
});
