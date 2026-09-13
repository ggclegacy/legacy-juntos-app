# Legacy Juntos: research and product architecture

## Product decision

One private Life OS, two equal identities, three intentional contexts: Me, a named recipient, and Juntos. Faith, friendship, physical performance, work, and creativity belong in the same ecosystem. A context changes the audience and permitted information, never the capabilities a person receives. Competition preparation is an optional mode available to either account. Relationship stage is neither inferred nor scored.

The initial Desktop directory and remote repository were empty on inspection. There is no inherited stack or data to migrate. This blueprint precedes implementation. Its direction is validated against the supplied requirements and evidence, not yet by interviews or longitudinal use with Neil and Kamilla. Sample content must be identified as illustrative, never presented as their actual history.

## Evidence and translation

### Safety, agency, and interpersonal growth

SAMHSA describes safety, transparency, peer support, collaboration, empowerment, and attention to cultural context as principles of trauma-informed approaches.[1] These originated in care settings; translating them to software is a design judgment, not evidence that this app provides trauma treatment. Product implications: private defaults, visible audiences, editable drafts, optional prompts, no automatic disclosures, and a way to withdraw sharing. Avoid escalating reminders, hidden relationship analysis, diagnostic labels, and “you owe them a response” language.

Reis's research synthesis describes perceived responsiveness through understanding, validation, and caring.[2] It supports asking what a person wants understood and reflecting that meaning back. It does not justify an AI scoring responsiveness, judging a partner, or predicting relationship outcomes. Most classic work is not a direct evaluation of a friendship-first digital product or this particular cultural context. Treat the principles as hypotheses to test through voluntary use.

The Gottman Institute's discussion of bids emphasizes noticing everyday requests for attention and connection.[3] This is practitioner interpretation of a research program rather than an independent trial of an app. Translate it into optional appreciation notes, shared experiences, and invitations to listen. Discard romance metrics, positive-to-negative quotas, presumed dating milestones, streak loss, and implicit obligation. No notification should expose that someone has a private reflection or communication draft.

Know & Connect should cover values, childhood, family, preferences, boundaries, faith, ambitions, care, money, future, and memories. Begin with low-pressure prompts; “skip” and “keep private” are first-class outcomes. A later adaptive engine can avoid previously answered questions using only records permitted in its current context. It must not use one person's private fear to generate a question for the other. Personalization of shared prompts requires shared, approved sources.

The communication bridge uses four steps: what happened in the speaker's words; what they feel or need understood; what they hope to ask; review a draft or discussion outline. Clarify before reframing. Never invent the other person's motives. Private generation stays private; sharing is a separate human action. For shared discussions, invite each perspective, summarize agreements and open questions, and let people choose next steps. There is no verdict or automatic assignment of blame.

### Faith

BibleProject demonstrates study organized around passages, contextual teaching, and reflection.[4] YouVersion documents private and friend-visible reading plans.[5] These are useful workflow precedents, not effectiveness trials. Legacy Juntos should separate passage reference, translation, human notes, and AI commentary. A first release can link to a reader rather than distribute copyrighted Bible translations without a license.

Build prayer journals, gratitude, church notes, reading plans, and a “What is God teaching us?” reflection space on the same privacy foundation. For a common passage, each person writes privately and independently chooses whether to reveal their reflection. Never make one person's disclosure conditional on the other's, or expose whether an unrevealed response exists. AI may explain historical context with uncertainty and support study; it cannot speak for God or make pastoral pronouncements. Denomination, translation, and English/Portuguese preferences remain user choices.

### Performance, health, and preparation

Strong's documented exercise notes distinguish session observations from exercise-level notes.[6] Useful implementation consequences are repeated sets, previous-session context, units, perceived effort, and notes near the lift. Log actual reps and load rather than manufacturing progress. Use volume only when units and exercise are comparable; personal records need a consistent definition. A recommendation engine should consider recovery and user intent before suggesting progression.

