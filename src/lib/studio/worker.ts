import { createClient } from "@supabase/supabase-js";
import { creativeContext } from "./context";
import { generationInput } from "./model";
import { routeModel } from "./router";
import { adapter, ProviderFailure, type CreativeOutput } from "./providers";
import { boundedBytes, sniffMedia } from "./media";
export async function runStudioWorker() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const claimed = await db.rpc("studio_claim_job");
  if (claimed.error) throw new Error("Studio job storage unavailable");
  const job = claimed.data?.[0];
  if (!job) return { processed: 0 };
  const update = async (patch: Record<string, unknown>) => {
    const { data, error } = await db
      .from("studio_jobs")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
        lease_until: null,
        lease_token: null,
      })
      .eq("id", job.id)
      .eq("lease_token", job.lease_token)
      .select("id")
      .single();
    if (error || !data) throw new Error("Job lease lost");
  };
  let submitted = false;
  try {
    const input = generationInput.parse(job.request);
    if (input.reference_ids.length !== input.reference_version_ids.length)
      throw new ProviderFailure(
        "Reference versions were not locked. Create a new request from Studio.",
      );
    const model = routeModel(input);
    if (model.provider !== job.provider || model.model !== job.model)
      throw new ProviderFailure(
        "Model configuration changed. Review this job before submitting a new request.",
      );
    const scoped = await creativeContext(db, job.owner_id, input);
    const existing = await db
      .from("studio_versions")
      .select("id")
      .eq("id", job.id)
      .maybeSingle();
    if (existing.data) {
      await update({ state: "succeeded", error: null });
      return { processed: 1 };
    }
    const provider = adapter(model.provider);
    const refs = [];
    const mediaVersions = [
      ...(input.modality === "image" && scoped.parentVersion
        ? [scoped.parentVersion]
        : []),
      ...scoped.references.map((r) => r.version),
    ];
    for (const version of mediaVersions) {
      const { data, error } = await db.storage
        .from("studio-media")
        .download(version.object_key!);
      if (error || !data)
        throw new ProviderFailure("An approved reference file is unavailable.");
      if (data.size > 20 * 1024 * 1024)
        throw new ProviderFailure("Reference file exceeds 20 MB.");
      refs.push({
        bytes: new Uint8Array(await data.arrayBuffer()),
        mime: version.mime_type,
      });
    }
    // Reference versions are immutable and exact version IDs are recorded in usage at completion.
    submitted = true;
    if (job.provider_task_id && !provider.poll)
      throw new ProviderFailure(
        "This adapter cannot reconcile an asynchronous task.",
      );
    const result = job.provider_task_id
      ? await provider.poll!(job.provider_task_id)
      : await provider.submit(input, model, scoped.context, refs);
    if (result.state === "pending") {
      if (job.poll_count >= 180) {
        await update({
          state: "needs_attention",
          error:
            "Provider task is taking longer than expected. Reconcile the receipt before retrying.",
        });
        return { processed: 1 };
      }
      await update({
        state: "waiting",
        provider_task_id: result.taskId,
        next_attempt_at: new Date(Date.now() + 30000).toISOString(),
        error: null,
      });
    } else {
      const output: CreativeOutput = result.output;
      if (output.url) {
        const url = new URL(output.url);
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          ![".runwayml.com", ".cloudfront.net", ".amazonaws.com"].some((s) =>
            url.hostname.endsWith(s),
          )
        )
          throw new ProviderFailure(
            "Unrecognized output host. Reconcile the provider result.",
          );
        const response = await fetch(url, {
          redirect: "error",
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) throw new Error("Output download failed");
        output.bytes = await boundedBytes(response);
      }
      let objectKey: string | null = null;
      if (output.bytes) {
        if (
          output.bytes.length > 104857600 ||
          !sniffMedia(output.bytes, output.mime)
        )
          throw new ProviderFailure(
            "Generated media has an unsupported file signature or size.",
          );
        objectKey = `${scoped.entry.workspace_id}/${job.owner_id}/${job.entry_id}/${job.id}`;
        const { error } = await db.storage
          .from("studio-media")
          .upload(objectKey, output.bytes, {
            contentType: output.mime,
            upsert: true,
          });
        if (error) throw new Error("Output storage failed");
      }
      // Recheck active membership and references before materializing an output.
      await creativeContext(db, job.owner_id, input);
      const usage = {
        ...output.usage,
        reference_version_ids: scoped.references.map((r) => r.version.id),
      };
      const { error } = await db.from("studio_versions").insert({
        id: job.id,
        entry_id: job.entry_id,
        parent_version_id: input.parent_version_id,
        object_key: objectKey,
        text_content: output.text || "",
        mime_type: output.mime,
        byte_size: output.bytes?.length ?? 0,
        provenance: input.parent_version_id ? "edited" : "generated",
        provider: job.provider,
        model: job.model,
        usage,
        is_original: !input.parent_version_id,
      });
      if (error) throw new Error("Version persistence failed");
      await update({ state: "succeeded", usage, error: null });
    }
  } catch (e) {
    const failure = e instanceof ProviderFailure ? e : null;
    const canPoll =
      Boolean(job.provider_task_id) &&
      job.poll_count < 180 &&
      (!failure || failure.retryable || failure.ambiguous);
    const canRetry =
      !job.provider_task_id && failure?.retryable && job.attempts < 3;
    const state = canPoll
      ? "waiting"
      : canRetry
        ? "retry"
        : submitted && (!failure || failure.ambiguous)
          ? "needs_attention"
          : "failed";
    await update({
      state,
      error:
        failure?.message ??
        (submitted
          ? "Processing interrupted. Check the saved receipt and provider history before submitting again."
          : "Job context is no longer valid. Check membership, references and permissions."),
      next_attempt_at: new Date(
        Date.now() +
          Math.max(
            failure?.retryAfter ?? 30,
            Math.min(3600, 30 * 2 ** job.attempts),
          ) *
            1000,
      ).toISOString(),
    });
  }
  return { processed: 1 };
}
