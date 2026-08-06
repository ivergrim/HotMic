// The crowd is a meter (doc 6.2.5 / 7.1). The bar on the board is the precise
// readout; this is what the player actually feels.
//
// Motion is bar-locked and identical every loop so it never competes with event
// signalling. What changes with energy is amplitude and posture, not rhythm.

import { ellipse, line, poly } from "./draw.ts";
import { mulberry32 } from "../core/rng.ts";
import { fonts } from "../core/font.ts";

const OUT = "#171018";

const SHIRTS = [
  "#c8341f",
  "#2b4f9c",
  "#3f7a3a",
  "#e8c821",
  "#7a3f8c",
  "#1f8f8c",
  "#e05fa8",
  "#e8621f",
];
const HAIRS = ["#2c2230", "#a83c10", "#d8d2c0", "#5c3a1e", "#e2611f", "#3a2f42"];

export interface CrowdMember {
  x: number;
  scale: number;
  shirt: string;
  hair: string;
  phase: number;
  /** Small per-person timing offset so the room is not one organism. */
  lag: number;
}

export function makeCrowd(count: number, width: number, seed: number): CrowdMember[] {
  const rng = mulberry32(seed);
  const out: CrowdMember[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    out.push({
      x: t * width + (rng() - 0.5) * (width / count) * 0.7,
      scale: 0.86 + rng() * 0.3,
      shirt: SHIRTS[Math.floor(rng() * SHIRTS.length)],
      hair: HAIRS[Math.floor(rng() * HAIRS.length)],
      phase: rng() * Math.PI * 2,
      lag: rng() * 0.25,
    });
  }
  return out.sort((a, b) => a.scale - b.scale);
}

export type CrowdMood = "rapture" | "into_it" | "watching" | "arms_folded" | "hostile";

export function moodFor(energy: number): CrowdMood {
  if (energy >= 82) return "rapture";
  if (energy >= 62) return "into_it";
  if (energy >= 42) return "watching";
  if (energy >= 20) return "arms_folded";
  return "hostile";
}

/**
 * Draws the audience along the bottom of the stage panel, backs to the player,
 * partly occluding the band's feet so the room reads as having depth.
 */
export function drawCrowd(
  ctx: CanvasRenderingContext2D,
  crowd: CrowdMember[],
  baseY: number,
  barPhase: number,
  energy: number,
  time: number,
) {
  const mood = moodFor(energy);
  const drive = Math.max(0, (energy - 25) / 75);

  for (const m of crowd) {
    const beat = ((barPhase * 4 + m.lag) % 1) as number;
    let bounce = 0;
    let armUp = 0;
    let lean = 0;

    switch (mood) {
      case "rapture":
        // Full jump on every beat.
        bounce = Math.abs(Math.sin((beat + m.lag) * Math.PI)) * 7 * drive;
        armUp = 1;
        break;
      case "into_it":
        bounce = Math.abs(Math.sin((beat + m.lag) * Math.PI)) * 4 * drive;
        armUp = ((m.phase * 7) % 1) > 0.55 ? 1 : 0;
        break;
      case "watching":
        bounce = Math.sin(barPhase * Math.PI * 2 + m.phase) * 1.4;
        lean = Math.sin(barPhase * Math.PI * 2 + m.phase) * 0.06;
        break;
      case "arms_folded":
        bounce = 0;
        lean = Math.sin(time * 0.6 + m.phase) * 0.03;
        break;
      case "hostile":
        bounce = Math.sin(time * 9 + m.phase) * 0.7;
        lean = 0;
        break;
    }

    ctx.save();
    ctx.translate(m.x, baseY - bounce);
    ctx.scale(m.scale, m.scale);
    ctx.rotate(lean);

    // Shoulders.
    poly(
      ctx,
      [
        [-13, 40],
        [-11, 4],
        [-4, -2],
        [5, -2],
        [12, 4],
        [14, 40],
      ],
      m.shirt,
      OUT,
    );
    // Head, from behind — all hair and ears.
    ellipse(ctx, 0, -10, 10, 11, m.hair, OUT);
    ellipse(ctx, -10, -8, 2.4, 3, "#c98455", OUT);
    ellipse(ctx, 10, -8, 2.4, 3, "#c98455", OUT);

    if (armUp && mood !== "hostile") {
      const a = Math.sin(barPhase * Math.PI * 4 + m.phase) * 0.25;
      line(ctx, [-10, 6], [-16, -14 + a * 6], m.shirt, 4);
      line(ctx, [-16, -14 + a * 6], [-15, -22 + a * 6], "#c98455", 3.4);
      line(ctx, [10, 6], [17, -13 - a * 6], m.shirt, 4);
      line(ctx, [17, -13 - a * 6], [16, -21 - a * 6], "#c98455", 3.4);
    } else if (mood === "arms_folded" || mood === "watching") {
      // Arms folded reads as "unimpressed" from a very long way away.
      line(ctx, [-11, 12], [11, 15], m.shirt, 5);
      line(ctx, [-11, 12], [11, 15], "#00000030", 2);
    } else if (mood === "hostile") {
      const shake = Math.sin(time * 11 + m.phase) * 3;
      line(ctx, [10, 6], [18, -10], m.shirt, 4);
      line(ctx, [18, -10], [20 + shake, -20], "#c98455", 3.4);
    }

    ctx.restore();
  }
}

/** A hand-lettered sign held up out of the crowd. Used by several events. */
export function drawCrowdSign(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  bg: string,
  ink: string,
  wobble: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wobble);
  const f = fonts().small;
  const w = Math.max(34, f.measure(text) + 10);
  const h = 16;
  line(ctx, [0, h], [2, h + 16], "#8a7f6a", 2);
  poly(
    ctx,
    [
      [-w / 2, -1],
      [w / 2, -3],
      [w / 2 + 1, h],
      [-w / 2 - 1, h - 1],
    ],
    bg,
    OUT,
  );
  f.draw(ctx, text, 0, 3, ink, "center");
  ctx.restore();
}
