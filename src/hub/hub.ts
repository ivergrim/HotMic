// The hub (doc 13). One screen. The manager is on it every time, which is why
// he is worth drawing well once.

import type { App, GameScreen } from "../app.ts";
import { chrome } from "../audio/sfx.ts";
import { fonts } from "../core/font.ts";
import { money, panel, type Rect } from "../core/ui.ts";
import { ellipse, line, poly, rect } from "../art/draw.ts";
import { drawComputer, drawGaz, drawOffice, HOTSPOTS } from "./office.ts";
import { StorePanel } from "./store.ts";
import { MapPanel, nextVenueFor } from "./map.ts";
import { MachinePanel } from "./machine.ts";
import { VENUES } from "../data/venues.ts";
import { SIDE_JOBS } from "../data/sidejobs.ts";

type Mode = "office" | "map" | "store" | "machine";

export class HubScreen implements GameScreen {
  private mode: Mode = "office";
  private store = new StorePanel();
  private map = new MapPanel();
  private machine = new MachinePanel();
  private time = 0;
  private swivel = 0;
  private swivelling = false;

  private lines: string[] = [];
  private lineIndex = 0;
  private talking = false;

  enter(app: App) {
    void app.engine.resume();
    this.openPitch(app);
  }

  private openPitch(app: App) {
    const idx = nextVenueFor(app);
    const venue = VENUES[idx];
    if (!app.profile.seenPitch.includes(venue.id)) {
      this.lines = venue.pitch;
      this.lineIndex = 0;
      this.talking = true;
      app.profile.seenPitch.push(venue.id);
      app.commit();
    } else {
      this.lines = [];
      this.talking = false;
    }
  }

