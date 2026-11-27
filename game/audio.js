// Gobble Dash sound effects: every sound is synthesized with WebAudio.
// No audio files, no network. Created lazily on the first user gesture.
export class SoundEffects {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  ensureContext() {
    if (this.context) return this.context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
    } catch {
      this.context = null;
    }
    return this.context;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // A short oscillator blip with a pitch slide and a quick fade.
  blip(freqStart, freqEnd, duration, type, volume) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Sound is garnish; a failure must never break the game.
    }
  }

  // The turkey's signature gobble: a fast "gob-bob-bob" of low square honks.
  gobble() {
    if (this.muted) return;
    [0, 0.09, 0.18, 0.27].forEach((delay, i) => {
      setTimeout(() => this.blip(i === 0 ? 320 : 240, 140, 0.09, 'square', 0.10), delay * 1000);
    });
  }

  // Corn pickup: a bright two-note chirp.
  chirp() {
    this.blip(880, 1320, 0.09, 'sine', 0.12);
    setTimeout(() => this.blip(1320, 1760, 0.08, 'sine', 0.10), 70);
  }

  // Hitting a hazard: a low thud.
  thud() {
    this.blip(160, 55, 0.22, 'triangle', 0.22);
  }

  // The farmer spots the turkey: a sharp warning whistle.
  spotted() {
    this.blip(520, 980, 0.16, 'sawtooth', 0.08);
  }

  // A hop: a soft rising pop.
  hop() {
    this.blip(300, 520, 0.08, 'sine', 0.07);
  }

  // Escape fanfare: a little rising arpeggio.
  fanfare() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => this.blip(freq, freq, 0.22, 'triangle', 0.12), i * 110);
    });
  }

  // Caught: a descending sad slide.
  caught() {
    this.blip(392, 98, 0.6, 'sawtooth', 0.10);
  }
}
