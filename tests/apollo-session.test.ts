import { describe, expect, it } from "vitest";
import { initialSession, sessionReducer as reduce, stateLabels, stateVisuals } from "../src/lib/apollo/session";
describe("Apollo session boundaries", () => {
 it("never implies a microphone is listening without a connected unmuted session", () => {
  expect(reduce(initialSession, {type:"speech-start"})).toEqual(initialSession);
  const connected = reduce(initialSession, {type:"ready"});
  expect(reduce(connected, {type:"speech-start"}).phase).toBe("listening");
  const muted = reduce(connected, {type:"mute",muted:true});
  expect(reduce(muted, {type:"speech-start"}).phase).toBe("idle");
 });
 it("ignores late text and audio after interruption", () => {
  let state=reduce(initialSession,{type:"ready"});
  state=reduce(state,{type:"submit"});state=reduce(state,{type:"text-delta"});
  expect(state.phase).toBe("responding");state=reduce(state,{type:"playback-start"});
  expect(state.phase).toBe("speaking");state=reduce(state,{type:"interrupt"});
  expect(reduce(state,{type:"text-delta"}).phase).toBe("interrupted");
  expect(reduce(state,{type:"playback-start"}).phase).toBe("interrupted");
  expect(reduce(state,{type:"complete"}).phase).toBe("interrupted");
 });
 it("disconnects on failure, recovers explicitly and clears on end", () => {
  let state=reduce(initialSession,{type:"ready"});state=reduce(state,{type:"offline"});
  expect(state.connected).toBe(false);expect(state.phase).toBe("offline");
  state=reduce(state,{type:"connect"});expect(state.phase).toBe("connecting");
  expect(reduce(state,{type:"end"})).toEqual(initialSession);
 });
 it("provides distinct visual profiles and readable labels for every state",()=>{
  expect(new Set(Object.values(stateVisuals).map(v=>JSON.stringify(v))).size).toBe(9);
  expect(Object.keys(stateVisuals).sort()).toEqual(Object.keys(stateLabels).sort());
 });
});
