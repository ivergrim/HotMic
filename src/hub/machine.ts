// The answering machine (doc 13.2 / 16). Optional side jobs, delivered as
// messages, with a sticky note carrying whichever one is currently accepted.

import type { App } from "../app.ts";
import { chrome } from "../audio/sfx.ts";
import { fonts } from "../core/font.ts";
import { money, panel, ScrollRegion, uiButton, type Rect } from "../core/ui.ts";
import { ellipse, line, rect } from "../art/draw.ts";
import { SIDE_JOBS, type SideJob } from "../data/sidejobs.ts";
import { venueById } from "../data/venues.ts";

const OUT = "#171018";

export class MachinePanel {
  private playing: SideJob | null = null;
  private lineIndex = 0;
  private lineTimer = 0;
  private scroll = new ScrollRegion();
  private time = 0;

  update(dt: number, app: App) {
    this.time += dt;
    if (this.playing) {
      this.lineTimer -= dt;
      if (this.lineTimer <= 0 && this.lineIndex < this.playing.message.length - 1) {
        this.lineIndex++;
        this.lineTimer = 2.6 + this.playing.message[this.lineIndex].length * 0.02;
        chrome.click(app.engine);
      }
    }
  }

  private jobsFor(app: App): SideJob[] {
    const passed = app.profile.passed.length;
    return SIDE_JOBS.filter(
      (j) =>
        !app.profile.doneJobs.includes(j.id) &&
        j.availableAfter <= passed &&
        app.profile.passed.includes(j.venue) === true,
    );
  }

  /** Returns true when the player closes the machine. */
  draw(ctx: CanvasRenderingContext2D, app: App): boolean {
    const f = fonts();
    rect(ctx, 0, 0, 480, 270, "#3a3040");

    const jobs = this.jobsFor(app);

    // The machine, big, on the left.
    const mx = 16;
    const my = 30;
    rect(ctx, mx, my, 170, 96, "#d8d2bc");
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + 0.5, my + 0.5, 169, 95);
    rect(ctx, mx + 10, my + 12, 76, 26, "#2a2a34");
    const blink = Math.sin(this.time * 5) > 0;
    f.big.draw(
      ctx,
      `${jobs.length}`,
      mx + 48,
      my + 18,
      jobs.length > 0 && blink ? "#ff6030" : "#6a2418",
      "center",
    );
    f.small.draw(ctx, "MESSAGES", mx + 10, my + 42, "#6b6478");
    ellipse(ctx, mx + 148, my + 22, 7, 7, jobs.length > 0 && blink ? "#ff4030" : "#5a2a24", OUT);
    for (let i = 0; i < 4; i++) rect(ctx, mx + 12 + i * 22, my + 60, 16, 10, "#8a8272");
    for (let i = 0; i < 3; i++) line(ctx, [mx + 108, my + 60 + i * 5], [mx + 158, my + 60 + i * 5], "#b0a894", 2);
    f.small.draw(ctx, "TRUNDLE HOUSE — CALLS ONLY", mx + 10, my + 78, "#8a8272");

    // Currently accepted job, on its sticky note.
    const active = app.profile.activeJob
      ? SIDE_JOBS.find((j) => j.id === app.profile.activeJob)
      : null;
    const noteR: Rect = { x: 16, y: 138, w: 170, h: 62 };
    if (active) {
      ctx.save();
      ctx.translate(noteR.x + noteR.w / 2, noteR.y + noteR.h / 2);
      ctx.rotate(-0.04);
      rect(ctx, -noteR.w / 2, -noteR.h / 2, noteR.w, noteR.h, "#e8d96a");
      ctx.strokeStyle = "#a89b3c";
      ctx.strokeRect(-noteR.w / 2 + 0.5, -noteR.h / 2 + 0.5, noteR.w - 1, noteR.h - 1);
      f.small.draw(ctx, "ON:", -noteR.w / 2 + 6, -noteR.h / 2 + 5, "#6b5a20");
      f.small.drawWrapped(ctx, active.note, -noteR.w / 2 + 6, -noteR.h / 2 + 15, noteR.w - 12, "#3a3020", 2);
      f.small.draw(
        ctx,
        `${venueById(active.venue).name} · ${money(active.fee)}`,
        -noteR.w / 2 + 6,
        noteR.h / 2 - 12,
        "#6b5a20",
      );
      ctx.restore();
      if (uiButton(ctx, app.input, { x: 16, y: 204, w: 170, h: 18 }, "TAKE THE NOTE DOWN", { color: "#8a4a3c", small: true })) {
        app.profile.activeJob = null;
        app.commit();
        chrome.back(app.engine);
      }
    } else {
      panel(ctx, noteR, "#4a4058", "#5c5268");
      f.small.drawWrapped(
        ctx,
        "No job accepted. You can take one, or you can have a quiet night, which nobody in this office has ever had.",
        noteR.x + 6,
        noteR.y + 8,
        noteR.w - 12,
        "#b0aabc",
        2,
      );
    }

