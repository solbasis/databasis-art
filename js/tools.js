export class Tools {
  constructor(canvas, palette, ascii) {
    this.canvas  = canvas;
    this.palette = palette;
    this.ascii   = ascii;
    this.current = 'pencil';
    this.lineStart = null;

    canvas.setInteractHandler((event, cell, rightClick) => {
      if (event === 'up') { this._onUp(); return; }
      if (cell) this._use(cell, rightClick);
    });

    canvas.setHoverHandler(cell => {
      // Live line preview while hovering
      if (this.current === 'line' && this.lineStart && cell) {
        canvas.setPreview({ type: 'line', start: this.lineStart, end: cell });
      }
    });
  }

  setTool(name) {
    this.current   = name;
    this.lineStart = null;
    this.canvas.setPreview(null);
  }

  _paintData() {
    return {
      bg:        this.palette.getFg(),
      char:      this.ascii.getChar(),
      charColor: this.palette.getCharColor(),
    };
  }

  _use(cell, rightClick) {
    if (rightClick) {
      this.canvas.erase(cell.x, cell.y);
      return;
    }

    switch (this.current) {
      case 'pencil':
        this.canvas.paint(cell.x, cell.y, this._paintData());
        break;

      case 'eraser':
        this.canvas.erase(cell.x, cell.y);
        break;

      case 'fill':
        this.canvas.fill(cell.x, cell.y, this.palette.getFg());
        break;

      case 'eyedropper': {
        const c = this.canvas.cell(cell.x, cell.y);
        if (c) {
          this.palette.setFg(c.bg);
          // Switch back to pencil after picking
          document.querySelector('[data-tool="pencil"]')?.click();
        }
        break;
      }

      case 'corrupt':
        this.canvas.corrupt(cell.x, cell.y, 2);
        break;

      case 'line':
        if (!this.lineStart) {
          // First click: set start, show feedback in status
          this.lineStart = { ...cell };
          this.canvas.setPreview({ type: 'line', start: this.lineStart, end: cell });
          document.getElementById('st-msg').innerHTML =
            `line start: ${cell.x},${cell.y} — click to finish<span class="blink">_</span>`;
        } else {
          // Second click: draw and reset
          this.canvas.drawLine(
            this.lineStart.x, this.lineStart.y, cell.x, cell.y, this._paintData()
          );
          this.lineStart = null;
          this.canvas.setPreview(null);
          this.canvas.saveSnap();
        }
        break;
    }
  }

  _onUp() {
    if (['pencil', 'eraser', 'corrupt'].includes(this.current)) {
      this.canvas.saveSnap();
    }
    // fill saves inside canvas.fill (single save only)
  }
}
