"use client";
import { useEffect, useState } from "react";
import { Upload, Download, LockKeyhole } from "lucide-react";
import type { HealthRequest } from "@/lib/protocols/use-protocols";
export function ProtocolFiles({
  demo,
  request,
}: {
  demo: boolean;
  request: HealthRequest;
}) {
  const [files, setFiles] = useState<{ name: string; created_at: string }[]>(
      [],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!demo)
      void request("/api/protocols/files")
        .then((r) => {
          if (!cancelled) setFiles(r.files ?? []);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    return () => {
      cancelled = true;
    };
  }, [demo, request]);
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Choose a file up to 5 MB.");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Could not read this file."));
        reader.readAsDataURL(file);
      });
      await request("/api/protocols/files", {
        method: "POST",
        body: JSON.stringify({ name: file.name, type: file.type, base64 }),
      });
      const r = await request("/api/protocols/files");
      setFiles(r.files ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  async function retrieve(name: string) {
    setError("");
    try {
      const r = await request(
        `/api/protocols/files?file=${encodeURIComponent(name)}`,
      );
      if (r.signedUrl) {
        const a = document.createElement("a");
        a.href = r.signedUrl;
        a.rel = "noreferrer";
        a.click();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report unavailable.");
    }
  }
  return (
    <article className="protocol-card">
      <LockKeyhole size={22} />
      <h3>Original report vault.</h3>
      <p>
        Keep your original PDF or photograph alongside your results. Files are
        private and download-only. Automatic extraction is not enabled; enter
        and verify results manually.
      </p>
      {demo ? (
        <p>
          Sign in to a configured private account to upload real reports.
          Uploads are disabled in sample mode.
        </p>
      ) : (
        <label className="protocol-select">
          <span>
            <Upload size={15} />{" "}
            {busy
              ? "Saving report…"
              : "Upload PDF, PNG, or JPEG · maximum 5 MB"}
          </span>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {files.map((f) => (
        <div className="protocol-file" key={f.name}>
          <span>
            {f.name.slice(37)}
            <small>{new Date(f.created_at).toLocaleDateString()}</small>
          </span>
          <button className="text-button" onClick={() => void retrieve(f.name)}>
            <Download size={14} /> Download
          </button>
        </div>
      ))}
      {files.length === 100 && <p>Showing the 100 most recent reports.</p>}
    </article>
  );
}
