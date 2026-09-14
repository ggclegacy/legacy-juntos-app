import { actor, body, failure, ApiError } from "@/lib/server";
import { researchQuestion } from "@/lib/ai/knowledge/provider";
import { topics } from "@/lib/ai/knowledge/model";
import { z } from "zod";
export const maxDuration = 90;
const input = z
  .object({
    question: z.string().trim().min(5).max(2000),
    topic: z.enum(topics),
    consent: z.literal(true),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const who = await actor(request),
      parsed = input.safeParse(await body(request));
    if (!parsed.success)
      throw new ApiError(
        400,
        "Write a research question and review the search consent.",
      );
    const limit = await who.db.rpc("consume_ai_request");
    if (limit.error || !limit.data)
      throw new ApiError(429, "Please pause before the next research request.");
    const result = await researchQuestion(
        parsed.data.question,
        parsed.data.topic,
      ),
      current = await actor(request);
    if (
      current.user.id !== who.user.id ||
      current.membership.workspace_id !== who.membership.workspace_id
    )
      throw new ApiError(409, "Your account changed during research.");
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
