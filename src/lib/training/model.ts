import { z } from "zod";
const text = z.string().trim().max(2000);
export const exerciseSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(120),
    muscle: z.string().max(60),
    equipment: z.string().max(120),
    sets: z.number().int().min(1).max(20),
    repsMin: z.number().int().min(1).max(1000),
    repsMax: z.number().int().min(1).max(1000),
    rest: z.number().int().min(0).max(900),
    rir: z.number().min(0).max(10).nullable(),
    type: z.enum([
      "working",
      "warmup",
      "top",
      "backoff",
      "drop",
      "rest-pause",
      "myo",
      "timed",
    ]),
    group: z.string().max(40),
    notes: text,
    unit: z.enum(["kg", "lb"]),
  })
  .strict()
  .refine(
    (e) => e.repsMax >= e.repsMin,
    "Maximum reps must be at least minimum reps.",
  );
export type Exercise = z.infer<typeof exerciseSchema>;
export const daySchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(100),
    exercises: z.array(exerciseSchema).min(1).max(30),
  })
  .strict();
export const programSchema = z
  .object({
    kind: z.literal("program"),
    name: z.string().trim().min(1).max(120),
    source: z.enum(["manual", "import", "ai"]),
    goal: text,
    notes: text,
    cycles: z.number().int().min(1).max(52),
    guidance: z.enum(["exact", "suggest"]),
    archived: z.boolean(),
    days: z.array(daySchema).min(1).max(14),
  })
  .strict()
  .superRefine((p, c) => {
    const ids = [
      ...p.days.map((d) => d.id),
      ...p.days.flatMap((d) => d.exercises.map((e) => e.id)),
    ];
    if (new Set(ids).size !== ids.length)
      c.addIssue({
        code: "custom",
        message: "Program items need unique identifiers.",
      });
  });
export type Program = z.infer<typeof programSchema>;
export const loggedSetSchema = z
  .object({
    id: z.string().min(1),
    exerciseId: z.string().min(1),
    index: z.number().int().min(0),
    reps: z.number().int().min(0).max(1000).nullable(),
    weight: z.number().min(0).max(1500).nullable(),
    rir: z.number().min(0).max(10).nullable(),
    done: z.boolean(),
  })
  .strict();
export const sessionSchema = z
  .object({
    kind: z.literal("session"),
    name: z.string().min(1).max(120),
    programId: z.uuid(),
    programRevision: z.number().int().min(0),
    dayId: z.string().min(1),
    started: z.iso.datetime(),
    finished: z.iso.datetime().nullable(),
    exercises: z.array(exerciseSchema).min(1).max(30),
    sets: z.array(loggedSetSchema).min(1).max(600),
    notes: text,
    energy: z.number().int().min(1).max(5).nullable(),
    restEnd: z.number().nonnegative().nullable(),
  })
  .strict()
  .superRefine((s, c) => {
    const expected = s.exercises.flatMap((e) =>
      Array.from({ length: e.sets }, (_, i) => `${e.id}:${i}`),
    );
    const actual = s.sets.map((v) => `${v.exerciseId}:${v.index}`);
    if (
      new Set(s.exercises.map((e) => e.id)).size !== s.exercises.length ||
      new Set(s.sets.map((v) => v.id)).size !== s.sets.length ||
      actual.length !== expected.length ||
      new Set(actual).size !== actual.length ||
      actual.some((k) => !expected.includes(k))
    )
      c.addIssue({
        code: "custom",
        message: "Session sets do not match the workout.",
      });
    if (
      s.sets.some(
        (v) =>
          v.done &&
          (v.reps === null ||
            v.reps < 1 ||
            (s.exercises.find((e) => e.id === v.exerciseId)?.type !== "timed" &&
              v.weight === null)),
      )
    )
      c.addIssue({
        code: "custom",
        message: "Completed sets need reps and load (zero for bodyweight).",
      });
    if (s.finished && !s.sets.some((v) => v.done))
      c.addIssue({
        code: "custom",
        message: "Complete at least one set before finishing.",
      });
  });
