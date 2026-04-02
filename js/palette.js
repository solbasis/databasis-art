const SWATCHES = [
  '#000000','#111111','#222222','#444444','#777777','#aaaaaa',
  '#ffffff','#600000','#aa0000','#dd4444','#ff8888','#ffbbbb',
  '#604400','#aa7700','#ddaa44','#ffcc66','#ffe8aa','#fffadd',
  '#004400','#007700','#33aa55','#55cc77','#78b15a','#a4e07e',
  '#004455','#007799','#00aacc','#44ccdd','#88eeff','#ccffff',
  '#220044','#440088','#7733cc','#aa66ee','#cc99ff','#eeddff',
  // phosphor presets matching moods
  '#78b15a','#a4e07e','#c85a5a','#8888cc','#5ab1b1','#b19a5a',
];

export class Palette {
  constructor() {
    this.fg        = '#78b15a';
    this.bg        = '#000000';
    this.charColor = '#78b15a';

    this._renderGrid('palette-fg', c => this.setFg(c));
    this._renderGrid('palette-bg', c => this.setBg(c));
    this._bindPicker();
    this._bindCharColor();
    this._updatePreview();
  }

  getFg()        { return this.fg; }
  getBg()        { return this.bg; }
  getCharColor() { return this.charColor; }

  setFg(color) {
    this.fg = color;
    // Only sync char color if user hasn't manually decoupled them
    if (!this._charColorLocked) this.charColor = color;
    document.getElementById('color-picker').value = color;
    document.getElementById('color-hex').textContent = color;
    document.getElementById('st-color').textContent = color;
    this._updatePreview();
  }

  setBg(color) { this.bg = color; }

  setCharColor(color) {
    this.charColor = color;
    this._charColorLocked = true;
    document.getElementById('char-color-preview').style.background = color;
  }

  _updatePreview() {
    document.getElementById('color-preview').style.background = this.fg;
    if (!this._charColorLocked) {
      document.getElementById('char-color-preview').style.background = this.fg;
    }
  }

  _renderGrid(id, onClick) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    SWATCHES.forEach(color => {
      const sw = document.createElement('div');
      sw.className = 'p-swatch';
      sw.style.background = color;
      sw.title = color;
      sw.onclick = () => onClick(color);
      el.appendChild(sw);
    });
  }

  _bindPicker() {
    const picker  = document.getElementById('color-picker');
    const preview = document.getElementById('color-preview');
    preview.onclick = () => picker.click();
    picker.oninput  = () => this.setFg(picker.value);
  }

  _bindCharColor() {
    const picker  = document.getElementById('char-color-picker');
    const preview = document.getElementById('char-color-preview');
    if (!picker || !preview) return;
    preview.onclick = () => picker.click();
    picker.oninput  = () => this.setCharColor(picker.value);

    // Reset lock button
    const resetBtn = document.getElementById('char-color-reset');
    if (resetBtn) {
      resetBtn.onclick = () => {
        this._charColorLocked = false;
        this.charColor = this.fg;
        document.getElementById('char-color-preview').style.background = this.fg;
      };
    }
  }
}
