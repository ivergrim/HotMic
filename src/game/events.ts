// The tier 1 event library (doc 8.7).
//
// Every entry has: a cause you can see or hear, one correct fix, a grace period,
// a drain rate, and a payoff beat where the fix must be undone (doc 8.1). None
// of them require a vocal channel, because there isn't one until tier 2 — so
// tier 1 has to be funny with instruments only (doc 11), which is the whole
// reason the dog exists.

import type { ChannelId } from "../audio/engine.ts";
import type { InjectionKind } from "../audio/sfx.ts";
import { NEUTRAL, type BoardState } from "./state.ts";

export type Fix =
  | { kind: "fader"; channel: ChannelId; dir: "down" | "up"; amount: number }
  | { kind: "tone"; channel: ChannelId; dir: "bass" | "treble"; amount: number }
  | { kind: "pan"; channel: ChannelId; dir: "left" | "right"; amount: number }
  | { kind: "panAll"; dir: "left" | "right"; amount: number }
  | { kind: "fx"; channel: ChannelId; on: boolean }
  | { kind: "master"; dir: "down" | "up"; amount: number }
  | { kind: "solo"; channel: ChannelId }
  | { kind: "house" }
  | { kind: "wipe" };

export interface EventDef {
  id: string;
  /** Occupies this instrument's single problem slot (doc 8.1). */
  slot: ChannelId | "master" | "board";
  intensity: 1 | 2 | 3;
  /** Earliest / latest position in the song, 0..1. */
  earliest: number;
  latest: number;
  /** Seconds the problem persists before its payoff beat fires. */
  hold: number;
  requiresMembers: number;
  /** Nothing else may be active alongside this. */
  exclusive?: boolean;
  /** Once per gig rather than recurring (doc 8.3). */
  once?: boolean;
  visual: string;
  /** What the player is told happened, on the debrief. */
  label: string;
  /** What they should have done. Shown only if they missed it. */
  lesson: string;
  fix: Fix;
  audio?: {
    inject?: InjectionKind;
    injectOn?: ChannelId;
    /** Level the stage leaves the instrument at, 0..1. */
    sourceTrim?: number;
    /** Tilt applied at source. Player cancels it with the tone knob. */
    sourceTilt?: number;
    /** The band stops playing entirely. */
    bandStops?: boolean;
  };
  /** Multiplier on the venue's grace period — the nastier events get less. */
  graceScale?: number;
}

