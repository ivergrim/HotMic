// Event audio and game chrome.
//
// Doc 18.2: injected event audio must be blatant and must name its own channel
// by coming out of it. Everything here that belongs to an event is routed into
// that channel's injectIn, pre-fader, so the fader really is the fix.

import type { MixEngine } from "./engine.ts";
import { noise, pitch } from "./voices.ts";

export interface Injection {
  stop(): void;
}

const NOOP: Injection = { stop() {} };

/** Continuous, slowly-rising feedback squeal. Fix: pull the fader. */
function feedback(ctx: AudioContext, dest: AudioNode): Injection {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1750, t);
  osc.frequency.exponentialRampToValueAtTime(2600, t + 5);
  const harm = ctx.createOscillator();
  harm.type = "sine";
  harm.frequency.setValueAtTime(3500, t);
  harm.frequency.exponentialRampToValueAtTime(5200, t + 5);
  const harmGain = ctx.createGain();
  harmGain.gain.value = 0.25;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.16, t + 1.2);
  env.gain.exponentialRampToValueAtTime(0.4, t + 6);

  osc.connect(env);
  harm.connect(harmGain);
  harmGain.connect(env);
  env.connect(dest);
  osc.start(t);
  harm.start(t);

  return {
    stop() {
      const now = ctx.currentTime;
      env.gain.cancelScheduledValues(now);
      env.gain.setValueAtTime(Math.max(env.gain.value, 0.0001), now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.stop(now + 0.3);
      harm.stop(now + 0.3);
    },
  };
}

/** Mains hum. Fix: tone toward treble, which cuts the shelf it lives in. */
function hum(ctx: AudioContext, dest: AudioNode): Injection {
  const t = ctx.currentTime;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.5, t + 0.4);
  env.connect(dest);
  const oscs: OscillatorNode[] = [];
  for (const [f, g] of [
    [50, 1],
    [100, 0.6],
    [150, 0.45],
    [250, 0.2],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    const og = ctx.createGain();
    og.gain.value = g * 0.09;
    o.connect(og);
    og.connect(env);
    o.start(t);
    oscs.push(o);
  }
  return {
    stop() {
      const now = ctx.currentTime;
      env.gain.cancelScheduledValues(now);
      env.gain.setValueAtTime(env.gain.value, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      for (const o of oscs) o.stop(now + 0.35);
    },
  };
}

/** Repeating one-shots driven off a timer, cancelled on stop. */
function repeating(period: number, jitter: number, fire: () => void): Injection {
  let alive = true;
  const loop = () => {
    if (!alive) return;
    fire();
    window.setTimeout(loop, (period + (Math.random() - 0.5) * jitter) * 1000);
  };
  window.setTimeout(loop, 60);
  return {
    stop() {
      alive = false;
    },
  };
}

/** A drummer asleep on the snare, amplified. Unmistakably the drum channel. */
function snore(ctx: AudioContext, dest: AudioNode): Injection {
  return repeating(2.6, 0.5, () => {
    const t = ctx.currentTime;
    // Inhale: rasping noise swept upward.
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.linearRampToValueAtTime(680, t + 0.85);
    bp.Q.value = 3.2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.7, t + 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    src.connect(bp);
    bp.connect(env);
    env.connect(dest);
    src.start(t);
    src.stop(t + 1.0);

    // Exhale: a low whistle, because it is funnier.
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t + 1.1);
    o.frequency.linearRampToValueAtTime(96, t + 1.75);
    const oe = ctx.createGain();
    oe.gain.setValueAtTime(0.0001, t + 1.1);
    oe.gain.exponentialRampToValueAtTime(0.28, t + 1.3);
    oe.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(oe);
    oe.connect(dest);
    o.start(t + 1.1);
    o.stop(t + 1.85);
  });
}

/** Someone tuning a guitar into a live channel, badly, forever. */
function tuning(ctx: AudioContext, dest: AudioNode): Injection {
  const strings = ["E3", "A3", "D4", "G4"];
  let i = 0;
  return repeating(0.85, 0.3, () => {
    const t = ctx.currentTime;
    const base = pitch(strings[i % strings.length]);
    i++;
    const detune = 1 + (Math.random() - 0.5) * 0.09;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(base * detune, t);
    // The slow, hopeful creep toward the right note.
    osc.frequency.linearRampToValueAtTime(base * (1 + (detune - 1) * 0.4), t + 0.7);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    osc.connect(lp);
    lp.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(t + 0.8);
  });
}

