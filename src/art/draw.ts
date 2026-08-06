export type Pt = [number, number];

export function poly(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  fill?: string,
  stroke?: string,
  lineWidth = 1,
) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function line(
  ctx: CanvasRenderingContext2D,
  a: Pt,
  b: Pt,
  color: string,
  width = 1,
) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

export function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill?: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * A tapered limb drawn from a pivot at an angle. Nothing in this game is drawn
 * with a consistent thickness, because nothing in this game is drawn well.
 */
export function limb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  wStart: number,
  wEnd: number,
  fill: string,
  outline: string,
) {
  const nx = Math.cos(angle + Math.PI / 2);
  const ny = Math.sin(angle + Math.PI / 2);
  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length;
  poly(
    ctx,
    [
      [x + nx * wStart, y + ny * wStart],
      [ex + nx * wEnd, ey + ny * wEnd],
      [ex - nx * wEnd, ey - ny * wEnd],
      [x - nx * wStart, y - ny * wStart],
    ],
    fill,
    outline,
  );
  return [ex, ey] as Pt;
}

/** Rough scribbled hatching — grime, stains, shadow (doc 17.1). */
export function hatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  step = 3,
  seed = 1,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = -h; i < w; i += step) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h * (0.5 + rnd() * 0.5), y);
    ctx.stroke();
  }
  ctx.restore();
}

export function shadeUnder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color: string,
) {
  ctx.globalAlpha = 0.35;
  ellipse(ctx, x, y, w, w * 0.22, color);
  ctx.globalAlpha = 1;
}
