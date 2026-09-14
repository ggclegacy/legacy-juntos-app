"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { initialSession, sessionReducer, silentAudio, type ApolloVoiceTransport } from "@/lib/apollo/session";

/** Optional voice adapter. No provider or microphone is started on mount.
 * The factory must return a NEW transport for each connection attempt.
 * Scope changes tear down media and ignore stale callbacks before a new session.
 */
export function useVoiceSession(scope: { userId: string; context: "private" | "shared" }, factory?: () => ApolloVoiceTransport) {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);
  const [transcript, setTranscript] = useState("");
  const key = `${scope.userId}:${scope.context}`;
  const [previousKey, setPreviousKey] = useState(key);
  if (key !== previousKey) {
    setPreviousKey(key); setTranscript(""); dispatch({ type: "end" });
  }
  const active = useRef<ApolloVoiceTransport | null>(null);
  const generation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const releases = useRef<(() => void)[]>([]);
  const stop = useCallback(() => {
    generation.current++;
    abort.current?.abort(); abort.current = null;
    releases.current.splice(0).forEach(release => release());
    active.current?.end(); active.current = null;
  }, []);
  useEffect(() => {
    const offline = () => { stop(); dispatch({ type: "offline" }); };
    window.addEventListener("offline", offline);
    return () => { stop(); window.removeEventListener("offline", offline); };
  }, [scope.userId, scope.context, stop]);
  const connect = useCallback(async () => {
    stop(); setTranscript("");
    if (!factory) return false;
    const epoch = generation.current;
    const transport = factory(); active.current = transport;
    const controller = new AbortController(); abort.current = controller;
    dispatch({ type: "connect" });
    releases.current.push(transport.subscribe(event => {
      if (epoch !== generation.current) return;
      if (event.type === "speech-start") transport.interrupt();
      dispatch(event);
    }), transport.subscribeText(delta => {
      if (epoch !== generation.current) return;
      dispatch({ type: "text-delta" }); setTranscript(text => text + delta);
    }));
    try {
      await transport.connect(scope, controller.signal);
      if (epoch !== generation.current) { transport.end(); return false; }
      dispatch({ type: "ready" }); return true;
    } catch {
      if (epoch === generation.current) { stop(); dispatch({ type: navigator.onLine ? "error" : "offline" }); }
      return false;
    }
  }, [factory, scope, stop]);
  return {
    state, transcript, available: !!factory, connect, reconnect: connect,
    sampleAudio: useCallback(() => active.current?.sampleAudio() ?? silentAudio, []),
    setMuted(muted: boolean) { active.current?.setMuted(muted); dispatch({ type: "mute", muted }); },
    interrupt() { active.current?.interrupt(); dispatch({ type: "interrupt" }); },
    end() { stop(); dispatch({ type: "end" }); setTranscript(""); },
  };
}
