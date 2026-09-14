"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { newKnowledge, type KnowledgeInput } from "@/lib/ai/knowledge/model";
import type { KnowledgeRequest } from "./research";
export function KnowledgeImporter({
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
  const [file, setFile] = useState<File | null>(null),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const plain = !!file && /\.(txt|md)$/i.test(file.name);
  async function read() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const draft = {
        ...newKnowledge(),
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 180),
        source_name: file.name.slice(0, 240),
      };
      if (plain) {
        if (file.size > 240000)
          throw new Error("Use a text document under 240 KB.");
        const text = await file.text();
        if (!text.trim() || text.length > 60000 || text.includes("\u0000"))
          throw new Error(
            "Use readable text up to 60,000 characters. Split a longer document into sections.",
          );
        onDraft({
          ...draft,
          content: text,
          notes:
            "Imported as text. Review the content and source type before activating.",
        });
      } else {
        if (!consent) throw new Error("Review the provider consent first.");
        if (file.size > 2 * 1024 * 1024)
          throw new Error("Use a PDF, PNG or JPEG under 2 MB.");
        if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type))
          throw new Error(
            "Choose a PDF, PNG or JPEG, or export your document as text.",
          );
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read this file."));
          reader.readAsDataURL(file);
        });
        const result = await request("/api/ai/knowledge/import", {
          method: "POST",
          headers: { "x-expected-user": userId },
          body: JSON.stringify({
            filename: file.name.slice(0, 240),
            mime: file.type,
            data,
            consent,
          }),
        });
        onDraft({
          ...draft,
          content: result.text as string,
          notes:
            `AI transcription · ${result.complete ? "model reports complete; verify against original" : "incomplete or uncertain; verify against original"}. ${(result.limitations as string[]).join(" ")}`.slice(
              0,
              2000,
            ),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the document.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="knowledge-import">
      <Upload size={26} />
      <h3>Give Apollo the source.</h3>
      <p>Coach programs. Research. Notes worth keeping.</p>
      <p className="muted">
        Import text or Markdown directly. Apollo can transcribe PDFs and photos
        with your permission. You review the text before saving; the original
        file is not stored in this library.
      </p>
      <label>
        Choose a document
        <input
          type="file"
          accept=".txt,.md,.pdf,.png,.jpg,.jpeg"
          disabled={busy}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setConsent(false);
            setError("");
          }}
        />
      </label>
      {file && (
        <p className="muted">
          {file.name} · {Math.ceil(file.size / 1024)} KB
        </p>
      )}
      {!plain && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={consent}
            disabled={busy || demo}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Send this file to OpenAI for transcription. I will check the extracted
          wording and numbers before using it.
        </label>
      )}
      <button
        className="primary"
        disabled={!file || busy || (!plain && (demo || !consent))}
        onClick={read}
      >
        {busy
          ? "Reading the document…"
          : plain
            ? "Load text for review"
            : "Transcribe for review"}
      </button>
      <p className="muted">
        Text: up to 60,000 characters. PDF/photo: up to 2 MB. Split long
        documents into smaller sections. Password-protected or unclear files may
        need a text export.
      </p>
      {demo && !plain && (
        <p className="privacy-note">
          AI transcription requires a connected account. Text import is
          available in this preview.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
