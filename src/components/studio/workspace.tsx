"use client";
import { useState } from "react";
import {
  Sparkles,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Aperture,
  CalendarDays,
  FolderOpen,
  Layers3,
  Lightbulb,
  Lock,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Link2,
  CheckCheck,
  Crown,
  Film,
  Image as ImageIcon,
  Mic,
  FileText,
} from "lucide-react";
import {
  entryInput,
  strategicGaps,
  templates,
  stages,
  platforms,
  type Entry,
  type EntryInput,
  type Version,
  type Metric,
} from "@/lib/studio/model";
import { useStudio, type StudioRequest } from "@/lib/studio/use-studio";
import { socialConnectors } from "@/lib/studio/social";
import { StudioEditor } from "./editor";
import { StudioDetail } from "./detail";
import { CreateStudio } from "./create";
import { Modal } from "../editor";
import type { LifeRecord, Member } from "@/lib/model";
const tabs = [
  "Overview",
  "Create",
  "Campaigns",
  "Calendar",
  "Assets",
  "Brands",
  "Analytics",
] as const;
type Tab = (typeof tabs)[number] | "Ideas" | "Templates" | "Connections";
const kindName: Record<string, string> = {
  brand: "Brand Vault",
  campaign: "Campaigns",
  content: "Content",
  idea: "Ideas",
  asset: "Assets",
  reference: "References",
  deliverable: "Sponsor deliverables",
  template: "Templates",
  insight: "Insights",
};
const iconFor = (e: Entry) =>
  e.details.media_type === "image"
    ? ImageIcon
    : e.details.media_type === "video"
      ? Film
      : e.details.media_type === "audio"
        ? Mic
        : e.kind === "campaign"
          ? Layers3
          : e.kind === "brand"
            ? Crown
            : FileText;
