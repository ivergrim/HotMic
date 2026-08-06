// The desk (doc 5, doc 17.5).
//
// Ruled straight lines for the fader tracks and strip borders so it reads as a
// functional object; freehand for everything else; hand-lettered labels. Hit
// areas are larger than the drawn control, so imprecise drawing never costs the
// player a fix.

import type { ChannelId } from "../audio/engine.ts";
import type { Input } from "../core/input.ts";
import { clamp } from "../core/rng.ts";
import { fonts } from "../core/font.ts";
import { ellipse, line, poly, rect } from "../art/draw.ts";
import {
  CHANNEL_PLAYER,
  NEUTRAL,
  NEUTRAL_RANGE,
  type BoardState,
} from "./state.ts";

const OUT = "#171018";
const DESK = "#43414f";
const DESK_HI = "#565463";
const DESK_LO = "#2f2d38";
const PLATE = "#d8d2bc";
const INK = "#2b2530";

export interface StripRect {
  id: ChannelId;
  x: number;
  y: number;
  w: number;
  h: number;
  tone: { cx: number; cy: number; r: number };
  pan: { cx: number; cy: number; r: number };
  fx: { x: number; y: number; w: number; h: number };
  solo: { x: number; y: number; w: number; h: number };
  fader: { x: number; y: number; w: number; h: number };
}

export interface BoardLayout {
  panel: { x: number; y: number; w: number; h: number };
  meter: { x: number; y: number; w: number; h: number };
  progress: { x: number; y: number; w: number; h: number };
  caption: { x: number; y: number; w: number; h: number };
  strips: StripRect[];
  masterBox: { x: number; y: number; w: number; h: number };
  master: { cx: number; cy: number; r: number };
  house: { x: number; y: number; w: number; h: number };
  record: { x: number; y: number; w: number; h: number };
  talkback: { x: number; y: number; w: number; h: number };
  tray: { x: number; y: number; w: number; h: number };
  note: { x: number; y: number; w: number; h: number };
}

/**
 * The fader sits alongside the knobs rather than under them, which is the only
 * way to get genuinely generous fader travel out of half a 270-pixel screen.
 */
export function layoutBoard(panelY: number, panelH: number, channels: ChannelId[]): BoardLayout {
  const panel = { x: 0, y: panelY, w: 480, h: panelH };
  const stripY = panelY + 24;
  const stripH = panelH - 28;
  const stripW = 74;

  const strips: StripRect[] = channels.map((id, i) => {
    const x = 8 + i * (stripW + 5);
    const cx = x + 47;
    return {
      id,
      x,
      y: stripY,
      w: stripW,
      h: stripH,
      fader: { x: x + 5, y: stripY + 14, w: 16, h: stripH - 18 },
      tone: { cx, cy: stripY + 27, r: 11 },
      pan: { cx, cy: stripY + 65, r: 11 },
      fx: { x: x + 25, y: stripY + stripH - 16, w: 19, h: 12 },
      solo: { x: x + 46, y: stripY + stripH - 16, w: 24, h: 12 },
    };
  });

  const gx = 246;
  return {
    panel,
    progress: { x: 8, y: panelY + 3, w: 464, h: 3 },
    meter: { x: 8, y: panelY + 9, w: 260, h: 12 },
    caption: { x: 274, y: panelY + 9, w: 198, h: 12 },
    strips,
    masterBox: { x: gx, y: stripY, w: 74, h: 62 },
    master: { cx: gx + 37, cy: stripY + 34, r: 20 },
    house: { x: gx + 80, y: stripY + 2, w: 88, h: 15 },
    record: { x: gx + 80, y: stripY + 21, w: 88, h: 15 },
    talkback: { x: gx + 80, y: stripY + 40, w: 88, h: 15 },
    tray: { x: gx + 174, y: stripY, w: 52, h: 62 },
    note: { x: gx, y: stripY + 66, w: 226, h: stripH - 71 },
  };
}

// --- Drawing primitives in the desk's own idiom -----------------------------

function screwedPlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
) {
  poly(
    ctx,
    [
      [x, y + 1],
      [x + w, y],
      [x + w - 1, y + h],
      [x + 1, y + h - 1],
    ],
    PLATE,
    OUT,
  );
  fonts().small.draw(ctx, label, x + w / 2, y + 1, INK, "center");
  ellipse(ctx, x + 2.5, y + h - 2.5, 1, 1, "#8a8272");
  ellipse(ctx, x + w - 2.5, y + 2, 1, 1, "#8a8272");
}

function knob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  value: number,
  neutralWidth: number,
  cap: string,
) {
  // Ticks. Straight lines, ruled, because they are a functional part.
  for (let i = -1; i <= 1; i++) {
    const a = -Math.PI / 2 + i * 2.2;
    line(
      ctx,
      [cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2)],
      [cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4)],
      "#8a8494",
      1,
    );
  }
  // Neutral notch, wider than a line because neutral is a range (doc 2.2).
  ctx.save();
  ctx.globalAlpha = 0.9;
  const nw = Math.max(1.5, neutralWidth * 2.2 * r);
  rect(ctx, cx - nw / 2, cy - r - 5, nw, 3, "#e8c821");
  ctx.restore();

  ellipse(ctx, cx + 1, cy + 1, r, r, "#00000044");
  ellipse(ctx, cx, cy, r, r, cap, OUT);
  ellipse(ctx, cx - r * 0.3, cy - r * 0.35, r * 0.45, r * 0.4, "#ffffff22");

  const a = -Math.PI / 2 + value * 2.2;
  line(ctx, [cx, cy], [cx + Math.cos(a) * (r - 1.5), cy + Math.sin(a) * (r - 1.5)], "#1a1620", 2);
}

function button(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  on: boolean,
  color: string,
  disabled = false,
) {
  const face = disabled ? "#4a4854" : on ? color : "#5c5a68";
  poly(
    ctx,
    [
      [x, y + 1],
      [x + w, y],
      [x + w, y + h],
      [x, y + h - 1],
    ],
    face,
    OUT,
  );
  if (!disabled) {
    line(ctx, [x + 1, y + 1], [x + w - 1, y + 0.5], "#ffffff33", 1);
    line(ctx, [x + 1, y + h - 1], [x + w - 1, y + h - 1], "#00000044", 1);
  }
  const f = fonts().small;
  f.draw(ctx, label, x + w / 2, y + (h - f.height) / 2 + 1, on && !disabled ? "#1a1620" : "#d8d2bc", "center");
  if (on && !disabled) {
    ellipse(ctx, x + 4, y + h / 2, 1.6, 1.6, "#fff6c0");
  }
}

// --- The board --------------------------------------------------------------

export interface BoardCallbacks {
  onToggleFx?: (id: ChannelId, on: boolean) => void;
  onToggleSolo?: (id: ChannelId | null) => void;
  onToggleHouse?: (on: boolean) => void;
  onToggleRecord?: (on: boolean) => void;
  onUseConsumable?: (id: string) => void;
  onDeny?: () => void;
}

interface ClaimFader {
  type: "fader";
  id: ChannelId;
  grabOffset: number;
}
interface ClaimKnob {
  type: "knob";
  id: ChannelId | "master";
  which: "tone" | "pan" | "master";
  startValue: number;
  startY: number;
}
type Claim = ClaimFader | ClaimKnob;

export class Board {
  layout: BoardLayout;

  constructor(panelY: number, panelH: number, channels: ChannelId[]) {
    this.layout = layoutBoard(panelY, panelH, channels);
  }

