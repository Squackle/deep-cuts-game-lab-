// Fully synthesized original SFX and ambient music (WebAudio). No audio files.
export class Audio {
  constructor() { this.ctx = null; this.sfxOn = true; this.musicOn = true; this.musicTimer = null; this.step = 0; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
    this.mus = this.ctx.createGain(); this.mus.gain.value = this.musicOn ? 0.22 : 0; this.mus.connect(this.master);
    this.verb = this.ctx.createDelay(); this.verb.delayTime.value = 0.23; const fb = this.ctx.createGain(); fb.gain.value = 0.38;
    const lp = this.ctx.createBiquadFilter(); lp.frequency.value = 2200; this.verb.connect(lp); lp.connect(fb); fb.connect(this.verb); lp.connect(this.master);
    const n = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, n, n); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    if (this.musicOn) this.startMusic();
  }
  setSfx(on) { this.sfxOn = on; }
  setMusic(on) { this.musicOn = on; if (!this.ctx) return; this.mus.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.3); if (on) this.startMusic(); }
  tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.005, slide = 0, dest, delay = 0, verb = 0.2 } = {}) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || this.sfx); if (verb) { const v = this.ctx.createGain(); v.gain.value = verb; g.connect(v); v.connect(this.verb); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, { freq = 1200, q = 1, vol = 0.3, type = 'bandpass', sweep = 0, delay = 0 } = {}) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  play(name) {
    if (!this.ctx || !this.sfxOn) return;
    switch (name) {
      case 'step': this.noise(0.06, { freq: 500, vol: 0.12, q: 2 }); break;
      case 'hit': this.noise(0.18, { freq: 900, vol: 0.4, sweep: 0.3 }); this.tone(110, 0.2, { type: 'triangle', vol: 0.35, slide: 0.5 }); break;
      case 'bigHit': this.noise(0.3, { freq: 600, vol: 0.5, sweep: 0.25 }); this.tone(70, 0.4, { type: 'sine', vol: 0.5, slide: 0.5 }); break;
      case 'deathtouch': this.tone(220, 0.5, { type: 'sawtooth', vol: 0.12, slide: 0.25 }); this.tone(330, 0.5, { type: 'sine', vol: 0.15, slide: 0.3 }); break;
      case 'block': this.tone(900, 0.15, { type: 'triangle', vol: 0.18 }); this.tone(1350, 0.2, { type: 'sine', vol: 0.1 }); break;
      case 'heal': [523, 659, 784].forEach((f, i) => this.tone(f, 0.4, { vol: 0.12, delay: i * 0.06, verb: 0.5 })); break;
      case 'death': this.noise(0.5, { freq: 300, vol: 0.35, type: 'lowpass', sweep: 0.3 }); this.tone(160, 0.5, { type: 'triangle', vol: 0.2, slide: 0.4 }); break;
      case 'spell': this.noise(0.35, { freq: 2500, vol: 0.18, sweep: 0.3, q: 4 }); this.tone(660, 0.35, { type: 'sine', vol: 0.15, slide: 1.5, verb: 0.6 }); break;
      case 'fire': this.noise(0.25, { freq: 3000, vol: 0.2, sweep: 0.2, q: 6 }); break;
      case 'aim': this.tone(1200, 0.12, { type: 'square', vol: 0.05 }); this.tone(1500, 0.12, { type: 'square', vol: 0.05, delay: 0.1 }); break;
      case 'slam': this.tone(55, 0.7, { type: 'sine', vol: 0.6, slide: 0.5 }); this.noise(0.6, { freq: 200, vol: 0.5, type: 'lowpass' }); break;
      case 'turn': this.tone(392, 0.5, { type: 'triangle', vol: 0.1, verb: 0.5 }); this.tone(587, 0.6, { type: 'sine', vol: 0.08, delay: 0.08, verb: 0.5 }); break;
      case 'enemyTurn': this.tone(196, 0.5, { type: 'triangle', vol: 0.1, verb: 0.4 }); this.tone(185, 0.6, { type: 'sine', vol: 0.08, delay: 0.1 }); break;
      case 'click': this.tone(880, 0.05, { type: 'triangle', vol: 0.08, verb: 0 }); break;
      case 'nope': this.tone(180, 0.12, { type: 'square', vol: 0.06, verb: 0 }); this.tone(150, 0.14, { type: 'square', vol: 0.06, delay: 0.08, verb: 0 }); break;
      case 'tear': this.noise(0.45, { freq: 3500, vol: 0.35, sweep: 0.4, q: 1.5 }); break;
      case 'flip': this.noise(0.12, { freq: 2000, vol: 0.2, q: 3, sweep: 1.8 }); this.tone(700, 0.15, { vol: 0.08 }); break;
      case 'rare': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.8, { vol: 0.1, delay: i * 0.07, verb: 0.7 })); break;
      case 'absorb': this.noise(1.2, { freq: 400, vol: 0.2, sweep: 6, q: 3 }); [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone(f, 1.0, { type: 'triangle', vol: 0.1, delay: 0.5 + i * 0.07, verb: 0.8 })); this.tone(65, 1.6, { vol: 0.35, delay: 0.9 }); break;
      case 'victory': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 1.2, { type: 'triangle', vol: 0.12, delay: i * 0.12, verb: 0.8 })); break;
      case 'defeat': [330, 311, 262, 196].forEach((f, i) => this.tone(f, 1.0, { type: 'triangle', vol: 0.12, delay: i * 0.25, verb: 0.8 })); break;
      case 'achievement': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.6, { vol: 0.1, delay: i * 0.08, verb: 0.8 })); break;
      case 'intro': this.tone(73.4, 3.2, { type: 'sine', vol: 0.4, attack: 0.6 }); [146.8, 220, 293.7].forEach((f, i) => this.tone(f, 2.6, { type: 'triangle', vol: 0.07, attack: 0.8, delay: 0.3 + i * 0.25, verb: 0.9 })); break;
    }
  }
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const chords = [[146.8, 220, 293.7, 349.2], [116.5, 174.6, 233.1, 293.7], [130.8, 196, 261.6, 329.6], [110, 164.8, 220, 261.6]];
    const scale = [293.7, 329.6, 349.2, 392, 440, 523.3, 587.3];
    const tick = () => {
      if (!this.musicOn) { this.musicTimer = null; return; }
      const ch = chords[Math.floor(this.step / 4) % chords.length];
      if (this.step % 4 === 0) ch.forEach((f, i) => this.tone(f, 4.6, { type: i ? 'sine' : 'triangle', vol: 0.06, attack: 1.2, dest: this.mus, verb: 0.4 }));
      if (Math.random() < 0.55) this.tone(scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.3 ? 2 : 1), 1.4, { type: 'triangle', vol: 0.05, dest: this.mus, verb: 0.9 });
      this.step++; this.musicTimer = setTimeout(tick, 1150);
    };
    tick();
  }
}