function inputOf(e: Entry): EntryInput {
  return {
    kind: e.kind,
    title: e.title,
    body: e.body,
    visibility: e.visibility,
    recipient_id: e.recipient_id,
    context: e.context,
    brand_id: e.brand_id,
    campaign_id: e.campaign_id,
    parent_id: e.parent_id,
    status: e.status,
    due_at: e.due_at,
    details: e.details,
  };
}
export function Studio({
  userId,
  workspaceId,
  members,
  demo,
  request,
  legacyRecords,
  onLegacy,
}: {
  userId: string;
  workspaceId: string;
  members: Member[];
  demo: boolean;
  request: StudioRequest;
  legacyRecords: LifeRecord[];
  onLegacy: (id: string) => void;
}) {
  const store = useStudio(userId, workspaceId, demo, request);
  const [tab, setTab] = useState<Tab>("Overview"),
    [scope, setScope] = useState("all"),
    [search, setSearch] = useState(""),
    [brandFilter, setBrandFilter] = useState(""),
    [platformFilter, setPlatformFilter] = useState(""),
    [statusFilter, setStatusFilter] = useState(""),
    [pillarFilter, setPillarFilter] = useState(""),
    [campaignFilter, setCampaignFilter] = useState(""),
    [assigneeFilter, setAssigneeFilter] = useState("");
  const [editing, setEditing] = useState<{
      initial: Partial<EntryInput>;
      existing?: Entry;
    } | null>(null),
    [detailId, setDetailId] = useState<string | null>(null),
    [iteration, setIteration] = useState<{
      entry: Entry;
      version: Version;
    } | null>(null),
    [extract, setExtract] = useState(false);
  const oldBriefs = legacyRecords.filter((r) => r.domain === "studio");
  const all = store.entries;
  const name =
    members.find((m) => m.user_id === userId)?.display_name ?? "Your";
  const visible = all.filter(
    (e) =>
      (scope === "all" ||
        (scope === "mine" && e.owner_id === userId) ||
        (scope === "shared" && e.visibility === "shared")) &&
      (!brandFilter || e.brand_id === brandFilter || e.id === brandFilter) &&
      (!platformFilter ||
        e.details.platforms.includes(
          platformFilter as (typeof platforms)[number],
        )) &&
      (!statusFilter || e.status === statusFilter) &&
      (!pillarFilter || e.details.pillar === pillarFilter) &&
      (!campaignFilter ||
        e.campaign_id === campaignFilter ||
        e.id === campaignFilter) &&
      (!assigneeFilter || e.details.assignees.includes(assigneeFilter)) &&
      `${e.title} ${e.body} ${e.details.tags}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const selected = all.find((e) => e.id === detailId);
  const begin = (kind: Entry["kind"], initial: Partial<EntryInput> = {}) =>
    setEditing({ initial: { kind, title: "", ...initial } });
  const createFromParent = (kind: Entry["kind"]) => {
    if (!selected) return;
    const parent = selected;
    setDetailId(null);
    begin(kind, {
      visibility: parent.visibility,
      recipient_id:
        parent.visibility === "recipient" && parent.owner_id !== userId
          ? parent.owner_id
          : parent.recipient_id,
      context: parent.context,
      brand_id: parent.kind === "brand" ? parent.id : parent.brand_id,
      campaign_id:
        parent.kind === "campaign"
          ? parent.id
          : kind === "campaign"
            ? null
            : parent.campaign_id,
      ...(["idea", "template"].includes(parent.kind)
        ? {
            title: parent.title,
            body: parent.body,
            parent_id: parent.id,
            details: parent.details,
          }
        : {}),
    });
  };
  const grid = (items: Entry[], empty: string) =>
    items.length ? (
      <div className="studio-card-grid">
        {items.map((e) => {
          const Icon = iconFor(e);
          return (
            <button
              className={`studio-entry-card studio-kind-${e.kind}`}
              key={e.id}
              onClick={() => setDetailId(e.id)}
            >
              <div className="studio-card-art" aria-hidden="true">
                <span className="studio-art-line" />
                <Icon size={34} />
                <span className="studio-art-number">
                  {e.kind === "campaign"
                    ? "CAMPAIGN"
                    : e.kind === "brand"
                      ? "IDENTITY"
                      : e.details.media_type.toUpperCase()}
                </span>
              </div>
              <div className="studio-card-copy">
                <div className="studio-section-heading">
                  <span className="eyebrow">
                    {all.find((b) => b.id === e.brand_id)?.title ??
                      kindName[e.kind]}
                  </span>
                  <ArrowUpRight size={16} />
                </div>
                <h3>{e.title}</h3>
                <p>
                  {e.details.objective ||
                    e.body ||
                    "Ready for your next creative direction."}
                </p>
                <footer>
                  <span className={`studio-status status-${e.status}`}>
                    {e.status}
                  </span>
                  <span>
                    {e.visibility === "private" ? (
                      <Lock size={12} />
                    ) : (
                      <Users size={12} />
                    )}{" "}
                    {e.visibility === "private" ? "Private" : "Juntos"}
                  </span>
                </footer>
              </div>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="studio-empty">
        <Aperture size={38} />
        <h3>{empty}</h3>
        <p>Give it a purpose, a voice and a place in your creative world.</p>
      </div>
    );
  const changeTab = (t: Tab) => {
    setTab(t);
    setIteration(null);
  };
  return (
    <section className="creative-studio" aria-label="Creative Studio">
      <header className="studio-masthead">
        <div>
          <span className="eyebrow">
            <span className="gold-line" /> LEGACY JUNTOS / CREATIVE STUDIO
          </span>
          <h1>
            Ideas into <em>legacy.</em>
          </h1>
          <p>Your brands. Your stories. One extraordinary creative world.</p>
        </div>
        <button
          className="primary"
          disabled={!store.ready}
          onClick={() => begin("idea")}
        >
          <Plus size={17} />
          Capture an idea
        </button>
      </header>
      <nav className="studio-tabs" aria-label="Studio navigation">
        {tabs.map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => changeTab(t)}
          >
            {t}
          </button>
        ))}
        <button
          className="studio-connections-button"
          aria-label="Studio connections"
          onClick={() => changeTab("Connections")}
        >
          <Link2 size={17} />
        </button>
      </nav>
      <div className="studio-toolbar">
        <div className="studio-scope">
          <button
            aria-pressed={scope === "all"}
            onClick={() => setScope("all")}
          >
            All my access
          </button>
          <button
            aria-pressed={scope === "mine"}
            onClick={() => setScope("mine")}
          >
            <Lock size={12} />
            Mine
          </button>
          <button
            aria-pressed={scope === "shared"}
            onClick={() => setScope("shared")}
          >
            <Users size={13} />
            Juntos
          </button>
        </div>
        <label className="studio-search">
          <Search size={15} />
          <input
            aria-label="Search Studio"
            placeholder="Search your creative world"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter Studio by brand"
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
        >
          <option value="">All brands</option>
          {all
            .filter((e) => e.kind === "brand")
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
        </select>
      </div>
      {store.error && (
        <div role="alert" className="error studio-storage-error">
          {store.error}
          <button className="text-button" onClick={() => void store.reload()}>
            Retry connection
          </button>
        </div>
      )}
      {!store.ready && !store.error && (
        <p role="status">Opening your creative world…</p>
      )}
      {demo && (
        <p className="studio-sample-label">
          Sample Studio · illustrative planning data · no AI generation or
          publishing
        </p>
      )}
      {store.ready && (
        <>
          {tab === "Overview" && (
            <>
              <div className="studio-command-grid">
                <section className="studio-feature">
                  <div className="studio-feature-art" aria-hidden="true">
                    <div />
                    <span />
                    <Aperture size={110} />
                  </div>
                  <div className="studio-feature-copy">
                    <span className="eyebrow">
                      THE NEXT CHAPTER STARTS HERE
                    </span>
                    <h2>
                      Make something
                      <br />
                      <em>worth feeling.</em>
                    </h2>
                    <p>
                      From the first spark to the final frame. Apollo helps turn
                      what matters to you into work that feels unmistakably
                      yours.
                    </p>
                    <button
                      className="primary"
                      onClick={() => changeTab("Create")}
                    >
                      Enter the creative suite <ArrowRight size={17} />
                    </button>
                  </div>
                  <span className="studio-feature-caption" lang="pt-BR">
                    CRIAR COM PROPÓSITO
                  </span>
                </section>
                <aside className="studio-apollo-card">
                  <div className="studio-section-heading">
                    <span className="eyebrow">APOLLO / ON YOUR SIDE</span>
                    <Sparkles size={20} />
                  </div>
                  <h3>
                    Your next
                    <br />
                    <em>creative move.</em>
                  </h3>
                  <p>
                    Give me a brand, a moment, or an ambition. We’ll find the
                    story worth telling.
                  </p>
                  <button onClick={() => changeTab("Create")}>
                    “Build my founder content this month”
                    <ArrowUpRight size={16} />
                  </button>
                  <button onClick={() => changeTab("Create")}>
                    “Shape a six-week prep series”
                    <ArrowUpRight size={16} />
                  </button>
                  <small>
                    Suggestions to start a brief. Nothing private is pulled in
                    automatically.
                  </small>
                </aside>
              </div>
              <div className="studio-stat-strip">
                {[
                  {
                    label: "Campaigns taking shape",
                    value: visible.filter(
                      (e) => e.kind === "campaign" && e.status !== "archived",
                    ).length,
                    icon: Layers3,
                    tab: "Campaigns" as Tab,
                  },
                  {
                    label: "Waiting for review",
                    value: visible.filter((e) => e.status === "review").length,
                    icon: CheckCheck,
                    tab: "Assets" as Tab,
                  },
                  {
                    label: "Ideas to explore",
                    value: visible.filter((e) => e.kind === "idea").length,
                    icon: Lightbulb,
                    tab: "Ideas" as Tab,
                  },
                  {
                    label: "Brand worlds",
                    value: visible.filter((e) => e.kind === "brand").length,
                    icon: Crown,
                    tab: "Brands" as Tab,
                  },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      changeTab(s.tab);
                      setStatusFilter(
                        s.label === "Waiting for review" ? "review" : "",
                      );
                    }}
                  >
                    <s.icon size={19} />
                    <strong>{s.value.toString().padStart(2, "0")}</strong>
                    <span>{s.label}</span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
              <div className="studio-section-heading">
                <div>
                  <span className="eyebrow">IN PRODUCTION</span>
                  <h2>Stories with a purpose.</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => changeTab("Campaigns")}
                >
                  All campaigns <ArrowRight size={16} />
                </button>
              </div>
              {grid(
                visible.filter((e) => e.kind === "campaign").slice(0, 3),
                "Your first campaign starts with a point of view.",
              )}
              <div className="studio-bottom-grid">
                <section className="studio-surface">
                  <div className="studio-section-heading">
                    <h3>Ideas, before they disappear.</h3>
                    <button
                      className="icon-button"
                      aria-label="Open ideas inbox"
                      onClick={() => changeTab("Ideas")}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  {visible
                    .filter((e) => e.kind === "idea")
                    .slice(0, 3)
                    .map((e) => (
                      <button
                        className="studio-idea-row"
                        key={e.id}
                        onClick={() => setDetailId(e.id)}
                      >
                        <Lightbulb size={17} />
                        <span>{e.title}</span>
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  <button className="text-button" onClick={() => begin("idea")}>
                    <Plus size={15} />
                    Save a thought, link or inspiration
                  </button>
                </section>
                <section className="studio-surface">
                  <span className="eyebrow">APOLLO / PLANNING CHECKS</span>
                  <h3>Room for a stronger rhythm.</h3>
                  {strategicGaps(visible)
                    .slice(0, 3)
                    .map((g) => (
                      <p className="studio-gap" key={g}>
                        {g}
                      </p>
                    ))}
                  <p className="studio-note">
                    Based on your saved plan. Performance learning starts when
                    measurements are available.
                  </p>
                </section>
              </div>
              <div className="studio-shortcuts">
                <button onClick={() => changeTab("Templates")}>
                  <FolderOpen size={17} />
                  Reusable creative systems <ArrowUpRight size={16} />
                </button>
                <button onClick={() => setExtract(true)}>
                  <Lock size={16} />
                  Bring a chosen Performance moment <ArrowUpRight size={16} />
                </button>
              </div>
              {oldBriefs.length > 0 && (
                <details className="studio-legacy">
                  <summary>
                    Existing creative briefs · preserved ({oldBriefs.length})
                  </summary>
                  {oldBriefs.map((r) => (
                    <button
                      key={r.id}
                      className="studio-idea-row"
                      onClick={() => onLegacy(r.id)}
                    >
                      <FileText size={16} />
                      <span>{r.title}</span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </details>
              )}
            </>
          )}
          {tab === "Create" && (
            <CreateStudio
              key={iteration?.version.id ?? "new"}
              entries={all}
              providers={store.providers}
              demo={demo}
              userId={userId}
              save={store.save}
              call={store.call}
              existing={iteration?.entry}
              parent={iteration?.version}
              onCreated={(e) => {
                setDetailId(e.id);
                setScope("all");
              }}
            />
          )}
          {tab === "Campaigns" && (
            <>
              <PageHeading
                eyebrow="STRATEGY → PRODUCTION"
                title="Give every story a home."
                action="New campaign"
                onClick={() => begin("campaign")}
              />
              {grid(
                visible.filter((e) => e.kind === "campaign"),
                "One idea. A whole campaign.",
              )}
              <div className="studio-section-heading">
                <h2>Content & sponsor deliverables</h2>
                <button
                  className="text-button"
                  onClick={() => begin("deliverable")}
                >
                  Add sponsor deliverable
                </button>
              </div>
              {grid(
                visible.filter((e) =>
                  ["content", "deliverable"].includes(e.kind),
                ),
                "Turn a campaign into work you can produce.",
              )}
            </>
          )}
          {tab === "Brands" && (
            <>
              <PageHeading
                eyebrow="BRAND VAULT / IDENTITY ENGINE"
                title="Distinct voices. Lasting identities."
                action="New brand"
                onClick={() => begin("brand")}
              />
              <p className="studio-page-note">
                Build a world for Legacy Sanctum, Recovery Room, your personal
                brands and every venture that comes next. Each gets its own
                voice, visual language and boundaries.
              </p>
              {grid(
                visible.filter((e) => e.kind === "brand"),
                "Start with the brand you’re building today.",
              )}
              <section className="studio-creator-modes">
                <h2>Your life. Your point of view.</h2>
                <div>
                  {["Neil", "Kamilla"].map((person) => (
                    <article key={person}>
                      <span className="eyebrow">CREATOR STRATEGY</span>
                      <h3>{person}</h3>
                      <p>
                        {person === "Neil"
                          ? "Founder journey, building companies, fitness, community, faith and lessons from the work."
                          : "Recovery expertise, wellness, bodybuilding, prep, sponsorships, faith and a story that stays yours."}
                      </p>
                      <button
                        className="secondary"
                        onClick={() =>
                          begin("brand", {
                            title: `${person} · Personal brand`,
                            details: {
                              ...entryInput.parse({
                                kind: "brand",
                                title: "Brand",
                              }).details,
                              pillars:
                                person === "Neil"
                                  ? "Founder journey\nBuilding in public\nFitness\nCommunity"
                                  : "Recovery education\nBodybuilding journey\nBusiness building\nPersonal story",
                              boundaries:
                                "Choose what stays private before planning public content.",
                            },
                          })
                        }
                      >
                        Create brand profile
                      </button>
                    </article>
                  ))}
                </div>
                <p className="studio-note">
                  Both people use the same tools and permissions. {name}, new
                  profiles belong to your signed-in account unless deliberately
                  shared.
                </p>
              </section>
            </>
          )}
          {tab === "Assets" && (
            <>
              <PageHeading
                eyebrow="ASSET LIBRARY / MEDIA BRAIN"
                title="Every piece, part of the story."
                action="New asset"
                onClick={() => begin("asset")}
              />
              <div className="studio-actions">
                <button
                  className="secondary"
                  onClick={() => begin("reference")}
                >
                  Add identity / product reference
                </button>
                <button className="secondary" onClick={() => begin("content")}>
                  Add script or copy
                </button>
                <button
                  className="secondary"
                  onClick={() => changeTab("Create")}
                >
                  Create with Apollo
                </button>
              </div>
              <p className="studio-note">
                Private originals, separate versions, usage rights and
                generation lineage. Search currently matches titles, notes and
                tags; semantic search is a future integration.
              </p>
              {grid(
                visible.filter((e) =>
                  ["asset", "reference", "content"].includes(e.kind),
                ),
                "Your creative library starts with one piece.",
              )}
            </>
          )}
          {tab === "Ideas" && (
            <>
              <PageHeading
                eyebrow="THE INSPIRATION INBOX"
                title="Catch the spark."
                action="Capture idea"
                onClick={() => begin("idea")}
              />
              {grid(
                visible.filter((e) => e.kind === "idea"),
                "Save a thought before it slips away.",
              )}
              <button className="secondary" onClick={() => setExtract(true)}>
                Choose a Performance moment
              </button>
            </>
          )}
          {tab === "Templates" && (
            <>
              <PageHeading
                eyebrow="SYSTEMS THAT KEEP YOU ORIGINAL"
                title="A starting point. Never a formula."
                action="Save a template"
                onClick={() => begin("template")}
              />
              <div className="studio-template-grid">
                {templates.map((t) => (
                  <article className="studio-surface" key={t.title}>
                    <span className="eyebrow">{t.pillar}</span>
                    <h3>{t.title}</h3>
                    <p>{t.body}</p>
                    <small>{t.cadence}</small>
                    <button
                      className="secondary"
                      onClick={() =>
                        begin(t.kind, {
                          title: t.title,
                          body: t.body,
                          details: {
                            ...entryInput.parse({
                              kind: t.kind,
                              title: t.title,
                            }).details,
                            pillar: t.pillar,
                            series: t.title,
                          },
                        })
                      }
                    >
                      Use this framework <ArrowUpRight size={15} />
                    </button>
                  </article>
                ))}
              </div>
              {grid(
                visible.filter((e) => e.kind === "template"),
                "Your custom templates will live here.",
              )}
            </>
          )}
          {tab === "Calendar" && (
            <>
              <PageHeading
                eyebrow="CONTENT CALENDAR"
                title="A rhythm you can sustain."
                action="Plan content"
                onClick={() => begin("content")}
              />
              <div className="studio-calendar-filters">
                <select
                  aria-label="Filter by campaign"
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                >
                  <option value="">Every campaign</option>
                  {all
                    .filter((e) => e.kind === "campaign")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                </select>
                <select
                  aria-label="Filter by assignee"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                >
                  <option value="">Everyone assigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by platform"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                >
                  <option value="">Every platform</option>
                  {platforms.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Every stage</option>
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter by pillar"
                  value={pillarFilter}
                  onChange={(e) => setPillarFilter(e.target.value)}
                >
                  <option value="">Every pillar</option>
                  {Array.from(
                    new Set(all.map((e) => e.details.pillar).filter(Boolean)),
                  ).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <StudioCalendar
                entries={visible.filter((e) =>
                  ["content", "deliverable"].includes(e.kind),
                )}
                onOpen={(e) => setDetailId(e.id)}
                onMove={async (e, date) => {
                  await store.save({ ...inputOf(e), due_at: date }, e);
                }}
                userId={userId}
              />
            </>
          )}
          {tab === "Connections" && (
            <>
              <PageHeading
                eyebrow="CONNECTIONS / PRODUCTION INFRASTRUCTURE"
                title="Your studio, connected."
              />
              <section className="studio-surface">
                <h3>Creative providers</h3>
                {store.providers.map((p) => (
                  <div className="studio-connection" key={p.key}>
                    <div>
                      <strong>
                        {p.modality === "text"
                          ? "Apollo writing"
                          : p.modality === "image"
                            ? "Image generation & editing"
                            : p.modality === "video"
                              ? "Cinematic video"
                              : "Voiceover"}
                      </strong>
                      <small>
                        {p.provider} · {p.model}
                      </small>
                    </div>
                    <span
                      className={`studio-status ${p.enabled ? "status-approved" : ""}`}
                    >
                      {p.enabled
                        ? "Configured · testing required"
                        : p.configured
                          ? "Worker setup needed"
                          : "Setup required"}
                    </span>
                  </div>
                ))}
                <p className="studio-note">
                  Keys stay on the server. Configure provider access and a
                  recurring durable worker before enabling generation. This
                  screen never saves secrets.
                </p>
              </section>
              <section className="studio-surface">
                <h3>Social publishing</h3>
                {socialConnectors.map((c) => (
                  <div className="studio-connection" key={c.id}>
                    <div>
                      <strong>{c.name}</strong>
                      <p>{c.requirements}</p>
                    </div>
                    <span className="studio-status">Export only</span>
                  </div>
                ))}
                <p className="studio-note">
                  OAuth account linking and automatic publishing are not
                  installed. Export assets and copy, publish through the
                  platform, then record the posted URL.
                </p>
              </section>
            </>
          )}
          {tab === "Analytics" && (
            <StudioAnalytics
              entries={visible}
              demo={demo}
              call={store.call}
              onOpen={(e) => setDetailId(e.id)}
            />
          )}
          <footer className="studio-persistent-apollo">
            <div>
              <Sparkles size={20} />
              <span>
                <strong>Apollo Creative Director</strong>
                <small>
                  Strategy, story and production — with your context and
                  consent.
                </small>
              </span>
            </div>
            <button className="secondary" onClick={() => changeTab("Create")}>
              Start a creative brief <ArrowUpRight size={15} />
            </button>
            <button className="text-button" onClick={() => changeTab("Ideas")}>
              Ideas
            </button>
            <button
              className="text-button"
              onClick={() => changeTab("Templates")}
            >
              Templates
            </button>
          </footer>
        </>
      )}
      {editing && (
        <StudioEditor
          key={editing.existing?.id ?? "new"}
          initial={editing.initial}
          existing={editing.existing}
          entries={all}
          members={members}
          userId={userId}
          onClose={() => setEditing(null)}
          onSave={async (i, e) => {
            await store.save(i, e);
            setScope("all");
          }}
        />
      )}
      {selected && (
        <StudioDetail
          key={selected.id}
          entry={selected}
          entries={all}
          userId={userId}
          members={members}
          demo={demo}
          call={store.call}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setEditing({ initial: inputOf(selected), existing: selected });
            setDetailId(null);
          }}
          onCreate={createFromParent}
          onIterate={(version) => {
            setIteration({ entry: selected, version });
            setTab("Create");
            setDetailId(null);
          }}
        />
      )}
      {extract && (
        <PerformanceExtract
          onClose={() => setExtract(false)}
          records={legacyRecords.filter(
            (r) => r.domain === "performance" && r.owner_id === userId,
          )}
          onUse={(title, body) => {
            setExtract(false);
            begin("idea", {
              title,
              body,
              visibility: "private",
              details: {
                ...entryInput.parse({ kind: "idea", title: "Extract" }).details,
                source_kind: "performance_extract",
                source_consent: true,
              },
            });
          }}
        />
      )}
    </section>
  );
}
function PageHeading({
  eyebrow,
  title,
  action,
  onClick,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="studio-section-heading studio-page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="primary" onClick={onClick}>
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}
function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function StudioCalendar({
  entries,
  onOpen,
  onMove,
  userId,
}: {
  entries: Entry[];
  onOpen: (e: Entry) => void;
  onMove: (e: Entry, date: string) => Promise<void>;
  userId: string;
}) {
  const [mode, setMode] = useState("month"),
    [anchor, setAnchor] = useState(() => new Date()),
    [error, setError] = useState("");
  const start = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    mode === "month" ? 1 : anchor.getDate(),
  );
  start.setDate(start.getDate() - start.getDay());
  const days = Array.from(
    { length: mode === "week" ? 7 : 42 },
    (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
  const shift = (n: number) =>
    setAnchor((d) =>
      mode === "month"
        ? new Date(d.getFullYear(), d.getMonth() + n, 1)
        : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * n),
    );
  return (
    <section className="studio-calendar">
      <div className="studio-section-heading">
        <div className="studio-actions">
          <button
            className="icon-button"
            aria-label="Previous calendar period"
            onClick={() => shift(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <h3>
            {anchor.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <button
            className="icon-button"
            aria-label="Next calendar period"
            onClick={() => shift(1)}
          >
            <ChevronRight size={18} />
          </button>
          <button className="text-button" onClick={() => setAnchor(new Date())}>
            Today
          </button>
        </div>
        <div className="studio-scope">
          {["month", "week", "list"].map((m) => (
            <button
              aria-pressed={mode === m}
              key={m}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <p className="studio-note">
        Dates use your device timezone. Scheduled means planned here; automatic
        publishing is not connected. Open any item to change its date on mobile
        or with a keyboard.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {mode === "list" ? (
        <div>
          {entries
            .filter((e) => e.due_at)
            .sort((a, b) => a.due_at!.localeCompare(b.due_at!))
            .map((e) => (
              <button
                className="studio-calendar-list"
                key={e.id}
                onClick={() => onOpen(e)}
              >
                <CalendarDays size={18} />
                <strong>{e.title}</strong>
                <span>{new Date(e.due_at!).toLocaleString()}</span>
                <small>{e.status}</small>
              </button>
            ))}
        </div>
      ) : (
        <div className="studio-calendar-scroll">
          <div className="studio-calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div className="studio-weekday" key={d}>
                {d}
              </div>
            ))}
            {days.map((d) => (
              <div
                className={`studio-day ${d.getMonth() !== anchor.getMonth() ? "outside" : ""} ${localDate(d) === localDate(new Date()) ? "today" : ""}`}
                key={localDate(d)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (ev) => {
                  ev.preventDefault();
                  const entry = entries.find(
                    (e) =>
                      e.id === ev.dataTransfer.getData("text/plain") &&
                      e.owner_id === userId,
                  );
                  if (!entry) return;
                  try {
                    await onMove(
                      entry,
                      new Date(
                        d.getFullYear(),
                        d.getMonth(),
                        d.getDate(),
                        12,
                      ).toISOString(),
                    );
                    setError("");
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Could not reschedule.",
                    );
                  }
                }}
              >
                <time dateTime={localDate(d)}>{d.getDate()}</time>
                {entries
                  .filter(
                    (e) =>
                      e.due_at &&
                      localDate(new Date(e.due_at)) === localDate(d),
                  )
                  .map((e) => (
                    <button
                      draggable={e.owner_id === userId}
                      onDragStart={(ev) =>
                        ev.dataTransfer.setData("text/plain", e.id)
                      }
                      key={e.id}
                      onClick={() => onOpen(e)}
                    >
                      <span>{e.details.platforms[0] ?? e.kind}</span>
                      {e.title}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <h3 className="studio-unscheduled-heading">Not on the calendar yet</h3>
      {entries
        .filter((e) => !e.due_at)
        .map((e) => (
          <button
            className="studio-idea-row"
            key={e.id}
            onClick={() => onOpen(e)}
          >
            <FileText size={15} />
            <span>{e.title}</span>
            <small>{e.status}</small>
          </button>
        ))}
      {!entries.length && (
        <p className="studio-note">
          Create your first content item to choose a date.
        </p>
      )}
    </section>
  );
}
function PerformanceExtract({
  onClose,
  onUse,
  records,
}: {
  onClose: () => void;
  onUse: (title: string, body: string) => void;
  records: LifeRecord[];
}) {
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [consent, setConsent] = useState(false);
  return (
    <Modal title="Choose what becomes content" onClose={onClose}>
      <form
        className="studio-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (consent) onUse(title, body);
        }}
      >
        <p>
          Write the exact public-facing moment you want to use. Training logs,
          health details and progress photos are not imported automatically.
        </p>
        {records.length > 0 && (
          <label>
            Start from one of my older Performance entries
            <select
              onChange={(e) => {
                const r = records.find((r) => r.id === e.target.value);
                if (r) setTitle(r.title);
              }}
            >
              <option value="">Choose a title only</option>
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Content idea title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={180}
          />
        </label>
        <label>
          Only the extract I want in Studio
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={6000}
            rows={5}
          />
        </label>
        <label className="studio-check">
          <input
            required
            checked={consent}
            type="checkbox"
            onChange={(e) => setConsent(e.target.checked)}
          />
          I intentionally selected this text for a private Studio idea. Sharing
          and AI processing are separate choices.
        </label>
        <button className="primary" disabled={!consent}>
          Prepare private content idea
        </button>
      </form>
    </Modal>
  );
}
function StudioAnalytics({
  entries,
  demo,
  call,
  onOpen,
}: {
  entries: Entry[];
  demo: boolean;
  call: StudioRequest;
  onOpen: (e: Entry) => void;
}) {
  const [selected, setSelected] = useState(""),
    [metric, setMetric] = useState("views"),
    [platform, setPlatform] = useState("instagram"),
    [value, setValue] = useState(""),
    [start, setStart] = useState(localDate(new Date())),
    [end, setEnd] = useState(localDate(new Date())),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [observations, setObservations] = useState<Metric[]>([]);
  return (
    <>
      <PageHeading
        eyebrow="CONTENT INTELLIGENCE"
        title="Learn what earns attention."
      />
      <div className="studio-analytics-hero">
        <Aperture size={48} />
        <div>
          <h3>Evidence before advice.</h3>
          <p>
            No social accounts are connected. Record measured outcomes manually,
            or review performance attached to an asset or campaign. Apollo’s
            planning checks use saved workflow data; automated performance
            learning is not active.
          </p>
        </div>
      </div>
      <div className="studio-bottom-grid">
        <section className="studio-surface">
          <h3>Record a real measurement</h3>
          <form
            className="studio-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setNotice("");
              try {
                const input = {
                  entry_id: selected,
                  platform,
                  metric,
                  value: Number(value),
                  period_start: start,
                  period_end: end,
                };
                if (end < start)
                  throw new Error("End date must follow start date.");
                if (demo) {
                  setObservations((p) => [
                    {
                      ...input,
                      id: crypto.randomUUID(),
                      source: "manual",
                      observed_at: new Date().toISOString(),
                    },
                    ...p,
                  ]);
                  setNotice("Sample measurement added for this visit.");
                } else {
                  const result = await call("/api/studio/metrics", {
                    method: "POST",
                    body: JSON.stringify(input),
                  });
                  if (result.metric)
                    setObservations((p) => [result.metric!, ...p]);
                  setNotice(
                    "Measurement saved. It is also available on the linked entry.",
                  );
                }
              } catch (err) {
                setNotice(
                  err instanceof Error ? err.message : "Could not save.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Content, asset or campaign
              <select
                required
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Choose an entry</option>
                {entries
                  .filter((e) =>
                    ["content", "asset", "campaign", "deliverable"].includes(
                      e.kind,
                    ),
                  )
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
              </select>
            </label>
            <div className="studio-form-grid">
              <label>
                Platform
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  {platforms.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Metric
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                >
                  {[
                    "views",
                    "impressions",
                    "reach",
                    "watch_seconds",
                    "saves",
                    "shares",
                    "comments",
                    "clicks",
                    "followers",
                    "conversions",
                  ].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Measured value
              <input
                required
                type="number"
                min="0"
                max="1000000000000"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            <div className="studio-form-grid">
              <label>
                Period starts
                <input
                  required
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                Period ends
                <input
                  required
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
            <button className="primary" disabled={busy || !selected}>
              Save manual measurement
            </button>
            {notice && <p role="status">{notice}</p>}
          </form>
        </section>
        <section className="studio-surface">
          <span className="eyebrow">APOLLO / INSIGHTS</span>
          <h3>The next question to ask.</h3>
          {strategicGaps(entries).map((g) => (
            <p className="studio-gap" key={g}>
              {g}
            </p>
          ))}
          <p className="studio-note">
            Future connected insights will compare hooks, pillars, formats and
            cadence within each brand. Missing data is never treated as zero.
          </p>
          <h3>Review an entry’s performance</h3>
          {entries
            .filter((e) => ["campaign", "content", "asset"].includes(e.kind))
            .slice(0, 5)
            .map((e) => (
              <button
                className="studio-idea-row"
                key={e.id}
                onClick={() => onOpen(e)}
              >
                <span>{e.title}</span>
                <ArrowUpRight size={15} />
              </button>
            ))}
        </section>
      </div>
      {observations.length > 0 && (
        <section className="studio-surface">
          <h3>Measurements from this visit</h3>
          {observations.map((m) => (
            <div className="studio-linked" key={m.id}>
              <span>{m.platform}</span>
              <strong>
                {m.value.toLocaleString()} {m.metric}
              </strong>
              <small>
                Manual · {m.period_start} – {m.period_end}
              </small>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
