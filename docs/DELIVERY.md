# Legacy Juntos V1 delivery

## What this build is

A usable, polished V1 foundation built from the initially empty Desktop folder and GitHub repository. It includes working entry workflows, an authenticated persistence implementation, database-enforced privacy, domain-specific planning tools, and an AI integration boundary. It is not a fully launched production service or the completion of every capability in the long-term vision.

The research phase preceded application code. `RESEARCH.md` contains a substantive synthesis across the requested product areas, an 18-item source inventory, evidence limitations, and an implementation blueprint. `ARCHITECTURE.md` describes identity, database boundaries, AI partitions, revocation, and deployment decisions.

## Completed implementation

| Area | Working scope |
|---|---|
| Identity and privacy | Invite-only sign-in UI and Supabase Auth integration; verified bearer-token API access; active workspace membership; equal accounts; owner-private, named-recipient and Juntos audiences; RLS; audit trigger; explicit sharing confirmation; owner edit/delete |
| Premium shell | Responsive obsidian/green/gold design; daily home; all main workspaces; context switch; mobile drawer; keyboard-focusable controls; reduced motion; native modal behavior; error and empty states |
| Personal | Goals, habits, journals, explicit AI memory notes, completion, dates, local search over authorized entries, JSON export |
| Faith | Passage references, external reader, private reflections, prayer entries, independent reveal through deliberate sharing |
| Know & Connect | Optional discovery prompts, appreciation and reflections; friendship-first wording; private communication-drafting guide |
| Performance | Workout sets, exercise/load/reps/units, volume, best logged load by exercise/unit, wellness sleep/energy/bodyweight history, posing and prep milestones; optional session-level Prep Mode for either person |
| Business and sponsorship | Projects, tasks, decisions, sponsorship planning templates, linked tasks/creative briefs, planned expenses with separate USD/BRL totals |
| Studio | Editable briefs with audience, objective, visual direction/image prompt, deliverables and campaign stage; linked project workflows |
| Communication | Contextual threads and individual replies; parent-audience inheritance; periodic refresh for connected mode |
| Vision, memories, legacy | Now/Next/Future roadmap; text memories and timeline; service/impact ideas |
| AI | Provider-neutral text contract; OpenAI Responses adapter; explicit provider consent; selected authorized context; private/shared separation; durable hourly quota; timeout; context revalidation before returning output; review/save privately workflow |
| PWA | Manifest and real PNG icons; neutral offline view; public-only cache; private API/HTML no-store behavior |
| Engineering | Pinned dependencies, setup instructions, admin provisioning example, SQL migration, automated application/database/browser tests, GitHub validation workflow |

## Sample and unconnected behavior

The default preview is explicitly labeled as a sample workspace. All sample entries are fictional illustrations, not claims about either person's health, private thoughts, or actual history. Sample edits last for the page session; reload resets them. Sample identity switching does not authenticate anyone.

No hosted Supabase project, real user account, API key, deployment, or paid service was provisioned. Connected persistence is implemented but has not been exercised against a real hosted Auth/database project. No service-role key is embedded in the app. Live AI requests are disabled in sample mode. The non-AI drafting guide works locally and is labeled as a guide.

Voice has an interface and unavailable-state UI; it does not record. Image generation, media upload, voice notes, social publishing, autonomous outreach, bank data, and coach portals are not connected. Memories and prep records currently hold text. Shared AI means shared-only context for a caller's request, not a live three-participant call.

## Verification performed

- **36 passing tests** across the application model, actual PostgreSQL policies/constraints in PGlite, request limits, and a mocked provider boundary.
- **16 browser journeys passed** across desktop and mobile Chrome emulation: 12 on the initial full pass, then the 4 remaining journeys after correcting two ambiguous test selectors. These cover navigation, overflow, private visibility, sample identity boundaries, explicit sharing and revocation, workout calculations, private drafting, faith defaults, audience reset, linked tasks, and unauthenticated API denial.
- **TypeScript and production build passed.**
- **Lint passed with no warnings.**
- Desktop and mobile screenshots were captured and visually inspected.
- Initial dependency installation reported zero known vulnerabilities. Dependency versions and package lock are committed.

