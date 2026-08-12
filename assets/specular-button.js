// SpecularButton (React Bits) — port em JavaScript puro.
//
// Este ativo é HTML/CSS/JS estático (sem React, sem bundler), então o
// componente original em JSX foi reescrito para operar direto sobre o DOM.
// A lógica do shader (WGSL/GLSL) e da simulação por frame é a mesma do
// componente-fonte; o que muda é a "casca": em vez de um <button> React com
// useRef/useEffect, cada elemento com a classe `.specular-button` é
// inicializado por `attachSpecularButton(el, options)`.
//
// Dependência: `ogl` (o mesmo pacote do "npm i ogl" pedido na integração).
// Como o site não tem passo de build, ele é importado como ESM via CDN
// (esm.sh, que reempacota o pacote do npm) em vez de instalado localmente.
import { Renderer, Program, Mesh, Triangle, Color } from 'https://esm.sh/ogl@1.0.6';

const PAD = 20;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = shapeSDF(p);
  vec2 L = vec2(cos(uAngle), sin(uAngle));

  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;

  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float hi = line * rim * edgeClamp * uIntensity;

  vec3 col = uBaseColor * base + uLineColor * hi;
  float a = clamp(base + hi, 0.0, 1.0);
  fragColor = vec4(col, a);
}
`;

const DEFAULTS = {
  radius: 18,
  lineColor: '#ffffff',
  baseColor: '#525252',
  intensity: 1,
  shineSize: 10,
  shineFade: 40,
  thickness: 1,
  speed: 0.35,
  followMouse: true,
  proximity: 250,
  autoAnimate: false
};

/**
 * Liga o efeito especular (brilho girando na borda) a um elemento existente.
 * O elemento deve conter um `.specular-button__fx` (canvas alvo) e envolver
 * o rótulo em `.specular-button__label` — ver markup no HTML.
 *
 * @param {HTMLElement} btn
 * @param {Partial<typeof DEFAULTS>} options
 * @returns {() => void} destroy
 */
export function attachSpecularButton(btn, options = {}) {
  const fx = btn.querySelector('.specular-button__fx');
  if (!fx) throw new Error('specular-button: elemento .specular-button__fx não encontrado');

  const state = { ...DEFAULTS, ...options };

  const dpr = window.devicePixelRatio || 1;
  const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) delete geometry.attributes.uv;

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uCenter: { value: [0, 0] },
      uHalfSize: { value: [1, 1] },
      uRadius: { value: 0 },
      uAngle: { value: 2.4 },
      uPx: { value: dpr },
      uLineColor: { value: [1, 1, 1] },
      uBaseColor: { value: [0.32, 0.32, 0.32] },
      uIntensity: { value: 1 },
      uShineSize: { value: 0.17 },
      uShineFade: { value: 0.7 },
      uThickness: { value: 1 },
      uBaseWidth: { value: dpr }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });
  fx.appendChild(gl.canvas);

  const sizeRef = { w: 1, h: 1 };
  const resize = () => {
    const rect = btn.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    sizeRef.w = w;
    sizeRef.h = h;
    renderer.setSize(w + PAD * 2, h + PAD * 2);
    program.uniforms.uCenter.value = [(PAD + w / 2) * dpr, (PAD + h / 2) * dpr];
    program.uniforms.uHalfSize.value = [(w / 2) * dpr, (h / 2) * dpr];
  };
  const ro = new ResizeObserver(resize);
  ro.observe(btn);
  resize();

  let pointerAngle = null;
  let proximityT = 0;
  const onPointerMove = e => {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
    const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (cy - e.clientY) / (rect.height / 2);
      pointerAngle = Math.atan2(2 / rect.height, -2 / rect.width) + nx * 0.3 + ny * 0.15;
    } else {
      pointerAngle = Math.atan2(cy - e.clientY, e.clientX - cx);
    }
    const t = Math.max(0, 1 - dist / Math.max(state.proximity, 1));
    proximityT = t * t * (3 - 2 * t);
  };
  window.addEventListener('pointermove', onPointerMove);

  let angle = 2.4;
  let idleAngle = 2.4;
  let bright = 0;
  let last = performance.now();
  let raf = 0;

  const lineC = new Color();
  const baseC = new Color();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const update = now => {
    raf = requestAnimationFrame(update);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    idleAngle += state.speed * dt;
    const steer = state.followMouse && pointerAngle != null && (!state.autoAnimate || proximityT > 0);
    const target = steer ? pointerAngle : idleAngle;
    const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    angle += diff * (1 - Math.exp(-dt * 7));

    const brightTarget = state.autoAnimate ? 1 : proximityT;
    bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8));

    lineC.set(state.lineColor);
    baseC.set(state.baseColor);
    program.uniforms.uAngle.value = angle;
    program.uniforms.uRadius.value = Math.min(state.radius, Math.min(sizeRef.w, sizeRef.h) / 2) * dpr;
    program.uniforms.uLineColor.value = [lineC.r, lineC.g, lineC.b];
    program.uniforms.uBaseColor.value = [baseC.r, baseC.g, baseC.b];
    program.uniforms.uIntensity.value = state.intensity * bright;
    program.uniforms.uShineSize.value = (state.shineSize * Math.PI) / 180;
    program.uniforms.uShineFade.value = (state.shineFade * Math.PI) / 180;
    program.uniforms.uThickness.value = state.thickness * dpr;
    renderer.render({ scene: mesh });
  };

  if (reduceMotion) {
    // Sem sweep animado: desenha um único frame com o brilho estático no
    // ângulo inicial, sem laço de requestAnimationFrame.
    state.autoAnimate = false;
    bright = state.followMouse ? 0 : 0.6;
    update(performance.now());
    cancelAnimationFrame(raf);
    raf = 0;
  } else {
    raf = requestAnimationFrame(update);
  }

  return function destroy() {
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    if (gl.canvas.parentNode === fx) fx.removeChild(gl.canvas);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

/**
 * Inicializa automaticamente todo `.specular-button[data-sb]` presente na
 * página, lendo a configuração do atributo `data-sb` (JSON).
 * Ex.: <a class="specular-button" data-sb='{"lineColor":"#E0BD7A", ...}'>
 */
export function initSpecularButtons(root = document) {
  const destroyers = [];
  root.querySelectorAll('.specular-button[data-sb]').forEach(btn => {
    let options = {};
    try {
      options = JSON.parse(btn.getAttribute('data-sb') || '{}');
    } catch (err) {
      console.error('specular-button: data-sb inválido em', btn, err);
    }
    destroyers.push(attachSpecularButton(btn, options));
  });
  return () => destroyers.forEach(d => d());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initSpecularButtons());
} else {
  initSpecularButtons();
}
