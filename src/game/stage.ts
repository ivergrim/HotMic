// The stage (doc 6). The player's primary information channel.
//
// Two rules run everything here. Every event's visual appears at the location of
// its cause, so stage position maps to channel strip and never lies (6.2.1). And
// when an event crosses from "you have time" to "you are losing points", the
// visual escalates — that transition is the single most important piece of
// feedback in the game (6.2.4).

import type { ChannelId } from "../audio/engine.ts";
import { basePose, drawDennis, drawKitBack, drawKitFront, drawPerry, drawRhonda } from "../art/band.ts";
import { drawCrowd, drawCrowdSign, makeCrowd, type CrowdMember } from "../art/crowd.ts";
import { ellipse, line, poly, rect } from "../art/draw.ts";
import { fonts } from "../core/font.ts";
import { VENUE_ART, type VenueArt } from "../art/venue.ts";
import type { Venue } from "../data/venues.ts";

const OUT = "#171018";

export interface CueState {
  id: string;
  visual: string;
  phase: "setup" | "payoff";
  /** 0 while inside grace, ramps to 1 once it is costing points. */
  urgency: number;
  age: number;
  channel?: ChannelId;
}

export interface StageFrame {
  barPhase: number;
  beatPhase: number;
  time: number;
  energy: number;
  cues: CueState[];
  members: number;
  bandPlaying: boolean;
  equipped: { guitar: string | null; drums: string | null; bass: string | null };
}

/** Where each member stands, by band size. Fixed, so the mapping is learnable. */
const POSITIONS: Record<number, { guitar: number; drums: number; bass: number }> = {
  1: { guitar: 196, drums: 340, bass: 400 },
  2: { guitar: 150, drums: 330, bass: 400 },
  3: { guitar: 116, drums: 258, bass: 384 },
};

export class Stage {
  private art: VenueArt;
  private crowd: CrowdMember[];
  private venue: Venue;
  private panelH: number;
  /** Dennis's wander offset, eased so he walks rather than teleports. */
  private drift = 0;

  constructor(venue: Venue, panelH: number) {
    this.venue = venue;
    this.art = VENUE_ART[venue.art];
    this.panelH = panelH;
    this.crowd = makeCrowd(venue.crowdCount, 480, venue.seed);
  }

  positions() {
    return POSITIONS[Math.min(3, this.venue.members)];
  }

  draw(ctx: CanvasRenderingContext2D, f: StageFrame) {
    const H = this.panelH;
    const floor = this.art.floorY(H);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 480, H);
    ctx.clip();

    this.art.draw(ctx, 480, H, f.barPhase, f.time);

    const pos = this.positions();
    const has = (v: string) => f.cues.find((c) => c.visual === v);
    const wandering = has("wanders");
    this.drift += ((wandering ? 74 : 0) - this.drift) * 0.045;

    this.drawStacks(ctx, floor, f);

    // --- Band -----------------------------------------------------------
    const playing = f.bandPlaying;
    const beat = playing ? Math.abs(Math.sin(f.beatPhase * Math.PI)) : 0;

    // Dennis's amp, which is where his feedback comes from.
    this.drawAmp(ctx, pos.guitar - 58 + this.drift * 0.15, floor, !!has("feedback"), !!has("bad_circuit"));

    if (f.members >= 2) {
      ctx.save();
      ctx.translate(pos.drums, floor);
      drawKitBack(ctx);
      const rhonda = basePose();
      const asleep = has("asleep");
      if (asleep) {
        rhonda.headDrop = Math.min(1, asleep.age * 1.6);
        rhonda.eyes = "closed";
        rhonda.mouth = "oh";
      } else {
        rhonda.armL = f.time * 9.5;
        rhonda.armR = f.time * 9.5 + 1.8;
        rhonda.bob = beat * 1.6;
        rhonda.eyes = playing ? "squint" : "open";
        rhonda.mouth = f.energy > 80 ? "grin" : "flat";
      }
      if (!playing) {
        rhonda.armL = 0.2;
        rhonda.armR = 0.2;
      }
      drawRhonda(ctx, rhonda, undefined, f.equipped.drums);
      drawKitFront(ctx);
      ctx.restore();
    }

