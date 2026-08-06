// The mixer. Every control on the board moves a real audio node.
//
// Signal path per channel (doc 18.1 — the player is doing a real thing):
//
//   voices -> sourceTrim -> sourceLow/sourceHigh  \
//                                                  >- chanIn -> toneLow -> toneHigh
//   injected event audio ---------------------->  /
//        -> fader -> panTrim -> panner -> soloGate -> dry -> bus
//                                                  \-> fxSend -> reverb/delay -> bus
//
// The split matters. "sourceTrim" and the source shelves are what the *stage*
// does to the signal — a kicked cable, a bassist off mic. The player never
// touches them; they counteract them with the board. Event audio is injected
// pre-fader so pulling a channel down really does silence its snoring (18.2).

export type ChannelId = "guitar" | "drums" | "bass";

const DB = (db: number) => Math.pow(10, db / 20);

export interface ChannelNodes {
  id: ChannelId;
  /** Where instrument voices connect. */
  voiceIn: GainNode;
  /** Where event audio is injected — pre-fader, post source damage. */
  injectIn: GainNode;
  sourceTrim: GainNode;
  sourceLow: BiquadFilterNode;
  sourceHigh: BiquadFilterNode;
  toneLow: BiquadFilterNode;
  toneHigh: BiquadFilterNode;
  fader: GainNode;
  panTrim: GainNode;
  panner: StereoPannerNode;
  soloGate: GainNode;
  fxSend: GainNode;
}

export class MixEngine {
  readonly ctx: AudioContext;
  readonly channels = new Map<ChannelId, ChannelNodes>();
  readonly bus: GainNode;
  readonly master: GainNode;
  readonly houseIn: GainNode;
  readonly chromeIn: GainNode;
  private fxIn: GainNode;
  private limiter: DynamicsCompressorNode;

  constructor() {
    const Ctor: typeof AudioContext =
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
      window.AudioContext;
    this.ctx = new Ctor({ latencyHint: "interactive" });

    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.2;
    this.limiter.connect(this.ctx.destination);

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.75;
    this.master.connect(this.limiter);

    this.bus = this.ctx.createGain();
    this.bus.connect(this.master);

    // Chrome (UI) audio bypasses the master fader — the player turning the PA
    // down should not silence the menus.
    this.chromeIn = this.ctx.createGain();
    this.chromeIn.gain.value = 0.5;
    this.chromeIn.connect(this.limiter);

    // House music goes through master, because covering dead air with the PA is
    // the point of the button.
    this.houseIn = this.ctx.createGain();
    this.houseIn.gain.value = 0;
    this.houseIn.connect(this.master);

    // Shared effects bus: plate-ish reverb in parallel with a slapback delay.
    this.fxIn = this.ctx.createGain();
    const reverb = this.ctx.createConvolver();
    reverb.buffer = makeImpulse(this.ctx, 1.9, 2.6);
    const reverbLevel = this.ctx.createGain();
    reverbLevel.gain.value = 0.9;

    const delay = this.ctx.createDelay(1.0);
    delay.delayTime.value = 0.26;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.42;
    const delayTone = this.ctx.createBiquadFilter();
    delayTone.type = "lowpass";
    delayTone.frequency.value = 2600;
    const delayLevel = this.ctx.createGain();
    delayLevel.gain.value = 0.55;

    this.fxIn.connect(reverb);
    reverb.connect(reverbLevel);
    reverbLevel.connect(this.bus);

    this.fxIn.connect(delay);
    delay.connect(delayTone);
    delayTone.connect(feedback);
    feedback.connect(delay);
    delayTone.connect(delayLevel);
    delayLevel.connect(this.bus);
  }

  ensureChannel(id: ChannelId): ChannelNodes {
    const existing = this.channels.get(id);
    if (existing) return existing;
    const c = this.ctx;

    const voiceIn = c.createGain();
    const sourceTrim = c.createGain();
    const sourceLow = c.createBiquadFilter();
    sourceLow.type = "lowshelf";
    sourceLow.frequency.value = 260;
    sourceLow.gain.value = 0;
    const sourceHigh = c.createBiquadFilter();
    sourceHigh.type = "highshelf";
    sourceHigh.frequency.value = 2400;
    sourceHigh.gain.value = 0;

    const injectIn = c.createGain();
    const chanIn = c.createGain();

    const toneLow = c.createBiquadFilter();
    toneLow.type = "lowshelf";
    toneLow.frequency.value = 260;
    toneLow.gain.value = 0;
    const toneHigh = c.createBiquadFilter();
    toneHigh.type = "highshelf";
    toneHigh.frequency.value = 2400;
    toneHigh.gain.value = 0;

    const fader = c.createGain();
    const panTrim = c.createGain();
    const panner = c.createStereoPanner();
    const soloGate = c.createGain();
    const fxSend = c.createGain();
    fxSend.gain.value = 0;

    voiceIn.connect(sourceTrim);
    sourceTrim.connect(sourceLow);
    sourceLow.connect(sourceHigh);
    sourceHigh.connect(chanIn);
    injectIn.connect(chanIn);

    chanIn.connect(toneLow);
    toneLow.connect(toneHigh);
    toneHigh.connect(fader);
    fader.connect(panTrim);
    panTrim.connect(panner);
    panner.connect(soloGate);
    soloGate.connect(this.bus);
    soloGate.connect(fxSend);
    fxSend.connect(this.fxIn);

    const nodes: ChannelNodes = {
      id,
      voiceIn,
      injectIn,
      sourceTrim,
      sourceLow,
      sourceHigh,
      toneLow,
      toneHigh,
      fader,
      panTrim,
      panner,
      soloGate,
      fxSend,
    };
    this.channels.set(id, nodes);
    return nodes;
  }

