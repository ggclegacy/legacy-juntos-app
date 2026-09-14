import { actor, failure, ApiError } from "@/lib/server";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    const { db } = await actor(request);
    const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
    const { data: entry } = await db
      .from("studio_entries")
      .select("id")
      .eq("id", id)
      .single();
    if (!entry) throw new ApiError(404, "Studio entry unavailable.");
    const results = await Promise.all([
      db
        .from("studio_versions")
        .select("*")
        .eq("entry_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("studio_reviews")
        .select("*")
        .eq("entry_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("studio_jobs")
        .select("id,entry_id,state,provider,model,error,created_at,attempts")
        .eq("entry_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("studio_metrics")
        .select("*")
        .eq("entry_id", id)
        .order("observed_at", { ascending: false })
        .limit(100),
    ]);
    if (results.some((r) => r.error))
      throw new ApiError(503, "Studio detail storage is unavailable.");
    return Response.json(
      {
        versions: results[0].data,
        reviews: results[1].data,
        jobs: results[2].data,
        metrics: results[3].data,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
