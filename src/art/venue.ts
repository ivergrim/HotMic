// Three rooms. Same style, escalating only in scale (doc 3.2) — the garage is
// already ridiculous, the back garden is just more of it.
//
// Ambient motion here is strictly looping and phase-locked to the bar (doc
// 6.2.3), so the player's eye stops attending to it within a few seconds and a
// new movement anywhere reads instantly as an event.

import { ellipse, hatch, line, poly, rect } from "./draw.ts";
import { fonts } from "../core/font.ts";
import { mulberry32 } from "../core/rng.ts";

export interface VenueArt {
  id: string;
  /** Y of the floor the band stands on, within the stage panel. */
  floorY: (h: number) => number;
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, barPhase: number, time: number): void;
}

const OUT = "#171018";

function poster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: string,
  ink: string,
  text: string,
  lean: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  rect(ctx, 0, 0, w, h, bg);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  const f = fonts().small;
  f.draw(ctx, text, w / 2, 3, ink, "center");
  for (let i = 0; i < 3; i++) {
    line(ctx, [3, 13 + i * 4], [w - 3, 13 + i * 4], ink, 1);
  }
  // Peeling corner, because nothing in this game is stuck down properly.
  poly(
    ctx,
    [
      [w, h],
      [w - 7, h],
      [w, h - 7],
    ],
    "#00000055",
  );
  ctx.restore();
}

// --- Venue 1: the garage -----------------------------------------------------

export const GARAGE: VenueArt = {
  id: "garage",
  floorY: (h) => h - 30,
  draw(ctx, w, h, barPhase, time) {
    const floor = h - 30;
    rect(ctx, 0, 0, w, floor, "#5a5566");
    // Up-and-over door, ribbed.
    rect(ctx, 40, 12, 200, floor - 12, "#8a7f6a");
    for (let y = 18; y < floor; y += 14) {
      line(ctx, [40, y], [240, y], "#6d6350", 2);
    }
    ctx.strokeStyle = OUT;
    ctx.strokeRect(40.5, 12.5, 199, floor - 13);

    // Shelving with paint tins nobody will ever open again.
    rect(ctx, 300, 30, 150, 6, "#6b5540");
    rect(ctx, 300, 66, 150, 6, "#6b5540");
    const rng = mulberry32(11);
    for (let i = 0; i < 7; i++) {
      const x = 306 + i * 20;
      const tall = 12 + Math.floor(rng() * 10);
      rect(ctx, x, 30 - tall, 14, tall, ["#a83c10", "#3f7a3a", "#2b4f9c", "#c9a83a"][i % 4]);
      ctx.strokeStyle = OUT;
      ctx.strokeRect(x + 0.5, 30 - tall + 0.5, 13, tall - 1);
    }
    // Water heater.
    rect(ctx, 258, 20, 30, 74, "#9a9382");
    ellipse(ctx, 273, 20, 15, 5, "#b0a894", OUT);
    ctx.strokeStyle = OUT;
    ctx.strokeRect(258.5, 20.5, 29, 74);
    line(ctx, [273, 94], [273, floor], "#7a7264", 3);

    // Strip light, buzzing at 50 Hz whether or not anyone asked.
    const flicker = Math.sin(time * 37) > 0.93 ? 0.35 : 1;
    ctx.globalAlpha = flicker;
    rect(ctx, 150, 4, 180, 7, "#f4f0d8");
    ctx.globalAlpha = 1;
    ctx.strokeStyle = OUT;
    ctx.strokeRect(150.5, 4.5, 179, 6);

    poster(ctx, 356, 78, 56, 40, "#d8d2bc", "#3a2f42", "PYGMY WAR", -0.05);
    poster(ctx, 62, 52, 50, 36, "#c9a83a", "#3a2f42", "SKIP FIRE", 0.04);

    // Damp patch. Grows never, but looks like it might.
    ctx.globalAlpha = 0.25;
    ellipse(ctx, 100, 30, 34, 20, "#3a4a3a");
    ctx.globalAlpha = 1;

    rect(ctx, 0, floor, w, h - floor, "#7d7566");
    hatch(ctx, 0, floor, w, h - floor, "#00000022", 7, 5);
    line(ctx, [0, floor], [w, floor], OUT, 1);

    // The cat. Asleep on the spare amp. Tail keeps time better than the drummer.
    const tail = Math.sin(barPhase * Math.PI * 2) * 4;
    rect(ctx, 372, floor - 26, 40, 26, "#2f2a38");
    ctx.strokeStyle = OUT;
    ctx.strokeRect(372.5, floor - 26.5, 39, 26);
    rect(ctx, 378, floor - 20, 14, 9, "#4a4458");
    ellipse(ctx, 392, floor - 32, 15, 6, "#c98455", OUT);
    ellipse(ctx, 380, floor - 34, 6, 5, "#c98455", OUT);
    poly(
      ctx,
      [
        [375, -38 + floor],
        [378, -44 + floor],
        [381, -38 + floor],
      ],
      "#c98455",
      OUT,
    );
    line(ctx, [406, floor - 32], [410 + tail, floor - 40], "#c98455", 2);
  },
};

