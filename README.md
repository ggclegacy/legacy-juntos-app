# Legacy Juntos

A private Life OS for Neil and Kamilla: individual identity, equal capabilities, intentional sharing. Built with Next.js 16, React, TypeScript, Supabase Auth/PostgreSQL, and a provider-neutral AI interface.

This is an implemented V1 foundation, not a finished production launch. The sample workspace runs immediately. Real persistence and authentication require a Supabase project; live AI requires a provider key and model. No real private history is seeded.

## Run locally

Use Node.js 22 or 24 and npm. Dependency versions and the lockfile are pinned.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Without account configuration, the app opens a clearly labeled sample workspace. Sample edits live in memory for that page session and reset on reload. The sample identity switch is only for exploring fictional data, not authentication. The UI deliberately does not accept real data as durably saved while unconfigured.

## Connect real accounts

1. Create a Supabase project in the region you intend to use. Apply `supabase/migrations/001_foundation.sql` through a privileged migration connection or the Supabase SQL editor.
2. Disable public signups and anonymous sign-in in Supabase Auth. Provision Neil and Kamilla as verified email/password users through an administrator. Configure email delivery and recovery before real use. Do not put passwords or administrative credentials in source control.
3. Create one workspace and the two memberships. `supabase/provision.example.sql` is a template: replace the UUID placeholders with the actual Auth user IDs. Memberships are immutable to application users, and each account has identical capabilities. Never provision a shared login.
4. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These are the project URL and public application key, not a service-role key. Restart the app after changing public environment variables.
5. Sign in from the account screen. The API verifies the bearer token with Supabase Auth on every request, checks active workspace membership, and uses a caller-scoped database client so RLS applies. No service-role key is used in application requests.
6. Test with two separate browser profiles. Create a private reflection as one account, confirm the other cannot query it, explicitly share it, confirm visibility, then revoke it. Confirm the database migration tests also pass in your deployment environment.

Sign-in sessions use the Supabase browser SDK's local session persistence. Record bodies remain in application memory; they are not put in localStorage or the service-worker cache. This is access control with provider-managed storage encryption, not end-to-end encryption. A device with an active login can access its account; use device locking and sign out on shared machines.

An administrator can revoke workspace access with `update public.memberships set active=false where user_id=...`. Retain the membership row for referential integrity. RLS immediately denies new reads/writes; connected views refresh every 30 seconds and on window focus. Previously read, copied, or exported content cannot be recalled.

## Implemented workflows

- Editorial daily home with Juntos/My space context, meaningful next actions and direct workspace navigation.
- Private goals, habits, journals, explicit AI memory notes; owner edit/delete, task completion, search and accessible-data JSON export.
- Named-recipient and Juntos sharing with an explicit full-entry audience confirmation. Linked child entries inherit their parent's audience. Audit events record writes without duplicating content.
- Faith passage references, external Bible reader, private reflections, prayers and optional reveal through audience change. Human reflections remain distinct from Scripture.
- Know & Connect prompts covering values, care, boundaries, childhood, faith, family, money and future; appreciation/reflection entries and a no-AI private drafting guide.
- Workout sets with exercise, reps, load and units; computed session volume and best logged loads by exercise/unit; wellness sleep, energy and optional bodyweight history. Prep Mode reveals posing and milestone planning for either identity. The mode switch is session-only; saved prep records are durable when connected.
- Business projects, decisions, tasks and sponsorship briefs; linked tasks and creative briefs; planning expenses totaled separately in USD/BRL. No banking or accounting connection.
- Studio briefs with audience, objective, visual direction, deliverables and five campaign stages. Projects, briefs and tasks use the same permission envelope.
- Contextual conversations and replies. Each contributor owns their contribution; this release uses periodic refresh rather than realtime delivery/read receipts.
- Vision roadmap with Now/Next/Future chapters, text memories/timeline, and service ideas.
- AI text service adapter, authenticated endpoint, explicit provider consent, selected-record context, private/shared partitions, request timeout and durable hourly quota. AI output is not automatically saved or shared. The user can review it as a private journal draft. Voice has a service contract and an honest unavailable state; no microphone recording begins.
- PWA manifest, PNG icons, responsive navigation, native modal focus handling, reduced-motion support, neutral offline page. Only the offline page and public icons are cached.

## Live AI

Set server-only `OPENAI_API_KEY` and `OPENAI_MODEL` to a text model available to the account. The current adapter uses the Responses endpoint with `store:false`, no tool calls, bounded output and a 30-second timeout. The model name is configurable rather than hard-coded. Calls are limited to 30 per account per clock hour by a PostgreSQL function. Audit/quota maintenance should be scheduled by the deployment operator.

