// Doc 15: a browser game that loses a player's run is a browser game they do not
// come back to. Everything the player earned survives the tab closing.

const KEY = "bandruptcy.save.v1";

export interface Profile {
  money: number;
  /** Gear and wearables owned. */
  owned: string[];
  equipped: { guitar: string | null; drums: string | null; bass: string | null };
  /** Consumable id -> count in stock. */
  stock: Record<string, number>;
  passed: string[];
  best: Record<string, number>;
  activeJob: string | null;
  doneJobs: string[];
  heardMessages: string[];
  seenPitch: string[];
  sawIntro: boolean;
}

export function freshProfile(): Profile {
  return {
    money: 0,
    owned: [],
    equipped: { guitar: null, drums: null, bass: null },
    stock: {},
    passed: [],
    best: {},
    activeJob: null,
    doneJobs: [],
    heardMessages: [],
    seenPitch: [],
    sawIntro: false,
  };
}

export function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshProfile();
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return { ...freshProfile(), ...parsed, equipped: { ...freshProfile().equipped, ...parsed.equipped } };
  } catch {
    return freshProfile();
  }
}

export function save(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private browsing; the run still works, it just will not persist */
  }
}

export function wipe(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
