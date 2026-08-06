// THE FIRE EXITS.
//
// Drawn to doc 17.1: heads far too large, limbs either noodle-thin or
// impossibly thick, nobody standing straight, nobody appealing. Every character
// is assembled from named parts transformed around their joints (17.2), so a
// scanned hand drawing can replace any single part later without touching the
// animation.

import { ellipse, hatch, limb, line, poly, shadeUnder, type Pt } from "./draw.ts";

export type Eyes = "open" | "closed" | "wide" | "squint" | "cross";
export type Mouth = "flat" | "open" | "grin" | "oh" | "grimace";

export interface Pose {
  /** Vertical bounce in local units. */
  bob: number;
  /** Body sway, -1..1. */
  lean: number;
  headTilt: number;
  /** 0 = upright, 1 = face down on the snare. */
  headDrop: number;
  armL: number;
  armR: number;
  eyes: Eyes;
  mouth: Mouth;
  /** Horizontal drift in local units — used when someone wanders. */
  driftX: number;
  /** Extra rotation of the whole body. */
  tilt: number;
}

export function basePose(): Pose {
  return {
    bob: 0,
    lean: 0,
    headTilt: 0,
    headDrop: 0,
    armL: 0,
    armR: 0,
    eyes: "open",
    mouth: "flat",
    driftX: 0,
    tilt: 0,
  };
}

const OUT = "#171018";

export interface Palette {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  shirt: string;
  shirtShade: string;
  legs: string;
  shoes: string;
  accent: string;
}

export const DENNIS: Palette = {
  skin: "#e8a877",
  skinShade: "#c07f52",
  hair: "#e2611f",
  hairShade: "#a83c10",
  shirt: "#5b3f9e",
  shirtShade: "#3d2a72",
  legs: "#3f7a3a",
  shoes: "#221a20",
  accent: "#f2c530",
};

export const RHONDA: Palette = {
  skin: "#c98455",
  skinShade: "#9c603a",
  hair: "#2c2230",
  hairShade: "#1a1420",
  shirt: "#1f8f8c",
  shirtShade: "#146360",
  legs: "#b8352f",
  shoes: "#2a2028",
  accent: "#e05fa8",
};

export const PERRY: Palette = {
  skin: "#f0c39a",
  skinShade: "#c1946e",
  hair: "#d8d2c0",
  hairShade: "#a29a86",
  shirt: "#e8c821",
  shirtShade: "#b09410",
  legs: "#2b4f9c",
  shoes: "#4a3b2c",
  accent: "#e0432f",
};

// --- Shared face -------------------------------------------------------------

function drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number, gap: number, kind: Eyes) {
  const white = "#f6f0e2";
  const dark = OUT;
  for (const side of [-1, 1]) {
    const ex = x + side * gap;
    switch (kind) {
      case "closed":
        line(ctx, [ex - 3, y], [ex + 3, y], dark, 1.4);
        break;
      case "wide":
        ellipse(ctx, ex, y, 3.4, 3.8, white, dark);
        ellipse(ctx, ex + side * 0.5, y + 0.4, 1.3, 1.3, dark);
        break;
      case "squint":
        poly(
          ctx,
          [
            [ex - 3.4, y - 1],
            [ex + 3.4, y - 0.4],
            [ex + 3.4, y + 1],
            [ex - 3.4, y + 1],
          ],
          white,
          dark,
        );
        ellipse(ctx, ex, y + 0.2, 1, 0.9, dark);
        break;
      case "cross":
        line(ctx, [ex - 3, y - 3], [ex + 3, y + 3], dark, 1.4);
        line(ctx, [ex + 3, y - 3], [ex - 3, y + 3], dark, 1.4);
        break;
      default:
        ellipse(ctx, ex, y, 2.8, 3.2, white, dark);
        ellipse(ctx, ex + side * 0.6, y + 0.3, 1.2, 1.2, dark);
    }
  }
}

