import type { App, GameScreen } from "./app.ts";
import { MixEngine } from "./audio/engine.ts";
import { createScreen, VH, VW } from "./core/screen.ts";
import { Input } from "./core/input.ts";
import { fonts } from "./core/font.ts";
import { load, save, type Profile } from "./game/save.ts";
import { TitleScreen } from "./title.ts";

const view = document.getElementById("screen") as HTMLCanvasElement;
const screen = createScreen(view);
const input = new Input(screen);
const profile: Profile = load();

let engine: MixEngine | null = null;
let current: GameScreen | null = null;
let pending: GameScreen | null = null;

const app: App = {
  get engine() {
    // The context is created on the first real frame so autoplay policy never
    // sees it before a gesture is possible.
    if (!engine) engine = new MixEngine();
    return engine;
  },
  input,
  profile,
  commit: () => save(profile),
  go(next: GameScreen) {
    pending = next;
  },
  time: 0,
};

function swap() {
  if (!pending) return;
  current?.exit?.(app);
  current = pending;
  pending = null;
  current.enter?.(app);
}

// Wheel support for the store and message lists.
view.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    wheelDelta += e.deltaY * 0.4;
  },
  { passive: false },
);
let wheelDelta = 0;

// Nothing should keep making noise in a background tab.
document.addEventListener("visibilitychange", () => {
  if (!engine) return;
  if (document.hidden) engine.suspend();
  else void engine.resume();
});

// A first gesture anywhere unlocks audio.
const unlock = () => {
  void app.engine.resume();
};
window.addEventListener("pointerdown", unlock, { once: false });
window.addEventListener("keydown", unlock, { once: false });

app.go(new TitleScreen());

let last = performance.now();
let fontsReady = false;

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  app.time += dt;

  const ctx = screen.ctx;

  if (!fontsReady) {
    // Give webfonts a moment; the atlas bakes from whatever is resolved.
    ctx.fillStyle = "#0b0a10";
    ctx.fillRect(0, 0, VW, VH);
    fonts();
    fontsReady = true;
  }

  swap();
  if (current) {
    current.update(dt, app);
    ctx.fillStyle = "#0b0a10";
    ctx.fillRect(0, 0, VW, VH);
    current.draw(ctx, app);
  }

  if (wheelDelta !== 0) wheelDelta = 0;
  input.endFrame();
  screen.present();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
