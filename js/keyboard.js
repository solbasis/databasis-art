export class Keyboard {
  constructor(tools, canvas, exporter) {
    this.tools    = tools;
    this.canvas   = canvas;
    this.exporter = exporter;
    this._bind();
  }

  _bind() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();

      if (e.ctrlKey || e.metaKey) {
        switch (key) {
          case 'z': e.preventDefault(); this.canvas.undo(); this._st('undo'); break;
          case 'y': e.preventDefault(); this.canvas.redo(); this._st('redo'); break;
          case 's': e.preventDefault(); this.exporter.exportPNG(); break;
          case 'g': e.preventDefault(); this.exporter.exportGIF(); break;
          case 'n': e.preventDefault();
            if (confirm('New canvas? Unsaved work will be lost.')) {
              this.canvas.clear();
              this._st('new canvas');
            }
            break;
        }
        return;
      }

      const toolMap = { p:'pencil', f:'fill', e:'eraser', i:'eyedropper', l:'line', x:'corrupt' };
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