function drawMouth(ctx: CanvasRenderingContext2D, x: number, y: number, kind: Mouth) {
  switch (kind) {
    case "open":
      poly(
        ctx,
        [
          [x - 4, y],
          [x + 4, y - 1],
          [x + 3, y + 5],
          [x - 3, y + 4],
        ],
        "#5c1f28",
        OUT,
      );
      break;
    case "oh":
      ellipse(ctx, x, y + 1, 3, 3.6, "#5c1f28", OUT);
      break;
    case "grin":
      poly(
        ctx,
        [
          [x - 6, y - 1],
          [x + 6, y - 2],
          [x + 3, y + 4],
          [x - 4, y + 3],
        ],
        "#5c1f28",
        OUT,
      );
      line(ctx, [x - 5, y], [x + 5, y - 1], "#f2ece0", 1.2);
      break;
    case "grimace":
      poly(
        ctx,
        [
          [x - 5, y - 1],
          [x + 5, y - 1],
          [x + 5, y + 3],
          [x - 5, y + 3],
        ],
        "#f2ece0",
        OUT,
      );
      for (let i = -4; i <= 4; i += 2) line(ctx, [x + i, y - 1], [x + i, y + 3], OUT, 0.8);
      break;
    default:
      line(ctx, [x - 5, y + 1], [x + 4, y], OUT, 1.4);
  }
}

// --- Dennis Kroll, guitar ----------------------------------------------------
// Wedge head, jacket two sizes too big, guitar slung at knee height because he
// saw a photograph once.

