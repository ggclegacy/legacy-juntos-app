import { it, expect, vi, afterEach } from "vitest";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/server", async (original) => ({
  ...(await original<typeof import("../src/lib/server")>()),
  actor: mocks.actor,
}));
import { ApiError } from "../src/lib/server";
import { GET, POST, PATCH } from "../src/app/api/studio/route";
import { POST as queue } from "../src/app/api/studio/jobs/route";
import { POST as review } from "../src/app/api/studio/reviews/route";
import { POST as metric } from "../src/app/api/studio/metrics/route";
import { POST as worker } from "../src/app/api/studio/worker/route";
const id = "00000000-0000-4000-8000-000000000001";
const request = (data: unknown) =>
  new Request("http://localhost/api/studio", {
    method: "POST",
    body: JSON.stringify(data),
  });
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("authenticates Studio reads, writes, jobs, reviews and metrics before touching data", async () => {
  mocks.actor.mockRejectedValue(new ApiError(401, "Sign in"));
  for (const handler of [GET, POST, PATCH, queue, review, metric])
    expect((await handler(request({}))).status).toBe(401);
  expect(mocks.from).not.toHaveBeenCalled();
});
it("rejects client owner injection rather than writing it", async () => {
  mocks.actor.mockResolvedValue({
    db: { from: mocks.from },
    user: { id },
    membership: { workspace_id: id },
  });
  const response = await POST(
    request({ id, entry: { kind: "brand", title: "Brand", owner_id: id } }),
  );
  expect(response.status).toBe(400);
  expect(mocks.from).not.toHaveBeenCalled();
});
it("returns setup status without calling a provider when worker is disabled", async () => {
  mocks.actor.mockResolvedValue({ db: { from: mocks.from }, user: { id } });
  vi.stubEnv("STUDIO_WORKER_ENABLED", "false");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await queue(request({}))).status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
  expect(mocks.from).not.toHaveBeenCalled();
});
it("rejects worker calls without a constant-time checked secret", async () => {
  vi.stubEnv("STUDIO_WORKER_SECRET", "test-worker-secret");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await worker(request({}))).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});
it("rejects forged review authors and imported-source metrics", async () => {
  mocks.actor.mockResolvedValue({ db: { from: mocks.from } });
  expect(
    (
      await review(
        request({
          entry_id: id,
          version_id: null,
          author_id: id,
          body: "Forged",
          decision: "approved",
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await metric(
        request({
          entry_id: id,
          platform: "instagram",
          metric: "views",
          value: 100,
          period_start: "2026-09-01",
          period_end: "2026-09-13",
          source: "api",
        }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.from).not.toHaveBeenCalled();
});
