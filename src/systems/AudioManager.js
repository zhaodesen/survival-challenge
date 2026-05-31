/**
 * AudioManager —— 纯 WebAudio 合成音效,无需任何音频文件。
 * 在首次用户手势(开始按钮)后 resume。各音效带节流,避免高频刷屏爆音。
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.last = {};
    this.muted = false;
  }

  ensure() {
    if (this.ctx || this.unsupported) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.unsupported = true; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.30;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _throttle(name, ms) {
    const t = performance.now();
    if (this.last[name] && t - this.last[name] < ms) return false;
    this.last[name] = t;
    return true;
  }

  tone({ type = 'sine', f0 = 440, f1 = null, dur = 0.1, vol = 0.2, delay = 0, attack = 0.005 }) {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  noise({ dur = 0.1, vol = 0.2, delay = 0, lp = null }) {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    let node = src;
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      node.connect(f);
      node = f;
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  arp(freqs, step, dur, type, vol = 0.16) {
    freqs.forEach((f, i) => this.tone({ type, f0: f, dur, vol, delay: i * step }));
  }

  // ---------- 命名音效 ----------
  shoot() { if (!this._throttle('shoot', 45)) return; this.tone({ type: 'square', f0: 680, f1: 420, dur: 0.06, vol: 0.12 }); }
  hit() { if (!this._throttle('hit', 38)) return; this.noise({ dur: 0.035, vol: 0.10, lp: 3000 }); }
  kill() { if (!this._throttle('kill', 28)) return; this.tone({ type: 'triangle', f0: 440, f1: 120, dur: 0.12, vol: 0.20 }); this.noise({ dur: 0.05, vol: 0.08 }); }
  boom() { if (!this._throttle('boom', 55)) return; this.noise({ dur: 0.22, vol: 0.26, lp: 900 }); this.tone({ type: 'sine', f0: 170, f1: 48, dur: 0.2, vol: 0.22 }); }
  zap() { if (!this._throttle('zap', 45)) return; this.tone({ type: 'sawtooth', f0: 920, f1: 280, dur: 0.08, vol: 0.12 }); }
  coin() { if (!this._throttle('coin', 55)) return; this.tone({ type: 'sine', f0: 880, dur: 0.05, vol: 0.16 }); this.tone({ type: 'sine', f0: 1320, dur: 0.06, vol: 0.14, delay: 0.05 }); }
  hurt() { if (!this._throttle('hurt', 120)) return; this.tone({ type: 'sawtooth', f0: 300, f1: 70, dur: 0.18, vol: 0.26 }); this.noise({ dur: 0.09, vol: 0.12 }); }
  upgrade() { this.arp([523, 659, 784, 1047], 0.07, 0.2, 'triangle', 0.16); }
  maxlevel() { this.arp([523, 659, 784, 1047, 1319], 0.08, 0.24, 'square', 0.16); }
  awaken() { this.arp([392, 523, 659, 784, 1047, 1319, 1568], 0.09, 0.3, 'sawtooth', 0.14); this.noise({ dur: 0.5, vol: 0.12, lp: 5000, delay: 0.2 }); }
  boss() { this.tone({ type: 'sawtooth', f0: 92, f1: 52, dur: 0.75, vol: 0.32 }); this.noise({ dur: 0.5, vol: 0.16, lp: 400 }); this.tone({ type: 'square', f0: 60, f1: 40, dur: 0.6, vol: 0.18, delay: 0.05 }); }
  warn() { if (!this._throttle('warn', 280)) return; this.tone({ type: 'square', f0: 880, dur: 0.12, vol: 0.18 }); }
  fire() { this.noise({ dur: 0.3, vol: 0.26, lp: 1400 }); this.tone({ type: 'sine', f0: 220, f1: 55, dur: 0.3, vol: 0.18 }); }
  waveclear() { this.arp([659, 880, 1047, 1319], 0.07, 0.18, 'sine', 0.15); }
  pickup() { this.arp([784, 1047, 1319], 0.05, 0.14, 'triangle', 0.14); }
  heartbeat() { if (!this._throttle('heart', 700)) return; this.tone({ type: 'sine', f0: 72, dur: 0.12, vol: 0.30 }); this.tone({ type: 'sine', f0: 58, dur: 0.12, vol: 0.24, delay: 0.18 }); }
}

const audio = new AudioManager();
export default audio;