The provider receives the current message, explicitly selected entries, optional authorized recall sources and recent saved conversation turns, reauthorized by the server. Juntos context excludes both private entries and named-recipient shares, even when the caller can read them. No provider conversation ID or hidden cross-session transcript is reused. Durable memory uses versioned Apollo teachings and owner-private saved conversations; recall is selected by area and audited through source receipts. Generated responses must be reviewed before saving, and then separately shared if desired.

`store:false` is not a claim of zero provider retention. Review the provider account's actual data controls, retention, region, and terms before sending sensitive health, faith, or interpersonal content. Keys never appear in browser bundles or sample data. Voice, image generation, automatic memory consolidation and two-user live AI sessions are not implemented. Optional vector retrieval is available after database update 007 and explicit index preparation.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

On a machine with Chrome already installed, `CHROME_PATH` may point to its executable instead of downloading Chromium. Browser tests default to the sample workspace and exercise desktop and mobile layouts. Use an environment without configured Supabase public variables for these sample tests. Hosted-auth integration needs its own test project and two disposable accounts.

`tests/database.test.ts` loads the actual migration into PGlite (embedded PostgreSQL), supplies a minimal Auth schema and JWT identity function, creates real roles, and tests allow/deny behavior as each role. This validates SQL policy semantics, including ownership, foreign workspaces, audience inheritance, revocation, audit isolation, negative workout validation and quotas. It does not stand in for a hosted Supabase Auth, Storage, network or backup/restore test.

## Production launch requirements and known limits

- Configure a hosted database/auth project, email delivery, verified users, secure recovery, production HTTPS, backups and tested restores. Run the two-account release checks against that environment before storing real sensitive data.
- Implement private media uploads with signed URLs, source authorization and deletion/revocation. Current Memories and prep check-ins are text; no photo/voice-note storage is connected.
- Extend training to reusable programs, richer progressive overload history and coach-directed reviews; structured nutrition and protocol tracking are documented below; neither is a prescriptive engine.
- Add recurring scheduling/calendar/reminders, push opt-ins, Portuguese localization, licensed Bible content and multi-session study plans. Current prompts rotate manually rather than infer relationship state.
- Add robust realtime collaboration, simultaneous shared AI facilitation, consented voice and reviewed image workflows. There are no autonomous messages, outreach or social publishing actions.
- Audience changes for records with linked children are blocked, preventing orphaned leaks. A future transactional sharing UI can explicitly review and update the whole subtree. Owners can remove their own linked entries; an owner cannot delete someone else's reply. Leaving/deleting a workspace needs a separately reviewed administrative flow.
- Fetching is cursor-paginated for correctness, but the V1 client loads the full accessible collection for local search/export; introduce server-side search and incremental view loading as history grows. Domain details are validated JSON inside a common record envelope; promote mature high-volume domain entities into child tables when needed.
- Access controls are not medical/clinical certification, end-to-end encryption, or a claim of relationship benefit. AI guidance is not a therapist, pastor, doctor or competition coach. No therapy decisions, romance metrics, or drug/dehydration protocols are implemented.

See `docs/RESEARCH.md` for the evidence and blueprint, `docs/ARCHITECTURE.md` for trust boundaries, and `docs/DELIVERY.md` for the verified state of this build.

## Performance workspace

Performance now has Today, Program, Progress, Prep, and Coach sections. Build a custom rotating program, paste a strict text prescription, or import an exported program JSON file. The AI entry path uses the configured provider to return a validated draft; it cannot save or activate a program. All paths use the same editor, immutable session prescription snapshots, actual set logging, timestamp-based rest timer, plate calculator, comparable exercise history, primary-muscle set distribution, optional progression insights, prep journal, and editable seven-day check-in download.

Apply `supabase/migrations/002_training.sql` after the foundation migration for connected training storage. The API authenticates the user, checks active membership, and relies on owner-only RLS. No partner or coach automatically receives access. Revisions reject conflicting updates and identical retries are idempotent. Direct database clients should use the validated API for payload integrity; SQL independently enforces ownership, kind, immutable identity, payload size, and monotonic revisions.

Sample training is stored in IndexedDB by sample identity. It survives refresh but is **not authenticated private storage**; use sample information. Connected accounts can opt into trusted-device drafts. Without that choice, unsynced changes exist in memory and require keeping the page open. Device drafts are not encrypted; switching accounts isolates the UI but does not erase bytes on a trusted browser. Turn off trusted-device storage after syncing to clear that account's local copy. Browser storage can be evicted. Export backups are available; full-backup restore/merge is not yet implemented. Individual program JSON files can be reimported.

`OPENAI_API_KEY` and `OPENAI_MODEL` enable program generation for authenticated accounts. Generation shares only the submitted preferences, uses the existing request limiter, and validates all returned prescriptions. No health journal or other user's context is retrieved. Live provider behavior and hosted database setup require credentials and must be verified after configuration.

