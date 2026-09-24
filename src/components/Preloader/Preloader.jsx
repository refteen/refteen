import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, animate } from 'framer-motion'
import { playEnterSound } from './enterSound'
import './Preloader.css'

const STEPS = [
  'загрузка модулей',
  'сборка интерфейса',
  'почти готово',
]

const LABEL = 'Войти'
const READY_TEXT = 'система готова'
const GLYPHS = '<>/\\_-=+*#01'
const PARTICLE_COLORS = ['#c770f0', '#38bdf8', '#f0e4ff']
const EASE_OUT = [0.22, 1, 0.36, 1]
const EASE_EXPO = [0.16, 1, 0.3, 1]
// превью: ?motion=full или ?motion=reduce принудительно включают полную или спокойную версию
const MOTION_PARAM = new URLSearchParams(window.location.search).get('motion')

// Фазы: loading → ready (бар превращается в кнопку) → exit (взрыв кнопки и раскрытие сайта).
// FULL — полная анимация. CALM — для prefers-reduced-motion: та же история, но без полётов и тряски —
// обрезка (clip-path), свет, блики, размытие и масштаб не больше ~5%.
const FULL = {
  // раскрытие сайта: задержка/длительность круглого окна и когда убрать прелоадер (мс)
  reveal: { delay: 0.14, duration: 0.84, ease: [0.62, 0, 0.3, 1], ms: 1050 },
  // важно: у элемента заданы значения для каждой фазы, которую он проживает, —
  // иначе при смене фазы framer-motion откатит «забытые» свойства к initial
  logo: {
    intro: { opacity: 0, scale: 0.9, y: 0 },
    loading: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5 } },
    // приподнимаемся, освобождая место под кнопку
    ready: { opacity: 1, scale: 1, y: -30, transition: { duration: 0.8, delay: 0.32, ease: EASE_OUT } },
    exit: { opacity: 1, scale: 1, y: -30 },
  },
  // скобки логотипа разлетаются в стороны, будто их сдуло ударной волной
  bracket: {
    exit: dir => ({ x: dir * 150, rotate: dir * 34, opacity: 0, transition: { duration: 0.62, delay: 0.1, ease: EASE_EXPO } }),
  },
  word: {
    exit: {
      opacity: 0,
      scale: 1.16,
      filter: ['blur(0px)', 'blur(8px)'],
      transition: { duration: 0.42, delay: 0.06, ease: 'easeOut' },
    },
  },
  bar: {
    ready: { opacity: 0, transition: { duration: 0.24, delay: 0.3 } },
    exit: { opacity: 0 },
  },
  // заполненный бар стягивается с обоих концов в центр — в искру
  fill: {
    ready: { scaleX: 0, transition: { duration: 0.42, ease: [0.7, 0, 0.84, 0] } },
    exit: { scaleX: 0 },
  },
  spark: {
    ready: {
      opacity: [0, 1, 1, 0],
      scale: [0.2, 1, 1.9, 0.4],
      transition: { duration: 0.6, delay: 0.16, times: [0, 0.42, 0.6, 1], ease: 'easeOut' },
    },
    exit: { opacity: 0, scale: 0.4 },
  },
  // из искры: сначала тонкая линия, затем пружинисто «надувается» в кнопку-пилюлю
  morph: {
    hidden: { opacity: 0, scaleX: 0.03, scaleY: 0.05 },
    ready: {
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      transition: {
        opacity: { duration: 0.08, delay: 0.4 },
        scaleX: { duration: 0.45, delay: 0.4, ease: EASE_EXPO },
        scaleY: { type: 'spring', stiffness: 380, damping: 18, delay: 0.62 },
      },
    },
    exit: { opacity: 1, scaleX: 1, scaleY: 1 },
  },
  // нажатие: кнопка сжимается, «заряжается» и лопается
  inner: {
    exit: {
      scale: [1, 0.86, 1.34],
      opacity: [1, 1, 0],
      filter: ['brightness(1)', 'brightness(1.7)', 'brightness(2.2)'],
      transition: { duration: 0.46, times: [0, 0.24, 1], ease: [[0.3, 0, 0.6, 1], EASE_EXPO] },
    },
  },
  // градиентная заливка: пока кнопка — линия, она выглядит как бар, затем тает
  flash: {
    hidden: { opacity: 1 },
    ready: { opacity: [1, 1, 0], transition: { duration: 0.8, delay: 0.4, times: [0, 0.45, 1], ease: 'easeOut' } },
    exit: { opacity: 0 },
  },
  icon: {
    hidden: { pathLength: 0, opacity: 0 },
    ready: { pathLength: 1, opacity: 1, transition: { duration: 0.7, delay: 0.85, ease: EASE_OUT } },
    exit: { pathLength: 1, opacity: 1 },
  },
  // буквы надписи переворачиваются на место по очереди
  char: {
    hidden: { opacity: 0, y: 12, rotateX: -90 },
    ready: i => ({ opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.55, delay: 0.86 + i * 0.06, ease: EASE_OUT } }),
    exit: { opacity: 1, y: 0, rotateX: 0 },
  },
  meta: {
    ready: { y: 30, transition: { duration: 0.8, delay: 0.32, ease: EASE_OUT } },
    exit: { y: 30 },
  },
  info: {
    hidden: { opacity: 0 },
    ready: { opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.5 } },
    exit: { opacity: 0, y: 10, transition: { duration: 0.22, ease: 'easeIn' } },
  },
  hint: {
    hidden: { opacity: 0, y: 6 },
    ready: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 1.15, ease: EASE_OUT } },
    exit: { opacity: 1, y: 0 },
  },
}

