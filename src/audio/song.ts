// "LANDLORD (GET OUT OF MY HEAD)" — the tier 1 song.
//
// One song per tier (doc 18.3), existing in three arrangements because the band
// grows: guitar alone in the garage, plus drums, plus bass. Same song, more of
// it, which is what actually happens to a band.

import {
  bassNote,
  crash,
  guitarNote,
  hat,
  kick,
  leadNote,
  pitch,
  snare,
  tom,
} from "./voices.ts";

export const BPM = 132;
export const STEPS_PER_BAR = 16;
export const SECONDS_PER_STEP = 60 / BPM / 4;
export const SECONDS_PER_BAR = SECONDS_PER_STEP * STEPS_PER_BAR;

export type SectionName = "intro" | "verse" | "chorus" | "solo" | "outro";

interface Section {
  name: SectionName;
  bars: number;
  /** Root of each bar, guitar register. */
  roots: string[];
}

const SECTIONS: Section[] = [
  { name: "intro", bars: 4, roots: ["E3", "E3", "C3", "D3"] },
  { name: "verse", bars: 8, roots: ["E3", "E3", "E3", "E3", "G3", "G3", "D3", "D3"] },
  { name: "chorus", bars: 8, roots: ["C3", "C3", "G3", "G3", "D3", "D3", "E3", "E3"] },
  { name: "verse", bars: 8, roots: ["E3", "E3", "E3", "E3", "G3", "G3", "D3", "D3"] },
  { name: "solo", bars: 8, roots: ["E3", "E3", "C3", "C3", "G3", "G3", "D3", "D3"] },
  { name: "chorus", bars: 8, roots: ["C3", "C3", "G3", "G3", "D3", "D3", "E3", "E3"] },
  { name: "outro", bars: 4, roots: ["E3", "C3", "D3", "E3"] },
];

export const TOTAL_BARS = SECTIONS.reduce((n, s) => n + s.bars, 0);
export const SONG_SECONDS = TOTAL_BARS * SECONDS_PER_BAR;

interface BarInfo {
  section: SectionName;
  /** Bar index inside its section. */
  local: number;
  /** Bars in this section. */
  length: number;
  root: string;
  /** Position through the whole song, 0..1. */
  progress: number;
}

const BAR_TABLE: BarInfo[] = (() => {
  const out: BarInfo[] = [];
  for (const s of SECTIONS) {
    for (let i = 0; i < s.bars; i++) {
      out.push({
        section: s.name,
        local: i,
        length: s.bars,
        root: s.roots[i],
        progress: out.length / TOTAL_BARS,
      });
    }
  }
  return out;
})();

export function barInfo(bar: number): BarInfo {
  return BAR_TABLE[Math.min(bar, BAR_TABLE.length - 1)];
}

export function sectionAtProgress(p: number): SectionName {
  return barInfo(Math.floor(p * TOTAL_BARS)).section;
}

/** Bar boundaries of each section, for the event scheduler's density budget. */
export function sectionSpans(): { name: SectionName; startBar: number; endBar: number }[] {
  const spans: { name: SectionName; startBar: number; endBar: number }[] = [];
  let bar = 0;
  for (const s of SECTIONS) {
    spans.push({ name: s.name, startBar: bar, endBar: bar + s.bars });
    bar += s.bars;
  }
  return spans;
}

const down = (root: string, semis: number) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(root)!;
  return `${m[1]}${Number(m[2]) - semis}`;
};

// Eight-step chug grids per section. 1 = accented, 0.6 = ghosted, 0 = rest.
const GUITAR_GRID: Record<SectionName, number[]> = {
  intro: [1, 0, 0.6, 0, 1, 0, 0.6, 0, 1, 0, 0.6, 0, 1, 0, 0.7, 0],
  verse: [1, 0, 0.7, 0.7, 0, 0.7, 1, 0, 0.7, 0, 1, 0, 0.7, 0.7, 0, 0.7],
  chorus: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  solo: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  outro: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.7, 0],
};

const GUITAR_SUSTAIN: Record<SectionName, number> = {
  intro: 0.11,
  verse: 0.1,
  chorus: 0.62,
  solo: 0.44,
  outro: 0.85,
};