export const EVENTS: Record<string, EventDef> = {
  cable_kick: {
    id: "cable_kick",
    slot: "guitar",
    intensity: 1,
    earliest: 0.05,
    latest: 0.85,
    hold: 9,
    requiresMembers: 1,
    visual: "cable_spark",
    label: "Dennis stood on his own cable.",
    lesson: "Guitar went thin and buzzy — tone toward bass until it's fat again.",
    fix: { kind: "tone", channel: "guitar", dir: "bass", amount: 0.55 },
    audio: { inject: "crackle", injectOn: "guitar", sourceTilt: 0.85 },
  },

  dennis_tunes: {
    id: "dennis_tunes",
    slot: "guitar",
    intensity: 1,
    earliest: 0.08,
    latest: 0.8,
    hold: 8,
    requiresMembers: 1,
    visual: "tuning",
    label: "Dennis tuned up. Mid-song. Into a live channel.",
    lesson: "Nothing musical was coming out of that channel — pull the fader down.",
    fix: { kind: "fader", channel: "guitar", dir: "down", amount: 0.34 },
    audio: { inject: "tuning", injectOn: "guitar", sourceTrim: 0 },
  },

  neighbour_sign: {
    id: "neighbour_sign",
    slot: "master",
    intensity: 1,
    earliest: 0.1,
    latest: 0.9,
    hold: 10,
    requiresMembers: 1,
    visual: "neighbour_sign",
    label: "The neighbour held up a sign.",
    lesson: "Master volume down until he goes back inside.",
    fix: { kind: "master", dir: "down", amount: 0.22 },
  },

  crowd_louder: {
    id: "crowd_louder",
    slot: "master",
    intensity: 1,
    earliest: 0.25,
    latest: 0.95,
    hold: 9,
    requiresMembers: 2,
    visual: "crowd_louder",
    label: "The room started chanting for it louder.",
    lesson: "Master volume up. They asked nicely, in their way.",
    fix: { kind: "master", dir: "up", amount: 0.16 },
  },

  dog_pedal: {
    id: "dog_pedal",
    slot: "guitar",
    intensity: 2,
    earliest: 0.15,
    latest: 0.85,
    hold: 9,
    requiresMembers: 1,
    visual: "dog_pedal",
    label: "A dog sat on the mute pedal.",
    lesson: "The guitar nearly vanished — that one needed turning UP, not down.",
    fix: { kind: "fader", channel: "guitar", dir: "up", amount: 0.16 },
    audio: { inject: "barking", injectOn: "guitar", sourceTrim: 0.12 },
  },

  dennis_wants_fx: {
    id: "dennis_wants_fx",
    slot: "guitar",
    intensity: 1,
    earliest: 0.3,
    latest: 0.9,
    hold: 9,
    requiresMembers: 1,
    visual: "wants_fx",
    label: "Dennis pointed at the ceiling for about nine seconds.",
    lesson: "He wanted reverb. FX on for the guitar, off again after.",
    fix: { kind: "fx", channel: "guitar", on: true },
  },

  guitar_feedback: {
    id: "guitar_feedback",
    slot: "guitar",
    intensity: 3,
    earliest: 0.2,
    latest: 0.95,
    hold: 7,
    requiresMembers: 1,
    visual: "feedback",
    label: "Feedback built on the guitar channel.",
    lesson: "Fader down, hard and immediately. It only ever gets louder.",
    fix: { kind: "fader", channel: "guitar", dir: "down", amount: 0.4 },
    audio: { inject: "feedback", injectOn: "guitar" },
    graceScale: 0.7,
  },

  crowd_pan_left: {
    id: "crowd_pan_left",
    slot: "guitar",
    intensity: 1,
    earliest: 0.2,
    latest: 0.85,
    hold: 9,
    requiresMembers: 1,
    visual: "pan_left",
    label: "The left side of the room wanted more guitar their way.",
    lesson: "Pan the guitar toward them. They were pointing at it.",
    fix: { kind: "pan", channel: "guitar", dir: "left", amount: 0.55 },
  },

  crowd_pan_right: {
    id: "crowd_pan_right",
    slot: "guitar",
    intensity: 1,
    earliest: 0.2,
    latest: 0.85,
    hold: 9,
    requiresMembers: 2,
    visual: "pan_right",
    label: "The right side of the room wanted more guitar their way.",
    lesson: "Pan the guitar toward them. They were pointing at it.",
    fix: { kind: "pan", channel: "guitar", dir: "right", amount: 0.55 },
  },

  dennis_wanders: {
    id: "dennis_wanders",
    slot: "guitar",
    intensity: 2,
    earliest: 0.3,
    latest: 0.9,
    hold: 9,
    requiresMembers: 1,
    visual: "wanders",
    label: "Dennis wandered off to the right and kept going.",
    lesson: "Follow him with the pan. The band were all pointing at him.",
    fix: { kind: "pan", channel: "guitar", dir: "right", amount: 0.55 },
  },

  rhonda_asleep: {
    id: "rhonda_asleep",
    slot: "drums",
    intensity: 2,
    earliest: 0.2,
    latest: 0.85,
    hold: 10,
    requiresMembers: 2,
    visual: "asleep",
    label: "Rhonda fell asleep on the snare.",
    lesson: "She was snoring into the drum mics. Pull the drums down until she comes round.",
    fix: { kind: "fader", channel: "drums", dir: "down", amount: 0.36 },
    audio: { inject: "snore", injectOn: "drums", sourceTrim: 0 },
  },

  debris_kit: {
    id: "debris_kit",
    slot: "drums",
    intensity: 2,
    earliest: 0.25,
    latest: 0.9,
    hold: 9,
    requiresMembers: 2,
    visual: "debris",
    label: "Something fell on the kit.",
    lesson: "The drums went boomy and hollow — tone toward treble to get them back.",
    fix: { kind: "tone", channel: "drums", dir: "treble", amount: 0.55 },
    audio: { inject: "boom", injectOn: "drums", sourceTilt: -0.8 },
  },

  bad_circuit: {
    id: "bad_circuit",
    slot: "guitar",
    intensity: 2,
    earliest: 0.2,
    latest: 0.9,
    hold: 9,
    requiresMembers: 2,
    visual: "bad_circuit",
    label: "The amp found a bad socket and started humming.",
    lesson: "That hum lives right down the bottom — tone toward treble to lose it.",
    fix: { kind: "tone", channel: "guitar", dir: "treble", amount: 0.55 },
    audio: { inject: "hum", injectOn: "guitar" },
  },

  solo_sign: {
    id: "solo_sign",
    slot: "guitar",
    intensity: 2,
    earliest: 0.35,
    latest: 0.8,
    hold: 7,
    requiresMembers: 2,
    exclusive: true,
    visual: "solo_sign",
    label: "Somebody at the front asked for the guitar soloed.",
    lesson: "Solo the guitar — then get it back before the rest of the room notices.",
    fix: { kind: "solo", channel: "guitar" },
  },

  perry_strap: {
    id: "perry_strap",
    slot: "bass",
    intensity: 2,
    earliest: 0.2,
    latest: 0.85,
    hold: 9,
    requiresMembers: 3,
    visual: "strap",
    label: "Perry's strap went and he finished the section sitting down.",
    lesson: "He was miles off his pickup. Bass UP until he's standing again.",
    fix: { kind: "fader", channel: "bass", dir: "up", amount: 0.16 },
    audio: { sourceTrim: 0.2 },
  },

  perry_drops_bass: {
    id: "perry_drops_bass",
    slot: "bass",
    intensity: 3,
    earliest: 0.52,
    latest: 0.68,
    hold: 9,
    requiresMembers: 3,
    exclusive: true,
    once: true,
    visual: "band_stopped",
    label: "Perry dropped the bass and the band stopped dead.",
    lesson: "Dead air. House music covers it — that is what the button is for.",
    fix: { kind: "house" },
    audio: { bandStops: true },
    graceScale: 1.2,
  },

  speaker_blows: {
    id: "speaker_blows",
    slot: "board",
    intensity: 3,
    earliest: 0.76,
    latest: 0.88,
    hold: 11,
    requiresMembers: 3,
    exclusive: true,
    once: true,
    visual: "speaker_blows",
    label: "The left stack blew up.",
    lesson: "Everything had to move to the side that still worked. Pan them all right.",
    fix: { kind: "panAll", dir: "right", amount: 0.5 },
    graceScale: 1.3,
  },

  beer_spill: {
    id: "beer_spill",
    slot: "board",
    intensity: 2,
    earliest: 0.7,
    latest: 0.88,
    hold: 11,
    requiresMembers: 3,
    once: true,
    visual: "beer_spill",
    label: "Somebody put a pint down on your desk. Sideways.",
    lesson: "Wipe it off. Drag across it — it is not going anywhere on its own.",
    fix: { kind: "wipe" },
  },
};