Helms and colleagues' 2014 bodybuilding reviews cover nutrition and training during contest preparation.[7][8] They are older syntheses with limited direct contest-prep evidence and should not become automatic individualized prescriptions. The IOC's 2023 REDs consensus describes health and performance concerns associated with problematic low energy availability in athletes.[9] Therefore the app should track coach-directed plans, recovery, posing, competition dates, and voluntary check-ins without automatically prescribing restrictive diets, dehydration, drug use, or peak-week protocols. Sponsor involvement grants no default access to health records or photos.

Both people receive the same workout and wellness system. Prep Mode adds milestone planning, posing practice, weekly reviews, and competition logistics. Health and body measurements are private by default. Medical concerns belong with qualified professionals. Avoid competitive weight-loss leaderboards, attractiveness scores, AI body-photo diagnosis, and aggressive calorie targets. Photo storage requires private buckets, scoped access, signed URLs, and revocation work before release; no public upload shortcut.

### Goals, work, sponsorship, and studio

A meta-analysis of mental contrasting with implementation intentions supports concrete plans for pursuing goals, with varied effects across study contexts.[10] This is not evidence that more reminders always help. Translate aspiration into a chosen next action, optional date, and obstacle/response plan. Accountability means a voluntary agreement, not surveillance. Show completed work and controllable next steps instead of relationship commitment scores.

Linear's project milestones group actionable issues within projects and expose progress.[11] Use that restrained hierarchy: venture → project/campaign → deliverable or task; attach decisions and discussion rather than proliferating disconnected tools. Initial Business workflows include project briefs, tasks, milestones, meeting/decision notes, and planning budgets. Financial records are planning notes, not banking or accounting integration. Health, private reflections, and shared sponsorship data remain separately authorized even when related to the same event.

Adobe's creative-brief guidance connects requested work to objectives, budget, and schedule.[12] The proposed Studio pipeline is an implementation judgment: idea → audience/objective → concept and copy → visual direction/image prompt → deliverables → review → campaign tasks. It remains useful with editable text before generation APIs exist. Brand constraints and asset rights should travel with the brief. Sponsored content needs a review stage; no auto-publishing or automatic outreach. A campaign can point to the same business project, avoiding a second task database.

Communication should start with durable threaded notes attached to a goal, project, passage, or plan. This provides useful context and simpler privacy semantics than presence, read receipts, voice notes, and native realtime chat at once. Neither presence nor delayed replies should be used as relationship signals. Later realtime subscriptions must apply the same access checks and clear revoked content.

### AI, access control, and memory

OWASP warns that prompts are not authorization controls and that sensitive data should not depend on model obedience for protection.[13] PostgreSQL RLS checks rows at the database boundary; Supabase documents combining grants and policies and testing both allowed and denied operations.[14] The application therefore uses verified identity plus caller-scoped database access. No production service-role credential is required in request handlers.

Every content record has an owner, workspace, visibility, and optional named recipient. Me can use the owner's private data and records explicitly visible to them. Juntos AI receives only Juntos records, even if the caller can personally read additional private or recipient-shared records. Selected context is explicit and minimal. Persisted memory is an ordinary access-controlled record: no hidden memory extraction. Shared generation cannot reuse a prior private transcript, summary, embedding, or provider conversation ID. Permission checks precede retrieval and are repeated per request.

V1 should avoid vector retrieval until access-controlled storage, revocation, and negative tests work. Later, embeddings inherit source access and deletion lineage. Cache keys require principal, workspace, audience, and permission version. Derived summaries are invalidated when any source permission is withdrawn. Shared records must not retain private source IDs that reveal hidden existence. Audit events record action and identity without copying content. Revocation removes future app access but cannot erase screenshots or information already read by a recipient. This limitation must appear when changing an audience.

The AI adapter should have no write tools at first. User content is untrusted data, never privileged instructions. The server validates lengths, validates selected records, budgets output, limits request frequency, uses a timeout, and avoids logging prompt bodies. Provider retention is a distinct issue from app privacy: requests should opt out of stored response objects where supported, and deployment owners must review account-specific retention terms before sensitive use. This is access-controlled storage, not end-to-end encryption.

