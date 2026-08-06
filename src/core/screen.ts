// The whole game renders into one small offscreen buffer and is scaled up with
// nearest-neighbour. Per design doc 17.4 this is the period aesthetic, it hides
// inconsistency between drawn elements, and it sets a hard detail budget.

export const VW = 480;
export const VH = 270;

export interface Screen {
  /** Low-resolution buffer everything draws into. */
  ctx: CanvasRenderingContext2D;
  /** Visible, upscaled canvas. */
  view: HTMLCanvasElement;
  /** Convert a client-space point to buffer coordinates. */
  toBuffer(clientX: number, clientY: number): { x: number; y: number };
  present(): void;
}

export function createScreen(view: HTMLCanvasElement): Screen {
  const buffer = document.createElement("canvas");
  buffer.width = VW;
  buffer.height = VH;
  const ctx = buffer.getContext("2d", { alpha: false })!;
  ctx.imageSmoothingEnabled = false;

  const viewCtx = view.getContext("2d", { alpha: false })!;
  let scale = 1;
  let originX = 0;
  let originY = 0;

  function layout() {
    const wrap = view.parentElement!;
    const availW = wrap.clientWidth;
    const availH = wrap.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    // Integer scale where we can — fractional scaling reintroduces the blur the
    // whole pipeline exists to avoid.
    const rawScale = Math.min(availW / VW, availH / VH);
    scale = rawScale >= 1 ? Math.floor(rawScale) : rawScale;
    if (scale <= 0) scale = rawScale;

    const cssW = Math.round(VW * scale);
    const cssH = Math.round(VH * scale);
    view.style.width = `${cssW}px`;
    view.style.height = `${cssH}px`;
    view.width = Math.round(cssW * dpr);
    view.height = Math.round(cssH * dpr);
    viewCtx.imageSmoothingEnabled = false;
    viewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rect = view.getBoundingClientRect();
    originX = rect.left;
    originY = rect.top;
  }

  function refreshOrigin() {
    const rect = view.getBoundingClientRect();
    originX = rect.left;
    originY = rect.top;
  }

  layout();
  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", () => setTimeout(layout, 120));
  window.addEventListener("scroll", refreshOrigin, true);

  return {
    ctx,
    view,
    toBuffer(clientX, clientY) {
      refreshOrigin();
      return {
        x: (clientX - originX) / scale,
        y: (clientY - originY) / scale,
      };
    },
    present() {
      viewCtx.imageSmoothingEnabled = false;
      viewCtx.drawImage(buffer, 0, 0, VW * scale, VH * scale);
    },
  };
}
