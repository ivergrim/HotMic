import type { ChannelId } from "../audio/engine.ts";

export interface ChannelState {
  volume: number;
  tone: number;
  pan: number;
  fx: boolean;
}

export interface BoardState {
  channels: Record<ChannelId, ChannelState>;
  master: number;
  solo: ChannelId | null;
  house: boolean;
  record: boolean;
}

/**
 * Every channel has a neutral resting position (doc 2.2). This is what kills
 * pre-parking, gives the fader a defined home, and turns a slow meter leak into
 * a message: something is still off the board.
 */
export const NEUTRAL = {
  volume: 0.75,
  tone: 0,
  pan: 0,
  master: 0.75,
} as const;

/** Neutral is a range, not a point. Width is a difficulty dial (doc 12.1). */
export const NEUTRAL_RANGE = {
  volume: 0.07,
  tone: 0.15,
  pan: 0.15,
  master: 0.07,
} as const;

export function freshChannel(): ChannelState {
  return { volume: NEUTRAL.volume, tone: NEUTRAL.tone, pan: NEUTRAL.pan, fx: false };
}

export function freshBoard(): BoardState {
  return {
    channels: {
      guitar: freshChannel(),
      drums: freshChannel(),
      bass: freshChannel(),
    },
    master: NEUTRAL.master,
    solo: null,
    house: false,
    record: false,
  };
}

export function channelAtNeutral(c: ChannelState): boolean {
  return (
    Math.abs(c.volume - NEUTRAL.volume) <= NEUTRAL_RANGE.volume &&
    Math.abs(c.tone - NEUTRAL.tone) <= NEUTRAL_RANGE.tone &&
    Math.abs(c.pan - NEUTRAL.pan) <= NEUTRAL_RANGE.pan &&
    !c.fx
  );
}

/** How far off neutral a channel sits, 0..1-ish. Drives the slow drift drain. */
export function offNeutralAmount(c: ChannelState): number {
  const v = Math.max(0, Math.abs(c.volume - NEUTRAL.volume) - NEUTRAL_RANGE.volume) / 0.25;
  const t = Math.max(0, Math.abs(c.tone - NEUTRAL.tone) - NEUTRAL_RANGE.tone) / 0.85;
  const p = Math.max(0, Math.abs(c.pan - NEUTRAL.pan) - NEUTRAL_RANGE.pan) / 0.85;
  return Math.min(1, v + t + p + (c.fx ? 0.6 : 0));
}

export function masterAtNeutral(b: BoardState): boolean {
  return Math.abs(b.master - NEUTRAL.master) <= NEUTRAL_RANGE.master;
}

export const CHANNEL_ORDER: ChannelId[] = ["guitar", "drums", "bass"];

export const CHANNEL_LABEL: Record<ChannelId, string> = {
  guitar: "GTR",
  drums: "DRM",
  bass: "BASS",
};

export const CHANNEL_PLAYER: Record<ChannelId, string> = {
  guitar: "DENNIS",
  drums: "RHONDA",
  bass: "PERRY",
};