  update(dt: number, app: App) {
    this.time += dt;
    this.store.update(dt);
    this.map.update(dt);
    this.machine.update(dt, app);
    if (this.swivelling) {
      this.swivel = Math.min(1, this.swivel + dt * 3.2);
      if (this.swivel >= 1) {
        this.swivelling = false;
        this.mode = "store";
        this.swivel = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, app: App) {
    switch (this.mode) {
      case "store":
        if (this.store.draw(ctx, app)) this.mode = "office";
        return;
      case "map":
        if (this.map.draw(ctx, app)) this.mode = "office";
        return;
      case "machine":
        if (this.machine.draw(ctx, app)) this.mode = "office";
        return;
      default:
        this.drawOfficeMode(ctx, app);
    }
  }

  private drawOfficeMode(ctx: CanvasRenderingContext2D, app: App) {
    const f = fonts();
    const hasNote = !!app.profile.activeJob;
    drawOffice(ctx, this.time, { noteOnMachine: hasNote });
    drawGaz(ctx, 254, 116, this.time, this.talking);
    if (this.swivelling) drawComputer(ctx, HOTSPOTS.computer.x, HOTSPOTS.computer.y, this.swivel);

    // Money, on a bit of paper, because there is no HUD in this world.
    ctx.save();
    ctx.translate(430, 100);
    ctx.rotate(0.06);
    rect(ctx, -44, -14, 88, 30, "#e8e2cc");
    ctx.strokeStyle = "#a89b7c";
    ctx.lineWidth = 1;
    ctx.strokeRect(-43.5, -13.5, 87, 29);
    f.small.draw(ctx, "YOUR CUT", 0, -10, "#6b6478", "center");
    f.big.draw(ctx, money(app.profile.money), 0, 1, "#2b2530", "center");
    ctx.restore();

    // Hotspots.
    const spots: { r: Rect; label: string; go: () => void }[] = [
      {
        r: HOTSPOTS.map,
        label: "THE MAP",
        go: () => {
          chrome.page(app.engine);
          this.mode = "map";
        },
      },
      {
        r: { x: HOTSPOTS.computer.x - 12, y: HOTSPOTS.computer.y - 2, w: 96, h: 68 },
        label: "HIS COMPUTER",
        go: () => {
          chrome.page(app.engine);
          this.swivelling = true;
          this.swivel = 0;
        },
      },
      {
        r: { x: HOTSPOTS.machine.x - 4, y: HOTSPOTS.machine.y - 14, w: 76, h: 48 },
        label: "ANSWERING MACHINE",
        go: () => {
          chrome.page(app.engine);
          this.mode = "machine";
        },
      },
      {
        r: HOTSPOTS.gaz,
        label: "GAZ TRUNDLE",
        go: () => {
          if (this.lines.length === 0 || !this.talking) {
            this.lines = gazSmallTalk(app);
            this.lineIndex = 0;
            this.talking = true;
          }
          chrome.click(app.engine);
        },
      },
    ];

    for (const s of spots) {
      const hover = app.input.hoverIn(s.r.x, s.r.y, s.r.w, s.r.h);
      if (hover) {
        // Outline, not a tooltip box. It is a drawn world.
        ctx.strokeStyle = "#e8c821";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(s.r.x + 0.5, s.r.y + 0.5, s.r.w - 1, s.r.h - 1);
        ctx.setLineDash([]);
        f.small.draw(ctx, s.label, s.r.x + s.r.w / 2, s.r.y - 9, "#e8c821", "center");
      }
      if (app.input.tapIn(s.r.x, s.r.y, s.r.w, s.r.h)) s.go();
    }

    // Unheard messages get a nudge, because the machine is easy to miss.
    const unheard = SIDE_JOBS.filter(
      (j) =>
        !app.profile.heardMessages.includes(j.id) &&
        !app.profile.doneJobs.includes(j.id) &&
        j.availableAfter <= app.profile.passed.length &&
        app.profile.passed.includes(j.venue),
    ).length;
    if (unheard > 0) {
      const bob = Math.sin(this.time * 3) * 2;
      ellipse(ctx, HOTSPOTS.machine.x + 66, HOTSPOTS.machine.y + 4 + bob, 7, 7, "#c8341f", "#171018");
      f.small.draw(ctx, `${unheard}`, HOTSPOTS.machine.x + 66, HOTSPOTS.machine.y + bob, "#f6f0e2", "center");
    }

    // Dialogue.
    if (this.talking && this.lines.length > 0) {
      const box: Rect = { x: 12, y: 190, w: 456, h: 56 };
      panel(ctx, box, "#f0ece0");
      // Tail pointing at Gaz.
      poly(
        ctx,
        [
          [230, 190],
          [258, 176],
          [256, 190],
        ],
        "#f0ece0",
        "#a89b7c",
      );
      f.small.draw(ctx, "GAZ TRUNDLE", box.x + 8, box.y + 5, "#a8261a");
      f.body.drawWrapped(ctx, this.lines[this.lineIndex], box.x + 8, box.y + 17, box.w - 16, "#2b2530", 2);
      const more = this.lineIndex < this.lines.length - 1;
      f.small.draw(ctx, more ? "CLICK TO CONTINUE →" : "CLICK TO CLOSE ×", box.x + box.w - 8, box.y + box.h - 11, "#6b6478", "right");
      if (app.input.tapIn(box.x, box.y, box.w, box.h)) {
        chrome.click(app.engine);
        if (more) this.lineIndex++;
        else this.talking = false;
      }
    } else {
      const bar: Rect = { x: 12, y: 226, w: 456, h: 20 };
      panel(ctx, bar, "#2f2a38", "#4a4458");
      f.small.draw(
        ctx,
        "THE MAP · HIS COMPUTER · THE ANSWERING MACHINE · GAZ",
        240,
        bar.y + 6,
        "#8a8494",
        "center",
      );
    }

    // A line of desk furniture so the bottom edge is not dead space.
    line(ctx, [0, 250], [480, 250], "#3a2f22", 1);
    f.small.draw(ctx, "TRUNDLE ARTIST MANAGEMENT — ABOVE THE CARPET PLACE", 240, 256, "#6b5540", "center");
  }
}

/** Gaz has an opinion at all times, about everything, and is never asked. */
function gazSmallTalk(app: App): string[] {
  const p = app.profile;
  const options: string[][] = [
    ["I'm not being funny, but a good sound man is invisible. That's not me being tight. That's the art form."],
    ["Perry rang. Wanted to know if he's 'in the band or featuring'. I said we'd revisit it."],
    ["Don't touch the plant. It's fine. It's a resting plant."],
    ["Rhonda's asked for a rider. I've written 'water' on a napkin and given it to her."],
  ];
  if (p.money === 0) {
    options.push(["You've got nothing. I've got a computer full of things. See the connection?"]);
  }
  if (p.passed.length >= 1) {
    options.push([
      "People are saying nice things. Not to you. To me. But they're about you, mostly.",
    ]);
  }
  if (p.owned.includes("third_channel")) {
    options.push(["That expander's ex-rental, so if a man called Wesley rings, we've never spoken."]);
  }
  return options[Math.floor(Math.random() * options.length)];
}
