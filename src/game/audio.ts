/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RuptureGrade } from './types.ts';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Music loop state
  private musicInterval: number | null = null;
  private step: number = 0;
  private currentGrade: RuptureGrade = 'D';
  private bpm: number = 138;
  private isMusicPlaying: boolean = false;

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setGrade(grade: RuptureGrade) {
    this.currentGrade = grade;
  }

  // --- Dynamic Synthwave / Darksynth Sequencer ---
  public startMusic() {
    this.init();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.step = 0;

    const stepDurationMs = (60 / this.bpm / 4) * 1000; // 16th note
    this.musicInterval = window.setInterval(() => {
      this.tickMusicStep();
    }, stepDurationMs);
  }

  public stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
  }

  private tickMusicStep() {
    if (!this.ctx || !this.musicGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const barStep = this.step % 16;
    const isQuarter = barStep % 4 === 0;
    const isOffbeat = barStep % 4 === 2;

    // 1. Cyber Kick Drum (on every beat or every second beat based on grade)
    if (isQuarter) {
      this.playKick(t);
    }

    // 2. Neon Snare / Cyber Clang (on beats 2 & 4)
    if (barStep === 4 || barStep === 12) {
      this.playSnare(t);
    }

    // 3. Hi-Hat / Shaker (intensifies with grade)
    if (this.currentGrade !== 'D') {
      if (barStep % 2 === 0 || this.currentGrade === 'S' || this.currentGrade === 'SS' || this.currentGrade === 'SSS') {
        this.playHiHat(t, isOffbeat ? 0.08 : 0.04);
      }
    }

    // 4. Bassline: Darksynth Saw Bass
    const rootFreq = 55; // A1
    const bassScale = [55, 55, 65.4, 73.4, 55, 82.4, 73.4, 61.7];
    const bassNote = bassScale[Math.floor(this.step / 2) % bassScale.length];
    if (barStep % 2 === 0) {
      this.playBassNote(t, bassNote);
    }

    // 5. Higher Lead Arp (Unlocked at B, A, S, SS, SSS)
    if (['B', 'A', 'S', 'SS', 'SSS'].includes(this.currentGrade)) {
      const leadNotes = [220, 261.6, 293.7, 329.6, 392.0, 440.0, 523.3];
      const leadIdx = (this.step * 3) % leadNotes.length;
      if (this.step % 2 === 1) {
        this.playLeadNote(t, leadNotes[leadIdx]);
      }
    }

    this.step++;
  }

  private playKick(t: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.12);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  private playSnare(t: number) {
    if (!this.ctx || !this.musicGain) return;
    // Noise buffer for snap
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(t);
    noise.stop(t + 0.15);
  }

  private playHiHat(t: number, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(6000 + Math.random() * 2000, t);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  private playBassNote(t: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    const isDistorted = ['S', 'SS', 'SSS'].includes(this.currentGrade);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isDistorted ? 1800 : 700, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.12);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  private playLeadNote(t: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    const vol = this.currentGrade === 'SSS' ? 0.2 : 0.12;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  // --- Sound Effects ---

  public playBladeSlash(isOverdrive: boolean = false) {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = isOverdrive ? 'sawtooth' : 'triangle';
    const startFreq = isOverdrive ? 1200 : 850;
    osc.frequency.setValueAtTime(startFreq + (Math.random() - 0.5) * 100, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.14);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(2.0, t);

    gain.gain.setValueAtTime(isOverdrive ? 0.7 : 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  public playDeflection() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Metallic chime + pitch shift
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1800, t);
    osc1.frequency.exponentialRampToValueAtTime(800, t + 0.25);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(2400, t);
    osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.2);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.31);
    osc2.stop(t + 0.31);
  }

  public playRailCannon() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // High energy beam pop + thunderous sub rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.45);
    subGain.gain.setValueAtTime(0.85, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.51);

    // Laser crack
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(3200, t);
    crackOsc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
    crackGain.gain.setValueAtTime(0.6, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    crackOsc.connect(crackGain);
    crackGain.connect(this.sfxGain);
    crackOsc.start(t);
    crackOsc.stop(t + 0.21);
  }

  public playTetherLaunch() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1100, t + 0.18);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  public playWallRunBoost() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.15);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.21);
  }

  public playHitImpact(isHeavy: boolean = false) {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isHeavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isHeavy ? 180 : 120, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.18);

    gain.gain.setValueAtTime(isHeavy ? 0.75 : 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playExecutionSlash() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Heavy sonic blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.3);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  public playBossTelegraph() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(1050, t + 0.4);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.46);
  }
}

export const soundEngine = new SoundEngine();
