// Звуковой движок инсталляции «Natura viva».
// Ни одного аудиофайла: всё синтезируется на лету средствами Web Audio API —
// сгенерированные шумовые буферы, осцилляторы, фильтры и импульсная характеристика зала.
//
// Граф:
//   источники → шины категорий (room / water / mech / glass / pad / bells)
//   шина → master (сухой сигнал) и → посыл в общий ревербератор (ConvolverNode, «музейный зал»)
//   master → лимитер (DynamicsCompressor) → trim → out (mute / скрытая вкладка) → destination
//
// Публичный API — класс AquariumAudio (внизу файла). Методы никогда не бросают исключений;
// до start() и в выключенном состоянии разовые звуки молча игнорируются.

// ————————————————————————————————————————————————————————————————
// Настройки. Амплитуды линейные: 0.1 ≈ −20 dBFS, 0.03 ≈ −30, 0.01 ≈ −40.
// ————————————————————————————————————————————————————————————————

const MASTER_GAIN = 0.9
const LIMITER = { threshold: -6, knee: 6, ratio: 12, attack: 0.003, release: 0.25 }
const LIMITER_TRIM = 0.84      // компенсирует встроенный make-up gain компрессора (~+1.5 dB)
const FADE_IN = 0.35           // постоянная времени появления звука при start(), с (~1.5 с)
const MUTE_TC = 0.12           // setEnabled: ~0.5 с до тишины / полной громкости
const IOS_PLAYBACK = true      // iOS 16.4+: играть и при беззвучном режиме (navigator.audioSession)

const MAX_VOICES = 24          // одновременных разовых голосов
const LOW_PRIO_FREE = 6        // пузырьки/капли не занимают последние N голосов
const BLIP_MAX = 14            // фоновые пузырьки и бульки «грядок» — отдельный лимит

const REVERB = {
  seconds: 3.4,      // длина импульсной характеристики
  rt60: 3.0,         // время затухания на 60 dB
  predelay: 0.021,
  brightHz: 6500,    // окраска начала хвоста…
  darkHz: 800,       // …и конца: зал «тёмный», верх гаснет быстрее
  hpHz: 170,         // срез низа на входе реверба, чтобы хвост не мутнел
  ret: 1.0,          // уровень возврата
}

// Шины: [сухой уровень, посыл в зал]
const BUSES = {
  room:  [1, 0.04],
  water: [1, 0.2],
  mech:  [1, 0.1],
  glass: [1, 0.24],
  pad:   [1, 0.45],
  bells: [1, 0.7],
}

// — Тон помещения —
const ROOM_GAIN = 0.022
const ROOM_LP = 250

// — Фильтр: гул мотора и струя из флейты —
const HUM_HZ = 50
const HUM_HARM = [0, 1, 0.55, 0.3, 0.12, 0, 0.05]  // гармоники 1..6 (PeriodicWave)
const HUM_GAIN = 0.006
const HUM_WOBBLE = 7           // центов, медленное «плавание» частоты
const SPIN_LOW = -1500         // центов: мотор на разгоне/остановке звучит ниже
const SPIN_UP_TC = 0.4         // разгон ~1.5 с
const SPIN_DOWN_TC = 0.5
const RETURN_GAIN = 0.18
const RETURN_BANDS = [         // [Гц, Q, уровень] — «журчание», а не шипение
  [480, 1.4, 0.35],
  [1000, 3.2, 0.9],
  [1600, 4.2, 0.85],
  [2500, 5, 0.6],
]
const RETURN_BLIPS = 3.5       // пузырьков у поверхности в секунду при полном потоке
const RETURN_BLIP_GAIN = 0.004
const FILTER_POS = [0.8, -0.5] // фильтр сзади справа: x вправо, z к зрителю (доли полуширины)
const FILTER_PAN_SPREAD = 0.6
const FILTER_NEAR = 0.2        // ±20 % громкости: фильтр ближе/дальше от камеры

// — Мутность: срез ФНЧ водной шины —
const MURK_CLEAR_HZ = 16000
const MURK_DARK_HZ = 3200

// — Слив —
const DRAIN_RUMBLE = 0.05
const DRAIN_HOSE = 0.02
const DRAIN_PAN = -0.3
const GLUG_GAIN = 0.05
const GLUG_GAP = [0.12, 0.45]  // интервалы между бульками, с
const SLURP_GAIN = 0.03

// — Налив —
const FILL_SPLASH = 0.05       // вначале: струя барабанит по стеклу и грунту
const FILL_PLUNGE = 0.06       // позже: глухо уходит в толщу воды
const FILL_RES = 0.03          // резонанс воздушного столба
const FILL_RES_HZ = 190        // его тон при пустом аквариуме (растёт с уровнем)
const FILL_BUBBLES = 14        // пузырьков в секунду при полном уровне
const FILL_BUBBLE_GAIN = 0.008

// — Партитура —
const SCORE_GAIN = 0.012
const PAD_DAY = [[146.83, 1], [220.0, 0.8], [329.63, 0.55], [369.99, 0.45]]   // D3 A3 E4 F#4
const PAD_NIGHT = [[123.47, 1], [185.0, 0.8], [220.0, 0.6], [293.66, 0.45]]   // B2 F#3 A3 D4
const PAD_DETUNE = 4           // центов ± между парой осцилляторов голоса
const PAD_LP_DAY = 1500
const PAD_LP_NIGHT = 480
const PAD_LP_SWING = 450       // центов, медленное «дыхание» яркости
const BELL_GAIN = 0.035
const BELL_GAP_DAY = [6, 15]
const BELL_GAP_NIGHT = [13, 26]
const BELL_SCALE = [587.33, 659.26, 739.99, 880.0, 987.77, 1174.66, 1318.51]  // D-пентатоника

// — Разовые звуки —
const KNOCK_GAIN = 0.3
const GLASS_RING = 10          // компенсация узких полос «звона» стекла
const BUBBLE_GAIN = 0.036
const BUBBLE_RATE = 10         // не чаще, в секунду (лишние отбрасываются)
const PLIP_GAIN = 0.018
const PLIP_RATE = 14
const FISH_GAIN = 0.06
const SPLASH_GAIN = 0.1
const SPLASH_RATE = 6
const FEED_GAIN = 0.12
const CLICK_GAIN = 0.06
const RELAY_GAIN = 0.15
const LAMP_SWELL_GAIN = 0.008
const FREEZE_GAIN = 0.022
const REVIVE_GAIN = 0.022
const REVIVE_NOTES = [587.33, 739.99, 880.0, 987.77, 1174.66, 1318.51, 1479.98, 1760.0]  // D5 F#5 A5 B5 D6 E6 F#6 A6
const REVIVE_STEP = 0.16       // шаг арпеджио, с
const REVIVE_RATE = 3          // колокольчиков в секунду в среднем
const REVIVE_QUEUE = 1.2       // не планировать дальше, чем на столько секунд вперёд
// Стекло-колокольчик: [отношение частоты, амплитуда, доля длины спада] — моды свободной пластины + «биение»
const GLASS_PARTIALS = [[1, 1, 1], [1.0012, 0.45, 0.9], [2.756, 0.22, 0.32], [5.404, 0.07, 0.12], [8.933, 0.025, 0.05]]

// — Сборка инсталляции (buildStep) —
const PLINTH_GAIN = 0.22
const PANE_GAIN = 0.1
const PANE_NOTES = [1174.66, 1318.51, 1479.98, 1760.0, 2349.32]  // D6 E6 F#6 A6 D7 — восходящая фигура
const SAND_GAIN = 0.08
const ROCK_GAIN = 0.12
const PLANT_GAIN = 0.12
const LAMP_CREAK_GAIN = 0.9

// ————————————————————————————————————————————————————————————————
// Служебное
// ————————————————————————————————————————————————————————————————

const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : undefined
const LEAD = 0.01              // упреждение планирования разовых звуков, с
const CONTROL_DT = 1 / 30      // параметры «грядок» обновляются не чаще 30 раз в секунду
const GESTURE_EVENTS = ['pointerdown', 'touchend', 'mousedown', 'keydown']

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const num = (v, d) => (Number.isFinite(v) ? v : d)
const lerp = (a, b, t) => a + (b - a) * t
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = a => a[(Math.random() * a.length) | 0]
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const expRand = mean => -Math.log(1 - Math.random()) * mean
const quiet = p => { if (p && typeof p.catch === 'function') p.catch(() => {}) }

function gainNode(c, v) {
  const g = c.createGain()
  g.gain.value = v
  return g
}

function biquad(c, type, f, q, gain) {
  const b = c.createBiquadFilter()
  b.type = type
  b.frequency.value = f
  if (q != null) b.Q.value = q
  if (gain != null) b.gain.value = gain
  return b
}

// Перкуссионная огибающая: 0 → peak за a секунд (линейно), дальше экспоненциальный спад
function env(c, t, a, peak, tc) {
  const g = c.createGain()
  g.gain.value = 0
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(peak, t + a)
  g.gain.setTargetAtTime(0, t + a, tc)
  return g
}

// Панорама: StereoPanner, а в старом Safari — PannerNode в режиме equalpower
function setPannerPos(p, x) {
  const a = clamp(x, -1, 1) * Math.PI / 2
  const px = Math.sin(a), pz = -Math.cos(a)
  if (p.positionX) { p.positionX.value = px; p.positionY.value = 0; p.positionZ.value = pz }
  else p.setPosition(px, 0, pz)
}

// Слот параметра: запоминает последнее отправленное значение, чтобы не дёргать AudioParam зря
const slot = p => ({ p, v: NaN })

// ————————————————————————————————————————————————————————————————
// Генерация буферов (один раз при старте)
// ————————————————————————————————————————————————————————————————

function makeBuffer(c, ch, seconds, rate) {
  const sr = rate || c.sampleRate
  try { return c.createBuffer(ch, Math.max(1, Math.round(seconds * sr)), sr) }
  catch (e) { return c.createBuffer(ch, Math.max(1, Math.round(seconds * c.sampleRate)), c.sampleRate) }
}

// Бесшовная петля: лишний хвост длиной m вливается в начало (равная мощность)
function loopify(src, d, m) {
  const n = d.length
  for (let i = 0; i < n; i++) d[i] = src[i]
  for (let i = 0; i < m; i++) {
    const a = (i + 0.5) / m * Math.PI / 2
    d[i] = src[i] * Math.sin(a) + src[n + i] * Math.cos(a)
  }
}

function normRms(d, target) {
  let s = 0, mean = 0
  for (let i = 0; i < d.length; i++) mean += d[i]
  mean /= d.length
  for (let i = 0; i < d.length; i++) { d[i] -= mean; s += d[i] * d[i] }
  const k = target / Math.sqrt(s / d.length || 1)
  for (let i = 0; i < d.length; i++) d[i] *= k
}

