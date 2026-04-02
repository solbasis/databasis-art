import { brightnessToChar } from './ascii.js';

const STORAGE_KEY = 'databasis-art-v1';

export class Canvas {
  constructor(mainEl, overlayEl, palette, ascii, effects) {
    this.mainEl    = mainEl;
    this.overlayEl = overlayEl;
    this.palette   = palette;
    this.ascii     = ascii;
    this.effects   = effects;

    this.W  = 32;
    this.H  = 32;
    this.CS = 16;

    this.grid    = [];
    this.history = [];
    this.hIdx    = -1;
    this.MAX_H   = 60;

    this.showGrid = true;

    // Cached contexts
    this._mCtx = null;
    this._oCtx = null;

    // Cursor & preview state (updated on hover, rendered in RAF)
    this._cursorCell = null;
    this._preview    = null; // { type:'line', start:{x,y}, end:{x,y} }
    this._dirty      = true;
    this._frame      = 0;
    this._noiseFrame = 0;
    this._raf        = null;

    // Interact callbacks
    this._onInteract = null;
    this._onHover    = null;

    // Auto-save debounce
    this._saveTimer = null;

    this._init();
  }

  /* ── init ── */
  _init() {
    this._buildGrid();
    this._resize();
    this._bindMouse();
    this._loadFromStorage() || this._saveSnap();
    this._startRAF();
    this.render();
  }

  _buildGrid() {
    this.grid = Array.from({ length: this.H }, () =>
      Array.from({ length: this.W }, () => ({
        bg: '#000000', char: null, charColor: '#78b15a',
      }))
    );
  }

  _resize() {
    const w = this.W * this.CS;
    const h = this.H * this.CS;
    [this.mainEl, this.overlayEl].forEach(el => {
      el.width = w; el.height = h;
      el.style.width = w + 'px'; el.style.height = h + 'px';
    });
    this.mainEl.parentElement.style.width  = w + 'px';
    this.mainEl.parentElement.style.height = h + 'px';
    // Re-cache contexts after resize
    this._mCtx = this.mainEl.getContext('2d');
    this._oCtx = this.overlayEl.getContext('2d');
    this._dirty = true;
  }

