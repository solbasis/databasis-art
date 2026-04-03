const VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FS = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2      u_res;
uniform float     u_time;
uniform float     u_barrel;
uniform float     u_chroma;
uniform float     u_scanlines;
uniform float     u_vignette;
uniform float     u_flicker;

varying vec2 v_uv;

vec2 barrel(vec2 uv, float k) {
  vec2 cc = uv - 0.5;
  return uv + cc * dot(cc, cc) * k;
}

void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);

  /* barrel distortion */
  if (u_barrel > 0.001) {
    uv = barrel(uv, u_barrel * 0.45);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
  }

  /* chromatic aberration */
  float ca = u_chroma * 0.007;
  float r  = texture2D(u_tex, uv + vec2( ca, 0.0)).r;
  float g  = texture2D(u_tex, uv               ).g;
  float b  = texture2D(u_tex, uv - vec2( ca, 0.0)).b;
  vec3  col = vec3(r, g, b);

  /* scanlines — sin-wave per pixel row */
  if (u_scanlines > 0.001) {
    float line = sin(uv.y * u_res.y * 3.14159265) * 0.5 + 0.5;
    col *= mix(1.0, line * 0.75 + 0.25, u_scanlines * 0.65);
  }

  /* phosphor flicker */
  if (u_flicker > 0.001) {
    float flick = sin(u_time * 23.7) * 0.5 + 0.5;
    col *= mix(1.0, flick * 0.92 + 0.08, u_flicker * 0.08);
  }

  /* vignette */
  if (u_vignette > 0.001) {
    vec2 vc  = uv * (1.0 - uv);
    float v  = pow(vc.x * vc.y * 18.0, u_vignette * 0.45);
    col     *= clamp(v, 0.0, 1.0);
  }

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
    throw new Error('Shader error: ' + gl.getShaderInfoLog(sh));
  return sh;
}

export class WebGLRenderer {
  constructor(canvasEl) {
    this.el  = canvasEl;
    this.gl  = canvasEl.getContext('webgl', { premultipliedAlpha: false, alpha: false });
    this.ok  = !!this.gl;
    if (!this.ok) return;

    this.uniforms = {
      barrel:    0.0,
      chroma:    0.0,
      scanlines: 0.0,
      vignette:  0.0,
      flicker:   0.0,
    };

    this._init();
  }

  _init() {
    const gl  = this.gl;
    const prg = gl.createProgram();
    gl.attachShader(prg, compile(gl, gl.VERTEX_SHADER,   VS));
    gl.attachShader(prg, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS))
      throw new Error('Program link error: ' + gl.getProgramInfoLog(prg));
    this._prg = prg;

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    this._buf = buf;

    // Texture
    this._tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);

    // Uniform locations
    gl.useProgram(prg);
    this._locs = {
      pos:       gl.getAttribLocation (prg, 'a_pos'),
      tex:       gl.getUniformLocation(prg, 'u_tex'),
      res:       gl.getUniformLocation(prg, 'u_res'),
      time:      gl.getUniformLocation(prg, 'u_time'),
      barrel:    gl.getUniformLocation(prg, 'u_barrel'),
      chroma:    gl.getUniformLocation(prg, 'u_chroma'),
      scanlines: gl.getUniformLocation(prg, 'u_scanlines'),
      vignette:  gl.getUniformLocation(prg, 'u_vignette'),
      flicker:   gl.getUniformLocation(prg, 'u_flicker'),
    };
  }

  resize(w, h) {
    if (!this.ok) return;
    this.el.width  = w;
    this.el.height = h;
    this.el.style.width  = w + 'px';
    this.el.style.height = h + 'px';
    this.gl.viewport(0, 0, w, h);
  }

  render(sourceCanvas, time) {
    if (!this.ok) return;
    const gl = this.gl;
    const w  = this.el.width, h = this.el.height;

    // Upload source canvas as texture
    gl.bindTexture(gl.TEXTURE_2D, this._tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    gl.useProgram(this._prg);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buf);

    const posLoc = this._locs.pos;
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i (this._locs.tex,       0);
    gl.uniform2f (this._locs.res,       w, h);
    gl.uniform1f (this._locs.time,      time);
    gl.uniform1f (this._locs.barrel,    this.uniforms.barrel);
    gl.uniform1f (this._locs.chroma,    this.uniforms.chroma);
    gl.uniform1f (this._locs.scanlines, this.uniforms.scanlines);
    gl.uniform1f (this._locs.vignette,  this.uniforms.vignette);
    gl.uniform1f (this._locs.flicker,   this.uniforms.flicker);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  setUniform(name, val) {
    if (name in this.uniforms) this.uniforms[name] = val;
  }

  isActive() {
    return this.ok && Object.values(this.uniforms).some(v => v > 0.001);
  }
}
