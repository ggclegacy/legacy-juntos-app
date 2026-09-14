# Legacy Juntos — Protocol Intelligence

## Product direction

Build a private protocol command center connecting medications, hormone therapies, peptides, supplements, laboratory results, symptoms, and performance over time. Its defining experience is being able to answer: **What was I taking when this result was collected, what changed around that time, and what should I discuss with my clinician?**

This research was reviewed on September 13, 2026. It uses official product documentation, medical authorities, standards bodies, and security guidance. Competitor capabilities below are documented claims, not independent clinical validation or hands-on product testing. Proposed differentiation is a design judgment, not proof that competitors lack a feature. US sources inform the first implementation; Portuguese-language documents should be supported without assuming US drug names, regulation, or laboratory conventions apply in Brazil.

No particular treatment, diagnosis, or dose is assumed for either user. Neil and Kamilla receive the same capabilities. Prep mode supplies optional context, not permission for the app or a bodybuilding coach to prescribe medical treatment. This is a research and implementation specification; it does not represent functionality already delivered.

## What the strongest existing products teach us

| Reference | Documented strength | What to bring into Legacy Juntos | Our design requirement |
|---|---|---|---|
| Function Health | Lab results, ongoing testing, clinician review and health context.[1] | A coherent review of the whole report. | Work with existing reports and care arrangements; distinguish clinician review from AI commentary. |
| InsideTracker | Connects biomarkers and personal health information to insights.[2] | Longitudinal views and understandable explanations. | Keep laboratory reference intervals, clinician targets, and vendor-style “optimal” concepts distinct. |
| Guava | Imports records and photos, tracks medications and symptoms, and offers selective sharing and visit preparation.[3] | Low-friction document capture and useful appointment packets. | Make exact regimen versions and collection-time context exceptionally easy to inspect. Guava already covers much of this overall territory. |
| Bearable | Tracks medication use and symptom patterns; its own guidance distinguishes correlation from causation.[4] | Quick subjective check-ins and aligned timelines. | Show observation counts, missing information, and competing explanations beside insights. |
| Apple Health Medications | Schedules, taken/skipped logging, as-needed entries, and medication-list export.[5] | Fast daily execution with little typing. | Connect the execution log directly to labs and protocol history; do not assume native Apple capabilities are available in a web app. |

The opportunity is an exceptionally coherent workflow across these disciplines. Adding an AI chat box to a supplement list would not meet the brief.

## The five-part experience

### 1. Today: effortless daily execution

Show the next scheduled items, what has been recorded, optional symptom check-in, upcoming lab appointments, and items requiring review. Logging should take one or two taps, with easy correction and an audit trail. A reminder is not evidence a dose was taken.

Support taken, skipped, held, and not recorded; retain actual time and the planned time separately. An as-needed entry can include the reason and subsequent symptoms. Snoozing changes a reminder, not the prescription. Never infer a missed-dose instruction or advise doubling a dose. Travel and daylight-saving changes require clear local-time handling.

Include inventory, refill estimates, expiration dates, optional lot numbers, and product photos. Estimates should acknowledge unlogged use. Notifications can conceal medication names on the lock screen. PWA notifications must be tested per platform; reliable delivery cannot be assumed, and this is not emergency monitoring.

### 2. Protocols: a complete, editable source of truth

Accept manual entry, medication-label photographs, and reviewed imports from an existing medication list. Each entry records the exact product and ingredients, formulation, strength or concentration, route, user-entered prescribed amount, timing, start/end dates, purpose, prescriber if applicable, and instructions as originally supplied. Preserve the original text alongside structured fields.

Support regular, selected-day, interval, and as-needed schedules. Complex clinician-provided schedules can be recorded, but should not be generated or silently interpreted from ambiguous text. Maintain immutable historical versions when a user changes an entry. Mark active, paused, and stopped protocols without deleting their history.

Distinguish product strength, administered amount, and volume. Never treat mg, micrograms, mL, and “units” as interchangeable. Ambiguous instructions require clarification before reminders become active. This product does not need a peptide reconstitution or autonomous dose-optimization calculator.

For supplements, store brand, serving size, ingredient forms and amounts, and label version. Calculate ingredient overlap only when mappings and units are compatible. NIH's label database is useful for product identification, but label information does not establish actual contents or product efficacy.[6]

