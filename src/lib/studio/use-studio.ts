"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  entryInput,
  readable,
  audienceFits,
  type Entry,
  type EntryInput,
  type Version,
  type Review,
  type Job,
  type Metric,
} from "./model";
import { catalog } from "./router";
export type ProviderStatus = {
  key: string;
  provider: string;
  model: string;
  modality: string;
  configured: boolean;
  enabled: boolean;
  references: number;
  ratios: string[];
  transparency: boolean;
};
export type StudioResponse = {
  entries?: Entry[];
  entry?: Entry;
  nextOffset?: number | null;
  providers?: ProviderStatus[];
  versions?: Version[];
  version?: Version;
  reviews?: Review[];
  review?: Review;
  jobs?: Job[];
  job?: Job;
  metrics?: Metric[];
  metric?: Metric;
  url?: string;
};
export type StudioRequest = (
  path: string,
  init?: RequestInit,
) => Promise<StudioResponse>;
function sampleEntries(owner: string, workspace: string): Entry[] {
  const make = (
    kind: EntryInput["kind"],
    title: string,
    body: string,
    details: Partial<EntryInput["details"]> = {},
    extra: Partial<EntryInput> = {},
  ): Entry => ({
    ...entryInput.parse({
      kind,
      title,
      body,
      details,
      visibility: "shared",
      context: "juntos",
      ...extra,
    }),
    id: crypto.randomUUID(),
    owner_id: owner,
    workspace_id: workspace,
    revision: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const brand = make(
    "brand",
    "Legacy Sanctum",
    "Sample brand direction — edit to make it yours.",
    {
      tone: "Grounded, ambitious, precise. Speak from experience.",
      colors: "Obsidian · emerald · warm gold",
      pillars: "Craft, founder journey, community",
      boundaries: "No invented testimonials or unapproved product claims",
    },
  );
  const campaign = make(
    "campaign",
    "The story behind what we build",
    "Illustrative campaign — no content has been produced or published.",
    {
      objective: "Introduce the people and purpose behind the brand",
      concept: "Small details. Lasting legacy.",
      platforms: ["instagram", "facebook"],
      tasks:
        "Choose the story\nCapture behind-the-scenes footage\nReview together",
    },
    { brand_id: brand.id },
  );
  return [
    brand,
    campaign,
    make(
      "idea",
      "A founder moment worth keeping",
      "Capture the lesson behind this week's hardest decision.",
      {},
      { brand_id: brand.id, campaign_id: campaign.id, status: "idea" },
    ),
    make(
      "content",
      "The first chapter",
      "A sample production brief waiting for your voice.",
      {
        pillar: "Building in public",
        platforms: ["instagram"],
        shot_list:
          "Workspace detail\nFounder speaking to camera\nClose-up of the work",
      },
      { brand_id: brand.id, campaign_id: campaign.id, status: "draft" },
    ),
  ];
}
export function useStudio(
  userId: string,
  workspaceId: string,
  demo: boolean,
  request: StudioRequest,
) {
  const [entries, setEntries] = useState<Entry[]>([]),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [providers, setProviders] = useState<ProviderStatus[]>(
      catalog.map((m) => ({ ...m, configured: false, enabled: false })),
    );
  const live = useRef(false),
    lock = useRef(false),
    generation = useRef(0),
    state = useRef<Entry[]>([]);
  const key = `legacy-studio-sample:${workspaceId}`;
  const call = useCallback(
    (path: string, init?: RequestInit) =>
      request(path, {
        ...init,
        headers: { ...init?.headers, "x-expected-user": userId },
      }),
    [request, userId],
  );
  const load = useCallback(async () => {
    if (demo) {
      let data: Entry[] =
        JSON.parse(sessionStorage.getItem(key) || "null") ??
        sampleEntries(userId, workspaceId);
      sessionStorage.setItem(key, JSON.stringify(data));
      data = data.filter((e) => readable(e, userId, workspaceId));
      return { entries: data };
    }
    const all: Entry[] = [];
    let offset: number | null = 0;
    let connected: ProviderStatus[] | undefined;
    do {
      const page = await call(`/api/studio?offset=${offset}`);
      all.push(...(page.entries ?? []));
      offset = page.nextOffset ?? null;
      connected = page.providers;
    } while (offset !== null);
    return { entries: all, providers: connected };
  }, [demo, key, userId, workspaceId, call]);
  const reload = useCallback(async () => {
    const version = ++generation.current;
    try {
      const data = await load();
      if (live.current && version === generation.current) {
        state.current = data.entries;
        setEntries(data.entries);
        if (data.providers) setProviders(data.providers);
        setError("");
        setReady(true);
      }
    } catch (e) {
      if (live.current && version === generation.current) {
        state.current = [];
        setEntries([]);
        setReady(false);
        setError(e instanceof Error ? e.message : "Studio unavailable.");
      }
    }
  }, [load]);
  useEffect(() => {
    live.current = true;
    let cancelled = false;
    const version = ++generation.current;
    load()
      .then((data) => {
        if (!cancelled && version === generation.current) {
          state.current = data.entries;
          setEntries(data.entries);
          if (data.providers) setProviders(data.providers);
          setError("");
          setReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          state.current = [];
          setEntries([]);
          setReady(false);
          setError(e instanceof Error ? e.message : "Studio unavailable.");
        }
      });
    return () => {
      cancelled = true;
      live.current = false;
    };
  }, [load]);
  const save = async (input: EntryInput, existing?: Entry) => {
    if (lock.current || !ready)
      throw new Error("Wait for the current save to finish.");
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = entryInput.parse(input);
      let result: Entry;
      if (demo) {
        if (existing && existing.owner_id !== userId)
          throw new Error("Only the owner can edit this entry.");
        result = {
          ...data,
          id: existing?.id ?? crypto.randomUUID(),
          owner_id: userId,
          workspace_id: workspaceId,
          revision: (existing?.revision ?? 0) + 1,
          created_at: existing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const all: Entry[] = JSON.parse(sessionStorage.getItem(key) || "[]");
        for (const linked of [
          result.brand_id,
          result.campaign_id,
          result.parent_id,
        ]) {
          if (!linked) continue;
          const parent = all.find((e) => e.id === linked);
          if (!parent || !audienceFits(result, parent))
            throw new Error("Linked brand/campaign audiences must match.");
        }
        if (result.recipient_id === userId)
          throw new Error("Choose the other member for a named share.");

        sessionStorage.setItem(
          key,
          JSON.stringify([...all.filter((e) => e.id !== result.id), result]),
        );
      } else {
        const response = await call("/api/studio", {
          method: existing ? "PATCH" : "POST",
          body: JSON.stringify(
            existing
              ? { id: existing.id, revision: existing.revision, entry: data }
              : { id: crypto.randomUUID(), entry: data },
          ),
        });
        if (!response.entry) throw new Error("Save did not return an entry.");
        result = response.entry;
      }
      if (live.current) {
        generation.current++;
        state.current = [
          ...state.current.filter((e) => e.id !== result.id),
          result,
        ];
        setEntries(state.current);
      }
      return result;
    } catch (e) {
      if (live.current)
        setError(e instanceof Error ? e.message : "Could not save.");
      throw e;
    } finally {
      lock.current = false;
      if (live.current) setBusy(false);
    }
  };
  return { entries, ready, busy, error, providers, reload, save, call };
}
