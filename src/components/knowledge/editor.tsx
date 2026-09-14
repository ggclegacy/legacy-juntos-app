"use client";
import { useState } from "react";
import {
  topics,
  topicLabels,
  origins,
  originLabels,
  documentInputSchema,
  safeSourceUrl,
  type KnowledgeInput,
  type KnowledgeDocument,
} from "@/lib/ai/knowledge/model";
import type { Member } from "@/lib/model";
export function KnowledgeEditor({
  initial,
  members,
  userId,
  busy,
  onSave,
  onCancel,
}: {
  initial: KnowledgeInput | KnowledgeDocument;
  members: Member[];
  userId: string;
  busy: boolean;
  onSave: (v: KnowledgeInput) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<KnowledgeInput>(() => {
      const {
        title,
        content,
        topic,
        origin,
        visibility,
        recipient_id,
        status,
        references,
        source_name,
        published_on,
        review_on,
        notes,
      } = initial;
      return {
        title,
        content,
        topic,
        origin,
        visibility,
        recipient_id,
        status,
        references,
        source_name,
        published_on,
        review_on,
        notes,
      };
    }),
    [reviewed, setReviewed] = useState(false),
    [error, setError] = useState(""),
    [refTitle, setRefTitle] = useState(""),
    [refUrl, setRefUrl] = useState("");
  function update(p: Partial<KnowledgeInput>) {
    setDraft((old) => ({ ...old, ...p }));
    setReviewed(false);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (draft.status === "active" && !reviewed) {
      setError("Review the content and audience before activating.");
      return;
    }
    const result = documentInputSchema.safeParse(draft);
    if (!result.success) {
      setError("Check the required fields, references, dates and audience.");
      return;
    }
    onSave(result.data);
  }
  return (
    <form className="knowledge-editor" onSubmit={submit}>
      <div className="knowledge-section-heading">
        <span className="eyebrow">YOUR REVIEW</span>
        <h3>
          {"id" in initial
            ? "Refine the knowledge."
            : "Something worth understanding."}
        </h3>
      </div>
      <label>
        Document title
        <input
          required
          maxLength={180}
          disabled={busy}
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </label>
      <div className="knowledge-form-grid">
        <label>
          Topic shelf
          <select
            value={draft.topic}
            disabled={busy}
            onChange={(e) =>
              update({ topic: e.target.value as KnowledgeInput["topic"] })
            }
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {topicLabels[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source type
          <select
            value={draft.origin}
            disabled={busy}
            onChange={(e) =>
              update({ origin: e.target.value as KnowledgeInput["origin"] })
            }
          >
            {origins.map((o) => (
              <option key={o} value={o}>
                {originLabels[o]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Document content
        <textarea
          required
          rows={10}
          maxLength={60000}
          value={draft.content}
          disabled={busy}
          onChange={(e) => update({ content: e.target.value })}
        />
      </label>
      <small>{draft.content.length.toLocaleString()} / 60,000 characters</small>
      <label>
        Source or original filename
        <input
          maxLength={240}
          disabled={busy}
          value={draft.source_name}
          onChange={(e) => update({ source_name: e.target.value })}
        />
      </label>
      <label>
        Limitations and context
        <textarea
          maxLength={2000}
          rows={3}
          value={draft.notes}
          disabled={busy}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Who does this apply to? What is missing or uncertain?"
        />
      </label>
      <div className="knowledge-form-grid">
        <label>
          Publication date
          <input
            type="date"
            value={draft.published_on ?? ""}
            disabled={busy}
            onChange={(e) => update({ published_on: e.target.value || null })}
          />
        </label>
        <label>
          Review again on
          <input
            type="date"
            value={draft.review_on ?? ""}
            disabled={busy}
            onChange={(e) => update({ review_on: e.target.value || null })}
          />
        </label>
      </div>
      <details className="apollo-preferences">
        <summary>Source references · {draft.references.length}</summary>
        {draft.references.map((r, i) => (
          <div className="knowledge-reference-row" key={`${r.url}:${i}`}>
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              {r.title}
            </a>
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() =>
                update({
                  references: draft.references.filter((_, n) => n !== i),
                })
              }
            >
              Remove reference {i + 1}
            </button>
          </div>
        ))}
        <label>
          Reference title
          <input
            value={refTitle}
            disabled={busy}
            maxLength={300}
            onChange={(e) => setRefTitle(e.target.value)}
          />
        </label>
        <label>
          Reference URL
          <input
            type="url"
            value={refUrl}
            disabled={busy}
            maxLength={2000}
            onChange={(e) => setRefUrl(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="secondary"
          disabled={
            busy ||
            draft.references.length >= 20 ||
            !refTitle.trim() ||
            !safeSourceUrl(refUrl)
          }
          onClick={() => {
            update({
              references: [
                ...draft.references,
                { title: refTitle.trim(), url: refUrl },
              ],
            });
            setRefTitle("");
            setRefUrl("");
          }}
        >
          Add reference
        </button>
      </details>
      <div className="knowledge-form-grid">
        <label>
          Document audience
          <select
            value={
              draft.visibility === "recipient"
                ? (draft.recipient_id ?? "private")
                : draft.visibility
            }
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value;
              update(
                v === "private" || v === "shared"
                  ? { visibility: v, recipient_id: null }
                  : { visibility: "recipient", recipient_id: v },
              );
            }}
          >
            <option value="private">Private to me</option>
            <option value="shared">Juntos · shared</option>
            {members
              .filter((m) => m.user_id !== userId)
              .map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  Share with {m.display_name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Knowledge state
          <select
            value={draft.status}
            disabled={busy}
            onChange={(e) =>
              update({ status: e.target.value as KnowledgeInput["status"] })
            }
          >
            <option value="draft">Draft · excluded from recall</option>
            <option value="active">Active · available to Apollo</option>
            <option value="archived">Archived · excluded from recall</option>
          </select>
        </label>
      </div>
      <p className="privacy-note">
        Drafts and archives are visible only to you. Active documents follow the
        audience above. “Reviewed” records your decision to use this content; it
        is not professional or scientific verification.
      </p>
      {draft.status === "active" && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={reviewed}
            disabled={busy}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          I reviewed the wording, sources and audience. Make these passages
          available to Apollo.
        </label>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="button-row">
        <button
          className="primary"
          disabled={busy || (draft.status === "active" && !reviewed)}
        >
          {busy
            ? "Saving…"
            : draft.status === "active"
              ? "Save reviewed knowledge"
              : "Save document"}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel review
        </button>
      </div>
    </form>
  );
}
