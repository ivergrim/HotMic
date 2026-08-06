import type { App, GameScreen } from "./app.ts";
import { chrome } from "./audio/sfx.ts";
import { fonts } from "./core/font.ts";
import { uiButton, type Rect } from "./core/ui.ts";
import { ellipse, line, poly, rect } from "./art/draw.ts";
import { basePose, drawDennis, drawKitBack, drawKitFront, drawPerry, drawRhonda } from "./art/band.ts";
import { drawCrowd, makeCrowd } from "./art/crowd.ts";
import { HubScreen } from "./hub/hub.ts";
import { wipe } from "./game/save.ts";
import { freshProfile } from "./game/save.ts";

export class TitleScreen implements GameScreen {
  private time = 0;
  private crowd = makeCrowd(18, 480, 9);
  private confirmWipe = false;

  update(dt: number) {
    this.time += dt;
  }

  draw(ctx: CanvasRenderingContext2D, app: App) {
    const f = fonts();
    const t = this.time;
    const bar = (t * 0.6) % 1;

    // Backdrop: a stage nobody is watching yet.
    const g = ctx.createLinearGradient(0, 0, 0, 270);
    g.addColorStop(0, "#241c3a");
    g.addColorStop(1, "#5c2f42");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 270);

    // Lighting rig they will not own for another four tiers.
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 90;
      rect(ctx, x - 8, 0, 16, 10, "#2a2434");
      ctx.globalAlpha = 0.12 + Math.sin(t * 1.6 + i) * 0.05;
      poly(
        ctx,
        [
          [x - 8, 10],
          [x + 8, 10],
          [x + 52, 210],
          [x - 52, 210],
        ],
        ["#e8c821", "#e05fa8", "#3fa0d8", "#3f7a3a", "#e8621f"][i],
      );
      ctx.globalAlpha = 1;
    }

    const floor = 208;
    rect(ctx, 0, floor, 480, 62, "#2a2230");
    line(ctx, [0, floor], [480, floor], "#171018", 1);

    ctx.save();
    ctx.translate(96, floor);
    const d = basePose();
    d.bob = Math.abs(Math.sin(t * 4.4)) * 3;
    d.lean = Math.sin(t * 2.2) * 0.5;
    d.eyes = "closed";
    d.mouth = "open";
    drawDennis(ctx, d);
    ctx.restore();

    ctx.save();
    ctx.translate(248, floor);
    drawKitBack(ctx);
    const r = basePose();
    r.armL = t * 9;
    r.armR = t * 9 + 1.8;
    r.eyes = "squint";
    drawRhonda(ctx, r);
    drawKitFront(ctx);
    ctx.restore();

    ctx.save();
    ctx.translate(384, floor);
    const p = basePose();
    p.bob = Math.abs(Math.sin(t * 4.4 + 1)) * 2;
    p.lean = Math.sin(t * 2.2 + 2) * 0.3;
    drawPerry(ctx, p);
    ctx.restore();

    drawCrowd(ctx, this.crowd, 258, bar, 92, t);
    // Knock the audience back into silhouette so the caption stays readable.
    ctx.globalAlpha = 0.62;
    rect(ctx, 0, 226, 480, 44, "#0b0a10");
    ctx.globalAlpha = 1;

    // Logo. Hand-lettered, badly kerned, slightly on fire.
    const wob = Math.sin(t * 1.4) * 1.5;
    ctx.save();
    ctx.translate(240, 42 + wob);
    ctx.rotate(-0.02);
    const title = "BANDRUPTCY";
    const w = f.big.measure(title) * 2.2;
    rect(ctx, -w / 2 - 10, -6, w + 20, 34, "#c8341f");
    ctx.strokeStyle = "#171018";
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 - 10, -6, w + 20, 34);
    ctx.save();
    ctx.scale(2.2, 2.2);
    f.big.draw(ctx, title, 1, 2, "#171018", "center");
    f.big.draw(ctx, title, 0, 1, "#f2e8b0", "center");
    ctx.restore();
    ctx.restore();

    f.body.draw(ctx, "you are the sound engineer. none of this is your fault.", 240, 84 + wob, "#e8d9a0", "center");

    // Buttons.
    const start: Rect = { x: 160, y: 128, w: 160, h: 26 };
    if (uiButton(ctx, app.input, start, app.profile.passed.length > 0 ? "CARRY ON" : "START", { color: "#c8341f" })) {
      void app.engine.resume();
      chrome.fanfare(app.engine);
      app.go(new HubScreen());
    }

    if (app.profile.passed.length > 0 || app.profile.money > 0) {
      const reset: Rect = { x: 186, y: 160, w: 108, h: 18 };
      if (uiButton(ctx, app.input, reset, this.confirmWipe ? "SURE? TAP AGAIN" : "START OVER", { color: "#4a4458", small: true })) {
        void app.engine.resume();
        if (this.confirmWipe) {
          wipe();
          Object.assign(app.profile, freshProfile());
          app.commit();
          this.confirmWipe = false;
          chrome.deny(app.engine);
        } else {
          this.confirmWipe = true;
          chrome.click(app.engine);
        }
      }
    }

    // Amp glow, so the bottom corner is not empty.
    ellipse(ctx, 30, 250, 20, 8, "#00000055");
    f.small.draw(ctx, "TIER ONE · THREE GIGS · HEADPHONES IF YOU HAVE THEM", 240, 252, "#b0aabc", "center");
  }
}
