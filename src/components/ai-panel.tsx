"use client";
import { useState } from "react";
import { Sparkles, Lock, Mic, ArrowUp, Copy } from "lucide-react";
import { Modal } from "./editor";
import type { LifeRecord, RecordInput } from "@/lib/model";
export function AiPanel({
  records,
  demo,
  onClose,
  request,
  onDraft,
}: {
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
    [mode, setMode] = useState<"bridge" | "companion">("bridge");
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
        body: JSON.stringify({
          message,
          context,
          mode,
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
    <Modal title="A little space to think." onClose={onClose} wide>
      <div className="ai-panel">
        <div className="ai-emblem">
          <Sparkles size={26} />
        </div>
        <p className="lead">
          Find your words. Explore an idea. Take the next step with intention.
        </p>
        <div className="segmented">
          <button
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
          How can this space help?
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "bridge" | "companion")}
          >
            <option value="bridge">Communication bridge</option>
            <option value="companion">Planning & reflection</option>
          </select>
        </label>
        <form onSubmit={send}>
          <label>
            Your starting point
            <textarea
              required
              maxLength={6000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I want to explain something, but I’m still finding the words…"
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
                  disabled={!selected.includes(r.id) && selected.length >= 12}
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
              {busy ? "Thinking…" : "Ask Juntos"}
              <ArrowUp size={17} />
            </button>
          </div>
        </form>
        {demo && (
          <p className="muted">
            Sample workspace · live AI is not connected. Try the private
            drafting guide below.
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