export function drawDennis(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  p: Palette = DENNIS,
  wearable: string | null = null,
) {
  ctx.save();
  ctx.translate(pose.driftX, -pose.bob);
  ctx.rotate(pose.tilt);

  shadeUnder(ctx, 0, 1, 15, "#000000");

  const hipY = -30;
  const shoulderY = -50;

  // Legs — one straighter than the other, always.
  limb(ctx, -5, hipY, Math.PI / 2 + 0.06 + pose.lean * 0.05, 30, 5, 4, p.legs, OUT);
  limb(ctx, 5, hipY, Math.PI / 2 - 0.1 + pose.lean * 0.05, 30, 5.5, 4, p.legs, OUT);
  poly(
    ctx,
    [
      [-11, 0],
      [-2, 0],
      [-1, -4],
      [-10, -4],
    ],
    p.shoes,
    OUT,
  );
  poly(
    ctx,
    [
      [2, 0],
      [12, 0],
      [11, -4],
      [3, -4],
    ],
    p.shoes,
    OUT,
  );

  // Torso: a jacket shaped like a road sign.
  const lean = pose.lean * 3;
  poly(
    ctx,
    [
      [-13 + lean, shoulderY],
      [13 + lean, shoulderY - 2],
      [9, hipY + 2],
      [-9, hipY + 2],
    ],
    p.shirt,
    OUT,
  );
  poly(
    ctx,
    [
      [-13 + lean, shoulderY],
      [-4 + lean, shoulderY - 1],
      [-2, hipY + 2],
      [-9, hipY + 2],
    ],
    p.shirtShade,
  );
  // Band shirt underneath, illegible on purpose.
  poly(
    ctx,
    [
      [-4 + lean, shoulderY],
      [4 + lean, shoulderY],
      [3, hipY],
      [-3, hipY],
    ],
    "#111014",
    OUT,
  );
  hatch(ctx, -9, hipY - 8, 18, 8, "#00000030", 4, 7);

  // Arms: noodles.
  const shL: Pt = [-12 + lean, shoulderY + 2];
  const shR: Pt = [12 + lean, shoulderY + 1];
  const handL = limb(ctx, shL[0], shL[1], 0.85 + pose.armL, 22, 3.2, 2.4, p.shirt, OUT);
  const handR = limb(ctx, shR[0], shR[1], 2.35 + pose.armR, 20, 3.4, 2.4, p.shirt, OUT);
  ellipse(ctx, handL[0], handL[1], 3, 3, p.skin, OUT);
  ellipse(ctx, handR[0], handR[1], 3.2, 3.2, p.skin, OUT);

  // Head: a trapezoid that got away.
  ctx.save();
  ctx.translate(lean, shoulderY - 2);
  ctx.rotate(pose.headTilt - pose.headDrop * 0.9);
  const hy = -20;
  poly(
    ctx,
    [
      [-3, 2],
      [3, 2],
      [4, -3],
      [-4, -3],
    ],
    p.skin,
    OUT,
  );
  poly(
    ctx,
    [
      [-13, hy + 20],
      [-15, hy + 4],
      [-9, hy - 6],
      [10, hy - 7],
      [15, hy + 6],
      [11, hy + 20],
    ],
    p.skin,
    OUT,
  );
  poly(
    ctx,
    [
      [8, hy - 6],
      [15, hy + 6],
      [11, hy + 20],
      [8, hy + 20],
    ],
    p.skinShade,
  );
  // Nose: a jutting triangle, per the style guide.
  poly(
    ctx,
    [
      [1, hy + 4],
      [12, hy + 10],
      [1, hy + 12],
    ],
    p.skin,
    OUT,
  );
  drawEyes(ctx, -1, hy + 3, 6, pose.eyes);
  drawMouth(ctx, 0, hy + 14, pose.mouth);
  // Hair: a shape, not hair.
  poly(
    ctx,
    [
      [-16, hy + 5],
      [-11, hy - 9],
      [2, hy - 12],
      [13, hy - 7],
      [17, hy + 3],
      [12, hy - 3],
      [4, hy - 5],
      [-6, hy - 3],
      [-11, hy + 4],
    ],
    p.hair,
    OUT,
  );
  poly(
    ctx,
    [
      [-11, hy - 9],
      [-4, hy - 13],
      [-6, hy - 4],
    ],
    p.hairShade,
  );
  if (wearable) drawWearable(ctx, wearable, 0, hy - 8, p);
  ctx.restore();

  // Guitar, slung criminally low.
  ctx.save();
  ctx.translate(lean * 0.5, hipY + 4);
  ctx.rotate(-0.24);
  poly(
    ctx,
    [
      [-14, -7],
      [4, -9],
      [10, -3],
      [8, 6],
      [-6, 8],
      [-16, 2],
    ],
    "#c8341f",
    OUT,
  );
  poly(
    ctx,
    [
      [-14, -7],
      [-4, -8],
      [-6, 8],
      [-16, 2],
    ],
    "#94210f",
  );
  poly(
    ctx,
    [
      [8, -4],
      [44, -8],
      [45, -4],
      [8, 1],
    ],
    "#3b2a1c",
    OUT,
  );
  poly(
    ctx,
    [
      [43, -9],
      [52, -11],
      [53, -3],
      [44, -3],
    ],
    "#3b2a1c",
    OUT,
  );
  for (let i = 0; i < 3; i++) {
    line(ctx, [10, -3 + i], [44, -6 + i * 0.8], "#d8d2c0", 0.5);
  }
  ctx.restore();

  ctx.restore();
}

/** Where event visuals attach on Dennis, in his local space. */
export const DENNIS_ANCHORS = {
  head: [0, -70] as Pt,
  feet: [0, -2] as Pt,
  amp: [-34, -8] as Pt,
  hands: [8, -30] as Pt,
};

// --- Big Rhonda, drums -------------------------------------------------------
// Seated. Enormous shoulders, small stool, permanent expression of a person who
// finished a night shift ninety minutes ago.

