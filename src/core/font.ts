// A 1-bit pixel font, baked at runtime from a system font.
//
// Drawing text straight onto the low-res buffer with fillText gives soft,
// antialiased glyphs that look wrong once the buffer is upscaled with nearest
// neighbour. So we render each glyph once at small size, threshold the alpha to
// pure on/off, and blit the result. That produces genuine 1-bit pixel type from
// no asset data at all, and it recolours for free.

const CHARS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~£•←→↑↓♪♫×";

export interface Glyph {
  x: number;
  width: number;
}

export class PixelFont {
  readonly height: number;
  readonly baseline: number;
  private mask: HTMLCanvasElement;
  private glyphs = new Map<string, Glyph>();
  private tinted = new Map<string, HTMLCanvasElement>();
  readonly letterSpacing: number;
  readonly spaceWidth: number;

  constructor(
    family: string,
    size: number,
    opts: { weight?: string; threshold?: number; letterSpacing?: number } = {},
  ) {
    const weight = opts.weight ?? "normal";
    const threshold = opts.threshold ?? 128;
    this.letterSpacing = opts.letterSpacing ?? 1;

    const probe = document.createElement("canvas").getContext("2d")!;
    probe.font = `${weight} ${size}px ${family}`;
    const metrics = probe.measureText("Hg");
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent || size * 0.8);
    const descent = Math.ceil(metrics.actualBoundingBoxDescent || size * 0.25);
    this.height = ascent + descent + 1;
    this.baseline = ascent + 1;

    // Lay every glyph out in one strip.
    const widths: number[] = [];
    let total = 0;
    for (const ch of CHARS) {
      const w = Math.max(1, Math.ceil(probe.measureText(ch).width));
      widths.push(w);
      total += w;
    }

    const strip = document.createElement("canvas");
    strip.width = total;
    strip.height = this.height;
    const sctx = strip.getContext("2d", { willReadFrequently: true })!;
    sctx.font = `${weight} ${size}px ${family}`;
    sctx.textBaseline = "alphabetic";
    sctx.fillStyle = "#fff";

    let cursor = 0;
    let i = 0;
    for (const ch of CHARS) {
      sctx.fillText(ch, cursor, this.baseline);
      this.glyphs.set(ch, { x: cursor, width: widths[i] });
      cursor += widths[i];
      i++;
    }

    // Threshold to 1-bit.
    const img = sctx.getImageData(0, 0, strip.width, strip.height);
    const d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      const on = d[p + 3] >= threshold;
      d[p] = 255;
      d[p + 1] = 255;
      d[p + 2] = 255;
      d[p + 3] = on ? 255 : 0;
    }
    sctx.putImageData(img, 0, 0);
    this.mask = strip;
    this.spaceWidth = this.glyphs.get(" ")!.width;
  }

  private sheet(color: string): HTMLCanvasElement {
    let c = this.tinted.get(color);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = this.mask.width;
    c.height = this.mask.height;
    const cx = c.getContext("2d")!;
    cx.drawImage(this.mask, 0, 0);
    cx.globalCompositeOperation = "source-in";
    cx.fillStyle = color;
    cx.fillRect(0, 0, c.width, c.height);
    this.tinted.set(color, c);
    return c;
  }

  measure(text: string): number {
    let w = 0;
    for (const ch of text) {
      const g = this.glyphs.get(ch);
      w += (g ? g.width : this.spaceWidth) + this.letterSpacing;
    }
    return Math.max(0, w - this.letterSpacing);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color = "#ffffff",
    align: "left" | "center" | "right" = "left",
  ): void {
    let cx = Math.round(x);
    if (align === "center") cx -= Math.round(this.measure(text) / 2);
    else if (align === "right") cx -= this.measure(text);
    const sheet = this.sheet(color);
    const top = Math.round(y);
    for (const ch of text) {
      const g = this.glyphs.get(ch);
      if (!g) {
        cx += this.spaceWidth + this.letterSpacing;
        continue;
      }
      if (ch !== " ") {
        ctx.drawImage(sheet, g.x, 0, g.width, this.height, cx, top, g.width, this.height);
      }
      cx += g.width + this.letterSpacing;
    }
  }

  /** Greedy wrap. Returns the lines; does not draw. */
  wrap(text: string, maxWidth: number): string[] {
    const out: string[] = [];
    for (const paragraph of text.split("\n")) {
      if (paragraph === "") {
        out.push("");
        continue;
      }
      let line = "";
      for (const word of paragraph.split(" ")) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.measure(candidate) > maxWidth && line) {
          out.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }

  drawWrapped(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    color = "#ffffff",
    lineGap = 2,
    align: "left" | "center" | "right" = "left",
  ): number {
    const lines = this.wrap(text, maxWidth);
    let ly = y;
    for (const line of lines) {
      this.draw(ctx, line, x, ly, color, align);
      ly += this.height + lineGap;
    }
    return ly - y;
  }
}

// Three sizes cover the whole game: labels, body, headings. Built lazily so the
// first paint is not blocked by font loading.
let cache: { small: PixelFont; body: PixelFont; big: PixelFont } | null = null;

export function fonts() {
  if (!cache) {
    const stack = `"Helvetica Neue", Helvetica, Arial, sans-serif`;
    cache = {
      small: new PixelFont(stack, 7, { weight: "bold", threshold: 100, letterSpacing: 1 }),
      body: new PixelFont(stack, 9, { threshold: 110, letterSpacing: 1 }),
      big: new PixelFont(stack, 14, { weight: "bold", threshold: 100, letterSpacing: 1 }),
    };
  }
  return cache;
}
