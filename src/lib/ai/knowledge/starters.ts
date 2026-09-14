import { newKnowledge, type KnowledgeInput } from "./model";
export const knowledgeStarters: KnowledgeInput[] = [
  {
    ...newKnowledge("training"),
    title: "Resistance training: consistency and individualization",
    origin: "published_reference",
    source_name: "ACSM · 2026 position stand summary",
    published_on: "2026-03-17",
    review_on: "2027-03-17",
    references: [
      {
        title: "ACSM 2026 resistance-training guidance",
        url: "https://acsm.org/resistance-training-guidelines-update-2026/",
      },
    ],
    content:
      "The ACSM 2026 guidance emphasizes consistent resistance training and programs adapted to goals, preferences and safety. Different equipment and training settings can be effective. Specific variables such as load and weekly volume depend on the desired outcome.\n\nScope: this is a short summary of healthy-adult guidance, not an individualized competition-prep program. Athletes may need more specialized planning. Compare questions with the current coach program before proposing changes.",
    notes:
      "Starter summary, not the full position stand. Open and review the original source before activating.",
  },
  {
    ...newKnowledge("nutrition"),
    title: "Protein and training: evidence in context",
    origin: "published_reference",
    source_name: "ISSN · Jäger et al. (2017)",
    published_on: "2017-06-20",
    references: [
      {
        title: "ISSN position stand: protein and exercise",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/",
      },
    ],
    content:
      "The 2017 ISSN position stand describes protein intake and resistance exercise as contributors to muscle protein synthesis and training adaptation. It gives a general daily range of 1.4–2.0 g/kg for most exercising individuals.\n\nScope: a population-level range is not a personalized target. Energy restriction, training status and individual health affect interpretation. This source does not establish Kamilla’s current prep targets. Preserve targets supplied by her coach and discuss discrepancies instead of changing them automatically.",
    notes:
      "Older position stand. Review current evidence, source disclosures and personal applicability before activating.",
  },
  {
    ...newKnowledge("training"),
    title: "How to preserve and understand a coach program",
    origin: "personal_note",
    source_name: "Legacy Juntos · suggested workflow",
    content:
      "Suggested workflow for review:\n1. Keep the coach’s original wording, dates, exercises, sets, repetitions, tempo, rest and progression rules. Mark anything missing.\n2. Treat a workout log as a record of what happened, separately from the prescribed plan.\n3. Compare changes within their context: exercise, equipment, technique and effort.\n4. Collect questions for the coach when instructions conflict, fatigue changes or progress stalls.\n5. Review any proposed adjustment before changing the program.",
    notes:
      "An app workflow suggestion for you to personalize. It is not a statement of either person’s current program or preferences.",
  },
];
