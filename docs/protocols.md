# Protocol workspace

## Delivered

The Protocols navigation opens Today, Protocols, Labs, Insights, and Review. Both accounts use the same capabilities. Health records never enter the generic shared record table or shared AI context.

- Protocol builder for medication, hormone therapy, peptide, and supplement records. It captures exact user-entered instructions, formulation, schedule text, source/prescriber, purpose, effective date, and active/paused/stopped status.
- Append-only protocol versions, actual taken/skipped/held events with prescription snapshots, and sleep/energy/symptom check-ins.
- Manual lab entry including decimal commas, qualified results, original units, reference intervals, laboratory/method, context, and report reference. Corrections append revisions.
- Historical protocol context at collection date, numerical comparisons restricted to matching recorded names/units/labs/methods, accessible trend values, and an editable text appointment export.
- Private PDF/PNG/JPEG report upload and authenticated downloads in connected mode. Up to 5 MB per report; lists the latest 100. Downloads have 60-second signed authorization. Reports are not rendered as active web content.
- Optional AI appointment review with explicit per-request consent, owner-only server retrieval, source record links, schema validation, rate limiting, and no tools to share or alter records. Output is an unverified AI draft, not clinical interpretation or an interaction checker.

## Setup

Apply `003_protocols.sql` after migrations 001 and 002. Apply `004_health_reports.sql` in Supabase, where the Storage schema already exists. Policies authorize the owner and require active workspace membership. Health history is append-only; ordinary clients cannot update/delete it. Account-level deletion must be handled by an authenticated administrative erasure process with backup-retention documentation before broad real-world rollout.

Existing Supabase public URL/key and account invitation setup are required. No service-role secret is exposed or required by the browser. File and health endpoints require a valid access token. UI requests include the expected user identity so a background account switch fails closed.

Optional AI also requires `OPENAI_API_KEY`, `OPENAI_MODEL`, and `HEALTH_AI_ENABLED=true`. Enable health AI only after reviewing provider handling, retention, contracts and clinical scope. Consent sends the current versions of the owner's stored health records to OpenAI; originals are not sent. `store:false` requests no Responses storage and is not a claim of zero provider retention. Reviews are transient and invalidated when the mounted record set changes; they are not saved into shared AI memory. More than 500 history events disables this initial review endpoint rather than silently giving an incomplete review.

Sample mode is explicit, uses per-user session storage, and is suitable only for fictional entries. It is not authentication. Real report uploads and AI are disabled in sample mode. Connected health records are not cached in localStorage, IndexedDB or the service worker.

## Deliberate remaining work

PDF/photo OCR, automatic lab normalization, document-to-observation source regions, bulk imports, regimen reminder scheduling, inventory/refills, wearable/workout overlays, granular clinician links, and licensed interaction checking are not implemented. Schedule text is recorded but not executed. Dose timing and amount are recorded, not calculated or recommended. Trends have equally spaced observation points, not a time-scaled axis. Lab collection precision currently stops at date; optional free text holds time and last-dose context. No universal clinical or critical thresholds are invented.

File extension and signature checks are implemented, but there is no malware scanner, content-disarm pipeline, or server-side document rendering. Before automatic parsing or inline previews, add an isolated worker, bounded decoding, malware scanning/CDR as appropriate, source provenance and an extraction validation corpus. Do not treat the current upload endpoint as an OCR system.

Before diagnostic or treatment features, complete clinical validation and applicable regulatory review. Interaction coverage requires a separately maintained source and explicit unknown states. The AI endpoint is a constrained appointment organizer; prompts and schema checks do not constitute clinical validation.

## Verification

Unit tests cover historical versions, qualified results, decimal parsing, incompatible comparisons and required lab verification. PostgreSQL tests exercise actual owner RLS, append-only constraints, cross-owner storage paths and private file listing. API tests cover authentication, AI consent/configuration, invalid file contents and download-path isolation. Browser tests cover protocol creation, actual use, lab entry/correction, historical context, appointment review and persistence on desktop/mobile. Cloud credentials are not present in the local sample build, so live Supabase upload/download and a real AI-provider response still require connected-environment verification.
