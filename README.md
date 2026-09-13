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

The provider receives the current message plus only the entries explicitly selected and reauthorized by the server. Juntos context excludes both private entries and named-recipient shares, even when the caller can read them. No provider conversation ID or hidden cross-session transcript is reused. Durable memory is an explicit `ai_memory` record; retrieval remains manual and auditable through selected context. Generated responses must be reviewed before saving, and then separately shared if desired.

`store:false` is not a claim of zero provider retention. Review the provider account's actual data controls, retention, region, and terms before sending sensitive health, faith, or interpersonal content. Keys never appear in browser bundles or sample data. Voice, image generation, vector retrieval, automatic memory consolidation and two-user live AI sessions are not implemented.

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
- Extend training to reusable programs, richer progressive overload history and coach-directed reviews; nutrition/supplement tracking is currently free-form notes, not a prescriptive engine.
- Add recurring scheduling/calendar/reminders, push opt-ins, Portuguese localization, licensed Bible content and multi-session study plans. Current prompts rotate manually rather than infer relationship state.
- Add robust realtime collaboration, simultaneous shared AI facilitation, consented voice and reviewed image workflows. There are no autonomous messages, outreach or social publishing actions.
- Audience changes for records with linked children are blocked, preventing orphaned leaks. A future transactional sharing UI can explicitly review and update the whole subtree. Owners can remove their own linked entries; an owner cannot delete someone else's reply. Leaving/deleting a workspace needs a separately reviewed administrative flow.
- Fetching is cursor-paginated for correctness, but the V1 client loads the full accessible collection for local search/export; introduce server-side search and incremental view loading as history grows. Domain details are validated JSON inside a common record envelope; promote mature high-volume domain entities into child tables when needed.
- Access controls are not medical/clinical certification, end-to-end encryption, or a claim of relationship benefit. AI guidance is not a therapist, pastor, doctor or competition coach. No therapy decisions, romance metrics, or drug/dehydration protocols are implemented.

See `docs/RESEARCH.md` for the evidence and blueprint, `docs/ARCHITECTURE.md` for trust boundaries, and `docs/DELIVERY.md` for the verified state of this build.
