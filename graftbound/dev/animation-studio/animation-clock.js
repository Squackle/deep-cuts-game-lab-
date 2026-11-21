// Visual-only GRAFTBOUND Animation Studio clock. No engine or persistent state.
// Integrates playback-rate changes instead of re-scaling the whole elapsed cast;
// backgrounded tabs never fast-forward the fire front or the damage beat.
const validRate = value => Number.isFinite(value) && value > 0 ? value : 1;

export class ActivePlaybackClock {
  constructor() {
    this.running = false;
    this.paused = false;
    this.last = 0;
    this.played = 0;
    this.rate = 1;
  }
  start(now, rate = 1) {
    if (!Number.isFinite(now)) throw new RangeError('Clock start must be finite');
    this.running = true;
    this.paused = false;
    this.last = now;
    this.played = 0;
    this.rate = validRate(rate);
  }
  _update(now) {
    if (!this.running) return;
    const next = Number.isFinite(now) ? Math.max(this.last, now) : this.last;
    if (!this.paused) this.played += (next - this.last) / 1000 * this.rate;
    this.last = next;
  }
  elapsed(now) {
    this._update(now);
    return this.played;
  }
  setRate(rate, now) {
    this._update(now);
    this.rate = validRate(rate);
  }
  pause(now) {
    this._update(now);
    this.paused = true;
  }
  resume(now) {
    if (!this.running) return;
    if (Number.isFinite(now)) this.last = Math.max(this.last, now);
    this.paused = false;
  }
}
