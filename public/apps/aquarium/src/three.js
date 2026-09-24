// Загрузка three.js с запасными CDN: если первый источник недоступен
// (блокировка, сбой сети), берём следующий. Остальные модули получают
// готовый namespace: `import THREE from './three.js'`.
const VERSION = '0.170.0'

const SOURCES = [
  `https://cdn.jsdelivr.net/npm/three@${VERSION}/build/three.module.min.js`,
  `https://unpkg.com/three@${VERSION}/build/three.module.min.js`,
  `https://esm.sh/three@${VERSION}/build/three.module.min.js`,
]

let THREE = null
let lastError = null

for (const src of SOURCES) {
  try {
    THREE = await import(src)
    break
  } catch (err) {
    lastError = err
    console.warn('[aquarium] three.js source failed:', src)
  }
}

if (!THREE) throw lastError || new Error('three.js unavailable')

export default THREE
