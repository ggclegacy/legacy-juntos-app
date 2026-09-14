"use client";
import { ApolloLearning } from "./apollo-learning";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Brain,
  History,
  Plus,
  Search,
  Trash2,
  Pencil,
  Pin,
  ArrowLeft,
  Download,
} from "lucide-react";
import type { Member } from "@/lib/model";
import {
  memoryCategories,
  type ApolloMemory,
  type MemoryInput,
  type Conversation,
} from "@/lib/ai/memory";
type RequestFn = (
  path: string,
  init?: RequestInit,
) => Promise<Record<string, unknown>>;
const fresh = (): MemoryInput => ({
  title: "",
  content: "",
  category: "fact",
  visibility: "private",
  recipient_id: null,
  status: "active",
  pinned: false,
  effective_on: null,
  source_note: "",
  source_url: "",
});
export function ApolloMemoryLibrary({
  members,
  userId,
  demo,
  request,
  onConversation,
  onBack,
  initialTeaching = "",
}: {
  members: Member[];
  userId: string;
  demo: boolean;
  request: RequestFn;
  onConversation: (c: Conversation) => void;
  onBack: () => void;
  initialTeaching?: string;
}) {
  const [tab, setTab] = useState<"memories" | "conversations">("memories");
  const [items, setItems] = useState<ApolloMemory[]>([]),
    [conversations, setConversations] = useState<Conversation[]>([]);
  const [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [draft, setDraft] = useState<MemoryInput | null>(
      initialTeaching ? { ...fresh(), content: initialTeaching } : null,
    ),
    [editing, setEditing] = useState<ApolloMemory | null>(null);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<ApolloMemory | Conversation | null>(
      null,
    ),
    [history, setHistory] = useState<
      { revision: number; snapshot: ApolloMemory }[] | null
    >(null);
  useEffect(() => {
    if (demo) return;
    let current = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      request(
        `/api/ai/memory?type=${tab}&q=${encodeURIComponent(query)}&offset=${offset}`,
        { headers: { "x-expected-user": userId } },
      )
        .then((data) => {
          if (current) {
            if (tab === "memories") setItems(data.items as ApolloMemory[]);
            else setConversations(data.items as Conversation[]);
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
  }, [demo, offset, query, refresh, request, tab, userId]);
  async function act(payload: Record<string, unknown>) {
    return request("/api/ai/memory", {
      method: "POST",
      headers: { "x-expected-user": userId },
      body: JSON.stringify(payload),
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      let item: ApolloMemory;
      if (demo)
        item = {
          ...draft,
          id: editing?.id ?? crypto.randomUUID(),
          owner_id: userId,
          workspace_id: "sample",
          revision: (editing?.revision ?? 0) + 1,
          created_at: editing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      else
        item = (
          await act(
            editing
              ? {
                  action: "correct",
                  id: editing.id,
                  revision: editing.revision,
                  input: draft,
                }
              : { action: "teach", input: draft },
          )
        ).item as ApolloMemory;
      setItems((old) => [item, ...old.filter((m) => m.id !== item.id)]);
      setDraft(null);
      setEditing(null);
      setRefresh((v) => v + 1);
      setNotice(
        demo
          ? "Preview teaching saved for this library visit only. Connect an account for durable memory."
          : "Teaching saved. Apollo can recall the active version when memory is enabled.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save teaching.");
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
          action: "content" in deleting ? "forget" : "delete_conversation",
          id: deleting.id,
          revision: deleting.revision,
        });
      setItems((old) => old.filter((m) => m.id !== deleting.id));
      setConversations((old) => old.filter((c) => c.id !== deleting.id));
      setDeleting(null);
      setRefresh((v) => v + 1);
      setNotice(
        "Deleted from the library. Independently saved copies are managed separately.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }
  const shown = demo
    ? items.filter((m) =>
        (m.title + " " + m.content).toLowerCase().includes(query.toLowerCase()),
      )
    : items;
  return (
    <section className="apollo-library">
      <button className="text-button" disabled={busy} onClick={onBack}>
        <ArrowLeft size={16} /> Back to Apollo
      </button>
      <div className="apollo-memory-hero">
        <Brain size={32} />
        <span className="eyebrow">KNOWLEDGE THAT GROWS WITH YOU</span>
        <h3>Teach me your world.</h3>
        <p>
          The decisions, preferences, lessons, and ways you work. Keep them
          here. Refine them as life changes.
        </p>
      </div>
      {demo && (
        <p className="privacy-note">
          Preview only · teachings stay in this library visit. Your connected
          account stores them securely across devices.
        </p>
      )}
      <ApolloLearning
        initialText={initialTeaching}
        demo={demo}
        userId={userId}
        request={request}
        onReview={(s) => {
          setEditing(s.existing ?? null);
          const base = s.existing
            ? {
                title: s.existing.title,
                content: s.existing.content,
                category: s.existing.category,
                visibility: s.existing.visibility,
                recipient_id: s.existing.recipient_id,
                status: s.existing.status,
                pinned: s.existing.pinned,
                effective_on: s.existing.effective_on,
                source_note: s.existing.source_note,
                source_url: s.existing.source_url,
              }
            : fresh();
          setDraft({
            ...base,
            title: s.title,
            content: s.content,
            category: s.category,
            source_note: `User statement: ${s.quote}`.slice(0, 1000),
          });
          setNotice(
            "Review the wording and audience below, then save when it is right.",
          );
        }}
      />
      <div className="segmented">
        <button
          disabled={busy}
          aria-pressed={tab === "memories"}
          onClick={() => {
            setTab("memories");
            setOffset(0);
            setDeleting(null);
          }}
        >
          Knowledge
        </button>
        <button
          disabled={busy}
          aria-pressed={tab === "conversations"}
          onClick={() => {
            setTab("conversations");
            setOffset(0);
            setDeleting(null);
          }}
        >
          Conversations
        </button>
      </div>
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
      {tab === "memories" && (
        <>
          <div className="apollo-library-toolbar">
            <label>
              <Search size={15} /> Search knowledge
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOffset(0);
                }}
                placeholder="A project, preference, lesson…"
              />
            </label>
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                setDraft(fresh());
                setEditing(null);
                setHistory(null);
                setNotice("");
              }}
            >
              <Plus size={17} />
              Teach Apollo
            </button>
          </div>
          {draft && (
            <form className="apollo-teaching" onSubmit={save}>
              <h4>
                {editing
                  ? "Correct this teaching"
                  : "Something worth remembering"}
              </h4>
              <label>
                Title
                <input
                  required
                  maxLength={180}
                  value={draft.title}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  placeholder="How we approach a new campaign"
                />
              </label>
              <label>
                What should Apollo learn?
                <textarea
                  required
                  maxLength={12000}
                  rows={7}
                  value={draft.content}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft({ ...draft, content: e.target.value })
                  }
                  placeholder="Tell Apollo in your own words. Include the context that matters."
                />
              </label>
              <div className="apollo-controls">
                <label>
                  Type
                  <select
                    value={draft.category}
                    disabled={busy}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        category: e.target.value as MemoryInput["category"],
                      })
                    }
                  >
                    {memoryCategories.map((c) => (
                      <option value={c} key={c}>
                        {c[0].toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Who can see this?
                  <select
                    value={draft.visibility}
                    disabled={busy}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        visibility: e.target.value as MemoryInput["visibility"],
                        recipient_id:
                          e.target.value === "recipient"
                            ? (members.find((m) => m.user_id !== userId)
                                ?.user_id ?? null)
                            : null,
                      })
                    }
                  >
                    <option value="private">Private to me</option>
                    <option value="shared">Shared · Juntos</option>
                    {members.some((m) => m.user_id !== userId) && (
                      <option value="recipient">Share with one person</option>
                    )}
                  </select>
                </label>
              </div>
              {draft.visibility === "recipient" && (
                <label>
                  Recipient
                  <select
                    value={draft.recipient_id ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      setDraft({ ...draft, recipient_id: e.target.value })
                    }
                  >
                    {members
                      .filter((m) => m.user_id !== userId)
                      .map((m) => (
                        <option value={m.user_id} key={m.user_id}>
                          {m.display_name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {draft.visibility === "shared" && (
                <p className="privacy-note">
                  Saving shares this exact teaching with your workspace. Only
                  you can correct or delete it.
                </p>
              )}
              <details>
                <summary>Source, timing & priority</summary>
                <label>
                  When did this become true?
                  <input
                    type="date"
                    value={draft.effective_on ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        effective_on: e.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  Source or context
                  <input
                    maxLength={1000}
                    value={draft.source_note}
                    onChange={(e) =>
                      setDraft({ ...draft, source_note: e.target.value })
                    }
                    placeholder="My own preference, coach notes, a project review…"
                  />
                </label>
                <label>
                  Reference link (optional)
                  <input
                    type="url"
                    maxLength={2000}
                    value={draft.source_url}
                    onChange={(e) =>
                      setDraft({ ...draft, source_url: e.target.value })
                    }
                  />
                </label>
                <p className="muted">
                  Links are saved as references. Apollo does not open or verify
                  them here.
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={draft.pinned}
                    onChange={(e) =>
                      setDraft({ ...draft, pinned: e.target.checked })
                    }
                  />
                  Prioritize this when memory is enabled
                </label>
                <label>
                  Status
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        status: e.target.value as "active" | "archived",
                      })
                    }
                  >
                    <option value="active">Active · eligible for recall</option>
                    <option value="archived">
                      Retired · excluded from recall
                    </option>
                  </select>
                </label>
              </details>
              <div className="ai-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setDraft(null);
                    setEditing(null);
                  }}
                >
                  Cancel
                </button>
                <button className="primary" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : editing
                      ? "Save correction"
                      : "Save teaching"}
                </button>
              </div>
            </form>
          )}
          {loading ? (
            <p role="status">Loading your knowledge…</p>
          ) : !shown.length && !draft ? (
            <div className="apollo-memory-empty">
              <BookOpen size={26} />
              <h4>
                {query
                  ? "No matching teachings"
                  : "Start with something that matters."}
              </h4>
              <p>
                Teach a preference, a decision, or how you like to work. You can
                update it whenever it changes.
              </p>
            </div>
          ) : null}
          {shown.map((m) => (
            <article className="apollo-memory-card" key={m.id}>
              <div className="apollo-memory-meta">
                <span>
                  {m.visibility === "shared"
                    ? "Juntos"
                    : m.visibility === "recipient"
                      ? "Named recipient"
                      : "Private"}{" "}
                  · {m.category} · {m.status}
                </span>
                {m.pinned && <Pin size={14} />}
              </div>
              <h4>{m.title}</h4>
              <p className="apollo-memory-content">{m.content}</p>
              <small>
                Updated {new Date(m.updated_at).toLocaleDateString()} · version{" "}
                {m.revision}
                {m.effective_on ? ` · effective ${m.effective_on}` : ""}
              </small>
              {m.source_note && (
                <p className="muted">Source: {m.source_note}</p>
              )}
              {m.source_url && (
                <a href={m.source_url} target="_blank" rel="noreferrer">
                  Reference
                </a>
              )}
              {m.owner_id === userId && (
                <div className="apollo-memory-actions">
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      const {
                        title,
                        content,
                        category,
                        visibility,
                        recipient_id,
                        status,
                        pinned,
                        effective_on,
                        source_note,
                        source_url,
                      } = m;
                      setDraft({
                        title,
                        content,
                        category,
                        visibility,
                        recipient_id,
                        status,
                        pinned,
                        effective_on,
                        source_note,
                        source_url,
                      });
                      setEditing(m);
                      setHistory(null);
                    }}
                  >
                    <Pencil size={14} />
                    Correct
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        setHistory(
                          demo
                            ? [{ revision: m.revision, snapshot: m }]
                            : ((
                                await request(
                                  `/api/ai/memory?type=versions&id=${m.id}`,
                                  { headers: { "x-expected-user": userId } },
                                )
                              ).items as {
                                revision: number;
                                snapshot: ApolloMemory;
                              }[]),
                        );
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Unavailable",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <History size={14} />
                    History
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setDeleting(m)}
                  >
                    <Trash2 size={14} />
                    Forget
                  </button>
                </div>
              )}
            </article>
          ))}
        </>
      )}
      {tab === "conversations" && (
        <>
          <p className="muted">
            Saved conversations stay private to you, including Juntos-context
            drafts. Start one from Apollo’s conversation controls.
          </p>
          {!loading && !conversations.length && (
            <div className="apollo-memory-empty">
              <History size={25} />
              <h4>No saved conversations yet.</h4>
              <p>
                Choose “Start a saved conversation” in Apollo to keep the thread
                going across visits.
              </p>
            </div>
          )}
          {conversations.map((c) => (
            <article className="apollo-memory-card" key={c.id}>
              <h4>{c.title}</h4>
              <p>
                {c.context === "shared"
                  ? "Juntos context · private draft"
                  : "Private context"}{" "}
                · {c.revision} turns
              </p>
              <div className="apollo-memory-actions">
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => onConversation(c)}
                >
                  Continue conversation
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setDeleting(c)}
                >
                  <Trash2 size={14} />
                  Delete conversation
                </button>
              </div>
            </article>
          ))}
        </>
      )}
      {history && (
        <section className="apollo-teaching">
          <h4>Revision history · only you</h4>
          <p className="muted">
            Showing the latest 30 versions. Earlier versions are retained; only
            the current active teaching is recalled.
          </p>
          {history.map((v) => (
            <details key={v.revision}>
              <summary>
                Version {v.revision} · {v.snapshot.title}
              </summary>
              <p className="apollo-memory-content">{v.snapshot.content}</p>
            </details>
          ))}
          <button className="secondary" onClick={() => setHistory(null)}>
            Close history
          </button>
        </section>
      )}
      {deleting && (
        <section
          className="apollo-teaching"
          role="group"
          aria-label="Confirm deletion"
        >
          <h4>Delete “{deleting.title}”?</h4>
          <p>
            {"content" in deleting
              ? "This removes the teaching and its revision history from active storage and recall."
              : "This removes the conversation and all its turns. Teachings you saved separately remain."}{" "}
            Backups, provider retention, and copies already shared are separate.
          </p>
          <div className="ai-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep it
            </button>
            <button className="primary" disabled={busy} onClick={remove}>
              Delete permanently
            </button>
          </div>
        </section>
      )}
      {!demo && (
        <div className="ai-actions">
          <button
            className="secondary"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((v) => Math.max(0, v - 30))}
          >
            Previous
          </button>
          <span className="muted">Page {offset / 30 + 1}</span>
          <button
            className="secondary"
            disabled={!more || loading}
            onClick={() => setOffset((v) => v + 30)}
          >
            Next
          </button>
        </div>
      )}
      <p className="muted">
        <Download size={13} /> Knowledge is stored in your account database.
        Apollo learns through authorized recall; teaching does not retrain the
        model.
      </p>
    </section>
  );
}
