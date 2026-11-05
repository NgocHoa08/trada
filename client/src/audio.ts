/**
 * Bộ tạo âm thanh môi trường và hiệu ứng tiếng động vỉa hè bằng Web Audio API
 * (Không phụ thuộc vào file ngoài, đảm bảo chạy offline 100% không lo lỗi 404/bản quyền).
 */

export interface SoundVolumes {
  traffic: number;
  fan: number;
  rain: number;
  streetVendor: number;
  teaPour: boolean; // Bật/tắt tiếng rót nước & đá lanh canh khi đổi tuần
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  // Nodes
  private trafficGain: GainNode | null = null;
  private fanGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private vendorTimer: number | null = null;

  public volumes: SoundVolumes = {
    traffic: 0.3,
    fan: 0.2,
    rain: 0,
    streetVendor: 0.2,
    teaPour: true,
  };

  unlock(): void {
    if (this.isUnlocked) return;
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.isUnlocked = true;
    this.initAmbience();
  }

  private initAmbience(): void {
    if (!this.ctx) return;

    // 1. Tiếng xe cộ vỉa hè (Low-pass filtered brown noise)
    this.trafficGain = this.createNoiseChannel('brown', 250, this.volumes.traffic);

    // 2. Tiếng quạt máy vù vù (Low-pass pink noise with subtle LFO)
    this.fanGain = this.createNoiseChannel('pink', 180, this.volumes.fan);

    // 3. Tiếng mưa rào (Band-pass noise)
    this.rainGain = this.createNoiseChannel('white', 800, this.volumes.rain);

    // 4. Tiếng rao xa xa thỉnh thoảng ngân lên
    this.startVendorLoop();
  }

  private createNoiseChannel(type: 'white' | 'pink' | 'brown', filterFreq: number, initialVol: number): GainNode {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    let b0 = 0, b1 = 0, b2 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') {
        data[i] = white;
      } else if (type === 'brown') {
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      } else {
        // Pink
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.1;
      }
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(initialVol, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    return gain;
  }

  private startVendorLoop(): void {
    const scheduleNext = () => {
      const waitMs = 25000 + Math.random() * 40000;
      this.vendorTimer = window.setTimeout(() => {
        if (this.isUnlocked && this.volumes.streetVendor > 0) {
          this.playVendorSound();
        }
        scheduleNext();
      }, waitMs);
    };
    scheduleNext();
  }

  // Tiếng rao "Bánh bao... Bánh mì Sài Gòn..." ngân xa
  private playVendorSound(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(320, t0);
    osc.frequency.exponentialRampToValueAtTime(380, t0 + 0.6);
    osc.frequency.exponentialRampToValueAtTime(310, t0 + 1.8);

    const maxVol = this.volumes.streetVendor * 0.15;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(maxVol, t0 + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 2.3);
  }

  // Tiếng rót nước và đá lanh canh khi sang tuần trà mới
  playTeaPour(): void {
    if (!this.isUnlocked || !this.volumes.teaPour || !this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;

    // Tiếng nước xì xào
    const dur = 1.6;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.8));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t0);
    filter.frequency.linearRampToValueAtTime(1600, t0 + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t0);

    // Tiếng đá lanh canh (high pitch clinks)
    [0.4, 0.7, 1.1].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600 + idx * 400, t0 + delay);
      g.gain.setValueAtTime(0.12, t0 + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.15);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0 + delay);
      osc.stop(t0 + delay + 0.16);
    });
  }

  setVolume(key: keyof SoundVolumes, value: number | boolean): void {
    if (typeof value === 'boolean') {
      this.volumes.teaPour = value;
      return;
    }
    if (key !== 'teaPour') {
      this.volumes[key] = value;
    }
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (key === 'traffic' && this.trafficGain) {
      this.trafficGain.gain.setValueAtTime(value, t);
    } else if (key === 'fan' && this.fanGain) {
      this.fanGain.gain.setValueAtTime(value, t);
    } else if (key === 'rain' && this.rainGain) {
      this.rainGain.gain.setValueAtTime(value, t);
    }
  }

  destroy(): void {
    if (this.vendorTimer) clearTimeout(this.vendorTimer);
    if (this.ctx) void this.ctx.close();
  }
}
