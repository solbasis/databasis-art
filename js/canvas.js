import { brightnessToChar } from './ascii.js';

export class Canvas {
  constructor(mainEl, overlayEl, palette, ascii, effects) {
    this.mainEl    = mainEl;
    this.overlayEl = overlayEl;
    this.palette   = palette;
    this.ascii     = ascii;
    this.effects   = effects;

    this.W = 32; // grid cols
    this.H = 32; // grid rows
    this.CS = 16; // cell size px

    this.grid    = [];
    this.history = [];
    this.hIdx    = -1;
    this.MAX_H   = 60;

    this.drawing  = false;
    this.lastCell = null;
    this.lineStart = null;
    this.linePreview = [];

    this._onInteract = null;

    this._frame  = 0;
    this._flickerRaf = null;

    this._init();
  }

  /* ── init ── */
  _init() {
    this._buildGrid();
    this._resize();
    this._bindMouse();
    this._saveSnap();
    this._startFlicker();
    this.render();
  }

  _buildGrid() {
    this.grid = Array.from({ length: this.H }, () =>
      Array.from({ length: this.W }, () => ({ bg: '#000000', char: null, charColor: '#00ff41' }))
    );
  }

  _resize() {
    const w = this.W * this.CS;
    const h = this.H * this.CS;
    [this.mainEl, this.overlayEl].forEach(el => {
      el.width  = w; el.height  = h;
      el.style.width = w + 'px'; el.style.height = h + 'px';
    });
    const container = this.mainEl.parentElement;
    container.style.width  = w + 'px';
    container.style.height = h + 'px';
  }

