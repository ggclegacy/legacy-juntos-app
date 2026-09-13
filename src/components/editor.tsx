"use client";
import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, Lock, Users, ArrowRight } from "lucide-react";
import {
  recordInput,
  type Domain,
  type LifeRecord,
  type Member,
  type RecordInput,
  type WorkoutSet,
} from "@/lib/model";
export const kinds: Record<Domain, RecordInput["kind"][]> = {
  personal: ["goal", "habit", "journal", "ai_memory"],
  connect: ["reflection", "appreciation", "goal"],
  faith: ["reflection", "prayer", "journal", "goal"],
  performance: ["workout", "wellness", "prep", "goal"],
  business: ["project", "task", "decision", "expense"],
  studio: ["campaign", "task"],
  conversations: ["conversation"],
  vision: ["dream", "goal"],
  memories: ["memory"],
  legacy: ["service", "goal"],
};
export const kindLabel = (kind: string) =>
  ({
    ai_memory: "AI memory note",
    expense: "Planning expense",
    prep: "Prep milestone",
    wellness: "Wellness check-in",
    campaign: "Creative brief",
    reflection: "Reflection",
    service: "Service idea",
  })[kind] ?? kind[0].toUpperCase() + kind.slice(1);
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">YOUR SPACE, YOUR CHOICE</span>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Editor({
  domain,
  record,
  initial,
  parent,
  members,
  userId,
  onClose,
  onSave,
}: {
  domain: Domain;
  record?: LifeRecord;
  initial?: Partial<RecordInput>;
  parent?: LifeRecord;
  members: Member[];
  userId: string;
  onClose: () => void;
  onSave: (input: RecordInput, id?: string) => Promise<void>;
}) {
  const [kind, setKind] = useState<RecordInput["kind"]>(
    record?.kind ?? initial?.kind ?? kinds[domain][0],
  );
  const [title, setTitle] = useState(record?.title ?? initial?.title ?? "");
  const [body, setBody] = useState(record?.body ?? initial?.body ?? "");
  const [visibility, setVisibility] = useState<RecordInput["visibility"]>(
    record?.visibility ??
      parent?.visibility ??
      initial?.visibility ??
      "private",
  );
  const [recipient, setRecipient] = useState(
    record?.recipient_id ??
      (parent?.visibility === "recipient"
        ? parent.owner_id === userId
          ? parent.recipient_id
          : parent.owner_id
        : null) ??
      "",
  );
  const [due, setDue] = useState(record?.due_at ?? "");
  const [status, setStatus] = useState<RecordInput["status"]>(
    record?.status ?? "open",
  );
  const [meta, setMeta] = useState<RecordInput["metadata"]>(
    record?.metadata ?? initial?.metadata ?? {},
  );
  const [sets, setSets] = useState<WorkoutSet[]>(
    record?.metadata.sets ?? [
      { exercise: "", reps: 10, weight: 0, unit: "lb" },
    ],
  );
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const others = members.filter((m) => m.user_id !== userId);
  const setField = (key: keyof RecordInput["metadata"], value: unknown) =>
    setMeta((m) => ({ ...m, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (visibility !== "private" && !confirmed) {
      setError("Please confirm the audience before sharing.");
      return;
    }
    const parsed = recordInput.safeParse({
      domain,
      kind,
      title,
      body,
      visibility,
      recipient_id: visibility === "recipient" ? recipient : null,
      parent_id: record?.parent_id ?? parent?.id ?? null,
      status,
      due_at: due || null,
      metadata:
        kind === "workout"
          ? { ...meta, sets }
          : kind === "expense"
            ? { ...meta, currency: meta.currency ?? "USD" }
            : kind === "wellness"
              ? { ...meta, unit: meta.unit ?? "lb" }
              : meta,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onSave(parsed.data, record?.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        record
          ? "Make it yours"
          : parent
            ? "Add your perspective"
            : "Make room for something meaningful"
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="editor">
        <div className="form-row">
          <label>
            Entry type
            <select
              value={kind}
              disabled={Boolean(record || parent)}
              onChange={(e) => setKind(e.target.value as RecordInput["kind"])}
            >
              {(parent
                ? [kind]
                : record?.kind === "comment"
                  ? ["comment"]
                  : kinds[domain]
              ).map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </label>
          <label>
            When <span className="muted">(optional)</span>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
        </div>
        <label>
          Title
          <input
            autoFocus
            required
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this a meaningful name"
          />
        </label>
        <label>
          {kind === "campaign" ? "The idea" : "Your words"}
          <textarea
            rows={5}
            maxLength={12000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              domain === "connect"
                ? "What would you like to understand, appreciate, or share?"
                : "Start anywhere. This space is yours."
            }
          />
        </label>
        {domain === "faith" && (
          <label>
            Passage reference
            <input
              value={meta.passage ?? ""}
              onChange={(e) => setField("passage", e.target.value)}
              placeholder="e.g. Colossians 3:12–17"
            />
            <small>
              Keep Scripture references distinct from your reflection.
            </small>
          </label>
        )}
        {kind === "workout" && (
          <section className="sets">
            <div className="section-heading">
              <h3>Workout sets</h3>
              <button
                type="button"
                className="text-button"
                onClick={() => setSets([...sets, { ...sets[sets.length - 1] }])}
              >
                <Plus size={15} /> Add set
              </button>
            </div>
            {sets.map((set, i) => (
              <div className="set-row" key={i}>
                <label>
                  Exercise
                  <input
                    aria-label={`Exercise ${i + 1}`}
                    required
                    value={set.exercise}
                    onChange={(e) =>
                      setSets(
                        sets.map((s, j) =>
                          j === i ? { ...s, exercise: e.target.value } : s,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Reps
                  <input
                    aria-label={`Reps ${i + 1}`}
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={set.reps}
                    onChange={(e) =>
                      setSets(
                        sets.map((s, j) =>
                          j === i ? { ...s, reps: Number(e.target.value) } : s,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Load
                  <input
                    aria-label={`Load ${i + 1}`}
                    type="number"
                    step="0.5"
                    min="0"
                    max="1500"
                    required
                    value={set.weight}
                    onChange={(e) =>
                      setSets(
                        sets.map((s, j) =>
                          j === i
                            ? { ...s, weight: Number(e.target.value) }
                            : s,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Unit
                  <select
                    aria-label={`Unit ${i + 1}`}
                    value={set.unit}
                    onChange={(e) =>
                      setSets(
                        sets.map((s, j) =>
                          j === i
                            ? { ...s, unit: e.target.value as "kg" | "lb" }
                            : s,
                        ),
                      )
                    }
                  >
                    <option>lb</option>
                    <option>kg</option>
                  </select>
                </label>
                <button
                  type="button"
                  aria-label={`Remove set ${i + 1}`}
                  className="icon-button"
                  disabled={sets.length === 1}
                  onClick={() => setSets(sets.filter((_, j) => j !== i))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <small>
              Log your own plan. Zero load is valid for bodyweight movements.
            </small>
          </section>
        )}
        {kind === "ai_memory" && (
          <p className="privacy-note">
            Write a fact or preference you want to keep available for future AI
            conversations. It follows this entry’s audience and is sent only
            when you explicitly select it as context.
          </p>
        )}
        {kind === "expense" && (
          <div className="form-row">
            <label>
              Planned amount
              <input
                required
                type="number"
                min="0"
                max="100000000"
                step="0.01"
                value={meta.amount ?? ""}
                onChange={(e) => setField("amount", Number(e.target.value))}
              />
            </label>
            <label>
              Currency
              <select
                value={meta.currency ?? "USD"}
                onChange={(e) => setField("currency", e.target.value)}
              >
                <option>USD</option>
                <option>BRL</option>
              </select>
            </label>
          </div>
        )}
        {kind === "wellness" && (
          <div className="form-row">
            <label>
              Sleep · hours
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={meta.sleep ?? ""}
                onChange={(e) =>
                  setField(
                    "sleep",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </label>
            <label>
              Energy · 1 to 5
              <input
                type="number"
                min="1"
                max="5"
                value={meta.energy ?? ""}
                onChange={(e) =>
                  setField(
                    "energy",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </label>
          </div>
        )}
        {kind === "wellness" && (
          <div className="form-row">
            <label>
              Bodyweight · optional
              <input
                type="number"
                min="1"
                max="1000"
                step="0.1"
                value={meta.bodyweight ?? ""}
                onChange={(e) =>
                  setField(
                    "bodyweight",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </label>
            <label>
              Unit
              <select
                value={meta.unit ?? "lb"}
                onChange={(e) => setField("unit", e.target.value)}
              >
                <option>lb</option>
                <option>kg</option>
              </select>
            </label>
          </div>
        )}
        {kind === "campaign" && (
          <>
            <div className="form-row">
              <label>
                Who is this for?
                <input
                  value={meta.audience ?? ""}
                  onChange={(e) => setField("audience", e.target.value)}
                />
              </label>
              <label>
                Stage
                <select
                  value={meta.stage ?? "idea"}
                  onChange={(e) => setField("stage", e.target.value)}
                >
                  {["idea", "concept", "production", "review", "ready"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <label>
              Objective
              <input
                value={meta.objective ?? ""}
                onChange={(e) => setField("objective", e.target.value)}
              />
            </label>
            <label>
              Visual direction / image prompt
              <textarea
                rows={3}
                value={meta.visual ?? ""}
                onChange={(e) => setField("visual", e.target.value)}
                placeholder="Mood, setting, composition, colors, format…"
              />
            </label>
            <label>
              Deliverables
              <textarea
                rows={2}
                value={meta.deliverables ?? ""}
                onChange={(e) => setField("deliverables", e.target.value)}
                placeholder="Assets, channels, formats, and review needs"
              />
            </label>
          </>
        )}
        {domain === "vision" && (
          <label>
            Chapter
            <select
              value={meta.horizon ?? "future"}
              onChange={(e) => setField("horizon", e.target.value)}
            >
              <option value="now">Now · take a step</option>
              <option value="next">Next · make a plan</option>
              <option value="future">Someday · keep dreaming</option>
            </select>
          </label>
        )}
        <div className="form-row">
          <label>
            Status
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as RecordInput["status"])
              }
            >
              <option value="open">Open</option>
              <option value="active">In motion</option>
              <option value="done">Complete</option>
            </select>
          </label>
          <label>
            Who can see this?
            <select
              disabled={Boolean(parent || record?.parent_id)}
              value={visibility}
              onChange={(e) => {
                setVisibility(e.target.value as RecordInput["visibility"]);
                setConfirmed(false);
              }}
            >
              <option value="private">Private to me</option>
              <option value="recipient">Share with someone</option>
              <option value="shared">Juntos space</option>
            </select>
          </label>
        </div>
        {visibility === "recipient" && (
          <label>
            Recipient
            <select
              required
              disabled={Boolean(parent || record?.parent_id)}
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setConfirmed(false);
              }}
            >
              <option value="">Choose a person</option>
              {others.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="privacy-note">
          {visibility === "private" ? <Lock size={17} /> : <Users size={17} />}
          <div>
            {visibility === "private"
              ? "Only you can access this entry. It is not included in shared AI context."
              : "Sharing reveals the full entry, including notes and details. Future access can be withdrawn; someone may already have read or copied it."}
          </div>
        </div>
        {visibility !== "private" && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I want to share this full entry with{" "}
            {visibility === "shared"
              ? "everyone in Juntos"
              : (others.find((m) => m.user_id === recipient)?.display_name ??
                "the selected person")}
            .
          </label>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" className="secondary" onClick={onClose}>
            Keep exploring
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Saving…"
              : visibility === "private"
                ? "Save privately"
                : "Save & share"}
            <ArrowRight size={16} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}
