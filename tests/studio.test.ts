import { describe, it, expect, vi, afterEach } from "vitest";
import {
  entryInput,
  generationInput,
  audienceFits,
  readable,
  strategicGaps,
} from "../src/lib/studio/model";
import { routeModel, providerStatus } from "../src/lib/studio/router";
import {
  OpenAICreativeAdapter,
  RunwayCreativeAdapter,
  ElevenLabsCreativeAdapter,
} from "../src/lib/studio/providers";
import { sniffMedia } from "../src/lib/studio/media";
const id = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
const request = (extra = {}) =>
  generationInput.parse({
    entry_id: id,
    modality: "image",
    prompt: "A considered product portrait",
    provider_consent: true,
    ...extra,
  });
afterEach(() => vi.unstubAllGlobals());
describe("Studio boundaries and routing", () => {
  it("rejects ownership injection and invalid named audiences", () => {
    expect(
      entryInput.safeParse({ kind: "brand", title: "Brand", owner_id: other })
        .success,
    ).toBe(false);
    expect(
      entryInput.safeParse({
        kind: "brand",
        title: "Brand",
        visibility: "recipient",
      }).success,
    ).toBe(false);
  });
  it("requires private personal references and explicit Performance extract consent", () => {
    expect(
      entryInput.safeParse({
        kind: "reference",
        title: "Person",
        visibility: "shared",
        details: { reference_type: "person" },
      }).success,
    ).toBe(false);
    expect(
      entryInput.safeParse({
        kind: "idea",
        title: "Prep",
        details: { source_kind: "performance_extract" },
      }).success,
    ).toBe(false);
  });
  it("never expands a private parent audience", () => {
    expect(
      audienceFits(
        { owner_id: id, visibility: "shared", recipient_id: null },
        { owner_id: id, visibility: "private", recipient_id: null },
      ),
    ).toBe(false);
    expect(
      audienceFits(
        { owner_id: other, visibility: "private", recipient_id: null },
        { owner_id: id, visibility: "recipient", recipient_id: other },
      ),
    ).toBe(true);
    expect(
      readable(
        {
          owner_id: id,
          workspace_id: id,
          visibility: "shared",
          recipient_id: null,
        },
        other,
        other,
      ),
    ).toBe(false);
  });
  it("chooses quality or speed without embedding models in product intent", () => {
    expect(routeModel(request(), { OPENAI_API_KEY: "test" }).key).toBe(
      "image-quality",
    );
    expect(
      routeModel(request({ preference: "speed" }), { OPENAI_API_KEY: "test" })
        .key,
    ).toBe("image-fast");
  });
  it("fails closed for credentials, unsupported square video, transparent video and excessive references", () => {
    expect(() => routeModel(request(), {})).toThrow();
    expect(() =>
      routeModel(request({ modality: "video", ratio: "1:1" }), {
        RUNWAYML_API_SECRET: "test",
      }),
    ).toThrow();
    expect(() =>
      routeModel(
        request({ modality: "video", ratio: "9:16", transparent: true }),
        { RUNWAYML_API_SECRET: "test" },
      ),
    ).toThrow();
    expect(() =>
      routeModel(
        request({
          modality: "video",
          ratio: "9:16",
          reference_ids: [id, other],
        }),
        { RUNWAYML_API_SECRET: "test" },
      ),
    ).toThrow();
  });
  it("counts an edit source against image reference capacity", () => {
    expect(() =>
      routeModel(
        request({
          parent_version_id: id,
          reference_ids: [id, other, id, other],
        }),
        { OPENAI_API_KEY: "test" },
      ),
    ).toThrow();
  });
  it("requires explicit consent and rejects invented advanced options", () => {
    expect(
      generationInput.safeParse({ ...request(), provider_consent: false })
        .success,
    ).toBe(false);
    expect(
      generationInput.safeParse({ ...request(), native_audio: true }).success,
    ).toBe(false);
  });
  it("does not enable generation merely because a provider key exists", () => {
    expect(
      providerStatus({ OPENAI_API_KEY: "test" }).every((p) => !p.enabled),
    ).toBe(true);
    expect(strategicGaps([]).join(" ")).not.toMatch(/followers|%|engagement/);
  });
  it("checks binary file signatures", () => {
    expect(
      sniffMedia(Buffer.from("<svg>untrusted content</svg>"), "image/png"),
    ).toBe(false);
    expect(
      sniffMedia(
        Buffer.concat([
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
          Buffer.alloc(10),
        ]),
        "image/png",
      ),
    ).toBe(true);
  });
});
describe("official provider payload contracts with test responses", () => {
  it("uses image edit multipart references and returns binary output", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from("test bytes").toString("base64") }],
          usage: { total_tokens: 9 },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const r = request({
      reference_ids: [other],
      transparent: true,
      ratio: "9:16",
    });
    const result = await new OpenAICreativeAdapter().submit(
      r,
      routeModel(r, { OPENAI_API_KEY: "test" }),
      "brand data",
      [{ bytes: new Uint8Array([1, 2]), mime: "image/png" }],
    );
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://api.openai.com/v1/images/edits",
    );
    const form = fetcher.mock.calls[0][1].body as FormData;
    expect(form.get("background")).toBe("transparent");
    expect(form.get("size")).toBe("864x1536");
    expect(form.getAll("image[]")).toHaveLength(1);
    expect(result.state).toBe("completed");
  });
  it("does not auto-fallback or retry an ambiguous paid submission", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      new OpenAICreativeAdapter().submit(
        request(),
        routeModel(request(), { OPENAI_API_KEY: "test" }),
        "",
        [],
      ),
    ).rejects.toMatchObject({ ambiguous: true, retryable: false });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("marks explicit throttling retryable and 5xx ambiguous", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("", { status: 429, headers: { "retry-after": "45" } }),
        ),
    );
    await expect(
      new OpenAICreativeAdapter().submit(
        request(),
        routeModel(request(), { OPENAI_API_KEY: "test" }),
        "",
        [],
      ),
    ).rejects.toMatchObject({ retryable: true, retryAfter: 45 });
  });
  it("persists Runway receipt semantics and polls to completion", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "provider-task" })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "SUCCEEDED",
            output: ["https://cdn.runwayml.com/test.mp4"],
          }),
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const r = request({ modality: "video", ratio: "9:16" });
    const adapter = new RunwayCreativeAdapter();
    expect(
      await adapter.submit(
        r,
        routeModel(r, { RUNWAYML_API_SECRET: "test" }),
        "",
        [],
      ),
    ).toEqual({ state: "pending", taskId: "provider-task" });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body).toMatchObject({
      model: "gen4.5",
      ratio: "720:1280",
      duration: 5,
    });
    expect(body.audio).toBeUndefined();
    expect((await adapter.poll("provider-task")).state).toBe("completed");
    expect(fetcher.mock.calls[1][0]).toContain("/v1/tasks/provider-task");
    await expect(
      adapter.submit(
        { ...r, prompt: "x".repeat(1001) },
        routeModel(r, { RUNWAYML_API_SECRET: "test" }),
        "",
        [],
      ),
    ).rejects.toThrow("1,000 characters");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("uses the consented server voice and documented TTS model", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1, 2])));
    vi.stubGlobal("fetch", fetcher);
    const r = request({ modality: "audio" });
    await new ElevenLabsCreativeAdapter().submit(
      r,
      routeModel(r, {
        ELEVENLABS_API_KEY: "test",
        ELEVENLABS_VOICE_ID: "voice",
      }),
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      text: r.prompt,
      model_id: "eleven_v3",
    });
  });
});