    if (f.members >= 3) {
      ctx.save();
      ctx.translate(pos.bass, floor);
      const perry = basePose();
      const strap = has("strap");
      if (strap) {
        // Sitting on the floor, off his own pickup.
        const s = Math.min(1, strap.age * 1.2);
        ctx.translate(-s * 8, s * 40);
        perry.tilt = s * 0.3;
        perry.armL = s * 0.5;
        perry.eyes = "wide";
        perry.mouth = "grimace";
      } else {
        perry.bob = beat * 2;
        perry.lean = Math.sin(f.barPhase * Math.PI * 2) * 0.35;
        perry.armL = Math.sin(f.time * 7) * 0.1;
        perry.eyes = playing ? "open" : "wide";
      }
      if (has("band_stopped")) {
        perry.eyes = "wide";
        perry.mouth = "oh";
        perry.bob = 0;
        // Looking at the floor, where the bass is.
        perry.headTilt = 0.5;
      }
      drawPerry(ctx, perry, undefined, f.equipped.bass);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(pos.guitar + this.drift, floor);
    const dennis = basePose();
    const tuning = has("tuning");
    const fb = has("feedback");
    const wantsFx = has("wants_fx");
    if (tuning) {
      dennis.headTilt = 0.42;
      dennis.eyes = "squint";
      dennis.mouth = "flat";
      dennis.armR = -0.9;
    } else if (fb) {
      dennis.eyes = "cross";
      dennis.mouth = "grimace";
      dennis.headTilt = -0.2;
      dennis.bob = Math.sin(f.time * 30) * 1.2;
    } else if (wantsFx) {
      dennis.armR = -1.5;
      dennis.eyes = "wide";
      dennis.mouth = "oh";
      dennis.bob = beat * 2.2;
    } else {
      dennis.bob = playing ? beat * 2.6 : 0;
      dennis.lean = Math.sin(f.barPhase * Math.PI * 2) * 0.5;
      dennis.headTilt = Math.sin(f.barPhase * Math.PI * 2) * 0.12 - 0.1;
      dennis.armR = Math.sin(f.time * 13) * 0.22;
      dennis.eyes = playing ? "closed" : "open";
      dennis.mouth = f.energy > 80 ? "open" : "flat";
    }
    if (has("band_stopped")) {
      dennis.eyes = "wide";
      dennis.mouth = "flat";
      dennis.bob = 0;
      dennis.lean = 0;
    }
    drawDennis(ctx, dennis, undefined, f.equipped.guitar);
    ctx.restore();

    // --- Cues, drawn at their cause -------------------------------------
    for (const cue of f.cues) {
      this.drawCue(ctx, cue, floor, f);
    }

    // Sat right on the bottom edge of the panel, so they occlude the band's
    // feet and read as being in front of the stage rather than on it.
    drawCrowd(ctx, this.crowd, H - 2, f.barPhase, f.energy, f.time);

    // Crowd-facing cues sit in front of the crowd so they are never occluded.
    for (const cue of f.cues) {
      this.drawCrowdCue(ctx, cue, H, f);
    }

    ctx.restore();
  }

