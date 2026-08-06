// Gaz Trundle's office. Above a carpet showroom. One screen, not a walkable
// scene (doc 13.4), which is why every object in it has to earn its space.

import { ellipse, hatch, line, poly, rect } from "../art/draw.ts";
import { fonts } from "../core/font.ts";

const OUT = "#171018";

export const HOTSPOTS = {
  computer: { x: 300, y: 96, w: 84, h: 64 },
  map: { x: 20, y: 14, w: 108, h: 74 },
  machine: { x: 176, y: 128, w: 60, h: 32 },
  gaz: { x: 208, y: 40, w: 92, h: 96 },
};

export function drawOffice(ctx: CanvasRenderingContext2D, time: number, opts: { noteOnMachine: boolean }) {
  // Wall.
  rect(ctx, 0, 0, 480, 176, "#6b5f52");
  for (let x = 0; x < 480; x += 34) rect(ctx, x, 0, 2, 176, "#5f5448");
  rect(ctx, 0, 168, 480, 8, "#4a4038");

  // Window with a view of the retail park and, if you lean, a bin.
  rect(ctx, 388, 18, 78, 62, "#3a4a5a");
  rect(ctx, 392, 22, 70, 54, "#7a9ab0");
  rect(ctx, 396, 52, 62, 24, "#5a6f58");
  rect(ctx, 404, 40, 20, 14, "#c8341f");
  fonts().small.draw(ctx, "CARPETS", 414, 43, "#f0ece0", "center");
  for (let i = 0; i < 5; i++) line(ctx, [392, 24 + i * 5], [462, 24 + i * 5], "#00000033", 1);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.strokeRect(388.5, 18.5, 77, 61);

  // The map on the wall — the route out of here.
  const m = HOTSPOTS.map;
  rect(ctx, m.x, m.y, m.w, m.h, "#e8e2cc");
  ctx.strokeStyle = OUT;
  ctx.strokeRect(m.x + 0.5, m.y + 0.5, m.w - 1, m.h - 1);
  hatch(ctx, m.x + 2, m.y + 2, m.w - 4, m.h - 4, "#c9b89a55", 6, 3);
  for (const [px, py] of [
    [24, 22],
    [58, 40],
    [86, 26],
    [40, 58],
    [78, 60],
  ] as const) {
    ellipse(ctx, m.x + px, m.y + py, 2.5, 2.5, "#c8341f", OUT);
  }
  line(ctx, [m.x + 24, m.y + 22], [m.x + 58, m.y + 40], "#c8341f", 1);
  line(ctx, [m.x + 58, m.y + 40], [m.x + 86, m.y + 26], "#c8341f", 1);
  fonts().small.draw(ctx, "THE MAP", m.x + m.w / 2, m.y + m.h - 10, "#6b6478", "center");

  // A gold record that is a painted 12-inch of somebody else's album.
  ellipse(ctx, 158, 44, 22, 22, "#c9a83a", OUT);
  ellipse(ctx, 158, 44, 6, 6, "#e8e2cc", OUT);
  fonts().small.draw(ctx, "NOT REAL", 158, 70, "#8a8272", "center");

  // Desk.
  rect(ctx, 0, 160, 480, 16, "#6b5540");
  rect(ctx, 0, 160, 480, 3, "#8a6d50");
  rect(ctx, 0, 176, 480, 94, "#4a3b2c");
  hatch(ctx, 0, 176, 480, 94, "#00000022", 9, 5);
  // Paperwork nobody has read.
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.translate(46 + i * 9, 186 + (i % 2) * 5);
    ctx.rotate(-0.08 + i * 0.04);
    rect(ctx, 0, 0, 52, 34, "#e8e2cc");
    ctx.strokeStyle = "#a89b7c";
    ctx.strokeRect(0.5, 0.5, 51, 33);
    for (let l = 0; l < 5; l++) line(ctx, [4, 6 + l * 5], [46, 6 + l * 5], "#b0a488", 1);
    ctx.restore();
  }

  // A plant, dead, watered exactly once.
  rect(ctx, 118, 132, 22, 28, "#8a5a3c");
  ctx.strokeStyle = OUT;
  ctx.strokeRect(118.5, 132.5, 21, 27);
  for (let i = -2; i <= 2; i++) {
    line(ctx, [129, 132], [129 + i * 9, 112 + Math.abs(i) * 8], "#6b7a4a", 1.6);
  }

  drawAnsweringMachine(ctx, HOTSPOTS.machine.x, HOTSPOTS.machine.y, time, opts.noteOnMachine);
  drawComputer(ctx, HOTSPOTS.computer.x, HOTSPOTS.computer.y, 0);
}

