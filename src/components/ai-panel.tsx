"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import { Lock, Mic, ArrowUp, Copy, Square, Pause, Play } from "lucide-react";
import { ApolloOrb } from "./apollo/orb";
import { CommandDock, type DockDestination } from "./command-dock";
import { initialSession, sessionReducer, stateLabels } from "@/lib/apollo/session";
import { KnowledgeWorkspace } from "./knowledge/workspace";
import { safeSourceUrl } from "@/lib/ai/knowledge/model";
import { ApolloRecall } from "./apollo-recall";
import { ApolloMemoryLibrary } from "./apollo-memory";
import {
  recallKinds,
  recallLabels,
  type RecallKind,
  type MemorySource,
  type Conversation,
  type ConversationTurn,
} from "@/lib/ai/memory";
import { Modal } from "./editor";
import type { LifeRecord, RecordInput, Member } from "@/lib/model";
import {
  apolloModes,
  modeLabels,
  modeStarters,
  apolloPrinciples,
  defaultApolloPreferences,
  type ApolloMode,
  type ApolloPreferences,
} from "@/lib/ai/apollo";
export function AiPanel({
  members,
  userId,
  records,
  demo,
  onClose,
  request,
  onDraft,
  onNavigate,
}: {
  onNavigate: (destination: DockDestination) => void;
  members: Member[];
  userId: string;
  records: LifeRecord[];
  demo: boolean;
  onClose: () => void;
  request: (
    path: string,
    init?: RequestInit,
  ) => Promise<Record<string, unknown>>;
  onDraft: (draft: Partial<RecordInput>) => void;
}) {
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const [paused, setPaused] = useState(false);
  const [online, setOnline] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const requestEpoch = useRef(0);
  const composer = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLElement>(null);
  const currentName = members.find(member => member.user_id === userId)?.display_name ?? "Your";
  function interrupt() {
    requestEpoch.current++; controller.current?.abort(); setBusy(false);
    dispatch({ type: "interrupt" });
    setNotice("Stopped waiting. The provider may already have processed this request. Reopen a saved conversation before sending again.");
  }
  const [context, setContext] = useState<"private" | "shared">("private"),
    [mode, setMode] = useState<ApolloMode>("auto");
  const [preferences, setPreferences] = useState<ApolloPreferences>(
    defaultApolloPreferences,
  );
  const [message, setMessage] = useState(""),
    [result, setResult] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [knowledge, setKnowledge] = useState(false);
  const [library, setLibrary] = useState(false),
    [teaching, setTeaching] = useState("");
  const [recallSources, setRecallSources] = useState<RecallKind[]>(["memory"]);
  const [semanticRecall, setSemanticRecall] = useState(false);
  const [sources, setSources] = useState<MemorySource[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [conversationTitle, setConversationTitle] = useState("");
  const [hasOlder, setHasOlder] = useState(false);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) {
        controller.current?.abort(); requestEpoch.current++; setBusy(false);
        dispatch({ type: "offline" });
      } else dispatch({ type: "end" });
    };
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    const viewport = window.visualViewport;
    const resize = () => {
      document.documentElement.style.setProperty("--apollo-height", `${viewport?.height ?? window.innerHeight}px`);
      document.documentElement.style.setProperty("--apollo-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize(); viewport?.addEventListener("resize", resize); viewport?.addEventListener("scroll", resize);
    return () => {
      // Epoch is a mutable request generation, not a DOM reference.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestEpoch.current++; controller.current?.abort();
      window.removeEventListener("online", update); window.removeEventListener("offline", update);
      viewport?.removeEventListener("resize", resize); viewport?.removeEventListener("scroll", resize);
      document.documentElement.style.removeProperty("--apollo-height"); document.documentElement.style.removeProperty("--apollo-top");
    };
  }, []);
  useEffect(() => { if (result) responseRef.current?.focus({ preventScroll: false }); }, [result]);
  async function openConversation(c: Conversation) {
    setBusy(true);
    setError("");
    setLibrary(false);
    setConsent(false);
    setResult("");
    setMessage("");
    setSelected(
      (c.record_ids ?? []).filter((id) =>
        records.some(
          (r) =>
            r.id === id &&
            (c.context === "private" || r.visibility === "shared"),
        ),
      ),
    );
    setSemanticRecall(false);
    setSources([]);
    setContext(c.context);
    setRecallSources(["memory"]);
    setConversation(c);
    setTurns([]);
    try {
      const data = await request(`/api/ai/memory?type=turns&id=${c.id}`, {
        headers: { "x-expected-user": userId },
      });
      setTurns((data.items as ConversationTurn[]).reverse());
      setHasOlder(!!data.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load conversation.");
      setConversation(null);
    } finally {
      setBusy(false);
    }
  }
  async function startConversation() {
    setBusy(true);
    setError("");
    try {
      const data = await request("/api/ai/memory", {
        method: "POST",
        headers: { "x-expected-user": userId },
        body: JSON.stringify({
          action: "new_conversation",
          recordIds: selected,
          title: conversationTitle.trim() || "A conversation with Apollo",
          context,
        }),
      });
      setConversation(data.item as Conversation);
      setTurns([]);
      setResult("");
      setNotice(
        "Conversation created. Successful turns will be saved privately.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create conversation.",
      );
    } finally {
      setBusy(false);
    }
  }
  function resetConversation() {
    dispatch({ type: "end" });
    setConversation(null);
    setTurns([]);
    setResult("");
    setMessage("");
    setSources([]);
    setSelected([]);
    setConsent(false);
    setRecallSources(["memory"]);
    setSemanticRecall(false);
    setNotice("");
    setError("");
  }
  const eligible = records.filter(
    (r) => context === "private" || r.visibility === "shared",
  );
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !consent || demo || !online || !message.trim()) return;
    const epoch = ++requestEpoch.current;
    controller.current?.abort(); controller.current = new AbortController();
    dispatch({ type: "submit" });
    setBusy(true);
    setError("");
    setResult("");
    try {
      const data = await request("/api/ai", {
        signal: controller.current.signal,
        method: "POST",
        headers: { "x-expected-user": userId },
        body: JSON.stringify({
          message,
          context,
          mode,
          preferences,
          recordIds: selected,
          consent,
          recallSources,
          semanticRecall,
          ...(conversation
            ? {
                conversationId: conversation.id,
                conversationRevision: conversation.revision,
              }
            : {}),
        }),
      });
      if (epoch !== requestEpoch.current) return;
      dispatch({ type: "complete" });
      setResult(data.text as string);
      setSources((data.sources as MemorySource[]) ?? []);
      if (conversation && data.saved) {
        setConversation({
          ...conversation,
          revision: data.conversationRevision as number,
        });
        setTurns((old) => [
          ...old,
          {
            id: crypto.randomUUID(),
            ordinal: data.conversationRevision as number,
            user_message: message,
            assistant_message: data.text as string,
            dependencies: [],
            created_at: new Date().toISOString(),
          },
        ]);
        setMessage("");
      }
      setNotice(
        data.saved
          ? "Turn saved privately. You can return to this conversation."
          : "Temporary response · this conversation is not saved by the app.",
      );
      if (data.omittedHistory)
        setNotice(
          (old) =>
            old +
            " Some older turns were left out of AI context because of length or changed sources.",
        );
    } catch (e) {
      if (epoch !== requestEpoch.current) return;
      dispatch({ type: navigator.onLine ? "error" : "offline" });
      setError(e instanceof Error ? e.message : "AI is unavailable.");
    } finally {
      if (epoch === requestEpoch.current) setBusy(false);
    }
  }
  return (
    <Modal title="Apollo" onClose={onClose} wide immersive>
      {knowledge ? (
        <KnowledgeWorkspace
          request={request}
          userId={userId}
          members={members}
          demo={demo}
          onBack={() => setKnowledge(false)}
        />
      ) : library ? (
        <ApolloMemoryLibrary
          members={members}
          userId={userId}
          demo={demo}
          request={request}
          initialTeaching={teaching}
          onBack={() => {
            setLibrary(false);
            setTeaching("");
          }}
          onConversation={openConversation}
        />
      ) : (
        <div className="ai-panel" data-motion-paused={paused} data-composing={!!message} aria-busy={busy}>
          <div className="apollo-world-tools">
            <span className="apollo-context-name"><Lock size={12} /> {context === "private" ? `${currentName} · private` : "Juntos · shared sources"}</span>
            <div>
              <button className="text-button" aria-label="Knowledge & research" disabled={busy} onClick={() => setKnowledge(true)}>Research</button>
              <button className="text-button" aria-label="Memory & learning" disabled={busy} onClick={() => { setTeaching(""); setLibrary(true); }}>Memory</button>
            </div>
          </div>
          <section className="apollo-hero" aria-label="Apollo presence">
            <ApolloOrb state={online ? session.phase : "offline"} paused={paused} engaged={!!message} />
            <div className="apollo-presence-copy">
              <span className="eyebrow">A LITTLE CLARITY. LIMITLESS POSSIBILITY.</span>
              <h3>Think clearly. <em>Move forward.</em></h3>
              <p role="status" className="apollo-state"><span />{stateLabels[online ? session.phase : "offline"]}</p>
            </div>
            <button className="orb-motion-toggle icon-button" aria-label={paused ? "Resume orb motion" : "Pause orb motion"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button>
          </section>
          <div className="segmented">
            <button
              disabled={busy}
              aria-pressed={context === "private"}
              onClick={() => {
                resetConversation();
                setContext("private");
                setSelected([]);
                setResult("");
                setMessage("");
                setConsent(false);
              }}
            >
              Private to me
            </button>
            <button
              disabled={busy}
              aria-pressed={context === "shared"}
              onClick={() => {
                resetConversation();
                setContext("shared");
                setSelected([]);
                setResult("");
                setMessage("");
                setConsent(false);
              }}
            >
              Juntos context
            </button>
          </div>
          <div className="privacy-note">
            <Lock size={16} />
            <span>
              {context === "private"
                ? "This conversation stays with you. Nothing is sent to the other person."
                : "Only Juntos entries can be selected. Results still require your review before being posted."}
            </span>
          </div>
          <div className="apollo-shortcuts" aria-label="Conversation starters">
            {(context === "shared" ? [
              ["Our next chapter", "Help us turn a shared goal into a small next step.", "strategy"],
              ["Check in together", "Help me prepare a thoughtful relationship check-in, without assuming how my partner feels.", "bridge"],
              ["Make a memory", "Help me plan a meaningful moment for us.", "creative"],
            ] : [
              ["Plan my day", "Help me choose three meaningful priorities for today. Ask what is on my plate first.", "coach"],
              ["A moment of faith", "Help me slow down for a short devotional and a thoughtful reflection.", "faith"],
              ["Think bigger", "Help me think through a business idea and find the strongest next step.", "strategy"],
            ]).map(([label, prompt, nextMode]) => <button key={label} type="button" disabled={busy} onClick={() => { setMessage(prompt); setMode(nextMode as ApolloMode); composer.current?.focus(); }}>{label}<ArrowUp size={12}/></button>)}
          </div>
          {turns.length > 0 && (
            <section
              className="apollo-transcript"
              aria-label="Saved conversation history"
            >
              <h3>Where we left off</h3>
              {hasOlder && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={async () => {
                    if (!conversation) return;
                    setBusy(true);
                    try {
                      const before = Math.min(...turns.map((t) => t.ordinal));
                      const data = await request(
                        `/api/ai/memory?type=turns&id=${conversation.id}&before=${before}`,
                        { headers: { "x-expected-user": userId } },
                      );
                      setTurns((old) => [
                        ...(data.items as ConversationTurn[]).reverse(),
                        ...old,
                      ]);
                      setHasOlder(!!data.hasMore);
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Could not load older turns.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Load older turns
                </button>
              )}
              {turns.map((t) => (
                <details key={t.id}>
                  <summary>{t.user_message.slice(0, 100)}</summary>
                  <p className="apollo-memory-content">
                    <strong>You:</strong> {t.user_message}
                  </p>
                  <p className="apollo-memory-content">
                    <strong>Apollo:</strong> {t.assistant_message}
                  </p>
                  <small>
                    Saved {new Date(t.created_at).toLocaleString()} · historical
                    response; its sources may have changed.
                  </small>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setTeaching(t.user_message);
                      setLibrary(true);
                    }}
                  >
                    Teach Apollo from this
                  </button>
                </details>
              ))}
            </section>
          )}
          {result && (
            <section className="ai-result" ref={responseRef} tabIndex={-1} aria-label="Apollo response">
              <span className="eyebrow">
                AI-GENERATED · REVIEW IN YOUR OWN WORDS
              </span>
              <p>{result}</p>
              {sources.length > 0 && (
                <details className="apollo-sources">
                  <summary>
                    What Apollo was given · {sources.length} recalled sources
                  </summary>
                  <p className="muted">
                    This is the context supplied, not a guarantee every source
                    supports every sentence.
                  </p>
                  {sources.map((s, i) => (
                    <details key={`${s.kind}:${s.id}`}>
                      <summary>
                        [M{i + 1}] {s.title} · {recallLabels[s.kind]}
                      </summary>
                      <small>
                        {new Date(s.updated_at).toLocaleString()}
                        {s.details.excerpt ? " · excerpt" : ""}
                        {s.details.detailsOmitted
                          ? " · source metadata abbreviated"
                          : ""}
                      </small>
                      <p className="apollo-memory-content">{s.content}</p>
                      {s.kind === "knowledge" && (
                        <p className="muted">
                          {String(s.details.origin ?? "")} ·{" "}
                          {String(s.details.source_name ?? "")}
                          {s.details.published_on
                            ? ` · published ${s.details.published_on}`
                            : ""}
                          {s.details.review_on
                            ? ` · review ${s.details.review_on}`
                            : ""}
                        </p>
                      )}
                      {Array.isArray(s.details.references) &&
                        s.details.references
                          .filter(
                            (r): r is { url: string; title: string } =>
                              !!r &&
                              typeof r.url === "string" &&
                              typeof r.title === "string" &&
                              safeSourceUrl(r.url),
                          )
                          .map((r, i) => (
                            <a
                              className="knowledge-source-link"
                              key={`${r.url}:${i}`}
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {r.title}
                            </a>
                          ))}
                    </details>
                  ))}
                </details>
              )}
              <button
                className="secondary"
                onClick={() =>
                  onDraft({
                    kind: "journal",
                    title: "A thought to return to",
                    body: result,
                    visibility: "private",
                  })
                }
              >
                Review & save privately
              </button>
            </section>
          )}
          <form onSubmit={send} className="apollo-composer">
            <label>
              Your starting point
              <textarea
                ref={composer}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                required
                disabled={busy}
                maxLength={6000}
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={modeStarters[mode]}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                disabled={busy}
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Send my message, selected entries, enabled memory sources, and any
              resumed conversation context to the configured AI provider. Its
              data policies apply.
            </label>
            <div className="ai-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setNotice(
                    "Voice is planned. No microphone is recording. A secure realtime provider connection is needed before voice can start.",
                  )
                }
              >
                <Mic size={17} /> Voice · soon
              </button>
              {busy && <button type="button" className="secondary" onClick={interrupt}><Square size={14}/> Stop response</button>}
              <button className="primary" disabled={!consent || busy || demo || !online || !message.trim()}>
                {busy ? "Thinking…" : "Ask Apollo"}
                <ArrowUp size={17} />
              </button>
            </div>
            <button
              type="button"
              className="text-button"
              disabled={busy || !message.trim()}
              onClick={() => {
                setTeaching(message);
                setLibrary(true);
              }}
            >
              Teach Apollo from this message
            </button>
            <details className="apollo-preferences">
              <summary>
                Memory & app awareness · {recallSources.length} areas
              </summary>
              <p className="muted">
                Apollo will search these areas for relevant context when you
                send. Up to 12 sources are selected; this is not an exhaustive
                review. Your private information never enters Juntos recall.
              </p>
              {recallKinds
                .filter(
                  (k) =>
                    context === "private" ||
                    !["training", "nutrition", "protocol"].includes(k),
                )
                .map((k) => (
                  <label className="check-label" key={k}>
                    <input
                      type="checkbox"
                      checked={recallSources.includes(k)}
                      disabled={busy}
                      onChange={(e) => {
                        setRecallSources((old) =>
                          e.target.checked
                            ? [...old, k]
                            : old.filter((v) => v !== k),
                        );
                        setConsent(false);
                      }}
                    />
                    {recallLabels[k]}
                  </label>
                ))}
              <ApolloRecall
                key={`${context}:${recallSources.join(",")}`}
                context={context}
                sources={recallSources}
                enabled={semanticRecall}
                onEnabled={(value) => {
                  setSemanticRecall(value);
                  setConsent(false);
                }}
                request={request}
                userId={userId}
                demo={demo}
                disabled={busy}
              />
              <p className="muted">
                Turn off every area for no cross-conversation recall. Recent
                turns still accompany a saved conversation.
              </p>
            </details>
            <details>
              <summary>Choose context · {selected.length} entries</summary>
              <p className="muted">
                Selected entries are linked when you create a saved conversation
                and restored when you reopen it. These entries are sent in
                addition to any memory areas you enable.
              </p>
              {eligible.slice(0, 40).map((r) => (
                <label className="check-label context-item" key={r.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    disabled={
                      busy ||
                      (!selected.includes(r.id) && selected.length >= 12)
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, r.id]
                          : selected.filter((id) => id !== r.id),
                      )
                    }
                  />
                  {r.title}
                </label>
              ))}
            </details>
          </form>
          {demo && (
            <p className="muted">
              Sample workspace · Apollo’s identity and controls are ready. Live
              responses need a connected account and AI service. The guide below
              works without AI.
            </p>
          )}
          {notice && (
            <p role="status" className="privacy-note">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <details className="apollo-settings">
            <summary>Personalize Apollo & conversation controls</summary>
          <details className="apollo-preferences">
            <summary>
              {conversation
                ? `Saved conversation · ${conversation.title}`
                : "Conversation controls · temporary"}
            </summary>
            {conversation ? (
              <>
                <p className="muted">
                  This thread is saved privately. Apollo receives recent usable
                  turns and the recall you enable.
                </p>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={resetConversation}
                >
                  New temporary conversation
                </button>
              </>
            ) : (
              <>
                <p className="muted">
                  Save a thread to continue across visits, or stay temporary.
                  Temporary chats are not saved by the app; provider data
                  policies still apply.
                </p>
                <label>
                  Conversation name
                  <input
                    maxLength={180}
                    disabled={busy}
                    value={conversationTitle}
                    onChange={(e) => setConversationTitle(e.target.value)}
                    placeholder="A project, a plan, a question…"
                  />
                </label>
                <button
                  className="secondary"
                  disabled={busy || demo}
                  onClick={startConversation}
                >
                  Start a saved conversation
                </button>
              </>
            )}
          </details>
          <label>
            How can Apollo help?
            <select
              disabled={busy}
              value={mode}
              onChange={(e) => setMode(e.target.value as ApolloMode)}
            >
              {apolloModes.map((m) => (
                <option value={m} key={m}>
                  {modeLabels[m]}
                </option>
              ))}
            </select>
          </label>
          <details className="apollo-preferences">
            <summary>Make this conversation yours</summary>
            <p className="muted">
              These choices apply while this panel is open. They never change
              who can see your information.
            </p>
            <div className="apollo-controls">
              {(
                [
                  [
                    "approach",
                    "What would help?",
                    [
                      ["adaptive", "Follow my lead"],
                      ["listen", "Listen first"],
                      ["plan", "Help me plan"],
                      ["teach", "Explain it to me"],
                    ],
                  ],
                  [
                    "tone",
                    "Coaching tone",
                    [
                      ["balanced", "Warm & candid"],
                      ["gentle", "Gentle"],
                      ["direct", "Direct"],
                    ],
                  ],
                  [
                    "depth",
                    "Response depth",
                    [
                      ["concise", "Keep it short"],
                      ["balanced", "Balanced"],
                      ["deep", "Go deeper"],
                    ],
                  ],
                  [
                    "language",
                    "Response language",
                    [
                      ["auto", "Follow my language"],
                      ["en", "English"],
                      ["pt-BR", "Português (Brasil)"],
                    ],
                  ],
                ] as const
              ).map(([key, label, options]) => (
                <label key={key}>
                  {label}
                  <select
                    disabled={busy}
                    value={preferences[key]}
                    onChange={(e) =>
                      setPreferences({ ...preferences, [key]: e.target.value })
                    }
                  >
                    {options.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </details>
          <details className="apollo-principles">
            <summary>What Apollo stands for</summary>
            <p className="muted">
              One identity, many ways to help. You keep the final say.
            </p>
            <ol>
              {apolloPrinciples.map(([name, description]) => (
                <li key={name}>
                  <strong>{name}.</strong> {description}
                </li>
              ))}
            </ol>
            <p className="muted">
              Apollo can use the memories and app areas you enable below, along
              with selected entries and recent turns from a saved conversation.
              Recall is selective. Teachings stay under your control; Apollo
              cannot send, schedule, or change a teaching himself.
            </p>
          </details>
          </details>
          <details className="draft-guide"><summary>Find my words · a private writing guide</summary>
            <span className="eyebrow">A GUIDED START · NO AI REQUIRED</span>
            <h3>What would you like them to understand?</h3>
            <ol>
              <li>What happened, without guessing their intent?</li>
              <li>What matters to you about it?</li>
              <li>Would you like listening, clarity, or a next step?</li>
            </ol>
            <button
              className="text-button"
              onClick={() =>
                onDraft({
                  kind: "journal",
                  title: "Finding my words",
                  body: `What happened:\n${message}\n\nWhat matters to me:\n\nWhat I would like to ask:\n\nA draft in my own words:\n`,
                  visibility: "private",
                })
              }
            >
              Open a private draft <Copy size={15} />
            </button>
          </details>
        </div>
      )}
      <CommandDock active="apollo" onNavigate={onNavigate} />
    </Modal>
  );
}
