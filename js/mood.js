const MOODS = {
  clean: {
    color: '#00ff41',
    effects: {
      scanlines: { enabled: true,  intensity: 0.40 },
      glow:      { enabled: true,  intensity: 0.60 },
      vignette:  { enabled: true,  intensity: 0.50 },
      noise:     { enabled: false, intensity: 0.10 },
      flicker:   { enabled: false, intensity: 0.20 },
    },
  },
  corrupted: {
    color: '#ff3131',
    effects: {
      scanlines: { enabled: true,  intensity: 0.75 },
      glow:      { enabled: true,  intensity: 0.85 },
      vignette:  { enabled: true,  intensity: 0.70 },
      noise:     { enabled: true,  intensity: 0.65 },
      flicker:   { enabled: true,  intensity: 0.70 },
    },
  },
  haunted: {
    color: '#8888ff',
    effects: {
      scanlines: { enabled: true,  intensity: 0.30 },
      glow:      { enabled: true,  intensity: 0.40 },
      vignette:  { enabled: true,  intensity: 0.80 },
      noise:     { enabled: true,  intensity: 0.35 },
      flicker:   { enabled: true,  intensity: 0.30 },
    },
  },
  electric: {
    color: '#00ffff',
    effects: {
      scanlines: { enabled: true,  intensity: 0.50 },
      glow:      { enabled: true,  intensity: 1.00 },
      vignette:  { enabled: false, intensity: 0.20 },
      noise:     { enabled: false, intensity: 0.10 },
      flicker:   { enabled: true,  intensity: 0.40 },
    },
  },
  dead: {
    color: '#555555',
    effects: {
      scanlines: { enabled: true,  intensity: 0.65 },
      glow:      { enabled: false, intensity: 0.10 },
      vignette:  { enabled: true,  intensity: 0.90 },
      noise:     { enabled: true,  intensity: 0.80 },
      flicker:   { enabled: false, intensity: 0.10 },
    },
  },
  transmission: {
    color: '#ffb300',
    effects: {
      scanlines: { enabled: true,  intensity: 0.55 },
      glow:      { enabled: true,  intensity: 0.70 },
      vignette:  { enabled: true,  intensity: 0.60 },
      noise:     { enabled: true,  intensity: 0.45 },
      flicker:   { enabled: true,  intensity: 0.50 },
    },
  },
};

export class MoodSystem {
  constructor(palette, effects) {
    this.palette  = palette;
    this.effects  = effects;
    this.current  = 'clean';
  }

  apply(name) {
    const mood = MOODS[name];
    if (!mood) return;
    this.current = name;
    document.body.dataset.mood = name === 'clean' ? '' : name;
    this.palette.setFg(mood.color);
    this.effects.applyPreset(mood.effects);
  }

  getCurrent() { return this.current; }
}
