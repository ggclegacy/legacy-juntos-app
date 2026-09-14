"use client";
import { useState, useCallback } from "react";
import { ProtocolFiles } from "./protocol-files";
import { ProtocolAi } from "./protocol-ai";
import {
  Activity,
  ArrowUpRight,
  Check,
  FlaskConical,
  HeartPulse,
  LockKeyhole,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
  Download,
  History,
} from "lucide-react";
import { Modal } from "./editor";
import {
  useProtocols,
  type HealthRequest,
} from "@/lib/protocols/use-protocols";
import {
  comparable,
  decimal,
  flag,
  latest,
  protocolsAt,
  reviewText,
  type HealthEvent,
  type Lab,
  type Payload,
  type Protocol,
} from "@/lib/protocols/model";
import { download } from "@/lib/training/storage";
const today = () => new Date().toLocaleDateString("en-CA");
const emptyProtocol = (): Protocol => ({
  kind: "protocol",
  name: "",
  category: "Medication",
  formulation: "",
  instructions: "",
  schedule: "",
  prescriber: "",
  purpose: "",
  effective: today(),
  status: "active",
});
const emptyLab = (): Lab => ({
  kind: "lab",
  name: "",
  value: 0,
  comparator: "=",
  unit: "",
  low: null,
  high: null,
  collected: today(),
  laboratory: "",
  method: "",
  context: "",
  source: "",
  confirmed: true,
});
export function Protocols({
  userId,
  demo,
  request,
}: {
  userId: string;
  demo: boolean;
  request: HealthRequest;
}) {
  const privateRequest = useCallback<HealthRequest>(
    (path, init) =>
      request(path, {
        ...init,
        headers: { ...init?.headers, "x-expected-user": userId },
      }),
    [request, userId],
  );
  const store = useProtocols(userId, demo, privateRequest),
    [tab, setTab] = useState("Today"),
    [editor, setEditor] = useState<{
      payload: Payload;
      event?: HealthEvent;
    } | null>(null),
    [inspect, setInspect] = useState<HealthEvent | null>(null),
    [message, setMessage] = useState(""),
    [packet, setPacket] = useState<string | null>(null),
    [selected, setSelected] = useState("");
  const current = latest(store.events),
    protocols = current.filter((e) => e.payload.kind === "protocol"),
    labs = current
      .filter((e) => e.payload.kind === "lab")
      .sort((a, b) =>
        (b.payload as Lab).collected.localeCompare(
          (a.payload as Lab).collected,
        ),
      ),
    active = protocols.filter(
      (e) => (e.payload as Protocol).status === "active",
    );
  const focus = labs.find((e) => e.entity_id === selected) ?? labs[0];
  async function save(p: Payload, e?: HealthEvent) {
    await store.save(p, e);
    setEditor(null);
    setMessage("Saved privately.");
  }
  function checkin() {
    setEditor({
      payload: {
        kind: "checkin",
        at: new Date().toISOString(),
        energy: 3,
        sleep: 0,
        symptoms: "",
        notes: "",
      },
    });
  }
  return (
    <section className="protocol-workspace">
      <header className="protocol-hero">
        <div className="protocol-orbit" aria-hidden="true">
          <HeartPulse size={70} strokeWidth={1} />
        </div>
        <div className="protocol-hero-content">
          <span className="eyebrow">PRECISION. CONTEXT. CLARITY.</span>
          <h1>
            Your body.
            <br />
            <em>A clearer picture.</em>
          </h1>
          <p>
            Everything you take. Every change you notice.
            <br />
            One private, connected history.
          </p>
          <div className="protocol-actions">
            <button
              className="primary"
              disabled={!store.ready}
              onClick={() => setEditor({ payload: emptyProtocol() })}
            >
              <Plus size={16} /> Add protocol
            </button>
            <button
              className="secondary"
              disabled={!store.ready}
              onClick={() => {
                setTab("Labs");
                setEditor({ payload: emptyLab() });
              }}
            >
              <FlaskConical size={16} /> Enter bloodwork
            </button>
          </div>
        </div>
        <span className="protocol-private">
          <LockKeyhole size={13} /> Only you ·{" "}
          {demo ? "sample session" : "private health space"}
        </span>
      </header>
      {demo && (
        <p className="protocol-notice">
          Sample workspace · use fictional information only. Entries stay in
          this browser tab’s session. Real health records require a connected
          private account.
        </p>
      )}
      <nav className="protocol-nav" aria-label="Protocol sections">
        {["Today", "Protocols", "Labs", "Insights", "Review"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {store.error && (
        <div className="error" role="alert">
          {store.error}{" "}
          <button onClick={() => void store.reload()}>Retry loading</button>
        </div>
      )}
      {!store.ready && !store.error && (
        <p role="status">Opening your private workspace…</p>
      )}
      {message && (
        <p role="status" className="protocol-notice">
          {message}
        </p>
      )}
      <div className="protocol-metrics">
        <div>
          <Pill size={18} />
          <strong>{active.length}</strong>
          <span>Active protocols</span>
        </div>
        <div>
          <FlaskConical size={18} />
          <strong>{labs.length}</strong>
          <span>Recorded results</span>
        </div>
        <div>
          <Activity size={18} />
          <strong>
            {current.filter((e) => e.payload.kind === "checkin").length}
          </strong>
          <span>Personal check-ins</span>
        </div>
      </div>
      {tab === "Today" && (
        <div className="protocol-columns">
          <div>
            <div className="protocol-heading">
              <div>
                <span className="eyebrow">YOUR DAILY RHYTHM</span>
                <h2>Small actions. Clear history.</h2>
              </div>
              <button
                className="text-button"
                disabled={!store.ready}
                onClick={checkin}
              >
                Check in <Plus size={15} />
              </button>
            </div>
            {!active.length ? (
              <Empty
                title="Your protocol starts here."
                text="Add your existing medication, hormone therapy, peptide, or supplement instructions. You choose what to record."
              />
            ) : (
              active.map((e) => {
                const p = e.payload as Protocol;
                const logs = current.filter(
                  (d) =>
                    d.payload.kind === "dose" &&
                    d.payload.protocolId === e.entity_id,
                );
                return (
                  <article className="protocol-card" key={e.entity_id}>
                    <span className="eyebrow">{p.category}</span>
                    <h3>{p.name}</h3>
                    <p>{p.instructions}</p>
                    <span className="protocol-muted">
                      {p.schedule || "Schedule not entered"}
                    </span>
                    <div className="protocol-actions">
                      {(["taken", "skipped", "held"] as const).map((status) => (
                        <button
                          key={status}
                          className={
                            status === "taken"
                              ? "primary small"
                              : "secondary small"
                          }
                          disabled={store.busy}
                          onClick={() =>
                            setEditor({
                              payload: {
                                kind: "dose",
                                protocolId: e.entity_id,
                                protocolRevision: e.revision,
                                name: p.name,
                                instructions: p.instructions,
                                at: new Date().toISOString(),
                                status,
                                notes: "",
                              },
                            })
                          }
                        >
                          {status === "taken" && <Check size={13} />}{" "}
                          {status[0].toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                    <small>
                      {logs.length
                        ? `${logs.length} use records · most recent ${new Date(logs[logs.length - 1].created_at).toLocaleString()}`
                        : "No use recorded · this does not mean skipped"}
                    </small>
                  </article>
                );
              })
            )}
          </div>
          <aside className="protocol-card protocol-feature">
            <ShieldCheck size={24} />
            <span className="eyebrow">KNOW YOUR CONTEXT</span>
            <h2>More than a number.</h2>
            <p>
              A lab result belongs to a moment in your life. Bring together what
              you were taking and what you noticed.
            </p>
            <button className="text-button" onClick={() => setTab("Insights")}>
              Explore your timeline <ArrowUpRight size={16} />
            </button>
            <hr />
            <h3>Evidence, with honesty.</h3>
            <p>
              Interaction checks and clinical lab interpretation are not active
              in this release. No warning does not mean a combination is safe.
            </p>
          </aside>
        </div>
      )}
      {tab === "Protocols" && (
        <>
          <div className="protocol-heading">
            <div>
              <span className="eyebrow">YOUR PERSONAL FORMULARY</span>
              <h2>Designed around your life.</h2>
            </div>
            <button
              className="primary small"
              disabled={!store.ready}
              onClick={() => setEditor({ payload: emptyProtocol() })}
            >
              <Plus size={15} /> Add protocol
            </button>
          </div>
          <div className="protocol-grid">
            {protocols.map((e) => {
              const p = e.payload as Protocol;
              return (
                <article className="protocol-card" key={e.entity_id}>
                  <span className="eyebrow">
                    {p.category} · {p.status}
                  </span>
                  <h3>{p.name}</h3>
                  <p>{p.formulation}</p>
                  <p>{p.instructions}</p>
                  <p className="protocol-muted">
                    {p.schedule}
                    <br />
                    Effective {p.effective} · Version {e.revision}
                  </p>
                  <div className="protocol-actions">
                    <button
                      className="secondary small"
                      onClick={() => setEditor({ payload: p, event: e })}
                    >
                      Edit protocol
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setInspect(e)}
                    >
                      <History size={14} /> History
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!protocols.length && (
            <Empty
              title="Bring your existing protocol."
              text="Record instructions exactly as supplied. Changes create a new version so your history stays intact."
            />
          )}
        </>
      )}
      {tab === "Labs" && (
        <>
          <div className="protocol-heading">
            <div>
              <span className="eyebrow">YOUR BLOODWORK, CONNECTED</span>
              <h2>Every result has a story.</h2>
            </div>
            <button
              className="primary small"
              disabled={!store.ready}
              onClick={() => setEditor({ payload: emptyLab() })}
            >
              <Plus size={15} /> Add result
            </button>
          </div>
          <div className="protocol-notice">
            <strong>Manual entry is ready.</strong> Upload originals to your
            private vault in connected mode, then enter results here. Automatic
            extraction is not enabled. Record the report reference and verify
            each value against your original.
          </div>
          <ProtocolFiles demo={demo} request={privateRequest} />
          <div className="protocol-grid">
            {labs.map((e) => {
              const p = e.payload as Lab;
              return (
                <button
                  className="protocol-card protocol-lab"
                  key={e.entity_id}
                  onClick={() => setInspect(e)}
                >
                  <span className="eyebrow">
                    {p.collected} · {p.laboratory}
                  </span>
                  <h3>{p.name}</h3>
                  <strong className="protocol-value">
                    {p.comparator === "=" ? "" : p.comparator}
                    {p.value} <small>{p.unit}</small>
                  </strong>
                  <span className="protocol-range">{flag(p)}</span>
                  <span className="protocol-muted">
                    Reported interval: {p.low ?? "—"} – {p.high ?? "—"} {p.unit}
                  </span>
                </button>
              );
            })}
          </div>
          {!labs.length && (
            <Empty
              title="Start with your latest report."
              text="Enter a result, its units, collection date, and the laboratory’s own reference interval. Your original remains the source of truth."
            />
          )}
        </>
      )}
      {tab === "Insights" && (
        <>
          <div className="protocol-heading">
            <div>
              <span className="eyebrow">THE CONNECTIONS THAT MATTER</span>
              <h2>What changed?</h2>
            </div>
          </div>
          {focus ? (
            <>
              <label className="protocol-select">
                Explore a result
                <select
                  value={focus.entity_id}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {labs.map((e) => (
                    <option key={e.entity_id} value={e.entity_id}>
                      {(e.payload as Lab).name} · {(e.payload as Lab).collected}
                    </option>
                  ))}
                </select>
              </label>
              <LabContext event={focus} events={store.events} />
            </>
          ) : (
            <Empty
              title="Your timeline is waiting."
              text="Add lab results and protocols to explore the context around each blood draw."
            />
          )}
          <div className="protocol-card">
            <Sparkles size={22} />
            <h3>Grounded observations, not guessed outcomes.</h3>
            <p>
              This view compares your recorded data; it is not AI
              interpretation. Different laboratories or methods are kept
              separate. Protocol changes and results occurring together do not
              prove cause and effect.
            </p>
          </div>
        </>
      )}
      {tab === "Review" && (
        <>
          <ProtocolAi
            key={store.events.map((e) => e.id).join(":")}
            demo={demo}
            events={store.events}
            request={privateRequest}
            onRecord={setInspect}
          />
          <div className="protocol-heading">
            <div>
              <span className="eyebrow">ARRIVE WITH CLARITY</span>
              <h2>A better conversation starts here.</h2>
            </div>
          </div>
          <div className="protocol-columns">
            <article className="protocol-card">
              <ShieldCheck size={26} />
              <h3>Your appointment brief.</h3>
              <p>
                Prepare an editable summary of your current protocols, lab
                results, actual-use logs, and check-ins. Remove anything you do
                not want to include before downloading.
              </p>
              <button
                className="primary"
                onClick={() => setPacket(reviewText(store.events))}
              >
                Prepare my review <ArrowUpRight size={16} />
              </button>
            </article>
            <article className="protocol-card">
              <LockKeyhole size={25} />
              <h3>Private means private.</h3>
              <p>
                Your partner cannot access these records. This release exports a
                file for you to review; it does not send it to anyone.
                Downloaded files are outside the app’s access controls.
              </p>
            </article>
          </div>
        </>
      )}
      {tab === "Today" && (
        <div className="protocol-card">
          <h3>Recent use & check-ins</h3>
          {current
            .filter(
              (e) => e.payload.kind === "dose" || e.payload.kind === "checkin",
            )
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 12)
            .map((e) => (
              <button
                className="protocol-log"
                key={e.id}
                onClick={() => setInspect(e)}
              >
                <span>
                  {e.payload.kind === "dose"
                    ? `${e.payload.name} · ${e.payload.status}`
                    : "Personal check-in"}
                </span>
                <small>{new Date(e.created_at).toLocaleString()}</small>
              </button>
            ))}
        </div>
      )}
      {editor && (
        <HealthEditor
          initial={editor.payload}
          busy={store.busy}
          onClose={() => setEditor(null)}
          onSave={(p) => save(p, editor.event)}
        />
      )}
      {inspect && (
        <Modal
          title={
            inspect.payload.kind === "lab"
              ? (inspect.payload as Lab).name
              : "Protocol history"
          }
          onClose={() => setInspect(null)}
          wide
        >
          {inspect.payload.kind === "lab" ? (
            <>
              <LabContext event={inspect} events={store.events} />
              <p>
                Source reference:{" "}
                {(inspect.payload as Lab).source || "Not recorded"}
              </p>
              <p>
                Context: {(inspect.payload as Lab).context || "Not recorded"}
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setEditor({ payload: inspect.payload, event: inspect });
                  setInspect(null);
                }}
              >
                Correct this result
              </button>
            </>
          ) : inspect.payload.kind === "dose" ||
            inspect.payload.kind === "checkin" ? (
            <>
              <p>
                {inspect.payload.kind === "dose"
                  ? `${inspect.payload.name} · ${inspect.payload.status} · ${inspect.payload.instructions}`
                  : `Sleep ${inspect.payload.sleep} hours · Energy ${inspect.payload.energy}/5 · ${inspect.payload.symptoms}`}
              </p>
              <p>{new Date(inspect.payload.at).toLocaleString()}</p>
              <p>{inspect.payload.notes}</p>
            </>
          ) : (
            store.events
              .filter((e) => e.entity_id === inspect.entity_id)
              .sort((a, b) => b.revision - a.revision)
              .map((e) => (
                <article key={e.id} className="protocol-card">
                  <strong>
                    Version {e.revision} · {(e.payload as Protocol).effective}
                  </strong>
                  <p>
                    {(e.payload as Protocol).name} ·{" "}
                    {(e.payload as Protocol).status}
                  </p>
                  <p>{(e.payload as Protocol).instructions}</p>
                  <p>{(e.payload as Protocol).schedule}</p>
                </article>
              ))
          )}
        </Modal>
      )}
      {packet !== null && (
        <Modal
          title="Review before downloading"
          onClose={() => setPacket(null)}
          wide
        >
          <label className="protocol-select">
            Edit your appointment brief
            <textarea
              rows={18}
              value={packet}
              onChange={(e) => setPacket(e.target.value)}
            />
          </label>
          <button
            className="primary"
            onClick={() => download("private-protocol-review.txt", packet)}
          >
            <Download size={16} /> Download reviewed brief
          </button>
        </Modal>
      )}
    </section>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="protocol-empty">
      <HeartPulse size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function LabContext({
  event,
  events,
}: {
  event: HealthEvent;
  events: HealthEvent[];
}) {
  const lab = event.payload as Lab;
  const history = latest(events)
    .filter(
      (e) =>
        e.payload.kind === "lab" &&
        comparable(lab, e.payload) &&
        e.payload.collected <= lab.collected,
    )
    .sort((a, b) =>
      (a.payload as Lab).collected.localeCompare((b.payload as Lab).collected),
    );
  const previous = history
    .filter((e) => (e.payload as Lab).collected < lab.collected)
    .at(-1);
  const context = protocolsAt(events, lab.collected);
  const values = history.map((e) => (e.payload as Lab).value);
  const min = Math.min(...values),
    max = Math.max(...values);
  return (
    <div className="protocol-card">
      <span className="eyebrow">COLLECTED {lab.collected}</span>
      <h3>
        {lab.name} · {lab.comparator === "=" ? "" : lab.comparator}
        {lab.value} {lab.unit}
      </h3>
      <p>
        {flag(lab)} · {lab.laboratory}
      </p>
      {history.length > 1 && (
        <svg
          className="protocol-chart"
          viewBox="0 0 600 120"
          role="img"
          aria-label={`${lab.name} recorded trend; values are listed below`}
        >
          <polyline
            fill="none"
            stroke="#57e8b1"
            strokeWidth="3"
            points={values
              .map(
                (v, i) =>
                  `${20 + (i * 560) / (values.length - 1)},${100 - ((v - min) / (max - min || 1)) * 80}`,
              )
              .join(" ")}
          />
          {values.map((v, i) => (
            <circle
              key={i}
              cx={20 + (i * 560) / (values.length - 1)}
              cy={100 - ((v - min) / (max - min || 1)) * 80}
              r="5"
              fill="#efd58c"
            />
          ))}
        </svg>
      )}
      <p>
        {previous
          ? `Change from ${(previous.payload as Lab).collected}: ${Number((lab.value - (previous.payload as Lab).value).toFixed(4))} ${lab.unit}. Same recorded laboratory, units, and method; comparability still needs review.`
          : "No earlier comparable numerical result recorded."}
      </p>
      <details>
        <summary>View recorded values</summary>
        {history.map((e) => (
          <p key={e.id}>
            {(e.payload as Lab).collected}: {(e.payload as Lab).value}{" "}
            {lab.unit}
          </p>
        ))}
      </details>
      <hr />
      <h3>Recorded protocol at collection</h3>
      {context.length ? (
        context.map((e) => (
          <p key={e.id}>
            <strong>{(e.payload as Protocol).name}</strong> ·{" "}
            {(e.payload as Protocol).instructions}
            <br />
            <span className="protocol-muted">
              Version {e.revision} · {(e.payload as Protocol).schedule}
            </span>
          </p>
        ))
      ) : (
        <p>No active protocol recorded for this date.</p>
      )}
      <p className="protocol-muted">
        A protocol records intended use, not proof it was taken. Collection
        time, time since last dose, and other context may be missing.
      </p>
    </div>
  );
}
function HealthEditor({
  initial,
  busy,
  onSave,
  onClose,
}: {
  initial: Payload;
  busy: boolean;
  onSave: (p: Payload) => Promise<void>;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  async function submit(form: FormData) {
    try {
      const get = (key: string) => String(form.get(key) ?? "");
      let p: Payload = initial;
      if (initial.kind === "protocol")
        p = {
          ...initial,
          name: get("name"),
          category: get("category") as Protocol["category"],
          formulation: get("formulation"),
          instructions: get("instructions"),
          schedule: get("schedule"),
          prescriber: get("prescriber"),
          purpose: get("purpose"),
          effective: get("effective"),
          status: get("status") as Protocol["status"],
        };
      if (initial.kind === "lab") {
        if (!form.get("confirmed"))
          throw new Error(
            "Verify the values against your report before saving.",
          );
        p = {
          ...initial,
          name: get("name"),
          value: decimal(get("value")),
          unit: get("unit"),
          comparator: get("comparator") as Lab["comparator"],
          low: get("low") ? decimal(get("low")) : null,
          high: get("high") ? decimal(get("high")) : null,
          collected: get("collected"),
          laboratory: get("laboratory"),
          method: get("method"),
          context: get("context"),
          source: get("source"),
          confirmed: true,
        };
      }
      if (initial.kind === "dose")
        p = {
          ...initial,
          at: new Date(get("at")).toISOString(),
          notes: get("notes"),
        };
      if (initial.kind === "checkin")
        p = {
          ...initial,
          sleep: decimal(get("sleep")),
          energy: Number(get("energy")),
          symptoms: get("symptoms"),
          notes: get("notes"),
        };
      await onSave(p);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your entries are still here.",
      );
    }
  }
  const field = (
    name: string,
    label: string,
    value: string,
    required = false,
    type = "text",
  ) => (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value}
        required={required}
        type={type}
        maxLength={2000}
      />
    </label>
  );
  return (
    <Modal
      title={
        initial.kind === "protocol"
          ? "Your protocol"
          : initial.kind === "lab"
            ? "Record a lab result"
            : initial.kind === "dose"
              ? `Confirm ${initial.status}`
              : "How are you feeling?"
      }
      onClose={onClose}
      wide
    >
      <form
        className="protocol-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(new FormData(e.currentTarget));
        }}
      >
        {initial.kind === "protocol" && (
          <>
            {field("name", "Product / medication name", initial.name, true)}
            <label>
              Category
              <select name="category" defaultValue={initial.category}>
                {["Medication", "Hormone therapy", "Peptide", "Supplement"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </label>
            {field(
              "formulation",
              "Formulation / strength / concentration",
              initial.formulation,
            )}
            {field(
              "instructions",
              "Exact dose and route as instructed",
              initial.instructions,
              true,
            )}
            {field(
              "schedule",
              "Schedule as instructed (including as-needed use)",
              initial.schedule,
            )}
            {field(
              "prescriber",
              "Prescriber / source of instructions",
              initial.prescriber,
            )}
            {field("purpose", "Purpose / notes", initial.purpose)}
            {field(
              "effective",
              "Effective date",
              initial.effective,
              true,
              "date",
            )}
            <label>
              Status
              <select name="status" defaultValue={initial.status}>
                {["active", "paused", "stopped"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <p>
              Copy existing instructions exactly. This records your protocol; it
              does not recommend doses or schedule reminders.
            </p>
          </>
        )}
        {initial.kind === "lab" && (
          <>
            {field(
              "name",
              "Test name (for example, total vs free)",
              initial.name,
              true,
            )}
            {field(
              "value",
              "Reported value · decimal point or comma",
              initial.name ? String(initial.value) : "",
              true,
            )}
            <label>
              Result qualifier
              <select name="comparator" defaultValue={initial.comparator}>
                {["=", "<", ">"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            {field("unit", "Units exactly as reported", initial.unit, true)}
            {field(
              "low",
              "Reference interval lower limit (optional)",
              initial.low === null ? "" : String(initial.low),
            )}
            {field(
              "high",
              "Reference interval upper limit (optional)",
              initial.high === null ? "" : String(initial.high),
            )}
            {field(
              "collected",
              "Blood collection date",
              initial.collected,
              true,
              "date",
            )}
            {field("laboratory", "Laboratory name", initial.laboratory, true)}
            {field("method", "Assay / method, if supplied", initial.method)}
            {field(
              "source",
              "Original report reference / page",
              initial.source,
            )}
            {field(
              "context",
              "Collection time, fasting, last dose, relevant context",
              initial.context,
            )}
            <label className="protocol-confirm">
              <input name="confirmed" type="checkbox" required /> I checked the
              test, value, units, collection date, and interval against my
              original report.
            </label>
          </>
        )}
        {initial.kind === "dose" && (
          <>
            <p>
              {initial.name} · {initial.instructions}
            </p>
            {field(
              "at",
              "Actual event time",
              new Date(
                new Date(initial.at).getTime() -
                  new Date().getTimezoneOffset() * 60000,
              )
                .toISOString()
                .slice(0, 16),
              true,
              "datetime-local",
            )}
            {field("notes", "Notes / reason", initial.notes)}
            <p>
              Record what happened. For missed-dose instructions, use your
              prescription or ask your prescriber.
            </p>
          </>
        )}
        {initial.kind === "checkin" && (
          <>
            {field("sleep", "Sleep hours", "", true)}
            <label>
              Energy
              <select name="energy" defaultValue={initial.energy}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            {field("symptoms", "Symptoms / changes noticed", initial.symptoms)}
            {field(
              "notes",
              "Other context: training, stress, illness",
              initial.notes,
            )}
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy} type="submit">
          {busy ? "Saving…" : "Save privately"}
        </button>
      </form>
    </Modal>
  );
}