// Eight bars of E minor pentatonic, written to sound like someone who has
// practised this one solo and only this one solo.
const SOLO_LINE: { bar: number; step: number; note: string; dur: number }[] = [
  { bar: 0, step: 0, note: "E4", dur: 0.3 },
  { bar: 0, step: 4, note: "G4", dur: 0.3 },
  { bar: 0, step: 8, note: "A4", dur: 0.5 },
  { bar: 0, step: 14, note: "G4", dur: 0.2 },
  { bar: 1, step: 0, note: "B4", dur: 0.8 },
  { bar: 1, step: 10, note: "A4", dur: 0.25 },
  { bar: 1, step: 12, note: "G4", dur: 0.4 },
  { bar: 2, step: 0, note: "E4", dur: 0.35 },
  { bar: 2, step: 6, note: "G4", dur: 0.35 },
  { bar: 2, step: 10, note: "E4", dur: 0.3 },
  { bar: 2, step: 14, note: "D4", dur: 0.2 },
  { bar: 3, step: 0, note: "E4", dur: 1.0 },
  { bar: 4, step: 0, note: "B4", dur: 0.25 },
  { bar: 4, step: 3, note: "D5", dur: 0.25 },
  { bar: 4, step: 6, note: "E5", dur: 0.6 },
  { bar: 4, step: 12, note: "D5", dur: 0.3 },
  { bar: 5, step: 0, note: "B4", dur: 0.4 },
  { bar: 5, step: 6, note: "A4", dur: 0.4 },
  { bar: 5, step: 12, note: "G4", dur: 0.4 },
  { bar: 6, step: 0, note: "A4", dur: 0.3 },
  { bar: 6, step: 4, note: "B4", dur: 0.3 },
  { bar: 6, step: 8, note: "D5", dur: 0.3 },
  { bar: 6, step: 12, note: "E5", dur: 0.5 },
  { bar: 7, step: 0, note: "E5", dur: 0.35 },
  { bar: 7, step: 4, note: "D5", dur: 0.35 },
  { bar: 7, step: 8, note: "B4", dur: 0.35 },
  { bar: 7, step: 12, note: "G4", dur: 0.6 },
];

export interface StemBuses {
  guitar: AudioNode;
  drums?: AudioNode;
  bass?: AudioNode;
}

/**
 * Schedules one bar of the song. Called ahead of time by the transport.
 * `members` is how many band members are on stage: 1 guitar, 2 +drums, 3 +bass.
 */
