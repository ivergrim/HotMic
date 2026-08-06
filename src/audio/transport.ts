import type { MixEngine } from "./engine.ts";
import { SECONDS_PER_BAR, TOTAL_BARS, scheduleBar, scheduleHouseBar } from "./song.ts";

/**
 * Lookahead scheduler. Web Audio's clock is the only one accurate enough to
 * sequence with, so the game clock reads from it rather than from rAF.
 */
export class Transport {
  private engine: MixEngine;
  private startTime = 0;
  private nextBar = 0;
  private houseBar = 0;
  private nextHouseTime = 0;
  private timer: number | null = null;
  private lookahead = 0.35;
  private members = 1;
  private bandPlaying = true;
  private houseOn = false;
  running = false;
  /** Fires once when the last bar has been scheduled and played out. */
  onFinished: (() => void) | null = null;
  private finished = false;

  constructor(engine: MixEngine) {
    this.engine = engine;
  }

  start(members: number) {
    this.members = members;
    this.nextBar = 0;
    this.finished = false;
    this.bandPlaying = true;
    // A beat of air before the first bar so the room reads as a room first.
    this.startTime = this.engine.now + 0.7;
    this.houseBar = 0;
    this.nextHouseTime = this.startTime;
    this.running = true;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 60);
  }

  stop() {
    this.running = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Seconds since the downbeat. Negative during the count-in. */
  get position(): number {
    return this.engine.now - this.startTime;
  }

  /** 0..1 through the song. */
  get progress(): number {
    return Math.max(0, Math.min(1, this.position / (TOTAL_BARS * SECONDS_PER_BAR)));
  }

  get bar(): number {
    return Math.max(0, Math.floor(this.position / SECONDS_PER_BAR));
  }

  /** 0..1 within the current bar — drives every ambient animation on stage. */
  get barPhase(): number {
    const p = this.position / SECONDS_PER_BAR;
    return p - Math.floor(p);
  }

  get beatPhase(): number {
    const p = (this.position / SECONDS_PER_BAR) * 4;
    return p - Math.floor(p);
  }

  setBandPlaying(on: boolean) {
    this.bandPlaying = on;
  }

  setMembers(n: number) {
    this.members = n;
  }

  setHouse(on: boolean) {
    this.houseOn = on;
    this.engine.setHouseMusic(on);
    if (on) this.nextHouseTime = Math.max(this.nextHouseTime, this.engine.now + 0.05);
  }

  private tick() {
    if (!this.running) return;
    const now = this.engine.now;
    const horizon = now + this.lookahead;

    while (this.nextBar < TOTAL_BARS) {
      const barTime = this.startTime + this.nextBar * SECONDS_PER_BAR;
      if (barTime > horizon) break;
      if (this.bandPlaying) {
        const g = this.engine.ensureChannel("guitar");
        scheduleBar(
          this.engine.ctx,
          {
            guitar: g.voiceIn,
            drums: this.members >= 2 ? this.engine.ensureChannel("drums").voiceIn : undefined,
            bass: this.members >= 3 ? this.engine.ensureChannel("bass").voiceIn : undefined,
          },
          this.nextBar,
          barTime,
          this.members,
        );
      }
      this.nextBar++;
    }

    while (this.houseOn && this.nextHouseTime <= horizon) {
      scheduleHouseBar(this.engine.ctx, this.engine.houseIn, this.houseBar, this.nextHouseTime);
      this.houseBar++;
      this.nextHouseTime += SECONDS_PER_BAR;
    }
    if (!this.houseOn) {
      this.nextHouseTime = Math.max(this.nextHouseTime, now);
    }

    if (!this.finished && this.nextBar >= TOTAL_BARS && this.position >= TOTAL_BARS * SECONDS_PER_BAR) {
      this.finished = true;
      this.onFinished?.();
    }
  }
}
