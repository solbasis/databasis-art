export class Effects {
  constructor() {
    this.state = {
      scanlines: { enabled: true,  intensity: 0.40 },
      glow:      { enabled: true,  intensity: 0.60 },
      vignette:  { enabled: true,  intensity: 0.50 },
      noise:     { enabled: false, intensity: 0.20 },
      flicker:   { enabled: false, intensity: 0.30 },
    };
  }

  get(name)          { return this.state[name]?.enabled ?? false; }
  set(name, enabled) { if (this.state[name]) this.state[name].enabled = enabled; }
  intensity(name)    { return this.state[name]?.intensity ?? 0.5; }
  setIntensity(name, v) { if (this.state[name]) this.state[name].intensity = Math.max(0, Math.min(1, v)); }

  /** Sync all checkboxes + sliders from state */
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
      if (this.state[name]) {
        if (cfg.enabled  !== undefined) this.state[name].enabled   = cfg.enabled;
        if (cfg.intensity !== undefined) this.state[name].intensity = cfg.intensity;
      }
    }
    this.syncUI();
  }

  /** Draw all overlay effects onto ctx */
  render(ctx, w, h, frame = 0) {
    // Scanlines
    if (this.state.scanlines.enabled) {
      const alpha = 0.12 + this.state.scanlines.intensity * 0.28;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      const offset = (frame * 2) % 2;
      for (let y = offset; y < h; y += 2) {
        ctx.fillRect(0, y, w, 1);
      }
    }

    // Flicker (subtle brightness pulse)
    if (this.state.flicker.enabled) {
      const flick = (Math.sin(frame * 1.3) * 0.5 + 0.5) * this.state.flicker.intensity * 0.06;
      ctx.fillStyle = `rgba(255,255,255,${flick})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Noise
    if (this.state.noise.enabled) {
      const density = this.state.noise.intensity * 0.04;
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (Math.random() < density) {
          const v = Math.random() * 255;
          d[i] = v; d[i+1] = v; d[i+2] = v; d[i+3] = 70;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Vignette
    if (this.state.vignette.enabled) {
      const alpha = 0.25 + this.state.vignette.intensity * 0.55;
      const grad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.28, w/2, h/2, Math.max(w,h)*0.82);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
