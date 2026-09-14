import { actor, body, failure, ApiError } from "@/lib/server";
import { contextRecords } from "@/lib/model";
import { OpenAIProvider } from "@/lib/ai/provider";
import { apolloRequestSchema } from "@/lib/ai/apollo";
export async function POST(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const parsed = apolloRequestSchema.safeParse(await body(request));
    if (!parsed.success)
      throw new ApiError(
        400,
        "Review your message and consent to send it to the AI provider.",
      );
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)
      throw new ApiError(
        503,
        "AI is not connected yet. You can still use the private drafting guide.",
      );
    const { data: allowed, error: limitError } =
      await db.rpc("consume_ai_request");
    if (limitError || !allowed)
      throw new ApiError(
        429,
        "Please pause before trying again. The AI request limit has been reached.",
      );
    const { data, error } = await db
      .from("records")
      .select("*")
      .in("id", parsed.data.recordIds);
    if (error)
      throw new ApiError(500, "Could not prepare the selected context.");
    const records = contextRecords(
      data ?? [],
      user.id,
      membership.workspace_id,
      parsed.data.context,
      parsed.data.recordIds,
    );
    if (records.length !== parsed.data.recordIds.length)
      throw new ApiError(
        403,
        "Some selected context is unavailable for this audience. Select it again.",
      );
    const result = await new OpenAIProvider().respond({
      ...parsed.data,
      records,
    });
    const current = await actor(request);
    const { data: fresh, error: freshError } = await current.db
      .from("records")
      .select("*")
      .in("id", parsed.data.recordIds);
    const stillAllowed = contextRecords(
      fresh ?? [],
      current.user.id,
      current.membership.workspace_id,
      parsed.data.context,
      parsed.data.recordIds,
    );
    if (
      current.user.id !== user.id ||
      current.membership.workspace_id !== membership.workspace_id ||
      freshError ||
      stillAllowed.length !== records.length ||
      stillAllowed.some(
        (r) =>
          r.updated_at !== records.find((old) => old.id === r.id)?.updated_at,
      )
    )
      throw new ApiError(
        409,
        "Selected context changed while the AI was responding. Please review it and try again.",
      );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
