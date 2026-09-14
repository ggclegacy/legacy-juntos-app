"use client";
import { useState } from "react";
import type { LearningSuggestion } from "@/lib/ai/learning";
export function ApolloLearning({
  initialText,
  demo,
  userId,
  request,
  onReview,
}: {
  initialText: string;
  demo: boolean;
  userId: string;
  request: (
    path: string,
    init?: RequestInit,
  ) => Promise<Record<string, unknown>>;
  onReview: (s: LearningSuggestion) => void;
}) {
  const [message, setMessage] = useState(initialText),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [suggestions, setSuggestions] = useState<LearningSuggestion[]>([]),
    [reviewed, setReviewed] = useState(false);
  async function review() {
    setBusy(true);
    setError("");
    setSuggestions([]);
    setReviewed(false);
    try {
      const data = await request("/api/ai/intelligence", {
        method: "POST",
        headers: { "x-expected-user": userId },
        body: JSON.stringify({ action: "suggest", message, consent }),
      });
      setSuggestions(data.suggestions as LearningSuggestion[]);
      setReviewed(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not review this statement.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="apollo-preferences" open={!!initialText}>
      <summary>Help Apollo learn from what you say</summary>
      <p className="muted">
        Private review space. Apollo can suggest a teaching or flag a possible
        update. Suggestions are temporary until you review and save them.
      </p>
      <label>
        Your words
        <textarea
          value={message}
          maxLength={6000}
          rows={4}
          disabled={busy}
          onChange={(e) => {
            setMessage(e.target.value);
            setSuggestions([]);
            setReviewed(false);
            setConsent(false);
          }}
          placeholder="Something I want Apollo to understand…"
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy || demo}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Send these words and relevant teachings I authored to OpenAI for private
        comparison.
      </label>
      <button
        type="button"
        className="secondary"
        disabled={demo || busy || !consent || !message.trim()}
        onClick={review}
      >
        {busy ? "Reading your words…" : "Suggest what to remember"}
      </button>
      {demo && (
        <p className="muted">
          AI suggestions require a connected account. You can still write a
          teaching yourself.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {reviewed && !suggestions.length && (
        <p role="status">
          No supported teaching was found. You can still write one yourself.
        </p>
      )}
      {suggestions.map((s, i) => (
        <article className="apollo-source" key={`${s.title}:${i}`}>
          <h4>{s.title}</h4>
          <blockquote>{s.quote}</blockquote>
          <p>{s.content}</p>
          <p className="muted">{s.reason}</p>
          {s.existing && (
            <p className="privacy-note">
              Possible update to “{s.existing.title}” · currently{" "}
              {s.existing.visibility}. Existing teaching: {s.existing.content}
            </p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              onClick={() => onReview(s)}
            >
              {s.existing ? "Review correction" : "Review new teaching"}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setSuggestions((old) => old.filter((_, index) => index !== i))
              }
            >
              Dismiss
            </button>
          </div>
        </article>
      ))}
    </details>
  );
}
