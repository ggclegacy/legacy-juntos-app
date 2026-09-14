"use client";
import { useState, type ReactNode } from "react";
import { Search, ExternalLink } from "lucide-react";
import {
  topics,
  topicLabels,
  safeSourceUrl,
  researchToDraft,
  type KnowledgeTopic,
  type KnowledgeInput,
  type ResearchResult,
} from "@/lib/ai/knowledge/model";
export type KnowledgeRequest = (
  path: string,
  init?: RequestInit,
) => Promise<Record<string, unknown>>;
export function CitedResearch({ result }: { result: ResearchResult }) {
  const pieces: ReactNode[] = [];
  let cursor = 0;
  for (const [i, c] of result.citations.entries()) {
    if (c.start < cursor || c.end > result.text.length || !safeSourceUrl(c.url))
      continue;
    pieces.push(result.text.slice(cursor, c.start));
    pieces.push(
      <a
        key={`${c.start}:${i}`}
        href={c.url}
        target="_blank"
        rel="noopener noreferrer"
        title={c.title}
      >
        {result.text.slice(c.start, c.end) || `[${i + 1}]`}
      </a>,
    );
    cursor = c.end;
  }
  pieces.push(result.text.slice(cursor));
  return <div className="knowledge-answer">{pieces}</div>;
}
export function KnowledgeResearch({
  request,
  userId,
  demo,
  onDraft,
}: {
  request: KnowledgeRequest;
  userId: string;
  demo: boolean;
  onDraft: (d: KnowledgeInput) => void;
}) {
  const [question, setQuestion] = useState(""),
    [topic, setTopic] = useState<KnowledgeTopic>("training"),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<ResearchResult | null>(null);
  async function research(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await request("/api/ai/knowledge/research", {
        method: "POST",
        headers: { "x-expected-user": userId },
        body: JSON.stringify({ question, topic, consent }),
      });
      setResult(data as unknown as ResearchResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="knowledge-section-heading">
        <Search size={22} />
        <h3>Curiosity, with receipts.</h3>
      </div>
      <p className="muted">
        Explore a question using published sources. Only the question below goes
        to research; Apollo does not attach your memory, documents or chat
        history.
      </p>
      <form onSubmit={research}>
        <label>
          Research area
          <select
            value={topic}
            disabled={busy}
            onChange={(e) => {
              setTopic(e.target.value as KnowledgeTopic);
              setResult(null);
              setConsent(false);
            }}
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {topicLabels[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Your research question
          <textarea
            rows={4}
            maxLength={2000}
            minLength={5}
            required
            value={question}
            disabled={busy}
            onChange={(e) => {
              setQuestion(e.target.value);
              setResult(null);
              setConsent(false);
            }}
            placeholder="What does recent research say about monitoring fatigue during resistance training?"
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={consent}
            disabled={busy || demo}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Send this question to OpenAI and its web-search service. I have
          removed personal details I do not want searched.
        </label>
        <button
          className="primary"
          disabled={busy || demo || !consent || question.trim().length < 5}
        >
          {busy ? "Reading the evidence…" : "Research with Apollo"}
        </button>
      </form>
      {demo && (
        <p className="privacy-note">
          Connect your account to use live research. Preview mode does not
          simulate research results.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <article className="knowledge-research-result">
          <span className="eyebrow">AI RESEARCH · REVIEW THE SOURCES</span>
          <CitedResearch result={result} />
          <p className="muted">
            Searched {new Date(result.searchedAt).toLocaleString()}. Citation
            presence does not guarantee a claim is correct.
          </p>
          <div className="knowledge-reference-list">
            {result.references.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                {r.title}
              </a>
            ))}
          </div>
          <button
            className="secondary"
            onClick={() => onDraft(researchToDraft(result, question, topic))}
          >
            Review for my library
          </button>
        </article>
      )}
    </section>
  );
}
