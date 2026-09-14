"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Plus,
  ExternalLink,
  Archive,
  Trash2,
  History,
  Search,
} from "lucide-react";
import type { Member } from "@/lib/model";
import {
  newKnowledge,
  topics,
  topicLabels,
  originLabels,
  safeSourceUrl,
  type KnowledgeDocument,
  type KnowledgeInput,
  type KnowledgeTopic,
} from "@/lib/ai/knowledge/model";
import { knowledgeStarters } from "@/lib/ai/knowledge/starters";
import { KnowledgeResearch, type KnowledgeRequest } from "./research";
import { KnowledgeImporter } from "./importer";
import { KnowledgeEditor } from "./editor";
type Version = {
  revision: number;
  snapshot: KnowledgeDocument;
  created_at: string;
};
export function KnowledgeWorkspace({
  request,
  userId,
  members,
  demo,
  onBack,
}: {
  request: KnowledgeRequest;
  userId: string;
  members: Member[];
  demo: boolean;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<
      "library" | "import" | "research" | "starters"
    >("library"),
    [topic, setTopic] = useState<KnowledgeTopic | "">(""),
    [status, setStatus] = useState(""),
    [q, setQ] = useState(""),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [items, setItems] = useState<KnowledgeDocument[]>([]),
    [draft, setDraft] = useState<KnowledgeInput | KnowledgeDocument | null>(
      null,
    ),
    [view, setView] = useState<KnowledgeDocument | null>(null),
    [versions, setVersions] = useState<Version[] | null>(null),
    [demoVersions, setDemoVersions] = useState<Record<string, Version[]>>({}),
    [deleting, setDeleting] = useState<KnowledgeDocument | null>(null);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (demo) return;
    let current = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ offset: String(offset) });
      if (topic) params.set("topic", topic);
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      request(`/api/ai/knowledge?${params}`, {
        headers: { "x-expected-user": userId },
      })
        .then((data) => {
          if (current) {
            setItems(data.items as KnowledgeDocument[]);
            setMore(!!data.hasMore);
          }
        })
        .catch((e) => {
          if (current) setError(e.message);
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [demo, offset, topic, status, q, refresh, request, userId]);
  const shown = demo
    ? items.filter(
        (d) =>
          (!topic || d.topic === topic) &&
          (!status || d.status === status) &&
          d.title.toLowerCase().includes(q.toLowerCase()),
      )
    : items;
  async function act(payload: Record<string, unknown>) {
    return request("/api/ai/knowledge", {
      method: "POST",
      headers: { "x-expected-user": userId },
      body: JSON.stringify(payload),
    });
  }
  function review(d: KnowledgeInput | KnowledgeDocument) {
    setDraft(d);
    setView(null);
    setVersions(null);
    setDeleting(null);
    setError("");
    setNotice("");
  }
  async function save(input: KnowledgeInput) {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      let item: KnowledgeDocument;
      const existing = "id" in draft ? draft : null;
      if (demo) {
        const now = new Date().toISOString();
        item = {
          ...input,
          id: existing?.id ?? crypto.randomUUID(),
          owner_id: userId,
          workspace_id: "preview",
          revision: (existing?.revision ?? 0) + 1,
          created_at: existing?.created_at ?? now,
          updated_at: now,
          reviewed_at: input.status === "active" ? now : null,
        };
        setItems((old) => [item, ...old.filter((d) => d.id !== item.id)]);
        setDemoVersions((old) => ({
          ...old,
          [item.id]: [
            { revision: item.revision, snapshot: item, created_at: now },
            ...(old[item.id] ?? []),
          ],
        }));
      } else
        item = (
          await act(
            existing
              ? {
                  action: "update",
                  id: existing.id,
                  revision: existing.revision,
                  input,
                }
              : { action: "create", input },
          )
        ).item as KnowledgeDocument;
      setDraft(null);
      setView(item);
      setRefresh((n) => n + 1);
      setTab("library");
      setNotice(
        demo
          ? "Preview document saved for this visit only."
          : input.status === "active"
            ? "Knowledge saved. Active passages are searchable; prepare them again for meaning-based recall."
            : "Document saved outside Apollo recall.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save knowledge.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      if (!demo)
        await act({
          action: "delete",
          id: deleting.id,
          revision: deleting.revision,
        });
      setItems((old) => old.filter((d) => d.id !== deleting.id));
      setDemoVersions((old) => {
        const next = { ...old };
        delete next[deleting.id];
        return next;
      });
      setDeleting(null);
      setView(null);
      setVersions(null);
      setRefresh((n) => n + 1);
      setNotice("Document and its passages removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete document.");
    } finally {
      setBusy(false);
    }
  }
  async function history(d: KnowledgeDocument) {
    setBusy(true);
    setError("");
    try {
      setVersions(
        demo
          ? (demoVersions[d.id] ?? [])
          : ((
              await request(`/api/ai/knowledge?history=${d.id}`, {
                headers: { "x-expected-user": userId },
              })
            ).items as Version[]),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="knowledge-workspace">
      <button className="text-button" onClick={onBack} disabled={busy}>
        <ArrowLeft size={16} />
        Back to Apollo
      </button>
      <header className="knowledge-hero">
        <BookOpen size={30} />
        <span className="eyebrow">APOLLO · KNOWLEDGE & RESEARCH</span>
        <h3>Depth that grows with you.</h3>
        <p>Your sources. Your standards. A clearer understanding.</p>
      </header>
      {demo && (
        <p className="privacy-note">
          Sample workspace · documents last for this library visit only. Sign in
          to store real knowledge privately across devices.
        </p>
      )}
      <nav className="knowledge-tabs" aria-label="Knowledge views">
        {(
          [
            ["library", "My library"],
            ["import", "Import a document"],
            ["research", "Research"],
            ["starters", "Starter references"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key && !draft}
            disabled={busy || !!draft}
            onClick={() => {
              setTab(key);
              setView(null);
              setVersions(null);
              setError("");
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="privacy-note">
          {notice}
        </p>
      )}
      {draft ? (
        <KnowledgeEditor
          key={"id" in draft ? `${draft.id}:${draft.revision}` : "new"}
          initial={draft}
          members={members}
          userId={userId}
          busy={busy}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      ) : tab === "import" ? (
        <KnowledgeImporter
          request={request}
          userId={userId}
          demo={demo}
          onDraft={review}
        />
      ) : tab === "research" ? (
        <KnowledgeResearch
          request={request}
          userId={userId}
          demo={demo}
          onDraft={review}
        />
      ) : tab === "starters" ? (
        <section>
          <h3>A considered starting point.</h3>
          <p className="muted">
            Short summaries and workflows to review. Adding a starter opens a
            private draft; Apollo will use it only after you activate it.
          </p>
          <div className="knowledge-grid">
            {knowledgeStarters.map((s) => (
              <article className="knowledge-card" key={s.title}>
                <span className="eyebrow">{topicLabels[s.topic]}</span>
                <h4>{s.title}</h4>
                <p>{s.content.split("\n")[0]}</p>
                <small>{s.source_name}</small>
                <div className="knowledge-reference-list">
                  {s.references.map((r) => (
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
                  onClick={() =>
                    review({ ...s, references: [...s.references] })
                  }
                >
                  Review this starter
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="knowledge-toolbar">
            <label>
              <Search size={16} />
              Search document titles
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOffset(0);
                }}
                placeholder="A coach plan, a reference, a lesson…"
              />
            </label>
            <button
              className="primary"
              onClick={() => review(newKnowledge(topic || "training"))}
            >
              <Plus size={16} />
              Add knowledge
            </button>
          </div>
          <div className="knowledge-form-grid">
            <label>
              Filter by topic
              <select
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value as KnowledgeTopic | "");
                  setOffset(0);
                }}
              >
                <option value="">Every shelf</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {topicLabels[t]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Filter by state
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">Every state</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          {loading ? (
            <p role="status">Opening your library…</p>
          ) : !shown.length ? (
            <div className="knowledge-empty">
              <FileText size={32} />
              <h4>
                {q || topic || status
                  ? "No matching documents."
                  : "Build a library with meaning."}
              </h4>
              <p>
                Add your own notes, import a coach document, or review a starter
                reference.
              </p>
            </div>
          ) : (
            <div className="knowledge-grid">
              {shown.map((d) => (
                <button
                  className="knowledge-card knowledge-document"
                  key={d.id}
                  onClick={() => {
                    setView(d);
                    setVersions(null);
                    setDeleting(null);
                  }}
                >
                  <span className="eyebrow">{topicLabels[d.topic]}</span>
                  <h4>{d.title}</h4>
                  <p>
                    {d.content.slice(0, 160)}
                    {d.content.length > 160 ? "…" : ""}
                  </p>
                  <small>{originLabels[d.origin]}</small>
                  <div className="knowledge-badges">
                    <span>{d.status}</span>
                    <span>
                      {d.visibility === "private"
                        ? "Private to me"
                        : d.visibility === "shared"
                          ? "Juntos"
                          : "Named recipient"}
                    </span>
                    {d.review_on &&
                      d.review_on < new Date().toISOString().slice(0, 10) && (
                        <span>Review due</span>
                      )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {!demo && (offset > 0 || more) && (
            <div className="button-row">
              <button
                className="secondary"
                disabled={!offset || loading}
                onClick={() => setOffset((n) => Math.max(0, n - 30))}
              >
                Previous documents
              </button>
              <button
                className="secondary"
                disabled={!more || loading}
                onClick={() => setOffset((n) => n + 30)}
              >
                More documents
              </button>
            </div>
          )}
          {view && (
            <article className="knowledge-detail">
              <button
                className="text-button"
                onClick={() => {
                  setView(null);
                  setVersions(null);
                }}
              >
                Close document
              </button>
              <span className="eyebrow">
                {originLabels[view.origin]} · REVISION {view.revision}
              </span>
              <h3>{view.title}</h3>
              <p className="muted">
                {view.source_name || "Source not specified"} · {view.status} ·{" "}
                {view.visibility}.{" "}
                {view.published_on ? `Published ${view.published_on}.` : ""}{" "}
                {view.review_on ? `Review on ${view.review_on}.` : ""}
              </p>
              <div className="knowledge-document-content">{view.content}</div>
              {view.notes && <p className="privacy-note">{view.notes}</p>}
              <div className="knowledge-reference-list">
                {view.references
                  .filter((r) => safeSourceUrl(r.url))
                  .map((r, i) => (
                    <a
                      key={`${r.url}:${i}`}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} />
                      {r.title}
                    </a>
                  ))}
              </div>
              {view.owner_id === userId && (
                <div className="button-row">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => review(view)}
                  >
                    Edit knowledge
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      review({
                        ...view,
                        status:
                          view.status === "archived" ? "draft" : "archived",
                      })
                    }
                  >
                    <Archive size={15} />
                    {view.status === "archived"
                      ? "Return to draft"
                      : "Archive document"}
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => history(view)}
                  >
                    <History size={15} />
                    Revision history
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setDeleting(view)}
                  >
                    <Trash2 size={15} />
                    Delete document
                  </button>
                </div>
              )}
              {deleting && (
                <div className="privacy-note">
                  <p>
                    Delete “{deleting.title}”, its passages and revision
                    history? This cannot be undone.
                  </p>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={remove}
                  >
                    Delete permanently
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setDeleting(null)}
                  >
                    Keep document
                  </button>
                </div>
              )}
              {versions && (
                <section>
                  <h4>Latest 20 revisions · visible only to you</h4>
                  {versions.map((v) => (
                    <details key={v.revision}>
                      <summary>
                        Revision {v.revision} ·{" "}
                        {new Date(v.created_at).toLocaleString()} ·{" "}
                        {v.snapshot.status}
                      </summary>
                      <p className="knowledge-document-content">
                        {v.snapshot.content}
                      </p>
                      <p className="muted">{v.snapshot.notes}</p>
                    </details>
                  ))}
                </section>
              )}
            </article>
          )}
        </>
      )}
    </section>
  );
}
