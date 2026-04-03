import { Canvas }          from './canvas.js';
import { Tools }           from './tools.js';
import { Palette }         from './palette.js';
import { AsciiPicker }     from './ascii.js';
import { Effects }         from './effects.js';
import { MoodSystem }      from './mood.js';
import { Exporter }        from './export.js';
import { Keyboard }        from './keyboard.js';
import { Timeline }        from './timeline.js';
import { WebGLRenderer }   from './webgl.js';
import { Symmetry }        from './symmetry.js';
import { CommandPalette, register } from './command-palette.js';

function st(msg) {
  const el = document.getElementById('st-msg');
  if (el) el.innerHTML = msg + '<span class="blink">_</span>';
}

function init() {
  /* ── Core systems ── */
  const effects  = new Effects();
  const palette  = new Palette();
  const ascii    = new AsciiPicker();
  const mood     = new MoodSystem(palette, effects);
  const symmetry = new Symmetry();

  /* ── Canvas (6-param constructor includes webglEl) ── */
  const canvas = new Canvas(
    document.getElementById('main-canvas'),
    document.getElementById('overlay-canvas'),
    document.getElementById('webgl-canvas'),
    palette, ascii, effects
  );

  /* ── WebGL CRT renderer ── */
  const webgl = new WebGLRenderer(document.getElementById('webgl-canvas'));
  canvas.webgl = webgl;

  /* ── Timeline ── */
  const timeline = new Timeline(canvas);
  canvas.timeline = timeline;

  /* ── Tools, Exporter, Keyboard ── */
  const tools    = new Tools(canvas, palette, ascii, symmetry);
  const exporter = new Exporter(canvas, effects);
  exporter.timeline = timeline;

  /* ── Command palette (registered below) ── */
  const cmdPalette = new CommandPalette();

  new Keyboard(tools, canvas, exporter, cmdPalette);

  /* ── Initial render ── */
  canvas.render();

  /* ────────────────────────────────────────────────────
     Register ALL commands
  ──────────────────────────────────────────────────── */

  // Tools
  const activateTool = name => {
    tools.setTool(name);
    document.querySelectorAll('.tool-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tool === name));
    document.getElementById('st-tool').textContent = name.toUpperCase();
    st(name);
  };
  register('Draw (Pencil)',           'P',      ['tool','draw','pencil'],   () => activateTool('pencil'));
  register('Fill Bucket',             'F',      ['tool','fill','bucket'],   () => activateTool('fill'));
  register('Eraser',                  'E',      ['tool','erase'],           () => activateTool('eraser'));
  register('Color Picker (Eyedrop)',  'I',      ['tool','pick','color'],    () => activateTool('eyedropper'));
  register('Line Tool',               'L',      ['tool','line'],            () => activateTool('line'));
  register('Glitch / Corrupt',        'X',      ['tool','glitch','corrupt'],() => activateTool('corrupt'));
  register('Select & Move',           'S',      ['tool','select','move'],   () => activateTool('select'));

  // Canvas actions
  register('Undo',                    'Ctrl+Z', ['canvas','undo'],          () => { canvas.undo(); st('undo'); });
  register('Redo',                    'Ctrl+Y', ['canvas','redo'],          () => { canvas.redo(); st('redo'); });
  register('Clear Canvas',            '',       ['canvas','clear','reset'], () => { canvas.clear(); st('cleared'); });
  register('New Canvas',              'Ctrl+N', ['canvas','new'],           () => {
    if (confirm('New canvas? Unsaved work will be lost.')) { canvas.clear(); st('new canvas'); }
  });
  register('Toggle Grid',             'G',      ['grid','canvas'],          () => {
    canvas.toggleGrid();
    document.getElementById('btn-grid').classList.toggle('active', canvas.showGrid);
    st(canvas.showGrid ? 'grid on' : 'grid off');
  });

  // Selection
  register('Flip Selection Horizontal','',     ['select','flip','h'],      () => { canvas.flipSelectionH(); st('flip H'); });
  register('Flip Selection Vertical',  '',     ['select','flip','v'],      () => { canvas.flipSelectionV(); st('flip V'); });
  register('Delete Selection',        'Del',   ['select','delete','clear'],() => { canvas.deleteSelection(); st('deleted'); });
  register('Deselect',                'Esc',   ['select','deselect'],      () => { canvas.clearSelection(); });

  // Symmetry
  const applySym = mode => {
    symmetry.setMode(mode);
    document.querySelectorAll('.sym-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.sym === mode));
    st(`symmetry: ${mode}`);
  };
  register('No Symmetry',       '',  ['symmetry','none'],       () => applySym('none'));
  register('Mirror Horizontal', '',  ['symmetry','mirror','h'], () => applySym('h'));
  register('Mirror Vertical',   '',  ['symmetry','mirror','v'], () => applySym('v'));
  register('4-Way Mirror',      '',  ['symmetry','quad'],       () => applySym('quad'));
  register('8-Way Radial',      '',  ['symmetry','radial','8'], () => applySym('radial8'));

  // Mood
  const applyMood = m => {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('active', b.dataset.mood === m));
    mood.apply(m);
    document.getElementById('st-mood').textContent = 'MOOD: ' + m.toUpperCase();
    canvas.render(); canvas.markDirty();
    st('mood: ' + m);
  };
  register('Mood: Clean',        '', ['mood','clean'],       () => applyMood('clean'));
  register('Mood: Corrupted',    '', ['mood','corrupt','red'],() => applyMood('corrupted'));
  register('Mood: Haunted',      '', ['mood','haunted','blue'],() => applyMood('haunted'));
  register('Mood: Electric',     '', ['mood','electric','teal'],() => applyMood('electric'));
  register('Mood: Dead',         '', ['mood','dead','grey'], () => applyMood('dead'));
  register('Mood: Transmission', '', ['mood','signal'],      () => applyMood('transmission'));

  // Timeline
  register('Add Frame',          '', ['timeline','frame','add'],     () => timeline.addFrame());
  register('Duplicate Frame',    '', ['timeline','frame','dup'],     () => timeline.duplicateFrame());
  register('Delete Frame',       '', ['timeline','frame','delete'],  () => timeline.removeFrame());
  register('Play / Stop',        '', ['timeline','play','stop','anim'],() => timeline.togglePlay());

  // Export
  register('Export PNG',         'Ctrl+S', ['export','png','save'], () => exporter.exportPNG());
  register('Export GIF',         'Ctrl+G', ['export','gif','anim'], () => exporter.exportGIF());

  // Effects (CPU)
  const toggleFx = fx => {
    const cb = document.getElementById(`fx-${fx}`);
    if (cb) { cb.checked = !cb.checked; effects.set(fx, cb.checked); canvas.markDirty(); }
    st(`${fx}: ${document.getElementById(`fx-${fx}`)?.checked ? 'on' : 'off'}`);
  };
  register('Toggle Scanlines', '', ['fx','scanlines'],          () => toggleFx('scanlines'));
  register('Toggle Glow',      '', ['fx','glow','bloom'],       () => toggleFx('glow'));
  register('Toggle Vignette',  '', ['fx','vignette'],           () => toggleFx('vignette'));
  register('Toggle Noise',     '', ['fx','noise','grain'],      () => toggleFx('noise'));
  register('Toggle Flicker',   '', ['fx','flicker','phosphor'], () => toggleFx('flicker'));

  // Command palette help
  register('Open Command Palette', 'Ctrl+K', ['command','palette','help'], () => cmdPalette.open());

  /* ────────────────────────────────────────────────────
     TOP BAR
  ──────────────────────────────────────────────────── */

  document.getElementById('btn-new').onclick = () => {
    if (confirm('New canvas? Unsaved work will be lost.')) {
      canvas.clear(); canvas.clearStorage(); st('new canvas');
    }
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
    document.getElementById('btn-grid').classList.toggle('active', canvas.showGrid);
    st(canvas.showGrid ? 'grid on' : 'grid off');
  };

  document.getElementById('btn-export-png').onclick = () => exporter.exportPNG();
  document.getElementById('btn-export-gif').onclick = () => exporter.exportGIF();

  /* ────────────────────────────────────────────────────
     RESIZE
  ──────────────────────────────────────────────────── */

  document.getElementById('btn-resize').onclick = () => {
    const w  = Math.max(4, Math.min(128, parseInt(document.getElementById('grid-w').value)   || 32));
    const h  = Math.max(4, Math.min(128, parseInt(document.getElementById('grid-h').value)   || 32));
    const cs = Math.max(4, Math.min(32,  parseInt(document.getElementById('cell-size').value)|| 16));
    canvas.resize(w, h, cs);
    st(`canvas ${w}×${h} @${cs}px`);
  };

  /* ────────────────────────────────────────────────────
     TOOLS
  ──────────────────────────────────────────────────── */

  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tools.setTool(btn.dataset.tool);
      document.getElementById('st-tool').textContent = btn.dataset.tool.toUpperCase();
      st(btn.dataset.tool);
    };
  });

  /* ────────────────────────────────────────────────────
     SYMMETRY
  ──────────────────────────────────────────────────── */

  document.querySelectorAll('.sym-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.sym-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      symmetry.setMode(btn.dataset.sym);
      st(`symmetry: ${btn.dataset.sym}`);
    };
  });

  /* ────────────────────────────────────────────────────
     MOOD
  ──────────────────────────────────────────────────── */

  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mood.apply(btn.dataset.mood);
      document.getElementById('st-mood').textContent = 'MOOD: ' + btn.dataset.mood.toUpperCase();
      canvas.render(); canvas.markDirty();
      st('mood: ' + btn.dataset.mood);
    };
  });

  /* ────────────────────────────────────────────────────
     SEED
  ──────────────────────────────────────────────────── */

  document.getElementById('btn-seed').onclick = () => {
    const seed = document.getElementById('seed-input').value.trim();
    if (!seed) return;
    canvas.generateFromSeed(seed);
    st(`seed: "${seed}"`);
  };
  document.getElementById('seed-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-seed').click();
  });

  /* ────────────────────────────────────────────────────
     CPU EFFECTS
  ──────────────────────────────────────────────────── */

  ['scanlines','glow','vignette','noise','flicker'].forEach(fx => {
    const cb = document.getElementById(`fx-${fx}`);
    const sl = document.getElementById(`fx-${fx}-val`);
    cb.onchange = () => { effects.set(fx, cb.checked); canvas.markDirty(); };
    sl.oninput  = () => { effects.setIntensity(fx, sl.value / 100); canvas.markDirty(); };
  });

  /* ────────────────────────────────────────────────────
     WEBGL CRT CONTROLS
  ──────────────────────────────────────────────────── */

  ['barrel','chroma','scanlines','vignette','flicker'].forEach(name => {
    const sl = document.getElementById(`crt-${name}`);
    if (!sl) return;
    sl.oninput = () => {
      webgl.setUniform(name, sl.value / 100);
      canvas.markDirty();
    };
  });

  /* ────────────────────────────────────────────────────
     SELECTION TOOLBAR
  ──────────────────────────────────────────────────── */

  document.getElementById('sel-flip-h')?.addEventListener('click', () => {
    canvas.flipSelectionH(); st('flip H');
  });
  document.getElementById('sel-flip-v')?.addEventListener('click', () => {
    canvas.flipSelectionV(); st('flip V');
  });
  document.getElementById('sel-del')?.addEventListener('click', () => {
    canvas.deleteSelection(); st('selection deleted');
  });
  document.getElementById('sel-clear')?.addEventListener('click', () => {
    canvas.clearSelection();
  });

  /* ────────────────────────────────────────────────────
     COLLAPSIBLE PANELS
  ──────────────────────────────────────────────────── */

  document.querySelectorAll('.ps-head').forEach(head => {
    head.onclick = () => head.closest('.ps').classList.toggle('collapsed');
  });

  /* ────────────────────────────────────────────────────
     DRAG & DROP
  ──────────────────────────────────────────────────── */

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
