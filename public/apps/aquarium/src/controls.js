// Камера: орбита вокруг аквариума с инерцией, зум колесом/щипком, лёгкий параллакс
// за курсором, «кино»-дрейф. Отличает клик от перетаскивания и отдаёт клики наружу.
import THREE from './three.js'

const clamp = (x, a, b) => Math.max(a, Math.min(b, x))

export class Controls {
  constructor(camera, canvas, { onTap, onHover, onDragChange } = {}) {
    this.camera = camera
    this.canvas = canvas
    this.onTap = onTap
    this.onHover = onHover
    this.onDragChange = onDragChange
    this.target = new THREE.Vector3(0, 0.37, 0)
    this.baseRadius = 1.65
    this.theta = 0
    this.phi = 0.05
    this.zoom = 1
    this.vTheta = 0
    this.vPhi = 0
    this.tTheta = 0
    this.tPhi = 0.05
    this.tZoom = 1
    this.parallax = new THREE.Vector2()
    this.pTarget = new THREE.Vector2()
    this.cinema = false
    this.cinemaT = 0
    this.cinemaMix = 0
    this.enabled = true
    this.override = null            // сценарий сборки управляет камерой сам
    this.pointers = new Map()
    this.drag = null
    this.pinch = null
    this.lastHover = 0

    const el = canvas
    el.addEventListener('pointerdown', e => this._down(e))
    el.addEventListener('pointermove', e => this._move(e))
    el.addEventListener('pointerup', e => this._up(e))
    el.addEventListener('pointercancel', e => this._up(e, true))
    el.addEventListener('pointerleave', () => { this.pTarget.set(0, 0) })
    el.addEventListener('wheel', e => {
      e.preventDefault()
      this.tZoom = clamp(this.tZoom * Math.exp(e.deltaY * 0.0012), 0.55, 1.75)
    }, { passive: false })
    el.addEventListener('contextmenu', e => e.preventDefault())
  }

  _down(e) {
    if (!this.enabled) return
    this.canvas.setPointerCapture?.(e.pointerId)
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (this.pointers.size === 1) {
      this.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false }
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()]
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.tZoom }
      if (this.drag) this.drag.moved = true
    }
  }

  _move(e) {
    const rect = this.canvas.getBoundingClientRect()
    if (e.pointerType === 'mouse' && this.pointers.size === 0) {
      this.pTarget.set(((e.clientX - rect.left) / rect.width - 0.5) * 2, ((e.clientY - rect.top) / rect.height - 0.5) * 2)
      const now = performance.now()
      if (this.onHover && now - this.lastHover > 45) {
        this.lastHover = now
        this.onHover(e.clientX, e.clientY)
      }
    }
    if (!this.pointers.has(e.pointerId)) return
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      this.tZoom = clamp(this.pinch.zoom * this.pinch.d / Math.max(d, 1), 0.55, 1.75)
      return
    }
    const d = this.drag
    if (!d) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    d.x = e.clientX
    d.y = e.clientY
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) {
      d.moved = true
      this.onDragChange?.(true)
    }
    if (d.moved) {
      const k = 1 / Math.max(rect.height, 1)
      this.tTheta = clamp(this.tTheta - dx * 3.2 * k, -1.2, 1.2)
      this.tPhi = clamp(this.tPhi + dy * 2.4 * k, -0.1, 0.95)
    }
  }

  _up(e, cancel) {
    const d = this.drag
    this.pointers.delete(e.pointerId)
    if (this.pointers.size < 2) this.pinch = null
    if (this.pointers.size > 0) return
    this.drag = null
    if (!d) return
    if (d.moved) this.onDragChange?.(false)
    else if (!cancel && performance.now() - d.t < 600) this.onTap?.(e.clientX, e.clientY)
  }

  // вписываем аквариум в кадр при любом соотношении сторон
  frame(aspect) {
    const cam = this.camera
    cam.fov = aspect < 1 ? 46 : aspect < 1.3 ? 40 : 35
    cam.aspect = aspect
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const needH = 0.6 / tanV
    const needW = (aspect < 1 ? 0.58 : 0.72) / (tanV * aspect)
    this.baseRadius = Math.max(needH, needW)
    cam.updateProjectionMatrix()
  }

  isIdle() { return !this.drag && this.pointers.size === 0 }

  update(dt, time) {
    const k = 1 - Math.exp(-dt * 5.5)
    this.parallax.lerp(this.pTarget, 1 - Math.exp(-dt * 2.5))
    this.cinemaMix += ((this.cinema ? 1 : 0) - this.cinemaMix) * (1 - Math.exp(-dt * 0.6))
    this.cinemaT += dt
    let th = this.tTheta, ph = this.tPhi, zm = this.tZoom
    if (this.cinemaMix > 0.001) {
      const c = this.cinemaT
      const cth = 0.55 * Math.sin(c * 0.045) + 0.12 * Math.sin(c * 0.13)
      const cph = 0.12 + 0.1 * Math.sin(c * 0.037 + 1.0)
      const czm = 0.92 + 0.12 * Math.sin(c * 0.029 + 0.5)
      th += (cth - th) * this.cinemaMix
      ph += (cph - ph) * this.cinemaMix
      zm += (czm - zm) * this.cinemaMix
    }
    this.theta += (th - this.theta) * k
    this.phi += (ph - this.phi) * k
    this.zoom += (zm - this.zoom) * k

    let theta = this.theta + this.parallax.x * 0.045
    let phi = this.phi - this.parallax.y * 0.03
    let radius = this.baseRadius * this.zoom
    let target = this.target
    if (this.override) {
      const o = this.override
      theta = o.theta
      phi = o.phi
      radius = this.baseRadius * o.zoom
    }
    const cam = this.camera
    cam.position.set(
      target.x + radius * Math.sin(theta) * Math.cos(phi),
      target.y + radius * Math.sin(phi),
      target.z + radius * Math.cos(theta) * Math.cos(phi),
    )
    cam.lookAt(target)
    cam.updateMatrixWorld()
  }
}
