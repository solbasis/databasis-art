export class Exporter {
  constructor(canvas, effects) {
    this.canvas  = canvas;
    this.effects = effects;
  }

  exportPNG() {
    const out  = this.canvas.getExportCanvas();
    const link = document.createElement('a');
    link.download = `databasis-art-${Date.now()}.png`;
    link.href     = out.toDataURL('image/png');
    link.click();
    this._status('PNG saved');
  }

  exportGIF() {
    if (typeof GIF === 'undefined') {
      this._status('GIF lib not loaded — check connection');
      return;
    }

    this._status('building GIF...');

    const W = this.canvas.mainEl.width;
    const H = this.canvas.mainEl.height;

    const gif = new GIF({
      workers:      2,
      quality:      8,
      width:        W,
      height:       H,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
    });

    const FRAMES = 10;

    for (let f = 0; f < FRAMES; f++) {
      const fc  = document.createElement('canvas');
      fc.width  = W; fc.height = H;
      const ctx = fc.getContext('2d');

      // Base art
      ctx.drawImage(this.canvas.mainEl, 0, 0);

      // Effects per-frame (animated)
      this.effects.render(ctx, W, H, f * 3);

      // Subtle per-frame flicker
      if (f % 4 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.012)';
        ctx.fillRect(0, 0, W, H);
      }

      gif.addFrame(fc, { delay: 80 + (f % 3) * 15 });
    }

    gif.on('finished', blob => {
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `databasis-art-${Date.now()}.gif`;
      link.href     = url;
      link.click();
      URL.revokeObjectURL(url);
      this._status('GIF saved');
    });

    gif.render();
  }

  _status(msg) {
    const el = document.getElementById('st-msg');
    if (el) el.innerHTML = msg + '<span class="blink">_</span>';
  }
}
