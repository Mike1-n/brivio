/**
 * Web Audio API Procedural Sound Synthesizer for QuizArena
 * Provides rich game audio without external asset latency:
 * - Countdown beeps & gong
 * - Answer click & lock
 * - Correct triumph fanfare
 * - Incorrect low buzzer
 * - Leaderboard whoosh
 * - Podium Olympic celebration fanfare
 * - Lobby energetic pulse rhythm
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lobbyInterval: any = null;

  private initCtx() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopLobbyMusic();
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /** Short tick for countdown (3, 2, 1) */
  public playCountdownTick(isFinal: boolean = false) {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isFinal ? "triangle" : "sine";
    osc.frequency.setValueAtTime(isFinal ? 880 : 523.25, ctx.currentTime); // A5 or C5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isFinal ? 0.6 : 0.2));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isFinal ? 0.6 : 0.2));
  }

  /** Player taps an answer button */
  public playAnswerClick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  /** Correct answer bright harmonic arpeggio */
  public playCorrectFanfare() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.4);
    });
  }

  /** Incorrect answer low buzz */
  public playIncorrectBuzzer() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  /** Timer urgent countdown pulse (last 5 seconds) */
  public playUrgentTick() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(900, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  /** Podium victory celebration */
  public playPodiumFanfare() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Grand majestic fanfare sequence
    const sequence = [
      { f: 523.25, t: 0.0, d: 0.15 }, // C5
      { f: 523.25, t: 0.18, d: 0.15 }, // C5
      { f: 523.25, t: 0.36, d: 0.15 }, // C5
      { f: 659.25, t: 0.54, d: 0.4 },  // E5
      { f: 587.33, t: 0.96, d: 0.15 }, // D5
      { f: 659.25, t: 1.14, d: 0.15 }, // E5
      { f: 783.99, t: 1.35, d: 0.8 },  // G5
      { f: 1046.5, t: 2.18, d: 1.2 },  // C6
    ];

    sequence.forEach((item) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(item.f, ctx.currentTime + item.t);

      gain.gain.setValueAtTime(0, ctx.currentTime + item.t);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + item.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + item.t + item.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + item.t);
      osc.stop(ctx.currentTime + item.t + item.d);
    });
  }

  /** Energetic procedural lobby music loop */
  public startLobbyMusic() {
    if (this.isMuted || this.lobbyInterval) return;
    const notes = [261.63, 329.63, 392.00, 440.00, 523.25, 392.00];
    let step = 0;

    this.lobbyInterval = setInterval(() => {
      if (this.isMuted) return;
      const ctx = this.initCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = notes[step % notes.length];
      step++;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }, 280);
  }

  public init() {
    return this.initCtx();
  }

  public playCorrect() {
    return this.playCorrectFanfare();
  }

  public playIncorrect() {
    return this.playIncorrectBuzzer();
  }

  public playWarningTick() {
    return this.playUrgentTick();
  }

  public playPop() {
    return this.playAnswerClick();
  }

  public playCountdown(isFinal: boolean = false) {
    return this.playCountdownTick(isFinal);
  }

  public stopLobbyMusic() {
    if (this.lobbyInterval) {
      clearInterval(this.lobbyInterval);
      this.lobbyInterval = null;
    }
  }
}

export const soundEffects = new SoundEngine();