  /** fader 0..1, mapped so the neutral position sits at unity-ish. */
  setFader(id: ChannelId, value: number) {
    const ch = this.channels.get(id);
    if (!ch) return;
    // Perceptual taper: quiet end compresses, top end has headroom above neutral.
    const g = value <= 0.001 ? 0 : Math.pow(value / 0.75, 2.2);
    ch.fader.gain.setTargetAtTime(g, this.ctx.currentTime, 0.02);
  }

  /**
   * tone -1..1. A tilt EQ: one knob, bassy at one end, bright at the other.
   * Range is exaggerated well past real-world practice so it reads on a phone
   * speaker (doc 5.2).
   */
  setTone(id: ChannelId, value: number) {
    const ch = this.channels.get(id);
    if (!ch) return;
    const t = this.ctx.currentTime;
    ch.toneLow.gain.setTargetAtTime(-value * 13, t, 0.03);
    ch.toneHigh.gain.setTargetAtTime(value * 13, t, 0.03);
  }

  /**
   * pan -1..1. Hard panning also drops the channel a few dB (doc 5.4) so that
   * mono and phone players get a perceptible consequence — but only a few, or
   * pan becomes a second fader.
   */
  setPan(id: ChannelId, value: number) {
    const ch = this.channels.get(id);
    if (!ch) return;
    const t = this.ctx.currentTime;
    ch.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, value)), t, 0.03);
    ch.panTrim.gain.setTargetAtTime(DB(-3.5 * Math.abs(value)), t, 0.03);
  }

  setFx(id: ChannelId, on: boolean) {
    const ch = this.channels.get(id);
    if (!ch) return;
    ch.fxSend.gain.setTargetAtTime(on ? 0.85 : 0, this.ctx.currentTime, 0.04);
  }

  setMaster(value: number) {
    this.master.gain.setTargetAtTime(Math.pow(value, 1.8) * 1.35, this.ctx.currentTime, 0.03);
  }

  /** null = nothing soloed. Solo goes to the house, so it is never free (5.3). */
  setSolo(id: ChannelId | null) {
    for (const [cid, ch] of this.channels) {
      const open = id === null || cid === id;
      ch.soloGate.gain.setTargetAtTime(open ? 1 : 0, this.ctx.currentTime, 0.02);
    }
  }

  setHouseMusic(on: boolean) {
    this.houseIn.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.25);
  }

  // ---- Stage-side damage, driven by events, never by the player -------------

  setSourceTrim(id: ChannelId, gain: number, ramp = 0.08) {
    const ch = this.channels.get(id);
    if (!ch) return;
    ch.sourceTrim.gain.setTargetAtTime(gain, this.ctx.currentTime, ramp);
  }

  /** Tilt applied at the source. The player cancels it with the tone knob. */
  setSourceTilt(id: ChannelId, tilt: number, ramp = 0.08) {
    const ch = this.channels.get(id);
    if (!ch) return;
    const t = this.ctx.currentTime;
    ch.sourceLow.gain.setTargetAtTime(-tilt * 12, t, ramp);
    ch.sourceHigh.gain.setTargetAtTime(tilt * 12, t, ramp);
  }

  resetChannelSource(id: ChannelId) {
    this.setSourceTrim(id, 1);
    this.setSourceTilt(id, 0);
  }

  async resume() {
    if (this.ctx.state !== "running") {
      try {
        await this.ctx.resume();
      } catch {
        /* browser will retry on the next gesture */
      }
    }
  }

  suspend() {
    if (this.ctx.state === "running") void this.ctx.suspend();
  }

  get now() {
    return this.ctx.currentTime;
  }
}

function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // Slight predelay keeps the early reflections from smearing the attack.
      const env = Math.pow(1 - t, decay);
      data[i] = (Math.random() * 2 - 1) * env * (i < rate * 0.012 ? 0.15 : 1);
    }
  }
  return buf;
}