Hormone support must be configurable to the individual clinical context rather than built around a universal testosterone dashboard. For example, the Endocrine Society's current testosterone statement concerns men with hypogonadism; it is not a protocol for every person or every hormone use.[7]

### 3. Labs: an evidence vault with verified extraction

Accept PDFs, supported photographs, scanned reports, and manual results. Start with English and Portuguese layouts, including decimal commas and ambiguous date formats. Preserve original documents and permit direct inspection of the source region behind every extracted result.

The import flow should be **upload → extraction draft → review → confirmed results → analysis**. Review patient identity, collection date, analyte, value, comparator, unit, reference interval, and flags. Highlight uncertainty rather than filling gaps. A user's confirmation verifies transcription, not clinical significance. Separate preliminary, final, and amended reports. Detect duplicate uploads and reconcile corrected results without erasing the earlier version.

Chart by collection date, not upload date. Retain laboratory, specimen, method when supplied, collection time, and applicable reference intervals. Optional context includes fasting, recent illness or strenuous training, menstrual context when relevant, and time since a recorded dose. Laboratory ranges and methods differ; values inside or outside an interval do not independently establish health or disease.[8]

Provide readable views for relevant hormone, thyroid, blood-count, lipid, liver, kidney, metabolic, and nutrient results. These are organizational categories, not a recommendation to order all those tests. Preserve lab-provided ranges; clinician-entered targets require attribution and dates. Do not invent universal “optimal” bands.

A result marked critical in its source must be prominent even while review is pending. Do not delay the original report behind AI analysis, promise detection of every emergency, or invent critical thresholds. Any automated escalation rules need clinical validation and jurisdiction-appropriate instructions.

### 4. Insights: the signature “what changed?” timeline

Allow a user to select a protocol change and inspect the period before and after it. Overlay actual recorded use, laboratory collection points, symptoms, sleep, bodyweight, optional blood pressure, and permitted workout/recovery information. A tap on a result opens the exact regimen active at collection time, with unknowns clearly shown.

Each insight should contain the observation, supporting records, comparison window, data completeness, other changes, and questions worth reviewing. Numerical changes come from deterministic calculations; the language model explains them. An illustrative output might say: “Reported sleep improved after this change, but caffeine intake and training load changed in the same period.” It must not convert that observation into a claim of treatment efficacy.

Single-person histories have major interpretation limits: multiple simultaneous changes, selective logging, symptoms prompting medication use, natural fluctuation, and delayed effects can produce misleading associations. A medication taken on worse days may appear to cause worse symptoms. The interface should expose these problems rather than hiding them behind an impressive confidence percentage.

Separate confidence in transcription, comparability of measurements, strength of external evidence, and certainty of the personal interpretation. These are different questions. With insufficient observations, the useful answer is what is missing—not a fabricated “protocol effectiveness score.” Do not encourage stopping and restarting prescribed treatment as an experiment.

AI can answer focused questions such as “What changed since my last report?”, “Which results need clarification?”, and “Prepare questions for my appointment.” Every personal assertion links to records; external medical claims link to appropriate evidence. It should distinguish laboratory findings, user observations, and its own hypotheses.

### 5. Review: turn tracking into better conversations

Generate an editable appointment packet containing the current medication/supplement list, relevant historical changes, selected lab comparisons, symptom history, and the user's questions. Include the original reports when selected. Show exactly what will be included before export or sharing.

Allow a clinician's instruction or target to be recorded with its source and date. Do not label a user's note “clinician verified” without an actual verification process. Coach-facing exports should be independently scoped; training involvement does not imply access to hormones, diagnoses, or full bloodwork.

Sharing is private by default. Neither partner automatically sees the other's protocol, lab results, or derived AI insights. In-app grants should specify recipient, records, purpose, and expiration, with revocation and access history. Downloaded exports cannot be recalled; make that consequence clear at the export step.

## Evidence and interaction intelligence

Drug identification, interaction checking, and clinical interpretation require different sources. RxNorm is useful for normalization, but NLM discontinued RxNav's drug-interaction functionality on January 2, 2024.[9] Do not plan the safety engine around a nonexistent free interaction endpoint.