  /**
   * Reads input and mutates board state. Returns true if anything moved, so the
   * caller can push the change into the audio graph.
   */
  update(
    input: Input,
    state: BoardState,
    cb: BoardCallbacks,
    opts: { locked?: boolean; consumables?: { id: string; count: number }[] } = {},
  ): boolean {
    if (opts.locked) return false;
    let changed = false;
    const L = this.layout;

    for (const strip of L.strips) {
      const ch = state.channels[strip.id];

      // Fader — generous vertical target, per doc 5.2.
      const f = strip.fader;
      const grab = input.pressIn(f.x - 9, f.y - 6, f.w + 18, f.h + 12);
      if (grab) {
        const capY = f.y + (1 - ch.volume) * f.h;
        grab.claim = { type: "fader", id: strip.id, grabOffset: grab.y - capY } as ClaimFader;
      }

      // Knobs — vertical drag, which is how every knob in software has ever
      // worked and the only thing that survives a thumb.
      const tk = strip.tone;
      const tgrab = input.pressIn(tk.cx - tk.r - 5, tk.cy - tk.r - 5, tk.r * 2 + 10, tk.r * 2 + 10);
      if (tgrab) {
        tgrab.claim = {
          type: "knob",
          id: strip.id,
          which: "tone",
          startValue: ch.tone,
          startY: tgrab.y,
        } as ClaimKnob;
      }
      const pk = strip.pan;
      const pgrab = input.pressIn(pk.cx - pk.r - 5, pk.cy - pk.r - 5, pk.r * 2 + 10, pk.r * 2 + 10);
      if (pgrab) {
        pgrab.claim = {
          type: "knob",
          id: strip.id,
          which: "pan",
          startValue: ch.pan,
          startY: pgrab.y,
        } as ClaimKnob;
      }

      if (input.tapIn(strip.fx.x - 3, strip.fx.y - 3, strip.fx.w + 6, strip.fx.h + 6)) {
        ch.fx = !ch.fx;
        cb.onToggleFx?.(strip.id, ch.fx);
        changed = true;
      }
      if (input.tapIn(strip.solo.x - 3, strip.solo.y - 3, strip.solo.w + 6, strip.solo.h + 6)) {
        state.solo = state.solo === strip.id ? null : strip.id;
        cb.onToggleSolo?.(state.solo);
        changed = true;
      }
    }

    // Master.
    const m = L.master;
    const mgrab = input.pressIn(m.cx - m.r - 6, m.cy - m.r - 6, m.r * 2 + 12, m.r * 2 + 12);
    if (mgrab) {
      mgrab.claim = {
        type: "knob",
        id: "master",
        which: "master",
        startValue: state.master,
        startY: mgrab.y,
      } as ClaimKnob;
    }

    if (input.tapIn(L.house.x, L.house.y, L.house.w, L.house.h)) {
      state.house = !state.house;
      cb.onToggleHouse?.(state.house);
      changed = true;
    }
    if (input.tapIn(L.record.x, L.record.y, L.record.w, L.record.h)) {
      state.record = !state.record;
      cb.onToggleRecord?.(state.record);
      changed = true;
    }
    if (input.tapIn(L.talkback.x, L.talkback.y, L.talkback.w, L.talkback.h)) {
      cb.onDeny?.();
    }

    // Consumables sitting on the desk.
    const items = opts.consumables ?? [];
    items.forEach((it, i) => {
      const x = L.tray.x + 3;
      const y = L.tray.y + 2 + i * 30;
      if (it.count > 0 && input.tapIn(x, y, 46, 28)) cb.onUseConsumable?.(it.id);
    });

    // Apply drags from claimed pointers.
    for (const p of input.all()) {
      const claim = p.claim as Claim | null;
      if (!claim) continue;
      if (claim.type === "fader") {
        const strip = L.strips.find((s) => s.id === claim.id);
        if (!strip) continue;
        const f = strip.fader;
        const v = 1 - clamp((p.y - claim.grabOffset - f.y) / f.h, 0, 1);
        if (v !== state.channels[claim.id].volume) {
          state.channels[claim.id].volume = v;
          changed = true;
        }
      } else {
        // 70 px of travel covers the full sweep — fine for a mouse, reachable
        // for a thumb.
        const delta = (claim.startY - p.y) / 70;
        if (claim.which === "master") {
          const v = clamp(claim.startValue + delta, 0, 1);
          if (v !== state.master) {
            state.master = v;
            changed = true;
          }
        } else {
          const v = clamp(claim.startValue + delta * 2, -1, 1);
          const target = state.channels[claim.id as ChannelId];
          const cur = claim.which === "tone" ? target.tone : target.pan;
          if (v !== cur) {
            if (claim.which === "tone") target.tone = v;
            else target.pan = v;
            changed = true;
          }
        }
      }
    }

    return changed;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    state: BoardState,
    opts: {
      energy: number;
      progress: number;
      sectionLabel: string;
      venueName: string;
      consumables?: { id: string; count: number; label: string }[];
      note?: { text: string; live: boolean } | null;
      recordArmed: boolean;
    },
  ) {
    const L = this.layout;
    const p = L.panel;

    // Desk body.
    rect(ctx, p.x, p.y, p.w, p.h, DESK);
    line(ctx, [p.x, p.y], [p.x + p.w, p.y], "#1c1a24", 2);
    rect(ctx, p.x, p.y + 2, p.w, 2, DESK_HI);
    // Grime. It is a working desk.
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 26; i++) {
      const gx = ((i * 97) % 470) + 4;
      const gy = p.y + 14 + ((i * 53) % (p.h - 20));
      ellipse(ctx, gx, gy, 2 + (i % 3), 1 + (i % 2), "#000000");
    }
    ctx.globalAlpha = 1;

