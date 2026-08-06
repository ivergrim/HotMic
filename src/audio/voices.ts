// Instrument voices. No sample assets: every stem is synthesised, but each one
// is a genuinely separate signal feeding its own channel strip, which is what
// the mixing actually needs.

export function noteFreq(semitonesFromA4: number): number {
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

/** Note names -> semitones relative to A4. C4 = -9. */
const NOTE_OFFSET: Record<string, number> = {
  C: -9,
  "C#": -8,
  D: -7,
  "D#": -6,
  E: -5,
  F: -4,
  "F#": -3,
  G: -2,
  "G#": -1,
  A: 0,
  "A#": 1,
  B: 2,
};

export function pitch(name: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const octaveShift = (Number(m[2]) - 4) * 12;
  return noteFreq(NOTE_OFFSET[m[1]] + octaveShift);
}

let sharedCurve: Float32Array<ArrayBuffer> | null = null;
function driveCurve(ctx: BaseAudioContext, amount: number): Float32Array<ArrayBuffer> {
  if (sharedCurve) return sharedCurve;
  void ctx;
  const n = 1024;
  const curve = new Float32Array(n);
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  sharedCurve = curve;
  return curve;
}

let noiseBuffer: AudioBuffer | null = null;
export function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

export interface VoiceOpts {
  ctx: AudioContext;
  dest: AudioNode;
  time: number;
  freq: number;
  dur: number;
  gain?: number;
}

/**
 * Dirty electric guitar. Two detuned saws through a soft clipper, then a cab-ish
 * lowpass. Short durations read as palm-muted chugs.
 */
export function guitarNote(o: VoiceOpts & { bright?: boolean }) {
  const { ctx, dest, time, freq, dur } = o;
  const gain = o.gain ?? 1;

  const shaper = ctx.createWaveShaper();
  shaper.curve = driveCurve(ctx, 14);
  shaper.oversample = "2x";

  const cab = ctx.createBiquadFilter();
  cab.type = "lowpass";
  cab.frequency.value = o.bright ? 4200 : 3000;
  cab.Q.value = 0.9;

  const body = ctx.createBiquadFilter();
  body.type = "highpass";
  body.frequency.value = 110;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(0.22 * gain, time + 0.006);
  env.gain.exponentialRampToValueAtTime(0.12 * gain, time + Math.min(0.09, dur * 0.5));
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  shaper.connect(cab);
  cab.connect(body);
  body.connect(env);
  env.connect(dest);

  for (const detune of [-7, 7]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(shaper);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }
  // A little fifth on top thickens it into a power chord without extra notes.
  const fifth = ctx.createOscillator();
  fifth.type = "sawtooth";
  fifth.frequency.value = freq * 1.4983;
  fifth.detune.value = 4;
  const fifthGain = ctx.createGain();
  fifthGain.gain.value = 0.7;
  fifth.connect(fifthGain);
  fifthGain.connect(shaper);
  fifth.start(time);
  fifth.stop(time + dur + 0.05);
}

/** Single-note lead for the solo section: same amp, no fifth, longer tail. */
export function leadNote(o: VoiceOpts) {
  const { ctx, dest, time, freq, dur } = o;
  const gain = o.gain ?? 1;

  const shaper = ctx.createWaveShaper();
  shaper.curve = driveCurve(ctx, 20);
  shaper.oversample = "2x";
  const cab = ctx.createBiquadFilter();
  cab.type = "lowpass";
  cab.frequency.value = 3800;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(0.2 * gain, time + 0.02);
  env.gain.setValueAtTime(0.2 * gain, time + dur * 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.12);

  shaper.connect(cab);
  cab.connect(env);
  env.connect(dest);

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, time);
  osc.connect(shaper);
  // Just enough vibrato to sound played rather than sequenced.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 5;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.detune);
  lfo.start(time);
  lfo.stop(time + dur + 0.2);
  osc.start(time);
  osc.stop(time + dur + 0.2);
}

export function bassNote(o: VoiceOpts) {
  const { ctx, dest, time, freq, dur } = o;
  const gain = o.gain ?? 1;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1400, time);
  lp.frequency.exponentialRampToValueAtTime(500, time + 0.16);
  lp.Q.value = 3;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(0.4 * gain, time + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  lp.connect(env);
  env.connect(dest);

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  osc.connect(lp);
  osc.start(time);
  osc.stop(time + dur + 0.05);

  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.value = freq / 2;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.8;
  sub.connect(subGain);
  subGain.connect(lp);
  sub.start(time);
  sub.stop(time + dur + 0.05);
}

export function kick(ctx: AudioContext, dest: AudioNode, time: number, gain = 1) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(135, time);
  osc.frequency.exponentialRampToValueAtTime(44, time + 0.09);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.9 * gain, time);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
  osc.connect(env);
  env.connect(dest);
  osc.start(time);
  osc.stop(time + 0.34);

  // Beater click, so it survives a phone speaker with no low end at all.
  const click = ctx.createBufferSource();
  click.buffer = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "bandpass";
  hp.frequency.value = 1800;
  const cenv = ctx.createGain();
  cenv.gain.setValueAtTime(0.22 * gain, time);
  cenv.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
  click.connect(hp);
  hp.connect(cenv);
  cenv.connect(dest);
  click.start(time);
  click.stop(time + 0.05);
}

export function snare(ctx: AudioContext, dest: AudioNode, time: number, gain = 1) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1900;
  bp.Q.value = 0.7;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.55 * gain, time);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
  src.connect(bp);
  bp.connect(env);
  env.connect(dest);
  src.start(time);
  src.stop(time + 0.22);

  const tone = ctx.createOscillator();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(210, time);
  tone.frequency.exponentialRampToValueAtTime(160, time + 0.1);
  const tenv = ctx.createGain();
  tenv.gain.setValueAtTime(0.3 * gain, time);
  tenv.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
  tone.connect(tenv);
  tenv.connect(dest);
  tone.start(time);
  tone.stop(time + 0.15);
}

export function hat(ctx: AudioContext, dest: AudioNode, time: number, open = false, gain = 1) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7200;
  const env = ctx.createGain();
  const dur = open ? 0.24 : 0.045;
  env.gain.setValueAtTime((open ? 0.16 : 0.13) * gain, time);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  src.connect(hp);
  hp.connect(env);
  env.connect(dest);
  src.start(time);
  src.stop(time + dur + 0.02);
}

export function crash(ctx: AudioContext, dest: AudioNode, time: number, gain = 1) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 4200;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.3 * gain, time);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 1.3);
  src.connect(hp);
  hp.connect(env);
  env.connect(dest);
  src.start(time);
  src.stop(time + 1.35);
}

export function tom(ctx: AudioContext, dest: AudioNode, time: number, freq: number, gain = 1) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.65, time + 0.22);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.55 * gain, time);
  env.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
  osc.connect(env);
  env.connect(dest);
  osc.start(time);
  osc.stop(time + 0.32);
}
