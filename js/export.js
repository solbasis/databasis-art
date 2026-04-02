export class Exporter {
  constructor(canvas, effects) {
    this.canvas  = canvas;
    this.effects = effects;
  }

  getScale() {
    return parseInt(document.getElementById('export-scale')?.value || '1', 10);
  }

  exportPNG() {
    const scale = this.getScale();
    const out   = this.canvas.getExportCanvas(scale);
    const link  = document.createElement('a');
    link.download = `basis-art-${Date.now()}.png`;
    link.href     = out.toDataURL('image/png');
    link.click();
    this._st(`PNG saved (${scale}x)`);
  }

  exportGIF() {
    if (typeof GIF === 'undefined') {
      this._st('GIF lib not loaded');
      return;
    }
    const scale = this.getScale();
    const W = this.canvas.mainEl.width  * scale;
    const H = this.canvas.mainEl.height * scale;

    this._st('building GIF...');

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
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.canvas.mainEl, 0, 0, W, H);
      this.effects.render(ctx, W, H, f * 3);
      if (f % 4 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.01)';
        ctx.fillRect(0, 0, W, H);
      }
      gif.addFrame(fc, { delay: 80 + (f % 3) * 15 });
    }

    gif.on('finished', blob => {
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `basis-art-${Date.now()}.gif`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      this._st(`GIF saved (${scale}x)`);
    });

    gif.render();
  }

  _st(msg) {
    const el = document.getElementById('st-msg');
    if (el) el.innerHTML = msg + '<span class="blink">_</span>';
  }
}