export function drawRhonda(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  p: Palette = RHONDA,
  wearable: string | null = null,
) {
  ctx.save();
  ctx.translate(pose.driftX, -pose.bob * 0.5);

  // Stool.
  poly(
    ctx,
    [
      [-9, -14],
      [9, -14],
      [8, -10],
      [-8, -10],
    ],
    "#4a3b2c",
    OUT,
  );
  line(ctx, [-6, -10], [-8, 0], OUT, 2);
  line(ctx, [6, -10], [8, 0], OUT, 2);

  // Legs forward to the pedals.
  limb(ctx, -5, -14, 0.35, 22, 6, 5, p.legs, OUT);
  limb(ctx, 6, -14, 0.2, 24, 6, 5, p.legs, OUT);

  const shoulderY = -44;
  // Torso: a fridge.
  poly(
    ctx,
    [
      [-17, shoulderY],
      [17, shoulderY - 2],
      [13, -14],
      [-13, -14],
    ],
    p.shirt,
    OUT,
  );
  poly(
    ctx,
    [
      [7, shoulderY - 1],
      [17, shoulderY - 2],
      [13, -14],
      [8, -14],
    ],
    p.shirtShade,
  );
  hatch(ctx, -13, -30, 26, 14, "#00000028", 5, 3);

  // Arms and sticks. Thick, not noodly — the contrast is the joke.
  const swing = Math.sin(pose.armL) * 0.5;
  const swing2 = Math.sin(pose.armR) * 0.5;
  const hL = limb(ctx, -15, shoulderY + 4, 0.55 + swing, 20, 5.5, 4, p.skin, OUT);
  const hR = limb(ctx, 15, shoulderY + 3, 2.6 - swing2, 20, 5.5, 4, p.skin, OUT);
  line(ctx, hL, [hL[0] + 16, hL[1] + 4 + swing * 8], "#d9c9a0", 1.6);
  line(ctx, hR, [hR[0] - 16, hR[1] + 4 + swing2 * 8], "#d9c9a0", 1.6);

  // Head, dropping toward the snare when asleep.
  ctx.save();
  ctx.translate(0, shoulderY);
  ctx.rotate(pose.headTilt + pose.headDrop * 1.15);
  ctx.translate(0, pose.headDrop * 9);
  const hy = -18;
  poly(
    ctx,
    [
      [-4, 2],
      [4, 2],
      [5, -4],
      [-5, -4],
    ],
    p.skin,
    OUT,
  );
  poly(
    ctx,
    [
      [-14, hy + 18],
      [-16, hy + 2],
      [-8, hy - 8],
      [9, hy - 8],
      [16, hy + 2],
      [13, hy + 18],
      [-2, hy + 21],
    ],
    p.skin,
    OUT,
  );
  poly(
    ctx,
    [
      [9, hy - 8],
      [16, hy + 2],
      [13, hy + 18],
      [9, hy + 18],
    ],
    p.skinShade,
  );
  poly(
    ctx,
    [
      [0, hy + 3],
      [9, hy + 11],
      [0, hy + 12],
    ],
    p.skin,
    OUT,
  );
  drawEyes(ctx, -1, hy + 2, 6.5, pose.eyes);
  drawMouth(ctx, -1, hy + 14, pose.mouth);
  poly(
    ctx,
    [
      [-17, hy + 4],
      [-14, hy - 10],
      [0, hy - 14],
      [13, hy - 10],
      [18, hy + 5],
      [13, hy - 2],
      [0, hy - 6],
      [-12, hy - 1],
    ],
    p.hair,
    OUT,
  );
  if (wearable) drawWearable(ctx, wearable, 0, hy - 10, p);
  ctx.restore();

  ctx.restore();
}

/** The kit, drawn in two passes so Rhonda sits inside it. */
export function drawKitBack(ctx: CanvasRenderingContext2D) {
  // Crash cymbal on a bent stand.
  line(ctx, [26, 0], [30, -44], "#8a8272", 1.5);
  poly(
    ctx,
    [
      [16, -44],
      [44, -46],
      [30, -40],
    ],
    "#c9a83a",
    OUT,
  );
  // Hi-hat.
  line(ctx, [-32, 0], [-32, -34], "#8a8272", 1.5);
  poly(
    ctx,
    [
      [-42, -34],
      [-22, -35],
      [-32, -30],
    ],
    "#c9a83a",
    OUT,
  );
  // Rack tom.
  ellipse(ctx, 14, -30, 11, 5, "#e0dccc", OUT);
  poly(
    ctx,
    [
      [3, -30],
      [25, -30],
      [24, -20],
      [4, -20],
    ],
    "#7a3f8c",
    OUT,
  );
}

