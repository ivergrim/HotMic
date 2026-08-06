// The map (doc 13.2). Browse and select gigs, including ones already passed —
// replaying earlier venues is always available, so money always has a route and
// there is no soft lock (doc 7.4 / 14.5).

import type { App } from "../app.ts";
import { chrome } from "../audio/sfx.ts";
import { fonts } from "../core/font.ts";
import { money, panel, uiButton, type Rect } from "../core/ui.ts";
import { ellipse, hatch, line, poly, rect } from "../art/draw.ts";
import { VENUES, venueIndex } from "../data/venues.ts";
import { itemById } from "../data/items.ts";
import { GigScreen } from "../game/gig.ts";

const OUT = "#171018";

/** Hand-drawn pin positions on the local map. */
const PINS = [
  { x: 60, y: 72 },
  { x: 168, y: 132 },
  { x: 276, y: 86 },
];

export class MapPanel {
  private selected = 0;
  private time = 0;

  update(dt: number) {
    this.time += dt;
  }

  private locked(app: App, i: number): string | null {
    const v = VENUES[i];
    // Winning a venue is required to progress to the next (doc 14.5).
    if (i > 0 && !app.profile.passed.includes(VENUES[i - 1].id)) {
      return `PASS ${VENUES[i - 1].name} FIRST`;
    }
    if (v.requires && !app.profile.owned.includes(v.requires)) {
      return `NEEDS: ${itemById(v.requires).name}`;
    }
    return null;
  }

  /** Returns true when the player closes the map. */
  draw(ctx: CanvasRenderingContext2D, app: App): boolean {
    const f = fonts();
    rect(ctx, 0, 0, 480, 270, "#3a3040");

    // The map itself: paper, coffee, biro.
    const m: Rect = { x: 8, y: 8, w: 464, h: 178 };
    panel(ctx, m, "#e8e2cc", "#a89b7c");
    hatch(ctx, m.x + 2, m.y + 2, m.w - 4, m.h - 4, "#c9b89a33", 9, 11);
    // Roads.
    ctx.strokeStyle = "#b0a488";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 150);
    ctx.bezierCurveTo(120, 120, 160, 60, 260, 70);
    ctx.bezierCurveTo(340, 78, 380, 130, 456, 120);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 20);
    ctx.lineTo(120, 170);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(400, 18);
    ctx.lineTo(330, 172);
    ctx.stroke();
    // A river, or a very long puddle.
    ctx.strokeStyle = "#8aa8c0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.bezierCurveTo(80, 40, 140, 100, 240, 30);
    ctx.stroke();
    f.small.draw(ctx, "THE CANAL (DO NOT)", 150, 22, "#7a8a98");
    f.small.draw(ctx, "RETAIL PARK", 400, 150, "#a89b7c");
    f.small.draw(ctx, "HERE BE GAZ", 34, 30, "#a89b7c");

    VENUES.forEach((v, i) => {
      const pin = PINS[i];
      const lock = this.locked(app, i);
      const passed = app.profile.passed.includes(v.id);
      const sel = this.selected === i;

      // Pin.
      const bob = sel ? Math.sin(this.time * 4) * 1.5 : 0;
      line(ctx, [pin.x, pin.y + bob], [pin.x, pin.y + 12 + bob], "#8a8272", 1);
      poly(
        ctx,
        [
          [pin.x, pin.y - 12 + bob],
          [pin.x + 22, pin.y - 9 + bob],
          [pin.x + 22, pin.y + 1 + bob],
          [pin.x, pin.y + bob],
        ],
        lock ? "#8a8494" : passed ? "#3f7a3a" : "#c8341f",
        OUT,
      );
      ellipse(ctx, pin.x, pin.y + 12 + bob, 3, 2, "#8a8272", OUT);
      f.small.draw(ctx, `${i + 1}`, pin.x + 11, pin.y - 10 + bob, "#f6f0e2", "center");
      f.small.draw(ctx, v.name, pin.x + 26, pin.y - 9 + bob, "#2b2530");
      if (lock) {
        // A padlock scribbled over it, so the gate is unmistakable (doc 4).
        rect(ctx, pin.x + 4, pin.y - 6 + bob, 8, 6, "#4a4458");
        ctx.strokeStyle = "#4a4458";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(pin.x + 8, pin.y - 6 + bob, 3, Math.PI, 0);
        ctx.stroke();
      }
      const best = app.profile.best[v.id];
      if (best !== undefined) {
        f.small.draw(ctx, `BEST ${best}`, pin.x + 26, pin.y + 1 + bob, "#6b6478");
      }

      if (app.input.tapIn(pin.x - 6, pin.y - 16, 150, 30)) {
        this.selected = i;
        chrome.click(app.engine);
      }
    });

    // Detail card.
    const card: Rect = { x: 8, y: 190, w: 320, h: 72 };
    panel(ctx, card, "#f0ece0");
    const v = VENUES[this.selected];
    const lock = this.locked(app, this.selected);
    f.big.draw(ctx, v.name, card.x + 8, card.y + 5, "#2b2530");
    f.small.draw(ctx, v.where.toUpperCase(), card.x + 8, card.y + 21, "#6b6478");
    f.small.drawWrapped(ctx, v.blurb, card.x + 8, card.y + 32, card.w - 16, "#3a3444", 2);
    f.small.draw(
      ctx,
      `${v.members} ON STAGE · UP TO ${money(v.topFee)}`,
      card.x + 8,
      card.y + 58,
      "#6b6478",
    );
    if (lock) f.small.draw(ctx, lock, card.x + card.w - 8, card.y + 58, "#a8261a", "right");

    const job = app.profile.activeJob;
    if (job) {
      f.small.draw(ctx, "SIDE JOB ACCEPTED", card.x + card.w - 8, card.y + 5, "#2f7a3a", "right");
    }

    const play: Rect = { x: 336, y: 190, w: 136, h: 34 };
    if (
      uiButton(ctx, app.input, play, lock ? "LOCKED" : "PLAY THIS ONE", {
        color: "#c8341f",
        disabled: !!lock,
      })
    ) {
      chrome.page(app.engine);
      app.go(new GigScreen(v.id, app.profile.activeJob));
      return false;
    }

    const back: Rect = { x: 336, y: 230, w: 136, h: 30 };
    if (uiButton(ctx, app.input, back, "BACK TO THE OFFICE", { color: "#3a6ea8", small: true })) {
      chrome.back(app.engine);
      return true;
    }
    return false;
  }
}

export function nextVenueFor(app: App): number {
  for (let i = 0; i < VENUES.length; i++) {
    if (!app.profile.passed.includes(VENUES[i].id)) return i;
  }
  return VENUES.length - 1;
}

export { venueIndex };
