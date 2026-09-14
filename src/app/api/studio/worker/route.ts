import { timingSafeEqual } from "node:crypto";
import { runStudioWorker } from "@/lib/studio/worker";
export const maxDuration = 300;
export async function POST(request: Request) {
  const expected = process.env.STUDIO_WORKER_SECRET,
    provided = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (
    !expected ||
    !provided ||
    Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (
    process.env.STUDIO_WORKER_ENABLED !== "true" ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    return Response.json(
      { error: "Worker is not configured" },
      { status: 503 },
    );
  try {
    return Response.json(await runStudioWorker(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Worker storage is unavailable" },
      { status: 503 },
    );
  }
}
