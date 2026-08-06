import type { Screen } from "./screen.ts";

export interface Pointer {
  id: number;
  x: number;
  y: number;
  /** Buffer-space position when this pointer went down. */
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  /** Set by whichever widget claimed this pointer on the frame it went down. */
  claim: unknown;
  down: boolean;
  /** True only on the frame the pointer went down. */
  pressed: boolean;
  /** True only on the frame the pointer lifted. */
  released: boolean;
  /** Total distance travelled while down — used to tell taps from drags. */
  travel: number;
}

export class Input {
  pointers = new Map<number, Pointer>();
  /** Pointers released this frame, kept for one frame so taps can be read. */
  private expiring: Pointer[] = [];

  constructor(screen: Screen) {
    const target = screen.view;

    const add = (e: PointerEvent) => {
      const p = screen.toBuffer(e.clientX, e.clientY);
      this.pointers.set(e.pointerId, {
        id: e.pointerId,
        x: p.x,
        y: p.y,
        startX: p.x,
        startY: p.y,
        dx: 0,
        dy: 0,
        claim: null,
        down: true,
        pressed: true,
        released: false,
        travel: 0,
      });
      target.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };

    const move = (e: PointerEvent) => {
      const ptr = this.pointers.get(e.pointerId);
      if (!ptr) return;
      const p = screen.toBuffer(e.clientX, e.clientY);
      ptr.dx += p.x - ptr.x;
      ptr.dy += p.y - ptr.y;
      ptr.travel += Math.abs(p.x - ptr.x) + Math.abs(p.y - ptr.y);
      ptr.x = p.x;
      ptr.y = p.y;
      e.preventDefault();
    };

    const end = (e: PointerEvent) => {
      const ptr = this.pointers.get(e.pointerId);
      if (!ptr) return;
      ptr.down = false;
      ptr.released = true;
      this.pointers.delete(e.pointerId);
      this.expiring.push(ptr);
      e.preventDefault();
    };

    target.addEventListener("pointerdown", add);
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
    target.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /** All live pointers plus those released this frame. */
  all(): Pointer[] {
    return [...this.pointers.values(), ...this.expiring];
  }

  /** Call at the end of each frame. */
  endFrame(): void {
    for (const p of this.pointers.values()) {
      p.pressed = false;
      p.dx = 0;
      p.dy = 0;
    }
    this.expiring.length = 0;
  }

  /** A tap is a press and release that never travelled far. */
  tapIn(x: number, y: number, w: number, h: number): boolean {
    for (const p of this.expiring) {
      if (p.travel > 6) continue;
      if (p.startX >= x && p.startX <= x + w && p.startY >= y && p.startY <= y + h) return true;
    }
    return false;
  }

  pressIn(x: number, y: number, w: number, h: number): Pointer | null {
    for (const p of this.pointers.values()) {
      if (!p.pressed || p.claim) continue;
      if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) return p;
    }
    return null;
  }

  hoverIn(x: number, y: number, w: number, h: number): boolean {
    for (const p of this.all()) {
      if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) return true;
    }
    return false;
  }
}