  private drawStacks(ctx: CanvasRenderingContext2D, floor: number, f: StageFrame) {
    const blown = f.cues.find((c) => c.visual === "speaker_blows");
    for (const [x, isLeft] of [
      [6, true],
      [444, false],
    ] as const) {
      const dead = blown && isLeft;
      rect(ctx, x, floor - 62, 30, 62, dead ? "#2a2430" : "#3a3442");
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, floor - 61.5, 29, 61);
      ellipse(ctx, x + 15, floor - 46, 10, 10, dead ? "#221c28" : "#5a5466", OUT);
      ellipse(ctx, x + 15, floor - 46, 4, 4, "#171018");
      ellipse(ctx, x + 15, floor - 18, 7, 7, dead ? "#221c28" : "#5a5466", OUT);
      if (dead) {
        // Smoke, rising and thinning. Impossible to miss and located exactly
        // where the problem is.
        const t = f.time;
        for (let i = 0; i < 5; i++) {
          const p = ((t * 0.5 + i * 0.2) % 1);
          ctx.globalAlpha = (1 - p) * 0.55;
          ellipse(ctx, x + 15 + Math.sin(p * 6 + i) * 7, floor - 62 - p * 44, 5 + p * 9, 4 + p * 7, "#8a8494");
        }
        ctx.globalAlpha = 1;
        if (Math.sin(t * 22) > 0.6) {
          this.spark(ctx, x + 15, floor - 46, 9, "#f2e8b0");
        }
      }
    }
  }

  private drawAmp(ctx: CanvasRenderingContext2D, x: number, floor: number, howling: boolean, humming: boolean) {
    rect(ctx, x, floor - 34, 46, 34, "#2f2a38");
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, floor - 33.5, 45, 33);
    rect(ctx, x + 4, floor - 28, 38, 20, "#4a4458");
    for (let i = 0; i < 6; i++) line(ctx, [x + 4, floor - 26 + i * 3], [x + 42, floor - 26 + i * 3], "#3a3444", 1);
    rect(ctx, x + 6, floor - 6, 34, 4, "#d8d2bc");
    if (humming) {
      // A bolt at the socket, which is genuinely where the problem is.
      const bx = x - 12;
      poly(
        ctx,
        [
          [bx, floor - 20],
          [bx + 6, floor - 20],
          [bx + 3, floor - 13],
          [bx + 8, floor - 13],
          [bx + 1, floor - 3],
          [bx + 3, floor - 11],
          [bx - 2, floor - 11],
        ],
        "#e8c821",
        OUT,
      );
    }
    if (howling) {
      const t = performance.now() / 1000;
      for (let i = 0; i < 4; i++) {
        const p = ((t * 1.9 + i / 4) % 1);
        ctx.globalAlpha = (1 - p) * 0.95;
        ctx.strokeStyle = i % 2 ? "#f2e8b0" : "#e8621f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + 23, floor - 18, 8 + p * 46, -1.1, 1.1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  private spark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? size : size * 0.4;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    poly(ctx, pts, color, OUT);
  }

  /**
   * The escalation treatment. Everything that has run out of grace shakes and
   * gains a hard outline, so the moment grace ends is felt, not read.
   */
  private urgencyWrap(ctx: CanvasRenderingContext2D, cue: CueState, body: () => void) {
    const u = cue.urgency;
    ctx.save();
    if (u > 0) {
      const t = performance.now() / 1000;
      ctx.translate(Math.sin(t * 34) * u * 1.6, Math.cos(t * 29) * u * 1.1);
    }
    body();
    ctx.restore();
  }

  private alarmRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, u: number) {
    if (u <= 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 90);
    ctx.globalAlpha = 0.35 + u * 0.5 * pulse;
    ctx.strokeStyle = "#ff3b2f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** The payoff beat has to announce itself too (doc 6.2.4). */
  private restoreGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, u: number) {
    const bob = Math.sin(performance.now() / 180) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    const col = u > 0 ? "#ff3b2f" : "#3fd06a";
    poly(
      ctx,
      [
        [-13, -8],
        [13, -10],
        [13, 6],
        [-13, 8],
      ],
      "#f0ece0",
      OUT,
    );
    fonts().small.draw(ctx, "PUT IT", 0, -8, col, "center");
    fonts().small.draw(ctx, "BACK", 0, -1, col, "center");
    ctx.restore();
  }

  private drawCue(ctx: CanvasRenderingContext2D, cue: CueState, floor: number, f: StageFrame) {
    const pos = this.positions();
    const gx = pos.guitar + this.drift;
    const t = f.time;

    // Anything in its payoff beat shows the restore marker instead of the cause.
    if (cue.phase === "payoff") {
      const anchor =
        cue.channel === "drums"
          ? [pos.drums, floor - 78]
          : cue.channel === "bass"
            ? [pos.bass, floor - 104]
            : cue.visual === "neighbour_sign" || cue.visual === "crowd_louder"
              ? [400, 30]
              : [gx, floor - 84];
      this.urgencyWrap(ctx, cue, () => this.restoreGlyph(ctx, anchor[0], anchor[1], cue.urgency));
      return;
    }

    switch (cue.visual) {
      case "cable_spark": {
        this.urgencyWrap(ctx, cue, () => {
          const fx = gx + 16;
          const fy = floor - 6;
          if (Math.sin(t * 26) > 0.1) this.spark(ctx, fx, fy, 7 + cue.urgency * 3, "#f2e8b0");
          // The cable itself, kinked where he is standing on it.
          ctx.strokeStyle = "#1c1a24";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(gx - 36, floor - 4);
          ctx.lineTo(fx - 4, fy + 2);
          ctx.lineTo(fx + 10, fy - 3);
          ctx.stroke();
          this.alarmRing(ctx, fx, fy, 12, cue.urgency);
        });
        break;
      }
      case "tuning": {
        this.urgencyWrap(ctx, cue, () => {
          const bx = gx + 34;
          const by = floor - 96;
          // Wrong notes coming out of a channel that is still wide open.
          poly(
            ctx,
            [
              [bx - 26, by - 12],
              [bx + 26, by - 14],
              [bx + 28, by + 12],
              [bx - 18, by + 12],
              [bx - 24, by + 20],
              [bx - 24, by + 12],
            ],
            "#f0ece0",
            OUT,
          );
          for (let i = 0; i < 3; i++) {
            const wob = Math.sin(t * 6 + i * 2) * 2;
            fonts().big.draw(
              ctx,
              ["♪", "?", "♪"][i],
              bx - 15 + i * 16,
              by - 8 + wob,
              ["#c8341f", "#2b2530", "#3a6ea8"][i],
              "center",
            );
          }
          this.alarmRing(ctx, bx, by, 30, cue.urgency);
        });
        break;
      }
      case "dog_pedal": {
        this.urgencyWrap(ctx, cue, () => {
          const dx = gx + 40;
          const dy = floor;
          // A dog. Sitting. Extremely pleased.
          poly(
            ctx,
            [
              [dx - 14, dy],
              [dx + 6, dy],
              [dx + 4, dy - 16],
              [dx - 12, dy - 12],
            ],
            "#8a6a3c",
            OUT,
          );
          ellipse(ctx, dx + 8, dy - 20, 8, 7, "#8a6a3c", OUT);
          poly(
            ctx,
            [
              [dx + 3, dy - 26],
              [dx + 7, dy - 20],
              [dx + 1, dy - 19],
            ],
            "#6d5230",
            OUT,
          );
          ellipse(ctx, dx + 14, dy - 21, 2, 2, "#171018");
          ellipse(ctx, dx + 16, dy - 18, 2, 1.6, "#2b2530");
          const wag = Math.sin(t * 8) * 5;
          line(ctx, [dx - 13, dy - 10], [dx - 19, dy - 18 + wag], "#8a6a3c", 3);
          // The pedal, visibly depressed.
          rect(ctx, dx - 20, dy - 6, 16, 6, "#c8341f");
          ctx.strokeStyle = OUT;
          ctx.strokeRect(dx - 19.5, dy - 5.5, 15, 5);
          this.alarmRing(ctx, dx - 12, dy - 4, 14, cue.urgency);
        });
        break;
      }
      case "wants_fx": {
        this.urgencyWrap(ctx, cue, () => {
          const y = floor - 96;
          // A shimmer, drawn as concentric arcs off his pointing hand.
          for (let i = 0; i < 3; i++) {
            const p = ((t * 1.1 + i / 3) % 1);
            ctx.globalAlpha = (1 - p) * 0.9;
            ctx.strokeStyle = "#c08de8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(gx + 22, y, 5 + p * 18, -2.6, -0.4);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          fonts().small.draw(ctx, "FX?", gx + 40, y - 8, "#e0c8f4", "center");
          this.alarmRing(ctx, gx + 22, y, 20, cue.urgency);
        });
        break;
      }
      case "feedback": {
        this.urgencyWrap(ctx, cue, () => {
          this.alarmRing(ctx, gx - 35, floor - 18, 26, cue.urgency);
        });
        break;
      }
      case "bad_circuit": {
        this.urgencyWrap(ctx, cue, () => {
          const bx = gx - 70;
          for (let i = 0; i < 2; i++) {
            const p = ((t * 1.4 + i / 2) % 1);
            ctx.globalAlpha = (1 - p) * 0.8;
            ctx.strokeStyle = "#e8c821";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(bx, floor - 12, 6 + p * 16, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          this.alarmRing(ctx, bx, floor - 12, 18, cue.urgency);
        });
        break;
      }
      case "wanders": {
        this.urgencyWrap(ctx, cue, () => {
          // The rest of the band point at him. In venue 1 there is no band, so
          // his own footprints do the job instead.
          if (f.members >= 2) {
            const px = pos.drums;
            line(ctx, [px - 26, floor - 46], [gx - 10, floor - 52], "#f0ece0", 2);
            poly(
              ctx,
              [
                [gx - 10, floor - 52],
                [gx - 20, floor - 56],
                [gx - 19, floor - 47],
              ],
              "#f0ece0",
              OUT,
            );
          } else {
            for (let i = 0; i < 4; i++) {
              const fx = gx - 60 + i * 16;
              ctx.globalAlpha = 0.25 + i * 0.14;
              ellipse(ctx, fx, floor - 2, 4, 2, "#f0ece0");
            }
            ctx.globalAlpha = 1;
          }
          this.alarmRing(ctx, gx, floor - 40, 30, cue.urgency);
        });
        break;
      }
      case "asleep": {
        this.urgencyWrap(ctx, cue, () => {
          const zx = pos.drums + 16;
          const zy = floor - 66;
          for (let i = 0; i < 3; i++) {
            const p = ((t * 0.55 + i / 3) % 1);
            ctx.globalAlpha = 1 - p;
            fonts().big.draw(ctx, "Z", zx + p * 16, zy - p * 26, "#f0ece0");
          }
          ctx.globalAlpha = 1;
          this.alarmRing(ctx, pos.drums, floor - 48, 30, cue.urgency);
        });
        break;
      }
      case "debris": {
        this.urgencyWrap(ctx, cue, () => {
          const dx = pos.drums;
          // A plank. On the kit. Nobody is going to move it.
          ctx.save();
          ctx.translate(dx + 6, floor - 30);
          ctx.rotate(-0.24);
          rect(ctx, -26, -4, 52, 8, "#6b5540");
          ctx.strokeStyle = OUT;
          ctx.lineWidth = 1;
          ctx.strokeRect(-25.5, -3.5, 51, 7);
          ctx.restore();
          for (let i = 0; i < 2; i++) {
            const p = ((t * 0.9 + i / 2) % 1);
            ctx.globalAlpha = (1 - p) * 0.6;
            ctx.strokeStyle = "#c08de8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(dx, floor - 16, 14 + p * 20, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          this.alarmRing(ctx, dx, floor - 26, 34, cue.urgency);
        });
        break;
      }
      case "strap": {
        this.urgencyWrap(ctx, cue, () => {
          const bx = pos.bass;
          // The strap, on the floor, in two pieces.
          line(ctx, [bx - 22, floor - 3], [bx - 6, floor - 6], "#5c3a1e", 3);
          line(ctx, [bx + 2, floor - 5], [bx + 18, floor - 2], "#5c3a1e", 3);
          this.alarmRing(ctx, bx, floor - 34, 30, cue.urgency);
        });
        break;
      }
      case "band_stopped": {
        this.urgencyWrap(ctx, cue, () => {
          const bx = pos.bass;
          // The bass, on the patio, where it should not be.
          ctx.save();
          ctx.translate(bx + 26, floor - 4);
          ctx.rotate(1.5);
          poly(
            ctx,
            [
              [-12, -6],
              [3, -8],
              [8, -2],
              [6, 6],
              [-6, 8],
              [-14, 2],
            ],
            "#2b4f9c",
            OUT,
          );
          poly(
            ctx,
            [
              [6, -4],
              [44, -9],
              [45, -5],
              [6, 1],
            ],
            "#2a1e14",
            OUT,
          );
          ctx.restore();
          // Dead air, drawn as the absence of anything.
          const bob = Math.sin(t * 3) * 2;
          fonts().big.draw(ctx, ". . .", 240, 14 + bob, "#f0ece0", "center");
          this.alarmRing(ctx, 240, 22 + bob, 30, cue.urgency);
        });
        break;
      }
      case "speaker_blows": {
        // Drawn with the stacks; only the alarm ring is needed here.
        this.urgencyWrap(ctx, cue, () => {
          this.alarmRing(ctx, 21, floor - 40, 34, cue.urgency);
        });
        break;
      }
      default:
        break;
    }
  }

  /** Cues that live in the audience, drawn after the crowd so nothing hides them. */
  private drawCrowdCue(ctx: CanvasRenderingContext2D, cue: CueState, H: number, f: StageFrame) {
    if (cue.phase === "payoff") return;
    const wob = Math.sin(f.time * 4) * 0.06 + cue.urgency * Math.sin(f.time * 24) * 0.06;
    const y = H - 46;
    switch (cue.visual) {
      case "neighbour_sign": {
        // Somebody who lives here, and has had enough.
        const nx = 446;
        const ny = H - 8;
        ctx.save();
        ctx.translate(nx, ny);
        poly(
          ctx,
          [
            [-14, 30],
            [-12, -6],
            [12, -6],
            [14, 30],
          ],
          "#6d7a5a",
          OUT,
        );
        ellipse(ctx, 0, -14, 11, 12, "#e8a877", OUT);
        line(ctx, [-8, -16], [-2, -16], OUT, 1.4);
        line(ctx, [2, -16], [8, -16], OUT, 1.4);
        line(ctx, [-6, -8], [6, -9], OUT, 1.4);
        ellipse(ctx, 0, -24, 12, 5, "#3a2f42", OUT);
        ctx.restore();
        drawCrowdSign(ctx, nx - 28, y - 12, "TURN IT DOWN", "#f0ece0", "#c8341f", wob);
        this.alarmRing(ctx, nx - 28, y - 4, 26, cue.urgency);
        break;
      }
      case "crowd_louder":
        drawCrowdSign(ctx, 300, y, "LOUDER!!", "#e8c821", "#2b2530", wob);
        this.alarmRing(ctx, 300, y + 8, 26, cue.urgency);
        break;
      case "pan_left":
        drawCrowdSign(ctx, 70, y, "← OVER HERE", "#3fa0d8", "#f0ece0", wob);
        this.alarmRing(ctx, 70, y + 8, 30, cue.urgency);
        break;
      case "pan_right":
        drawCrowdSign(ctx, 404, y, "OVER HERE →", "#3fa0d8", "#f0ece0", wob);
        this.alarmRing(ctx, 404, y + 8, 30, cue.urgency);
        break;
      case "solo_sign":
        drawCrowdSign(ctx, 240, y - 6, "SOLO THE GUITAR", "#e8621f", "#f0ece0", wob);
        this.alarmRing(ctx, 240, y + 2, 34, cue.urgency);
        break;
      default:
        break;
    }
  }
}
