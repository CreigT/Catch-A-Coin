// Web Audio API synthesized sound effects for Catch a Coin (No external files)

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private lastSlideTime: number = 0;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazily initialize on first interaction to comply with browser autoplay policies
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.noiseBuffer) {
      const size = this.ctx.sampleRate; // 1 second of noise
      const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
      const output = buf.getChannelData(0);
      for (let i = 0; i < size; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    return this.noiseBuffer;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Sound when a coin drops from the top into the water
   */
  public playDrop() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio safety
    }
  }

  /**
   * Requirement 1: Soft "bloop bloop" bubble sounds while coins are falling through the water.
   */
  public playBloopBloop() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // First bloop
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(360, now);
      osc1.frequency.exponentialRampToValueAtTime(620, now + 0.08);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);

      // Second bloop ("bloop bloop")
      const t2 = now + 0.09;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, t2);
      osc2.frequency.exponentialRampToValueAtTime(740, t2 + 0.08);
      gain2.gain.setValueAtTime(0.12, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.09);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.1);
    } catch {
      // Audio safety
    }
  }

  /**
   * Requirement 2: A short splash sound when a coin is caught by the chest.
   */
  public playShortSplash() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const noiseBuf = this.getNoiseBuffer();

      // Bandpass noise burst for water splash droplets
      if (noiseBuf) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(650, now + 0.14);
        filter.Q.value = 1.6;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.24, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.16);
      }

      // Tonal water impact drop
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.14);

      oscGain.gain.setValueAtTime(0.2, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Audio safety
    }
  }

  /**
   * Requirement 3: Repeated soft "splash splash" sounds while the purple octopus is crossing the screen.
   */
  public playOctopusSwimSplash() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const noiseBuf = this.getNoiseBuffer();

      // Two soft gentle paddle splashes: "splash ... splash"
      [0, 0.12].forEach((offset) => {
        if (!this.ctx) return;
        const t = now + offset;
        if (noiseBuf) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1150, t);
          filter.frequency.exponentialRampToValueAtTime(520, t + 0.09);
          filter.Q.value = 1.4;

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.09, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          noise.start(t);
          noise.stop(t + 0.11);
        }

        // Low water displacement whoosh
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
        oscGain.gain.setValueAtTime(0.05, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      });
    } catch {
      // Audio safety
    }
  }

  /**
   * Catch score chime by coin type
   */
  public playCatch(type: 'normal' | 'crested' | 'diamond') {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      if (type === 'normal') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(920, now);
        osc.frequency.exponentialRampToValueAtTime(1420, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (type === 'crested') {
        const freqs = [784, 1175];
        freqs.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + idx * 0.04 + 0.1);
          gain.gain.setValueAtTime(0.22, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.36);
        });
      } else {
        const tones = [880, 1108, 1320, 1760];
        tones.forEach((tone, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(tone, now + idx * 0.04);
          gain.gain.setValueAtTime(0.22, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.4);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.42);
        });
      }
    } catch {
      // Audio safety
    }
  }

  /**
   * Gentle bubble pop when a coin is missed and hits the seabed
   */
  public playMiss() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {
      // Safe
    }
  }

  /**
   * Fanfare for high score
   */
  public playHighScore() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);

        gain.gain.setValueAtTime(0.25, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.36);
      });
    } catch {
      // Safe
    }
  }

  /**
   * Gentle water whoosh on rapid chest drag
   */
  public playChestSlide() {
    if (this.muted) return;
    const nowMs = performance.now();
    if (nowMs - this.lastSlideTime < 220) return;
    this.lastSlideTime = nowMs;

    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Safe
    }
  }

  /**
   * Aquatic chomp/gulp when octopus eats a coin
   */
  public playOctopusChomp() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);

      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(600, now + 0.08);
      popOsc.frequency.exponentialRampToValueAtTime(300, now + 0.18);
      popGain.gain.setValueAtTime(0.2, now + 0.08);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      popOsc.connect(popGain);
      popGain.connect(this.ctx.destination);
      popOsc.start(now + 0.08);
      popOsc.stop(now + 0.21);
    } catch {
      // Safe
    }
  }
}

export const sounds = new SoundManager();