// Белый шум, равномерный ±1 (RMS ≈ 0.58)
function whiteBuf(c, seconds) {
  const b = makeBuffer(c, 1, seconds)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

// Розовый шум (фильтр Пола Келлета), RMS 0.3, бесшовная петля
function pinkBuf(c, seconds) {
  const b = makeBuffer(c, 1, seconds)
  const d = b.getChannelData(0)
  const m = Math.round(0.05 * b.sampleRate)
  const tmp = new Float32Array(d.length + m)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < tmp.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856
    b4 = 0.55 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.016898
    tmp[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
    b6 = w * 0.115926
  }
  loopify(tmp, d, m)
  normRms(d, 0.3)
  return b
}

// Коричневый шум: стерео (каналы независимы), 16 кГц хватает — он всё равно идёт через ФНЧ
function brownBuf(c, seconds) {
  const b = makeBuffer(c, 2, seconds, 16000)
  const m = Math.round(0.25 * b.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch)
    const tmp = new Float32Array(d.length + m)
    let y = 0
    for (let i = 0; i < tmp.length; i++) { y = y * 0.996 + (Math.random() * 2 - 1) * 0.06; tmp[i] = y }
    loopify(tmp, d, m)
    normRms(d, 0.3)
  }
  return b
}

// Модуляторы: 4 независимых плавных случайных сигнала ±1 (сумма «октав» с косинус-интерполяцией).
// Длина петли 12 с; скорость задаётся playbackRate источника. 8 кГц — с запасом.
function modBuf(c) {
  const b = makeBuffer(c, 4, 12, 8000)
  const n = b.length
  const layers = [[12, 0.55], [40, 0.3], [120, 0.15]]   // [узлов на петлю, вес]
  for (let ch = 0; ch < 4; ch++) {
    const d = b.getChannelData(ch)
    for (const [K, w] of layers) {
      const pts = new Float32Array(K)
      for (let k = 0; k < K; k++) pts[k] = Math.random() * 2 - 1
      for (let i = 0; i < n; i++) {
        const x = i / n * K, k = x | 0, f = x - k
        const u = (1 - Math.cos(f * Math.PI)) / 2
        d[i] += w * (pts[k % K] * (1 - u) + pts[(k + 1) % K] * u)
      }
    }
    let peak = 0, mean = 0
    for (let i = 0; i < n; i++) mean += d[i]
    mean /= n
    for (let i = 0; i < n; i++) { d[i] -= mean; peak = Math.max(peak, Math.abs(d[i])) }
    for (let i = 0; i < n; i++) d[i] /= peak || 1
  }
  return b
}

// Импульсная характеристика «музейного зала»: затухающий шум, темнеющий со временем,
// нарастание диффузного поля, несколько размытых ранних отражений; каналы декоррелированы.
function irBuf(c) {
  const sr = c.sampleRate
  const len = Math.round(REVERB.seconds * sr)
  const b = c.createBuffer(2, len, sr)
  const ers = [
    [[0.0113, 0.9], [0.0187, 0.7], [0.0269, 0.62], [0.0371, 0.5], [0.0493, 0.4], [0.0617, 0.3]],
    [[0.0131, 0.85], [0.0211, 0.72], [0.0293, 0.55], [0.0397, 0.48], [0.0531, 0.38], [0.0659, 0.28]],
  ]
  const kDecay = Math.log(0.001) / (REVERB.rt60 * sr)
  const lnF = Math.log(REVERB.darkHz / REVERB.brightHz)
  let energy = 0
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch)
    const pre = Math.round((REVERB.predelay + ch * 0.0031) * sr)
    // ранние отражения — короткие (2 мс) шумовые вспышки
    const erLen = Math.round(0.08 * sr), er = new Float32Array(erLen), bl = Math.round(0.002 * sr)
    for (const [time, g] of ers[ch]) {
      const i0 = Math.round(time * sr)
      for (let j = 0; j < bl && i0 + j < erLen; j++) er[i0 + j] += (Math.random() * 2 - 1) * g * Math.sin(Math.PI * j / bl)
    }
    let y = 0, a = 0
    for (let i = pre; i < len; i++) {
      const n = i - pre, t = n / sr
      if ((n & 31) === 0) a = 1 - Math.exp(-2 * Math.PI * REVERB.brightHz * Math.exp(lnF * Math.min(1, t / REVERB.rt60)) / sr)
      const e = Math.exp(kDecay * n) * (1 - Math.exp(-t / 0.018))
      const x = (Math.random() * 2 - 1) * e + (n < erLen ? er[n] : 0)
      y += a * (x - y)
      d[i] = y
    }
    const fade = Math.round(len * 0.08)
    for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade
    for (let i = 0; i < len; i++) energy += d[i] * d[i]
  }
  // энергия каждого канала ≈ 1: уровень хвоста ≈ уровню посыла
  const k = 1 / Math.sqrt(energy / 2 || 1)
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] *= k }
  return b
}

// Шорох корма в баночке: три встряхивания, в каждом — облако мелких «зёрен»
function rattleBuf(c) {
  const sr = c.sampleRate
  const b = makeBuffer(c, 1, 0.75)
  const d = b.getChannelData(0), n = d.length
  const strokes = [0, 0.2, 0.4].map((t, i) => [t + rnd(-0.015, 0.015), [1, 0.88, 0.72][i] * rnd(0.9, 1.1)])
  for (const [t0, amp] of strokes) {
    // шелест содержимого, скользящего по стенке
    const sw = Math.round(0.1 * sr), s0 = Math.round(t0 * sr)
    for (let j = 0; j < sw && s0 + j < n; j++) d[s0 + j] += (Math.random() * 2 - 1) * 0.05 * amp * Math.sin(Math.PI * j / sw)
    const grains = 26 + ((Math.random() * 14) | 0)
    for (let g = 0; g < grains; g++) {
      const tg = t0 + Math.min(0.12, expRand(0.022))
      const i0 = Math.round(tg * sr), L = Math.round(rnd(0.0004, 0.0022) * sr), tc = L / 3
      const ga = amp * Math.pow(Math.random(), 1.5) * (Math.random() < 0.5 ? -1 : 1)
      for (let j = 0; j < L && i0 + j < n; j++) d[i0 + j] += (Math.random() * 2 - 1) * ga * Math.exp(-j / tc)
    }
  }
  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]))
  for (let i = 0; i < n; i++) d[i] *= 0.9 / (peak || 1)
  return b
}

// Иней: редкий хрустальный треск для freeze() — густо в начале, реже к концу
function crackleBuf(c) {
  const sr = c.sampleRate
  const b = makeBuffer(c, 1, 2)
  const d = b.getChannelData(0), n = d.length
  for (let k = 0; k < 16; k++) {
    const t = Math.pow(Math.random(), 1.6) * 1.8
    const i0 = Math.round(t * sr), L = Math.round(rnd(24, 64)), tc = rnd(6, 14)
    const a = rnd(0.2, 1) * (Math.random() < 0.5 ? -1 : 1)
    for (let j = 0; j < L && i0 + j < n; j++) d[i0 + j] += (Math.random() * 2 - 1) * a * Math.exp(-j / tc)
  }
  return b
}

// Сыплющийся песок: густой поток крошечных ударов песчинок (сам поток и есть «зернистая» АМ)
function sandBuf(c) {
  const b = makeBuffer(c, 1, 2)
  const d = b.getChannelData(0), n = d.length, sr = b.sampleRate
  const count = 5200
  for (let k = 0; k < count; k++) {
    const i0 = (Math.random() * n) | 0, L = 3 + ((Math.random() * 10) | 0)
    const a = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? -1 : 1)
    for (let j = 0; j < L && i0 + j < n; j++) d[i0 + j] += a * (1 - j / L) * (Math.random() * 2 - 1)
  }
  // медленная неровность струи
  const p1 = Math.random() * 6, p2 = Math.random() * 6
  for (let i = 0; i < n; i++) {
    const t = i / sr
    d[i] *= 0.75 + 0.15 * Math.sin(2 * Math.PI * 3.1 * t + p1) + 0.1 * Math.sin(2 * Math.PI * 7.3 * t + p2)
  }
  normRms(d, 0.25)
  return b
}

// Скрип троса лампы: несколько «залипаний-проскальзываний» — серии импульсов с плывущей частотой
function creakBuf(c) {
  const b = makeBuffer(c, 1, 1.6)
  const d = b.getChannelData(0), n = d.length, sr = b.sampleRate
  const segs = [[0.05, 0.38, 38, 62, 0.8], [0.52, 0.3, 55, 30, 0.55], [0.95, 0.45, 30, 70, 1]]  // [старт, длит., частота от→до, громкость]
  for (const [t0, dur, r0, r1, a] of segs) {
    let t = t0 + rnd(-0.02, 0.02)
    while (t < t0 + dur) {
      const u = (t - t0) / dur, i0 = Math.round(t * sr)
      const amp = a * Math.sin(Math.PI * clamp(u, 0, 1)) * rnd(0.5, 1)
      for (let j = 0; j < 6 && i0 + j < n; j++) d[i0 + j] += amp * (1 - j / 6) * (Math.random() * 2 - 1)
      t += rnd(0.7, 1.3) / lerp(r0, r1, u)
    }
  }
  return b
}

// ————————————————————————————————————————————————————————————————
// AquariumAudio
// ————————————————————————————————————————————————————————————————

export class AquariumAudio {
  constructor() {
    // AudioContext создаётся только в start() / setEnabled(true) / resume()
    this._ctx = null
    this._enabled = false
    this._disposed = false
    this._offline = false
    this._ctxFactory = null        // отладка: подмена контекста (OfflineAudioContext для замеров)
    this._hidden = typeof document !== 'undefined' ? !!document.hidden : false
    this._warns = 0
    // последнее известное состояние сцены (update() может приходить и до start())
    this._st = { light: 1, flow: 0, level: 1, draining: false, filling: false, murk: 0, night: 0, pan: 0, alive: 1 }
    this._ctl = 0
    this._lastWall = 0
    this._voices = []
    this._blipEnds = new Float64Array(BLIP_MAX)
    this._buckets = {}
    this._filterOn = null          // null — filterSwitch() ещё не вызывали, судим по flow
    this._spinOn = false
    this._spinOffAt = -10
    this._fPan = 0.45
    this._frozen = false
    this._lampOn = true
    this._drain = null; this._drainOn = false; this._drainLatch = false; this._drainIdleAt = 0; this._nextGlug = 0
    this._fill = null; this._fillOn = false; this._fillIdleAt = 0; this._nextFillBubble = 0
    this._nextRetBlip = 0
    this._nextBell = 0; this._bellIdx = 3
    this._revStep = 0; this._revNext = 0; this._revLast = -10
    this._paneStep = 0; this._paneLast = -10
    this._gestureArmed = false
    this._onVis = this._onVis.bind(this)
    this._onGesture = this._onGesture.bind(this)
  }

  get enabled() { return this._enabled }

