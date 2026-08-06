// The store is the manager's computer (doc 13.3). Click it and the monitor
// swivels round, and what is on it is a 1997 shopping website: table layout,
// visited-link purple, a spinning thing, categories down the left.

import type { App } from "../app.ts";
import { chrome } from "../audio/sfx.ts";
import { fonts } from "../core/font.ts";
import { money, ScrollRegion, uiButton, type Rect } from "../core/ui.ts";
import { ellipse, line, poly, rect } from "../art/draw.ts";
import { CATEGORY_LABEL, ITEMS, type Item, type ItemCategory } from "../data/items.ts";

const OUT = "#171018";
const PAGE = "#c9c9c9";
const LINK = "#0000cc";
const VISITED = "#7a1fa2";

const CATS: ItemCategory[] = ["gear", "consumable", "wearable"];

export class StorePanel {
  private cat: ItemCategory = "gear";
  private selected: string | null = null;
  private scroll = new ScrollRegion();
  private time = 0;
  private visited = new Set<string>();
  private toast: { text: string; t: number } | null = null;

  update(dt: number) {
    this.time += dt;
    if (this.toast) {
      this.toast.t -= dt;
      if (this.toast.t <= 0) this.toast = null;
    }
  }

  private available(app: App): Item[] {
    const passed = app.profile.passed.length;
    return ITEMS.filter((i) => i.category === this.cat && i.showAfter <= passed + 1);
  }

  private buy(app: App, item: Item) {
    const p = app.profile;
    if (item.teaser) {
      this.toast = { text: "OUT OF STOCK. GAZ SAYS 'SOON'.", t: 2.4 };
      chrome.deny(app.engine);
      return;
    }
    if (p.money < item.price) {
      this.toast = { text: "INSUFFICIENT FUNDS. PLAY SOMETHING.", t: 2.4 };
      chrome.deny(app.engine);
      return;
    }
    if (item.category === "consumable") {
      p.money -= item.price;
      p.stock[item.id] = (p.stock[item.id] ?? 0) + 1;
    } else {
      if (p.owned.includes(item.id)) return;
      p.money -= item.price;
      p.owned.push(item.id);
      if (item.category === "wearable" && item.wearer) p.equipped[item.wearer] = item.id;
    }
    app.commit();
    chrome.cash(app.engine);
    this.toast = { text: "THANK YOU FOR YOUR ORDER.", t: 2.4 };
  }

  /** Returns true when the player closes the store. */
  draw(ctx: CanvasRenderingContext2D, app: App): boolean {
    const f = fonts();
    // Monitor bezel — we are looking at a CRT, not a menu.
    rect(ctx, 0, 0, 480, 270, "#2a2620");
    rect(ctx, 6, 4, 468, 250, "#d0c6a8");
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1;
    ctx.strokeRect(6.5, 4.5, 467, 249);
    rect(ctx, 200, 256, 80, 8, "#c9bfa0");
    f.small.draw(ctx, "TRUNDLETRON 486", 22, 244, "#8a8272");

    const page: Rect = { x: 18, y: 14, w: 444, h: 224 };
    rect(ctx, page.x, page.y, page.w, page.h, PAGE);
    // Scanlines, because it is a CRT and we are not going to pretend otherwise.
    ctx.globalAlpha = 0.12;
    for (let y = page.y; y < page.y + page.h; y += 2) rect(ctx, page.x, y, page.w, 1, "#000000");
    ctx.globalAlpha = 1;

    // Header.
    rect(ctx, page.x, page.y, page.w, 26, "#000080");
    f.big.draw(ctx, "GAZ'S GEAR EXCHANGE", page.x + 8, page.y + 4, "#ffff00");
    f.small.draw(ctx, "\"EVERYTHING MUST GO (EVENTUALLY)\"", page.x + 8, page.y + 18, "#00ffff");
    // The spinning thing. Every site had one.
    const spin = this.time * 3;
    ctx.save();
    ctx.translate(page.x + page.w - 22, page.y + 13);
    ctx.rotate(spin);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      poly(
        ctx,
        [
          [0, 0],
          [9, -3],
          [9, 3],
        ],
        ["#ff0000", "#00ff00", "#0000ff", "#ffff00"][i],
      );
    }
    ctx.restore();
    f.small.draw(ctx, `YOU HAVE ${money(app.profile.money)}`, page.x + page.w - 40, page.y + 10, "#ffffff", "right");

    // Left nav.
    const nav: Rect = { x: page.x + 4, y: page.y + 30, w: 96, h: page.h - 34 };
    rect(ctx, nav.x, nav.y, nav.w, nav.h, "#b0b0b0");
    ctx.strokeStyle = "#808080";
    ctx.strokeRect(nav.x + 0.5, nav.y + 0.5, nav.w - 1, nav.h - 1);
    f.small.draw(ctx, "DEPARTMENTS", nav.x + 4, nav.y + 4, "#000000");
    line(ctx, [nav.x + 4, nav.y + 13], [nav.x + nav.w - 6, nav.y + 13], "#808080", 1);
    CATS.forEach((c, i) => {
      const r: Rect = { x: nav.x + 4, y: nav.y + 18 + i * 14, w: nav.w - 10, h: 12 };
      const active = this.cat === c;
      const col = active ? "#000000" : this.visited.has(c) ? VISITED : LINK;
      f.small.draw(ctx, `> ${CATEGORY_LABEL[c]}`, r.x, r.y + 1, col);
      if (active) {
        const tw = f.small.measure(CATEGORY_LABEL[c]);
        line(ctx, [r.x + 8, r.y + f.small.height + 1], [r.x + 8 + tw, r.y + f.small.height + 1], col, 1);
      }
      if (app.input.tapIn(r.x, r.y - 2, r.w, r.h)) {
        this.cat = c;
        this.visited.add(c);
        this.selected = null;
        this.scroll.offset = 0;
        chrome.click(app.engine);
      }
    });

