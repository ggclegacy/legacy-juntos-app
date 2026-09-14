"use client";
import { useState } from "react";
import { Sparkles, Lock, Mic, ArrowUp, Copy } from "lucide-react";
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
}: {
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
  const [library, setLibrary] = useState(false),
    [teaching, setTeaching] = useState("");
  const [recallSources, setRecallSources] = useState<RecallKind[]>(["memory"]);
  const [semanticRecall, setSemanticRecall] = useState(false);
  const [sources, setSources] = useState<MemorySource[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [conversationTitle, setConversationTitle] = useState("");
  const [hasOlder, setHasOlder] = useState(false);
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
    setBusy(true);
    setError("");
    setResult("");
    try {
      const data = await request("/api/ai", {
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
      setError(e instanceof Error ? e.message : "AI is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Apollo" onClose={onClose} wide>
      {library ? (
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
        <div className="ai-panel">
          <div className="ai-emblem">
            <Sparkles size={26} />
          </div>
          <p className="lead">
            Your AI coach, companion, and thinking partner. Faith, strength,
            wellbeing, and everything you’re building.
          </p>
          <div className="apollo-memory-entry">
            <div>
              <span className="eyebrow">A MEMORY YOU CAN SHAPE</span>
              <p>Teach Apollo. Return to what matters. Keep growing.</p>
            </div>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                setTeaching("");
                setLibrary(true);
              }}
            >
              Memory & learning
            </button>
          </div>
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
          <form onSubmit={send}>
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
            <label>
              Your starting point
              <textarea
                required
                disabled={busy}
                maxLength={6000}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={modeStarters[mode]}
              />
            </label>
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
                <Mic size={17} /> Voice
              </button>
              <button className="primary" disabled={!consent || busy || demo}>
                {busy ? "Thinking…" : "Ask Apollo"}
                <ArrowUp size={17} />
              </button>
            </div>
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
          {result && (
            <section className="ai-result">
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
                      </small>
                      <p className="apollo-memory-content">{s.content}</p>
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
          <section className="draft-guide">
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
          </section>
        </div>
      )}
    </Modal>
  );
}