const DISSOLVE = { opacity: 0, filter: ['blur(0px)', 'blur(8px)'] }

const CALM = {
  // окно раскрывается плавнее и чуть дольше
  reveal: { delay: 0.12, duration: 1, ease: [0.45, 0, 0.25, 1], ms: 1180 },
  logo: {
    intro: { opacity: 0, scale: 0.97, filter: 'blur(6px)' },
    loading: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.6 }, transitionEnd: { filter: 'none' } },
    ready: { opacity: 1, scale: 1, filter: 'none' },
    exit: { opacity: 1, scale: 1, filter: 'none' },
  },
  // логотип не разлетается, а растворяется в размытии
  bracket: {
    exit: { ...DISSOLVE, transition: { duration: 0.5, delay: 0.1, ease: 'easeOut' } },
  },
  word: {
    exit: { ...DISSOLVE, transition: { duration: 0.5, delay: 0.06, ease: 'easeOut' } },
  },
  bar: FULL.bar,
  // бар стягивается к центру обрезкой, а не масштабом
  fill: {
    ready: {
      clipPath: ['inset(0% 0% 0% 0%)', 'inset(0% 50% 0% 50%)'],
      transition: { duration: 0.42, ease: [0.7, 0, 0.84, 0] },
    },
    exit: { clipPath: 'inset(0% 50% 0% 50%)' },
  },
  spark: {
    ready: { opacity: [0, 1, 1, 0], transition: { duration: 0.6, delay: 0.16, times: [0, 0.42, 0.6, 1], ease: 'easeOut' } },
    exit: { opacity: 0 },
  },
  // кнопка «проявляется» из центра: сначала светящаяся линия, затем пилюля целиком
  morph: {
    hidden: { opacity: 0, clipPath: 'inset(48% 50% 48% 50% round 999px)' },
    ready: {
      opacity: 1,
      clipPath: ['inset(48% 50% 48% 50% round 999px)', 'inset(48% 0% 48% 0% round 999px)', 'inset(0% 0% 0% 0% round 999px)'],
      transition: {
        opacity: { duration: 0.08, delay: 0.4 },
        clipPath: { duration: 0.64, delay: 0.4, times: [0, 0.5, 1], ease: [EASE_EXPO, EASE_OUT] },
      },
      transitionEnd: { clipPath: 'none' },
    },
    exit: { opacity: 1, clipPath: 'none' },
  },
  // нажатие: лёгкое сжатие, вспышка яркости и растворение
  inner: {
    exit: {
      scale: [1, 0.96, 1.04],
      opacity: [1, 1, 0],
      filter: ['brightness(1) blur(0px)', 'brightness(1.6) blur(0px)', 'brightness(2.2) blur(10px)'],
      transition: { duration: 0.5, times: [0, 0.24, 1], ease: [[0.3, 0, 0.6, 1], 'easeOut'] },
    },
  },
  flash: FULL.flash,
  icon: FULL.icon,
  // буквы проступают из размытия по очереди
  char: {
    hidden: { opacity: 0, filter: 'blur(6px)' },
    ready: i => ({
      opacity: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.5, delay: 0.8 + i * 0.07, ease: 'easeOut' },
      transitionEnd: { filter: 'none' },
    }),
    exit: { opacity: 1, filter: 'none' },
  },
  meta: {},
  info: {
    hidden: { opacity: 0 },
    ready: { opacity: 1, transition: { duration: 0.4, delay: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.25 } },
  },
  hint: {
    hidden: { opacity: 0 },
    ready: { opacity: 1, transition: { duration: 0.5, delay: 1.15 } },
    exit: { opacity: 1 },
  },
}

