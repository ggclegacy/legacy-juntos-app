import { it, expect, vi, afterEach } from "vitest";
import { ApiError } from "../src/lib/server";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  upload: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/server", async (original) => ({
  ...(await original<typeof import("../src/lib/server")>()),
  actor: mocks.actor,
}));
import { GET, POST } from "../src/app/api/protocols/route";
import {
  POST as upload,
  GET as files,
} from "../src/app/api/protocols/files/route";
import { POST as analyze } from "../src/app/api/protocols/analyze/route";
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("requires authentication for health records, uploads, downloads and AI", async () => {
  mocks.actor.mockRejectedValue(new ApiError(401, "Sign in"));
  for (const fn of [GET, POST, upload, files, analyze])
    expect(
      (await fn(new Request("http://localhost/api/protocols"))).status,
    ).toBe(401);
});
it("does not send health data to an unconfigured AI provider", async () => {
  mocks.actor.mockResolvedValue({
    db: { rpc: mocks.rpc },
    user: { id: "owner" },
    membership: { workspace_id: "space" },
  });
  vi.stubEnv("HEALTH_AI_ENABLED", "false");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const r = await analyze(
    new Request("http://localhost/api/protocols/analyze", {
      method: "POST",
      body: JSON.stringify({ consent: true }),
    }),
  );
  expect(r.status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
it("requires explicit health AI consent", async () => {
  mocks.actor.mockResolvedValue({
    db: {},
    user: { id: "owner" },
    membership: { workspace_id: "space" },
  });
  expect(
    (
      await analyze(
        new Request("http://localhost/api/protocols/analyze", {
          method: "POST",
          body: "{}",
        }),
      )
    ).status,
  ).toBe(400);
});
it("rejects file content that does not match its type", async () => {
  mocks.actor.mockResolvedValue({
    db: { storage: { from: () => ({ upload: mocks.upload }) } },
    user: { id: "owner" },
  });
  const r = await upload(
    new Request("http://localhost/api/protocols/files", {
      method: "POST",
      body: JSON.stringify({
        name: "report.pdf",
        type: "application/pdf",
        base64: Buffer.from("<script>bad</script>").toString("base64"),
      }),
    }),
  );
  expect(r.status).toBe(400);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("rejects cross-owner paths before creating download authorization", async () => {
  mocks.actor.mockResolvedValue({ db: {}, user: { id: "owner" } });
  expect(
    (
      await files(
        new Request(
          "http://localhost/api/protocols/files?file=other/report.pdf",
        ),
      )
    ).status,
  ).toBe(400);
});
