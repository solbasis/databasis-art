export class Effects {
  constructor() {
    this.state = {
      scanlines: { enabled: true,  intensity: 0.40 },
      glow:      { enabled: true,  intensity: 0.60 },
      vignette:  { enabled: true,  intensity: 0.50 },
      noise:     { enabled: false, intensity: 0.20 },
      flicker:   { enabled: false, intensity: 0.30 },
    };
    // Cache noise ImageData to avoid per-frame allocation
    this._noiseCanvas = null;
    this._noiseFrame  = -1;
  }

  get(name)             { return this.state[name]?.enabled ?? false; }
  set(name, enabled)    { if (this.state[name]) this.state[name].enabled = enabled; }
  intensity(name)       { return this.state[name]?.intensity ?? 0.5; }
  setIntensity(name, v) { if (this.state[name]) this.state[name].intensity = Math.max(0, Math.min(1, v)); }

  syncUI() {
    for (const [name, cfg] of Object.entries(this.state)) {
      const cb = document.getElementById(`fx-${name}`);
      if (cb) cb.checked = cfg.enabled;
      const sl = document.getElementById(`fx-${name}-val`);
      if (sl) sl.value = Math.round(cfg.intensity * 100);
    }
  }

  applyPreset(preset) {
    for (const [name, cfg] of Object.entries(preset)) {
      if (!this.state[name]) continue;
      if (cfg.enabled   !== undefined) this.state[name].enabled   = cfg.enabled;
      if (cfg.intensity !== undefined) this.state[name].intensity = cfg.intensity;
    }
    this.syncUI();
  }

  render(ctx, w, h, frame = 0) {
    // Scanlines
    if (this.state.scanlines.enabled) {
      const alpha  = 0.10 + this.state.scanlines.intensity * 0.25;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
    }

    // Flicker
    if (this.state.flicker.enabled) {
      const f = (Math.sin(frame * 1.3) * 0.5 + 0.5) * this.state.flicker.intensity * 0.05;
      ctx.fillStyle = `rgba(255,255,255,${f})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Noise — throttled: only regenerate every 4 frames
    if (this.state.noise.enabled) {
      if (!this._noiseCanvas || this._noiseCanvas.width !== w || this._noiseCanvas.height !== h) {
        this._noiseCanvas = document.createElement('canvas');
        this._noiseCanvas.width = w;
        this._noiseCanvas.height = h;
        this._noiseFrame = -1;
      }
      if (frame - this._noiseFrame >= 4) {
        this._noiseFrame = frame;
        const nc   = this._noiseCanvas;
        const nctx = nc.getContext('2d');
        const id   = nctx.createImageData(w, h);
        const d    = id.data;
        const density = this.state.noise.intensity * 0.035;
        for (let i = 0; i < d.length; i += 4) {
          if (Math.random() < density) {
            const v = Math.random() * 255;
            d[i] = v; d[i+1] = v; d[i+2] = v; d[i+3] = 65;
          }
        }
        nctx.putImageData(id, 0, 0);
      }
      ctx.drawImage(this._noiseCanvas, 0, 0);
    }

    // Vignette
    if (this.state.vignette.enabled) {
      const alpha = 0.22 + this.state.vignette.intensity * 0.52;
      const grad  = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.28, w/2, h/2, Math.max(w,h)*0.82);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
