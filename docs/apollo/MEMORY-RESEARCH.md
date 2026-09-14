# Apollo: durable memory and learning

## Product decision

Apollo should accumulate a dependable, inspectable understanding of the lives and work represented in Legacy Juntos. The system must preserve useful history across conversations, accept direct teaching from either person, recognize corrections, and retrieve relevant knowledge without crossing private/shared boundaries. “Remember everything” is a product ambition, not a promise of perfect recall or permission to collect information outside the app.

The recommended design uses the existing PostgreSQL/Supabase database as the authoritative memory store. Model requests receive a bounded, authorized context package. The model remains replaceable. Knowledge survives a model change, a browser refresh, and a new conversation because it belongs to the application rather than a provider session.

This foundation distinguishes three things: history records what was said or done; teaching records what a person explicitly wants Apollo to know; recall selects which authorized information belongs in the current answer. Saving something does not guarantee the model will use it correctly. Every layer needs independent tests.

## Research findings

### Persistent storage and selective recall

LongMemEval evaluates information extraction, reasoning across sessions, temporal reasoning, updates, and abstention. Its authors found significant degradation across sustained interactions and recommend improvements at indexing, retrieval, and reading stages.[1] These are useful evaluation categories for Apollo; the published benchmark results are not an accuracy claim for this implementation.

Mem0 presents extraction, consolidation, and retrieval as an alternative to repeatedly sending complete history. Its reported efficiency and quality improvements come from a particular benchmark and vendor-associated implementation.[2] They support testing a selective architecture, but do not establish that adopting its product would give Apollo equivalent performance. A separate memory vendor would also add a second retention and access-control boundary.

The Lost in the Middle study found that relevant information's position within long inputs affected model performance.[3] The evaluated models predate current frontier systems, so exact effects cannot be generalized. The enduring engineering implication is to measure recall rather than assuming a larger context window solves memory.

**Decision:** retain complete saved conversational turns in PostgreSQL, include recent usable turns when resuming a conversation, and retrieve a small selection of relevant older information. Preserve the underlying records rather than treating an AI summary as the only surviving history. Do not silently delete older history when the prompt budget is full. Explain that recall is selective.

### Learning from both people

LangChain distinguishes thread-scoped memory from long-term memory across conversations and describes semantic facts, episodic experiences, and procedural knowledge. Its namespace approach separates collections by application-defined scope.[4] These concepts can be implemented without adopting that framework.

**Decision:** provide a first-class “Teach Apollo” flow. A person can save a preference, fact, lesson, decision, or workflow in their own words. Include a title, content, category, effective date, source note, optional source link, and audience. Examples include a preferred coaching style, a brand voice, lessons from a campaign, the reason behind a business decision, or a coach's current training constraints. Source links are references; saving a URL does not imply its contents have been fetched or verified.

Teaching should work without an AI API call. This gives the most important memory write a deterministic success condition: the database committed the exact content. Apollo must not say “I'll remember that” merely because a model generated those words. The interface confirms the save. A remembered conversational statement can be reviewed in the teaching form; generated advice should not automatically become a personal fact.

**Decision:** support correction and retirement. Editing changes the current version and retains an owner-visible revision trail. Retiring excludes a teaching from automatic recall while keeping it in the library. Deleting removes the teaching and its stored revisions from active application storage. Do not train model weights on private diary entries or mutable preferences; retrieval is easier to correct, inspect, and revoke. This is continual application learning, not autonomous retraining or a guarantee of human-like understanding.

### Memory security

Supabase documents enforcing permissions on retrieval through PostgreSQL row-level security. The permission check can apply to document sections and vector results as well as ordinary rows.[5] Application filtering alone is fragile because future queries may forget the filter.

OWASP's Agentic Threats Navigator identifies memory, reasoning, identity, tools, and human oversight as security surfaces.[6] Persistent untrusted content can influence later behavior. A teaching that says “ignore your privacy rules” must remain data rather than gain system authority.

**Decision:** isolate every item by workspace, owner, and audience. Both people have equal capabilities. A private conversation's transcript remains readable only by its owner, including a conversation using Juntos source material. A “Juntos context” selector controls which knowledge may inform a draft; it does not publish the conversation. Teachings explicitly marked shared become accessible within the workspace. Named-recipient teachings are usable privately by the authorized recipient, but are excluded from Juntos recall.

