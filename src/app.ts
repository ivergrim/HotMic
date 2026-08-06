import type { MixEngine } from "./audio/engine.ts";
import type { Input } from "./core/input.ts";
import type { Profile } from "./game/save.ts";

export interface GameScreen {
  enter?(app: App): void;
  exit?(app: App): void;
  update(dt: number, app: App): void;
  draw(ctx: CanvasRenderingContext2D, app: App): void;
}

export interface App {
  engine: MixEngine;
  input: Input;
  profile: Profile;
  /** Persist the profile immediately. */
  commit(): void;
  go(screen: GameScreen): void;
  /** Seconds since the app started. */
  time: number;
}
