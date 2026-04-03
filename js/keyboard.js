export class Keyboard {
  constructor(tools, canvas, exporter, cmdPalette) {
    this.tools      = tools;
    this.canvas     = canvas;
    this.exporter   = exporter;
    this.cmdPalette = cmdPalette || null;
    this._bind();
  }

  _bind() {
    document.addEventListener('keydown', e => {
      // Allow input in palette's own input box but nothing else
      const tag = e.target.tagName;
      if ((tag === 'INPUT' || tag === 'TEXTAREA') &&
          e.target.id !== 'cmd-input') return;

      const key = e.key.toLowerCase();

      /* ── Ctrl / Meta combos ── */
      if (e.ctrlKey || e.metaKey) {
        switch (key) {
          case 'z': e.preventDefault(); this.canvas.undo(); this._st('undo'); break;
          case 'y': e.preventDefault(); this.canvas.redo(); this._st('redo'); break;
          case 's': e.preventDefault(); this.exporter.exportPNG(); break;
          case 'g': e.preventDefault(); this.exporter.exportGIF(); break;
          case 'k':
            e.preventDefault();
            if (this.cmdPalette) this.cmdPalette.toggle();
            break;
          case 'n':
            e.preventDefault();
            if (confirm('New canvas? Unsaved work will be lost.')) {
              this.canvas.clear();
              this._st('new canvas');
            }
            break;
        }
        return;
      }

      /* ── Escape: deselect / close palette ── */
      if (e.key === 'Escape') {
        if (this.cmdPalette?.visible) { this.cmdPalette.close(); return; }
        this.canvas.clearSelection();
        return;
      }

      /* ── Delete / Backspace: delete selection ── */
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.canvas.getSelection()) {
          e.preventDefault();
          this.canvas.deleteSelection();
        }
        return;
      }

      /* ── Arrow keys: nudge selection ── */
      if (e.key.startsWith('Arrow') && this.tools.current === 'select') {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        switch (e.key) {
          case 'ArrowLeft':  this.canvas.nudgeSelection(-step, 0); break;
          case 'ArrowRight': this.canvas.nudgeSelection( step, 0); break;
          case 'ArrowUp':    this.canvas.nudgeSelection(0, -step); break;
          case 'ArrowDown':  this.canvas.nudgeSelection(0,  step); break;
        }
        return;
      }

      /* ── Don't intercept keys if command palette is open ── */
      if (this.cmdPalette?.visible) return;

      /* ── Tool shortcuts ── */
      const toolMap = {
        p: 'pencil',
        f: 'fill',
        e: 'eraser',
        i: 'eyedropper',
        l: 'line',
        x: 'corrupt',
        s: 'select',
      };

      if (toolMap[key]) {
        this.tools.setTool(toolMap[key]);
        document.querySelectorAll('.tool-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.tool === toolMap[key]);
        });
        document.getElementById('st-tool').textContent = toolMap[key].toUpperCase();
      }
    });
  }

  _st(msg) {
    const el = document.getElementById('st-msg');
    if (el) el.innerHTML = msg + '<span class="blink">_</span>';
  }
}
