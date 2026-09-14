export type ApolloState = "idle" | "connecting" | "listening" | "thinking" | "responding" | "speaking" | "interrupted" | "error" | "offline";
export type AudioFrame = { input: number; output: number; bass: number; treble: number };
export const silentAudio: AudioFrame = { input: 0, output: 0, bass: 0, treble: 0 };
export const stateLabels: Record<ApolloState, string> = {
  idle: "Here with you", connecting: "Connecting", listening: "Listening to you",
  thinking: "Thinking it through", responding: "Responding", speaking: "Apollo is speaking",
  interrupted: "Paused · your turn", error: "Something needs attention", offline: "You’re offline",
};
// speed, energy, green balance, surface distortion. Interpolated by the renderer.
export const stateVisuals: Record<ApolloState, readonly number[]> = {
  idle: [.13, .55, .35, .12], connecting: [.55, .9, .5, .24],
  listening: [.28, .8, .85, .25], thinking: [.6, .65, .25, .38],
  responding: [.4, .95, .45, .28], speaking: [.32, 1, .38, .3],
  interrupted: [.08, .4, .7, .08], error: [.04, .45, .05, .06], offline: [0, .22, .15, 0],
};
export type SessionEvent =
  | { type: "connect" | "ready" | "speech-start" | "speech-end" | "submit" | "text-delta" | "playback-start" | "playback-end" | "complete" | "interrupt" | "offline" | "error" | "end" }
  | { type: "mute"; muted: boolean };
export type SessionState = { phase: ApolloState; muted: boolean; connected: boolean };
export const initialSession: SessionState = { phase: "idle", muted: false, connected: false };
export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case "end": return initialSession;
    case "mute": return { ...state, muted: event.muted, phase: event.muted && state.phase === "listening" ? "idle" : state.phase };
    case "connect": return { ...state, phase: "connecting", connected: false };
    case "ready": return { ...state, phase: "idle", connected: true };
    case "offline": return { ...state, phase: "offline", connected: false };
    case "error": return { ...state, phase: "error", connected: false };
    case "speech-start": return state.connected && !state.muted ? { ...state, phase: "listening" } : state;
    case "speech-end": return state.phase === "listening" ? { ...state, phase: "thinking" } : state;
    case "submit": return { ...state, phase: "thinking" };
    case "text-delta": return state.phase === "thinking" || state.phase === "responding" ? { ...state, phase: "responding" } : state;
    case "playback-start": return state.connected && ["thinking", "responding"].includes(state.phase) ? { ...state, phase: "speaking" } : state;
    case "playback-end": return state.phase === "speaking" ? { ...state, phase: "idle" } : state;
    case "complete": return ["thinking", "responding"].includes(state.phase) ? { ...state, phase: "idle" } : state;
    case "interrupt": return { ...state, phase: "interrupted" };
  }
}
/** Future transports own credentials, microphone permission, VAD and playback.
 * Scope is issued by the authenticated server; never accept another member ID from a picker.
 * interrupt() must stop playback AND truncate unheard audio at the provider.
 * end() must stop media tracks, disconnect audio nodes, and close the connection.
 */
export interface ApolloVoiceTransport {
  connect(scope: { userId: string; context: "private" | "shared" }, signal: AbortSignal): Promise<void>;
  subscribe(listener: (event: SessionEvent) => void): () => void;
  subscribeText(listener: (delta: string) => void): () => void;
  sampleAudio(): AudioFrame;
  setMuted(muted: boolean): void;
  interrupt(): void;
  end(): void;
}
/** Reuse this sampler in a voice transport; it never requests microphone access. */
export function createAudioSampler(input: AnalyserNode, output: AnalyserNode) {
  const inputWave = new Float32Array(input.fftSize), outputWave = new Float32Array(output.fftSize);
  const spectrum = new Uint8Array(output.frequencyBinCount);
  const rms = (values: Float32Array) => Math.min(1, Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length) * 4);
  return (): AudioFrame => {
    input.getFloatTimeDomainData(inputWave); output.getFloatTimeDomainData(outputWave); output.getByteFrequencyData(spectrum);
    const band = (start: number, end: number) => {
      let sum = 0; for (let i = start; i < end; i++) sum += spectrum[i];
      return sum / Math.max(1, end - start) / 255;
    };
    return { input: rms(inputWave), output: rms(outputWave), bass: band(0, Math.floor(spectrum.length / 8)), treble: band(Math.floor(spectrum.length / 2), spectrum.length) };
  };
}
