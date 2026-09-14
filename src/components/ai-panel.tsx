"use client";
import { useState } from "react";
import { Sparkles, Lock, Mic, ArrowUp, Copy } from "lucide-react";
import { Modal } from "./editor";
import type { LifeRecord, RecordInput } from "@/lib/model";
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
  userId,
  records,
  demo,
  onClose,
  request,
  onDraft,
}: {
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
        }),
      });
      setResult(data.text as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Apollo" onClose={onClose} wide>
      <div className="ai-panel">
        <div className="ai-emblem">
          <Sparkles size={26} />
        </div>
        <p className="lead">
          Your AI coach, companion, and thinking partner. Faith, strength,
          wellbeing, and everything you’re building.
        </p>
        <div className="segmented">
          <button
            disabled={busy}
            aria-pressed={context === "private"}
            onClick={() => {
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
            These choices apply while this panel is open. They never change who
            can see your information.
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
            Apollo sees your current message and the entries you select. This
            chat does not automatically read your workouts, nutrition,
            protocols, or previous conversations, and cannot schedule or send
            anything.
          </p>
        </details>
        <form onSubmit={send}>
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
          <details>
            <summary>Choose context · {selected.length} entries</summary>
            <p className="muted">
              Only selected entries are sent. No hidden memory is added.
            </p>
            {eligible.slice(0, 40).map((r) => (
              <label className="check-label context-item" key={r.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  disabled={
                    busy || (!selected.includes(r.id) && selected.length >= 12)
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
            Send my message and selected entries to the configured AI provider.
            Its data policies apply.
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
    </Modal>
  );
}
