# Apollo knowledge and research

Decision: build an application-owned, reviewable document library using the existing Supabase authorization and Apollo recall system. OpenAI reads supplied documents and researches explicit questions; it does not own the knowledge store or change it autonomously.

## Scope

- Topic shelves for training, nutrition, recovery/wellness, faith, communication, business, and creativity.
- Private, named-recipient and Juntos documents, source attribution, publication date, next-review date, draft/active/archived status, owner-only revision history and deletion.
- Text/Markdown import without AI. PDF and image extraction with provider consent, visible extraction limitations and review before saving. Store reviewed text and filename metadata, not the binary original in this first increment. Reject oversized files rather than silently truncate.
- Split accepted text into bounded overlapping passages. Add active passages to lexical and opt-in semantic recall with source title, type, document revision and passage position. Correcting, retiring or deleting a document invalidates prior passages and derived embeddings; revoked access excludes them from conversation context.
- A separate research workspace sends only the explicit research question to web search. No private memories, transcripts or documents accompany the web-search call. Display provider citation annotations as clickable links. Saving research requires review and creates a draft, not automatically trusted evidence.
- Starter references for training and nutrition are concise source-attributed summaries with population limits, dates and review prompts. Users explicitly add them; not a comprehensive clinical or prep knowledge base.

## Evidence and implementation references

- OpenAI File inputs: https://developers.openai.com/api/docs/guides/file-inputs — supported document processing; use inline inputs and store:false without persistent provider file/vector stores.
- OpenAI Web search: https://developers.openai.com/api/docs/guides/tools-web-search — web_search tool, domain filters, required search and url_citation annotations.
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs — validate extraction draft shape; schema correctness is not evidence of transcription accuracy.
- Supabase hybrid search: https://supabase.com/docs/guides/ai/hybrid-search — reuse existing lexical/vector fusion while enforcing source access at query time.
- ACSM 2026 resistance-training guidance: https://acsm.org/resistance-training-guidelines-update-2026/ — consistency and individualization; healthy-adult findings are not a personalized competition-prep prescription.
- ISSN protein position stand (2017): https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/ — protein supports training adaptations; identify publication age, healthy exercising population and the limits of general recommendations.

## Quality and rollout

Test actual PostgreSQL RLS, passage access, revisions, invalidation, stale replies, consent, unsafe URLs, fake citations, bounded imports and sample-state honesty. Verify mobile/desktop document review and archive workflows. Production activation still needs authorized Supabase migrations and live account/provider checks; no credential availability is assumed from variable names alone.
