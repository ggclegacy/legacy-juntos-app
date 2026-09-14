# Apollo memory and learning

> Historical implementation notes. For the current document library and cited research, see [Knowledge setup](KNOWLEDGE-SETUP.md); meaning-based memory details are in [Intelligence setup](INTELLIGENCE-IMPLEMENTATION.md).
## What ships

Apollo now has a dedicated Memory & learning library. Either member can teach a fact, preference, lesson, workflow, or decision; add an effective date and source note/link; prioritize it; correct it; retire it; and delete it. Audiences are private, a named workspace member, or Juntos. Only the author can change a teaching. Revision history stays author-only even if the latest teaching is shared. A text box accepts pasted notes; URLs are references and are not fetched. No file/OCR importer is implied.

Saved conversations persist complete successful user/assistant turns in PostgreSQL. They are private to their creator, including Juntos-context drafts. Users explicitly start a saved conversation, reopen one from the library, load older turns, or use a temporary conversation. Temporary chat is not saved by the app, but provider policies still apply. A failed provider call does not create an assistant turn. Concurrent appends require a matching conversation revision.

Recall can use teachings, earlier user statements, general life/project records, and the owner's training, nutrition, or protocol data. Each area is selected separately. Memory is initially selected in the panel; actual provider transfer still requires the consent checkbox. Health/performance categories are unavailable in Juntos context. Teachings marked for a named recipient are excluded from Juntos recall. The interface shows the selected dated source excerpts supplied to the model.

“Teach Apollo from this message” and the corresponding saved-turn action open a reviewable teaching form. They do not silently extract or publish facts. The model has no memory-write tool; saving succeeds only through a validated database operation. User teachings are treated as context, never system-level instructions. This implements continually editable application knowledge, not model-weight training.

## Setup

Apply `supabase/migrations/006_apollo_memory.sql` to the existing Supabase project after migrations 001, 002, 003, and 005. Migration 004 remains necessary for existing report-file storage. Use the project's privileged migration connection or SQL editor; runtime requests use the authenticated user's ordinary database token, never a service-role key.

No new environment variables or external memory vendor are required. Existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` connect storage. Existing server-only `OPENAI_API_KEY` and `OPENAI_MODEL` enable conversational replies. Teaching and library management do not require an AI key. The local sample preview remains unconnected and deliberately labels its teaching edits as temporary for that library visit.

Until migration 006 is applied, memory endpoints report a setup/connection error. Existing temporary AI remains usable if all recall areas are disabled. Deploy the migration before promoting the application build for everyday use. Verify real Auth/RLS behavior with two separately signed-in accounts after deployment; local SQL tests do not establish hosted setup or correct backup policy.

## Storage and access

- `apollo_memories`: current explicit knowledge with owner, audience, revision, source, effective date, active/retired state and priority.
- `apollo_memory_versions`: immutable snapshots created by a database trigger, readable only by the current teaching's author, cascade-deleted with the teaching.
- `apollo_conversations`: owner-private context-locked threads. Ordinary clients cannot update their identity or context.
- `apollo_turns`: immutable paired turns, appended atomically through `append_apollo_turn`, with source dependency versions. Deleting a conversation cascades its turns.
- `apollo_sources`, `recall_apollo`, `check_apollo_sources`: security-invoker functions under row-level security. Source checks apply the same audience rules as retrieval.

Memory writes also add content-free audit events. Existing application data stays in its original tables and is read as an authorized source; this avoids a second copy of every workflow update. Latest revisions are selected before searching append-only nutrition/protocol data. Removed meals are omitted. Protocol state remains source data: a stopped or historical protocol is not automatically a current treatment recommendation.

The main route validates the authenticated user, workspace, consent, selected records, conversation revision, and recalled audience before calling OpenAI. It repeats identity/access/version checks after generation. A changed dependency suppresses the reply. On reuse, prior answers whose dependencies no longer match are omitted; subsequent turns carry their dependency lineage. Users can still inspect their saved historical transcript, clearly labeled as historical. A correction changes future recall, not text already seen or independently copied.

## Deliberate bounds

Retrieval is lexical, using English, Portuguese and simple token normalization. It is not semantic/vector search. The entire authorized source set is eligible, but each request takes at most 12 recalled sources, each at most 6,000 characters within a roughly 24,000-character content budget. It prioritizes pinned teachings and ranks remaining matches. Heavy use of pins can crowd out relevant matches; keep priorities selective. Activity payloads are labeled excerpts, not complete analytical datasets.

Recent conversation context considers the latest 12 turns with a 20,000-character text budget and a dependency cap. Older turns remain saved and can be inspected. Enabling past-conversation recall searches user statements, not past AI answers as if they were verified facts. Library and transcript views paginate in groups of 30. The history dialog shows the latest 30 teaching revisions; earlier versions remain in storage and are accessible through the paginated API.

The source adapter for activity currently searches bounded JSON excerpts. It does not compute exhaustive weekly totals, exercise trends, or treatment effects; numerical analytics should use purpose-built functions. Search quality and latency across large archives need measurement before claiming years of complete recall. Full-text indexes exist for memory and conversation data; the initial unified retrieval query still computes a combined source ranking, so large-archive query plans need optimization before scale-up.

Source deletion invalidates dependent context on future requests but cannot recall information already read, exported, or delivered to a provider. Database backups and provider retention need their own retention policy. Response `store:false` does not promise zero provider retention. Independently saved teachings and transcripts are managed separately. No secrets or raw request bodies are logged by these routes.

## Verification and next steps

Automated tests cover actual PostgreSQL-compatible RLS for two members and an outsider, anonymous access, owner spoofing, recipient boundaries, author-only revision history, correction conflicts, retirement/deletion, conversation ownership/concurrency, timestamp dependencies, revoked membership, bilingual retrieval, and superseded nutrition data. API tests cover audience rejection before model execution and revocation after generation; context tests cover stale-answer omission. Browser tests exercise teaching, correcting and deleting in the labeled preview on desktop/mobile.

Live behavioral evaluation remains separate. Test synthetic cross-conversation recall, old-versus-new preferences, bilingual paraphrases, absent facts, malicious teachings, and personal versus shared context on the configured model. A model answer claiming memory success is not a storage assertion. Software test success does not certify recall accuracy or medical/relationship judgment.

Next: benchmark retrieval on a growing synthetic archive; introduce consented embeddings and hybrid search with source-version invalidation; add reviewed text/PDF/image ingestion; then propose rather than silently accept extracted facts. Background consolidation, autonomous browsing/learning, persistent personal onboarding profiles, shared multi-party AI sessions, coach portals, voice, and full analytical tools are not implemented by this release.