    this.drawProgress(ctx, L.progress, opts.progress);
    this.drawMeter(ctx, L.meter, opts.energy);
    const f = fonts().small;
    f.draw(ctx, opts.sectionLabel.toUpperCase(), L.caption.x, L.caption.y + 2, "#b0aabc");
    f.draw(ctx, opts.venueName, L.caption.x + L.caption.w, L.caption.y + 2, "#7a7488", "right");

    this.drawEmptySlots(ctx);
    for (const strip of L.strips) {
      this.drawStrip(ctx, strip, state);
    }

    // Master.
    const mb = L.masterBox;
    rect(ctx, mb.x, mb.y, mb.w, mb.h, DESK_LO);
    ctx.strokeStyle = "#1c1a24";
    ctx.lineWidth = 1;
    ctx.strokeRect(mb.x + 0.5, mb.y + 0.5, mb.w - 1, mb.h - 1);
    screwedPlate(ctx, mb.x + 5, mb.y + 2, mb.w - 10, 10, "MASTER");
    knob(
      ctx,
      L.master.cx,
      L.master.cy,
      L.master.r,
      (state.master - NEUTRAL.master) * 1.35,
      NEUTRAL_RANGE.master * 1.35,
      "#c8341f",
    );
    f.draw(ctx, "QUIET", mb.x + 4, mb.y + mb.h - 11, "#9a94a4");
    f.draw(ctx, "LOUD", mb.x + mb.w - 4, mb.y + mb.h - 11, "#9a94a4", "right");

    button(ctx, L.house.x, L.house.y, L.house.w, L.house.h, "HOUSE MUSIC", state.house, "#3fa0d8");
    button(ctx, L.record.x, L.record.y, L.record.w, L.record.h, "RECORD", state.record, "#c8341f");
    if (opts.recordArmed && state.record) {
      const blink = Math.floor(performance.now() / 400) % 2 === 0;
      ellipse(ctx, L.record.x + L.record.w - 7, L.record.y + 7, 2.5, 2.5, blink ? "#ff4030" : "#5a1a14");
    }
    button(ctx, L.talkback.x, L.talkback.y, L.talkback.w, L.talkback.h, "TALKBACK", false, "#666", true);
    // Gaffer tape over talkback. It arrives in tier 3; until then it is a
    // promise and a piece of tape.
    poly(
      ctx,
      [
        [L.talkback.x - 2, L.talkback.y + 3],
        [L.talkback.x + L.talkback.w + 2, L.talkback.y + 1],
        [L.talkback.x + L.talkback.w + 2, L.talkback.y + 11],
        [L.talkback.x - 2, L.talkback.y + 13],
      ],
      "#9c9282",
      "#6f6656",
    );
    f.draw(ctx, "DON'T", L.talkback.x + L.talkback.w / 2, L.talkback.y + 3, "#3a3244", "center");

