import { fonts } from "./font.ts";
import type { Input } from "./input.ts";
import { line, poly, rect } from "../art/draw.ts";

export const money = (n: number) => `£${n}`;

const OUT = "#171018";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A drawn panel — taped-down paper, not a dialog box. */
export function panel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  fill = "#e8e2cc",
  edge = "#a89b7c",
) {
  poly(
    ctx,
    [
      [r.x, r.y + 1],
      [r.x + r.w, r.y],
      [r.x + r.w - 1, r.y + r.h],
      [r.x + 1, r.y + r.h - 1],
    ],
    fill,
    edge,
  );
}

export function uiButton(
  ctx: CanvasRenderingContext2D,
  input: Input,
  r: Rect,
  label: string,
  opts: { color?: string; ink?: string; disabled?: boolean; small?: boolean } = {},
): boolean {
  const color = opts.disabled ? "#5c5a68" : (opts.color ?? "#c8341f");
  const ink = opts.disabled ? "#8a8494" : (opts.ink ?? "#f6f0e2");
  const hovered = !opts.disabled && input.hoverIn(r.x, r.y, r.w, r.h);
  const f = opts.small ? fonts().small : fonts().body;

  poly(
    ctx,
    [
      [r.x, r.y + 1],
      [r.x + r.w, r.y],
      [r.x + r.w, r.y + r.h],
      [r.x, r.y + r.h - 1],
    ],
    color,
    OUT,
  );
  if (!opts.disabled) {
    line(ctx, [r.x + 1, r.y + 1], [r.x + r.w - 1, r.y + 0.6], "#ffffff44", 1);
    line(ctx, [r.x + 1, r.y + r.h - 1], [r.x + r.w - 1, r.y + r.h - 1], "#00000055", 1);
  }
  if (hovered) {
    ctx.globalAlpha = 0.14;
    rect(ctx, r.x, r.y, r.w, r.h, "#ffffff");
    ctx.globalAlpha = 1;
  }
  f.draw(ctx, label, r.x + r.w / 2, r.y + (r.h - f.height) / 2 + 1, ink, "center");

  return !opts.disabled && input.tapIn(r.x, r.y, r.w, r.h);
}

/** Hand-lettered heading with a rule under it. */
export function heading(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = "#2b2530") {
  const f = fonts().big;
  f.draw(ctx, text, x, y, color);
  line(ctx, [x, y + f.height + 1], [x + f.measure(text), y + f.height + 2], color, 1);
}

/** Simple scrollable list region driven by drag. */
export class ScrollRegion {
  offset = 0;
  private max = 0;
  private dragId: number | null = null;

  update(input: Input, r: Rect, contentHeight: number) {
    this.max = Math.max(0, contentHeight - r.h);
    for (const p of input.all()) {
      const inside = p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
      if (p.pressed && inside && this.max > 0) this.dragId = p.id;
      if (this.dragId === p.id) {
        this.offset -= p.dy;
        if (!p.down) this.dragId = null;
      }
    }
    this.offset = Math.max(0, Math.min(this.max, this.offset));
  }

  wheel(delta: number) {
    this.offset = Math.max(0, Math.min(this.max, this.offset + delta));
  }

  drawBar(ctx: CanvasRenderingContext2D, r: Rect) {
    if (this.max <= 0) return;
    const h = Math.max(12, (r.h * r.h) / (r.h + this.max));
    const y = r.y + ((r.h - h) * this.offset) / this.max;
    rect(ctx, r.x + r.w - 4, r.y, 3, r.h, "#00000022");
    rect(ctx, r.x + r.w - 4, y, 3, h, "#6b6478");
  }
}
