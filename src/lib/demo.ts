import type { LifeRecord, Member, RecordInput } from "./model";
export const NEIL = "00000000-0000-4000-8000-000000000001",
  KAMILLA = "00000000-0000-4000-8000-000000000002",
  WORKSPACE = "00000000-0000-4000-8000-000000000003";
export const demoMembers: Member[] = [
  { user_id: NEIL, display_name: "Neil", workspace_id: WORKSPACE },
  { user_id: KAMILLA, display_name: "Kamilla", workspace_id: WORKSPACE },
];
let index = 10;
function entry(
  input: Partial<RecordInput> & {
    domain: RecordInput["domain"];
    kind: RecordInput["kind"];
    title: string;
  },
  owner = NEIL,
): LifeRecord {
  const id = `00000000-0000-4000-8000-${String(index++).padStart(12, "0")}`;
  return {
    id,
    owner_id: owner,
    workspace_id: WORKSPACE,
    body: "",
    visibility: "shared",
    recipient_id: null,
    parent_id: null,
    status: "open",
    due_at: null,
    metadata: {},
    created_at: "2026-09-13T10:00:00Z",
    updated_at: "2026-09-13T10:00:00Z",
    ...input,
  };
}
export const demoRecords: LifeRecord[] = [
  entry({
    domain: "faith",
    kind: "reflection",
    title: "Rooted in something greater",
    body: "A space to study, listen, and put faith into practice. Read the passage, reflect privately, then share only when you feel ready.",
    metadata: { passage: "Colossians 3:12–17" },
  }),
  entry({
    domain: "business",
    kind: "project",
    title: "The next chapter of recovery",
    body: "Explore a warm, distinctive brand for a massage and recovery practice. Begin with the people we want to serve, then shape the experience.",
    status: "active",
  }),
  entry({
    domain: "business",
    kind: "task",
    title: "Shape the recovery brand story",
    body: "Bring three words that describe how the experience should feel. Choose one clear next step together.",
  }),
  entry({
    domain: "studio",
    kind: "campaign",
    title: "Strength, with intention",
    body: "An editorial campaign about the discipline behind the stage.",
    metadata: {
      stage: "concept",
      audience: "People who value purposeful training and recovery",
      objective: "Introduce a thoughtful sponsorship story",
      visual:
        "Deep forest green, natural light, quiet strength. Editorial portraits with generous space for copy.",
      deliverables:
        "Three portrait concepts · one introductory post · a training-day story",
    },
  }),
  entry({
    domain: "connect",
    kind: "appreciation",
    title: "Make room for the small things",
    body: "A walk, an unhurried conversation, a moment to notice what went well. Choose an experience you both look forward to.",
  }),
  entry({
    domain: "vision",
    kind: "dream",
    title: "Build something that gives back",
    body: "Explore a community service project rooted in faith, health, and practical care.",
    metadata: { horizon: "future" },
  }),
  entry({
    domain: "vision",
    kind: "dream",
    title: "Create our first campaign together",
    body: "Turn an idea into a creative brief, a small set of assets, and a plan we both understand.",
    metadata: { horizon: "next" },
  }),
  entry({
    domain: "vision",
    kind: "dream",
    title: "A stronger weekly rhythm",
    body: "Make space for faith, focused work, and recovery.",
    metadata: { horizon: "now" },
  }),
  entry({
    domain: "conversations",
    kind: "conversation",
    title: "What are we building this week?",
    body: "A place to bring ideas, decide what matters, and leave with a shared next step.",
  }),
  entry({
    domain: "memories",
    kind: "memory",
    title: "The beginning of a shared space",
    body: "A sample milestone for this workspace. Replace it with a real moment you choose to keep.",
  }),
  entry({
    domain: "legacy",
    kind: "service",
    title: "Care that reaches beyond us",
    body: "Explore volunteering, recovery education, and ways to serve our community.",
  }),
  entry({
    domain: "personal",
    kind: "goal",
    title: "Create space for a focused morning",
    body: "After breakfast, choose one meaningful thing to finish before opening messages.",
    visibility: "private",
  }),
  entry({
    domain: "performance",
    kind: "workout",
    title: "Upper body · foundation",
    body: "Illustrative training log. Build your own plan around your experience and guidance.",
    visibility: "private",
    metadata: {
      sets: [
        { exercise: "Dumbbell press", reps: 10, weight: 25, unit: "lb" },
        { exercise: "Dumbbell press", reps: 10, weight: 25, unit: "lb" },
        { exercise: "Cable row", reps: 12, weight: 40, unit: "lb" },
      ],
    },
  }),
  entry(
    {
      domain: "personal",
      kind: "goal",
      title: "Make room for recovery",
      body: "An illustrative personal goal, not a real private detail.",
      visibility: "private",
    },
    KAMILLA,
  ),
];
