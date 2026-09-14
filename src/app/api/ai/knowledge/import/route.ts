import { actor, body, failure, ApiError } from "@/lib/server";
import { extractDocument, importSchema } from "@/lib/ai/knowledge/provider";
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    const who = await actor(request),
      parsed = importSchema.safeParse(await body(request, 2900000));
    if (!parsed.success)
      throw new ApiError(
        400,
        "Choose a supported file under 2 MB and consent to send it to OpenAI.",
      );
    const limit = await who.db.rpc("consume_ai_request");
    if (limit.error || !limit.data)
      throw new ApiError(429, "Please pause before the next document request.");
    const result = await extractDocument(parsed.data),
      current = await actor(request);
    if (
      current.user.id !== who.user.id ||
      current.membership.workspace_id !== who.membership.workspace_id
    )
      throw new ApiError(
        409,
        "Your account changed while the document was being read.",
      );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
