# Creative Studio setup and integration status

## Install without replacing the app

This release extends the existing sanctuary and preserves all old Studio `records` under **Existing creative briefs**. Apply `supabase/migrations/20260914050000_studio.sql` after the existing numbered migrations through a privileged migration connection, in staging first. The migration creates private `studio-media` storage and RLS policies using the existing membership/auth model. No database, cloud service, account or paid provider was provisioned during implementation.

Studio pages use the existing bearer-token request function and `actor()` membership verification. Do not connect a service-role client to ordinary user endpoints. `SUPABASE_SERVICE_ROLE_KEY` is used only in the worker module after verification of `STUDIO_WORKER_SECRET`. Both users have equal capabilities; row ownership determines editing rights. Collaborators can add version-specific reviews, not edit each other's entries.

## Provider setup

| Integration | Server variables | Implemented path |
|---|---|---|
| Apollo writing | `OPENAI_API_KEY`, `OPENAI_MODEL` | Responses API, no provider storage; selected brand/campaign context; output becomes a draft text version |
| Image generation / editing | `OPENAI_API_KEY` | GPT Image 2.5 Sunburst / Flare; PNG, transparency, square/portrait/landscape, up to four reference inputs including an edit source |
| Cinematic video | `RUNWAYML_API_SECRET` | gen4.5, 5 seconds, portrait/landscape; text or one input image; persist task receipt, poll, retrieve original |
| Voiceover | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | eleven_v3; exact supplied narration; account-approved voice; MP3 |
| Durable worker | `SUPABASE_SERVICE_ROLE_KEY`, `STUDIO_WORKER_SECRET`, `STUDIO_WORKER_ENABLED=true` | `POST /api/studio/worker` with `Authorization: Bearer <worker-secret>` |

Use a secret manager for real values. Do not commit them or expose them as `NEXT_PUBLIC` settings. Provider availability in the Connections screen means configuration is present, **not** that billing/model entitlement was tested. Video prompts plus selected brand context must fit 1,000 characters; oversized context is rejected rather than silently dropping brand constraints. Reference generation requires private outputs, recorded rights and explicit provider consent. Queue records lock reference version IDs; the worker also rechecks ownership, membership and reference consent. Image and text iterations use the selected parent version; originals remain distinct.

Run the worker with an external scheduler about every 30 seconds. Each call claims one due job. The host must allow up to 300 seconds for the handler. SQL leases prevent duplicate simultaneous claims; configure an adequate invocation timeout before enabling. An external scheduler is deliberately not pretended to exist. Monitor queue age and `needs_attention`; one call processes at most one submission/poll, so scale invocation frequency to expected volume and provider concurrency. `STUDIO_WORKER_ENABLED` is an operator assertion that this infrastructure is running, not a heartbeat check.

Explicit 429 responses retry at most three submissions with backoff. An ambiguous network/5xx response is not resubmitted automatically. A saved video receipt resumes polling. Expired leases without a receipt enter `needs_attention`. Polling is bounded to 180 checks. Operator reconciliation uses provider history and the recorded receipt; do not blindly reset to queued. No cost-incurring cross-vendor fallback is attempted without a separate request/consent. Job request data includes prompts and locked references; keep DB access restricted. Quota is 20 queued requests per owner/hour. Provider costs are usage metadata or labeled estimates, never an account bill.

## Storage and export

App uploads accept PNG/JPEG/WebP, MP4, MP3/WAV and PDF up to 20 MB, with file signature checks. Bucket/worker output ceiling is 100 MB. The API currently accepts bounded base64 upload transport for simplicity; binaries are decoded immediately and **never persisted in database JSON**. For large production footage add direct signed multipart uploads, scanning and resumable upload support.

Object paths bind workspace, owner, entry and version UUIDs. Read access follows parent-entry RLS. Originals and derivatives have immutable rows. Authenticated users cannot manufacture provider-generated provenance, edit existing version bytes, forge reviewer IDs, mark jobs complete, fabricate API metrics, or create connected social accounts. Signed download URLs expire after 60 seconds; already-issued bearer URLs remain usable until expiry. Preview URLs should not be persisted or included in production packages.

A failed upload can leave a reserved version without an object; the error states this and a new version can be uploaded. Reconcile orphan/reserved versions and worker output objects as an operator maintenance task. Retention, antivirus/media scanning, disaster recovery, deletion cascades, service credential rotation and provider-output reconciliation need operational setup before sensitive production use. The app doesn't silently delete originals.

Export currently includes downloadable individual originals, text drafts and a JSON production package containing brief fields, linked entities, loaded version metadata, reviews and measurements. It does not render a final edited film, resize uploaded media, or produce a ZIP of every binary. Campaign manifests contain permitted linked records; binary downloads and deeper history are separate. Detail views show the latest 100 versions/reviews/metrics and 50 jobs; full-history export needs a dedicated paginated export worker.

## What is implemented vs staged

**Functional with connected Supabase:** brand profiles; campaign briefs; ideas; content/copy; assets and references; uploads/downloads; immutable versions/lineage; version-aware reviews; calendar month/week/list with desktop drag/drop and editable dates; owners/assignees/platform/pillar/brand filters; sponsor requirements/disclosures and posted URLs; reusable starter frameworks; private Performance text extracts requiring explicit consent; manual measurement records; production package export. Sample mode is isolated and labeled, stores illustrative planning records only in session storage, and never submits generation/upload/publish requests.

**Adapters implemented, not tested against paid live accounts:** OpenAI writing/images/edits, Runway video submission/polling and ElevenLabs voiceover. Durable SQL queue/worker, usage hooks and honest disabled states included. Text generation produces an editable/reviewable production draft; it does not automatically create all campaigns/tasks from prose. Apollo's persistent Studio experience is brief-oriented; multi-turn campaign conversations and automatic structured campaign decomposition remain follow-on work.

**Foundations only / not live:** social OAuth linking, automatic scheduling/publishing, platform metric ingestion, automated performance learning, semantic embeddings/search, voice clone enrollment, dubbing/transcription/cleanup/music generation, Google/Adobe adapters, timeline video editing, carousels/layout rendering, final-size media derivatives, binary ZIP packages, voice/image quick capture, recurring-instance generation, sponsorship contract ingestion, direct training/progress-photo import, and cross-brand automatic campaign planning. Existing generic Business/Performance data is not duplicated or harvested. The Performance handoff only saves exact owner-chosen text; it does not connect private training tables to AI.

Private/recipient/shared audience and entity relationships are immutable in V1 to prevent dangling references or accidental audience expansion. Create linked content with compatible privacy at the start. Brand references can be attached through the generic parent/brand relation, but the UI currently manages reference uploads from Assets rather than an in-place brand moodboard. Custom templates can be saved as entries and reused as content briefs; built-in frameworks include campaign and sponsorship starting points. Ideas can develop into linked campaigns or content without losing their origin.

## Staging acceptance

1. Test Neil/Kamilla sign-in, invitation revocation, private/shared and named reads and partner reviews using separate browser profiles.
2. Upload and download each supported MIME type; confirm private references are not visible to the partner or anonymous callers.
3. Configure one provider at a time; enable a real scheduler; submit a low-cost test; inspect output, usage and provider invoice. Interrupt a worker to confirm receipt recovery and no duplicate submission.
4. Verify image edit/reference fidelity with consented images. Validate content rights before public use.
5. OAuth/publishing requires a subsequent implementation and platform approval. Meta docs were blocked during research; refresh the official requirements before implementing. A planned calendar entry never claims a published receipt.
