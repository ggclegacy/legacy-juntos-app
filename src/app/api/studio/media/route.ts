import { actor, body, failure, ApiError } from "@/lib/server";
import { z } from "zod";
import { sniffMedia, mediaTypes } from "@/lib/studio/media";
export async function POST(request: Request) {
  try {
    const { db, user, membership } = await actor(request);
    const p = z
      .object({
        entry_id: z.uuid(),
        parent_version_id: z.uuid().nullable().default(null),
        mime_type: z.enum(mediaTypes),
        base64: z.string().max(28000000),
      })
      .strict()
      .safeParse(await body(request, 28500000));
    if (!p.success)
      throw new ApiError(400, "Choose a supported file up to 20 MB.");
    const bytes = Buffer.from(p.data.base64, "base64");
    if (bytes.length > 20 * 1024 * 1024 || !sniffMedia(bytes, p.data.mime_type))
      throw new ApiError(
        400,
        "The file contents do not match its type or exceed 20 MB.",
      );
    const { data: entry } = await db
      .from("studio_entries")
      .select("id")
      .eq("id", p.data.entry_id)
      .eq("owner_id", user.id)
      .single();
    if (!entry) throw new ApiError(403, "Choose a media entry you own.");
    const id = crypto.randomUUID(),
      key = `${membership.workspace_id}/${user.id}/${entry.id}/${id}`;
    const { data: version, error } = await db
      .from("studio_versions")
      .insert({
        id,
        entry_id: entry.id,
        parent_version_id: p.data.parent_version_id,
        object_key: key,
        mime_type: p.data.mime_type,
        byte_size: bytes.length,
        provenance: p.data.parent_version_id ? "edited" : "uploaded",
        is_original: !p.data.parent_version_id,
      })
      .select()
      .single();
    if (error) throw new ApiError(409, "Could not reserve this media version.");
    const upload = await db.storage
      .from("studio-media")
      .upload(key, bytes, { contentType: p.data.mime_type, upsert: false });
    if (upload.error)
      throw new ApiError(
        503,
        "Upload failed. The reserved version has no file; retry uploading a new version.",
      );
    return Response.json(
      { version },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function GET(request: Request) {
  try {
    const { db } = await actor(request);
    const id = z.uuid().parse(new URL(request.url).searchParams.get("version"));
    const { data: version } = await db
      .from("studio_versions")
      .select("object_key,mime_type")
      .eq("id", id)
      .single();
    if (!version?.object_key) throw new ApiError(404, "Media unavailable.");
    const { data, error } = await db.storage
      .from("studio-media")
      .createSignedUrl(version.object_key, 60, { download: true });
    if (error) throw new ApiError(404, "This version has no available file.");
    return Response.json(
      { url: data.signedUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