// --- Resolution -------------------------------------------------------------
// Evaluated against board state, never against a gesture (doc 8.1), so an
// unusual route to the right end state still counts.

export function fixSatisfied(fix: Fix, b: BoardState, wiped: boolean): boolean {
  switch (fix.kind) {
    case "fader": {
      const v = b.channels[fix.channel].volume;
      return fix.dir === "down" ? v <= NEUTRAL.volume - fix.amount : v >= NEUTRAL.volume + fix.amount;
    }
    case "tone": {
      const v = b.channels[fix.channel].tone;
      return fix.dir === "bass" ? v <= -fix.amount : v >= fix.amount;
    }
    case "pan": {
      const v = b.channels[fix.channel].pan;
      return fix.dir === "left" ? v <= -fix.amount : v >= fix.amount;
    }
    case "panAll": {
      const ids: ChannelId[] = ["guitar", "drums", "bass"];
      return ids.every((id) => {
        const v = b.channels[id].pan;
        return fix.dir === "left" ? v <= -fix.amount : v >= fix.amount;
      });
    }
    case "fx":
      return b.channels[fix.channel].fx === fix.on;
    case "master":
      return fix.dir === "down"
        ? b.master <= NEUTRAL.master - fix.amount
        : b.master >= NEUTRAL.master + fix.amount;
    case "solo":
      return b.solo === fix.channel;
    case "house":
      return b.house;
    case "wipe":
      return wiped;
  }
}

/** Which strips a player has to have returned home for the payoff to land. */
export function payoffTargets(fix: Fix): { channels: ChannelId[]; master: boolean; solo: boolean; house: boolean } {
  switch (fix.kind) {
    case "fader":
    case "tone":
    case "pan":
    case "fx":
      return { channels: [fix.channel], master: false, solo: false, house: false };
    case "panAll":
      return { channels: ["guitar", "drums", "bass"], master: false, solo: false, house: false };
    case "master":
      return { channels: [], master: true, solo: false, house: false };
    case "solo":
      return { channels: [], master: false, solo: true, house: false };
    case "house":
      return { channels: [], master: false, solo: false, house: true };
    case "wipe":
      return { channels: [], master: false, solo: false, house: false };
  }
}

export const DRAIN_PER_INTENSITY: Record<1 | 2 | 3, number> = {
  1: 1.5,
  2: 1.8,
  3: 2.2,
};

/** Off-neutral drift is a nag, not a failure (doc 12.2). */
export const DRIFT_DRAIN = 0.25;

/** Awarded for resolving inside grace. Capped by the ceiling of 100 (doc 7.2). */
export const SPEED_BONUS: Record<1 | 2 | 3, number> = {
  1: 3,
  2: 4,
  3: 6,
};