// --- Venue 2: the front room -------------------------------------------------

export const FRONT_ROOM: VenueArt = {
  id: "front_room",
  floorY: (h) => h - 32,
  draw(ctx, w, h, barPhase, time) {
    const floor = h - 32;
    rect(ctx, 0, 0, w, floor, "#7a5f4a");
    // Wallpaper nobody chose. It came with the house and it will outlive them.
    for (let x = 0; x < w; x += 22) {
      for (let y = 0; y < floor; y += 26) {
        const off = (y / 26) % 2 === 0 ? 0 : 11;
        poly(
          ctx,
          [
            [x + off, y + 8],
            [x + off + 5, y + 2],
            [x + off + 10, y + 8],
            [x + off + 5, y + 14],
          ],
          "#8e7058",
        );
      }
    }
    rect(ctx, 0, floor - 10, w, 10, "#5f4738");
    line(ctx, [0, floor - 10], [w, floor - 10], OUT, 1);

    // Sofa shoved against the wall to make a stage. Classic.
    rect(ctx, 366, floor - 40, 106, 40, "#7a3f8c");
    rect(ctx, 366, floor - 52, 106, 14, "#8e4ba0");
    ctx.strokeStyle = OUT;
    ctx.strokeRect(366.5, floor - 52.5, 105, 52);
    for (let i = 0; i < 3; i++) {
      rect(ctx, 372 + i * 34, floor - 40, 30, 8, "#63307a");
    }
    hatch(ctx, 366, floor - 40, 106, 40, "#00000022", 6, 9);

    // Standard lamp with a shade at an angle it will never recover from.
    line(ctx, [26, floor], [26, floor - 74], "#c9a83a", 2);
    poly(
      ctx,
      [
        [10, floor - 74],
        [44, floor - 78],
        [38, floor - 96],
        [16, floor - 94],
      ],
      "#e8c821",
      OUT,
    );
    ctx.globalAlpha = 0.16 + (Math.sin(time * 2.2) + 1) * 0.02;
    poly(
      ctx,
      [
        [10, floor - 74],
        [44, floor - 78],
        [70, floor],
        [-16, floor],
      ],
      "#ffe9a0",
    );
    ctx.globalAlpha = 1;

    // Framed photographs of a family currently upstairs regretting everything.
    for (let i = 0; i < 3; i++) {
      const fx = 74 + i * 34;
      const fy = 22 + (i % 2) * 10;
      rect(ctx, fx, fy, 24, 20, "#c9a83a");
      rect(ctx, fx + 3, fy + 3, 18, 14, "#b8c4d0");
      ellipse(ctx, fx + 12, fy + 9, 4, 5, "#e8a877", OUT);
      ctx.strokeStyle = OUT;
      ctx.strokeRect(fx + 0.5, fy + 0.5, 23, 19);
    }

    poster(ctx, 200, 16, 58, 42, "#3f7a3a", "#f2ece0", "BIN DAY", 0.03);

    // Bead curtain in the doorway, swinging on the bar.
    const sway = Math.sin(barPhase * Math.PI * 2) * 2;
    rect(ctx, 292, 0, 56, floor - 10, "#3a2f42");
    for (let i = 0; i < 8; i++) {
      const bx = 296 + i * 7;
      for (let by = 4; by < floor - 14; by += 7) {
        ellipse(
          ctx,
          bx + sway * ((by / (floor - 14)) * (i % 2 === 0 ? 1 : -1)),
          by,
          2,
          2,
          ["#e05fa8", "#e8c821", "#3fa0d8"][i % 3],
        );
      }
    }

    rect(ctx, 0, floor, w, h - floor, "#9c7b4f");
    for (let x = 0; x < w; x += 18) line(ctx, [x, floor], [x + 6, h], "#00000018", 1);
    line(ctx, [0, floor], [w, floor], OUT, 1);
  },
};

