import { it, expect, vi, afterEach } from "vitest";
import { blankProgram } from "../src/lib/training/model";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/server")>();
  return { ...actual, actor: mocks.actor };
});
import { POST } from "../src/app/api/training/generate/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const input = {
  goal: "Build strength",
  experience: "Intermediate",
  days: 1,
  minutes: 45,
  equipment: "Dumbbells",
  preferences: "",
};
function request() {
  return new Request("http://localhost/api/training/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
function configured() {
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("OPENAI_MODEL", "test-model");
  mocks.actor.mockResolvedValue({ db: { rpc: mocks.rpc } });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
}
it("does not simulate AI without a configured connection", async () => {
  configured();
  vi.stubEnv("OPENAI_API_KEY", "");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const result = await POST(request());
  expect(result.status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
it("validates generated programs and never gives the provider mutation tools", async () => {
  configured();
  const program = blankProgram();
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [{ type: "output_text", text: JSON.stringify(program) }],
            },
          ],
        }),
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.json()).program.source).toBe("ai");
  const sent = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(sent.store).toBe(false);
  expect(sent.tools).toBeUndefined();
  expect(JSON.parse(sent.input).preferences).toEqual(input);
  expect(mocks.rpc).toHaveBeenCalledWith("consume_ai_request");
  expect(mocks.actor).toHaveBeenCalledTimes(2);
});
it("rejects malformed output and schedule mismatches rather than activating them", async () => {
  configured();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            output: [
              {
                content: [{ type: "output_text", text: '{"kind":"program"}' }],
              },
            ],
          }),
        ),
      ),
  );
  expect((await POST(request())).status).toBe(502);
});
it("enforces the generation request limit before calling the provider", async () => {
  configured();
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await POST(request())).status).toBe(429);
  expect(fetcher).not.toHaveBeenCalled();
});