    this.drawTray(ctx, L.tray, opts.consumables ?? []);
    if (opts.note) this.drawNote(ctx, L.note, opts.note.text, opts.note.live);
    else this.drawScribbles(ctx, L.note);
  }

  /**
   * The desk has three slots whether or not the band has three people in it.
   * Showing the empty ones makes the band's growth a thing you can see coming.
   */
  private drawEmptySlots(ctx: CanvasRenderingContext2D) {
    const L = this.layout;
    const used = L.strips.length;
    const w = 74;
    for (let i = used; i < 3; i++) {
      const x = 8 + i * (w + 5);
      const y = L.strips[0].y;
      const h = L.strips[0].h;
      rect(ctx, x, y, w, h, "#3a3844");
      ctx.strokeStyle = "#2a2834";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.globalAlpha = 0.5;
      for (let k = 0; k < 3; k++) {
        line(ctx, [x + 6, y + 14 + k * 5], [x + w - 6, y + 14 + k * 5], "#2f2d38", 2);
      }
      ctx.globalAlpha = 1;
      fonts().small.draw(ctx, "NOBODY", x + w / 2, y + h / 2 - 10, "#565463", "center");
      fonts().small.draw(ctx, "YET", x + w / 2, y + h / 2, "#565463", "center");
    }
  }

  private drawStrip(ctx: CanvasRenderingContext2D, s: StripRect, state: BoardState) {
    const ch = state.channels[s.id];
    rect(ctx, s.x, s.y, s.w, s.h, DESK_LO);
    ctx.strokeStyle = "#1c1a24";
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);

    // The person, not the instrument — the stage-to-strip mapping the player
    // actually learns is "that one, over there" (doc 6.2.1).
    // A drawn instrument mark and the person's name. The name is what maps to a
    // position on stage (doc 6.2.1); the mark says which channel without
    // spending the width that a second word would.
    screwedPlate(ctx, s.x + 3, s.y + 2, s.w - 6, 10, "");
    drawInstrumentMark(ctx, s.id, s.x + 7, s.y + 4);
    fonts().small.draw(ctx, CHANNEL_PLAYER[s.id], s.x + s.w - 6, s.y + 3, INK, "right");

    knob(ctx, s.tone.cx, s.tone.cy, s.tone.r, ch.tone, NEUTRAL_RANGE.tone, "#e8c821");
    knob(ctx, s.pan.cx, s.pan.cy, s.pan.r, ch.pan, NEUTRAL_RANGE.pan, "#3fa0d8");
    const f = fonts().small;
    f.draw(ctx, "TONE", s.tone.cx, s.tone.cy + s.tone.r + 2, "#a49eb0", "center");
    f.draw(ctx, "PAN", s.pan.cx, s.pan.cy + s.pan.r + 2, "#a49eb0", "center");

    button(ctx, s.fx.x, s.fx.y, s.fx.w, s.fx.h, "FX", ch.fx, "#a05fc0");
    button(ctx, s.solo.x, s.solo.y, s.solo.w, s.solo.h, "SOLO", state.solo === s.id, "#e8621f");

    // Fader track: ruled, because it is machined. Everything around it is not.
    const t = s.fader;
    rect(ctx, t.x, t.y, t.w, t.h, "#22202a");
    ctx.strokeStyle = "#12101a";
    ctx.strokeRect(t.x + 0.5, t.y + 0.5, t.w - 1, t.h - 1);
    line(ctx, [t.x + t.w / 2, t.y + 2], [t.x + t.w / 2, t.y + t.h - 2], "#0d0c14", 2);
    // Scale marks, so travel is legible without any numbers.
    for (let i = 1; i < 8; i++) {
      const y = t.y + (t.h * i) / 8;
      line(ctx, [t.x + 1, y], [t.x + 4, y], "#3a3644", 1);
      line(ctx, [t.x + t.w - 4, y], [t.x + t.w - 1, y], "#3a3644", 1);
    }

    // Neutral band — the fader's defined home (doc 2.2).
    const nTop = t.y + (1 - (NEUTRAL.volume + NEUTRAL_RANGE.volume)) * t.h;
    const nBot = t.y + (1 - (NEUTRAL.volume - NEUTRAL_RANGE.volume)) * t.h;
    rect(ctx, t.x - 4, nTop, 3, nBot - nTop, "#e8c821");
    rect(ctx, t.x + t.w + 1, nTop, 3, nBot - nTop, "#e8c821");

    const capY = t.y + (1 - ch.volume) * t.h;
    rect(ctx, t.x - 4, capY - 5, t.w + 8, 11, "#d8d2bc");
    ctx.strokeStyle = OUT;
    ctx.strokeRect(t.x - 3.5, capY - 4.5, t.w + 7, 10);
    line(ctx, [t.x - 3, capY], [t.x + t.w + 3, capY], "#8a8272", 1);
  }

  private drawMeter(
    ctx: CanvasRenderingContext2D,
    r: { x: number; y: number; w: number; h: number },
    energy: number,
  ) {
    rect(ctx, r.x - 1, r.y - 1, r.w + 2, r.h + 2, "#22202a");
    rect(ctx, r.x, r.y, r.w, r.h, "#171622");
    const fillW = Math.max(0, (energy / 100) * r.w);
    // Colour is a second readout of the same number. No numeric score anywhere
    // during a gig (doc 7.1).
    const col = energy >= 75 ? "#3fd06a" : energy >= 50 ? "#e8c821" : energy >= 25 ? "#e8621f" : "#c8341f";
    rect(ctx, r.x, r.y, fillW, r.h, col);
    for (let x = r.x + 2; x < r.x + fillW; x += 5) {
      rect(ctx, x, r.y, 1, r.h, "#00000030");
    }
    // The threshold is a place, not a number, and it never moves (doc 7.3).
    const tx = r.x + r.w * 0.5;
    rect(ctx, tx - 1, r.y - 2, 2, r.h + 4, "#f0ece0");
    poly(
      ctx,
      [
        [tx - 3, r.y - 2],
        [tx + 3, r.y - 2],
        [tx, r.y + 1],
      ],
      "#f0ece0",
    );
    ctx.strokeStyle = "#0d0c14";
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    fonts().small.draw(ctx, "THE ROOM", r.x + 4, r.y + 2, "#00000099");
    fonts().small.draw(ctx, "PASS", tx + 5, r.y + 2, "#f0ece0");
  }

  private drawProgress(
    ctx: CanvasRenderingContext2D,
    r: { x: number; y: number; w: number; h: number },
    progress: number,
  ) {
    rect(ctx, r.x, r.y, r.w, r.h, "#22202a");
    rect(ctx, r.x, r.y, r.w * progress, r.h, "#8a8494");
  }

  private drawTray(
    ctx: CanvasRenderingContext2D,
    r: { x: number; y: number; w: number; h: number },
    items: { id: string; count: number; label: string }[],
  ) {
    rect(ctx, r.x, r.y, r.w, r.h, DESK_LO);
    ctx.strokeStyle = "#1c1a24";
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    if (items.length === 0) {
      fonts().small.draw(ctx, "NOTHING", r.x + r.w / 2, r.y + r.h / 2 - 8, "#4e4c5a", "center");
      fonts().small.draw(ctx, "IN BAG", r.x + r.w / 2, r.y + r.h / 2 + 1, "#4e4c5a", "center");
      return;
    }
    items.slice(0, 2).forEach((it, i) => {
      const x = r.x + 3;
      const y = r.y + 2 + i * 30;
      ctx.globalAlpha = it.count > 0 ? 1 : 0.3;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.78, 0.78);
      drawConsumable(ctx, it.id, 0, 0);
      ctx.restore();
      if (it.count > 1) {
        fonts().small.draw(ctx, `x${it.count}`, x + 45, y + 15, "#f0ece0", "right");
      }
      ctx.globalAlpha = 1;
    });
  }

  private drawNote(
    ctx: CanvasRenderingContext2D,
    r: { x: number; y: number; w: number; h: number },
    text: string,
    live: boolean,
  ) {
    // The sticky note lives on the board, not the stage, because the stage's
    // visual language is "movement means a problem" (doc 16.4).
    const flash = live && Math.floor(performance.now() / 220) % 2 === 0;
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.rotate(-0.035);
    const w = r.w;
    const h = r.h;
    poly(
      ctx,
      [
        [-w / 2, -h / 2 + 1],
        [w / 2, -h / 2],
        [w / 2 - 1, h / 2],
        [-w / 2 + 1, h / 2 - 1],
      ],
      flash ? "#fff6a0" : "#e8d96a",
      "#a89b3c",
    );
    fonts().small.drawWrapped(ctx, text, 0, -h / 2 + 4, w - 10, "#3a3020", 2, "center");
    ctx.restore();
  }

  private drawScribbles(
    ctx: CanvasRenderingContext2D,
    r: { x: number; y: number; w: number; h: number },
  ) {
    // Empty desk space is not empty. Somebody has written on it.
    const f = fonts().small;
    f.draw(ctx, "DO NOT TOUCH ANYTHING", r.x + 4, r.y + 6, "#5a5866");
    f.draw(ctx, "— GAZ", r.x + 4, r.y + 16, "#5a5866");
    line(ctx, [r.x + 2, r.y + 26], [r.x + r.w - 20, r.y + 24], "#4e4c5a", 1);
    line(ctx, [r.x + 2, r.y + 30], [r.x + r.w - 42, r.y + 29], "#4e4c5a", 1);
  }
}

