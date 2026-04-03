export class Symmetry {
  constructor() {
    this.mode = 'none'; // none | h | v | quad | radial8
  }

  setMode(mode) { this.mode = mode; }
  getMode()     { return this.mode; }

  /** Return all additional cells that should be painted when (x,y) is drawn */
  mirrors(x, y, W, H) {
    const mx = W - 1 - x;
    const my = H - 1 - y;
    switch (this.mode) {
      case 'h':       return [{ x: mx, y }];
      case 'v':       return [{ x, y: my }];
      case 'quad':    return [{ x: mx, y }, { x, y: my }, { x: mx, y: my }];
      case 'radial8': return this._radial8(x, y, W, H);
      default:        return [];
    }
  }

  _radial8(x, y, W, H) {
    // Reflect across horizontal, vertical, and both diagonals
    const cx = (W - 1) / 2, cy = (H - 1) / 2;
    const dx = x - cx, dy = y - cy;
    const pts = new Map();
    const add = (px, py) => {
      const rx = Math.round(px), ry = Math.round(py);
      if (rx >= 0 && rx < W && ry >= 0 && ry < H) {
        pts.set(`${rx},${ry}`, { x: rx, y: ry });
      }
    };
    add(cx - dx, cy + dy); // h mirror
    add(cx + dx, cy - dy); // v mirror
    add(cx - dx, cy - dy); // quad
    add(cx + dy, cy + dx); // diagonal
    add(cx - dy, cy + dx); // diagonal h
    add(cx + dy, cy - dx); // diagonal v
    add(cx - dy, cy - dx); // diagonal quad
    pts.delete(`${x},${y}`);
    return [...pts.values()];
  }
}
