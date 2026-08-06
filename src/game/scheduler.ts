// The scheduler (doc 8.3).
//
// Levels are authored, not random. What shuffles is the *order* the same cast of
// gags arrives in. What does not shuffle is the shape of the pressure: each song
// section has a fixed budget for how much can be active at once and how nasty it
// is allowed to be, so no run is unwinnable through luck and score chasing stays
// fair (doc 12.4).

import { SECONDS_PER_BAR, sectionSpans, type SectionName } from "../audio/song.ts";
import { EVENTS, type EventDef } from "./events.ts";
import type { Venue } from "../data/venues.ts";
import { shuffle, type Rng } from "../core/rng.ts";

export interface PlannedEvent {
  def: EventDef;
  /** Seconds from the downbeat. */
  at: number;
}

/** Per-section budget. The curve starts chill and ends in final beats, plural. */
interface SectionBudget {
  maxConcurrent: number;
  maxIntensity: 1 | 2 | 3;
  /** Events fired inside this section, by venue index. */
  count: [number, number, number];
}

const CURVE: SectionBudget[] = [
  { maxConcurrent: 1, maxIntensity: 1, count: [0, 0, 0] }, // intro — let them hear the room
  { maxConcurrent: 1, maxIntensity: 1, count: [1, 1, 1] }, // verse
  { maxConcurrent: 1, maxIntensity: 2, count: [1, 1, 1] }, // chorus
  { maxConcurrent: 1, maxIntensity: 2, count: [2, 2, 2] }, // verse
  { maxConcurrent: 1, maxIntensity: 3, count: [2, 2, 2] }, // solo
  { maxConcurrent: 2, maxIntensity: 3, count: [2, 2, 2] }, // chorus
  { maxConcurrent: 2, maxIntensity: 3, count: [2, 2, 2] }, // outro — final beats
];

/**
 * Story beats that must land. Ordered by priority, not by time: whatever is
 * listed first gets first refusal on the timeline, so the tier's punchline is
 * never the thing that gets squeezed out.
 */
const MANDATORY: Record<string, string[]> = {
  garage: ["dennis_tunes", "dog_pedal"],
  front_room: ["rhonda_asleep", "crowd_louder"],
  back_garden: ["beer_spill", "perry_drops_bass", "speaker_blows", "perry_strap"],
};

/** After this fires, prefer that next — the tug-of-war pairs (doc 8.7). */
const AFFINITY: Record<string, string> = {
  neighbour_sign: "crowd_louder",
  crowd_louder: "neighbour_sign",
};

/** How long an event ties up its slot: the problem, plus room for the payoff. */
const occupancy = (def: EventDef) => def.hold + 3;

/**
 * Board interference is the one thing that legitimately stacks with everything
 * else, because it is not on an instrument (doc 9.4). It still costs a
 * concurrency slot, and only one may be live at a time.
 */
const isInterference = (def: EventDef) => def.fix.kind === "wipe";

interface Placement {
  def: EventDef;
  at: number;
  until: number;
}