  /* ── mouse ── */
  _bindMouse() {
    const el = this.mainEl.parentElement;

    el.addEventListener('contextmenu', e => e.preventDefault());

    el.addEventListener('mousedown', e => {
      e.preventDefault();
      this.drawing = true;
      this._onMouse(e);
    });

    el.addEventListener('mousemove', e => {
      const cell = this._cellAt(e);
      if (cell) {
        document.getElementById('st-coords').textContent = `x:${cell.x} y:${cell.y}`;
      }
      this._cursorCell = cell;
      this._dirty = true;
      if (this._onHover) this._onHover(cell);
      if (this.drawing) this._onMouse(e);
    });

    el.addEventListener('mouseup', () => {
      if (this.drawing) {
        this.drawing = false;
        if (this._onInteract) this._onInteract('up', null, null);
        this._saveSnap();
      }
    });

    el.addEventListener('mouseleave', () => {
      this.drawing = false;
      this._cursorCell = null;
      this._dirty = true;
    });

    el.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 2 : -2;
      const next  = Math.max(4, Math.min(32, this.CS + delta));
      if (next !== this.CS) {
        this.CS = next;
        document.getElementById('cell-size').value = next;
        document.getElementById('st-zoom').textContent = `${next}px`;
        this._resize();
        this.render();
      }
    }, { passive: false });
  }

  _cellAt(e) {
    const r = this.mainEl.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / this.CS);
    const y = Math.floor((e.clientY - r.top)  / this.CS);
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return null;
    return { x, y };
  }

  _onMouse(e) {
    const cell  = this._cellAt(e);
    const right = e.buttons === 2;
    if (this._onInteract) this._onInteract('draw', cell, right);
  }

  setInteractHandler(fn) { this._onInteract = fn; }
  setHoverHandler(fn)    { this._onHover    = fn; }

  setPreview(data) {
    this._preview = data;
    this._dirty   = true;
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this._dirty = true;
  }

  /* ── cell ops ── */
  cell(x, y) {
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return null;
    return this.grid[y][x];
  }

  paint(x, y, data) {
    const c = this.cell(x, y);
    if (!c) return;
    Object.assign(c, data);
    this._renderCell(x, y);
  }

  erase(x, y) {
    this.paint(x, y, { bg: '#000000', char: null });
  }

  fill(x, y, color) {
    const target = this.cell(x, y)?.bg;
    if (!target || target === color) return;
    const visited = new Set();
    const q = [[x, y]];
    while (q.length) {
      const [cx, cy] = q.shift();
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      const c = this.cell(cx, cy);
      if (!c || c.bg !== target) continue;
      visited.add(key);
      c.bg = color;
      q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
    this.render();
  }

  corrupt(x, y, radius = 2) {
    const chars = [...'▓▒░█▄▀■□◆◇○●◎★☆⊕⊗'];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.random() > 0.55) continue;
        const cx = x + dx, cy = y + dy;
        const c = this.cell(cx, cy);
        if (!c) continue;
        if (c.bg !== '#000000') {
          c.bg = this._shiftHex(c.bg, 60);
        } else {
          const v = Math.floor(Math.random() * 50 + 5);
          c.bg = `#${v.toString(16).padStart(2,'0').repeat(3)}`;
        }
        if (Math.random() > 0.5)
          c.char = chars[Math.floor(Math.random() * chars.length)];
      }
    }
    this.render();
  }

  drawLine(x0, y0, x1, y1, data) {
    const dx = Math.abs(x1-x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1-y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0;
    while (true) {
      this.paint(x, y, data);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  clear() {
    this._buildGrid();
    this.render();
    this._dirty = true;
    this._saveSnap();
    this._scheduleStorageSave();
  }

  resize(w, h, cs) {
    const old = this.grid;
    this.W = w; this.H = h; this.CS = cs;
    this._buildGrid();
    const copyH = Math.min(h, old.length);
    const copyW = Math.min(w, (old[0] || []).length);
    for (let y = 0; y < copyH; y++)
      for (let x = 0; x < copyW; x++)
        this.grid[y][x] = { ...old[y][x] };
    this._resize();
    this.render();
    this._saveSnap();
    document.getElementById('st-size').textContent = `${w}×${h}`;
    document.getElementById('st-zoom').textContent = `${cs}px`;
  }

  /* ── render (main canvas) ── */
  render() {
    const ctx = this._mCtx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.mainEl.width, this.mainEl.height);
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < this.W; x++)
        this._renderCell(x, y, ctx);
  }

  _renderCell(x, y, ctx) {
    ctx = ctx || this._mCtx;
    const c  = this.grid[y][x];
    const px = x * this.CS, py = y * this.CS, cs = this.CS;

    ctx.fillStyle = c.bg;
    ctx.fillRect(px, py, cs, cs);

    if (c.bg !== '#000000' && this.effects.get('glow')) {
      ctx.save();
      ctx.shadowColor = c.bg;
      ctx.shadowBlur  = this.effects.intensity('glow') * 12;
      ctx.fillRect(px, py, cs, cs);
      ctx.restore();
    }

    if (c.char) {
      ctx.save();
      if (this.effects.get('glow')) {
        ctx.shadowColor = c.charColor || '#78b15a';
        ctx.shadowBlur  = this.effects.intensity('glow') * 8;
      }
      ctx.fillStyle    = c.charColor || '#78b15a';
      ctx.font         = `${Math.floor(cs * 0.72)}px 'IBM Plex Mono',monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.char, px + cs/2, py + cs/2 + 1);
      ctx.restore();
    }
  }

  /* ── overlay RAF ── */
  _startRAF() {
    const tick = () => {
      this._raf = requestAnimationFrame(tick);
      this._frame++;
      const hasAnim = this.effects.get('flicker') || this.effects.get('noise') ||
                      (this.effects.get('scanlines') && this._frame % 30 === 0);
      if (this._dirty || hasAnim) {
        this._renderOverlayFrame();
        this._dirty = false;
      }
    };
    this._raf = requestAnimationFrame(tick);
  }

  _renderOverlayFrame() {
    const ctx = this._oCtx;
    const w   = this.overlayEl.width;
    const h   = this.overlayEl.height;
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    if (this.showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth   = 0.5;
      for (let x = 0; x <= this.W; x++) {
        ctx.beginPath(); ctx.moveTo(x*this.CS, 0); ctx.lineTo(x*this.CS, h); ctx.stroke();
      }
      for (let y = 0; y <= this.H; y++) {
        ctx.beginPath(); ctx.moveTo(0, y*this.CS); ctx.lineTo(w, y*this.CS); ctx.stroke();
      }
    }

    // Effects
    this.effects.render(ctx, w, h, this._frame);

    // Line preview
    if (this._preview?.type === 'line') {
      const { start, end } = this._preview;
      const cs = this.CS;
      // start dot
      ctx.fillStyle   = 'rgba(120,177,90,0.9)';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(start.x*cs + cs/2, start.y*cs + cs/2, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      // preview line
      ctx.strokeStyle = 'rgba(120,177,90,0.6)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(start.x*cs + cs/2, start.y*cs + cs/2);
      ctx.lineTo(end.x*cs   + cs/2, end.y*cs   + cs/2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Cursor
    if (this._cursorCell) {
      const { x, y } = this._cursorCell;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(x*this.CS + 0.5, y*this.CS + 0.5, this.CS-1, this.CS-1);
    }
  }

  // Public — called by effects panel to force refresh
  markDirty() { this._dirty = true; }

  /* ── history ── */
  _saveSnap() {
    const snap = this.grid.map(r => r.map(c => ({ ...c })));
    this.history = this.history.slice(0, this.hIdx + 1);
    this.history.push(snap);
    if (this.history.length > this.MAX_H) this.history.shift();
    else this.hIdx++;
    this._scheduleStorageSave();
  }

  saveSnap() { this._saveSnap(); }

  undo() {
    if (this.hIdx <= 0) return;
    this.hIdx--;
    this.grid = this.history[this.hIdx].map(r => r.map(c => ({ ...c })));
    this.render(); this._dirty = true;
  }

  redo() {
    if (this.hIdx >= this.history.length - 1) return;
    this.hIdx++;
    this.grid = this.history[this.hIdx].map(r => r.map(c => ({ ...c })));
    this.render(); this._dirty = true;
  }

  /* ── localStorage ── */
  _scheduleStorageSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._saveToStorage(), 800);
  }

  _saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        W: this.W, H: this.H, CS: this.CS, grid: this.grid,
      }));
    } catch {}
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s.grid || !s.W || !s.H) return false;
      this.W = s.W; this.H = s.H; this.CS = s.CS || 16;
      this.grid = s.grid;
      this._resize();
      this._saveSnap();
      // Sync inputs
      document.getElementById('grid-w').value  = this.W;
      document.getElementById('grid-h').value  = this.H;
      document.getElementById('cell-size').value = this.CS;
      document.getElementById('st-size').textContent = `${this.W}×${this.H}`;
      document.getElementById('st-zoom').textContent = `${this.CS}px`;
      return true;
    } catch { return false; }
  }

  clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ── import ── */
  importImage(file) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = this.W; off.height = this.H;
      const octx = off.getContext('2d');
      octx.drawImage(img, 0, 0, this.W, this.H);
      const data = octx.getImageData(0, 0, this.W, this.H).data;
      for (let y = 0; y < this.H; y++) {
        for (let x = 0; x < this.W; x++) {
          const i   = (y * this.W + x) * 4;
          const r   = data[i], g = data[i+1], b = data[i+2];
          const hex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
          const brightness = (r*0.299 + g*0.587 + b*0.114) / 255;
          this.grid[y][x] = {
            bg: hex,
            char: this.ascii.isAutoSuggest() ? brightnessToChar(brightness) : null,
            charColor: this._darken(hex, 0.55),
          };
        }
      }
      URL.revokeObjectURL(url);
      this.render(); this._dirty = true; this._saveSnap();
    };
    img.src = url;
  }

  /* ── seed generation ── */
  generateFromSeed(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++)
      h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    const rng = () => {
      h ^= h << 13; h ^= h >> 17; h ^= h << 5;
      return (h >>> 0) / 0xFFFFFFFF;
    };
    const chars = [...'█▓▒░▄▀■□◆◎●○'];
    const hues  = [120, 180, 60, 0, 270, 30];
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        if (rng() < 0.35) {
          const hue   = hues[Math.floor(rng() * hues.length)];
          const light = 20 + Math.floor(rng() * 50);
          const hex   = this._hslToHex(hue, 80, light);
          this.grid[y][x] = {
            bg: hex,
            char: rng() < 0.4 ? chars[Math.floor(rng() * chars.length)] : null,
            charColor: this._hslToHex(hue, 100, light + 20),
          };
        } else {
          this.grid[y][x] = { bg: '#000000', char: null, charColor: '#78b15a' };
        }
      }
    }
    this.render(); this._dirty = true; this._saveSnap();
  }

  /* ── export ── */
  getExportCanvas(scale = 1) {
    const out = document.createElement('canvas');
    out.width  = this.mainEl.width  * scale;
    out.height = this.mainEl.height * scale;
    const ctx  = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.mainEl, 0, 0, out.width, out.height);
    this.effects.render(ctx, out.width, out.height, 0);
    return out;
  }

  /* ── helpers ── */
  _shiftHex(hex, range) {
    const n = parseInt(hex.slice(1), 16);
    const s = (Math.random() - 0.5) * range * 2 | 0;
    const cl = v => Math.max(0, Math.min(255, v));
    const r = cl(((n>>16)&0xff)+s), g = cl(((n>>8)&0xff)+s), b = cl((n&0xff)+s);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  _darken(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.floor(((n>>16)&0xff)*f), g = Math.floor(((n>>8)&0xff)*f), b = Math.floor((n&0xff)*f);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  _hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1-l);
    const f = n => {
      const k = (n + h/30) % 12;
      return Math.round(255*(l - a*Math.max(Math.min(k-3, 9-k, 1), -1))).toString(16).padStart(2,'0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
}
