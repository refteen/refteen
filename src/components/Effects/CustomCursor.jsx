import { useEffect, useRef } from 'react'
import './CustomCursor.css'

// Элементы, к которым курсор «примагничивается» и обтекает их форму
const SEL = 'button, a, .btn-grad, .nav__cta, .term-hint, .term-hire__btn, .btn-ghost, .terminal__mute'

export default function CustomCursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const glowRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    document.documentElement.classList.add('cursor-active')

    const dot = dotRef.current
    const ring = ringRef.current
    const glow = glowRef.current
    const BASE = 36
    let mx = window.innerWidth / 2, my = window.innerHeight / 2
    let rx = mx, ry = my
    let gx = mx, gy = my
    let rw = BASE, rh = BASE, rr = BASE
    let tx = mx, ty = my, tw = BASE, th = BASE, trr = BASE
    let target = null
    let raf
    let audioCtx = null

    // создаём аудио-контекст и «разблокируем» его на первом жесте пользователя
    // (браузеры не дают проигрывать звук до любого взаимодействия)
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch { audioCtx = null }

    const unlockAudio = () => {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
    }
    const unlockEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove']
    unlockEvents.forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true }))

    // тихий «тик» при наведении на интерактивный элемент
    const playHover = () => {
      if (!audioCtx || audioCtx.state !== 'running') return
      try {
        const o = audioCtx.createOscillator()
        const g = audioCtx.createGain()
        o.type = 'sine'
        o.frequency.value = 520 + Math.random() * 80
        g.gain.setValueAtTime(0.02, audioCtx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08)
        o.connect(g)
        g.connect(audioCtx.destination)
        o.start()
        o.stop(audioCtx.currentTime + 0.09)
      } catch { /* no-op */ }
    }

    const onMove = e => {
      mx = e.clientX
      my = e.clientY
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`
      if (target) {
        const b = target.getBoundingClientRect()
        tx = b.left + b.width / 2
        ty = b.top + b.height / 2
        tw = b.width + 16
        th = b.height + 16
        trr = 16
        // усиленный магнит: кнопка ощутимо тянется к курсору и чуть подрастает
        target.style.transform = `translate(${(mx - tx) * 0.34}px, ${(my - ty) * 0.34}px) scale(1.06)`
      } else {
        tx = mx; ty = my; tw = BASE; th = BASE; trr = BASE
      }
    }

    const onOver = e => {
      const el = e.target.closest(SEL)
      if (el && el !== target) {
        if (target) target.style.transform = ''
        target = el
        ring.classList.add('cursor-ring--active')
        playHover()
      }
    }

    const onOut = e => {
      if (!target) return
      if (e.relatedTarget && target.contains(e.relatedTarget)) return
      target.style.transform = ''
      target = null
      ring.classList.remove('cursor-ring--active')
    }

    const loop = () => {
      rx += (tx - rx) * 0.22
      ry += (ty - ry) * 0.22
      rw += (tw - rw) * 0.22
      rh += (th - rh) * 0.22
      rr += (trr - rr) * 0.22
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`
      ring.style.width = rw + 'px'
      ring.style.height = rh + 'px'
      ring.style.borderRadius = rr + 'px'
      // фоновое свечение тянется за курсором с заметной инерцией
      gx += (mx - gx) * 0.08
      gy += (my - gy) * 0.08
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    loop()

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      unlockEvents.forEach(ev => window.removeEventListener(ev, unlockAudio))
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('cursor-active')
      if (audioCtx) audioCtx.close().catch(() => {})
    }
  }, [])

  return (
    <>
      <div className="cursor-bg-glow" ref={glowRef} />
      <div className="cursor-ring" ref={ringRef} />
      <div className="cursor-dot" ref={dotRef} />
    </>
  )
}
