// Рыбы: процедурная геометрия трёх видов, шейдер (волна тела, иридесцентная полоса,
// фарфор над водой), поведение (стая-боиды, скалярии, коридорасы), выбор мышью.
import THREE from './three.js'
import { INNER, WATER_MAX, SPECIES, FILTER } from './config.js'
import { UNIFORMS, NOISE, WATER } from './glsl.js'
import { sandHeight, ROCK_SHAPES, rockLocal, flowAt } from './terrain.js'
import { mulberry32, clamp, noise3 } from './noise.js'

// ---------------------------------------------------------------- профили
function monotone(keys) {
  const n = keys.length
  const xs = keys.map(k => k[0]), ys = keys.map(k => k[1])
  const d = [], m = new Array(n)
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i] }
  }
  return x => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
  }
}

// тело рыбы: длина от носа (x=+0.5) до хвостового стебля (x=-0.5) равна 1
const SPECS = {
  tetra: {
    h: monotone([[0, 0], [0.006, 0.05], [0.02, 0.09], [0.06, 0.15], [0.14, 0.21], [0.3, 0.262], [0.48, 0.25], [0.7, 0.17], [0.86, 0.105], [1, 0.085]]),
    w: monotone([[0, 0], [0.006, 0.04], [0.03, 0.08], [0.15, 0.12], [0.35, 0.13], [0.6, 0.1], [0.85, 0.05], [1, 0.035]]),
    yc: monotone([[0, -0.012], [0.3, 0.0], [0.6, 0.008], [1, 0.012]]),
    caudal: { len: 0.34, spread: 0.18, fork: 0.55 },
    dorsal: { u0: 0.42, u1: 0.56, h: 0.13, sweep: 0.09 },
    anal: { u0: 0.56, u1: 0.82, h: 0.085, sweep: 0.05 },
    pectoral: { u: 0.24, len: 0.12, drop: 0.3 },
    adipose: { u: 0.83, h: 0.035 },
    eye: [0.405, 0.022, 0.058],
    wave: [5.6, 0.014, 0.1],
    pick: [0.62, 0.22, 0.14],
  },
  angel: {
    h: monotone([[0, 0], [0.01, 0.1], [0.05, 0.25], [0.15, 0.48], [0.3, 0.64], [0.46, 0.65], [0.62, 0.5], [0.8, 0.28], [0.92, 0.17], [1, 0.14]]),
    w: monotone([[0, 0], [0.01, 0.03], [0.06, 0.07], [0.2, 0.1], [0.45, 0.11], [0.7, 0.08], [0.9, 0.04], [1, 0.03]]),
    yc: monotone([[0, -0.03], [0.25, 0.0], [1, 0.01]]),
    caudal: { len: 0.36, spread: 0.3, fork: -0.35 },
    dorsal: { u0: 0.26, u1: 0.8, apex: [-0.7, 0.98], bulge: 0.08 },
    anal: { u0: 0.3, u1: 0.82, apex: [-0.66, -0.95], bulge: 0.07 },
    pectoral: { u: 0.3, len: 0.13, drop: 0.1 },
    pelvic: { u: 0.26, len: 0.95 },
    eye: [0.36, 0.075, 0.062],
    wave: [4.2, 0.008, 0.06],
    pick: [0.65, 0.62, 0.12],
  },
  cory: {
    h: monotone([[0, 0], [0.008, 0.07], [0.04, 0.15], [0.15, 0.27], [0.35, 0.33], [0.55, 0.3], [0.8, 0.18], [1, 0.12]]),
    w: monotone([[0, 0], [0.008, 0.07], [0.05, 0.13], [0.2, 0.22], [0.4, 0.22], [0.7, 0.15], [1, 0.07]]),
    yc: monotone([[0, -0.05], [0.12, -0.02], [0.35, 0.0], [1, 0.03]]),
    flatBelly: true,
    caudal: { len: 0.3, spread: 0.17, fork: 0.45 },
    dorsal: { u0: 0.3, u1: 0.46, h: 0.24, sweep: 0.12 },
    anal: { u0: 0.7, u1: 0.8, h: 0.06, sweep: 0.03 },
    pectoral: { u: 0.2, len: 0.16, drop: 0.55 },
    adipose: { u: 0.84, h: 0.05 },
    eye: [0.33, 0.07, 0.05],
    wave: [4.8, 0.012, 0.085],
    pick: [0.62, 0.24, 0.17],
  },
}