/** Cable crackle — intermittent, obviously electrical. */
function crackle(ctx: AudioContext, dest: AudioNode): Injection {
  return repeating(0.42, 0.35, () => {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const env = ctx.createGain();
    const len = 0.02 + Math.random() * 0.09;
    env.gain.setValueAtTime(0.35, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(hp);
    hp.connect(env);
    env.connect(dest);
    src.start(t);
    src.stop(t + len + 0.02);
  });
}

/** A dog, sitting on a pedal, pleased with itself. */
function barking(ctx: AudioContext, dest: AudioNode): Injection {
  return repeating(3.4, 1.6, () => {
    const t = ctx.currentTime;
    for (let k = 0; k < 2; k++) {
      const at = t + k * 0.22;
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(340, at);
      o.frequency.exponentialRampToValueAtTime(170, at + 0.13);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      bp.Q.value = 1.4;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(0.4, at + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      o.connect(bp);
      bp.connect(env);
      env.connect(dest);
      o.start(at);
      o.stop(at + 0.2);
    }
  });
}

/** Dull, hollow ring of something lying on a drum head. */
function boom(ctx: AudioContext, dest: AudioNode): Injection {
  return repeating(1.9, 0.7, () => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(78, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.7);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.45, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(env);
    env.connect(dest);
    o.start(t);
    o.stop(t + 0.95);
  });
}

export type InjectionKind =
  | "feedback"
  | "hum"
  | "snore"
  | "tuning"
  | "crackle"
  | "barking"
  | "boom";

export function inject(engine: MixEngine, kind: InjectionKind, channel: "guitar" | "drums" | "bass"): Injection {
  const ch = engine.channels.get(channel);
  if (!ch) return NOOP;
  const ctx = engine.ctx;
  const dest = ch.injectIn;
  switch (kind) {
    case "feedback":
      return feedback(ctx, dest);
    case "hum":
      return hum(ctx, dest);
    case "snore":
      return snore(ctx, dest);
    case "tuning":
      return tuning(ctx, dest);
    case "crackle":
      return crackle(ctx, dest);
    case "barking":
      return barking(ctx, dest);
    case "boom":
      return boom(ctx, dest);
  }
}

// --- Crowd ------------------------------------------------------------------
// The crowd is a readable meter (doc 6.2.5). It is also audible, because a room
// going quiet is the fastest feedback there is.

export class CrowdVoice {
  private engine: MixEngine;
  private level: GainNode;
  private src: AudioBufferSourceNode | null = null;
  private cheerTimer: number | null = null;
  private energy = 100;

  constructor(engine: MixEngine) {
    this.engine = engine;
    this.level = engine.ctx.createGain();
    this.level.gain.value = 0;
    this.level.connect(engine.master);
  }

  start() {
    const ctx = this.engine.ctx;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 620;
    bp.Q.value = 0.55;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    src.connect(bp);
    bp.connect(lp);
    lp.connect(this.level);
    src.start();
    this.src = src;
    this.cheerTimer = window.setInterval(() => this.maybeCheer(), 2600);
  }

  stop() {
    this.src?.stop();
    this.src = null;
    if (this.cheerTimer !== null) clearInterval(this.cheerTimer);
    this.cheerTimer = null;
    this.level.gain.value = 0;
  }

  setEnergy(v: number) {
    this.energy = v;
    // Loud and busy at the top, a flat unimpressed murmur at the bottom.
    const target = 0.02 + (v / 100) * 0.075;
    this.level.gain.setTargetAtTime(target, this.engine.ctx.currentTime, 0.6);
  }

  private maybeCheer() {
    if (this.energy < 62 || Math.random() > this.energy / 190) return;
    const ctx = this.engine.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.linearRampToValueAtTime(1500, t + 0.4);
    bp.Q.value = 1.1;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.09 * (this.energy / 100), t + 0.18);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    src.connect(bp);
    bp.connect(env);
    env.connect(this.engine.master);
    src.start(t);
    src.stop(t + 1.2);
  }

  /** Angry room. Used at the fail state. */
  boo() {
    const ctx = this.engine.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(120, t);
    o.frequency.linearRampToValueAtTime(88, t + 1.4);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.22, t + 0.25);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(lp);
    lp.connect(env);
    env.connect(this.engine.master);
    o.start(t);
    o.stop(t + 1.7);
  }
}

// --- Chrome (doc 18.4) -------------------------------------------------------
// Menus and stings sound like a Sound Canvas. The band sounds real. The gap
// between them is the point.

function blip(
  engine: MixEngine,
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  slideTo?: number,
) {
  const ctx = engine.ctx;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(env);
  env.connect(engine.chromeIn);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const chrome = {
  click: (e: MixEngine) => blip(e, 780, 0.05, "square", 0.16),
  toggle: (e: MixEngine, on: boolean) =>
    blip(e, on ? 660 : 440, 0.07, "square", 0.2, on ? 990 : 330),
  page: (e: MixEngine) => blip(e, 380, 0.13, "triangle", 0.2, 720),
  back: (e: MixEngine) => blip(e, 520, 0.11, "triangle", 0.18, 260),
  deny: (e: MixEngine) => {
    blip(e, 200, 0.16, "square", 0.22);
    setTimeout(() => blip(e, 150, 0.22, "square", 0.22), 110);
  },
  cash: (e: MixEngine) => {
    const notes = [880, 1175, 1568];
    notes.forEach((f, i) => setTimeout(() => blip(e, f, 0.16, "square", 0.16), i * 70));
  },
  fanfare: (e: MixEngine) => {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => setTimeout(() => blip(e, f, 0.3, "square", 0.14), i * 110));
  },
  gloom: (e: MixEngine) => {
    const notes = [392, 349, 311, 233];
    notes.forEach((f, i) => setTimeout(() => blip(e, f, 0.45, "triangle", 0.18), i * 190));
  },
  splat: (e: MixEngine) => {
    const ctx = e.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(320, t + 0.4);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.5, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(lp);
    lp.connect(env);
    env.connect(e.master);
    src.start(t);
    src.stop(t + 0.5);
  },
  wipe: (e: MixEngine) => {
    const ctx = e.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    bp.Q.value = 0.8;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.18, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(bp);
    bp.connect(env);
    env.connect(e.master);
    src.start(t);
    src.stop(t + 0.15);
  },
};
