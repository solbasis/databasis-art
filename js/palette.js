const SWATCHES = [
  // terminal classics
  '#000000','#1a1a1a','#333333','#555555','#888888','#cccccc',
  '#ffffff','#800000','#ff0000','#ff6b6b','#ff9900','#ffcc00',
  '#ffff00','#007700','#00aa44','#00ff41','#00cc99','#00ffff',
  '#0088ff','#0044cc','#000080','#6600cc','#cc00ff','#ff00aa',
  // phosphor presets
  '#00ff41','#33ff66','#00cc33','#007722',
  '#ffb300','#ffd060','#cc8800','#664400',
  '#00ffff','#80ffff','#0088bb','#003344',
  '#ff3131','#ff6b6b','#aa1111','#440000',
];

export class Palette {
  constructor() {
    this.fg = '#78b15a';
    this.bg = '#000000';
    this._renderGrid('palette-fg', c => this.setFg(c));
    this._renderGrid('palette-bg', c => this.setBg(c));
    this._bindPicker();
    this._updatePreview();
  }

  getFg() { return this.fg; }
  getBg() { return this.bg; }

  setFg(color) {
    this.fg = color;
    document.getElementById('color-picker').value = color;
    document.getElementById('color-hex').textContent = color;
    this._updatePreview();
    document.getElementById('st-color').textContent = color;
  }

  setBg(color) {
    this.bg = color;
  }

  _updatePreview() {
    document.getElementById('color-preview').style.background  = this.fg;
  }

  _renderGrid(id, onClick) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    SWATCHES.forEach(color => {
      const sw = document.createElement('div');
      sw.className = 'p-swatch';
      sw.style.background = color;
      sw.title = color;
      sw.onclick = () => { onClick(color); };
      el.appendChild(sw);
    });
  }

  _bindPicker() {
    const picker = document.getElementById('color-picker');
    const preview = document.getElementById('color-preview');
    preview.onclick = () => picker.click();
    picker.oninput = () => this.setFg(picker.value);
  }
}
