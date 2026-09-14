# Knowledge library: setup and exact behavior

## Activation

Apply `008_apollo_knowledge.sql` after migrations 001, 002, 003, 005, 006 and 007. Migration 004 is independently required for health-report storage; the Studio migration is independent of knowledge. This release adds no new secret. Use the existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, server-only `OPENAI_API_KEY` and `OPENAI_MODEL`.

The configured model must support Responses API structured output, vision/PDF input and hosted `web_search` for the corresponding features. Missing credentials or unsupported features produce an error, not a synthetic result. Document editing and direct text import do not require OpenAI. This run has not verified cloud migration state or live account/provider behavior: Supabase management access and usable local API credentials were not available through the existing connection.

## Using the library

Open **Apollo → Knowledge & research**. Add notes, import text, read a PDF/photo, review a starter, or research an explicit question. New imports and research results open a **private draft**. Set the source type and references, review limitations, select an audience, and choose **Active** when ready. Activation requires a review checkbox. It signifies user review, not professional verification or scientific correctness.

Only active documents are visible to a selected recipient or the shared workspace and eligible for recall. Drafts and archives are owner-only. Another person can read authorized active documents but cannot edit them or inspect their revision history. Corrections, retirement and deletion invalidate old passages and their vectors; saved conversations omit stale source-dependent turns when continued. A displayed old answer remains a historical answer, not a fresh validation of its claims.

To use the library in chat, enable **Reviewed knowledge library** under **Memory & app awareness**. Keyword retrieval works immediately for active passages. For meaning-based recall, consent to preparing the selected area in batches, then enable that option. New/revised documents need their new passages prepared again. Apollo receives source labels, publication/review dates and passage locations. Source references are shown in the response's context receipt.

## Import limits and retention

- Text and Markdown: local reading, at most 240 KB and 60,000 characters. No AI call for this path.
- PDF, JPEG and PNG: at most 2 MB, explicit consent before transmitting the inline file to OpenAI, signature checks, 60-second provider timeout, structured transcription capped at 12,000 output tokens. Split long or dense documents into small sections. File size does not guarantee that a model can read the whole document. Incomplete responses fail; accepted drafts expose the model's own completeness report and limitations for human review.
- Only the reviewed text, source references, metadata and revisions are stored in Supabase. Original binaries are **not archived**. Keep the original separately; DOCX and other formats should be exported to PDF or text. Transcription can misread units, numbers and table rows even when the model reports complete.
- Text is split into 1,600-character passages with 200-character overlap by a database trigger. Passage position is a character offset; it is not guaranteed to be a PDF page number. Visible page markers may be included by transcription.
- Responses use `store:false` and no provider Files API/vector store. Provider-level retention still applies. App deletion removes document/history/passages/embeddings, not independent provider records or previously viewed/exported material.

## Research privacy and evidence

The separate research endpoint accepts only an explicit question, topic and consent. It never loads memory, documents, health data or conversation history. The user controls the question and must remove personal details they do not want searched. Main chat has no web-search tool, preventing private retrieved content from being silently turned into web queries.

Research uses `web_search`, requires an actual completed search, caps tool calls at four and returns only an answer with valid provider citation annotations. Inline citations are clickable, HTTP(S) only, and supplemented with a source list. Citations establish the reported source, not truth, relevance or scientific quality. Training/nutrition/wellness searches use a source-domain allowlist; other areas request primary sources without a fixed domain list. No research is automatically saved. “Review for my library” creates a private draft with source links and a research date.

Starter references include two concise published-source summaries and one clearly identified suggested coach-program workflow. This is a foundation, not an exhaustive subject library or a medical/prep prescription. Reviewed research is retrievable knowledge, not model retraining.

## Limits and next priorities

- Verify hosted migrations and separate Neil/Kamilla sessions; run opt-in live transcription and cited-search tests with synthetic inputs.
- Evaluate retrieval relevance against real consented questions; current source selection is bounded to 12 sources and a text/metadata budget, not exhaustive reading.
- Add original-file storage only with protected download routes, retention controls, deletion reconciliation and explicit audience review.
- Add background indexing and periodic source-review reminders only with opt-in cost and notification controls. Current review dates are labels, not scheduled checks.
- Build deeper reviewed subject collections over time. Keep different theological interpretations, professional instructions, personal reports and empirical evidence distinguishable.

## Verification

The complete unit/API/database suite passed: **188 tests**, with one opt-in live-model test skipped. Production build, TypeScript and lint passed. Ten Apollo/knowledge browser flows passed on desktop and mobile, covering privacy controls, existing teaching, new document review/activation/archive/deletion, revision visibility in preview, local text import and honest disabled live-research controls. Database tests exercise actual PostgreSQL RLS and passage/vector invalidation. Provider behavior is checked with synthetic responses; these tests do not establish live OCR accuracy, source quality or cloud readiness.
