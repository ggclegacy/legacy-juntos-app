"use client";
import { useState } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Film,
  Mic,
  PenLine,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import {
  entryInput,
  type Entry,
  type EntryInput,
  type GenerationInput,
  type Version,
} from "@/lib/studio/model";
import type { ProviderStatus, StudioRequest } from "@/lib/studio/use-studio";
const modes = [
  {
    id: "text",
    label: "Write & direct",
    icon: PenLine,
    description: "Find the angle. Shape the story.",
  },
  {
    id: "image",
    label: "Image studio",
    icon: ImageIcon,
    description: "Product, portrait, world-building.",
  },
  {
    id: "video",
    label: "Film & reels",
    icon: Film,
    description: "Give your story movement.",
  },
  {
    id: "audio",
    label: "Voice & audio",
    icon: Mic,
    description: "A voice that carries the message.",
  },
] as const;
const intents: Record<string, string[]> = {
  text: [
    "Campaign strategy",
    "Reel script",
    "Founder content",
    "Captions",
    "Carousel",
    "Email",
    "Sponsor content",
    "YouTube titles",
  ],
  image: [
    "Product photography",
    "Lifestyle editorial",
    "Portrait",
    "Social graphic",
    "Hero image",
    "Mockup",
    "Background replacement",
  ],
  video: [
    "Cinematic ad",
    "Product motion",
    "Bodybuilding B-roll",
    "Founder reel",
  ],
  audio: ["Narration", "Voiceover"],
};
export function CreateStudio({
  entries,
  providers,
  demo,
  userId,
  save,
  call,
  onCreated,
  existing,
  parent,
}: {
  entries: Entry[];
  providers: ProviderStatus[];
  demo: boolean;
  userId: string;
  save: (i: EntryInput, e?: Entry) => Promise<Entry>;
  call: StudioRequest;
  onCreated: (e: Entry) => void;
  existing?: Entry;
  parent?: Version;
}) {
  const [mode, setMode] = useState<GenerationInput["modality"]>(
      parent?.mime_type.startsWith("image/") ? "image" : "text",
    ),
    [intent, setIntent] = useState("Campaign strategy"),
    [prompt, setPrompt] = useState(""),
    [brand, setBrand] = useState(existing?.brand_id ?? ""),
    [campaign, setCampaign] = useState(existing?.campaign_id ?? ""),
    [ratio, setRatio] = useState<GenerationInput["ratio"]>("1:1"),
    [preference, setPreference] =
      useState<GenerationInput["preference"]>("quality"),
    [transparent, setTransparent] = useState(false),
    [refs, setRefs] = useState<string[]>([]),
    [consent, setConsent] = useState(false),
    [modelKey, setModelKey] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const eligible = providers.filter(
    (p) =>
      p.modality === mode &&
      p.enabled &&
      p.ratios.includes(ratio) &&
      p.references >= refs.length + (parent && mode === "image" ? 1 : 0) &&
      (!transparent || p.transparency) &&
      (!modelKey || p.key === modelKey),
  );
  const choices = entries.filter(
    (e) =>
      e.kind === "reference" &&
      e.owner_id === userId &&
      e.details.consent &&
      e.details.rights,
  );
  async function submit(generate: boolean) {
    if (busy || !prompt.trim()) return;
    setBusy(true);
    setError("");
    try {
      const entry =
        existing ??
        (await save(
          entryInput.parse({
            kind: mode === "text" ? "content" : "asset",
            title: prompt.slice(0, 100),
            body: prompt,
            brand_id: brand || null,
            campaign_id: campaign || null,
            visibility: "private",
            context: brand ? "brand" : "personal",
            details: { media_type: mode, instructions: intent },
          }),
        ));
      if (generate)
        await call("/api/studio/jobs", {
          method: "POST",
          body: JSON.stringify({
            id: crypto.randomUUID(),
            input: {
              entry_id: entry.id,
              modality: mode,
              prompt,
              intent,
              ratio,
              preference,
              transparent,
              reference_ids: refs,
              reference_version_ids: [],
              parent_version_id: parent?.id ?? null,
              provider_consent: consent,
              ...(modelKey ? { model_key: modelKey } : {}),
            },
          }),
        });
      onCreated(entry);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create this draft.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="studio-create">
      <div className="studio-mode-grid">
        {modes.map((m) => (
          <button
            key={m.id}
            className={mode === m.id ? "selected" : ""}
            disabled={!!existing}
            aria-pressed={mode === m.id}
            onClick={() => {
              setMode(m.id);
              setIntent(intents[m.id][0]);
              setRatio(m.id === "video" ? "9:16" : "1:1");
              setRefs([]);
              setTransparent(false);
              setModelKey("");
            }}
          >
            <m.icon size={24} />
            <strong>{m.label}</strong>
            <span>{m.description}</span>
          </button>
        ))}
      </div>
      <div className="studio-production">
        <section className="studio-surface studio-create-form">
          <div className="studio-section-heading">
            <span className="eyebrow">APOLLO / CREATIVE DIRECTION</span>
            <Lock size={16} />
          </div>
          <h2>
            {mode === "text"
              ? "What are we bringing to life?"
              : mode === "image"
                ? "Art-direct the extraordinary."
                : mode === "video"
                  ? "Every frame, intentional."
                  : "Make the words resonate."}
          </h2>
          <div className="studio-intents">
            {intents[mode].map((i) => (
              <button
                key={i}
                className={intent === i ? "active" : ""}
                onClick={() => setIntent(i)}
              >
                {i}
              </button>
            ))}
          </div>
          <label className="studio-prompt-label">
            {mode === "audio" ? "Words to speak" : "Your creative brief"}
            <textarea
              rows={7}
              maxLength={5000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "audio"
                  ? "Write the exact narration to speak…"
                  : "We need content for Kamilla six weeks out from her show…\n\nTell Apollo the goal, feeling and anything that must stay true."
              }
            />
          </label>
          <div className="studio-form-grid">
            <label>
              Brand context
              <select
                disabled={!!existing}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              >
                <option value="">My own voice</option>
                {entries
                  .filter((e) => e.kind === "brand")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Campaign
              <select
                disabled={!!existing}
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
              >
                <option value="">Independent creation</option>
                {entries
                  .filter((e) => e.kind === "campaign")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {(mode === "image" || mode === "video") && (
            <div className="studio-form-grid">
              <label>
                Composition
                <select
                  value={ratio}
                  onChange={(e) =>
                    setRatio(e.target.value as GenerationInput["ratio"])
                  }
                >
                  {(mode === "video"
                    ? ["9:16", "16:9"]
                    : ["1:1", "9:16", "16:9"]
                  ).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={preference}
                  onChange={(e) =>
                    setPreference(
                      e.target.value as GenerationInput["preference"],
                    )
                  }
                >
                  <option value="quality">Finest quality</option>
                  <option value="speed">Faster exploration</option>
                  <option value="cost">Lower-cost draft</option>
                </select>
              </label>
            </div>
          )}
          {mode === "image" && (
            <label className="studio-check">
              <input
                type="checkbox"
                checked={transparent}
                onChange={(e) => setTransparent(e.target.checked)}
              />
              Transparent background
            </label>
          )}
          {(mode === "image" || mode === "video") && (
            <details>
              <summary>
                Identity & reference locks{" "}
                {refs.length ? `· ${refs.length} selected` : ""}
              </summary>
              <p className="studio-note">
                Only your approved references. Exact versions are locked when
                queued; output stays private. Review likeness and product
                details.
              </p>
              {choices.length ? (
                choices.map((r) => (
                  <label className="studio-check" key={r.id}>
                    <input
                      type="checkbox"
                      checked={refs.includes(r.id)}
                      disabled={
                        !refs.includes(r.id) &&
                        refs.length >= (mode === "video" ? 1 : parent ? 3 : 4)
                      }
                      onChange={(e) =>
                        setRefs(
                          e.target.checked
                            ? [...refs, r.id]
                            : refs.filter((id) => id !== r.id),
                        )
                      }
                    />
                    {r.title}
                  </label>
                ))
              ) : (
                <p>
                  No approved references yet. Add a reference in Assets, record
                  usage permission and upload its image.
                </p>
              )}
            </details>
          )}
          <details>
            <summary>Advanced / model routing</summary>
            <label>
              Model
              <select
                value={modelKey}
                onChange={(e) => setModelKey(e.target.value)}
              >
                <option value="">Apollo chooses a compatible model</option>
                {providers
                  .filter((p) => p.modality === mode)
                  .map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.model} · {p.enabled ? "configured" : "setup required"}
                    </option>
                  ))}
              </select>
            </label>
            <p className="studio-note">
              The router checks provider access, composition, reference count
              and transparency before accepting a job.
            </p>
          </details>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="studio-note">
            {demo
              ? "Sample mode: save a production brief to explore. AI and uploads require a connected account."
              : eligible.length
                ? "Provider access is configured; generation incurs provider charges and still requires account entitlement."
                : "Generation needs provider credentials and a running worker. You can save the brief now."}
          </p>
          {!demo && eligible.length > 0 && (
            <label className="studio-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Send this brief, selected brand/campaign and locked references to{" "}
              {Array.from(new Set(eligible.map((p) => p.provider))).join(" / ")}
              . I have the necessary rights.
            </label>
          )}
          <div className="studio-actions">
            <button
              className="secondary"
              disabled={busy || !prompt.trim()}
              onClick={() => void submit(false)}
            >
              Save production brief
            </button>
            <button
              className="primary"
              disabled={
                busy || !prompt.trim() || demo || !eligible.length || !consent
              }
              onClick={() => void submit(true)}
            >
              <Sparkles size={16} />
              {busy ? "Preparing…" : "Create with Apollo"}
            </button>
          </div>
        </section>
        <aside className="studio-direction">
          <div className="studio-apollo-orbit">
            <Sparkles size={34} />
          </div>
          <span className="eyebrow">YOUR CREATIVE DIRECTOR</span>
          <h3>
            A point of view.
            <br />
            <em>Not just a prompt.</em>
          </h3>
          <p>
            Apollo brings your brand, audience and campaign into the brief. You
            stay in control of the story, the references and the final approval.
          </p>
          <ol>
            <li>Choose the world and the voice.</li>
            <li>Give the work a clear purpose.</li>
            <li>Create, compare, refine.</li>
            <li>Review before it meets the world.</li>
          </ol>
          {mode === "video" && (
            <p className="studio-note">
              First integration: 5-second portrait or landscape clips. Native
              audio, last-frame controls, longer assembly and square exports
              need additional adapters or editing tools.
            </p>
          )}
          {mode === "audio" && (
            <p className="studio-note">
              Voiceovers use the consented voice configured on the server.
              Cloning enrollment, transcription, dubbing, cleanup and music are
              documented foundations awaiting integration.
            </p>
          )}
          <span className="studio-direction-footer">
            IDEA → PRODUCTION <ArrowUpRight size={16} />
          </span>
        </aside>
      </div>
    </div>
  );
}
