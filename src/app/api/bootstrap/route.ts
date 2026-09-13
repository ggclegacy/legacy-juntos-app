import { actor, failure, ApiError } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const { data: members, error } = await db
      .from("memberships")
      .select("user_id,display_name,workspace_id")
      .eq("workspace_id", membership.workspace_id)
      .eq("active", true);
    if (error) throw new ApiError(500, "Could not load workspace members.");
    return Response.json(
      { userId: user.id, workspaceId: membership.workspace_id, members },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