    // Message list / playback.
    const listR: Rect = { x: 198, y: 16, w: 268, h: 208 };
    panel(ctx, listR, "#f0ece0");

    if (this.playing) {
      f.big.draw(ctx, this.playing.caller, listR.x + 8, listR.y + 6, "#2b2530");
      f.small.draw(
        ctx,
        `RE: ${venueById(this.playing.venue).name} · PAYS ${money(this.playing.fee)}`,
        listR.x + 8,
        listR.y + 22,
        "#6b6478",
      );
      line(ctx, [listR.x + 8, listR.y + 33], [listR.x + listR.w - 8, listR.y + 33], "#c9b89a", 1);
      let y = listR.y + 39;
      for (let i = 0; i <= this.lineIndex && i < this.playing.message.length; i++) {
        const fade = i === this.lineIndex ? "#2b2530" : "#6b6478";
        y += f.body.drawWrapped(ctx, `"${this.playing.message[i]}"`, listR.x + 8, y, listR.w - 16, fade, 2) + 4;
      }
      // Tape counter, running.
      f.small.draw(
        ctx,
        `— TAPE ${String(Math.floor(this.time * 3) % 1000).padStart(3, "0")}`,
        listR.x + listR.w - 8,
        listR.y + listR.h - 34,
        "#a89b7c",
        "right",
      );

      const done = this.lineIndex >= this.playing.message.length - 1;
      const accepted = app.profile.activeJob === this.playing.id;
      if (
        uiButton(
          ctx,
          app.input,
          { x: listR.x + 8, y: listR.y + listR.h - 26, w: 120, h: 18 },
          accepted ? "ACCEPTED" : "TAKE THE JOB",
          { color: accepted ? "#3f7a3a" : "#c8341f", disabled: !done || accepted, small: true },
        )
      ) {
        app.profile.activeJob = this.playing.id;
        if (!app.profile.heardMessages.includes(this.playing.id)) {
          app.profile.heardMessages.push(this.playing.id);
        }
        app.commit();
        chrome.cash(app.engine);
      }
      if (
        uiButton(
          ctx,
          app.input,
          { x: listR.x + 136, y: listR.y + listR.h - 26, w: 124, h: 18 },
          "STOP THE TAPE",
          { color: "#3a6ea8", small: true },
        )
      ) {
        this.playing = null;
        chrome.back(app.engine);
      }
    } else {
      f.big.draw(ctx, "MESSAGES", listR.x + 8, listR.y + 6, "#2b2530");
      line(ctx, [listR.x + 8, listR.y + 22], [listR.x + listR.w - 8, listR.y + 22], "#c9b89a", 1);
      if (jobs.length === 0) {
        f.body.drawWrapped(
          ctx,
          "Nothing. Play a few more gigs and word gets round, and then the phone does not stop, and then you will miss this.",
          listR.x + 8,
          listR.y + 30,
          listR.w - 16,
          "#6b6478",
          2,
        );
      }
      const rowH = 40;
      this.scroll.update(app.input, { ...listR, y: listR.y + 26, h: listR.h - 34 }, jobs.length * rowH);
      ctx.save();
      ctx.beginPath();
      ctx.rect(listR.x + 2, listR.y + 26, listR.w - 4, listR.h - 34);
      ctx.clip();
      jobs.forEach((j, i) => {
        const y = listR.y + 30 + i * rowH - this.scroll.offset;
        rect(ctx, listR.x + 6, y, listR.w - 12, rowH - 6, i % 2 ? "#e4dfcb" : "#eae5d3");
        f.body.draw(ctx, j.caller, listR.x + 10, y + 3, "#2b2530");
        f.small.draw(
          ctx,
          `${venueById(j.venue).name} · ${money(j.fee)}`,
          listR.x + 10,
          y + 16,
          "#6b6478",
        );
        if (app.profile.heardMessages.includes(j.id)) {
          f.small.draw(ctx, "HEARD", listR.x + listR.w - 68, y + 3, "#7a1fa2", "right");
        }
        if (
          uiButton(
            ctx,
            app.input,
            { x: listR.x + listR.w - 62, y: y + 8, w: 50, h: 16 },
            "PLAY",
            { color: "#3a6ea8", small: true },
          )
        ) {
          this.playing = j;
          this.lineIndex = 0;
          this.lineTimer = 2.6;
          if (!app.profile.heardMessages.includes(j.id)) {
            app.profile.heardMessages.push(j.id);
            app.commit();
          }
          chrome.page(app.engine);
        }
      });
      ctx.restore();
    }

    if (uiButton(ctx, app.input, { x: 198, y: 232, w: 268, h: 24 }, "BACK TO THE OFFICE", { color: "#3a6ea8" })) {
      chrome.back(app.engine);
      this.playing = null;
      return true;
    }
    return false;
  }
}
