const THUMB_CELL = 3; // px per cell in thumbnail

export class Timeline {
  constructor(canvas) {
    this.canvas  = canvas;
    this.frames  = [this._snapGrid()];
    this.current = 0;
    this.playing = false;
    this.fps     = 8;
    this.onion   = true;
    this._timer  = null;

    this._strip   = document.getElementById('tl-strip');
    this._playBtn = document.getElementById('tl-play');
    this._fpsEl   = document.getElementById('tl-fps');
    this._countEl = document.getElementById('tl-count');

    this._bind();
    this._renderStrip();
  }

  /* ── public API ── */

  addFrame() {
    this._commitCurrent();
    const clone = this._snapGrid();
    this.frames.splice(this.current + 1, 0, clone);
    this._switchTo(this.current + 1);
  }

  duplicateFrame() {
    this._commitCurrent();
    const clone = this.frames[this.current].map(r => r.map(c => ({ ...c })));
    this.frames.splice(this.current + 1, 0, clone);
    this._switchTo(this.current + 1);
  }

  removeFrame() {
    if (this.frames.length === 1) return;
    this.frames.splice(this.current, 1);
    this._switchTo(Math.min(this.current, this.frames.length - 1));
  }

  nextFrame() {
    this._commitCurrent();
    this._switchTo((this.current + 1) % this.frames.length);
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this._playBtn.textContent = '■ STOP';
    this._timer = setInterval(() => this.nextFrame(), 1000 / this.fps);
  }

  stop() {
    this.playing = false;
    this._playBtn.textContent = '▶ PLAY';
    clearInterval(this._timer);
    this._timer = null;
  }

  togglePlay() { this.playing ? this.stop() : this.play(); }

  getFrameCount() { return this.frames.length; }
  getCurrentIndex() { return this.current; }

  /** Commit all frames as grids for GIF export */
  getAllGrids() {
    this._commitCurrent();
    return this.frames;
  }

  /** Called when canvas grid changes externally (paint/erase/etc) */
  markDirty() {
    this._updateThumb(this.current);
  }

  /* ── private ── */

  _snapGrid() {
    return this.canvas.grid.map(r => r.map(c => ({ ...c })));
  }

  _commitCurrent() {
    this.frames[this.current] = this._snapGrid();
  }

  _switchTo(idx) {
    this._commitCurrent();
    this.current = idx;
    // Load frame into canvas
    this.canvas.grid = this.frames[idx].map(r => r.map(c => ({ ...c })));
    this.canvas.render();
    this.canvas.markDirty();
    this._renderStrip();
    this._updateCount();
  }

  _updateCount() {
    if (this._countEl)
      this._countEl.textContent = `${this.current + 1} / ${this.frames.length}`;
  }

  _renderStrip() {
    this._commitCurrent();
    if (!this._strip) return;
    this._strip.innerHTML = '';
    this.frames.forEach((frame, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'tl-frame' + (i === this.current ? ' active' : '');
      wrap.title = `Frame ${i + 1}`;

      const thumb = document.createElement('canvas');
      const W = this.canvas.W, H = this.canvas.H;
      thumb.width  = W * THUMB_CELL;
      thumb.height = H * THUMB_CELL;
      this._drawThumb(thumb, frame);

      const label = document.createElement('div');
      label.className = 'tl-frame-num';
      label.textContent = i + 1;

      wrap.appendChild(thumb);
      wrap.appendChild(label);
      wrap.onclick = () => { if (!this.playing) this._switchTo(i); };
      this._strip.appendChild(wrap);
    });
    this._updateCount();
  }

  _updateThumb(idx) {
    if (!this._strip) return;
    const wrap = this._strip.children[idx];
    if (!wrap) return;
    const thumb = wrap.querySelector('canvas');
    if (thumb) this._drawThumb(thumb, this.frames[idx]);
  }

  _drawThumb(canvas, frame) {
    const cs  = THUMB_CELL;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    frame.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.bg !== '#000000') {
          ctx.fillStyle = cell.bg;
          ctx.fillRect(x * cs, y * cs, cs, cs);
        }
      });
    });
  }

  /** Render onion skin (previous frame ghost) onto main canvas ctx */
  renderOnionSkin(ctx) {
    if (!this.onion || this.frames.length < 2) return;
    const prevIdx = (this.current - 1 + this.frames.length) % this.frames.length;
    if (prevIdx === this.current) return;
    const frame = this.frames[prevIdx];
    const cs = this.canvas.CS;
    ctx.save();
    ctx.globalAlpha = 0.18;
    frame.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.bg !== '#000000') {
          ctx.fillStyle = cell.bg;
          ctx.fillRect(x * cs, y * cs, cs, cs);
        }
      });
    });
    ctx.restore();
  }

  _bind() {
    document.getElementById('tl-add')?.addEventListener('click', () => this.addFrame());
    document.getElementById('tl-dup')?.addEventListener('click', () => this.duplicateFrame());
    document.getElementById('tl-del')?.addEventListener('click', () => this.removeFrame());
    this._playBtn?.addEventListener('click', () => this.togglePlay());

    this._fpsEl?.addEventListener('change', () => {
      this.fps = parseInt(this._fpsEl.value) || 8;
      if (this.playing) { this.stop(); this.play(); }
    });

    document.getElementById('tl-onion')?.addEventListener('change', e => {
      this.onion = e.target.checked;
      this.canvas.render();
    });
  }
}