The hosted Supabase Auth/REST boundary, real provider response quality, real-device PWA installation, assistive technology behavior, backups/restores, email recovery, production security headers, and realtime behavior still need deployment-environment verification. The GitHub workflow is included; local results are not a claim that the remote workflow has completed.

## Best next build priorities

1. Connect a staging Supabase project, configure invitation/recovery email, provision both real accounts, and run the two-browser privacy/revocation acceptance checks against hosted services. Configure backups and test a restore before sensitive use.
2. Add private image/media storage with signed URLs and robust source deletion/revocation. This unlocks meaningful memories, progress photos, brand assets and coach-reviewed check-ins.
3. Deepen performance with reusable programs, previous-session comparison, recovery review and coach-directed preparation. Add routine recurrence, calendar/reminders and clear consent controls.
4. Connect and evaluate text AI with explicit data-policy choices; then add consented voice, shared-session transcripts, source-aware memory retrieval and deletion lineage. Keep all models outside the authorization boundary.
5. Add Portuguese localization, licensed Bible study content, collaborative study plans, richer project deliverables and reviewed creative-generation integrations.
6. Replace full-collection client loading with incremental lists/server-side search as data grows, add real-time events with revocation handling, and design a transactional audience-change flow for linked records.

## How to use the current version

From the Desktop project, run `npm ci` if dependencies are missing, then `npm run dev`. Open http://localhost:3000. Use the sample workspace to explore the product. Follow `README.md` to connect real accounts and persistence. Do not treat the sample workspace as durable storage for real private information.

## Nutrition / Macros workspace — September 13, 2026

Added private meal/food/recipe/target/day history, coach-controlled effective targets, eaten/planned logging, recipe portion snapshots, daily water/completeness, food reuse and portion ideas, seven-day diary/export, and the premium responsive Macros interface. Photo, text and label analysis have authenticated provider routes; barcode capture has a lazy camera scanner and exact product lookup. See `nutrition.md` for credential requirements and explicit feature limits, and `nutrition-research.md` for the source-backed design.

Verification: 73 unit/API/PostgreSQL checks, lint, TypeScript and production build; desktop/mobile browser flows cover targets, manual food entry, decimal commas, weighed amounts, planned/eaten separation, invalid-save draft preservation, recipes, reload and sample identity isolation. Live provider accuracy, real-camera decoding and hosted two-user auth still need credential/device validation.

## Apollo identity — September 13, 2026

Researched all ten identity principles and expanded Apollo into a coherent coach, companion, educator, wellness/faith advisor and strategic/creative partner. Added a 17-source research report, versioned server-owned identity, role/approach/tone/depth/language controls, and an in-app principles summary. Shared the foundation with specialized AI routes while preserving their strict task contracts. Strengthened main-chat identity binding and rejection of duplicate or unauthorized context selections; fixed dialog accessible naming.

Software validation covers 79 unit/API/database tests, lint, TypeScript and production compilation. Sixteen synthetic live-model review scenarios are available but skipped by default; behavioral quality and hosted credentials are not certified by software tests. Full subject retrieval, durable chat memory and autonomous actions remain future builds. See `docs/apollo/IMPLEMENTATION.md`.


## Apollo durable memory and learning — September 13, 2026

Added a ten-source research blueprint and implemented an explicit teaching library, author-only revision history, retirement/deletion, private saved conversations, opt-in lexical recall of teachings/history/app activity, source receipts, and stale-source dependency checks before replay and after generation. Storage and consent remain separate; teaching never changes model weights or system instructions. Connected use requires migration 006 and existing Supabase credentials. Semantic search, reviewed file ingestion, automated extraction and live-model memory evaluation remain future work. See `docs/apollo/MEMORY-IMPLEMENTATION.md` for precise limits and release setup.
