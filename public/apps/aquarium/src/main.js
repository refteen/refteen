// Natura viva — точка входа: состояние мира, сценарий сборки, цикл кадра.
import THREE from './three.js'
import { INNER, TANK, WATER_MAX, WATER_MIN, FILTER, POUR, LAMP } from './config.js'
import { Water } from './water.js'
import { Post } from './post.js'
import { buildTank } from './tank.js'
import { buildScape } from './scape.js'
import { Aquarium } from './fish.js'
import { Particles } from './particles.js'
import { Controls } from './controls.js'
import { ROCK_SHAPES } from './terrain.js'

const canvas = document.getElementById('scene')
const uiRoot = document.getElementById('ui')
const T0 = performance.now()
const DEBUG_LOG = new URLSearchParams(location.search).has('debug')
const mark = label => DEBUG_LOG && console.log(`[aquarium] ${label}: ${Math.round(performance.now() - T0)} ms`)
mark('modules')

// интерфейс и звук подключаем мягко: без них сцена всё равно работает
const params = new URLSearchParams(location.search)
const [uiMod, audioMod] = await Promise.all([
  params.has('noui') ? null : import('./ui.js').catch(err => { console.warn('[aquarium] ui.js', err); return null }),
  import('./audio.js').catch(err => { console.warn('[aquarium] audio.js', err); return null }),
])

const noop = () => {}
const ui = uiMod?.createUI
  ? uiMod.createUI({ root: uiRoot, onEnter, onAction, onIdle })
  : new Proxy({}, { get: () => noop })
const audio = audioMod?.AquariumAudio ? new audioMod.AquariumAudio() : new Proxy({}, { get: (t, k) => (k === 'enabled' || k === 'blocked' ? false : noop) })
const call = (obj, name, ...args) => { try { return obj[name]?.(...args) } catch (e) { console.warn(name, e) } }

ui.setProgress?.(0.15)

// ---------------------------------------------------------------- рендерер
const probe = document.createElement('canvas').getContext('webgl2')
if (!probe) {
  ui.showError?.('Этому браузеру не хватает WebGL 2 — инсталляции нужна современная видеокарта и браузер.')
  throw new Error('WebGL2 unavailable')
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' })
renderer.autoClear = false
renderer.outputColorSpace = THREE.LinearSRGBColorSpace
renderer.toneMapping = THREE.NoToneMapping
const gl = renderer.getContext()
if (!renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('EXT_color_buffer_half_float')) {
  ui.showError?.('Видеокарта не умеет рисовать в float-буферы, а без них вода не посчитается.')
  throw new Error('No float render targets')
}
const isMobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700
const maxSamples = renderer.capabilities.maxSamples || 0
const samples = Math.min(isMobile ? 2 : 4, maxSamples)

canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault()
  ui.showError?.('Видеокарта перезапустилась. Обновите страницу, чтобы вернуться к аквариуму.')
})

// ---------------------------------------------------------------- общие юниформы
const S = {
  uTime: { value: 0 },
  uTankMin: { value: new THREE.Vector3(INNER.x0, INNER.y0, INNER.z0) },
  uTankMax: { value: new THREE.Vector3(INNER.x1, INNER.y1, INNER.z1) },
  uWaterY: { value: WATER_MIN },
  uAbsorb: { value: new THREE.Vector3(1, 0.3, 0.25) },
  uScatter: { value: new THREE.Vector3() },
  uLampColor: { value: new THREE.Vector3() },
  uLampEmit: { value: new THREE.Vector3() },
  uLampY: { value: LAMP.y - LAMP.thickness / 2 },
  uLampHalf: { value: new THREE.Vector2(LAMP.halfLen, LAMP.halfDepth) },
  uAmbTop: { value: new THREE.Vector3() },
  uAmbBottom: { value: new THREE.Vector3() },
  tCaustics: { value: null },
  uCausticPlane: { value: 0.085 },
  tFishShadow: { value: null },
  uTankXZ: { value: new THREE.Vector4(INNER.x0, INNER.z0, 1 / INNER.sx, 1 / INNER.sz) },
  uMurk: { value: 0 },
  uNight: { value: 0 },
  uWet: { value: 0 },
  uSpotPos: { value: new THREE.Vector3(0.35, 3.25, 1.25) },
  uSpotDir: { value: new THREE.Vector3() },
  uSpotColor: { value: new THREE.Vector3() },
  uSpotCone: { value: new THREE.Vector2(Math.cos(0.3), Math.cos(0.12)) },
  uGlowColor: { value: new THREE.Vector3() },
  uRoomAmb: { value: new THREE.Vector3(0.0012, 0.0013, 0.0016) },
  uLampRoom: { value: new THREE.Vector3() },
}
S.uSpotDir.value.set(0, -0.35, 0.05).sub(S.uSpotPos.value).normalize()

// ---------------------------------------------------------------- сцена
const quality = isMobile ? 0.5 : 1
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, 1, 0.03, 40)

