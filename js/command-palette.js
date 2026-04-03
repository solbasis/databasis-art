const _registry = [];

export function register(name, shortcut, tags, action) {
  _registry.push({ name, shortcut: shortcut || '', tags: tags || [], action });
}

function fuzzyMatch(str, query) {
  if (!query) return true;
  str = str.toLowerCase();
  query = query.toLowerCase();
  let si = 0;
  for (let i = 0; i < query.length; i++) {
    si = str.indexOf(query[i], si);
    if (si === -1) return false;
    si++;
  }
  return true;
}

export class CommandPalette {
  constructor() {
    this.el      = document.getElementById('cmd-palette');
    this.input   = document.getElementById('cmd-input');
    this.list    = document.getElementById('cmd-list');
    this.active  = -1;
    this.visible = false;
    this._results = [];
    this._bind();
  }

  open() {
    this.visible = true;
    this.el.classList.remove('hidden');
    this.input.value = '';
    this.active = -1;
    this._render('');
    requestAnimationFrame(() => this.input.focus());
  }

  close() {
    this.visible = false;
    this.el.classList.add('hidden');
    this.input.value = '';
  }

  toggle() { this.visible ? this.close() : this.open(); }

  _render(query) {
    this._results = _registry.filter(c =>
      fuzzyMatch(c.name, query) ||
      c.tags.some(t => fuzzyMatch(t, query))
    );
    this.list.innerHTML = '';
    this._results.forEach((cmd, i) => {
      const row = document.createElement('div');
      row.className = 'cmd-row' + (i === this.active ? ' active' : '');
      row.innerHTML = `
        <span class="cmd-name">${this._highlight(cmd.name, query)}</span>
        ${cmd.shortcut ? `<span class="cmd-key">${cmd.shortcut}</span>` : ''}
      `;
      row.onmouseenter = () => { this.active = i; this._updateActive(); };
      row.onclick = () => this._execute(i);
      this.list.appendChild(row);
    });
    if (this.active >= this._results.length) this.active = this._results.length - 1;
  }

  _highlight(name, query) {
    if (!query) return name;
    let result = '';
    let ni = 0;
    const q = query.toLowerCase();
    const n = name.toLowerCase();
    for (let qi = 0; qi < q.length && ni < name.length; ) {
      const idx = n.indexOf(q[qi], ni);
      if (idx === -1) break;
      result += name.slice(ni, idx) + `<mark>${name[idx]}</mark>`;
      ni = idx + 1;
      qi++;
    }
    result += name.slice(ni);
    return result;
  }

  _updateActive() {
    [...this.list.children].forEach((el, i) => {
      el.classList.toggle('active', i === this.active);
    });
    const active = this.list.children[this.active];
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  _execute(i) {
    const cmd = this._results[i];
    if (cmd) { this.close(); cmd.action(); }
  }

  _bind() {
    this.input.addEventListener('input', () => {
      this.active = 0;
      this._render(this.input.value.trim());
    });

    this.input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.active = Math.min(this.active + 1, this._results.length - 1);
        this._updateActive();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.active = Math.max(this.active - 1, 0);
        this._updateActive();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._execute(this.active);
      } else if (e.key === 'Escape') {
        this.close();
      }
    });

    // Click backdrop to close
    this.el.addEventListener('mousedown', e => {
      if (e.target === this.el) this.close();
    });
  }
}
