import { actor, body, failure, ApiError } from "@/lib/server";
import { generationInput } from "@/lib/studio/model";
import { routeModel, RoutingError } from "@/lib/studio/router";
import { creativeContext } from "@/lib/studio/context";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    const { db, user } = await actor(request);
    if (
      process.env.STUDIO_WORKER_ENABLED !== "true" ||
      !process.env.STUDIO_WORKER_SECRET ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    )
      throw new ApiError(
        503,
        "Generation is not enabled. Connect providers and the durable Studio worker first.",
      );
    const p = z
      .object({ id: z.uuid(), input: generationInput })
      .strict()
      .safeParse(await body(request));
    if (!p.success) throw new ApiError(400, p.error.issues[0].message);
    const model = routeModel(p.data.input);
    const context = await creativeContext(db, user.id, p.data.input);
    const { data, error } = await db
      .from("studio_jobs")
      .insert({
        id: p.data.id,
        entry_id: p.data.input.entry_id,
        request: {
          ...p.data.input,
          model_key: model.key,
          reference_version_ids: context.references.map((r) => r.version.id),
        },
        provider: model.provider,
        model: model.model,
      })
      .select("id,entry_id,state,provider,model,error,created_at,attempts")
      .single();
    if (error)
      throw new ApiError(
        409,
        "Could not queue this request. Check the job list before retrying; hourly limit is 20 requests.",
      );
    return Response.json(
      { job: data },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(
      e instanceof RoutingError ? new ApiError(503, e.message) : e,
    );
  }
}