### Voice and PWA design

OpenAI documents Realtime over WebRTC, WebSocket, and SIP.[15] A browser voice session should use a short-lived server-issued credential and a fixed authorized context, never a permanent browser key. Stop and recreate the session when the audience changes. Always show microphone state; recording starts only after an explicit gesture. Do not infer a second user's identity from their voice. Shared sessions need a visible shared-space audience; a private speaker entering the room is not authorization to add private memory. Durable transcripts and approved memory are separate opt-in operations. Voice remains a service contract until credentials and lifecycle tests exist.

Next.js documents PWA manifests and service workers; web.dev describes deliberate caching strategies.[16][17] Cache only public shell resources and a neutral offline page initially. Never cache authenticated JSON, photos, AI output, or private HTML. Offline editing of sensitive data is deferred until encrypted local storage, logout erasure, and conflict handling are designed.

W3C's WCAG 2.2 target-size guidance establishes minimum target dimensions and spacing.[18] Aim above the minimum for primary mobile actions, keep visible keyboard focus, honor reduced motion, and provide text labels for icon controls. Luxury is a visual design judgment: obsidian canvas, deep green atmosphere, restrained warm gold, generous negative space, expressive serif headlines with clear sans-serif controls. Use a small number of meaningful surfaces and an editorial daily agenda rather than a wall of metric cards. No decorative relationship scores. A subtle topographic landscape can create Brazilian warmth without flag symbolism or invented photographs of the users.

## Implementation blueprint

### Information architecture

Home is the daily orientation and action queue, with Me/Juntos filters and direct links to Faith, Performance, Business, and Studio. Personal contains goals, routines, journals and learning. Connect contains discovery, appreciation, experiences and check-ins. Faith contains passage reflections and prayers. Performance contains workouts, wellness and optional prep. Business contains projects, tasks and sponsorship. Studio contains campaign briefs and deliverables. Conversations contain contextual threads. Vision is a living roadmap. Memories is a chronological narrative. Legacy supports service ideas without a new operational subsystem. AI and privacy settings are globally reachable.

### Data and identity

Use Next.js App Router, TypeScript, Supabase Auth/Postgres, Zod input validation, and a provider-neutral AI contract. Start with invite-only email/password authentication; no user-facing signup. Administrators provision the two verified accounts and workspace memberships outside the app. Both are equal members, and neither receives administrator access to the other's private records. Workspace membership is not self-editable. Future collaborators require a separately designed invite flow.

A constrained record envelope (domain, kind, owner, workspace, visibility, recipient, parent, title, body, status, due date, typed metadata, timestamps) supplies common permissions and links. The initial schema uses validated JSON metadata for evolving domain fields; exercise sets receive explicit validation, and database constraints guard numeric integrity. As query complexity grows, promote mature domain payloads into child tables with inherited RLS, rather than an unchecked all-purpose JSON store. Comments inherit exactly the parent audience and cannot broaden it. Only the record owner edits its content/audience; other members contribute their own linked comments. Audit records are append-only through a database trigger.

Sharing never occurs as a side effect of AI generation. Creating private content and sharing it are separate writes. Audience changes are explicit and audited; recipients are current workspace members. Parent visibility changes with children are blocked until a safe transactional cascade is designed. Delete is owner-only and must not orphan private derived data. Export includes only currently accessible records; it is not an administrative workspace dump.

### Build sequence and acceptance

1. Research and blueprint (this document), architecture and threat model.
2. App shell and fictional sample mode; main navigation, responsive sanctuary design.
3. Invite-only sign-in, real record persistence, owner controls, explicit audience, RLS, audit and critical negative tests.
4. Deeper V1 workflows: workout sets/volume, private passage reflection/reveal, contextual replies, business tasks, studio briefs, personal goals, living roadmap, privacy-controlled memories.
5. AI text adapter with explicit context consent, private bridge, shared-only mode, deterministic non-AI drafting when no provider is configured; voice contract with honest unavailable state.
6. Build, lint, unit/database/browser validation; delivery and coherent commits.

