import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './Preloader.css'

const STEPS = [
  'загрузка модулей',
  'сборка интерфейса',
  'почти готово',
]

export default function Preloader() {
  const [done, setDone] = useState(false)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    let p = 0
    const iv = setInterval(() => {
      p += Math.random() * 16 + 7
      if (p >= 100) {
        p = 100
        clearInterval(iv)
        setTimeout(() => setDone(true), 450)
      }
      setPct(Math.floor(p))
    }, 120)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (done) document.body.style.overflow = ''
  }, [done])

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor((pct / 100) * STEPS.length))]

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <motion.div
            className="preloader__logo"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="pl-bracket">&lt;</span>refteen<span className="pl-bracket">/&gt;</span>
          </motion.div>

          <div className="preloader__bar">
            <div className="preloader__fill" style={{ width: pct + '%' }} />
          </div>

          <div className="preloader__meta">
            <span className="preloader__step">{step}...</span>
            <span className="preloader__pct">{pct}%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
