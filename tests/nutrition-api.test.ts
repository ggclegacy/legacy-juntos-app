import { it, expect, vi, afterEach } from "vitest";
import { ApiError } from "../src/lib/server";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/server", async (original) => ({
  ...(await original<typeof import("../src/lib/server")>()),
  actor: mocks.actor,
}));
import { GET, POST } from "../src/app/api/nutrition/route";
import { GET as search } from "../src/app/api/nutrition/search/route";
import { POST as analyze } from "../src/app/api/nutrition/analyze/route";
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function setup() {
  mocks.actor.mockResolvedValue({
    db: { rpc: mocks.rpc },
    user: { id: "owner" },
    membership: { workspace_id: "space" },
  });
  mocks.rpc.mockResolvedValue({ data: true });
}
function req(data: unknown) {
  return new Request("http://localhost/api/nutrition/analyze", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
it("requires authentication for diary, food lookup and all AI input", async () => {
  mocks.actor.mockRejectedValue(new ApiError(401, "Sign in"));
  for (const fn of [GET, POST, search, analyze])
    expect(
      (await fn(new Request("http://localhost/api/nutrition"))).status,
    ).toBe(401);
});
it("requires consent and keeps unconfigured requests off the network", async () => {
  setup();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  vi.stubEnv("NUTRITION_AI_ENABLED", "false");
  expect(
    (await analyze(req({ mode: "text", text: "rice", consent: false }))).status,
  ).toBe(400);
  expect(
    (await analyze(req({ mode: "text", text: "rice", consent: true }))).status,
  ).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
it("rejects image URLs rather than fetching third-party private assets", async () => {
  setup();
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubEnv("OPENAI_MODEL", "test");
  vi.stubEnv("USDA_API_KEY", "test");
  vi.stubEnv("NUTRITION_AI_ENABLED", "true");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(
    (
      await analyze(
        req({
          mode: "text",
          text: "rice",
          image: "https://example.com/private.jpg",
          consent: true,
        }),
      )
    ).status,
  ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it("normalizes label mass and revalidates identity before returning a draft", async () => {
  setup();
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubEnv("OPENAI_MODEL", "test");
  vi.stubEnv("NUTRITION_AI_ENABLED", "true");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    name: "Test label",
                    brand: "Test",
                    basisGrams: 50,
                    nutrition: { kcal: 100, protein: 5, carbs: 15, fat: 2 },
                    notes: [],
                  }),
                },
              ],
            },
          ],
        }),
      ),
  );
  const response = await analyze(
    req({
      mode: "label",
      text: "",
      image: "data:image/jpeg;base64,/9j/AA==",
      consent: true,
    }),
  );
  expect(response.status).toBe(200);
  expect((await response.json()).label.per100).toEqual({
    kcal: 200,
    protein: 10,
    carbs: 30,
    fat: 4,
  });
  expect(mocks.actor).toHaveBeenCalledTimes(2);
});
