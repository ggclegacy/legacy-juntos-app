"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  RefreshCw,
  Upload,
  Plus,
  Pencil,
  MessageCircle,
} from "lucide-react";
import { Modal } from "../editor";
import type { Entry, Version, Review, Job, Metric } from "@/lib/studio/model";
import type { StudioRequest } from "@/lib/studio/use-studio";
import type { Member } from "@/lib/model";
export function downloadText(
  filename: string,
  text: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function StudioDetail({
  entry,
  entries,
  userId,
  members,
  demo,
  call,
  onClose,
  onEdit,
  onCreate,
  onIterate,
}: {
  entry: Entry;
  entries: Entry[];
  userId: string;
  members: Member[];
  demo: boolean;
  call: StudioRequest;
  onClose: () => void;
  onEdit: () => void;
  onCreate: (kind: Entry["kind"]) => void;
  onIterate: (version: Version) => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]),
    [reviews, setReviews] = useState<Review[]>([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [metrics, setMetrics] = useState<Metric[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [comment, setComment] = useState(""),
    [decision, setDecision] = useState<Review["decision"]>("comment"),
    [versionId, setVersionId] = useState(""),
    [compare, setCompare] = useState(""),
    [preview, setPreview] = useState("");
  const live = useRef(false);
  const owned = entry.owner_id === userId;
  const sampleKey = `studio-sample-reviews:${entry.id}`;
  const load = useCallback(async () => {
    try {
      if (demo) {
        if (live.current)
          setReviews(JSON.parse(sessionStorage.getItem(sampleKey) || "[]"));
        return;
      }
      const d = await call(`/api/studio/detail?id=${entry.id}`);
      if (live.current) {
        setVersions(d.versions ?? []);
        setReviews(d.reviews ?? []);
        setJobs(d.jobs ?? []);
        setMetrics(d.metrics ?? []);
        setError("");
      }
    } catch (e) {
      if (live.current) {
        setVersions([]);
        setReviews([]);
        setJobs([]);
        setMetrics([]);
        setPreview("");
        setError(e instanceof Error ? e.message : "Could not refresh.");
      }
    }
  }, [call, demo, entry.id, sampleKey]);
  useEffect(() => {
    live.current = true;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
      live.current = false;
    };
  }, [load]);
  useEffect(() => {
    if (
      !jobs.some((j) =>
        ["queued", "running", "waiting", "retry"].includes(j.state),
      )
    )
      return;
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [jobs, load]);
  const chosen = versions.find((v) => v.id === versionId) ?? versions[0];
  const other = versions.find((v) => v.id === compare);
  const linked = entries.filter(
    (e) =>
      e.campaign_id === entry.id ||
      e.brand_id === entry.id ||
      e.parent_id === entry.id,
  );
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Use a file up to 20 MB.");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
      });
      await call("/api/studio/media", {
        method: "POST",
        body: JSON.stringify({
          entry_id: entry.id,
          parent_version_id: chosen?.id ?? null,
          mime_type: file.type,
          base64,
        }),
      });
      await load();
    } catch (e) {
      if (live.current)
        setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      if (live.current) setBusy(false);
    }
  }
  async function media(v: Version, show = false) {
    try {
      const d = await call(`/api/studio/media?version=${v.id}`);
      if (!d.url) throw new Error("No file URL returned.");
      if (show) {
        if (live.current) setPreview(d.url);
      } else {
        const a = document.createElement("a");
        a.href = d.url;
        a.rel = "noopener";
        a.click();
      }
    } catch (e) {
      if (live.current)
        setError(e instanceof Error ? e.message : "File unavailable.");
    }
  }
  const packageData = {
    format: "legacy-juntos-production-v1",
    exported_at: new Date().toISOString(),
    entry,
    linked_entries: linked,
    versions,
    reviews,
    metrics,
    notes:
      "Media originals are downloaded separately. Planned dates are not confirmed publishing jobs. Keep this package within its recorded audience.",
  };
  return (
    <Modal title={entry.title} onClose={onClose} wide>
      <div className="studio-detail">
        <div className="studio-detail-meta">
          <span>
            {entry.kind} / {entry.visibility}
          </span>
          <span>
            {entry.status} · version {entry.revision}
          </span>
        </div>
        <p className="studio-detail-body">
          {entry.body || "A new piece of your creative world."}
        </p>
        <div className="studio-actions">
          {owned && (
            <button className="secondary" onClick={onEdit}>
              <Pencil size={14} />
              Edit
            </button>
          )}
          <button
            className="secondary"
            onClick={() =>
              downloadText(
                `${entry.kind}-production-package.json`,
                JSON.stringify(packageData, null, 2),
                "application/json",
              )
            }
          >
            <Download size={14} />
            Export production package
          </button>
          <button
            className="icon-button"
            aria-label="Refresh studio detail"
            onClick={() => void load()}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        {entry.kind === "idea" && (
          <div className="studio-actions">
            <button className="primary" onClick={() => onCreate("campaign")}>
              Develop into a campaign
            </button>
            <button className="secondary" onClick={() => onCreate("content")}>
              Turn into content
            </button>
          </div>
        )}
        {entry.kind === "template" && (
          <button className="secondary" onClick={() => onCreate("content")}>
            Use as a content brief
          </button>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {Object.entries(entry.details)
          .filter(
            ([k, v]) =>
              typeof v === "string" &&
              v &&
              !["media_type", "reference_type", "source_kind"].includes(k),
          )
          .map(([k, v]) => (
            <section className="studio-detail-field" key={k}>
              <span className="eyebrow">{k.replaceAll("_", " ")}</span>
              <p>{String(v)}</p>
            </section>
          ))}
        {(entry.kind === "campaign" || entry.kind === "brand") && (
          <section>
            <div className="studio-section-heading">
              <h3>Production board</h3>
              <button
                className="text-button"
                onClick={() =>
                  onCreate(entry.kind === "brand" ? "campaign" : "content")
                }
              >
                <Plus size={15} />
                Add {entry.kind === "brand" ? "campaign" : "content"}
              </button>
            </div>
            {linked.length ? (
              linked.map((e) => (
                <div className="studio-linked" key={e.id}>
                  <span>{e.kind}</span>
                  <strong>{e.title}</strong>
                  <small>{e.status}</small>
                </div>
              ))
            ) : (
              <p className="studio-note">
                Attach content, assets and sponsor deliverables to this campaign
                as you create them.
              </p>
            )}
            {entry.kind === "campaign" && (
              <button
                className="text-button"
                onClick={() => onCreate("deliverable")}
              >
                Add sponsor deliverable
              </button>
            )}
          </section>
        )}
        {["asset", "reference", "content"].includes(entry.kind) && (
          <section className="studio-version-area">
            <div className="studio-section-heading">
              <h3>Originals & versions</h3>
              {owned && (
                <label
                  className={`secondary studio-upload ${demo ? "disabled" : ""}`}
                >
                  <Upload size={15} />
                  Upload a version
                  <input
                    aria-label="Upload media version"
                    disabled={demo || busy}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,video/mp4,audio/mpeg,audio/wav,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(f);
                    }}
                  />
                </label>
              )}
            </div>
            {demo && (
              <p className="studio-note">
                File uploads and generation are disabled in the sample
                workspace.
              </p>
            )}
            {versions.length > 0 ? (
              <>
                <label>
                  Selected version
                  <select
                    value={chosen?.id ?? ""}
                    onChange={(e) => {
                      setVersionId(e.target.value);
                      setPreview("");
                    }}
                  >
                    {versions.map((v, i) => (
                      <option key={v.id} value={v.id}>
                        Version {versions.length - i} · {v.provenance} ·{" "}
                        {v.model ?? v.mime_type}
                      </option>
                    ))}
                  </select>
                </label>
                {chosen && (
                  <>
                    <p className="studio-note">
                      {chosen.is_original ? "Original" : "Derivative"} ·{" "}
                      {chosen.mime_type} · {chosen.provider ?? "User upload"} ·{" "}
                      {new Date(chosen.created_at).toLocaleString()}
                    </p>
                    {chosen.text_content && (
                      <pre className="studio-text-output">
                        {chosen.text_content}
                      </pre>
                    )}
                    {preview && chosen.mime_type.startsWith("image/") && (
                      /* Signed private media must not be sent through an image optimization cache. */ <picture>
                        <img
                          className="studio-media-preview"
                          src={preview}
                          alt={entry.title}
                        />
                      </picture>
                    )}
                    {preview && chosen.mime_type.startsWith("video/") && (
                      <video
                        className="studio-media-preview"
                        src={preview}
                        controls
                      />
                    )}
                    {preview && chosen.mime_type.startsWith("audio/") && (
                      <audio src={preview} controls />
                    )}
                    <div className="studio-actions">
                      {chosen.object_key ? (
                        <>
                          <button
                            className="secondary"
                            onClick={() => void media(chosen, true)}
                          >
                            Preview
                          </button>
                          <button
                            className="secondary"
                            onClick={() => void media(chosen)}
                          >
                            <Download size={15} />
                            Download original
                          </button>
                        </>
                      ) : (
                        <button
                          className="secondary"
                          onClick={() =>
                            downloadText(
                              "creative-draft.txt",
                              chosen.text_content,
                            )
                          }
                        >
                          Download writing
                        </button>
                      )}
                      {owned &&
                        entry.kind !== "reference" &&
                        (chosen.mime_type.startsWith("image/") ||
                          chosen.mime_type === "text/plain") && (
                          <button
                            className="secondary"
                            onClick={() => onIterate(chosen)}
                          >
                            Refine with Apollo
                          </button>
                        )}
                    </div>
                  </>
                )}
                {versions.length > 1 && (
                  <>
                    <label>
                      Compare another version
                      <select
                        value={compare}
                        onChange={(e) => setCompare(e.target.value)}
                      >
                        <option value="">Choose a version</option>
                        {versions
                          .filter((v) => v.id !== chosen?.id)
                          .map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.created_at} · {v.provenance}
                            </option>
                          ))}
                      </select>
                    </label>
                    {other && (
                      <div className="studio-compare">
                        <p>
                          {other.model ?? other.mime_type} ·{" "}
                          {other.is_original ? "Original" : "Derivative"}
                        </p>
                        {other.text_content ? (
                          <pre className="studio-text-output">
                            {other.text_content}
                          </pre>
                        ) : (
                          <button
                            className="secondary"
                            onClick={() => void media(other)}
                          >
                            Download comparison version
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="studio-empty-small">
                No media yet. Your brief is saved; upload originals or create
                with Apollo.
              </div>
            )}
          </section>
        )}
        {jobs.length > 0 && (
          <section>
            <h3>Generation jobs</h3>
            {jobs.map((j) => (
              <div className="studio-job" key={j.id}>
                <strong>{j.state.replaceAll("_", " ")}</strong>
                <span>
                  {j.provider} · {j.model}
                </span>
                {j.error && <p>{j.error}</p>}
              </div>
            ))}
          </section>
        )}
        <section className="studio-review">
          <h3>
            <MessageCircle size={18} /> Review together
          </h3>
          <p className="studio-note">
            Reviews apply to the selected version, or this brief when no version
            exists. A new version needs a new review.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const input = {
                  entry_id: entry.id,
                  version_id: chosen?.id ?? null,
                  decision,
                  body: comment,
                };
                if (demo) {
                  const r = {
                    ...input,
                    id: crypto.randomUUID(),
                    author_id: userId,
                    created_at: new Date().toISOString(),
                  };
                  sessionStorage.setItem(
                    sampleKey,
                    JSON.stringify([r, ...reviews]),
                  );
                } else
                  await call("/api/studio/reviews", {
                    method: "POST",
                    body: JSON.stringify(input),
                  });
                if (live.current) setComment("");
                await load();
              } catch (e) {
                if (live.current)
                  setError(e instanceof Error ? e.message : "Review failed.");
              } finally {
                if (live.current) setBusy(false);
              }
            }}
          >
            <label>
              Feedback
              <textarea
                required
                maxLength={6000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="What works? What should change?"
              />
            </label>
            <div className="studio-actions">
              <label>
                Review action
                <select
                  value={decision}
                  onChange={(e) =>
                    setDecision(e.target.value as Review["decision"])
                  }
                >
                  <option value="comment">Comment</option>
                  <option value="approved">Approve this version</option>
                  <option value="revision_requested">Request revision</option>
                </select>
              </label>
              <button className="primary" disabled={busy || !comment.trim()}>
                Save review
              </button>
            </div>
          </form>
          {reviews.map((r) => (
            <article className="studio-review-note" key={r.id}>
              <strong>
                {members.find((m) => m.user_id === r.author_id)?.display_name ??
                  "Member"}
              </strong>
              <small>
                {r.decision.replaceAll("_", " ")} ·{" "}
                {r.version_id === chosen?.id
                  ? "selected version"
                  : r.version_id
                    ? "earlier version"
                    : "brief"}
              </small>
              <p>{r.body}</p>
            </article>
          ))}
        </section>
        {metrics.length > 0 && (
          <section>
            <h3>Recorded performance</h3>
            {metrics.map((m) => (
              <div className="studio-linked" key={m.id}>
                <span>{m.platform}</span>
                <strong>
                  {m.value.toLocaleString()} {m.metric}
                </strong>
                <small>
                  {m.source} · {m.period_start} – {m.period_end}
                </small>
              </div>
            ))}
          </section>
        )}
      </div>
    </Modal>
  );
}
