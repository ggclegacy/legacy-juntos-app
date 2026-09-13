"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Home,
  Compass,
  BookOpen,
  Dumbbell,
  BriefcaseBusiness,
  Palette,
  HeartHandshake,
  MessagesSquare,
  Mountain,
  Images,
  HandHeart,
  Sparkles,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Lock,
  Users,
  Search,
  Menu,
  Check,
  ShieldCheck,
  LogOut,
  Download,
  RefreshCw,
  Leaf,
  Sun,
  Flag,
  NotebookPen,
  X,
  type LucideIcon,
} from "lucide-react";
import { browserDb, configured } from "@/lib/supabase";
import {
  canRead,
  volume,
  personalBest,
  type Domain,
  type LifeRecord,
  type Member,
  type RecordInput,
} from "@/lib/model";
import { demoRecords, demoMembers, NEIL, WORKSPACE } from "@/lib/demo";
import { Editor, Modal, kindLabel } from "./editor";
import { AiPanel } from "./ai-panel";

type View = "home" | Domain;
const NAV: { id: View; label: string; icon: LucideIcon; group?: string }[] = [
  { id: "home", label: "Our space", icon: Home },
  { id: "personal", label: "My life", icon: Compass },
  { id: "faith", label: "Faith", icon: BookOpen, group: "GROW" },
  { id: "performance", label: "Performance", icon: Dumbbell },
  { id: "connect", label: "Know & connect", icon: HeartHandshake },
  {
    id: "business",
    label: "Business",
    icon: BriefcaseBusiness,
    group: "BUILD",
  },
  { id: "studio", label: "Digital studio", icon: Palette },
  { id: "conversations", label: "Conversations", icon: MessagesSquare },
  { id: "vision", label: "Our vision", icon: Mountain, group: "BECOME" },
  { id: "memories", label: "Memories", icon: Images },
  { id: "legacy", label: "Give & serve", icon: HandHeart },
];
const COPY: Record<
  Domain,
  { eyebrow: string; title: string; description: string; action: string }
