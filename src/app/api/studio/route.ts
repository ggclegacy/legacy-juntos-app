import { z } from "zod";
import { actor, body, failure, ApiError } from "@/lib/server";
import { entryInput } from "@/lib/studio/model";
import { providerStatus } from "@/lib/studio/router";
import { socialConnectors } from "@/lib/studio/social";
const json = (data: unknown) =>
  Response.json(data, { headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  try {
    const { db } = await actor(request);
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(new URL(request.url).searchParams.get("offset") ?? 0);
    const { data, error } = await db
      .from("studio_entries")
      .select("*")
      .order("created_at")
      .order("id")
      .range(offset, offset + 199);
    if (error)
      throw new ApiError(
        503,
        "Studio storage is not ready. Apply the Studio migration to the connected workspace.",
      );
    return json({
      entries: data,
      nextOffset: data.length === 200 ? offset + 200 : null,
      providers: providerStatus(),
      connectors: socialConnectors,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const parsed = z
      .object({ id: z.uuid(), entry: entryInput })
      .strict()
      .safeParse(await body(request, 100000));
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    const { data, error } = await db
      .from("studio_entries")
      .insert({
        ...parsed.data.entry,
        id: parsed.data.id,
        owner_id: user.id,
        workspace_id: membership.workspace_id,
      })
      .select()
      .single();
    if (error)
      throw new ApiError(
        409,
        "Could not create this entry. Check that linked brand/campaign audiences match, or reload if already saved.",
      );
    return json({ entry: data });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { db, user } = await actor(request);
    const parsed = z
      .object({
        id: z.uuid(),
        revision: z.number().int().positive(),
        entry: entryInput,
      })
      .strict()
      .safeParse(await body(request, 100000));
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    const { data, error } = await db
      .from("studio_entries")
      .update(parsed.data.entry)
      .eq("id", parsed.data.id)
      .eq("revision", parsed.data.revision)
      .eq("owner_id", user.id)
      .select()
      .single();
    if (error || !data)
      throw new ApiError(
        409,
        "This entry changed or its links/audience cannot be changed. Reload before editing again.",
      );
    return json({ entry: data });
  } catch (e) {
    return failure(e);
  }
}
