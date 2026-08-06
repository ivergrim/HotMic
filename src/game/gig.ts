// A gig. Doc 4: the band plays, something goes wrong, you notice, you fix it,
// you put it back.

import type { App, GameScreen } from "../app.ts";
import type { ChannelId } from "../audio/engine.ts";
import { chrome, CrowdVoice, inject, type Injection } from "../audio/sfx.ts";
import { Transport } from "../audio/transport.ts";
import { SECONDS_PER_BAR, sectionSpans, TOTAL_BARS, type SectionName } from "../audio/song.ts";
import { fonts } from "../core/font.ts";
import { mulberry32 } from "../core/rng.ts";
import { ellipse, poly, rect } from "../art/draw.ts";
import { VENUES, venueById, venueIndex, type Venue } from "../data/venues.ts";
import { itemById } from "../data/items.ts";
import { jobById, type SideJob } from "../data/sidejobs.ts";
import { Board } from "./board.ts";
import {
  DRAIN_PER_INTENSITY,
  DRIFT_DRAIN,
  fixSatisfied,
  payoffTargets,
  SPEED_BONUS,
  type EventDef,
} from "./events.ts";
import { planGig, type PlannedEvent } from "./scheduler.ts";
import { Stage, type CueState } from "./stage.ts";
import {
  CHANNEL_ORDER,
  channelAtNeutral,
  freshBoard,
  masterAtNeutral,
  offNeutralAmount,
  type BoardState,
} from "./state.ts";
import { Debrief } from "./debrief.ts";

type Phase = "armed" | "setup" | "resolved" | "payoff" | "done";

interface LiveEvent {
  def: EventDef;
  at: number;
  phase: Phase;
  /** Seconds spent in the current phase. */
  clock: number;
  firedAt: number;
  injection: Injection | null;
  /** True if this event ever ran past its grace period. */
  wasLate: boolean;
  /** True if the setup beat was never resolved at all. */
  missed: boolean;
  payoffMissed: boolean;
}

const PAYOFF_TIMEOUT = 14;
const COUNT_IN = 2.2;

export class GigScreen implements GameScreen {
  private venue: Venue;
  private job: SideJob | null;
  private transport!: Transport;
  private crowd!: CrowdVoice;
  private stage!: Stage;
  private board!: Board;
  private state: BoardState = freshBoard();
  private live: LiveEvent[] = [];
  private plan: PlannedEvent[] = [];
  private energy = 100;
  private ended = false;
  private failed = false;
  private started = false;
  private countdown = COUNT_IN;
  private time = 0;
  private stageH: number;
  private channels: ChannelId[];
  private quietUntil = 0;

  // Board interference — the beer (doc 9).
  private spill: { x: number; y: number; r: number; wet: number; active: boolean } | null = null;

  // Side job progress.
  private jobHeld = 0;
  private jobDone = false;
  private jobWindow: { start: number; end: number } | null = null;

  constructor(venueId: string, jobId: string | null) {
    this.venue = venueById(venueId);
    this.job = jobId ? (jobById(jobId) ?? null) : null;
    if (this.job && this.job.venue !== venueId) this.job = null;
    this.stageH = Math.round(270 * this.venue.stageSplit);
    this.channels = CHANNEL_ORDER.slice(0, this.venue.members);
  }

  enter(app: App) {
    const e = app.engine;
    for (const id of this.channels) e.ensureChannel(id);

    this.transport = new Transport(e);
    this.crowd = new CrowdVoice(e);
    this.stage = new Stage(this.venue, this.stageH);
    this.board = new Board(this.stageH, 270 - this.stageH, this.channels);

    this.pushAllToAudio(app);
    e.setSolo(null);

    const rng = mulberry32((Date.now() ^ (this.venue.seed * 2654435761)) >>> 0);
    this.plan = planGig(this.venue, venueIndex(this.venue.id), rng);
    this.live = this.plan.map((p) => ({
      def: p.def,
      at: p.at,
      phase: "armed" as Phase,
      clock: 0,
      firedAt: 0,
      injection: null,
      wasLate: false,
      missed: false,
      payoffMissed: false,
    }));

    if (this.job?.window) {
      const spans = sectionSpans().filter((s) => s.name === this.job!.window!.section);
      const span = spans[this.job.window.occurrence];
      if (span) {
        this.jobWindow = {
          start: span.startBar * SECONDS_PER_BAR,
          end: span.endBar * SECONDS_PER_BAR,
        };
      }
    }

    this.crowd.start();
    this.crowd.setEnergy(100);
    void e.resume();
  }

