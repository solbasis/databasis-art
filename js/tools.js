export class Tools {
  constructor(canvas, palette, ascii) {
    this.canvas  = canvas;
    this.palette = palette;
    this.ascii   = ascii;
    this.current = 'pencil';

    this.lineStart = null;
    this.lineSnap  = null;

    canvas.setInteractHandler((event, cell, rightClick) => {
      if (event === 'up') { this._onUp(); return; }
      this._use(cell, rightClick);
    });
  }

  setTool(name) {
    this.current   = name;
    this.lineStart = null;
  }

  _use(cell, rightClick) {
    if (!cell) return;

    if (rightClick) {
      this.canvas.erase(cell.x, cell.y);
      return;
    }

    switch (this.current) {
      case 'pencil':
        this.canvas.paint(cell.x, cell.y, {
          bg:        this.palette.getFg(),
          char:      this.ascii.getChar(),
          charColor: this.palette.getFg(),
        });
        break;

      case 'eraser':
        this.canvas.erase(cell.x, cell.y);
        break;

      case 'fill':
        this.canvas.fill(cell.x, cell.y, this.palette.getFg());
        this.canvas.saveSnap();
        break;

      case 'eyedropper': {
        const c = this.canvas.cell(cell.x, cell.y);
        if (c) this.palette.setFg(c.bg);
        break;
      }

      case 'corrupt':
        this.canvas.corrupt(cell.x, cell.y, 2);
        break;

      case 'line':
        if (!this.lineStart) {
          this.lineStart = cell;
        } else {
          this.canvas.drawLine(
            this.lineStart.x, this.lineStart.y,
            cell.x, cell.y,
            { bg: this.palette.getFg(), char: this.ascii.getChar(), charColor: this.palette.getFg() }
          );
          this.lineStart = null;
          this.canvas.saveSnap();
        }
        break;
    }
  }

  _onUp() {
    if (this.current === 'pencil' || this.current === 'eraser' || this.current === 'corrupt') {
      this.canvas.saveSnap();
    }
  }
}