// осколки «взрыва» кнопки — считаются один раз, чтобы рендер был стабильным
const makeParticles = () => Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2 + (Math.random() - 0.5) * 0.45
  const d = 90 + Math.random() * 200
  return {
    x: Math.round(Math.cos(a) * d),
    y: Math.round(Math.sin(a) * d * 0.8),
    size: (2 + Math.random() * 3.5).toFixed(1),
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    dur: (0.55 + Math.random() * 0.4).toFixed(2),
    delay: (0.1 + Math.random() * 0.07).toFixed(2),
  }
})

// «расшифровка» строки: случайные символы по очереди встают на свои места
function Scramble({ text, delay = 0, duration = 560 }) {
  const [out, setOut] = useState('')

  useEffect(() => {
    let raf
    let start = 0
    let last = 0
    const tick = t => {
      if (!start) start = t + delay
      if (t >= start && t - last > 40) {
        last = t
        const p = Math.min(1, (t - start) / duration)
        const n = Math.floor(p * text.length)
        let s = text.slice(0, n)
        for (let i = n; i < text.length; i++) s += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]
        setOut(s)
        if (p >= 1) return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, delay, duration])

  return <span aria-hidden="true">{out}</span>
}

export default function Preloader() {
  const prefersReduced = useReducedMotion()
  const reduce = MOTION_PARAM === 'reduce' || (MOTION_PARAM !== 'full' && !!prefersReduced)
  const V = reduce ? CALM : FULL
  const [phase, setPhase] = useState('loading')
  const [pct, setPct] = useState(0)
  const [done, setDone] = useState(false)
  const [origin, setOrigin] = useState(null)
  const rootRef = useRef(null)
  const morphRef = useRef(null)
  const btnRef = useRef(null)
  const phaseRef = useRef('loading')
  const unlockRef = useRef(null)
  const holeAnim = useRef(null)
  const exitTimer = useRef(null)
  const particles = useMemo(makeParticles, [])

  // круглое окно в вуали, через которое раскрывается сайт: центр — кнопка, радиус растёт
  const hole = useMotionValue(-20)
  const ox = useMotionValue(0)
  const oy = useMotionValue(0)
  const veilMask = useTransform([hole, ox, oy], ([r, x, y]) =>
    `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, #000 ${r + 1.5}px)`)
  // неоновая кромка по краю окна (фиолетовый → голубой), расширяется вместе с ним
  const veilRim = useTransform([hole, ox, oy], ([r, x, y]) => {
    const w = 34 + Math.max(0, r) * 0.06
    return `radial-gradient(circle at ${x}px ${y}px, rgba(245, 232, 255, 0.95) ${r}px, rgba(199, 112, 240, 0.85) ${r + 3}px, rgba(56, 189, 248, 0.32) ${r + w * 0.45}px, rgba(56, 189, 248, 0) ${r + w}px)`
  })

  // имитация загрузки; на 100% бар превращается в кнопку входа
  useEffect(() => {
    let p = 0
    let t
    const iv = setInterval(() => {
      p += Math.random() * 16 + 7
      if (p >= 100) {
        p = 100
        clearInterval(iv)
        t = setTimeout(() => {
          phaseRef.current = 'ready'
          setPhase('ready')
        }, 280)
      }
      setPct(Math.floor(p))
    }, 120)
    return () => { clearInterval(iv); clearTimeout(t) }
  }, [])

  // пока пользователь не вошёл, страница под прелоадером не скроллится — ни нативно, ни через Lenis
  useEffect(() => {
    if (done) return
    const body = document.body
    const prev = body.style.overflow
    body.style.overflow = 'hidden'
    // SmoothScroll монтируется после прелоадера, поэтому Lenis останавливаем кадром позже
    const raf = requestAnimationFrame(() => window.__lenis?.stop())
    let locked = true
    const unlock = () => {
      if (!locked) return
      locked = false
      cancelAnimationFrame(raf)
      body.style.overflow = prev
      window.__lenis?.start()
    }
    unlockRef.current = unlock
    return unlock
  }, [done])

  const enter = useCallback(() => {
    if (phaseRef.current !== 'ready') return
    phaseRef.current = 'exit'

    // звук — синхронно в обработчике жеста, иначе браузер его заблокирует
    playEnterSound()

    // отпускаем «магнит» кастомного курсора (кольцо возвращается к курсору),
    // но саму кнопку оставляем там, куда её притянуло: взрыв начнётся ровно из-под курсора
    const btn = btnRef.current
    const pulled = btn ? btn.style.transform : ''
    btn?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    if (btn && pulled) btn.style.transform = pulled

    // скролл возвращаем сразу: пока экран закрыт вуалью, появление полосы прокрутки незаметно
    unlockRef.current?.()

    const box = (btn || morphRef.current)?.getBoundingClientRect()
    const x = box ? box.left + box.width / 2 : window.innerWidth / 2
    const y = box ? box.top + box.height / 2 : window.innerHeight / 2
    ox.set(x)
    oy.set(y)
    setOrigin({ x, y })
    setPhase('exit')

    // окно должно дорасти до самого дальнего угла экрана (с запасом на неоновую кромку)
    const root = rootRef.current
    const w = root ? root.clientWidth : window.innerWidth
    const h = root ? root.clientHeight : window.innerHeight
    const maxR = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + 180
    const { ms, ...reveal } = V.reveal
    holeAnim.current = animate(hole, maxR, reveal)
    exitTimer.current = setTimeout(() => setDone(true), ms)
  }, [V, hole, ox, oy])

  // автофокус на кнопку, как только она «распустилась»: Enter / Space сразу работают
  useEffect(() => {
    if (phase !== 'ready') return
    const t = setTimeout(() => btnRef.current?.focus({ preventScroll: true }), 1000)
    return () => clearTimeout(t)
  }, [phase])

  // клавиатура: Tab не выпускает фокус за пределы диалога, Enter / Space входят откуда угодно
  useEffect(() => {
    if (done || phase === 'exit') return
    const onKey = e => {
      if (e.key === 'Tab') {
        e.preventDefault()
        btnRef.current?.focus({ preventScroll: true })
      } else if ((e.key === 'Enter' || e.key === ' ') && phase === 'ready' && e.target !== btnRef.current) {
        e.preventDefault()
        enter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, done, enter])

  useEffect(() => () => {
    clearTimeout(exitTimer.current)
    holeAnim.current?.stop()
  }, [])

  if (done) return null

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor((pct / 100) * STEPS.length))]
  const exiting = phase === 'exit'

  return (
    <motion.div
      ref={rootRef}
      className={`preloader preloader--${phase}${reduce ? ' preloader--calm' : ''}`}
      role="dialog"
      aria-modal={exiting ? undefined : true}
      aria-label={phase === 'loading' ? 'Загрузка сайта' : 'Вход на сайт'}
      data-lenis-prevent
      initial="intro"
      animate={phase}
    >
      <div className="preloader__boot" aria-hidden="true" />
      <motion.div
        className="preloader__veil"
        aria-hidden="true"
        style={exiting ? { WebkitMaskImage: veilMask, maskImage: veilMask, backgroundImage: veilRim } : undefined}
      />

      <div className="preloader__stage">
        <motion.div className="preloader__logo" variants={V.logo} aria-hidden="true">
          <motion.span className="pl-bracket" variants={V.bracket} custom={-1}>&lt;</motion.span>
          <motion.span className="pl-word" variants={V.word}>refteen</motion.span>
          <motion.span className="pl-bracket" variants={V.bracket} custom={1}>/&gt;</motion.span>
        </motion.div>

        <div className="preloader__slot">
          <motion.div
            className="preloader__bar"
            variants={V.bar}
            role="progressbar"
            aria-label="Загрузка"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-hidden={phase !== 'loading'}
          >
            <motion.div className="preloader__fill" variants={V.fill} style={{ width: pct + '%' }} />
          </motion.div>
          <motion.span className="pl-spark" variants={V.spark} aria-hidden="true" />

          {phase !== 'loading' && (
            <motion.div ref={morphRef} className="pl-morph" variants={V.morph} initial="hidden" animate={phase}>
              {/* transform самой кнопки принадлежит магниту курсора, поэтому анимируем обёртки вокруг неё */}
              <button
                ref={btnRef}
                type="button"
                className="pl-btn"
                onClick={enter}
                aria-label="Войти на сайт и включить звук"
                aria-describedby="pl-hint"
              >
                <motion.span className="pl-btn__inner" variants={V.inner}>
                  <span className="pl-btn__glow" aria-hidden="true" />
                  <span className="pl-btn__pulse" aria-hidden="true" />
                  <span className="pl-btn__border" aria-hidden="true">
                    <span className="pl-btn__spin" />
                  </span>
                  <span className="pl-btn__body">
                    <span className="pl-btn__sweep" aria-hidden="true" />
                    <svg className="pl-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <defs>
                        <linearGradient id="pl-grad" gradientUnits="userSpaceOnUse" x1="4" y1="3" x2="20" y2="21">
                          <stop offset="0" stopColor="#c770f0" />
                          <stop offset="1" stopColor="#38bdf8" />
                        </linearGradient>
                      </defs>
                      <motion.path d="M16.8 7.3a7.5 7.5 0 1 1-9.6 0" variants={V.icon} />
                      <motion.path d="M12 3.2v8.3" variants={V.icon} />
                    </svg>
                    <span className="pl-btn__label" aria-hidden="true">
                      {LABEL.split('').map((ch, i) => (
                        <motion.span key={i} className="pl-btn__char" variants={V.char} custom={i}>{ch}</motion.span>
                      ))}
                    </span>
                  </span>
                  <motion.span className="pl-btn__flash" variants={V.flash} aria-hidden="true" />
                </motion.span>
              </button>
            </motion.div>
          )}
        </div>

        <motion.div className="preloader__meta-wrap" variants={V.meta}>
          <AnimatePresence>
            {phase === 'loading' && (
              <motion.div
                key="meta"
                className="preloader__meta"
                exit={{ opacity: 0, y: -6, transition: { duration: 0.22 } }}
              >
                <span className="preloader__step">{step}...</span>
                <span className="preloader__pct">{pct}%</span>
              </motion.div>
            )}
          </AnimatePresence>

          {phase !== 'loading' && (
            <motion.div className="preloader__info" variants={V.info} initial="hidden" animate={phase}>
              <p className="preloader__status">
                <span className="pl-dot" aria-hidden="true" />
                <Scramble text={READY_TEXT} delay={480} />
              </p>
              <motion.p id="pl-hint" className="preloader__hint" variants={V.hint}>
                нажми, чтобы войти · включится звук
              </motion.p>
            </motion.div>
          )}
        </motion.div>
      </div>

      <span className="pl-sr" role="status">{phase === 'ready' ? READY_TEXT : ''}</span>

      {exiting && origin && (
        <div className="preloader__fx" style={{ left: origin.x, top: origin.y }} aria-hidden="true">
          <span className="pl-flash" />
          {/* ударные волны и осколки — только в полной версии: это движение через весь экран */}
          {!reduce && (
            <>
              <span className="pl-wave" />
              <span className="pl-wave pl-wave--late" />
              {particles.map((p, i) => (
                <span
                  key={i}
                  className="pl-particle"
                  style={{
                    '--x': p.x + 'px',
                    '--y': p.y + 'px',
                    '--size': p.size + 'px',
                    '--c': p.color,
                    animationDuration: p.dur + 's',
                    animationDelay: p.delay + 's',
                  }}
                />
              ))}
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}
