import { it, expect, vi, afterEach } from "vitest";
import { ApiError } from "../src/lib/server";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  rpc: vi.fn(),
  extract: vi.fn(),
  research: vi.fn(),
}));
vi.mock("@/lib/server", async (original) => ({
  ...(await original<typeof import("../src/lib/server")>()),
  actor: mocks.actor,
}));
vi.mock("@/lib/ai/knowledge/provider", async (original) => ({
  ...(await original<typeof import("../src/lib/ai/knowledge/provider")>()),
  extractDocument: mocks.extract,
  researchQuestion: mocks.research,
}));
import { POST as research } from "../src/app/api/ai/knowledge/research/route";
import { POST as extract } from "../src/app/api/ai/knowledge/import/route";
const req = (v: Record<string, unknown>) =>
  new Request("http://localhost/api/ai/knowledge", {
    method: "POST",
    body: JSON.stringify(v),
  });
const input = {
  question: "What does evidence say about fatigue?",
  topic: "training",
  consent: true,
};
function setup() {
  const who = {
    user: { id: "neil" },
    membership: { workspace_id: "juntos" },
    db: { rpc: mocks.rpc },
  };
  mocks.actor.mockResolvedValue(who);
  mocks.rpc.mockResolvedValue({ data: true });
  return who;
}
afterEach(() => vi.resetAllMocks());
it("requires auth and explicit consent before any research or file processing", async () => {
  mocks.actor.mockRejectedValue(new ApiError(401, "Sign in"));
  expect((await research(req(input))).status).toBe(401);
  setup();
  expect((await research(req({ ...input, consent: false }))).status).toBe(400);
  expect(
    (
      await extract(
        req({
          filename: "x.pdf",
          mime: "application/pdf",
          data: "x",
          consent: false,
        }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.research).not.toHaveBeenCalled();
  expect(mocks.extract).not.toHaveBeenCalled();
});
it("rejects attempts to attach private memory or arbitrary tool controls to web research", async () => {
  setup();
  expect(
    (await research(req({ ...input, memory: "private text" }))).status,
  ).toBe(400);
  expect(
    (await research(req({ ...input, tools: [{ type: "file_search" }] })))
      .status,
  ).toBe(400);
  expect(mocks.research).not.toHaveBeenCalled();
});
it("discards research if the authenticated account changes during generation", async () => {
  const who = setup();
  mocks.actor
    .mockResolvedValueOnce(who)
    .mockResolvedValueOnce({ ...who, user: { id: "kamilla" } });
  mocks.research.mockResolvedValue({ text: "Synthetic research" });
  expect((await research(req(input))).status).toBe(409);
});