export function planGig(venue: Venue, venueIdx: number, rng: Rng): PlannedEvent[] {
  const spans = sectionSpans();
  const placed: Placement[] = [];
  const usedOnce = new Set<string>();
  const songLength = spans[spans.length - 1].endBar * SECONDS_PER_BAR;

  const pool = venue.eventPool
    .map((id) => EVENTS[id])
    .filter((e): e is EventDef => !!e && e.requiresMembers <= venue.members);

  const sectionAt = (t: number): { budget: SectionBudget; name: SectionName } | null => {
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i];
      if (t >= s.startBar * SECONDS_PER_BAR && t < s.endBar * SECONDS_PER_BAR) {
        return { budget: CURVE[i], name: s.name };
      }
    }
    return null;
  };

  const concurrentAt = (t: number) => placed.filter((p) => t >= p.at && t < p.until).length;

  function fits(def: EventDef, at: number): boolean {
    const until = at + occupancy(def);
    // The problem itself must finish before the song does, or the player is
    // handed something they cannot resolve. The payoff beat may be cut short by
    // the last bar, which is fine — that is what final beats feel like.
    if (at + def.hold > songLength - 2) return false;
    const p = at / songLength;
    if (p < def.earliest || p > def.latest) return false;
    if (def.once && usedOnce.has(def.id)) return false;

    for (const other of placed) {
      const overlaps = at < other.until && until > other.at;
      if (!overlaps) continue;
      if (isInterference(def) || isInterference(other.def)) {
        // Stacks with anything except another interference.
        if (isInterference(def) && isInterference(other.def)) return false;
        continue;
      }
      if (def.exclusive || other.def.exclusive) return false;
      // One problem at a time per instrument (doc 8.1).
      if (def.slot === other.def.slot) return false;
    }

    // Every instant of the event must sit inside the section budget it lands in.
    for (let t = at; t < until; t += 0.5) {
      const sec = sectionAt(Math.min(t, songLength - 0.01));
      if (!sec) continue;
      if (t === at && def.intensity > sec.budget.maxIntensity) return false;
      const cap = Math.min(sec.budget.maxConcurrent, venue.peakConcurrency);
      if (concurrentAt(t) + 1 > cap) return false;
    }
    return true;
  }

  function place(def: EventDef, at: number) {
    placed.push({ def, at, until: at + occupancy(def) });
    if (def.once) usedOnce.add(def.id);
  }

  // 1. Mandatory beats first, so the story of the level always happens. They are
  //    tried late-to-early because the heaviest ones are authored for the end.
  const mandatory = (MANDATORY[venue.id] ?? []).map((id) => EVENTS[id]).filter(Boolean);
  for (const def of mandatory) {
    if (!def || def.requiresMembers > venue.members) continue;
    const lo = def.earliest * songLength;
    const hi = def.latest * songLength;
    let bestAt = -1;
    // Walk candidate times in a shuffled order so it is not always the same beat.
    const candidates = shuffle(
      rng,
      Array.from({ length: 40 }, (_, i) => lo + ((hi - lo) * i) / 39),
    );
    for (const at of candidates) {
      if (fits(def, at)) {
        bestAt = at;
        break;
      }
    }
    if (bestAt >= 0) place(def, bestAt);
  }

  // 2. Fill the curve.
  const timesUsed = new Map<string, number>();
  for (const p of placed) timesUsed.set(p.def.id, 1);
  let lastFired: string | null = null;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const budget = CURVE[i];
    const want = budget.count[Math.min(venueIdx, 2)];
    const start = span.startBar * SECONDS_PER_BAR;
    const end = span.endBar * SECONDS_PER_BAR;
    const length = end - start;

    for (let k = 0; k < want; k++) {
      const base = start + (length * (k + 0.45)) / want;

      let candidates = shuffle(rng, pool).filter((d) => d.intensity <= budget.maxIntensity);
      // Spread the library out — an event already used this run goes to the
      // back, so one gag does not turn up three times while another never does.
      candidates.sort((a, b) => (timesUsed.get(a.id) ?? 0) - (timesUsed.get(b.id) ?? 0));
      // Nudge the tug-of-war pairs toward landing near each other.
      if (lastFired && AFFINITY[lastFired]) {
        const partner = AFFINITY[lastFired];
        const idx = candidates.findIndex((d) => d.id === partner);
        if (idx > 0) candidates.unshift(candidates.splice(idx, 1)[0]);
      }

      // Several nearby times, so a single unlucky jitter does not lose the slot.
      const times = [base, ...Array.from({ length: 9 }, () => base + (rng() - 0.5) * length * 0.7)];
      let done = false;
      for (const d of candidates) {
        for (const at of times) {
          if (at < 0 || !fits(d, at)) continue;
          place(d, at);
          timesUsed.set(d.id, (timesUsed.get(d.id) ?? 0) + 1);
          lastFired = d.id;
          done = true;
          break;
        }
        if (done) break;
      }
    }
  }

  return placed
    .sort((a, b) => a.at - b.at)
    .map((p) => ({ def: p.def, at: p.at }));
}
