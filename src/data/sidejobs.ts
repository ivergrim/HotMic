// Side jobs (doc 16). Optional, well paid, deliberately awkward.
//
// Every one of these is something you *do* during the gig, never something you
// abstain from (doc 16.3). The difficulty is the conflict with the gig you are
// simultaneously being scored on, never remembering the brief — that is what
// the sticky note is for.

import type { SectionName } from "../audio/song.ts";
import type { BoardState } from "../game/state.ts";
import { NEUTRAL } from "../game/state.ts";

export type JobKind = "mark" | "capture" | "sabotage";

export interface SideJob {
  id: string;
  caller: string;
  venue: string;
  fee: number;
  /** Available once this many venues have been passed. */
  availableAfter: number;
  /** The answering machine message, in full. */
  message: string[];
  /** Short form for the in-gig sticky note. Must be readable at a glance. */
  note: string;
  kind: JobKind;
  /** Which song section the window opens in, and which occurrence of it. */
  window?: { section: SectionName; occurrence: number };
  /** Seconds the condition must hold inside the window. */
  hold?: number;
  /** Evaluated every frame while inside the window. */
  condition?: (b: BoardState) => boolean;
  /** For "mark" jobs, the score that has to be beaten. */
  targetScore?: number;
  /** What the sticky note says once the window is live. */
  liveNote?: string;
}

export const SIDE_JOBS: SideJob[] = [
  {
    id: "the_bet",
    caller: "TERRY KROLL",
    venue: "garage",
    fee: 70,
    availableAfter: 1,
    message: [
      "Yeah, hello, it's Terry. Dennis's cousin. Not the Terry from the thing.",
      "Right, so I've told everyone down the Anchor that our Dennis has got a proper sound man now and Baz has said, and I quote, 'no he hasn't'.",
      "So. Garage. Do it again and do it perfect. Hundred out of hundred, not ninety-nine.",
      "There's seventy quid in it. It's Baz's seventy quid. He doesn't know that yet.",
    ],
    note: "TERRY: FINISH THIS ONE ON 100. NOT 99.",
    kind: "mark",
    targetScore: 100,
  },
  {
    id: "sample_this",
    caller: "DJ HALF MEASURE",
    venue: "front_room",
    fee: 95,
    availableAfter: 1,
    message: [
      "Yo. It's Half Measure. From the thing at the leisure centre.",
      "I need a break. A drum break. Clean, no guitar on it, and I need it recorded.",
      "Big chorus, second one, that's where she's got the good one. Solo the drums, hit record, hold it. Four seconds. Don't chicken out at three.",
      "I know it'll sound mad in the room. That's your problem, that's why it's ninety-five quid.",
    ],
    note: "HALF MEASURE: SOLO THE DRUMS AND RECORD, SECOND CHORUS",
    liveNote: "NOW! SOLO DRUMS + RECORD",
    kind: "capture",
    window: { section: "chorus", occurrence: 1 },
    hold: 4,
    condition: (b) => b.solo === "drums" && b.record,
  },
  {
    id: "perrys_rival",
    caller: "WITHHELD",
    venue: "back_garden",
    fee: 130,
    availableAfter: 2,
    message: [
      "I'm not going to say who this is.",
      "There is a bass player in that band. I was in a band with that bass player in 1994. He knows what he did.",
      "During the guitar solo I want him thin. I want him nasty. All the treble you've got and turn him up so everyone hears it.",
      "Five seconds. Hundred and thirty pounds. This isn't about money, this is about a van.",
    ],
    note: "WITHHELD: BASS ALL TREBLE AND LOUD, DURING THE GUITAR SOLO",
    liveNote: "NOW! BASS BRIGHT + LOUD",
    kind: "sabotage",
    window: { section: "solo", occurrence: 0 },
    hold: 5,
    condition: (b) => b.channels.bass.tone > 0.7 && b.channels.bass.volume > NEUTRAL.volume + 0.12,
  },
];

export function jobById(id: string): SideJob | undefined {
  return SIDE_JOBS.find((j) => j.id === id);
}
