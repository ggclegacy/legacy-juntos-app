"use client";
import { useState } from "react";
import type { RecallKind } from "@/lib/ai/memory";
export function ApolloRecall({
  context,
  sources,
  enabled,
  onEnabled,
  request,
  userId,
  demo,
  disabled,
}: {
  context: "private" | "shared";
  sources: RecallKind[];
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  request: (
    path: string,
    init?: RequestInit,
  ) => Promise<Record<string, unknown>>;
  userId: string;
  demo: boolean;
  disabled: boolean;
}) {
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  async function prepare(index: boolean) {
    setBusy(true);
    setError("");
    try {
      if (index)
        await request("/api/ai/intelligence", {
          method: "POST",
          headers: { "x-expected-user": userId },
          body: JSON.stringify({ action: "index", context, sources, consent }),
        });
      const data = await request(
        `/api/ai/intelligence?context=${context}&sources=${sources.join(",")}`,
        { headers: { "x-expected-user": userId } },
      );
      setStatus(
        `${data.indexed} of ${data.total} current sources prepared. ${Number(data.indexed) < Number(data.total) ? "Prepare another batch to include more history." : "Selected areas are up to date."}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare recall.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="apollo-preferences">
      <h4>Find the meaning. Remember the detail.</h4>
      <p className="muted">
        Combine keyword search with meaning-based recall. Prepare your chosen
        areas in batches of up to 12. Changed sources need preparing again;
        unprepared sources remain searchable by keyword.
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled || demo || !sources.length || busy}
          onChange={(e) => onEnabled(e.target.checked)}
        />
        Find memories by meaning when I send
      </label>
      <p className="muted">
        This also sends your question to OpenAI to match its meaning. It
        searches your own index for this audience; recall is selective, never a
        guarantee of remembering everything.
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={consent}
          disabled={disabled || demo || busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Allow OpenAI to process a batch from these selected areas to prepare
        recall.
      </label>
      <div className="button-row">
        <button
          type="button"
          className="secondary"
          disabled={disabled || demo || busy || !sources.length}
          onClick={() => prepare(false)}
        >
          Check preparation
        </button>
        <button
          type="button"
          className="secondary"
          disabled={disabled || demo || busy || !consent || !sources.length}
          onClick={() => prepare(true)}
        >
          {busy ? "Working…" : "Prepare next batch"}
        </button>
      </div>
      {demo && (
        <p className="muted">
          Available after signing into a connected account.
        </p>
      )}
      {status && <p role="status">{status}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