A licensed clinical source such as DrugBank can supply interaction data, subject to contract, coverage, and implementation validation.[10] DailyMed can provide official labeling references.[11] Neither a successful name match nor an empty interaction result establishes that a combination is safe. Show coverage gaps explicitly, especially for supplements, compounded products, and investigational substances.

Useful checks include duplicate active ingredients, known interactions, relevant recorded allergies, and interference with laboratory assays. Biotin is a concrete example: FDA describes interference with some laboratory tests.[12] Surface that sourced concern and a question for the laboratory or prescriber; do not generate a universal washout instruction.

Peptides require substance-specific evidence. FDA identifies significant concerns and missing safety information for certain compounding substances.[13] Meanwhile, its July 2026 advisory agenda included consideration of several peptides for compounding-related purposes.[14] Advisory consideration is not drug approval. Store approval status, compounding status, evidence quality, route, jurisdiction, source, and date separately. Never use a single green “approved/safe” badge for this entire category.

Alerts should distinguish urgency from evidence quality, explain their source, and avoid repeatedly alarming the user over unchanged information. Clinical interpretation must not rely on an LLM remembering an interaction or guessing an undocumented threshold.

## Architecture for the existing app

Create a dedicated health domain alongside the existing performance engine. Reuse authenticated identity, consistent design, and permission infrastructure; do not put medical records into generic workout notes or general shared AI memory.

| Data group | Principal records | Important invariant |
|---|---|---|
| Products | Products, ingredients, formulations, label versions | Preserve exact identity and original instructions. |
| Protocols | Regimens, immutable versions, schedules, administration events | Planned use and actual recorded use remain separate. |
| Labs | Documents, reports, observations, intervals, corrections, source anchors | Every normalized observation retains its original value and provenance. |
| Personal context | Symptoms, vitals, contextual events, authorized performance references | Missing entries are not normal findings or zero values. |
| Intelligence | Analyses, input versions, evidence references, review state | Corrections invalidate dependent analyses. |
| Access | Consent grants, access audit, export manifests | Derived content cannot escape the permissions of its inputs. |

Use a FHIR-aligned separation of observations and medication administrations without attempting to build a full electronic health record. Select a specific FHIR version when integrating with a partner; the cited R4 resources are modeling references, not a claim that R4 is the newest release.[15][16] Map lab concepts with LOINC and units with UCUM where appropriate.[17][18] Equal units alone do not establish that assays are comparable.

The processing pipeline should separate extraction, validation, normalization, arithmetic, retrieval, and narrative generation. Store input record versions, model version, evidence identifiers, and output status. Uploaded documents are untrusted data, never instructions to the AI. The analyst has no tool capable of changing a prescription, sharing a record, or contacting anyone without the user's separate action.

Private file storage requires owner-scoped access, short-lived download authorization, safe document rendering, type/signature validation, size/page limits, and isolated extraction. OWASP recommends layered upload defenses rather than trusting filenames or content-type headers.[19] Recheck ownership when background jobs run and before results are delivered. Keep sensitive content out of routine logs, analytics, and default offline caches.

Provider retention and contractual handling must be verified before sending real health documents to external AI services. Deletion needs to cover originals, extracted text, embeddings if used, and derived analyses, with a disclosed backup-retention policy. Server-side authorization tests must include direct file access and cross-user retrieval, not just hidden interface elements.

The current sample experience should use synthetic records only. Real health ingestion requires configured authentication, private storage, verified access controls, and a suitable processing provider. An unlocked demo profile switch is not a health-data privacy boundary.

## Premium visual direction

Use an obsidian canvas, luminous emerald surfaces, restrained gold edges, and layered glass for the main protocol view. Reserve dimensional cards for protocol summaries; use large, precise charts and a focused timeline for analysis. Dense medical numbers need stable alignment, readable typography, and clear units more than animation.

The five destinations are Today, Protocols, Labs, Insights, and Review. A context strip shows the selected person, date range, and privacy state. Opening a result reveals its source and history without losing position. Mobile logging stays thumb-friendly; deeper analysis expands into a full-screen workspace. Respect reduced motion and use text/icons as well as color for result flags. Gold communicates emphasis, not a medical judgment.

## Build sequence and release gates