  exit(app: App) {
    this.transport.stop();
    this.crowd.stop();
    for (const l of this.live) l.injection?.stop();
    for (const id of this.channels) app.engine.resetChannelSource(id);
    app.engine.setSolo(null);
    app.engine.setHouseMusic(false);
    app.engine.setMaster(0.75);
  }

  private pushAllToAudio(app: App) {
    const e = app.engine;
    for (const id of this.channels) {
      const c = this.state.channels[id];
      e.setFader(id, c.volume);
      e.setTone(id, c.tone);
      e.setPan(id, c.pan);
      e.setFx(id, c.fx);
    }
    e.setMaster(this.state.master);
  }

  // --- Update ---------------------------------------------------------------

  update(dt: number, app: App) {
    this.time += dt;

    if (!this.started) {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.started = true;
        this.transport.start(this.venue.members);
        this.transport.onFinished = () => this.finish(app, false);
      }
      return;
    }

    const songTime = this.transport.position;

    if (!this.ended) {
      const consumables = this.consumableSlots(app);
      this.board.update(
        app.input,
        this.state,
        {
          onToggleFx: (id, on) => {
            app.engine.setFx(id, on);
            chrome.toggle(app.engine, on);
          },
          onToggleSolo: (id) => {
            app.engine.setSolo(id);
            chrome.toggle(app.engine, id !== null);
          },
          onToggleHouse: (on) => {
            this.transport.setHouse(on);
            chrome.toggle(app.engine, on);
          },
          onToggleRecord: () => chrome.click(app.engine),
          onUseConsumable: (id) => this.useConsumable(app, id),
          onDeny: () => chrome.deny(app.engine),
        },
        { consumables },
      );

      // Push control positions into the audio graph every frame — these are
      // real nodes, not a simulation of one.
      const e = app.engine;
      for (const id of this.channels) {
        const c = this.state.channels[id];
        e.setFader(id, c.volume);
        e.setTone(id, c.tone);
        e.setPan(id, c.pan);
      }
      e.setMaster(this.state.master);

      this.updateSpill(app);
      this.updateEvents(app, songTime, dt);
      this.updateEnergy(dt);
      this.updateJob(app, songTime, dt);
      this.crowd.setEnergy(this.energy);

      if (this.energy <= 0) {
        this.energy = 0;
        this.finish(app, true);
      }
    }
  }

  private consumableSlots(app: App) {
    return Object.entries(app.profile.stock)
      .filter(([, n]) => n > 0)
      .slice(0, 2)
      .map(([id, n]) => ({ id, count: n, label: itemById(id).name }));
  }

  private useConsumable(app: App, id: string) {
    if ((app.profile.stock[id] ?? 0) <= 0) return;
    app.profile.stock[id] -= 1;
    app.commit();
    const item = itemById(id);
    switch (item.effect) {
      case "energy":
        this.energy = Math.min(100, this.energy + 14);
        chrome.fanfare(app.engine);
        break;
      case "clear": {
        // Kills one active problem outright, whatever it is.
        const target = this.live.find((l) => l.phase === "setup" || l.phase === "resolved");
        if (target) {
          this.endProblem(app, target, true);
          target.phase = "done";
        }
        chrome.wipe(app.engine);
        break;
      }
      case "quiet":
        this.quietUntil = this.transport.position + 15;
        chrome.cash(app.engine);
        break;
      default:
        break;
    }
  }

  // --- Events ---------------------------------------------------------------

  private startProblem(app: App, l: LiveEvent) {
    l.phase = "setup";
    l.clock = 0;
    l.firedAt = this.transport.position;
    const a = l.def.audio;
    if (a) {
      const ch = (a.injectOn ?? (l.def.slot as ChannelId)) as ChannelId;
      if (a.sourceTrim !== undefined && this.channels.includes(ch)) {
        app.engine.setSourceTrim(ch, a.sourceTrim);
      }
      if (a.sourceTilt !== undefined && this.channels.includes(ch)) {
        app.engine.setSourceTilt(ch, a.sourceTilt);
      }
      if (a.inject && this.channels.includes(ch)) {
        l.injection = inject(app.engine, a.inject, ch);
      }
      if (a.bandStops) this.transport.setBandPlaying(false);
    }
    if (l.def.fix.kind === "wipe") {
      const layout = this.board.layout;
      const strips = layout.strips;
      const cx = strips.length > 1 ? strips[1].x + strips[1].w / 2 : strips[0].x + strips[0].w / 2;
      this.spill = { x: cx + 26, y: layout.strips[0].y + 44, r: 46, wet: 1, active: true };
      chrome.splat(app.engine);
    }
  }

  private endProblem(app: App, l: LiveEvent, silent = false) {
    l.injection?.stop();
    l.injection = null;
    const a = l.def.audio;
    if (a) {
      const ch = (a.injectOn ?? (l.def.slot as ChannelId)) as ChannelId;
      if (this.channels.includes(ch)) app.engine.resetChannelSource(ch);
      if (a.bandStops) this.transport.setBandPlaying(true);
    }
    if (l.def.fix.kind === "wipe" && this.spill) this.spill.active = false;
    if (!silent) {
      /* the stage animation carries it; no sting needed */
    }
  }

  private updateEvents(app: App, songTime: number, dt: number) {
    const grace = this.venue.grace;

    for (const l of this.live) {
      const g = grace * (l.def.graceScale ?? 1);

      switch (l.phase) {
        case "armed":
          // The sandwich buys a window where nothing new fires (doc 14.3).
          if (songTime >= l.at && songTime >= this.quietUntil) this.startProblem(app, l);
          break;

        case "setup": {
          l.clock += dt;
          const solved = fixSatisfied(l.def.fix, this.state, this.spill ? this.spill.wet <= 0.05 : false);
          if (solved) {
            if (l.clock <= g) {
              this.energy = Math.min(100, this.energy + SPEED_BONUS[l.def.intensity]);
            }
            l.phase = "resolved";
            l.clock = 0;
          } else if (l.clock > g) {
            l.wasLate = true;
          }
          break;
        }

        case "resolved":
          l.clock += dt;
          break;

        case "payoff": {
          l.clock += dt;
          if (this.payoffSatisfied(l)) {
            if (l.clock <= g) {
              this.energy = Math.min(100, this.energy + SPEED_BONUS[l.def.intensity]);
            }
            l.phase = "done";
          } else if (l.clock > g) {
            l.payoffMissed = true;
            // After a while stop double-charging: the off-neutral drift takes
            // over as the reminder that something is still off the board.
            if (l.clock > PAYOFF_TIMEOUT) l.phase = "done";
          }
          break;
        }

        default:
          break;
      }

      // The problem passes on its own schedule, fixed or not.
      if (
        (l.phase === "setup" || l.phase === "resolved") &&
        songTime >= l.firedAt + l.def.hold
      ) {
        const wasResolved = l.phase === "resolved";
        this.endProblem(app, l);
        if (wasResolved) {
          l.phase = "payoff";
          l.clock = 0;
        } else {
          l.missed = true;
          l.phase = "done";
        }
      }
    }
  }

  private payoffSatisfied(l: LiveEvent): boolean {
    const t = payoffTargets(l.def.fix);
    for (const id of t.channels) {
      if (!this.channels.includes(id)) continue;
      if (!channelAtNeutral(this.state.channels[id])) return false;
    }
    if (t.master && !masterAtNeutral(this.state)) return false;
    if (t.solo && this.state.solo !== null) return false;
    if (t.house && this.state.house) return false;
    return true;
  }

  // --- Energy ---------------------------------------------------------------

  private updateEnergy(dt: number) {
    let drain = 0;
    const excusedChannels = new Set<ChannelId>();
    let excusedMaster = false;
    let excusedSolo = false;
    let excusedHouse = false;

    for (const l of this.live) {
      const active = l.phase === "setup" || l.phase === "resolved" || l.phase === "payoff";
      if (!active) continue;
      // While an event is live, the channel it owns is allowed to sit off
      // neutral without also collecting the drift nag on top.
      const t = payoffTargets(l.def.fix);
      for (const id of t.channels) excusedChannels.add(id);
      if (t.master) excusedMaster = true;
      if (t.solo) excusedSolo = true;
      if (t.house) excusedHouse = true;

      const late = l.phase === "setup" ? l.wasLate : l.phase === "payoff" ? l.payoffMissed : false;
      if (late) drain += DRAIN_PER_INTENSITY[l.def.intensity];
    }

    // A channel off neutral with nothing to justify it (doc 2.2).
    for (const id of this.channels) {
      if (excusedChannels.has(id)) continue;
      const amt = offNeutralAmount(this.state.channels[id]);
      if (amt > 0) drain += DRIFT_DRAIN * Math.min(1, amt);
    }
    if (!excusedMaster && !masterAtNeutral(this.state)) drain += DRIFT_DRAIN;
    // Solo goes to the house, so holding it is never free (doc 5.3).
    if (!excusedSolo && this.state.solo !== null) drain += DRIFT_DRAIN * 3;
    if (!excusedHouse && this.state.house) drain += DRIFT_DRAIN * 2;

    this.energy = Math.max(0, this.energy - drain * dt);
  }

  // --- Side job -------------------------------------------------------------

  private updateJob(app: App, songTime: number, dt: number) {
    const job = this.job;
    if (!job || this.jobDone) return;
    if (job.kind === "mark") return;
    if (!this.jobWindow || !job.condition || !job.hold) return;
    if (songTime < this.jobWindow.start || songTime > this.jobWindow.end) return;
    if (job.condition(this.state)) {
      this.jobHeld += dt;
      if (this.jobHeld >= job.hold) {
        this.jobDone = true;
        chrome.cash(app.engine);
      }
    }
  }

  private jobLive(songTime: number): boolean {
    if (!this.job || this.jobDone) return false;
    if (this.job.kind === "mark") return false;
    if (!this.jobWindow) return false;
    return songTime >= this.jobWindow.start && songTime <= this.jobWindow.end;
  }

  // --- Board interference ---------------------------------------------------

  private updateSpill(app: App) {
    const s = this.spill;
    if (!s || !s.active || s.wet <= 0) return;
    for (const p of app.input.all()) {
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      if (dx * dx + dy * dy > s.r * s.r) continue;
      const moved = Math.abs(p.dx) + Math.abs(p.dy);
      if (moved > 0.1) {
        // Clearing it has an obvious affordance: drag across it (doc 9.4.3).
        s.wet = Math.max(0, s.wet - moved * 0.011);
        if (Math.random() < 0.25) chrome.wipe(app.engine);
      }
      // A pointer inside the spill is wiping, not mixing.
      p.claim = p.claim ?? "spill";
    }
  }

  // --- Ending ---------------------------------------------------------------

  private finish(app: App, hardFail: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.failed = hardFail || this.energy < 50;
    this.transport.stop();
    for (const l of this.live) {
      if (l.phase === "setup" || l.phase === "resolved") this.endProblem(app, l);
    }

    const score = Math.round(this.energy);
    const passed = score >= 50;
    if (this.job?.kind === "mark" && this.job.targetScore !== undefined) {
      this.jobDone = score >= this.job.targetScore;
    }

    const payout = passed ? Math.round((this.venue.topFee * score) / 100) : 0;
    const jobPay = this.jobDone && this.job ? this.job.fee : 0;

    const p = app.profile;
    p.money += payout + jobPay;
    p.best[this.venue.id] = Math.max(p.best[this.venue.id] ?? 0, score);
    if (passed && !p.passed.includes(this.venue.id)) p.passed.push(this.venue.id);
    if (this.jobDone && this.job) {
      if (!p.doneJobs.includes(this.job.id)) p.doneJobs.push(this.job.id);
      if (p.activeJob === this.job.id) p.activeJob = null;
    }
    app.commit();

    if (hardFail) this.crowd.boo();
    setTimeout(() => (passed ? chrome.fanfare(app.engine) : chrome.gloom(app.engine)), 260);

    const missed = this.live
      .filter((l) => l.missed || l.payoffMissed)
      .map((l) => ({ label: l.def.label, lesson: l.def.lesson, missedPayoff: !l.missed }));

    setTimeout(() => {
      app.go(
        new Debrief({
          venue: this.venue,
          score,
          passed,
          hardFail,
          payout,
          jobPay,
          job: this.job,
          jobDone: this.jobDone,
          missed,
          nextVenue: VENUES[venueIndex(this.venue.id) + 1]?.id ?? null,
        }),
      );
    }, 1500);
  }

  // --- Draw -----------------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D, app: App) {
    const songTime = this.started ? this.transport.position : -this.countdown;
    const cues: CueState[] = [];
    for (const l of this.live) {
      if (l.phase === "setup") {
        const g = this.venue.grace * (l.def.graceScale ?? 1);
        cues.push({
          id: l.def.id,
          visual: l.def.visual,
          phase: "setup",
          urgency: l.clock <= g ? 0 : Math.min(1, (l.clock - g) / 2.5),
          age: l.clock,
          channel: this.channelOf(l.def),
        });
      } else if (l.phase === "resolved") {
        // Problem still happening on stage, but handled — keep the cause visible
        // without the alarm, so the player can see why the fader is where it is.
        cues.push({
          id: l.def.id,
          visual: l.def.visual,
          phase: "setup",
          urgency: 0,
          age: l.clock + 2,
          channel: this.channelOf(l.def),
        });
      } else if (l.phase === "payoff") {
        const g = this.venue.grace * (l.def.graceScale ?? 1);
        cues.push({
          id: l.def.id,
          visual: l.def.visual,
          phase: "payoff",
          urgency: l.clock <= g ? 0 : Math.min(1, (l.clock - g) / 2.5),
          age: l.clock,
          channel: this.channelOf(l.def),
        });
      }
    }

    this.stage.draw(ctx, {
      barPhase: this.started ? this.transport.barPhase : 0,
      beatPhase: this.started ? this.transport.beatPhase : 0,
      time: this.time,
      energy: this.energy,
      cues,
      members: this.venue.members,
      bandPlaying: this.started && songTime >= 0 && !this.live.some((l) => l.def.audio?.bandStops && (l.phase === "setup" || l.phase === "resolved")),
      equipped: this.equippedArt(app),
    });

    const section = this.currentSection(songTime);
    this.board.draw(ctx, this.state, {
      energy: this.energy,
      progress: this.started ? this.transport.progress : 0,
      sectionLabel: this.started ? section : "SOUNDCHECK",
      venueName: this.venue.name,
      consumables: this.consumableSlots(app).map((c) => ({ ...c, label: c.label })),
      note: this.job
        ? {
            text: this.jobDone
              ? "DONE. DO NOT MENTION IT AGAIN."
              : this.jobLive(songTime) && this.job.liveNote
                ? this.job.liveNote
                : this.job.note,
            live: this.jobLive(songTime),
          }
        : null,
      recordArmed: true,
    });

    if (this.spill && this.spill.active && this.spill.wet > 0) this.drawSpill(ctx);
    if (!this.started) this.drawCountIn(ctx);
    if (this.ended) this.drawEndWash(ctx);
  }

  private equippedArt(app: App) {
    const map = (slot: "guitar" | "drums" | "bass") => {
      const id = app.profile.equipped[slot];
      if (!id) return null;
      try {
        return itemById(id).art ?? null;
      } catch {
        return null;
      }
    };
    return { guitar: map("guitar"), drums: map("drums"), bass: map("bass") };
  }

  private channelOf(def: EventDef): ChannelId | undefined {
    if (def.slot === "master" || def.slot === "board") return undefined;
    return def.slot;
  }

  private currentSection(songTime: number): SectionName | "OUTRO" | string {
    if (songTime < 0) return "COUNT IN";
    const bar = Math.floor(songTime / SECONDS_PER_BAR);
    if (bar >= TOTAL_BARS) return "THAT'S IT";
    for (const s of sectionSpans()) {
      if (bar >= s.startBar && bar < s.endBar) return s.name;
    }
    return "";
  }

  private drawSpill(ctx: CanvasRenderingContext2D) {
    const s = this.spill!;
    ctx.save();
    ctx.globalAlpha = 0.86;
    // A pint, gone over. Irregular, obviously liquid, obviously in the way.
    const lobes = 9;
    const pts: [number, number][] = [];
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2;
      const wobble = 0.72 + 0.3 * Math.sin(i * 2.3) + 0.12 * Math.sin(i * 5.1);
      const r = s.r * wobble * (0.45 + s.wet * 0.55);
      pts.push([s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.72]);
    }
    poly(ctx, pts, "#b8801f", "#7d5510");
    ctx.globalAlpha = 0.5;
    poly(
      ctx,
      pts.map(([x, y]) => [x * 0.97 + s.x * 0.03, y * 0.97 + s.y * 0.03] as [number, number]),
      "#e0a63a",
    );
    ctx.globalAlpha = 0.9;
    // Head on it. It was a full pint.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + s.wet;
      ellipse(ctx, s.x + Math.cos(a) * s.r * 0.4, s.y + Math.sin(a) * s.r * 0.28, 4, 2.5, "#f0e4c0");
    }
    ctx.globalAlpha = 1;
    // The glass, on its side, still rolling slightly.
    ctx.save();
    ctx.translate(s.x + s.r * 0.55, s.y - 12);
    ctx.rotate(1.6 + Math.sin(this.time * 2) * 0.05);
    poly(
      ctx,
      [
        [-9, -7],
        [9, -9],
        [7, 9],
        [-7, 7],
      ],
      "#c8d8e0aa",
      "#8aa0b0",
    );
    ctx.restore();
    fonts().small.draw(ctx, "WIPE IT", s.x, s.y - 4, "#3a2a08", "center");
    ctx.restore();
  }

  private drawCountIn(ctx: CanvasRenderingContext2D) {
    const f = fonts();
    const n = Math.ceil(this.countdown / (COUNT_IN / 4));
    ctx.save();
    ctx.globalAlpha = 0.55;
    rect(ctx, 0, 0, 480, this.stageH, "#0b0a10");
    ctx.globalAlpha = 1;
    f.big.draw(ctx, this.venue.name, 240, this.stageH / 2 - 22, "#f0ece0", "center");
    f.body.draw(ctx, this.venue.where, 240, this.stageH / 2 - 4, "#b0aabc", "center");
    f.big.draw(ctx, n > 0 ? `${n}` : "GO", 240, this.stageH / 2 + 16, "#e8c821", "center");
    ctx.restore();
  }

  private drawEndWash(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    rect(ctx, 0, 0, 480, 270, this.failed ? "#3a0d10" : "#0b0a10");
    ctx.globalAlpha = 1;
    const f = fonts();
    const msg = this.failed ? "THEY'VE TURNED THE LIGHTS ON" : "THAT'S THE SET";
    f.big.draw(ctx, msg, 240, 120, "#f0ece0", "center");
    ctx.restore();
  }
}