export type Session = z.infer<typeof sessionSchema>;
export const prepSchema = z
  .object({
    kind: z.literal("prep"),
    enabled: z.boolean(),
    show: text,
    date: z
      .string()
      .refine((v) => v === "" || z.iso.date().safeParse(v).success),
    division: text,
    federation: text,
    notes: text,
    posing: text,
    milestones: text,
  })
  .strict();
export type Prep = z.infer<typeof prepSchema>;
export const payloadSchema = z.union([
  programSchema,
  sessionSchema,
  prepSchema,
]);
export type Payload = z.infer<typeof payloadSchema>;
export type TrainingDoc = {
  id: string;
  revision: number;
  payload: Payload;
  updated_at: string;
};
export const documentSchema = z.object({
  id: z.uuid(),
  revision: z.number().int().min(0),
  payload: payloadSchema,
  updated_at: z.string(),
});
export const EXERCISES = [
  ["Hip thrust", "Glutes", "Barbell"],
  ["Romanian deadlift", "Hamstrings", "Barbell"],
  ["Leg press", "Quads", "Machine"],
  ["Hack squat", "Quads", "Machine"],
  ["Seated leg curl", "Hamstrings", "Machine"],
  ["Leg extension", "Quads", "Machine"],
  ["Cable kickback", "Glutes", "Cable"],
  ["Hip abduction", "Glutes", "Machine"],
  ["Bulgarian split squat", "Quads", "Dumbbells"],
  ["Calf raise", "Calves", "Machine"],
  ["Lat pulldown", "Back", "Cable"],
  ["Seated row", "Back", "Cable"],
  ["Lateral raise", "Shoulders", "Dumbbells"],
  ["Shoulder press", "Shoulders", "Dumbbells"],
  ["Bench press", "Chest", "Barbell"],
  ["Biceps curl", "Arms", "Dumbbells"],
  ["Triceps pressdown", "Arms", "Cable"],
  ["Squat", "Quads", "Barbell"],
  ["Deadlift", "Back", "Barbell"],
  ["Plank", "Core", "Bodyweight"],
  ["Incline walk", "Cardio", "Treadmill"],
];
export function exercise(name = "New exercise"): Exercise {
  const known = EXERCISES.find(
    (e) => e[0].toLowerCase() === name.toLowerCase(),
  );
  return {
    id: crypto.randomUUID(),
    name,
    muscle: known?.[1] ?? "Other",
    equipment: known?.[2] ?? "",
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    rest: 90,
    rir: null,
    type: "working",
    group: "",
    notes: "",
    unit: "lb",
  };
}
export function blankProgram(): Program {
  return {
    kind: "program",
    name: "My training program",
    source: "manual",
    goal: "",
    notes: "",
    cycles: 6,
    guidance: "exact",
    archived: false,
    days: [
      { id: crypto.randomUUID(), name: "Workout A", exercises: [exercise()] },
    ],
  };
}
export function cloneProgram(p: Program): Program {
  return {
    ...structuredClone(p),
    name: `${p.name} copy`.slice(0, 120),
    archived: false,
    days: p.days.map((d) => ({
      ...d,
      id: crypto.randomUUID(),
      exercises: d.exercises.map((e) => ({ ...e, id: crypto.randomUUID() })),
    })),
  };
}
export function startSession(doc: TrainingDoc, dayId: string): Session {
  const p = programSchema.parse(doc.payload);
  const day = p.days.find((d) => d.id === dayId);
  if (!day) throw new Error("Choose a workout.");
  return {
    kind: "session",
    name: day.name,
    programId: doc.id,
    programRevision: doc.revision,
    dayId,
    started: new Date().toISOString(),
    finished: null,
    exercises: structuredClone(day.exercises),
    sets: day.exercises.flatMap((e) =>
      Array.from({ length: e.sets }, (_, index) => ({
        id: crypto.randomUUID(),
        exerciseId: e.id,
        index,
        reps: null,
        weight: null,
        rir: null,
        done: false,
      })),
    ),
    notes: "",
    energy: null,
    restEnd: null,
  };
}
export function comparable(a: Exercise, b: Exercise) {
  return (
    [a.name, a.equipment, a.unit, a.type].join("|").toLowerCase() ===
    [b.name, b.equipment, b.unit, b.type].join("|").toLowerCase()
  );
}
export function historyFor(e: Exercise, docs: TrainingDoc[]) {
  return docs
    .filter((d) => d.payload.kind === "session" && d.payload.finished)
    .sort((a, b) =>
      (b.payload as Session).started.localeCompare(
        (a.payload as Session).started,
      ),
    )
    .flatMap((d) => {
      const s = d.payload as Session;
      const match = s.exercises.find((x) => comparable(x, e));
      return match
        ? [
            {
              date: s.started,
              sets: s.sets.filter((v) => v.exerciseId === match.id && v.done),
            },
          ]
        : [];
    })
    .filter((h) => h.sets.length);
}
export function suggestion(e: Exercise, docs: TrainingDoc[]) {
  const h = historyFor(e, docs).slice(0, 2);
  if (h.length < 2)
    return "Log two comparable sessions before reviewing progression.";
  if (
    h.every(
      (v) =>
        v.sets.length >= e.sets &&
        v.sets.every(
          (s) =>
            (s.reps ?? 0) >= e.repsMax &&
            (e.rir === null || (s.rir !== null && s.rir >= e.rir)),
        ),
    )
  )
    return "You reached the top of the rep range in two sessions at the recorded effort. Consider the smallest available load increase if it fits your plan. No change has been made.";
  return "Keep your prescribed target. Review execution, effort, and recovery before changing the plan.";
}
export function importText(raw: string): Program {
  if (raw.trim().startsWith("{"))
    return { ...programSchema.parse(JSON.parse(raw)), source: "import" };
  const p = blankProgram();
  p.name = "Imported program";
  p.source = "import";
  p.days = [];
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    const s = line.trim();
    if (!s) continue;
    if (s.startsWith("#")) {
      p.days.push({
        id: crypto.randomUUID(),
        name: s.replace(/^#+\s*/, ""),
        exercises: [],
      });
      continue;
    }
    const m = s.match(
      /^(.+?)\s*[|:]\s*(\d+)\s*[x×]\s*(\d+)(?:\s*-\s*(\d+))?(?:\s*[|:]\s*(\d+)s)?$/i,
    );
    if (!m)
      throw new Error(
        `Line ${index + 1}: use Exercise | 3 x 8-12 | 90s, or # Workout name. Nothing was skipped.`,
      );
    if (!p.days.length)
      p.days.push({
        id: crypto.randomUUID(),
        name: "Workout A",
        exercises: [],
      });
    p.days
      .at(-1)!
      .exercises.push({
        ...exercise(m[1].trim()),
        sets: Number(m[2]),
        repsMin: Number(m[3]),
        repsMax: Number(m[4] ?? m[3]),
        rest: Number(m[5] ?? 90),
      });
  }
  return programSchema.parse(p);
}
export function checkIn(docs: TrainingDoc[], notes: string, now = Date.now()) {
  const sessions = docs
    .map((d) => d.payload)
    .filter(
      (p): p is Session =>
        p.kind === "session" &&
        !!p.finished &&
        new Date(p.finished).getTime() >= now - 7 * 86400000,
    );
  return `TRAINING CHECK-IN\nLast 7 days · ${sessions.length} completed sessions\n\n${sessions
    .map(
      (s) =>
        `${s.name} · ${new Date(s.started).toLocaleDateString()}\n${s.sets.filter((v) => v.done).length}/${s.sets.length} sets completed\nEnergy: ${s.energy ?? "Not recorded"}${s.energy ? "/5" : ""}\n${s.exercises
          .map(
            (e) =>
              `${e.name} (${e.equipment || "equipment unspecified"}): ${
                s.sets
                  .filter((v) => v.exerciseId === e.id && v.done)
                  .map((v) =>
                    e.type === "timed"
                      ? `${v.reps}s`
                      : `${v.weight} ${e.unit} × ${v.reps}`,
                  )
                  .join(", ") || "not logged"
              }`,
          )
          .join("\n")}\nNotes: ${s.notes || "None recorded"}`,
    )
    .join(
      "\n\n",
    )}\n\nMY QUESTIONS / CONTEXT\n${notes}\n\nThis summary includes recorded training only. Missing data is not evidence of missed training.`;
}