function buildGeometry(spec) {
  const pos = [], body = [], idx = []
  const vert = (x, y, z, s, v, part, fin) => {
    pos.push(x, y, z)
    body.push(s, v, part, fin)
    return pos.length / 3 - 1
  }
  // тело — трубка из колец
  const NU = 30, NV = 18
  const ring = []
  for (let i = 0; i <= NU; i++) {
    const u = 0.5 - 0.5 * Math.cos(Math.PI * i / NU)
    const x = 0.5 - u
    const h = spec.h(u), w = spec.w(u), yc = spec.yc(u)
    const r = []
    for (let j = 0; j < NV; j++) {
      const a = (j / NV) * Math.PI * 2
      const cy = Math.cos(a), sz = Math.sin(a)
      let y = yc + cy * h * 0.5
      let z = sz * w * 0.5
      if (spec.flatBelly && cy < -0.35) {
        const t = (-cy - 0.35) / 0.65
        y = yc - h * 0.5 * (0.35 + 0.65 * (1 - Math.pow(1 - t, 2)) * 0.55)
        z *= 1 + t * 0.12
      }
      r.push(vert(x, y, z, u, cy, 0, 0))
    }
    ring.push(r)
  }
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const a = ring[i][j], b = ring[i][(j + 1) % NV], c = ring[i + 1][j], d = ring[i + 1][(j + 1) % NV]
      idx.push(a, c, b, b, c, d)
    }
  }
  // заглушка у хвостового стебля
  const tail = vert(-0.5, spec.yc(1), 0, 1, 0, 0, 0)
  for (let j = 0; j < NV; j++) idx.push(ring[NU][j], tail, ring[NU][(j + 1) % NV])

  const patch = (na, nb, fn) => {
    const base = pos.length / 3
    for (let b = 0; b <= nb; b++) {
      for (let a = 0; a <= na; a++) {
        const p = fn(a / na, b / nb)
        vert(p[0], p[1], p[2], p[3], p[4], p[5], p[6])
      }
    }
    for (let b = 0; b < nb; b++) {
      for (let a = 0; a < na; a++) {
        const i0 = base + b * (na + 1) + a, i1 = i0 + 1, i2 = i0 + na + 1, i3 = i2 + 1
        idx.push(i0, i2, i1, i1, i2, i3)
      }
    }
  }
  const top = u => spec.yc(u) + spec.h(u) * 0.5
  const bottom = u => spec.yc(u) - spec.h(u) * 0.5

  // хвостовой плавник
  const cd = spec.caudal
  patch(10, 8, (a, b) => {
    const va = a * 2 - 1
    const lobe = 1 - cd.fork * (1 - Math.abs(va))
    const len = cd.len * lobe
    const x = -0.49 - b * len
    const hb = spec.h(1) * 0.5
    const y = spec.yc(1) + va * (hb * (1 - b) + cd.spread * b)
    return [x, y, 0, 1 + b * len, va * 1.2, 1, b]
  })
  // спинной и анальный
  const fin2 = (f, part, dir) => {
    if (f.apex) {
      patch(12, 8, (a, b) => {
        const u = f.u0 + (f.u1 - f.u0) * a
        const xb = 0.5 - u, yb = (dir > 0 ? top(u) - 0.01 : bottom(u) + 0.01)
        const bx = f.apex[0], by = f.apex[1]
        const x = xb + (bx - xb) * b
        const y = yb + (by - yb) * b + dir * Math.sin(Math.PI * b) * f.bulge * Math.sin(Math.PI * a)
        return [x, y, 0, u + b * 0.4, dir * (1.2 + b), part, b]
      })
    } else {
      patch(8, 6, (a, b) => {
        const u = f.u0 + (f.u1 - f.u0) * a
        const xb = 0.5 - u, yb = (dir > 0 ? top(u) - 0.006 : bottom(u) + 0.006)
        const H = f.h * Math.pow(Math.sin(Math.PI * Math.min(a * 1.25 + 0.05, 1)), 0.75)
        return [xb - f.sweep * b * (0.4 + a), yb + dir * H * b, 0, u, dir * (1.2 + b), part, b]
      })
    }
  }
  fin2(spec.dorsal, 2, 1)
  fin2(spec.anal, 3, -1)
  if (spec.adipose) {
    const f = spec.adipose
    patch(4, 3, (a, b) => {
      const u = f.u - 0.03 + a * 0.06
      return [0.5 - u - b * 0.02, top(u) - 0.004 + f.h * b * Math.sin(Math.PI * a), 0, u, 1.2, 2, b]
    })
  }
  // грудные плавники (левый и правый)
  const pf = spec.pectoral
  for (const side of [-1, 1]) {
    const u = pf.u
    const x0 = 0.5 - u, y0 = spec.yc(u) - spec.h(u) * 0.5 * pf.drop, z0 = side * spec.w(u) * 0.46
    patch(3, 5, (a, b) => {
      const x = x0 + 0.02 - a * 0.045 - b * pf.len * 0.8
      const y = y0 - b * pf.len * 0.35 * (0.6 + a)
      const z = z0 + side * b * pf.len * 0.55
      return [x, y, z, u, -0.2, 4, b]
    })
  }
  // брюшные нити скалярии
  if (spec.pelvic) {
    const f = spec.pelvic
    for (const side of [-1, 1]) {
      const u = f.u
      patch(1, 10, (a, b) => {
        const x = 0.5 - u - b * f.len * 0.3 + (a - 0.5) * 0.02 * (1 - b)
        const y = bottom(u) + 0.01 - b * f.len
        return [x, y, side * (0.02 + b * 0.03), u, -1.5, 5, b]
      })
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('aBody', new THREE.Float32BufferAttribute(body, 4))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// ---------------------------------------------------------------- шейдеры
const FISH_VS = /* glsl */ `
attribute vec4 aBody;
attribute vec4 aSwim;
attribute vec4 aState;
uniform vec3 uWave;
varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal; varying vec4 vBody; varying vec4 vState;
void main() {
  vec3 pos = position;
  vec3 nrm = normal;
  float s = aBody.x;
  float part = aBody.z;
  float fin = aBody.w;
  float amp = aSwim.y;
  float env = uWave.y + uWave.z * s * s;
  float ph = uWave.x * s - aSwim.x;
  float w = sin(ph);
  float lat = amp * env * w + aSwim.z * s * s * 0.3;
  float dlat = amp * (2.0 * uWave.z * s * w + env * uWave.x * cos(ph)) + aSwim.z * 0.6 * s;
  pos.z += lat;
  nrm = vec3(nrm.x + dlat * nrm.z, nrm.y, nrm.z);
  if (part > 3.5 && part < 4.5) {
    float fl = sin(aSwim.w) * fin;
    pos.z += sign(position.z) * fl * 0.04;
    pos.x += abs(fl) * 0.012;
  } else if (part > 1.5 && part < 3.5) {
    pos.z += sin(aSwim.x * 0.8 + fin * 2.5 + s * 5.0) * 0.012 * fin * (0.3 + amp);
  } else if (part > 4.5) {
    pos.z += sin(aSwim.x * 0.5 + fin * 3.0) * 0.035 * fin;
    pos.x -= fin * fin * 0.06 * amp;
  }
  vLocal = pos;
  mat4 m = modelMatrix * instanceMatrix;
  vec4 wp = m * vec4(pos, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(m) * nrm);
  vBody = aBody;
  vState = aState;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const FISH_FS = /* glsl */ `
#define NO_FISH_SHADOW
${UNIFORMS}
${NOISE}
${WATER}
uniform vec3 uEye;
varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal; varying vec4 vBody; varying vec4 vState;
void main() {
  vec3 p = vWorld;
  vec3 V = normalize(cameraPosition - p);
  vec3 N = dot(vN, vN) > 1e-10 ? normalize(vN) : vec3(0.0, 0.0, 1.0);
  if (!gl_FrontFacing) N = -N;
  float s = vBody.x, v = vBody.y, part = vBody.z, fin = vBody.w;
  float pale = vState.x;
  bool isFin = part > 0.5;
  vec3 albedo = vec3(0.5);
  vec3 irid = vec3(0.0);
  float alpha = 1.0, spec = 0.45, gloss = 70.0, trans = 0.0;
  float ci = abs(dot(N, V));

#if defined(TETRA)
  if (!isFin) {
    vec3 back = vec3(0.05, 0.05, 0.035);
    vec3 belly = vec3(0.32, 0.31, 0.3);
    vec3 red = vec3(0.34, 0.012, 0.01);
    float stripe = smoothstep(0.24, 0.12, abs(v - 0.3)) * smoothstep(0.06, 0.13, s) * smoothstep(0.96, 0.84, s);
    float redM = smoothstep(0.12, -0.12, v) * smoothstep(0.04, 0.12, s) * smoothstep(0.85, -0.6, v);
    albedo = mix(belly, back, smoothstep(0.3, 0.8, v));
    albedo = mix(albedo, mix(red, vec3(0.22, 0.14, 0.13), pale * 0.7), redM);
    vec3 hue = mix(vec3(0.02, 0.28, 0.95), vec3(0.03, 0.75, 0.85), smoothstep(0.15, 0.95, ci));
    irid = hue * stripe * mix(0.95, 0.18, pale);
    albedo = mix(albedo, vec3(0.005, 0.012, 0.03), stripe);
    spec = 0.25; gloss = 40.0;
    trans = 0.12;
  } else {
    albedo = vec3(0.4, 0.41, 0.42);
    alpha = 0.26 - fin * 0.1;
    trans = 0.5;
    spec = 0.03;
    if (part < 1.5) albedo = mix(albedo, vec3(0.32, 0.05, 0.04), (1.0 - fin) * 0.5 * (1.0 - pale));
  }
#elif defined(ANGEL)
  float x = vLocal.x;
  float bands = smoothstep(0.045, 0.02, abs(x - 0.36 + 0.02 * v))
              + smoothstep(0.07, 0.035, abs(x - 0.07 + 0.03 * v))
              + smoothstep(0.055, 0.025, abs(x + 0.24 + 0.03 * v)) * 0.9
              + smoothstep(0.035, 0.015, abs(x + 0.47)) * 0.7;
  bands = clamp(bands, 0.0, 1.0);
  if (!isFin) {
    albedo = mix(vec3(0.5, 0.5, 0.48), vec3(0.62, 0.56, 0.42), smoothstep(0.3, 0.9, v) * 0.5);
    albedo = mix(albedo, vec3(0.02, 0.02, 0.022), bands * mix(0.92, 0.7, pale));
    irid = vec3(0.05, 0.08, 0.1) * pow(1.0 - ci, 2.0) * (1.0 - bands);
    spec = 0.8; gloss = 90.0;
  } else {
    albedo = mix(vec3(0.42, 0.44, 0.43), vec3(0.03), bands * 0.8);
    alpha = 0.5 - fin * 0.25;
    if (part > 4.5) { albedo = vec3(0.55, 0.55, 0.53); alpha = 0.65; }
    if (part < 1.5) alpha = 0.32 - fin * 0.15;
    trans = 0.45;
    spec = 0.03;
  }
#elif defined(CORY)
  float x = vLocal.x;
  if (!isFin) {
    albedo = vec3(0.55, 0.47, 0.42);
    // маска «панды» через глаз и пятно у хвоста
    float mask = smoothstep(0.07, 0.04, abs(x - uEye.x)) * smoothstep(-0.12, -0.02, vLocal.y);
    float tailSpot = smoothstep(0.075, 0.05, length(vec2(x + 0.43, vLocal.y - 0.025)));
    albedo = mix(albedo, vec3(0.015), max(mask, tailSpot));
    // пластины панциря
    albedo *= 0.9 + 0.1 * smoothstep(0.2, 0.8, abs(sin(x * 60.0)));
    albedo *= 0.9 + 0.1 * smoothstep(0.03, 0.0, abs(vLocal.y - 0.01));
    spec = 0.55; gloss = 60.0;
  } else {
    albedo = vec3(0.45, 0.44, 0.42);
    alpha = 0.32 - fin * 0.1;
    if (part > 1.5 && part < 2.5) { albedo = vec3(0.02); alpha = 0.8 - fin * 0.3; }
    trans = 0.45;
    spec = 0.03;
  }
#endif

  // глаз
  if (!isFin) {
    vec2 e = vLocal.xy - uEye.xy;
    float er = length(e) / uEye.z;
    if (er < 1.0 && abs(vLocal.z) > 0.012) {
      float pupil = smoothstep(0.6, 0.52, er);
#if defined(ANGEL)
      vec3 iris = vec3(0.45, 0.03, 0.02);
#elif defined(TETRA)
      vec3 iris = mix(vec3(0.35, 0.4, 0.45), vec3(0.08, 0.3, 0.6), step(0.0, e.y));
#else
      vec3 iris = vec3(0.2, 0.18, 0.15);
#endif
      albedo = mix(iris, vec3(0.004), pupil);
      irid = vec3(0.0);
      spec = 0.12;
      gloss = 60.0;
    }
  }

  // над водой рыба застывает фарфором: цвет уходит вместе с водой
  float living = smoothstep(0.0025, -0.0025, p.y - uWaterY);
  float lum = dot(albedo, vec3(0.3, 0.55, 0.15));
  vec3 porcelain = vec3(0.74, 0.72, 0.68) * (0.93 + 0.12 * smoothstep(0.02, 0.3, lum));
  albedo = mix(porcelain, albedo, living);
  irid *= living;
  alpha = mix(isFin ? 0.94 : 1.0, alpha, living);
  spec = mix(0.35, spec, living);
  gloss = mix(30.0, gloss, living);
  trans = mix(0.25, trans, living);

  vec3 col = shadeInterior(p, V, albedo + irid, N, 1.0, spec, gloss, trans);
  // лёгкий ободок — рыбы читаются на тёмном фоне
  col += (uAmbTop * 0.6 + uLampColor * 0.015) * pow(1.0 - ci, 3.0) * 0.5 * living;
  // выделение по клику
  col += vec3(0.25, 0.32, 0.35) * vState.z * pow(1.0 - ci, 2.0) * (0.05 + length(uLampColor) * 0.004);
  col = applyWater(col, p);
  gl_FragColor = vec4(col, alpha);
}
`

const SHADOW_FS = /* glsl */ `
varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal; varying vec4 vBody; varying vec4 vState;
void main() {
  float k = 1.0 - clamp((vWorld.y - 0.09) / 0.55, 0.0, 0.72);
  if (vBody.z > 0.5) k *= 0.35;
  gl_FragColor = vec4(vec3(k), 1.0);
}
`

// ---------------------------------------------------------------- поведение
const UP = new THREE.Vector3(0, 1, 0)
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _a = new THREE.Vector3()
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion()
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3()
const _loc = [0, 0, 0], _flow = [0, 0, 0]

class Fish {
  constructor(kind, index, len, rand) {
    this.kind = kind
    this.index = index
    this.len = len
    this.p = new THREE.Vector3()
    this.v = new THREE.Vector3()
    this.f = new THREE.Vector3(1, 0, 0)
    this.up = new THREE.Vector3(0, 1, 0)
    this.phase = rand() * 6.283
    this.finPhase = rand() * 6.283
    this.amp = 0.5
    this.bend = 0
    this.bank = 0
    this.yawPrev = 0
    this.fear = 0
    this.fearDir = new THREE.Vector3()
    this.frozen = false
    this.pale = 0
    this.paleLag = 0.3 + rand() * 0.6
    this.seed = rand()
    this.hl = 0
    this.state = 'swim'
    this.timer = rand() * 4
    this.target = new THREE.Vector3()
    this.hunger = 0.5 + rand() * 0.5
    this.matrix = new THREE.Matrix4()
    this.speedScale = 0.85 + rand() * 0.3
  }
}

function makeMaterial(S, kind, spec, shadow) {
  const def = {}
  def[kind.toUpperCase()] = ''
  return new THREE.ShaderMaterial({
    uniforms: {
      ...S,
      uWave: { value: new THREE.Vector3(...spec.wave) },
      uEye: { value: new THREE.Vector3(...spec.eye) },
    },
    defines: def,
    vertexShader: FISH_VS,
    fragmentShader: shadow ? SHADOW_FS : FISH_FS,
    side: THREE.DoubleSide,
    alphaToCoverage: !shadow,
    transparent: false,
    ...(shadow ? { blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false } : {}),
  })
}

export class Aquarium {
  constructor(S, rand = mulberry32(2026)) {
    this.S = S
    this.rand = rand
    this.fish = []
    this.groups = {}
    this.group = new THREE.Group()
    this.shadowScene = new THREE.Scene()
    this.events = []
    this.time = 0
    this.attractor = new THREE.Vector3(0, 0.3, 0)

    const add = (kind, count, lenMin, lenMax) => {
      const spec = SPECS[kind]
      const geo = buildGeometry(spec)
      const n = count
      const swim = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4)
      const state = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4)
      swim.setUsage(THREE.DynamicDrawUsage)
      state.setUsage(THREE.DynamicDrawUsage)
      geo.setAttribute('aSwim', swim)
      geo.setAttribute('aState', state)
      const mesh = new THREE.InstancedMesh(geo, makeMaterial(S, kind, spec, false), n)
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      this.group.add(mesh)
      const shadowMesh = new THREE.InstancedMesh(geo, makeMaterial(S, kind, spec, true), n)
      shadowMesh.instanceMatrix = mesh.instanceMatrix
      shadowMesh.frustumCulled = false
      this.shadowScene.add(shadowMesh)
      const list = []
      for (let i = 0; i < n; i++) {
        const f = new Fish(kind, i, lenMin + rand() * (lenMax - lenMin), rand)
        list.push(f)
        this.fish.push(f)
      }
      this.groups[kind] = { mesh, shadowMesh, swim, state, list, spec }
    }
    add('tetra', SPECIES.tetra.count, 0.034, 0.041)
    add('angel', SPECIES.angel.fish.length, 0.058, 0.07)
    add('cory', SPECIES.cory.fish.length, 0.036, 0.042)

    // имена и заметки для подписей
    this.groups.tetra.list.forEach((f, i) => {
      f.info = {
        id: 'tetra-' + i,
        name: `№${i + 1} из ${SPECIES.tetra.count}`,
        species: SPECIES.tetra.species,
        latin: SPECIES.tetra.latin,
        note: SPECIES.tetra.notes[i % SPECIES.tetra.notes.length],
      }
    })
    for (const kind of ['angel', 'cory']) {
      this.groups[kind].list.forEach((f, i) => {
        const d = SPECIES[kind].fish[i]
        f.info = { id: kind + '-' + i, name: d.name, species: SPECIES[kind].species, latin: SPECIES[kind].latin, note: d.note }
      })
    }

    this._spawn()
    // начальные позы: пока воды нет, рыбы застынут именно так
    for (const f of this.fish) { f.appear = 1; this._pose(f, 0.016, { night: 0 }) }
    this._upload()
  }

  _spawn() {
    const r = this.rand
    for (const f of this.groups.tetra.list) {
      f.p.set(-0.1 + (r() - 0.5) * 0.35, 0.36 + (r() - 0.5) * 0.12, (r() - 0.5) * 0.22)
      f.v.set(0.05 + r() * 0.02, 0, (r() - 0.5) * 0.02)
      f.f.copy(f.v).normalize()
    }
    for (const f of this.groups.angel.list) {
      f.p.set((r() - 0.5) * 0.7, 0.3 + r() * 0.1, (r() - 0.5) * 0.2)
      f.v.set((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.01)
      f.f.set(r() < 0.5 ? 1 : -1, 0, 0)
      f.state = 'hover'
    }
    for (const f of this.groups.cory.list) {
      const x = 0.05 + (r() - 0.5) * 0.3, z = 0.17 + (r() - 0.5) * 0.08
      f.p.set(x, sandHeight(x, z) + 0.012, z)
      f.f.set(r() < 0.5 ? 1 : -1, 0, (r() - 0.5) * 0.4).normalize()
      f.state = 'forage'
    }
  }

  // испуг: от точки удара/клика по всем рыбам в радиусе
  startle(point, radius, strength) {
    for (const f of this.fish) {
      if (f.frozen) continue
      const d = f.p.distanceTo(point)
      if (d > radius) continue
      const k = strength * (1 - d / radius)
      if (k > f.fear) {
        f.fear = Math.min(1, k)
        f.fearDir.copy(f.p).sub(point).normalize()
        if (f.fearDir.lengthSq() < 0.5) f.fearDir.set(this.rand() - 0.5, 0.2, this.rand() - 0.5).normalize()
      }
    }
  }

  // луч мыши → ближайшая рыба
  pick(ray) {
    let best = null, bestT = Infinity
    const inv = new THREE.Matrix4()
    const o = new THREE.Vector3(), d = new THREE.Vector3()
    for (const f of this.fish) {
      const e = this.groups[f.kind].spec.pick
      inv.copy(f.matrix).invert()
      o.copy(ray.origin).applyMatrix4(inv)
      d.copy(ray.direction).transformDirection(inv)
      // transformDirection нормирует; вернём масштаб, чтобы t было в мировых единицах
      d.multiplyScalar(1 / f.len)
      const ox = o.x / e[0], oy = o.y / e[1], oz = o.z / e[2]
      const dx = d.x / e[0], dy = d.y / e[1], dz = d.z / e[2]
      const A = dx * dx + dy * dy + dz * dz
      const B = 2 * (ox * dx + oy * dy + oz * dz)
      const C = ox * ox + oy * oy + oz * oz - 1
      const disc = B * B - 4 * A * C
      if (disc < 0) continue
      const t = (-B - Math.sqrt(disc)) / (2 * A)
      if (t > 0 && t < bestT) { bestT = t; best = f }
    }
    return best ? { fish: best, t: bestT } : null
  }

  // ---------------------------------------------------------------- шаг симуляции
  update(dt, env) {
    this.time += dt
    const t = this.time
    this.events.length = 0
    // стая следует за плавно блуждающей точкой
    const night = env.night
    const lowO2 = clamp((0.55 - env.oxygen) / 0.4, 0, 1)
    const ax = 0.36 * Math.sin(t * 0.057 + 1.3) + 0.12 * Math.sin(t * 0.151)
    const ay = 0.3 + 0.07 * Math.sin(t * 0.083) - night * 0.11
    const az = 0.1 * Math.sin(t * 0.049 + 0.4)
    this.attractor.set(ax, ay, az)
    if (lowO2 > 0) this.attractor.y += (env.waterY - 0.04 - this.attractor.y) * lowO2
    this.attractor.y = Math.min(this.attractor.y, env.waterY - 0.05)

    for (const f of this.fish) this._freezeCheck(f, env)
    this._updateTetras(dt, env, lowO2)
    for (const f of this.groups.angel.list) this._updateAngel(f, dt, env, lowO2)
    for (const f of this.groups.cory.list) this._updateCory(f, dt, env, lowO2)
    for (const f of this.fish) this._pose(f, dt, env)
    this._upload()
  }

  _freezeCheck(f, env) {
    if (!f.frozen && (f.p.y > env.waterY + 0.001 || !env.hasWater)) {
      f.frozen = true
      this.events.push({ type: 'freeze', fish: f })
    } else if (f.frozen && env.hasWater && f.p.y < env.waterY - 0.006) {
      f.frozen = false
      f.fear = 0.55
      f.fearDir.set(this.rand() - 0.5, -0.3, this.rand() - 0.5).normalize()
      this.events.push({ type: 'revive', fish: f })
    }
  }

  _top(env) {
    // во время слива рыбы не убегают вниз — вода уходит, и они остаются в воздухе
    return (env.draining ? WATER_MAX : env.waterY) - 0.022
  }

  _bounds(f, acc, env, k, minAlt) {
    const m = 0.04
    const p = f.p
    if (p.x < INNER.x0 + m) acc.x += (INNER.x0 + m - p.x) * k
    if (p.x > INNER.x1 - m) acc.x -= (p.x - INNER.x1 + m) * k
    if (p.z < INNER.z0 + m) acc.z += (INNER.z0 + m - p.z) * k
    if (p.z > INNER.z1 - m) acc.z -= (p.z - INNER.z1 + m) * k
    const floor = sandHeight(p.x, p.z) + minAlt
    if (p.y < floor) acc.y += (floor - p.y) * k * 1.5
    const top = this._top(env)
    if (p.y > top) acc.y -= (p.y - top) * k * 1.5
  }

  _rocks(f, acc, k, margin) {
    for (const r of ROCK_SHAPES) {
      rockLocal(r, f.p.x, f.p.y, f.p.z, _loc)
      const d = Math.hypot(_loc[0], _loc[1], _loc[2])
      const lim = 1.32 + margin / Math.min(r.rx, r.ry)
      if (d > lim) continue
      // градиент эллипсоида в локальных координатах → в мир (наклон, затем поворот)
      let gx = _loc[0] / r.rx, gy = _loc[1] / r.ry, gz = _loc[2] / r.rz
      const lx = r.cl * gx - r.sl * gy, ly = r.sl * gx + r.cl * gy
      const wx = r.cyw * lx + r.syw * gz, wz = -r.syw * lx + r.cyw * gz
      const inv = 1 / (Math.hypot(wx, ly, wz) + 1e-6)
      const s = (lim - d) * k
      acc.x += wx * inv * s
      acc.y += ly * inv * s
      acc.z += wz * inv * s
    }
  }

  _seekFood(f, acc, env, range, k, bottomOnly) {
    let best = null, bd = range
    for (const fl of env.food) {
      if (!fl.alive) continue
      if (bottomOnly && fl.y > sandHeight(fl.x, fl.z) + 0.03) continue
      if (fl.y > env.waterY + 0.002) continue
      const d = Math.hypot(fl.x - f.p.x, fl.y - f.p.y, fl.z - f.p.z)
      if (d < bd) { bd = d; best = fl }
    }
    if (!best) return false
    _v.set(best.x - f.p.x, best.y - f.p.y, best.z - f.p.z)
    const d = _v.length()
    // рот — у носа
    if (d < f.len * 0.55 + 0.006) {
      best.alive = false
      f.hunger = Math.max(0, f.hunger - 0.2)
      this.events.push({ type: 'eat', fish: f, x: best.x, y: best.y, z: best.z })
      return true
    }
    acc.addScaledVector(_v.normalize(), k * (0.6 + f.hunger))
    return true
  }

  _updateTetras(dt, env, lowO2) {
    const list = this.groups.tetra.list
    const R = 0.085, SEP = 0.046
    const speedK = (1 - env.night * 0.62) * (1 - lowO2 * 0.35)
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      if (f.frozen) continue
      const acc = _a.set(0, 0, 0)
      let n = 0
      const ali = _v.set(0, 0, 0)
      const coh = _w.set(0, 0, 0)
      let sx = 0, sy = 0, sz = 0
      for (let j = 0; j < list.length; j++) {
        if (j === i) continue
        const g = list[j]
        if (g.frozen) continue
        const dx = g.p.x - f.p.x, dy = g.p.y - f.p.y, dz = g.p.z - f.p.z
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 > R * R) continue
        const d = Math.sqrt(d2) + 1e-5
        n++
        ali.add(g.v)
        coh.x += g.p.x; coh.y += g.p.y; coh.z += g.p.z
        if (d < SEP) {
          const s = (SEP - d) / SEP / d
          sx -= dx * s; sy -= dy * s; sz -= dz * s
        }
        // испуг передаётся по стае волной
        if (g.fear > f.fear + 0.08) {
          const k = (g.fear - f.fear) * dt * 5.5 * (1 - d / R)
          f.fear = Math.min(1, f.fear + k)
          f.fearDir.lerp(g.fearDir, clamp(k * 2, 0, 1)).normalize()
        }
      }
      acc.x += sx * 0.55; acc.y += sy * 0.55; acc.z += sz * 0.55
      if (n > 0) {
        ali.multiplyScalar(1 / n).sub(f.v)
        acc.addScaledVector(ali, 1.0 * (1 - env.night * 0.6))
        coh.multiplyScalar(1 / n).sub(f.p)
        acc.addScaledVector(coh, 0.75 * (1 - env.night * 0.7))
      }
      // к «вожаку» стаи
      _v.copy(this.attractor).sub(f.p)
      // у каждой рыбы своё место в «облаке» стаи, иначе все сходятся в точку
      _v.x += (f.seed - 0.5) * 0.22
      _v.y += (noise3(f.seed * 31, 2.2, 0) - 0.5) * 0.12
      _v.z += (noise3(f.seed * 17, 5.1, 0) - 0.5) * 0.16
      const da = _v.length()
      acc.addScaledVector(_v, (0.3 + 0.25 * Math.min(da * 3, 1)) * (1 - env.night * 0.5))
      // блуждание
      const tt = this.time * 0.35 + f.seed * 50
      acc.x += (noise3(tt, f.seed * 9, 1.1) - 0.5) * 0.12
      acc.y += (noise3(tt, f.seed * 9, 7.3) - 0.5) * 0.05
      acc.z += (noise3(tt, f.seed * 9, 3.7) - 0.5) * 0.1
      // течение фильтра сносит мелких рыб
      if (env.flow > 0.01) {
        flowAt(f.p.x, f.p.y, f.p.z, _flow)
        acc.x += _flow[0] * 0.05 * env.flow
        acc.y += _flow[1] * 0.05 * env.flow
        acc.z += _flow[2] * 0.05 * env.flow
      }
      this._seekFood(f, acc, env, 0.32, 1.6, false)
      if (f.fear > 0.05) acc.addScaledVector(f.fearDir, f.fear * 3.2)
      this._bounds(f, acc, env, 14, 0.03)
      this._rocks(f, acc, 9, 0.02)
      this._integrate(f, acc, dt, 0.07 * speedK * f.speedScale, 0.14 + f.fear * 0.42, 0.8 + f.fear * 5, 0.012 * speedK, 0.32)
      f.fear = Math.max(0, f.fear - dt * 0.9)
    }
  }

  _updateAngel(f, dt, env, lowO2) {
    if (f.frozen) return
    const acc = _a.set(0, 0, 0)
    f.timer -= dt
    const sk = (1 - env.night * 0.7) * (1 - lowO2 * 0.3)
    if (f.timer <= 0) {
      if (f.state === 'hover') {
        f.state = 'cruise'
        f.timer = 5 + this.rand() * 7
        const r = this.rand
        const x = INNER.x0 + 0.12 + r() * (INNER.sx - 0.24)
        const z = INNER.z0 + 0.07 + r() * (INNER.sz - 0.14)
        const y = sandHeight(x, z) + 0.1 + r() * Math.max(0.02, env.waterY - sandHeight(x, z) - 0.2)
        f.target.set(x, y, z)
        if (env.night > 0.5) f.target.y = Math.min(f.target.y, 0.22)
      } else {
        f.state = 'hover'
        f.timer = 2 + this.rand() * 5
      }
    }
    if (f.state === 'cruise') {
      _v.copy(f.target).sub(f.p)
      if (_v.length() < 0.03) f.timer = Math.min(f.timer, 0.2)
      acc.addScaledVector(_v.normalize(), 0.16)
    } else {
      acc.addScaledVector(f.v, -1.2)
    }
    if (lowO2 > 0) acc.y += (env.waterY - 0.06 - f.p.y) * lowO2 * 0.8
    // держат дистанцию друг от друга
    for (const g of this.groups.angel.list) {
      if (g === f || g.frozen) continue
      _v.copy(f.p).sub(g.p)
      const d = _v.length()
      if (d < 0.12) acc.addScaledVector(_v.normalize(), (0.12 - d) * 3)
    }
    this._seekFood(f, acc, env, 0.28, 0.9, false)
    if (f.fear > 0.05) acc.addScaledVector(f.fearDir, f.fear * 2.2)
    this._bounds(f, acc, env, 8, 0.07)
    this._rocks(f, acc, 6, 0.05)
    this._integrate(f, acc, dt, (f.state === 'cruise' ? 0.045 : 0.006) * sk, 0.08 + f.fear * 0.3, 0.35 + f.fear * 3, 0)
    f.fear = Math.max(0, f.fear - dt * 0.7)
  }

  _updateCory(f, dt, env, lowO2) {
    if (f.frozen) return
    const acc = _a.set(0, 0, 0)
    f.timer -= dt
    const list = this.groups.cory.list
    if (f.timer <= 0) {
      const r = this.rand
      const gulpChance = 0.06 + lowO2 * 0.4
      if (f.state !== 'gulp' && r() < gulpChance && env.waterY > 0.2) {
        f.state = 'gulp'
        f.timer = 6
        f.target.set(f.p.x + (r() - 0.5) * 0.1, env.waterY - 0.004, f.p.z)
      } else if (f.state === 'forage') {
        f.state = 'move'
        f.timer = 1.2 + r() * 1.5
        // новое место рядом с остальными
        let cx = 0, cz = 0, n = 0
        for (const g of list) { if (!g.frozen) { cx += g.p.x; cz += g.p.z; n++ } }
        cx /= Math.max(n, 1); cz /= Math.max(n, 1)
        const x = clamp(cx + (r() - 0.5) * 0.3, INNER.x0 + 0.06, INNER.x1 - 0.06)
        const z = clamp(cz + (r() - 0.5) * 0.14, INNER.z0 + 0.1, INNER.z1 - 0.04)
        f.target.set(x, sandHeight(x, z) + 0.012, z)
      } else {
        f.state = 'forage'
        f.timer = 2 + r() * 5
      }
    }
    for (const g of list) {
      if (g === f || g.frozen) continue
      _v.copy(f.p).sub(g.p)
      const d = _v.length()
      if (d < 0.05) acc.addScaledVector(_v.normalize(), (0.05 - d) * 12)
    }
    const floor = sandHeight(f.p.x, f.p.z)
    if (f.state === 'gulp') {
      _v.copy(f.target).sub(f.p)
      acc.addScaledVector(_v.normalize(), 0.5)
      if (f.p.y > env.waterY - 0.012) {
        this.events.push({ type: 'gulp', fish: f })
        f.state = 'move'
        f.timer = 2.5
        f.target.set(f.p.x, sandHeight(f.p.x, f.p.z) + 0.012, f.p.z)
      }
    } else if (f.state === 'move') {
      _v.copy(f.target).sub(f.p)
      acc.addScaledVector(_v.normalize(), 0.35)
      acc.y += (floor + 0.013 - f.p.y) * 12
    } else {
      acc.addScaledVector(f.v, -2.5)
      acc.y += (floor + 0.011 - f.p.y) * 14
      acc.x += (noise3(this.time * 0.8, f.seed * 20, 0) - 0.5) * 0.05
      acc.z += (noise3(this.time * 0.8, f.seed * 20, 5) - 0.5) * 0.05
      if (Math.random() < dt * 0.6) this.events.push({ type: 'sift', fish: f })
    }
    if (!this._seekFood(f, acc, env, 0.4, 0.6, true) && f.state === 'forage' && Math.random() < dt * 0.2) f.timer = 0
    if (f.fear > 0.05) acc.addScaledVector(f.fearDir.setY(Math.min(f.fearDir.y, 0.1)), f.fear * 2.5)
    this._bounds(f, acc, env, 10, 0.009)
    this._rocks(f, acc, 7, 0.012)
    const cruise = f.state === 'forage' ? 0.004 : f.state === 'gulp' ? 0.1 : 0.06
    this._integrate(f, acc, dt, cruise * (1 - env.night * 0.5), 0.12 + f.fear * 0.3, 0.8 + f.fear * 4, 0)
    f.fear = Math.max(0, f.fear - dt * 0.8)
  }

  _integrate(f, acc, dt, cruise, vmax, amax, vmin, pitch = 0.45) {
    // тянем скорость к крейсерской
    const sp = f.v.length()
    if (sp > 1e-5) acc.addScaledVector(f.v, (cruise - sp) / sp * 1.2)
    const al = acc.length()
    if (al > amax) acc.multiplyScalar(amax / al)
    f.v.addScaledVector(acc, dt)
    const s = f.v.length()
    if (s > vmax) f.v.multiplyScalar(vmax / s)
    else if (s < vmin && s > 1e-6) f.v.multiplyScalar(vmin / s)
    // рыбы почти не плавают вертикально
    const hs = Math.hypot(f.v.x, f.v.z)
    if (Math.abs(f.v.y) > hs * pitch + 0.003) f.v.y = Math.sign(f.v.y) * (hs * pitch + 0.003)
    f.p.addScaledVector(f.v, dt)
    f.accel = al
  }

  _pose(f, dt, env) {
    if (f.frozen) return
    const sp = f.v.length()
    // направление: к скорости, плавно; при зависании держим прежнее
    if (sp > 0.004) {
      _v.copy(f.v).multiplyScalar(1 / sp)
      if (f.kind === 'cory' && f.state === 'forage') _v.y -= 0.55
      if (f.kind === 'angel') _v.y *= 0.45
      _v.normalize()
      const k = 1 - Math.exp(-dt * (f.kind === 'angel' ? 2.2 : 6))
      f.f.lerp(_v, k).normalize()
    } else if (f.kind === 'cory' && f.state === 'forage') {
      _v.copy(f.f).setY(-0.5).normalize()
      f.f.lerp(_v, 1 - Math.exp(-dt * 3)).normalize()
    }
    const yaw = Math.atan2(f.f.z, f.f.x)
    let dy = yaw - f.yawPrev
    if (dy > Math.PI) dy -= Math.PI * 2
    if (dy < -Math.PI) dy += Math.PI * 2
    f.yawPrev = yaw
    const yawRate = dy / Math.max(dt, 1e-3)
    f.bend += (clamp(yawRate * 0.22, -1.6, 1.6) - f.bend) * (1 - Math.exp(-dt * 8))
    f.bank += (clamp(-yawRate * 0.1, -0.45, 0.45) - f.bank) * (1 - Math.exp(-dt * 4))
    // ритм хвоста: чаще при большей скорости
    const bl = sp / f.len
    const freq = f.kind === 'angel' ? 0.8 + bl * 0.9 : 1.6 + bl * 1.1
    f.phase += dt * Math.PI * 2 * freq * (1 - env.night * 0.3)
    const targetAmp = clamp(0.28 + bl * 0.16 + (f.accel || 0) * 0.6, 0.2, 1.4) * (f.kind === 'cory' && f.state === 'forage' ? 1.6 : 1)
    f.amp += (targetAmp - f.amp) * (1 - Math.exp(-dt * 5))
    f.finPhase += dt * (f.kind === 'angel' ? 7 : 12) * (sp < 0.02 ? 1.4 : 0.6)
    // ночью окраска бледнеет (как у настоящих тетр), утром возвращается
    f.pale += (env.night - f.pale) * (1 - Math.exp(-dt * f.paleLag))
    f.hl = Math.max(0, f.hl - dt * 0.6)
    // базис: X — вперёд, Y — спина, Z = X × Y
    _x.copy(f.f)
    _y.copy(UP).addScaledVector(_x, -_x.y).normalize()
    _z.crossVectors(_x, _y)
    _y.multiplyScalar(Math.cos(f.bank)).addScaledVector(_z, Math.sin(f.bank))
    _z.crossVectors(_x, _y)
    f.matrix.makeBasis(_x, _y, _z).scale(_v.setScalar(f.len)).setPosition(f.p)
  }

  _upload() {
    for (const kind of Object.keys(this.groups)) {
      const g = this.groups[kind]
      const sw = g.swim.array, st = g.state.array
      g.list.forEach((f, i) => {
        if (f.appear < 0.999) {
          _m.copy(f.matrix).scale(_v.setScalar(Math.max(f.appear, 1e-4)))
          g.mesh.setMatrixAt(i, _m)
        } else {
          g.mesh.setMatrixAt(i, f.matrix)
        }
        sw[i * 4] = f.phase
        sw[i * 4 + 1] = f.amp
        sw[i * 4 + 2] = f.bend
        sw[i * 4 + 3] = f.finPhase
        st[i * 4] = f.pale
        st[i * 4 + 1] = f.seed
        st[i * 4 + 2] = f.hl
      })
      g.mesh.instanceMatrix.needsUpdate = true
      g.swim.needsUpdate = true
      g.state.needsUpdate = true
    }
  }

  counts() {
    let alive = 0
    for (const f of this.fish) if (!f.frozen) alive++
    return { alive, frozen: this.fish.length - alive, total: this.fish.length }
  }
}

export { SPECS }
