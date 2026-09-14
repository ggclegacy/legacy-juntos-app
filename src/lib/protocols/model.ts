import { z } from "zod";
const text = z.string().trim().max(2000);
export const protocolSchema = z
  .object({
    kind: z.literal("protocol"),
    name: text.min(1),
    category: z.enum([
      "Medication",
      "Hormone therapy",
      "Peptide",
      "Supplement",
    ]),
    formulation: text,
    instructions: text.min(1),
    schedule: text,
    prescriber: text,
    purpose: text,
    effective: z.iso.date(),
    status: z.enum(["active", "paused", "stopped"]),
  })
  .strict();
export const labSchema = z
  .object({
    kind: z.literal("lab"),
    name: text.min(1),
    value: z.number().finite(),
    comparator: z.enum(["=", "<", ">"]),
    unit: text.min(1),
    low: z.number().finite().nullable(),
    high: z.number().finite().nullable(),
    collected: z.iso.date(),
    laboratory: text.min(1),
    method: text,
    context: text,
    source: text,
    confirmed: z.literal(true),
  })
  .strict()
  .refine(
    (v) => v.low === null || v.high === null || v.low <= v.high,
    "Reference interval is reversed.",
  );
export const doseSchema = z
  .object({
    kind: z.literal("dose"),
    protocolId: z.uuid(),
    protocolRevision: z.number().int().positive(),
    name: text.min(1),
    instructions: text,
    at: z.iso.datetime(),
    status: z.enum(["taken", "skipped", "held"]),
    notes: text,
  })
  .strict();
export const checkinSchema = z
  .object({
    kind: z.literal("checkin"),
    at: z.iso.datetime(),
    energy: z.number().int().min(1).max(5),
    sleep: z.number().min(0).max(24),
    symptoms: text,
    notes: text,
  })
  .strict();
export const payloadSchema = z.union([
  protocolSchema,
  labSchema,
  doseSchema,
  checkinSchema,
]);
export type Payload = z.infer<typeof payloadSchema>;
export type Protocol = z.infer<typeof protocolSchema>;
export type Lab = z.infer<typeof labSchema>;
export const eventSchema = z.object({
  id: z.uuid(),
  entity_id: z.uuid(),
  revision: z.number().int().positive(),
  payload: payloadSchema,
  created_at: z.iso.datetime({ offset: true }),
});
export type HealthEvent = z.infer<typeof eventSchema>;
export function latest(events: HealthEvent[]) {
  const map = new Map<string, HealthEvent>();
  for (const e of events)
    if (!map.has(e.entity_id) || map.get(e.entity_id)!.revision < e.revision)
      map.set(e.entity_id, e);
  return [...map.values()];
}
export function protocolsAt(events: HealthEvent[], date: string) {
  return latest(
    events.filter(
      (e) => e.payload.kind === "protocol" && e.payload.effective <= date,
    ),
  ).filter(
    (e) => e.payload.kind === "protocol" && e.payload.status === "active",
  );
}
export function comparable(a: Lab, b: Lab) {
  return (
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    a.unit === b.unit &&
    a.laboratory === b.laboratory &&
    a.method === b.method &&
    a.comparator === "=" &&
    b.comparator === "="
  );
}
export function flag(l: Lab) {
  if (l.comparator !== "=") return "Qualified result";
  if (l.low !== null && l.value < l.low) return "Below reported interval";
  if (l.high !== null && l.value > l.high) return "Above reported interval";
  return l.low !== null && l.high !== null
    ? "Within reported interval"
    : "No complete interval";
}
export function decimal(value: string) {
  if (!/^-?\d+(?:[.,]\d+)?$/.test(value.trim()))
    throw new Error("Enter a number without thousands separators.");
  return Number(value.replace(",", "."));
}
export function reviewText(events: HealthEvent[]) {
  const current = latest(events);
  return [
    "PROTOCOL REVIEW · PRIVATE",
    "Prepared " + new Date().toLocaleDateString(),
    "User-entered records. This is not a clinical assessment.",
    "",
    ...current.map((e) => {
      const p = e.payload;
      if (p.kind === "protocol")
        return `${p.name} · ${p.status}\n${p.instructions} · ${p.schedule}\nEffective ${p.effective} · ${p.prescriber || "Prescriber not recorded"}`;
      if (p.kind === "lab")
        return `${p.collected} · ${p.name}: ${p.comparator === "=" ? "" : p.comparator}${p.value} ${p.unit}\n${p.laboratory} · ${flag(p)}\nContext: ${p.context || "Not recorded"}`;
      if (p.kind === "dose")
        return `${p.at} · ${p.name}: ${p.status} · ${p.notes}`;
      return `${p.at} · Sleep ${p.sleep}h · Energy ${p.energy}/5\n${p.symptoms} ${p.notes}`;
    }),
    "",
    "QUESTIONS FOR MY APPOINTMENT",
    "What changes need review? Are these results comparable? What context is missing?",
  ].join("\n\n");
}