Release requires two-account testing against a real hosted Supabase project, configured email delivery, production HTTPS, database backups and restore verification, accessibility checks, provider-retention review, revocation checks with two active sessions, and real-device installation testing. Tests against an embedded PostgreSQL engine validate SQL policies but do not replace hosted Auth/Storage integration tests. No medical, clinical, spiritual, or relationship benefit is claimed.

The next deepening priorities are private media storage, full workout programming/history, recurring routines and calendar integration, robust realtime conversations, research-backed study content licensing, English/Portuguese localization, and consented realtime voice. An app with honest integration boundaries is preferable to fictional completed integrations.

## Sources

Accessed September 13, 2026. Publication dates below follow the document, not potentially misleading search crawl dates.

1. SAMHSA. [Trauma-Informed Approaches and Programs](https://www.samhsa.gov/mental-health/trauma-violence/trauma-informed-approaches-programs), current page; [2014 guidance](https://library.samhsa.gov/sites/default/files/sma14-4884.pdf). Page search extract available; direct page retrieval returned 403.
2. Harry T. Reis. [Steps toward the ripening of relationship science](https://www.sas.rochester.edu/psy/people/faculty/reis_harry/assets/pdf/Reis_2007.pdf), Personal Relationships, 2007.
3. Gottman Institute. [Improve Your Relationship by Paying Attention to Bids](https://www.gottman.com/blog/want-to-improve-your-relationship-start-paying-more-attention-to-bids/), 2019, practitioner article.
4. BibleProject. [BibleProject App](https://bibleproject.com/app/), current product page.
5. YouVersion. [Bible.com: Plans](https://help.youversion.com/l/en/article/zpuse5z891-bible-com-plans), current support documentation.
6. Strong. [About Workout and Exercise Notes](https://help.strongapp.io/article/134-adding-notes), current support documentation.
7. Helms, Aragon, Fitschen. [Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation](https://pubmed.ncbi.nlm.nih.gov/24864135/), 2014.
8. Helms et al. [Recommendations for natural bodybuilding contest preparation: resistance and cardiovascular training](https://pubmed.ncbi.nlm.nih.gov/24998610/), 2014.
9. Mountjoy et al. [2023 IOC consensus statement on Relative Energy Deficiency in Sport](https://doi.org/10.1136/bjsports-2023-106994), British Journal of Sports Medicine, 2023.
10. Wang et al. [A Meta-Analysis of the Effects of Mental Contrasting With Implementation Intentions on Goal Attainment](https://pubmed.ncbi.nlm.nih.gov/34054628/), 2021.
11. Linear. [Project milestones](https://linear.app/docs/project-milestones), current documentation.
12. Adobe. [The complete guide to request management](https://business.adobe.com/content/dam/dx/us/en/resources/guides/the-complete-guide-to-request-management/the-complete-guide-to-request-management.pdf), creative-brief section, undated vendor guide.
13. OWASP. [LLM07:2025 System Prompt Leakage](https://genai.owasp.org/llmrisk/llm072025-system-prompt-leakage/) and [LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html), current guidance.
14. Supabase. [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), current documentation.
15. OpenAI. [Realtime API reference](https://platform.openai.com/docs/api-reference/realtime?lang=javascript), current reference. WebRTC guide retrieval failed; protocol choice is supported by the API reference. Detailed integration is deferred.
16. Next.js. [Progressive Web Applications](https://nextjs.org/docs/app/guides/progressive-web-apps), current documentation.
17. web.dev. [Caching](https://web.dev/learn/pwa/caching/) and [Serving](https://web.dev/learn/pwa/serving), PWA curriculum.
18. W3C. [Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), WCAG 2.2 guidance.
