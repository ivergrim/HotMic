// The manager's computer (doc 13.3). Three categories, and the joke and the
// mechanic arrive in the same word wherever possible (doc 14.3).
//
// Gear gates. Consumables help. Wearables do nothing at all, on purpose.

export type ItemCategory = "gear" | "consumable" | "wearable";

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  /** Item description. This is a comedy vehicle first (doc 3.1). */
  desc: string;
  /** Unlocked once this many venues have been passed. */
  showAfter: number;
  /** Consumables only. */
  effect?: "energy" | "clear" | "quiet";
  /** Wearables only — who it goes on. */
  wearer?: "guitar" | "drums" | "bass";
  /** Wearables only — the drawing id. */
  art?: string;
  /** Gear that is visible but not purchasable yet, to show the road ahead. */
  teaser?: boolean;
}

export const ITEMS: Item[] = [
  // --- Gear ---------------------------------------------------------------
  {
    id: "third_channel",
    name: "PROBASS 3-CH DESK EXPANDER (EX-RENTAL)",
    category: "gear",
    price: 95,
    showAfter: 0,
    desc: "A third channel. Previously owned by a wedding disco that stopped existing very suddenly. Smells of dry ice and legal correspondence. You cannot mix three people on two channels and Gaz knows this, which is why he is smiling.",
  },
  {
    id: "windscreens",
    name: "FOAM WINDSCREENS, PACK OF FOUR",
    category: "gear",
    price: 210,
    showAfter: 0,
    teaser: true,
    desc: "Grey foam spheres. Stop wind sounding like the end of the world. You do not need these yet. You will. Gaz has already booked something outdoors and is waiting for a good moment.",
  },
  {
    id: "vocal_channel",
    name: "FOURTH CHANNEL + MIC LEAD",
    category: "gear",
    price: 340,
    showAfter: 1,
    teaser: true,
    desc: "For when the band gets a singer. Gaz says he has 'a lad in mind'. The lad does not know this. Nobody has asked the lad.",
  },

  // --- Consumables --------------------------------------------------------
  {
    id: "airhorn",
    name: "AIRHORN (MARINE SAFETY, EXPIRED)",
    category: "consumable",
    price: 28,
    showAfter: 0,
    effect: "energy",
    desc: "Legally this is a distress signal. Practically it is fourteen points of crowd energy. Do not read the side of the can.",
  },
  {
    id: "gaffer",
    name: "GAFFER TAPE, ONE ROLL",
    category: "consumable",
    price: 34,
    showAfter: 0,
    effect: "clear",
    desc: "Kills one active problem outright, whatever it is, wherever it is. The entire live music industry is held up by this and a man called Baz.",
  },
  {
    id: "sandwich",
    name: "SERVICE STATION SANDWICH",
    category: "consumable",
    price: 22,
    showAfter: 1,
    effect: "quiet",
    desc: "Give it to Rhonda before you start. Fifteen seconds of nothing new going wrong, which is fifteen seconds of Rhonda chewing and the rest of the band watching her do it. Egg and cress. It was egg and cress on Tuesday too.",
  },

  // --- Wearables ----------------------------------------------------------
  {
    id: "traffic_cone",
    name: "TRAFFIC CONE (WORN AS HAT)",
    category: "wearable",
    price: 14,
    showAfter: 0,
    wearer: "guitar",
    art: "traffic_cone",
    desc: "Dennis will wear this for the entire set and will not mention it afterwards. Changes nothing. Improves everything.",
  },
  {
    id: "party_hat",
    name: "PARTY HAT, SINGLE",
    category: "wearable",
    price: 9,
    showAfter: 0,
    wearer: "bass",
    art: "party_hat",
    desc: "From a pack of eight. The other seven are in Gaz's desk and he will not say why. Purely cosmetic, like most of Gaz's decisions.",
  },
  {
    id: "bike_helmet",
    name: "CYCLE HELMET",
    category: "wearable",
    price: 26,
    showAfter: 1,
    wearer: "drums",
    art: "bike_helmet",
    desc: "Rhonda cycles to every gig with the kit in a trailer. She has offered no explanation and none has been requested. Provides no gameplay benefit and, given the strap situation, arguably no safety benefit.",
  },
  {
    id: "novelty_wig",
    name: "NOVELTY WIG, 'ROCK LEGEND'",
    category: "wearable",
    price: 19,
    showAfter: 1,
    wearer: "guitar",
    art: "novelty_wig",
    desc: "Three colours, none found in hair. The label says ONE SIZE and it is not that size.",
  },
  {
    id: "sunglasses",
    name: "SUNGLASSES, INDOORS",
    category: "wearable",
    price: 16,
    showAfter: 2,
    wearer: "bass",
    art: "sunglasses",
    desc: "Perry cannot see in these. Perry has never been able to see in these. Perry's playing is unaffected, which tells you something about Perry's playing.",
  },
];

export function itemById(id: string): Item {
  const i = ITEMS.find((x) => x.id === id);
  if (!i) throw new Error(`unknown item ${id}`);
  return i;
}

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  gear: "THE GEAR",
  consumable: "NIGHT OF",
  wearable: "LOOKING WELL",
};
