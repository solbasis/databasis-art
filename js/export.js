export class Exporter {
  constructor(canvas, effects) {
    this.canvas   = canvas;
    this.effects  = effects;
    this.timeline = null; // set externally after Timeline is created
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

    // If timeline has multiple frames, export each frame
    const grids = this.timeline ? this.timeline.getAllGrids() : null;

    if (grids && grids.length > 1) {
      // Multi-frame animation export
      const fps = this.timeline.fps || 8;
      const delay = Math.round(1000 / fps);
      grids.forEach(frame => {
        const fc  = document.createElement('canvas');
        fc.width  = W; fc.height = H;
        const ctx = fc.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        // Render the frame grid to the temp canvas
        this._renderFrameToCanvas(ctx, frame, W, H, scale);
        gif.addFrame(fc, { delay });
      });
    } else {
      // Single-frame: animated effects loop (10 frames)
      for (let f = 0; f < 10; f++) {
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

  /** Render a frame grid to a canvas context at the given scale */
  _renderFrameToCanvas(ctx, frame, W, H, scale) {
    const cs = this.canvas.CS * scale;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    frame.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.bg !== '#000000') {
          ctx.fillStyle = cell.bg;
          ctx.fillRect(x * cs, y * cs, cs, cs);
        }
        if (cell.char) {
          ctx.fillStyle = cell.charColor || cell.bg;
          ctx.font = `${cs * 0.75}px "IBM Plex Mono", monospace`;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.char, x * cs + cs / 2, y * cs + cs / 2);
        }
      });
    });
  }

  _st(msg) {
    const el = document.getElementById('st-msg');
    if (el) el.innerHTML = msg + '<span class="blink">_</span>';
  }
}
