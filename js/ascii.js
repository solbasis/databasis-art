const SETS = {
  'ascii-blocks':  [...'█▓▒░▄▀▌▐■□▪▫▬▲▼◄►◆◇'],
  'ascii-box':     [...'┌┐└┘│─┤├┬┴┼╔╗╚╝║═╠╣╦╩╬╒╓╕╖╘╙╛╜'],
  'ascii-symbols': [...'★☆◎●○◐◑◒◓◔◕⊕⊗⊙♦♣♠♥✦✧✨⚡⚠☠☢☣♻⟨⟩'],
  'ascii-braille': [...'⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟'],
};

// Map brightness 0-1 → ASCII char
const BRIGHTNESS_MAP = [
  [0.00, '█'], [0.15, '▓'], [0.30, '▒'], [0.45, '░'],
  [0.60, ':'], [0.75, '.'], [0.90, ' '],
];

export function brightnessToChar(b) {
  for (let i = BRIGHTNESS_MAP.length - 1; i >= 0; i--) {
    if (b >= BRIGHTNESS_MAP[i][0]) return BRIGHTNESS_MAP[i][1];
  }
  return '█';
}

export class AsciiPicker {
  constructor() {
    this.char = null;
    this.autoSuggest = false;
    this._render();
    this._bindInput();
  }

  getChar() { return this.char; }

  setChar(ch) {
    this.char = ch || null;
    const input = document.getElementById('ascii-char-input');
    if (input) input.value = ch || '';
    document.getElementById('st-char').textContent = ch ? `CHAR: ${ch}` : 'CHAR: none';
    document.querySelectorAll('.a-char').forEach(el => {
      el.classList.toggle('active', el.dataset.ch === ch);
    });
  }

  isAutoSuggest() { return this.autoSuggest; }

  _render() {
    for (const [id, chars] of Object.entries(SETS)) {
      const grid = document.getElementById(id);
      if (!grid) continue;
      grid.innerHTML = '';
      chars.forEach(ch => {
        const el = document.createElement('div');
        el.className = 'a-char';
        el.textContent = ch;
        el.dataset.ch = ch;
        el.title = `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')}`;
        el.onclick = () => this.setChar(this.char === ch ? null : ch);
        grid.appendChild(el);
      });
    }
  }

  _bindInput() {
    const input = document.getElementById('ascii-char-input');
    input.oninput = () => {
      const ch = [...input.value].pop() || null;
      this.char = ch;
      document.getElementById('st-char').textContent = ch ? `CHAR: ${ch}` : 'CHAR: none';
      document.querySelectorAll('.a-char').forEach(el => el.classList.remove('active'));
    };

    document.getElementById('ascii-clear-btn').onclick = () => this.setChar(null);

    const autoBox = document.getElementById('ascii-auto');
    autoBox.onchange = () => { this.autoSuggest = autoBox.checked; };
  }
}