export function scheduleBar(
  ctx: AudioContext,
  buses: StemBuses,
  bar: number,
  barTime: number,
  members: number,
): void {
  const info = barInfo(bar);
  const S = SECONDS_PER_STEP;
  const isFillBar = info.local === info.length - 1;

  // --- Guitar ---------------------------------------------------------------
  if (info.section === "solo") {
    for (const n of SOLO_LINE) {
      if (n.bar !== info.local) continue;
      leadNote({
        ctx,
        dest: buses.guitar,
        time: barTime + n.step * S,
        freq: pitch(n.note),
        dur: n.dur,
        gain: 1,
      });
    }
    // Rhythm underneath only once the band exists to hold it up.
    if (members >= 2) {
      for (let s = 0; s < 16; s += 8) {
        guitarNote({
          ctx,
          dest: buses.guitar,
          time: barTime + s * S,
          freq: pitch(info.root),
          dur: 0.3,
          gain: 0.45,
        });
      }
    }
  } else {
    const grid = GUITAR_GRID[info.section];
    const sustain = GUITAR_SUSTAIN[info.section];
    for (let s = 0; s < 16; s++) {
      const v = grid[s];
      if (!v) continue;
      guitarNote({
        ctx,
        dest: buses.guitar,
        time: barTime + s * S,
        freq: pitch(info.root),
        dur: sustain,
        gain: v,
        bright: info.section === "chorus",
      });
    }
  }

  // --- Drums ----------------------------------------------------------------
  if (members >= 2 && buses.drums) {
    const d = buses.drums;
    const heavy = info.section === "chorus" || info.section === "outro";

    if (isFillBar && (info.section === "verse" || info.section === "intro")) {
      // Fill into the next section.
      for (let s = 0; s < 8; s++) hat(ctx, d, barTime + s * 2 * S, false, 0.8);
      kick(ctx, d, barTime);
      snare(ctx, d, barTime + 4 * S);
      snare(ctx, d, barTime + 8 * S, 0.7);
      tom(ctx, d, barTime + 10 * S, 220);
      tom(ctx, d, barTime + 12 * S, 180);
      tom(ctx, d, barTime + 14 * S, 140);
    } else {
      for (let s = 0; s < 16; s += 2) {
        hat(ctx, d, barTime + s * S, heavy && s % 8 === 4, heavy ? 1 : 0.85);
      }
      kick(ctx, d, barTime);
      kick(ctx, d, barTime + 6 * S, 0.85);
      if (heavy) kick(ctx, d, barTime + 10 * S, 0.7);
      snare(ctx, d, barTime + 4 * S);
      snare(ctx, d, barTime + 12 * S);
      if (info.local === 0 && (info.section === "chorus" || info.section === "solo")) {
        crash(ctx, d, barTime);
      }
    }
  }

  // --- Bass -----------------------------------------------------------------
  if (members >= 3 && buses.bass) {
    const b = buses.bass;
    const root = pitch(down(info.root, 2));
    const octave = root * 2;
    if (info.section === "chorus") {
      for (const [s, f] of [
        [0, root],
        [4, root],
        [6, octave],
        [8, root],
        [12, root],
        [14, octave],
      ] as const) {
        bassNote({ ctx, dest: b, time: barTime + s * S, freq: f, dur: 0.24 });
      }
    } else if (info.section === "outro") {
      bassNote({ ctx, dest: b, time: barTime, freq: root, dur: 1.4 });
    } else {
      for (let s = 0; s < 16; s += 2) {
        bassNote({
          ctx,
          dest: b,
          time: barTime + s * S,
          freq: s === 14 && isFillBar ? octave : root,
          dur: 0.2,
        });
      }
    }
  }
}

// --- House music -------------------------------------------------------------
// Deliberately terrible between-band PA music. Its whole job is to cover dead
// air when the band stops, so it has to be instantly identifiable as "not them".

const HOUSE_BASS = ["A2", "A2", "F2", "F2", "C3", "C3", "G2", "G2"];
const HOUSE_LEAD = [
  [0, "E4"],
  [3, "G4"],
  [6, "A4"],
  [10, "G4"],
  [12, "E4"],
] as const;

export function scheduleHouseBar(ctx: AudioContext, dest: AudioNode, bar: number, time: number) {
  const S = SECONDS_PER_STEP;
  const root = HOUSE_BASS[bar % HOUSE_BASS.length];

  const bassOsc = ctx.createOscillator();
  bassOsc.type = "triangle";
  bassOsc.frequency.value = pitch(root);
  const bassEnv = ctx.createGain();
  bassEnv.gain.setValueAtTime(0.0001, time);
  bassEnv.gain.exponentialRampToValueAtTime(0.22, time + 0.02);
  bassEnv.gain.exponentialRampToValueAtTime(0.0001, time + SECONDS_PER_BAR * 0.9);
  bassOsc.connect(bassEnv);
  bassEnv.connect(dest);
  bassOsc.start(time);
  bassOsc.stop(time + SECONDS_PER_BAR);

  for (const [step, note] of HOUSE_LEAD) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = pitch(note);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    const env = ctx.createGain();
    const t = time + step * S;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.1, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    osc.connect(lp);
    lp.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  // Drum machine so cheap it is basically a metronome.
  for (let s = 0; s < 16; s += 4) {
    const src = ctx.createOscillator();
    src.type = "sine";
    src.frequency.setValueAtTime(s % 8 === 0 ? 110 : 320, time + s * S);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.14, time + s * S);
    env.gain.exponentialRampToValueAtTime(0.0001, time + s * S + 0.1);
    src.connect(env);
    env.connect(dest);
    src.start(time + s * S);
    src.stop(time + s * S + 0.12);
  }
}