  // Контекст есть, звук включён, но браузер его не пускает (автозапуск без жеста) — нужен resume() по клику
  get blocked() {
    const c = this._ctx
    return !!c && !this._disposed && !this._offline && this._enabled && !this._hidden && c.state !== 'running'
  }

  async start(enabled = true) {
    if (this._disposed) return
    try {
      this._enabled = !!enabled
      if (!this._ctx) {
        this._create()
        if (!this._ctx) return
        this._applyOut(FADE_IN)
      } else if (this._enabled && this._ctx.state !== 'running') this._fadeFromSilence(FADE_IN)
      else this._applyOut(MUTE_TC)
      if (this._enabled) { this._unlock(); await this._resume() }
      else this._idleSuspendSoon()
    } catch (e) { this._warn(e) }
  }

  // Разблокировать контекст по клику (после автозапуска без жеста). Грядки входят плавно.
  async resume() {
    if (this._disposed) return
    try {
      if (!this._ctx) return await this.start(true)
      if (this._offline || !this._enabled) return
      if (this._ctx.state !== 'running') this._fadeFromSilence(FADE_IN)
      this._unlock()
      await this._resume()
    } catch (e) { this._warn(e) }
  }

  setEnabled(on) {
    try {
      on = !!on
      if (this._disposed) return
      this._enabled = on
      if (!this._ctx) { if (on) this.start(true); return }
      clearTimeout(this._idleTimer)
      if (on) {
        if (this._ctx.state !== 'running') this._fadeFromSilence(MUTE_TC)
        else this._applyOut(MUTE_TC)
        this._unlock()
        this._resume()
      } else {
        this._applyOut(MUTE_TC)
        this._idleSuspendSoon()     // после затухания усыпляем контекст — ноль нагрузки
      }
    } catch (e) { this._warn(e) }
  }

