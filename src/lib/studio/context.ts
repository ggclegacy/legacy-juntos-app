import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../server";
import {
  type Entry,
  type GenerationInput,
  type Version,
  entryInput,
  audienceFits,
} from "./model";
export async function creativeContext(
  db: SupabaseClient,
  ownerId: string,
  input: GenerationInput,
) {
  const { data: raw } = await db
    .from("studio_entries")
    .select("*")
    .eq("id", input.entry_id)
    .single();
  if (
    !raw ||
    raw.owner_id !== ownerId ||
    !["asset", "content"].includes(raw.kind)
  )
    throw new ApiError(403, "Choose an asset or content entry you own.");
  const entry = { ...raw, ...entryInput.parse(rawToInput(raw)) } as Entry;
  const { data: membership } = await db
    .from("memberships")
    .select("user_id")
    .eq("user_id", ownerId)
    .eq("workspace_id", entry.workspace_id)
    .eq("active", true)
    .single();
  if (!membership)
    throw new ApiError(403, "Workspace access is no longer active.");
  const context: unknown[] = [];
  for (const id of [entry.brand_id, entry.campaign_id]) {
    if (!id) continue;
    const { data: parent } = await db
      .from("studio_entries")
      .select("*")
      .eq("id", id)
      .single();
    if (
      !parent ||
      parent.workspace_id !== entry.workspace_id ||
      !audienceFits(entry, parent)
    )
      throw new ApiError(403, "Brand or campaign context is unavailable.");
    context.push({
      kind: parent.kind,
      title: parent.title,
      body: parent.body,
      details: Object.fromEntries(
        Object.entries(parent.details).filter(
          ([, value]) =>
            value !== "" &&
            value !== null &&
            value !== false &&
            (!Array.isArray(value) || value.length > 0),
        ),
      ),
    });
  }
  const references: { entry: Entry; version: Version }[] = [];
  if (new Set(input.reference_ids).size !== input.reference_ids.length)
    throw new ApiError(400, "Select each reference once.");
  if (
    input.reference_version_ids.length &&
    input.reference_version_ids.length !== input.reference_ids.length
  )
    throw new ApiError(400, "Reference version selection is incomplete.");
  for (const [index, id] of input.reference_ids.entries()) {
    const { data: ref } = await db
      .from("studio_entries")
      .select("*")
      .eq("id", id)
      .single();
    if (
      !ref ||
      ref.kind !== "reference" ||
      ref.owner_id !== ownerId ||
      ref.workspace_id !== entry.workspace_id ||
      ref.details.consent !== true ||
      !ref.details.rights ||
      entry.visibility !== "private"
    )
      throw new ApiError(
        403,
        "References need your approval, usage rights and a private output destination.",
      );
    let versionQuery = db
      .from("studio_versions")
      .select("*")
      .eq("entry_id", id);
    if (input.reference_version_ids[index])
      versionQuery = versionQuery.eq("id", input.reference_version_ids[index]);
    const { data: version } = await versionQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (
      !version?.object_key ||
      !["image/png", "image/jpeg", "image/webp"].includes(version.mime_type)
    )
      throw new ApiError(400, "Upload an approved reference image first.");
    references.push({ entry: ref, version });
  }
  let parentVersion: Version | null = null;
  if (input.parent_version_id) {
    const { data: parent } = await db
      .from("studio_versions")
      .select("*")
      .eq("id", input.parent_version_id)
      .eq("entry_id", entry.id)
      .single();
    if (!parent)
      throw new ApiError(400, "The selected previous version is unavailable.");
    if (
      input.modality === "image" &&
      (!parent.object_key ||
        !["image/png", "image/jpeg", "image/webp"].includes(parent.mime_type))
    )
      throw new ApiError(400, "Choose an image version to edit.");
    if (!["image", "text"].includes(input.modality))
      throw new ApiError(
        400,
        "Media editing is currently available for images and text only.",
      );
    parentVersion = parent;
    if (input.modality === "text")
      context.push({ previousDraft: parent.text_content });
  }
  const serialized = JSON.stringify(context);
  if (serialized.length > 22000)
    throw new ApiError(
      400,
      "Selected creative context is too long. Shorten the brand/campaign instructions before generating.",
    );
  return {
    entry,
    parentVersion,
    context: serialized,
    references,
  };
}
export function rawToInput(e: Entry) {
  return {
    kind: e.kind,
    title: e.title,
    body: e.body,
    visibility: e.visibility,
    recipient_id: e.recipient_id,
    context: e.context,
    brand_id: e.brand_id,
    campaign_id: e.campaign_id,
    parent_id: e.parent_id,
    status: e.status,
    due_at: e.due_at,
    details: e.details,
  };
}
