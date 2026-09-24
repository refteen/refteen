// Рельеф грунта, маски песка/почвы, камни как эллипсоиды и поле течения фильтра.
// Чистый JS: этим пользуются и генерация мешей, и поведение рыб, и частицы.
import { INNER, ROCKS, FILTER } from './config.js'
import { fbm2, noise2, smoothstep, clamp } from './noise.js'

const gauss = (dx, dz, sx, sz) => Math.exp(-(dx * dx) / (sx * sx) - (dz * dz) / (sz * sz))

// 0 у задней стенки … 1 у переднего стекла
const frontness = z => clamp((z - INNER.z0) / INNER.sz, 0, 1)

// песчаная «река» от переднего стекла вглубь, между вторым и четвёртым камнем
export function pathMask(x, z) {
  const t = frontness(z)
  const xc = 0.2 + 0.035 * Math.sin(z * 11 + 0.6) - 0.05 * (1 - t)
  const w = 0.022 + 0.06 * Math.pow(t, 1.4)
  const d = Math.abs(x - xc)
  return smoothstep(w, w * 0.45, d) * smoothstep(-0.2, -0.1, z)
}

// 1 = светлый песок, 0 = тёмный аквасойл (на нём растёт ковёр)
export function sandMask(x, z) {
  const front = smoothstep(0.125, 0.165, z + 0.022 * (noise2(x * 7, 3.1) - 0.5) * 2)
  return Math.max(front, pathMask(x, z))
}

export function sandHeight(x, z) {
  const t = frontness(z)
  let h = 0.034 + 0.072 * Math.pow(1 - t, 1.25)
  h += 0.032 * gauss(x + 0.15, z + 0.02, 0.2, 0.15)
  h += 0.02 * gauss(x - 0.08, z - 0.03, 0.14, 0.12)
  h += 0.018 * gauss(x - 0.32, z + 0.09, 0.14, 0.11)
  h += 0.012 * gauss(x + 0.42, z + 0.1, 0.16, 0.12)
  h -= 0.011 * pathMask(x, z)
  h += 0.007 * (fbm2(x * 6.5 + 3, z * 6.5, 3) - 0.5)
  // мелкая рябь на песке
  const s = sandMask(x, z)
  h += s * 0.0012 * Math.sin(x * 140 + 9 * fbm2(x * 8, z * 8, 2)) * smoothstep(0.02, 0.2, z + 0.1)
  // у стёкол грунт чуть приподнят и прижат
  const edge = Math.min(x - INNER.x0, INNER.x1 - x, z - INNER.z0, INNER.z1 - z)
  h += 0.004 * (1 - smoothstep(0.0, 0.03, edge))
  return INNER.y0 + h
}

// Камни как повёрнутые эллипсоиды — для обхода рыбами и раскладки травы.
// Та же трансформация используется при построении меша камня.
export const ROCK_SHAPES = ROCKS.map(r => {
  const base = sandHeight(r.x, r.z)
  const cy = base + r.ry * 0.62 - r.bury
  const cl = Math.cos(r.lean), sl = Math.sin(r.lean)
  const cyw = Math.cos(r.yaw), syw = Math.sin(r.yaw)
  return { ...r, cx: r.x, cy, cz: r.z, base, cl, sl, cyw, syw }
})

// точка в локальных координатах камня (до наклона/поворота), в долях радиусов
export function rockLocal(shape, x, y, z, out) {
  let px = x - shape.cx, py = y - shape.cy, pz = z - shape.cz
  // обратный поворот вокруг Y (yaw)
  const qx = shape.cyw * px - shape.syw * pz
  const qz = shape.syw * px + shape.cyw * pz
  // обратный наклон вокруг Z (lean)
  const rx = shape.cl * qx + shape.sl * py
  const ry = -shape.sl * qx + shape.cl * py
  out[0] = rx / shape.rx
  out[1] = ry / shape.ry
  out[2] = qz / shape.rz
  return out
}

const tmp = [0, 0, 0]
// «расстояние» до камня в долях радиуса: <1 внутри
export function rockField(x, y, z) {
  let best = 99, idx = -1
  for (let i = 0; i < ROCK_SHAPES.length; i++) {
    rockLocal(ROCK_SHAPES[i], x, y, z, tmp)
    const d = Math.hypot(tmp[0], tmp[1], tmp[2])
    if (d < best) { best = d; idx = i }
  }
  return { d: best, i: idx }
}

// Поле течения фильтра (единичной силы): вихрь в плоскости XY
// (сверху справа налево, внизу слева направо) + струя из флейты.
export function flowAt(x, y, z, out) {
  const W = INNER.sx, H = 0.5
  const X = clamp((x - INNER.x0) / W, 0, 1)
  const Y = clamp((y - INNER.y0) / H, 0, 1)
  let u = Math.sin(Math.PI * X) * Math.cos(Math.PI * Y)
  let v = -(H / W) * Math.cos(Math.PI * X) * Math.sin(Math.PI * Y)
  let w = 0
  // струя из флейты: влево и немного вперёд, у поверхности
  const o = FILTER.outflow
  const dx = x - o.x, dy = y - o.y, dz = z - o.z
  const along = -dx
  if (along > -0.02) {
    const spread = 0.05 + along * 0.35
    const jet = Math.exp(-(dy * dy + (dz - along * 0.25) * (dz - along * 0.25)) / (spread * spread)) * Math.exp(-along * 1.6)
    u -= 2.2 * jet
    w += 0.55 * jet
  }
  out[0] = u
  out[1] = v
  out[2] = w
  return out
}
