import { Symmetry } from './symmetry.js';

export class Tools {
  constructor(canvas, palette, ascii, symmetry) {
    this.canvas    = canvas;
    this.palette   = palette;
    this.ascii     = ascii;
    this.symmetry  = symmetry || new Symmetry();
    this.current   = 'pencil';
    this.lineStart = null;

    // Select-tool state
    this._selMode  = null;   // 'drag' | 'move'
    this._selStart = null;   // {x,y} cell where mousedown began
    this._selOrig  = null;   // {x1,y1,x2,y2} selection rect at lift time

    canvas.setInteractHandler((event, cell, rightClick) => {
      switch (event) {
        case 'down': this._onDown(cell, rightClick); break;
        case 'move': this._onMove(cell, rightClick); break;
        case 'up':   this._onUp(cell);               break;
      }
    });

    canvas.setHoverHandler(cell => {
      if (this.current === 'line' && this.lineStart && cell)
        canvas.setPreview({ type: 'line', start: this.lineStart, end: cell });
    });
  }

  setTool(name) {
    this.current   = name;
    this.lineStart = null;
    this._selMode  = null;
    this._selStart = null;
    this._selOrig  = null;
    this.canvas.setPreview(null);
    if (name !== 'select') this.canvas.clearSelection();

    // Toggle selection toolbar visibility
    const selTb = document.getElementById('sel-toolbar');
    if (selTb) selTb.classList.toggle('hidden', name !== 'select');
  }

  /* ── paint data ── */

  _paintData() {
    return {
      bg:        this.palette.getFg(),
      char:      this.ascii.getChar(),
      charColor: this.palette.getCharColor(),
    };
  }

  /** Paint cell + all symmetry mirrors */
  _applyPaint(x, y, data) {
    this.canvas.paint(x, y, data);
    this.symmetry.mirrors(x, y, this.canvas.W, this.canvas.H)
      .forEach(m => this.canvas.paint(m.x, m.y, data));
  }

  /** Erase cell + all symmetry mirrors */
  _applyErase(x, y) {
    this.canvas.erase(x, y);
    this.symmetry.mirrors(x, y, this.canvas.W, this.canvas.H)
      .forEach(m => this.canvas.erase(m.x, m.y));
  }

  /** Corrupt cell + all symmetry mirrors */
  _applyCorrupt(x, y, r) {
    this.canvas.corrupt(x, y, r);
    this.symmetry.mirrors(x, y, this.canvas.W, this.canvas.H)
      .forEach(m => this.canvas.corrupt(m.x, m.y, r));
  }

  /* ── event handlers ── */

  _onDown(cell, rightClick) {
    if (!cell) return;

    if (rightClick && this.current !== 'select') {
      this._applyErase(cell.x, cell.y);
      return;
    }

    switch (this.current) {

      case 'pencil':
        this._applyPaint(cell.x, cell.y, this._paintData());
        break;

      case 'eraser':
        this._applyErase(cell.x, cell.y);
        break;

      case 'corrupt':
        this._applyCorrupt(cell.x, cell.y, 2);
        break;

      case 'fill':
        this.canvas.fill(cell.x, cell.y, this.palette.getFg());
        this.canvas.saveSnap(); // fill is one-shot — save immediately
        break;

      case 'eyedropper': {
        const c = this.canvas.cell(cell.x, cell.y);
        if (c) {
          this.palette.setFg(c.bg);
          document.querySelector('[data-tool="pencil"]')?.click();
        }
        break;
      }

      case 'line':
        if (!this.lineStart) {
          this.lineStart = { ...cell };
          this.canvas.setPreview({ type: 'line', start: this.lineStart, end: cell });
          document.getElementById('st-msg').innerHTML =
            `line start: ${cell.x},${cell.y} — click to finish<span class="blink">_</span>`;
        } else {
          this.canvas.drawLine(
            this.lineStart.x, this.lineStart.y,
            cell.x, cell.y,
            this._paintData()
          );
          this.lineStart = null;
          this.canvas.setPreview(null);
          this.canvas.saveSnap();
        }
        break;

      case 'select': {
        this._selStart = { ...cell };
        if (this.canvas.isInsideSelection(cell.x, cell.y)) {
          // Lift current selection and begin move
          this._selMode = 'move';
          this._selOrig = { ...this.canvas.getSelection() };
          this.canvas.liftSelection();
        } else {
          // Start new drag-select
          this._selMode = 'drag';
          this.canvas.setSelection(cell.x, cell.y, cell.x, cell.y);
        }
        break;
      }
    }
  }

  _onMove(cell, rightClick) {
    if (!cell) return;

    if (rightClick && this.current !== 'select') {
      this._applyErase(cell.x, cell.y);
      return;
    }

    switch (this.current) {

      case 'pencil':
        this._applyPaint(cell.x, cell.y, this._paintData());
        break;

      case 'eraser':
        this._applyErase(cell.x, cell.y);
        break;

      case 'corrupt':
        this._applyCorrupt(cell.x, cell.y, 2);
        break;

      case 'select':
        if (this._selMode === 'drag' && this._selStart) {
          this.canvas.setSelection(
            this._selStart.x, this._selStart.y,
            cell.x, cell.y
          );
        } else if (this._selMode === 'move' && this._selStart && this._selOrig) {
          const dx = cell.x - this._selStart.x;
          const dy = cell.y - this._selStart.y;
          this.canvas.previewMoveAt(
            this._selOrig.x1 + dx,
            this._selOrig.y1 + dy
          );
        }
        break;
    }
  }

  _onUp(cell) {
    switch (this.current) {

      case 'pencil':
      case 'eraser':
      case 'corrupt':
        this.canvas.saveSnap();
        break;

      case 'select':
        if (this._selMode === 'move') {
          // commitMove() handles saveSnap internally
          this.canvas.commitMove();
        }
        this._selMode  = null;
        this._selStart = null;
        this._selOrig  = null;
        break;
    }
  }
}
