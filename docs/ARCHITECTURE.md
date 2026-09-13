# Architecture and trust boundaries

## Runtime

A Next.js App Router application renders a client workspace shell and exposes authenticated JSON endpoints. Supabase Auth provides individual identities; PostgreSQL is the source of truth. Sample mode is a separate in-memory adapter with fictional, labeled data. It cannot call the real AI endpoint or authenticate by switching names.

The application uses the Web Request/Response route-handler API. All business reads and writes go through bearer-authenticated endpoints. Every handler verifies the token with `auth.getUser`, obtains an active membership, and queries through a per-request client carrying that user's bearer token. Client-supplied owner or workspace IDs are rejected by strict input validation. The public Supabase key is not an authorization mechanism; grants and RLS enforce access even if the API is bypassed and the database REST endpoint is called directly.

## Data model

`workspaces` contains the shared ecosystem. `memberships` maps verified users to workspaces with equal status and an administrative active flag. A user has one membership in V1. Deactivate membership instead of deleting a row with content references.

`records` contains the common permission envelope and typed domain content. Indexed workspace/date, owner, parent and recipient fields support scoped retrieval. The envelope contains immutable identity, owner, workspace and parent; a visibility enum; optional recipient; domain/kind; human text; status/date; validated domain metadata; and timestamps. Workouts contain a validated array of sets; campaign briefs contain explicit planning fields; expenses keep amount and currency. Domains are not separate user apps.

`audit_events` records actor, record identifier, operation, old/new visibility and time. A database trigger is the only write path. Actors can read their own events; there is no shared audit feed exposing another person's private activity. No record body is copied into the audit table.

`ai_usage` is a non-readable counter table behind a narrowly scoped security-definer function. It atomically enforces a per-account hourly quota. A privileged maintenance job should remove aged counters according to retention policy; the app does not grant this privilege to users.

## Authorization matrix

| Operation | Private | Named recipient | Juntos |
|---|---|---|---|
| Owner read | Yes, active membership | Yes, active membership | Yes, active membership |
| Other active member read | No | Only named recipient | Yes, same workspace |
| Owner edit/delete | Yes | Yes | Yes |
| Other member edit/delete | No | No | No |
| Reply | Owner only | Either participant, same two-person audience | Active workspace members |
| Include in owner's private AI | Explicit selection | Explicit selection | Explicit selection |
| Include in shared AI | Never | Never | Explicit selection |
| Outside workspace / signed out | Denied | Denied | Denied |

The database guards ownership and parent identity changes, audience shape, foreign-workspace recipients, inherited parent permissions and invalid workout payloads. A child can never widen its parent. With children present, parent audience changes and parent deletion are blocked rather than leaving stale children behind. The UI explains this limitation; a future subtree transaction needs a full audience review.

## AI boundary

`AiProvider.respond` receives a server-filtered context object. The current OpenAI implementation has no database credentials, tools, sending authority or persistent provider conversation. Its input is the current user message plus selected permitted records, all wrapped as untrusted data. Its system instructions define role and interpersonal/health/faith boundaries, but those instructions are not the access-control mechanism.

`contextRecords` first enforces workspace/owner/audience access and then the stricter shared-context partition. Unknown, unauthorized or duplicate selected IDs fail closed. Only 12 records may be selected; message and payload lengths are bounded. No vector search or automatic memory is present. An explicit AI memory note uses the same record permissions and must still be selected. No private summary or transcript is carried into a shared request.

The response is ephemeral until the user reviews and saves it privately. Saving a draft is distinct from sharing it. No code automatically sends a message or changes an audience based on model output. Vendor failure becomes a visible retryable error; the deterministic drafting guide remains available without a model.

`VoiceProvider` is an interface only. A future implementation must authorize identity and context before issuing ephemeral WebRTC credentials, indicate microphone state, stop on audience changes, support interruption, and obtain transcript-storage consent. A voiceprint is not authentication. A third person's presence is not permission to retrieve either user's private memories.

## Threat cases and defenses

- A partner requests another's private record by ID: RLS returns no row; AI refuses unavailable selections. Linked-record validation does not reveal private content.
- A user changes the owner/workspace in a request: strict API schema rejects extra identity fields, INSERT policies bind ownership, UPDATE triggers keep identity immutable.
- A user bypasses the Next.js API: the same grants, RLS and database guards still apply.
- Prompt injection inside a shared brief: no private records are in shared model context; no tools or write privileges exist. React renders text without raw HTML. Prompt behavior still requires adversarial evaluation before sensitive release.
- Membership is revoked: active membership predicates immediately reject subsequent database operations. Client refresh clears stale records and dialogs on failure. Revocation does not erase information already seen, exported, or sent to a provider.
- Sign-out races an in-flight data fetch: a session epoch blocks stale responses from repopulating the signed-out UI. Refresh versions also prevent older responses overwriting newer state.
- Browser cache exposes private data: service worker caches only explicit public resources. API/HTML responses use no-store; no sensitive record cache is persisted locally. SDK session persistence remains a device security consideration.
- CSRF: writes require a bearer header, not ambient session cookies; no permissive CORS policy is configured. Never add an unauthenticated server-side service-role shortcut.

## Design system and accessibility

Obsidian and deep green set the visual ground; warm gold emphasizes intent rather than rewards. Serif titles introduce warmth; system sans-serif keeps controls clear and avoids third-party font requests. The shared horizon is original CSS geometry rather than a false photograph of the users. Information is primarily editorial lists, focused working surfaces and a three-chapter roadmap.

Navigation adapts to a mobile drawer. Native dialogs provide focus containment and Escape dismissal; form fields have labels and error messages. Reduced-motion preference removes transitions. Keyboard-visible focus uses a high-contrast gold ring. Further WCAG audit and real-device assistive-technology testing remain release tasks; responsive browser checks are not a certification.

## Deployment shape

Deploy the Next.js Node application to a provider supporting its runtime and environment variables; connect Supabase over HTTPS. Use a dedicated staging project before production. Do not publish a sample-only deployment as a live private health/faith system. No hosting resources or paid services were provisioned in this build. Current credentials and backups must be configured and tested before real use.