    f.small.draw(ctx, "BEST VIEWED IN", nav.x + 4, nav.y + nav.h - 24, "#404040");
    f.small.draw(ctx, "ANY BROWSER", nav.x + 4, nav.y + nav.h - 15, "#404040");
    f.small.draw(ctx, "AT ALL", nav.x + 4, nav.y + nav.h - 6, "#404040");

    // Item table.
    const list: Rect = { x: nav.x + nav.w + 6, y: nav.y, w: page.w - nav.w - 18, h: 108 };
    rect(ctx, list.x, list.y, list.w, list.h, "#e0e0e0");
    ctx.strokeStyle = "#808080";
    ctx.strokeRect(list.x + 0.5, list.y + 0.5, list.w - 1, list.h - 1);

    const items = this.available(app);
    const rowH = 24;
    this.scroll.update(app.input, list, items.length * rowH + 4);

    ctx.save();
    ctx.beginPath();
    ctx.rect(list.x + 1, list.y + 1, list.w - 2, list.h - 2);
    ctx.clip();
    items.forEach((item, i) => {
      const y = list.y + 3 + i * rowH - this.scroll.offset;
      if (y > list.y + list.h || y + rowH < list.y) return;
      const owned = app.profile.owned.includes(item.id);
      const stock = app.profile.stock[item.id] ?? 0;
      const sel = this.selected === item.id;
      if (sel) rect(ctx, list.x + 2, y - 1, list.w - 6, rowH - 2, "#c0d0e8");
      // Alternating table rows, obviously.
      else if (i % 2 === 1) rect(ctx, list.x + 2, y - 1, list.w - 6, rowH - 2, "#d6d6d6");

      const dim = item.teaser;
      f.small.draw(ctx, item.name, list.x + 6, y + 1, dim ? "#707070" : sel ? "#000080" : "#101010");
      f.small.draw(
        ctx,
        item.teaser ? "OUT OF STOCK" : money(item.price),
        list.x + list.w - 6,
        y + 1,
        dim ? "#707070" : "#008000",
        "right",
      );
      const tag = owned
        ? item.category === "wearable"
          ? app.profile.equipped[item.wearer ?? "guitar"] === item.id
            ? "WORN"
            : "OWNED"
          : "OWNED"
        : stock > 0
          ? `IN BAG x${stock}`
          : "";
      if (tag) f.small.draw(ctx, tag, list.x + 6, y + 11, "#7a1fa2");

      const btn: Rect = { x: list.x + list.w - 52, y: y + 9, w: 46, h: 12 };
      if (item.category === "wearable" && owned) {
        const wearing = app.profile.equipped[item.wearer ?? "guitar"] === item.id;
        if (uiButton(ctx, app.input, btn, wearing ? "TAKE OFF" : "PUT ON", { color: "#808080", small: true })) {
          app.profile.equipped[item.wearer ?? "guitar"] = wearing ? null : item.id;
          app.commit();
          chrome.toggle(app.engine, !wearing);
        }
      } else if (!owned || item.category === "consumable") {
        if (uiButton(ctx, app.input, btn, "ORDER", { color: item.teaser ? "#909090" : "#c8341f", small: true })) {
          this.selected = item.id;
          this.buy(app, item);
        }
      }

      if (app.input.tapIn(list.x + 2, y - 1, list.w - 60, rowH - 2)) {
        this.selected = item.id;
        chrome.click(app.engine);
      }
    });
    ctx.restore();
    this.scroll.drawBar(ctx, list);

    // Description pane — the actual comedy vehicle (doc 13.3).
    const desc: Rect = { x: list.x, y: list.y + list.h + 6, w: list.w, h: 66 };
    rect(ctx, desc.x, desc.y, desc.w, desc.h, "#ffffff");
    ctx.strokeStyle = "#808080";
    ctx.strokeRect(desc.x + 0.5, desc.y + 0.5, desc.w - 1, desc.h - 1);
    const sel = items.find((i) => i.id === this.selected) ?? items[0];
    if (sel) {
      f.small.draw(ctx, sel.name, desc.x + 6, desc.y + 4, "#000080");
      f.small.drawWrapped(ctx, sel.desc, desc.x + 6, desc.y + 15, desc.w - 14, "#202020", 2);
    }

    if (this.toast) {
      rect(ctx, page.x + 120, page.y + 100, 200, 20, "#ffff88");
      ctx.strokeStyle = "#000000";
      ctx.strokeRect(page.x + 120.5, page.y + 100.5, 199, 19);
      f.body.draw(ctx, this.toast.text, page.x + 220, page.y + 105, "#000000", "center");
    }

    const back: Rect = { x: 342, y: 244, w: 128, h: 20 };
    if (uiButton(ctx, app.input, back, "SWIVEL IT BACK", { color: "#3a6ea8" })) {
      chrome.back(app.engine);
      return true;
    }
    return false;
  }
}

/** Small decorative computer used on the office screen. */
export function drawCrtGlow(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.globalAlpha = 0.2 + Math.sin(t * 3) * 0.05;
  ellipse(ctx, x, y, 22, 14, "#7ad0ff");
  ctx.globalAlpha = 1;
}