  dispose() {
    if (this._disposed) return
    this._disposed = true
    try {
      clearTimeout(this._idleTimer)
      clearTimeout(this._visTimer)
      this._disarmGesture()
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._onVis)
      const c = this._ctx
      this._ctx = null
      this._voices.length = 0
      if (!c) return
      try { const t = c.currentTime; this._outG.gain.cancelScheduledValues(t); this._outG.gain.setTargetAtTime(0, t, 0.015) } catch (e) {}
      if (this._offline || typeof c.close !== 'function') return
      setTimeout(() => { try { quiet(c.close()) } catch (e) {} }, c.state === 'running' ? 90 : 0)
    } catch (e) { this._warn(e) }
  }

  // ——— жизненный цикл контекста ———

  _create() {
    let c = null
    if (IOS_PLAYBACK && !this._ctxFactory) {
      try { if (typeof navigator !== 'undefined' && navigator.audioSession) navigator.audioSession.type = 'playback' } catch (e) {}
    }
    try {
      if (this._ctxFactory) c = this._ctxFactory()
      else if (AC) { try { c = new AC({ latencyHint: 'interactive' }) } catch (e) { c = new AC() } }
    } catch (e) { this._warn(e); c = null }
    if (!c) return
    this._ctx = c
    this._offline = typeof c.startRendering === 'function'
    if (this._offline) this._hidden = false
    else {
      try { quiet(c.resume()) } catch (e) {}   // синхронно, пока мы ещё внутри жеста
      this._unlock()
    }
    try { this._build() } catch (e) { this._warn(e) }
    if (!this._offline && typeof document !== 'undefined') document.addEventListener('visibilitychange', this._onVis)
  }

  // Старый iOS: «разблокировка» — проиграть пустой буфер внутри жеста
  _unlock() {
    const c = this._ctx
    if (!c || this._offline) return
    try {
      const s = c.createBufferSource()
      s.buffer = c.createBuffer(1, 1, c.sampleRate)
      s.connect(c.destination)
      s.start(0)
      s.onended = () => { try { s.disconnect() } catch (e) {} }
    } catch (e) {}
  }

  _resume() {
    const c = this._ctx
    if (!c || this._offline || this._disposed || c.state === 'running') return Promise.resolve()
    let p = null
    try { p = c.resume() } catch (e) {}
    const after = () => {
      if (this._ctx === c && c.state !== 'running' && this._enabled && !this._hidden) this._armGesture()
    }
    if (!p || typeof p.then !== 'function') { after(); return Promise.resolve() }
    // iOS может «подвесить» промис вне жеста — не ждём вечно
    return Promise.race([p.then(() => {}, () => {}), new Promise(r => setTimeout(r, 1200))]).then(after)
  }

  // Выход: 1, если звук включён и вкладка видна; иначе 0 (только setTargetAtTime — без скачков)
  _applyOut(tc) {
    const c = this._ctx, g = this._outG
    if (!c || !g) return
    const target = this._enabled && !this._hidden ? 1 : 0
    if (this._offline) { g.gain.value = target; return }
    const t = c.currentTime
    g.gain.cancelScheduledValues(t)
    g.gain.setTargetAtTime(target, t, tc)
  }

  // Контекст стоит: время заморожено, звука нет — начинаем выход с нуля, после resume он плавно поднимется
  _fadeFromSilence(tc) {
    const c = this._ctx, g = this._outG
    if (!c || !g || this._offline) return this._applyOut(tc)
    const t = c.currentTime
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(0, t)
    g.gain.setTargetAtTime(this._enabled && !this._hidden ? 1 : 0, t, tc)
  }

  _idleSuspendSoon() {
    clearTimeout(this._idleTimer)
    if (this._offline) return
    this._idleTimer = setTimeout(() => {
      const c = this._ctx
      if (c && !this._enabled && c.state === 'running') { try { quiet(c.suspend()) } catch (e) {} }
    }, 900)
  }

  _onVis() {
    try {
      const hidden = !!document.hidden
      if (hidden === this._hidden) return
      this._hidden = hidden
      const c = this._ctx
      if (!c || this._disposed) return
      clearTimeout(this._visTimer)
      if (hidden) {
        this._wasRunning = c.state === 'running'
        this._applyOut(0.05)
        this._visTimer = setTimeout(() => {
          const cc = this._ctx
          if (cc && this._hidden && cc.state === 'running') { try { quiet(cc.suspend()) } catch (e) {} }
        }, 300)
      } else if (this._enabled && this._wasRunning !== false) {
        if (c.state !== 'running') this._fadeFromSilence(0.25)
        else this._applyOut(0.25)
        this._resume()
      } else this._applyOut(0.25)
    } catch (e) { this._warn(e) }
  }

  // Если контекст не пустили — возобновим по первому же жесту где угодно на странице
  _armGesture() {
    if (this._gestureArmed || typeof window === 'undefined') return
    this._gestureArmed = true
    for (const ev of GESTURE_EVENTS) window.addEventListener(ev, this._onGesture, { capture: true, passive: true })
  }

  _disarmGesture() {
    if (!this._gestureArmed) return
    this._gestureArmed = false
    for (const ev of GESTURE_EVENTS) window.removeEventListener(ev, this._onGesture, { capture: true })
  }

  _onGesture() {
    try {
      const c = this._ctx
      if (!c || this._disposed || !this._enabled || c.state === 'running') return this._disarmGesture()
      if (this._hidden) return
      this._fadeFromSilence(FADE_IN)
      this._unlock()
      quiet(c.resume())
    } catch (e) { this._warn(e) }
  }

  _warn(e) {
    if (this._warns++ < 5 && typeof console !== 'undefined') console.warn('[AquariumAudio]', e)
  }

  // Разовые звуки: только при живом, включённом и видимом контексте (в паузе — отбрасываем, без «очереди»)
  _can() {
    const c = this._ctx
    return !!c && !!this._outG && !this._disposed && this._enabled && !this._hidden && (this._offline || c.state === 'running')
  }

  // ——— граф ———

  _build() {
    const c = this._ctx
    this._beds = []
    this._white = whiteBuf(c, 4)
    this._pink = pinkBuf(c, 6)
    this._brown = brownBuf(c, 8)
    this._mod = modBuf(c)
    this._crackle = crackleBuf(c)
    this._sand = sandBuf(c)
    this._creak = creakBuf(c)
    this._rattles = [rattleBuf(c), rattleBuf(c), rattleBuf(c)]

    const out = this._outG = gainNode(c, 0)
    out.connect(c.destination)
    const trim = gainNode(c, LIMITER_TRIM)
    trim.connect(out)
    const lim = c.createDynamicsCompressor()
    lim.threshold.value = LIMITER.threshold
    lim.knee.value = LIMITER.knee
    lim.ratio.value = LIMITER.ratio
    lim.attack.value = LIMITER.attack
    lim.release.value = LIMITER.release
    lim.connect(trim)
    const master = this._master = gainNode(c, MASTER_GAIN)
    master.connect(lim)

    // общий зал
    const vin = this._verbIn = gainNode(c, 1)
    const vhp = biquad(c, 'highpass', REVERB.hpHz, -3)
    const conv = c.createConvolver()
    conv.normalize = false
    conv.buffer = irBuf(c)
    const vret = this._verbRet = gainNode(c, REVERB.ret)
    vin.connect(vhp); vhp.connect(conv); conv.connect(vret); vret.connect(master)

    // шины категорий (у водной — ФНЧ мутности)
    this._bus = {}
    for (const k in BUSES) {
      const [g, s] = BUSES[k]
      const inp = gainNode(c, g)
      let tail = inp
      if (k === 'water') {
        const lp = biquad(c, 'lowpass', MURK_CLEAR_HZ, -3)
        inp.connect(lp); tail = lp
        this._murkS = slot(lp.frequency)
      }
      const send = gainNode(c, s)
      tail.connect(master); tail.connect(send); send.connect(vin)
      this._bus[k] = inp
    }
    this._buildRoom()
    this._buildFilter()
    this._buildScore()
    this._applyParams()
  }

  _loop(buf, rate = 1, list = this._beds) {
    const c = this._ctx, s = c.createBufferSource()
    s.buffer = buf; s.loop = true; s.playbackRate.value = rate
    s.start(c.currentTime, Math.random() * buf.duration * 0.9)
    list.push(s)
    return s
  }

  // Источник модуляции: 4 канала плавного случайного сигнала → любые AudioParam
  _modSrc(rate, list = this._beds, t0) {
    const c = this._ctx, s = c.createBufferSource()
    s.buffer = this._mod; s.loop = true; s.playbackRate.value = rate
    const sp = c.createChannelSplitter(4)
    s.connect(sp)
    s.start(t0 != null ? t0 : c.currentTime, Math.random() * 11)
    if (list) list.push(s)
    return { src: s, to: (ch, param, depth) => { const g = gainNode(c, depth); sp.connect(g, ch); g.connect(param); return g } }
  }

  _pannerNode(x) {
    const c = this._ctx
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(num(x, 0), -1, 1); return p }
    const p = c.createPanner()
    p.panningModel = 'equalpower'
    setPannerPos(p, num(x, 0))
    return p
  }

  _panSlot(p) { return p.pan ? slot(p.pan) : { p: null, node: p, v: NaN } }

  _setPan(s, x) {
    if (!s) return
    if (s.p) return this._set(s, x, 0.25)
    if (!(Math.abs(x - s.v) < 0.01)) { s.v = x; setPannerPos(s.node, x) }
  }

  _set(s, v, tc) {
    if (!s || Math.abs(v - s.v) <= 1e-6 + Math.abs(s.v) * 0.004) return
    s.v = v
    s.p.setTargetAtTime(v, this._ctx.currentTime, tc)
  }

  _buildRoom() {
    const c = this._ctx
    const src = this._loop(this._brown)
    const lp = biquad(c, 'lowpass', ROOM_LP, -3), hp = biquad(c, 'highpass', 28, -3)
    const g = this._roomG = gainNode(c, ROOM_GAIN)
    src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(this._bus.room)
  }

  _buildFilter() {
    const c = this._ctx
    // гул мотора: одна волна с гармониками; плавание высоты и амплитуды
    const wave = c.createPeriodicWave(new Float32Array(HUM_HARM.length), Float32Array.from(HUM_HARM))
    const hum = c.createOscillator()
    hum.setPeriodicWave(wave)
    hum.frequency.value = HUM_HZ
    const am = gainNode(c, 1), lvl = gainNode(c, 0), spin = gainNode(c, 0)
    const hp = this._pannerNode(this._fPan)
    hum.connect(am); am.connect(lvl); lvl.connect(spin); spin.connect(hp); hp.connect(this._bus.mech)
    const m = this._modSrc(0.7)
    m.to(0, hum.detune, HUM_WOBBLE)
    m.to(1, am.gain, 0.12)
    hum.start(c.currentTime)
    this._beds.push(hum)
    this._humDetune = hum.detune
    this._humSpin = spin.gain
    this._humLvlS = slot(lvl.gain)
    this._humPanS = this._panSlot(hp)

    // возврат воды: розовый шум через полосы с медленной и быстрой случайной АМ — журчание
    const src = this._loop(this._pink)
    const sum = gainNode(c, 1)
    const slow = this._modSrc(0.9), fast = this._modSrc(3.1)
    RETURN_BANDS.forEach(([f, q, l], i) => {
      const bp = biquad(c, 'bandpass', f, q), a = gainNode(c, 0.5), g = gainNode(c, l)
      slow.to(i, a.gain, 0.28)
      if (i) fast.to(i, a.gain, 0.2)
      src.connect(bp); bp.connect(a); a.connect(g); g.connect(sum)
    })
    const rl = gainNode(c, 0), rs = gainNode(c, 0), tap = gainNode(c, 1)
    const rp = this._pannerNode(this._fPan)
    sum.connect(rl); rl.connect(rs); rs.connect(tap); tap.connect(rp); rp.connect(this._bus.water)
    this._retLvlS = slot(rl.gain)
    this._retSpin = rs.gain
    this._retTap = tap
    this._retPanS = this._panSlot(rp)
  }

  _buildScore() {
    const c = this._ctx
    const out = gainNode(c, 0)
    const lp = biquad(c, 'lowpass', PAD_LP_DAY, 0)
    lp.connect(out); out.connect(this._bus.pad)
    this._modSrc(0.05).to(0, lp.detune, PAD_LP_SWING)
    const day = gainNode(c, 1), night = gainNode(c, 0)
    day.connect(lp); night.connect(lp)
    const t = c.currentTime
    const voices = (list, dest) => list.forEach(([f, a]) => {
      const vg = gainNode(c, a * 0.7)
      const o1 = c.createOscillator(), o2 = c.createOscillator(), o2g = gainNode(c, 0.6)
      o1.frequency.value = f; o1.detune.value = -PAD_DETUNE
      o2.type = 'triangle'; o2.frequency.value = f; o2.detune.value = PAD_DETUNE
      o1.connect(vg); o2.connect(o2g); o2g.connect(vg)
      const lfo = c.createOscillator(), lg = gainNode(c, a * 0.3)
      lfo.frequency.value = rnd(0.011, 0.045)
      lfo.connect(lg); lg.connect(vg.gain)
      vg.connect(dest)
      for (const o of [o1, o2, lfo]) { o.start(t); this._beds.push(o) }
    })
    voices(PAD_DAY, day)
    voices(PAD_NIGHT, night)
    this._padOutS = slot(out.gain)
    this._padLpS = slot(lp.frequency)
    this._dayS = slot(day.gain)
    this._nightS = slot(night.gain)
  }

  // ——— состояние сцены ———

  update(dt, s) {
    try {
      if (this._disposed) return
      if (s) this._read(s)
      const c = this._ctx
      if (!c || !this._outG || !(this._offline || c.state === 'running')) return
      const wall = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const resync = !this._offline && wall - this._lastWall > 500   // долгая пауза — без «переходных» звуков
      this._lastWall = wall
      this._ctl += clamp(num(dt, 0), 0, 0.1)
      this._events(c.currentTime, resync)
      if (resync || this._ctl >= CONTROL_DT - 1e-4) { this._ctl = 0; this._applyParams() }
    } catch (e) { this._warn(e) }
  }

  _read(s) {
    const st = this._st
    st.light = clamp(num(s.light, st.light), 0, 1)
    st.flow = clamp(num(s.flow, st.flow), 0, 1)
    st.level = clamp(num(s.level, st.level), 0, 1)
    st.murk = clamp(num(s.murk, st.murk), 0, 1)
    st.night = clamp(num(s.night, st.night), 0, 1)
    st.pan = clamp(num(s.pan, st.pan), -1, 1)
    st.alive = clamp(num(s.alive, st.alive), 0, 1)
    st.draining = !!s.draining
    st.filling = !!s.filling
  }

  _applyParams() {
    if (!this._humSpin) return
    const st = this._st
    // фильтр относительно камеры (pan = азимут / π)
    const th = st.pan * Math.PI, cs = Math.cos(th), sn = Math.sin(th)
    const ox = FILTER_POS[0] * cs - FILTER_POS[1] * sn
    const oz = FILTER_POS[0] * sn + FILTER_POS[1] * cs
    const pan = this._fPan = clamp(ox * FILTER_PAN_SPREAD, -0.85, 0.85)
    const near = 1 + FILTER_NEAR * oz
    this._setPan(this._humPanS, pan)
    this._setPan(this._retPanS, pan)
    if (this._filterOn === null && (st.flow > 0.02) !== this._spinOn) this._spin(st.flow > 0.02, false)
    const f = st.flow
    this._set(this._humLvlS, HUM_GAIN * Math.min(1, f * 1.6) * near, 0.35)
    this._set(this._retLvlS, RETURN_GAIN * Math.pow(f, 1.2) * near, 0.45)
    this._set(this._murkS, MURK_CLEAR_HZ * Math.pow(MURK_DARK_HZ / MURK_CLEAR_HZ, st.murk), 0.6)
    // партитура гаснет вместе с жизнью (~3 с) и возвращается мягче
    const score = SCORE_GAIN * sstep(0, 0.3, st.alive) * (this._frozen ? 0 : 1)
    this._set(this._padOutS, score, score < this._padOutS.v ? 0.8 : 1.6)
    this._set(this._padLpS, lerp(PAD_LP_NIGHT, PAD_LP_DAY, st.light), 0.6)
    this._set(this._dayS, Math.cos(st.night * Math.PI / 2), 0.9)
    this._set(this._nightS, Math.sin(st.night * Math.PI / 2), 0.9)
    const L = st.level, D = this._drain, F = this._fill
    if (D) {
      const k = 0.35 + 0.65 * Math.sqrt(L)
      this._set(D.rS, DRAIN_RUMBLE * k, 0.5)
      this._set(D.hS, DRAIN_HOSE * k, 0.5)
    }
    if (F) {
      const fres = FILL_RES_HZ / (1 - 0.8 * L)
      this._set(F.sS, FILL_SPLASH * lerp(1, 0.25, sstep(0, 0.5, L)), 0.3)
      this._set(F.pkS, lerp(3600, 1900, sstep(0, 0.6, L)), 0.4)
      this._set(F.pS, FILL_PLUNGE * sstep(0, 0.4, L), 0.4)
      this._set(F.rS, FILL_RES * (0.35 + 0.65 * sstep(0, 0.3, L)) * Math.pow(FILL_RES_HZ / fres, 0.35), 0.4)
      this._set(F.f1S, fres, 0.25)
      this._set(F.f3S, fres * 3, 0.25)
    }
  }

  // Мотор фильтра: glide — с разгоном/остановкой ~1.5 с (высота + уровень)
  _spin(on, glide) {
    const c = this._ctx
    if (!c || !this._humSpin) return
    const t = c.currentTime + (glide ? LEAD : 0)
    const hs = this._humSpin, rs = this._retSpin, dt = this._humDetune
    hs.cancelScheduledValues(t); rs.cancelScheduledValues(t); dt.cancelScheduledValues(t)
    const wasOn = this._spinOn
    this._spinOn = on
    if (!on) this._spinOffAt = c.currentTime
    if (!glide) {
      hs.setTargetAtTime(on ? 1 : 0, t, 0.3)
      rs.setTargetAtTime(on ? 1 : 0, t, 0.4)
      dt.setTargetAtTime(on ? 0 : SPIN_LOW, t, 0.3)
      return
    }
    if (on) {
      if (!wasOn && c.currentTime - this._spinOffAt > 2.5) dt.setValueAtTime(SPIN_LOW, t)
      dt.setTargetAtTime(0, t, SPIN_UP_TC)
      hs.setTargetAtTime(1, t, SPIN_UP_TC * 0.8)
      rs.setTargetAtTime(1.3, t + 0.35, 0.3)   // вода «выстреливает» из флейты
      rs.setTargetAtTime(1, t + 1.3, 0.5)
    } else {
      dt.setTargetAtTime(SPIN_LOW * 1.2, t, SPIN_DOWN_TC)
      hs.setTargetAtTime(0, t + 0.05, SPIN_DOWN_TC * 0.8)
      rs.setTargetAtTime(0, t + 0.1, 0.35)
    }
  }

  // Событийные «грядки»: бульки слива, пузыри налива, журчание у флейты, колокольчики
  _events(now, resync) {
    const st = this._st
    if (!st.draining) this._drainLatch = false
    if (st.draining && !this._drainLatch && st.level > 0.004) {
      if (!this._drainOn) this._drainStart(now, resync)
      if (this._nextGlug < now - 0.3) this._nextGlug = now + rnd(0.05, 0.2)
      while (this._nextGlug < now + 0.12) {
        this._glugAt(this._nextGlug, st.level)
        this._nextGlug += this._glugGap(st.level)
      }
    } else if (this._drainOn) this._drainStop(now, st.level < 0.06 && !resync)
    if (this._drain && !this._drainOn && now > this._drainIdleAt) this._releaseBed('_drain')

    if (st.filling) {
      if (!this._fillOn) this._fillStart(now, resync)
      const rate = FILL_BUBBLES * (0.15 + st.level)
      if (this._nextFillBubble < now - 0.3) this._nextFillBubble = now
      while (this._nextFillBubble < now + 0.1) {
        this._fillBubbleAt(this._nextFillBubble, st.level)
        this._nextFillBubble += expRand(1 / rate)
      }
    } else if (this._fillOn) this._fillStop(now, resync)
    if (this._fill && !this._fillOn && now > this._fillIdleAt) this._releaseBed('_fill')

    const f = st.flow
    if (this._spinOn && f > 0.05) {
      if (this._nextRetBlip < now - 0.3) this._nextRetBlip = now + rnd(0, 0.3)
      while (this._nextRetBlip < now + 0.1) {
        this._blip(this._retTap, this._nextRetBlip, rnd(1100, 3200), rnd(1.25, 1.6), rnd(0.012, 0.03), RETURN_BLIP_GAIN * f * rnd(0.3, 1), rnd(0.006, 0.014))
        this._nextRetBlip += expRand(1 / (RETURN_BLIPS * f))
      }
    }

    if (st.alive > 0.25 && !this._frozen) {
      if (!this._nextBell || this._nextBell < now - 1) this._nextBell = now + rnd(3, 8)
      else if (now >= this._nextBell) {
        this._bell(now + LEAD)
        const gap = st.night > 0.5 ? BELL_GAP_NIGHT : BELL_GAP_DAY
        this._nextBell = now + rnd(gap[0], gap[1])
      }
    } else this._nextBell = 0
  }

  _releaseBed(key) {
    const b = this[key]
    this[key] = null
    if (!b) return
    for (const s of b.srcs) { try { s.stop() } catch (e) {} }
    try { b.out.disconnect() } catch (e) {}
  }

  // ——— слив ———

  _ensureDrain() {
    if (this._drain) return this._drain
    const c = this._ctx, srcs = []
    const out = gainNode(c, 0), pan = this._pannerNode(DRAIN_PAN)
    out.connect(pan); pan.connect(this._bus.water)
    // всасывающий гул
    const r = this._loop(this._brown, 1, srcs)
    const rhp = biquad(c, 'highpass', 40, -3), rlp = biquad(c, 'lowpass', 170, -3), rpk = biquad(c, 'peaking', 65, 1.2, 4)
    const ram = gainNode(c, 0.65), rg = gainNode(c, 0)
    r.connect(rhp); rhp.connect(rlp); rlp.connect(rpk); rpk.connect(ram); ram.connect(rg); rg.connect(out)
    // вода в шланге
    const h = this._loop(this._pink, 1, srcs)
    const hbp = biquad(c, 'bandpass', 420, 1.3), ham = gainNode(c, 0.5), hg = gainNode(c, 0)
    h.connect(hbp); hbp.connect(ham); ham.connect(hg); hg.connect(out)
    const m = this._modSrc(1.1, srcs)
    m.to(0, ram.gain, 0.35); m.to(1, ham.gain, 0.45); m.to(2, hbp.detune, 250)
    this._drain = { srcs, out, rS: slot(rg.gain), hS: slot(hg.gain) }
    return this._drain
  }

  _drainStart(now, resync) {
    const D = this._ensureDrain()
    this._drainOn = true
    D.out.gain.cancelScheduledValues(now)
    D.out.gain.setTargetAtTime(1, now, resync ? 0.4 : 0.25)
    this._nextGlug = now + rnd(0.3, 0.55)
    this._applyParams()
  }

  _drainStop(now, empty) {
    const D = this._drain
    this._drainOn = false
    this._drainIdleAt = now + (empty ? 4 : 3)
    if (this._st.draining) this._drainLatch = true
    if (!D) return
    const g = D.out.gain
    g.cancelScheduledValues(now)
    if (empty) { this._slurp(now + 0.03); g.setTargetAtTime(0, now + 1.05, 0.3) }
    else g.setTargetAtTime(0, now, 0.35)
  }

  _glugGap(L) {
    if (Math.random() < 0.22) return rnd(0.05, 0.09)   // двойной «буль»
    return rnd(GLUG_GAP[0], GLUG_GAP[1]) * (1 + 2.6 * (1 - sstep(0, 0.3, L)))   // у дна — реже
  }

  _glugAt(t, L) {
    const D = this._drain
    if (!D) return
    this._glug(D.out, t, rnd(140, 205), rnd(2.0, 2.5), rnd(0.05, 0.1), GLUG_GAIN * rnd(0.45, 1) * (0.75 + 0.25 * (1 - L)), rnd(0.028, 0.05))
  }

  // «Буль»: синус + узкая полоса шума, оба с восходящим глиссандо (пузырь воздуха в шланге)
  _glug(dest, t, f0, ratio, glide, amp, tc) {
    const end = t + 0.006 + tc * 7
    if (!this._blipSlot(end)) return
    const c = this._ctx
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(amp, t + 0.006)
    g.gain.setTargetAtTime(0, t + 0.006, tc)
    g.connect(dest)
    const o = c.createOscillator()
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f0 * ratio, t + glide)
    o.connect(g)
    const n = c.createBufferSource()
    n.buffer = this._white; n.loop = true
    const bp = biquad(c, 'bandpass', f0 * 1.5, 6)
    bp.frequency.setValueAtTime(f0 * 1.5, t)
    bp.frequency.exponentialRampToValueAtTime(f0 * ratio * 1.5, t + glide)
    const ng = gainNode(c, 6)
    n.connect(bp); bp.connect(ng); ng.connect(g)
    o.start(t); o.stop(end)
    n.start(t, Math.random() * 3); n.stop(end)
    o.onended = () => { try { g.disconnect() } catch (e) {} }
  }

  // Финальный «всхлип»: шланг глотает воздух, пара последних пузырей
  _slurp(t) {
    const D = this._drain
    if (!D) return
    const c = this._ctx
    const n = c.createBufferSource()
    n.buffer = this._white; n.loop = true
    const bp = biquad(c, 'bandpass', 380, 2.5), f = bp.frequency
    f.setValueAtTime(380, t); f.exponentialRampToValueAtTime(1100, t + 0.22)
    f.exponentialRampToValueAtTime(520, t + 0.62); f.exponentialRampToValueAtTime(900, t + 0.85)
    const am = gainNode(c, 0.5)
    const m = this._modSrc(9, null, t)
    m.to(0, am.gain, 0.5)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(SLURP_GAIN * 12, t + 0.1)
    g.gain.setValueAtTime(SLURP_GAIN * 12, t + 0.55)
    g.gain.setTargetAtTime(0, t + 0.55, 0.12)
    n.connect(bp); bp.connect(am); am.connect(g); g.connect(D.out)
    n.start(t, Math.random() * 3); n.stop(t + 1.5); m.src.stop(t + 1.5)
    n.onended = () => { try { g.disconnect() } catch (e) {} }
    let tk = t + 0.6
    for (let k = 0; k < 3; k++) {
      this._glug(D.out, tk, rnd(230, 300) * (1 + 0.25 * k), rnd(1.9, 2.4), 0.06, GLUG_GAIN * (0.8 - 0.2 * k), 0.035)
      tk += rnd(0.09, 0.16)
    }
  }

  // ——— налив ———

  _ensureFill() {
    if (this._fill) return this._fill
    const c = this._ctx, srcs = []
    const out = gainNode(c, 0)
    out.connect(this._bus.water)
    const w = this._loop(this._white, 1, srcs)
    // брызги: струя барабанит по стеклу/грунту
    const shp = biquad(c, 'highpass', 950, -3), spk = biquad(c, 'peaking', 3600, 0.8, 5)
    const sam = gainNode(c, 0.55), sg = gainNode(c, 0)
    w.connect(shp); shp.connect(spk); spk.connect(sam); sam.connect(sg); sg.connect(out)
    // поток уходит в толщу воды
    const p = this._loop(this._pink, 1, srcs)
    const plp = biquad(c, 'lowpass', 1100, -3), ppk = biquad(c, 'peaking', 300, 1, 6)
    const pam = gainNode(c, 0.6), pg = gainNode(c, 0)
    p.connect(plp); plp.connect(ppk); ppk.connect(pam); pam.connect(pg); pg.connect(out)
    // резонанс воздушного столба над водой (нечётные гармоники четвертьволновой трубы)
    const r1 = biquad(c, 'bandpass', FILL_RES_HZ, 16), r3 = biquad(c, 'bandpass', FILL_RES_HZ * 3, 14)
    const r3g = gainNode(c, 0.45), ram = gainNode(c, 0.7), rg = gainNode(c, 0)
    w.connect(r1); w.connect(r3); r1.connect(ram); r3.connect(r3g); r3g.connect(ram); ram.connect(rg); rg.connect(out)
    const mf = this._modSrc(3.6, srcs), ms = this._modSrc(1.0, srcs)
    mf.to(0, sam.gain, 0.45)
    ms.to(1, pam.gain, 0.35)
    ms.to(2, ram.gain, 0.25)
    this._fill = { srcs, out, sS: slot(sg.gain), pkS: slot(spk.frequency), pS: slot(pg.gain), rS: slot(rg.gain), f1S: slot(r1.frequency), f3S: slot(r3.frequency) }
    return this._fill
  }

  _fillStart(now, resync) {
    const F = this._ensureFill()
    this._fillOn = true
    F.out.gain.cancelScheduledValues(now)
    F.out.gain.setTargetAtTime(1, now, resync ? 0.4 : 0.06)
    this._nextFillBubble = now + 0.05
    this._applyParams()
  }

  _fillStop(now, resync) {
    const F = this._fill
    this._fillOn = false
    this._fillIdleAt = now + 2.5
    if (!F) return
    F.out.gain.cancelScheduledValues(now)
    F.out.gain.setTargetAtTime(0, now, 0.3)
    if (resync) return
    const n = 2 + ((Math.random() * 3) | 0)   // последние капли иссякшей струи
    let t = now + 0.35
    for (let i = 0; i < n; i++) {
      this._blip(this._bus.water, t, rnd(1400, 2600), rnd(1.3, 1.6), 0.012, PLIP_GAIN * 1.6 * rnd(0.6, 1), rnd(0.01, 0.016))
      t += rnd(0.18, 0.4)
    }
  }

  _fillBubbleAt(t, L) {
    const F = this._fill
    if (!F) return
    const f0 = rnd(lerp(1300, 380, L), lerp(3200, 1500, L))
    this._blip(F.out, t, f0, rnd(1.3, 1.8), rnd(0.02, 0.05), FILL_BUBBLE_GAIN * rnd(0.3, 1) * (0.4 + 0.6 * L), clamp(rnd(0.008, 0.02) * 1500 / f0, 0.005, 0.05))
  }

  // ——— голоса ———

  _take(kind, rate, burst) {
    const now = this._ctx.currentTime
    let b = this._buckets[kind]
    if (!b) b = this._buckets[kind] = { n: burst, t: now }
    b.n = Math.min(burst, b.n + (now - b.t) * rate)
    b.t = now
    if (b.n < 1) return false
    b.n -= 1
    return true
  }

  _blipSlot(end) {
    const now = this._ctx.currentTime, r = this._blipEnds
    for (let i = 0; i < r.length; i++) if (r[i] <= now) { r[i] = end; return true }
    return false
  }

  // Пузырёк Миннарта для «грядок»: синус с восходящим глиссандо
  _blip(dest, t, f0, ratio, glide, amp, tc) {
    const end = t + 0.003 + tc * 7
    if (!dest || !this._blipSlot(end)) return
    const c = this._ctx
    const o = c.createOscillator(), g = c.createGain()
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f0 * ratio, t + glide)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(amp, t + 0.003)
    g.gain.setTargetAtTime(0, t + 0.003, tc)
    o.connect(g); g.connect(dest)
    o.start(t); o.stop(end)
    o.onended = () => { try { g.disconnect() } catch (e) {} }
  }

  // Новый разовый голос: out (гасится при «краже») → панорама → шина. null — голос отброшен.
  // prio: 0 — мелочь (отбрасывается первой), 1 — обычный, 2 — важный (не крадётся обычными)
  _voice(bus, x, dur, prio, at) {
    const c = this._ctx, now = c.currentTime, vs = this._voices
    let n = 0
    for (let i = 0; i < vs.length; i++) if (vs[i].end > now) vs[n++] = vs[i]
    vs.length = n
    if (n >= MAX_VOICES - (prio ? 0 : LOW_PRIO_FREE)) {
      if (!prio) return null
      let k = 0
      for (let i = 1; i < n; i++) if (vs[i].prio < vs[k].prio) k = i
      if (vs[k].prio > prio) return null
      this._steal(vs[k], now)
      vs.splice(k, 1)
    }
    const t = Math.max(num(at, 0), now + LEAD)
    const out = c.createGain(), pan = this._pannerNode(clamp(num(x, 0), -1, 1))
    out.connect(pan); pan.connect(this._bus[bus])
    const v = { t, end: t + dur, prio, out, pan, srcs: [], live: 0 }
    vs.push(v)
    return v
  }

  _steal(v, now) {
    v.end = now
    try {
      v.out.gain.setValueAtTime(1, now)
      v.out.gain.setTargetAtTime(0, now, 0.012)
      for (const s of v.srcs) { try { s.stop(now + 0.08) } catch (e) {} }
    } catch (e) {}
  }

  _run(v, s, t0, t1, off) {
    if (off != null) s.start(t0, off)
    else s.start(t0)
    s.stop(t1)
    v.srcs.push(s)
    v.live++
    s.onended = () => { if (--v.live <= 0) { try { v.out.disconnect(); v.pan.disconnect() } catch (e) {} } }
    return s
  }

  _osc(v, type, f, t0, t1) {
    const o = this._ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f, t0)
    return this._run(v, o, t0, t1)
  }

  _noise(v, buf, t0, t1, rate) {
    const s = this._ctx.createBufferSource()
    s.buffer = buf; s.loop = true
    if (rate) s.playbackRate.value = rate
    return this._run(v, s, t0, t1, Math.random() * Math.max(0, buf.duration - 0.2))
  }

  // Стеклянный колокольчик (бубенцы партитуры, revive)
  _glass(v, t, f, amp, len) {
    const c = this._ctx
    for (const [r, a, d] of GLASS_PARTIALS) {
      const fr = f * r
      if (fr > 15000) continue
      const o = this._osc(v, 'sine', fr, t, t + len * d * 7.5 + 0.05)
      const g = env(c, t, 0.004, amp * a, len * d)
      o.connect(g); g.connect(v.out)
    }
  }

  _bell(t) {
    const st = this._st, low = st.night > 0.5 ? 0.5 : 1
    let i = this._bellIdx + pick([-2, -1, -1, 1, 1, 2])
    if (i < 0) i = 1
    if (i >= BELL_SCALE.length) i = BELL_SCALE.length - 2
    this._bellIdx = i
    const len = lerp(0.95, 1.2, st.night)
    const amp = BELL_GAIN * lerp(1, 0.7, st.night) * rnd(0.7, 1)
    const v = this._voice('bells', rnd(-0.55, 0.55), len * 7.5 + 0.6, 1, t)
    if (!v) return
    this._glass(v, v.t, BELL_SCALE[i] * low, amp, len)
    if (Math.random() < 0.25) {   // изредка — тихий отзвук соседней ноты
      const j = clamp(i + pick([-1, 1, 2]), 0, BELL_SCALE.length - 1)
      this._glass(v, v.t + rnd(0.2, 0.4), BELL_SCALE[j] * low, amp * 0.6, 0.8)
    }
  }

  // ——— разовые звуки ———

  knock(x, strength) {
    try {
      if (!this._can()) return
      const s = clamp(num(strength, 0.6), 0, 1)
      if (s < 0.01) return
      const v = this._voice('glass', num(x, 0) * 0.85, 0.8, 2)
      if (!v) return
      const c = this._ctx, t = v.t
      const wet = sstep(0.05, 0.6, this._st.level)      // полный аквариум — глухо, пустой — звонко
      const amp = KNOCK_GAIN * Math.pow(s, 1.25) * rnd(0.88, 1.08)
      const vary = rnd(0.96, 1.04)
      // «тук»: стенка, нагруженная водой — синус с быстрым спадом и лёгким падением высоты
      const f = lerp(215, 145, wet) * vary
      const o = this._osc(v, 'sine', f * 1.22, t, t + 0.45)
      o.frequency.exponentialRampToValueAtTime(f, t + 0.03)
      const og = env(c, t, 0.0015, amp, lerp(0.045, 0.028, wet) * rnd(0.9, 1.1))
      o.connect(og); og.connect(v.out)
      // приглушённый «ток»
      const o2 = this._osc(v, 'sine', rnd(430, 560) * vary, t, t + 0.15)
      const o2g = env(c, t, 0.001, amp * 0.3, 0.011)
      o2.connect(o2g); o2g.connect(v.out)
      // костяшка: короткий шумовой импульс
      const n = this._noise(v, this._white, t, t + 0.06)
      const nlp = biquad(c, 'lowpass', 1800 + 2500 * s, -3)
      const ng = env(c, t, 0.0005, amp * 0.5, 0.004)
      n.connect(nlp); nlp.connect(ng); ng.connect(v.out)
      // стекло: шумовая вспышка через три узких резонанса 1.8–4 кГц
      const ring = lerp(0.075, 0.042, wet) * rnd(0.85, 1.15)
      const gn = this._noise(v, this._white, t, t + ring * 8 + 0.02)
      const ge = env(c, t, 0.0008, amp * lerp(1.3, 0.8, wet) * (0.55 + 0.45 * s), ring)
      gn.connect(ge)
      const modes = [[rnd(1850, 2050), 38, 1], [rnd(2700, 2950), 44, 0.75], [rnd(3600, 3950), 50, 0.5]]
      for (const [mf, q, mg] of modes) {
        const bp = biquad(c, 'bandpass', mf * vary, q), g = gainNode(c, mg * GLASS_RING)
        ge.connect(bp); bp.connect(g); g.connect(v.out)
      }
      const m1 = this._osc(v, 'sine', modes[0][0] * vary, t, t + ring * 9 + 0.02)
      const m1g = env(c, t, 0.001, amp * lerp(0.2, 0.05, wet), ring * 1.2)
      m1.connect(m1g); m1g.connect(v.out)
    } catch (e) { this._warn(e) }
  }

  bubble(x, size) {
    try {
      if (!this._can() || !this._take('bubble', BUBBLE_RATE, 3)) return
      const sz = clamp(num(size, 0.5), 0, 1)
      const v = this._voice('water', num(x, 0) * 0.8, 0.3, 0)
      if (!v) return
      const c = this._ctx, t = v.t
      const f0 = lerp(1900, 650, sz) * rnd(0.9, 1.1)   // крупнее пузырь — ниже тон
      const o = this._osc(v, 'sine', f0, t, t + 0.25)
      o.frequency.exponentialRampToValueAtTime(f0 * rnd(1.5, 1.85), t + lerp(0.03, 0.06, sz) * rnd(0.85, 1.15))
      const g = env(c, t, 0.0025, BUBBLE_GAIN * lerp(0.7, 1.2, sz) * rnd(0.6, 1), lerp(0.012, 0.028, sz))
      o.connect(g); g.connect(v.out)
    } catch (e) { this._warn(e) }
  }

  plip(x) {
    try {
      if (!this._can() || !this._take('plip', PLIP_RATE, 4)) return
      const v = this._voice('water', num(x, 0) * 0.8, 0.12, 0)
      if (!v) return
      const c = this._ctx, t = v.t, f = rnd(2300, 3800)
      const o = this._osc(v, 'sine', f, t, t + 0.1)
      o.frequency.exponentialRampToValueAtTime(f * rnd(1.25, 1.5), t + 0.012)
      const g = env(c, t, 0.001, PLIP_GAIN * rnd(0.6, 1), rnd(0.006, 0.01))
      o.connect(g); g.connect(v.out)
      const n = this._noise(v, this._white, t, t + 0.02)
      const hp = biquad(c, 'highpass', 5000, -3), ng = env(c, t, 0.0003, PLIP_GAIN * 0.35, 0.0012)
      n.connect(hp); hp.connect(ng); ng.connect(v.out)
    } catch (e) { this._warn(e) }
  }

  fishTouch(x) {
    try {
      if (!this._can()) return
      if (this._st.level < 0.08) return this._porcelain(x)   // воды нет — рыбы фарфоровые
      const v = this._voice('water', num(x, 0) * 0.8, 0.8, 1)
      if (!v) return
      const c = this._ctx, t = v.t
      const lp = biquad(c, 'lowpass', 1400, -3)             // «под водой»
      lp.connect(v.out)
      const f = rnd(190, 240)
      for (const [r, a] of [[1, 1], [2.02, 0.12]]) {
        const o = this._osc(v, 'sine', f * r, t, t + 0.5)
        o.frequency.exponentialRampToValueAtTime(f * r * 1.9, t + 0.075)
        o.frequency.setTargetAtTime(f * r * 1.75, t + 0.075, 0.05)
        const g = env(c, t, 0.009, FISH_GAIN * a, 0.05)
        o.connect(g); g.connect(lp)
      }
      const n = this._noise(v, this._pink, t, t + 0.45)
      const nlp = biquad(c, 'lowpass', 650, -3), ng = env(c, t, 0.012, FISH_GAIN * 0.6, 0.06)
      n.connect(nlp); nlp.connect(ng); ng.connect(lp)
      // рыба метнулась: короткий «свист» воды
      const t2 = t + 0.035
      const s = this._noise(v, this._white, t2, t2 + 0.5)
      const bp = biquad(c, 'bandpass', 700, 1.3)
      bp.frequency.setValueAtTime(700, t2)
      bp.frequency.exponentialRampToValueAtTime(2200, t2 + 0.2)
      const sg = c.createGain()
      sg.gain.setValueAtTime(0, t2)
      sg.gain.linearRampToValueAtTime(FISH_GAIN * 0.5, t2 + 0.05)
      sg.gain.setTargetAtTime(0, t2 + 0.05, 0.06)
      s.connect(bp); bp.connect(sg); sg.connect(v.out)
    } catch (e) { this._warn(e) }
  }

  _porcelain(x) {
    const v = this._voice('glass', num(x, 0) * 0.8, 0.5, 1)
    if (!v) return
    const c = this._ctx, t = v.t, k = rnd(0.94, 1.06)
    for (const [f, a, tc] of [[2650, 1, 0.05], [4180, 0.55, 0.03], [6010, 0.3, 0.018]]) {
      const o = this._osc(v, 'sine', f * k, t, t + tc * 8)
      const g = env(c, t, 0.0008, FISH_GAIN * 0.3 * a, tc)
      o.connect(g); g.connect(v.out)
    }
  }

  splash(x, strength) {
    try {
      if (!this._can()) return
      const s = clamp(num(strength, 0.5), 0, 1)
      if (s < 0.01 || !this._take('splash', SPLASH_RATE, 2)) return
      const v = this._voice('water', num(x, 0) * 0.8, 1.2, 1)
      if (!v) return
      const c = this._ctx, t = v.t
      const amp = SPLASH_GAIN * Math.pow(s, 1.15) * rnd(0.85, 1.05)
      // удар о поверхность
      const n = this._noise(v, this._white, t, t + 0.6)
      const hp = biquad(c, 'highpass', 380, -3), pk = biquad(c, 'peaking', rnd(1800, 2600), 0.9, 5)
      const ng = env(c, t, 0.0015, amp * 0.7, lerp(0.025, 0.07, s))
      n.connect(hp); hp.connect(pk); pk.connect(ng); ng.connect(v.out)
      // «шлёп» — масса воды
      const b = this._noise(v, this._pink, t, t + 0.7)
      const blp = biquad(c, 'lowpass', lerp(500, 1100, s), -3), bg = env(c, t, 0.004, amp * 0.8, lerp(0.04, 0.09, s))
      b.connect(blp); blp.connect(bg); bg.connect(v.out)
      // схлопывание каверны
      const tb = t + rnd(0.02, 0.05), fb = rnd(300, 480) * lerp(1.4, 0.8, s)
      const o = this._osc(v, 'sine', fb, tb, tb + 0.35)
      o.frequency.exponentialRampToValueAtTime(fb * rnd(1.5, 1.9), tb + 0.06)
      const og = env(c, tb, 0.003, amp * 0.55, 0.04)
      o.connect(og); og.connect(v.out)
      // брызги падают обратно
      const drops = Math.round(1 + 7 * s * rnd(0.7, 1.2))
      for (let i = 0; i < drops; i++) {
        const td = t + rnd(0.07, 0.25 + 0.35 * s), fd = rnd(1400, 3600)
        const od = this._osc(v, 'sine', fd, td, td + 0.1)
        od.frequency.exponentialRampToValueAtTime(fd * rnd(1.2, 1.5), td + 0.015)
        const gd = env(c, td, 0.001, amp * rnd(0.05, 0.16), rnd(0.008, 0.016))
        od.connect(gd); gd.connect(v.out)
      }
    } catch (e) { this._warn(e) }
  }

  feed() {
    try {
      if (!this._can()) return
      const v = this._voice('mech', rnd(-0.15, 0.15), 1.0, 1)
      if (!v) return
      const c = this._ctx, t = v.t
      const s = c.createBufferSource()
      s.buffer = pick(this._rattles)
      s.playbackRate.value = rnd(0.92, 1.08)
      const hp = biquad(c, 'highpass', 650, -3), air = biquad(c, 'peaking', 4200, 1, 3)
      const body = biquad(c, 'bandpass', rnd(850, 1100), 2.5), bg = gainNode(c, 0.9)
      const g = gainNode(c, FEED_GAIN * rnd(0.85, 1))
      s.connect(hp); hp.connect(air); air.connect(g); hp.connect(body); body.connect(bg); bg.connect(g); g.connect(v.out)
      this._run(v, s, t, t + 0.9)
    } catch (e) { this._warn(e) }
  }

  lightSwitch(on) {
    try {
      on = !!on
      this._lampOn = on
      if (!this._can()) return
      const v = this._voice('mech', -0.05, 0.3, 2)
      if (v) this._switchClick(v, v.t, on)
      this._lampGesture(this._ctx.currentTime + LEAD + 0.03, on)
    } catch (e) { this._warn(e) }
  }

  _switchClick(v, t, on) {
    const c = this._ctx, p = on ? 1 : 0.88, A = CLICK_GAIN
    const n = this._noise(v, this._white, t, t + 0.05)
    const bp = biquad(c, 'bandpass', 3300 * p, 1.2), ng = env(c, t, 0.0004, A * 0.8, 0.0022)
    n.connect(bp); bp.connect(ng); ng.connect(v.out)
    const o = this._osc(v, 'sine', 1250 * p, t, t + 0.1), og = env(c, t, 0.0006, A * 0.35, 0.007)
    o.connect(og); og.connect(v.out)
    const o2 = this._osc(v, 'sine', 190, t, t + 0.12), o2g = env(c, t, 0.001, A * 0.3, 0.012)
    o2.connect(o2g); o2g.connect(v.out)
    const tb = t + rnd(0.006, 0.01)   // отскок клавиши
    const n2 = this._noise(v, this._white, tb, tb + 0.03)
    const bp2 = biquad(c, 'bandpass', 2600 * p, 1.5), n2g = env(c, tb, 0.0004, A * 0.25, 0.002)
    n2.connect(bp2); bp2.connect(n2g); n2g.connect(v.out)
  }

  // Свет зажёгся — мягкое «раскрытие» аккорда; погас — тихое оседание вниз
  _lampGesture(t, on) {
    const v = this._voice('pad', 0, on ? 5.5 : 4.5, 1, t)
    if (!v) return
    const c = this._ctx, A = LAMP_SWELL_GAIN
    const lp = biquad(c, 'lowpass', on ? 260 : 1700, 2), g = c.createGain()
    lp.connect(g); g.connect(v.out)
    const tones = on ? [[293.66, 1], [440, 0.7], [659.26, 0.45]] : [[220, 1], [329.63, 0.7], [493.88, 0.4]]
    const end = v.t + (on ? 5.3 : 4.3)
    t = v.t
    for (const [f, a] of tones) {
      const o = this._osc(v, 'sine', f, t, end)
      if (!on) o.detune.setTargetAtTime(-35, t, 0.6)
      const og = gainNode(c, a)
      o.connect(og); og.connect(lp)
    }
    g.gain.setValueAtTime(0, t)
    if (on) {
      lp.frequency.setValueAtTime(260, t)
      lp.frequency.exponentialRampToValueAtTime(2400, t + 1.4)
      g.gain.linearRampToValueAtTime(A, t + 1.1)
      g.gain.setTargetAtTime(0, t + 1.1, 0.8)
    } else {
      lp.frequency.setValueAtTime(1700, t)
      lp.frequency.exponentialRampToValueAtTime(180, t + 1.6)
      g.gain.linearRampToValueAtTime(A * 0.8, t + 0.12)
      g.gain.setTargetAtTime(0, t + 0.12, 0.55)
    }
  }

  filterSwitch(on) {
    try {
      on = !!on
      this._filterOn = on
      if (!this._ctx || this._disposed || !this._humSpin) return
      const audible = this._can()
      if (on !== this._spinOn) this._spin(on, audible)   // в mute — без разгона, но состояние верное
      if (!audible) return
      this._relay(on)
      if (this._st.level > 0.5) {
        const now = this._ctx.currentTime
        if (on) for (let i = 0; i < 6; i++) this._blip(this._retTap, now + rnd(0.7, 2.3), rnd(700, 2200), rnd(1.4, 1.8), rnd(0.02, 0.05), RETURN_BLIP_GAIN * rnd(1.5, 3), rnd(0.01, 0.025))
        else for (let i = 0; i < 2; i++) this._blip(this._retTap, now + rnd(0.8, 1.6), rnd(1600, 2600), 1.4, 0.012, RETURN_BLIP_GAIN * 2, 0.012)
      }
    } catch (e) { this._warn(e) }
  }

  _relay(on) {
    const v = this._voice('mech', this._fPan, 0.3, 2)
    if (!v) return
    const c = this._ctx, t = v.t, a = RELAY_GAIN * (on ? 1 : 0.8)
    const click = (tc, amp, f) => {
      const n = this._noise(v, this._white, tc, tc + 0.03)
      const bp = biquad(c, 'bandpass', f, 2.2), g = env(c, tc, 0.0003, amp, 0.0016)
      n.connect(bp); bp.connect(g); g.connect(v.out)
      const o = this._osc(v, 'sine', f * 1.13, tc, tc + 0.09), og = env(c, tc, 0.0005, amp * 0.18, 0.009)
      o.connect(og); og.connect(v.out)
    }
    click(t, a, on ? 4600 : 4100)
    click(t + rnd(0.007, 0.011), a * 0.45, on ? 3900 : 3500)   // дребезг контактов
    const o = this._osc(v, 'sine', 820, t, t + 0.1), og = env(c, t, 0.0008, a * 0.3, 0.008)
    o.connect(og); og.connect(v.out)
  }

  freeze() {
    try {
      this._frozen = true
      if (!this._can()) return
      const v = this._voice('bells', 0, 7.5, 2)
      if (!v) return
      const c = this._ctx, t = v.t, A = FREEZE_GAIN
      // вдох: воздух нарастает и мягко обрывается
      const n = this._noise(v, this._pink, t, t + 2)
      const bp = biquad(c, 'bandpass', 1800, 0.8)
      bp.frequency.setValueAtTime(1800, t)
      bp.frequency.exponentialRampToValueAtTime(4200, t + 0.9)
      const ng = c.createGain()
      ng.gain.setValueAtTime(0, t)
      ng.gain.linearRampToValueAtTime(A * 1.2, t + 0.85)
      ng.gain.setTargetAtTime(0, t + 0.85, 0.18)
      n.connect(bp); bp.connect(ng); ng.connect(v.out)
      // стеклянный аккорд D5 A5 E6 G#6 C#7 (лидийская «подвешенность»), медленные биения
      const tones = [[587.33, 0.55, -0.45], [880, 0.8, 0.35], [1318.51, 0.6, -0.15], [1661.22, 0.45, 0.5], [2217.46, 0.28, -0.3]]
      tones.forEach(([f, a, p], i) => {
        const ts = t + 0.62 + i * 0.075
        const pn = this._pannerNode(p), g = c.createGain()
        g.gain.setValueAtTime(0, ts)
        g.gain.setTargetAtTime(A * a, ts, 0.22)
        g.gain.setTargetAtTime(0, t + 2.3 + i * 0.12, 0.62)
        g.connect(pn); pn.connect(v.out)
        const beat = rnd(0.35, 1)
        for (const d of [-beat / 2, beat / 2]) {
          const o = this._osc(v, 'sine', f + d, ts, t + 7.3)
          if (i === tones.length - 1) o.detune.setTargetAtTime(-14, ts + 0.4, 1.2)   // верх медленно «оседает»
          o.connect(g)
        }
      })
      // иней: редкий хрустальный треск
      const cr = c.createBufferSource()
      cr.buffer = this._crackle
      cr.playbackRate.value = rnd(0.9, 1.1)
      const chp = biquad(c, 'highpass', 4500, -3), cg = gainNode(c, A * 0.5)
      cr.connect(chp); chp.connect(cg); cg.connect(v.out)
      this._run(v, cr, t + 0.2, t + 2.4)
      // глубина: тихий низ D2 + D3
      const low = c.createGain()
      low.gain.setValueAtTime(0, t + 0.5)
      low.gain.setTargetAtTime(A * 0.5, t + 0.5, 0.5)
      low.gain.setTargetAtTime(0, t + 2.4, 0.8)
      low.connect(v.out)
      for (const [f, a] of [[73.42, 1], [146.83, 0.4]]) {
        const o = this._osc(v, 'sine', f, t + 0.5, t + 7.3), g = gainNode(c, a)
        o.connect(g); g.connect(low)
      }
    } catch (e) { this._warn(e) }
  }

  revive(x) {
    try {
      this._frozen = false
      if (!this._can() || !this._take('revive', REVIVE_RATE, 5)) return
      const now = this._ctx.currentTime
      if (now - this._revLast > 1.8) this._revStep = Math.random() < 0.5 ? 0 : 1
      const t = Math.max(now + LEAD, this._revNext)
      if (t - now > REVIVE_QUEUE) return
      // одновременные оживления ложатся в восходяще-нисходящее арпеджио, а не в кластер
      const N = REVIVE_NOTES.length, per = 2 * N - 2, k = this._revStep++ % per
      this._revNext = t + REVIVE_STEP * rnd(0.85, 1.3)
      this._revLast = t
      const v = this._voice('bells', num(x, 0) * 0.7, 4.3, 1, t)
      if (!v) return
      this._glass(v, v.t, REVIVE_NOTES[k < N ? k : per - k], REVIVE_GAIN * rnd(0.8, 1), 0.55)
    } catch (e) { this._warn(e) }
  }

  // ——— сборка инсталляции ———

  buildStep(kind, x = 0, strength = 1) {
    try {
      if (!this._can()) return
      const s = clamp(num(strength, 1), 0, 1), px = clamp(num(x, 0), -1, 1)
      if (kind === 'plinth') this._bPlinth(px, s)
      else if (kind === 'glass') this._bPane(px, s)
      else if (kind === 'sand') this._bSand(px, s)
      else if (kind === 'rock') this._bRock(px, s)
      else if (kind === 'plant') this._bPlant(px, s)
      else if (kind === 'lamp') this._bLamp(px, s)
    } catch (e) { this._warn(e) }
  }

  // Постамент: тяжёлый, приглушённый войлоком глухой удар
  _bPlinth(x, s) {
    const v = this._voice('mech', x * 0.5, 1.0, 2)
    if (!v) return
    const c = this._ctx, t = v.t, A = PLINTH_GAIN * (0.35 + 0.65 * s) * rnd(0.9, 1.05)
    const f = rnd(58, 66)
    const o = this._osc(v, 'sine', f * 1.25, t, t + 0.7)
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06)
    const og = env(c, t, 0.006, A, 0.065)
    o.connect(og); og.connect(v.out)
    const o2 = this._osc(v, 'sine', rnd(140, 160), t, t + 0.3), o2g = env(c, t, 0.004, A * 0.45, 0.03)
    o2.connect(o2g); o2g.connect(v.out)
    const n = this._noise(v, this._pink, t, t + 0.4)
    const lp = biquad(c, 'lowpass', 380, -3), ng = env(c, t, 0.005, A * 0.9, 0.04)
    n.connect(lp); lp.connect(ng); ng.connect(v.out)
    const w = this._noise(v, this._white, t, t + 0.1)
    const bp = biquad(c, 'bandpass', rnd(650, 760), 1.5), wg = env(c, t, 0.002, A * 0.12, 0.012)
    w.connect(bp); bp.connect(wg); wg.connect(v.out)
  }

  // Стекло встало на место: «тинк» + крошечный низкий стук; серия складывается в восходящую фигуру
  _bPane(x, s) {
    const c = this._ctx, now = c.currentTime
    if (now - this._paneLast > 1.0) this._paneStep = 0
    this._paneLast = now
    const f = PANE_NOTES[Math.min(this._paneStep++, PANE_NOTES.length - 1)] * rnd(0.998, 1.002)
    const v = this._voice('glass', x * 0.8, 1.6, 1)
    if (!v) return
    const t = v.t, A = PANE_GAIN * (0.5 + 0.5 * s)
    for (const [r, a, tc] of [[1, 1, 0.16], [1.003, 0.4, 0.14], [2.32, 0.35, 0.07], [4.25, 0.14, 0.03]]) {
      const o = this._osc(v, 'sine', f * r, t, t + tc * 8)
      const g = env(c, t, 0.0012, A * a, tc)
      o.connect(g); g.connect(v.out)
    }
    const n = this._noise(v, this._white, t, t + 0.03)
    const hp = biquad(c, 'highpass', 3000, -3), ng = env(c, t, 0.0004, A * 0.35, 0.0015)
    n.connect(hp); hp.connect(ng); ng.connect(v.out)
    const o = this._osc(v, 'sine', rnd(180, 220), t, t + 0.15), og = env(c, t, 0.0015, A * 0.4, 0.014)
    o.connect(og); og.connect(v.out)
  }

  // Песок сыплется: зернистое шипение ~0.7 с
  _bSand(x, s) {
    const v = this._voice('mech', x * 0.6, 1.3, 1)
    if (!v) return
    const c = this._ctx, t = v.t, A = SAND_GAIN * (0.4 + 0.6 * s)
    const src = c.createBufferSource()
    src.buffer = this._sand; src.loop = true
    src.playbackRate.value = rnd(0.9, 1.1)
    const hp = biquad(c, 'highpass', 1200, -3), pk = biquad(c, 'peaking', rnd(3000, 4200), 0.8, 4)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(A, t + 0.08)
    g.gain.setValueAtTime(A, t + 0.4)
    g.gain.setTargetAtTime(0, t + 0.4, 0.12)
    src.connect(hp); hp.connect(pk); pk.connect(g); g.connect(v.out)
    const lp = biquad(c, 'lowpass', 700, -3), lg = gainNode(c, 0.35)   // песок ложится на песок
    src.connect(lp); lp.connect(lg); lg.connect(g)
    this._run(v, src, t, t + 1.25, Math.random() * 0.5)
  }

  // Камень в песок: глухой удар (крупнее — ниже) + зернистый хруст
  _bRock(x, s) {
    const v = this._voice('mech', x * 0.8, 0.9, 1)
    if (!v) return
    const c = this._ctx, t = v.t, A = ROCK_GAIN * (0.4 + 0.6 * s) * rnd(0.85, 1.05)
    const f = lerp(260, 95, s) * rnd(0.9, 1.1)
    const o = this._osc(v, 'sine', f * 1.3, t, t + 0.4)
    o.frequency.exponentialRampToValueAtTime(f, t + 0.025)
    const og = env(c, t, 0.002, A, lerp(0.02, 0.05, s))
    o.connect(og); og.connect(v.out)
    const n = this._noise(v, this._white, t, t + 0.12)
    const lp = biquad(c, 'lowpass', lerp(1800, 700, s), -3), ng = env(c, t, 0.001, A * 0.6, 0.012)
    n.connect(lp); lp.connect(ng); ng.connect(v.out)
    const g = c.createBufferSource()
    g.buffer = this._sand; g.loop = true
    g.playbackRate.value = lerp(1.3, 0.8, s) * rnd(0.9, 1.1)
    const bp = biquad(c, 'bandpass', lerp(3800, 2200, s), 0.9), ge = env(c, t + 0.004, 0.006, A * 0.9, lerp(0.05, 0.1, s))
    g.connect(bp); bp.connect(ge); ge.connect(v.out)
    this._run(v, g, t, t + 0.85, Math.random() * 1.2)
  }

  // Растения: едва слышный воздушный шорох-нарастание ~0.6 с
  _bPlant(x, s) {
    const v = this._voice('pad', x * 0.7, 1.4, 1)
    if (!v) return
    const c = this._ctx, t = v.t, A = PLANT_GAIN * (0.5 + 0.5 * s)
    const n = this._noise(v, this._pink, t, t + 1.3)
    const bp = biquad(c, 'bandpass', 900, 0.8)
    bp.frequency.setValueAtTime(900, t)
    bp.frequency.exponentialRampToValueAtTime(rnd(2400, 3000), t + 0.55)
    const am = gainNode(c, 0.6)
    const m = this._modSrc(6, null, t)
    m.to((Math.random() * 4) | 0, am.gain, 0.35)
    m.src.stop(t + 1.3)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(A, t + 0.28)
    g.gain.setTargetAtTime(0, t + 0.3, 0.12)
    n.connect(bp); bp.connect(am); am.connect(g); g.connect(v.out)
  }

  // Лампа опускается: слабый скрип троса (щелчок — отдельно, lightSwitch(true))
  _bLamp(x, s) {
    const v = this._voice('mech', x * 0.5, 1.8, 1)
    if (!v) return
    const c = this._ctx, t = v.t, A = LAMP_CREAK_GAIN * (0.5 + 0.5 * s)
    const src = c.createBufferSource()
    src.buffer = this._creak
    src.playbackRate.value = rnd(0.9, 1.1)
    const f = rnd(1400, 1900)
    const r1 = biquad(c, 'bandpass', f, 18), r2 = biquad(c, 'bandpass', f * 2.63, 22), r2g = gainNode(c, 0.5)
    const g = gainNode(c, A)
    src.connect(r1); r1.connect(g); src.connect(r2); r2.connect(r2g); r2g.connect(g); g.connect(v.out)
    const hp = biquad(c, 'highpass', 3000, -3), hg = gainNode(c, A * 0.05)
    src.connect(hp); hp.connect(hg); hg.connect(v.out)
    this._run(v, src, t, t + 1.75)
  }
}