> = {
  personal: {
    eyebrow: "ROOM TO BECOME",
    title: "Your life, with intention.",
    description:
      "The goals, quiet thoughts, and everyday choices that shape who you are becoming.",
    action: "Add to my life",
  },
  faith: {
    eyebrow: "ROOTED IN SOMETHING GREATER",
    title: "Grow with God.",
    description:
      "Read slowly. Reflect honestly. Make room for what God is teaching you.",
    action: "Write a reflection",
  },
  performance: {
    eyebrow: "STRENGTH WITH PURPOSE",
    title: "Built one day at a time.",
    description:
      "Training, recovery, and the discipline to keep showing up for yourself.",
    action: "Log a workout",
  },
  connect: {
    eyebrow: "CURIOSITY. CARE. CONNECTION.",
    title: "Keep getting to know each other.",
    description:
      "An invitation to understand, appreciate, and share at your own pace.",
    action: "Add a reflection",
  },
  business: {
    eyebrow: "FROM POSSIBILITY TO PROGRESS",
    title: "What are we building today?",
    description:
      "Ideas become projects. Conversations become decisions. One meaningful next step.",
    action: "New project",
  },
  studio: {
    eyebrow: "THE SPACE BETWEEN IDEA & REALITY",
    title: "Make something remarkable.",
    description:
      "A shared studio for the stories, brands, and creative work you bring into the world.",
    action: "Create a brief",
  },
  conversations: {
    eyebrow: "MORE THAN A MESSAGE",
    title: "A place for understanding.",
    description:
      "Bring your thoughts to a project, a decision, or a conversation worth having.",
    action: "Start a conversation",
  },
  vision: {
    eyebrow: "A FUTURE, INTENTIONALLY BUILT",
    title: "Dream beyond today.",
    description:
      "Individual ambitions and shared possibilities. No timelines you haven’t chosen.",
    action: "Add a dream",
  },
  memories: {
    eyebrow: "THE MOMENTS THAT STAY",
    title: "A life worth remembering.",
    description:
      "Small beginnings. Meaningful milestones. Stories you choose to carry forward.",
    action: "Keep a memory",
  },
  legacy: {
    eyebrow: "WHAT WE LEAVE IN OTHERS",
    title: "Let the good go further.",
    description:
      "A place for generosity, service, community, and the impact you want to make.",
    action: "Add a service idea",
  },
};
const PROMPTS = [
  ["Values", "What is a small thing that makes you feel understood?"],
  ["Faith", "What has been giving you hope lately?"],
  ["Childhood", "What place from your childhood still feels like home?"],
  ["Boundaries", "When life feels full, what kind of support feels welcome?"],
  [
    "Ambition",
    "What is something you want to build because it matters to you?",
  ],
  ["Family", "What tradition would you like to carry forward?"],
  ["Care", "What helps you feel comfortable being yourself?"],
  ["Money", "What does financial peace mean to you?"],
  ["Future", "What is an experience you would love to make room for?"],
  ["Preferences", "What does an ideal unhurried day look like?"],
];
function Audience({ record }: { record: LifeRecord }) {
  return (
    <span className={`audience ${record.visibility}`}>
      {record.visibility === "private" ? (
        <Lock size={11} />
      ) : (
        <Users size={11} />
      )}{" "}
      {record.visibility === "private"
        ? "Only you"
        : record.visibility === "recipient"
          ? "Named share"
          : "Juntos"}
    </span>
  );
}
function Mark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span>L</span>
      <span>J</span>
    </div>
  );
}
export function Sanctuary() {
  const sessionEpoch = useRef(0),
    refreshVersion = useRef(0);
  const [demo, setDemo] = useState(!configured),
    [signedIn, setSignedIn] = useState(false),
    [initializing, setInitializing] = useState(configured);
  const [userId, setUserId] = useState(NEIL),
    [workspaceId, setWorkspaceId] = useState(WORKSPACE),
    [members, setMembers] = useState<Member[]>(demoMembers),
    [records, setRecords] = useState<LifeRecord[]>(
      configured ? [] : demoRecords,
    );
  const [view, setView] = useState<View>("home"),
    [scope, setScope] = useState<"shared" | "private">("shared"),
    [mobileNav, setMobileNav] = useState(false),
    [query, setQuery] = useState("");
  const [edit, setEdit] = useState<{
      domain: Domain;
      record?: LifeRecord;
      initial?: Partial<RecordInput>;
      parent?: LifeRecord;
    } | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [ai, setAi] = useState(false),
    [privacy, setPrivacy] = useState(false);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [promptIndex, setPromptIndex] = useState(0),
    [prep, setPrep] = useState(false),
    [deleteId, setDeleteId] = useState<string | null>(null),
    [deleting, setDeleting] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [authBusy, setAuthBusy] = useState(false);
  const request = useCallback(async (path: string, init?: RequestInit) => {
    if (!configured) throw new Error("Account connection is not configured.");
    const {
      data: { session },
    } = await browserDb().auth.getSession();
    if (!session) throw new Error("Please sign in again.");
    const response = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...init?.headers,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Please try again.");
    return data;
  }, []);
  const fetchRecords = useCallback(async () => {
    const all: LifeRecord[] = [];
    let cursor = null;
    do {
      const page = await request(
        "/api/records" +
          (cursor
            ? "?cursor=" + encodeURIComponent(JSON.stringify(cursor))
            : ""),
      );
      all.push(...page.records);
      cursor = page.nextCursor;
    } while (cursor);
    return { records: all };
  }, [request]);
  const refresh = useCallback(async () => {
    const epoch = sessionEpoch.current,
      version = ++refreshVersion.current;
    setLoading(true);
    try {
      const [boot, data] = await Promise.all([
        request("/api/bootstrap"),
        fetchRecords(),
      ]);
      if (epoch !== sessionEpoch.current || version !== refreshVersion.current)
        return;
      setUserId(boot.userId);
      setWorkspaceId(boot.workspaceId);
      setMembers(boot.members);
      setRecords(data.records);
      setSignedIn(true);
      setError("");
    } catch (e) {
      if (epoch !== sessionEpoch.current || version !== refreshVersion.current)
        return;
      setRecords([]);
      setEdit(null);
      setDetail(null);
      setAi(false);
      setError(e instanceof Error ? e.message : "Could not load your space.");
    } finally {
      if (
        epoch === sessionEpoch.current &&
        version === refreshVersion.current
      ) {
        setLoading(false);
        setInitializing(false);
      }
    }
  }, [request, fetchRecords]);
  useEffect(() => {
    if (!configured) return;
    const {
      data: { subscription },
    } = browserDb().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        sessionEpoch.current++;
        setRecords([]);
        setSignedIn(false);
        setDetail(null);
        setEdit(null);
        setAi(false);
        setInitializing(false);
      } else if (session) {
        setDemo(false);
        void refresh();
      } else setInitializing(false);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);
  useEffect(() => {
    if (demo || !signedIn) return;
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    const timer = window.setInterval(focus, 30000);
    return () => {
      window.removeEventListener("focus", focus);
      clearInterval(timer);
    };
  }, [demo, signedIn, refresh]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const visible = records.filter((r) => canRead(r, userId, workspaceId));
  const scoped = visible.filter((r) =>
    scope === "shared"
      ? r.visibility === "shared"
      : r.owner_id === userId || r.recipient_id === userId,
  );
  const filtered = scoped.filter(
    (r) =>
      r.kind !== "comment" &&
      (view === "home" || r.domain === view) &&
      `${r.title} ${r.body}`.toLowerCase().includes(query.toLowerCase()),
  );
  const activeDetail = visible.find((r) => r.id === detail);
  const currentName =
    members.find((m) => m.user_id === userId)?.display_name ?? "Friend";
  function navigate(next: View) {
    setView(next);
    setQuery("");
    setMobileNav(false);
    if (next === "personal" || next === "performance") setScope("private");
  }
  function create(domain: Domain, initial?: Partial<RecordInput>) {
    setEdit({ domain, initial });
  }
  async function save(input: RecordInput, id?: string) {
    if (demo) {
      const existing = records.find((r) => r.id === id);
      if (id && (!existing || existing.owner_id !== userId))
        throw new Error("Only the owner can edit this entry.");
      if (
        existing &&
        records.some((r) => r.parent_id === id) &&
        (existing.visibility !== input.visibility ||
          existing.recipient_id !== input.recipient_id)
      )
        throw new Error(
          "Linked replies must keep the same audience. Remove replies before changing sharing.",
        );
      if (
        input.visibility === "recipient" &&
        !members.some(
          (m) => m.user_id === input.recipient_id && m.user_id !== userId,
        )
      )
        throw new Error("Choose a current workspace member.");
      setRecords((old) =>
        id
          ? old.map((r) =>
              r.id === id
                ? { ...r, ...input, updated_at: new Date().toISOString() }
                : r,
            )
          : [
              {
                ...input,
                id: crypto.randomUUID(),
                workspace_id: workspaceId,
                owner_id: userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...old,
            ],
      );
    } else {
      await request("/api/records", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(id ? { id, record: input } : input),
      });
      await refresh();
    }
    setNotice(demo ? "Saved for this sample session." : "Saved to your space.");
  }
  async function toggle(record: LifeRecord) {
    const {
      domain,
      kind,
      title,
      body,
      visibility,
      recipient_id,
      parent_id,
      status,
      due_at,
      metadata,
    } = record;
    try {
      await save(
        {
          domain,
          kind,
          title,
          body,
          visibility,
          recipient_id,
          parent_id,
          status: status === "done" ? "open" : "done",
          due_at,
          metadata,
        },
        record.id,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    }
  }
  async function remove() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      if (demo) {
        if (records.some((r) => r.parent_id === deleteId))
          throw new Error("Remove linked replies first.");
        setRecords(records.filter((r) => r.id !== deleteId));
      } else {
        await request("/api/records", {
          method: "DELETE",
          body: JSON.stringify({ id: deleteId }),
        });
        await refresh();
      }
      setDetail(null);
      setDeleteId(null);
      setNotice("Entry deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setDeleting(false);
    }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setError("");
    try {
      const { error } = await browserDb().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setPassword("");
      setDemo(false);
      await refresh();
    } catch {
      setError(
        "Could not sign in. Check your email and password, or your workspace invitation.",
      );
    } finally {
      setAuthBusy(false);
    }
  }
  function openDemo() {
    sessionEpoch.current++;
    setDemo(true);
    setRecords(demoRecords);
    setMembers(demoMembers);
    setUserId(NEIL);
    setWorkspaceId(WORKSPACE);
    setError("");
    setInitializing(false);
  }
  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            sample: demo,
            records: visible,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legacy-juntos-export.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Your accessible entries were exported. Keep the file private.");
  }
  const recordList = (
    items: LifeRecord[],
    empty = "There’s room for your first entry.",
  ) =>
    items.length ? (
      <div className="entry-list">
        {items.map((r) => (
          <article className="entry-row" key={r.id}>
            {["goal", "task", "habit"].includes(r.kind) &&
            r.owner_id === userId ? (
              <button
                className={`complete ${r.status === "done" ? "checked" : ""}`}
                aria-label={`${r.status === "done" ? "Reopen" : "Complete"} ${r.title}`}
                onClick={() => void toggle(r)}
              >
                {r.status === "done" && <Check size={13} />}
              </button>
            ) : (
              <span className="entry-dot" />
            )}
            <button className="entry-main" onClick={() => setDetail(r.id)}>
              <span className="entry-title">{r.title}</span>
              <span className="entry-meta">
                {kindLabel(r.kind)}
                {r.due_at ? ` · ${r.due_at}` : ""}
                {r.status === "done" ? " · Complete" : ""}
              </span>
            </button>
            <Audience record={r} />
            <button
              className="icon-button"
              onClick={() => setDetail(r.id)}
              aria-label={`Open ${r.title}`}
            >
              <ArrowUpRight size={16} />
            </button>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty">
        <Leaf size={27} />
        <h3>{empty}</h3>
        <p>A thought, a plan, a small beginning. Add one when you’re ready.</p>
      </div>
    );
  if (initializing)
    return (
      <main className="fatal">
        <Mark />
        <h1>Opening your space…</h1>
      </main>
    );
  if (!demo && !signedIn)
    return (
      <main className="login">
        <div className="login-art">
          <Mark />
          <span className="eyebrow">LEGACY JUNTOS</span>
          <h1>
            Two lives.
            <br />
            Infinite possibility.
          </h1>
          <p>
            Growing individually.
            <br />
            Building together.
          </p>
          <div className="login-orbit" />
        </div>
        <div className="login-form">
          <span className="eyebrow">WELCOME TO YOUR SPACE</span>
          <h2>A life, intentionally shared.</h2>
          <p className="muted">
            Your account is individual. Your world is connected.
          </p>
          {configured ? (
            <form onSubmit={login}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="primary" disabled={authBusy}>
                {authBusy ? "Opening your space…" : "Sign in"}
                <ArrowRight size={17} />
              </button>
              <p className="muted">
                Invitation only. Account setup and password recovery are managed
                by your workspace administrator.
              </p>
            </form>
          ) : (
            <p>Account connection is not configured yet.</p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="text-button" onClick={openDemo}>
            Explore the sample workspace <ArrowUpRight size={15} />
          </button>
        </div>
      </main>
    );
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <Mark />
          <span>
            LEGACY<span className="brand-sub">JUNTOS</span>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        >
          <X />
        </button>
        <div className="workspace-badge">
          <span className="tiny-orbit" />
          NEIL + KAMILLA<span className="muted">Private workspace</span>
        </div>
        <nav aria-label="Main navigation">
          {NAV.map(({ id, label, icon: Icon, group }) => (
            <div key={id}>
              {group && <span className="nav-group">{group}</span>}
              <button
                className={view === id ? "nav-item active" : "nav-item"}
                aria-current={view === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {view === id && <span className="nav-active-dot" />}
              </button>
            </div>
          ))}
        </nav>
        <button className="sidebar-ai" onClick={() => setAi(true)}>
          <Sparkles size={19} />
          <span>
            A space to think<small>Your Juntos assistant</small>
          </span>
          <ArrowUpRight size={15} />
        </button>
        <button className="profile" onClick={() => setPrivacy(true)}>
          <span className="avatar">{currentName[0]}</span>
          <span>
            {currentName}
            <small>Privacy & your space</small>
          </span>
          <ShieldCheck size={16} />
        </button>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span>Our world</span>
            <ChevronRight size={13} />
            <strong>{NAV.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="top-actions">
            <span className="top-private">
              <Lock size={12} /> A private space for two
            </span>
            <button
              className="icon-button"
              aria-label="Privacy settings"
              onClick={() => setPrivacy(true)}
            >
              <ShieldCheck size={18} />
            </button>
            <div className="avatar-pair">
              <span>N</span>
              <span>K</span>
            </div>
          </div>
        </header>
        {demo && (
          <div className="demo-bar">
            <span>
              <span className="status-dot" /> Sample workspace · illustrative
              entries · changes last this session
            </span>
            <button
              onClick={() => {
                setDemo(false);
                setSignedIn(false);
                setRecords([]);
                setError("");
              }}
            >
              Connect your account <ArrowUpRight size={12} />
            </button>
          </div>
        )}
        <main id="main">
          <div className="page-controls">
            <div className="segmented">
              <button
                aria-pressed={scope === "shared"}
                onClick={() => setScope("shared")}
              >
                <Users size={14} />
                Juntos
              </button>
              <button
                aria-pressed={scope === "private"}
                onClick={() => setScope("private")}
              >
                <Lock size={13} />
                My space
              </button>
            </div>
            <div className="page-tools">
              <label className="search">
                <Search size={16} />
                <input
                  aria-label="Search entries"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find in your space"
                />
              </label>
              <button
                className="primary small"
                onClick={() => create(view === "home" ? "personal" : view)}
              >
                <Plus size={16} />
                <span>Add something</span>
              </button>
            </div>
          </div>
          {error && (
            <div className="error error-banner" role="alert">
              {error}
              <button
                className="text-button"
                onClick={() => (demo ? setError("") : void refresh())}
              >
                Try again
              </button>
            </div>
          )}
          {loading && (
            <p className="loading-line" role="status">
              Refreshing your space…
            </p>
          )}
          {view === "home" && !query ? (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow">
                    <span className="gold-line" /> A LIFE, INTENTIONALLY SHARED
                  </span>
                  <h1>
                    {scope === "shared" ? (
                      <>
                        Your own paths.
                        <br />
                        <em>A shared horizon.</em>
                      </>
                    ) : (
                      <>
                        Room to grow.
                        <br />
                        <em>Space to be you.</em>
                      </>
                    )}
                  </h1>
                  <p>
                    {scope === "shared"
                      ? "Rooted in faith. Driven by purpose. Built together, one meaningful day at a time."
                      : `Welcome, ${currentName}. Make space for the person you’re becoming, at a pace that feels like yours.`}
                  </p>
                  <button
                    className="hero-link"
                    onClick={() => navigate("vision")}
                  >
                    Explore {scope === "shared" ? "our" : "your"} vision{" "}
                    <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="horizon-art" aria-hidden="true">
                  <div className="sun-disc" />
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="mountain mountain-back" />
                  <div className="mountain mountain-front" />
                  <span className="art-coordinate">
                    INDIVIDUALLY ROOTED
                    <br />
                    TOGETHER, BECOMING
                  </span>
                  <span className="art-monogram">J</span>
                </div>
                <span className="hero-number">01 — JUNTOS</span>
              </section>
              <div className="home-heading">
                <div>
                  <span className="eyebrow">
                    THE EVERYDAY IS WHERE IT BEGINS
                  </span>
                  <h2>A little intention for today.</h2>
                </div>
                <span className="subtle-label">
                  <Sun size={15} /> Make room for what matters
                </span>
              </div>
              <section className="home-grid">
                <div className="agenda">
                  <div className="section-heading">
                    <h3>In front of us</h3>
                    <span className="count">
                      {
                        scoped.filter(
                          (r) =>
                            ["task", "goal"].includes(r.kind) &&
                            r.status !== "done",
                        ).length
                      }{" "}
                      open
                    </span>
                  </div>
                  {recordList(
                    scoped
                      .filter(
                        (r) =>
                          ["task", "goal"].includes(r.kind) &&
                          r.status !== "done",
                      )
                      .slice(0, 4),
                    "Choose one meaningful next step.",
                  )}
                  <button
                    className="text-button"
                    onClick={() => create("personal", { kind: "goal" })}
                  >
                    <Plus size={14} /> Set an intention
                  </button>
                </div>
                <div className="daily-reflection">
                  <span className="eyebrow">
                    <BookOpen size={15} /> A MOMENT OF FAITH
                  </span>
                  <h3>
                    What is God
                    <br />
                    teaching you in
                    <br />
                    <em>this season?</em>
                  </h3>
                  <p>Begin with a passage. Leave room to listen.</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      navigate("faith");
                      create("faith", { kind: "reflection" });
                    }}
                  >
                    Take a quiet moment <ArrowRight size={15} />
                  </button>
                </div>
              </section>
              <section className="pathways" aria-label="Explore workspaces">
                {[
                  {
                    id: "performance" as Domain,
                    n: "01",
                    title: "Build your strength",
                    sub: "TRAINING & RECOVERY",
                    Icon: Dumbbell,
                  },
                  {
                    id: "business" as Domain,
                    n: "02",
                    title: "Bring ideas to life",
                    sub: "BUSINESS & PURPOSE",
                    Icon: BriefcaseBusiness,
                  },
                  {
                    id: "studio" as Domain,
                    n: "03",
                    title: "Create something new",
                    sub: "YOUR DIGITAL STUDIO",
                    Icon: Palette,
                  },
                ].map(({ id, n, title, sub, Icon }) => (
                  <button
                    className={`pathway ${id}`}
                    key={id}
                    onClick={() => navigate(id)}
                  >
                    <div className="pathway-top">
                      <Icon size={22} />
                      <span>{n}</span>
                    </div>
                    <span className="eyebrow">{sub}</span>
                    <h3>{title}</h3>
                    <ArrowUpRight size={20} />
                  </button>
                ))}
              </section>
              <section className="connection-strip">
                <div className="connection-symbol">
                  <HeartHandshake size={25} />
                </div>
                <div>
                  <span className="eyebrow">
                    KNOW EACH OTHER, A LITTLE MORE
                  </span>
                  <h3>{PROMPTS[promptIndex][1]}</h3>
                  <p>No right answer. No rush. Just curiosity.</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    navigate("connect");
                    create("connect", {
                      kind: "reflection",
                      title: PROMPTS[promptIndex][1],
                    });
                  }}
                >
                  Make space for it <ArrowUpRight size={15} />
                </button>
              </section>
            </>
          ) : (
            <>
              <section className={`page-intro ${view}`}>
                <span className="eyebrow">
                  {view === "home" ? "FIND WHAT MATTERS" : COPY[view].eyebrow}
                </span>
                <h1>{view === "home" ? "In your space." : COPY[view].title}</h1>
                <p>
                  {view === "home"
                    ? "Entries you can access in the selected context."
                    : COPY[view].description}
                </p>
              </section>
              {view === "faith" && (
                <div className="feature-panel faith-panel">
                  <BookOpen size={28} />
                  <div>
                    <span className="eyebrow">
                      READ · REFLECT · CHOOSE TO SHARE
                    </span>
                    <h2>Let the words take root.</h2>
                    <p>
                      Read Colossians 3:12–17 in your preferred translation,
                      then write your own reflection. Each person chooses
                      independently when to share.
                    </p>
                    <div className="inline-actions">
                      <a
                        className="text-button"
                        href="https://www.bible.com/bible/compare/COL.3.12-17"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Bible reader <ArrowUpRight size={15} />
                      </a>
                      <button
                        className="secondary"
                        onClick={() =>
                          create("faith", {
                            kind: "reflection",
                            title: "What is God teaching me?",
                            metadata: { passage: "Colossians 3:12–17" },
                          })
                        }
                      >
                        Reflect privately <Lock size={13} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => create("faith", { kind: "prayer" })}
                      >
                        Add a prayer <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {view === "connect" && (
                <div className="prompt-feature">
                  <span className="eyebrow">
                    {PROMPTS[promptIndex][0]} · AN OPEN INVITATION
                  </span>
                  <h2>{PROMPTS[promptIndex][1]}</h2>
                  <p>Answer for yourself first. You decide what to share.</p>
                  <div className="inline-actions">
                    <button
                      className="primary"
                      onClick={() =>
                        create("connect", {
                          kind: "reflection",
                          title: PROMPTS[promptIndex][1],
                        })
                      }
                    >
                      Reflect privately <Lock size={14} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        setPromptIndex((promptIndex + 1) % PROMPTS.length)
                      }
                    >
                      Another question <RefreshCw size={14} />
                    </button>
                    <button className="text-button" onClick={() => setAi(true)}>
                      Help me find my words <Sparkles size={14} />
                    </button>
                  </div>
                </div>
              )}
              {view === "performance" && (
                <>
                  <div className="performance-overview">
                    <div>
                      <span className="eyebrow">YOUR TRAINING JOURNAL</span>
                      <div className="large-stat">
                        {filtered.filter((r) => r.kind === "workout").length}
                        <span>logged sessions</span>
                      </div>
                    </div>
                    <div>
                      <span className="eyebrow">
                        CONSISTENCY, ON YOUR TERMS
                      </span>
                      <h3>Train. Recover. Repeat.</h3>
                      <p>Your progress belongs to you.</p>
                    </div>
                    <button
                      className="primary"
                      onClick={() => create("performance", { kind: "workout" })}
                    >
                      <Plus size={16} /> Log a workout
                    </button>
                  </div>
                  <div className="prep-bar">
                    <div>
                      <Flag size={18} />
                      <span>
                        Prep Mode
                        <small>
                          Competition planner · this view stays on for this
                          session
                        </small>
                      </span>
                    </div>
                    <button
                      className={`switch ${prep ? "on" : ""}`}
                      role="switch"
                      aria-checked={prep}
                      aria-label="Prep Mode"
                      onClick={() => setPrep(!prep)}
                    >
                      <span />
                    </button>
                  </div>
                  {prep && (
                    <div className="prep-content">
                      <h3>
                        A stage is a milestone. Your health is the foundation.
                      </h3>
                      <p>
                        Plan posing, check-ins, travel, and coach-directed
                        milestones. This planner does not prescribe diet, drugs,
                        or peak-week protocols.
                      </p>
                      <div className="inline-actions">
                        <button
                          className="secondary"
                          onClick={() =>
                            create("performance", {
                              kind: "prep",
                              title: "Competition milestone",
                              metadata: { prep: true },
                            })
                          }
                        >
                          Add prep milestone <Plus size={15} />
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            create("performance", {
                              kind: "prep",
                              title: "Posing practice",
                              metadata: { prep: true },
                            })
                          }
                        >
                          Log posing practice
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            create("business", {
                              kind: "project",
                              title: "Sponsorship plan",
                            })
                          }
                        >
                          Plan sponsorship
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="inline-actions wellness-actions">
                    <button
                      className="text-button"
                      onClick={() =>
                        create("performance", { kind: "wellness" })
                      }
                    >
                      <Leaf size={15} /> Log recovery & wellness
                    </button>
                    <span className="muted">
                      Tracking supports your plan. Medical concerns belong with
                      a qualified professional.
                    </span>
                  </div>
                </>
              )}
              {view === "performance" && <TrainingHistory records={filtered} />}
              {view === "business" && (
                <div className="budget-strip">
                  <div>
                    <span className="eyebrow">PLANNING BUDGET</span>
                    <p>
                      Estimated expenses across this context · not accounting or
                      bank data
                    </p>
                  </div>
                  {(["USD", "BRL"] as const).map((currency) => (
                    <span key={currency}>
                      <strong>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency,
                        }).format(
                          filtered
                            .filter(
                              (r) =>
                                r.kind === "expense" &&
                                r.metadata.currency === currency,
                            )
                            .reduce(
                              (sum, r) => sum + (r.metadata.amount ?? 0),
                              0,
                            ),
                        )}
                      </strong>
                      {currency}
                    </span>
                  ))}
                  <button
                    className="text-button"
                    onClick={() => create("business", { kind: "expense" })}
                  >
                    <Plus size={15} /> Plan an expense
                  </button>
                </div>
              )}
              {view === "studio" && (
                <div className="studio-flow">
                  {["Idea", "Concept", "Production", "Review", "Ready"].map(
                    (s, i) => (
                      <div key={s}>
                        <span>0{i + 1}</span>
                        <h3>{s}</h3>
                        <small>
                          {
                            filtered.filter(
                              (r) =>
                                r.kind === "campaign" &&
                                (r.metadata.stage ?? "idea") ===
                                  s.toLowerCase(),
                            ).length
                          }{" "}
                          briefs
                        </small>
                        {i < 4 && <ChevronRight size={17} />}
                      </div>
                    ),
                  )}
                </div>
              )}
              {view === "business" && (
                <div className="business-actions">
                  <button
                    onClick={() => create("business", { kind: "project" })}
                  >
                    <BriefcaseBusiness size={20} />
                    <span>
                      Start with a project
                      <small>A purpose, a plan, a next step</small>
                    </span>
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => create("business", { kind: "decision" })}
                  >
                    <NotebookPen size={20} />
                    <span>
                      Keep a decision
                      <small>Remember the why behind the work</small>
                    </span>
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() =>
                      create("business", {
                        kind: "project",
                        title: "Sponsorship workspace",
                        body: "Campaign goal:\n\nDeliverables:\n\nCompetition / event:\n\nPlanning budget:\n\nNext outreach step:\n",
                      })
                    }
                  >
                    <Flag size={20} />
                    <span>
                      Build a sponsorship
                      <small>Connect the stage, story, and studio</small>
                    </span>
                    <Plus size={16} />
                  </button>
                </div>
              )}
              <div className="section-heading records-heading">
                <h2>
                  {query
                    ? `Results for “${query}”`
                    : view === "vision"
                      ? "Your living roadmap"
                      : view === "memories"
                        ? "The story so far"
                        : scope === "shared"
                          ? "In our shared space"
                          : "In your space"}
                </h2>
                <button
                  className="text-button"
                  onClick={() => create(view === "home" ? "personal" : view)}
                >
                  <Plus size={15} />
                  {view === "home" ? "Add an entry" : COPY[view].action}
                </button>
              </div>
              {view === "vision" ? (
                <div className="roadmap">
                  {[
                    {
                      id: "now",
                      title: "Here & now",
                      sub: "A step you can take",
                    },
                    {
                      id: "next",
                      title: "The next chapter",
                      sub: "Possibilities taking shape",
                    },
                    {
                      id: "future",
                      title: "Beyond the horizon",
                      sub: "Room for the bigger dreams",
                    },
                  ].map(({ id, title, sub }) => (
                    <section key={id}>
                      <div className="roadmap-heading">
                        <span className="roadmap-dot" />
                        <span className="eyebrow">{sub}</span>
                        <h3>{title}</h3>
                      </div>
                      {filtered
                        .filter((r) => (r.metadata.horizon ?? "future") === id)
                        .map((r) => (
                          <button
                            key={r.id}
                            className="dream"
                            onClick={() => setDetail(r.id)}
                          >
                            <Mountain size={18} />
                            <h3>{r.title}</h3>
                            <p>{r.body}</p>
                            <Audience record={r} />
                            <ArrowUpRight size={15} />
                          </button>
                        ))}
                      <button
                        className="roadmap-add"
                        onClick={() =>
                          create("vision", {
                            kind: "dream",
                            metadata: {
                              horizon: id as "now" | "next" | "future",
                            },
                          })
                        }
                      >
                        <Plus size={16} /> Add a possibility
                      </button>
                    </section>
                  ))}
                </div>
              ) : view === "studio" ? (
                <div className="brief-grid">
                  {filtered.map((r) => (
                    <button
                      key={r.id}
                      className="brief"
                      onClick={() => setDetail(r.id)}
                    >
                      <div className="brief-art">
                        <span className="brief-lines" />
                        <span>
                          {(r.metadata.stage ?? "idea").toUpperCase()}
                        </span>
                        <Palette size={36} />
                      </div>
                      <div className="brief-text">
                        <span className="eyebrow">CREATIVE BRIEF</span>
                        <h3>{r.title}</h3>
                        <p>{r.metadata.objective ?? r.body}</p>
                        <Audience record={r} />
                        <ArrowUpRight size={17} />
                      </div>
                    </button>
                  ))}
                  {!filtered.length &&
                    recordList([], "Your next idea starts here.")}
                </div>
              ) : view === "memories" ? (
                <div className="timeline">
                  {filtered.map((r) => (
                    <article key={r.id}>
                      <div className="timeline-date">
                        {new Date(r.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <button onClick={() => setDetail(r.id)}>
                        <span className="eyebrow">A MOMENT TO KEEP</span>
                        <h2>{r.title}</h2>
                        <p>{r.body}</p>
                        <Audience record={r} />
                        <ArrowUpRight size={18} />
                      </button>
                    </article>
                  ))}
                  {!filtered.length &&
                    recordList([], "Keep the moments that matter.")}
                </div>
              ) : (
                recordList(filtered)
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              LEGACY <em>JUNTOS</em>
            </span>
            <p>Two lives. Growing individually. Building together.</p>
            <span className="footer-leaf">
              <Leaf size={16} />
            </span>
          </footer>
        </main>
      </div>
      <button
        className="floating-ai"
        aria-label="Open Juntos assistant"
        onClick={() => setAi(true)}
      >
        <Sparkles size={20} />
        <span>Think with Juntos</span>
      </button>
      {notice && (
        <div role="status" className="toast">
          <Check size={17} />
          {notice}
        </div>
      )}
      {edit && (
        <Editor
          {...edit}
          userId={userId}
          members={members}
          onClose={() => setEdit(null)}
          onSave={save}
        />
      )}
      {ai && (
        <AiPanel
          records={visible}
          demo={demo}
          request={request}
          onClose={() => setAi(false)}
          onDraft={(initial) => {
            setAi(false);
            create("personal", initial);
          }}
        />
      )}
      {activeDetail && !edit && (
        <Modal title={activeDetail.title} onClose={() => setDetail(null)} wide>
          <div className="detail">
            <div className="detail-meta">
              <Audience record={activeDetail} />
              <span>
                {
                  members.find((m) => m.user_id === activeDetail.owner_id)
                    ?.display_name
                }{" "}
                · {kindLabel(activeDetail.kind)} · {activeDetail.status}
              </span>
            </div>
            {activeDetail.metadata.passage && (
              <div className="passage">
                <BookOpen size={20} />
                <span>
                  {activeDetail.metadata.passage}
                  <small>
                    Passage reference · notes below are personal reflection
                  </small>
                </span>
              </div>
            )}
            <p className="record-body">
              {activeDetail.body || "Room to add your thoughts."}
            </p>
            {activeDetail.metadata.sets && (
              <>
                <div className="workout-summary">
                  {(["lb", "kg"] as const)
                    .filter((u) =>
                      activeDetail.metadata.sets!.some((s) => s.unit === u),
                    )
                    .map((u) => (
                      <span key={u}>
                        <strong>
                          {volume(
                            activeDetail.metadata.sets!,
                            u,
                          ).toLocaleString()}
                        </strong>
                        {u} total volume
                      </span>
                    ))}
                  <span>
                    <strong>{activeDetail.metadata.sets.length}</strong>sets
                    logged
                  </span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Exercise</th>
                        <th>Reps</th>
                        <th>Load</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDetail.metadata.sets.map((s, i) => (
                        <tr key={i}>
                          <td>{s.exercise}</td>
                          <td>{s.reps}</td>
                          <td>
                            {s.weight} {s.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {activeDetail.kind === "wellness" && (
              <div className="workout-summary">
                {activeDetail.metadata.sleep !== undefined && (
                  <span>
                    <strong>{activeDetail.metadata.sleep}</strong>hours of sleep
                  </span>
                )}
                {activeDetail.metadata.energy !== undefined && (
                  <span>
                    <strong>{activeDetail.metadata.energy}/5</strong>
                    self-reported energy
                  </span>
                )}
              </div>
            )}
            {activeDetail.kind === "campaign" && (
              <div className="brief-detail">
                {[
                  ["Audience", activeDetail.metadata.audience],
                  ["Objective", activeDetail.metadata.objective],
                  [
                    "Visual direction / image prompt",
                    activeDetail.metadata.visual,
                  ],
                  ["Deliverables", activeDetail.metadata.deliverables],
                ].map(
                  ([label, value]) =>
                    value && (
                      <section key={label}>
                        <span className="eyebrow">{label}</span>
                        <p>{value}</p>
                      </section>
                    ),
                )}
                <p className="privacy-note">
                  This is an editable creative brief. Image generation and
                  social publishing are not connected.
                </p>
              </div>
            )}
            {activeDetail.owner_id === userId && (
              <div className="inline-actions">
                <button
                  className="secondary"
                  onClick={() =>
                    setEdit({
                      domain: activeDetail.domain,
                      record: activeDetail,
                    })
                  }
                >
                  Edit / change audience <NotebookPen size={15} />
                </button>
                <button
                  className="text-button danger"
                  onClick={() => setDeleteId(activeDetail.id)}
                >
                  Delete entry
                </button>
              </div>
            )}
            {["project", "campaign"].includes(activeDetail.kind) && (
              <div className="inline-actions linked-actions">
                <button
                  className="text-button"
                  onClick={() =>
                    setEdit({
                      domain: "business",
                      parent: activeDetail,
                      initial: { kind: "task", title: "" },
                    })
                  }
                >
                  <Plus size={14} /> Add linked task
                </button>
                {activeDetail.kind === "project" && (
                  <button
                    className="text-button"
                    onClick={() =>
                      setEdit({
                        domain: "studio",
                        parent: activeDetail,
                        initial: {
                          kind: "campaign",
                          title: "",
                          metadata: { stage: "idea" },
                        },
                      })
                    }
                  >
                    <Palette size={14} /> Add creative brief
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={() =>
                    setEdit({
                      domain: "business",
                      parent: activeDetail,
                      initial: { kind: "expense", title: "" },
                    })
                  }
                >
                  Plan an expense
                </button>
              </div>
            )}
            {activeDetail.kind === "expense" && (
              <p className="budget-total">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: activeDetail.metadata.currency ?? "USD",
                }).format(activeDetail.metadata.amount ?? 0)}{" "}
                <small>planned expense</small>
              </p>
            )}
            {activeDetail.kind !== "comment" && (
              <section className="replies">
                <div className="section-heading">
                  <h3>
                    {activeDetail.visibility === "private"
                      ? "Follow-up notes"
                      : "The conversation"}
                  </h3>
                  <button
                    className="text-button"
                    onClick={() =>
                      setEdit({
                        domain: activeDetail.domain,
                        parent: activeDetail,
                        initial: {
                          kind: "comment",
                          title: `Re: ${activeDetail.title}`.slice(0, 180),
                        },
                      })
                    }
                  >
                    <Plus size={14} /> Add a thought
                  </button>
                </div>
                {visible
                  .filter((r) => r.parent_id === activeDetail.id)
                  .map((r) => (
                    <article className="reply" key={r.id}>
                      <span className="eyebrow">
                        {
                          members.find((m) => m.user_id === r.owner_id)
                            ?.display_name
                        }
                      </span>
                      <p>{r.body}</p>
                      {r.kind !== "comment" && (
                        <button
                          className="text-button"
                          onClick={() => setDetail(r.id)}
                        >
                          Open {kindLabel(r.kind).toLowerCase()}{" "}
                          <ArrowUpRight size={13} />
                        </button>
                      )}
                      {r.owner_id === userId && (
                        <button
                          className="text-button"
                          onClick={() =>
                            setEdit({ domain: r.domain, record: r })
                          }
                        >
                          Edit reply
                        </button>
                      )}
                    </article>
                  ))}
                {!visible.some((r) => r.parent_id === activeDetail.id) && (
                  <p className="muted">
                    Space to add perspective, keep a decision, or choose a next
                    step.
                  </p>
                )}
              </section>
            )}
          </div>
        </Modal>
      )}
      {deleteId && (
        <Modal title="Delete this entry?" onClose={() => setDeleteId(null)}>
          <div className="detail">
            <p>
              This removes the entry from the app. People may already have read
              or exported shared content. Linked replies must be removed first.
            </p>
            <div className="inline-actions">
              <button className="secondary" onClick={() => setDeleteId(null)}>
                Keep it
              </button>
              <button
                className="primary"
                disabled={deleting}
                onClick={() => void remove()}
              >
                {deleting ? "Deleting…" : "Delete entry"}
              </button>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
      {privacy && (
        <Modal
          title="Your space. Your boundaries."
          onClose={() => setPrivacy(false)}
        >
          <div className="detail privacy-settings">
            <ShieldCheck size={28} />
            <p>
              You own your private space. Sharing is always a deliberate choice.
            </p>
            <section>
              <h3>
                <Lock size={16} /> Private to me
              </h3>
              <p>Visible only to you. Excluded from shared AI context.</p>
              <h3>
                <Users size={16} /> Shared with someone
              </h3>
              <p>
                Visible to you and the named recipient. Not included in Juntos
                AI context.
              </p>
              <h3>
                <Users size={16} /> Juntos space
              </h3>
              <p>
                Visible to workspace members. Available to shared AI only when
                explicitly selected.
              </p>
            </section>
            <p className="privacy-note">
              This app uses access controls, not end-to-end encryption. Revoking
              access cannot erase what someone already read or copied. In
              connected mode, open views refresh every 30 seconds and when you
              return to the app.
            </p>
            {demo && (
              <label>
                Sample identity{" "}
                <select
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setDetail(null);
                    setEdit(null);
                    setAi(false);
                    setPrep(false);
                  }}
                >
                  {demoMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
                <small>
                  For exploring sample boundaries only. This is not
                  authentication.
                </small>
              </label>
            )}
            <button className="secondary" onClick={exportData}>
              <Download size={16} /> Export accessible entries
            </button>
            {!demo && (
              <button
                className="text-button"
                onClick={async () => {
                  sessionEpoch.current++;
                  setPrivacy(false);
                  setDetail(null);
                  setEdit(null);
                  setAi(false);
                  setRecords([]);
                  await browserDb().auth.signOut();
                  setRecords([]);
                  setSignedIn(false);
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            )}
            <p className="muted">
              No private content is stored in the offline cache. AI, voice, and
              image services require their own configured connections.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TrainingHistory({ records }: { records: LifeRecord[] }) {
  const workouts = records
    .filter((r) => r.kind === "workout")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const allSets = workouts.flatMap((r) => r.metadata.sets ?? []);
  const exercises = Array.from(
    new Set(allSets.map((s) => s.exercise.toLowerCase())),
  );
  const measurements = records
    .filter((r) => r.kind === "wellness" && r.metadata.bodyweight !== undefined)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!workouts.length && !measurements.length) return null;
  return (
    <details className="training-history">
      <summary>Training history & measurements</summary>
      {workouts.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Best logged load</th>
                <th>Recent session</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((exercise) => (
                <tr key={exercise}>
                  <td>
                    {
                      allSets.find((s) => s.exercise.toLowerCase() === exercise)
                        ?.exercise
                    }
                  </td>
                  <td>
                    {(["lb", "kg"] as const)
                      .filter((unit) =>
                        allSets.some(
                          (s) =>
                            s.exercise.toLowerCase() === exercise &&
                            s.unit === unit,
                        ),
                      )
                      .map((unit) => (
                        <span className="unit-value" key={unit}>
                          {personalBest(allSets, exercise, unit)} {unit}
                        </span>
                      ))}
                  </td>
                  <td>
                    {
                      workouts.find((r) =>
                        r.metadata.sets?.some(
                          (s) => s.exercise.toLowerCase() === exercise,
                        ),
                      )?.title
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {measurements.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Recorded</th>
                <th>Bodyweight</th>
                <th>Sleep</th>
                <th>Energy</th>
              </tr>
            </thead>
            <tbody>
              {measurements.slice(0, 12).map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleDateString("en-US")}</td>
                  <td>
                    {r.metadata.bodyweight} {r.metadata.unit ?? "lb"}
                  </td>
                  <td>{r.metadata.sleep ?? "—"}</td>
                  <td>{r.metadata.energy ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p>
        Best load compares only the same exercise name and unit. These are
        observations, not training or medical recommendations.
      </p>
    </details>
  );
}
