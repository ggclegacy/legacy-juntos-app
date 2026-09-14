import { it, expect, vi, afterEach } from "vitest";
import { ApiError } from "../src/lib/server";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  embed: vi.fn(),
  learn: vi.fn(),
  rpc: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/lib/server", async (original) => ({
  ...(await original<typeof import("../src/lib/server")>()),
  actor: mocks.actor,
}));
vi.mock("@/lib/ai/embeddings", () => ({
  EMBEDDING_VERSION: "test",
  embedTexts: mocks.embed,
}));
vi.mock("@/lib/ai/learning", () => ({ proposeLearning: mocks.learn }));
import { POST } from "../src/app/api/ai/intelligence/route";
function req(p: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/ai/intelligence", {
    method: "POST",
    body: JSON.stringify({
      action: "index",
      context: "private",
      sources: ["memory"],
      consent: true,
      ...p,
    }),
  });
}
function setup() {
  const who = {
    user: { id: "n" },
    membership: { workspace_id: "w" },
    db: { rpc: mocks.rpc, from: () => ({ upsert: mocks.upsert }) },
  };
  mocks.actor.mockResolvedValue(who);
  return who;
}
afterEach(() => vi.resetAllMocks());
it("rejects unauthenticated, nonconsenting and shared health requests before provider access", async () => {
  mocks.actor.mockRejectedValue(new ApiError(401, "Sign in"));
  expect((await POST(req())).status).toBe(401);
  setup();
  expect((await POST(req({ consent: false }))).status).toBe(400);
  expect(
    (await POST(req({ context: "shared", sources: ["protocol"] }))).status,
  ).toBe(400);
  expect(mocks.embed).not.toHaveBeenCalled();
  expect(mocks.learn).not.toHaveBeenCalled();
});
it("rejects a source from another person's private partition before indexing", async () => {
  setup();
  mocks.rpc
    .mockResolvedValueOnce({ data: true })
    .mockResolvedValueOnce({
      data: [
        {
          kind: "memory",
          id: "m",
          version: "1",
          owner_id: "k",
          visibility: "private",
          title: "Private",
          content: "Not authorized",
        },
      ],
    });
  expect((await POST(req())).status).toBe(403);
  expect(mocks.embed).not.toHaveBeenCalled();
});
it("does not save vectors if the account changes during the provider call", async () => {
  const who = setup();
  mocks.actor
    .mockResolvedValueOnce(who)
    .mockResolvedValueOnce({ ...who, user: { id: "k" } });
  mocks.rpc
    .mockResolvedValueOnce({ data: true })
    .mockResolvedValueOnce({
      data: [
        {
          kind: "memory",
          id: "m",
          version: "1",
          owner_id: "n",
          visibility: "private",
          title: "My preference",
          content: "Evenings",
        },
      ],
    });
  mocks.embed.mockResolvedValue([[1]]);
  expect((await POST(req())).status).toBe(409);
  expect(mocks.upsert).not.toHaveBeenCalled();
});