**Decision:** authorize before retrieval, not after a model sees the data. Run requests with the authenticated user's database token. No service-role key belongs in this feature's request path. Recheck source availability and versions after generation. If access was revoked, a record was corrected, or the account changed during generation, suppress the stale result. Reused conversation turns must also honor the dependencies that informed them. Otherwise a deleted memory can leak back into context through yesterday's answer.

**Decision:** teachings and history never override Apollo's system principles or enable new tools. Distinguish a person's report from verified scientific evidence, a clinician's confirmed order, or a universal truth. No automatic inferences about diagnoses, relationship motives, religious obligations, or private beliefs should be promoted into durable facts.

### Retrieval architecture

Supabase's hybrid-search guide combines full-text and semantic search, then merges ranked candidates. Full-text search is useful for exact names and terms; semantic retrieval helps with paraphrases.[7] PostgreSQL provides query normalization, text ranking, and configurable dictionaries, including multilingual search support.[8]

**Decision:** first ship database-backed lexical recall with English, Portuguese, and simple token handling, rather than claiming an unmeasured semantic system. Query the whole authorized archive instead of loading only the newest records into the browser. Pinned current teachings can provide stable context. Return dated source labels and identifiers alongside the answer. Search is a bounded selection, not a complete analytics query or exhaustive life review.

**Decision:** retain a clear extension point for embeddings and hybrid ranking. Before adding embeddings, choose and pin the embedding model, record the model/version and content revision, obtain consent for the additional provider transfer, and rebuild indexes when the model changes. Permission filters and source invalidation must apply identically to lexical and semantic candidates. A graph database is unnecessary for two people at this stage; ordinary relationships, source references, and timestamps should be measured first.

**Decision:** access to app activity is opt-in and category-specific. General life records, training, nutrition, and protocols remain their own authoritative stores. Apollo can recall selected current source records rather than duplicating every edit into a second fact store. Nutrition and protocol histories require resolving the latest entity revision before searching so an obsolete target or discontinued entry is not accidentally presented as current. Long JSON documents must be bounded and labeled as excerpts. Numerical trend calculations need dedicated analytical functions later; retrieval alone cannot prove a treatment worked or compute an exhaustive trend reliably.

### Conversation state and provider retention

OpenAI supports supplying conversation state explicitly or using provider-managed state.[9] Its data-control documentation distinguishes application-state retention from abuse-monitoring logs; disabling response storage does not establish zero retention for every purpose.[10]

**Decision:** own transcripts in the application and send only the authorized context for each request with response storage disabled. Expose saved versus temporary conversation behavior. Temporary means the application does not save a transcript, not that the provider guarantees zero retention. Use an explicit provider-consent control that names the categories being sent. Avoid storing tokens, API keys, or full raw provider responses in the memory store.

**Decision:** create resumable conversations explicitly and append complete user/assistant pairs only after successful generation and access revalidation. Use a version check so simultaneous browser tabs cannot silently append competing branches to the same conversation. On provider failure, leave the user's input available for retry and do not invent a saved assistant answer. Deleting a conversation removes its turns. A teaching separately saved from that conversation remains independently managed, with this distinction explained in the interface.

## User experience

Apollo's panel should have a dedicated memory area alongside conversation controls. The first impression should be capability and clarity: teach something, find what he knows, or return to a conversation. Avoid an overwhelming list of database concepts. Display ownership and audience in plain language.

A teaching form should start with what the person wants Apollo to learn. Optional detail explains where it came from and when it became true. Users should be able to paste their own notes or text from a document. File parsing, OCR, and URL ingestion require their own review and source-validation workflow and must not be implied by a text field.

The library should support searching all accessible teachings, filtering active versus retired knowledge, correcting owned entries, and permanently deleting owned entries after a concrete confirmation. Version history belongs to the owner, not everyone who can see the latest version: changing an audience must not retroactively publish old private content. The other person can read shared teachings but cannot rewrite the author's memory.

Memory use and memory storage are separate controls. Saving a conversation allows continuity. Enabling recall lets Apollo consult authorized teachings and, if chosen, other saved conversations and activity. A fresh temporary conversation should remain available. The application should avoid silently persisting consent or sharing choices across a private-to-Juntos switch.

For a response informed by memory, show the material supplied to Apollo, its source type, and its date. This is a context receipt, not a guarantee every source supported every sentence. Apollo should identify sources when making a specific remembered claim and acknowledge missing information. The user can inspect the receipt rather than trusting an unexplained claim that Apollo knows them.

## Correction, forgetting, and failure handling

Corrections must be explicit writes with optimistic concurrency. Two tabs editing the same teaching should produce a conflict rather than last-write-wins data loss. Store original creation time, current update time, effective date, and revision. These represent different concepts: a note entered today may describe a decision made last month.

