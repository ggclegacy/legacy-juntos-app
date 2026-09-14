"use client";
import { useEffect, useRef } from "react";
import { silentAudio, stateVisuals, type ApolloState, type AudioFrame } from "@/lib/apollo/session";

const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position;gl_Position=vec4(position,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 uv;
uniform float time;
uniform vec4 mood;
uniform vec4 audio;
// Smooth, low-frequency flow: broad luminous folds, rather than mineral noise.
float flow(vec3 p, float t) {
 return sin(p.x*3.1+t*.48+sin(p.z*2.8-t*.32))*.32
      +sin(p.y*4.2-t*.37+sin(p.x*2.3+t*.24))*.24
      +sin(p.z*3.7+t*.29+sin(p.y*3.1))*.16;
}
void main() {
 float t=time, amp=max(audio.x,audio.y);
 float breath=sin(t*1.08);
 vec2 p=uv*1.48;
 float radius=.96+.032*breath+.038*amp;
 float r=length(p), a=atan(p.y,p.x);
 vec3 gold=vec3(1.,.66,.16), champagne=vec3(1.,.91,.63);
 vec3 green=vec3(.025,.94,.38);
 float balance=smoothstep(-.65,.7,p.x+sin(a*2.-t*.25)*.22);
 vec3 rimColor=mix(gold,green,balance);
 float halo=exp(-abs(r-radius)*9.)*(.17+.035*breath)*mood.y;
 vec3 col=rimColor*halo;
 float alpha=halo*.8;
 if(r<radius) {
   vec3 n=vec3(p/radius,sqrt(max(0.,1.-r*r/(radius*radius))));
   float f=flow(n*(1.+audio.z*.15),t);
   float fold=n.y*4.3+n.x*1.8+f*(2.6+mood.w*1.3)+t*.21;
   float ribbon=pow(.5+.5*sin(fold*3.1),9.);
   float silk=pow(.5+.5*sin(fold*3.1+.3),3.);
   float thread=pow(.5+.5*sin(fold*3.1-.14),65.);
   float swirl=pow(.5+.5*sin(n.x*4.-n.y*2.8+f*5.+t*.33),14.);
   float rim=pow(1.-n.z,2.5);
   vec3 liquid=mix(gold,green,smoothstep(-.6,.8,n.x+f*.55+(mood.z-.35)*.55));
   float light=max(0.,dot(n,normalize(vec3(-.5,.7,1.))));
   col=vec3(.013,.034,.025)+liquid*(.1+silk*.16+swirl*.18);
   col+=liquid*ribbon*(.5+n.z*.75)*(1.+amp)*mood.y;
   col+=mix(champagne,vec3(.48,1.,.66),balance)*thread*(.55+audio.w*.25);
   col+=rimColor*rim*(.65+.35*breath)*mood.y;
   col+=champagne*pow(light,55.)*.8;
   col*=.85+.15*breath;
   alpha=1.;
 }
 // Thin orbital arcs, changing depth as they pass around the core.
 float orbit=length(vec2(p.x*.88,p.y*1.8));
 float ring=exp(-abs(orbit-1.09)*160.);
 float arc=smoothstep(-.5,.8,sin(a*2.+t*.4));
 if(r>radius) {col+=mix(gold,green,balance)*ring*arc*.6;alpha=max(alpha,ring*arc*.65);}
 for(int i=0;i<12;i++) {
  float fi=float(i), angle=fi*2.39996+t*(.09+mod(fi,3.)*.025);
  vec2 star=vec2(cos(angle),sin(angle))*(1.13+mod(fi,3.)*.085);
  float d=length(p-star), point=exp(-d*d*9500.);
  col+=mix(champagne,green,mod(fi,2.))*point*.7;alpha=max(alpha,point*.7);
 }
 col=vec3(1.)-exp(-col*1.35);
 // Premultiplied transparency lets the page atmosphere show through the canvas.
 gl_FragColor=vec4(col,clamp(max(alpha,max(col.r,max(col.g,col.b))),0.,1.));
}`;

/** One draw call, no textures/post-processing, bounded backing buffer. */
export function ApolloOrb({ state, paused = false, engaged = false, sampleAudio }: { state: ApolloState; paused?: boolean; engaged?: boolean; sampleAudio?: () => AudioFrame }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, paused, engaged, sampleAudio });
  useEffect(() => { live.current = { state, paused, engaged, sampleAudio }; }, [state, paused, engaged, sampleAudio]);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null, frame = 0, lost = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true, last = 0, time = 0, signature = "";
    const mood = [...stateVisuals.idle], levels = [0, 0, 0, 0];
    function cleanupGPU() { if (program) gl!.deleteProgram(program); if (buffer) gl!.deleteBuffer(buffer); shaders.splice(0).forEach(s => gl!.deleteShader(s)); }
    function init() {
      try {
        for (const [type, source] of [[gl!.VERTEX_SHADER, vertex], [gl!.FRAGMENT_SHADER, fragment]] as const) {
          const shader = gl!.createShader(type); if (!shader) throw Error("shader");
          shaders.push(shader); gl!.shaderSource(shader, source); gl!.compileShader(shader);
        }
        program = gl!.createProgram(); if (!program) throw Error("program");
        shaders.forEach(s => gl!.attachShader(program!, s)); gl!.linkProgram(program);
        if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) throw Error("link");
        gl!.useProgram(program); buffer = gl!.createBuffer(); gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
        gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl!.STATIC_DRAW);
        const position = gl!.getAttribLocation(program, "position"); gl!.enableVertexAttribArray(position); gl!.vertexAttribPointer(position,2,gl!.FLOAT,false,0,0);
        canvas.dataset.ready = "true"; return true;
      } catch { cleanupGPU(); delete canvas.dataset.ready; return false; }
    }
    if (!init()) return;
    let uniforms = ["time", "mood", "audio"].map(n => gl.getUniformLocation(program!, n));
    const resize = new ResizeObserver(() => {
      const size = Math.max(1, Math.min(680, Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 1.5))));
      canvas.width = canvas.height = size; gl.viewport(0,0,size,size); signature = "";
    });
    resize.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); intersection.observe(canvas);
    function render(now: number) {
      frame = requestAnimationFrame(render);
      if (lost || document.hidden || !visible || now-last < 15) return;
      const dt = Math.min((now-last)/1000,.05); last=now;
      const still=motion.matches || live.current.paused;
      const nextSignature = `${live.current.state}:${still}:${live.current.engaged}`;
      if(still && nextSignature === signature) return;
      signature = nextSignature;
      const target = [...stateVisuals[live.current.state]];
      if (live.current.engaged && live.current.state === "idle") { target[0] += .2; target[1] += .22; }
      const blend=still ? 1 : 1-Math.exp(-dt*4);
      for(let i=0;i<4;i++) mood[i]+=(target[i]-mood[i])*blend;
      const sample=live.current.sampleAudio?.() ?? silentAudio;
      [sample.input,sample.output,sample.bass,sample.treble].forEach((v,i)=>{ levels[i]+=(Math.max(0,Math.min(1,Number.isFinite(v)?v:0))-levels[i])*.2; });
      if(!still && live.current.state !== "offline") time+=dt*(.82+mood[0]);
      gl!.uniform1f(uniforms[0],time); gl!.uniform4fv(uniforms[1],mood); gl!.uniform4fv(uniforms[2],still?[0,0,0,0]:levels);
      gl!.drawArrays(gl!.TRIANGLES,0,6);
    }
    const onLost=(e: Event)=>{e.preventDefault();lost=true;delete canvas.dataset.ready;};
    const onRestored=()=>{shaders.length=0;lost=!init();signature="";uniforms=["time","mood","audio"].map(n=>gl.getUniformLocation(program!,n));};
    canvas.addEventListener("webglcontextlost",onLost);canvas.addEventListener("webglcontextrestored",onRestored);
    frame=requestAnimationFrame(render);
    return ()=>{cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();canvas.removeEventListener("webglcontextlost",onLost);canvas.removeEventListener("webglcontextrestored",onRestored);cleanupGPU();};
  }, []);
  return <div className="apollo-orb" data-paused={paused} data-state={state} aria-hidden="true"><div className="orb-fallback"/><canvas ref={canvasRef}/></div>;
}
