# Apollo: meaning-based recall and reviewed learning

Implemented September 13, 2026. Requires migrations 001, 002, 003, 005, 006 and **007_apollo_intelligence.sql**, plus the existing server-side OpenAI configuration. Migration 004_health_reports.sql remains required for the application's separate health report storage setup.

## What changed

- Optional hybrid recall combines existing keyword retrieval with cosine similarity and reciprocal-rank fusion. OpenAI `text-embedding-3-small` produces 512-dimensional vectors. Each person prepares selected source areas in batches of 12 after explicit provider consent. The UI shows indexed/eligible counts. Questions are embedded only when meaning-based recall is enabled.
- Embeddings belong to a user and audience, reference an exact source version, and are joined against currently authorized sources at query time. Shared recall excludes private/named-recipient memories and health/performance records. Corrections/deletions purge derived vectors for all people who indexed that source; fresh indexing is needed after changes.
- A private learning review accepts a statement, compares relevant active teachings authored by that user, and produces up to four structured proposals. Every accepted proposal must carry a literal quote from the statement. Proposed replacement IDs must match supplied teachings. No proposal automatically writes memory. Users review wording and audience in the existing teaching editor; corrections use its revision checks and history.
- Selected record IDs are attached when a saved conversation is created. Reopening restores only currently visible, audience-appropriate selections. This connects business projects, faith notes and other records without granting extra access. Changes to selections after creation affect that turn, not the saved link list.

## User flow

Open Apollo → Memory & app awareness → select areas → consent to preparation → Prepare next batch. Check progress and repeat as needed, then enable meaning-based recall. Keyword search remains available without preparing embeddings. If the embedding service fails, the request reports failure; turn off meaning-based recall to use keywords.

For learning: use **Teach Apollo from this message**, or open **Memory & learning → Help Apollo learn from what you say**. Review suggested knowledge, choose **Review new teaching** or **Review correction**, check its audience, and save. This review is private even when launched from a Juntos-context conversation. A correction retains the existing audience for explicit review. A new teaching starts private.

## Design decisions and evidence

[Supabase's hybrid search guide](https://supabase.com/docs/guides/ai/hybrid-search) describes combining lexical and semantic rankings through reciprocal-rank fusion. This implementation uses exact array-based cosine search inside PostgreSQL for a two-person archive, avoiding an extension dependency. It is not an approximate-nearest-neighbor index; evaluate pgvector and workload limits before scaling to large archives.

[OpenAI embeddings documentation](https://developers.openai.com/api/docs/guides/embeddings) supports shortened embedding dimensions. The cache records the model, dimensions and source-text version together, so future model changes require re-indexing. [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) constrain learning proposals; application validation and user review remain necessary because schema correctness does not establish truth.

The source text uses the existing bounded source excerpts. Long histories are not embedded in their entirety. Recall returns at most 12 sources within the existing context budget. The cosine threshold of 0.3 and RRF constant of 60 are initial tuning choices, not a validated accuracy guarantee. The synthetic-vector tests exercise ranking and privacy, not real-model semantic quality.

## Operational limits and activation

- The hosted Vercel project has the expected Supabase and OpenAI variable names. API reads available in this run did not return their values. No credentials were printed or added to source control.
- This checkout has no Supabase management connection. Cloud migrations 006/007 and live model behavior have **not** been verified or activated in this run. Apply pending migrations through the project's authorized Supabase SQL editor, then test using separate Neil and Kamilla sessions.
- No silent background ingestion or continual self-training occurs. Index preparation and learning review are explicit actions. Saving a teaching changes app memory, not the foundation model's weights.
- Learning comparisons retrieve a bounded keyword-selected set of the owner's teachings. Conflict detection is suggestive and cannot guarantee finding every contradiction.
- Indexing sends the selected source excerpts to OpenAI. Embeddings are stored in Supabase; deletion purges the app cache, not independent provider retention. Responses calls use `store:false`; account-level provider retention rules still apply.
- Cached vectors are client-owner writable under RLS, so a user can corrupt their own recall quality; another user's cache is inaccessible. Retrieval always fetches current source text under RLS, never trusting cached text or source access.
- Next priorities: verify hosted migration/auth with both real accounts; evaluate paraphrase recall using consented examples; add budgeted background indexing only with explicit enrollment; develop a project-centric conversation view and external-document ingestion with provenance.