export function drawKitFront(ctx: CanvasRenderingContext2D) {
  // Snare.
  ellipse(ctx, -16, -24, 11, 4.5, "#e6e2d2", OUT);
  poly(
    ctx,
    [
      [-27, -24],
      [-5, -24],
      [-6, -15],
      [-26, -15],
    ],
    "#b8b2a0",
    OUT,
  );
  line(ctx, [-27, -20], [-5, -20], "#5c5648", 1);
  // Kick, with the band name on it in the wrong font, hand-lettered.
  ellipse(ctx, 0, -13, 20, 12, "#b8b0a0", OUT);
  ellipse(ctx, 0, -13, 20, 12, undefined, "#8a8272");
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -13, 17, 9, 0, 0, Math.PI * 2);
  ctx.clip();
  // Duct tape holding the head together (doc 11 — the kit is held together).
  poly(
    ctx,
    [
      [-22, -20],
      [-4, -25],
      [-2, -20],
      [-20, -15],
    ],
    "#9c9282",
    "#6f6656",
  );
  ctx.restore();
}

export const RHONDA_ANCHORS = {
  head: [0, -62] as Pt,
  snare: [-16, -24] as Pt,
  kit: [0, -20] as Pt,
};

// --- Perry Stavros, bass -----------------------------------------------------
// Six foot four of apology. Bass worn at chest height. Stands like a coat rack.

export function drawPerry(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  p: Palette = PERRY,
  wearable: string | null = null,
) {
  ctx.save();
  ctx.translate(pose.driftX, -pose.bob);
  ctx.rotate(pose.tilt);
  shadeUnder(ctx, 0, 1, 13, "#000000");

  const hipY = -36;
  const shoulderY = -62;

  limb(ctx, -4, hipY, Math.PI / 2 + 0.04, 36, 3.6, 3, p.legs, OUT);
  limb(ctx, 4, hipY, Math.PI / 2 - 0.12, 36, 3.6, 3, p.legs, OUT);
  poly(
    ctx,
    [
      [-10, 0],
      [-1, 0],
      [-1, -4],
      [-9, -4],
    ],
    p.shoes,
    OUT,
  );
  poly(
    ctx,
    [
      [2, 0],
      [12, 0],
      [11, -4],
      [3, -4],
    ],
    p.shoes,
    OUT,
  );

  const lean = pose.lean * 4;
  poly(
    ctx,
    [
      [-10 + lean, shoulderY],
      [10 + lean, shoulderY - 3],
      [7, hipY + 2],
      [-7, hipY + 2],
    ],
    p.shirt,
    OUT,
  );
  poly(
    ctx,
    [
      [4 + lean, shoulderY - 2],
      [10 + lean, shoulderY - 3],
      [7, hipY + 2],
      [4, hipY + 2],
    ],
    p.shirtShade,
  );

  const hL = limb(ctx, -9 + lean, shoulderY + 3, 1.0 + pose.armL, 26, 2.6, 2, p.skin, OUT);
  const hR = limb(ctx, 9 + lean, shoulderY + 2, 2.2 + pose.armR, 24, 2.6, 2, p.skin, OUT);
  ellipse(ctx, hL[0], hL[1], 2.6, 2.6, p.skin, OUT);
  ellipse(ctx, hR[0], hR[1], 2.8, 2.8, p.skin, OUT);

  // Neck: far too long. Head: far too big. Both deliberate.
  ctx.save();
  ctx.translate(lean, shoulderY);
  ctx.rotate(pose.headTilt - pose.headDrop * 0.7);
  poly(
    ctx,
    [
      [-3, 0],
      [3, 0],
      [3, -11],
      [-3, -11],
    ],
    p.skin,
    OUT,
  );
  const hy = -30;
  poly(
    ctx,
    [
      [-12, hy + 18],
      [-14, hy - 2],
      [-6, hy - 10],
      [11, hy - 8],
      [14, hy + 4],
      [9, hy + 19],
      [-3, hy + 21],
    ],
    p.skin,
    OUT,
  );
  poly(
    ctx,
    [
      [11, hy - 8],
      [14, hy + 4],
      [9, hy + 19],
      [6, hy + 19],
    ],
    p.skinShade,
  );
  poly(
    ctx,
    [
      [0, hy + 4],
      [11, hy + 9],
      [0, hy + 13],
    ],
    p.skin,
    OUT,
  );
  drawEyes(ctx, -1, hy + 3, 5.5, pose.eyes);
  drawMouth(ctx, -1, hy + 15, pose.mouth);
  // Receding, and in denial about it.
  poly(
    ctx,
    [
      [-15, hy + 2],
      [-12, hy - 9],
      [0, hy - 12],
      [12, hy - 8],
      [15, hy + 2],
      [11, hy - 3],
      [0, hy - 5],
      [-11, hy - 2],
    ],
    p.hair,
    OUT,
  );
  if (wearable) drawWearable(ctx, wearable, 0, hy - 9, p);
  ctx.restore();

  // Bass, worn near the collarbone.
  ctx.save();
  ctx.translate(lean * 0.5, hipY - 8);
  ctx.rotate(-0.1);
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
      [48, -9],
      [49, -5],
      [6, 1],
    ],
    "#2a1e14",
    OUT,
  );
  poly(
    ctx,
    [
      [47, -10],
      [58, -12],
      [59, -4],
      [48, -4],
    ],
    "#2a1e14",
    OUT,
  );
  ctx.restore();

  ctx.restore();
}

