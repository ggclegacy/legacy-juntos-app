import { describe, it, expect } from "vitest";
import {
  blankProgram,
  programSchema,
  importText,
  startSession,
  sessionSchema,
  historyFor,
  cloneProgram,
  checkIn,
  suggestion,
  type TrainingDoc,
} from "../src/lib/training/model";
function fixture(): TrainingDoc {
  return {
    id: crypto.randomUUID(),
    revision: 3,
    payload: importText("# Lower\nHip thrust | 2 x 8-12 | 90s"),
    updated_at: new Date().toISOString(),
  };
}
describe("program engine", () => {
  it("imports every line and rejects ambiguous prescriptions", () => {
    expect(
      importText("# Legs\nSquat | 3 x 6-8 | 120s").days[0].exercises[0].rest,
    ).toBe(120);
    expect(() => importText("# Legs\nSquat maybe heavy")).toThrow("Line 2");
    expect(() => importText("# Empty")).toThrow();
  });
  it("rejects impossible rep ranges and duplicate identities", () => {
    const p = blankProgram();
    p.days[0].exercises[0].repsMax = 1;
    expect(programSchema.safeParse(p).success).toBe(false);
    const a = blankProgram();
    a.days.push(a.days[0]);
    expect(programSchema.safeParse(a).success).toBe(false);
  });
  it("snapshots prescriptions and preserves history when programs change", () => {
    const d = fixture();
    const p = programSchema.parse(d.payload);
    const session = startSession(d, p.days[0].id);
    p.days[0].exercises[0].name = "Changed";
    expect(session.exercises[0].name).toBe("Hip thrust");
    expect(session.programRevision).toBe(3);
  });
  it("duplicates program identifiers without changing original", () => {
    const p = blankProgram();
    const c = cloneProgram(p);
    expect(c.days[0].id).not.toBe(p.days[0].id);
    expect(c.days[0].exercises[0].id).not.toBe(p.days[0].exercises[0].id);
  });
  it("requires actual values before completion and rejects foreign set references", () => {
    const d = fixture(),
      p = programSchema.parse(d.payload),
      s = startSession(d, p.days[0].id);
    s.sets[0].done = true;
    expect(sessionSchema.safeParse(s).success).toBe(false);
    s.sets[0].reps = 10;
    s.sets[0].weight = 0;
    expect(sessionSchema.safeParse(s).success).toBe(true);
    s.sets[0].exerciseId = "foreign";
    expect(sessionSchema.safeParse(s).success).toBe(false);
  });
  it("does not compare different machines or units", () => {
    const d = fixture(),
      p = programSchema.parse(d.payload),
      s = startSession(d, p.days[0].id);
    s.sets[0] = { ...s.sets[0], done: true, reps: 12, weight: 80 };
    s.finished = new Date().toISOString();
    const logged = { ...d, payload: s };
    expect(historyFor(p.days[0].exercises[0], [logged])).toHaveLength(1);
    expect(
      historyFor({ ...p.days[0].exercises[0], unit: "kg" }, [logged]),
    ).toHaveLength(0);
    expect(
      historyFor({ ...p.days[0].exercises[0], equipment: "Other machine" }, [
        logged,
      ]),
    ).toHaveLength(0);
  });
  it("does not invent check-in sessions or prescribe loads without evidence", () => {
    const p = blankProgram();
    expect(suggestion(p.days[0].exercises[0], [])).toContain("two comparable");
    expect(checkIn([], "Question")).toContain("0 completed sessions");
    expect(checkIn([], "Question")).toContain("Question");
  });
});