/** Ten pixels of instrument, stamped on the channel plate. */
function drawInstrumentMark(ctx: CanvasRenderingContext2D, id: ChannelId, x: number, y: number) {
  switch (id) {
    case "guitar":
      poly(
        ctx,
        [
          [x, y + 2],
          [x + 4, y + 1],
          [x + 5, y + 6],
          [x + 1, y + 7],
        ],
        INK,
      );
      line(ctx, [x + 4, y + 3], [x + 11, y + 2], INK, 1.4);
      break;
    case "drums":
      ellipse(ctx, x + 5, y + 4, 5, 3.4, INK);
      line(ctx, [x, y], [x + 4, y + 3], INK, 1.2);
      line(ctx, [x + 10, y], [x + 6, y + 3], INK, 1.2);
      break;
    case "bass":
      poly(
        ctx,
        [
          [x, y + 3],
          [x + 3, y + 2],
          [x + 4, y + 6],
          [x + 1, y + 7],
        ],
        INK,
      );
      line(ctx, [x + 3, y + 4], [x + 12, y + 2], INK, 1.6);
      break;
  }
}

export function drawConsumable(ctx: CanvasRenderingContext2D, id: string, x: number, y: number) {
  switch (id) {
    case "airhorn":
      rect(ctx, x + 10, y + 10, 14, 22, "#c8341f");
      ctx.strokeStyle = OUT;
      ctx.strokeRect(x + 10.5, y + 10.5, 13, 21);
      poly(
        ctx,
        [
          [x + 12, y + 10],
          [x + 22, y + 10],
          [x + 25, y + 2],
          [x + 9, y + 2],
        ],
        "#e8621f",
        OUT,
      );
      rect(ctx, x + 12, y + 16, 10, 5, "#f0ece0");
      break;
    case "gaffer":
      ellipse(ctx, x + 17, y + 20, 13, 12, "#3a3644", OUT);
      ellipse(ctx, x + 17, y + 20, 5, 4.5, "#8a8272", OUT);
      ellipse(ctx, x + 13, y + 15, 4, 3, "#4e4a58");
      break;
    case "sandwich":
      poly(
        ctx,
        [
          [x + 4, y + 28],
          [x + 30, y + 26],
          [x + 17, y + 8],
        ],
        "#e8d9a0",
        OUT,
      );
      poly(
        ctx,
        [
          [x + 8, y + 24],
          [x + 26, y + 23],
          [x + 17, y + 14],
        ],
        "#f2e8b0",
        "#c9b878",
      );
      line(ctx, [x + 9, y + 21], [x + 25, y + 20], "#8fbf60", 2);
      break;
    default:
      rect(ctx, x + 8, y + 8, 20, 20, "#8a8272");
  }
}
