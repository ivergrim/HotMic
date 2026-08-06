// After the gig. Doc 7.3: when a player fails they must understand why, and it
// is communicated by the room rather than by a stats screen. The number appears
// here and only here, because it sets the payout.

import type { App, GameScreen } from "../app.ts";
import { chrome } from "../audio/sfx.ts";
import { fonts } from "../core/font.ts";
import { heading, money, panel, uiButton } from "../core/ui.ts";
import { ellipse, line, poly, rect } from "../art/draw.ts";
import { drawCrowd, makeCrowd, moodFor, type CrowdMember } from "../art/crowd.ts";
import { VENUE_ART } from "../art/venue.ts";
import type { Venue } from "../data/venues.ts";
import type { SideJob } from "../data/sidejobs.ts";
import { GigScreen } from "./gig.ts";
import { HubScreen } from "../hub/hub.ts";

export interface DebriefData {
  venue: Venue;
  score: number;
  passed: boolean;
  hardFail: boolean;
  payout: number;
  jobPay: number;
  job: SideJob | null;
  jobDone: boolean;
  missed: { label: string; lesson: string; missedPayoff: boolean }[];
  nextVenue: string | null;
}

/** What the room says. Never a stats line. */
function verdict(d: DebriefData): string[] {
  if (d.hardFail) {
    return [
      "Somebody found the fuse box.",
      "The lights are on, the PA is off, and a man in a fleece is explaining that he has to be up at five.",
    ];
  }
  if (d.score >= 100) {
    return [
      "Nobody noticed a single thing go wrong.",
      "Which is the entire job, and which is why nobody will ever thank you for it.",
    ];
  }
  if (d.score >= 85) {
    return ["Good room. Two people asked who does their sound. Gaz said it was him."];
  }
  if (d.score >= 65) {
    return ["They got away with it. Dennis thinks the crowd were 'a bit quiet in the middle'."];
  }
  if (d.score >= 50) {
    return ["Scraped it. Somebody's dad said it was 'loud', and did not mean it kindly."];
  }
  return [
    "They wanted their money back. There was no money to get back, which took a while to explain.",
    "Rhonda has already loaded the kit into the trailer. Rhonda knew before you did.",
  ];
}

export class Debrief implements GameScreen {
  private d: DebriefData;
  private crowd: CrowdMember[];
  private time = 0;

  constructor(data: DebriefData) {
    this.d = data;
    this.crowd = makeCrowd(data.venue.crowdCount, 480, data.venue.seed + 5);
  }

  update(dt: number, app: App) {
    this.time += dt;
    void app;
  }

  draw(ctx: CanvasRenderingContext2D, app: App) {
    const d = this.d;
    const f = fonts();
    const stageH = 108;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 480, stageH);
    ctx.clip();
    VENUE_ART[d.venue.art].draw(ctx, 480, stageH, (this.time * 0.4) % 1, this.time);
    // The room after the fact: how they feel is the readout (doc 7.3).
    drawCrowd(ctx, this.crowd, stageH - 2, (this.time * 0.4) % 1, d.score, this.time);
    if (!d.passed) {
      // Somebody has thrown something. It is in the air. It will land.
      const p = (this.time * 0.7) % 1;
      const tx = 40 + p * 300;
      const ty = stageH - 20 - Math.sin(p * Math.PI) * 46;
      ellipse(ctx, tx, ty, 5, 4.5, "#c8341f", "#171018");
      poly(
        ctx,
        [
          [tx - 1, ty - 5],
          [tx + 3, ty - 8],
          [tx + 4, ty - 4],
        ],
        "#3f7a3a",
        "#171018",
      );
    }
    ctx.restore();
    rect(ctx, 0, stageH, 480, 270 - stageH, "#2b2530");

    const top = stageH + 8;
    const bodyH = 232 - top;

    // --- The number ---------------------------------------------------------
    panel(ctx, { x: 10, y: top, w: 158, h: bodyH });
    heading(ctx, d.passed ? "PAID" : "NOT PAID", 18, top + 4);
    f.big.draw(
      ctx,
      `${d.score}`,
      89,
      top + 28,
      d.score >= 85 ? "#2f7a3a" : d.score >= 50 ? "#8a6a10" : "#a8261a",
      "center",
    );
    f.small.draw(ctx, "OUT OF 100 · PASS IS 50", 89, top + 46, "#6b6478", "center");
    line(ctx, [18, top + 58], [160, top + 58], "#c9b89a", 1);
    f.body.draw(ctx, `FEE ${money(d.payout)}`, 18, top + 64, "#2b2530");
    if (d.job) {
      f.body.draw(
        ctx,
        d.jobDone ? `SIDE JOB ${money(d.jobPay)}` : "SIDE JOB FAILED",
        18,
        top + 78,
        d.jobDone ? "#2f7a3a" : "#a8261a",
      );
      f.small.drawWrapped(ctx, d.job.caller, 18, top + 90, 140, "#6b6478", 1);
    }
    f.small.draw(
      ctx,
      `THE ROOM: ${moodFor(d.score).replace(/_/g, " ").toUpperCase()}`,
      18,
      top + bodyH - 12,
      "#6b6478",
    );

    // --- What the room thought ---------------------------------------------
    panel(ctx, { x: 176, y: top, w: 294, h: bodyH }, "#f0ece0");
    let y = top + 6;
    for (const lineText of verdict(d)) {
      y += f.body.drawWrapped(ctx, lineText, 184, y, 278, "#2b2530", 2) + 4;
    }
    // The specific failure feedback has to point at what went wrong (doc 7.3).
    if (d.missed.length > 0) {
      y += 2;
      f.small.draw(ctx, "THEY DEFINITELY NOTICED:", 184, y, "#a8261a");
      y += 11;
      for (const m of d.missed.slice(0, 3)) {
        if (y > top + bodyH - 12) break;
        y +=
          f.small.drawWrapped(
            ctx,
            m.missedPayoff
              ? `${m.label} And you never put the channel back.`
              : `${m.label} ${m.lesson}`,
            184,
            y,
            278,
            "#4a4458",
            1,
          ) + 3;
      }
    }

    // --- Buttons ------------------------------------------------------------
    if (uiButton(ctx, app.input, { x: 10, y: 240, w: 158, h: 22 }, "PLAY IT AGAIN", { color: "#c8341f" })) {
      chrome.page(app.engine);
      app.go(new GigScreen(d.venue.id, app.profile.activeJob));
    }
    if (
      uiButton(ctx, app.input, { x: 176, y: 240, w: 180, h: 22 }, "BACK TO THE OFFICE", {
        color: "#3a6ea8",
      })
    ) {
      chrome.back(app.engine);
      app.go(new HubScreen());
    }
    if (d.passed && d.nextVenue) {
      f.small.draw(ctx, "GAZ HAS ANOTHER", 470, 242, "#8a8494", "right");
      f.small.draw(ctx, "ONE LINED UP.", 470, 252, "#8a8494", "right");
    }
  }
}