export const PERRY_ANCHORS = {
  head: [0, -92] as Pt,
  feet: [0, -2] as Pt,
  hands: [8, -46] as Pt,
};

// --- Wearables (doc 14.4 — cosmetic only, always) ---------------------------

export function drawWearable(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  p: Palette,
) {
  switch (id) {
    case "traffic_cone":
      poly(
        ctx,
        [
          [x - 9, y + 2],
          [x + 9, y + 2],
          [x + 2, y - 20],
          [x - 2, y - 20],
        ],
        "#e8621f",
        OUT,
      );
      poly(
        ctx,
        [
          [x - 6, y - 6],
          [x + 6, y - 6],
          [x + 5, y - 10],
          [x - 5, y - 10],
        ],
        "#f0ece0",
      );
      break;
    case "party_hat":
      poly(
        ctx,
        [
          [x - 8, y + 2],
          [x + 8, y + 2],
          [x + 1, y - 18],
        ],
        p.accent,
        OUT,
      );
      ellipse(ctx, x + 1, y - 18, 2.5, 2.5, "#f2ece0", OUT);
      break;
    case "bike_helmet":
      poly(
        ctx,
        [
          [x - 13, y + 4],
          [x - 11, y - 6],
          [x, y - 11],
          [x + 12, y - 5],
          [x + 13, y + 4],
        ],
        "#3fa0d8",
        OUT,
      );
      line(ctx, [x - 6, y - 8], [x - 4, y + 3], "#1c6f9c", 1.4);
      line(ctx, [x + 3, y - 9], [x + 5, y + 3], "#1c6f9c", 1.4);
      break;
    case "novelty_wig":
      for (let i = -3; i <= 3; i++) {
        poly(
          ctx,
          [
            [x + i * 4, y + 4],
            [x + i * 4 - 4, y - 12 - Math.abs(i)],
            [x + i * 4 + 4, y - 12 - Math.abs(i)],
          ],
          i % 2 === 0 ? "#e0432f" : "#3fa0d8",
          OUT,
        );
      }
      break;
    case "sunglasses":
      poly(
        ctx,
        [
          [x - 11, y + 12],
          [x + 11, y + 11],
          [x + 10, y + 17],
          [x - 10, y + 18],
        ],
        "#151218",
        OUT,
      );
      line(ctx, [x - 1, y + 12], [x - 1, y + 17], "#4a4450", 1);
      break;
    default:
      break;
  }
}
