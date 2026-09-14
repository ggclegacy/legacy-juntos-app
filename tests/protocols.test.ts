import { describe, it, expect } from "vitest";
import {
  decimal,
  flag,
  comparable,
  protocolsAt,
  latest,
  payloadSchema,
  type HealthEvent,
  type Lab,
  type Protocol,
} from "../src/lib/protocols/model";
const protocol: Protocol = {
  kind: "protocol",
  name: "Example",
  category: "Medication",
  formulation: "",
  instructions: "As supplied",
  schedule: "",
  prescriber: "",
  purpose: "",
  effective: "2026-01-01",
  status: "active",
};
const lab: Lab = {
  kind: "lab",
  name: "Example marker",
  value: 5,
  comparator: "=",
  unit: "mg/L",
  low: 1,
  high: 6,
  collected: "2026-01-01",
  laboratory: "Example lab",
  method: "A",
  context: "",
  source: "",
  confirmed: true,
};
function event(revision: number, payload: HealthEvent["payload"]): HealthEvent {
  return {
    id: crypto.randomUUID(),
    entity_id: "00000000-0000-4000-8000-000000000001",
    revision,
    payload,
    created_at: new Date().toISOString(),
  };
}
describe("health history and laboratory integrity", () => {
  it("preserves historical protocols when a later version is paused", () => {
    const events = [
      event(1, protocol),
      event(2, { ...protocol, effective: "2026-02-01", status: "paused" }),
    ];
    expect(protocolsAt(events, "2026-01-20")[0].revision).toBe(1);
    expect(protocolsAt(events, "2026-02-02")).toHaveLength(0);
    expect(latest(events)).toHaveLength(1);
  });
  it("parses decimal commas without accepting ambiguous thousands separators", () => {
    expect(decimal("1,25")).toBe(1.25);
    expect(() => decimal("1,234.50")).toThrow();
    expect(() => decimal("")).toThrow();
    expect(() => decimal("Infinity")).toThrow();
  });
  it("does not compare different assays, units, labs or qualified results", () => {
    expect(comparable(lab, { ...lab, value: 6 })).toBe(true);
    for (const change of [
      { method: "B" },
      { laboratory: "Other" },
      { unit: "g/L" },
      { comparator: "<" as const },
    ])
      expect(comparable(lab, { ...lab, ...change })).toBe(false);
  });
  it("does not label missing intervals or qualified values normal", () => {
    expect(flag({ ...lab, low: null, high: null })).toBe(
      "No complete interval",
    );
    expect(flag({ ...lab, comparator: ">" })).toBe("Qualified result");
    expect(payloadSchema.safeParse({ ...lab, low: 9, high: 2 }).success).toBe(
      false,
    );
    expect(payloadSchema.safeParse({ ...lab, confirmed: false }).success).toBe(
      false,
    );
  });
});