const water = new Water(renderer, S)
S.tCaustics.value = water.causticTarget.texture
ui.setProgress?.(0.3)

const tank = buildTank(S)
scene.add(tank.group)
ui.setProgress?.(0.45)

const scape = buildScape(S, quality)
scene.add(scape.group)
ui.setProgress?.(0.65)

const fish = new Aquarium(S)
scene.add(fish.group)
const particles = new Particles(S, scape.pearlSpots)
scene.add(particles.group)
scene.add(water.surface)
scene.add(water.stream)
ui.setProgress?.(0.8)

const post = new Post(renderer, S, { samples })
mark('scene built')

// тени рыб: вид сверху → размытие
const shadowRT = [0, 1].map(() => new THREE.WebGLRenderTarget(256, 104, { depthBuffer: false, stencilBuffer: false }))
const shadowCam = new THREE.OrthographicCamera(INNER.x0, INNER.x1, -INNER.z1, -INNER.z0, 0.1, 5)
shadowCam.position.set(0, 2, 0)
shadowCam.up.set(0, 0, -1)
shadowCam.lookAt(0, 0, 0)
shadowCam.updateMatrixWorld()
const blurMat = new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main() {
      float w[5]; w[0] = 0.227; w[1] = 0.195; w[2] = 0.122; w[3] = 0.054; w[4] = 0.016;
      float c = texture2D(tSrc, vUv).r * w[0];
      for (int i = 1; i < 5; i++) {
        c += texture2D(tSrc, vUv + uDir * float(i)).r * w[i];
        c += texture2D(tSrc, vUv - uDir * float(i)).r * w[i];
      }
      gl_FragColor = vec4(vec3(c), 1.0);
    }`,
  depthTest: false,
  depthWrite: false,
})
const blurScene = new THREE.Scene()
const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat)
blurQuad.frustumCulled = false
blurScene.add(blurQuad)
const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
S.tFishShadow.value = shadowRT[1].texture

function renderFishShadows() {
  renderer.setRenderTarget(shadowRT[0])
  renderer.setClearColor(0x000000, 1)
  renderer.clear(true, false, false)
  renderer.render(fish.shadowScene, shadowCam)
  blurMat.uniforms.tSrc.value = shadowRT[0].texture
  blurMat.uniforms.uDir.value.set(2.2 / 256, 0)
  renderer.setRenderTarget(shadowRT[1])
  renderer.render(blurScene, orthoCam)
  blurMat.uniforms.tSrc.value = shadowRT[1].texture
  blurMat.uniforms.uDir.value.set(0, 2.2 / 104)
  renderer.setRenderTarget(shadowRT[0])
  renderer.render(blurScene, orthoCam)
  // результат снова в [1], чтобы юниформа не менялась
  blurMat.uniforms.tSrc.value = shadowRT[0].texture
  blurMat.uniforms.uDir.value.set(0, 0)
  renderer.setRenderTarget(shadowRT[1])
  renderer.render(blurScene, orthoCam)
}

// ---------------------------------------------------------------- состояние
const state = {
  light: false, lightLevel: 0,
  filter: true, flow: 0,
  waterY: WATER_MIN, waterDir: 0,             // -1 слив, +1 налив
  fillRate: 0.056, drainRate: 0.07,
  murk: 0, algae: 0, oxygen: 1,
  wet: 0, wetTop: WATER_MIN, dry: 0,
  pour: 0,
  sound: true,
  cinema: false,
  mode: 'viva',
  building: true,
  started: false,
  taps: 0,
  selected: null, selectedT: 0,
  lastInteraction: 0,
  time: 0,
  moon: 0,
  hud: 0,
  temp: 24.6,
}
const hasWater = () => state.waterY > WATER_MIN + 0.004
const filterAvailable = () => state.waterY > 0.46

const controls = new Controls(camera, canvas, {
  onTap: handleTap,
  onHover: handleHover,
  onDragChange: d => call(ui, 'setCursor', d ? 'grabbing' : 'default'),
})

function resize() {
  const w = Math.max(1, canvas.clientWidth || innerWidth)
  const h = Math.max(1, canvas.clientHeight || innerHeight)
  const pr = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 1.75) * quality_.scale
  renderer.setPixelRatio(pr)
  renderer.setSize(w, h, false)
  post.setSize(w * pr, h * pr)
  controls.frame(w / h)
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  particles.setPixelSize(2 * tanV / (h * pr), h * pr / (2 * tanV) * 0.0012)
}
const quality_ = { scale: 1, acc: 0, frames: 0, avg: 16, cooldown: 0, volSteps: isMobile ? 12 : 22 }
addEventListener('resize', resize)
resize()

// ---------------------------------------------------------------- действия
function onAction(name) {
  state.lastInteraction = state.time
  if (state.building && name !== 'sound' && name !== 'fullscreen') return
  if (name === 'light') {
    state.light = !state.light
    call(audio, 'lightSwitch', state.light)
  } else if (name === 'filter') {
    state.filter = !state.filter
    call(audio, 'filterSwitch', state.filter)
  } else if (name === 'water') {
    if (state.waterDir < 0 || (state.waterDir === 0 && state.waterY < WATER_MAX - 0.002)) startFill()
    else startDrain()
  } else if (name === 'feed') {
    const at = particles.feed()
    call(audio, 'feed')
    fish.startle(new THREE.Vector3(at.x, state.waterY, at.z), 0.05, 0.1)
  } else if (name === 'sound') {
    toggleSound()
  } else if (name === 'cinema') {
    state.cinema = !state.cinema
    controls.cinema = state.cinema
  } else if (name === 'fullscreen') {
    setTimeout(resize, 120)
  }
  pushState()
}

function startDrain() {
  state.waterDir = -1
  state.wetTop = Math.max(state.wetTop, state.waterY)
}
function startFill() {
  state.waterDir = 1
}

async function toggleSound() {
  if (audio.blocked) {
    await call(audio, 'resume')
    state.sound = true
    call(audio, 'setEnabled', true)
  } else {
    state.sound = !state.sound
    call(audio, 'setEnabled', state.sound)
  }
  call(ui, 'setAudioBlocked', !!audio.blocked)
  pushState()
}

function onIdle(idle) {
  if (!state.cinema) controls.cinema = idle
}

let lastPushed = ''
function pushState() {
  const w = state.waterDir < 0 ? 'draining' : state.waterDir > 0 ? 'filling'
    : state.waterY >= WATER_MAX - 0.003 ? 'full' : !hasWater() ? 'empty' : 'partial'
  const s = { light: state.light, filter: state.filter, filterAvailable: filterAvailable(), water: w, sound: state.sound && !audio.blocked, cinema: state.cinema }
  const key = JSON.stringify(s)
  if (key === lastPushed) return
  lastPushed = key
  call(ui, 'setState', s)
}

// первый клик где угодно разблокирует звук, если браузер его придержал
addEventListener('pointerdown', async () => {
  if (audio.blocked && state.sound) {
    await call(audio, 'resume')
    call(ui, 'setAudioBlocked', !!audio.blocked)
    pushState()
  }
}, { capture: true })

// ---------------------------------------------------------------- клики по сцене
const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()
function rayFrom(clientX, clientY) {
  const rect = canvas.getBoundingClientRect()
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  return raycaster.ray
}

// пересечение с внешней коробкой аквариума: какая грань стекла
function hitTank(ray) {
  const min = new THREE.Vector3(-TANK.w / 2, 0, -TANK.d / 2), max = new THREE.Vector3(TANK.w / 2, TANK.h, TANK.d / 2)
  const box = new THREE.Box3(min, max)
  const p = ray.intersectBox(box, new THREE.Vector3())
  if (!p) return null
  const e = 1e-3
  let face = 'top'
  if (Math.abs(p.z - max.z) < e) face = 'front'
  else if (Math.abs(p.z - min.z) < e) face = 'back'
  else if (Math.abs(p.x - min.x) < e) face = 'left'
  else if (Math.abs(p.x - max.x) < e) face = 'right'
  else if (Math.abs(p.y - max.y) < e) face = 'top'
  else face = 'bottom'
  return { point: p, face, t: p.distanceTo(ray.origin) }
}

function handleHover(x, y) {
  if (state.building) return
  const ray = rayFrom(x, y)
  const f = fish.pick(ray)
  if (f) { call(ui, 'setCursor', 'pointer'); return }
  const h = hitTank(ray)
  call(ui, 'setCursor', h && h.face !== 'bottom' ? 'pointer' : 'default')
}

const SIGN = [
  [3, 'ПОЖАЛУЙСТА, НЕ СТУЧИТЕ ПО СТЕКЛУ', 'PLEASE DO NOT TAP ON THE GLASS', 'Рыбы вздрагивают от каждого стука'],
  [6, 'РЫБЫ ВСЁ ПОМНЯТ', 'THE FISH REMEMBER EVERYTHING', 'Табличка: «Рыбы всё помнят»'],
  [10, 'МЫ ВАС ВИДИМ', 'WE CAN SEE YOU', 'Табличка: «Мы вас видим»'],
  [15, 'ЛАДНО. СТУЧИТЕ.', 'FINE. TAP AWAY.', 'Табличка сдалась: «Ладно. Стучите.»'],
  [24, 'ЭТО ТОЖЕ ЧАСТЬ РАБОТЫ', 'THIS IS PART OF THE WORK TOO', 'Табличка: «Это тоже часть работы»'],
]

function handleTap(x, y) {
  state.lastInteraction = state.time
  if (state.building) return
  const ray = rayFrom(x, y)
  const picked = fish.pick(ray)
  const tankHit = hitTank(ray)
  if (picked) {
    selectFish(picked.fish)
    return
  }
  if (!tankHit || tankHit.face === 'bottom') return
  const p = tankHit.point
  const pan = THREE.MathUtils.clamp(p.x / 0.6, -1, 1)
  if (tankHit.face === 'top') {
    // касание воды сверху
    const t = (state.waterY - ray.origin.y) / ray.direction.y
    if (hasWater() && t > 0) {
      const q = ray.at(t, new THREE.Vector3())
      if (q.x > INNER.x0 && q.x < INNER.x1 && q.z > INNER.z0 && q.z < INNER.z1) {
        water.addDrop(q.x, q.z, 0.022, 0.5)
        fish.startle(q, 0.22, 0.8)
        call(audio, 'splash', pan, 0.35)
      }
    }
    return
  }
  // стук по стеклу
  const strength = 1
  call(audio, 'knock', pan, strength)
  tank.setTap(state.taps, p.x, p.y, p.z, state.time)
  const inner = p.clone()
  inner.x = THREE.MathUtils.clamp(inner.x, INNER.x0, INNER.x1)
  inner.z = THREE.MathUtils.clamp(inner.z, INNER.z0, INNER.z1)
  if (p.y < state.waterY) fish.startle(inner, 0.42, 1)
  // вибрация стекла расходится по поверхности у стенки
  if (hasWater()) for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.05
    const wx = tankHit.face === 'left' ? INNER.x0 + 0.01 : tankHit.face === 'right' ? INNER.x1 - 0.01 : THREE.MathUtils.clamp(p.x + a, INNER.x0, INNER.x1)
    const wz = tankHit.face === 'front' ? INNER.z1 - 0.01 : tankHit.face === 'back' ? INNER.z0 + 0.01 : THREE.MathUtils.clamp(p.z + a, INNER.z0, INNER.z1)
    water.addDrop(wx, wz, 0.012, 0.06)
  }
  state.taps++
  const step = SIGN.find(s => s[0] === state.taps)
  if (step) {
    tank.drawSign(step[1], step[2])
    call(ui, 'toast', step[3])
  }
}

function selectFish(f) {
  if (state.selected && state.selected !== f) state.selected.hl = 0
  state.selected = f
  state.selectedT = 5.5
  f.hl = 1
  if (!f.frozen) {
    // рыба вздрагивает и отплывает
    f.fear = 0.7
    f.fearDir.copy(f.p).sub(camera.position).setY(0).normalize()
    if (f.kind === 'tetra') fish.startle(f.p, 0.06, 0.35)
  }
  call(audio, 'fishTouch', THREE.MathUtils.clamp(f.p.x / 0.6, -1, 1))
  call(ui, 'callout', f.info)
}

// ---------------------------------------------------------------- сборка при открытии
const build = { t: 0, active: false, fishShown: false, lampOn: false, waterStarted: false, done: false, fired: new Set() }
const P = tank.parts
const home = new Map()
const remember = obj => home.set(obj, { p: obj.position.clone(), r: obj.rotation.clone(), s: obj.scale.clone() })
;[P.plinth, P.mat, P.sign, P.seams, P.film, P.lamp, P.pipes, ...P.glass].forEach(remember)

const easeOut = t => 1 - Math.pow(1 - t, 3)
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = t => Math.max(0, Math.min(1, t))
// падение с отскоком: 0 → 1 (1 = на месте)
function drop(t) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const n = 7.5625, d = 2.75
  if (t < 1 / d) return n * t * t
  if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75 }
  if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375 }
  t -= 2.625 / d
  return n * t * t + 0.984375
}
const seg = (t, a, b) => clamp01((t - a) / (b - a))
function once(key, fn) { if (!build.fired.has(key)) { build.fired.add(key); fn() } }

const GLASS_FROM = {
  bottom: [0, 0.5, 0, 0, 0, 0],
  back: [0, 0.1, -0.9, -0.5, 0, 0],
  left: [-0.9, 0.12, 0, 0, 0, 0.45],
  right: [0.9, 0.12, 0, 0, 0, -0.45],
  front: [0, 0.14, 0.95, 0.5, 0, 0],
}
const GLASS_T = { bottom: 0.45, back: 0.62, left: 0.74, right: 0.84, front: 0.96 }

function applyBuild(t) {
  // зал проявляется
  const fade = easeOut(seg(t, 0, 0.8))
  // тумба падает на место
  const pl = home.get(P.plinth)
  P.plinth.position.y = pl.p.y + (1 - drop(seg(t, 0.05, 0.55))) * 1.5
  P.plinth.visible = t > 0.05
  P.mat.visible = t > 0.4
  if (t > 0.42) once('plinth', () => call(audio, 'buildStep', 'plinth', 0, 1))
  P.sign.position.y = home.get(P.sign).p.y + (1 - drop(seg(t, 0.35, 0.8))) * 1.5
  P.sign.visible = t > 0.35
  // стёкла слетаются
  for (const m of P.glass) {
    const name = m.userData.pane
    const t0 = GLASS_T[name]
    const k = easeOut(seg(t, t0, t0 + 0.42))
    const f = GLASS_FROM[name]
    const h = home.get(m)
    m.position.set(h.p.x + f[0] * (1 - k), h.p.y + f[1] * (1 - k), h.p.z + f[2] * (1 - k))
    m.rotation.set(f[3] * (1 - k), f[4] * (1 - k), f[5] * (1 - k))
    m.visible = t > t0 - 0.02
    if (k > 0.96) once('glass-' + name, () => call(audio, 'buildStep', 'glass', h.p.x / 0.6, 0.6 + Object.keys(GLASS_T).indexOf(name) * 0.1))
  }
  const film = home.get(P.film)
  const kb = easeOut(seg(t, GLASS_T.back, GLASS_T.back + 0.42))
  P.film.position.set(film.p.x, film.p.y + 0.1 * (1 - kb), film.p.z - 0.9 * (1 - kb))
  P.film.rotation.x = -0.5 * (1 - kb)
  P.film.visible = t > GLASS_T.back
  P.seams.visible = t > 1.3
  // трубки фильтра
  const kp = easeOut(seg(t, 1.25, 1.75))
  P.pipes.position.y = home.get(P.pipes).p.y + (1 - kp) * 0.9
  P.pipes.visible = t > 1.25
  // грунт насыпается
  scape.uniforms.uFill.value = easeInOut(seg(t, 2.1, 2.75))
  if (t > 2.1) once('sand', () => call(audio, 'buildStep', 'sand', 0, 1))
  // камни падают
  ROCK_SHAPES.forEach((r, i) => {
    const t0 = 2.5 + [0, 0.14, 0.24, 0.32, 0.42, 0.48][i]
    const k = drop(seg(t, t0, t0 + 0.55))
    // до своего момента камень спрятан высоко над залом
    scape.uniforms.uRockDrop.value[i] = t < t0 ? 40 : (1 - k) * 0.75
    if (seg(t, t0, t0 + 0.55) > 0.37) once('rock' + i, () => {
      call(audio, 'buildStep', 'rock', r.cx / 0.6, Math.min(1, r.ry * 6))
      particles.puff(r.cx, r.base + 0.005, r.cz, Math.round(8 + r.rx * 90), r.rx * 1.2)
    })
  })
  // растения вырастают
  scape.uniforms.uGrow.value = easeOut(seg(t, 3.05, 3.9))
  if (t > 3.05) once('plant', () => call(audio, 'buildStep', 'plant', 0, 1))
  // лампа спускается на тросах и загорается — дальше мир растёт уже в её свете
  const kl = easeOut(seg(t, 1.3, 2.0))
  P.lamp.position.y = home.get(P.lamp).p.y + (1 - kl) * 1.4 + Math.sin(seg(t, 2.0, 2.9) * Math.PI * 3) * 0.006 * (1 - seg(t, 2.0, 2.9))
  P.lamp.visible = t > 1.3
  if (t > 1.3) once('lamp', () => call(audio, 'buildStep', 'lamp', 0, 1))
  if (t > 2.05) once('lampOn', () => { state.light = true; call(audio, 'lightSwitch', true); pushState() })
  // фарфоровые рыбы появляются в пустом аквариуме
  for (const f of fish.fish) {
    const d = 3.8 + f.seed * 0.5
    f.appear = easeOut(seg(t, d, d + 0.35))
  }
  // вода: струя сверху, рыбы оживают по мере подъёма
  if (t > 4.45) once('water', () => { state.fillRate = 0.16; startFill() })
  // камера: наезд и доворот
  const kc = easeInOut(seg(t, 0, 7.8))
  controls.override = { theta: 0.62 * (1 - kc), phi: 0.05 + 0.2 * (1 - kc), zoom: 1 + 0.55 * (1 - kc) }
  return fade
}

function finishBuild() {
  build.done = true
  state.building = false
  controls.override = null
  controls.theta = controls.tTheta = 0
  controls.phi = controls.tPhi = 0.05
  controls.zoom = controls.tZoom = 1
  state.fillRate = 0.056
  for (const f of fish.fish) f.appear = 1
  call(ui, 'setBuilding', false)
  if (state.filter) call(audio, 'filterSwitch', true)
  pushState()
}

function onEnter(withSound = true) {
  if (state.started) return
  state.started = true
  state.sound = withSound !== false
  Promise.resolve(call(audio, 'start', state.sound)).then(() => {
    call(ui, 'setAudioBlocked', !!audio.blocked)
    pushState()
  })
  build.active = true
  call(ui, 'setBuilding', true)
}

// до входа сцена пуста: всё разобрано
function disassemble() {
  for (const m of [P.plinth, P.mat, P.sign, P.seams, P.film, P.lamp, P.pipes, ...P.glass]) m.visible = false
  scape.uniforms.uFill.value = 0
  scape.uniforms.uGrow.value = 0
  scape.uniforms.uRockDrop.value.fill(40)
  for (const f of fish.fish) f.appear = 0
}

// ---------------------------------------------------------------- цвет и свет
const C = {
  lampDay: new THREE.Vector3(1.0, 0.965, 0.9),
  moon: new THREE.Vector3(0.28, 0.46, 1.0),
  absorbClear: new THREE.Vector3(1.05, 0.31, 0.24),
  absorbMurk: new THREE.Vector3(4.2, 3.1, 5.6),
  scatterClear: new THREE.Vector3(0.006, 0.03, 0.036),
  scatterMurk: new THREE.Vector3(0.0075, 0.0105, 0.0035),
  spot: new THREE.Vector3(1.0, 0.9, 0.78),
}
const _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3()

function updateLighting(dt) {
  const L = state.lightLevel
  const wf = THREE.MathUtils.clamp((state.waterY - WATER_MIN) / (WATER_MAX - WATER_MIN), 0, 1)
  const hw = hasWater() ? 1 : 0
  const moon = state.moon * (1 - L)
  S.uWaterY.value = state.waterY
  S.uMurk.value = state.murk
  S.uNight.value = 1 - L
  S.uWet.value = state.wet
  S.uLampColor.value.copy(C.lampDay).multiplyScalar(2.3 * L).addScaledVector(C.moon, 0.12 * moon)
  S.uLampEmit.value.copy(C.lampDay).multiplyScalar(5.2 * L).addScaledVector(C.moon, 0.01 * moon)
  S.uLampRoom.value.copy(C.lampDay).multiplyScalar(1.3 * L)
  S.uAbsorb.value.lerpVectors(C.absorbClear, C.absorbMurk, state.murk)
  _t1.lerpVectors(C.scatterClear, C.scatterMurk, state.murk).multiplyScalar(L * (1 + state.murk * 0.6))
  _t1.addScaledVector(C.moon, 0.0016 * moon)
  S.uScatter.value.copy(_t1)
  // рассеянный водой свет подсвечивает всё изнутри
  _t2.set(0.03, 0.058, 0.062).multiplyScalar(L * (0.45 + 0.55 * hw)).addScaledVector(C.moon, 0.003 * moon)
  _t2.addScalar(0.0007)
  S.uAmbTop.value.copy(_t2)
  S.uAmbBottom.value.copy(_t2).multiplyScalar(0.35).add(_t1.set(0.004, 0.0035, 0.003).multiplyScalar(L))
  S.uSpotColor.value.copy(C.spot).multiplyScalar(4.2)
  S.uGlowColor.value.set(0.34, 0.66, 0.66).multiplyScalar(L * (0.25 + 0.75 * wf) * (1 - state.murk * 0.45))
    .add(_t1.set(0.55, 0.55, 0.52).multiplyScalar(L * (1 - wf) * 0.6))
    .addScaledVector(C.moon, 0.02 * moon)
  S.uCausticPlane.value = 0.085
  tank.uniforms.uAlgae.value = state.algae
  tank.uniforms.uDry.value = state.dry
  tank.uniforms.uWetTop.value = state.wetTop
  tank.uniforms.uWallCaustic.value = L * wf * (1 - state.murk * 0.6) * 0.5
  tank.uniforms.uMoonLeds.value = moon
  scape.uniforms.uAlgae.value = state.algae
  scape.uniforms.uFlow.value = state.flow
  scape.uniforms.uSway.value = hw
}

// ---------------------------------------------------------------- шаг мира
function step(dt) {
  state.time += dt
  S.uTime.value = state.time

  // свет: плавное включение, «лунные» диоды зажигаются после сборки
  state.lightLevel += ((state.light ? 1 : 0) - state.lightLevel) * (1 - Math.exp(-dt * (state.light ? 2.6 : 3.4)))
  if (build.done || build.t > 3.5) state.moon = Math.min(1, state.moon + dt * 0.5)

  // вода
  const prevY = state.waterY
  if (state.waterDir > 0) {
    state.waterY = Math.min(WATER_MAX, state.waterY + state.fillRate * dt)
    if (state.waterY >= WATER_MAX) state.waterDir = 0
  } else if (state.waterDir < 0) {
    state.waterY = Math.max(WATER_MIN, state.waterY - state.drainRate * dt)
    if (state.waterY <= WATER_MIN) state.waterDir = 0
  }
  state.pour += ((state.waterDir > 0 ? 1 : 0) - state.pour) * (1 - Math.exp(-dt * (state.waterDir > 0 ? 4 : 1.6)))
  if (state.waterY < prevY) { state.wet = 1; state.dry = 1 }
  else {
    state.wet = Math.max(0, state.wet - dt / 45)
    state.dry = Math.max(0, state.dry - dt / 28)
  }
  if (state.waterY >= WATER_MAX - 0.001) state.wetTop = state.waterY

  // фильтр: работает только в воде
  const flowTarget = state.filter && filterAvailable() && !state.building ? 1 : 0
  state.flow += (flowTarget - state.flow) * (1 - Math.exp(-dt * (flowTarget ? 0.9 : 1.4)))
  if (hasWater()) {
    if (state.flow < 0.15) state.murk = Math.min(1, state.murk + dt / 65)
    else state.murk = Math.max(0, state.murk - dt / 16 * state.flow)
  }
  state.algae += (state.murk - state.algae) * dt * (state.murk > state.algae ? 0.05 : 0.03)
  const o2Target = state.flow > 0.2 ? 1 : 1 - state.murk * 0.95
  state.oxygen += (o2Target - state.oxygen) * dt * (o2Target < state.oxygen ? 0.03 : 0.12)

  // рыбы
  fish.update(dt, {
    waterY: state.waterY,
    hasWater: hasWater(),
    draining: state.waterDir < 0,
    night: 1 - state.lightLevel,
    oxygen: state.oxygen,
    flow: state.flow,
    food: particles.food,
  })
  let revived = 0
  for (const ev of fish.events) {
    const pan = THREE.MathUtils.clamp(ev.fish.p.x / 0.6, -1, 1)
    if (ev.type === 'revive') {
      revived++
      if (revived < 4) call(audio, 'revive', pan)
    } else if (ev.type === 'gulp') {
      water.addDrop(ev.fish.p.x, ev.fish.p.z, 0.008, -0.08)
      particles.spawnBubble(ev.fish.p.x, ev.fish.p.y - 0.01, ev.fish.p.z, 0.0012, 0, 0.05, 0)
      call(audio, 'splash', pan, 0.12)
    } else if (ev.type === 'eat') {
      if (ev.y > state.waterY - 0.01) water.addDrop(ev.x, ev.z, 0.006, -0.04)
    } else if (ev.type === 'sift') {
      const f = ev.fish
      particles.puff(f.p.x + f.f.x * f.len * 0.5, f.p.y - 0.01, f.p.z + f.f.z * f.len * 0.5, 2, 0.006)
    }
  }
  const cnt = fish.counts()
  const mode = cnt.alive === 0 && !state.building ? 'morta' : 'viva'
  if (mode !== state.mode) {
    state.mode = mode
    call(ui, 'setMode', mode)
    if (mode === 'morta') call(audio, 'freeze')
  }

  // частицы и вода
  particles.update(dt, { waterY: state.waterY, hasWater: hasWater(), flow: state.flow, light: state.lightLevel, pouring: state.pour })
  for (const b of particles.popEvents) {
    water.addDrop(b.x, b.z, 0.005 + b.r * 3, -0.012 - b.r * 12)
    if (b.kind !== 2 || Math.random() < 0.15) call(audio, 'bubble', THREE.MathUtils.clamp(b.x / 0.6, -1, 1), Math.min(1, b.r / 0.002))
  }
  for (const f of particles.landEvents) {
    water.addDrop(f.x, f.z, 0.006, -0.03)
    call(audio, 'plip', THREE.MathUtils.clamp(f.x / 0.6, -1, 1))
  }
  water.step(dt, { flow: state.flow, hasWater: hasWater(), pouring: state.pour, draining: state.waterDir < 0 })

  // струя
  water.stream.visible = state.pour > 0.02
  const su = water.streamMaterial.uniforms
  su.uAmount.value = state.pour
  su.uBottom.value = hasWater() ? state.waterY : 0.06
  su.uTop.value = state.waterDir > 0 ? 1.8 : Math.max(su.uBottom.value, su.uTop.value - dt * 2.2)
  if (state.waterDir > 0 && su.uTop.value < 1.7) su.uTop.value = 1.8

  // выбранная рыба и подпись
  if (state.selected) {
    state.selectedT -= dt
    const f = state.selected
    f.hl = Math.max(f.hl, Math.min(1, state.selectedT))
    const v = f.p.clone().project(camera)
    const rect = canvas.getBoundingClientRect()
    const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05
    call(ui, 'moveCallout', rect.left + (v.x * 0.5 + 0.5) * rect.width, rect.top + (-v.y * 0.5 + 0.5) * rect.height, vis)
    if (state.selectedT <= 0) {
      state.selected = null
      call(ui, 'hideCallout')
    }
  }

  // показания датчиков
  state.hud -= dt
  if (state.hud <= 0) {
    state.hud = 0.25
    state.temp += (24.6 + (hasWater() ? 0 : -2.8) - state.temp) * 0.02 + (Math.random() - 0.5) * 0.02
    call(ui, 'setHUD', {
      temp: state.temp,
      ph: 6.8 + state.murk * 0.45,
      o2: 8.2 * (0.25 + 0.75 * state.oxygen) * (hasWater() ? 1 : 0),
      murk: state.murk,
      level: (state.waterY - WATER_MIN) / (WATER_MAX - WATER_MIN),
      alive: cnt.alive,
      frozen: cnt.frozen,
      night: state.lightLevel < 0.5 && !state.building,
    })
    pushState()
  }

  call(audio, 'update', dt, {
    light: state.lightLevel,
    flow: state.flow,
    level: (state.waterY - WATER_MIN) / (WATER_MAX - WATER_MIN),
    draining: state.waterDir < 0,
    filling: state.waterDir > 0,
    murk: state.murk,
    night: 1 - state.lightLevel,
    pan: THREE.MathUtils.clamp(controls.theta / 1.2, -1, 1),
    alive: cnt.alive / cnt.total,
  })
}

// ---------------------------------------------------------------- кадр
const DEBUG = { exposure: 1, view: null, scale: 1 }
const dbgMat = new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: null }, uScale: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'uniform sampler2D tSrc; uniform float uScale; varying vec2 vUv; void main(){ gl_FragColor = vec4(pow(max(texture2D(tSrc, vUv).rgb * uScale, 0.0), vec3(1.0/2.2)), 1.0); }',
  depthTest: false, depthWrite: false,
})
const dbgScene = new THREE.Scene()
const dbgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dbgMat)
dbgQuad.frustumCulled = false
dbgScene.add(dbgQuad)

let fade = 0
function render() {
  updateLighting()
  water.sync()
  water.renderCaustics(Math.max(state.waterY - S.uCausticPlane.value, 0.02))
  renderFishShadows()
  const L = state.lightLevel
  post.render(scene, camera, {
    volumetric: hasWater() ? L * (0.1 + state.murk * 0.22) : 0,
    volSteps: quality_.volSteps,
    exposure: 6.5 * DEBUG.exposure,
    bloom: 0.085,
    time: state.time,
    fade,
  })
  if (DEBUG.view) {
    const tex = { scene: post.sceneRT.texture, vol: post.volRT.texture, bloom: post.bloomRT[0].texture, caustics: water.causticTarget.texture, shadow: shadowRT[1].texture, water: water.texture, depth: post.depthTexture }[DEBUG.view]
    dbgMat.uniforms.tSrc.value = tex
    dbgMat.uniforms.uScale.value = DEBUG.scale
    renderer.setRenderTarget(null)
    renderer.render(dbgScene, orthoCam)
  }
}

let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  let dt = (now - last) / 1000
  last = now
  if (dt > 0.1) dt = 0.1
  if (dt <= 0) return
  tick(dt)
}

function tick(dt, noRender = false) {
  if (build.active && !build.done) {
    build.t += dt
    fade = applyBuild(build.t)
    if (build.t > 4.5 && state.waterDir === 0 && state.waterY >= WATER_MAX - 0.001) finishBuild()
  } else if (!build.active) {
    fade = 0
  } else {
    fade = 1
  }
  step(dt)
  controls.update(dt, state.time)
  if (!noRender) {
    render()
    adapt(dt)
  }
}

// адаптивное разрешение: держим плавность на слабых машинах
function adapt(dt) {
  const q = quality_
  q.avg += (dt * 1000 - q.avg) * 0.05
  q.cooldown -= dt
  if (q.cooldown > 0 || state.time < 2) return
  if (q.avg > 24 && q.scale > 0.55) {
    q.scale = Math.max(0.55, q.scale - 0.1)
    q.volSteps = Math.max(10, q.volSteps - 4)
    q.cooldown = 2
    resize()
  } else if (q.avg < 13.5 && q.scale < 1) {
    q.scale = Math.min(1, q.scale + 0.05)
    q.cooldown = 3
    resize()
  }
}

// ---------------------------------------------------------------- старт
// первые кадры компилируют шейдеры; держим завесу, пока всё не готово
// шейдеры компилируем заранее и параллельно (под ANGLE/Direct3D это секунды),
// затем один «прогревочный» кадр со всей сценой — иначе сборка дёргалась бы
async function warmUp() {
  const timeout = ms => new Promise(r => setTimeout(r, ms))
  try {
    await Promise.race([
      Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(fish.shadowScene, shadowCam)]),
      timeout(8000),
    ])
  } catch (e) { console.warn('[aquarium] compileAsync', e) }
  mark('compile')
  ui.setProgress?.(0.92)
  render()
  mark('first frame')
  disassemble()
  render()
  ui.setProgress?.(1)
}
await warmUp()
pushState()
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame) })
if (uiMod?.createUI) call(ui, 'setReady')
else onEnter(true)

// отладка и снимки для портфолио
window.__aq = {
  THREE, state, S, renderer, post, water, fish, particles, controls, tank, scape, camera, build, scene, DEBUG,
  action: onAction,
  // ручная прокрутка времени (для отладки и снимков)
  advance(sec, fps = 60) {
    const n = Math.round(sec * fps)
    for (let i = 0; i < n; i++) tick(1 / fps, i < n - 1)
  },
  skipBuild() { build.t = 99; fade = applyBuild(99); state.waterY = WATER_MAX; state.waterDir = 0; finishBuild() },
  async snapshot(name = 'shot.jpg', width = 1920, height = 1080, quality = 0.92) {
    const w0 = canvas.clientWidth, h0 = canvas.clientHeight
    const pr0 = renderer.getPixelRatio()
    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)
    post.setSize(width, height)
    controls.frame(width / height)
    controls.update(0.0001, state.time)
    render()
    const url = canvas.toDataURL('image/jpeg', quality)
    renderer.setPixelRatio(pr0)
    renderer.setSize(w0, h0, false)
    resize()
    const res = await fetch('/__save?name=' + encodeURIComponent(name), { method: 'POST', body: url })
    return res.text()
  },
}
