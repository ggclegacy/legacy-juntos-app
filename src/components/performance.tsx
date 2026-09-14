"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Plus,
  Dumbbell,
  Layers,
  Sparkles,
  Upload,
  Play,
  Check,
  Lock,
  Timer,
  Download,
  Copy,
  Flag,
  Activity,
} from "lucide-react";
import {
  blankProgram,
  cloneProgram,
  importText,
  startSession,
  historyFor,
  suggestion,
  checkIn,
  type Program,
  type Session,
  type Prep,
  type TrainingDoc,
  type Payload,
} from "@/lib/training/model";
import { useTraining, type Requester } from "@/lib/training/use-training";
import { download } from "@/lib/training/storage";
import { ProgramBuilder } from "./program-builder";
const TABS = ["Today", "Program", "Progress", "Prep", "Coach"] as const;
const EMPTY_PREP: Prep = {
  kind: "prep",
  enabled: false,
  show: "",
  date: "",
  division: "",
  federation: "",
  notes: "",
  posing: "",
  milestones: "",
};
export function Performance({
  userId,
  workspaceId,
  demo,
  request,
}: {
  userId: string;
  workspaceId: string;
  demo: boolean;
  request: Requester;
}) {
  const trainingRequest = useCallback<Requester>(
    (path, init) =>
      request(path, {
        ...init,
        headers: { ...init?.headers, "X-Expected-User": userId },
      }),
    [request, userId],
  );
  const store = useTraining(
    `${demo ? "sample" : "account"}:${workspaceId}:${userId}`,
    demo,
    trainingRequest,
  );
  const [tab, setTab] = useState<(typeof TABS)[number]>("Today"),
    [editing, setEditing] = useState<{
      p: Program;
      id?: string;
    } | null>(null),
    [entry, setEntry] = useState<"import" | "ai" | null>(null),
    [raw, setRaw] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [coachNotes, setCoachNotes] = useState(""),
    [report, setReport] = useState<string | null>(null);
  const [goal, setGoal] = useState(""),
    [experience, setExperience] = useState("Intermediate"),
    [days, setDays] = useState(4),
    [minutes, setMinutes] = useState(60),
    [equipment, setEquipment] = useState(""),
    [preferences, setPreferences] = useState("");
  const programs = store.docs.filter(
      (d) => d.payload.kind === "program" && !d.payload.archived,
    ),
    sessions = store.docs.filter((d) => d.payload.kind === "session"),
    completed = sessions.filter((d) => (d.payload as Session).finished),
    active = sessions.find((d) => !(d.payload as Session).finished);
  const chosen = programs.find((d) => d.id === selected) ?? programs[0];
  const program = chosen?.payload as Program | undefined;
  const prepDoc = store.docs.find((d) => d.payload.kind === "prep");
  async function save(p: Payload, id?: string) {
    try {
      return await store.save(p, id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      throw e;
    }
  }
  async function begin(doc: TrainingDoc, dayId: string) {
    if (active) {
      setTab("Today");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await save(startSession(doc, dayId));
      setTab("Today");
    } finally {
      setBusy(false);
    }
  }
  if (!store.ready)
    return (
      <div className="training-loading" role="status">
        Preparing your training space…
      </div>
    );
  return (
    <section className="training-space">
      <div className="training-hero">
        <div>
          <span className="eyebrow">
            <Activity size={14} /> PERFORMANCE / YOUR NEXT CHAPTER
          </span>
          <h1>
            Built by you.
            <br />
            <em>Stronger every chapter.</em>
          </h1>
          <p>Your program. Your pace. Every rep with purpose.</p>
          <div className="inline-actions">
            <button
              className="primary"
              onClick={() => {
                setTab("Program");
                setEditing({ p: blankProgram() });
                setEntry(null);
              }}
            >
              <Plus size={16} />
              Build a program
            </button>
            <button className="text-button" onClick={() => setTab("Program")}>
              Your library <ArrowRight size={15} />
            </button>
          </div>
        </div>
        <div className="training-orbit" aria-hidden="true">
          <div>
            <Dumbbell size={48} />
            <span>FORÇA</span>
            <small>STRENGTH WITH INTENTION</small>
          </div>
        </div>
      </div>
      <div className="training-status">
        <span>
          <Lock size={13} />
          Private to your account
        </span>
        <span role="status">{store.status}</span>
        {!demo && (
          <button className="text-button" onClick={() => void store.sync()}>
            Retry sync
          </button>
        )}
      </div>
      {demo && (
        <p className="training-demo">
          Sample account · training is saved in this browser. Use sample
          information here; real private accounts need the account connection.
        </p>
      )}
      {(error || store.error) && (
        <p role="alert" className="error">
          {error || store.error}
        </p>
      )}
      <nav className="training-tabs" aria-label="Performance sections">
        {TABS.map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === "Today" &&
        (active ? (
          <Gym
            key={active.id}
            doc={active}
            docs={store.docs}
            guidance={
              (
                store.docs.find(
                  (d) => d.id === (active.payload as Session).programId,
                )?.payload as Program
              )?.guidance ?? "exact"
            }
            onSave={(p) => save(p, active.id).then(() => {})}
          />
        ) : (
          <>
            <div className="training-stats">
              <div>
                <strong>{completed.length}</strong>
                <span>sessions completed</span>
              </div>
              <div>
                <strong>
                  {completed.reduce(
                    (n, d) =>
                      n +
                      (d.payload as Session).sets.filter((s) => s.done).length,
                    0,
                  )}
                </strong>
                <span>sets recorded</span>
              </div>
              <div>
                <strong>{programs.length}</strong>
                <span>programs in your library</span>
              </div>
            </div>
            <div className="training-section-heading">
              <div>
                <span className="eyebrow">READY WHEN YOU ARE</span>
                <h2>Your next session.</h2>
              </div>
              {programs.length > 0 && (
                <label>
                  Program
                  <select
                    value={chosen?.id ?? ""}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {programs.map((d) => (
                      <option value={d.id} key={d.id}>
                        {(d.payload as Program).name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {program ? (
              <>
                <p className="muted">
                  {program.name} · {program.cycles} cycles · choose the next
                  workout in your sequence.
                </p>
                <div className="training-workouts">
                  {program.days.map((d, i) => (
                    <article key={d.id}>
                      <span className="eyebrow">
                        WORKOUT {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3>{d.name}</h3>
                      <p>
                        {d.exercises.length} exercises ·{" "}
                        {d.exercises.reduce((n, e) => n + e.sets, 0)} sets
                      </p>
                      <div className="training-muscles">
                        {Array.from(new Set(d.exercises.map((e) => e.muscle)))
                          .slice(0, 4)
                          .map((m) => (
                            <span key={m}>{m}</span>
                          ))}
                      </div>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          void begin(chosen!, d.id).catch(() => {})
                        }
                      >
                        <Play size={14} />
                        Start workout
                      </button>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="training-empty">
                <Layers size={32} />
                <h3>A program that fits your life.</h3>
                <p>
                  Bring a coach’s plan, build your own, or create a draft with
                  AI. Every path unlocks the same training tools.
                </p>
                <button className="primary" onClick={() => setTab("Program")}>
                  Create your first program <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        ))}
      {tab === "Program" &&
        (editing ? (
          <ProgramBuilder
            key={editing.id ?? editing.p.name}
            initial={editing.p}
            onCancel={() => setEditing(null)}
            onSave={async (p) => {
              const id = await save(p, editing.id);
              setSelected(id);
              setEditing(null);
              setEntry(null);
            }}
          />
        ) : (
          <>
            <div className="training-section-heading">
              <div>
                <span className="eyebrow">ONE SYSTEM. ANY STARTING POINT.</span>
                <h2>Your program library.</h2>
              </div>
            </div>
            <div className="training-entry-paths">
              {[
                {
                  name: "Build from scratch",
                  text: "Your split, exercises, and prescription.",
                  icon: Plus,
                  action: () => {
                    setEditing({ p: blankProgram() });
                    setEntry(null);
                  },
                },
                {
                  name: "Add my program",
                  text: "Paste a plan or restore a program file.",
                  icon: Upload,
                  action: () => setEntry("import"),
                },
                {
                  name: "Create with AI",
                  text: "A personal draft you review and own.",
                  icon: Sparkles,
                  action: () => setEntry("ai"),
                },
              ].map((x) => (
                <button
                  key={x.name}
                  onClick={() => {
                    setError("");
                    x.action();
                  }}
                >
                  <x.icon size={23} />
                  <strong>{x.name}</strong>
                  <span>{x.text}</span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
            {entry === "import" && (
              <div className="training-panel">
                <h3>Bring your plan.</h3>
                <p>
                  Paste one exercise per line. Add a workout heading with #.
                  Every line is checked; nothing is silently discarded.
                </p>
                <pre>
                  {
                    "# Lower body\nHip thrust | 3 x 8-12 | 90s\nLeg press | 3 x 10-15 | 120s"
                  }
                </pre>
                <label>
                  Program text
                  <textarea
                    rows={8}
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    maxLength={400000}
                  />
                </label>
                <label>
                  Or open a text / exported program JSON file
                  <input
                    type="file"
                    accept=".txt,.json"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 400000) {
                        setError("Choose a file smaller than 400 KB.");
                        return;
                      }
                      setRaw(await f.text());
                    }}
                  />
                </label>
                <p className="muted">
                  Spreadsheet, PDF, and photo extraction are not connected yet.
                  You can enter any prescription in the builder.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    try {
                      setEditing({ p: importText(raw) });
                      setEntry(null);
                      setError("");
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Check the import format.",
                      );
                    }
                  }}
                >
                  Review imported program <ArrowRight size={15} />
                </button>
              </div>
            )}
            {entry === "ai" && (
              <form
                className="training-panel"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    if (demo)
                      throw new Error(
                        "AI creation needs a connected account and configured AI provider. Build from scratch or import a plan in sample mode.",
                      );
                    const result = await trainingRequest(
                      "/api/training/generate",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          goal,
                          experience,
                          days,
                          minutes,
                          equipment,
                          preferences,
                        }),
                      },
                    );
                    setEditing({ p: result.program as Program });
                    setEntry(null);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Could not generate a draft.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h3>Start with your goals.</h3>
                <p>
                  Your submitted preferences go to the configured AI provider to
                  prepare a draft. You review every exercise and prescription
                  before saving.
                </p>
                <div className="training-fields">
                  <label>
                    Goal
                    <input
                      required
                      minLength={3}
                      maxLength={1000}
                      placeholder="Build muscle with a lower-body emphasis…"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                    />
                  </label>
                  <label>
                    Experience
                    <select
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    >
                      {["Beginner", "Intermediate", "Advanced"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Training days
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Minutes per session
                    <input
                      type="number"
                      min={15}
                      max={180}
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                    />
                  </label>
                </div>
                <label>
                  Available equipment
                  <input
                    required
                    maxLength={1000}
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    placeholder="Dumbbells, cables, leg press…"
                  />
                </label>
                <label>
                  Preferences and constraints
                  <textarea
                    maxLength={2000}
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    placeholder="Preferred split, exercises to avoid, prep or building phase…"
                  />
                </label>
                <button className="primary" disabled={busy}>
                  <Sparkles size={16} />
                  {busy ? "Preparing your draft…" : "Generate a draft"}
                </button>
              </form>
            )}
            <div className="training-program-list">
              {store.docs
                .filter((d) => d.payload.kind === "program")
                .map((d) => {
                  const p = d.payload as Program;
                  return (
                    <article key={d.id}>
                      <div>
                        <span className="eyebrow">
                          {p.source} ·{" "}
                          {p.archived ? "ARCHIVED" : "YOUR PROGRAM"}
                        </span>
                        <h3>{p.name}</h3>
                        <p>
                          {p.days.length} workouts · {p.cycles} cycles ·{" "}
                          {p.goal || "Your goals, your prescription"}
                        </p>
                      </div>
                      <div className="inline-actions">
                        <button
                          className="secondary"
                          onClick={() =>
                            setEditing({ p: structuredClone(p), id: d.id })
                          }
                        >
                          Edit program
                        </button>
                        <button
                          className="text-button"
                          aria-label={`Duplicate ${p.name}`}
                          onClick={() => setEditing({ p: cloneProgram(p) })}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className="text-button"
                          aria-label={`Export ${p.name}`}
                          onClick={() =>
                            download(
                              "training-program.json",
                              JSON.stringify(p, null, 2),
                              "application/json",
                            )
                          }
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            void save(
                              { ...p, archived: !p.archived },
                              d.id,
                            ).catch(() => {})
                          }
                        >
                          {p.archived ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </article>
                  );
                })}
            </div>
          </>
        ))}
      {tab === "Progress" && (
        <>
          <MuscleWork docs={store.docs} />
          <div className="training-section-heading">
            <div>
              <span className="eyebrow">YOUR WORK, OVER TIME</span>
              <h2>Every session has a story.</h2>
            </div>
          </div>
          {!completed.length && (
            <div className="training-empty">
              <Activity size={30} />
              <h3>Your history starts with a session.</h3>
              <p>
                Completed workouts preserve the original prescription,
                equipment, units, and actual sets.
              </p>
            </div>
          )}
          {completed
            .sort((a, b) =>
              (b.payload as Session).started.localeCompare(
                (a.payload as Session).started,
              ),
            )
            .map((d) => {
              const s = d.payload as Session;
              return (
                <details className="training-history-entry" key={d.id}>
                  <summary>
                    <strong>{s.name}</strong>
                    <span>
                      {new Date(s.started).toLocaleDateString()} ·{" "}
                      {s.sets.filter((v) => v.done).length}/{s.sets.length} sets
                    </span>
                  </summary>
                  {s.exercises.map((e) => (
                    <div className="training-history-row" key={e.id}>
                      <strong>
                        {e.name}
                        <small>
                          {e.equipment} · {e.type}
                        </small>
                      </strong>
                      <span>
                        {s.sets
                          .filter((v) => v.exerciseId === e.id && v.done)
                          .map((v) =>
                            e.type === "timed"
                              ? `${v.reps}s`
                              : `${v.weight} ${e.unit} × ${v.reps}`,
                          )
                          .join(" / ") || "Not logged"}
                      </span>
                    </div>
                  ))}
                  <p>{s.notes || "No session notes."}</p>
                  <small>
                    Energy: {s.energy ?? "Not recorded"} · Prescription revision{" "}
                    {s.programRevision}
                  </small>
                </details>
              );
            })}
        </>
      )}
      {tab === "Prep" && (
        <PrepEditor
          initial={(prepDoc?.payload as Prep) ?? EMPTY_PREP}
          onSave={(p) => save(p, prepDoc?.id).then(() => {})}
        />
      )}
      {tab === "Coach" && (
        <div className="training-panel">
          <span className="eyebrow">LESS ADMIN. MORE USEFUL CONVERSATION.</span>
          <h2>Your weekly check-in.</h2>
          <p>
            Assemble the last seven days of completed training. Review and edit
            the entire summary before downloading. Nothing is sent or shared
            automatically.
          </p>
          <label>
            Questions, recovery, and context
            <textarea
              value={coachNotes}
              maxLength={5000}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="What felt good? What needs attention? What do you want to ask?"
            />
          </label>
          <button
            className="primary"
            onClick={() => setReport(checkIn(store.docs, coachNotes))}
          >
            Prepare check-in <ArrowRight size={16} />
          </button>
          {report !== null && (
            <>
              <label>
                Review your summary
                <textarea
                  rows={16}
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                />
              </label>
              <button
                className="secondary"
                onClick={() => download("training-check-in.txt", report)}
              >
                <Download size={16} />
                Download reviewed check-in
              </button>
            </>
          )}
        </div>
      )}
      <details className="training-device">
        <summary>Storage & portability</summary>
        <p>
          {demo
            ? "Sample training is saved on this browser, separately for each sample identity. This is not authenticated private storage."
            : "Connected training is owner-only. Enable device drafts only on a trusted device; browser storage is not encrypted and can be cleared by your browser."}
        </p>
        {!demo && (
          <label className="training-checkbox">
            <input
              type="checkbox"
              checked={store.trusted}
              onChange={(e) =>
                void store
                  .trust(e.target.checked)
                  .catch((e) => setError(e.message))
              }
            />
            Save training drafts on this trusted device
          </label>
        )}
        <button
          className="secondary"
          onClick={() =>
            download(
              "training-backup.json",
              JSON.stringify(store.docs, null, 2),
              "application/json",
            )
          }
        >
          <Download size={15} />
          Export all training data
        </button>
      </details>
    </section>
  );
}
function Gym({
  doc,
  docs,
  guidance,
  onSave,
}: {
  doc: TrainingDoc;
  docs: TrainingDoc[];
  guidance: Program["guidance"];
  onSave: (s: Session) => Promise<void>;
}) {
  const [s, setS] = useState(doc.payload as Session),
    [now, setNow] = useState(() => Date.now()),
    [error, setError] = useState(""),
    [finishing, setFinishing] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  function update(next: Session) {
    setS(next);
    void onSave(next).catch((e) => setError(e.message));
  }
  const remaining = Math.max(0, Math.ceil(((s.restEnd ?? 0) - now) / 1000));
  return (
    <div className="training-gym">
      <div className="training-section-heading">
        <div>
          <span className="eyebrow">SESSION IN PROGRESS</span>
          <h2>{s.name}</h2>
          <p>
            {s.sets.filter((v) => v.done).length} / {s.sets.length} sets
            recorded
          </p>
        </div>
        <div className="training-rest" role="timer" aria-label="Rest timer">
          <Timer size={18} />
          <strong>
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:
            {String(remaining % 60).padStart(2, "0")}
          </strong>
          <button
            aria-label="Clear rest timer"
            onClick={() => update({ ...s, restEnd: null })}
          >
            Clear
          </button>
        </div>
      </div>
      <PlateCalculator />
      <div className="training-progress-track">
        <span
          style={{
            width: `${(s.sets.filter((v) => v.done).length / s.sets.length) * 100}%`,
          }}
        />
      </div>
      {s.exercises.map((e, i) => {
        const history = historyFor(e, docs)[0];
        return (
          <article className="training-gym-exercise" key={e.id}>
            <div className="training-section-heading">
              <div>
                <span className="eyebrow">
                  {String(i + 1).padStart(2, "0")} / {e.muscle}{" "}
                  {e.group && `· GROUP ${e.group}`}
                </span>
                <h3>{e.name}</h3>
                <p>
                  {e.equipment || "Equipment not specified"} · {e.type} ·{" "}
                  {e.repsMin}–{e.repsMax}{" "}
                  {e.type === "timed" ? "seconds" : "reps"}
                  {e.rir !== null && ` · ${e.rir} reps in reserve`} · {e.rest}s
                  rest
                </p>
              </div>
            </div>
            {e.notes && <p className="training-cue">{e.notes}</p>}
            <p className="training-previous">
              Last time:{" "}
              {history
                ? history.sets
                    .map((v) =>
                      e.type === "timed"
                        ? `${v.reps}s`
                        : `${v.weight} ${e.unit} × ${v.reps}`,
                    )
                    .join(" / ")
                : "First comparable session"}
            </p>
            <div className="training-set-head">
              <span>Set</span>
              <span>{e.type === "timed" ? "—" : e.unit}</span>
              <span>{e.type === "timed" ? "Seconds" : "Reps"}</span>
              <span>RIR</span>
              <span>Log</span>
            </div>
            {s.sets
              .filter((v) => v.exerciseId === e.id)
              .map((v) => (
                <div
                  className={`training-set ${v.done ? "done" : ""}`}
                  key={v.id}
                >
                  <span>{v.index + 1}</span>
                  <input
                    aria-label={`${e.name} set ${v.index + 1} weight`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={1500}
                    step="any"
                    disabled={v.done || e.type === "timed"}
                    value={v.weight ?? ""}
                    placeholder={e.type === "timed" ? "—" : "0"}
                    onChange={(event) =>
                      update({
                        ...s,
                        sets: s.sets.map((x) =>
                          x.id === v.id
                            ? {
                                ...x,
                                weight:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={`${e.name} set ${v.index + 1} reps`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    disabled={v.done}
                    value={v.reps ?? ""}
                    placeholder={String(e.repsMin)}
                    onChange={(event) =>
                      update({
                        ...s,
                        sets: s.sets.map((x) =>
                          x.id === v.id
                            ? {
                                ...x,
                                reps:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={`${e.name} set ${v.index + 1} RIR`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={10}
                    step="any"
                    disabled={v.done}
                    value={v.rir ?? ""}
                    placeholder="—"
                    onChange={(event) =>
                      update({
                        ...s,
                        sets: s.sets.map((x) =>
                          x.id === v.id
                            ? {
                                ...x,
                                rir:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                  <button
                    className={v.done ? "logged" : ""}
                    aria-label={`${v.done ? "Undo" : "Complete"} ${e.name} set ${v.index + 1}`}
                    onClick={() => {
                      if (
                        !v.done &&
                        (v.reps === null ||
                          v.reps < 1 ||
                          (e.type !== "timed" && v.weight === null))
                      ) {
                        setError(
                          "Enter actual reps and load before completing a set. Use zero for bodyweight.",
                        );
                        return;
                      }
                      setError("");
                      update({
                        ...s,
                        sets: s.sets.map((x) =>
                          x.id === v.id ? { ...x, done: !x.done } : x,
                        ),
                        restEnd: v.done
                          ? s.restEnd
                          : Date.now() + e.rest * 1000,
                      });
                    }}
                  >
                    <Check size={18} />
                  </button>
                </div>
              ))}
            {guidance === "suggest" && (
              <details>
                <summary>Progression insight</summary>
                <p>{suggestion(e, docs)}</p>
              </details>
            )}
          </article>
        );
      })}
      <div className="training-panel">
        <label>
          Session notes
          <textarea
            maxLength={2000}
            value={s.notes}
            onChange={(e) => update({ ...s, notes: e.target.value })}
          />
        </label>
        <label>
          Energy today
          <select
            value={s.energy ?? ""}
            onChange={(e) =>
              update({
                ...s,
                energy: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Not recorded</option>
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>
                {v} / 5
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <p className="muted">
          You can finish with uncompleted sets. They remain unlogged in your
          history.
        </p>
        <button
          className="primary"
          disabled={finishing || !s.sets.some((v) => v.done)}
          onClick={async () => {
            setFinishing(true);
            try {
              await onSave({
                ...s,
                finished: new Date().toISOString(),
                restEnd: null,
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not finish.");
            } finally {
              setFinishing(false);
            }
          }}
        >
          <Check size={16} />
          Finish workout
        </button>
      </div>
    </div>
  );
}
function PrepEditor({
  initial,
  onSave,
}: {
  initial: Prep;
  onSave: (p: Prep) => Promise<void>;
}) {
  const [p, setP] = useState(initial),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="training-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(p);
          setNotice("Prep details saved privately.");
        } catch (e) {
          setNotice(e instanceof Error ? e.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="eyebrow">
        <Flag size={14} /> OPTIONAL · ANY CHAPTER
      </span>
      <h2>Your path to the stage.</h2>
      <label className="training-checkbox">
        <input
          type="checkbox"
          checked={p.enabled}
          onChange={(e) => setP({ ...p, enabled: e.target.checked })}
        />
        Enable Prep Mode
      </label>
      <p>
        Prep adds context to any program. It does not change your workouts or
        progression settings.
      </p>
      {p.enabled && (
        <>
          <div className="training-fields">
            <label>
              Show name
              <input
                maxLength={2000}
                value={p.show}
                onChange={(e) => setP({ ...p, show: e.target.value })}
              />
            </label>
            <label>
              Show date
              <input
                type="date"
                value={p.date}
                onChange={(e) => setP({ ...p, date: e.target.value })}
              />
            </label>
            <label>
              Division
              <input
                placeholder="Wellness, or your division"
                maxLength={2000}
                value={p.division}
                onChange={(e) => setP({ ...p, division: e.target.value })}
              />
            </label>
            <label>
              Federation
              <input
                maxLength={2000}
                value={p.federation}
                onChange={(e) => setP({ ...p, federation: e.target.value })}
              />
            </label>
          </div>
          <label>
            Milestones & practical plans
            <textarea
              maxLength={2000}
              value={p.milestones}
              onChange={(e) => setP({ ...p, milestones: e.target.value })}
              placeholder="Check-ins, registration, travel, suit, recovery after the show…"
            />
          </label>
          <label>
            Posing practice journal
            <textarea
              maxLength={2000}
              value={p.posing}
              onChange={(e) => setP({ ...p, posing: e.target.value })}
              placeholder="Date · practice duration · coach cues · focus for next time"
            />
          </label>
          <label>
            Coach instructions & questions
            <textarea
              maxLength={2000}
              value={p.notes}
              onChange={(e) => setP({ ...p, notes: e.target.value })}
              placeholder="Keep your prescribed cardio, targets, and questions together."
            />
          </label>
          <small>
            Photo/video storage and direct coach access are not connected yet.
            No prep information is shared automatically.
          </small>
        </>
      )}
      <button className="primary" disabled={busy}>
        {busy ? "Saving…" : "Save prep details"}
      </button>
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
function PlateCalculator() {
  const [unit, setUnit] = useState<"lb" | "kg">("lb"),
    [bar, setBar] = useState(45),
    [target, setTarget] = useState(135);
  const denominations =
    unit === "lb" ? [45, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
  let remaining = Math.max(0, (target - bar) / 2);
  const plates: {
    weight: number;
    count: number;
  }[] = [];
  for (const weight of denominations) {
    const count = Math.floor((remaining + 0.00001) / weight);
    if (count) {
      plates.push({ weight, count });
      remaining -= count * weight;
    }
  }
  return (
    <details className="training-plate">
      <summary>Barbell plate calculator</summary>
      <div className="training-fields">
        <label>
          Plate unit
          <select
            value={unit}
            onChange={(e) => {
              const next = e.target.value as "lb" | "kg";
              setUnit(next);
              setBar(next === "lb" ? 45 : 20);
              setTarget(next === "lb" ? 135 : 60);
            }}
          >
            <option>lb</option>
            <option>kg</option>
          </select>
        </label>
        <label>
          Bar weight
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={bar}
            onChange={(e) =>
              setBar(Math.min(100, Math.max(0, Number(e.target.value))))
            }
          />
        </label>
        <label>
          Total target
          <input
            type="number"
            min={0}
            max={1500}
            step="any"
            value={target}
            onChange={(e) =>
              setTarget(Math.min(1500, Math.max(0, Number(e.target.value))))
            }
          />
        </label>
      </div>
      <p>
        {target < bar
          ? "Target is below bar weight."
          : plates.length
            ? `Each side: ${plates.map((p) => `${p.count} × ${p.weight} ${unit}`).join(" + ")}`
            : "Empty bar"}
        {target >= bar && remaining > 0
          ? ` · ${remaining * 2} ${unit} below target with these plate sizes.`
          : ""}
      </p>
      <small>
        Assumes standard plate sizes are available; collars are excluded. This
        calculation does not change your logged load.
      </small>
    </details>
  );
}
function MuscleWork({ docs }: { docs: TrainingDoc[] }) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const groups: Record<string, number> = {};
  for (const d of docs) {
    if (
      d.payload.kind !== "session" ||
      !d.payload.finished ||
      new Date(d.payload.finished) < cutoff
    )
      continue;
    const s = d.payload;
    for (const e of s.exercises) {
      if (e.type === "warmup" || e.type === "timed") continue;
      const count = s.sets.filter(
        (v) => v.exerciseId === e.id && v.done,
      ).length;
      if (count)
        groups[e.muscle || "Other"] =
          (groups[e.muscle || "Other"] ?? 0) + count;
    }
  }
  const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const maximum = Math.max(...entries.map((e) => e[1]));
  return (
    <section className="training-panel">
      <span className="eyebrow">LAST SEVEN DAYS</span>
      <h2>Where you put the work.</h2>
      {entries.map(([muscle, count]) => (
        <div className="training-muscle-bar" key={muscle}>
          <span>{muscle}</span>
          <div>
            <i style={{ width: `${(count / maximum) * 100}%` }} />
          </div>
          <strong>{count} sets</strong>
        </div>
      ))}
      <p className="muted">
        Completed resistance sets assigned to their primary muscle. Warm-ups and
        timed work are excluded. This is training distribution, not a recovery
        or muscle-growth score.
      </p>
    </section>
  );
}
