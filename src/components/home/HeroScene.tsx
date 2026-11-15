"use client";

/**
 * Homepage hero background: a blurred sky, a house that sinks into rising
 * fog on a Morning / Night switch, swaps light while hidden at the deepest
 * point, and floats back up. The fog is a live WebGL2 shader (never loops).
 *
 * One requestAnimationFrame clock drives everything and writes CSS variables
 * on the section (--k: 0 morning … 1 night, --sink) and the shader uniforms —
 * no CSS transitions, no React re-renders per frame. The loop pauses while
 * the hero is off screen. Reduced motion: the switch is instant.
 *
 * Images: public/hero/*.webp (the business's own scene renders).
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import s from "./HeroScene.module.css";

// Served from our own /public/hero (the business's scene renders, fetched once
// from its CDN as WebP: sky 1600 px, ground and house 1920 px), so the hero
// never waits on a third-party image service.
const IMG = {
  skyM: "/hero/sky-morning.webp",
  skyN: "/hero/sky-night.webp",
  groundM: "/hero/ground-morning.webp",
  cutM: "/hero/house-morning.webp",
  groundN: "/hero/ground-night.webp",
  cutN: "/hero/house-night.webp",
};

const SINK = 240, RISE = 820, DEPTH = 0.27;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };

const VS = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;
const FS = `#version 300 es
precision highp float;
uniform vec2 R;uniform float T,S,K;out vec4 O;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);p=mat2(.8,.6,-.6,.8)*p+5.3;for(int i=0;i<5;i++){s+=a*n(p);p=m*p;a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/R;uv.y=1.-uv.y;
  float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y);
  float t=T*.05;
  vec2 w=vec2(fbm(p*1.3+vec2(t,-t*.6)),fbm(p*1.3+vec2(-t*.8,t)+7.));
  float d=fbm(p*1.9+w*1.7+vec2(t*1.6,-t*1.1+S*.5));
  float e=fbm(p*.9-w+vec2(-t,t*.5)+3.);
  float low=smoothstep(.70,1.04,uv.y+(d-.5)*.34);
  float side=smoothstep(.2,.0,uv.x+(e-.5)*.28)+smoothstep(.8,1.,uv.x+(e-.5)*.28);
  side*=smoothstep(.25,.6,uv.y)*.2;
  float wisps=smoothstep(.5,.78,d)*smoothstep(.22,.5,uv.y)*smoothstep(.86,.6,uv.y)*.18;
  float rest=clamp(low+side+wisps,0.,1.);
  float front=1.02-S*.68;
  float rise=smoothstep(front-.02,front+.26,uv.y+(d-.5)*.5);
  float haze=S*(.3+.46*d);
  float a=clamp(max(rest,max(rise*.97,haze)),0.,1.);
  vec3 dayA=vec3(.97,.93,.84),dayB=vec3(.79,.78,.71);
  vec3 nitA=vec3(.40,.45,.57),nitB=vec3(.15,.19,.29);
  vec3 c=mix(mix(dayB,dayA,d*1.15),mix(nitB,nitA,d*1.1),K);
  float porch=exp(-dot((uv-vec2(.72,.74))*vec2(1.7,2.6),(uv-vec2(.72,.74))*vec2(1.7,2.6))*3.2);
  c=mix(c,vec3(.86,.55,.27),K*porch*.42*(1.-S));
  O=vec4(c*a,a);
}`;

type Ctx = { night: boolean; pick: (n: 0 | 1) => void };
const SceneCtx = createContext<Ctx | null>(null);

export default function HeroScene({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const setM = useRef<HTMLDivElement>(null);
  const setN = useRef<HTMLDivElement>(null);
  // Animation state lives outside React: it changes every frame.
  const st = useRef({ night: 1, target: 1, from: 1, start: -1e9, queued: null as number | null, swapped: true, k: 1, animating: false, calm: false });
  const [pressed, setPressed] = useState<0 | 1>(1);
  // The morning set loads shortly after first paint, so the night hero isn't slowed down.
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setWarm(true), 900);
    return () => clearTimeout(t);
  }, []);

  const show = useCallback((n: number) => {
    setM.current?.classList.toggle(s.on, !n);
    setN.current?.classList.toggle(s.on, !!n);
  }, []);
  const writeVars = useCallback((y: number, k: number) => {
    const el = root.current;
    if (!el) return;
    el.style.setProperty("--sink", `${(y * el.clientHeight).toFixed(1)}px`);
    el.style.setProperty("--k", k.toFixed(3));
  }, []);

  const pick = useCallback((n: 0 | 1) => {
    const a = st.current;
    if (n === a.target && a.queued === null) return;
    setPressed(n);
    setWarm(true);
    if (a.calm) { a.target = a.night = a.k = n; show(n); writeVars(0, n); return; }
    if (a.animating) { a.queued = n; return; }
    Object.assign(a, { target: n, from: a.k, start: performance.now(), swapped: false, animating: true });
  }, [show, writeVars]);

  useEffect(() => {
    const a = st.current;
    a.calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = cv.current!;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    const U: Record<string, WebGLUniformLocation | null> = {};
    let prog: WebGLProgram | null = null;
    if (gl) {
      const sh = (type: number, src: string) => {
        const o = gl.createShader(type)!;
        gl.shaderSource(o, src);
        gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o));
        return o;
      };
      prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      for (const u of ["R", "T", "S", "K"]) U[u] = gl.getUniformLocation(prog, u);
    }
    const size = () => {
      if (!gl || !root.current) return;
      const W = root.current.clientWidth, H = root.current.clientHeight;
      const w = Math.round(Math.min(W, 960)), h = Math.max(1, Math.round((w * H) / Math.max(1, W)));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };
    const ro = new ResizeObserver(size);
    ro.observe(root.current!);
    size();

    const frame = (now: number) => {
      const d = now - a.start;
      let y = 0, surge = 0;
      if (a.animating) {
        if (d < SINK) { const x = d / SINK; y = x * x * (3 - 2 * x) * DEPTH; }
        else {
          if (!a.swapped) { a.swapped = true; a.night = a.target; show(a.target); }
          y = Math.pow(1 - clamp((d - SINK) / RISE), 3.4) * DEPTH;
        }
        surge = smooth(0, SINK * 0.92, d) * (1 - smooth(SINK + 70, SINK + RISE * 0.92, d));
        a.k = a.from + (a.target - a.from) * smooth(120, 520, d);
        if (d >= SINK + RISE) {
          a.animating = false; a.k = a.target; y = surge = 0;
          if (a.queued !== null && a.queued !== a.target) {
            const q = a.queued; a.queued = null;
            Object.assign(a, { target: q, from: a.k, start: now, swapped: false, animating: true });
          } else a.queued = null;
        }
      }
      writeVars(y, a.k);
      if (gl) {
        gl.uniform2f(U.R, canvas.width, canvas.height);
        gl.uniform1f(U.T, a.calm ? 0 : now / 1000);
        gl.uniform1f(U.S, surge);
        gl.uniform1f(U.K, a.k);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };

    // Run only while the hero is on screen.
    let raf = 0, visible = true;
    const loop = (t: number) => { frame(t); raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !visible) { visible = true; raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting && visible) { visible = false; cancelAnimationFrame(raf); }
    });
    io.observe(root.current!);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      if (gl && prog) gl.deleteProgram(prog);
    };
  }, [show, writeVars]);

  const late = (src: string) => (warm ? src : undefined);
  return (
    <SceneCtx.Provider value={{ night: pressed === 1, pick }}>
      <section ref={root} className={s.hero} style={{ "--k": 1 } as React.CSSProperties}>
        {/* eslint-disable @next/next/no-img-element */}
        <div className={`${s.layer} ${s.sky}`} aria-hidden>
          <img alt="" src={late(IMG.skyM)} />
          <img alt="" className={s.skyN} src={IMG.skyN} fetchPriority="high" />
        </div>
        <div className={`${s.layer} ${s.home}`}>
          <div ref={setM} className={s.set}>
            <div className={`${s.layer} ${s.ground}`}><img alt="" src={late(IMG.groundM)} /></div>
            <div className={s.layer}><img alt="A house with a garden in soft morning light" src={late(IMG.cutM)} /></div>
            <div className={`${s.layer} ${s.soft}`}><img alt="" src={late(IMG.groundM)} /></div>
          </div>
          <div ref={setN} className={`${s.set} ${s.on}`}>
            <div className={`${s.layer} ${s.ground}`}><img alt="" src={IMG.groundN} fetchPriority="high" /></div>
            <div className={s.layer}><img alt="The same house at dusk with warm amber windows" src={IMG.cutN} fetchPriority="high" /></div>
            <div className={`${s.layer} ${s.soft}`}><img alt="" src={IMG.groundN} /></div>
          </div>
        </div>
        {/* eslint-enable @next/next/no-img-element */}
        <div className={s.scrim} />
        <canvas ref={cv} className={s.fog} aria-hidden />
        <div className={s.edge} />
        <div className={s.content}>{children}</div>
      </section>
    </SceneCtx.Provider>
  );
}

/** Morning / Night switch. Place it anywhere inside <HeroScene>. */
export function HeroTimeToggle() {
  const ctx = useContext(SceneCtx);
  if (!ctx) return null;
  return (
    <div className={s.toggle} role="group" aria-label="Time of day">
      <button type="button" className={s.btnM} aria-pressed={!ctx.night} onClick={() => ctx.pick(0)}>
        <span className={s.label}><Sun size={16} aria-hidden /> Morning</span>
      </button>
      <button type="button" className={s.btnN} aria-pressed={ctx.night} onClick={() => ctx.pick(1)}>
        <span className={s.label}><Moon size={16} aria-hidden /> Night</span>
      </button>
    </div>
  );
}
