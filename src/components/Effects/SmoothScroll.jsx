import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

// Плавный инерционный скроллинг (как на премиальных сайтах).
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return // на тач-устройствах — родной скролл

    const lenis = new Lenis({
      duration: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    // делаем инстанс доступным другим модулям (например, для навигации по якорям)
    window.__lenis = lenis

    let raf
    const loop = time => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  return null
}