**First: trusted records and daily use.** Implement the private health schema, protocol builder/versioning, manual labs, actual-use log, original-document vault, and authorization tests. Establish the design system and a coherent Today view. This delivers useful functionality before complex AI is ready.

**Second: complete lab workflow.** Add PDF/photo extraction, a source-linked correction interface, duplicate/amended-report handling, comparable trends, and the regimen-at-collection timeline. Validate a consented or synthetic test corpus across English and Portuguese layouts. Measure field errors separately; a single overall OCR score is insufficient.

**Third: grounded intelligence.** Add record-linked explanations, evidence retrieval, missing-context questions, and editable appointment exports. Integrate licensed interaction data only after confirming coverage and testing the output. Use explicit unavailable states before credentials or licenses exist.

**Fourth: deeper integrations.** Consider patient-portal imports, wearable metrics, pharmacy connections, and selected clinician access after partner access, regional coverage, cost, and consent flows are confirmed. Voice can later capture drafts, but must read back and confirm medical names, amounts, and units before saving.

Required acceptance cases include swapped patient reports; decimal commas; microgram/milligram confusion; less-than/greater-than values; free versus total analytes; incompatible methods; amended reports; duplicate dose submissions; time-zone transitions; missing-use logs; prompt injection inside PDFs; cross-user file access; consent revoked during analysis; and stale insights following a correction. Test graph accessibility and readable source review on a phone.

Before expanding into diagnostic or treatment recommendations, obtain clinical validation and assess the actual intended function against FDA's January 2026 CDS guidance.[20] A disclaimer does not settle product classification. If deployment scope expands, assess applicable privacy and breach obligations; FTC guidance makes clear that some health apps outside HIPAA can still have obligations.[21] This research is not a legal classification of this private project.

Success means a person can enter an existing regimen, record actual use, import and correct a report, understand the relevant history, and prepare a useful review without losing privacy or being misled about certainty. That is the foundation for a sophisticated protocol product that earns trust over time.

## Sources

[1] [Function Health — How it works](https://www.functionhealth.com/how-it-works).

[2] [InsideTracker — Product tour](https://www.insidetracker.com/tour).

[3] [Guava — FAQ](https://guavahealth.com/faq).

[4] [Bearable — Using medication tracking](https://bearable.app/support/howto/how-to-use-bearable-to-manage-your-medication/).

[5] [Apple Support — Track medications](https://support.apple.com/en-us/105064).

[6] [NIH Office of Dietary Supplements — Dietary Supplement Label Database](https://ods.od.nih.gov/Research/Dietary_Supplement_Label_Database/).

[7] [Endocrine Society — Statement on Testosterone Replacement Therapy, July 16, 2026](https://www.endocrine.org/news-and-advocacy/news-room/2026/statement-on-testosterone-replacement-therapy).

[8] [MedlinePlus — How to Understand Your Lab Results](https://www.medlineplus.gov/lab-tests/how-to-understand-your-lab-results/).

[9] [National Library of Medicine — RxNav FAQs](https://lhncbc-portal.lhcaws-prod-pub.nlm.nih.gov/RxNav/information/FAQs.html).

[10] [DrugBank — Clinical API documentation](https://docs.drugbank.com/v1/).

[11] [DailyMed — Web services](https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm).

[12] [FDA — Biotin interference with laboratory assays](https://www.fda.gov/medical-devices/in-vitro-diagnostics/biotin-interference-troponin-lab-tests-assays-subject-biotin-interference).

[13] [FDA — Certain bulk substances for compounding may present significant safety risks](https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks).

[14] [FDA — July 23–24, 2026 Pharmacy Compounding Advisory Committee meeting](https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026).

[15] [HL7 FHIR R4 — Observation](https://hl7.org/fhir/R4/observation.html).

[16] [HL7 FHIR R4 — MedicationAdministration](https://hl7.org/fhir/R4/medicationadministration.html).

[17] [LOINC — Getting started](https://loinc.org/start).

[18] [UCUM — Common units](https://ucum.org/docs/common-units).

[19] [OWASP — File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

[20] [FDA — Clinical Decision Support Software, final guidance January 2026](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software).

[21] [FTC — Complying with the Health Breach Notification Rule](https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0).
