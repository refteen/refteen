// Детерминированный шум и случайность: композиция одинакова при каждой загрузке.

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const fade = t => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t

// value noise 3D в диапазоне [0, 1]
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = x - xi, yf = y - yi, zf = z - zi
  const u = fade(xf), v = fade(yf), w = fade(zf)
  const n000 = hash3(xi, yi, zi), n100 = hash3(xi + 1, yi, zi)
  const n010 = hash3(xi, yi + 1, zi), n110 = hash3(xi + 1, yi + 1, zi)
  const n001 = hash3(xi, yi, zi + 1), n101 = hash3(xi + 1, yi, zi + 1)
  const n011 = hash3(xi, yi + 1, zi + 1), n111 = hash3(xi + 1, yi + 1, zi + 1)
  return lerp(
    lerp(lerp(n000, n100, u), lerp(n010, n110, u), v),
    lerp(lerp(n001, n101, u), lerp(n011, n111, u), v),
    w,
  )
}

export const noise2 = (x, y) => noise3(x, y, 0.5)

export function fbm3(x, y, z, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0
  for (let i = 0; i < oct; i++) {
    s += a * noise3(x * f, y * f, z * f)
    n += a
    a *= 0.5
    f *= 2.03
  }
  return s / n
}

export const fbm2 = (x, y, oct = 4) => fbm3(x, y, 0.37, oct)

// «хребтовый» шум: острые гребни, как на сэйрю-сэки
export function ridged3(x, y, z, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0
  for (let i = 0; i < oct; i++) {
    const r = 1 - Math.abs(noise3(x * f, y * f, z * f) * 2 - 1)
    s += a * r * r
    n += a
    a *= 0.5
    f *= 2.11
  }
  return s / n
}

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