/** The store, from behind (doc 13.3): it faces him, because of course it does. */
export function drawComputer(ctx: CanvasRenderingContext2D, x: number, y: number, swivel: number) {
  // Beige tower.
  rect(ctx, x - 8, y + 40, 26, 24, "#c9bfa0");
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 7.5, y + 40.5, 25, 23);
  rect(ctx, x - 4, y + 44, 16, 3, "#8a8272");
  ellipse(ctx, x + 12, y + 58, 2, 2, "#3fd06a");

  // Monitor, swivelling to face the player when clicked. Swivel 0..1.
  const w = 62 - Math.sin(swivel * Math.PI) * 22;
  ctx.save();
  ctx.translate(x + 42, y + 30);
  rect(ctx, -w / 2, -26, w, 50, "#d0c6a8");
  ctx.strokeStyle = OUT;
  ctx.strokeRect(-w / 2 + 0.5, -25.5, w - 1, 49);
  const inner = Math.max(2, w - 14);
  rect(ctx, -inner / 2, -21, inner, 36, swivel > 0.5 ? "#20304a" : "#2a2a30");
  if (swivel < 0.5) {
    // Seen from behind: vents and a sticker.
    for (let i = 0; i < 6; i++) line(ctx, [-inner / 2 + 2, -18 + i * 6], [inner / 2 - 2, -18 + i * 6], "#1e1e26", 1);
  }
  rect(ctx, -14, 24, 28, 6, "#c9bfa0");
  ctx.strokeStyle = OUT;
  ctx.strokeRect(-13.5, 24.5, 27, 5);
  ctx.restore();
}

export function drawAnsweringMachine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  note: boolean,
) {
  rect(ctx, x, y, 60, 30, "#d8d2bc");
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, 59, 29);
  rect(ctx, x + 4, y + 4, 30, 12, "#3a3a44");
  const blink = Math.sin(time * 4) > 0;
  fonts().small.draw(ctx, blink ? "0 NEW" : "", x + 19, y + 6, "#e8621f", "center");
  ellipse(ctx, x + 46, y + 9, 4, 4, blink ? "#ff4030" : "#5a2a24", OUT);
  for (let i = 0; i < 3; i++) rect(ctx, x + 6 + i * 12, y + 20, 9, 5, "#8a8272");
  if (note) {
    ctx.save();
    ctx.translate(x + 46, y - 8);
    ctx.rotate(-0.1);
    rect(ctx, -16, -10, 32, 22, "#e8d96a");
    ctx.strokeStyle = "#a89b3c";
    ctx.strokeRect(-15.5, -9.5, 31, 21);
    for (let i = 0; i < 3; i++) line(ctx, [-12, -5 + i * 5], [12, -5 + i * 5], "#a89b3c", 1);
    ctx.restore();
  }
}

/**
 * Gaz Trundle. Manager. Takes a cut of a number he calculates himself.
 * Same construction as the band (doc 17.2) — parts around joints.
 */
