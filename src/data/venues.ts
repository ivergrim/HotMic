// Tier 1. Three venues, one member added at each (doc 11), one gear gate at
// venue 3 (doc 14.2), and the game's first board interference at the close of
// venue 3 (doc 9.2).

export interface Venue {
  id: string;
  name: string;
  where: string;
  art: string;
  /** Band members on stage: 1 guitar, 2 +drums, 3 +bass. */
  members: number;
  /** Fraction of the screen given to the stage. Tunable per venue (doc 5.7). */
  stageSplit: number;
  crowdCount: number;
  seed: number;
  /** Gear that must be owned before the gig can be selected. */
  requires: string | null;
  /** Payout at a perfect 100. Scaled by score. */
  topFee: number;
  /** How the manager sells it. Every word is a lie of some size. */
  pitch: string[];
  /** Shown on the map. */
  blurb: string;
  eventPool: string[];
  sustainedConcurrency: number;
  peakConcurrency: number;
  grace: number;
}

export const VENUES: Venue[] = [
  {
    id: "garage",
    name: "THE KROLL FAMILY GARAGE",
    where: "Dennis's mum's house",
    art: "garage",
    members: 1,
    // One channel can afford a taller stage. It shrinks as the band grows and
    // the board needs the room (doc 5.7).
    stageSplit: 0.51,
    crowdCount: 6,
    seed: 101,
    requires: null,
    topFee: 45,
    pitch: [
      "Right. First one's a soft launch. Intimate venue, dedicated crowd, no press.",
      "It's a garage. Dennis's mum's garage. She's put out a bowl of Twiglets, so don't embarrass me.",
      "Just Dennis on this one. One channel. You could do it with a light switch.",
    ],
    blurb:
      "One guitarist, one channel, six people and a cat. The cat has seen better acts.",
    eventPool: [
      "cable_kick",
      "dennis_tunes",
      "neighbour_sign",
      "dog_pedal",
      "dennis_wants_fx",
      "guitar_feedback",
      "crowd_pan_left",
      "dennis_wanders",
    ],
    sustainedConcurrency: 1,
    peakConcurrency: 1,
    grace: 4.0,
  },
  {
    id: "front_room",
    name: "77 BICKERSTAFF ROAD",
    where: "somebody's front room",
    art: "front_room",
    members: 2,
    stageSplit: 0.50,
    crowdCount: 13,
    seed: 202,
    requires: null,
    topFee: 85,
    pitch: [
      "House party. Eighteenth birthday. Or a wake. The bloke on the phone was crying either way.",
      "Rhonda's in now, so that's drums. Two channels. Still basically nothing.",
      "Sofa's against the wall, that's your stage. Don't stand on the sofa. Learn from Tuesday.",
    ],
    blurb:
      "Drums arrive. So does everyone from the road, and one person who lives here.",
    eventPool: [
      "cable_kick",
      "dennis_tunes",
      "neighbour_sign",
      "crowd_louder",
      "dog_pedal",
      "dennis_wants_fx",
      "guitar_feedback",
      "crowd_pan_left",
      "crowd_pan_right",
      "dennis_wanders",
      "rhonda_asleep",
      "debris_kit",
      "bad_circuit",
      "solo_sign",
    ],
    sustainedConcurrency: 1,
    peakConcurrency: 1,
    grace: 4.0,
  },
  {
    id: "back_garden",
    name: "12 ELLERMAN CLOSE (REAR)",
    where: "a back garden, at night, in October",
    art: "back_garden",
    members: 3,
    stageSplit: 0.49,
    crowdCount: 17,
    seed: 303,
    requires: "third_channel",
    topFee: 150,
    pitch: [
      "Outdoor festival. Multi-stage. Well — garden. One stage. It's a patio.",
      "Perry's joining on bass, which means three channels, which means you need a third channel.",
      "I'm not buying it for you. I've got overheads. This desk was an overhead.",
    ],
    blurb:
      "Bass arrives. So does the weather, the neighbours, and eventually somebody's drink.",
    eventPool: [
      "cable_kick",
      "dennis_tunes",
      "neighbour_sign",
      "crowd_louder",
      "dog_pedal",
      "dennis_wants_fx",
      "guitar_feedback",
      "crowd_pan_left",
      "crowd_pan_right",
      "dennis_wanders",
      "rhonda_asleep",
      "debris_kit",
      "bad_circuit",
      "solo_sign",
      "perry_strap",
      "perry_drops_bass",
      "speaker_blows",
      "beer_spill",
    ],
    sustainedConcurrency: 1,
    peakConcurrency: 2,
    grace: 3.8,
  },
];

export function venueById(id: string): Venue {
  const v = VENUES.find((x) => x.id === id);
  if (!v) throw new Error(`unknown venue ${id}`);
  return v;
}

export function venueIndex(id: string): number {
  return VENUES.findIndex((x) => x.id === id);
}
