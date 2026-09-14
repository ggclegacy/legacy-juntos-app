"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  eventSchema,
  latest,
  payloadSchema,
  type HealthEvent,
  type Payload,
} from "./model";
export type HealthRequest = (
  path: string,
  init?: RequestInit,
) => Promise<{
  events?: HealthEvent[];
  event?: HealthEvent;
  nextOffset?: number | null;
  files?: { name: string; created_at: string }[];
  signedUrl?: string;
  review?: {
    observations: { text: string; recordIds: string[] }[];
    questions: string[];
    limitations: string[];
  };
}>;
export function useProtocols(
  userId: string,
  demo: boolean,
  request: HealthRequest,
) {
  const [events, setEvents] = useState<HealthEvent[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const live = useRef(false),
    state = useRef<HealthEvent[]>([]),
    lock = useRef(false);
  const pending = useRef<{ signature: string; event: HealthEvent } | null>(
    null,
  );
  const key = `legacy-protocol-sample:${userId}`;
  const load = useCallback(async () => {
    if (demo)
      return JSON.parse(sessionStorage.getItem(key) || "[]").map((e: unknown) =>
        eventSchema.parse(e),
      ) as HealthEvent[];
    const data: HealthEvent[] = [];
    let offset: number | null = 0;
    do {
      const page = await request(`/api/protocols?offset=${offset}`, {
        headers: { "x-expected-user": userId },
      });
      data.push(...(page.events ?? []).map((e) => eventSchema.parse(e)));
      offset = page.nextOffset ?? null;
    } while (offset !== null);
    return data;
  }, [demo, key, request, userId]);
  const accept = useCallback((data: HealthEvent[]) => {
    if (!live.current) return;
    state.current = data;
    setEvents(data);
    setReady(true);
    setError("");
  }, []);
  const reject = useCallback((e: unknown) => {
    if (live.current)
      setError(e instanceof Error ? e.message : "Could not load protocols.");
  }, []);
  const reload = useCallback(
    () => load().then(accept).catch(reject),
    [load, accept, reject],
  );
  useEffect(() => {
    live.current = true;
    let cancelled = false;
    void load()
      .then((data) => {
        if (!cancelled) accept(data);
      })
      .catch((e) => {
        if (!cancelled) reject(e);
      });
    return () => {
      cancelled = true;
      live.current = false;
    };
  }, [load, accept, reject]);
  const save = async (payload: Payload, entity?: HealthEvent) => {
    if (lock.current || !ready)
      throw new Error("Wait for storage to be ready.");
    lock.current = true;
    setBusy(true);
    try {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check your entries.");
      const p = parsed.data;
      const prior = entity
        ? latest(state.current).find((e) => e.entity_id === entity.entity_id)
        : undefined;
      if (entity && prior?.revision !== entity.revision)
        throw new Error("This record changed. Reopen it before saving.");
      const signature = JSON.stringify({
        payload: p,
        entity: entity?.entity_id,
        revision: prior?.revision,
      });
      let event: HealthEvent =
        pending.current?.signature === signature
          ? pending.current.event
          : {
              id: crypto.randomUUID(),
              entity_id: entity?.entity_id ?? crypto.randomUUID(),
              revision: (prior?.revision ?? 0) + 1,
              payload: p,
              created_at: new Date().toISOString(),
            };
      pending.current = { signature, event };
      if (!demo) {
        const { created_at: unused, ...input } = event;
        void unused;
        const response = await request("/api/protocols", {
          method: "POST",
          headers: { "x-expected-user": userId },
          body: JSON.stringify(input),
        });
        event = eventSchema.parse(response.event);
      }
      const next = [...state.current.filter((e) => e.id !== event.id), event];
      if (demo) sessionStorage.setItem(key, JSON.stringify(next));
      pending.current = null;
      if (live.current) {
        state.current = next;
        setEvents(next);
        setError("");
      }
    } finally {
      lock.current = false;
      if (live.current) setBusy(false);
    }
  };
  return { events, ready, error, busy, save, reload };
}