A current teaching can change without erasing its owner's record of how it evolved. The revision trail is not normally eligible for AI recall. This prevents outdated values from competing with current facts. Historical questions can be answered from dated conversations or original activity when authorized, with appropriate uncertainty.

Deletion means removal from live tables and recall, including teaching revisions or conversation turns as applicable. It does not erase copies the other person already read, exported material, provider retention, or database backups. The setup documentation should name these practical limits and avoid an impossible promise of universal erasure.

An important revocation problem is derived text. If a response used a memory and the memory later changes or disappears, replaying the response as context may reintroduce the old information. Store dependency identifiers and revisions with saved turns. Exclude a dependent turn from automatic reuse when its source can no longer be verified; include the dependency chain on later turns. This is conservative and can reduce available history, but it protects against stale-context resurrection.

Full automatic fact extraction is a future enhancement, not a prerequisite for strong memory. It should produce reviewable candidates with source spans, never silently accept guesses as facts. An opt-in automatic mode could later save low-risk observations with a clear origin and reversible controls. Sensitive interpretations and sharing decisions should remain explicit. Background jobs also need idempotency, retry handling, account revocation checks, and measurable costs before deployment.

## Validation and release gates

Storage tests should run the actual migration under PostgreSQL-compatible row-level security. Verify private, shared, named-recipient, outsider, and revoked-member behavior; owner spoofing; immutable identity; correction conflicts; deletion cascades; search audience filtering; and prevention of private history in Juntos context. A model prompt cannot substitute for these tests.

API tests should assert that no unauthorized material reaches the model, consent gates provider transfer, source versions are checked again after generation, and concurrent conversation updates fail clearly. Test missing migrations as a clear setup error. Keep private request bodies out of error logs.

Model evaluation should use synthetic cases in both English and Portuguese: remembering a decision across conversations, following a corrected preference, distinguishing two projects, refusing to guess an absent detail, resisting a malicious teaching, and explaining an old versus current plan. Measure retrieval recall separately from answer faithfulness. Human review is essential for interpersonal and health examples; a vendor benchmark score does not certify Apollo.

Browser checks should cover creating and correcting a teaching, resuming a conversation, search and pagination, temporary behavior, audience switching, and mobile usability. Sample mode must label in-memory examples and never imply durable account storage or live model access. A successful build and unit tests establish software checks, not proof of perfect memory.

## Delivery sequence

This release should establish the relational memory library, private resumable transcripts, lexical recall, opt-in activity access, source receipts, correction/deletion, and database privacy tests. Apply the migration before enabling these controls on a hosted deployment. Existing temporary chat can continue without the new memory tables when memory features are unused.

The next release should add consented hybrid retrieval and a synthetic recall benchmark large enough to include old, similarly named, corrected, and bilingual material. Then add reviewed document ingestion and extraction proposals. Later add deliberate analytical tools for performance and nutrition trends and carefully scoped background consolidation. Each enhancement must inherit the same audience, provenance, correction, and deletion rules.

## Sources

1. Wu et al. [LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory](https://arxiv.org/abs/2410.10813). ICLR 2025; revised March 4, 2025.
2. Chhikara et al. [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory](https://arxiv.org/abs/2504.19413). 2025. Vendor-associated research; benchmark-specific findings.
3. Liu et al. [Lost in the Middle: How Language Models Use Long Contexts](https://aclanthology.org/2024.tacl-1.9/). TACL 2024.
4. LangChain. [Memory overview](https://docs.langchain.com/oss/python/concepts/memory). Living documentation, accessed September 13, 2026.
5. Supabase. [RAG with Permissions](https://supabase.com/docs/guides/ai/rag-with-permissions). Living documentation, accessed September 13, 2026.
6. OWASP Gen AI Security Project. [Agentic Threats Navigator](https://genai.owasp.org/resource/owasp-gen-ai-security-project-agentic-threats-navigator/). Accessed September 13, 2026.
7. Supabase. [Hybrid search](https://supabase.com/docs/guides/ai/hybrid-search). Living documentation, accessed September 13, 2026.
8. PostgreSQL. [Controlling Text Search](https://www.postgresql.org/docs/current/textsearch-controls.html). PostgreSQL 18 documentation, accessed September 13, 2026.
9. OpenAI. [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state). Living documentation, accessed September 13, 2026.
10. OpenAI. [Data controls](https://developers.openai.com/api/docs/guides/your-data). Living documentation, accessed September 13, 2026.