// --- Venue 3: the back garden ------------------------------------------------

export const BACK_GARDEN: VenueArt = {
  id: "back_garden",
  floorY: (h) => h - 30,
  draw(ctx, w, h, barPhase, time) {
    const floor = h - 30;
    // Night sky with the orange underglow of a town that has one of everything.
    const sky = ctx.createLinearGradient(0, 0, 0, floor);
    sky.addColorStop(0, "#231d3c");
    sky.addColorStop(1, "#5a3f52");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, floor);
    const rng = mulberry32(77);
    for (let i = 0; i < 40; i++) {
      const sx = rng() * w;
      const sy = rng() * (floor * 0.5);
      ctx.globalAlpha = 0.4 + rng() * 0.5;
      rect(ctx, Math.floor(sx), Math.floor(sy), 1, 1, "#f4f0d8");
    }
    ctx.globalAlpha = 1;

    // Neighbouring rooftops. One window is lit, and it is going to matter later.
    for (let i = 0; i < 6; i++) {
      const bx = i * 84 - 20;
      const bh = 40 + ((i * 37) % 26);
      rect(ctx, bx, floor - 74 - bh + 40, 74, bh, "#2b2338");
      poly(
        ctx,
        [
          [bx - 4, floor - 74 - bh + 40],
          [bx + 37, floor - 92 - bh + 40],
          [bx + 78, floor - 74 - bh + 40],
        ],
        "#221b2e",
        OUT,
      );
      if (i === 4) {
        rect(ctx, bx + 28, floor - 66 - bh + 40, 16, 14, "#f2d26a");
        ctx.strokeStyle = OUT;
        ctx.strokeRect(bx + 28.5, floor - 66 - bh + 40.5, 15, 13);
      }
    }

    // Fence.
    for (let x = -4; x < w; x += 13) {
      rect(ctx, x, floor - 46, 11, 46, x % 26 === 0 ? "#6b5540" : "#5c4835");
      poly(
        ctx,
        [
          [x, floor - 46],
          [x + 5.5, floor - 52],
          [x + 11, floor - 46],
        ],
        "#6b5540",
        OUT,
      );
    }
    line(ctx, [0, floor - 30], [w, floor - 30], "#4a3a2a", 2);

    // Shed.
    rect(ctx, 372, floor - 78, 96, 78, "#5c4835");
    poly(
      ctx,
      [
        [366, floor - 78],
        [420, floor - 98],
        [474, floor - 78],
      ],
      "#4a3a2a",
      OUT,
    );
    rect(ctx, 400, floor - 54, 26, 54, "#3f3226");
    ctx.strokeStyle = OUT;
    ctx.strokeRect(372.5, floor - 78.5, 95, 78);

    // String lights, swinging on the bar. The only production value present.
    const sway = Math.sin(barPhase * Math.PI * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.quadraticCurveTo(w / 2, 52 + sway, w, 22);
    ctx.strokeStyle = "#2a2230";
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let i = 1; i < 16; i++) {
      const t = i / 16;
      const lx = t * w;
      const ly = (1 - t) * (1 - t) * 26 + 2 * (1 - t) * t * (52 + sway) + t * t * 22;
      const on = Math.sin(time * 3 + i) > -0.6;
      ellipse(
        ctx,
        lx,
        ly + 4,
        2.4,
        2.8,
        on ? ["#e8c821", "#e05fa8", "#3fa0d8", "#3f7a3a"][i % 4] : "#4a4458",
        OUT,
      );
    }

    // Washing line. Somebody's shirt is still on it.
    line(ctx, [-4, floor - 74], [104, floor - 66], "#8a8272", 1);
    const flap = Math.sin(barPhase * Math.PI * 2 + 1) * 2;
    poly(
      ctx,
      [
        [40, floor - 71],
        [66, floor - 69],
        [68 + flap, floor - 50],
        [38 + flap, floor - 52],
      ],
      "#d8d2bc",
      OUT,
    );

    rect(ctx, 0, floor, w, h - floor, "#3a4a34");
    hatch(ctx, 0, floor, w, h - floor, "#00000022", 5, 3);
    line(ctx, [0, floor], [w, floor], OUT, 1);
    // Patio slabs.
    for (let x = 0; x < w; x += 40) {
      line(ctx, [x, floor], [x - 8, h], "#00000030", 1);
    }
  },
};

export const VENUE_ART: Record<string, VenueArt> = {
  garage: GARAGE,
  front_room: FRONT_ROOM,
  back_garden: BACK_GARDEN,
};
