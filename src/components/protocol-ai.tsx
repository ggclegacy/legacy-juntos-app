"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { HealthEvent } from "@/lib/protocols/model";
type Review = {
  observations: { text: string; recordIds: string[] }[];
  questions: string[];
  limitations: string[];
};
export function ProtocolAi({
  demo,
  events,
  request,
  onRecord,
}: {
  demo: boolean;
  events: HealthEvent[];
  request: (path: string, init?: RequestInit) => Promise<{ review?: Review }>;
  onRecord: (e: HealthEvent) => void;
}) {
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [review, setReview] = useState<Review | null>(null);
  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const result = await request("/api/protocols/analyze", {
        method: "POST",
        body: JSON.stringify({ consent: true }),
      });
      if (result.review) setReview(result.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="protocol-card">
      <Sparkles size={23} />
      <h3>Prepare with AI.</h3>
      <p>
        An optional, record-linked appointment review. It organizes observations
        and questions; it does not diagnose, check interactions, or change your
        protocol.
      </p>
      {demo ? (
        <p>
          Available after a private account and health AI provider are
          configured. Sample records are not sent to AI.
        </p>
      ) : (
        <>
          <label className="protocol-confirm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{" "}
            Send my current protocol, lab, use-log, and check-in records to the
            configured AI provider for this review.
          </label>
          <button
            className="primary"
            disabled={!consent || busy || !events.length}
            onClick={() => void analyze()}
          >
            {busy ? "Preparing review…" : "Prepare AI review"}
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {review && (
        <>
          <p className="protocol-notice">
            AI-generated draft · verify against your records.
          </p>
          {review.observations.map((o, i) => (
            <div key={i}>
              <p>{o.text}</p>
              {o.recordIds.map((id) => (
                <button
                  className="text-button"
                  key={id}
                  onClick={() => {
                    const e = events.find((e) => e.id === id);
                    if (e) onRecord(e);
                  }}
                >
                  View source record
                </button>
              ))}
            </div>
          ))}
          <h3>Questions to bring</h3>
          {review.questions.map((q) => (
            <p key={q}>{q}</p>
          ))}
          <h3>Limits of this review</h3>
          {review.limitations.map((q) => (
            <p key={q}>{q}</p>
          ))}
        </>
      )}
    </article>
  );
}
