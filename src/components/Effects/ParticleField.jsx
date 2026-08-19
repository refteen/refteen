import { useEffect, useRef } from 'react'
import './ParticleField.css'

const COLORS = ['199,112,240', '56,189,248', '255,255,255']

export default function ParticleField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    let w, h, particles, raf
    const mouse = { x: -9999, y: -9999 }
    const R = 150
    let lastScroll = window.scrollY || window.pageYOffset || 0
    let vortex = null // {x, y, start} — «пылесос» при клике

    const build = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
      const count = Math.min(260, Math.max(100, Math.round((w * h) / 8000)))
      particles = Array.from({ length: count }, () => {
        const bvx = (Math.random() - 0.5) * 0.4
        const bvy = (Math.random() - 0.5) * 0.4
        return {
          x: Math.random() * w, y: Math.random() * h,
          vx: bvx, vy: bvy, bvx, bvy,
          r: Math.random() * 1.7 + 0.5,
          a: Math.random() * 0.5 + 0.25,
          c: COLORS[(Math.random() * COLORS.length) | 0],
        }
      })
    }

    const clampSpeed = (p, max) => {
      const sp = Math.hypot(p.vx, p.vy)
      if (sp > max) { p.vx = (p.vx / sp) * max; p.vy = (p.vy / sp) * max }
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      const now = performance.now()
      let vp = -1
      if (vortex) {
        vp = (now - vortex.start) / 900
        if (vp >= 1) {
          // резкий разлёт после вихря — частицы «выбрасывает» обратно по экрану
          for (const p of particles) {
            const ang = Math.random() * Math.PI * 2
            const power = 4 + Math.random() * 5
            p.vx = Math.cos(ang) * power
            p.vy = Math.sin(ang) * power
          }
          vortex = null
          vp = -1
        }
      }

      // пространственная сетка для быстрого поиска соседей (взаимное отталкивание)
      const CELL = 34
      const grid = new Map()
      for (const p of particles) {
        const key = Math.floor(p.x / CELL) + ',' + Math.floor(p.y / CELL)
        const arr = grid.get(key)
        if (arr) arr.push(p)
        else grid.set(key, [p])
      }
      const REPEL = 26

      for (const p of particles) {
        if (vp >= 0) {
          // режим «пылесоса/тайфуна»: стягиваем частицы к точке клика со вихрем
          const dx = vortex.x - p.x
          const dy = vortex.y - p.y
          const dist = Math.hypot(dx, dy) || 1
          const pull = 0.7 + vp * 2.6
          p.vx += (dx / dist) * pull + (-dy / dist) * pull * 0.6
          p.vy += (dy / dist) * pull + (dx / dist) * pull * 0.6
          p.vx *= 0.9
          p.vy *= 0.9
          clampSpeed(p, 16)
        } else {
          // обычный дрейф
          p.vx += (p.bvx - p.vx) * 0.06
          p.vy += (p.bvy - p.vy) * 0.06
          // отталкивание от курсора
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < R && dist > 0) {
            const f = (1 - dist / R) * 4.5
            p.vx += (dx / dist) * f
            p.vy += (dy / dist) * f
          }
          // лёгкое взаимное отталкивание, чтобы частицы не слипались
          const cx = Math.floor(p.x / CELL)
          const cy = Math.floor(p.y / CELL)
          for (let gx = cx - 1; gx <= cx + 1; gx++) {
            for (let gy = cy - 1; gy <= cy + 1; gy++) {
              const arr = grid.get(gx + ',' + gy)
              if (!arr) continue
              for (const q of arr) {
                if (q === p) continue
                const ax = p.x - q.x
                const ay = p.y - q.y
                const d2 = ax * ax + ay * ay
                if (d2 < REPEL * REPEL && d2 > 0.01) {
                  const d = Math.sqrt(d2)
                  const rf = (1 - d / REPEL) * 0.4
                  p.vx += (ax / d) * rf
                  p.vy += (ay / d) * rf
                }
              }
            }
          }
          clampSpeed(p, 6)
        }

        p.x += p.vx
        p.y += p.vy

        if (p.x < -12) p.x = w + 12
        else if (p.x > w + 12) p.x = -12
        if (p.y < -12) p.y = h + 12
        else if (p.y > h + 12) p.y = -12

        ctx.beginPath()
        ctx.fillStyle = `rgba(${p.c}, ${p.a})`
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(draw)
    }

    const onMove = e => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999 }

    // лёгкий одноразовый подброс при скролле (в противоположную сторону)
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0
      let d = y - lastScroll
      lastScroll = y
      if (d > 30) d = 30
      else if (d < -30) d = -30
      const nudge = -d * 0.05
      for (const p of particles) p.vy += nudge
    }

    // «пылесос» при клике/нажатии
    const onDown = e => { vortex = { x: e.clientX, y: e.clientY, start: performance.now() } }

    build()
    draw()
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('resize', build)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', build)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />
}