export function drawGaz(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, talking: boolean) {
  ctx.save();
  ctx.translate(x, y);
  const breathe = Math.sin(time * 1.4) * 1.2;

  // Chair back.
  rect(ctx, -34, -6, 68, 60, "#3a2f2a");
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  ctx.strokeRect(-33.5, -5.5, 67, 59);

  // Torso: shoulders like a table.
  poly(
    ctx,
    [
      [-38, 6 + breathe],
      [38, 4 + breathe],
      [32, 62],
      [-32, 62],
    ],
    "#5a4a6a",
    OUT,
  );
  poly(
    ctx,
    [
      [-14, 6 + breathe],
      [14, 5 + breathe],
      [10, 62],
      [-10, 62],
    ],
    "#e8e2cc",
    OUT,
  );
  // Lapels wide enough to land a light aircraft on.
  poly(
    ctx,
    [
      [-14, 6 + breathe],
      [-30, 10 + breathe],
      [-8, 40],
    ],
    "#48395a",
    OUT,
  );
  poly(
    ctx,
    [
      [14, 5 + breathe],
      [30, 9 + breathe],
      [8, 40],
    ],
    "#48395a",
    OUT,
  );
  // Tie, and a chain over it, which is a choice he made.
  poly(
    ctx,
    [
      [-4, 10 + breathe],
      [4, 10 + breathe],
      [2, 40],
      [-2, 40],
    ],
    "#c8341f",
    OUT,
  );
  ctx.strokeStyle = "#c9a83a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 12 + breathe, 12, 0.35, Math.PI - 0.35);
  ctx.stroke();

  // Neck. Short, and doing a lot of work.
  poly(
    ctx,
    [
      [-7, 8 + breathe],
      [7, 8 + breathe],
      [6, -6 + breathe],
      [-6, -6 + breathe],
    ],
    "#bd8555",
    OUT,
  );

  // Head: enormous, jaw first.
  const hy = -26 + breathe;
  poly(
    ctx,
    [
      [-24, hy + 12],
      [-26, hy - 8],
      [-16, hy - 22],
      [14, hy - 24],
      [26, hy - 6],
      [22, hy + 16],
      [-4, hy + 24],
    ],
    "#e0a878",
    OUT,
  );
  poly(
    ctx,
    [
      [14, hy - 24],
      [26, hy - 6],
      [22, hy + 16],
      [14, hy + 18],
    ],
    "#bd8555",
  );
  // Nose.
  poly(
    ctx,
    [
      [2, hy - 6],
      [18, hy + 2],
      [2, hy + 5],
    ],
    "#e0a878",
    OUT,
  );
  // Small eyes, close together, doing sums.
  ellipse(ctx, -6, hy - 8, 3, 3.4, "#f6f0e2", OUT);
  ellipse(ctx, 5, hy - 9, 3, 3.4, "#f6f0e2", OUT);
  ellipse(ctx, -5, hy - 7, 1.3, 1.3, OUT);
  ellipse(ctx, 6, hy - 8, 1.3, 1.3, OUT);
  line(ctx, [-11, hy - 14], [-2, hy - 15], OUT, 1.6);
  line(ctx, [1, hy - 16], [10, hy - 14], OUT, 1.6);
  // Moustache. Thin. Deliberate.
  rect(ctx, -6, hy + 8, 16, 2.4, "#3a2f2a");
  // Mouth.
  if (talking && Math.sin(time * 16) > 0) {
    poly(
      ctx,
      [
        [-5, hy + 13],
        [9, hy + 12],
        [7, hy + 19],
        [-4, hy + 18],
      ],
      "#5c1f28",
      OUT,
    );
  } else {
    line(ctx, [-5, hy + 14], [8, hy + 13], OUT, 1.4);
  }
  // Hair: a decision made in 1986 and defended ever since.
  poly(
    ctx,
    [
      [-27, hy - 6],
      [-20, hy - 24],
      [2, hy - 30],
      [22, hy - 22],
      [28, hy - 4],
      [20, hy - 14],
      [0, hy - 18],
      [-18, hy - 12],
    ],
    "#2f2620",
    OUT,
  );

  // Arms resting on the desk, fingers laced.
  poly(
    ctx,
    [
      [-38, 12 + breathe],
      [-30, 10 + breathe],
      [-12, 54],
      [-24, 58],
    ],
    "#5a4a6a",
    OUT,
  );
  poly(
    ctx,
    [
      [38, 10 + breathe],
      [30, 8 + breathe],
      [12, 52],
      [24, 56],
    ],
    "#5a4a6a",
    OUT,
  );
  ellipse(ctx, -2, 58, 14, 7, "#e0a878", OUT);

  ctx.restore();
}