Current limits: programs repeat a rotating sequence for a selected cycle count; automatic calendar scheduling and individual cycle overrides are not implemented. Advanced set styles/groups and cues are stored, but do not automatically reorder supersets or implement intra-set drop sequences. No PDF/photo/XLSX extraction, video uploads, coach portal, wearable/voice integration, push timer alerts, or automatic program mutations. Prep is a private editable planner/journal, not a medical or nutrition prescription engine. See `docs/PERFORMANCE-BUILD.md` for the evidence and remaining implementation sequence.

## Protocol workspace

The **Protocols** navigation includes private protocol history, actual-use logs, manual bloodwork, collection-date context, original-report storage, and appointment review. See [Protocol setup and limitations](docs/protocols.md) and the [research blueprint](docs/protocol-research.md). Connected mode needs migrations 003–004; health AI additionally requires explicit provider configuration. Sample mode must contain fictional information only.

## Macro workspace

**Macros** now includes a private daily diary, coach-set training/rest targets, planned and eaten meals, food library, weighed batch recipes, barcode capture, photo/text/label draft entry, water counter and seven-day history. Manual/sample flows work immediately. Connected storage needs migration 005, database search needs `USDA_API_KEY`, and photo/text/label AI needs configured image-capable OpenAI credentials plus `NUTRITION_AI_ENABLED=true`. See [Nutrition setup and limitations](docs/nutrition.md) and [nutrition research](docs/nutrition-research.md). Photo estimates always require review; targets never change automatically.

## Apollo identity

Apollo now has a versioned identity shared by the main assistant and specialized AI operations, ten help roles, and per-panel controls for approach, tone, depth and language. See [the ten-principle research](docs/apollo/RESEARCH.md) and [implementation / behavioral evaluation](docs/apollo/IMPLEMENTATION.md). The server owns instructions and preserves selected-record privacy. Durable chat memory and explicit user teaching now extend this identity; curated subject libraries and autonomous actions remain separate work. Live-model evaluations use synthetic scenarios and are opt-in.


## Apollo memory & learning

Open **Apollo → Memory & learning** to teach, search, correct, retire, or delete knowledge and reopen saved conversations. Choose private, named-recipient, or Juntos visibility for each teaching. Start a saved conversation to preserve successful turns; temporary chat remains available. Recall areas independently enable teachings, past conversations, life/projects, and private training/nutrition/protocol data. The answer includes a dated receipt of recalled context.

Connected memory requires **006_apollo_memory.sql**; meaning-based recall and persistent conversation connections additionally require **007_apollo_intelligence.sql**. Apply these after the existing migrations. Teaching needs connected authentication/storage; AI replies also need the existing server credentials. No new provider or environment variable is required. The sample preview explicitly keeps teachings only for the current library visit. See [memory research](docs/apollo/MEMORY-RESEARCH.md) and [setup, exact behavior and limits](docs/apollo/MEMORY-IMPLEMENTATION.md). Recall combines optional meaning-based search with keywords. Learning suggestions produce privately reviewed drafts and possible corrections, never automatic saves or model retraining. See [intelligence setup, evidence and limits](docs/apollo/INTELLIGENCE-IMPLEMENTATION.md). Cloud activation remains unverified; the new migration must be applied to the hosted database.


## Creative Studio

The existing Digital studio now opens a full creative workspace: Brand Vault, campaigns, ideas, content calendar, media/reference library, production briefs, version-specific reviews, templates, sponsor deliverables, manual measurements and Apollo generation controls. Existing brief records remain preserved. Apply migration **20260914050000_studio.sql** after the existing migrations for connected persistence; sample mode stays explicitly labeled.

The provider-neutral router has implemented OpenAI image/edit/text, Runway video and ElevenLabs voiceover adapters plus a durable worker. Provider credentials, a configured scheduler and paid-account staging verification are still required. Social publishing is **export only**; connection cards do not represent completed OAuth integrations. Nothing private from Performance/Prep becomes content automatically.

Read [current provider research](docs/studio/RESEARCH.md), [architecture blueprint](docs/studio/BLUEPRINT.md), and [setup / exact integration status](docs/studio/SETUP.md) before enabling. No paid generations, cloud provisioning or live database migration occurred during implementation.


## Apollo knowledge & research

Open **Apollo → Knowledge & research** for topic shelves, direct notes/text import, consented PDF/photo transcription, source references, reviewed activation, private/shared audiences, owner-only revisions and archive/deletion. Active passages join keyword and optional meaning-based recall. A separate cited web-research workspace sends only the explicit research question and creates a private review draft when you choose to retain an answer.

Requires **008_apollo_knowledge.sql** after the memory migrations. No new environment variables; the existing OpenAI model must support the requested document/search operation. See [research blueprint](docs/apollo/KNOWLEDGE-BLUEPRINT.md) and [activation, limits and exact behavior](docs/apollo/KNOWLEDGE-SETUP.md). The sample workspace supports temporary document editing/text import and does not simulate live research. Hosted migration/account/provider activation remains unverified.
