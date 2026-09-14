"use client";
import { useState } from "react";
import { Modal } from "../editor";
import {
  entryInput,
  platforms,
  stages,
  type Entry,
  type EntryInput,
} from "@/lib/studio/model";
import type { Member } from "@/lib/model";
export function StudioEditor({
  initial,
  existing,
  entries,
  members,
  userId,
  onSave,
  onClose,
}: {
  initial: Partial<EntryInput>;
  existing?: Entry;
  entries: Entry[];
  members: Member[];
  userId: string;
  onSave: (input: EntryInput, existing?: Entry) => Promise<unknown>;
  onClose: () => void;
}) {
  const [value, setValue] = useState<EntryInput>(() => ({
    ...entryInput.parse({
      kind: "idea",
      ...initial,
      title: initial.title || "Untitled",
    }),
    title: initial.title ?? "",
  }));
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (key: keyof EntryInput, v: unknown) =>
    setValue((p) => ({ ...p, [key]: v }));
  const detail = (key: keyof EntryInput["details"], v: unknown) =>
    setValue((p) => ({ ...p, details: { ...p.details, [key]: v } }));
  const isBrand = value.kind === "brand",
    isCampaign = value.kind === "campaign",
    isReference = value.kind === "reference";
  const field = (
    label: string,
    key: keyof EntryInput["details"],
    placeholder = "",
  ) => (
    <label key={key}>
      {label}
      <textarea
        value={String(value.details[key] ?? "")}
        placeholder={placeholder}
        onChange={(e) => detail(key, e.target.value)}
        rows={3}
      />
    </label>
  );
  const allowedEntries = entries.filter(
    (e) => e.visibility === "shared" || e.owner_id === userId,
  );
  return (
    <Modal
      title={existing ? `Edit ${value.kind}` : `New ${value.kind}`}
      onClose={onClose}
      wide
    >
      <form
        className="studio-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave(entryInput.parse(value), existing);
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Title
          <input
            required
            maxLength={180}
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <label>
          {isBrand ? "Brand story" : "Brief / notes"}
          <textarea
            rows={4}
            maxLength={12000}
            value={value.body}
            onChange={(e) => set("body", e.target.value)}
          />
        </label>
        <div className="studio-form-grid">
          <label>
            Visibility
            <select
              disabled={!!existing}
              value={value.visibility}
              onChange={(e) => {
                set("visibility", e.target.value);
                set(
                  "recipient_id",
                  e.target.value === "recipient"
                    ? (members.find((m) => m.user_id !== userId)?.user_id ??
                        null)
                    : null,
                );
              }}
            >
              <option value="private">Private · only me</option>
              <option value="shared">Juntos · both of us</option>
              <option value="recipient">Named share</option>
            </select>
          </label>
          <label>
            Belongs to
            <select
              disabled={!!existing}
              value={value.context}
              onChange={(e) => set("context", e.target.value)}
            >
              <option value="personal">My personal work</option>
              <option value="juntos">Shared / Juntos</option>
              <option value="brand">Brand</option>
              <option value="project">Project / venture</option>
            </select>
          </label>
        </div>
        {value.visibility === "recipient" && (
          <label>
            Share with
            <select
              disabled={!!existing}
              value={value.recipient_id ?? ""}
              onChange={(e) => set("recipient_id", e.target.value)}
            >
              {members
                .filter((m) => m.user_id !== userId)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {!existing && (
          <p className="studio-note">
            Choose the audience deliberately. Linked work must fit that
            audience; changing it later requires a coordinated privacy workflow.
          </p>
        )}
        {!isBrand && (
          <div className="studio-form-grid">
            <label>
              Brand
              <select
                disabled={!!existing}
                value={value.brand_id ?? ""}
                onChange={(e) => set("brand_id", e.target.value || null)}
              >
                <option value="">Independent / no brand</option>
                {allowedEntries
                  .filter((e) => e.kind === "brand")
                  .map((e) => (
                    <option value={e.id} key={e.id}>
                      {e.title} · {e.visibility}
                    </option>
                  ))}
              </select>
            </label>
            {!isCampaign && (
              <label>
                Campaign
                <select
                  disabled={!!existing}
                  value={value.campaign_id ?? ""}
                  onChange={(e) => set("campaign_id", e.target.value || null)}
                >
                  <option value="">No campaign</option>
                  {allowedEntries
                    .filter((e) => e.kind === "campaign")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title} · {e.visibility}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
        )}
        {!isBrand && !isReference && (
          <div className="studio-form-grid">
            <label>
              Production status
              <select
                value={value.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                    {s === "scheduled"
                      ? " · plan only"
                      : s === "published"
                        ? " · recorded manually"
                        : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due / planned posting time
              <input
                type="datetime-local"
                value={
                  value.due_at
                    ? new Date(
                        new Date(value.due_at).getTime() -
                          new Date(value.due_at).getTimezoneOffset() * 60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  set(
                    "due_at",
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  )
                }
              />
            </label>
          </div>
        )}
        {isBrand ? (
          <>
            <div className="studio-form-grid">
              {field(
                "Tone & voice",
                "tone",
                "How this brand sounds, with examples",
              )}
              {field("Audience", "audience")}
              {field("Colors", "colors", "Hex colors or palette names")}
              {field("Fonts", "fonts")}
              {field("Photography style", "photography")}
              {field("Visual rules", "rules")}
              {field("Products / services", "products")}
              {field("Content pillars", "pillars")}
              {field("Approved claims", "approved_claims")}
              {field("Forbidden claims", "forbidden_claims")}
              {field("CTA preferences", "cta")}
              {field("Social handles", "handles")}
            </div>
            {field("Public / private boundaries", "boundaries")}
            {field("Brand instructions", "instructions")}
          </>
        ) : (
          <>
            {isCampaign && (
              <>
                <div className="studio-form-grid">
                  {field("Objective", "objective")}
                  {field("Audience", "audience")}
                  {field("Offer", "offer")}
                  {field("Creative concept", "concept")}
                </div>
                <div className="studio-form-grid">
                  <label>
                    Start date
                    <input
                      type="date"
                      value={value.details.start_date ?? ""}
                      onChange={(e) =>
                        detail("start_date", e.target.value || null)
                      }
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      value={value.details.end_date ?? ""}
                      onChange={(e) =>
                        detail("end_date", e.target.value || null)
                      }
                    />
                  </label>
                  <label>
                    Budget (USD)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={value.details.budget ?? ""}
                      onChange={(e) =>
                        detail(
                          "budget",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </label>
                </div>
                {field("Tasks & deliverables", "tasks")}
              </>
            )}
            {!isReference && (
              <>
                <fieldset>
                  <legend>Platforms</legend>
                  <div className="studio-checks">
                    {platforms.map((p) => (
                      <label key={p}>
                        <input
                          type="checkbox"
                          checked={value.details.platforms.includes(p)}
                          onChange={(e) =>
                            detail(
                              "platforms",
                              e.target.checked
                                ? [...value.details.platforms, p]
                                : value.details.platforms.filter(
                                    (x) => x !== p,
                                  ),
                            )
                          }
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="studio-form-grid">
                  {field("Content pillar", "pillar")}
                  {field("Recurring series", "series")}
                </div>
                <fieldset>
                  <legend>Assigned to</legend>
                  <div className="studio-checks">
                    {members
                      .filter(
                        (m) =>
                          value.visibility === "shared" ||
                          m.user_id === userId ||
                          m.user_id === value.recipient_id,
                      )
                      .map((m) => (
                        <label key={m.user_id}>
                          <input
                            type="checkbox"
                            checked={value.details.assignees.includes(
                              m.user_id,
                            )}
                            onChange={(e) =>
                              detail(
                                "assignees",
                                e.target.checked
                                  ? [...value.details.assignees, m.user_id]
                                  : value.details.assignees.filter(
                                      (x) => x !== m.user_id,
                                    ),
                              )
                            }
                          />
                          {m.display_name}
                        </label>
                      ))}
                  </div>
                </fieldset>
              </>
            )}
            {value.kind === "content" && (
              <details open>
                <summary>Script, copy & production</summary>
                {field("Hooks", "hooks")}
                {field("Script / copy", "script")}
                {field("Shot list", "shot_list")}
                {field("Visual direction", "visual_direction")}
                {field("Captions / platform variants", "captions")}
                {field("Call to action", "cta")}
                {field("Public / private boundaries", "boundaries")}
              </details>
            )}
            {(value.kind === "asset" || isReference) && (
              <>
                <label>
                  Media type
                  <select
                    value={value.details.media_type}
                    onChange={(e) => detail("media_type", e.target.value)}
                  >
                    {["image", "video", "audio", "text", "document"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                </label>
                {field(
                  "Usage rights / consent notes",
                  "rights",
                  "Who owns it, who has consented, and allowed uses",
                )}
              </>
            )}
            {isReference && (
              <>
                <label>
                  Reference type
                  <select
                    value={value.details.reference_type}
                    onChange={(e) => detail("reference_type", e.target.value)}
                  >
                    {[
                      "person",
                      "product",
                      "location",
                      "style",
                      "logo",
                      "other",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="studio-check">
                  <input
                    type="checkbox"
                    checked={value.details.consent}
                    onChange={(e) => detail("consent", e.target.checked)}
                  />
                  I have permission to use this reference with AI providers for
                  the stated purposes.
                </label>
                <p className="studio-note">
                  Personal reference images remain private. Provider consistency
                  is approximate; review every output.
                </p>
              </>
            )}
            {value.kind === "deliverable" && (
              <>
                {field("Sponsor / partner", "sponsor")}
                {field("Requirements & deliverables", "requirements")}
                {field(
                  "Required mentions, hashtags & disclosure",
                  "disclosure",
                )}
                <label>
                  Posted URL
                  <input
                    type="url"
                    value={value.details.posted_url}
                    onChange={(e) => detail("posted_url", e.target.value)}
                  />
                </label>
              </>
            )}
          </>
        )}
        <details>
          <summary>Tags & source</summary>
          {field("Tags", "tags")}
          {value.details.source_kind === "performance_extract" && (
            <label className="studio-check">
              <input
                required
                type="checkbox"
                checked={value.details.source_consent}
                onChange={(e) => detail("source_consent", e.target.checked)}
              />
              I deliberately chose this extract for content. No other
              Performance or health data may be included.
            </label>
          )}
        </details>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer className="studio-form-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Saving…"
              : value.visibility === "shared"
                ? "Save for Juntos"
                : "Save entry"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