  /* ── mouse ── */
  _bindMouse() {
    const el = this.overlayEl;

    el.addEventListener('contextmenu', e => e.preventDefault());

    el.addEventListener('mousedown', e => {
      e.preventDefault();
      this.drawing = true;
      this._onMouse(e);
    });

    el.addEventListener('mousemove', e => {
      const cell = this._cellAt(e);
      if (cell) document.getElementById('st-coords').textContent = `x:${cell.x} y:${cell.y}`;
      if (this.drawing) this._onMouse(e);
      this._drawCursor(cell);
    });

    el.addEventListener('mouseup', () => {
      if (this.drawing) {
        this.drawing  = false;
        this.lastCell = null;
        if (this._onInteract) this._onInteract('up', null, null);
        this._saveSnap();
      }
    });

    el.addEventListener('mouseleave', () => {
      this.drawing  = false;
      this.lastCell = null;
      this.renderOverlay();
    });

    el.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 2 : -2;
      const next  = Math.max(4, Math.min(32, this.CS + delta));
      if (next !== this.CS) {
        this.CS = next;
        document.getElementById('cell-size').value = next;
        this._resize();
        this.render();
        this.renderOverlay();
      }
    }, { passive: false });
  }

  _cellAt(e) {
    const r = this.overlayEl.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left)  / this.CS);
    const y = Math.floor((e.clientY - r.top)   / this.CS);
    if (x < 0 || x >= this.W || y < 0 || y >= this.H) return null;
    return { x, y };
  }

  _onMouse(e) {
    const cell = this._cellAt(e);
    if (!cell) return;
    const right = e.buttons === 2;
    if (this._onInteract) this._onInteract('draw', cell, right);
    this.lastCell = cell;
  }

  _drawCursor(cell) {
    this.renderOverlay();
    if (!cell) return;
    const ctx = this.overlayEl.getContext('2d');
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(
      cell.x * this.CS + 0.5,
      cell.y * this.CS + 0.5,
      this.CS - 1, this.CS - 1
    );
  }

  setInteractHandler(fn) { this._onInteract = fn; }

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
        if (Math.random() > 0.5) {
          c.char = chars[Math.floor(Math.random() * chars.length)];
        }
      }
    }
    this.render();
  }

  drawLine(x0, y0, x1, y1, data) {
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0, y = y0;
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
    this.renderOverlay();
    this._saveSnap();
  }

  resize(w, h, cs) {
    const old = this.grid;
    this.W = w; this.H = h; this.CS = cs;
    this._buildGrid();
    const copyH = Math.min(h, old.length);
    const copyW = Math.min(w, old[0]?.length || 0);
    for (let y = 0; y < copyH; y++)
      for (let x = 0; x < copyW; x++)
        this.grid[y][x] = { ...old[y][x] };
    this._resize();
    this.render();
    this.renderOverlay();
    this._saveSnap();
    document.getElementById('st-size').textContent = `${w}x${h}`;
  }

  /* ── render ── */
  render() {
    const ctx = this.mainEl.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.mainEl.width, this.mainEl.height);
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < this.W; x++)
        this._renderCell(x, y, ctx);
  }

  _renderCell(x, y, ctx) {
    if (!ctx) ctx = this.mainEl.getContext('2d');
    const c   = this.grid[y][x];
    const px  = x * this.CS;
    const py  = y * this.CS;
    const cs  = this.CS;

    ctx.fillStyle = c.bg;
    ctx.fillRect(px, py, cs, cs);

    if (c.bg !== '#000000' && this.effects.get('glow')) {
      ctx.save();
      ctx.shadowColor = c.bg;
      ctx.shadowBlur  = this.effects.intensity('glow') * 12;
      ctx.fillStyle   = c.bg;
      ctx.fillRect(px, py, cs, cs);
      ctx.restore();
    }

    if (c.char) {
      ctx.save();
      if (this.effects.get('glow')) {
        ctx.shadowColor = c.charColor || '#00ff41';
        ctx.shadowBlur  = this.effects.intensity('glow') * 8;
      }
      ctx.fillStyle    = c.charColor || '#00ff41';
      ctx.font         = `${Math.floor(cs * 0.72)}px 'Courier New',monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.char, px + cs / 2, py + cs / 2 + 1);
      ctx.restore();
    }
  }

  renderOverlay(frame) {
    const ctx = this.overlayEl.getContext('2d');
    const w   = this.overlayEl.width;
    const h   = this.overlayEl.height;
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth   = 0.5;
    for (let x = 0; x <= this.W; x++) {
      ctx.beginPath(); ctx.moveTo(x * this.CS, 0); ctx.lineTo(x * this.CS, h); ctx.stroke();
    }
    for (let y = 0; y <= this.H; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * this.CS); ctx.lineTo(w, y * this.CS); ctx.stroke();
    }

    this.effects.render(ctx, w, h, frame ?? this._frame);
  }

  /* ── flicker loop ── */
  _startFlicker() {
    const tick = () => {
      this._frame++;
      if (this.effects.get('flicker') || this.effects.get('scanlines') || this.effects.get('noise')) {
        this.renderOverlay(this._frame);
      }
      this._flickerRaf = requestAnimationFrame(tick);
    };
    this._flickerRaf = requestAnimationFrame(tick);
  }

  /* ── history ── */
  _saveSnap() {
    const snap = this.grid.map(row => row.map(c => ({ ...c })));
    this.history = this.history.slice(0, this.hIdx + 1);
    this.history.push(snap);
    if (this.history.length > this.MAX_H) this.history.shift();
    else this.hIdx++;
  }

  undo() {
    if (this.hIdx <= 0) return;
    this.hIdx--;
    this.grid = this.history[this.hIdx].map(r => r.map(c => ({ ...c })));
    this.render(); this.renderOverlay();
  }

  redo() {
    if (this.hIdx >= this.history.length - 1) return;
    this.hIdx++;
    this.grid = this.history[this.hIdx].map(r => r.map(c => ({ ...c })));
    this.render(); this.renderOverlay();
  }

  saveSnap() { this._saveSnap(); }

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
          const i = (y * this.W + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const hex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          this.grid[y][x] = {
            bg: hex,
            char: this.ascii.isAutoSuggest() ? brightnessToChar(brightness) : null,
            charColor: this._darken(hex, 0.55),
          };
        }
      }
      URL.revokeObjectURL(url);
      this.render(); this.renderOverlay(); this._saveSnap();
    };
    img.src = url;
  }

  /* ── seed generation ── */
  generateFromSeed(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    const rng = () => {
      h ^= h << 13; h ^= h >> 17; h ^= h << 5;
      return ((h >>> 0) / 0xFFFFFFFF);
    };

    const chars = [...'█▓▒░▄▀■□◆◎●○'];
    const hues  = [120, 180, 60, 0, 270, 30]; // green, cyan, yellow, red, purple, orange

    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const r = rng();
        if (r < 0.35) {
          const hue   = hues[Math.floor(rng() * hues.length)];
          const light = 20 + Math.floor(rng() * 50);
          const hex   = this._hslToHex(hue, 80, light);
          this.grid[y][x] = {
            bg: hex,
            char: rng() < 0.4 ? chars[Math.floor(rng() * chars.length)] : null,
            charColor: this._hslToHex(hue, 100, light + 20),
          };
        } else {
          this.grid[y][x] = { bg: '#000000', char: null, charColor: '#00ff41' };
        }
      }
    }
    this.render(); this.renderOverlay(); this._saveSnap();
  }

  /* ── export ── */
  getExportCanvas() {
    const out = document.createElement('canvas');
    out.width  = this.mainEl.width;
    out.height = this.mainEl.height;
    const ctx  = out.getContext('2d');
    ctx.drawImage(this.mainEl, 0, 0);
    // Bake effects (single frame, no animation)
    this.effects.render(ctx, out.width, out.height, 0);
    return out;
  }

  /* ── helpers ── */
  _shiftHex(hex, range) {
    const n   = parseInt(hex.slice(1), 16);
    const shift = (Math.random() - 0.5) * range * 2 | 0;
    const clamp = v => Math.max(0, Math.min(255, v));
    const r = clamp(((n >> 16) & 0xff) + shift);
    const g = clamp(((n >>  8) & 0xff) + shift);
    const b = clamp(( n        & 0xff) + shift);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  _darken(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.floor(((n >> 16) & 0xff) * factor);
    const g = Math.floor(((n >>  8) & 0xff) * factor);
    const b = Math.floor(( n        & 0xff) * factor);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  _hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2,'0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
}
