"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { payloadSchema, type Payload, type TrainingDoc } from "./model";
import { readCache, writeCache, type Cache } from "./storage";
export type Requester = (
  path: string,
  init?: RequestInit,
) => Promise<{
  documents?: TrainingDoc[];
  nextOffset?: number | null;
  document?: TrainingDoc;
  program?: unknown;
}>;
export function useTraining(key: string, demo: boolean, request: Requester) {
  const [docs, setDocs] = useState<TrainingDoc[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Loading training…"),
    [trusted, setTrusted] = useState(demo);
  const state = useRef<Cache>({ docs: [], pending: [] }),
    allowed = useRef(demo),
    alive = useRef(true),
    serial = useRef(Promise.resolve()),
    busy = useRef(false),
    diskSerial = useRef(Promise.resolve());
  const persist = useCallback(() => {
    const next = diskSerial.current.then(async () => {
      if (allowed.current && alive.current) {
        const stamp = await writeCache(
          key,
          structuredClone(state.current),
          state.current.stamp,
        );
        state.current.stamp = stamp;
      }
    });
    diskSerial.current = next.catch(() => {});
    return next;
  }, [key]);
  const sync = useCallback(async () => {
    if (demo || busy.current || !alive.current || !state.current.pending.length)
      return;
    busy.current = true;
    try {
      while (state.current.pending.length && alive.current) {
        const id = state.current.pending[0],
          sent = state.current.docs.find((d) => d.id === id)!;
        const result = await request("/api/training", {
          method: "PUT",
          body: JSON.stringify({
            id,
            revision: sent.revision,
            payload: sent.payload,
          }),
        });
        if (!alive.current) return;
        const latest = state.current.docs.find((d) => d.id === id)!;
        const unchanged = latest === sent;
        state.current.docs = state.current.docs.map((d) =>
          d.id === id
            ? {
                ...d,
                revision: result.document!.revision,
                updated_at: result.document!.updated_at,
              }
            : d,
        );
        if (unchanged)
          state.current.pending = state.current.pending.filter((p) => p !== id);
        await persist();
        setDocs([...state.current.docs]);
      }
      setStatus("Synced privately");
      setError("");
    } catch (e) {
      if (alive.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Sync failed. Your draft is retained.",
        );
        setStatus(
          allowed.current
            ? "Saved on this device · sync pending"
            : "Unsynced · keep this page open",
        );
      }
    } finally {
      busy.current = false;
    }
  }, [demo, request, persist]);
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    (async () => {
      try {
        const cache = await readCache(key);
        if (cancelled) return;
        if (cache) {
          state.current = cache;
          allowed.current = true;
          setTrusted(true);
        }
        if (!demo) {
          let offset: number | null = 0;
          const remote: TrainingDoc[] = [];
          do {
            const page = await request(`/api/training?offset=${offset}`);
            remote.push(...page.documents!);
            offset = page.nextOffset ?? null;
          } while (offset !== null);
          if (cancelled) return;
          state.current.docs = [
            ...remote.filter((d) => !state.current.pending.includes(d.id)),
            ...state.current.docs.filter((d) =>
              state.current.pending.includes(d.id),
            ),
          ];
        }
        setStatus(
          demo ? "Saved on this device · sample account" : "Synced privately",
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load training.");
          setStatus("Connection unavailable");
        }
      }
      if (!cancelled) {
        setDocs([...state.current.docs]);
        setReady(true);
        void sync();
      }
    })();
    const online = () => void sync();
    window.addEventListener("online", online);
    const unload = (e: BeforeUnloadEvent) => {
      if (state.current.pending.length && !allowed.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      cancelled = true;
      alive.current = false;
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", unload);
    };
  }, [key, demo, request, sync]);
  const save = useCallback(
    (payload: Payload, id = crypto.randomUUID()): Promise<string> => {
      const parsed = payloadSchema.parse(payload);
      const work = serial.current.then(async () => {
        const old = state.current.docs.find((d) => d.id === id);
        const doc = {
          id,
          revision: demo ? (old?.revision ?? 0) + 1 : (old?.revision ?? 0),
          payload: parsed,
          updated_at: new Date().toISOString(),
        };
        state.current.docs = [
          doc,
          ...state.current.docs.filter((d) => d.id !== id),
        ];
        if (!demo && !state.current.pending.includes(id))
          state.current.pending.push(id);
        setDocs([...state.current.docs]);
        setStatus("Saving…");
        try {
          await persist();
          setStatus(
            demo
              ? "Saved on this device · sample account"
              : allowed.current
                ? "Saved on this device · syncing"
                : "Syncing…",
          );
          setError("");
          void sync();
        } catch {
          setError(
            "Device storage failed or another tab changed it. Export this copy before reloading.",
          );
          setStatus("Not saved on device");
          throw new Error(
            "Device storage failed or another tab changed it. Export this copy before reloading.",
          );
        }
      });
      serial.current = work.catch(() => {});
      return work.then(() => id);
    },
    [demo, persist, sync],
  );
  const trust = async (value: boolean) => {
    if (!value && state.current.pending.length)
      throw new Error(
        "Sync or export pending changes before clearing device storage.",
      );
    allowed.current = value;
    setTrusted(value);
    if (value) await persist();
    else {
      await writeCache(key, null);
      state.current.stamp = undefined;
    }
  };
  return { docs, ready, error, status, trusted, save, sync, trust };
}
