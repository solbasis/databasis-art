import { Canvas }      from './canvas.js';
import { Tools }       from './tools.js';
import { Palette }     from './palette.js';
import { AsciiPicker } from './ascii.js';
import { Effects }     from './effects.js';
import { MoodSystem }  from './mood.js';
import { Exporter }    from './export.js';
import { Keyboard }    from './keyboard.js';

function st(msg) {
  const el = document.getElementById('st-msg');
  if (el) el.innerHTML = msg + '<span class="blink">_</span>';
}

function init() {
  const effects  = new Effects();
  const palette  = new Palette();
  const ascii    = new AsciiPicker();
  const mood     = new MoodSystem(palette, effects);

  const canvas   = new Canvas(
    document.getElementById('main-canvas'),
    document.getElementById('overlay-canvas'),
    palette, ascii, effects
  );

  const tools    = new Tools(canvas, palette, ascii);
  const exporter = new Exporter(canvas, effects);
  new Keyboard(tools, canvas, exporter);

  // Render after load (canvas may have restored from localStorage)
  canvas.render();

  /* ── toolbar ── */
  document.getElementById('btn-new').onclick = () => {
    canvas.clear();
    canvas.clearStorage();
    st('new canvas');
  };

  document.getElementById('btn-import').onclick = () =>
    document.getElementById('file-import').click();

  document.getElementById('file-import').onchange = e => {
    const f = e.target.files[0];
    if (f) { canvas.importImage(f); st('importing...'); }
    e.target.value = '';
  };

  document.getElementById('btn-undo').onclick  = () => { canvas.undo(); st('undo'); };
  document.getElementById('btn-redo').onclick  = () => { canvas.redo(); st('redo'); };
  document.getElementById('btn-clear').onclick = () => { canvas.clear(); st('cleared'); };

  document.getElementById('btn-grid').onclick = () => {
    canvas.toggleGrid();
    const on = canvas.showGrid;
    document.getElementById('btn-grid').classList.toggle('active', on);
    st(on ? 'grid on' : 'grid off');
  };

  document.getElementById('btn-export-png').onclick = () => exporter.exportPNG();
  document.getElementById('btn-export-gif').onclick = () => exporter.exportGIF();

  /* ── resize ── */
  document.getElementById('btn-resize').onclick = () => {
    const w  = Math.max(4, Math.min(128, parseInt(document.getElementById('grid-w').value)  || 32));
    const h  = Math.max(4, Math.min(128, parseInt(document.getElementById('grid-h').value)  || 32));
    const cs = Math.max(4, Math.min(32,  parseInt(document.getElementById('cell-size').value)|| 16));
    canvas.resize(w, h, cs);
    st(`canvas ${w}×${h} @${cs}px`);
  };

  /* ── tools ── */
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tools.setTool(btn.dataset.tool);
      document.getElementById('st-tool').textContent = btn.dataset.tool.toUpperCase();
      st(btn.dataset.tool);
    };
  });

  /* ── mood ── */
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mood.apply(btn.dataset.mood);
      document.getElementById('st-mood').textContent = 'MOOD: ' + btn.dataset.mood.toUpperCase();
      canvas.render();
      canvas.markDirty();
      st('mood: ' + btn.dataset.mood);
    };
  });

  /* ── seed ── */
  document.getElementById('btn-seed').onclick = () => {
    const seed = document.getElementById('seed-input').value.trim();
    if (!seed) return;
    canvas.generateFromSeed(seed);
    st(`seed: "${seed}"`);
  };
  document.getElementById('seed-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-seed').click();
  });

  /* ── effects ── */
  ['scanlines','glow','vignette','noise','flicker'].forEach(fx => {
    const cb = document.getElementById(`fx-${fx}`);
    const sl = document.getElementById(`fx-${fx}-val`);
    cb.onchange = () => { effects.set(fx, cb.checked); canvas.markDirty(); };
    sl.oninput  = () => { effects.setIntensity(fx, sl.value / 100); canvas.markDirty(); };
  });

  /* ── collapsible sections ── */
  document.querySelectorAll('.ps-head').forEach(head => {
    head.style.cursor = 'pointer';
    head.onclick = () => {
      const section = head.closest('.ps');
      section.classList.toggle('collapsed');
    };
  });

  /* ── drag & drop ── */
  const area = document.getElementById('canvas-area');
  area.addEventListener('dragover',  e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) { canvas.importImage(f); st('importing...'); }
  });

  st('ready');
}

document.addEventListener('DOMContentLoaded', init);
